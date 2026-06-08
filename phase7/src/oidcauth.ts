/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview OpenID Connect Authorization-Code-with-PKCE login module.
 * Fetches the OpenID Provider discovery document, generates a PKCE code
 * verifier and matching SHA-256 code challenge, builds the authorization
 * redirect URL that sends the user to the IdP, and later exchanges the
 * callback authorization code for tokens. Login state (code verifier and CSRF
 * state) is held in `sessionStorage`, while the token endpoint is persisted in
 * `localStorage`.
 *
 * @module oidcauth
 */

import { extractCredentials } from './auth';
import { OIDC_CLIENT_ID } from './constants';

/**
 * Resolved OpenID Provider endpoints required for the login flow.
 */
type IdpConfiguration = {
  /** Authorization endpoint the user is redirected to in order to log in. */
  authorizationEndpoint: string;
  /** Token endpoint used to exchange the authorization code for tokens. */
  tokenEndpoint: string;
};

/**
 * Fetches and parses the OpenID Provider discovery document.
 *
 * @param url URL of the OpenID discovery endpoint.
 * @returns Object containing the authorization and token endpoints used for login.
 */
const getIdp = async (url: RequestInfo | URL): Promise<IdpConfiguration> => {
  const response = await fetch(url);
  const json = (await response.json()) as Record<string, unknown>;
  let authorizationEndpoint: string | null = null;
  let tokenEndpoint: string | null = null;

  if (typeof json.authorizationEndpoint === 'string') {
    authorizationEndpoint = json.authorizationEndpoint;
  } else if (typeof json.authorization_endpoint === 'string') {
    authorizationEndpoint = json.authorization_endpoint;
  }

  if (typeof json.tokenEndpoint === 'string') {
    tokenEndpoint = json.tokenEndpoint;
  } else if (typeof json.token_endpoint === 'string') {
    tokenEndpoint = json.token_endpoint;
  }

  if (authorizationEndpoint === null) {
    throw new Error('OIDC discovery document is missing authorization endpoint');
  }
  if (tokenEndpoint === null) {
    throw new Error('OIDC discovery document is missing token endpoint');
  }

  // Same origin check
  if (url.toString().startsWith('/')) {
    tokenEndpoint = new URL(tokenEndpoint).pathname.toString();
    authorizationEndpoint = new URL(authorizationEndpoint).pathname.toString();
  }

  return { authorizationEndpoint, tokenEndpoint };
};

/**
 * Generates a random PKCE code verifier string.
 *
 * @param length Desired verifier length.
 * @returns Random verifier using RFC 7636 allowed characters.
 */
const generateCodeVerifier = (length = 128): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  globalThis.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset.charAt(randomValues[i] % charset.length);
  }
  return result;
};

/**
 * Creates a PKCE S256 code challenge from a verifier.
 *
 * @param codeVerifier PKCE code verifier.
 * @returns Base64URL encoded SHA-256 digest.
 */
const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
};

/**
 * Encodes binary data using Base64URL format.
 *
 * @param buffer Input binary buffer.
 * @returns Base64URL encoded string without padding.
 */
const base64UrlEncode = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCodePoint(...new Uint8Array(buffer)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
};

/**
 * Builds the authorization URL for redirecting the user to the IdP.
 *
 * @param redirectURI Callback URI registered for the OIDC client.
 * @param config IdP configuration with authorization endpoint.
 * @param codeChallenge PKCE code challenge derived from verifier.
 * @param state CSRF state value to validate callback integrity.
 * @returns Fully formed authorization URL including query parameters.
 */
const loginUrl = (redirectURI: string | URL, config: IdpConfiguration, codeChallenge: string, state: string): string => {
  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectURI.toString(),
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'openid email',
    state: state
  });

  return `${config.authorizationEndpoint}?${params}`;
};

/**
 * Starts the OIDC login flow using PKCE.
 *
 * Generates a code verifier, state, and code challenge, fetches the IdP
 * configuration, and redirects the browser to the provider login URL.
 *
 * @param configUrl URL of the OpenID Provider discovery document
 * (`.well-known/openid-configuration`).
 * @param redirectURI Callback URI registered for the OIDC client.
 * @returns Promise that resolves to the authorization URL.
 */
export const oidcLogin = async (configUrl: RequestInfo | URL, redirectURI: string | URL): Promise<string> => {
  try {
    const codeVerifier = generateCodeVerifier();
    const state = generateCodeVerifier(32);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const config = await getIdp(configUrl);

    globalThis.sessionStorage.setItem('oidc_code_verifier', codeVerifier);
    globalThis.sessionStorage.setItem('oidc_state', state);
    globalThis.localStorage.setItem('token_endpoint', config.tokenEndpoint);

    return loginUrl(redirectURI, config, codeChallenge, state);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown OIDC error';
    console.error(message);
    throw new Error(`Failed to initiate OIDC login: ${message}`);
  }
};

/**
 * Exchanges an OIDC authorization code for tokens at the IdP token endpoint.
 *
 * Reads the PKCE code verifier and CSRF state previously stored in
 * `sessionStorage` by {@link oidcLogin}, then POSTs an
 * `application/x-www-form-urlencoded` token request using the
 * `authorization_code` grant. On success the resulting credentials are handed
 * to {@link extractCredentials} for persistence.
 *
 * @param code Authorization code received on the OIDC callback.
 * @param token_endpoint IdP token endpoint URL to POST the request to.
 * @param redirectURI Callback URI that was used to obtain the code.
 * @returns Promise resolving to the parsed token response JSON.
 * @throws {Error} If the token request returns a non-ok HTTP status.
 */
export const tokenFromCode = async (code: string, token_endpoint: string, redirectURI: string | URL) => {
  const state = globalThis.sessionStorage.getItem('oidc_state');
  const codeVerifier = globalThis.sessionStorage.getItem('oidc_code_verifier');

  const tokenResponse = await fetch(token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OIDC_CLIENT_ID,
      code: code ?? '',
      redirect_uri: redirectURI.toString(),
      code_verifier: codeVerifier ?? '',
      state: state ?? ''
    })
  });
  if (!tokenResponse.ok) {
    throw new Error(`IdP login failed ${tokenResponse.status}:${tokenResponse.statusText}`);
  }
  const json = await tokenResponse.json();
  extractCredentials(json);
  return json;
};
