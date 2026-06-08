/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@awesome.me/webawesome/dist/styles/webawesome.css', () => ({}));
vi.mock('@awesome.me/webawesome/dist/styles/themes/default.css', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/page/page.js', () => ({}));
vi.mock('../src/components/dnug-actionbar', () => ({}));
vi.mock('../src/components/dnug-login', () => ({}));
vi.mock('../src/components/dnug-datagrid', () => ({}));
vi.mock('../src/menuItems', () => ({
  wireUpMainMenu: vi.fn()
}));
vi.mock('../src/oidcauth', () => ({
  tokenFromCode: vi.fn().mockResolvedValue('mock-token')
}));

import { wireUpMainMenu } from '../src/menuItems';
import { tokenFromCode } from '../src/oidcauth';

const setReadyState = (value: DocumentReadyState) => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => value
  });
};

describe('src/index startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('starts immediately when document is already loaded', async () => {
    setReadyState('complete');
    const addListenerSpy = vi.spyOn(document, 'addEventListener');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await import('../src/index');

    expect(wireUpMainMenu).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Application initialized');
    expect(addListenerSpy).not.toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    // jsdom's default location.search is empty, so no OIDC exchange happens.
    expect(tokenFromCode).not.toHaveBeenCalled();
  });

  it('exchanges the OIDC code on startup when ?code is present', async () => {
    const realLocation = globalThis.location;
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        search: '?code=abc123',
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000/?code=abc123'
      }
    });
    globalThis.localStorage.setItem('token_endpoint', 'https://idp/token');
    // beforeEach's clearAllMocks() wipes the resolved value; restore it here.
    vi.mocked(tokenFromCode).mockResolvedValue('mock-token');

    try {
      setReadyState('complete');
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('../src/index');
      // checkForOidcRedirect is async and not awaited by startApplication,
      // so flush a couple of microtasks for the exchange to run.
      await Promise.resolve();
      await Promise.resolve();

      expect(tokenFromCode).toHaveBeenCalledTimes(1);
      expect(tokenFromCode).toHaveBeenCalledWith(
        'abc123',
        'https://idp/token',
        'http://localhost:3000/'
      );
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: realLocation
      });
      globalThis.localStorage.clear();
    }
  });

  it('waits for DOMContentLoaded when document is loading', async () => {
    setReadyState('loading');
    const addListenerSpy = vi.spyOn(document, 'addEventListener');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await import('../src/index');

    expect(wireUpMainMenu).not.toHaveBeenCalled();

    const domLoadedCall = addListenerSpy.mock.calls.find((call) => call[0] === 'DOMContentLoaded');
    expect(domLoadedCall).toBeDefined();

    const handler = domLoadedCall?.[1] as EventListener;
    handler(new Event('DOMContentLoaded'));

    expect(wireUpMainMenu).toHaveBeenCalledTimes(1);
  });
});
