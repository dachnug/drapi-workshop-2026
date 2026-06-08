/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractCredentials } from '../src/auth';
import { oidcLogin, tokenFromCode } from '../src/oidcauth';

vi.mock('../src/auth', () => ({ extractCredentials: vi.fn() }));

/** Builds a mock discovery Response that returns the given JSON body. */
const discovery = (body: unknown): Response =>
  ({ json: async () => body }) as unknown as Response;

beforeEach(() => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('oidcLogin', () => {
  it('builds a PKCE authorization URL and persists verifier/state/token endpoint (absolute discovery URL)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      discovery({
        authorization_endpoint: 'https://idp.example/authorize',
        token_endpoint: 'https://idp.example/token'
      })
    );

    const result = await oidcLogin(
      'https://idp.example/.well-known/openid-configuration',
      'https://app.example/'
    );

    expect(result.startsWith('https://idp.example/authorize?')).toBe(true);
    const params = new URL(result).searchParams;
    expect(params.get('response_type')).toBe('code');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('code_challenge')).toBeTruthy();
    expect(params.get('state')).toBeTruthy();
    expect(params.get('client_id')).toBeTruthy();
    expect(params.get('redirect_uri')).toBe('https://app.example/');
    expect(params.get('scope')).toBe('openid email');

    expect(globalThis.sessionStorage.getItem('oidc_code_verifier')).toBeTruthy();
    expect(globalThis.sessionStorage.getItem('oidc_state')).toBeTruthy();
    expect(globalThis.localStorage.getItem('token_endpoint')).toBe('https://idp.example/token');
  });

  it('collapses endpoints to pathname for a same-origin (relative) discovery URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      discovery({
        authorization_endpoint: 'https://idp.example/authorize',
        token_endpoint: 'https://idp.example/token'
      })
    );

    const result = await oidcLogin('/.well-known/openid-configuration', 'https://app.example/');

    expect(result.startsWith('/authorize?')).toBe(true);
    expect(globalThis.localStorage.getItem('token_endpoint')).toBe('/token');
  });

  it('supports camelCase discovery keys', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      discovery({
        authorizationEndpoint: 'https://idp.example/authorize',
        tokenEndpoint: 'https://idp.example/token'
      })
    );

    const result = await oidcLogin(
      'https://idp.example/.well-known/openid-configuration',
      'https://app.example/'
    );

    expect(result.startsWith('https://idp.example/authorize?')).toBe(true);
    expect(globalThis.localStorage.getItem('token_endpoint')).toBe('https://idp.example/token');
  });

  it('wraps and rethrows when the authorization endpoint is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      discovery({ token_endpoint: 'https://idp.example/token' })
    );

    await expect(
      oidcLogin('https://idp.example/.well-known/openid-configuration', 'https://app.example/')
    ).rejects.toThrow('Failed to initiate OIDC login');
  });

  it('wraps and rethrows when the token endpoint is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      discovery({ authorization_endpoint: 'https://idp.example/authorize' })
    );

    await expect(
      oidcLogin('https://idp.example/.well-known/openid-configuration', 'https://app.example/')
    ).rejects.toThrow('Failed to initiate OIDC login');
  });
});

describe('tokenFromCode', () => {
  it('POSTs an authorization_code token request, calls extractCredentials, and returns the JSON', async () => {
    globalThis.sessionStorage.setItem('oidc_state', 'thestate');
    globalThis.sessionStorage.setItem('oidc_code_verifier', 'theverifier');
    const json = { access_token: 'abc' };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => json } as Response);

    const result = await tokenFromCode('thecode', 'https://idp.example/token', 'https://app.example/');

    expect(result).toBe(json);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://idp.example/token');
    expect((init as RequestInit).method).toBe('POST');
    const body = (init as RequestInit).body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('thecode');
    expect(body.get('code_verifier')).toBe('theverifier');
    expect(body.get('state')).toBe('thestate');

    expect(extractCredentials).toHaveBeenCalledTimes(1);
    expect(extractCredentials).toHaveBeenCalledWith(json);
  });

  it('throws (without calling extractCredentials) on a non-ok token response', async () => {
    globalThis.sessionStorage.setItem('oidc_state', 'thestate');
    globalThis.sessionStorage.setItem('oidc_code_verifier', 'theverifier');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    } as Response);

    await expect(
      tokenFromCode('thecode', 'https://idp.example/token', 'https://app.example/')
    ).rejects.toThrow('IdP login failed 400');
    expect(extractCredentials).not.toHaveBeenCalled();
  });
});
