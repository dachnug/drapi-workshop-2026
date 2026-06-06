import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser, isLoggedIn, loginBasic, logout, parseJwtClaims } from '../src/auth';

/** Encodes an object as a base64url string (no padding), as JWTs do. */
const b64url = (obj: unknown): string => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

/** Builds a syntactically valid (unsigned) JWT carrying the given claims. */
const makeToken = (claims: Record<string, unknown>): string => `${b64url({ alg: 'none' })}.${b64url(claims)}.sig`;

const futureExp = () => Math.floor(Date.now() / 1000) + 3600;
const pastExp = () => Math.floor(Date.now() / 1000) - 3600;

beforeEach(() => {
  globalThis.localStorage.clear();
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loginBasic', () => {
  it('stores the token, resolves the username from claims, and signals auth-changed on success', async () => {
    const claims = { CN: 'Alice', exp: futureExp() };
    const token = makeToken(claims);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ bearer: token })
    } as Response);
    const authChanged = vi.fn();
    globalThis.addEventListener('auth-changed', authChanged);

    const result = await loginBasic({ username: ' alice ', password: ' secret ' });

    expect(result).toBe('');
    expect(globalThis.localStorage.getItem('authToken')).toBe(token);
    expect(globalThis.localStorage.getItem('username')).toBe('Alice');
    expect(JSON.parse(globalThis.localStorage.getItem('claims')!)).toMatchObject({ CN: 'Alice' });
    expect(authChanged).toHaveBeenCalledTimes(1);
    // credentials are trimmed before being sent
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ username: 'alice', password: 'secret' });

    globalThis.removeEventListener('auth-changed', authChanged);
  });

  it('returns a message (does not reject) when credentials are blank after trimming', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(loginBasic({ username: '   ', password: 'x' })).resolves.toBe('Username and password are required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a descriptive message on a non-ok HTTP response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    } as Response);

    await expect(loginBasic({ username: 'a', password: 'b' })).resolves.toBe('Login failed: 401 Unauthorized');
  });

  it('falls back to "Unknown user" when the token carries no recognizable name claim', async () => {
    const token = makeToken({ exp: futureExp(), foo: 'bar' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ bearer: token })
    } as Response);

    const result = await loginBasic({ username: 'a', password: 'b' });

    expect(result).toBe('');
    expect(globalThis.localStorage.getItem('username')).toBe('Unknown user');
  });

  it('returns a message when the response is missing the bearer token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    const result = await loginBasic({ username: 'a', password: 'b' });
    expect(result).toContain('bearer token missing');
    expect(globalThis.localStorage.getItem('authToken')).toBeNull();
  });
});

describe('parseJwtClaims', () => {
  it('decodes the claims of a well-formed token', () => {
    const claims = parseJwtClaims(makeToken({ sub: '42', role: 'admin' }));
    expect(claims).toMatchObject({ sub: '42', role: 'admin' });
  });

  it('preserves non-ASCII claim values (e.g. German umlauts)', () => {
    const claims = parseJwtClaims(makeToken({ CN: 'Müller', city: 'Zürich' }));
    expect(claims.CN).toBe('Müller');
    expect(claims.city).toBe('Zürich');
  });

  it('throws on a token that is not three dot-separated parts', () => {
    expect(() => parseJwtClaims('only.two')).toThrow('Invalid JWT format');
  });
});

describe('isLoggedIn', () => {
  it('is false when no token is stored', () => {
    expect(isLoggedIn()).toBe(false);
  });

  it('is true for a stored, unexpired token', () => {
    globalThis.localStorage.setItem('authToken', makeToken({ exp: futureExp() }));
    expect(isLoggedIn()).toBe(true);
  });

  it('is false for an expired token', () => {
    globalThis.localStorage.setItem('authToken', makeToken({ exp: pastExp() }));
    expect(isLoggedIn()).toBe(false);
  });

  it('is false for a token without a numeric exp claim', () => {
    globalThis.localStorage.setItem('authToken', makeToken({ sub: 'x' }));
    expect(isLoggedIn()).toBe(false);
  });

  it('is false (does not throw) for a malformed token', () => {
    globalThis.localStorage.setItem('authToken', 'not-a-jwt');
    expect(isLoggedIn()).toBe(false);
  });
});

describe('logout', () => {
  it('clears the session, signals auth-changed, and posts to the server when a token exists', async () => {
    globalThis.localStorage.setItem('authToken', 'tok');
    globalThis.localStorage.setItem('username', 'Alice');
    globalThis.localStorage.setItem('claims', '{}');
    const authChanged = vi.fn();
    globalThis.addEventListener('auth-changed', authChanged);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'bye'
    } as Response);

    const result = await logout();

    expect(result).toBe(true);
    expect(globalThis.localStorage.getItem('authToken')).toBeNull();
    expect(globalThis.localStorage.getItem('username')).toBeNull();
    expect(globalThis.localStorage.getItem('claims')).toBeNull();
    expect(authChanged).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({ method: 'POST' }));

    globalThis.removeEventListener('auth-changed', authChanged);
  });

  it('returns false when the server logout request fails', async () => {
    globalThis.localStorage.setItem('authToken', 'tok');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    } as Response);

    await expect(logout()).resolves.toBe(false);
    // local session is still cleared regardless of the server outcome
    expect(globalThis.localStorage.getItem('authToken')).toBeNull();
  });

  it('returns true without calling the server when no token is present', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(logout()).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it('returns the stored username', () => {
    globalThis.localStorage.setItem('username', 'Bob');
    expect(getCurrentUser()).toBe('Bob');
  });

  it('returns Anonymous when no username is stored', () => {
    expect(getCurrentUser()).toBe('Anonymous');
  });
});
