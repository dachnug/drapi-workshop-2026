import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Web Awesome components touch browser-only APIs on import; stub them out.
vi.mock('@awesome.me/webawesome/dist/components/button/button.js', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/tooltip/tooltip.js', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/icon/icon.js', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/input/input.js', () => ({}));

vi.mock('../src/auth', () => ({
  isLoggedIn: vi.fn(() => false),
  getCurrentUser: vi.fn(() => 'Anonymous'),
  logout: vi.fn(async () => true)
}));

import { getCurrentUser, isLoggedIn, logout } from '../src/auth';
import { DnugActionbar } from '../src/components/dnug-actionbar';

/** Mounts a fresh <dnug-actionbar> and waits for its first render. */
const mountActionbar = async (): Promise<DnugActionbar> => {
  const el = document.createElement('dnug-actionbar') as DnugActionbar;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.classList.remove('wa-dark');
  vi.mocked(isLoggedIn).mockReturnValue(false);
  vi.mocked(getCurrentUser).mockReturnValue('Anonymous');
  vi.mocked(logout).mockResolvedValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DnugActionbar', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('dnug-actionbar')).toBe(DnugActionbar);
  });

  it('shows the current user and a Login affordance when logged out', async () => {
    vi.mocked(getCurrentUser).mockReturnValue('Anonymous');
    vi.mocked(isLoggedIn).mockReturnValue(false);

    const el = await mountActionbar();

    expect(el.shadowRoot!.textContent).toContain('Anonymous');
    expect(el.shadowRoot!.querySelector('#open-login')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('#open-logout')).toBeNull();
  });

  it('shows a Logout affordance and the username when logged in', async () => {
    vi.mocked(isLoggedIn).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockReturnValue('Alice');

    const el = await mountActionbar();

    expect(el.shadowRoot!.textContent).toContain('Alice');
    expect(el.shadowRoot!.querySelector('#open-logout')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('#open-login')).toBeNull();
  });

  it('re-syncs its view when an auth-changed event fires', async () => {
    const el = await mountActionbar();
    expect(el.shadowRoot!.querySelector('#open-login')).not.toBeNull();

    // Simulate a login happening elsewhere.
    vi.mocked(isLoggedIn).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockReturnValue('Alice');
    globalThis.dispatchEvent(new CustomEvent('auth-changed'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('#open-logout')).not.toBeNull();
    expect(el.shadowRoot!.textContent).toContain('Alice');
  });

  it('stops reacting to auth-changed after being disconnected', async () => {
    const el = await mountActionbar();
    el.remove();

    vi.mocked(isLoggedIn).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockReturnValue('Alice');
    globalThis.dispatchEvent(new CustomEvent('auth-changed'));
    await el.updateComplete;

    // The detached element should not have re-rendered into the logged-in state.
    expect(el.shadowRoot!.querySelector('#open-logout')).toBeNull();
  });

  it('toggles the dark color scheme on the document element', async () => {
    const el = await mountActionbar();
    expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

    (el as unknown as { toggleColorScheme: () => void }).toggleColorScheme();
    expect(document.documentElement.classList.contains('wa-dark')).toBe(true);

    (el as unknown as { toggleColorScheme: () => void }).toggleColorScheme();
    expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
  });

  it('opens the login dialog by id when present', async () => {
    const el = await mountActionbar();
    const dialog = document.createElement('div');
    dialog.id = 'main-login';
    const show = vi.fn();
    (dialog as unknown as { show: () => void }).show = show;
    document.body.appendChild(dialog);

    (el as unknown as { openLogin: () => void }).openLogin();

    expect(show).toHaveBeenCalledTimes(1);
  });

  it('logs an error when the login dialog is missing', async () => {
    const el = await mountActionbar();
    const errorSpy = vi.spyOn(console, 'error');

    (el as unknown as { openLogin: () => void }).openLogin();

    expect(errorSpy).toHaveBeenCalledWith('Login dialog not found');
  });

  it('logs out and re-syncs to the logged-out view', async () => {
    vi.mocked(isLoggedIn).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockReturnValue('Alice');
    const el = await mountActionbar();
    expect(el.shadowRoot!.querySelector('#open-logout')).not.toBeNull();

    // After logout the session is gone.
    vi.mocked(isLoggedIn).mockReturnValue(false);
    vi.mocked(getCurrentUser).mockReturnValue('Anonymous');
    await (el as unknown as { openLogout: () => Promise<void> }).openLogout();
    await el.updateComplete;

    expect(logout).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.querySelector('#open-login')).not.toBeNull();
  });
});
