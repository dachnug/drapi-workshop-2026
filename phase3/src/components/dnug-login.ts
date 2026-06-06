/**
 * @fileoverview The `<dnug-login>` Lit component: a modal login dialog wrapping
 * a username/password form. On submit it delegates to {@link loginBasic}; on
 * success the dialog closes and the form resets, on failure the returned error
 * message is shown inline.
 *
 * @module components/dnug-login
 */

import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import '@awesome.me/webawesome/dist/components/input/input.js';

import { LitElement, css, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { loginBasic } from '../auth';

import type WaDialog from '@awesome.me/webawesome/dist/components/dialog/dialog.js';

/**
 * Modal login dialog component.
 *
 * Imperatively opened/closed via {@link show}/{@link hide} (typically from
 * `<dnug-actionbar>`). Registered as the custom element `<dnug-login>`.
 */
@customElement('dnug-login')
export class DnugLogin extends LitElement {
  /** Reference to the underlying Web Awesome `<wa-dialog>` element. */
  @query('wa-dialog')
  private readonly dialogElement!: WaDialog;

  /** Inline error message shown in the form footer; empty when there is none. */
  private msg: string = '';

  /** Scoped styles: grid layout for the form and error-colored message text. */
  static readonly styles = css`
    form {
      display: grid;
      gap: 0.75rem;
    }

    p {
      color: var(--wa-color-error);
    }
  `;

  /** Opens the login dialog. */
  public show(): void {
    this.dialogElement.open = true;
  }

  /** Closes the login dialog. */
  public hide(): void {
    this.dialogElement.open = false;
  }

  /**
   * Handles the login form submission.
   *
   * Prevents the default browser submit, reads the username/password from the
   * form, and delegates to {@link loginBasic}. On success (falsy result) the
   * dialog is hidden and the form reset; otherwise the returned error message
   * is stored and a re-render is requested to display it.
   *
   * @param event - The form's submit event.
   */
  private async handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const username = formData.get('username') ?? '';
    const password = formData.get('password') ?? '';
    this.msg = await loginBasic({ username, password });
    if (!this.msg) {
      this.hide();
      form.reset();
    } else {
      this.requestUpdate();
    }
  }

  /**
   * Renders the login dialog containing the username/password form and an
   * inline message area for errors.
   *
   * @returns The Lit template for the dialog.
   */
  render() {
    return html`
      <wa-dialog label="Login">
        <form @submit=${this.handleSubmit}>
          <wa-input name="username" label="Username" required></wa-input>
          <wa-input name="password" label="Password" type="password" required password-toggle></wa-input>
          <wa-button slot="footer" type="submit" variant="brand">Login</wa-button>
          <p slot="footer">${this.msg}</p>
        </form>
      </wa-dialog>
    `;
  }
}
