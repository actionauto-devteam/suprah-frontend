import { isSafeSupraSpaceLinkHref } from './supra-space-links';

type CssColorNormalizer = (value: string | null | undefined) => string | null;

const INLINE_STYLE_TAGS = new Set([
  'a', 'b', 'code', 'del', 'em', 'font', 'i', 'mark', 's', 'span', 'strike', 'strong', 'u',
]);
const BLOCK_STYLE_DESCENDANTS = 'address,article,aside,blockquote,div,dl,fieldset,footer,form,h1,h2,h3,h4,h5,h6,header,li,main,ol,p,pre,section,table,ul';
const DISALLOWED_TAGS = 'embed,frame,iframe,link,meta,object,script,style';

export function supraSpaceClipboardTextLosesPlainText(
  plainText: string,
  convertedHtmlText: string,
): boolean {
  if (!plainText) return false;

  const normalize = (value: string): string => value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '');
  const normalizedPlainText = normalize(plainText);
  const normalizedHtmlText = normalize(convertedHtmlText);

  return Boolean(
    normalizedPlainText
    && !normalizedHtmlText.includes(normalizedPlainText),
  );
}

type SupraSpaceSelectionClipboardData = {
  html: string;
  plainText: string;
};

const SELECTION_COPY_SEMANTIC_TAGS = new Set([
  'a', 'b', 'br', 'code', 'del', 'em', 'i', 's', 'strong', 'u',
]);

export function hasSupraSpaceTextSelection(): boolean {
  if (typeof window === 'undefined') return false;
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

export function getSupraSpaceSelectionClipboardData(
  container: HTMLElement,
): SupraSpaceSelectionClipboardData | null {
  if (typeof window === 'undefined') return null;

  const selection = window.getSelection();
  if (
    !selection
    || selection.isCollapsed
    || !selection.toString().trim()
    || selection.rangeCount === 0
    || !container.contains(selection.anchorNode)
    || !container.contains(selection.focusNode)
  ) {
    return null;
  }

  const wrapper = container.ownerDocument.createElement('div');
  wrapper.append(selection.getRangeAt(0).cloneContents());
  Array.from(wrapper.querySelectorAll<HTMLElement>('*')).reverse().forEach(element => {
    const tag = element.tagName.toLowerCase();
    if (!SELECTION_COPY_SEMANTIC_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    const href = tag === 'a' ? element.getAttribute('href') || '' : '';
    Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));
    if (tag === 'a' && isSafeSupraSpaceLinkHref(href)) element.setAttribute('href', href);
  });

  return { html: wrapper.innerHTML, plainText: selection.toString() };
}

export function isSupraSpaceInlineClipboardStyle(element: HTMLElement): boolean {
  return INLINE_STYLE_TAGS.has(element.tagName.toLowerCase())
    && !element.querySelector(BLOCK_STYLE_DESCENDANTS);
}

export function getSupraSpaceClipboardTextColor(
  element: HTMLElement,
  normalizeColor: CssColorNormalizer,
): string | null {
  if (!isSupraSpaceInlineClipboardStyle(element)) return null;
  return normalizeColor(
    element.style.color
    || element.style.getPropertyValue('-webkit-text-fill-color')
    || element.getAttribute('color'),
  );
}

export function getSupraSpaceClipboardHighlight(
  element: HTMLElement,
  normalizeColor: CssColorNormalizer,
): string | null {
  if (!isSupraSpaceInlineClipboardStyle(element)) return null;
  const tag = element.tagName.toLowerCase();
  return normalizeColor(
    element.style.backgroundColor
    || element.style.background
    || element.getAttribute('bgcolor')
    || (tag === 'mark' ? 'yellow' : ''),
  );
}

export function sanitizeSupraSpacePastedEditorHtml(
  html: string,
  normalizeColor: CssColorNormalizer,
): string {
  if (!html.trim()) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll(DISALLOWED_TAGS).forEach(element => element.remove());

  doc.body.querySelectorAll<HTMLElement>('*').forEach(element => {
    const color = getSupraSpaceClipboardTextColor(element, normalizeColor);
    const highlight = getSupraSpaceClipboardHighlight(element, normalizeColor);
    const tag = element.tagName.toLowerCase();
    const href = element.getAttribute('href') || '';
    const safeHref = isSafeSupraSpaceLinkHref(href);

    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const keepAnchorAttribute = tag === 'a'
        && safeHref
        && ['href', 'target', 'rel'].includes(name);
      const keepListAttribute = tag === 'ol' && name === 'start';
      if (!keepAnchorAttribute && !keepListAttribute) element.removeAttribute(attribute.name);
    });

    if (color) element.style.color = color;
    if (highlight) element.style.backgroundColor = highlight;
    if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
  });

  return doc.body.innerHTML;
}
