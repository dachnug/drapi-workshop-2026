/**
 * @fileoverview The `<dnug-actionbar>` Lit component: the toolbar shown in the
 * page header. Renders the current user plus action buttons (create, settings,
 * color-scheme toggle, help) and a context-sensitive login/logout button. It
 * tracks authentication state and stays in sync by listening for the global
 * `auth-changed` event.
 *
 * @module components/dnug-actionbar
 */

import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/input/input.js';

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { DnugLogin } from './dnug-login';
import { getCurrentUser, isLoggedIn, logout } from '../auth';

/**
 * Toolbar component rendered in the application header.
 *
 * Exposes no public attributes; its reactive state (`loggedIn`,
 * `currentUser`) is derived from the auth module and refreshed whenever an
 * `auth-changed` event fires. Registered as the custom element
 * `<dnug-actionbar>`.
 */
@customElement('dnug-actionbar')
export class DnugActionbar extends LitElement {
  /** Whether a valid session currently exists; drives the login/logout button. */
  @state()
  private loggedIn = isLoggedIn();

  /** Display name of the current user, or `'Anonymous'` when logged out. */
  @state()
  private currentUser = getCurrentUser();

  /**
   * Lit lifecycle hook. Subscribes to the global `auth-changed` event and
   * performs an initial sync of the auth-derived state.
   */
  connectedCallback(): void {
    super.connectedCallback();
    globalThis.addEventListener('auth-changed', this.handleAuthChanged);
    this.syncAuthState();
  }

  /**
   * Lit lifecycle hook. Unsubscribes from the global `auth-changed` event to
   * avoid leaks when the element is removed from the DOM.
   */
  disconnectedCallback(): void {
    globalThis.removeEventListener('auth-changed', this.handleAuthChanged);
    super.disconnectedCallback();
  }

  /** Scoped styles for the toolbar layout (search area and icon cluster). */
  static readonly styles = css`
    .actionbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }

    .search {
      flex: 1 1 auto;
      min-width: 0;
    }

    .search wa-input {
      max-inline-size: 20rem;
      width: 100%;
    }

    .icons {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex: 0 0 auto;
      min-height: var(--wa-form-control-height);
      white-space: nowrap;
    }
  `;

  /**
   * Renders the toolbar: the current-user label and the action-button cluster.
   * The final button toggles between Login and Logout depending on
   * {@link loggedIn}.
   *
   * @returns The Lit template for the toolbar.
   */
  render() {
    return html` <div class="actionbar">
      <div class="search app-desktop-only">${this.currentUser}</div>

      <div class="icons">
        <wa-tooltip for="create-button" without-arrow>Create</wa-tooltip>
        <wa-button id="create-button" appearance="plain" pill>
          <wa-icon name="plus" label="Toggle create menu" class="wa-font-size-l"></wa-icon>
        </wa-button>

        <wa-tooltip for="settings-button" without-arrow>Settings</wa-tooltip>
        <wa-button id="settings-button" appearance="plain" pill>
          <wa-icon name="gear" label="Settings" class="wa-font-size-l"></wa-icon>
        </wa-button>

        <wa-tooltip for="color-scheme-button" without-arrow>Color Scheme</wa-tooltip>
        <wa-button id="color-scheme-button" @click=${this.toggleColorScheme} appearance="plain" pill>
          <wa-icon name="star" label="Toggle color scheme" class="wa-font-size-l"></wa-icon>
        </wa-button>

        <wa-tooltip for="help-button" without-arrow>Help</wa-tooltip>
        <wa-button id="help-button" class="toolbar-help-button" appearance="plain" pill data-drawer="open assistant-drawer">
          <wa-icon name="circle-question" label="Toggle help drawer" class="wa-font-size-l"></wa-icon>
        </wa-button>

        ${this.loggedIn
          ? html`
              <wa-tooltip for="open-logout" without-arrow>Logout</wa-tooltip>
              <wa-button
                id="open-logout"
                class="toolbar-help-button"
                appearance="plain"
                pill
                variant="brand"
                @click=${this.openLogout}>
                <wa-icon name="person-through-window" label="Logout" class="wa-font-size-l"></wa-icon>
              </wa-button>
            `
          : html`
              <wa-tooltip for="open-login" without-arrow>Login</wa-tooltip>
              <wa-button
                id="open-login"
                class="toolbar-help-button"
                appearance="plain"
                pill
                variant="brand"
                @click=${this.openLogin}>
                <wa-icon name="right-to-bracket" label="Login" class="wa-font-size-l"></wa-icon>
              </wa-button>
            `}
      </div>
    </div>`;
  }

  /**
   * Handler for the global `auth-changed` event. Bound as a class field so it
   * has a stable identity for `addEventListener`/`removeEventListener`.
   */
  private readonly handleAuthChanged = () => {
    this.syncAuthState();
  };

  /**
   * Re-reads the login state and current user from the auth module into the
   * component's reactive state, triggering a re-render.
   */
  private syncAuthState() {
    this.loggedIn = isLoggedIn();
    this.currentUser = getCurrentUser();
  }

  /** Toggles the document between light and dark Web Awesome themes. */
  private toggleColorScheme() {
    document.documentElement.classList.toggle('wa-dark');
  }

  /**
   * Opens the login dialog by locating the `#main-login` `<dnug-login>`
   * element and calling its `show()` method. Logs an error if the dialog is
   * not present in the DOM.
   */
  private openLogin() {
    console.log('Login button clicked');
    const loginDialog = document.getElementById('main-login') as DnugLogin;

    if (loginDialog) {
      loginDialog.show();
    } else {
      console.error('Login dialog not found');
    }
  }

  /**
   * Logs the current user out via the auth module, then re-syncs the
   * component's state so the toolbar reflects the logged-out view.
   */
  private async openLogout() {
    console.log('Logout button clicked');
    await logout();
    this.syncAuthState();
  }
}
