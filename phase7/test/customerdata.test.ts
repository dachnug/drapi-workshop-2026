/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// keepFetch touches auth/storage; replace the whole auth module with a stub.
vi.mock('../src/auth', () => ({
  keepFetch: vi.fn(),
  fetchKeepResponse: vi.fn()
}));

import { fetchKeepResponse, keepFetch } from '../src/auth';
import type { DnugDatagrid } from '../src/components/dnug-datagrid';
import { count, fetchCustomers, reset, streamCustomers, target } from '../src/customerdata';

const EXPECTED_TARGET = '/api/v1/lists/86C72C1BF64B6DF04825847100373215?dataSource=demo';

beforeEach(() => {
  vi.mocked(keepFetch).mockReset();
  vi.mocked(fetchKeepResponse).mockReset();
  // The streaming pipeline logs completion (console.log) and errors
  // (console.error); silence both so test output stays clean.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  reset(); // module state persists across tests; rewind the cursor each time
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Wraps `text` in a Response-like object whose body streams its UTF-8 bytes. */
const makeBodyResponse = (text: string, splitAt?: number): { body: ReadableStream<Uint8Array> } => {
  const encoder = new TextEncoder();
  return {
    body: new ReadableStream({
      start(controller) {
        if (splitAt === undefined) {
          controller.enqueue(encoder.encode(text));
        } else {
          // Emit in two chunks that split a line mid-way to exercise
          // splitStream's partial-line buffer + flush.
          controller.enqueue(encoder.encode(text.slice(0, splitAt)));
          controller.enqueue(encoder.encode(text.slice(splitAt)));
        }
        controller.close();
      }
    })
  };
};

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

describe('streamCustomers', () => {
  const PAYLOAD = '[\n{"first_name":"A"},\n{"first_name":"B"}\n]';

  const makeGrid = () => ({ addRow: vi.fn() }) as unknown as DnugDatagrid;

  it('streams each JSON-object line to addRow and drops the array brackets', async () => {
    const grid = makeGrid();
    vi.mocked(fetchKeepResponse).mockResolvedValue(makeBodyResponse(PAYLOAD) as Response);

    await streamCustomers(grid);

    expect(grid.addRow).toHaveBeenCalledTimes(2);
    expect(grid.addRow).toHaveBeenNthCalledWith(1, { first_name: 'A' });
    expect(grid.addRow).toHaveBeenNthCalledWith(2, { first_name: 'B' });
  });

  it('requests the full list with count=8000', async () => {
    const grid = makeGrid();
    vi.mocked(fetchKeepResponse).mockResolvedValue(makeBodyResponse(PAYLOAD) as Response);

    await streamCustomers(grid);

    const url = vi.mocked(fetchKeepResponse).mock.calls[0][0] as string;
    expect(url).toContain('count=8000');
  });

  it('reassembles rows when a line is split across two chunks', async () => {
    const grid = makeGrid();
    // Split right after `{"first_` of the first object line.
    const splitAt = PAYLOAD.indexOf('{"first_') + '{"first_'.length;
    vi.mocked(fetchKeepResponse).mockResolvedValue(makeBodyResponse(PAYLOAD, splitAt) as Response);

    await streamCustomers(grid);

    expect(grid.addRow).toHaveBeenCalledTimes(2);
    expect(grid.addRow).toHaveBeenNthCalledWith(1, { first_name: 'A' });
    expect(grid.addRow).toHaveBeenNthCalledWith(2, { first_name: 'B' });
  });

  it('throws when the response body is null', async () => {
    const grid = makeGrid();
    vi.mocked(fetchKeepResponse).mockResolvedValue({ body: null } as Response);

    await expect(streamCustomers(grid)).rejects.toThrow('Response body is null');
    expect(grid.addRow).not.toHaveBeenCalled();
  });

  it('logs and rethrows a transport error', async () => {
    const grid = makeGrid();
    vi.mocked(fetchKeepResponse).mockRejectedValue(new Error('boom'));

    await expect(streamCustomers(grid)).rejects.toThrow('boom');
    expect(console.error).toHaveBeenCalled();
  });

  it('errors the stream (abort + rethrow) on a malformed JSON line', async () => {
    const grid = makeGrid();
    const bad = '[\n{"first_name":"A"},\n{not json}\n]';
    vi.mocked(fetchKeepResponse).mockResolvedValue(makeBodyResponse(bad) as Response);

    await expect(streamCustomers(grid)).rejects.toThrow();
  });
});
