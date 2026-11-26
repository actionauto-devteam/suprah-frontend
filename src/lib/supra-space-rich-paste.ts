import { isSafeSupraSpaceLinkHref } from './supra-space-links';

type CssColorNormalizer = (value: string | null | undefined) => string | null;

type SupraSpacePasteShortcutEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

type SupraSpaceClipboardStyleOptions = {
  normalizeColor?: CssColorNormalizer;
  /**
   * Callers only return the editor's supported font family/size declarations.
   * Keeping this at the clipboard boundary prevents arbitrary source CSS from
   * becoming persisted message formatting.
   */
  getTypographyStyles?: (element: HTMLElement) => string[];
};

const INLINE_STYLE_TAGS = new Set([
  'a', 'b', 'code', 'del', 'em', 'font', 'i', 'mark', 's', 'span', 'strike', 'strong', 'u',
]);
const BLOCK_STYLE_DESCENDANTS = 'address,article,aside,blockquote,div,dl,fieldset,footer,form,h1,h2,h3,h4,h5,h6,header,li,main,ol,p,pre,section,table,ul';
const DISALLOWED_TAGS = 'embed,frame,iframe,link,meta,object,script,style';
const PASTE_PARAGRAPH_ATTRIBUTE = 'data-ss4-paste-paragraph';

/** Transform prose without interpreting literal code as formatting syntax. */
export function mapSupraSpaceMarkupOutsideCode(
  value: string,
  projectMarkup: (value: string) => string,
  preserveMarkers = true,
): string {
  const code: string[] = [];
  let prefix = '\uE000SS4CODE';
  while (value.includes(prefix)) prefix += 'X';
  const protect = (text: string): string => `${prefix}${code.push(text) - 1}\uE001`;
  const protectedText = value
    .replace(/^```[^\n]*\n([\s\S]*?)\n```[ \t]*\r?(?=\n|$)/gm, (match, body: string) => protect(preserveMarkers ? match : body))
    .replace(/`([^`\n]+)`/g, (match, body: string) => protect(preserveMarkers ? match : body));
  const projected = projectMarkup(protectedText);
  return projected.replace(new RegExp(`${prefix}(\\d+)\uE001`, 'g'), (_match, index: string) => code[Number(index)]);
}

/** Project message markup for comparison without interpreting literal code. */
export function supraSpaceMarkupToComparableText(value: string, projectMarkup: (value: string) => string): string {
  return mapSupraSpaceMarkupOutsideCode(value, projectMarkup, false);
}

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

/** Ctrl/⌘+Shift+V is the explicit one-paste text-only override. */
export function isSupraSpacePlainTextPasteShortcut(event: SupraSpacePasteShortcutEvent): boolean {
  return (event.ctrlKey || event.metaKey)
    && event.shiftKey
    && !event.altKey
    && event.key.toLowerCase() === 'v';
}

export type SupraSpaceClipboardSemanticClassFormatting = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

/**
 * Browser clipboard HTML commonly retains class names but not the source
 * stylesheet. Preserve only well-known, portable text semantics from those
 * names. This deliberately does not copy arbitrary classes, layout, theme,
 * backgrounds, or source CSS into a message.
 */
export function getSupraSpaceClipboardSemanticClassFormatting(
  className: string | null | undefined,
): SupraSpaceClipboardSemanticClassFormatting {
  const tokens = String(className || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const has = (pattern: RegExp): boolean => tokens.some(token => pattern.test(token));

  return {
    bold: has(/^(?:bold|font-(?:bold|semibold|extrabold|black)|fw-(?:bold|semibold|[6-9]00)|(?:text|has-text|is)-(?:bold|semibold)|font-weight-(?:bold|[6-9]00))$/),
    italic: has(/^(?:italic|font-italic|fst-italic|(?:text|has-text|is)-italic)$/),
    underline: has(/^(?:underline|text-underline|text-decoration-underline|(?:has-text|is)-underlined)$/),
    strike: has(/^(?:line-through|strikethrough|strike|text-(?:strike|strikethrough)|text-decoration-line-through)$/),
  };
}

export function supraSpaceClipboardHeadingLooksBold(heading: HTMLElement): boolean {
  const weightKind = (weight: string): 'normal' | 'bold' | null => {
    if (weight === 'normal' || weight === 'lighter' || (/^\d+$/.test(weight) && Number.parseInt(weight, 10) < 600)) return 'normal';
    if (weight === 'bold' || weight === 'bolder' || Number.parseInt(weight || '0', 10) >= 600) return 'bold';
    return null;
  };
  const explicitWeight = (element: HTMLElement): 'normal' | 'bold' | null => {
    const inline = weightKind(element.style.fontWeight.trim().toLowerCase());
    if (inline) return inline;
    const tag = element.tagName.toLowerCase();
    return tag === 'b' || tag === 'strong' ? 'bold' : null;
  };
  const stylesheetWeight = (): string => {
    const tag = heading.tagName.toLowerCase();
    const css = Array.from(heading.ownerDocument.querySelectorAll('style'))
      .map(style => style.textContent || '')
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--|-->/g, '');
    let weight = '';
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!rule[1].split(',').some(selector => selector.trim().toLowerCase() === tag)) continue;
      weight = rule[2].match(/font-weight\s*:\s*([^;]+)/i)?.[1].trim().toLowerCase() || weight;
    }
    return weight;
  };
  if ((explicitWeight(heading) || weightKind(stylesheetWeight())) === 'normal') return false;
  const walker = heading.ownerDocument.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    let element = node.parentElement;
    while (element && element !== heading && !explicitWeight(element)) element = element.parentElement;
    if (!element || element === heading) return true;
  }
  return false;
}

export function removeSupraSpaceInvisibleMarkersBeforeCaret(root: HTMLElement): boolean {
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return false;

  const trailingMarkers = /[\u200B-\u200D\u2060\uFEFF]+$/;
  const onlyMarkers = /^[\u200B-\u200D\u2060\uFEFF]*$/;
  const blockTags = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'TR', 'TD', 'TH']);
  const previousLeaf = (start: Node): Node | null => {
    let node: Node | null = start;
    while (node && node !== root) {
      if (node.previousSibling) {
        node = node.previousSibling;
        while (node.lastChild) node = node.lastChild;
        return node;
      }
      node = node.parentNode;
      if (!node || node === root || blockTags.has(node.nodeName)) return null;
    }
    return null;
  };
  const removeWithEmptySpans = (node: Node) => {
    let parent = node.parentNode;
    node.parentNode?.removeChild(node);
    while (parent && parent !== root && parent.nodeName === 'SPAN' && !parent.textContent && !parent.childNodes.length) {
      const next = parent.parentNode;
      next?.removeChild(parent);
      parent = next;
    }
  };

  const caretNode = range.startContainer;
  let caretOffset = range.startOffset;
  const afterCaret = caretNode.nodeType === Node.ELEMENT_NODE ? caretNode.childNodes[caretOffset] ?? null : null;
  let changed = false;
  let leaf: Node | null;

  if (caretNode.nodeType === Node.TEXT_NODE) {
    const text = caretNode as Text;
    const trailing = text.data.slice(0, caretOffset).match(trailingMarkers)?.[0] || '';
    if (trailing) {
      text.deleteData(caretOffset - trailing.length, trailing.length);
      caretOffset -= trailing.length;
      changed = true;
    }
    leaf = caretOffset > 0 ? null : previousLeaf(text);
  } else if (caretOffset > 0) {
    leaf = caretNode.childNodes[caretOffset - 1];
    while (leaf && leaf.lastChild) leaf = leaf.lastChild;
  } else {
    leaf = previousLeaf(caretNode);
  }

  while (leaf) {
    if (leaf.nodeType === Node.TEXT_NODE) {
      const text = leaf as Text;
      if (onlyMarkers.test(text.data)) {
        const previous = previousLeaf(text);
        removeWithEmptySpans(text);
        changed = true;
        leaf = previous;
        continue;
      }
      const trailing = text.data.match(trailingMarkers)?.[0] || '';
      if (trailing) {
        text.deleteData(text.data.length - trailing.length, trailing.length);
        changed = true;
      }
      break;
    }
    if (leaf.nodeName === 'SPAN' && !leaf.childNodes.length) {
      const previous = previousLeaf(leaf);
      removeWithEmptySpans(leaf);
      changed = true;
      leaf = previous;
      continue;
    }
    break;
  }

  if (!changed) return false;
  const nextRange = root.ownerDocument.createRange();
  if (caretNode.nodeType === Node.TEXT_NODE && caretNode.isConnected) {
    nextRange.setStart(caretNode, caretOffset);
  } else if (afterCaret && afterCaret.isConnected) {
    nextRange.setStartBefore(afterCaret);
  } else if (caretNode.isConnected) {
    nextRange.selectNodeContents(caretNode);
    nextRange.collapse(false);
  } else {
    return true;
  }
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

export function scrollSupraSpaceEditorCaretIntoView(editor: HTMLElement): void {
  const scrollToCaret = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editor.contains(selection.focusNode)) return;
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(false);
    let caret: DOMRect | undefined = range.getClientRects()[0];
    if (!caret) {
      const before = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer.childNodes[range.startOffset - 1]
        : range.startContainer;
      if (!before) return;
      const probe = document.createRange();
      probe.selectNode(before);
      const rects = probe.getClientRects();
      caret = rects[rects.length - 1] ?? probe.getBoundingClientRect();
    }
    const box = editor.getBoundingClientRect();
    if (caret.bottom > box.bottom) editor.scrollTop += caret.bottom - box.bottom;
    else if (caret.top < box.top) editor.scrollTop -= box.top - caret.top;
  };
  scrollToCaret();
  requestAnimationFrame(scrollToCaret);
}

export async function writeSupraSpaceMessageToClipboard(html: string, plainText: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      })]);
      return;
    } catch {
      await navigator.clipboard.writeText(plainText);
      return;
    }
  }
  await navigator.clipboard.writeText(plainText);
}

export function keepSupraSpaceListMarkerOnSelectionEdit(root: HTMLElement): boolean {
  const doc = root.ownerDocument;
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0).cloneRange();
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return false;

  const invisible = /[​-‍⁠﻿]/;
  const visibleText = (from: Node, fromOffset: number, to: Node, toOffset: number) => {
    const span = doc.createRange();
    span.setStart(from, fromOffset);
    span.setEnd(to, toOffset);
    return span.toString().replace(/[​-‍⁠﻿]/g, '');
  };
  const apply = () => {
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const whole = doc.createRange();
  whole.selectNodeContents(root);
  if (
    !visibleText(whole.startContainer, whole.startOffset, range.startContainer, range.startOffset)
    && !visibleText(range.endContainer, range.endOffset, whole.endContainer, whole.endOffset)
  ) return false;

  const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer as Element
    : range.startContainer.parentElement;
  const item = startElement?.closest('li');
  if (item && root.contains(item)) {
    if (item.contains(range.endContainer)) return false;
    const itemEnd = doc.createRange();
    itemEnd.selectNodeContents(item);
    itemEnd.collapse(false);
    if (visibleText(itemEnd.startContainer, itemEnd.startOffset, range.endContainer, range.endOffset)) return false;
    if (!visibleText(range.startContainer, range.startOffset, itemEnd.startContainer, itemEnd.startOffset)) return false;
    range.setEnd(itemEnd.startContainer, itemEnd.startOffset);
    return apply();
  }

  let container: Element | null = startElement;
  while (container && container !== root && !/^(DIV|P|BLOCKQUOTE|PRE|TD|TH)$/.test(container.tagName)) container = container.parentElement;
  if (!container || !root.contains(container)) container = root;

  const startPoint = range.cloneRange();
  startPoint.collapse(true);
  const lineStart = doc.createRange();
  lineStart.selectNodeContents(container);
  lineStart.collapse(true);
  const lineEnd = doc.createRange();
  lineEnd.selectNodeContents(container);
  lineEnd.collapse(false);
  for (const lineBreak of Array.from(container.querySelectorAll('br'))) {
    const afterBreak = doc.createRange();
    afterBreak.setStartAfter(lineBreak);
    afterBreak.collapse(true);
    if (afterBreak.compareBoundaryPoints(Range.START_TO_START, startPoint) <= 0) {
      lineStart.setStart(afterBreak.startContainer, afterBreak.startOffset);
      lineStart.collapse(true);
      continue;
    }
    lineEnd.setStartBefore(lineBreak);
    lineEnd.collapse(true);
    break;
  }

  const lineText = visibleText(lineStart.startContainer, lineStart.startOffset, lineEnd.startContainer, lineEnd.startOffset);
  const marker = lineText.match(/^[ \t ]*(?:\d+[.)]|[•◦▪])[ \t ]+/)?.[0];
  if (!marker || lineText.length <= marker.length) return false;
  const prefix = visibleText(lineStart.startContainer, lineStart.startOffset, range.startContainer, range.startOffset);
  if (prefix.length >= marker.length) return false;

  const endPoint = range.cloneRange();
  endPoint.collapse(false);
  if (endPoint.compareBoundaryPoints(Range.START_TO_START, lineEnd) > 0) {
    if (visibleText(lineEnd.startContainer, lineEnd.startOffset, range.endContainer, range.endOffset)) return false;
    range.setEnd(lineEnd.startContainer, lineEnd.startOffset);
  }
  if (visibleText(lineStart.startContainer, lineStart.startOffset, range.endContainer, range.endOffset).length <= marker.length) return false;

  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const lineRange = doc.createRange();
  lineRange.setStart(lineStart.startContainer, lineStart.startOffset);
  lineRange.setEnd(lineEnd.startContainer, lineEnd.startOffset);
  let counted = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!lineRange.intersectsNode(node)) continue;
    const from = node === lineStart.startContainer ? lineStart.startOffset : 0;
    for (let index = from; index < node.data.length; index += 1) {
      if (invisible.test(node.data[index])) continue;
      counted += 1;
      if (counted === marker.length) {
        range.setStart(node, index + 1);
        return apply();
      }
    }
  }
  return false;
}

export function stripSupraSpaceSemanticListMarker(value: string, ordered: boolean): string {
  if (ordered) {
    return value.replace(/^\s*\d+[.)](?:\s+|(?=\S)|\s*$)/u, '');
  }

  return value.replace(
    /^\s*(?:[-*+\u2022\u00b7\u2023\u2043\u25e6\u25aa\u25ab\u25cf\u25cb\u2013\u2014\u2713\u2714\u2611\u2192\u27a4\u00bb\u203a])\s+/u,
    '',
  );
}

type SupraSpaceSelectionClipboardData = {
  html: string;
  plainText: string;
};

const SELECTION_COPY_SEMANTIC_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'em', 'font', 'i', 'li', 'mark', 'ol', 'pre', 's', 'span', 'strike', 'strong', 'u', 'ul',
]);

const SELECTION_COPY_ANCESTOR_FORMAT_TAGS = new Set(['b', 'del', 'em', 'i', 's', 'strike', 'strong', 'u']);

export function hasSupraSpaceTextSelection(): boolean {
  if (typeof window === 'undefined') return false;
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

export function getSupraSpaceSelectionClipboardData(
  container: HTMLElement,
  styleOptions: SupraSpaceClipboardStyleOptions = {},
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

  const range = selection.getRangeAt(0);
  const wrapper = container.ownerDocument.createElement('div');
  wrapper.append(range.cloneContents());
  const commonAncestor = range.commonAncestorContainer;
  for (
    let ancestor: Node | null = commonAncestor.nodeType === Node.ELEMENT_NODE ? commonAncestor : commonAncestor.parentNode;
    ancestor && ancestor !== container && container.contains(ancestor);
    ancestor = ancestor.parentNode
  ) {
    if (!(ancestor instanceof HTMLElement) || !SELECTION_COPY_ANCESTOR_FORMAT_TAGS.has(ancestor.tagName.toLowerCase())) continue;
    const formatShell = ancestor.cloneNode(false) as HTMLElement;
    formatShell.append(...Array.from(wrapper.childNodes));
    wrapper.append(formatShell);
  }
  Array.from(wrapper.querySelectorAll<HTMLElement>('*')).reverse().forEach(element => {
    const tag = element.tagName.toLowerCase();
    if (!SELECTION_COPY_SEMANTIC_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    const href = tag === 'a' ? element.getAttribute('href') || '' : '';
    const color = styleOptions.normalizeColor
      ? getSupraSpaceClipboardTextColor(element, styleOptions.normalizeColor)
      : null;
    // A selection is copied out of a rendered chat bubble.  Highlighting is
    // presentation from the source surface (and used to carry a bubble's
    // dark background into sites such as Indeed), not part of the selected
    // message's portable content.  Keep semantic tags and supported type,
    // but never export a background color from this path.
    const typographyStyles = isSupraSpaceInlineClipboardStyle(element)
      ? styleOptions.getTypographyStyles?.(element) || []
      : [];
    Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));
    if (tag === 'a' && isSafeSupraSpaceLinkHref(href)) element.setAttribute('href', href);
    const styles = [
      ...typographyStyles,
      ...(color ? [`color:${color}`] : []),
    ];
    if (styles.length) element.setAttribute('style', [...new Set(styles)].join(';'));
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
  const sourceStyle = element.getAttribute('style') || '';
  const hasSourceBackground = Boolean(
    element.getAttribute('bgcolor')
    || element.style.background
    || element.style.backgroundColor
    || element.style.backgroundImage
    || /(?:^|;)\s*(?:background(?:-color|-image)?|mso-highlight)\s*:/i.test(sourceStyle),
  );
  if (hasSourceBackground) return null;
  return normalizeColor(
    element.style.color
    || element.style.getPropertyValue('-webkit-text-fill-color')
    || element.getAttribute('color'),
  );
}

export function sanitizeSupraSpacePastedEditorHtml(
  html: string,
  normalizeColor: CssColorNormalizer,
  styleOptions: SupraSpaceClipboardStyleOptions = {},
): string {
  if (!html.trim()) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll(DISALLOWED_TAGS).forEach(element => element.remove());

  doc.body.querySelectorAll<HTMLElement>('*').forEach(element => {
    const color = getSupraSpaceClipboardTextColor(element, normalizeColor);
    const typographyStyles = isSupraSpaceInlineClipboardStyle(element)
      ? styleOptions.getTypographyStyles?.(element) || []
      : [];
    const tag = element.tagName.toLowerCase();
    const href = element.getAttribute('href') || '';
    const safeHref = isSafeSupraSpaceLinkHref(href);

    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const keepAnchorAttribute = tag === 'a'
        && safeHref
        && ['href', 'target', 'rel'].includes(name);
      const keepListAttribute = tag === 'ol' && name === 'start';
      const keepPasteParagraphAttribute = name === PASTE_PARAGRAPH_ATTRIBUTE;
      if (!keepAnchorAttribute && !keepListAttribute && !keepPasteParagraphAttribute) element.removeAttribute(attribute.name);
    });

    const styles = [
      ...typographyStyles,
      ...(color ? [`color:${color}`] : []),
    ];
    if (styles.length) element.setAttribute('style', [...new Set(styles)].join(';'));
  });

  return doc.body.innerHTML;
}

const EDITOR_LINE_BLOCKS = new Set(['div', 'p', 'section', 'article', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** A terminal browser placeholder is already represented by its block boundary.
 * Inspect the DOM before serialization, while formatting wrappers are intact.
 * Marked Shift+Enter breaks and breaks followed by content remain authored text.
 */
export function isSupraSpaceEditorPlaceholderBreak(element: HTMLElement, root: HTMLElement): boolean {
  if (element.tagName.toLowerCase() !== 'br' || element.hasAttribute('data-ss4-soft-break')) return false;
  let block = element.parentElement;
  while (block && block !== root && !EDITOR_LINE_BLOCKS.has(block.tagName.toLowerCase())) {
    // Code blocks preserve every authored newline.
    if (block.tagName.toLowerCase() === 'pre') return false;
    block = block.parentElement;
  }
  if (!block || block === root) return false;

  const hasContent = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean((node.textContent || '').replace(/[\u200B\u2060\uFEFF]/g, ''));
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const child = node as HTMLElement;
    if (child.hasAttribute('data-rich-editor-selection-marker')) return false;
    const tag = child.tagName.toLowerCase();
    if (EDITOR_LINE_BLOCKS.has(tag) || ['br', 'img', 'hr', 'table', 'ul', 'ol', 'pre'].includes(tag)) return true;
    return Array.from(child.childNodes).some(hasContent);
  };

  let current: Node | null = element;
  while (current && current !== block) {
    for (let sibling = current.nextSibling; sibling; sibling = sibling.nextSibling) {
      if (hasContent(sibling)) return false;
    }
    current = current.parentElement;
  }
  return current === block;
}
