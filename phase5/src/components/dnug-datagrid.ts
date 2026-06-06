/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview The `<dnug-datagrid>` Lit component: a lightweight data grid
 * that renders an array of objects as a table. It is driven by a
 * comma-separated `fields` list and a `data` array, tolerates objects that are
 * missing one or more fields (filling those cells with a placeholder), and
 * shows an empty-state message when there are no fields or no rows. Rows can be
 * appended imperatively via {@link DnugDatagrid.addRow} / {@link DnugDatagrid.addRows}.
 *
 * @module components/dnug-datagrid
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** A single data row: an object whose keys may or may not include each field. */
export type DataRow = Record<string, unknown>;

/**
 * Parses a comma-separated field string into a clean list of field names.
 * Each name is trimmed and empty entries are dropped.
 *
 * @param raw - The raw comma-separated string (e.g. `"name, email ,role"`).
 * @returns The ordered list of non-empty, trimmed field names.
 */
export function parseFields(raw: string): string[] {
  return raw
    .split(',')
    .map((field) => field.trim())
    .filter((field) => field.length > 0);
}

/**
 * Data-grid component. Registered as the custom element `<dnug-datagrid>`.
 */
@customElement('dnug-datagrid')
export class DnugDatagrid extends LitElement {
  /** Comma-separated field names; also settable via the `fields` attribute. */
  @property({ type: String, reflect: true })
  fields = '';

  /** Row objects to render. Property-only (no attribute). */
  @property({ attribute: false })
  data: DataRow[] = [];

  /** Cell fill for a missing/`null`/`undefined` field value. */
  @property({ type: String })
  placeholder = './.';

  /** Message shown when there are no fields or no rows. */
  @property({ type: String, attribute: 'empty-text' })
  emptyText = 'No data to display';

  /** Scoped styles for the grid; layout and color come from Web Awesome tokens. */
  static readonly styles = css`
    :host {
      display: block;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      color: var(--wa-color-text-normal);
    }

    th,
    td {
      text-align: left;
      padding: var(--wa-space-xs, 0.5rem) var(--wa-space-s, 0.75rem);
      border-bottom: var(--wa-border-width-s, 1px) var(--wa-border-style, solid) var(--wa-color-surface-border);
    }

    th {
      font-weight: var(--wa-font-weight-action, 600);
      background-color: var(--wa-color-surface-raised);
    }

    .empty {
      padding: var(--wa-space-l, 1.5rem);
      text-align: center;
      color: var(--wa-color-text-quiet);
    }
  `;

  /**
   * Appends a single row and re-renders, then dispatches a bubbling, composed
   * `row-added` CustomEvent whose `detail` is `{ row }`.
   *
   * @param row - The row object to append.
   */
  public addRow(row: DataRow): void {
    this.data = [...this.data, row];
    this.dispatchEvent(new CustomEvent('row-added', { detail: { row }, bubbles: true, composed: true }));
  }

  /**
   * Appends multiple rows in a single re-render, then dispatches a bubbling,
   * composed `rows-added` CustomEvent whose `detail` is `{ rows }`. An empty
   * array is a no-op (no state change, no event).
   *
   * @param rows - The row objects to append.
   */
  public addRows(rows: DataRow[]): void {
    if (rows.length === 0) {
      return;
    }
    this.data = [...this.data, ...rows];
    this.dispatchEvent(new CustomEvent('rows-added', { detail: { rows }, bubbles: true, composed: true }));
  }

  render() {
    const fields = parseFields(this.fields);
    if (fields.length === 0 || this.data.length === 0) {
      return html`<div class="empty" part="empty">${this.emptyText}</div>`;
    }
    return html`
      <table part="table">
        <thead>
          <tr>
            ${fields.map((field) => html`<th scope="col">${field}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.data.map(
            (row) => html`
              <tr>
                ${fields.map((field) => html`<td>${this.cellValue(row, field)}</td>`)}
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  /**
   * Resolves the display string for one cell. Missing fields (per
   * `Object.hasOwn`), `null`, and `undefined` yield {@link placeholder};
   * every other value (including `false`, `0`, `""`) renders via `String`.
   *
   * @param row - The data object for this row.
   * @param field - The field name to resolve.
   * @returns The cell text.
   */
  private cellValue(row: DataRow, field: string): string {
    if (!Object.hasOwn(row, field)) {
      return this.placeholder;
    }
    const value = row[field];
    if (value === null || value === undefined) {
      return this.placeholder;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return this.placeholder;
      }
    } else {
      return String(value);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dnug-datagrid': DnugDatagrid;
  }
}
