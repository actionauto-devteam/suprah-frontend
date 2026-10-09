'use client';

import * as React from 'react';
import { stripResidualSupraSpaceInlineControlMarkers } from '@/lib/supra-space-message-formatting';
import { findSupraSpaceMarkdownLink, splitSupraSpaceTrailingUrlPunctuation } from '@/lib/supra-space-links';

const FONT_FAMILIES = {
  default: 'inherit',
  arial: 'Arial, sans-serif',
  aptos: 'Aptos, Calibri, sans-serif',
  calibri: 'Calibri, Arial, sans-serif',
  georgia: 'Georgia, serif',
  times: "'Times New Roman', serif",
  verdana: 'Verdana, sans-serif',
  trebuchet: "'Trebuchet MS', sans-serif",
  tahoma: 'Tahoma, sans-serif',
  courier: "'Courier New', monospace",
} as const;

const FONT_SIZES = new Set([10, 12, 14, 16, 18, 20, 24, 28, 32, 36]);

type FormatToken = {
  start: number;
  end: number;
  type: 'color' | 'highlight' | 'font' | 'size' | 'bold' | 'strike' | 'underline' | 'italic' | 'code' | 'link';
  color?: string;
  fontFamily?: keyof typeof FONT_FAMILIES;
  fontSize?: number;
  contentStart?: number;
  contentEnd?: number;
  linkText?: string;
  linkHref?: string;
};

function readableColorClass(color?: string, isOwn?: boolean): string | undefined {
  const raw = color?.trim().replace(/^#/, '');
  if (!raw || (raw.length !== 3 && raw.length !== 6 && raw.length !== 8)) return undefined;
  const expanded = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw.slice(0, 6);
  const channels = [0, 2, 4].map(index => Number.parseInt(expanded.slice(index, index + 2), 16));
  if (!channels.every(Number.isFinite)) return undefined;
  if (channels.every(channel => channel <= 24)) return 'ss4-readable-dark-color';
  if (!isOwn && channels.every(channel => channel >= 238)) return 'ss4-readable-light-color';
  return undefined;
}

function stripTypographyControlTags(value: string): string {
  return value
    .replace(/\{\s*font\s*:\s*[a-z-]+\s*\}/gi, '')
    .replace(/\{\s*\/\s*font\s*\}/gi, '')
    .replace(/\{\s*size\s*:\s*\d{1,3}\s*\}/gi, '')
    .replace(/\{\s*\/\s*size\s*\}/gi, '');
}

function findNextToken(text: string, from: number): FormatToken | null {
  const candidates: FormatToken[] = [];
  const linkMatch = findSupraSpaceMarkdownLink(text, from);
  if (linkMatch) candidates.push({ start: linkMatch.start, end: linkMatch.end, type: 'link', linkText: linkMatch.label, linkHref: linkMatch.href });

  const controlDefinitions: Array<{ kind: 'color' | 'highlight' | 'font' | 'size'; re: RegExp }> = [
    { kind: 'color', re: /\{\s*color\s*:\s*(#[0-9a-f]{3,8})\s*\}/gi },
    { kind: 'highlight', re: /\{\s*highlight\s*:\s*(#[0-9a-f]{3,8})\s*\}/gi },
    { kind: 'font', re: /\{\s*font\s*:\s*([a-z-]+)\s*\}/gi },
    { kind: 'size', re: /\{\s*size\s*:\s*(\d{1,3})\s*\}/gi },
  ];

  controlDefinitions.forEach(({ kind, re }) => {
    re.lastIndex = from;
    const opening = re.exec(text);
    if (!opening) return;
    const closingRe = new RegExp(`\\{\\s*\\/\\s*${kind}\\s*\\}`, 'gi');
    closingRe.lastIndex = opening.index + opening[0].length;
    const closing = closingRe.exec(text);
    if (!closing) return;
    const token: FormatToken = {
      start: opening.index,
      end: closing.index + closing[0].length,
      type: kind,
      contentStart: opening.index + opening[0].length,
      contentEnd: closing.index,
    };
    if (kind === 'color' || kind === 'highlight') token.color = opening[1];
    if (kind === 'font' && opening[1].toLowerCase() in FONT_FAMILIES) token.fontFamily = opening[1].toLowerCase() as keyof typeof FONT_FAMILIES;
    if (kind === 'size' && FONT_SIZES.has(Number.parseInt(opening[1], 10))) token.fontSize = Number.parseInt(opening[1], 10);
    if ((kind !== 'font' || token.fontFamily) && (kind !== 'size' || token.fontSize)) candidates.push(token);
  });

  ([['**', 'bold'], ['~~', 'strike'], ['__', 'underline'], ['`', 'code']] as const).forEach(([marker, type]) => {
    const start = text.indexOf(marker, from);
    if (start < 0) return;
    const end = text.indexOf(marker, start + marker.length);
    if (end > start + marker.length && !text.slice(start + marker.length, end).includes('\n')) candidates.push({ start, end: end + marker.length, type });
  });

  const italicRe = /(?<!\w)_([^_\n]+)_(?!\w)/g;
  italicRe.lastIndex = from;
  const italicMatch = italicRe.exec(text);
  if (italicMatch) candidates.push({ start: italicMatch.index, end: italicMatch.index + italicMatch[0].length, type: 'italic' });

  return candidates.sort((a, b) => a.start - b.start || a.end - b.end)[0] || null;
}

export function renderSupraSpaceRichTextInline(text: string, isOwn: boolean, keyPrefix: string, insideLink = false): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  const pushPlain = (value: string) => {
    if (!value) return;
    const plain = stripTypographyControlTags(value.replace(/\{\s*\/?\s*(?:color|highlight)(?:\s*:\s*#[0-9a-f]{3,8})?\s*\}/gi, ''));
    const tokenPattern = /(https?:\/\/[^\s]+|[@#]\w+(?:\s[A-Z][a-zA-Z]*)?)/gi;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenPattern.exec(plain)) !== null) {
      if (match.index > last) nodes.push(plain.slice(last, match.index));
      const token = match[0];
      const key = `${keyPrefix}-plain-${index++}`;
      if (/^https?:\/\//i.test(token) && !insideLink) {
        const { href, trailing } = splitSupraSpaceTrailingUrlPunctuation(token);
        nodes.push(<React.Fragment key={key}><a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: isOwn ? '#fff' : 'var(--accent-text)', wordBreak: 'break-all' }}>{href}</a>{trailing}</React.Fragment>);
      } else if (/^https?:\/\//i.test(token)) {
        nodes.push(token);
      } else {
        nodes.push(isOwn
          ? <span key={key} className="font-bold" style={{ color: 'rgba(255,255,255,0.95)', background: 'rgba(255,255,255,0.22)', borderRadius: 4, padding: '0 3px' }}>{token}</span>
          : <span key={key} className="font-bold" style={{ color: 'var(--accent-text)' }}>{token}</span>);
      }
      last = match.index + token.length;
    }
    if (last < plain.length) nodes.push(stripResidualSupraSpaceInlineControlMarkers(plain.slice(last)));
  };

  while (cursor < text.length) {
    const token = findNextToken(text, cursor);
    if (!token) {
      pushPlain(text.slice(cursor));
      break;
    }
    if (token.start > cursor) pushPlain(text.slice(cursor, token.start));
    const key = `${keyPrefix}-fmt-${index++}`;
    const inner = text.slice(token.contentStart, token.contentEnd);
    if (token.type === 'color') nodes.push(<span key={key} className={readableColorClass(token.color, isOwn)} style={{ color: token.color }}>{renderSupraSpaceRichTextInline(inner, isOwn, key, insideLink)}</span>);
    else if (token.type === 'highlight') nodes.push(<span key={key} style={{ backgroundColor: token.color, borderRadius: 3, padding: '0 2px' }}>{renderSupraSpaceRichTextInline(inner, isOwn, key, insideLink)}</span>);
    else if (token.type === 'font') nodes.push(<span key={key} style={{ fontFamily: FONT_FAMILIES[token.fontFamily || 'default'] }}>{renderSupraSpaceRichTextInline(inner, isOwn, key, insideLink)}</span>);
    else if (token.type === 'size') nodes.push(<span key={key} style={{ fontSize: `calc(${token.fontSize || 16}px * var(--ss4-message-font-scale, 1))` }}>{renderSupraSpaceRichTextInline(inner, isOwn, key, insideLink)}</span>);
    else if (token.type === 'bold') nodes.push(<strong key={key}>{renderSupraSpaceRichTextInline(text.slice(token.start + 2, token.end - 2), isOwn, key, insideLink)}</strong>);
    else if (token.type === 'strike') nodes.push(<s key={key}>{renderSupraSpaceRichTextInline(text.slice(token.start + 2, token.end - 2), isOwn, key, insideLink)}</s>);
    else if (token.type === 'underline') nodes.push(<u key={key}>{renderSupraSpaceRichTextInline(text.slice(token.start + 2, token.end - 2), isOwn, key, insideLink)}</u>);
    else if (token.type === 'italic') nodes.push(<em key={key}>{renderSupraSpaceRichTextInline(text.slice(token.start + 1, token.end - 1), isOwn, key, insideLink)}</em>);
    else if (token.type === 'link') nodes.push(<a key={key} href={token.linkHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: isOwn ? '#fff' : 'var(--accent-text)', wordBreak: 'break-all' }}>{renderSupraSpaceRichTextInline(token.linkText || '', isOwn, key, true)}</a>);
    else nodes.push(<code key={key} style={{ fontFamily: 'monospace', fontSize: '0.85em', background: 'rgba(128,128,128,0.15)', padding: '1px 4px', borderRadius: 3 }}>{text.slice(token.start + 1, token.end - 1)}</code>);
    cursor = token.end;
  }

  return nodes;
}
