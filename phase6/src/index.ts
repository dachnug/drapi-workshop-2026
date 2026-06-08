/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Application entry point. Loads the Web Awesome design-system
 * styles and the `<wa-page>` layout, registers the custom elements
 * (`<dnug-actionbar>`, `<dnug-login>`) via side-effect imports, then wires up
 * the main menu once the DOM is ready.
 *
 * @module index
 */

import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/styles/themes/default.css';
import '@awesome.me/webawesome/dist/components/page/page.js';

import './components/dnug-actionbar';
import './components/dnug-login';
import './components/dnug-datagrid';
import { wireUpMainMenu } from './menuItems';
import { tokenFromCode } from './oidcauth';

/**
 * Handles the OIDC authorization-code callback. When the page loads with a
 * `?code=...` query parameter (the redirect back from the identity provider),
 * it exchanges that code for tokens via {@link tokenFromCode}, using the stored
 * `token_endpoint` (falling back to `/oauth/token`) and the application origin
 * as the redirect URI. A no-op when there is no `code` in the query string.
 */
const checkForOidcRedirect = async () => {
  const params = new URLSearchParams(globalThis.location.search);
  const code = params.get('code');
  const token_endpoint = globalThis.localStorage.getItem('token_endpoint') ?? '/oauth/token';
  const redirectUri = globalThis.location.origin + '/';
  if (code) {
    const token = await tokenFromCode(code, token_endpoint, redirectUri);
    console.log('Received token from OIDC redirect:', token);
  }
};

/**
 * Bootstraps the application: attaches the main-menu event handlers and logs
 * that initialization has completed. Assumes the DOM is already parsed.
 */
const startApplication = () => {
  wireUpMainMenu();
  checkForOidcRedirect();
  console.log('Application initialized');
};

// Initialize the app once the DOM is ready: run immediately if parsing has
// finished, otherwise defer until DOMContentLoaded fires.
if (document.readyState != 'loading') {
  startApplication();
} else {
  document.addEventListener('DOMContentLoaded', startApplication);
}
