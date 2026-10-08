import { isSafeSupraSpaceLinkHref } from './supra-space-links';

type CssColorNormalizer = (value: string | null | undefined) => string | null;

const INLINE_STYLE_TAGS = new Set([
  'a', 'b', 'code', 'del', 'em', 'font', 'i', 'mark', 's', 'span', 'strike', 'strong', 'u',
]);
const BLOCK_STYLE_DESCENDANTS = 'address,article,aside,blockquote,div,dl,fieldset,footer,form,h1,h2,h3,h4,h5,h6,header,li,main,ol,p,pre,section,table,ul';
const DISALLOWED_TAGS = 'embed,frame,iframe,link,meta,object,script,style';

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
