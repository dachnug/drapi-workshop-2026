/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DnugDatagrid, parseFields } from '../src/components/dnug-datagrid';

/** Mounts a fresh <dnug-datagrid> and waits for its first render. */
const mountGrid = async (): Promise<DnugDatagrid> => {
  const el = document.createElement('dnug-datagrid') as DnugDatagrid;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('parseFields', () => {
  it('splits a comma-separated string into trimmed names', () => {
    expect(parseFields('name, email ,role')).toEqual(['name', 'email', 'role']);
  });

  it('drops empty entries', () => {
    expect(parseFields('name,,email, ,role')).toEqual(['name', 'email', 'role']);
  });

  it('returns an empty array for an empty or whitespace string', () => {
    expect(parseFields('')).toEqual([]);
    expect(parseFields('   ')).toEqual([]);
  });
});

describe('DnugDatagrid', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('dnug-datagrid')).toBe(DnugDatagrid);
  });

  it('exposes the documented defaults', async () => {
    const el = await mountGrid();
    expect(el.fields).toBe('');
    expect(el.data).toEqual([]);
    expect(el.placeholder).toBe('./.');
    expect(el.emptyText).toBe('No data to display');
  });
});

describe('DnugDatagrid empty state', () => {
  it('shows the empty message when fields is empty', async () => {
    const el = await mountGrid();
    el.data = [{ name: 'Alice' }];
    await el.updateComplete;

    const empty = el.shadowRoot!.querySelector('.empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('No data to display');
    expect(el.shadowRoot!.querySelector('table')).toBeNull();
  });

  it('shows the empty message when data is empty', async () => {
    const el = await mountGrid();
    el.fields = 'name,email';
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('table')).toBeNull();
  });

  it('honors a custom empty-text attribute', async () => {
    const el = await mountGrid();
    el.setAttribute('empty-text', 'Nothing here yet');
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toContain('Nothing here yet');
  });
});

describe('DnugDatagrid table rendering', () => {
  const setup = async () => {
    const el = await mountGrid();
    el.fields = 'name, email ,role';
    el.data = [
      { name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { name: 'Bob', email: 'bob@example.com' } // missing role
    ];
    await el.updateComplete;
    return el;
  };

  it('renders one header per field using raw trimmed names in order', async () => {
    const el = await setup();
    const headers = [...el.shadowRoot!.querySelectorAll('th')].map((th) => th.textContent);
    expect(headers).toEqual(['name', 'email', 'role']);
  });

  it('renders one row per data object', async () => {
    const el = await setup();
    expect(el.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('exposes the table and empty CSS parts', async () => {
    const el = await setup();
    expect(el.shadowRoot!.querySelector('[part="table"]')).not.toBeNull();

    el.data = [];
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[part="empty"]')).not.toBeNull();
  });

  it('renders present values and fills missing fields with the default placeholder', async () => {
    const el = await setup();
    const rows = el.shadowRoot!.querySelectorAll('tbody tr');
    const bobCells = [...rows[1].querySelectorAll('td')].map((td) => td.textContent);
    expect(bobCells).toEqual(['Bob', 'bob@example.com', './.']);
  });

  it('uses the placeholder for null and undefined values', async () => {
    const el = await mountGrid();
    el.fields = 'a,b';
    el.data = [{ a: null, b: undefined }];
    await el.updateComplete;
    const cells = [...el.shadowRoot!.querySelectorAll('tbody td')].map((td) => td.textContent);
    expect(cells).toEqual(['./.', './.']);
  });

  it('honors a custom placeholder attribute', async () => {
    const el = await mountGrid();
    el.fields = 'a';
    el.placeholder = 'N/A';
    el.data = [{}];
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('tbody td')!.textContent).toBe('N/A');
  });

  it('treats false, 0, and empty string as real values, not placeholders', async () => {
    const el = await mountGrid();
    el.fields = 'flag,count,note';
    el.data = [{ flag: false, count: 0, note: '' }];
    await el.updateComplete;
    const cells = [...el.shadowRoot!.querySelectorAll('tbody td')].map((td) => td.textContent);
    expect(cells).toEqual(['false', '0', '']);
  });
});

describe('DnugDatagrid addRow', () => {
  it('appends the row, re-renders, and assigns a new data array', async () => {
    const el = await mountGrid();
    el.fields = 'name';
    el.data = [{ name: 'Alice' }];
    await el.updateComplete;
    const before = el.data;

    el.addRow({ name: 'Bob' });
    await el.updateComplete;

    expect(el.data).not.toBe(before); // new array reference
    expect(el.data).toHaveLength(2);
    expect(el.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('dispatches a bubbling, composed row-added event carrying the row', async () => {
    const el = await mountGrid();
    el.fields = 'name';
    await el.updateComplete;
    let received: unknown = null;
    let bubbled = false;
    let composed = false;
    el.addEventListener('row-added', (e) => {
      const ce = e as CustomEvent<{ row: unknown }>;
      received = ce.detail.row;
      bubbled = ce.bubbles;
      composed = ce.composed;
    });

    const row = { name: 'Carol' };
    el.addRow(row);

    expect(received).toEqual(row);
    expect(bubbled).toBe(true);
    expect(composed).toBe(true);
  });
});

describe('DnugDatagrid addRows', () => {
  it('appends all rows in one update and dispatches rows-added', async () => {
    const el = await mountGrid();
    el.fields = 'name';
    el.data = [{ name: 'Alice' }];
    await el.updateComplete;

    let received: unknown = null;
    let bubbled = false;
    let composed = false;
    el.addEventListener('rows-added', (e) => {
      const ce = e as CustomEvent<{ rows: unknown }>;
      received = ce.detail.rows;
      bubbled = ce.bubbles;
      composed = ce.composed;
    });

    const rows = [{ name: 'Bob' }, { name: 'Carol' }];
    el.addRows(rows);
    await el.updateComplete;

    expect(el.data).toHaveLength(3);
    expect(el.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(received).toEqual(rows);
    expect(bubbled).toBe(true);
    expect(composed).toBe(true);
  });

  it('is a no-op for an empty array (no event, no data change)', async () => {
    const el = await mountGrid();
    el.fields = 'name';
    el.data = [{ name: 'Alice' }];
    await el.updateComplete;
    const before = el.data;

    let fired = false;
    el.addEventListener('rows-added', () => {
      fired = true;
    });

    el.addRows([]);
    await el.updateComplete;

    expect(fired).toBe(false);
    expect(el.data).toBe(before); // same reference, untouched
  });
});

describe('DnugDatagrid styling', () => {
  it('defines scoped styles that use Web Awesome design tokens', () => {
    const styleText = DnugDatagrid.styles!.toString();
    expect(styleText).toContain('border-collapse: collapse');
    expect(styleText).toContain('--wa-color-surface-border');
    expect(styleText).toContain('--wa-color-text-quiet');
  });
});
