/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview DOM helpers for swapping the main content area of the
 * Web Awesome `<wa-page>` layout. The page shell (header, navigation and
 * other slotted elements) is preserved while the unslotted "main" content
 * is replaced.
 *
 * @module utils
 */

/**
 * Returns the first `<wa-page>` element in the document after clearing its
 * main content.
 *
 * All direct children **without** a `slot` attribute are removed, because
 * those represent the swappable main content. Children that are assigned to
 * a named slot (header, navigation, footer, etc.) are left untouched so the
 * surrounding page chrome stays intact.
 *
 * @returns The `<wa-page>` element ready to receive new content, or `null`
 *   if no `<wa-page>` exists in the document.
 */
export const getWaPage = (): HTMLElement | null => {
  const waPage = document.querySelector('wa-page');

  if (!waPage) {
    return null;
  }

  // Remove all children that don't have a slot attribute
  const children = Array.from(waPage.children);
  children.forEach((child) => {
    if (!child.hasAttribute('slot')) {
      child.remove();
    }
  });

  return waPage;
};

/**
 * Replaces the main content of the `<wa-page>` with the given element(s).
 *
 * The existing unslotted content is cleared first (via {@link getWaPage}),
 * then the supplied elements are appended in order. Accepts either a single
 * element, an array of elements, or several elements as rest arguments.
 *
 * @param elements - A single element, or an array of elements to render as
 *   the new main content.
 * @param rest - Additional elements to append, when callers pass elements as
 *   separate arguments rather than an array.
 * @returns The `<wa-page>` element the content was appended to, or `null`
 *   if no `<wa-page>` exists in the document.
 *
 * @example
 * const pre = document.createElement('pre');
 * pre.textContent = 'hello';
 * replaceMainContent(pre);
 */
export const replaceMainContent = (elements: HTMLElement | HTMLElement[], ...rest: HTMLElement[]): HTMLElement | null => {
  const waPage = getWaPage();

  if (!waPage) {
    return null;
  }

  // Normalize input to an array
  const elementsToAdd = Array.isArray(elements) ? elements : [elements, ...rest];

  elementsToAdd.forEach((element) => {
    waPage.appendChild(element);
  });

  return waPage;
};
