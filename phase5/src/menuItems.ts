/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Wires up the application's main menu interactions and the
 * data fetching that backs them. Currently provides the "API list" menu
 * action, which retrieves the available REST endpoints from the backend and
 * renders them into the main content area.
 *
 * @module menuItems
 */

import { keepFetch } from './auth';
import type { DnugDatagrid } from './components/dnug-datagrid';
import { fetchCustomers, reset } from './customerdata';
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
 * Looks up the `#apilist` menu element and, when present, wires its click
 * event to fetch the raw API list (see {@link getApiListRaw}) and render it
 * as preformatted text in the main content area. Safe to call when the menu
 * item is absent — missing elements are silently skipped.
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
 * Event handler for the "Customer list" menu item. Fetches the customer data
 * from the backend and renders it into a datagrid component in the main content
 * area. Errors are logged and rendered as text content instead of the data grid.
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
