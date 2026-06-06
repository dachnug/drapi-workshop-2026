/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Demo-database access. Centralizes fetching (and, later, posting)
 * of customer records from the demo list endpoint. Paging is tracked by a
 * module-level cursor that callers can read but not write; {@link fetchCustomers}
 * advances it by the number of rows returned and {@link reset} rewinds it.
 *
 * Concurrent fetchCustomers calls share the module cursor and will race; this
 * module is intended for sequential, single-consumer paging.
 *
 * @module customerdata
 */

import { keepFetch } from './auth';

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
