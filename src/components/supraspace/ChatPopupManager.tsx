'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { X, Minus, Send, Loader2, MessageCircle, Check, Reply, Pin, Trash2, Smile, Pencil, Copy, MoreHorizontal, Link2, Share2, MailOpen, Search, Plus, ImageIcon, ThumbsUp, ChevronDown, ChevronLeft, ExternalLink, Users, UserPlus, BellOff, Archive, Palette, ZoomIn, ZoomOut, Bold, Italic, Underline, Strikethrough, List, ListOrdered, TextQuote, Code2, Paperclip, Play, Pause, Mic, Square, BarChart3, CalendarPlus, Clock, MapPin, Download, FileText, Settings2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';
import { SSAttachment, SSMessage, SSGif, SSPoll, SSEvent } from '@/hooks/useSupraSpaceSocket';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { toast } from 'sonner';
import type { AxiosRequestConfig } from 'axios';

type RequestConfigWithSkipRefresh = AxiosRequestConfig & { _skipAuthRefresh?: boolean };

const POPUP_W = 320;
const POPUP_GAP = 8;
const POPUP_RIGHT = 16;
const POPUP_H = 460;
const POPUP_BULLET_GLYPHS = ['•', '◦', '▪'];
const POPUP_LIST_INDENT_STEP = '  ';
const popupBulletGlyphForDepth = (depth: number) => POPUP_BULLET_GLYPHS[((depth % POPUP_BULLET_GLYPHS.length) + POPUP_BULLET_GLYPHS.length) % POPUP_BULLET_GLYPHS.length];
const HEADER_H = 44;
const MAX_VISIBLE_POPUPS = 3;
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || '';

function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
const TEXT_COLORS = ['#ffffff', '#f87171', '#fb923c', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
const MORE_TEXT_COLORS = [
  '#ffffff', '#f3f4f6', '#94a3b8', '#64748b', '#111827',
  '#ef4444', '#f87171', '#fb7185', '#f97316', '#fb923c',
  '#f59e0b', '#facc15', '#84cc16', '#22c55e', '#34d399',
  '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#60a5fa',
  '#6366f1', '#818cf8', '#8b5cf6', '#a78bfa', '#d946ef',
  '#f472b6', '#ec4899', '#be185d',
];

const POPUP_RICH_EDIT_CSS = `
  .ss-popup-rich-edit { white-space: pre-wrap; }
  .ss-popup-rich-edit ul,
  .ss-popup-rich-edit ol {
    display: block !important;
    margin: .42rem 0 !important;
    padding-left: 1.45rem !important;
    list-style-position: outside !important;
    white-space: normal;
  }
  .ss-popup-rich-edit ul { list-style-type: disc !important; }
  .ss-popup-rich-edit ol { list-style-type: decimal !important; }
  .ss-popup-rich-edit ul ul { list-style-type: circle !important; }
  .ss-popup-rich-edit ul ul ul { list-style-type: square !important; }
  .ss-popup-rich-edit li {
    display: list-item !important;
    margin: .16rem 0 !important;
    padding-left: .08rem;
    white-space: pre-wrap;
  }
  .ss-popup-rich-edit blockquote {
    display: block;
    margin: .42rem 0 !important;
    padding: .42rem .62rem !important;
    border-left: 3px solid rgba(255,255,255,.74);
    border-radius: 0 7px 7px 0;
    background: rgba(0,0,0,.16);
    font-style: italic;
    white-space: pre-wrap;
  }
  .ss-popup-rich-edit blockquote:empty::before {
    content: 'Quote';
    opacity: .55;
    pointer-events: none;
  }
  .ss-popup-rich-edit code,
  .ss-popup-rich-edit font[face*="mono" i] {
    display: inline;
    padding: .06rem .26rem;
    border-radius: 4px;
    background: rgba(0,0,0,.22);
    font-family: monospace !important;
  }
`;
type PendingPopupAttachment = { file: File; previewUrl: string };
type PasteMode = 'formatted' | 'plain';

type SS4InlineTypingFormat = 'bold' | 'italic' | 'underline' | 'strike';
type SS4InlineTypingPreferences = Record<
  SS4InlineTypingFormat,
  boolean | null
>;

function createSS4InlineTypingPreferences(): SS4InlineTypingPreferences {
  return {
    bold: null,
    italic: null,
    underline: null,
    strike: null,
  };
}

function ss4InlineCommandForFormat(
  format: SS4InlineTypingFormat,
): 'bold' | 'italic' | 'underline' | 'strikeThrough' {
  return format === 'strike' ? 'strikeThrough' : format;
}

type SS4FontFamilyId =
  | 'default'
  | 'arial'
  | 'aptos'
  | 'calibri'
  | 'georgia'
  | 'times'
  | 'verdana'
  | 'trebuchet'
  | 'tahoma'
  | 'courier';
type SS4FontSize = 10 | 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32 | 36;

const SS4_DEFAULT_FONT_FAMILY: SS4FontFamilyId = 'default';
const SS4_DEFAULT_FONT_SIZE: SS4FontSize = 16;
const SS4_FONT_FAMILIES: Array<{
  id: SS4FontFamilyId;
  label: string;
  css: string;
}> = [
  { id: 'default', label: 'Default', css: "'Geist', sans-serif" },
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'aptos', label: 'Aptos', css: 'Aptos, Arial, sans-serif' },
  { id: 'calibri', label: 'Calibri', css: 'Calibri, Arial, sans-serif' },
  { id: 'georgia', label: 'Georgia', css: 'Georgia, serif' },
  { id: 'times', label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  { id: 'verdana', label: 'Verdana', css: 'Verdana, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', css: "'Trebuchet MS', sans-serif" },
  { id: 'tahoma', label: 'Tahoma', css: 'Tahoma, sans-serif' },
  { id: 'courier', label: 'Courier New', css: "'Courier New', monospace" },
];
const SS4_FONT_SIZES: SS4FontSize[] = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36];

function ss4FontFamilyOption(id: SS4FontFamilyId) {
  return SS4_FONT_FAMILIES.find(option => option.id === id)
    || SS4_FONT_FAMILIES[0];
}

function ss4FontFamilyCss(id: SS4FontFamilyId): string {
  return ss4FontFamilyOption(id).css;
}

function ss4FontFamilyIdFromCss(value?: string | null): SS4FontFamilyId | null {
  const normalized = (value || '')
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;
  if (normalized.includes('courier')) return 'courier';
  if (normalized.includes('trebuchet')) return 'trebuchet';
  if (normalized.includes('times new roman') || normalized === 'times') return 'times';
  if (normalized.includes('georgia')) return 'georgia';
  if (normalized.includes('verdana')) return 'verdana';
  if (normalized.includes('tahoma')) return 'tahoma';
  if (normalized.includes('calibri')) return 'calibri';
  if (normalized.includes('aptos')) return 'aptos';
  if (normalized.includes('arial') || normalized.includes('helvetica')) return 'arial';
  if (normalized.includes('geist')) return 'default';
  return null;
}

function ss4FontSizeFromCss(value?: string | null): SS4FontSize | null {
  const raw = (value || '').trim().toLowerCase();
  if (!raw) return null;

  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return null;

  let pixels = numeric;
  if (raw.endsWith('pt')) pixels = numeric * (96 / 72);
  else if (raw.endsWith('em') || raw.endsWith('rem')) pixels = numeric * 16;
  else if (raw.endsWith('%')) pixels = (numeric / 100) * 16;

  return SS4_FONT_SIZES.reduce((closest, candidate) => (
    Math.abs(candidate - pixels) < Math.abs(closest - pixels)
      ? candidate
      : closest
  ), SS4_DEFAULT_FONT_SIZE);
}

function ss4FontSizeFromLegacyAttribute(value?: string | null): SS4FontSize | null {
  const legacy = Number.parseInt(value || '', 10);
  const mapping: Record<number, SS4FontSize> = {
    1: 10,
    2: 12,
    3: 16,
    4: 18,
    5: 24,
    6: 32,
    7: 36,
  };
  return mapping[legacy] || null;
}

function normalizeRichEditorFontSizeElements(
  root: HTMLElement | null,
  selectedSize: SS4FontSize,
): void {
  if (!root) return;

  root.querySelectorAll<HTMLElement>('font[size]').forEach(element => {
    const resolved = element.getAttribute('size') === '7'
      ? selectedSize
      : ss4FontSizeFromLegacyAttribute(element.getAttribute('size'));
    if (resolved) element.style.fontSize = `${resolved}px`;
    element.removeAttribute('size');
  });
}

function stripSupraSpaceTypographyTags(value: string): string {
  return value
    .replace(/\{\s*font\s*:\s*[a-z-]+\s*\}/gi, '')
    .replace(/\{\s*\/\s*font\s*\}/gi, '')
    .replace(/\{\s*size\s*:\s*\d{1,3}\s*\}/gi, '')
    .replace(/\{\s*\/\s*size\s*\}/gi, '');
}

function insertPreselectedTypographyText(
  event: React.FormEvent<HTMLDivElement>,
  fontFamily: SS4FontFamilyId | null,
  fontSize: SS4FontSize | null,
  inlineFormats: SS4InlineTypingPreferences,
  color?: string | null,
): boolean {
  const inputEvent = event.nativeEvent as InputEvent;
  if (
    ![
      'insertText',
      'insertCompositionText',
      'insertReplacementText',
    ].includes(inputEvent.inputType)
    || !inputEvent.data
  ) {
    return false;
  }

  const normalizedColor = color
    ? color.toLowerCase()
    : null;
  const hasExplicitInlineChoice = Object.values(inlineFormats)
    .some(value => value !== null);
  const hasExplicitTypography = Boolean(
    fontFamily
    || fontSize
    || normalizedColor
    || hasExplicitInlineChoice,
  );
  if (!hasExplicitTypography) return false;

  const root = event.currentTarget;
  const selection = window.getSelection();
  if (!selection?.rangeCount) return false;

  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer)
    || !root.contains(range.endContainer)
  ) {
    return false;
  }

  const anchorElement = range.startContainer instanceof HTMLElement
    ? range.startContainer
    : range.startContainer.parentElement;
  const activeTypingSpan = anchorElement?.closest<HTMLElement>(
    'span[data-ss4-typing-style="true"]',
  );

  const desiredFamily = fontFamily || '';
  const desiredSize = fontSize ? String(fontSize) : '';
  const desiredColor = normalizedColor || '';
  const desiredBold = inlineFormats.bold === null
    ? ''
    : String(inlineFormats.bold);
  const desiredItalic = inlineFormats.italic === null
    ? ''
    : String(inlineFormats.italic);
  const desiredUnderline = inlineFormats.underline === null
    ? ''
    : String(inlineFormats.underline);
  const desiredStrike = inlineFormats.strike === null
    ? ''
    : String(inlineFormats.strike);

  if (
    range.collapsed
    && activeTypingSpan
    && (activeTypingSpan.dataset.ss4FontFamily || '') === desiredFamily
    && (activeTypingSpan.dataset.ss4FontSize || '') === desiredSize
    && (activeTypingSpan.dataset.ss4TextColor || '') === desiredColor
    && (activeTypingSpan.dataset.ss4Bold || '') === desiredBold
    && (activeTypingSpan.dataset.ss4Italic || '') === desiredItalic
    && (activeTypingSpan.dataset.ss4Underline || '') === desiredUnderline
    && (activeTypingSpan.dataset.ss4Strike || '') === desiredStrike
  ) {
    // The caret is already inside the correct persistent formatting run.
    // Let the browser append the next character to that same span.
    return false;
  }

  event.preventDefault();
  range.deleteContents();

  const span = document.createElement('span');
  span.dataset.ss4TypingStyle = 'true';
  span.dataset.ss4FontFamily = desiredFamily;
  span.dataset.ss4FontSize = desiredSize;
  span.dataset.ss4TextColor = desiredColor;
  span.dataset.ss4Bold = desiredBold;
  span.dataset.ss4Italic = desiredItalic;
  span.dataset.ss4Underline = desiredUnderline;
  span.dataset.ss4Strike = desiredStrike;

  if (fontFamily) span.style.fontFamily = ss4FontFamilyCss(fontFamily);
  if (fontSize) span.style.fontSize = `${fontSize}px`;
  if (normalizedColor) span.style.color = normalizedColor;

  if (inlineFormats.bold !== null) {
    span.style.fontWeight = inlineFormats.bold ? '700' : '400';
  }
  if (inlineFormats.italic !== null) {
    span.style.fontStyle = inlineFormats.italic ? 'italic' : 'normal';
  }

  if (
    inlineFormats.underline !== null
    || inlineFormats.strike !== null
  ) {
    const decorations: string[] = [];
    if (inlineFormats.underline) decorations.push('underline');
    if (inlineFormats.strike) decorations.push('line-through');
    span.style.textDecorationLine = decorations.length
      ? decorations.join(' ')
      : 'none';
  }

  const textNode = document.createTextNode(inputEvent.data);
  span.appendChild(textNode);
  range.insertNode(span);
  range.setStart(textNode, textNode.data.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}


type SS4CaretFormattingSnapshot = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  boldExplicit: boolean;
  italicExplicit: boolean;
  underlineExplicit: boolean;
  strikeExplicit: boolean;
  fontFamily: SS4FontFamilyId;
  fontSize: SS4FontSize;
  color: string;
  fontFamilyExplicit: boolean;
  fontSizeExplicit: boolean;
  colorExplicit: boolean;
};

function ss4TypingPreferencesFromCaretSnapshot(
  caret: SS4CaretFormattingSnapshot | null,
): SS4InlineTypingPreferences {
  if (!caret) return createSS4InlineTypingPreferences();

  return {
    // Preserve active inherited formatting, and preserve explicit OFF states.
    // Plain inherited "off" remains null so ordinary typing does not create
    // unnecessary wrappers.
    bold: caret.bold ? true : caret.boldExplicit ? false : null,
    italic: caret.italic ? true : caret.italicExplicit ? false : null,
    underline: caret.underline
      ? true
      : caret.underlineExplicit
        ? false
        : null,
    strike: caret.strike ? true : caret.strikeExplicit ? false : null,
  };
}

function getRichEditorCaretFormattingSnapshot(
  root: HTMLElement | null,
): SS4CaretFormattingSnapshot | null {
  if (!root) return null;

  const selection = window.getSelection();
  if (
    !selection
    || selection.rangeCount === 0
    || !selection.anchorNode
    || !root.contains(selection.anchorNode)
  ) {
    return null;
  }

  const anchorElement = selection.anchorNode instanceof HTMLElement
    ? selection.anchorNode
    : selection.anchorNode.parentElement;
  const effectiveElement = anchorElement && root.contains(anchorElement)
    ? anchorElement
    : root;

  const typingSpan = effectiveElement.closest<HTMLElement>(
    'span[data-ss4-typing-style="true"]',
  );

  const ancestors: HTMLElement[] = [];
  let current: HTMLElement | null = effectiveElement;
  while (current) {
    ancestors.push(current);
    if (current === root) break;
    current = current.parentElement;
  }

  const firstInlineStyle = (
    getter: (element: HTMLElement) => string | null | undefined,
  ): string | null => {
    for (const element of ancestors) {
      const value = getter(element)?.trim();
      if (value) return value;
    }
    return null;
  };

  const dataBoolean = (
    key: 'ss4Bold' | 'ss4Italic' | 'ss4Underline' | 'ss4Strike',
  ): boolean | null => {
    const raw = typingSpan?.dataset[key];
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  };

  const hasAncestorTag = (tags: string[]): boolean =>
    ancestors.some(element => tags.includes(element.tagName.toLowerCase()));

  const hasInlineWeight = ancestors.some(element => {
    const value = element.style.fontWeight.trim();
    return value === 'bold' || Number.parseInt(value || '0', 10) >= 600;
  });
  const hasInlineItalic = ancestors.some(
    element => element.style.fontStyle.trim() === 'italic',
  );
  const hasInlineUnderline = ancestors.some(element => (
    `${element.style.textDecoration} ${element.style.textDecorationLine}`
      .toLowerCase()
      .includes('underline')
  ));
  const hasInlineStrike = ancestors.some(element => (
    `${element.style.textDecoration} ${element.style.textDecorationLine}`
      .toLowerCase()
      .includes('line-through')
  ));

  const boldData = dataBoolean('ss4Bold');
  const italicData = dataBoolean('ss4Italic');
  const underlineData = dataBoolean('ss4Underline');
  const strikeData = dataBoolean('ss4Strike');

  const bold = boldData ?? (
    hasAncestorTag(['b', 'strong'])
    || hasInlineWeight
    || document.queryCommandState('bold')
  );
  const italic = italicData ?? (
    hasAncestorTag(['i', 'em'])
    || hasInlineItalic
    || document.queryCommandState('italic')
  );
  const underline = underlineData ?? (
    hasAncestorTag(['u'])
    || hasInlineUnderline
    || document.queryCommandState('underline')
  );
  const strike = strikeData ?? (
    hasAncestorTag(['s', 'strike', 'del'])
    || hasInlineStrike
    || document.queryCommandState('strikeThrough')
  );

  const explicitFontFamilyValue =
    typingSpan?.dataset.ss4FontFamily
    || firstInlineStyle(element =>
      element.style.fontFamily || element.getAttribute('face')
    );
  const explicitFontSizeValue =
    typingSpan?.dataset.ss4FontSize
    || firstInlineStyle(element =>
      element.style.fontSize || element.getAttribute('size')
    );
  const explicitColorValue =
    typingSpan?.dataset.ss4TextColor
    || firstInlineStyle(element =>
      element.style.color
      || element.style.getPropertyValue('-webkit-text-fill-color')
      || element.getAttribute('color')
    );

  const computed = window.getComputedStyle(effectiveElement);
  const queryFontFamily = String(
    document.queryCommandValue('fontName') || '',
  );
  const queryFontSize = String(
    document.queryCommandValue('fontSize') || '',
  );
  const queryColor = String(
    document.queryCommandValue('foreColor') || '',
  );

  const fontFamily =
    ss4FontFamilyIdFromCss(explicitFontFamilyValue)
    || ss4FontFamilyIdFromCss(queryFontFamily)
    || ss4FontFamilyIdFromCss(computed.fontFamily)
    || SS4_DEFAULT_FONT_FAMILY;

  const fontSize =
    ss4FontSizeFromCss(explicitFontSizeValue)
    || ss4FontSizeFromLegacyAttribute(explicitFontSizeValue)
    || ss4FontSizeFromLegacyAttribute(queryFontSize)
    || ss4FontSizeFromCss(computed.fontSize)
    || SS4_DEFAULT_FONT_SIZE;

  const color =
    cssColorToHex(explicitColorValue)
    || cssColorToHex(queryColor)
    || cssColorToHex(computed.color)
    || '#ffffff';

  return {
    bold,
    italic,
    underline,
    strike,
    boldExplicit: boldData !== null,
    italicExplicit: italicData !== null,
    underlineExplicit: underlineData !== null,
    strikeExplicit: strikeData !== null,
    fontFamily,
    fontSize,
    color,
    fontFamilyExplicit: Boolean(explicitFontFamilyValue),
    fontSizeExplicit: Boolean(explicitFontSizeValue),
    colorExplicit: Boolean(explicitColorValue),
  };
}

function insertTypingStyleCaretMarker(
  root: HTMLElement,
  fontFamily: SS4FontFamilyId | null,
  fontSize: SS4FontSize | null,
  inlineFormats: SS4InlineTypingPreferences,
  color?: string | null,
): boolean {
  const normalizedColor = color?.toLowerCase() || null;
  const hasExplicitInlineChoice = Object.values(inlineFormats).some(
    value => value !== null,
  );
  if (
    !fontFamily
    && !fontSize
    && !normalizedColor
    && !hasExplicitInlineChoice
  ) {
    return false;
  }

  const selection = window.getSelection();
  if (!selection?.rangeCount) return false;

  const liveRange = selection.getRangeAt(0);
  if (
    !root.contains(liveRange.startContainer)
    || !root.contains(liveRange.endContainer)
  ) {
    return false;
  }

  const anchorElement = liveRange.startContainer instanceof HTMLElement
    ? liveRange.startContainer
    : liveRange.startContainer.parentElement;
  const existingTypingSpan = anchorElement?.closest<HTMLElement>(
    'span[data-ss4-typing-style="true"]',
  );
  const existingSpanIsMarkerOnly = Boolean(
    existingTypingSpan
    && stripSupraSpaceTypingMarkers(existingTypingSpan.textContent || '').trim() === '',
  );

  let span: HTMLElement;
  let marker: Text;

  if (existingTypingSpan && existingSpanIsMarkerOnly) {
    // Update the existing empty caret-format run instead of nesting another
    // span. This is important when a user changes formatting on a new line.
    span = existingTypingSpan;
    span.removeAttribute('style');
    marker = Array.from(span.childNodes)
      .find((node): node is Text => node.nodeType === Node.TEXT_NODE)
      || document.createTextNode('\u200B');

    if (!marker.parentNode) span.appendChild(marker);
    marker.data = '\u200B';
  } else {
    span = document.createElement('span');
    marker = document.createTextNode('\u200B');
    span.appendChild(marker);

    const insertionRange = liveRange.cloneRange();

    // When the caret is at the end of an existing typing run, create a sibling
    // run rather than nesting it. A sibling can truly turn underline/bold/etc.
    // off without inheriting the previous run's inline style.
    if (
      existingTypingSpan
      && existingTypingSpan.parentNode
      && liveRange.collapsed
    ) {
      const contentsRange = document.createRange();
      contentsRange.selectNodeContents(existingTypingSpan);
      const atEnd = liveRange.compareBoundaryPoints(
        Range.END_TO_END,
        contentsRange,
      ) === 0;

      if (atEnd) {
        insertionRange.setStartAfter(existingTypingSpan);
        insertionRange.collapse(true);
      }
    }

    insertionRange.insertNode(span);
  }

  span.dataset.ss4TypingStyle = 'true';
  span.dataset.ss4FontFamily = fontFamily || '';
  span.dataset.ss4FontSize = fontSize ? String(fontSize) : '';
  span.dataset.ss4TextColor = normalizedColor || '';
  span.dataset.ss4Bold = inlineFormats.bold === null
    ? ''
    : String(inlineFormats.bold);
  span.dataset.ss4Italic = inlineFormats.italic === null
    ? ''
    : String(inlineFormats.italic);
  span.dataset.ss4Underline = inlineFormats.underline === null
    ? ''
    : String(inlineFormats.underline);
  span.dataset.ss4Strike = inlineFormats.strike === null
    ? ''
    : String(inlineFormats.strike);

  if (fontFamily) span.style.fontFamily = ss4FontFamilyCss(fontFamily);
  if (fontSize) span.style.fontSize = `${fontSize}px`;
  if (normalizedColor) span.style.color = normalizedColor;

  if (inlineFormats.bold !== null) {
    span.style.fontWeight = inlineFormats.bold ? '700' : '400';
  }
  if (inlineFormats.italic !== null) {
    span.style.fontStyle = inlineFormats.italic ? 'italic' : 'normal';
  }

  if (
    inlineFormats.underline !== null
    || inlineFormats.strike !== null
  ) {
    const decorations: string[] = [];
    if (inlineFormats.underline) decorations.push('underline');
    if (inlineFormats.strike) decorations.push('line-through');
    span.style.textDecorationLine = decorations.length
      ? decorations.join(' ')
      : 'none';
  }

  const nextRange = document.createRange();
  nextRange.setStart(marker, marker.data.length);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

function insertSoftLineBreakWithCaretFormatting(
  root: HTMLElement,
  fontFamily: SS4FontFamilyId | null,
  fontSize: SS4FontSize | null,
  inlineFormats: SS4InlineTypingPreferences,
  color?: string | null,
): boolean {
  root.focus();

  const inserted = document.execCommand('insertLineBreak');
  if (!inserted) {
    document.execCommand('insertHTML', false, '<br>');
  }

  insertTypingStyleCaretMarker(
    root,
    fontFamily,
    fontSize,
    inlineFormats,
    color,
  );
  return true;
}

function stripSupraSpaceTypingMarkers(value: string): string {
  return value.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
}

function clipboardElementIsHidden(element: HTMLElement): boolean {
  const style = element.style;
  return Boolean(
    element.hidden
    || element.getAttribute('aria-hidden') === 'true'
    || style.display === 'none'
    || style.visibility === 'hidden'
    || style.opacity === '0'
    || (element.tagName.toLowerCase() === 'input'
      && (element as HTMLInputElement).type === 'hidden')
  );
}

function clipboardControlValue(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') return (element as HTMLInputElement).value || '';
  if (tag === 'textarea') return (element as HTMLTextAreaElement).value || '';
  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    return select.selectedOptions?.[0]?.textContent || select.value || '';
  }
  return '';
}

function clipboardElementIsDecorativeMarker(element: HTMLElement): boolean {
  const className = String(element.className || '').toLowerCase();
  const rawStyle = (element.getAttribute('style') || '').toLowerCase();
  const text = (element.textContent || '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
  const markerOnly = /^(?:[-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]|\d+[.)])$/u.test(text);

  return Boolean(
    element.hasAttribute('data-list-marker')
    || element.hasAttribute('data-marker')
    || className.includes('ss4-list-marker')
    || className.includes('list-marker')
    || className.includes('bullet-marker')
    || className.includes('ql-ui')
    || className.includes('mso-list-ignore')
    || rawStyle.includes('mso-list:ignore')
    || (element.getAttribute('aria-hidden') === 'true' && markerOnly)
  );
}

function stripLeadingSemanticListMarker(root: HTMLElement): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('ul ul, ul ol, ol ul, ol ol')) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    },
  );

  const firstText = walker.nextNode() as Text | null;
  if (!firstText) return;
  firstText.data = firstText.data.replace(
    /^\s*(?:[-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]|\d+[.)])\s+/u,
    '',
  );
}
type PopupEditFormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  list: boolean;
  numbered: boolean;
  quote: boolean;
  code: boolean;
};

const AVATAR_COLORS = ['#5b7cf6', '#34c97d', '#f0a855', '#e05b8a', '#5bbdf6', '#a05bf6', '#f65b5b', '#5bf6c8'];
const DEFAULT_QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👌', '👍'];
const QUICK_REACTION_CHOICES = ['❤️', '😂', '😮', '😢', '👌', '👍', '🔥', '🎉', '👏', '🙏', '💯', '😍', '🤔', '😅', '🙌', '✅'];
const MUTE_DURATION_OPTIONS: { label: string; ms: number | null }[] = [
  { label: '15 minutes', ms: 15 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '8 hours', ms: 8 * 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Until I turn it back on', ms: null },
];
async function copyImageToClipboard(url: string): Promise<void> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('proxy failed');
  const blob = await res.blob();
  let copyBlob: Blob = blob;
  if (blob.type !== 'image/png') {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.src = blobUrl;
    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 400;
    canvas.height = img.naturalHeight || 400;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    URL.revokeObjectURL(blobUrl);
    copyBlob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': copyBlob })]);
}

function stringToColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function getDisplayName(conv: SSConv, myId: string | null): string {
  if (conv.type === 'group') return conv.name || 'Group';
  return conv.members.find((m) => m._id !== myId)?.fullName ?? 'Unknown';
}
function getAvatarSrc(conv: SSConv, myId: string | null): string | undefined {
  if (conv.type === 'group') return conv.avatar;
  return conv.members.find((m) => m._id !== myId)?.avatar;
}
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function msgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Denver' });
}
function isEmojiOnlyText(text?: string | null): boolean {
  const value = (text || '').trim();
  if (!value) return false;
  return value.length <= 16 && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(value);
}
const clampPreviewZoom = (value: number) => Math.min(4, Math.max(1, Number(value.toFixed(2))));
const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Photo', voice: '🎤 Voice message', gif: '🎬 GIF',
  file: '📎 File', poll: '📊 Poll', event: '📅 Event',
};
// Renders message content with markdown formatting (bold, italic, underline, strike, code, bullets, quotes, links, @mentions)
const MD_SPLIT = /(\{\s*color\s*:\s*#[0-9a-f]{3,8}\s*\}[\s\S]*?\{\s*\/\s*color\s*\}|\{\s*font\s*:\s*[a-z-]+\s*\}[\s\S]*?\{\s*\/\s*font\s*\}|\{\s*size\s*:\s*\d{1,3}\s*\}[\s\S]*?\{\s*\/\s*size\s*\}|\*\*[^*\n]+\*\*|~~[^~\n]+~~|__[^_\n]+__|_[^_\n]+_|`[^`\n]+`|https?:\/\/[^\s]+|@\w+(?:\s[A-Z][a-zA-Z]*)?)/gi;

function normalizeMultilineMarkdownBlocks(text: string): string {
  return text.replace(/\*\*([\s\S]*?)\*\*/g, (_match, inner: string) =>
    inner.split('\n').map(line => line ? `**${line}**` : '').join('\n')
  );
}

const STRUCTURED_LEAD_LABEL_PATTERN = '(?:Age|Lead|Original Cost|Retail Price|Maxoffer|Profit)';

function normalizeCopiedMarkdownArtifacts(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cleaned: string[] = [];
  let pendingColor: string | null = null;
  let pendingBold = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const colorStart = trimmed.match(/^\{color:(#[0-9a-fA-F]{6})\}\s*(?:\*\*)?$/);
    if (colorStart) {
      pendingColor = colorStart[1];
      pendingBold = /\*\*$/.test(trimmed);
      continue;
    }

    if (pendingColor) {
      const colorEnd = line.match(/^(.*?)\s*(?:\*\*)?\s*\{\/color\}\s*$/);
      const content = (colorEnd?.[1] ?? line).replace(/\*\*/g, '').trimEnd();
      if (content) {
        const colored = `{color:${pendingColor}}${content}{/color}`;
        cleaned.push(pendingBold ? `**${colored}**` : colored);
      }
      if (colorEnd) pendingColor = null;
      if (colorEnd) pendingBold = false;
      continue;
    }

    if (/^(?:\*\*|__|~~)$/.test(trimmed)) {
      pendingBold = trimmed === '**';
      continue;
    }

    if (pendingBold) {
      if (!trimmed) continue;
      const content = line.replace(/\*\*/g, '').trimEnd();
      if (content) cleaned.push(`**${content}**`);
      pendingBold = false;
      continue;
    }

    if (/\*\*\s*$/.test(line) && !/^\s*\*\*/.test(line)) {
      const content = line.replace(/\*\*\s*$/, '').trimEnd();
      cleaned.push(new RegExp(`^\\s*${STRUCTURED_LEAD_LABEL_PATTERN}:`).test(content) ? `**${content}**` : content);
      continue;
    }

    cleaned.push(line);
  }

  return cleaned
    .join('\n')
    .split('\n')
    .map(line => {
      if (!line.trim()) return line;
      const hasValidBold = /\*\*[^*\n]+\*\*/.test(line);
      if (hasValidBold) return line.replace(/\*{4,}/g, '**');
      return line.replace(/\*\*/g, '');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizeStructuredLeadLayout(text: string): string {
  const labelMatches = text.match(new RegExp(`\\b${STRUCTURED_LEAD_LABEL_PATTERN}:`, 'g')) || [];
  if (labelMatches.length < 3) return text;
  const decoratedLabel = `(?:\\*\\*)?(?:\\{color:#[0-9a-fA-F]{6}\\})?${STRUCTURED_LEAD_LABEL_PATTERN}:`;

  return text
    .replace(/\r\n/g, '\n')
    .replace(new RegExp(`([^\\n])((?:\\*\\*|__|~~|\`|\\{/color\\})+)(?=${STRUCTURED_LEAD_LABEL_PATTERN}:)`, 'g'), '$1$2\n')
    .replace(new RegExp(`(?<!\\n\\*)([^\\n}])(?=${STRUCTURED_LEAD_LABEL_PATTERN}:)`, 'g'), '$1\n')
    .replace(new RegExp(`\\n\\s*\\n+(?=${decoratedLabel})`, 'g'), '\n')
    .replace(/\n\s*\n+/g, '\n')
    .replace(new RegExp(`\\n(?=(?:\\*\\*)?(?:\\{color:#[0-9a-fA-F]{6}\\})?(?:Maxoffer|Profit):)`, 'g'), '\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizeFinalMessageMarkup(text: string): string {
  return text
    .replace(/\{color:(#[0-9a-fA-F]{6})\}\s*(?:\*\*)?\s*\n+\s*([^\n{}]+?)\s*(?:\*\*)?\s*\{\/color\}/g, '{color:$1}$2{/color}')
    .replace(/\{color:(#[0-9a-fA-F]{6})\}\s*\*\*([^{}\n]+?)\*\*\s*\{\/color\}/g, '**{color:$1}$2{/color}**')
    .split('\n')
    .map(line => {
      if (/^\s*(?:\*\*|__|~~)\s*$/.test(line)) return '';
      if (/\*\*\s*$/.test(line) && !/^\s*\*\*/.test(line)) {
        return `**${line.replace(/\*\*\s*$/, '').trimEnd()}**`;
      }
      return line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizePastedListArtifacts(text: string): string {
  const normalizedText = text.replace(/â€¢/g, '\u2022');
  const marker = String.raw`(?:[-*+\u2022\u00b7\u2023\u25e6\u25cf\u25cb\u25aa\u25ab\u2013\u2014])`;
  const markerOnlyRe = new RegExp(String.raw`^\s*${marker}\s*$`);
  const realListItemRe = new RegExp(String.raw`^\s*${marker}\s+\S`);
  const lines = normalizedText.replace(/\r\n?/g, '\n').split('\n');
  const hasRealListItem = lines.some(line => realListItemRe.test(line));
  if (!hasRealListItem) return text;

  return lines
    .filter(line => !markerOnlyRe.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizeMessageMarkdownText(text: string): string {
  return normalizeListExitLineSpacing(
    normalizePastedListArtifacts(
      text
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' '),
    ),
  ).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeMessageMarkdownForDisplay(text: string): string {
  return normalizeMultilineMarkdownBlocks(normalizeMessageMarkdownText(text))
    .replace(/\{color:(#[0-9a-fA-F]{6})\}\s*\*\*([\s\S]*?)\*\*\s*\{\/color\}/g, '**{color:$1}$2{/color}**')
    .replace(/(^|\n)\s*(?:\*\*|__|~~)\s*\n([^\n]+?)\s*(?:\*\*|__|~~)(?=\n|$)/g, (_m, prefix: string, line: string) => `${prefix}**${line.trimEnd()}**`)
    .replace(/(^|\n)\s*(?:\*\*|__|~~)\s*(?=\n|$)/g, '$1')
    .replace(/\n{4,}/g, '\n\n\n');
}

function messagePreviewText(content?: string | null): string {
  if (!content) return '';
  return normalizeMessageMarkdownForDisplay(content)
    .replace(/\{\s*color\s*:\s*#[0-9a-f]{3,8}\s*\}/gi, '')
    .replace(/\{\s*\/\s*color\s*\}/gi, '')
    .replace(/\{\s*font\s*:\s*[a-z-]+\s*\}/gi, '')
    .replace(/\{\s*\/\s*font\s*\}/gi, '')
    .replace(/\{\s*size\s*:\s*\d{1,3}\s*\}/gi, '')
    .replace(/\{\s*\/\s*size\s*\}/gi, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(^|[^\w*])_([^_\n]+)_(?!\w)/g, '$1$2')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function renderInlineMd(text: string, isOwn: boolean, keyPrefix: string): React.ReactNode[] {
  if (text.startsWith('**') && text.endsWith('**') && text.length > 4)
    return [<strong key={`${keyPrefix}-strong-wrap`}>{renderInlineMd(text.slice(2, -2), isOwn, `${keyPrefix}-strong-wrap`)}</strong>];
  if (text.startsWith('~~') && text.endsWith('~~') && text.length > 4)
    return [<s key={`${keyPrefix}-strike-wrap`}>{renderInlineMd(text.slice(2, -2), isOwn, `${keyPrefix}-strike-wrap`)}</s>];
  if (text.startsWith('__') && text.endsWith('__') && text.length > 4)
    return [<u key={`${keyPrefix}-underline-wrap`}>{renderInlineMd(text.slice(2, -2), isOwn, `${keyPrefix}-underline-wrap`)}</u>];
  if (text.startsWith('_') && text.endsWith('_') && text.length > 2)
    return [<em key={`${keyPrefix}-em-wrap`}>{renderInlineMd(text.slice(1, -1), isOwn, `${keyPrefix}-em-wrap`)}</em>];

  return text.split(MD_SPLIT).map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    const colorMatch = part.match(/^\{\s*color\s*:\s*(#[0-9a-f]{3,8})\s*\}([\s\S]*)\{\s*\/\s*color\s*\}$/i);
    if (colorMatch) return <span key={k} style={{ color: colorMatch[1] }}>{renderInlineMd(colorMatch[2], isOwn, `${k}-color`)}</span>;
    const fontMatch = part.match(/^\{\s*font\s*:\s*([a-z-]+)\s*\}([\s\S]*)\{\s*\/\s*font\s*\}$/i);
    if (fontMatch) {
      const family = fontMatch[1].toLowerCase() as SS4FontFamilyId;
      const resolved = SS4_FONT_FAMILIES.some(option => option.id === family)
        ? family
        : SS4_DEFAULT_FONT_FAMILY;
      return <span key={k} style={{ fontFamily: ss4FontFamilyCss(resolved) }}>{renderInlineMd(fontMatch[2], isOwn, `${k}-font`)}</span>;
    }
    const sizeMatch = part.match(/^\{\s*size\s*:\s*(\d{1,3})\s*\}([\s\S]*)\{\s*\/\s*size\s*\}$/i);
    if (sizeMatch) {
      const numericSize = Number.parseInt(sizeMatch[1], 10) as SS4FontSize;
      const resolved = SS4_FONT_SIZES.includes(numericSize)
        ? numericSize
        : SS4_DEFAULT_FONT_SIZE;
      return <span key={k} style={{ fontSize: `${resolved}px` }}>{renderInlineMd(sizeMatch[2], isOwn, `${k}-size`)}</span>;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={k}>{renderInlineMd(part.slice(2, -2), isOwn, `${k}-strong`)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4)
      return <s key={k}>{renderInlineMd(part.slice(2, -2), isOwn, `${k}-strike`)}</s>;
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4)
      return <u key={k}>{renderInlineMd(part.slice(2, -2), isOwn, `${k}-underline`)}</u>;
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2)
      return <em key={k}>{renderInlineMd(part.slice(1, -1), isOwn, `${k}-em`)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={k} style={{ fontFamily: 'monospace', fontSize: '0.9em', background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', borderRadius: 3, padding: '0 3px' }}>{part.slice(1, -1)}</code>;
    if (/^https?:\/\//.test(part))
      return <a key={k} href={part} target="_blank" rel="noopener noreferrer" style={{ color: isOwn ? 'rgba(255,255,255,0.85)' : '#60a5fa', textDecoration: 'underline' }}>{part}</a>;
    if (/^@/.test(part))
      return <span key={k} className="font-bold" style={isOwn ? { color: 'rgba(255,255,255,0.95)' } : { color: '#60a5fa' }}>{part}</span>;
    return stripSupraSpaceTypographyTags(part.replace(/\{\s*\/?\s*color(?:\s*:\s*#[0-9a-f]{3,8})?\s*\}/gi, ''));
  });
}

function renderContent(msg: SSMessage, isOwn: boolean): React.ReactNode {
  const label = MEDIA_LABELS[msg.type];
  if (label) return label;

  const text = normalizeMessageMarkdownForDisplay(msg.content ?? '');
  const lines = text.split('\n');
  const bulletRe = POPUP_SOURCE_BULLET_RE;
  const numberedRe = /^(\s*)(\d+)\.\s+(.+)$/;

  const depthFrom = (indent: string, marker?: string) => {
    const indentDepth = Math.round(indent.replace(/\t/g, '    ').length / 2);
    const markerDepth = marker ? Math.max(0, POPUP_BULLET_GLYPHS.indexOf(marker)) : 0;
    return Math.max(indentDepth, markerDepth);
  };

  return (
    <span className="block">
      {lines.map((line, index) => {
        if (/^\s*(?:\*\*|__|~~)\s*$/.test(line)) return null;
        if (!line.trim()) return <span key={`blank-${index}`} className="block" style={{ height: 8 }} aria-hidden="true" />;

        const bullet = line.match(bulletRe);
        if (bullet) {
          const depth = depthFrom(bullet[1], bullet[2]);
          return (
            <span key={`bullet-${index}`} className="flex items-start" style={{ marginLeft: depth * 14, gap: 6, marginTop: index > 0 ? 2 : 0 }}>
              <span aria-hidden="true" style={{ width: 12, flex: '0 0 12px', textAlign: 'center' }}>{bullet[2]}</span>
              <span>{renderInlineMd(bullet[3], isOwn, `bullet-${index}`)}</span>
            </span>
          );
        }

        const numbered = line.match(numberedRe);
        if (numbered) {
          const depth = depthFrom(numbered[1]);
          return (
            <span key={`numbered-${index}`} className="flex items-start" style={{ marginLeft: depth * 14, gap: 6, marginTop: index > 0 ? 2 : 0 }}>
              <span aria-hidden="true" style={{ minWidth: 16, flexShrink: 0, textAlign: 'right' }}>{numbered[2]}.</span>
              <span>{renderInlineMd(numbered[3], isOwn, `numbered-${index}`)}</span>
            </span>
          );
        }

        if (/^\s*>\s?/.test(line)) {
          return (
            <span key={`quote-${index}`} className="block" style={{ borderLeft: '2px solid', borderColor: isOwn ? 'rgba(255,255,255,0.4)' : '#60a5fa', paddingLeft: 8, marginTop: index > 0 ? 3 : 0, opacity: 0.88 }}>
              {renderInlineMd(line.replace(/^\s*>\s?/, ''), isOwn, `quote-${index}`)}
            </span>
          );
        }

        const renderLine = (() => {
          if (/\*\*\s*$/.test(line) && !/^\s*\*\*/.test(line)) return `**${line.replace(/\*\*\s*$/, '').trimEnd()}**`;
          if (/^\s*\*\*/.test(line) && !/\*\*.*\*\*/.test(line)) return `**${line.replace(/^\s*\*\*/, '').trimStart()}**`;
          return line;
        })();

        return (
          <span key={`line-${index}`} className="block" style={{ marginTop: index > 0 ? 2 : 0 }}>
            {renderInlineMd(renderLine, isOwn, `line-${index}`)}
          </span>
        );
      })}
    </span>
  );
}

// ─── Paste helpers

// ─── Paste helpers (mirror of SupraSpace, adapted for plain <input>) ─────────

function hasRichFormatting(html: string): boolean {
  return /<(b|strong|i|em|u|s|strike|del|code|li|blockquote|ol|ul|h[1-6])\b/i.test(html)
    || /<font\b[^>]*(?:color|face|size)\s*=/i.test(html)
    || /style\s*=\s*["'][^"']*(?:font-weight\s*:\s*(?:bold|\d{3,})|font-style\s*:\s*italic|font-family\s*:|font-size\s*:|color\s*:\s*[^"';\s][^"';]*)/i.test(html);
}

function getCopiedElementVisibleText(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    const input = element as HTMLInputElement;
    if (input.type === 'hidden') return '';
    return input.value || element.getAttribute('value') || '';
  }
  if (tag === 'textarea') {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value || element.getAttribute('value') || element.textContent || '';
  }
  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    return select.selectedOptions?.[0]?.textContent || select.value || '';
  }
  // Empty metadata-only elements are not visible copied text. Returning
  // data-label/data-text here can insert UI labels that the user never selected.
  return '';
}

function clipboardHtmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    if (
      clipboardElementIsHidden(element)
      || clipboardElementIsDecorativeMarker(element)
    ) return '';

    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      return element.getAttribute('alt')
        || element.getAttribute('aria-label')
        || element.getAttribute('title')
        || '';
    }
    if (['input', 'textarea', 'select'].includes(tag)) {
      return clipboardControlValue(element);
    }

    let inner = Array.from(element.childNodes).map(walk).join('');
    if (tag === 'li') {
      inner = inner.replace(
        /^\s*(?:[-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]|\d+[.)])\s+/u,
        '',
      );
      return `${inner}\n`;
    }
    if (['div', 'p', 'section', 'article', 'header', 'footer'].includes(tag)) {
      return `${inner}\n`;
    }
    return inner;
  };

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .replace(/\u00A0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

const VIN_LIKE_TOKEN = /[A-HJ-NPR-Z0-9]{17}/g;
const SERIAL_LIKE_TOKEN = /[A-Z0-9][A-Z0-9-]{6,}[A-Z0-9]/g;
const SERIAL_WORD_TOKEN = /[A-Z0-9][A-Z0-9\-\u200B-\u200D\uFEFF]{6,}[A-Z0-9]/g;

function serialLikeTokens(text: string): string[] {
  const normalized = text.toUpperCase();
  const rawTokens = [
    ...(normalized.match(VIN_LIKE_TOKEN) || []),
    ...(normalized.match(SERIAL_LIKE_TOKEN) || []),
    ...(normalized.match(SERIAL_WORD_TOKEN) || []),
  ];
  return [...new Set(rawTokens
    .map(token => token.replace(/[^A-Z0-9]/g, ''))
    .filter(token => {
      if (token.length < 8 || !/[A-Z]/.test(token) || !/\d/.test(token)) return false;
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(token)) return true;
      const digitCount = (token.match(/\d/g) || []).length;
      return digitCount >= 4;
    }))];
}

function isSerialLikeText(text: string): boolean {
  const compact = text.trim().toUpperCase().replace(/-/g, '');
  return compact.length >= 8 && /^[A-Z0-9]+$/.test(compact) && /[A-Z]/.test(compact) && /\d/.test(compact);
}

function preserveVisibleVinLines(serialized: string, visibleText: string): string {
  const visibleLines = visibleText.replace(/\r\n?/g, '\n').split('\n');
  const vins = serialLikeTokens(visibleText);
  if (!vins.length) return serialized;

  const serializedLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  vins.forEach(vin => {
    const serializedSearch = serialized.toUpperCase().replace(/-/g, '');
    if (serializedSearch.includes(vin)) return;
    const visibleLineIndex = visibleLines.findIndex(line => line.toUpperCase().replace(/-/g, '').includes(vin));
    const sourceLine = visibleLineIndex >= 0 ? visibleLines[visibleLineIndex].trim() : vin;
    serializedLines.splice(Math.min(Math.max(visibleLineIndex, 0), serializedLines.length), 0, sourceLine || vin);
    serialized = serializedLines.join('\n');
  });
  return serializedLines.join('\n');
}

function importantVisibleTokens(line: string): string[] {
  return serialLikeTokens(line);
}

function preserveVisiblePayloadLines(serialized: string, visibleText: string): string {
  const visibleLines = visibleText.replace(/\r\n?/g, '\n').split('\n');
  const serializedLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  let serializedSearch = serializedLines.join('\n').toUpperCase().replace(/-/g, '');

  visibleLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const missingImportantToken = importantVisibleTokens(trimmed).some(token => !serializedSearch.includes(token));
    if (!missingImportantToken) return;

    const insertAt = Math.min(Math.max(index, 0), serializedLines.length);
    serializedLines.splice(insertAt, 0, trimmed);
    serializedSearch = serializedLines.join('\n').toUpperCase().replace(/-/g, '');
  });

  return serializedLines.join('\n');
}

function normalizeSerialSearchText(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isEmptyVinLabelLine(line: string): boolean {
  return /^\s*VIN\s*#?\s*:\s*$/i.test(line);
}

function restoreMissingSerialsFromSources(serialized: string, sources: Array<string | null | undefined>): string {
  const sourceText = sources.filter(Boolean).join('\n');
  const tokens = serialLikeTokens(sourceText);
  if (!tokens.length) return serialized;

  const sourceLines = sourceText.replace(/\r\n?/g, '\n').split('\n');
  const restoredLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  let serializedSearch = normalizeSerialSearchText(restoredLines.join('\n'));

  tokens.forEach(token => {
    if (serializedSearch.includes(token)) return;
    const emptyVinLineIndex = restoredLines.findIndex(isEmptyVinLabelLine);
    if (emptyVinLineIndex >= 0 && /^[A-HJ-NPR-Z0-9]{17}$/.test(token)) {
      restoredLines[emptyVinLineIndex] = restoredLines[emptyVinLineIndex].replace(/:\s*$/, `: ${token}`);
      serializedSearch = normalizeSerialSearchText(restoredLines.join('\n'));
      return;
    }
    const sourceLine = sourceLines.find(line => normalizeSerialSearchText(line).includes(token))?.trim();
    const fallback = sourceLine && sourceLine.length <= token.length + 24 ? sourceLine : token;
    if (!fallback) return;
    restoredLines.push(fallback);
    serializedSearch = normalizeSerialSearchText(restoredLines.join('\n'));
  });

  return restoredLines.join('\n');
}

function canonicalizeColorMarkup(value: string): string {
  const tagPattern = /\{\s*(\/)?\s*color(?:\s*:\s*(#[0-9a-f]{3,8}))?\s*\}/gi;
  let result = '';
  let cursor = 0;
  let activeColor: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(value)) !== null) {
    result += value.slice(cursor, match.index);
    const isClosing = Boolean(match[1]);
    const nextColor = match[2]?.toLowerCase() || null;

    if (isClosing) {
      if (activeColor) result += '{/color}';
      activeColor = null;
    } else if (nextColor && nextColor !== activeColor) {
      if (activeColor) result += '{/color}';
      result += `{color:${nextColor}}`;
      activeColor = nextColor;
    }

    cursor = match.index + match[0].length;
  }

  result += value.slice(cursor);
  if (activeColor) result += '{/color}';

  result = result.replace(
    /\{color:(#[0-9a-f]{3,8})\}[ \t]*\{\/color\}/gi,
    '',
  );

  // Merge adjacent same-color fragments only across horizontal whitespace.
  // Never consume \n or \r because those line boundaries are user content.
  let previous = '';
  while (previous !== result) {
    previous = result;
    result = result.replace(
      /\{color:(#[0-9a-f]{3,8})\}([^{}\r\n]*)\{\/color\}([ \t]*)\{color:\1\}/gi,
      '{color:$1}$2$3',
    );
  }

  return result;
}

function richPasteDropsVinLikeToken(plainText: string, html: string): boolean {
  if (!plainText || !html) return false;
  const tokens = serialLikeTokens(plainText);
  if (!tokens.length) return false;
  const htmlText = clipboardHtmlToPlainText(html).toUpperCase().replace(/-/g, '');
  return tokens.some(token => !htmlText.includes(token));
}

function shouldPreferPlainTextLayout(plainText: string, editorHtml: string): boolean {
  if (!plainText.trim() || !editorHtml.trim()) return false;
  const plainBreaks = (plainText.replace(/\r\n/g, '\n').match(/\n/g) || []).length;
  if (plainBreaks < 2) return false;
  const htmlBreaks = (editorHtml.match(/<br\s*\/?>/gi) || []).length;
  return plainBreaks > htmlBreaks + 1;
}

function hasMarkdownSyntax(text: string): boolean {
  return /\*\*[\s\S]+?\*\*|__[^_\n]+__|~~[^~\n]+~~|\{color:#[0-9a-fA-F]{6}\}|\{font:[a-z-]+\}|\{size:\d{1,3}\}/m.test(text)
    || text.replace(/\r\n?/g, '\n').split('\n').some(line =>
      POPUP_SOURCE_BULLET_RE.test(line) || /^\s*\d+\.\s+\S/.test(line) || /^\s*>\s?\S/.test(line)
    );
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Converts the contentEditable div's innerHTML to markdown for sending
function cssColorToHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const raw = color.trim();
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) return hex.length === 3 ? `#${hex.split('').map(c => c + c).join('')}`.toLowerCase() : `#${hex}`.toLowerCase();
  const rgb = raw.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgb) return null;
  return `#${[rgb[1], rgb[2], rgb[3]].map(v => Math.max(0, Math.min(255, Number(v))).toString(16).padStart(2, '0')).join('')}`;
}


function getRichEditorSelectionRange(root: HTMLElement, savedRange: Range | null): Range {
  const currentSelection = window.getSelection();
  if (currentSelection?.rangeCount) {
    const currentRange = currentSelection.getRangeAt(0);
    if (
      root.contains(currentRange.startContainer)
      && root.contains(currentRange.endContainer)
    ) {
      return currentRange.cloneRange();
    }
  }

  if (
    savedRange
    && root.contains(savedRange.startContainer)
    && root.contains(savedRange.endContainer)
  ) {
    return savedRange.cloneRange();
  }

  const fallbackRange = document.createRange();
  fallbackRange.selectNodeContents(root);
  fallbackRange.collapse(false);
  return fallbackRange;
}

function executeRichEditorCommandPreservingSelection(
  root: HTMLElement,
  savedRange: Range | null,
  command: () => void,
): Range | null {
  const sourceRange = getRichEditorSelectionRange(root, savedRange);
  const selection = window.getSelection();
  if (!selection) return null;

  const createTextBookmark = (range: Range) => {
    const startProbe = document.createRange();
    startProbe.selectNodeContents(root);
    startProbe.setEnd(range.startContainer, range.startOffset);

    const endProbe = document.createRange();
    endProbe.selectNodeContents(root);
    endProbe.setEnd(range.endContainer, range.endOffset);

    return {
      start: startProbe.toString().length,
      end: endProbe.toString().length,
      collapsed: range.collapsed,
    };
  };

  const restoreTextBookmark = (
    bookmark: { start: number; end: number; collapsed: boolean },
  ): Range | null => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    let current = walker.nextNode();
    while (current) {
      const node = current as Text;
      const parent = node.parentElement;
      if (
        node.data
        && !parent?.closest('[data-rich-editor-selection-marker]')
      ) {
        textNodes.push(node);
      }
      current = walker.nextNode();
    }

    if (!textNodes.length) {
      const fallback = document.createRange();
      fallback.selectNodeContents(root);
      fallback.collapse(false);
      selection.removeAllRanges();
      selection.addRange(fallback);
      return fallback.cloneRange();
    }

    const locate = (target: number) => {
      let consumed = 0;

      for (let index = 0; index < textNodes.length; index += 1) {
        const node = textNodes[index];
        const nextConsumed = consumed + node.data.length;

        if (target < nextConsumed) {
          return {
            node,
            offset: Math.max(0, target - consumed),
          };
        }

        if (target === nextConsumed) {
          const nextNode = textNodes[index + 1];
          return nextNode
            ? { node: nextNode, offset: 0 }
            : { node, offset: node.data.length };
        }

        consumed = nextConsumed;
      }

      const lastNode = textNodes[textNodes.length - 1];
      return { node: lastNode, offset: lastNode.data.length };
    };

    const start = locate(bookmark.start);
    const end = bookmark.collapsed
      ? start
      : locate(Math.max(bookmark.start, bookmark.end));

    const restored = document.createRange();
    restored.setStart(start.node, start.offset);
    restored.setEnd(end.node, end.offset);

    selection.removeAllRanges();
    selection.addRange(restored);
    return restored.cloneRange();
  };

  const isVisuallyEmpty = (element: Element): boolean => {
    const visibleText = (element.textContent || '')
      .replace(/[\u200B\u2060]/g, '')
      .trim();

    return (
      !visibleText
      && !element.querySelector(
        'img,video,audio,canvas,svg,input,textarea,button,a[href]',
      )
    );
  };

  const removeLeadingPhantomBlocks = () => {
    // Remove any legacy temporary markers left by an interrupted command.
    root
      .querySelectorAll('[data-rich-editor-selection-marker]')
      .forEach(node => node.remove());

    while (
      root.firstChild?.nodeType === Node.TEXT_NODE
      && !(root.firstChild.textContent || '').trim()
    ) {
      root.firstChild.remove();
    }

    let firstElement = root.firstElementChild;

    // Repeated browser list toggles can leave an empty DIV/P before the
    // original text. A saved message is already trimmed, so this leading
    // empty block is always an editor artifact rather than message content.
    while (
      firstElement
      && root.children.length > 1
      && ['DIV', 'P'].includes(firstElement.tagName)
      && isVisuallyEmpty(firstElement)
    ) {
      firstElement.remove();
      firstElement = root.firstElementChild;
    }

    // Chrome can also create an empty first LI when a list is toggled
    // repeatedly over the same selected lines.
    if (
      firstElement
      && ['UL', 'OL'].includes(firstElement.tagName)
    ) {
      let firstItem = firstElement.firstElementChild;

      while (
        firstItem
        && firstElement.children.length > 1
        && firstItem.tagName === 'LI'
        && isVisuallyEmpty(firstItem)
      ) {
        firstItem.remove();
        firstItem = firstElement.firstElementChild;
      }
    }

    // Remove an entirely empty list wrapper when meaningful content follows it.
    firstElement = root.firstElementChild;
    if (
      firstElement
      && root.children.length > 1
      && ['UL', 'OL'].includes(firstElement.tagName)
      && isVisuallyEmpty(firstElement)
    ) {
      firstElement.remove();
    }
  };

  const bookmark = createTextBookmark(sourceRange);

  root.focus();
  selection.removeAllRanges();
  selection.addRange(sourceRange);

  command();
  removeLeadingPhantomBlocks();
  normalizeRichEditorListExitArtifacts(root);

  return restoreTextBookmark(bookmark);
}


function applyTextColorToRichEditorSelection(root: HTMLElement, color: string): void {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer)
    || !root.contains(range.endContainer)
  ) {
    return;
  }

  if (range.collapsed) {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    return;
  }

  const selectedTextNodes: Text[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const textNode = node as Text;
        const value = textNode.data;
        const parent = textNode.parentElement;

        if (
          !value
          || !parent
          || parent.closest('[data-rich-editor-selection-marker]')
          || !range.intersectsNode(textNode)
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let current = walker.nextNode();
  while (current) {
    selectedTextNodes.push(current as Text);
    current = walker.nextNode();
  }

  // Process from the end so splitting a text node cannot invalidate a later node.
  selectedTextNodes.reverse().forEach(textNode => {
    const originalLength = textNode.data.length;
    let startOffset = textNode === range.startContainer ? range.startOffset : 0;
    let endOffset = textNode === range.endContainer ? range.endOffset : originalLength;

    startOffset = Math.max(0, Math.min(startOffset, originalLength));
    endOffset = Math.max(startOffset, Math.min(endOffset, originalLength));
    if (startOffset === endOffset) return;

    if (endOffset < textNode.data.length) {
      textNode.splitText(endOffset);
    }

    const selectedNode = startOffset > 0
      ? textNode.splitText(startOffset)
      : textNode;

    const parent = selectedNode.parentElement;
    const parentColor = parent
      ? cssColorToHex(parent.style.color || parent.getAttribute('color'))
      : null;

    if (
      parent
      && parent.tagName.toLowerCase() === 'span'
      && parent.childNodes.length === 1
      && parentColor
    ) {
      parent.style.color = color;
      return;
    }

    const colorSpan = document.createElement('span');
    colorSpan.style.color = color;
    selectedNode.parentNode?.insertBefore(colorSpan, selectedNode);
    colorSpan.appendChild(selectedNode);
  });

  // Remove empty wrappers created by repeated color changes, while preserving
  // each block element and every line break.
  root.querySelectorAll<HTMLElement>('span[style*="color"]').forEach(span => {
    if (!span.textContent && !span.querySelector('br')) span.remove();
  });
}

function htmlToMarkdown(el: HTMLElement): string {
  const walk = (node: Node, listDepth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    if (
      element.hasAttribute('data-rich-editor-selection-marker')
      || clipboardElementIsHidden(element)
      || clipboardElementIsDecorativeMarker(element)
    ) return '';

    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      return element.getAttribute('alt')
        || element.getAttribute('aria-label')
        || element.getAttribute('title')
        || '';
    }
    if (['input', 'textarea', 'select'].includes(tag)) {
      return clipboardControlValue(element);
    }

    if (tag === 'ul' || tag === 'ol') {
      return Array.from(element.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map(child => walk(child, listDepth))
        .join('');
    }

    if (tag === 'li') {
      const parent = element.parentElement;
      const ordered = parent?.tagName.toLowerCase() === 'ol';
      const siblings = parent
        ? Array.from(parent.children).filter(child => child.tagName.toLowerCase() === 'li')
        : [];
      const itemIndex = Math.max(0, siblings.indexOf(element));
      const startAt = ordered ? Number(parent?.getAttribute('start') || 1) : 1;
      const marginLeft = element.style.marginLeft.trim();
      const marginMatch = marginLeft.match(/^([\d.]+)(em|rem|px|pt)$/i);
      let marginDepth = 0;
      if (marginMatch) {
        const marginValue = Number.parseFloat(marginMatch[1]);
        const marginUnit = marginMatch[2].toLowerCase();
        if (Number.isFinite(marginValue)) {
          marginDepth = marginUnit === 'em' || marginUnit === 'rem'
            ? Math.max(0, Math.round(marginValue / 1.1))
            : marginUnit === 'px'
              ? Math.max(0, Math.round(marginValue / 18))
              : Math.max(0, Math.round(marginValue / 13.5));
        }
      }
      const visualDepth = Math.max(listDepth, marginDepth);
      const marker = ordered ? `${startAt + itemIndex}.` : popupBulletGlyphForDepth(visualDepth);
      const indent = POPUP_LIST_INDENT_STEP.repeat(visualDepth);

      let ownContent = '';
      let nestedContent = '';
      Array.from(element.childNodes).forEach(child => {
        if (
          child.nodeType === Node.ELEMENT_NODE
          && ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())
        ) {
          nestedContent += walk(child, visualDepth + 1);
        } else {
          ownContent += walk(child, visualDepth);
        }
      });

      const itemText = ownContent
        .replace(/^\s*(?:[-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]|\d+[.)])\s+/u, '')
        .replace(/\n+/g, ' ')
        .trim();
      return `${indent}${marker}${itemText ? ` ${itemText}` : ''}\n${nestedContent}`;
    }

    let inner = Array.from(element.childNodes)
      .map(child => walk(child, listDepth))
      .join('');
    if (!inner.trim() && ['input', 'textarea', 'select'].includes(tag)) {
      inner = clipboardControlValue(element);
    }

    const href = tag === 'a' ? element.getAttribute('href') : null;
    const rawFontFamily = `${element.style.fontFamily || ''} ${element.getAttribute('face') || ''}`;
    const hasExplicitFontFamily = Boolean(
      element.style.fontFamily.trim()
      || element.getAttribute('face'),
    );
    const hasExplicitFontSize = Boolean(
      element.style.fontSize.trim()
      || element.getAttribute('size'),
    );
    const fontFamily = ss4FontFamilyIdFromCss(rawFontFamily);
    const fontSize = ss4FontSizeFromCss(element.style.fontSize)
      || ss4FontSizeFromLegacyAttribute(element.getAttribute('size'));
    const isMonospace = !fontFamily
      && /(monospace|courier|consolas|menlo|monaco)/i.test(rawFontFamily);
    const fontWeight = element.style.fontWeight;
    const decoration = `${element.style.textDecoration} ${element.style.textDecorationLine}`.toLowerCase();

    if (
      tag === 'strong'
      || tag === 'b'
      || /^h[1-6]$/.test(tag)
      || fontWeight === 'bold'
      || Number.parseInt(fontWeight || '0', 10) >= 600
    ) inner = `**${inner}**`;
    if (tag === 'em' || tag === 'i' || element.style.fontStyle === 'italic') inner = `_${inner}_`;
    if (tag === 'u' || decoration.includes('underline')) inner = `__${inner}__`;
    if (
      tag === 's'
      || tag === 'strike'
      || tag === 'del'
      || decoration.includes('line-through')
    ) inner = `~~${inner}~~`;
    if (tag === 'pre') inner = `\`\`\`\n${inner.replace(/```/g, '')}\n\`\`\``;
    else if (tag === 'code' || isMonospace) inner = isSerialLikeText(inner)
      ? inner
      : '`' + inner.replace(/`/g, '') + '`';
    else if (tag === 'blockquote') inner = inner
      .split('\n')
      .map(line => line ? `> ${line}` : '>')
      .join('\n');
    else if (href && /^(?:https?:|mailto:)/i.test(href)) {
      inner = `[${inner || href}](${href})`;
    }

    if (
      fontFamily
      && hasExplicitFontFamily
      && inner.trim()
    ) inner = `{font:${fontFamily}}${inner}{/font}`;
    if (
      fontSize
      && hasExplicitFontSize
      && inner.trim()
    ) inner = `{size:${fontSize}}${inner}{/size}`;

    const color = cssColorToHex(
      element.style.color
      || element.style.getPropertyValue('-webkit-text-fill-color')
      || element.getAttribute('color'),
    );
    if (color && inner.trim()) inner = `{color:${color}}${inner}{/color}`;

    if (
      ['div', 'p', 'section', 'article', 'blockquote', 'pre'].includes(tag)
      || /^h[1-6]$/.test(tag)
    ) inner = `\n${inner}`;
    return inner;
  };

  const markdown = normalizeListExitLineSpacing(
    Array.from(el.childNodes)
      .map(child => walk(child, 0))
      .join('')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
  return canonicalizeColorMarkup(markdown);
}

function htmlAppearsToContainLists(html: string): boolean {
  return /<(?:ul|ol|li)\b/i.test(html)
    || /display\s*:\s*list-item/i.test(html)
    || /mso-list\s*:/i.test(html)
    || /list-style(?:-type)?\s*:/i.test(html);
}

const POPUP_SOURCE_BULLET_RE = /^([ \t]*)([\-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]{1,4})\s+(.+)$/u;

function normalizeListExitLineSpacing(value: string): string {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const isListLine = (line: string): boolean =>
    POPUP_SOURCE_BULLET_RE.test(line) || /^\s*\d+\.\s+\S/.test(line);

  return lines.map((line, index) => {
    let nextLine = line.replace(/^[\u200B-\u200D\u2060\uFEFF]+/, '');

    if (
      index > 0
      && nextLine.trim()
      && isListLine(lines[index - 1])
      && !isListLine(nextLine)
      && !/^\s*>/.test(nextLine)
    ) {
      // Chrome can leave one invisible/NBSP/normal-space character when a
      // list item is converted back to a normal paragraph. Remove only that
      // browser-created first character; preserve the rest of the user's
      // alignment and spacing.
      nextLine = nextLine.replace(/^\u00A0/, '');
      if (nextLine.startsWith(' ')) nextLine = nextLine.slice(1);
    }

    return nextLine;
  }).join('\n');
}

function firstVisibleTextNode(element: Element): Text | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    if (textNode.data) return textNode;
    current = walker.nextNode();
  }

  return null;
}

function normalizeRichEditorListExitArtifacts(root: HTMLElement | null): boolean {
  if (!root) return false;

  let changed = false;
  const topLevelBlocks = Array.from(root.children);

  topLevelBlocks.forEach((element, index) => {
    if (['UL', 'OL'].includes(element.tagName)) return;

    const previous = topLevelBlocks[index - 1];
    if (!previous || !['UL', 'OL'].includes(previous.tagName)) return;

    const htmlElement = element as HTMLElement;
    ['margin-left', 'padding-left', 'text-indent'].forEach(property => {
      if (htmlElement.style.getPropertyValue(property)) {
        htmlElement.style.removeProperty(property);
        changed = true;
      }
    });

    const firstText = firstVisibleTextNode(element);
    if (!firstText) return;

    const original = firstText.data;
    let normalized = original.replace(
      /^[\u00A0\u200B-\u200D\u2060\uFEFF]+/,
      '',
    );

    // Toggling a browser list off can leave exactly one ordinary leading
    // space after its non-breaking placeholder. Remove one only.
    if (normalized.startsWith(' ')) normalized = normalized.slice(1);

    if (normalized !== original) {
      firstText.data = normalized;
      changed = true;
    }
  });

  return changed;
}

function isUnsafeNeutralPastedColor(color: string | null): boolean {
  if (!color) return false;
  const raw = color.replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return false;

  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const neutral = maximum - minimum <= 20;
  const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);

  // Very light neutral text disappears on the light composer. Very dark
  // neutral text disappears in dark mode. Let those colors inherit the
  // application theme instead.
  return neutral && (luminance >= 222 || luminance <= 42);
}

function sanitizePastedEditorHtmlForTheme(html: string): string {
  if (!html.trim()) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.body.querySelectorAll<HTMLElement>('*').forEach(element => {
    const rawColor = element.style.color
      || element.style.getPropertyValue('-webkit-text-fill-color')
      || element.getAttribute('color')
      || '';
    const normalizedColor = cssColorToHex(rawColor);

    if (isUnsafeNeutralPastedColor(normalizedColor)) {
      element.style.removeProperty('color');
      element.style.removeProperty('-webkit-text-fill-color');
      element.removeAttribute('color');
    }

    // Source backgrounds frequently carry the source application's theme and
    // can make otherwise visible text unreadable in Suprah Space.
    element.style.removeProperty('background');
    element.style.removeProperty('background-color');
    element.style.removeProperty('background-image');
    element.style.removeProperty('text-shadow');

    if (!element.getAttribute('style')?.trim()) {
      element.removeAttribute('style');
    }
  });

  return doc.body.innerHTML;
}

function popupPlainTextHasListMarkers(text: string): boolean {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .some(line => POPUP_SOURCE_BULLET_RE.test(line) || /^\s*\d+\.\s+\S/.test(line));
}

function applyPopupSourceBulletMarkers(structuredText: string, sourceText: string): string {
  const sourceMarkers = sourceText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.match(POPUP_SOURCE_BULLET_RE)?.[2])
    .filter((marker): marker is string => Boolean(marker));

  if (!sourceMarkers.length) return structuredText;

  let markerIndex = 0;
  return structuredText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => {
      const match = line.match(POPUP_SOURCE_BULLET_RE);
      if (!match) return line;
      const sourceMarker = sourceMarkers[markerIndex++] || match[2];
      return `${match[1]}${sourceMarker} ${match[3]}`;
    })
    .join('\n');
}

function clipboardHtmlToListAwareText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];
  const pushBlankLine = () => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
  };

  const normalizeInline = (value: string): string => value
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const renderInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (
      tag === 'script'
      || tag === 'style'
      || tag === 'ul'
      || tag === 'ol'
      || clipboardElementIsHidden(element)
      || clipboardElementIsDecorativeMarker(element)
    ) return '';
    if (tag === 'br') return '\n';
    if (tag === 'img') return element.getAttribute('alt') || element.getAttribute('aria-label') || element.getAttribute('title') || '';
    if (['input', 'textarea', 'select'].includes(tag)) {
      return clipboardControlValue(element);
    }

    let inner = Array.from(element.childNodes).map(renderInline).join('');
    const style = (element.getAttribute('style') || '').toLowerCase();
    const weight = style.match(/font-weight\s*:\s*([^;]+)/)?.[1]?.trim() || '';
    const href = tag === 'a' ? element.getAttribute('href') : null;
    const isBold = tag === 'strong' || tag === 'b' || /^h[1-6]$/.test(tag) || weight === 'bold' || Number.parseInt(weight || '0', 10) >= 600;
    const isItalic = tag === 'em' || tag === 'i' || /font-style\s*:\s*italic/.test(style);
    const isUnderline = tag === 'u' || /text-decoration(?:-line)?\s*:[^;]*underline/.test(style);
    const isStrike = tag === 's' || tag === 'strike' || tag === 'del' || /text-decoration(?:-line)?\s*:[^;]*line-through/.test(style);

    if (tag === 'code') inner = isSerialLikeText(inner) ? inner : `\`${inner.replace(/`/g, '')}\``;
    if (href && /^https?:\/\//i.test(href)) inner = `[${inner || href}](${href})`;
    if (isBold && !/^\*\*[\s\S]*\*\*$/.test(inner)) inner = `**${inner}**`;
    if (isItalic && !/^_[\s\S]*_$/.test(inner)) inner = `_${inner}_`;
    if (isUnderline && !/^__[\s\S]*__$/.test(inner)) inner = `__${inner}__`;
    if (isStrike && !/^~~[\s\S]*~~$/.test(inner)) inner = `~~${inner}~~`;
    const rawFontFamily = `${element.style.fontFamily || ''} ${element.getAttribute('face') || ''}`;
    const fontFamily = ss4FontFamilyIdFromCss(rawFontFamily);
    const fontSize = ss4FontSizeFromCss(element.style.fontSize)
      || ss4FontSizeFromLegacyAttribute(element.getAttribute('size'));
    if (fontFamily && inner.trim()) inner = `{font:${fontFamily}}${inner}{/font}`;
    if (fontSize && inner.trim()) inner = `{size:${fontSize}}${inner}{/size}`;

    const color = cssColorToHex(
      element.style.color
      || element.style.getPropertyValue('-webkit-text-fill-color')
      || element.getAttribute('color'),
    );
    if (color && inner.trim()) inner = `{color:${color}}${inner}{/color}`;
    return inner;
  };

  const itemText = (item: HTMLElement) => normalizeInline(Array.from(item.childNodes).map(renderInline).join(''))
    .replace(/^(?:[-*+•·‣⁃◦▪▫●○–—])\s+/, '')
    .trim();
  const nestedLists = (item: HTMLElement) =>
    Array.from(item.querySelectorAll('ul,ol')).filter((list): list is HTMLElement => list.closest('li') === item);

  const walkList = (list: HTMLElement, depth: number) => {
    const ordered = list.tagName.toLowerCase() === 'ol';
    const startAt = ordered ? Number.parseInt(list.getAttribute('start') || '1', 10) || 1 : 1;
    const items = Array.from(list.children).filter((child): child is HTMLElement => child.tagName.toLowerCase() === 'li');
    items.forEach((item, index) => {
      const text = itemText(item);
      const indent = POPUP_LIST_INDENT_STEP.repeat(depth);
      const marker = ordered ? `${startAt + index}.` : popupBulletGlyphForDepth(depth);
      if (text) lines.push(`${indent}${marker} ${text}`);
      const nested = nestedLists(item);
      nested.forEach(child => walkList(child, depth + 1));
      if (depth === 0 && nested.length > 0 && index < items.length - 1) pushBlankLine();
    });
  };

  const walkBlock = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeInline(node.textContent || '');
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return;
    if (tag === 'ul' || tag === 'ol') {
      walkList(element, 0);
      return;
    }

    const isHeading = /^h[1-6]$/.test(tag);
    const isBlock = ['div', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'blockquote', 'pre'].includes(tag) || isHeading;
    if (!isBlock) {
      const text = normalizeInline(renderInline(element));
      if (text) lines.push(text);
      return;
    }

    if (isHeading) pushBlankLine();
    let buffer = '';
    let produced = false;
    const flush = () => {
      const text = normalizeInline(buffer);
      buffer = '';
      if (!text) return;
      lines.push(isHeading && !/^\*\*[\s\S]*\*\*$/.test(text) ? `**${text}**` : text);
      produced = true;
    };

    Array.from(element.childNodes).forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as HTMLElement;
        const childTag = childElement.tagName.toLowerCase();
        const childIsBlock = ['div', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'blockquote', 'pre'].includes(childTag) || /^h[1-6]$/.test(childTag);
        if (childTag === 'ul' || childTag === 'ol' || childIsBlock) {
          flush();
          walkBlock(child);
          produced = true;
          return;
        }
      }
      buffer += renderInline(child);
    });
    flush();
    if (!produced && (tag === 'p' || tag === 'div')) pushBlankLine();
    if (isHeading) pushBlankLine();
  };

  Array.from(doc.body.childNodes).forEach(walkBlock);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripRichTextMarkupForPlainPaste(value: string): string {
  return value
    .replace(/\{\s*color\s*:\s*#[0-9a-f]{3,8}\s*\}/gi, '')
    .replace(/\{\s*\/\s*color\s*\}/gi, '')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(^|[^\w*])_([^_\n]+)_(?!\w)/g, '$1$2');
}

// Converts source HTML (from another app's clipboard) into the editor's HTML dialect
function clipboardHtmlToEditorHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const escapeAttribute = (value: string): string =>
    escapeHtmlText(value).replace(/"/g, '&quot;');

  const safeTypographyStyles = (element: HTMLElement): string[] => {
    const styles: string[] = [];
    const color = cssColorToHex(
      element.style.color
      || element.style.getPropertyValue('-webkit-text-fill-color')
      || element.getAttribute('color')
      || '',
    );
    if (color) styles.push(`color:${color}`);

    const familyId = ss4FontFamilyIdFromCss(
      `${element.style.fontFamily || ''} ${element.getAttribute('face') || ''}`,
    );
    if (familyId && familyId !== SS4_DEFAULT_FONT_FAMILY) {
      styles.push(`font-family:${ss4FontFamilyCss(familyId)}`);
    }

    const size = ss4FontSizeFromCss(element.style.fontSize)
      || ss4FontSizeFromLegacyAttribute(element.getAttribute('size'));
    if (size && size !== SS4_DEFAULT_FONT_SIZE) {
      styles.push(`font-size:${size}px`);
    }

    return styles;
  };

  const wrapStyles = (
    element: HTMLElement,
    inner: string,
    extraStyles: string[] = [],
  ): string => {
    if (!inner) return inner;
    const styles = [...safeTypographyStyles(element), ...extraStyles];
    return styles.length
      ? `<span style="${escapeAttribute([...new Set(styles)].join(';'))}">${inner}</span>`
      : inner;
  };

  const cleanListItemClone = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(true) as HTMLElement;
    Array.from(clone.querySelectorAll<HTMLElement>('*')).forEach(child => {
      if (
        clipboardElementIsHidden(child)
        || clipboardElementIsDecorativeMarker(child)
      ) child.remove();
    });
    stripLeadingSemanticListMarker(clone);
    return clone;
  };

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtmlText(
        (node.textContent || '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, ''),
      );
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (
      ['script', 'style', 'meta', 'link', 'iframe', 'object'].includes(tag)
      || clipboardElementIsHidden(element)
      || clipboardElementIsDecorativeMarker(element)
    ) return '';

    if (tag === 'br') return '<br>';
    if (tag === 'img') {
      return escapeHtmlText(
        element.getAttribute('alt')
        || element.getAttribute('aria-label')
        || element.getAttribute('title')
        || '',
      );
    }
    if (['input', 'textarea', 'select'].includes(tag)) {
      return escapeHtmlText(clipboardControlValue(element));
    }

    if (tag === 'ul' || tag === 'ol') {
      const listItems = Array.from(element.children)
        .filter((child): child is HTMLElement =>
          child instanceof HTMLElement
          && child.tagName.toLowerCase() === 'li'
        );
      const startValue = tag === 'ol'
        ? Number.parseInt(element.getAttribute('start') || '1', 10)
        : 1;
      const startAttribute = tag === 'ol' && Number.isFinite(startValue) && startValue > 1
        ? ` start="${startValue}"`
        : '';
      return `<${tag}${startAttribute}>${listItems.map(walk).join('')}</${tag}>`;
    }

    if (tag === 'li') {
      const cleanClone = cleanListItemClone(element);
      const nestedLists = Array.from(cleanClone.children)
        .filter((child): child is HTMLElement =>
          child instanceof HTMLElement
          && ['ul', 'ol'].includes(child.tagName.toLowerCase())
        );
      nestedLists.forEach(list => list.remove());

      const own = Array.from(cleanClone.childNodes).map(walk).join('').trim() || '<br>';
      const nested = Array.from(element.children)
        .filter((child): child is HTMLElement =>
          child instanceof HTMLElement
          && ['ul', 'ol'].includes(child.tagName.toLowerCase())
        )
        .map(walk)
        .join('');
      return `<li>${wrapStyles(element, own)}${nested}</li>`;
    }

    const inner = Array.from(element.childNodes).map(walk).join('');
    const fontWeight = element.style.fontWeight;
    const decoration = `${element.style.textDecoration} ${element.style.textDecorationLine}`.toLowerCase();
    let formatted = inner;

    if (
      tag === 'strong'
      || tag === 'b'
      || fontWeight === 'bold'
      || Number.parseInt(fontWeight || '0', 10) >= 600
    ) formatted = `<strong>${formatted}</strong>`;
    if (tag === 'em' || tag === 'i' || element.style.fontStyle === 'italic') {
      formatted = `<em>${formatted}</em>`;
    }
    if (tag === 'u' || decoration.includes('underline')) formatted = `<u>${formatted}</u>`;
    if (
      tag === 's'
      || tag === 'strike'
      || tag === 'del'
      || decoration.includes('line-through')
    ) formatted = `<s>${formatted}</s>`;

    if (tag === 'code') return `<code>${wrapStyles(element, formatted)}</code>`;
    if (tag === 'pre') return `<pre>${wrapStyles(element, formatted)}</pre>`;
    if (tag === 'blockquote') return `<blockquote>${wrapStyles(element, formatted || '<br>')}</blockquote>`;
    if (tag === 'a') {
      const href = element.getAttribute('href') || '';
      if (!/^(?:https?:|mailto:)/i.test(href)) return wrapStyles(element, formatted);
      return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${wrapStyles(element, formatted || escapeHtmlText(href))}</a>`;
    }
    if (/^h[1-6]$/.test(tag)) {
      return `<div>${wrapStyles(element, `<strong>${formatted}</strong>`)}</div>`;
    }
    if (['div', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside'].includes(tag)) {
      return `<div>${wrapStyles(element, formatted || '<br>')}</div>`;
    }
    return wrapStyles(element, formatted);
  };

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .replace(/^(?:<div><br><\/div>)+/gi, '')
    .replace(/(?:<div><br><\/div>)+$/gi, '')
    .trim();
}

function clipboardPayloadToPlainText(text: string, html: string): string {
  const structuredListText = html && htmlAppearsToContainLists(html)
    ? clipboardHtmlToListAwareText(html)
    : '';
  const markerPreservedListText = structuredListText
    ? applyPopupSourceBulletMarkers(structuredListText, text)
    : '';
  const raw = markerPreservedListText || text || (html ? clipboardHtmlToPlainText(html) : '');
  return normalizePastedListArtifacts(
    stripRichTextMarkupForPlainPaste(raw)
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' '),
  );
}

function clipboardPayloadToRichEditorHtml(text: string, html: string): string {
  // Formatted paste uses the source HTML exactly once. Combining the HTML and
  // text/plain list representations creates duplicate bullets and extra text.
  if (html.trim()) {
    const hasSemanticList = /<(?:ul|ol|li)\b/i.test(html);
    const hasOfficePseudoList = /mso-list\s*:|MsoListParagraph/i.test(html);
    if (!hasSemanticList && hasOfficePseudoList) {
      const officeListText = clipboardHtmlToListAwareText(html);
      if (officeListText.trim()) {
        return sanitizePastedEditorHtmlForTheme(
          markdownTextToEditorHtml(officeListText),
        );
      }
    }

    const editorHtml = clipboardHtmlToEditorHtml(html);
    if (editorHtml.trim()) {
      return sanitizePastedEditorHtmlForTheme(editorHtml);
    }
  }

  const normalizedText = normalizeMessageMarkdownText(text || '');
  const editorHtml = hasMarkdownSyntax(normalizedText)
    ? markdownTextToEditorHtml(normalizedText)
    : escapeHtmlText(normalizedText).replace(/\n/g, '<br>');
  return sanitizePastedEditorHtmlForTheme(editorHtml);
}

function markdownTextToEditorHtml(text: string): string {
  const source = canonicalizeColorMarkup(
    normalizeMessageMarkdownText(text).replace(/\r\n?/g, '\n'),
  );
  const lines = source.split('\n');
  let activeColor: string | null = null;
  let activeFontFamily: SS4FontFamilyId = SS4_DEFAULT_FONT_FAMILY;
  let activeFontSize: SS4FontSize = SS4_DEFAULT_FONT_SIZE;

  const depthFromIndent = (indent: string, marker?: string): number => {
    const expanded = indent.replace(/\t/g, '    ').length;
    const indentDepth = expanded === 0 ? 0 : expanded <= 4 ? 1 : Math.ceil(expanded / 4);
    const markerDepth = marker ? Math.max(0, POPUP_BULLET_GLYPHS.indexOf(marker)) : 0;
    return Math.max(indentDepth, markerDepth);
  };

  const applyInlineMarkdown = (value: string): string =>
    escapeHtmlText(value)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');

  const renderStyledInline = (value: string): string => {
    const styleTag = /\{color:(#[0-9a-fA-F]{3,8})\}|\{\/color\}|\{font:([a-z-]+)\}|\{\/font\}|\{size:(\d{1,3})\}|\{\/size\}/g;
    let result = '';
    let cursor = 0;
    let match: RegExpExecArray | null;

    const wrap = (html: string): string => {
      if (!html) return html;
      const styles: string[] = [];
      if (activeColor) styles.push(`color:${activeColor}`);
      if (activeFontFamily !== SS4_DEFAULT_FONT_FAMILY) {
        styles.push(`font-family:${ss4FontFamilyCss(activeFontFamily)}`);
      }
      if (activeFontSize !== SS4_DEFAULT_FONT_SIZE) {
        styles.push(`font-size:${activeFontSize}px`);
      }
      return styles.length
        ? `<span style="${styles.join(';')}">${html}</span>`
        : html;
    };

    while ((match = styleTag.exec(value)) !== null) {
      result += wrap(applyInlineMarkdown(value.slice(cursor, match.index)));
      if (match[1]) activeColor = match[1].toLowerCase();
      else if (match[0].toLowerCase() === '{/color}') activeColor = null;
      else if (match[2]) {
        const family = match[2].toLowerCase() as SS4FontFamilyId;
        activeFontFamily = SS4_FONT_FAMILIES.some(option => option.id === family)
          ? family
          : SS4_DEFAULT_FONT_FAMILY;
      } else if (match[0].toLowerCase() === '{/font}') {
        activeFontFamily = SS4_DEFAULT_FONT_FAMILY;
      } else if (match[3]) {
        const size = Number.parseInt(match[3], 10) as SS4FontSize;
        activeFontSize = SS4_FONT_SIZES.includes(size)
          ? size
          : SS4_DEFAULT_FONT_SIZE;
      } else if (match[0].toLowerCase() === '{/size}') {
        activeFontSize = SS4_DEFAULT_FONT_SIZE;
      }
      cursor = match.index + match[0].length;
    }

    result += wrap(applyInlineMarkdown(value.slice(cursor)));
    return result;
  };

  const stack: Array<{ tag: 'ul' | 'ol'; depth: number; start?: number; items: string[] }> = [];
  const output: string[] = [];
  const flushListsToDepth = (targetDepth: number) => {
    while (stack.length > targetDepth) {
      const list = stack.pop()!;
      const html = `<${list.tag}${list.tag === 'ol' && list.start && list.start > 1 ? ` start="${list.start}"` : ''}>${list.items.join('')}</${list.tag}>`;
      if (stack.length) {
        const parent = stack[stack.length - 1];
        const lastIndex = Math.max(0, parent.items.length - 1);
        const parentItem = parent.items[lastIndex] || '<li>';
        parent.items[lastIndex] = `${parentItem.replace(/<\/li>$/, '')}${html}</li>`;
      } else output.push(html);
    }
  };

  lines.forEach(line => {
    const bulletMatch = line.match(POPUP_SOURCE_BULLET_RE);
    const numberedMatch = bulletMatch
      ? null
      : line.match(/^([ \t]*)(\d+)\.\s+(.+)$/);
    const quoteMatch = bulletMatch || numberedMatch
      ? null
      : line.match(/^\s*>\s?(.*)$/);

    if (bulletMatch || numberedMatch) {
      const indent = bulletMatch?.[1] ?? numberedMatch?.[1] ?? '';
      const marker = bulletMatch?.[2];
      const rest = bulletMatch?.[3] ?? numberedMatch?.[3] ?? '';
      const depth = depthFromIndent(indent, marker);
      const tag: 'ul' | 'ol' = bulletMatch ? 'ul' : 'ol';
      flushListsToDepth(depth + 1);
      while (stack.length <= depth) {
        stack.push({ tag, depth: stack.length, start: numberedMatch ? Number(numberedMatch[2]) : undefined, items: [] });
      }
      if (stack[depth].tag !== tag) {
        flushListsToDepth(depth);
        stack.push({ tag, depth, start: numberedMatch ? Number(numberedMatch[2]) : undefined, items: [] });
      }
      stack[depth].items.push(`<li>${renderStyledInline(rest) || '<br>'}</li>`);
      return;
    }

    flushListsToDepth(0);
    const rendered = renderStyledInline(quoteMatch ? quoteMatch[1] : line) || '<br>';
    if (quoteMatch) output.push(`<blockquote>${rendered}</blockquote>`);
    else output.push(`<div>${rendered}</div>`);
  });

  flushListsToDepth(0);
  return output.join('');
}

// ─── Forward modal

// ─── Forward modal ───────────────────────────────────────────────────────────
interface FwdUser { _id: string; fullName: string; username: string; avatar?: string; }

function ForwardModal({ message, token, myId, onClose }: {
  message: SSMessage;
  token: string;
  myId: string;
  onClose: () => void;
}) {
  const [q, setQ] = React.useState('');
  const [users, setUsers] = React.useState<FwdUser[]>([]);
  const [selected, setSelected] = React.useState<FwdUser[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    apiClient.get('/api/supraspace/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUsers((r.data?.data || []).filter((u: FwdUser) => u._id !== myId)))
      .catch(() => { })
      .finally(() => setLoadingUsers(false));
  }, [token, myId]);

  const filtered = users.filter(u => {
    if (selected.some(s => s._id === u._id)) return false;
    const lq = q.toLowerCase();
    return u.fullName.toLowerCase().includes(lq) || u.username.toLowerCase().includes(lq);
  });

  const addUser = (u: FwdUser) => { setSelected(p => [...p, u]); setQ(''); };
  const removeUser = (id: string) => setSelected(p => p.filter(s => s._id !== id));

  const handleForward = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    let ok = 0;
    for (const user of selected) {
      try {
        const r = await apiClient.post('/api/supraspace/conversations/direct',
          { targetUserId: user._id },
          { headers: { Authorization: `Bearer ${token}` } });
        const convId = r.data?.data?._id;
        if (convId && message.content) {
          await apiClient.post(`/api/supraspace/conversations/${convId}/messages`,
            { content: message.content },
            { headers: { Authorization: `Bearer ${token}` } });
        }
        ok++;
      } catch { /* best-effort */ }
    }
    setSending(false);
    if (ok > 0) toast.success(ok === 1 ? 'Message forwarded.' : `Message forwarded to ${ok} people.`);
    else toast.error('Could not forward the message.');
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--popover)', borderRadius: 12, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 style={{ width: 16, height: 16, color: '#5b7cf6' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--popover-foreground)' }}>Forward message</span>
          </div>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', border: 'none' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 16px 20px' }}>
          {/* Selected chips */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {selected.map(u => (
                <span key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '3px 10px 3px 6px', background: 'rgba(91,124,246,0.15)', border: '1px solid rgba(91,124,246,0.3)' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#5b7cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                    {u.avatar
                      ? <img src={resolveImageUrl(u.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : u.fullName[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--popover-foreground)', fontWeight: 500 }}>{u.fullName.split(' ')[0]}</span>
                  <button onClick={() => removeUser(u._id)} style={{ display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search people…"
              style={{ width: '100%', height: 36, borderRadius: 8, paddingLeft: 32, paddingRight: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--popover-foreground)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* User list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {loadingUsers && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Loading…</div>
            )}
            {!loadingUsers && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--muted-foreground)' }}>
                {q ? 'No people found' : users.length === 0 ? 'No users available' : 'All users selected'}
              </div>
            )}
            {filtered.map(u => (
              <button key={u._id} onClick={() => addUser(u)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: 'transparent', border: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5b7cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                  {u.avatar
                    ? <img src={resolveImageUrl(u.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : u.fullName[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--popover-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{u.username}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Forward button */}
          {selected.length > 0 && (
            <button onClick={handleForward} disabled={sending}
              style={{ marginTop: 12, width: '100%', height: 36, borderRadius: 8, background: '#5b7cf6', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: sending ? 0.6 : 1, cursor: sending ? 'not-allowed' : 'pointer', border: 'none' }}
            >
              <Share2 style={{ width: 14, height: 14 }} />
              {sending ? 'Forwarding…' : `Forward to ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Pinned Messages Modal ────────────────────────────────────────────────────
function PinnedMessagesModal({
  messages,
  pinnedMsgIds,
  onUnpin,
  onClose,
}: {
  messages: SSMessage[];
  pinnedMsgIds: Set<string>;
  onUnpin: (id: string) => void;
  onClose: () => void;
}) {
  const pinned = messages.filter(m => pinnedMsgIds.has(m._id) && !m.isDeleted);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--popover)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--popover-foreground)' }}>Pinned messages</span>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', border: 'none' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {pinned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No pinned messages</div>
          ) : (
            pinned.map((m, idx) => {
              const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' });
              const avatarLetter = (m.sender?.fullName || 'U')[0].toUpperCase();
              const contentText = MEDIA_LABELS[m.type] || messagePreviewText(m.content) || '';
              return (
                <React.Fragment key={m._id}>
                  {idx > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}
                  <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5b7cf6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 2 }}>
                      {m.sender?.avatar
                        ? <img src={resolveImageUrl(m.sender.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{avatarLetter}</span>
                      }
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--popover-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sender?.fullName || 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{dateStr}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {contentText}
                      </p>
                    </div>
                    {/* Unpin button */}
                    <button
                      onClick={() => onUnpin(m._id)}
                      title="Unpin message"
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-foreground)', cursor: 'pointer', marginTop: 2 }}
                    >
                      <Pin style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── GIF picker (Giphy) ─────────────────────────────────────────────────────────
function PopupGifPicker({ onPick, onClose, anchorRef, boundaryRef }: { onPick: (g: SSGif) => void; onClose: () => void; anchorRef: React.RefObject<HTMLElement | null>; boundaryRef?: React.RefObject<HTMLElement | null> }) {
  const [q, setQ] = React.useState('');
  const [gifs, setGifs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const PICKER_W = 280;
  const PICKER_H = 320;
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const boundary = boundaryRef?.current?.getBoundingClientRect();
    const minLeft = (boundary?.left ?? 8) + 8;
    const maxLeft = (boundary?.right ?? window.innerWidth) - PICKER_W - 8;
    const minTop = (boundary?.top ?? 8) + 8;
    const spaceAbove = anchor.top - minTop;
    const top = spaceAbove >= PICKER_H + 8 ? anchor.top - PICKER_H - 8 : anchor.bottom + 8;
    const left = Math.max(minLeft, Math.min(anchor.left, maxLeft));
    setPos({ top, left });
  }, [anchorRef, boundaryRef]);

  const run = React.useCallback(async (query: string) => {
    if (!GIPHY_KEY) return;
    setLoading(true);
    try {
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=pg-13`;
      const r = await fetch(endpoint);
      const d = await r.json();
      setGifs(d?.data || []);
    } catch { setGifs([]); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { run(''); }, [run]);
  React.useEffect(() => { const t = setTimeout(() => run(q), 350); return () => clearTimeout(t); }, [q, run]);

  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, anchorRef]);

  if (!pos || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-9998 rounded-xl border bg-card shadow-xl overflow-hidden"
      style={{ width: PICKER_W, top: pos.top, left: pos.left, borderColor: 'var(--border, rgba(128,128,128,0.25))' }}
    >
      <div className="p-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={GIPHY_KEY ? 'Search GIPHY...' : 'GIPHY key not configured'}
            className="w-full h-8 pl-7 pr-3 rounded-lg text-[12px] outline-none border border-border/60 bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-blue-500/50"
          />
        </div>
      </div>
      <div className="p-2 grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
        {loading && <div className="col-span-2 flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}
        {!loading && gifs.length === 0 && (
          <p className="col-span-2 text-center py-6 text-[11px] text-muted-foreground">{GIPHY_KEY ? 'No results' : 'Set NEXT_PUBLIC_GIPHY_API_KEY'}</p>
        )}
        {gifs.map((g: any) => {
          const img = g.images?.fixed_height_small || g.images?.fixed_height;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick({ url: g.images?.original?.url || img?.url, width: Number(img?.width) || undefined, height: Number(img?.height) || undefined, title: g.title })}
              className="rounded-lg overflow-hidden bg-muted/40"
              style={{ aspectRatio: '1' }}
            >
              <img src={img?.url} alt={g.title || 'GIF'} className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// ─── Voice message playback ─────────────────────────────────────────────────────
function PopupVoicePlayer({ convId, msgId, duration, own, crmToken }: { convId: string; msgId: string; duration?: number; own: boolean; crmToken: string | null }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const retriesRef = React.useRef(0);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [cur, setCur] = React.useState(0);
  const [audioErr, setAudioErr] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const total = duration || 0;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
  const src = crmToken ? `${API_BASE}/api/supraspace/conversations/${convId}/messages/${msgId}/voice?t=${encodeURIComponent(crmToken)}` : '';

  React.useEffect(() => () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }, []);

  const handleError = React.useCallback(() => {
    // Right after sending a fresh recording, an error here is often a transient
    // race (signing/storage propagation) rather than a real failure — retry a
    // couple times before giving up instead of disabling playback forever.
    if (retriesRef.current < 2) {
      retriesRef.current += 1;
      retryTimerRef.current = setTimeout(() => audioRef.current?.load(), 600);
    } else {
      setAudioErr(true);
    }
  }, []);

  const handlePlay = React.useCallback(() => {
    const a = audioRef.current;
    if (!a || pending) return;
    if (playing) { a.pause(); return; }
    if (audioErr) {
      // Let the user retry instead of being permanently locked out.
      retriesRef.current = 0;
      setAudioErr(false);
      a.load();
    }
    setPending(true);
    a.play().then(() => setPending(false)).catch(() => { setPending(false); setAudioErr(true); });
  }, [playing, pending, audioErr]);

  return (
    <div className="flex items-center gap-2 py-0.5" style={{ minWidth: 180, maxWidth: '100%' }}>
      <button
        onClick={handlePlay}
        title={audioErr ? 'Tap to retry' : undefined}
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: own ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.15)', color: own ? '#fff' : '#3b82f6' }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        {audioErr ? (
          <p className="text-[10px]" style={{ color: '#f87171' }}>Couldn't play — tap to retry</p>
        ) : (
          <>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: own ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)' }}>
              <div style={{ width: total ? `${Math.min(100, (cur / total) * 100)}%` : '0%', height: '100%', background: own ? '#fff' : '#3b82f6', transition: 'width .1s linear' }} />
            </div>
            <p className="mt-1 text-[10px]" style={{ color: own ? 'rgba(255,255,255,0.75)' : 'var(--muted-foreground)' }}>
              {fmtDuration(cur)}{total ? ` / ${fmtDuration(total)}` : ''}
            </p>
          </>
        )}
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={e => setCur((e.target as HTMLAudioElement).currentTime)}
        onError={handleError}
      />
    </div>
  );
}

// ─── Poll card ──────────────────────────────────────────────────────────────────
function PopupPollCard({ poll, uid, isOwn, accentColor, onVote }: { poll: SSPoll; uid: string; isOwn: boolean; accentColor: string; onVote: (optionId: string) => void }) {
  const totalVotes = poll.options.reduce((n, o) => n + (o.votes?.length || 0), 0);
  return (
    <div className="rounded-xl p-3" style={{ minWidth: 200, maxWidth: '100%', background: isOwn ? accentColor : 'var(--muted, rgba(128,128,128,0.12))' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 className="h-3.5 w-3.5 shrink-0" style={{ color: isOwn ? '#fff' : accentColor }} />
        <p className="text-[13px] font-bold" style={{ color: isOwn ? '#fff' : 'var(--foreground)' }}>{poll.question}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {poll.options.map(o => {
          const count = o.votes?.length || 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const mine = (o.votes || []).includes(uid);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => !poll.closed && onVote(o.id)}
              className="relative overflow-hidden text-left px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: mine ? (isOwn ? '#fff' : accentColor) : isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(128,128,128,0.3)' }}
            >
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: isOwn ? 'rgba(255,255,255,0.18)' : `${accentColor}1f` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-[12px]" style={{ color: isOwn ? '#fff' : 'var(--foreground)', fontWeight: mine ? 700 : 500 }}>
                  {mine && <Check className="inline h-3 w-3 mr-1" style={{ color: isOwn ? '#fff' : accentColor }} />}{o.text}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--muted-foreground)' }}>{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--muted-foreground)' }}>
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}{poll.allowMultiple ? ' · multiple choice' : ''}{poll.closed ? ' · closed' : ''}
      </p>
    </div>
  );
}

// ─── Event card ─────────────────────────────────────────────────────────────────
function PopupEventCard({ event, uid, isOwn, accentColor, onRsvp }: { event: SSEvent; uid: string; isOwn: boolean; accentColor: string; onRsvp: (r: 'going' | 'maybe' | 'declined') => void }) {
  const mine: 'going' | 'maybe' | 'declined' | null =
    (event.going || []).includes(uid) ? 'going' : (event.maybe || []).includes(uid) ? 'maybe' : (event.declined || []).includes(uid) ? 'declined' : null;
  const start = new Date(event.startTime);
  return (
    <div className="rounded-xl overflow-hidden" style={{ minWidth: 200, maxWidth: '100%', background: isOwn ? accentColor : 'var(--muted, rgba(128,128,128,0.12))' }}>
      <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : `${accentColor}1f` }}>
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" style={{ color: isOwn ? '#fff' : accentColor }} />
        <p className="text-[13px] font-bold truncate" style={{ color: isOwn ? '#fff' : 'var(--foreground)' }}>{event.title}</p>
      </div>
      <div className="px-3 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)' }}>
          <Clock className="h-3 w-3 shrink-0" />
          {start.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)' }}>
            <MapPin className="h-3 w-3 shrink-0" />{event.location}
          </div>
        )}
        {event.description && <p className="text-[11px]" style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--muted-foreground)' }}>{event.description}</p>}
        <div className="flex items-center gap-1 mt-1.5">
          {(['going', 'maybe', 'declined'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onRsvp(r)}
              className="flex-1 h-6 rounded-md capitalize text-[10px] font-semibold transition-colors"
              style={{
                background: mine === r ? (isOwn ? '#fff' : accentColor) : isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(128,128,128,0.15)',
                color: mine === r ? (isOwn ? accentColor : '#fff') : isOwn ? '#fff' : 'var(--foreground)',
              }}
            >
              {r}{(event as any)[r]?.length ? ` · ${(event as any)[r].length}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Poll creation modal ─────────────────────────────────────────────────────────
function PopupPollModal({ accentColor, onClose, onCreate }: { accentColor: string; onClose: () => void; onCreate: (q: string, opts: string[], multi: boolean) => void }) {
  const [question, setQuestion] = React.useState('');
  const [opts, setOpts] = React.useState(['', '']);
  const [multi, setMulti] = React.useState(false);
  const valid = Boolean(question.trim()) && opts.filter(o => o.trim()).length >= 2;
  const inputClass = 'w-full h-9 rounded-lg px-3 text-sm border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/50';
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-10030 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-2xl" style={{ background: 'var(--popover)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: accentColor }} />
            <h2 className="font-bold text-[15px] text-popover-foreground">Create Poll</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question..." className={inputClass} />
          <div className="space-y-2">
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={o} onChange={e => setOpts(p => p.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`Option ${i + 1}`} className={inputClass} />
                {opts.length > 2 && (
                  <button onClick={() => setOpts(p => p.filter((_, idx) => idx !== i))} className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {opts.length < 6 && (
              <button onClick={() => setOpts(p => [...p, ''])} className="h-8 px-3 w-full rounded-lg flex items-center justify-center gap-1.5 text-[12px] font-medium border border-border text-muted-foreground hover:bg-muted/60">
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-[12px] text-muted-foreground">
            <input type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} /> Allow multiple answers
          </label>
          <button
            disabled={!valid}
            onClick={() => valid && onCreate(question.trim(), opts.map(o => o.trim()).filter(Boolean), multi)}
            className="w-full h-9 rounded-lg font-semibold text-white text-[13px] disabled:opacity-40"
            style={{ background: accentColor }}
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Event creation modal ────────────────────────────────────────────────────────
function PopupEventModal({ accentColor, onClose, onCreate }: {
  accentColor: string;
  onClose: () => void;
  onCreate: (e: { title: string; description: string; location: string; startTime: string; endTime: string }) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const valid = Boolean(title.trim()) && Boolean(startTime);
  const inputClass = 'w-full h-9 rounded-lg px-3 text-sm border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/50';
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-10030 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-2xl" style={{ background: 'var(--popover)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" style={{ color: accentColor }} />
            <h2 className="font-bold text-[15px] text-popover-foreground">Create Event</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className={inputClass} />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" className={inputClass} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className={cn(inputClass, 'h-auto py-2 resize-none')} />
          <div>
            <label className="text-[11px] text-muted-foreground">Starts</label>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className={cn(inputClass, 'mt-1')} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Ends (optional)</label>
            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className={cn(inputClass, 'mt-1')} />
          </div>
          <button
            disabled={!valid}
            onClick={() => valid && onCreate({ title: title.trim(), description, location, startTime, endTime })}
            className="w-full h-9 rounded-lg font-semibold text-white text-[13px] mt-1 disabled:opacity-40"
            style={{ background: accentColor }}
          >
            Create Event
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Invite people modal ─────────────────────────────────────────────────────────
function PopupInviteModal({ conv, crmToken, crmUserId, onClose, onInvited }: {
  conv: SSConv;
  crmToken: string | null;
  crmUserId: string | null;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [view, setView] = React.useState<'list' | 'invite'>('list');
  const [users, setUsers] = React.useState<{ _id: string; fullName: string; username?: string; avatar?: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const memberIds = React.useMemo(() => new Set(conv.members.map(m => m._id)), [conv.members]);
  const viewerIsAdmin = !!crmUserId && (conv.admins?.includes(crmUserId) || conv.createdBy === crmUserId);

  React.useEffect(() => {
    if (!crmToken || view !== 'invite') return;
    setLoading(true);
    apiClient.get('/api/supraspace/users', { headers: { Authorization: `Bearer ${crmToken}` } })
      .then(r => setUsers(r.data?.data || r.data || []))
      .catch(() => toast.error('Could not load teammates'))
      .finally(() => setLoading(false));
  }, [crmToken, view]);

  const filtered = users.filter(u =>
    !memberIds.has(u._id) &&
    (u.fullName.toLowerCase().includes(query.toLowerCase()) || (u.username || '').toLowerCase().includes(query.toLowerCase()))
  );

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const submit = async () => {
    if (selected.size === 0 || saving || !crmToken) return;
    setSaving(true);
    try {
      await apiClient.patch(`/api/supraspace/conversations/${conv._id}`, { addMembers: [...selected] },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      toast.success(`Invited ${selected.size} teammate${selected.size === 1 ? '' : 's'}`);
      onInvited();
      setSelected(new Set());
      setView('list');
    } catch {
      toast.error('Could not invite teammates');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!crmToken || removingId) return;
    setRemovingId(memberId);
    try {
      await apiClient.patch(`/api/supraspace/conversations/${conv._id}`, { removeMembers: [memberId] },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      onInvited();
    } catch {
      toast.error('Could not remove member');
    } finally {
      setRemovingId(null);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-10030 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border shadow-2xl" style={{ background: 'var(--popover)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            {view === 'invite' && (
              <button onClick={() => setView('list')} className="h-7 w-7 -ml-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="text-[14px] font-bold text-popover-foreground">
              {view === 'invite' ? `Invite to ${conv.name || 'channel'}` : `Members (${conv.members.length})`}
            </h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
        </div>

        {view === 'list' ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {conv.members.map(m => (
                <div key={m._id} className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    {m.avatar && <AvatarImage src={resolveImageUrl(m.avatar)} />}
                    <AvatarFallback className="text-[10px] font-semibold bg-blue-500 text-white">{initials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                    {m.displayNickname || m.fullName}{m._id === crmUserId && ' (you)'}
                  </span>
                  {conv.admins?.includes(m._id) && (
                    <span className="shrink-0 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-400">Admin</span>
                  )}
                  {viewerIsAdmin && m._id !== crmUserId && (
                    <button
                      onClick={() => removeMember(m._id)}
                      disabled={removingId === m._id}
                      title="Remove from channel"
                      className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                    >
                      {removingId === m._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <button onClick={() => setView('invite')}
                className="w-full h-9 rounded-lg font-semibold text-white text-[13px] flex items-center justify-center gap-2"
                style={{ background: '#3b82f6' }}>
                <UserPlus className="h-4 w-4" /> Invite people
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search teammates..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg text-[13px] outline-none border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-blue-500/50" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground">No one left to invite.</p>
              ) : filtered.map(u => {
                const isSelected = selected.has(u._id);
                return (
                  <button key={u._id} onClick={() => toggle(u._id)} className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-muted/50">
                    <Avatar className="h-8 w-8 shrink-0">
                      {u.avatar && <AvatarImage src={resolveImageUrl(u.avatar)} />}
                      <AvatarFallback className="text-[10px] font-semibold bg-blue-500 text-white">{initials(u.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{u.fullName}</span>
                    <span className={cn('flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2', isSelected ? 'border-blue-500 bg-blue-500' : 'border-border')}>
                      {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border p-3">
              <button disabled={selected.size === 0 || saving} onClick={submit}
                className="w-full h-9 rounded-lg font-semibold text-white text-[13px] flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: '#3b82f6' }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Invite{selected.size > 0 ? ` (${selected.size})` : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Channel settings — nickname, personal quick-reactions, theme color ───────
function PopupChannelSettingsModal({ conv, crmToken, crmUserId, initialTab, onClose, onSaved }: {
  conv: SSConv;
  crmToken: string | null;
  crmUserId: string | null;
  initialTab?: 'nickname' | 'reactions' | 'theme';
  onClose: () => void;
  onSaved: () => void;
}) {
  const me = conv.members.find(m => m._id === crmUserId);
  const [tab, setTab] = React.useState<'nickname' | 'reactions' | 'theme'>(initialTab || 'nickname');
  const [nickname, setNickname] = React.useState(me?.displayNickname || '');
  const [reactions, setReactions] = React.useState<string[]>(conv.viewerQuickReactions?.length ? conv.viewerQuickReactions : DEFAULT_QUICK_REACTIONS);
  const [accent, setAccent] = React.useState(conv.theme?.accent || '');
  const [likeEmoji, setLikeEmoji] = React.useState(conv.theme?.emoji || '');
  const [saving, setSaving] = React.useState(false);

  const toggleReaction = (emoji: string) => setReactions(prev => {
    if (prev.includes(emoji)) return prev.filter(e => e !== emoji);
    if (prev.length >= 8) { toast.error('Pick up to 8 quick reactions'); return prev; }
    return [...prev, emoji];
  });

  const save = async () => {
    if (!crmToken || saving) return;
    setSaving(true);
    try {
      await Promise.all([
        apiClient.patch(`/api/supraspace/conversations/${conv._id}/member-settings`,
          { nickname: nickname.trim() || null, quickReactions: reactions },
          { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh),
        apiClient.patch(`/api/supraspace/conversations/${conv._id}/theme`,
          { theme: { ...conv.theme, accent: accent || null, emoji: likeEmoji || null } },
          { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh),
      ]);
      toast.success('Channel settings saved');
      onSaved();
      onClose();
    } catch {
      toast.error('Could not save channel settings');
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;
  const tabBtn = (id: typeof tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className="flex-1 py-2 text-[12px] font-semibold text-center transition-colors"
      style={{
        color: tab === id ? 'var(--popover-foreground)' : 'var(--muted-foreground)',
        borderBottom: tab === id ? '2px solid #3b82f6' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-10030 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="flex max-h-[75vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border shadow-2xl" style={{ background: 'var(--popover)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[14px] font-bold text-popover-foreground">Channel settings</h3>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex border-b border-border">
          {tabBtn('nickname', 'Nickname')}
          {tabBtn('reactions', 'My Reactions')}
          {tabBtn('theme', 'Theme & Like')}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'nickname' && (
            <div>
              <p className="text-[12px] text-muted-foreground mb-2">Set a display name others will see for you in {conv.name || 'this channel'}.</p>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value.slice(0, 32))}
                placeholder="Your real name"
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-blue-500/50"
              />
            </div>
          )}
          {tab === 'reactions' && (
            <div>
              <p className="text-[12px] text-muted-foreground mb-2">Pick up to 8 emoji for your quick-react bar in this channel.</p>
              <div className="grid grid-cols-6 gap-1.5">
                {QUICK_REACTION_CHOICES.map(emoji => {
                  const active = reactions.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      className="h-10 rounded-lg text-xl flex items-center justify-center transition-colors"
                      style={{ background: active ? 'rgba(59,130,246,0.18)' : 'var(--muted, rgba(128,128,128,0.1))', outline: active ? '2px solid #3b82f6' : 'none' }}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {tab === 'theme' && (
            <div>
              <p className="text-[12px] text-muted-foreground mb-2">Accent color for this channel — applies to everyone.</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setAccent(color)}
                    className="h-8 w-8 rounded-full transition-transform"
                    style={{ background: color, outline: accent === color ? '2px solid var(--popover-foreground)' : 'none', outlineOffset: 2, transform: accent === color ? 'scale(1.1)' : undefined }}
                    title={color}
                  />
                ))}
                <label className="h-8 w-8 rounded-full flex items-center justify-center cursor-pointer border border-dashed border-border text-muted-foreground">
                  <input type="color" value={accent || '#5b7cf6'} onChange={e => setAccent(e.target.value)} className="sr-only" />
                  <Palette className="h-4 w-4" />
                </label>
                {accent && (
                  <button onClick={() => setAccent('')} className="h-8 px-2.5 rounded-full text-[11px] font-semibold text-muted-foreground hover:bg-muted/60">
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-4 mb-2">Default Like — sent when you tap the composer's Like button with nothing typed. Applies to everyone in this channel.</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REACTION_CHOICES.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setLikeEmoji(emoji)}
                    className="h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-colors"
                    style={{ background: likeEmoji === emoji ? 'rgba(59,130,246,0.18)' : 'var(--muted, rgba(128,128,128,0.1))', outline: likeEmoji === emoji ? '2px solid #3b82f6' : 'none' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <button disabled={saving} onClick={save}
            className="w-full h-9 rounded-lg font-semibold text-white text-[13px] flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: '#3b82f6' }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Single popup ─────────────────────────────────────────────────────────────
interface ChatPopupProps {
  conv: SSConv;
  stackIndex: number;
  baseOffsetPx: number;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

function ChatPopup({ conv, stackIndex, baseOffsetPx, isMinimized, onClose, onToggleMinimize }: ChatPopupProps) {
  const { crmUserId, crmToken, socket, markAsRead, notifPrefs, setNotifPrefs, archiveConversation, markConversationUnread, deleteConversation, refreshConversations } = useSupraSpaceMessenger();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const router = useRouter();
  const [messages, setMessages] = React.useState<SSMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState(false);
  const [input, setInput] = React.useState('');
  const inputTextRef = React.useRef('');
  const pastedPlainTextRef = React.useRef('');
  const [composerHasText, setComposerHasText] = React.useState(false);
  const [pasteMode, setPasteMode] = React.useState<PasteMode>('formatted');
  const pastePlainTextShortcutRef = React.useRef(false);
  const [sending, setSending] = React.useState(false);
  const [draggingAttachment, setDraggingAttachment] = React.useState(false);
  const [pendingAttachments, setPendingAttachments] = React.useState<PendingPopupAttachment[]>([]);
  const [replyTo, setReplyTo] = React.useState<SSMessage | null>(null);

  // GIF picker
  const [gifOpen, setGifOpen] = React.useState(false);
  const [pendingGif, setPendingGif] = React.useState<SSGif | null>(null);
  const gifRef = React.useRef<HTMLDivElement>(null);

  // "+" attach menu (file / poll / event)
  const [attachMenuOpen, setAttachMenuOpen] = React.useState(false);
  const [pollModalOpen, setPollModalOpen] = React.useState(false);
  const [eventModalOpen, setEventModalOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [channelSettingsTab, setChannelSettingsTab] = React.useState<'nickname' | 'reactions' | 'theme' | null>(null);
  const attachMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!attachMenuOpen) return;
    const h = (e: MouseEvent) => { if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setAttachMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [attachMenuOpen]);

  // Voice recording
  const [recording, setRecording] = React.useState(false);
  const [recPaused, setRecPaused] = React.useState(false);
  const [recSeconds, setRecSeconds] = React.useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recStreamRef = React.useRef<MediaStream | null>(null);
  const recChunksRef = React.useRef<Blob[]>([]);
  const recSecondsRef = React.useRef(0);
  const recTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const recCancelRef = React.useRef(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLDivElement>(null);
  const inputSelectionRangeRef = React.useRef<Range | null>(null);
  const [composerFontFamily, setComposerFontFamily] = React.useState<SS4FontFamilyId>(SS4_DEFAULT_FONT_FAMILY);
  const [composerFontFamilyChosen, setComposerFontFamilyChosen] = React.useState(false);
  const [composerFontSize, setComposerFontSize] = React.useState<SS4FontSize>(SS4_DEFAULT_FONT_SIZE);
  const [composerFontSizeChosen, setComposerFontSizeChosen] = React.useState(false);
  const [composerTextColor, setComposerTextColor] = React.useState('#ffffff');
  const [composerTextColorChosen, setComposerTextColorChosen] = React.useState(false);
  const [composerTypingFormats, setComposerTypingFormats] =
    React.useState<SS4InlineTypingPreferences>(
      createSS4InlineTypingPreferences,
    );
  const [composerActiveFormats, setComposerActiveFormats] =
    React.useState<Record<SS4InlineTypingFormat, boolean>>({
      bold: false,
      italic: false,
      underline: false,
      strike: false,
    });
  const headerRef = React.useRef<HTMLDivElement>(null);
  const popupShellRef = React.useRef<HTMLDivElement>(null);
  const dragDepthRef = React.useRef(0);
  const pendingAttachmentsRef = React.useRef<PendingPopupAttachment[]>([]);
  const draftStorageKey = React.useMemo(() => `supraspace-popup-draft:${conv._id}`, [conv._id]);

  // Chat settings dropdown
  const [chatSettingsOpen, setChatSettingsOpen] = React.useState(false);
  const [muteMenuOpen, setMuteMenuOpen] = React.useState(false);
  const settingsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { if (!chatSettingsOpen) setConfirmDelete(false); }, [chatSettingsOpen]);

  React.useEffect(() => {
    if (!chatSettingsOpen) return;
    const h = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node) &&
        !headerRef.current?.contains(e.target as Node)) {
        setChatSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [chatSettingsOpen]);

  // @mention
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState<number>(-1);
  const [mentionIdx, setMentionIdx] = React.useState(0);

  const syncComposerText = React.useCallback((value: string, commitToState = false) => {
    inputTextRef.current = value;
    const hasText = Boolean(value.trim());
    setComposerHasText(prev => prev === hasText ? prev : hasText);
    if (commitToState) setInput(value);
  }, []);

  React.useEffect(() => {
    inputTextRef.current = input;
    setComposerHasText(Boolean(input.trim()));
  }, [input]);

  React.useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftStorageKey) || '';
      if (!savedDraft) return;
      syncComposerText(savedDraft, true);
      requestAnimationFrame(() => {
        if (inputRef.current) inputRef.current.innerHTML = markdownTextToEditorHtml(savedDraft);
      });
    } catch {
      // Draft restore is best-effort only.
    }
  }, [draftStorageKey, syncComposerText]);

  React.useEffect(() => {
    try {
      if (input.trim()) localStorage.setItem(draftStorageKey, input);
      else localStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore storage failures in private browsing or constrained PWA contexts.
    }
  }, [draftStorageKey, input]);

  // Hover action bar (portal-based to escape overflow)
  const [hovMsg, setHovMsg] = React.useState<string | null>(null);
  const [barPos, setBarPos] = React.useState<{ top: number; left: number; isOwn: boolean } | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverBar = React.useRef(false);
  const actionHoverLockRef = React.useRef(false);

  // 3-dot more-actions dropdown
  const [moreMenuMsgId, setMoreMenuMsgId] = React.useState<string | null>(null);
  const [moreMenuPos, setMoreMenuPos] = React.useState<{ top: number; left: number } | null>(null);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);
  const moreMenuMsgIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!moreMenuMsgId) return;
    const h = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        moreMenuMsgIdRef.current = null;
        setMoreMenuMsgId(null); setMoreMenuPos(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreMenuMsgId]);

  // Pinned messages (local UI state, same as SupraSpace)
  const [pinnedMsgIds, setPinnedMsgIds] = React.useState<Set<string>>(new Set());
  const [pinnedOpen, setPinnedOpen] = React.useState(false);

  // Forward modal
  const [forwardMsg, setForwardMsg] = React.useState<SSMessage | null>(null);

  // Quick-react popup (the 6-emoji row that appears when ☺ is clicked in the action bar)
  const [quickReactMsgId, setQuickReactMsgId] = React.useState<string | null>(null);
  const [quickReactPos, setQuickReactPos] = React.useState<{ top: number; left: number } | null>(null);
  const quickReactRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!quickReactMsgId) return;
    const h = (e: MouseEvent) => {
      if (quickReactRef.current && !quickReactRef.current.contains(e.target as Node)) {
        setQuickReactMsgId(null);
        setQuickReactPos(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [quickReactMsgId]);

  // File input for attachment
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Full emoji picker
  const [emojiPickerMsg, setEmojiPickerMsg] = React.useState<string | null>(null);
  const [emojiPickerPos, setEmojiPickerPos] = React.useState<{
    top: number;
    left?: number;
    right?: number;
    boundary?: { top: number; right: number; bottom: number; left: number };
  } | null>(null);
  const [mediaPreview, setMediaPreview] = React.useState<{ src: string; name: string; type?: 'image' | 'video' } | null>(null);
  const [attachmentsCollapsed, setAttachmentsCollapsed] = React.useState(false);
  const [mediaPreviewZoom, setMediaPreviewZoom] = React.useState(1);

  // Reaction tooltip
  const [whoReactedPop, setWhoReactedPop] = React.useState<{ id: string; emoji: string; names: string[]; top: number; left?: number; right?: number } | null>(null);

  React.useEffect(() => {
    setMediaPreviewZoom(1);
  }, [mediaPreview?.src]);

  React.useEffect(() => {
    if (!mediaPreview) return;
    const handlePreviewKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMediaPreview(null);
    };
    document.addEventListener('keydown', handlePreviewKeydown);
    return () => document.removeEventListener('keydown', handlePreviewKeydown);
  }, [mediaPreview]);

  const applyMediaPreviewZoom = React.useCallback((nextZoom: number) => {
    setMediaPreviewZoom(clampPreviewZoom(nextZoom));
  }, []);

  // ── Hover handlers ──
  const pendingMsgRef = React.useRef<{ id: string; top: number; left: number; isOwn: boolean } | null>(null);

  const handleMsgEnter = (e: React.MouseEvent<HTMLDivElement>, msgId: string, isOwn: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    isOverBar.current = false;
    const bubbleEl =
      (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-popup-bubble-id]')
      || (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.rounded-2xl');
    const rect = (bubbleEl ?? e.currentTarget).getBoundingClientRect();
    const popupRect = (e.currentTarget.closest('[data-chat-popup-shell="true"]') as HTMLElement | null)?.getBoundingClientRect();
    const BAR_W = 92;
    const BAR_H = 32;
    const PAD = 6;
    const minLeft = (popupRect?.left ?? 0) + PAD;
    const maxLeft = Math.max(minLeft, (popupRect?.right ?? window.innerWidth) - BAR_W - PAD);
    const minTop = (popupRect?.top ?? 0) + HEADER_H + PAD;
    const maxTop = Math.max(minTop, (popupRect?.bottom ?? window.innerHeight) - BAR_H - PAD);
    const preferredLeft = isOwn ? rect.left - BAR_W - 6 : rect.right + 6;
    const fitsBeside = preferredLeft >= minLeft && preferredLeft <= maxLeft;
    let barTop: number;
    let barLeft: number;
    if (fitsBeside) {
      barTop = Math.max(minTop, Math.min(rect.top + rect.height / 2 - BAR_H / 2, maxTop));
      barLeft = preferredLeft;
    } else {
      // Wide bubble (long text, poll/event/voice card, image) with no room to
      // the side — float the bar just above the bubble instead of falling
      // back to a spot that sits on top of the bubble's own content.
      barTop = Math.max(minTop, rect.top - BAR_H - 6);
      barLeft = Math.max(minLeft, Math.min(rect.left + rect.width / 2 - BAR_W / 2, maxLeft));
    }
    const pos = { top: barTop, left: barLeft, isOwn };
    if (hovMsg && hovMsg !== msgId) {
      // Bar is already visible for another message — delay switch so user can
      // reach the current bar without it jumping away from them.
      pendingMsgRef.current = { id: msgId, ...pos };
      hoverTimer.current = setTimeout(() => {
        if (!isOverBar.current && pendingMsgRef.current?.id === msgId) {
          setHovMsg(msgId);
          setBarPos(pos);
          pendingMsgRef.current = null;
        }
      }, 280);
    } else {
      pendingMsgRef.current = null;
      setHovMsg(msgId);
      setBarPos(pos);
    }
  };
  const cancelHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };
  const handleMsgLeave = () => {
    cancelHoverTimer();
    hoverTimer.current = setTimeout(() => {
      if (
        !isOverBar.current
        && !actionHoverLockRef.current
        && !moreMenuMsgIdRef.current
      ) {
        setHovMsg(null);
        setBarPos(null);
      }
    }, 360);
  };
  const handleBarEnter = () => {
    isOverBar.current = true;
    actionHoverLockRef.current = true;
    pendingMsgRef.current = null;
    cancelHoverTimer();
  };
  const handleBarLeave = () => {
    isOverBar.current = false;
    actionHoverLockRef.current = false;
    cancelHoverTimer();
    hoverTimer.current = setTimeout(() => {
      if (
        !isOverBar.current
        && !actionHoverLockRef.current
        && !moreMenuMsgIdRef.current
      ) {
        setHovMsg(null);
        setBarPos(null);
      }
    }, 280);
  };
  const clearBar = () => {
    setHovMsg(null); setBarPos(null);
    moreMenuMsgIdRef.current = null;
    setMoreMenuMsgId(null); setMoreMenuPos(null);
    setQuickReactMsgId(null); setQuickReactPos(null);
  };

  // ── Actions ──
  const handleReact = async (messageId: string, emoji: string) => {
    clearBar();
    try {
      await apiClient.post(`/api/supraspace/messages/${messageId}/react`, { emoji },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
    } catch { /* best-effort */ }
  };

  const handleDelete = async (msgId: string) => {
    clearBar();
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, content: '', attachments: [] } : m));
    try {
      await apiClient.delete(`/api/supraspace/messages/${msgId}`,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
    } catch {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: false } : m));
    }
  };

  const handleReply = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (msg) setReplyTo(msg);
    clearBar();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const jumpToPopupRepliedMessage = React.useCallback((replyTo: SSMessage['replyTo']) => {
    const targetId =
      typeof replyTo === 'string'
        ? replyTo
        : replyTo?._id;

    if (!targetId) return;

    const target = document.querySelector<HTMLElement>(`[data-popup-bubble-id="${targetId}"]`);
    if (!target) {
      toast.info('Original message is not loaded yet. Scroll up to load older messages.');
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.animate(
      [
        { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)', transform: 'scale(1)' },
        { boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.55), 0 0 24px rgba(59, 130, 246, 0.32)', transform: 'scale(1.015)' },
        { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)', transform: 'scale(1)' },
      ],
      { duration: 1400, easing: 'ease' },
    );
  }, []);

  const stageFiles = React.useCallback((files: FileList | File[] | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    setPendingAttachments(prev => [
      ...prev,
      ...selected.map(file => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    setDraggingAttachment(false);
    dragDepthRef.current = 0;
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  const removePendingAttachment = React.useCallback((index: number) => {
    setPendingAttachments(prev => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAllPendingAttachments = React.useCallback(() => {
    setPendingAttachments(prev => {
      prev.forEach(item => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, []);

  React.useEffect(() => { pendingAttachmentsRef.current = pendingAttachments; }, [pendingAttachments]);
  React.useEffect(() => { if (pendingAttachments.length === 0) setAttachmentsCollapsed(false); }, [pendingAttachments.length]);
  React.useEffect(() => () => {
    pendingAttachmentsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const sendPendingAttachments = React.useCallback(async (caption: string) => {
    if (!pendingAttachments.length || !crmToken || sending) return false;
    setSending(true);
    try {
      const fd = new FormData();
      pendingAttachments.forEach(item => fd.append('files', item.file));
      if (replyTo?._id) fd.append('replyTo', replyTo._id);
      if (caption.trim()) fd.append('content', caption.trim());
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/upload`, fd, {
        headers: { Authorization: `Bearer ${crmToken}`, 'Content-Type': 'multipart/form-data' },
      });
      const sent: SSMessage = r.data?.data;
      if (sent) {
        setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
        setReplyTo(null);
        setPendingAttachments(prev => {
          prev.forEach(item => URL.revokeObjectURL(item.previewUrl));
          return [];
        });
        syncComposerText('', true);
        try { localStorage.removeItem(draftStorageKey); } catch { }
        if (inputRef.current) inputRef.current.innerHTML = '';
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      }
      return true;
    } catch {
      toast.error('Could not upload attachment.');
      return false;
    } finally {
      setSending(false);
      setDraggingAttachment(false);
      dragDepthRef.current = 0;
    }
  }, [conv._id, crmToken, draftStorageKey, pendingAttachments, replyTo?._id, sending, syncComposerText]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDraggingAttachment(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDraggingAttachment(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDraggingAttachment(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.files?.length) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setDraggingAttachment(false);
    stageFiles(e.dataTransfer.files);
  };

  const handleSendThumbsUp = async () => {
    if (sending || !crmToken) return;
    setSending(true);
    try {
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/messages`,
        { content: conv.theme?.emoji || '👍' },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
    } catch { /* ignored */ } finally { setSending(false); }
  };

  // ── GIF ──
  const selectGif = React.useCallback((gif: SSGif) => {
    setPendingGif(gif);
    setGifOpen(false);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  const sendPendingGif = React.useCallback(async (caption: string) => {
    if (!pendingGif || !crmToken || sending) return false;
    setSending(true);
    const gif = pendingGif;
    try {
      const body: { content: string; gif: SSGif; replyTo?: string } = { content: caption.trim(), gif };
      if (replyTo?._id) body.replyTo = replyTo._id;
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/messages`, body,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      const sent: SSMessage = r.data?.data;
      if (sent) {
        setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
        setReplyTo(null);
        setPendingGif(null);
        syncComposerText('', true);
        try { localStorage.removeItem(draftStorageKey); } catch { }
        if (inputRef.current) inputRef.current.innerHTML = '';
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      }
      return true;
    } catch {
      toast.error('Could not send GIF.');
      return false;
    } finally { setSending(false); }
  }, [conv._id, crmToken, draftStorageKey, pendingGif, replyTo?._id, sending, syncComposerText]);

  // ── Voice recording ──
  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      recCancelRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        recStreamRef.current?.getTracks().forEach(t => t.stop());
        if (recCancelRef.current) return;
        const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
        const seconds = recSecondsRef.current;
        if (blob.size > 0 && crmToken) {
          const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          const fd = new FormData();
          fd.append('files', file);
          fd.append('duration', String(seconds));
          try {
            const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/upload`, fd,
              { headers: { Authorization: `Bearer ${crmToken}`, 'Content-Type': 'multipart/form-data' } });
            const sent: SSMessage = r.data?.data;
            if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
          } catch {
            toast.error('Failed to send voice note.');
          }
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecPaused(false);
      setRecSeconds(0);
      recSecondsRef.current = 0;
      recTimerRef.current = setInterval(() => { recSecondsRef.current += 1; setRecSeconds(recSecondsRef.current); }, 1000);
    } catch {
      toast.error('Microphone permission denied.');
    }
  }, [conv._id, crmToken]);

  const togglePauseRecording = React.useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      setRecPaused(true);
    } else if (mr.state === 'paused') {
      mr.resume();
      recTimerRef.current = setInterval(() => { recSecondsRef.current += 1; setRecSeconds(recSecondsRef.current); }, 1000);
      setRecPaused(false);
    }
  }, []);

  const stopRecording = React.useCallback((cancel = false) => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recCancelRef.current = cancel;
    if (cancel) recChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      recStreamRef.current?.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    setRecPaused(false);
  }, []);

  React.useEffect(() => () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── Poll / Event ──
  const applyPollVote = React.useCallback((messageId: string, poll: SSPoll) => {
    setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, poll } : m)));
  }, []);

  const handleVotePoll = React.useCallback(async (messageId: string, optionId: string) => {
    if (!crmToken || !crmUserId) return;
    const target = messages.find(m => m._id === messageId);
    const prevPoll = target?.poll;
    if (!prevPoll) return;

    // Optimistic toggle — mirrors the backend's toggle semantics exactly, so
    // the click registers instantly instead of waiting on a socket round-trip.
    const optimisticPoll: SSPoll = {
      ...prevPoll,
      options: prevPoll.options.map(o => {
        const hasVoted = o.votes.includes(crmUserId);
        if (o.id === optionId) {
          return { ...o, votes: hasVoted ? o.votes.filter(v => v !== crmUserId) : [...o.votes, crmUserId] };
        }
        if (!prevPoll.allowMultiple) {
          return { ...o, votes: o.votes.filter(v => v !== crmUserId) };
        }
        return o;
      }),
    };
    applyPollVote(messageId, optimisticPoll);

    try {
      const r = await apiClient.post(`/api/supraspace/messages/${messageId}/poll/vote`, { optionId },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      const confirmedPoll: SSPoll | undefined = r.data?.data?.poll;
      if (confirmedPoll) applyPollVote(messageId, confirmedPoll);
    } catch {
      applyPollVote(messageId, prevPoll);
      toast.error('Could not record your vote.');
    }
  }, [crmToken, crmUserId, messages, applyPollVote]);

  const handleRsvpEvent = React.useCallback(async (messageId: string, response: 'going' | 'maybe' | 'declined') => {
    if (!crmToken) return;
    try {
      await apiClient.post(`/api/supraspace/messages/${messageId}/event/rsvp`, { response },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
    } catch {
      toast.error('Could not update your RSVP.');
    }
  }, [crmToken]);

  const handleCreatePoll = React.useCallback(async (question: string, opts: string[], multi: boolean) => {
    if (!crmToken) return;
    try {
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/poll`,
        { question, options: opts, allowMultiple: multi },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
      setPollModalOpen(false);
    } catch {
      toast.error('Could not create poll.');
    }
  }, [conv._id, crmToken]);

  const handleCreateEvent = React.useCallback(async (e: { title: string; description: string; location: string; startTime: string; endTime: string }) => {
    if (!crmToken) return;
    try {
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/event`,
        { title: e.title, description: e.description, location: e.location, startTime: e.startTime, endTime: e.endTime || undefined },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
      setEventModalOpen(false);
    } catch {
      toast.error('Could not create event.');
    }
  }, [conv._id, crmToken]);

  // ── Edit message ──
  const [editingMsgId, setEditingMsgId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);
  const [editWidth, setEditWidth] = React.useState<number | null>(null);
  const editAreaRef = React.useRef<HTMLDivElement>(null);
  const editSelectionRangeRef = React.useRef<Range | null>(null);
  const editFileRef = React.useRef<HTMLInputElement>(null);
  const [editReplacementFiles, setEditReplacementFiles] = React.useState<PendingPopupAttachment[]>([]);
  const [editColorOpen, setEditColorOpen] = React.useState(false);
  const [editTextColor, setEditTextColor] = React.useState('#ffffff');
  const [editTextColorChosen, setEditTextColorChosen] = React.useState(false);
  const [editFontFamily, setEditFontFamily] = React.useState<SS4FontFamilyId>(SS4_DEFAULT_FONT_FAMILY);
  const [editFontFamilyChosen, setEditFontFamilyChosen] = React.useState(false);
  const [editFontSize, setEditFontSize] = React.useState<SS4FontSize>(SS4_DEFAULT_FONT_SIZE);
  const [editFontSizeChosen, setEditFontSizeChosen] = React.useState(false);
  const [editPasteMode, setEditPasteMode] = React.useState<PasteMode>('formatted');
  const editPastePlainTextShortcutRef = React.useRef(false);
  const [editPalette, setEditPalette] = React.useState(TEXT_COLORS);
  const [editActiveFormats, setEditActiveFormats] = React.useState<PopupEditFormatState>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    list: false,
    numbered: false,
    quote: false,
    code: false,
  });
  const [editTypingFormats, setEditTypingFormats] =
    React.useState<SS4InlineTypingPreferences>(
      createSS4InlineTypingPreferences,
    );

  const startEdit = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (!msg) return;
    const bubble = document.querySelector<HTMLElement>(`[data-popup-bubble-id="${msgId}"]`);
    const popupBody = bubble?.closest<HTMLElement>('[data-popup-chat-body="true"]');
    const width = bubble?.getBoundingClientRect().width || 0;
    const maxResponsiveWidth = Math.max(280, Math.min(348, (popupBody?.getBoundingClientRect().width || POPUP_W) - 28));
    setEditWidth(Math.min(Math.max(width, 300), maxResponsiveWidth));
    setEditDraft(msg.content || '');
    setEditTextColor('#ffffff');
    setEditTextColorChosen(false);
    setEditFontFamily(SS4_DEFAULT_FONT_FAMILY);
    setEditFontFamilyChosen(false);
    setEditFontSize(SS4_DEFAULT_FONT_SIZE);
    setEditFontSizeChosen(false);
    setEditTypingFormats(createSS4InlineTypingPreferences());
    setEditReplacementFiles(prev => {
      prev.forEach(item => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    if (editFileRef.current) editFileRef.current.value = '';
    setEditingMsgId(msgId);
    clearBar();
    requestAnimationFrame(() => {
      if (!editAreaRef.current) return;
      editAreaRef.current.innerHTML = markdownTextToEditorHtml(msg.content || '');
      editAreaRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editAreaRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editSelectionRangeRef.current = range.cloneRange();
      refreshPopupEditFormats();
    });
  };

  const syncEditDraft = React.useCallback(() => {
    const next = editAreaRef.current ? canonicalizeColorMarkup(htmlToMarkdown(editAreaRef.current)).trim() : editDraft.trim();
    setEditDraft(next);
    return next;
  }, [editDraft]);

  const rememberEditSelection = React.useCallback(() => {
    const root = editAreaRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    editSelectionRangeRef.current = range.cloneRange();
  }, []);

  const restoreEditSelection = React.useCallback(() => {
    const root = editAreaRef.current;
    if (!root) return;
    root.focus();

    const selection = window.getSelection();
    if (!selection) return;
    const savedRange = editSelectionRangeRef.current;
    if (
      savedRange
      && root.contains(savedRange.startContainer)
      && root.contains(savedRange.endContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return;
    }

    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(root);
    fallbackRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallbackRange);
    editSelectionRangeRef.current = fallbackRange.cloneRange();
  }, []);

  const refreshPopupEditFormats = React.useCallback(() => {
    try {
      const root = editAreaRef.current;
      const selection = window.getSelection();
      if (
        !root
        || !selection?.anchorNode
        || !root.contains(selection.anchorNode)
      ) {
        return;
      }

      const caret = getRichEditorCaretFormattingSnapshot(root);
      if (!caret) return;

      const blockValue = String(
        document.queryCommandValue('formatBlock') || '',
      )
        .toLowerCase()
        .replace(/[<>]/g, '');
      const fontValue = String(
        document.queryCommandValue('fontName') || '',
      ).toLowerCase();

      setEditActiveFormats({
        bold: caret.bold,
        italic: caret.italic,
        underline: caret.underline,
        strike: caret.strike,
        list: document.queryCommandState('insertUnorderedList'),
        numbered: document.queryCommandState('insertOrderedList'),
        quote: blockValue.includes('blockquote'),
        code: /(monospace|courier|consolas|menlo|monaco)/i.test(fontValue),
      });

      setEditFontFamily(caret.fontFamily);
      setEditFontSize(caret.fontSize);
      setEditTextColor(caret.color);

      const rootStyle = window.getComputedStyle(root);
      const rootFamily =
        ss4FontFamilyIdFromCss(rootStyle.fontFamily)
        || SS4_DEFAULT_FONT_FAMILY;
      const rootSize =
        ss4FontSizeFromCss(rootStyle.fontSize)
        || SS4_DEFAULT_FONT_SIZE;
      const rootColor =
        cssColorToHex(rootStyle.color)
        || '#ffffff';

      setEditFontFamilyChosen(
        caret.fontFamilyExplicit || caret.fontFamily !== rootFamily,
      );
      setEditFontSizeChosen(
        caret.fontSizeExplicit || caret.fontSize !== rootSize,
      );
      setEditTextColorChosen(
        caret.colorExplicit || caret.color !== rootColor,
      );

      setEditTypingFormats(
        ss4TypingPreferencesFromCaretSnapshot(caret),
      );
    } catch {
      // Formatting-state detection is best effort.
    }
  }, []);

  React.useEffect(() => {
    if (!editingMsgId) return;

    const handlePopupEditSelectionChange = () => {
      const root = editAreaRef.current;
      const selection = window.getSelection();
      if (
        root
        && selection?.anchorNode
        && root.contains(selection.anchorNode)
      ) {
        refreshPopupEditFormats();
      }
    };

    document.addEventListener(
      'selectionchange',
      handlePopupEditSelectionChange,
    );
    return () => {
      document.removeEventListener(
        'selectionchange',
        handlePopupEditSelectionChange,
      );
    };
  }, [editingMsgId, refreshPopupEditFormats]);

  const popupEditButtonClass = React.useCallback((active: boolean) => cn(
    'h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/10',
    active && 'bg-white/20 ring-1 ring-white/30',
  ), []);

  const applyEditCommand = React.useCallback((
    command: string,
    value?: string,
  ) => {
    const root = editAreaRef.current;
    if (!root) return;

    const inlineFormat: SS4InlineTypingFormat | null =
      command === 'bold'
        ? 'bold'
        : command === 'italic'
          ? 'italic'
          : command === 'underline'
            ? 'underline'
            : command === 'strikeThrough'
              ? 'strike'
              : null;
    const range = getRichEditorSelectionRange(
      root,
      editSelectionRangeRef.current,
    );

    if (inlineFormat && range.collapsed) {
      root.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const caretBefore = getRichEditorCaretFormattingSnapshot(root);
      const currentValue = caretBefore
        ? caretBefore[inlineFormat]
        : document.queryCommandState(command);
      const nextValue = !currentValue;
      const nextTypingFormats = {
        ...ss4TypingPreferencesFromCaretSnapshot(caretBefore),
        [inlineFormat]: nextValue,
      };

      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false);

      insertTypingStyleCaretMarker(
        root,
        caretBefore?.fontFamilyExplicit ? caretBefore.fontFamily : null,
        caretBefore?.fontSizeExplicit ? caretBefore.fontSize : null,
        nextTypingFormats,
        caretBefore?.colorExplicit ? caretBefore.color : null,
      );

      const liveSelection = window.getSelection();
      editSelectionRangeRef.current = liveSelection?.rangeCount
        ? liveSelection.getRangeAt(0).cloneRange()
        : range.cloneRange();

      setEditTypingFormats(nextTypingFormats);
      setEditActiveFormats(previous => ({
        ...previous,
        [inlineFormat]: nextValue,
      }));
      requestAnimationFrame(refreshPopupEditFormats);
      return;
    }

    root.focus();
    const nextRange = executeRichEditorCommandPreservingSelection(
      root,
      range,
      () => {
        if (command === 'formatBlock' && value === 'blockquote') {
          const blockValue = String(
            document.queryCommandValue('formatBlock') || '',
          )
            .toLowerCase()
            .replace(/[<>]/g, '');
          document.execCommand(
            'formatBlock',
            false,
            blockValue.includes('blockquote') ? 'div' : 'blockquote',
          );
        } else if (command === 'fontName' && value === 'monospace') {
          document.execCommand('styleWithCSS', false, 'true');
          const fontValue = String(
            document.queryCommandValue('fontName') || '',
          ).toLowerCase();
          const isCodeActive =
            /(monospace|courier|consolas|menlo|monaco)/i.test(
              fontValue,
            );
          document.execCommand(
            'fontName',
            false,
            isCodeActive ? 'Geist' : 'monospace',
          );
        } else {
          document.execCommand(command, false, value);
        }
      },
    );

    if (nextRange) editSelectionRangeRef.current = nextRange;

    if (inlineFormat) {
      const nextValue = document.queryCommandState(command);
      setEditTypingFormats(previous => ({
        ...previous,
        [inlineFormat]: nextValue,
      }));
      setEditActiveFormats(previous => ({
        ...previous,
        [inlineFormat]: nextValue,
      }));
    }

    syncEditDraft();
    requestAnimationFrame(refreshPopupEditFormats);
  }, [
    editTypingFormats,
    refreshPopupEditFormats,
    syncEditDraft,
  ]);

  const applyEditColor = React.useCallback((color: string) => {
    const root = editAreaRef.current;
    if (!root) return;

    const range = getRichEditorSelectionRange(
      root,
      editSelectionRangeRef.current,
    );
    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    if (!range.collapsed) {
      const nextRange = executeRichEditorCommandPreservingSelection(
        root,
        range,
        () => applyTextColorToRichEditorSelection(root, color),
      );
      if (nextRange) editSelectionRangeRef.current = nextRange;
      syncEditDraft();
      setEditTextColor(color);
      setEditTextColorChosen(true);
      requestAnimationFrame(refreshPopupEditFormats);
      return;
    }

    const caretBefore = getRichEditorCaretFormattingSnapshot(root);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);

    insertTypingStyleCaretMarker(
      root,
      caretBefore?.fontFamilyExplicit ? caretBefore.fontFamily : null,
      caretBefore?.fontSizeExplicit ? caretBefore.fontSize : null,
      ss4TypingPreferencesFromCaretSnapshot(caretBefore),
      color,
    );

    editSelectionRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : range.cloneRange();

    setEditTextColor(color);
    setEditTextColorChosen(true);
    requestAnimationFrame(refreshPopupEditFormats);
  }, [refreshPopupEditFormats, syncEditDraft]);

  const applyEditFontFamily = React.useCallback((fontFamily: SS4FontFamilyId) => {
    setEditFontFamilyChosen(true);
    setEditFontFamily(fontFamily);

    const root = editAreaRef.current;
    if (!root) return;
    const range = getRichEditorSelectionRange(
      root,
      editSelectionRangeRef.current,
    );

    if (!range.collapsed) {
      const nextRange = executeRichEditorCommandPreservingSelection(
        root,
        range,
        () => {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand(
            'fontName',
            false,
            ss4FontFamilyCss(fontFamily),
          );
        },
      );
      if (nextRange) editSelectionRangeRef.current = nextRange;
      syncEditDraft();
      requestAnimationFrame(refreshPopupEditFormats);
      return;
    }

    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const caretBefore = getRichEditorCaretFormattingSnapshot(root);

    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(
      'fontName',
      false,
      ss4FontFamilyCss(fontFamily),
    );

    insertTypingStyleCaretMarker(
      root,
      fontFamily,
      caretBefore?.fontSizeExplicit ? caretBefore.fontSize : null,
      ss4TypingPreferencesFromCaretSnapshot(caretBefore),
      caretBefore?.colorExplicit ? caretBefore.color : null,
    );

    editSelectionRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : range.cloneRange();

    // The selected name must update before the user types.
    setEditFontFamily(fontFamily);
    setEditFontFamilyChosen(true);
    requestAnimationFrame(refreshPopupEditFormats);
  }, [refreshPopupEditFormats, syncEditDraft]);

  const applyEditFontSize = React.useCallback((fontSize: SS4FontSize) => {
    setEditFontSizeChosen(true);
    setEditFontSize(fontSize);

    const root = editAreaRef.current;
    if (!root) return;
    const range = getRichEditorSelectionRange(
      root,
      editSelectionRangeRef.current,
    );

    if (!range.collapsed) {
      const nextRange = executeRichEditorCommandPreservingSelection(
        root,
        range,
        () => {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('fontSize', false, '7');
          normalizeRichEditorFontSizeElements(root, fontSize);
        },
      );
      if (nextRange) editSelectionRangeRef.current = nextRange;
      syncEditDraft();
      requestAnimationFrame(refreshPopupEditFormats);
      return;
    }

    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const caretBefore = getRichEditorCaretFormattingSnapshot(root);

    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontSize', false, '7');

    insertTypingStyleCaretMarker(
      root,
      caretBefore?.fontFamilyExplicit ? caretBefore.fontFamily : null,
      fontSize,
      ss4TypingPreferencesFromCaretSnapshot(caretBefore),
      caretBefore?.colorExplicit ? caretBefore.color : null,
    );

    editSelectionRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : range.cloneRange();

    setEditFontSize(fontSize);
    setEditFontSizeChosen(true);
    requestAnimationFrame(refreshPopupEditFormats);
  }, [refreshPopupEditFormats, syncEditDraft]);

  const handleEditTypographyBeforeInput = React.useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const inserted = insertPreselectedTypographyText(
      event,
      editFontFamilyChosen ? editFontFamily : null,
      editFontSizeChosen ? editFontSize : null,
      editTypingFormats,
      editTextColorChosen ? editTextColor : null,
    );
    if (!inserted) return;
    requestAnimationFrame(() => {
      syncEditDraft();
      rememberEditSelection();
      refreshPopupEditFormats();
    });
  }, [
    editFontFamily,
    editFontFamilyChosen,
    editFontSize,
    editFontSizeChosen,
    editTextColor,
    editTextColorChosen,
    editTypingFormats,
    refreshPopupEditFormats,
    rememberEditSelection,
    syncEditDraft,
  ]);

  const chooseExpandedEditColor = React.useCallback((color: string) => {
    setEditPalette(prev => {
      if (prev.includes(color)) return prev;
      const replaceIndex = prev.includes(editTextColor) ? prev.indexOf(editTextColor) : prev.length - 1;
      const next = [...prev];
      next[replaceIndex] = color;
      return next;
    });
    applyEditColor(color);
    setEditColorOpen(false);
  }, [applyEditColor, editTextColor]);

  const handleEditColorBeforeInput = handleEditTypographyBeforeInput;

  const cancelEdit = React.useCallback(() => {
    editSelectionRangeRef.current = null;
    setEditingMsgId(null);
    setEditWidth(null);
    setEditColorOpen(false);
    setEditReplacementFiles(prev => {
      prev.forEach(item => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    if (editFileRef.current) editFileRef.current.value = '';
  }, []);

  const saveEdit = async () => {
    if (!editingMsgId || !crmToken) return;
    const originalMsg = messages.find(m => m._id === editingMsgId);
    const original = originalMsg?.content || '';
    const editableAttachmentCount = (originalMsg?.attachments || []).filter((a: SSAttachment) => !a.mimeType?.startsWith('audio/')).length;
    const nextDraft = syncEditDraft();
    if (!nextDraft && editableAttachmentCount === 0 && editReplacementFiles.length === 0) return;
    if (nextDraft === original.trim() && editReplacementFiles.length === 0) { cancelEdit(); return; }
    setEditSaving(true);
    try {
      if (editReplacementFiles.length > 0) {
        const fd = new FormData();
        fd.append('content', nextDraft);
        editReplacementFiles.forEach(item => fd.append('files', item.file));
        const r = await apiClient.patch(`/api/supraspace/messages/${editingMsgId}/attachments`, fd,
          { headers: { Authorization: `Bearer ${crmToken}`, 'Content-Type': 'multipart/form-data' }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
        const updated = r.data?.data;
        setMessages(prev => prev.map(m => m._id === editingMsgId ? {
          ...m,
          content: updated?.content ?? nextDraft,
          attachments: updated?.attachments ?? m.attachments ?? [],
          type: updated?.type ?? m.type,
          isEdited: true,
        } : m));
      } else {
        await apiClient.patch(`/api/supraspace/messages/${editingMsgId}`, { content: nextDraft },
          { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
        setMessages(prev => prev.map(m => m._id === editingMsgId ? { ...m, content: nextDraft, isEdited: true } : m));
      }
      cancelEdit();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Could not update message. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const openEmojiPickerForMsg = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popup = popupShellRef.current?.getBoundingClientRect();
    const pickerW = 288;
    const boundaryLeft = popup?.left ?? 0;
    const boundaryRight = popup?.right ?? window.innerWidth;
    const idealLeft = btn.left + btn.width / 2 - pickerW / 2;
    const left = Math.max(boundaryLeft + 8, Math.min(idealLeft, boundaryRight - pickerW - 8));
    setEmojiPickerMsg(msgId);
    setEmojiPickerPos({
      top: btn.top - 350,
      left,
      ...(popup ? {
        boundary: {
          top: popup.top,
          right: popup.right,
          bottom: popup.bottom,
          left: popup.left,
        },
      } : {}),
    });
    clearBar();
  };

  // ── Seen avatars — supplement stale conv.members with fresh sender data from messages ──
  const msgSeenByMembers = React.useMemo(() => {
    const freshAvatar: Record<string, string | undefined> = {};
    const freshName: Record<string, string | undefined> = {};
    messages.forEach(m => {
      if (m.sender?._id && !freshAvatar[m.sender._id]) {
        freshAvatar[m.sender._id] = m.sender.avatar;
        freshName[m.sender._id] = m.sender.fullName;
      }
    });
    const lastSeen: Record<string, string> = {};
    messages.forEach(m => { (m.readBy || []).forEach((id: string) => { if (id !== crmUserId) lastSeen[id] = m._id; }); });
    const result: Record<string, { _id: string; fullName: string; avatar?: string }[]> = {};
    conv.members.forEach(member => {
      if (member._id === crmUserId) return;
      const lastMsgId = lastSeen[member._id];
      if (lastMsgId) {
        if (!result[lastMsgId]) result[lastMsgId] = [];
        result[lastMsgId].push({
          ...member,
          avatar: freshAvatar[member._id] ?? member.avatar,
          fullName: freshName[member._id] ?? member.fullName,
        });
      }
    });
    return result;
  }, [messages, conv.members, crmUserId]);

  const displayName = getDisplayName(conv, crmUserId);
  const notificationPref = notifPrefs[conv._id] || conv.notificationPreference || { type: 'all' as const, muted: false };
  const avatarSrc = getAvatarSrc(conv, crmUserId);
  const rightPx = baseOffsetPx + stackIndex * (POPUP_W + POPUP_GAP);
  // Matches the accent SupraSpace itself falls back to when a conversation has no
  // custom theme color (see crm/supra-space/page.tsx's --accent default).
  const accentColor = conv.theme?.accent || '#5b7cf6';

  const mentionOptions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const allOpt = conv.type === 'group' ? [{ id: 'all', name: 'all', fullName: 'Notify all members' }] : [];
    const memberOpts = conv.members.filter(m => m._id !== crmUserId)
      .map(m => {
        const parts = m.fullName.trim().split(/\s+/);
        const name = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
        return { id: m._id, name, fullName: m.fullName };
      });
    const opts = [...allOpt, ...memberOpts];
    if (!q) return opts;
    return opts.filter(o => o.name.toLowerCase().startsWith(q) || o.fullName.toLowerCase().includes(q));
  }, [mentionQuery, conv, crmUserId]);

  const getCaretOffset = (el: HTMLElement): number => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  };

  const rangeFromTextOffset = React.useCallback((el: HTMLElement, offset: number) => {
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, offset);
    let node = walker.nextNode();
    while (node) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        range.collapse(true);
        return range;
      }
      remaining -= length;
      node = walker.nextNode();
    }
    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  }, []);

  const setEditableAndCaret = React.useCallback((text: string, caretOffset: number) => {
    const el = inputRef.current;
    if (!el) return;
    el.textContent = text;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    const textNode = el.firstChild;
    const safeOffset = Math.min(caretOffset, text.length);
    if (textNode?.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, safeOffset);
    } else {
      range.setStart(el, el.childNodes.length);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const insertMention = React.useCallback((name: string) => {
    const el = inputRef.current;
    if (!el || mentionAnchor < 0) return;
    const selection = window.getSelection();
    const range = rangeFromTextOffset(el, mentionAnchor);
    const endRange = rangeFromTextOffset(el, mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    range.setEnd(endRange.startContainer, endRange.startOffset);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand('insertText', false, `@${name} `);
    const next = el.innerText.replace(/\n$/, '');
    syncComposerText(next, true); setMentionQuery(null); setMentionAnchor(-1);
  }, [mentionAnchor, mentionQuery, rangeFromTextOffset, syncComposerText]);

  const fetchMessages = React.useCallback(async () => {
    const effectiveToken = crmToken || (typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null);
    if (!effectiveToken) return;
    setLoading(true); setFetchError(false);
    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${conv._id}/messages`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
        params: { limit: 40 },
      });
      setMessages(r.data?.data ?? []);
      markAsRead(conv._id);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('[ChatPopup] messages fetch failed:', e?.response?.status, e?.response?.data ?? e?.message);
      setFetchError(true);
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv._id, crmToken]);

  React.useEffect(() => { fetchMessages(); }, [fetchMessages]);
  React.useEffect(() => {
    if (!isMinimized && messages.length > 0) markAsRead(conv._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinimized]);
  // Join/leave conversation room so we receive messages:read events from other members
  React.useEffect(() => {
    if (!socket) return;
    socket.emit('join:conversation', { conversationId: conv._id });
    return () => { socket.emit('leave:conversation', { conversationId: conv._id }); };
  }, [socket, conv._id]);

  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, message }: { conversationId: string; message: SSMessage }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) return prev;
        const withoutMatchingOptimistic = prev.filter(m => !(
          m._id.startsWith('optimistic-') &&
          m.sender?._id === message.sender?._id &&
          m.content === message.content &&
          m.type === message.type &&
          Math.abs(new Date(message.createdAt).getTime() - new Date(m.createdAt).getTime()) < 30000
        ));
        return [...withoutMatchingOptimistic, message];
      });
      if (!isMinimized) markAsRead(conv._id);
    };
    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, [socket, conv._id, isMinimized, markAsRead]);
  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, messageId, content, attachments, type }: {
      conversationId: string;
      messageId: string;
      content: string;
      attachments?: SSAttachment[];
      type?: SSMessage['type'];
    }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => prev.map(m => m._id === messageId ? {
        ...m,
        content,
        attachments: Array.isArray(attachments) ? attachments : m.attachments,
        type: type || m.type,
        isEdited: true,
      } : m));
    };
    socket.on('message:edited', handler);
    return () => { socket.off('message:edited', handler); };
  }, [socket, conv._id]);
  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => prev.map(m =>
        (m.readBy || []).includes(userId) ? m : { ...m, readBy: [...(m.readBy || []), userId] }
      ));
    };
    socket.on('messages:read', handler);
    return () => { socket.off('messages:read', handler); };
  }, [socket, conv._id]);
  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, messageId, poll }: { conversationId: string; messageId: string; poll: SSPoll }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, poll } : m));
    };
    socket.on('message:poll', handler);
    return () => { socket.off('message:poll', handler); };
  }, [socket, conv._id]);
  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, messageId, event }: { conversationId: string; messageId: string; event: SSEvent }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, event } : m));
    };
    socket.on('message:event', handler);
    return () => { socket.off('message:event', handler); };
  }, [socket, conv._id]);
  React.useEffect(() => {
    if (!isMinimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);
  React.useEffect(() => {
    if (!isMinimized) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isMinimized]);

  const handleSend = async () => {
    const visibleComposerText = inputRef.current?.innerText || inputTextRef.current || input;
    const serializedComposerText = inputRef.current ? htmlToMarkdown(inputRef.current) : (inputTextRef.current || input).trim();
    const text = normalizeMessageMarkdownText(
      canonicalizeColorMarkup(
        restoreMissingSerialsFromSources(
          preserveVisiblePayloadLines(
            preserveVisibleVinLines(serializedComposerText, visibleComposerText),
            visibleComposerText,
          ),
          [
            visibleComposerText,
            inputTextRef.current,
            pastedPlainTextRef.current,
            inputRef.current?.textContent || '',
            serializedComposerText,
            pendingAttachments.map(item => item.file.name).join('\n'),
          ],
        ),
      ),
    );
    if (pendingAttachments.length > 0) {
      await sendPendingAttachments(text);
      return;
    }
    if (pendingGif) {
      await sendPendingGif(text);
      return;
    }
    if (!text || sending || !crmToken) return;
    const currentReplyTo = replyTo;
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const member = conv.members.find(m => m._id === crmUserId);
    setMessages(prev => [...prev, {
      _id: tempId,
      conversationId: conv._id,
      sender: {
        _id: crmUserId || 'me',
        fullName: member?.fullName || 'You',
        username: member?.username || 'you',
        avatar: member?.avatar,
      },
      content: text,
      type: 'text',
      attachments: [],
      reactions: [],
      readBy: crmUserId ? [crmUserId] : [],
      replyTo: currentReplyTo || null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    }]);
    syncComposerText('', true);
    try { localStorage.removeItem(draftStorageKey); } catch { }
    pastedPlainTextRef.current = '';
    if (inputRef.current) inputRef.current.innerHTML = '';
    setMentionQuery(null); setMentionAnchor(-1); setReplyTo(null);
    try {
      const body: { content: string; replyTo?: string } = { content: text };
      if (currentReplyTo) body.replyTo = currentReplyTo._id;
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/messages`, body,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => {
        if (prev.find(m => m._id === sent._id)) return prev.filter(m => m._id !== tempId);
        return prev.map(m => m._id === tempId ? sent : m);
      });
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      const currentDraft = inputRef.current?.innerText.replace(/\n$/, '') || inputTextRef.current || '';
      if (!currentDraft.trim()) {
        syncComposerText(text, true);
        try { localStorage.setItem(draftStorageKey, text); } catch { }
        if (inputRef.current) inputRef.current.textContent = text;
      }
    } finally { setSending(false); }
  };

  const rememberComposerSelection = React.useCallback(() => {
    const root = inputRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    inputSelectionRangeRef.current = range.cloneRange();
  }, []);

  const applyComposerInlineFormat = React.useCallback((
    format: SS4InlineTypingFormat,
  ) => {
    const root = inputRef.current;
    if (!root) return;

    const range = getRichEditorSelectionRange(
      root,
      inputSelectionRangeRef.current,
    );
    const command = ss4InlineCommandForFormat(format);

    if (range.collapsed) {
      root.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const caretBefore = getRichEditorCaretFormattingSnapshot(root);
      const currentValue = caretBefore
        ? caretBefore[format]
        : document.queryCommandState(command);
      const nextValue = !currentValue;
      const nextTypingFormats = {
        ...ss4TypingPreferencesFromCaretSnapshot(caretBefore),
        [format]: nextValue,
      };

      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false);

      insertTypingStyleCaretMarker(
        root,
        caretBefore?.fontFamilyExplicit ? caretBefore.fontFamily : null,
        caretBefore?.fontSizeExplicit ? caretBefore.fontSize : null,
        nextTypingFormats,
        caretBefore?.colorExplicit ? caretBefore.color : null,
      );

      const liveSelection = window.getSelection();
      inputSelectionRangeRef.current = liveSelection?.rangeCount
        ? liveSelection.getRangeAt(0).cloneRange()
        : range.cloneRange();

      setComposerTypingFormats(nextTypingFormats);
      setComposerActiveFormats(previous => ({
        ...previous,
        [format]: nextValue,
      }));
      requestAnimationFrame(refreshComposerCaretFormats);
      return;
    }

    root.focus();
    const nextRange = executeRichEditorCommandPreservingSelection(
      root,
      range,
      () => {
        document.execCommand(command, false);
      },
    );
    if (nextRange) inputSelectionRangeRef.current = nextRange;

    const nextValue = document.queryCommandState(command);
    setComposerTypingFormats(previous => ({
      ...previous,
      [format]: nextValue,
    }));
    setComposerActiveFormats(previous => ({
      ...previous,
      [format]: nextValue,
    }));
    syncComposerText(root.innerText.replace(/\n$/, ''), true);
  }, [composerTypingFormats, syncComposerText]);

  const refreshComposerCaretFormats = React.useCallback(() => {
    try {
      const root = inputRef.current;
      const selection = window.getSelection();
      if (
        !root
        || !selection?.anchorNode
        || !root.contains(selection.anchorNode)
      ) {
        return;
      }

      const caret = getRichEditorCaretFormattingSnapshot(root);
      if (!caret) return;

      setComposerActiveFormats({
        bold: caret.bold,
        italic: caret.italic,
        underline: caret.underline,
        strike: caret.strike,
      });
      setComposerFontFamily(caret.fontFamily);
      setComposerFontSize(caret.fontSize);
      setComposerTextColor(caret.color);

      const rootStyle = window.getComputedStyle(root);
      const rootFamily =
        ss4FontFamilyIdFromCss(rootStyle.fontFamily)
        || SS4_DEFAULT_FONT_FAMILY;
      const rootSize =
        ss4FontSizeFromCss(rootStyle.fontSize)
        || SS4_DEFAULT_FONT_SIZE;
      const rootColor =
        cssColorToHex(rootStyle.color)
        || '#ffffff';

      setComposerFontFamilyChosen(
        caret.fontFamilyExplicit || caret.fontFamily !== rootFamily,
      );
      setComposerFontSizeChosen(
        caret.fontSizeExplicit || caret.fontSize !== rootSize,
      );
      setComposerTextColorChosen(
        caret.colorExplicit || caret.color !== rootColor,
      );
      setComposerTypingFormats(
        ss4TypingPreferencesFromCaretSnapshot(caret),
      );
    } catch {
      // Caret formatting detection is best effort.
    }
  }, []);

  React.useEffect(() => {
    const handleComposerSelectionChange = () => {
      const root = inputRef.current;
      const selection = window.getSelection();
      if (
        root
        && selection?.anchorNode
        && root.contains(selection.anchorNode)
      ) {
        refreshComposerCaretFormats();
      }
    };

    document.addEventListener(
      'selectionchange',
      handleComposerSelectionChange,
    );
    return () => {
      document.removeEventListener(
        'selectionchange',
        handleComposerSelectionChange,
      );
    };
  }, [refreshComposerCaretFormats]);

  const applyComposerFontFamily = React.useCallback((fontFamily: SS4FontFamilyId) => {
    setComposerFontFamilyChosen(true);
    setComposerFontFamily(fontFamily);

    const root = inputRef.current;
    if (!root) return;
    const range = getRichEditorSelectionRange(
      root,
      inputSelectionRangeRef.current,
    );

    if (!range.collapsed) {
      const nextRange = executeRichEditorCommandPreservingSelection(
        root,
        range,
        () => {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand(
            'fontName',
            false,
            ss4FontFamilyCss(fontFamily),
          );
        },
      );
      if (nextRange) inputSelectionRangeRef.current = nextRange;
      syncComposerText(root.innerText.replace(/\n$/, ''), true);
      rememberComposerSelection();
      requestAnimationFrame(refreshComposerCaretFormats);
      return;
    }

    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const caretBefore = getRichEditorCaretFormattingSnapshot(root);

    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(
      'fontName',
      false,
      ss4FontFamilyCss(fontFamily),
    );

    insertTypingStyleCaretMarker(
      root,
      fontFamily,
      caretBefore?.fontSizeExplicit ? caretBefore.fontSize : null,
      ss4TypingPreferencesFromCaretSnapshot(caretBefore),
      caretBefore?.colorExplicit ? caretBefore.color : null,
    );

    inputSelectionRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : range.cloneRange();

    setComposerFontFamily(fontFamily);
    setComposerFontFamilyChosen(true);
    rememberComposerSelection();
    requestAnimationFrame(refreshComposerCaretFormats);
  }, [
    refreshComposerCaretFormats,
    rememberComposerSelection,
    syncComposerText,
  ]);

  const applyComposerFontSize = React.useCallback((fontSize: SS4FontSize) => {
    setComposerFontSizeChosen(true);
    setComposerFontSize(fontSize);

    const root = inputRef.current;
    if (!root) return;
    const range = getRichEditorSelectionRange(
      root,
      inputSelectionRangeRef.current,
    );

    if (!range.collapsed) {
      const nextRange = executeRichEditorCommandPreservingSelection(
        root,
        range,
        () => {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('fontSize', false, '7');
          normalizeRichEditorFontSizeElements(root, fontSize);
        },
      );
      if (nextRange) inputSelectionRangeRef.current = nextRange;
      syncComposerText(root.innerText.replace(/\n$/, ''), true);
      rememberComposerSelection();
      requestAnimationFrame(refreshComposerCaretFormats);
      return;
    }

    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const caretBefore = getRichEditorCaretFormattingSnapshot(root);

    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontSize', false, '7');

    insertTypingStyleCaretMarker(
      root,
      caretBefore?.fontFamilyExplicit ? caretBefore.fontFamily : null,
      fontSize,
      ss4TypingPreferencesFromCaretSnapshot(caretBefore),
      caretBefore?.colorExplicit ? caretBefore.color : null,
    );

    inputSelectionRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : range.cloneRange();

    setComposerFontSize(fontSize);
    setComposerFontSizeChosen(true);
    rememberComposerSelection();
    requestAnimationFrame(refreshComposerCaretFormats);
  }, [
    refreshComposerCaretFormats,
    rememberComposerSelection,
    syncComposerText,
  ]);

  const applyComposerTextColor = React.useCallback((color: string) => {
    const root = inputRef.current;
    if (!root) return;

    const range = getRichEditorSelectionRange(
      root,
      inputSelectionRangeRef.current,
    );
    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    if (!range.collapsed) {
      const nextRange = executeRichEditorCommandPreservingSelection(
        root,
        range,
        () => applyTextColorToRichEditorSelection(root, color),
      );
      if (nextRange) inputSelectionRangeRef.current = nextRange;
      syncComposerText(root.innerText.replace(/\n$/, ''), true);
      setComposerTextColor(color);
      setComposerTextColorChosen(true);
      rememberComposerSelection();
      requestAnimationFrame(refreshComposerCaretFormats);
      return;
    }

    const caretBefore = getRichEditorCaretFormattingSnapshot(root);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);

    insertTypingStyleCaretMarker(
      root,
      caretBefore?.fontFamilyExplicit ? caretBefore.fontFamily : null,
      caretBefore?.fontSizeExplicit ? caretBefore.fontSize : null,
      ss4TypingPreferencesFromCaretSnapshot(caretBefore),
      color,
    );

    inputSelectionRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : range.cloneRange();

    setComposerTextColor(color);
    setComposerTextColorChosen(true);
    rememberComposerSelection();
    requestAnimationFrame(refreshComposerCaretFormats);
  }, [
    refreshComposerCaretFormats,
    rememberComposerSelection,
    syncComposerText,
  ]);

  const handleComposerTypographyBeforeInput = React.useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const inserted = insertPreselectedTypographyText(
      event,
      composerFontFamilyChosen ? composerFontFamily : null,
      composerFontSizeChosen ? composerFontSize : null,
      composerTypingFormats,
      composerTextColorChosen ? composerTextColor : null,
    );
    if (!inserted) return;
    requestAnimationFrame(() => {
      const root = inputRef.current;
      if (!root) return;
      syncComposerText(root.innerText.replace(/\n$/, ''), true);
      rememberComposerSelection();
    });
  }, [
    composerFontFamily,
    composerFontFamilyChosen,
    composerFontSize,
    composerFontSizeChosen,
    composerTextColor,
    composerTextColorChosen,
    composerTypingFormats,
    rememberComposerSelection,
    syncComposerText,
  ]);

  const handleTyping = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const val = (el.innerText || '').replace(/\n$/, '');
    syncComposerText(val);
    const inputEvent = e.nativeEvent as InputEvent;
    const shouldInspectMention =
      mentionAnchor >= 0 ||
      inputEvent.data === '@' ||
      inputEvent.inputType === 'insertFromPaste';

    if (!shouldInspectMention) return;

    const cursor = getCaretOffset(el);
    if (mentionAnchor >= 0) {
      if (cursor <= mentionAnchor || val[mentionAnchor] !== '@') {
        setMentionQuery(null); setMentionAnchor(-1);
      } else {
        const q = val.slice(mentionAnchor + 1, cursor);
        if (q.includes('  ')) { setMentionQuery(null); setMentionAnchor(-1); }
        else { setMentionQuery(q); setMentionIdx(0); }
      }
    } else {
      const match = val.slice(0, cursor).match(/@(\w*)$/);
      if (match) { setMentionQuery(match[1]); setMentionAnchor(cursor - match[0].length); setMentionIdx(0); }
    }
  };

  const inspectMentionAnywhere = React.useCallback((value: string) => {
    const aliases = [
      ...(conv.type === 'group' ? ['all'] : []),
      ...conv.members
        .filter(m => m._id !== crmUserId)
        .flatMap(m => {
          const parts = m.fullName.trim().split(/\s+/).filter(Boolean);
          const display = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
          return [display, m.fullName, parts[0], m.username].filter(Boolean) as string[];
        }),
    ];

    const candidates: Array<{ anchor: number; query: string; length: number }> = [];
    aliases.forEach(alias => {
      const normalizedAlias = escapeRegExp(alias.trim()).replace(/\s+/g, '\\s+');
      const re = new RegExp(`(^|[^\\w@])@${normalizedAlias}(?=$|[^\\w])`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = re.exec(value)) !== null) {
        const anchor = match.index + match[1].length;
        const matched = value.slice(anchor + 1, re.lastIndex).trim();
        candidates.push({ anchor, query: matched, length: matched.length });
      }
    });

    const best = candidates.sort((a, b) => b.anchor - a.anchor || b.length - a.length)[0];
    if (!best) return false;
    setMentionQuery(best.query);
    setMentionAnchor(best.anchor);
    setMentionIdx(0);
    return true;
  }, [conv.members, conv.type, crmUserId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
      pastePlainTextShortcutRef.current = true;
      window.setTimeout(() => {
        pastePlainTextShortcutRef.current = false;
      }, 750);
    }

    if (
      e.key === 'Enter'
      && e.altKey
      && !e.ctrlKey
      && !e.metaKey
    ) {
      e.preventDefault();
      e.stopPropagation();
      const root = inputRef.current;
      if (!root) return;
      const caret = getRichEditorCaretFormattingSnapshot(root);
      insertSoftLineBreakWithCaretFormatting(
        root,
        composerFontFamilyChosen
          ? composerFontFamily
          : caret?.fontFamilyExplicit
            ? caret.fontFamily
            : null,
        composerFontSizeChosen
          ? composerFontSize
          : caret?.fontSizeExplicit
            ? caret.fontSize
            : null,
        ss4TypingPreferencesFromCaretSnapshot(caret),
        composerTextColorChosen
          ? composerTextColor
          : caret?.colorExplicit
            ? caret.color
            : null,
      );
      const nextText = stripSupraSpaceTypingMarkers(
        root.innerText.replace(/\n$/, ''),
      );
      syncComposerText(nextText, true);
      rememberComposerSelection();
      requestAnimationFrame(refreshComposerCaretFormats);
      return;
    }

    if (mentionQuery !== null && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIdx(i => Math.min(i + 1, mentionOptions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionOptions[mentionIdx].name);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        setMentionAnchor(-1);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        applyComposerInlineFormat('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        applyComposerInlineFormat('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        applyComposerInlineFormat('underline');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        applyComposerInlineFormat('strike');
        return;
      }
    }

    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const root = inputRef.current;
      if (!root) return;
      const caret = getRichEditorCaretFormattingSnapshot(root);
      insertSoftLineBreakWithCaretFormatting(
        root,
        composerFontFamilyChosen
          ? composerFontFamily
          : caret?.fontFamilyExplicit
            ? caret.fontFamily
            : null,
        composerFontSizeChosen
          ? composerFontSize
          : caret?.fontSizeExplicit
            ? caret.fontSize
            : null,
        ss4TypingPreferencesFromCaretSnapshot(caret),
        composerTextColorChosen
          ? composerTextColor
          : caret?.colorExplicit
            ? caret.color
            : null,
      );
      const nextText = stripSupraSpaceTypingMarkers(
        root.innerText.replace(/\n$/, ''),
      );
      syncComposerText(nextText, true);
      rememberComposerSelection();
      requestAnimationFrame(refreshComposerCaretFormats);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const setMutePref = React.useCallback(async (muted: boolean, muteUntil: string | null) => {
    if (!crmToken) return;
    const prev = notificationPref;
    const next = { type: notificationPref.type, muted, muteUntil };
    setNotifPrefs(p => ({ ...p, [conv._id]: next }));
    try {
      await apiClient.patch(
        `/api/supraspace/conversations/${conv._id}/notifications`,
        next,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as RequestConfigWithSkipRefresh,
      ).then((res) => {
        const saved = res.data?.data || next;
        setNotifPrefs(p => ({ ...p, [conv._id]: saved }));
        toast.success(saved.muted ? 'Conversation muted' : 'Conversation unmuted');
      });
    } catch {
      setNotifPrefs(p => ({ ...p, [conv._id]: prev }));
      toast.error('Could not save notification settings');
    }
  }, [conv._id, crmToken, notificationPref, setNotifPrefs]);

  return (
    <>
      {/* ── Popup container — no overflow-hidden so portals render correctly ── */}
      <div
        ref={popupShellRef}
        data-chat-popup-shell="true"
        className="fixed bottom-0 z-50 rounded-t-xl border border-border/60 bg-card shadow-2xl"
        style={{ display: isMinimized ? 'none' : 'flex', flexDirection: 'column', width: POPUP_W, right: rightPx, height: POPUP_H }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {draggingAttachment && (
          <div className="absolute inset-2 z-60 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400/80 bg-blue-500/15 backdrop-blur-sm pointer-events-none">
            <div className="rounded-xl bg-background/90 px-4 py-3 text-center shadow-xl">
              <ImageIcon className="mx-auto mb-2 h-6 w-6 text-blue-500" />
              <p className="text-sm font-bold text-foreground">Drop files to send</p>
              <p className="text-xs text-muted-foreground">Images will preview in this chat</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div
          ref={headerRef}
          className="h-11 shrink-0 flex items-center gap-2 px-3 bg-card border-b border-border/50 select-none rounded-t-xl overflow-hidden"
        >
          {/* Avatar + name + chevron — always opens conversation options (or expands when minimized) */}
          <button
            type="button"
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
            onClick={() => setChatSettingsOpen(v => !v)}
            title="Conversation options"
          >
            <Avatar className="h-7 w-7 shrink-0">
              {avatarSrc && <AvatarImage src={resolveImageUrl(avatarSrc)} />}
              <AvatarFallback className="text-[10px] font-semibold text-white" style={{ background: accentColor }}>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="text-[14px] font-semibold text-foreground truncate min-w-0">{displayName}</span>
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground"
              style={{ transform: chatSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            onClick={() => { setChatSettingsOpen(false); onToggleMinimize(); }} title="Minimize">
            <Minus className="size-3.5" />
          </button>
          <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            onClick={() => onClose()} title="Close">
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        {!isMinimized && (
          <>
            <div data-popup-chat-body="true" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 bg-background min-h-0 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-1.5">
                  {fetchError ? (
                    <>
                      <MessageCircle className="size-6 text-muted-foreground/30" />
                      <p className="text-[11px] text-muted-foreground">Failed to load messages</p>
                      <button onClick={fetchMessages} className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2">Retry</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 32, lineHeight: 1 }}>👋</span>
                      <p className="text-[12px] font-semibold mt-1" style={{ color: 'var(--text-primary, inherit)' }}>
                        {conv.type === 'direct'
                          ? `Say Hi to ${conv.members.find(m => m._id !== crmUserId)?.fullName || 'your friend'}!`
                          : `Welcome to ${conv.name || 'this channel'}!`}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">Send a message to start chatting.</p>
                    </>
                  )}
                </div>
              ) : (
                messages.map((msg, idx) => {
                  if (msg.isDeleted) return null;
                  const isOwn = msg.sender?._id === crmUserId;
                  const prevVisible = messages.slice(0, idx).findLast(m => !m.isDeleted);
                  const nextVisible = messages.slice(idx + 1).find(m => !m.isDeleted) || null;
                  const showName = !isOwn && (!prevVisible || prevVisible.sender?._id !== msg.sender?._id);
                  const hideTime = !!(nextVisible
                    && nextVisible.sender?._id === msg.sender?._id
                    && new Date(nextVisible.createdAt).getTime() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000
                  );
                  const seenMembers = msgSeenByMembers[msg._id] || [];
                  const imageAttachments = (msg.attachments || []).filter((a: SSAttachment) => a.mimeType?.startsWith('image/'));
                  const videoAttachments = (msg.attachments || []).filter((a: SSAttachment) => a.mimeType?.startsWith('video/'));
                  const fileAttachments = (msg.attachments || []).filter((a: SSAttachment) =>
                    !a.mimeType?.startsWith('image/') && !a.mimeType?.startsWith('audio/') && !a.mimeType?.startsWith('video/'));
                  const voiceAtt = msg.type === 'voice' ? (msg.attachments || []).find((a: SSAttachment) => a.mimeType?.startsWith('audio/')) : null;
                  const imageOnly = imageAttachments.length > 0 && !msg.content?.trim();
                  const gifOnly = msg.type === 'gif' && !!msg.gif?.url;
                  const emojiOnly = imageAttachments.length === 0 && msg.type === 'text' && isEmojiOnlyText(msg.content);
                  const isRichCard = !!voiceAtt || (msg.type === 'poll' && !!msg.poll) || (msg.type === 'event' && !!msg.event);
                  const bareMessage = imageOnly || emojiOnly || gifOnly || isRichCard;
                  const editableAttachmentCount = (msg.attachments || []).filter((a: SSAttachment) => !a.mimeType?.startsWith('audio/')).length;
                  const canSaveThisEdit = !editSaving
                    && (Boolean(editDraft.trim()) || editableAttachmentCount > 0 || editReplacementFiles.length > 0)
                    && (editDraft.trim() !== (msg.content || '').trim() || editReplacementFiles.length > 0);
                  const senderColor = msg.sender?._id ? stringToColor(msg.sender._id) : accentColor;
                  const senderDisplayName = conv.members.find(m => m._id === msg.sender?._id)?.displayNickname || msg.sender?.fullName;
                  return (
                    <div key={msg._id}
                      className={cn('flex gap-2', isOwn ? 'flex-row-reverse items-end' : 'flex-row items-end', showName && 'mt-1.5')}
                      onMouseEnter={(e) => handleMsgEnter(e, msg._id, isOwn)}
                      onMouseLeave={handleMsgLeave}
                    >
                      {/* Sender avatar for non-own messages */}
                      {!isOwn && (
                        <div className="shrink-0 self-end mb-0.5">
                          {showName ? (
                            <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center text-white ring-1 ring-white/10"
                              style={{ fontSize: 7, background: senderColor }}>
                              {msg.sender?.avatar
                                ? <img src={resolveImageUrl(msg.sender.avatar)} alt="" className="w-full h-full object-cover" />
                                : senderDisplayName?.[0]?.toUpperCase()}
                            </div>
                          ) : (
                            <div className="h-5 w-5" /> /* spacer to keep alignment */
                          )}
                        </div>
                      )}
                      <div
                        data-popup-bubble-id={msg._id}
                        className={cn(
                          'min-w-0 flex flex-col',
                          editingMsgId === msg._id
                            ? 'w-[94%] max-w-[94%]'
                            : imageOnly || gifOnly || isRichCard
                              ? 'max-w-[78%]'
                              : 'max-w-[62%]',
                        )}
                        style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}
                      >
                        {showName && !isOwn && (
                          <span className="px-1 mb-0.5 text-[12px] font-semibold" style={{ color: senderColor }}>
                            {senderDisplayName}
                          </span>
                        )}
                        {/* Bubble */}
                        {editingMsgId === msg._id ? (
                          <div
                            className="min-w-0 rounded-2xl rounded-br-sm px-3 py-1.5 text-[15px] leading-relaxed text-white"
                            style={{
                              background: accentColor,
                              width: editWidth ? `${editWidth}px` : '100%',
                              minWidth: 0,
                              maxWidth: '100%',
                              overflow: 'visible',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            <div className="flex items-center gap-0.5 pb-1.5 mb-1.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('bold'); }} className={popupEditButtonClass(editActiveFormats.bold)} title="Bold" aria-pressed={editActiveFormats.bold}><Bold className="h-3.5 w-3.5" /></button>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('italic'); }} className={popupEditButtonClass(editActiveFormats.italic)} title="Italic" aria-pressed={editActiveFormats.italic}><Italic className="h-3.5 w-3.5" /></button>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('underline'); }} className={popupEditButtonClass(editActiveFormats.underline)} title="Underline" aria-pressed={editActiveFormats.underline}><Underline className="h-3.5 w-3.5" /></button>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('strikeThrough'); }} className={popupEditButtonClass(editActiveFormats.strike)} title="Strikethrough" aria-pressed={editActiveFormats.strike}><Strikethrough className="h-3.5 w-3.5" /></button>
                              <select
                                value={editFontFamily}
                                onPointerDown={() => rememberEditSelection()}
                                onChange={event => applyEditFontFamily(event.target.value as SS4FontFamilyId)}
                                className="h-7 max-w-28 rounded-md px-1.5 text-[9px] outline-none"
                                style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                                aria-label="Font family"
                                title="Choose a font before typing or apply it to selected text"
                              >
                                <option value="" disabled>Font</option>
                  {SS4_FONT_FAMILIES.map(option => <option key={option.id} value={option.id} style={{ color: '#111827' }}>{option.label}</option>)}
                              </select>
                              <select
                                value={editFontSize}
                                onPointerDown={() => rememberEditSelection()}
                                onChange={event => applyEditFontSize(Number.parseInt(event.target.value, 10) as SS4FontSize)}
                                className="h-7 w-14 rounded-md px-1 text-[9px] outline-none"
                                style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                                aria-label="Font size"
                                title="Choose a size before typing or apply it to selected text"
                              >
                                <option value="" disabled>Size</option>
                  {SS4_FONT_SIZES.map(size => <option key={size} value={size} style={{ color: '#111827' }}>{size}</option>)}
                              </select>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('insertUnorderedList'); }} className={popupEditButtonClass(editActiveFormats.list)} title="Bullet list" aria-pressed={editActiveFormats.list}><List className="h-3.5 w-3.5" /></button>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('insertOrderedList'); }} className={popupEditButtonClass(editActiveFormats.numbered)} title="Numbered list" aria-pressed={editActiveFormats.numbered}><ListOrdered className="h-3.5 w-3.5" /></button>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('formatBlock', 'blockquote'); }} className={popupEditButtonClass(editActiveFormats.quote)} title="Quote" aria-pressed={editActiveFormats.quote}><TextQuote className="h-3.5 w-3.5" /></button>
                              <button type="button" onMouseDown={e => { e.preventDefault(); applyEditCommand('fontName', 'monospace'); }} className={popupEditButtonClass(editActiveFormats.code)} title="Inline code" aria-pressed={editActiveFormats.code}><Code2 className="h-3.5 w-3.5" /></button>
                              <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => setEditPasteMode(mode => mode === 'formatted' ? 'plain' : 'formatted')}
                                className={cn('h-7 px-2 rounded-md flex items-center gap-1 hover:bg-white/10', editPasteMode === 'plain' && 'bg-white/10')}
                                title={editPasteMode === 'formatted' ? 'Paste mode: Keep formatting' : 'Paste mode: Text only'}
                                aria-pressed={editPasteMode === 'plain'}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                <span className="text-[9px] font-bold">{editPasteMode === 'formatted' ? 'FMT' : 'TXT'}</span>
                              </button>
                              <div className="relative flex items-center gap-1">
                                <button type="button" onMouseDown={e => {
                                  e.preventDefault();
                                  rememberEditSelection();
                                  setEditColorOpen(v => !v);
                                }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="More text colors">
                                  <Palette className="h-3.5 w-3.5" />
                                </button>
                                {editPalette.map(color => (
                                  <button key={color} onMouseDown={e => {
                                    e.preventDefault();
                                    rememberEditSelection();
                                    applyEditColor(color);
                                  }} className="relative h-5 w-5 rounded-full border transition-transform hover:scale-110" style={{ background: color, borderColor: editTextColor === color ? '#60a5fa' : color === '#ffffff' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)', boxShadow: editTextColor === color ? '0 0 0 2px rgba(0,0,0,0.35), 0 0 0 4px #60a5fa' : undefined }} aria-pressed={editTextColor === color} title={`Text color ${color}`}>
                                    {editTextColor === color && <Check className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2" style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }} />}
                                  </button>
                                ))}
                                {editColorOpen && (
                                  <div className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-7 gap-1.5 overflow-y-auto rounded-xl p-2 shadow-2xl" style={{ background: 'var(--popover)', border: '1px solid rgba(255,255,255,0.12)', width: 210, maxHeight: 156 }}>
                                    {MORE_TEXT_COLORS.map(color => (
                                      <button key={color} type="button" onMouseDown={e => { e.preventDefault(); chooseExpandedEditColor(color); }} className="relative h-6 w-6 rounded-full border transition-transform hover:scale-110" style={{ background: color, borderColor: editTextColor === color ? '#60a5fa' : color === '#ffffff' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)', boxShadow: editTextColor === color ? '0 0 0 2px #18181c, 0 0 0 4px #60a5fa' : undefined }} aria-pressed={editTextColor === color} title={`Use ${color}`}>
                                        {editTextColor === color && <Check className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2" style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }} />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              ref={editAreaRef}
                              contentEditable
                              suppressContentEditableWarning
                              onBeforeInput={handleEditTypographyBeforeInput}
                              onInput={() => {
                                normalizeRichEditorFontSizeElements(
                                  editAreaRef.current,
                                  editFontSize,
                                );
                                syncEditDraft();
                                rememberEditSelection();
                                refreshPopupEditFormats();
                              }}
                              onFocus={() => { rememberEditSelection(); refreshPopupEditFormats(); }}
                              onSelect={() => { rememberEditSelection(); refreshPopupEditFormats(); }}
                              onMouseUp={() => { rememberEditSelection(); refreshPopupEditFormats(); }}
                              onKeyUp={() => { rememberEditSelection(); refreshPopupEditFormats(); }}
                              onKeyDown={e => {
                                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
                                  editPastePlainTextShortcutRef.current = true;
                                  window.setTimeout(() => { editPastePlainTextShortcutRef.current = false; }, 750);
                                }

                                const selection = window.getSelection();
                                const anchorNode = selection?.anchorNode;
                                const anchorElement = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
                                const isInsideStructuredBlock = Boolean(
                                  anchorElement
                                  && editAreaRef.current?.contains(anchorElement)
                                  && anchorElement.closest('li, blockquote')
                                );

                                if (
                                  e.key === 'Enter'
                                  && e.altKey
                                  && !e.ctrlKey
                                  && !e.metaKey
                                ) {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  const caret = getRichEditorCaretFormattingSnapshot(
                                    editAreaRef.current,
                                  );
                                  insertSoftLineBreakWithCaretFormatting(
                                    editAreaRef.current!,
                                    editFontFamilyChosen
                                      ? editFontFamily
                                      : caret?.fontFamilyExplicit
                                        ? caret.fontFamily
                                        : null,
                                    editFontSizeChosen
                                      ? editFontSize
                                      : caret?.fontSizeExplicit
                                        ? caret.fontSize
                                        : null,
                                    ss4TypingPreferencesFromCaretSnapshot(caret),
                                    editTextColorChosen
                                      ? editTextColor
                                      : caret?.colorExplicit
                                        ? caret.color
                                        : null,
                                  );

                                  syncEditDraft();
                                  rememberEditSelection();
                                  requestAnimationFrame(refreshPopupEditFormats);
                                  return;
                                }

                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  saveEdit();
                                  return;
                                }

                                if (e.key === 'Enter' && !e.shiftKey) {
                                  if (isInsideStructuredBlock) {
                                    requestAnimationFrame(() => {
                                      syncEditDraft();
                                      rememberEditSelection();
                                      refreshPopupEditFormats();
                                    });
                                    return;
                                  }
                                  e.preventDefault();
                                  saveEdit();
                                  return;
                                }

                                if (e.key === 'Enter' && e.shiftKey) {
                                  e.preventDefault();
                                  const caret = getRichEditorCaretFormattingSnapshot(
                                    editAreaRef.current,
                                  );
                                  insertSoftLineBreakWithCaretFormatting(
                                    editAreaRef.current!,
                                    editFontFamilyChosen
                                      ? editFontFamily
                                      : caret?.fontFamilyExplicit
                                        ? caret.fontFamily
                                        : null,
                                    editFontSizeChosen
                                      ? editFontSize
                                      : caret?.fontSizeExplicit
                                        ? caret.fontSize
                                        : null,
                                    ss4TypingPreferencesFromCaretSnapshot(caret),
                                    editTextColorChosen
                                      ? editTextColor
                                      : caret?.colorExplicit
                                        ? caret.color
                                        : null,
                                  );
                                  syncEditDraft();
                                  rememberEditSelection();
                                  requestAnimationFrame(refreshPopupEditFormats);
                                  return;
                                }

                                if (e.ctrlKey || e.metaKey) {
                                  const key = e.key.toLowerCase();
                                  if (key === 'b') {
                                    e.preventDefault();
                                    applyEditCommand('bold');
                                    return;
                                  }
                                  if (key === 'i') {
                                    e.preventDefault();
                                    applyEditCommand('italic');
                                    return;
                                  }
                                  if (key === 'u') {
                                    e.preventDefault();
                                    applyEditCommand('underline');
                                    return;
                                  }
                                  if (e.shiftKey && key === 'x') {
                                    e.preventDefault();
                                    applyEditCommand('strikeThrough');
                                    return;
                                  }
                                }

                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onPaste={e => {
                                const text = e.clipboardData?.getData('text/plain') || '';
                                const html = e.clipboardData?.getData('text/html') || '';
                                const shortcutPlainText = editPastePlainTextShortcutRef.current;
                                editPastePlainTextShortcutRef.current = false;
                                const plainText = clipboardPayloadToPlainText(text, html);
                                if (!plainText && !html) return;

                                e.preventDefault();
                                const usePlainText = editPasteMode === 'plain' || shortcutPlainText || richPasteDropsVinLikeToken(text, html);
                                document.execCommand(
                                  usePlainText ? 'insertText' : 'insertHTML',
                                  false,
                                  usePlainText ? plainText : clipboardPayloadToRichEditorHtml(text, html),
                                );
                                requestAnimationFrame(() => {
                                  normalizeRichEditorListExitArtifacts(editAreaRef.current);
                                  syncEditDraft();
                                  rememberEditSelection();
                                });
                              }}
                              className="ss-popup-rich-edit min-h-7 max-h-40 overflow-y-auto outline-none text-[15px] leading-relaxed text-white"
                              style={{ minWidth: 0, display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', caretColor: 'var(--foreground)' }}
                            />
                            {(editableAttachmentCount > 0 || editReplacementFiles.length > 0) && (
                              <div className="mt-1.5 space-y-1.5 rounded-xl border border-white/15 bg-black/15 p-2">
                                {editableAttachmentCount > 0 && editReplacementFiles.length === 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-semibold text-white/55">Current attachment{editableAttachmentCount === 1 ? '' : 's'}</div>
                                    {(msg.attachments || []).filter((a: SSAttachment) => !a.mimeType?.startsWith('audio/')).map((att: SSAttachment, index: number) => (
                                      <div key={`${att.url}-${index}`} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1">
                                        {att.mimeType?.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
                                        <span className="min-w-0 flex-1 truncate text-[10.5px]">{att.originalName || `Attachment ${index + 1}`}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {editReplacementFiles.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto pb-1">
                                    {editReplacementFiles.map((item, index) => {
                                      const isImage = item.file.type.startsWith('image/');
                                      return (
                                        <div key={`${item.file.name}-${item.file.lastModified}-${index}`} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/20">
                                          {isImage ? (
                                            <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-contain" />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold text-white/70">{item.file.name}</div>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setEditReplacementFiles(prev => {
                                              const removed = prev[index];
                                              if (removed) URL.revokeObjectURL(removed.previewUrl);
                                              return prev.filter((_, i) => i !== index);
                                            })}
                                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-1.5 flex flex-col gap-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                              <span style={{ fontSize: 8, opacity: 0.5 }}>Alt+Enter or Shift+Enter adds a line break · Ctrl/Cmd+Enter saves · Esc cancels</span>
                              <input
                                ref={editFileRef}
                                type="file"
                                multiple
                                hidden
                                onChange={e => {
                                  const selected = Array.from(e.target.files || []);
                                  setEditReplacementFiles(prev => {
                                    prev.forEach(item => URL.revokeObjectURL(item.previewUrl));
                                    return selected.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
                                  });
                                  syncEditDraft();
                                }}
                              />
                              <div className="grid w-full grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => editFileRef.current?.click()}
                                  className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px]"
                                  style={{ background: 'rgba(255,255,255,0.15)' }}
                                  title={editableAttachmentCount > 0 ? 'Replace attachments' : 'Add attachments'}
                                >
                                  <Paperclip className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{editableAttachmentCount > 0 ? 'Replace' : 'Attach'}</span>
                                </button>
                                <button onClick={cancelEdit} className="min-w-0 rounded-md px-1.5 py-1.5 text-[10.5px]" style={{ background: 'rgba(255,255,255,0.15)' }}>Cancel</button>
                                <button onClick={saveEdit} disabled={!canSaveThisEdit} className="min-w-0 rounded-md px-1.5 py-1.5 text-[10.5px] font-semibold disabled:opacity-40" style={{ background: '#34c97d', color: '#fff' }}>
                                  {editSaving ? '...' : 'Update'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={cn(
                            'text-[15px] leading-relaxed min-w-0',
                            bareMessage ? 'p-0 bg-transparent text-foreground' : 'px-3 py-1.5 rounded-2xl',
                            !bareMessage && (isOwn ? 'text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm')
                          )} data-popup-bubble-id={msg._id} style={{ overflowWrap: 'anywhere', background: !bareMessage && isOwn ? accentColor : undefined }}>
                            {/* Reply preview */}
                            {msg.replyTo && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  jumpToPopupRepliedMessage(msg.replyTo);
                                }}
                                className={cn(
                                  'mb-1 block px-2 py-1 rounded-lg text-left text-[12px] border-l-2 transition hover:brightness-110 focus:outline-none focus:ring-2',
                                  isOwn ? 'bg-white/15 border-white/60' : 'bg-black/5',
                                )}
                                style={{ maxWidth: 180, borderLeftColor: isOwn ? undefined : accentColor }}
                                title="Jump to original message"
                              >
                                <div className="font-semibold truncate" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : accentColor }}>
                                  {msg.replyTo?.sender?.fullName || 'Reply'}
                                </div>
                                <div className={cn('truncate', isOwn ? 'text-white/60' : 'text-foreground/50')}>
                                  {messagePreviewText(msg.replyTo?.content) || '📎 Attachment'}
                                </div>
                              </button>
                            )}
                            {imageAttachments.length > 0 && (
                              <div className={cn(
                                imageAttachments.length === 1 ? 'block' : 'grid gap-1 overflow-hidden rounded-2xl',
                                imageAttachments.length === 2 && 'grid-cols-2',
                                imageAttachments.length >= 3 && 'grid-cols-2'
                              )} style={imageAttachments.length > 1 ? { width: 220, maxWidth: '100%' } : undefined}>
                                {imageAttachments.map((a: SSAttachment, i: number) => {
                                  const src = resolveImageUrl(a.thumbnailUrl || a.url) || a.url;
                                  const fullSrc = resolveImageUrl(a.url) || a.url;
                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setMediaPreview({ src: fullSrc, name: a.originalName || 'photo' })}
                                      className={cn(
                                        'block overflow-hidden border border-white/10 bg-black/20',
                                        imageAttachments.length === 1 ? 'rounded-2xl' : 'h-32',
                                      )}
                                      title="Preview image"
                                    >
                                      {imageAttachments.length === 1 ? (
                                        <img
                                          src={src}
                                          alt={a.originalName || 'photo'}
                                          className="block rounded-2xl"
                                          style={{ maxWidth: '100%', maxHeight: 240, width: 'auto', height: 'auto' }}
                                        />
                                      ) : (
                                        <img
                                          src={src}
                                          alt={a.originalName || 'photo'}
                                          className="h-full w-full object-contain"
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {gifOnly ? (
                              <button type="button" onClick={() => setMediaPreview({ src: msg.gif!.url, name: msg.gif?.title || 'GIF' })} className="block">
                                <img src={msg.gif!.url} alt={msg.gif?.title || 'GIF'} className="rounded-2xl block" style={{ maxWidth: '100%', maxHeight: 220, width: 'auto', height: 'auto' }} />
                              </button>
                            ) : voiceAtt ? (
                              <PopupVoicePlayer convId={conv._id} msgId={msg._id} duration={voiceAtt.duration} own={isOwn} crmToken={crmToken} />
                            ) : msg.type === 'poll' && msg.poll ? (
                              <PopupPollCard poll={msg.poll} uid={crmUserId || ''} isOwn={isOwn} accentColor={accentColor} onVote={(optId) => handleVotePoll(msg._id, optId)} />
                            ) : msg.type === 'event' && msg.event ? (
                              <PopupEventCard event={msg.event} uid={crmUserId || ''} isOwn={isOwn} accentColor={accentColor} onRsvp={(r) => handleRsvpEvent(msg._id, r)} />
                            ) : msg.type !== 'image'
                              ? emojiOnly
                                ? <span className="block text-[32px] leading-none">{msg.content}</span>
                                : renderContent(msg, isOwn)
                              : msg.content ? <span>{msg.content}</span> : null}
                            {videoAttachments.length > 0 && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                {videoAttachments.map((a: SSAttachment, i: number) => (
                                  <video key={i} controls preload="metadata" className="rounded-xl block" style={{ maxWidth: 240, maxHeight: 200 }}>
                                    <source src={a.url} type={a.mimeType || 'video/mp4'} />
                                  </video>
                                ))}
                              </div>
                            )}
                            {fileAttachments.length > 0 && (
                              <div className="flex flex-col gap-1 mt-1">
                                {fileAttachments.map((a: SSAttachment, i: number) => (
                                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" download={a.originalName}
                                    className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]', isOwn ? 'bg-white/15' : 'bg-black/5')}>
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate flex-1">{a.originalName || 'Attachment'}</span>
                                    <Download className="h-3 w-3 shrink-0 opacity-60" />
                                  </a>
                                ))}
                              </div>
                            )}
                            {msg.isEdited && <span style={{ fontSize: 8, opacity: 0.45, marginLeft: 3 }}>(edited)</span>}
                            {!hideTime && (
                              <div className={cn('flex items-center gap-1 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
                                <span className={cn('text-[11px]', isOwn && !bareMessage ? 'text-white/60' : 'text-muted-foreground')}>{msgTime(msg.createdAt)}</span>
                                {isOwn && seenMembers.length === 0 && <Check className={cn('h-2.5 w-2.5', bareMessage ? 'text-muted-foreground' : 'text-white/50')} />}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Seen avatars — outside the bubble so they're always visible */}
                        {isOwn && seenMembers.length > 0 && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5 px-0.5">
                            {seenMembers.slice(0, 4).map(m => (
                              <div key={m._id} title={`Seen by ${m.fullName}`}
                                className="h-3.5 w-3.5 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white"
                                style={{ fontSize: 6, background: stringToColor(m.fullName), border: '1px solid var(--background, #fff)' }}>
                                {m.avatar
                                  ? <img src={resolveImageUrl(m.avatar)} alt="" className="w-full h-full object-cover" />
                                  : m.fullName[0]?.toUpperCase()}
                              </div>
                            ))}
                            {seenMembers.length > 4 && <span className="text-[8px] text-muted-foreground">+{seenMembers.length - 4}</span>}
                          </div>
                        )}
                        {/* Reaction pills */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                            {msg.reactions.map(r => {
                              const mine = (r.users || []).includes(crmUserId || '');
                              const whoArr = (r.users || []).map((uid: string) => {
                                const member = conv.members?.find((x) => x._id === uid);
                                return member?.fullName || '';
                              }).filter(Boolean);
                              const popId = msg._id + ':' + r.emoji;
                              const showWhoReacted = (el: HTMLElement) => {
                                if (!whoArr.length) return;
                                const rect = el.getBoundingClientRect();
                                setWhoReactedPop({ id: popId, emoji: r.emoji, names: whoArr, top: rect.top - 6, left: isOwn ? undefined : rect.left, right: isOwn ? window.innerWidth - rect.right : undefined });
                              };
                              return (
                                <div key={r.emoji} className="relative"
                                  onMouseEnter={(e) => showWhoReacted(e.currentTarget)}
                                  onMouseLeave={() => setWhoReactedPop(null)}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
                                        if (mine) handleReact(msg._id, r.emoji);
                                        else showWhoReacted(e.currentTarget);
                                      } else {
                                        handleReact(msg._id, r.emoji);
                                      }
                                    }}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] cursor-pointer transition-all border"
                                    style={mine
                                      ? { borderColor: accentColor, background: `${accentColor}1a`, color: accentColor }
                                      : { borderColor: 'var(--border)', background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                                    title={mine ? `Remove ${r.emoji} reaction` : `React with ${r.emoji}`}
                                    aria-label={mine ? `Remove ${r.emoji} reaction` : `React with ${r.emoji}`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span style={{ fontSize: 9 }}>{r.users.length}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t border-border/50 bg-card">
              {mentionQuery !== null && mentionOptions.length > 0 && (
                <div className="px-1 pt-1 pb-0.5 border-b border-border/40 max-h-32 overflow-y-auto">
                  {mentionOptions.map((opt, idx) => (
                    <button key={opt.id}
                      onMouseDown={e => { e.preventDefault(); insertMention(opt.name); }}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[13px] transition-colors hover:bg-muted/60 text-foreground"
                      style={idx === mentionIdx ? { background: `${accentColor}1a`, color: accentColor } : undefined}
                    >
                      <span className="font-semibold" style={{ color: accentColor }}>@{opt.id === 'all' ? opt.name : opt.fullName}</span>
                      {opt.id === 'all' && <span className="text-muted-foreground truncate">{opt.fullName}</span>}
                    </button>
                  ))}
                </div>
              )}
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40" style={{ background: `${accentColor}0d` }}>
                  <div className="w-0.5 self-stretch rounded-full" style={{ background: accentColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold" style={{ color: accentColor }}>{replyTo.sender?.fullName}</div>
                    <div className="text-[12px] text-muted-foreground truncate">{messagePreviewText(replyTo.content) || '📎 Attachment'}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {/* ── FB Messenger-style bottom toolbar ── */}
              {pendingAttachments.length > 0 && (
                <div className="border-b border-border/40">
                  <div className="flex items-center justify-between px-3 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setAttachmentsCollapsed(v => !v)}
                      className="flex items-center gap-1 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', attachmentsCollapsed && '-rotate-90')} />
                      {pendingAttachments.length} attachment{pendingAttachments.length === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPendingAttachments}
                      className="py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                      title="Remove all attachments"
                    >
                      Clear all
                    </button>
                  </div>
                  {!attachmentsCollapsed && (
                    <div className="flex items-end gap-2 overflow-x-auto px-3 pb-2 pt-1">
                      {pendingAttachments.map((item, index) => {
                        const isImage = item.file.type.startsWith('image/');
                        const isVideo = item.file.type.startsWith('video/');
                        return (
                          <div key={`${item.file.name}-${index}`} className={cn(
                            'relative shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted',
                            isImage || isVideo ? 'h-18 max-w-40' : 'h-18 w-36'
                          )}>
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setMediaPreview({ src: item.previewUrl, name: item.file.name, type: 'image' })}
                                className="block h-full"
                                title="Preview image"
                              >
                                <img src={item.previewUrl} alt={item.file.name} className="h-full w-auto max-w-40 object-contain bg-black/10" />
                              </button>
                            ) : isVideo ? (
                              <button
                                type="button"
                                onClick={() => setMediaPreview({ src: item.previewUrl, name: item.file.name, type: 'video' })}
                                className="relative block h-full"
                                title="Preview video"
                              >
                                <video src={item.previewUrl} className="h-full w-auto max-w-40 object-contain bg-black/20" muted preload="metadata" />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Play className="h-6 w-6 text-white drop-shadow" fill="white" />
                                </span>
                              </button>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold text-muted-foreground">
                                {item.file.name}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removePendingAttachment(index)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                              title="Remove attachment"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {pendingGif && (
                <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                    <img src={pendingGif.url} alt={pendingGif.title || 'GIF'} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPendingGif(null)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                      title="Remove GIF"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground">GIF ready to send</span>
                </div>
              )}
              {recording ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className={cn('h-2 w-2 rounded-full bg-red-500 shrink-0', !recPaused && 'animate-pulse')} />
                  <span className="flex-1 text-[13px] font-medium text-foreground">{fmtDuration(recSeconds)}{recPaused ? ' · paused' : ''}</span>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                    title="Cancel recording"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePauseRecording}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                    title={recPaused ? 'Resume recording' : 'Pause recording'}
                  >
                    {recPaused ? <Mic className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: accentColor }}
                    title="Send voice message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
              <>
              <div className="flex items-center gap-1 overflow-x-auto px-2 pt-1.5 no-scrollbar">
                <select
                  value={composerFontFamily}
                  onPointerDown={() => rememberComposerSelection()}
                  onChange={event => applyComposerFontFamily(event.target.value as SS4FontFamilyId)}
                  className="h-7 w-24 shrink-0 rounded-md border border-border bg-muted/60 px-1.5 text-[10px] text-foreground outline-none"
                  aria-label="Font family"
                  title="Choose a font before typing or apply it to selected text"
                >
                  <option value="" disabled>Font</option>
                  {SS4_FONT_FAMILIES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <select
                  value={composerFontSize}
                  onPointerDown={() => rememberComposerSelection()}
                  onChange={event => applyComposerFontSize(Number.parseInt(event.target.value, 10) as SS4FontSize)}
                  className="h-7 w-14 shrink-0 rounded-md border border-border bg-muted/60 px-1 text-[10px] text-foreground outline-none"
                  aria-label="Font size"
                  title="Choose a size before typing or apply it to selected text"
                >
                  <option value="" disabled>Size</option>
                  {SS4_FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    applyComposerInlineFormat('bold');
                  }}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-md flex items-center justify-center transition-colors hover:bg-muted',
                    composerActiveFormats.bold && 'bg-primary/15 text-primary',
                  )}
                  title="Bold before typing or selected text"
                  aria-pressed={composerActiveFormats.bold}
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    applyComposerInlineFormat('italic');
                  }}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-md flex items-center justify-center transition-colors hover:bg-muted',
                    composerActiveFormats.italic && 'bg-primary/15 text-primary',
                  )}
                  title="Italic before typing or selected text"
                  aria-pressed={composerActiveFormats.italic}
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    applyComposerInlineFormat('underline');
                  }}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-md flex items-center justify-center transition-colors hover:bg-muted',
                    composerActiveFormats.underline && 'bg-primary/15 text-primary',
                  )}
                  title="Underline before typing or selected text"
                  aria-pressed={composerActiveFormats.underline}
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    applyComposerInlineFormat('strike');
                  }}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-md flex items-center justify-center transition-colors hover:bg-muted',
                    composerActiveFormats.strike && 'bg-primary/15 text-primary',
                  )}
                  title="Strikethrough before typing or selected text"
                  aria-pressed={composerActiveFormats.strike}
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={event => {
                      event.preventDefault();
                      rememberComposerSelection();
                      applyComposerTextColor(color);
                    }}
                    className="relative h-5 w-5 shrink-0 rounded-full border transition-transform hover:scale-110"
                    style={{
                      background: color,
                      borderColor:
                        composerTextColor === color
                          ? '#60a5fa'
                          : color === '#ffffff'
                            ? 'rgba(255,255,255,0.45)'
                            : 'rgba(255,255,255,0.25)',
                      boxShadow:
                        composerTextColor === color
                          ? '0 0 0 2px rgba(0,0,0,0.35), 0 0 0 4px #60a5fa'
                          : undefined,
                    }}
                    aria-pressed={
                      composerTextColor === color
                    }
                    title={`Text color ${color}`}
                  >
                    {composerTextColor === color && (
                      <Check
                        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          color:
                            color === '#ffffff' || color === '#facc15'
                              ? '#111827'
                              : '#ffffff',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 items-center gap-1 px-2 py-1.5">
                {/* Left icon buttons */}
                <input ref={fileRef} type="file" multiple hidden onChange={e => { stageFiles(e.target.files); e.target.value = ''; }} />
                <div className="relative shrink-0" ref={attachMenuRef}>
                  <button title="Add" onClick={() => setAttachMenuOpen(v => !v)}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors" style={{ color: accentColor }}>
                    <Plus className="h-5 w-5" />
                  </button>
                  {attachMenuOpen && (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-xl border border-border py-1 shadow-xl" style={{ background: 'var(--popover)' }}>
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] text-popover-foreground hover:bg-muted/60"
                        onClick={() => { setAttachMenuOpen(false); if (fileRef.current) { fileRef.current.accept = ''; fileRef.current.click(); } }}
                      >
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" /> File
                      </button>
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] text-popover-foreground hover:bg-muted/60"
                        onClick={() => { setAttachMenuOpen(false); setPollModalOpen(true); }}
                      >
                        <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" /> Poll
                      </button>
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] text-popover-foreground hover:bg-muted/60"
                        onClick={() => { setAttachMenuOpen(false); setEventModalOpen(true); }}
                      >
                        <CalendarPlus className="h-4 w-4 shrink-0 text-muted-foreground" /> Event
                      </button>
                    </div>
                  )}
                </div>
                <button title="Photo or video" onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*,video/*'; fileRef.current.click(); } }}
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors" style={{ color: accentColor }}>
                  <ImageIcon className="h-4.5 w-4.5" />
                </button>
                <div className="relative shrink-0" ref={gifRef}>
                  <button title="GIF" onClick={() => setGifOpen(v => !v)}
                    className="h-8 px-1.5 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors font-extrabold text-[11px] tracking-tight" style={{ color: accentColor }}>
                    GIF
                  </button>
                  {gifOpen && <PopupGifPicker onPick={selectGif} onClose={() => setGifOpen(false)} anchorRef={gifRef} boundaryRef={popupShellRef} />}
                </div>
                <button
                  type="button"
                  title={recording ? 'Stop recording' : 'Record a voice message'}
                  onClick={() => (recording ? stopRecording() : startRecording())}
                  className={cn('shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors', !recording && 'hover:bg-muted/60')}
                  style={recording ? { background: '#ef4444', color: '#fff' } : { color: accentColor }}
                >
                  {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4.5 w-4.5" />}
                </button>

                {/* Text input */}
                <div className="relative flex min-w-0 max-w-full flex-1 items-center bg-muted/60 rounded-full px-3" style={{ minHeight: 34 }}>
                  {!composerHasText && (
                    <span className="absolute left-3 text-[15px] text-muted-foreground/55 pointer-events-none select-none">Aa</span>
                  )}
                  <div
                    ref={inputRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBeforeInput={handleComposerTypographyBeforeInput}
                    onInput={event => {
                      normalizeRichEditorFontSizeElements(
                        inputRef.current,
                        composerFontSize,
                      );
                      handleTyping(event);
                      rememberComposerSelection();
                    }}
                    onFocus={() => {
                      rememberComposerSelection();
                      refreshComposerCaretFormats();
                    }}
                    onSelect={() => {
                      rememberComposerSelection();
                      refreshComposerCaretFormats();
                    }}
                    onMouseUp={() => {
                      rememberComposerSelection();
                      refreshComposerCaretFormats();
                    }}
                    onKeyUp={() => {
                      rememberComposerSelection();
                      refreshComposerCaretFormats();
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={e => {
                      const pastedFiles = Array.from(e.clipboardData?.items || [])
                        .filter(item => item.kind === 'file')
                        .map(item => item.getAsFile())
                        .filter((f): f is File => !!f);
                      if (pastedFiles.length > 0) {
                        e.preventDefault();
                        stageFiles(pastedFiles);
                        return;
                      }
                      const text = e.clipboardData?.getData('text/plain') || '';
                      const html = e.clipboardData?.getData('text/html') || '';
                      const shortcutPlainText = pastePlainTextShortcutRef.current;
                      pastePlainTextShortcutRef.current = false;
                      if (text.trim()) pastedPlainTextRef.current = [pastedPlainTextRef.current, text].filter(Boolean).join('\n');
                      const plainText = clipboardPayloadToPlainText(text, html);
                      if (!plainText && !html) return;

                      e.preventDefault();
                      const usePlainText = pasteMode === 'plain' || shortcutPlainText || richPasteDropsVinLikeToken(text, html);
                      document.execCommand(
                        usePlainText ? 'insertText' : 'insertHTML',
                        false,
                        usePlainText ? plainText : clipboardPayloadToRichEditorHtml(text, html),
                      );
                      requestAnimationFrame(() => {
                        const el = inputRef.current;
                        if (el) {
                          normalizeRichEditorListExitArtifacts(el);
                          const nextText = el.innerText.replace(/\n$/, '');
                          syncComposerText(nextText, true);
                          inspectMentionAnywhere(nextText);
                        }
                      });
                    }}
                    onBlur={() => setTimeout(() => { setMentionQuery(null); setMentionAnchor(-1); }, 150)}
                    className="w-full min-w-0 max-w-full overflow-x-hidden outline-none"
                    style={{ fontSize: 15, minHeight: '1.25rem', maxHeight: 80, overflowY: 'auto', overflowX: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.4', caretColor: 'var(--foreground)' }}
                  />
                </div>

                {/* Right buttons */}
                {composerHasText || pendingAttachments.length > 0 || pendingGif ? (
                  <button title="Send" onClick={handleSend} disabled={sending}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors disabled:opacity-40" style={{ color: accentColor }}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                ) : (
                  <button title="Like" onClick={handleSendThumbsUp} disabled={sending}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors disabled:opacity-40" style={{ color: accentColor }}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : conv.theme?.emoji ? (
                      <span className="text-[18px] leading-none">{conv.theme.emoji}</span>
                    ) : <ThumbsUp className="h-4 w-4" />}
                  </button>
                )}
              </div>
              </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Fixed action bar portal (FB Messenger style: 3 buttons) ── */}
      {barPos && hovMsg && typeof document !== 'undefined' && createPortal(
        <div
          data-supraspace-action-ui="true"
          className={cn('fixed z-9998 flex items-center gap-0.5 px-0.5 py-0.5', barPos.isOwn && 'flex-row-reverse')}
          style={{
            top: barPos.top,
            left: barPos.left,
          }}
          onPointerEnter={handleBarEnter}
          onPointerLeave={handleBarLeave}
          onPointerDown={event => {
            event.stopPropagation();
            handleBarEnter();
          }}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
        >
          {/* Emoji react button — opens quick-react popup */}
          <button title="React"
            className="hover:bg-white/10 rounded-full p-1.5 transition-colors"
            style={{ color: quickReactMsgId === hovMsg ? '#5b7cf6' : 'rgba(255,255,255,0.55)' }}
            onClick={(e) => {
              e.stopPropagation();
              if (quickReactMsgId === hovMsg) {
                setQuickReactMsgId(null); setQuickReactPos(null);
              } else {
                const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const shell = popupShellRef.current?.getBoundingClientRect();
                const qMinLeft = (shell?.left ?? 8) + 8;
                const qMaxLeft = (shell?.right ?? window.innerWidth) - 240 - 8;
                setQuickReactMsgId(hovMsg);
                setQuickReactPos({ top: btn.top - 52, left: Math.max(qMinLeft, Math.min(btn.left - 4, qMaxLeft)) });
              }
            }}
          >
            <Smile className="h-4 w-4" />
          </button>
          {/* Reply */}
          <button title="Reply"
            className="hover:bg-white/10 rounded-full p-1.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onClick={() => handleReply(hovMsg)}
          >
            <Reply className="h-4 w-4" />
          </button>
          {/* More actions */}
          <button
            type="button"
            title="More actions"
            className="hover:bg-white/10 rounded-full p-1.5 transition-colors"
            style={{ color: moreMenuMsgId === hovMsg ? '#5b7cf6' : 'rgba(255,255,255,0.55)' }}
            onPointerDown={event => {
              event.stopPropagation();
              handleBarEnter();
            }}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              handleBarEnter();

              const messageId = hovMsg;
              if (!messageId) return;

              const btn = (event.currentTarget as HTMLElement).getBoundingClientRect();
              if (moreMenuMsgIdRef.current === messageId) {
                moreMenuMsgIdRef.current = null;
                setMoreMenuMsgId(null);
                setMoreMenuPos(null);
                return;
              }

              const shell = popupShellRef.current?.getBoundingClientRect();
              const ddH = 220;
              const top = btn.bottom + 4 + ddH > window.innerHeight - 8
                ? btn.top - ddH - 4
                : btn.bottom + 4;
              const left = Math.max(
                (shell?.left ?? 8) + 8,
                Math.min(btn.left, (shell?.right ?? window.innerWidth) - 208 - 8),
              );

              moreMenuMsgIdRef.current = messageId;
              setMoreMenuMsgId(messageId);
              setMoreMenuPos({ top, left });
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>,
        document.body
      )}

      {/* ── "Who reacted" tooltip (portal so it can never clip against the scrollable message list) ── */}
      {whoReactedPop && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-9999 px-2.5 py-1.5 rounded-lg text-[10px] min-w-25 max-w-42.5 pointer-events-none"
          style={{
            top: whoReactedPop.top,
            left: whoReactedPop.left,
            right: whoReactedPop.right,
            transform: 'translateY(-100%)',
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <div className="text-sm text-center mb-1">{whoReactedPop.emoji}</div>
          {whoReactedPop.names.map((name, i) => (
            <div key={i} className="text-popover-foreground/80 leading-tight truncate">{name}</div>
          ))}
        </div>,
        document.body
      )}

      {/* ── Quick-react popup (6 emoji + full-picker button) ── */}
      {quickReactMsgId && quickReactPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={quickReactRef}
          data-supraspace-action-ui="true"
          className="fixed z-9999 flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            top: quickReactPos.top,
            left: quickReactPos.left,
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
          onMouseEnter={handleBarEnter}
          onMouseLeave={handleBarLeave}
        >
          {(conv.viewerQuickReactions?.length ? conv.viewerQuickReactions : DEFAULT_QUICK_REACTIONS).map(emoji => (
            <button key={emoji}
              title={emoji}
              className="text-xl leading-none hover:scale-125 transition-transform"
              style={{ lineHeight: 1 }}
              onClick={() => { handleReact(quickReactMsgId, emoji); setQuickReactMsgId(null); setQuickReactPos(null); }}
            >{emoji}</button>
          ))}
          <button
            title="More reactions"
            className="flex items-center justify-center h-6 w-6 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors ml-0.5"
            style={{ fontSize: 16, fontWeight: 700 }}
            onClick={(e) => { openEmojiPickerForMsg(quickReactMsgId, e); setQuickReactMsgId(null); setQuickReactPos(null); }}
          >+</button>
          <button
            title="Customize your quick reactions"
            className="flex items-center justify-center h-6 w-6 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => { setChannelSettingsTab('reactions'); setQuickReactMsgId(null); setQuickReactPos(null); }}
          ><Settings2 className="h-3.5 w-3.5" /></button>
        </div>,
        document.body
      )}

      {/* ── More-actions dropdown portal ── */}
      {moreMenuMsgId && moreMenuPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={moreMenuRef}
          data-supraspace-action-ui="true"
          className="rounded-xl overflow-hidden"
          onPointerEnter={handleBarEnter}
          onPointerLeave={() => {
            if (!moreMenuMsgIdRef.current) handleBarLeave();
          }}
          onPointerDown={event => {
            event.stopPropagation();
            handleBarEnter();
          }}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
          style={{
            position: 'fixed', zIndex: 9999,
            top: moreMenuPos.top, left: moreMenuPos.left,
            minWidth: 208,
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
        >
          {(() => {
            const msg = messages.find(m => m._id === moreMenuMsgId);
            const isOwnMsg = msg?.sender?._id === crmUserId;
            const imgAtt = msg?.attachments?.find((a) => a.mimeType?.startsWith('image/'));
            const canEditMsg = isOwnMsg && !!msg && !msg.isDeleted && !['voice', 'poll', 'event', 'gif'].includes(msg.type) && (Boolean(msg.content?.trim()) || (msg.attachments || []).some((a: SSAttachment) => !a.mimeType?.startsWith('audio/')));
            const close = () => { moreMenuMsgIdRef.current = null; setMoreMenuMsgId(null); setMoreMenuPos(null); };
            const isPinned = pinnedMsgIds.has(moreMenuMsgId);
            const row = 'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60';
            const ic = { color: 'var(--muted-foreground)' };
            return (
              <div className="py-1">
                <button className={row} onClick={() => { if (msg) setForwardMsg(msg); close(); }}>
                  <Share2 className="h-4 w-4 shrink-0" style={ic} />
                  <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>Forward message</span>
                </button>
                <button className={row} onClick={() => {
                  setPinnedMsgIds(prev => { const n = new Set(prev); isPinned ? n.delete(moreMenuMsgId) : n.add(moreMenuMsgId); return n; });
                  isPinned ? toast('Message unpinned') : toast.success('Message pinned');
                  close();
                }}>
                  <Pin className="h-4 w-4 shrink-0" style={{ color: isPinned ? '#5b7cf6' : 'rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>{isPinned ? 'Unpin message' : 'Pin message'}</span>
                </button>
                {msg?.content && (
                  <button className={row} onClick={() => {
                    navigator.clipboard.writeText(msg.content)
                      .then(() => toast.success('Message copied'))
                      .catch(() => toast.error('Could not copy message'));
                    close();
                  }}>
                    <Copy className="h-4 w-4 shrink-0" style={ic} />
                    <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>Copy message</span>
                  </button>
                )}
                <button className={row} onClick={() => {
                  const url = `${window.location.origin}/crm/supra-space#ss4-msg-${moreMenuMsgId}`;
                  navigator.clipboard.writeText(url)
                    .then(() => toast.success('Message link copied'))
                    .catch(() => toast.error('Could not copy link'));
                  close();
                }}>
                  <Link2 className="h-4 w-4 shrink-0" style={ic} />
                  <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>Copy message link</span>
                </button>
                {imgAtt && (
                  <button className={row} onClick={async () => {
                    try { await copyImageToClipboard(imgAtt.url); toast.success('Image copied'); }
                    catch { toast.error('Could not copy image'); }
                    close();
                  }}>
                    <Copy className="h-4 w-4 shrink-0" style={ic} />
                    <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>Copy image</span>
                  </button>
                )}
                {isOwnMsg && (
                  <>
                    <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
                    {canEditMsg && (
                      <button className={row} onClick={() => { startEdit(moreMenuMsgId); close(); }}>
                        <Pencil className="h-4 w-4 shrink-0" style={ic} />
                        <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>Edit message</span>
                      </button>
                    )}
                    <button className={row} onClick={() => { handleDelete(moreMenuMsgId); close(); }}>
                      <Trash2 className="h-4 w-4 shrink-0" style={{ color: '#f87171' }} />
                      <span style={{ fontSize: 13, color: '#f87171' }}>Delete message</span>
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* ── Full emoji picker portal ── */}
      {emojiPickerMsg && emojiPickerPos && (
        <EmojiReactionPicker
          position={emojiPickerPos}
          onSelect={(emoji) => handleReact(emojiPickerMsg, emoji)}
          onClose={() => { setEmojiPickerMsg(null); setEmojiPickerPos(null); }}
        />
      )}

      {/* ── Forward message modal ── */}
      {forwardMsg && crmToken && crmUserId && (
        <ForwardModal
          message={forwardMsg}
          token={crmToken}
          myId={crmUserId}
          onClose={() => setForwardMsg(null)}
        />
      )}

      {/* ── Pinned messages modal ── */}
      {pinnedOpen && (
        <PinnedMessagesModal
          messages={messages}
          pinnedMsgIds={pinnedMsgIds}
          onUnpin={(id) => {
            setPinnedMsgIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            toast('Message unpinned');
          }}
          onClose={() => setPinnedOpen(false)}
        />
      )}

      {/* ── Members / invite modal ── */}
      {inviteOpen && (
        <PopupInviteModal
          conv={conv}
          crmToken={crmToken}
          crmUserId={crmUserId}
          onClose={() => setInviteOpen(false)}
          onInvited={() => refreshConversations()}
        />
      )}

      {/* ── Channel settings modal ── */}
      {channelSettingsTab && (
        <PopupChannelSettingsModal
          conv={conv}
          crmToken={crmToken}
          crmUserId={crmUserId}
          initialTab={channelSettingsTab}
          onClose={() => setChannelSettingsTab(null)}
          onSaved={() => refreshConversations()}
        />
      )}

      {/* ── Poll / Event creation modals ── */}
      {pollModalOpen && (
        <PopupPollModal accentColor={accentColor} onClose={() => setPollModalOpen(false)} onCreate={handleCreatePoll} />
      )}
      {eventModalOpen && (
        <PopupEventModal accentColor={accentColor} onClose={() => setEventModalOpen(false)} onCreate={handleCreateEvent} />
      )}

      {/* ── Chat settings dropdown ── */}
      {mediaPreview && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-10020 flex items-center justify-center overflow-hidden bg-black/90 p-4"
          onClick={() => setMediaPreview(null)}
          onWheel={e => {
            e.preventDefault();
            applyMediaPreviewZoom(mediaPreviewZoom + (e.deltaY < 0 ? 0.2 : -0.2));
          }}
        >
          {mediaPreview.type !== 'video' && (
            <div
              className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-white shadow-2xl backdrop-blur"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => applyMediaPreviewZoom(mediaPreviewZoom - 0.25)}
                disabled={mediaPreviewZoom <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-12 text-center text-xs font-semibold tabular-nums">
                {Math.round(mediaPreviewZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => applyMediaPreviewZoom(mediaPreviewZoom + 0.25)}
                disabled={mediaPreviewZoom >= 4}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setMediaPreview(null)}
            title="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          {mediaPreview.type === 'video' ? (
            <video
              src={mediaPreview.src}
              controls
              autoPlay
              className="max-h-[86vh] max-w-[92vw] rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={mediaPreview.src}
              alt={mediaPreview.name}
              draggable={false}
              className="max-h-[86vh] max-w-[92vw] rounded-xl object-contain shadow-2xl transition-transform duration-150"
              style={{
                transform: `scale(${mediaPreviewZoom})`,
                cursor: mediaPreviewZoom > 1 ? 'zoom-out' : 'zoom-in',
              }}
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>,
        document.body
      )}

      {chatSettingsOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={settingsRef}
          style={{
            position: 'fixed',
            top: (() => { const h = headerRef.current?.getBoundingClientRect(); return h ? h.bottom + 4 : 80; })(),
            right: rightPx,
            zIndex: 10001,
            width: 260,
            background: 'var(--popover)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(() => {
            const close = () => { setChatSettingsOpen(false); setMuteMenuOpen(false); };
            const row = 'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 cursor-pointer';
            const ic = 'h-5 w-5 shrink-0';
            const label = (text: string) => <span style={{ fontSize: 14, color: 'var(--popover-foreground)', fontWeight: 500 }}>{text}</span>;
            const sep = <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />;
            return (
              <div className="py-1.5">
                {/* Open in SupraSpace */}
                <button className={row} onClick={() => { close(); router.push('/crm/supra-space'); }}>
                  <ExternalLink className={ic} style={{ color: '#5b7cf6' }} />
                  {label('Open in SupraSpace')}
                </button>

                {sep}

                {/* View pinned messages */}
                <button className={row} onClick={() => {
                  setPinnedOpen(true);
                  close();
                }}>
                  <Pin className={ic} style={{ color: 'var(--muted-foreground)' }} />
                  {label('View pinned messages')}
                </button>

                {/* Members / invite — only for group chats */}
                {conv.type === 'group' && (
                  <button className={row} onClick={() => {
                    setInviteOpen(true);
                    close();
                  }}>
                    <Users className={ic} style={{ color: 'var(--muted-foreground)' }} />
                    {label(`Members (${conv.members.length})`)}
                  </button>
                )}

                {/* Channel settings — nickname, quick reactions, theme */}
                <button className={row} onClick={() => {
                  setChannelSettingsTab('nickname');
                  close();
                }}>
                  <Palette className={ic} style={{ color: 'var(--muted-foreground)' }} />
                  {label('Channel settings')}
                </button>

                {sep}

                {/* Mute notifications — with duration options */}
                {notificationPref.muted ? (
                  <button className={row} onClick={() => { void setMutePref(false, null); close(); }}>
                    <BellOff className={ic} style={{ color: '#f87171' }} />
                    {label('Unmute notifications')}
                  </button>
                ) : (
                  <>
                    <button className={row} onClick={() => setMuteMenuOpen(v => !v)}>
                      <BellOff className={ic} style={{ color: 'rgba(255,255,255,0.5)' }} />
                      {label('Mute notifications')}
                      <ChevronDown className={cn('h-4 w-4 ml-auto shrink-0 transition-transform', muteMenuOpen && 'rotate-180')} style={{ color: 'var(--muted-foreground)' }} />
                    </button>
                    {muteMenuOpen && (
                      <div className="pb-1">
                        {MUTE_DURATION_OPTIONS.map(opt => (
                          <button
                            key={opt.label}
                            className="w-full flex items-center gap-2 pl-11 pr-4 py-2 text-left transition-colors hover:bg-muted/60"
                            onClick={() => {
                              void setMutePref(true, opt.ms ? new Date(Date.now() + opt.ms).toISOString() : null);
                              close();
                            }}
                          >
                            <span style={{ fontSize: 13, color: 'var(--popover-foreground)' }}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Mark as unread */}
                <button className={row} onClick={() => {
                  markConversationUnread(conv._id, true);
                  close();
                  onClose();
                }}>
                  <MailOpen className={ic} style={{ color: 'var(--muted-foreground)' }} />
                  {label('Mark as unread')}
                </button>

                {/* Archive chat */}
                <button className={row} onClick={() => {
                  close();
                  onClose();
                  archiveConversation(conv._id, true)
                    .then(() => toast.success('Conversation archived'))
                    .catch(() => toast.error('Could not archive conversation'));
                }}>
                  <Archive className={ic} style={{ color: 'var(--muted-foreground)' }} />
                  {label('Archive chat')}
                </button>

                {sep}

                {/* Delete / leave conversation */}
                <button
                  className={row}
                  onClick={() => {
                    if (!confirmDelete) { setConfirmDelete(true); return; }
                    close();
                    onClose();
                    deleteConversation(conv._id)
                      .then(({ permanent }) => toast.success(permanent ? 'Conversation deleted for everyone' : conv.type === 'group' ? 'You left the conversation' : 'Conversation removed'))
                      .catch(() => toast.error('Could not delete conversation'));
                  }}
                >
                  <Trash2 className={ic} style={{ color: confirmDelete ? '#f87171' : 'var(--muted-foreground)' }} />
                  {confirmDelete
                    ? <span style={{ fontSize: 14, color: '#f87171', fontWeight: 600 }}>Click again to confirm</span>
                    : label(conv.type === 'group' ? 'Leave conversation' : 'Delete conversation')}
                </button>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </>
  );
}

function ChatOverflowDock({
  hiddenConvs,
  crmUserId,
  onOpen,
  onClose,
}: {
  hiddenConvs: SSConv[];
  crmUserId: string | null;
  onOpen: (convId: string) => void;
  onClose: (convId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const dockRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const hiddenCount = hiddenConvs.length;
  // ChatOverflowDock only ever renders while MAX_VISIBLE_POPUPS full-height
  // popups are on screen (hidden = overflow *beyond* those), so it must clear
  // the full POPUP_H to avoid sitting on top of the rightmost popup — right:
  // POPUP_RIGHT alone isn't enough, since that's the same edge the popups
  // themselves dock to.
  const dockBottom = POPUP_H + 12;

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!dockRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (hiddenCount === 0) return null;

  return (
    <>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="fixed z-52 w-72 overflow-hidden rounded-2xl border bg-card shadow-2xl"
          style={{ borderColor: 'rgba(255,255,255,0.12)', right: POPUP_RIGHT, bottom: dockBottom + 48 }}
        >
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
            <span className="text-xs font-bold text-foreground">Hidden chats</span>
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-400">+{hiddenCount}</span>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {hiddenConvs.map((conv) => {
              const name = getDisplayName(conv, crmUserId);
              const avatar = getAvatarSrc(conv, crmUserId);
              const unreadCount = conv.unreadCount || 0;
              const preview = unreadCount >= 2
                ? `${unreadCount} new messages`
                : conv.lastMessage?.isDeleted
                  ? 'Message deleted'
                  : messagePreviewText(conv.lastMessage?.content) || (conv.lastMessage ? 'Attachment' : 'No messages yet');
              return (
                <div
                  key={conv._id}
                  className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/60"
                >
                  <button
                    type="button"
                    onClick={() => { onOpen(conv._id); setOpen(false); }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    title={`Open ${name}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {avatar && <AvatarImage src={resolveImageUrl(avatar)} />}
                      <AvatarFallback className="text-[10px] font-semibold bg-blue-500 text-white">{initials(name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{preview}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onClose(conv._id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
                    title="Close hidden chat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
      <div
        ref={dockRef}
        className="fixed z-51"
        style={{ right: POPUP_RIGHT, bottom: dockBottom }}
      >
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border bg-blue-600 text-white shadow-2xl transition-transform hover:scale-105"
          style={{ borderColor: 'rgba(255,255,255,0.18)' }}
          title={`${hiddenCount} hidden chat${hiddenCount === 1 ? '' : 's'}`}
        >
        <MessageCircle className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white ring-2 ring-background">
          +{hiddenCount}
        </span>
      </button>
    </div >
    </>
  );
}

// ─── Minimized chat heads — grouped into a compact bubble row (Facebook-style) ──
const MINIMIZED_BUBBLE_W = 48;

function MinimizedDock({
  conversations,
  crmUserId,
  onExpand,
  onClose,
}: {
  conversations: SSConv[];
  crmUserId: string | null;
  onExpand: (convId: string) => void;
  onClose: (convId: string) => void;
}) {
  if (conversations.length === 0) return null;
  return (
    <div className="fixed bottom-0 z-50 flex items-end gap-2 px-2 pb-2" style={{ right: POPUP_RIGHT }}>
      {conversations.map((conv) => {
        const name = getDisplayName(conv, crmUserId);
        const avatar = getAvatarSrc(conv, crmUserId);
        const accent = conv.theme?.accent || '#5b7cf6';
        const unread = conv.unreadCount || 0;
        return (
          <div key={conv._id} className="group relative shrink-0">
            <button
              type="button"
              onClick={() => onExpand(conv._id)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-105"
              style={{ borderColor: 'var(--border)' }}
              title={`Open ${name}`}
            >
              <Avatar className="h-10 w-10">
                {avatar && <AvatarImage src={resolveImageUrl(avatar)} />}
                <AvatarFallback className="text-[11px] font-semibold text-white" style={{ background: accent }}>{initials(name)}</AvatarFallback>
              </Avatar>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-extrabold leading-none text-white ring-2 ring-background">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(conv._id); }}
              className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
              style={{ background: 'var(--muted-foreground)' }}
              title="Close chat"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Manager ──────────────────────────────────────────────────────────────────
export function ChatPopupManager() {
  const { conversations, openChats, minimizedChats, crmUserId, openChatPopup, closeChatPopup, toggleMinimize } = useSupraSpaceMessenger();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (openChats.length === 0) return null;
  if (pathname === '/crm/supra-space') return null;
  if (isMobile) return null;

  // Minimized chats collapse into a compact bubble row (Facebook-style) instead of
  // each keeping a full-width header bar — they stay mounted (socket/messages alive)
  // but render nothing visible; only expanded chats occupy popup "slots".
  const minimizedIds = openChats.filter((id) => minimizedChats.has(id));
  const expandedIds = openChats.filter((id) => !minimizedChats.has(id));
  const visibleExpandedIds = expandedIds.slice(0, MAX_VISIBLE_POPUPS);
  const hiddenExpandedIds = expandedIds.slice(MAX_VISIBLE_POPUPS);
  const hiddenConvs = hiddenExpandedIds
    .map((convId) => conversations.find((c) => c._id === convId))
    .filter((conv): conv is SSConv => Boolean(conv));
  const minimizedConvs = minimizedIds
    .map((convId) => conversations.find((c) => c._id === convId))
    .filter((conv): conv is SSConv => Boolean(conv));
  const dockOffsetPx = minimizedConvs.length > 0 ? minimizedConvs.length * MINIMIZED_BUBBLE_W : 0;
  const baseOffsetPx = POPUP_RIGHT + dockOffsetPx;

  return (
    <>
      <style>{POPUP_RICH_EDIT_CSS}</style>
      {visibleExpandedIds.map((convId, index) => {
        const conv = conversations.find((c) => c._id === convId);
        if (!conv) return null;
        return (
          <ChatPopup
            key={convId}
            conv={conv}
            stackIndex={index}
            baseOffsetPx={baseOffsetPx}
            isMinimized={false}
            onClose={() => closeChatPopup(convId)}
            onToggleMinimize={() => toggleMinimize(convId)}
          />
        );
      })}
      {minimizedIds.map((convId) => {
        const conv = conversations.find((c) => c._id === convId);
        if (!conv) return null;
        return (
          <ChatPopup
            key={convId}
            conv={conv}
            stackIndex={0}
            baseOffsetPx={baseOffsetPx}
            isMinimized
            onClose={() => closeChatPopup(convId)}
            onToggleMinimize={() => toggleMinimize(convId)}
          />
        );
      })}
      <MinimizedDock
        conversations={minimizedConvs}
        crmUserId={crmUserId}
        onExpand={(convId) => toggleMinimize(convId)}
        onClose={(convId) => closeChatPopup(convId)}
      />
      <ChatOverflowDock
        hiddenConvs={hiddenConvs}
        crmUserId={crmUserId}
        onOpen={openChatPopup}
        onClose={closeChatPopup}
      />
    </>
  );
}
