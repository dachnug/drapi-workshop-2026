/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Client-side authentication module. Handles basic
 * username/password login against the REST backend, persistence of the
 * returned JWT bearer token in `localStorage`, decoding of JWT claims, login
 * state checks, and logout. Authentication state changes are broadcast on the
 * window via a global `auth-changed` event so UI components (e.g.
 * `<dnug-actionbar>`) can react.
 *
 * @module auth
 */

import { OIDC_CLIENT_ID } from './constants';
import { replaceMainContent } from './utils';

/**
 * Credentials accepted by {@link loginBasic}.
 *
 * Typed as `any` because the values originate from `FormData.get()`, which
 * yields `FormDataEntryValue | null`; the fields are trimmed and validated
 * inside {@link loginBasic} before use.
 */
export type LoginBasicParams = {
  /** The username entered by the user. */
  username: any;
  /** The password entered by the user. */
  password: any;
};

/**
 * Dispatches the global `auth-changed` event on the window.
 *
 * Components listen for this event to re-sync their view of the current login
 * state after a login or logout.
 */
const emitAuthChanged = () => {
  globalThis.dispatchEvent(new CustomEvent('auth-changed'));
};

/**
 * Authenticates a user with username and password against `/api/v1/auth`.
 *
 * On success the returned bearer token is stored and its claims are rendered
 * into the main content area (see {@link extractCredentials}), and the
 * `auth-changed` event is emitted. Errors do not reject: a failed request or
 * server error is caught, logged, and returned as a message string so the
 * caller can display it in the login form.
 *
 * @param params - The login credentials.
 * @param params.username - Username; leading/trailing whitespace is trimmed.
 * @param params.password - Password; leading/trailing whitespace is trimmed.
 * @returns A promise resolving to an empty string on success, or a non-empty
 *   error message string on failure (including the blank-credentials case).
 *   Callers treat any truthy result as an error to display; this function does
 *   not reject.
 */
export const loginBasic = async ({ username, password }: LoginBasicParams): Promise<string> => {
  const safeUser = username.trim();
  const safePassword = password.trim();

  if (!safeUser || !safePassword) {
    // Return the message rather than throwing: callers (e.g. the login form)
    // await this value and display any truthy result as an inline error. A
    // throw here would surface as an unhandled rejection with no user feedback.
    return 'Username and password are required';
  }

  const result = await fetch('/api/v1/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: safeUser, password: safePassword })
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }
      return response;
    })
    .then((response) => response.json())
    .then((json) => extractCredentials(json))
    .catch((err) => {
      console.error(err);
      return err.message || 'An error occurred during login';
    });

  // Success resolves to `undefined` (extractCredentials returns void); normalize
  // to an empty string so the resolved value honors the Promise<string> contract
  // and reads as falsy ("no error") at every call site.
  return result ?? '';
};

/**
 * Decodes the payload (claims) of a JWT without verifying its signature.
 *
 * Splits the token into its three dot-separated parts, base64url-decodes the
 * payload segment (converting URL-safe characters and re-applying padding),
 * and parses the result as JSON. This performs **no cryptographic
 * verification** — it only reads the claims and must not be used as the sole
 * basis for trusting a token.
 *
 * @param token - A JWT in `header.payload.signature` form.
 * @returns The decoded claims as a key/value object.
 * @throws {Error} If the token is not a well-formed three-part JWT.
 * @throws {SyntaxError} If the decoded payload is not valid JSON.
 */
export const parseJwtClaims = (token: string): Record<string, unknown> => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  // atob yields a binary (Latin-1) string; decode it as UTF-8 so non-ASCII
  // claim values (e.g. names with umlauts) are preserved rather than mojibaked.
  const bytes = Uint8Array.from(atob(padded), (char) => char.codePointAt(0)!);
  const decoded = new TextDecoder().decode(bytes);
  return JSON.parse(decoded) as Record<string, unknown>;
};

/**
 * Derives a human-readable username from a set of JWT claims.
 *
 * Checks a prioritized list of claim keys (`CN`, `preferred_username`,
 * `email`, `sub`) and returns the first one whose value is a non-empty
 * string.
 *
 * @param claims - The decoded JWT claims.
 * @returns The resolved username, or `'Unknown user'` if none of the
 *   candidate claims hold a usable value.
 */
const resolveUsernameFromClaims = (claims: Record<string, unknown>): string => {
  const claimKeys = ['CN', 'preferred_username', 'email', 'sub'] as const;

  for (const key of claimKeys) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return 'Unknown user';
};

/**
 * Processes a successful login response and persists the session.
 *
 * Expects the response JSON to contain a `bearer` JWT. The token's claims are
 * decoded and the resolved username, raw token, and claims are written to
 * `localStorage`. An `auth-changed` event is emitted and the decoded claims
 * are rendered into the main content area as formatted JSON.
 *
 * @param json - The parsed JSON body of the auth response.
 * @throws {Error} If the response does not contain a `bearer` token.
 */
export const extractCredentials = (json: any) => {
  if (json.bearer || json.access_token) {
    const bearer = json.bearer || json.access_token;
    const claims = parseJwtClaims(bearer);
    const username = resolveUsernameFromClaims(claims);

    globalThis.localStorage.setItem('authToken', bearer);
    globalThis.localStorage.setItem('username', username);
    globalThis.localStorage.setItem('claims', JSON.stringify(claims));

    if (json.refresh_token) {
      globalThis.localStorage.setItem('refreshToken', json.refresh_token);
    }

    emitAuthChanged();

    console.log('Login successful, received bearer token');
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(claims, null, 2);
    replaceMainContent(pre);
  } else {
    throw new Error('Invalid response from server: bearer token missing');
  }
};

/**
 * Determines whether a valid, unexpired session exists.
 *
 * Reads the stored bearer token, decodes its claims, and checks the `exp`
 * (expiry) claim against the current time. Any missing token, malformed
 * token, missing/invalid `exp`, or decode error is treated as "not logged
 * in" rather than throwing.
 *
 * @returns `true` if a stored token exists and has not yet expired, otherwise
 *   `false`.
 */
export const isLoggedIn = (): boolean => {
  const token = globalThis.localStorage.getItem('authToken');
  if (!token) return false;

  try {
    const claims = parseJwtClaims(token);
    const exp = claims['exp'];
    if (typeof exp !== 'number') return false;
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

/**
 * Logs the current user out.
 *
 * Clears the stored token, username, and claims from `localStorage`, emits
 * the `auth-changed` event, and renders a celebratory icon into the main
 * content area — this local cleanup happens immediately and unconditionally.
 * If a token was present, a best-effort `POST /api/v1/auth/logout` request is
 * also made to invalidate the session server-side; failures there are logged
 * but do not undo the local logout.
 *
 * @returns A promise resolving to `true` when there was no token, or when the
 *   server logout succeeded; `false` if the server logout request failed.
 */
export const logout = async (): Promise<boolean> => {
  const token = globalThis.localStorage.getItem('authToken');
  globalThis.localStorage.removeItem('authToken');
  globalThis.localStorage.removeItem('username');
  globalThis.localStorage.removeItem('claims');
  globalThis.localStorage.removeItem('refreshToken');
  emitAuthChanged();
  globalThis.location.href = '/';

  if (token) {
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{"logout": "Yes"}'
    })
      .then(async (response) => {
        if (!response.ok) {
          const msg = `Logout request failed: ${response.status} ${response.statusText}`;
          console.error(msg);
          throw new Error(msg);
        }
        return await response.text();
      })
      .then((_text) => true)
      .catch((error) => {
        console.error('Logout request failed:', error);
        return false;
      });
    return response;
  } else {
    console.warn('No auth token found during logout');
  }
  return true;
};

/**
 * Returns the display name of the currently logged-in user.
 *
 * Reads the username persisted at login time from `localStorage`.
 *
 * @returns The stored username, or `'Anonymous'` if none is present.
 */
export const getCurrentUser = (): string => {
  const username = globalThis.localStorage.getItem('username');
  return isLoggedIn() ? username || 'Anonymous' : 'Anonymous';
};

/**
 * Shows the shared login dialog and resolves once the user has either logged in
 * or dismissed it.
 *
 * The dialog is located in the DOM as `<dnug-login id="main-login">` (rather
 * than imported) to avoid a circular dependency, since `dnug-login.ts` imports
 * this module. Resolves `true` if a valid session exists afterwards (the global
 * `auth-changed` event fired by {@link loginBasic}), `false` if the dialog was
 * dismissed (`wa-hide`) without logging in, or `false` if no dialog is present.
 *
 * @returns A promise resolving to whether a valid session now exists.
 */
const promptLogin = (): Promise<boolean> =>
  new Promise((resolve) => {
    const dialog = document.getElementById('main-login') as (HTMLElement & { show(): void }) | null;
    if (!dialog) {
      resolve(false);
      return;
    }
    const done = () => {
      cleanup();
      resolve(isLoggedIn());
    };
    const cleanup = () => {
      globalThis.removeEventListener('auth-changed', done);
      dialog.removeEventListener('wa-hide', done);
    };
    globalThis.addEventListener('auth-changed', done, { once: true });
    dialog.addEventListener('wa-hide', done, { once: true });
    dialog.show();
  });

/**
 * Fetches a resource with the stored bearer token attached, returning the
 * parsed response body. JSON responses are parsed with `response.json()`, all
 * others with `response.text()`.
 *
 * Authentication: the bearer token from `localStorage` is attached when a valid
 * session exists. With no valid session, `reprompt=true` shows the login dialog
 * once and proceeds on success; `reprompt=false`, or a dismissed dialog, throws.
 * A server-side 401/403 is treated as an ordinary non-ok response — there is no
 * re-prompt or retry.
 *
 * Failures are logged and re-thrown so callers can react: a missing session
 * throws `Error('Authentication required')`, a non-ok HTTP response throws
 * `Error('Request failed: <status> <statusText>')`, and fetch/network errors
 * propagate unchanged.
 *
 * @param input - The resource to fetch (same as `fetch`).
 * @param init - Request options (same as `fetch`); not mutated.
 * @param reprompt - When true, may show the login dialog to authenticate.
 * @returns The parsed response body.
 * @throws {Error} When authentication is required, the response is not ok, or
 *   the fetch fails.
 */
export const keepFetch = async (input: RequestInfo | URL, init: RequestInit = {}, reprompt: boolean = false): Promise<unknown> => {
  try {
    const response = await fetchKeepResponse(input, init, reprompt);
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (err) {
    console.error('keepFetch error:', err);
    throw err;
  }
};

export const fetchKeepResponse = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  reprompt: boolean = false
): Promise<Response> => {
  try {
    // Check: can we proceed
    const actualToken = await getOrFetchToken(reprompt);
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${actualToken}`);
    const response = await fetch(input, { ...init, headers });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (err) {
    console.error('keepFetch error:', err);
    throw err;
  }
};

/**
 * Resolves the bearer token to use for an authenticated request, refreshing or
 * prompting for login as needed.
 *
 * Resolution order:
 * 1. If a valid session already exists ({@link isLoggedIn}), returns the stored
 *    `authToken`.
 * 2. Otherwise, if a `refreshToken` is stored, attempts a silent refresh via
 *    {@link attemptTokenRefresh} and returns the resulting token when truthy. A
 *    failed refresh rejects (rethrown from {@link attemptTokenRefresh}) and so
 *    skips the reprompt path below entirely.
 * 3. Otherwise, when `reprompt` is true, shows the login dialog
 *    ({@link promptLogin}) and returns the stored `authToken` on success.
 *
 * @param reprompt - When true, may show the login dialog if no valid session
 *   and no usable refresh token exist.
 * @returns A promise resolving to the bearer token to attach to the request, or
 *   `null` (e.g. when the token is unexpectedly absent from `localStorage`).
 * @throws {Error} `Authentication required` when no valid session exists, no
 *   refresh succeeds, and either `reprompt` is false or the login dialog is
 *   dismissed. Also rethrows any error raised by {@link attemptTokenRefresh}.
 */
const getOrFetchToken = async (reprompt: boolean): Promise<string | null> => {
  if (isLoggedIn()) {
    return globalThis.localStorage.getItem('authToken');
  }

  const refreshToken = globalThis.localStorage.getItem('refreshToken');
  if (refreshToken) {
    // Attempt to refresh the token
    const token = await attemptTokenRefresh(refreshToken);
    if (token) {
      return token;
    }
  }

  if (reprompt) {
    const success = await promptLogin();
    if (success) {
      return globalThis.localStorage.getItem('authToken');
    }
  }
  throw new Error('Authentication required');
};

/**
 * Exchanges a refresh token for a fresh bearer token via the OAuth token
 * endpoint.
 *
 * POSTs an `application/x-www-form-urlencoded` body
 * (`grant_type=refresh_token`, `client_id`, `refresh_token`) to the endpoint
 * stored under `token_endpoint` in `localStorage`, falling back to
 * `/oauth/token`. On a successful (ok) response the JSON body is processed by
 * {@link extractCredentials}, which persists the new `authToken` (and any
 * rotated `refreshToken`) and emits `auth-changed`.
 *
 * On failure — a non-ok HTTP response or any error thrown while fetching,
 * parsing, or extracting — the stored `refreshToken` is removed from
 * `localStorage` (so a stale/invalid token is not retried) and the error is
 * rethrown. Because this rejects, the caller ({@link getOrFetchToken}) does not
 * fall through to the login-reprompt path.
 *
 * @param refreshToken - The refresh token to exchange.
 * @returns A promise resolving to the newly stored `authToken`, or an empty
 *   string if it is unexpectedly absent after extraction.
 * @throws {Error} `Token refresh failed: <status> <statusText>` on a non-ok
 *   response, or any error raised during the request/parse/extract; in all
 *   error cases the stored `refreshToken` is removed before rethrowing.
 */
const attemptTokenRefresh = async (refreshToken: string): Promise<string> => {
  try {
    const token_endpoint = globalThis.localStorage.getItem('token_endpoint') ?? '/oauth/token';
    const response = await fetch(token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: OIDC_CLIENT_ID,
        refresh_token: refreshToken
      })
    });
    if (response.ok) {
      const json = await response.json();
      extractCredentials(json);
      return globalThis.localStorage.getItem('authToken') ?? '';
    } else {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('Token refresh error:', err);
    globalThis.localStorage.removeItem('refreshToken');
    throw err;
  }
};
