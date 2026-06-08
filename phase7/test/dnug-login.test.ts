/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Web Awesome components touch browser-only APIs on import; stub them out.
vi.mock('@awesome.me/webawesome/dist/components/button/button.js', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/dialog/dialog.js', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/input/input.js', () => ({}));

// Control the auth boundary so these tests stay focused on the component.
vi.mock('../src/auth', () => ({
  loginBasic: vi.fn()
}));

// Control the OIDC boundary; dnug-login imports oidcauth at module top.
vi.mock('../src/oidcauth', () => ({ oidcLogin: vi.fn() }));

import { loginBasic } from '../src/auth';
import { DnugLogin } from '../src/components/dnug-login';
import { OIDC_DISCOVERY_URL } from '../src/constants';
import { oidcLogin } from '../src/oidcauth';

/** Mounts a fresh <dnug-login> and waits for its first render. */
const mountLogin = async (): Promise<DnugLogin> => {
  const el = document.createElement('dnug-login') as DnugLogin;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

/** Builds a standalone form with native inputs usable as a submit target. */
const makeForm = (username: string, password: string): HTMLFormElement => {
  const form = document.createElement('form');
  form.innerHTML = `<input name="username" value="${username}" /><input name="password" value="${password}" />`;
  return form;
};

// Captured so a failed assertion in the OIDC test cannot leak the location stub.
const realLocation = globalThis.location;

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(loginBasic).mockReset();
  vi.mocked(oidcLogin).mockReset();
  if (globalThis.location !== realLocation) {
    Object.defineProperty(globalThis, 'location', { configurable: true, value: realLocation });
  }
});

describe('DnugLogin', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('dnug-login')).toBe(DnugLogin);
  });

  it('show() and hide() toggle the underlying dialog', async () => {
    const el = await mountLogin();
    const dialog = el.shadowRoot!.querySelector('wa-dialog') as HTMLElement & { open: boolean };

    el.show();
    expect(dialog.open).toBe(true);

    el.hide();
    expect(dialog.open).toBe(false);
  });

  it('submits trimmed-through credentials, then hides the dialog and resets the form on success', async () => {
    vi.mocked(loginBasic).mockResolvedValue('');
    const el = await mountLogin();
    const dialog = el.shadowRoot!.querySelector('wa-dialog') as HTMLElement & { open: boolean };
    el.show();

    const form = makeForm('alice', 'secret');
    const resetSpy = vi.spyOn(form, 'reset');
    const preventDefault = vi.fn();

    await (el as unknown as { handleSubmit: (e: unknown) => Promise<void> }).handleSubmit({
      preventDefault,
      currentTarget: form
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(loginBasic).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
    expect(dialog.open).toBe(false);
    expect(resetSpy).toHaveBeenCalled();
  });

  it('keeps the dialog open and renders the error message on failure', async () => {
    vi.mocked(loginBasic).mockResolvedValue('Login failed: 401 Unauthorized');
    const el = await mountLogin();

    const form = makeForm('alice', 'wrong');
    await (el as unknown as { handleSubmit: (e: unknown) => Promise<void> }).handleSubmit({
      preventDefault: vi.fn(),
      currentTarget: form
    });
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('Login failed: 401 Unauthorized');
  });

  it('defaults missing form fields to empty strings', async () => {
    vi.mocked(loginBasic).mockResolvedValue('Username and password are required');
    const el = await mountLogin();

    const emptyForm = document.createElement('form');
    await (el as unknown as { handleSubmit: (e: unknown) => Promise<void> }).handleSubmit({
      preventDefault: vi.fn(),
      currentTarget: emptyForm
    });

    expect(loginBasic).toHaveBeenCalledWith({ username: '', password: '' });
  });

  it('onOidcLogin redirects to the IdP authorization URL', async () => {
    vi.mocked(oidcLogin).mockResolvedValue('https://idp.example/authorize?x=1');

    // jsdom's location.href setter tries to navigate; swap in a plain stub.
    let hrefValue = 'http://localhost/app';
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        get href() {
          return hrefValue;
        },
        set href(v: string) {
          hrefValue = v;
        }
      }
    });

    try {
      const el = await mountLogin();
      await (el as unknown as { onOidcLogin: () => Promise<void> }).onOidcLogin();

      expect(oidcLogin).toHaveBeenCalledTimes(1);
      expect(oidcLogin).toHaveBeenCalledWith(OIDC_DISCOVERY_URL, 'http://localhost/app');
      expect(globalThis.location.href).toBe('https://idp.example/authorize?x=1');
    } finally {
      Object.defineProperty(globalThis, 'location', { configurable: true, value: realLocation });
    }
  });
});
