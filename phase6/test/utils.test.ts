/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { describe, expect, it } from 'vitest';

import { getWaPage, replaceMainContent } from '../src/utils';

describe('getWaPage', () => {
  it('returns null when wa-page is not present', () => {
    document.body.innerHTML = '<div></div>';

    expect(getWaPage()).toBeNull();
  });

  it('removes children without a slot attribute', () => {
    document.body.innerHTML = `
      <wa-page>
        <div id="remove-me"></div>
        <div id="keep-me" slot="header"></div>
      </wa-page>
    `;

    const waPage = getWaPage();

    expect(waPage).not.toBeNull();
    expect(waPage?.children).toHaveLength(1);
    expect(waPage?.querySelector('#keep-me')).not.toBeNull();
    expect(waPage?.querySelector('#remove-me')).toBeNull();
  });
});

describe('replaceMainContent', () => {
  it('returns null when wa-page is not present', () => {
    document.body.innerHTML = '<div>No wa-page</div>';
    const node = document.createElement('section');

    const result = replaceMainContent(node);

    expect(result).toBeNull();
  });

  it('appends a single element', () => {
    document.body.innerHTML = '<wa-page><div slot="header">Header</div></wa-page>';
    const newNode = document.createElement('section');
    newNode.id = 'main';

    const waPage = replaceMainContent(newNode);

    expect(waPage?.querySelector('#main')).toBe(newNode);
  });

  it('appends an array of elements', () => {
    document.body.innerHTML = '<wa-page><div slot="header">Header</div></wa-page>';
    const first = document.createElement('section');
    first.id = 'first';
    const second = document.createElement('section');
    second.id = 'second';

    const waPage = replaceMainContent([first, second]);

    expect(waPage?.querySelector('#first')).toBe(first);
    expect(waPage?.querySelector('#second')).toBe(second);
  });

  it('appends variadic elements', () => {
    document.body.innerHTML = '<wa-page><div slot="header">Header</div></wa-page>';
    const first = document.createElement('section');
    first.id = 'first';
    const second = document.createElement('section');
    second.id = 'second';

    const waPage = replaceMainContent(first, second);

    expect(waPage?.querySelector('#first')).toBe(first);
    expect(waPage?.querySelector('#second')).toBe(second);
  });
});
