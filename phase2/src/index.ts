/**
 * @fileoverview Application entry point. Loads the Web Awesome design-system
 * styles and the `<wa-page>` layout component, then wires up the main menu
 * once the DOM is ready.
 *
 * @module index
 */

import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/styles/themes/default.css';

import '@awesome.me/webawesome/dist/components/page/page.js';
import { wireUpMainMenu } from './menuItems';

/**
 * Bootstraps the application: attaches the main-menu event handlers and logs
 * that initialization has completed. Assumes the DOM is already parsed.
 */
const startApplication = () => {
  wireUpMainMenu();
  console.log('Application initialized');
};

// Initialize the app once the DOM is ready: run immediately if parsing has
// finished, otherwise defer until DOMContentLoaded fires.
if (document.readyState != 'loading') {
  startApplication();
} else {
  document.addEventListener('DOMContentLoaded', startApplication);
}
