/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils', () => ({
  replaceMainContent: vi.fn()
}));
vi.mock('../src/customerdata', () => ({
  fetchCustomers: vi.fn(),
  reset: vi.fn(),
  streamCustomers: vi.fn()
}));
vi.mock('../src/auth', () => ({
  keepFetch: vi.fn()
}));

import '../src/components/dnug-datagrid';
import type { DnugDatagrid } from '../src/components/dnug-datagrid';
import { keepFetch } from '../src/auth';
import { fetchCustomers, reset, streamCustomers } from '../src/customerdata';
import { wireUpMainMenu } from '../src/menuItems';
import { replaceMainContent } from '../src/utils';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

/** Returns the element passed to the Nth replaceMainContent call. */
const renderedAt = (index: number): HTMLElement => vi.mocked(replaceMainContent).mock.calls[index][0] as HTMLElement;

/** Returns the element passed to the last replaceMainContent call. */
const lastRendered = (): HTMLElement => {
  const calls = vi.mocked(replaceMainContent).mock.calls;
  return calls[calls.length - 1][0] as HTMLElement;
};

describe('wireUpMainMenu', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<ul><li id="apilist">List APIs</li><li id="userinfo"></li><li id="clickonly"></li><li id="customerlist"></li><li id="customerreset"></li><li id="customerappend"></li><li id="allcustomers"></li><li id="streamingcustomers"></li></ul>';
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

    const renderedNode = renderedAt(0);
    expect(renderedNode.tagName).toBe('PRE');
    expect(renderedNode.textContent).toContain('"service": "ok"');
  });

  it('renders a descriptive error when parsing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'not json'
    } as Response);

    wireUpMainMenu();

    document.getElementById('apilist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const renderedNode = renderedAt(0);
    expect(renderedNode.textContent).toContain('Error parsing API list');
    expect(renderedNode.textContent).toContain('Actual response: not json');
  });

  it('renders a descriptive error when API responds with non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    } as Response);

    wireUpMainMenu();

    document.getElementById('apilist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith('/api');
    const renderedNode = renderedAt(0);
    expect(renderedNode.textContent).toContain('Error fetching API list: 503 Service Unavailable');
  });

  it('does nothing when #apilist is missing', () => {
    document.body.innerHTML = '<ul><li id="other">Other</li></ul>';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    wireUpMainMenu();

    document.getElementById('other')?.dispatchEvent(new Event('click'));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(replaceMainContent).not.toHaveBeenCalled();
  });

  it('customerlist: fetches rows and renders them into a datagrid', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    vi.mocked(fetchCustomers).mockResolvedValue(rows);

    wireUpMainMenu();
    document.getElementById('customerlist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(fetchCustomers).toHaveBeenCalledTimes(1);
    const grid = renderedAt(0) as DnugDatagrid;
    expect(grid.tagName.toLowerCase()).toBe('dnug-datagrid');
    expect(grid.data).toEqual(rows);
  });

  it('customerlist: renders an error when the body is not an array', async () => {
    vi.mocked(fetchCustomers).mockResolvedValue({});

    wireUpMainMenu();
    document.getElementById('customerlist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Unexpected data format');
  });

  it('customerlist: renders an error when the fetch rejects', async () => {
    vi.mocked(fetchCustomers).mockRejectedValue(new Error('boom'));

    wireUpMainMenu();
    document.getElementById('customerlist')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Error fetching customer list');
  });

  it('customerappend: appends fetched rows to the datagrid', async () => {
    const rows = [{ id: 7 }, { id: 8 }];
    vi.mocked(fetchCustomers).mockResolvedValue(rows);

    wireUpMainMenu();
    document.getElementById('customerappend')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(fetchCustomers).toHaveBeenCalledTimes(1);
    const grid = renderedAt(0) as DnugDatagrid;
    expect(grid.tagName.toLowerCase()).toBe('dnug-datagrid');
    expect(grid.data).toEqual(rows);
  });

  it('customerappend: renders an error when the body is not an array', async () => {
    vi.mocked(fetchCustomers).mockResolvedValue({});

    wireUpMainMenu();
    document.getElementById('customerappend')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Unexpected data format');
  });

  it('customerappend: renders an error when the fetch rejects', async () => {
    vi.mocked(fetchCustomers).mockRejectedValue(new Error('boom'));

    wireUpMainMenu();
    document.getElementById('customerappend')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Error fetching customer list');
  });

  it('allcustomers: fetches a large page and appends the rows to the datagrid', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    vi.mocked(fetchCustomers).mockResolvedValue(rows);

    wireUpMainMenu();
    document.getElementById('allcustomers')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(fetchCustomers).toHaveBeenCalledWith(10000);
    const grid = renderedAt(0) as DnugDatagrid;
    expect(grid.tagName.toLowerCase()).toBe('dnug-datagrid');
    expect(grid.data).toEqual(rows);
  });

  it('allcustomers: renders an error when the body is not an array', async () => {
    vi.mocked(fetchCustomers).mockResolvedValue({});

    wireUpMainMenu();
    document.getElementById('allcustomers')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Unexpected data format');
  });

  it('allcustomers: renders an error when the fetch rejects', async () => {
    vi.mocked(fetchCustomers).mockRejectedValue(new Error('boom'));

    wireUpMainMenu();
    document.getElementById('allcustomers')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Error fetching customer list');
  });

  it('streamingcustomers: delegates the datagrid to streamCustomers', async () => {
    vi.mocked(streamCustomers).mockResolvedValue(undefined);

    wireUpMainMenu();
    document.getElementById('streamingcustomers')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(streamCustomers).toHaveBeenCalledTimes(1);
    const grid = vi.mocked(streamCustomers).mock.calls[0][0] as DnugDatagrid;
    expect(grid.tagName).toBe('DNUG-DATAGRID');
    expect(renderedAt(0)).toBe(grid);
  });

  it('customerreset: resets the cursor and renders a confirmation', () => {
    wireUpMainMenu();
    document.getElementById('customerreset')?.dispatchEvent(new Event('click'));

    expect(reset).toHaveBeenCalledTimes(1);
    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('reset');
  });

  it('userinfo: fetches and renders the user info', async () => {
    vi.mocked(keepFetch).mockResolvedValue({ user: 'alice' });

    wireUpMainMenu();
    document.getElementById('userinfo')?.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(keepFetch).toHaveBeenCalledWith('/api/v1/userinfo', {}, true);
    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('"alice"');
  });

  it('userinfo: renders an error when the fetch rejects', async () => {
    vi.mocked(keepFetch).mockRejectedValue(new Error('nope'));

    wireUpMainMenu();
    document.getElementById('userinfo')?.dispatchEvent(new Event('click'));
    await flushPromises();

    const node = lastRendered();
    expect(node.tagName).toBe('PRE');
    expect(node.textContent).toContain('Error fetching user info');
  });

  it('clickonly: the default no-op handler logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    wireUpMainMenu();
    document.getElementById('clickonly')?.dispatchEvent(new Event('click'));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('clickonly'));
  });

  it('wireClickHandler: logs an error for a missing menu element', () => {
    document.body.innerHTML = '<ul><li id="apilist"></li></ul>';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    wireUpMainMenu();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Element with ID 'userinfo' not found"));
  });
});
