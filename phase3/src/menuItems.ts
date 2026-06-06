/**
 * @fileoverview Wires up the application's main menu interactions and the
 * data fetching that backs them. Currently provides the "API list" menu
 * action, which retrieves the available REST endpoints from the backend and
 * renders them into the main content area.
 *
 * @module menuItems
 */

import { replaceMainContent } from './utils';

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
  const apiListMenuItem = document.getElementById('apilist');
  if (apiListMenuItem) {
    apiListMenuItem.addEventListener('click', async () => {
      console.log('API list clicked');
      const apiList = await getApiListRaw();
      const pre = document.createElement('pre');
      pre.textContent = apiList;
      replaceMainContent(pre);
    });
  }
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
