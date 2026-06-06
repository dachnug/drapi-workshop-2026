import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@awesome.me/webawesome/dist/styles/webawesome.css', () => ({}));
vi.mock('@awesome.me/webawesome/dist/styles/themes/default.css', () => ({}));
vi.mock('@awesome.me/webawesome/dist/components/page/page.js', () => ({}));
vi.mock('../src/menuItems', () => ({
  wireUpMainMenu: vi.fn()
}));

import { wireUpMainMenu } from '../src/menuItems';

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
