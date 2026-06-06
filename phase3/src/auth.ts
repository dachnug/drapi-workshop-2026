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
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  // atob yields a binary (Latin-1) string; decode it as UTF-8 so non-ASCII
  // claim values (e.g. names with umlauts) are preserved rather than mojibaked.
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
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
const extractCredentials = (json: any) => {
  if (json.bearer) {
    const bearer = json.bearer;
    const claims = parseJwtClaims(bearer);
    const username = resolveUsernameFromClaims(claims);

    globalThis.localStorage.setItem('authToken', bearer);
    globalThis.localStorage.setItem('username', username);
    globalThis.localStorage.setItem('claims', JSON.stringify(claims));
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
  emitAuthChanged();

  const icon = document.createElement('wa-icon');
  icon.setAttribute('name', 'rainbow');
  icon.setAttribute('label', 'time to relax');
  icon.setAttribute('style', 'font-size: 254px; color: green');
  icon.classList.add('wa-font-size-xxl');
  replaceMainContent(icon);

  if (token) {
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{"logout": "Yes"}'
    })
      .then((response) => {
        if (!response.ok) {
          const msg = `Logout request failed: ${response.status} ${response.statusText}`;
          console.error(msg);
          throw new Error(msg);
        }
        return response.text();
      })
      .then((_text) => true)
      .catch((error) => {
        console.error('Logout request failed:', error);
        return false;
      });
    return response;
  } else {
    console.warn('No auth token found during logout');
    return true;
  }
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
  return username || 'Anonymous';
};
