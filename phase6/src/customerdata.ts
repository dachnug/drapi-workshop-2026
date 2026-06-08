/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Demo-database access. Centralizes fetching (paged and streamed,
 * and, later, posting) of customer records from the demo list endpoint. Paging
 * is tracked by a module-level cursor that callers can read but not write;
 * {@link fetchCustomers} advances it by the number of rows returned and
 * {@link reset} rewinds it. {@link streamCustomers} bypasses paging and streams
 * the full list incrementally into a datagrid.
 *
 * Concurrent fetchCustomers calls share the module cursor and will race; this
 * module is intended for sequential, single-consumer paging.
 *
 * @module customerdata
 */

import { fetchKeepResponse, keepFetch } from './auth';
import type { DnugDatagrid } from './components/dnug-datagrid';

/** The demo customer list endpoint, including its data-source query string. */
export const target = '/api/v1/lists/86C72C1BF64B6DF04825847100373215?dataSource=demo';

/**
 * The paging cursor: the row offset for the next {@link fetchCustomers} call.
 * Exported as a live binding — importers read the current value but cannot
 * assign to it (an external write is a compile error and a runtime `TypeError`).
 */
export let count = 0;

/** Rewinds the paging cursor so the next fetch starts from the top of the list. */
export const reset = (): void => {
  count = 0;
};

/**
 * Fetches one page of customers — `howmany` rows starting at the current
 * cursor — via {@link keepFetch}, and resolves to the parsed response body.
 * Pass-through of `keepFetch` semantics: it attaches the bearer token and
 * parses the body; with `reprompt=false` an unauthenticated call throws rather
 * than prompting for login.
 *
 * @param howmany - The page size (the `count` query parameter).
 * @returns The parsed response body (the same value `keepFetch` resolves).
 * @throws {Error} When keepFetch throws — authentication required, a non-ok HTTP
 * response, or a network failure. The cursor is not advanced on rejection.
 */
export const fetchCustomers = async (howmany: number = 20): Promise<unknown> => {
  const url = `${target}&start=${count}&count=${howmany}`;
  try {
    const result = await keepFetch(url, {}, false);
    count += Array.isArray(result) ? result.length : 0;
    return result;
  } catch (error) {
    const msg = `Error fetching customer list: ${error}`;
    console.error(msg);
    throw error;
  }
};

/**
 * Streams the full customer list (`count=8000`) directly into a datagrid,
 * appending each row as it arrives rather than buffering the whole response.
 *
 * The endpoint returns newline-delimited JSON wrapped in a JSON array. The raw
 * response body is piped through `TextDecoderStream` (bytes → text),
 * {@link splitStream} (text → one chunk per line), {@link parseJSON} (object
 * lines → parsed objects, array brackets dropped) and finally into the sink
 * produced by {@link writeToControl}, which calls `uiControl.addRow` for each
 * parsed row. Because the pipeline is incremental, rows appear in the grid
 * progressively while the response is still being received.
 *
 * @param uiControl - The datagrid that receives each parsed row via `addRow`.
 * @returns A promise that resolves when the whole stream has been consumed.
 * @throws {Error} `Response body is null` when the response has no body, or any
 *   transport/parse error raised during the fetch or while running the pipeline
 *   (e.g. a malformed JSON line). All errors are logged and rethrown.
 */
export const streamCustomers = async (uiControl: DnugDatagrid): Promise<void> => {
  try {
    const response = await fetchKeepResponse(target + '&count=8000', {}, false);
    if (!response.body) {
      throw new Error('Response body is null');
    }
    await response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(splitStream())
      .pipeThrough(parseJSON())
      .pipeTo(writeToControl(uiControl, Date.now()));
  } catch (error) {
    const msg = `Error fetching customer list: ${error}`;
    console.error(msg);
    throw error;
  }
};

/**
 * Builds a `TransformStream` that re-chunks arriving text into one chunk per
 * newline-terminated line.
 *
 * Incoming chunks are appended to an internal buffer and split on `\n`; every
 * complete line is enqueued while the trailing partial line (a chunk may end
 * mid-line) is held back in the buffer for the next chunk. On `flush` any
 * remaining buffered text is enqueued as a final line.
 *
 * @returns A `TransformStream<string, string>` emitting one line per chunk.
 */
const splitStream = (): TransformStream<string, string> => {
  const splitOn = '\n';
  let buffer = '';
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      const parts = buffer.split(splitOn);
      parts.slice(0, -1).forEach((part) => controller.enqueue(part));
      buffer = parts[parts.length - 1];
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer);
    }
  });
};

/**
 * Builds a `TransformStream` that parses each JSON-object line into an object.
 *
 * Each incoming line is inspected: a line ending in `,` is parsed without its
 * trailing comma and the resulting object is enqueued; a line ending in `}` is
 * parsed as-is and enqueued. Any other line — notably the array's `[` and `]`
 * bracket lines — is dropped. A line that looks like an object but is not valid
 * JSON makes `JSON.parse` throw, which errors the stream.
 *
 * @returns A `TransformStream` mapping object lines to parsed objects.
 */
const parseJSON = () => {
  return new TransformStream({
    transform(chunk, controller) {
      // IGNORES THE [ and ]
      if (chunk.endsWith(',')) {
        controller.enqueue(JSON.parse(chunk.slice(0, -1)));
      } else if (chunk.endsWith('}')) {
        controller.enqueue(JSON.parse(chunk));
      }
    }
  });
};

/**
 * Builds the `WritableStream` sink at the end of the streaming pipeline.
 *
 * Each parsed row written to the stream is appended to the grid via
 * `uiControl.addRow`. If the pipeline is aborted (e.g. a parse error upstream)
 * the error is logged via `abort`; on normal completion `close` logs the total
 * elapsed time since `startTime`.
 *
 * @param uiControl - The datagrid that receives each written row via `addRow`.
 * @param startTime - The `Date.now()` timestamp captured when streaming began,
 *   used to compute and log the elapsed time on close.
 * @returns A `WritableStream` that appends each row to the grid.
 */
const writeToControl = (uiControl: DnugDatagrid, startTime: number): WritableStream<any> => {
  return new WritableStream({
    write(json) {
      uiControl.addRow(json);
    },
    abort(err) {
      console.error(err);
    },
    close() {
      const finish = new Date();
      const elapsed = finish.getTime() - startTime;
      console.log(`All customers streamed in ${elapsed} ms`);
    }
  });
};
