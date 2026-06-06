import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils', () => ({
  replaceMainContent: vi.fn()
}));

import { replaceMainContent } from '../src/utils';
import { wireUpMainMenu } from '../src/menuItems';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('wireUpMainMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul><li id="apilist">List APIs</li></ul>';
    vi.restoreAllMocks();
  });

  it('fetches /api and renders formatted response on click', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '{"service":"ok"}'
    } as Response);

    wireUpMainMenu();

    document.getElementById('apilist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith('/api');
    expect(replaceMainContent).toHaveBeenCalledTimes(1);

    const renderedNode = vi.mocked(replaceMainContent).mock.calls[0][0] as HTMLElement;
    expect(renderedNode.tagName).toBe('PRE');
    expect(renderedNode.textContent).toContain('"service": "ok"');
  });

  it('renders a descriptive error when parsing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'not json'
    } as Response);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    wireUpMainMenu();

    document.getElementById('apilist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const renderedNode = vi.mocked(replaceMainContent).mock.calls[0][0] as HTMLElement;
    expect(renderedNode.textContent).toContain('Error parsing API list');
    expect(renderedNode.textContent).toContain('Actual response: not json');
  });

  it('renders a descriptive error when API responds with non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    } as Response);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    wireUpMainMenu();

    document.getElementById('apilist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith('/api');
    const renderedNode = vi.mocked(replaceMainContent).mock.calls[0][0] as HTMLElement;
    expect(renderedNode.textContent).toContain('Error fetching API list: 503 Service Unavailable');
  });

  it('does nothing when #apilist is missing', () => {
    document.body.innerHTML = '<ul><li id="other">Other</li></ul>';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    wireUpMainMenu();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(replaceMainContent).not.toHaveBeenCalled();
  });
});
