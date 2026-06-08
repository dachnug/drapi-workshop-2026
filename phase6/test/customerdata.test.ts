/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// keepFetch touches auth/storage; replace the whole auth module with a stub.
vi.mock('../src/auth', () => ({
  keepFetch: vi.fn()
}));

import { keepFetch } from '../src/auth';
import { count, fetchCustomers, reset, target } from '../src/customerdata';

const EXPECTED_TARGET = '/api/v1/lists/86C72C1BF64B6DF04825847100373215?dataSource=demo';

beforeEach(() => {
  vi.mocked(keepFetch).mockReset();
  reset(); // module state persists across tests; rewind the cursor each time
});

describe('customerdata module', () => {
  it('exposes the demo list endpoint as target', () => {
    expect(target).toBe(EXPECTED_TARGET);
  });

  it('starts with a zero cursor', () => {
    expect(count).toBe(0);
  });

  it('reset() leaves the cursor at zero when already zero', () => {
    reset();
    expect(count).toBe(0);
  });
});

describe('fetchCustomers request', () => {
  it('calls keepFetch with start=cursor, count=howmany, empty init, no reprompt', async () => {
    vi.mocked(keepFetch).mockResolvedValue([]);

    await fetchCustomers(5);

    expect(keepFetch).toHaveBeenCalledTimes(1);
    expect(keepFetch).toHaveBeenCalledWith(`${EXPECTED_TARGET}&start=0&count=5`, {}, false);
  });

  it('returns exactly what keepFetch resolves', async () => {
    const body = [{ id: 1 }, { id: 2 }];
    vi.mocked(keepFetch).mockResolvedValue(body);

    const result = await fetchCustomers(2);

    expect(result).toBe(body);
  });
});

describe('fetchCustomers cursor', () => {
  it('advances the cursor by the number of rows returned', async () => {
    vi.mocked(keepFetch).mockResolvedValue([{}, {}, {}]); // 3 rows
    await fetchCustomers(10);
    expect(count).toBe(3);
  });

  it('pages forward: the next call starts where the last page ended', async () => {
    vi.mocked(keepFetch).mockResolvedValueOnce([{}, {}]); // page 1: 2 rows
    await fetchCustomers(2);
    expect(count).toBe(2);

    vi.mocked(keepFetch).mockResolvedValueOnce([{}, {}]); // page 2: 2 rows
    await fetchCustomers(2);

    expect(keepFetch).toHaveBeenLastCalledWith(`${EXPECTED_TARGET}&start=2&count=2`, {}, false);
    expect(count).toBe(4);
  });

  it('advances by zero for an empty page', async () => {
    vi.mocked(keepFetch).mockResolvedValue([]);
    await fetchCustomers(10);
    expect(count).toBe(0);
  });

  it('advances by zero when the body is not an array', async () => {
    vi.mocked(keepFetch).mockResolvedValue({ message: 'no list' });
    await fetchCustomers(10);
    expect(count).toBe(0);
  });

  it('reset() rewinds the cursor so the next fetch starts at zero', async () => {
    vi.mocked(keepFetch).mockResolvedValue([{}, {}, {}]);
    await fetchCustomers(10);
    expect(count).toBe(3);

    reset();
    expect(count).toBe(0);

    vi.mocked(keepFetch).mockResolvedValue([]);
    await fetchCustomers(10);
    expect(keepFetch).toHaveBeenLastCalledWith(`${EXPECTED_TARGET}&start=0&count=10`, {}, false);
  });

  it('does not advance the cursor when keepFetch rejects', async () => {
    vi.mocked(keepFetch).mockRejectedValue(new Error('boom'));

    await expect(fetchCustomers(10)).rejects.toThrow('boom');
    expect(count).toBe(0);
  });
});
