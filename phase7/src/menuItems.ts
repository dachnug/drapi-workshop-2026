/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Wires up the application's main menu interactions and the
 * data fetching that backs them. Attaches click handlers for eight menu
 * actions: "API list" (renders the backend REST endpoints), "User info"
 * (renders the authenticated user's details), a "click-only" demo item (a
 * default no-op that logs a warning), and the customer actions "Customer
 * list", "Customer append", "Customer reset", "All customers", and
 * "Streaming customers" that drive the `<dnug-datagrid>` in the main content
 * area.
 *
 * @module menuItems
 */

import { keepFetch } from './auth';
import type { DnugDatagrid } from './components/dnug-datagrid';
import { fetchCustomers, reset, streamCustomers } from './customerdata';
import { replaceMainContent } from './utils';

/**
 * Wires a click event handler to a DOM element by its ID.
 *
 * Attaches the provided handler function to the click event of the element
 * with the specified ID. If the element is not found in the DOM, an error
 * is logged to the console. If no handler is provided, a default no-op
 * handler that logs a warning is used.
 *
 * @param elementId - The ID of the DOM element to attach the handler to
 * @param handler - The callback function to execute on click. Defaults to a
 *   no-op function that logs a warning with the element ID.
 */
const wireClickHandler = (elementId: string, handler = () => console.warn(`No-op handler for element with ID '${elementId}'`)) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener('click', handler);
  } else {
    console.error(`Element with ID '${elementId}' not found; cannot attach click handler.`);
  }
};

/**
 * Attaches click handlers to the static main-menu items in the DOM.
 *
 * Wires the click event of each menu element by ID to its handler:
 * `#apilist` → {@link apiListEventHandler}, `#userinfo` →
 * {@link userInfoEventHandler}, `#clickonly` → the default no-op (logs a
 * warning), `#customerlist` → {@link customerListEventHandler},
 * `#customerreset` → {@link customerResetEventHandler}, `#customerappend`
 * → {@link customerAppendEventHandler}, `#allcustomers` →
 * {@link allCustomersEventHandler}, and `#streamingcustomers` →
 * {@link streamingCustomersEventHandler}. Each binding is made via
 * {@link wireClickHandler}; a menu element that is absent from the DOM is
 * skipped with an error logged to the console.
 *
 * Intended to be invoked once during application start-up.
 */
export const wireUpMainMenu = () => {
  wireClickHandler('apilist', apiListEventHandler);
  wireClickHandler('userinfo', userInfoEventHandler);
  wireClickHandler('clickonly');
  wireClickHandler('customerlist', customerListEventHandler);
  wireClickHandler('customerreset', customerResetEventHandler);
  wireClickHandler('customerappend', customerAppendEventHandler);
  wireClickHandler('allcustomers', allCustomersEventHandler);
  wireClickHandler('streamingcustomers', streamingCustomersEventHandler);
  wireClickHandler('hardware', hardwareEventHandler); // placeholder for future hardware demo
};

/**
 * Event handler for the "Streaming customers" menu item. Finds the existing
 * `<dnug-datagrid>` in the main content area, or creates and inserts one if
 * none exists yet, and then delegates to
 * {@link import('../customerdata').streamCustomers} to stream the full
 * customer list row-by-row into the grid as the rows arrive. Any rejection
 * from `streamCustomers` propagates to the caller.
 *
 * @returns A promise that resolves when streaming is complete.
 */
const streamingCustomersEventHandler = async () => {
  console.log('Streaming customers clicked');
  let clist = document.querySelector('dnug-datagrid') as DnugDatagrid | null;
  if (!clist) {
    clist = document.createElement('dnug-datagrid') as DnugDatagrid;
    clist.fields = '@unid, first_name, last_name,email,Color,Pet';
    replaceMainContent(clist);
  }

  // now start the timer and fetch all customers via streaming
  await streamCustomers(clist);
};

const hardwareEventHandler = async () => {
  console.log('Hardware demo clicked');
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      forms: ['equipment'],
      query: '@All',
      viewRefresh: true,
      noViews: false
    })
  };
  const data = (await keepFetch('/api/v1/query?dataSource=approvals&action=execute', options)) as Array<any>;
  const transformed = data.flatMap(
    (entry) => Object.values(entry.items ?? {}) as Array<{ Equipment?: string; Cost?: number }>
  );
  const reduced = transformed.reduce(
    (accumulator, element) => reduceHardware(accumulator, element),
    {} as Record<string, { total: number; count: number }>
  );
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(reduced, null, 2);
  replaceMainContent(pre);
};

const reduceHardware = (result: Record<string, { total: number; count: number }>, data: { Equipment?: string; Cost?: number }) => {
  if (!data || typeof data.Equipment !== 'string' || data.Equipment.length === 0) {
    return result;
  }

  const equipment = data.Equipment;
  const numericCost = typeof data.Cost === 'number' && Number.isFinite(data.Cost) ? data.Cost : 0;

  if (!result[equipment]) {
    result[equipment] = { total: 0, count: 0 };
  }

  result[equipment].total += numericCost;
  result[equipment].count += 1;
  return result;
};

/**
 * Event handler for the "All customers" menu item. Fetches a single large
 * page of customer data (`fetchCustomers(10000)`) and appends the resulting
 * rows to the datagrid via {@link DnugDatagrid.addRows}, logging the elapsed
 * fetch time. The datagrid is found in the main content area or created and
 * inserted if none exists yet. A non-array response body or a fetch error is
 * logged and rendered as an error message instead of being appended.
 *
 * @returns A promise that resolves when the operation is complete.
 */
const allCustomersEventHandler = async () => {
  console.log('All customers clicked');
  // ensure the datagrid is present
  let clist = document.querySelector('dnug-datagrid') as DnugDatagrid | null;
  if (!clist) {
    clist = document.createElement('dnug-datagrid') as DnugDatagrid;
    clist.fields = '@unid, first_name, last_name,email,Color,Pet';
    replaceMainContent(clist);
  }

  // now start the timer and fetch all customers
  const now = new Date();

  try {
    const newData = await fetchCustomers(10000);
    if (!Array.isArray(newData)) {
      const msg = `Unexpected data format for customers: expected an array but got ${typeof newData}`;
      console.error(msg);
      const pre = document.createElement('pre');
      pre.textContent = msg;
      replaceMainContent(pre);
      return;
    }
    clist.addRows(newData);
  } catch (error) {
    const msg = `Error fetching customer list: ${error}`;
    console.error(msg);
    const pre = document.createElement('pre');
    pre.textContent = msg;
    replaceMainContent(pre);
    return;
  }
  const finish = new Date();
  const elapsed = finish.getTime() - now.getTime();
  console.log(`All customers fetched in ${elapsed} ms`);
};

/**
 * Event handler for the "Customer reset" menu item. Resets the customer data
 * paging cursor and renders a confirmation message in the main content area.
 *
 * @returns void
 */
const customerResetEventHandler = () => {
  console.log('Customer reset clicked');
  reset();
  const pre = document.createElement('pre');
  pre.textContent = 'Customer list reset. Next fetch will start from the beginning.';
  replaceMainContent(pre);
};

/**
 * Event handler for the "Customer append" menu item. Fetches the next page of
 * customer data from the backend and appends it to the existing datagrid
 * (via {@link DnugDatagrid.addRows}) rather than replacing its contents. The
 * datagrid is found in the main content area or created and inserted if none
 * exists yet. Errors are logged and rendered as text content instead.
 *
 * @returns A promise that resolves when the operation is complete.
 */
const customerAppendEventHandler = async () => {
  console.log('Customer append clicked');
  let clist = document.querySelector('dnug-datagrid') as DnugDatagrid | null;
  if (!clist) {
    clist = document.createElement('dnug-datagrid') as DnugDatagrid;
    clist.fields = '@unid, first_name, last_name,email,Color,Pet';
    replaceMainContent(clist);
  }

  try {
    const newData = await fetchCustomers();
    if (!Array.isArray(newData)) {
      const msg = `Unexpected data format for customers: expected an array but got ${typeof newData}`;
      console.error(msg);
      const pre = document.createElement('pre');
      pre.textContent = msg;
      replaceMainContent(pre);
      return;
    }
    clist.addRows(newData);
  } catch (error) {
    const msg = `Error fetching customer list: ${error}`;
    console.error(msg);
    const pre = document.createElement('pre');
    pre.textContent = msg;
    replaceMainContent(pre);
    return;
  }
};

/**
 * Event handler for the "Customer list" menu item. Fetches the customer data
 * from the backend and renders it into a datagrid component in the main content
 * area. Errors are logged and rendered as text content instead of the data grid.
 *
 * @returns A promise that resolves when the operation is complete.
 */
const customerListEventHandler = async () => {
  console.log('Customer list clicked');
  let clist = document.querySelector('dnug-datagrid') as DnugDatagrid | null;
  if (!clist) {
    clist = document.createElement('dnug-datagrid') as DnugDatagrid;
    clist.fields = '@unid, first_name, last_name,email,Color,Pet';
    replaceMainContent(clist);
  }

  try {
    const newData = await fetchCustomers();
    if (!Array.isArray(newData)) {
      const msg = `Unexpected data format for customers: expected an array but got ${typeof newData}`;
      console.error(msg);
      const pre = document.createElement('pre');
      pre.textContent = msg;
      replaceMainContent(pre);
      return;
    }
    clist.data = newData;
  } catch (error) {
    const msg = `Error fetching customer list: ${error}`;
    console.error(msg);
    const pre = document.createElement('pre');
    pre.textContent = msg;
    replaceMainContent(pre);
    return;
  }
};

/**
 * Event handler for the "User info" menu item. Fetches the user information
 * from the backend and renders it into the main content area. Errors are
 * logged and rendered as text content instead of the user info.
 *
 * @returns A promise that resolves when the operation is complete.
 */
const userInfoEventHandler = async () => {
  console.log('User info clicked');
  const pre = document.createElement('pre');
  try {
    const result = await keepFetch('/api/v1/userinfo', {}, true);
    pre.textContent = JSON.stringify(result, null, 2);
    replaceMainContent(pre);
  } catch (error) {
    const msg = `Error fetching user info: ${error}`;
    console.error(msg);
    pre.textContent = msg;
    replaceMainContent(pre);
  }
};

/**
 * Event handler for the "API list" menu item. Fetches the API listing and renders
 * it into the main content area. Errors are logged and rendered as text content
 * instead of the API list.
 *
 * @returns A promise that resolves when the operation is complete.
 */
const apiListEventHandler = async () => {
  console.log('API list clicked');
  const apiList = await getApiListRaw();
  const pre = document.createElement('pre');
  pre.textContent = apiList;
  replaceMainContent(pre);
};

/**
 * Fetches the backend API listing from `/api` and returns it as a
 * pretty-printed JSON string.
 *
 * Errors are handled defensively: a failed HTTP request or a response body
 * that cannot be parsed as JSON does not throw. Instead the error is logged
 * and a human-readable message is returned so it can be displayed directly
 * to the user.
 *
 * @returns A promise resolving to the formatted (2-space indented) JSON on
 *   success, or an error description string on failure.
 */
const getApiListRaw = async (): Promise<string> => {
  const response = await fetch('/api');
  if (!response.ok) {
    const msg = `Error fetching API list: ${response.status} ${response.statusText}`;
    console.error(msg);
    return msg;
  }

  let responseBody: string = 'n/a';
  try {
    responseBody = await response.text();
    return JSON.stringify(JSON.parse(responseBody), null, 2);
  } catch (error) {
    const msg = `Error parsing API list: ${error}. Actual response: ${responseBody}`;
    console.error(msg);
    return msg;
  }
};
