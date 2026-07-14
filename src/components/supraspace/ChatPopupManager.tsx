'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { X, Minus, Send, Loader2, MessageCircle, Check, Reply, Pin, Trash2, Smile, Pencil, Copy, MoreHorizontal, Link2, Share2, MailOpen, Star, Search, Plus, ImageIcon, ThumbsUp, ChevronDown, ExternalLink, Users, BellOff, Archive, Palette, ZoomIn, ZoomOut, Bold, Italic, Underline, Strikethrough, List, TextQuote, Code2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';
import { SSAttachment, SSMessage } from '@/hooks/useSupraSpaceSocket';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { toast } from 'sonner';

// ─── Layout constants ─────────────────────────────────────────────────────────
const POPUP_W     = 400;
const POPUP_GAP   = 8;
const POPUP_RIGHT = 16;
const POPUP_H     = 520;
const HEADER_H    = 48;
const MAX_VISIBLE_POPUPS = 3;
const TEXT_COLORS = ['#ffffff', '#f87171', '#fb923c', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
const MORE_TEXT_COLORS = [
  '#ffffff', '#f3f4f6', '#94a3b8', '#64748b', '#111827',
  '#ef4444', '#f87171', '#fb7185', '#f97316', '#fb923c',
  '#f59e0b', '#facc15', '#84cc16', '#22c55e', '#34d399',
  '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#60a5fa',
  '#6366f1', '#818cf8', '#8b5cf6', '#a78bfa', '#d946ef',
  '#f472b6', '#ec4899', '#be185d',
];
type PendingPopupAttachment = { file: File; previewUrl: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#5b7cf6','#34c97d','#f0a855','#e05b8a','#5bbdf6','#a05bf6','#f65b5b','#5bf6c8'];
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
const MD_SPLIT = /(\{\s*color\s*:\s*#[0-9a-f]{3,8}\s*\}[\s\S]*?\{\s*\/\s*color\s*\}|\*\*[^*\n]+\*\*|~~[^~\n]+~~|__[^_\n]+__|_[^_\n]+_|`[^`\n]+`|https?:\/\/[^\s]+|@\w+(?:\s[A-Z][a-zA-Z]*)?)/gi;

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

function normalizeMessageMarkdownText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
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
    return part.replace(/\{\s*\/?\s*color(?:\s*:\s*#[0-9a-f]{3,8})?\s*\}/gi, '');
  });
}

function renderContent(msg: SSMessage, isOwn: boolean): React.ReactNode {
  const label = MEDIA_LABELS[msg.type];
  if (label) return label;
  const raw = msg.content ?? '';
  const text = normalizeMessageMarkdownForDisplay(raw);
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, li) => {
    if (/^\s*(?:\*\*|__|~~)\s*$/.test(line)) return;
    const renderLine = (() => {
      if (/\*\*\s*$/.test(line) && !/^\s*\*\*/.test(line)) return `**${line.replace(/\*\*\s*$/, '').trimEnd()}**`;
      if (/^\s*\*\*/.test(line) && !/\*\*.*\*\*/.test(line)) return `**${line.replace(/^\s*\*\*/, '').trimStart()}**`;
      return line;
    })();
    if (li > 0) nodes.push(<br key={`br-${li}`} />);
    if (line.startsWith('• ') || line.startsWith('• ')) {
      nodes.push(
        <span key={`l-${li}`} style={{ display: 'block', paddingLeft: 12 }}>
          {'• '}{renderInlineMd(line.slice(2), isOwn, `l-${li}`)}
        </span>
      );
    } else if (/^\d+\.\s/.test(renderLine)) {
      const m = renderLine.match(/^(\d+\.\s)(.*)/);
      nodes.push(
        <span key={`l-${li}`} style={{ display: 'block', paddingLeft: 12 }}>
          {m![1]}{renderInlineMd(m![2], isOwn, `l-${li}`)}
        </span>
      );
    } else if (renderLine.startsWith('> ')) {
      nodes.push(
        <span key={`l-${li}`} style={{ display: 'block', borderLeft: '2px solid', borderColor: isOwn ? 'rgba(255,255,255,0.4)' : '#60a5fa', paddingLeft: 8, opacity: 0.8 }}>
          {renderInlineMd(renderLine.slice(2), isOwn, `l-${li}`)}
        </span>
      );
    } else {
      nodes.push(...renderInlineMd(renderLine, isOwn, `l-${li}`));
    }
  });
  return <>{nodes}</>;
}

// ─── Paste helpers (mirror of SupraSpace, adapted for plain <input>) ─────────

function hasRichFormatting(html: string): boolean {
  return /<(b|strong|i|em|u|s|strike|del|code|li|blockquote|ol|ul|h[1-6])\b/i.test(html)
    || /<font\b[^>]*color\s*=/i.test(html)
    || /style\s*=\s*["'][^"']*(?:font-weight\s*:\s*(?:bold|\d{3,})|font-style\s*:\s*italic|color\s*:\s*[^"';\s][^"';]*)/i.test(html);
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
  return element.getAttribute('data-value')
    || element.getAttribute('data-text')
    || element.getAttribute('data-label')
    || element.getAttribute('aria-valuetext')
    || '';
}

function clipboardHtmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') return el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    const visibleValue = getCopiedElementVisibleText(el);
    if (visibleValue) return visibleValue;
    const inner = Array.from(el.childNodes).map(walk).join('');
    if (['div', 'p', 'li', 'section', 'article'].includes(tag)) return `${inner}\n`;
    return inner;
  };
  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .replace(/ /g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

const VIN_LIKE_TOKEN = /\b(?=[A-HJ-NPR-Z0-9]{17}\b)(?=.*\d)[A-HJ-NPR-Z0-9]{17}\b/g;

function preserveVisibleVinLines(serialized: string, visibleText: string): string {
  const visibleLines = visibleText.replace(/\r\n?/g, '\n').split('\n');
  const vins = visibleText.toUpperCase().match(VIN_LIKE_TOKEN) || [];
  if (!vins.length) return serialized;

  const serializedLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  vins.forEach(vin => {
    if (serialized.toUpperCase().includes(vin)) return;
    const visibleLineIndex = visibleLines.findIndex(line => line.toUpperCase().includes(vin));
    const sourceLine = visibleLineIndex >= 0 ? visibleLines[visibleLineIndex].trim() : vin;
    serializedLines.splice(Math.min(Math.max(visibleLineIndex, 0), serializedLines.length), 0, sourceLine || vin);
    serialized = serializedLines.join('\n');
  });
  return serializedLines.join('\n');
}

function importantVisibleTokens(line: string): string[] {
  return [...line.toUpperCase().matchAll(/\b[A-Z0-9][A-Z0-9-]{5,}\b/g)]
    .map(match => match[0].replace(/-/g, ''))
    .filter(token => token.length >= 6 && /\d/.test(token));
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
  result = result.replace(/\{color:(#[0-9a-f]{3,8})\}\s*\{\/color\}/gi, '');
  let previous = '';
  while (previous !== result) {
    previous = result;
    result = result.replace(
      /\{color:(#[0-9a-f]{3,8})\}([^{}]*)\{\/color\}\s*\{color:\1\}/gi,
      '{color:$1}$2',
    );
  }
  return result;
}

function richPasteDropsVinLikeToken(plainText: string, html: string): boolean {
  if (!plainText || !html) return false;
  const tokens = plainText.toUpperCase().match(VIN_LIKE_TOKEN) || [];
  if (!tokens.length) return false;
  const htmlText = clipboardHtmlToPlainText(html).toUpperCase();
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
  return /\*\*[\s\S]+?\*\*|__[^_\n]+__|~~[^~\n]+~~|^\s*[-*+]\s+\S|^\s*\d+\.\s+\S|^\s*>\s?\S|\{color:#[0-9a-fA-F]{6}\}/m.test(text);
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

function htmlToMarkdown(el: HTMLElement): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') return element.getAttribute('alt') || element.getAttribute('aria-label') || element.getAttribute('title') || '';

    let inner = Array.from(element.childNodes).map(walk).join('');
    if (!inner.trim()) inner = getCopiedElementVisibleText(element);
    if (tag === 'strong' || tag === 'b') inner = `**${inner}**`;
    else if (tag === 'em' || tag === 'i') inner = `_${inner}_`;
    else if (tag === 'u') inner = `__${inner}__`;
    else if (tag === 's' || tag === 'strike' || tag === 'del') inner = `~~${inner}~~`;
    else if (tag === 'code') inner = '`' + inner.replace(/`/g, '') + '`';

    const color = cssColorToHex(element.style?.color || element.getAttribute('color'));
    if (color && inner.trim()) inner = `{color:${color}}${inner}{/color}`;
    if (tag === 'div' || tag === 'p') inner = `\n${inner}`;
    return inner;
  };

  const rootColor = cssColorToHex(el.style.color);
  let markdown = Array.from(el.childNodes).map(walk).join('')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (rootColor && rootColor !== '#ffffff' && markdown) markdown = `{color:${rootColor}}${markdown}{/color}`;
  return markdown;
}

// Converts source HTML (from another app's clipboard) into the editor's HTML dialect
function clipboardHtmlToEditorHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtmlText(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return '';
    if (tag === 'br') return '<br>';
    if (tag === 'img') return escapeHtmlText(el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || '');
    const visibleValue = getCopiedElementVisibleText(el);
    if (visibleValue) return escapeHtmlText(visibleValue);
    const childHtml = (): string => Array.from(el.childNodes).map(c => walk(c)).join('');
    const elColor = cssColorToHex(el.style?.color || el.getAttribute('color') || '');
    const wrapColor = (inner: string): string =>
      elColor && inner.trim() ? `<span style="color:${elColor}">${inner}</span>` : inner;

    switch (tag) {
      case 'strong': case 'b': return wrapColor(`<strong>${childHtml()}</strong>`);
      case 'em': case 'i': return wrapColor(`<em>${childHtml()}</em>`);
      case 'u': return wrapColor(`<u>${childHtml()}</u>`);
      case 's': case 'strike': case 'del': return wrapColor(`<s>${childHtml()}</s>`);
      case 'code': return '`' + childHtml().replace(/<[^>]*>/g, '') + '`';
      case 'font': return wrapColor(childHtml());
      case 'li': return `• ${childHtml()}<br>`;
      case 'ul': return Array.from(el.children).map(li => walk(li)).join('');
      case 'ol': { let i = 1; return Array.from(el.children).map(() => '').join('') || Array.from(el.children).map(li => { const s = walk(li); return s.replace('• ', `${i++}. `); }).join(''); }
      case 'blockquote': return `&gt; ${childHtml()}<br>`;
      case 'div': case 'p': case 'section': case 'article':
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `${childHtml()}<br>`;
      default: {
        const inner = childHtml();
        if (!inner) return inner;
        const fw = el.style?.fontWeight;
        const fi = el.style?.fontStyle;
        const td = el.style?.textDecoration;
        let result = inner;
        if (fw === 'bold' || Number(fw) >= 700) result = `<strong>${result}</strong>`;
        if (fi === 'italic') result = `<em>${result}</em>`;
        if (td?.includes('underline')) result = `<u>${result}</u>`;
        if (td?.includes('line-through')) result = `<s>${result}</s>`;
        return wrapColor(result);
      }
    }
  };
  return Array.from(doc.body.childNodes)
    .map(n => walk(n))
    .join('')
    .replace(/(<br>)+$/g, '')
    .replace(/^(<br>)+/g, '');
}

function markdownTextToEditorHtml(text: string): string {
  const lines = normalizeMessageMarkdownText(text).replace(/\r\n/g, '\n').split('\n');
  const htmlLines = lines.map(line => {
    let marker = '';
    let rest = line;
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const numberedMatch = !bulletMatch && line.match(/^\s*(\d+)\.\s+(.+)$/);
    const quoteMatch = !bulletMatch && !numberedMatch && line.match(/^\s*>\s?(.+)$/);
    if (bulletMatch) { marker = '• '; rest = bulletMatch[1]; }
    else if (numberedMatch) { marker = `${numberedMatch[1]}. `; rest = numberedMatch[2]; }
    else if (quoteMatch) { marker = '&gt; '; rest = quoteMatch[1]; }

    const applyInlineMarkdown = (s: string): string =>
      escapeHtmlText(s)
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_\n]+)__/g, '<u>$1</u>')
        .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');

    const colorTagRe = /\{color:(#[0-9a-fA-F]{6})\}([\s\S]*?)\{\/color\}/g;
    let result = '';
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = colorTagRe.exec(rest)) !== null) {
      result += applyInlineMarkdown(rest.slice(lastIdx, m.index));
      result += `<span style="color:${m[1]}">${applyInlineMarkdown(m[2])}</span>`;
      lastIdx = m.index + m[0].length;
    }
    result += applyInlineMarkdown(rest.slice(lastIdx));

    return marker + result;
  });
  return htmlLines.join('<br>');
}

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
      .catch(() => {})
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
        style={{ background: '#1e1f23', borderRadius: 12, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 style={{ width: 16, height: 16, color: '#5b7cf6' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e8e8ea' }}>Forward message</span>
          </div>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', border: 'none' }}>
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
                  <span style={{ fontSize: 12, color: '#e8e8ea', fontWeight: 500 }}>{u.fullName.split(' ')[0]}</span>
                  <button onClick={() => removeUser(u._id)} style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
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
              style={{ width: '100%', height: 36, borderRadius: 8, paddingLeft: 32, paddingRight: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8ea', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* User list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {loadingUsers && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
            )}
            {!loadingUsers && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
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
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.fullName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{u.username}</div>
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
        style={{ background: '#1e1f23', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e8e8ea' }}>Pinned messages</span>
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
                  {idx > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />}
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ea', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sender?.fullName || 'Unknown'}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{dateStr}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>
                        {contentText}
                      </p>
                    </div>
                    {/* Unpin button */}
                    <button
                      onClick={() => onUnpin(m._id)}
                      title="Unpin message"
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', marginTop: 2 }}
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

// ─── Single popup ─────────────────────────────────────────────────────────────
interface ChatPopupProps {
  conv: SSConv;
  stackIndex: number;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

function ChatPopup({ conv, stackIndex, isMinimized, onClose, onToggleMinimize }: ChatPopupProps) {
  const { crmUserId, crmToken, socket, markAsRead } = useSupraSpaceMessenger();
  const router = useRouter();
  const [messages, setMessages] = React.useState<SSMessage[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [fetchError, setFetchError] = React.useState(false);
  const [input,    setInput]    = React.useState('');
  const [sending,  setSending]  = React.useState(false);
  const [draggingAttachment, setDraggingAttachment] = React.useState(false);
  const [pendingAttachments, setPendingAttachments] = React.useState<PendingPopupAttachment[]>([]);
  const [replyTo,  setReplyTo]  = React.useState<SSMessage | null>(null);
  const bottomRef  = React.useRef<HTMLDivElement>(null);
  const inputRef   = React.useRef<HTMLDivElement>(null);
  const inputStateRafRef = React.useRef<number | null>(null);
  const pendingInputStateRef = React.useRef('');
  const headerRef  = React.useRef<HTMLDivElement>(null);
  const popupShellRef = React.useRef<HTMLDivElement>(null);
  const dragDepthRef = React.useRef(0);
  const pendingAttachmentsRef = React.useRef<PendingPopupAttachment[]>([]);

  // Chat settings dropdown
  const [chatSettingsOpen, setChatSettingsOpen] = React.useState(false);
  const settingsRef = React.useRef<HTMLDivElement>(null);

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
  const [mentionQuery,  setMentionQuery]  = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState<number>(-1);
  const [mentionIdx,    setMentionIdx]    = React.useState(0);

  const scheduleInputState = React.useCallback((value: string) => {
    pendingInputStateRef.current = value;
    if (inputStateRafRef.current != null) return;
    inputStateRafRef.current = window.requestAnimationFrame(() => {
      inputStateRafRef.current = null;
      setInput(pendingInputStateRef.current);
    });
  }, []);

  React.useEffect(() => () => {
    if (inputStateRafRef.current != null) window.cancelAnimationFrame(inputStateRafRef.current);
  }, []);

  // Hover action bar (portal-based to escape overflow)
  const [hovMsg, setHovMsg] = React.useState<string | null>(null);
  const [barPos, setBarPos] = React.useState<{ top: number; left: number; isOwn: boolean } | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverBar  = React.useRef(false);

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
  const [textColorOpen, setTextColorOpen] = React.useState(false);
  const [selectedTextColor, setSelectedTextColor] = React.useState('#ffffff');
  const [textPalette, setTextPalette] = React.useState(TEXT_COLORS);
  const [mediaPreview, setMediaPreview] = React.useState<{ src: string; name: string } | null>(null);
  const [mediaPreviewZoom, setMediaPreviewZoom] = React.useState(1);

  // Reaction tooltip
  const [openReactPop, setOpenReactPop] = React.useState<string | null>(null);

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
    const barTop = Math.max(minTop, Math.min(rect.top + rect.height / 2 - BAR_H / 2, maxTop));
    const preferredLeft = isOwn ? rect.left - BAR_W - 6 : rect.right + 6;
    const closeFallbackLeft = isOwn ? rect.left + 8 : rect.right - BAR_W - 8;
    const rawLeft = preferredLeft < minLeft || preferredLeft > maxLeft ? closeFallbackLeft : preferredLeft;
    const barLeft = Math.max(minLeft, Math.min(rawLeft, maxLeft));
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
  const handleMsgLeave = () => {
    hoverTimer.current = setTimeout(() => {
      if (!isOverBar.current) { setHovMsg(null); setBarPos(null); }
    }, 220);
  };
  const handleBarEnter = () => {
    isOverBar.current = true;
    pendingMsgRef.current = null;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };
  const handleBarLeave = () => {
    isOverBar.current = false;
    hoverTimer.current = setTimeout(() => {
      if (!isOverBar.current && !moreMenuMsgIdRef.current) { setHovMsg(null); setBarPos(null); }
    }, 100);
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
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
    } catch { /* best-effort */ }
  };

  const handleDelete = async (msgId: string) => {
    clearBar();
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, content: '', attachments: [] } as any : m));
    try {
      await apiClient.delete(`/api/supraspace/messages/${msgId}`,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
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

  React.useEffect(() => { pendingAttachmentsRef.current = pendingAttachments; }, [pendingAttachments]);
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
        setInput('');
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
  }, [conv._id, crmToken, pendingAttachments, replyTo?._id, sending]);

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
        { content: '👍' },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
    } catch { /* ignored */ } finally { setSending(false); }
  };

  // ── Edit message ──
  const [editingMsgId, setEditingMsgId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);
  const [editWidth, setEditWidth] = React.useState<number | null>(null);
  const editAreaRef = React.useRef<HTMLDivElement>(null);
  const [editColorOpen, setEditColorOpen] = React.useState(false);
  const [editTextColor, setEditTextColor] = React.useState('#ffffff');
  const [editPalette, setEditPalette] = React.useState(TEXT_COLORS);

  const startEdit = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (!msg) return;
    const bubble = document.querySelector<HTMLElement>(`[data-popup-bubble-id="${msgId}"]`);
    const width = bubble?.getBoundingClientRect().width;
    setEditWidth(width ? Math.max(width, 190) : null);
    setEditDraft(msg.content);
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
    });
  };

  const syncEditDraft = React.useCallback(() => {
    const next = editAreaRef.current ? canonicalizeColorMarkup(htmlToMarkdown(editAreaRef.current)).trim() : editDraft.trim();
    setEditDraft(next);
    return next;
  }, [editDraft]);

  const applyEditCommand = React.useCallback((command: string, value?: string) => {
    editAreaRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditDraft();
  }, [syncEditDraft]);

  const applyEditColor = React.useCallback((color: string) => {
    editAreaRef.current?.focus();
    document.execCommand('foreColor', false, color);
    setEditTextColor(color);
    syncEditDraft();
  }, [syncEditDraft]);

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

  const handleEditColorBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const inputEvent = e.nativeEvent as InputEvent;
    if (editTextColor === '#ffffff' || inputEvent.inputType !== 'insertText' || !inputEvent.data) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, `<span style="color:${editTextColor}">${escapeHtmlText(inputEvent.data)}</span>`);
    syncEditDraft();
  };

  const cancelEdit = React.useCallback(() => {
    setEditingMsgId(null);
    setEditWidth(null);
    setEditColorOpen(false);
  }, []);

  const saveEdit = async () => {
    if (!editingMsgId || !crmToken) return;
    const original = messages.find(m => m._id === editingMsgId)?.content;
    const nextDraft = syncEditDraft();
    if (!nextDraft || nextDraft === original) { cancelEdit(); return; }
    setEditSaving(true);
    try {
      await apiClient.patch(`/api/supraspace/messages/${editingMsgId}`, { content: nextDraft },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
      setMessages(prev => prev.map(m => m._id === editingMsgId ? { ...m, content: nextDraft, isEdited: true } : m));
      cancelEdit();
    } catch {} finally { setEditSaving(false); }
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
  const avatarSrc   = getAvatarSrc(conv, crmUserId);
  const rightPx     = POPUP_RIGHT + stackIndex * (POPUP_W + POPUP_GAP);

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
    setInput(next); setMentionQuery(null); setMentionAnchor(-1);
  }, [mentionAnchor, mentionQuery, rangeFromTextOffset]);

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
    } catch (err: any) {
      console.error('[ChatPopup] messages fetch failed:', err?.response?.status, err?.response?.data ?? err?.message);
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
      setMessages(prev => prev.find(m => m._id === message._id) ? prev : [...prev, message]);
      if (!isMinimized) markAsRead(conv._id);
    };
    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, [socket, conv._id, isMinimized, markAsRead]);
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
    if (!isMinimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);
  React.useEffect(() => {
    if (!isMinimized) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isMinimized]);

  const handleSend = async () => {
    const visibleComposerText = inputRef.current?.innerText || input;
    const serializedComposerText = inputRef.current ? htmlToMarkdown(inputRef.current) : input.trim();
    const text = normalizeMessageMarkdownText(
      canonicalizeColorMarkup(
        preserveVisiblePayloadLines(
          preserveVisibleVinLines(serializedComposerText, visibleComposerText),
          visibleComposerText,
        ),
      ),
    );
    if (pendingAttachments.length > 0) {
      await sendPendingAttachments(text);
      return;
    }
    if (!text || sending || !crmToken) return;
    const currentReplyTo = replyTo;
    setInput('');
    if (inputRef.current) inputRef.current.innerHTML = '';
    setMentionQuery(null); setMentionAnchor(-1); setReplyTo(null); setSending(true);
    try {
      const body: any = { content: text };
      if (currentReplyTo) body.replyTo = currentReplyTo._id;
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/messages`, body,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
    } catch { /* ignored */ } finally { setSending(false); }
  };

  const applyTextColor = (color: string) => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('foreColor', false, color);
    setSelectedTextColor(color);
    setInput(el.innerText.replace(/\n$/, ''));
  };

  const chooseExpandedTextColor = React.useCallback((color: string) => {
    setTextPalette(prev => {
      if (prev.includes(color)) return prev;
      const replaceIndex = prev.includes(selectedTextColor) ? prev.indexOf(selectedTextColor) : prev.length - 1;
      const next = [...prev];
      next[replaceIndex] = color;
      return next;
    });
    applyTextColor(color);
    setTextColorOpen(false);
  }, [selectedTextColor]);

  const handleTyping = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const val = (el.innerText || '').replace(/\n$/, '');
    scheduleInputState(val);
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

  const handleColorBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const inputEvent = e.nativeEvent as InputEvent;
    if (selectedTextColor === '#ffffff' || inputEvent.inputType !== 'insertText' || !inputEvent.data) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, `<span style="color:${selectedTextColor}">${escapeHtmlText(inputEvent.data)}</span>`);
    const el = e.currentTarget;
    requestAnimationFrame(() => setInput(el.innerText.replace(/\n$/, '')));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionQuery !== null && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionOptions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mentionIdx].name); return; }
      if (e.key === 'Escape') { setMentionQuery(null); setMentionAnchor(-1); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* ── Popup container — no overflow-hidden so portals render correctly ── */}
      <div
        ref={popupShellRef}
        data-chat-popup-shell="true"
        className="fixed bottom-0 z-50 flex flex-col shadow-2xl rounded-t-xl border border-border/60 bg-card"
        style={{ width: POPUP_W, right: rightPx, height: isMinimized ? HEADER_H : POPUP_H, transition: 'height 0.2s ease' }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {draggingAttachment && !isMinimized && (
          <div className="absolute inset-2 z-[60] flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400/80 bg-blue-500/15 backdrop-blur-sm pointer-events-none">
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
          className="h-12 shrink-0 flex items-center gap-2.5 px-3 bg-gradient-to-r from-blue-600 to-blue-500 cursor-pointer select-none rounded-t-xl overflow-hidden"
          onClick={onToggleMinimize}
        >
          <Avatar className="h-7 w-7 shrink-0">
            {avatarSrc && <AvatarImage src={resolveImageUrl(avatarSrc)} />}
            <AvatarFallback className="text-[10px] font-semibold bg-blue-400 text-white">{initials(displayName)}</AvatarFallback>
          </Avatar>
          {/* Name + chevron toggle */}
          <button
            className="flex items-center gap-1 min-w-0 flex-1 text-left"
            onClick={(e) => { e.stopPropagation(); setChatSettingsOpen(v => !v); }}
            title="Chat settings"
          >
            <span className="text-[14px] font-semibold text-white truncate">{displayName}</span>
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0 transition-transform"
              style={{ color: 'rgba(255,255,255,0.8)', transform: chatSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          <button className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded"
            onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} title={isMinimized ? 'Expand' : 'Minimize'}>
            <Minus className="size-3.5" />
          </button>
          <button className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded"
            onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close">
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 bg-background min-h-0 space-y-1">
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
                  const imageOnly = imageAttachments.length > 0 && !msg.content?.trim();
                  const emojiOnly = imageAttachments.length === 0 && msg.type === 'text' && isEmojiOnlyText(msg.content);
                  const bareMessage = imageOnly || emojiOnly;
                  return (
                    <div key={msg._id}
                      className={cn('flex gap-1.5', isOwn ? 'flex-row-reverse items-end' : 'flex-row items-end')}
                      onMouseEnter={(e) => handleMsgEnter(e, msg._id, isOwn)}
                      onMouseLeave={handleMsgLeave}
                    >
                      {/* Sender avatar for non-own messages */}
                      {!isOwn && (
                        <div className="shrink-0 self-end mb-0.5">
                          {showName ? (
                            <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center text-white ring-1 ring-white/10"
                              style={{ fontSize: 7, background: 'var(--accent-muted,#3b82f6)' }}>
                              {msg.sender?.avatar
                                ? <img src={resolveImageUrl(msg.sender.avatar)} alt="" className="w-full h-full object-cover" />
                                : msg.sender?.fullName?.[0]?.toUpperCase()}
                            </div>
                          ) : (
                            <div className="h-5 w-5" /> /* spacer to keep alignment */
                          )}
                        </div>
                      )}
                      <div className={cn('min-w-0 flex flex-col', imageOnly ? 'max-w-[78%]' : 'max-w-[62%]')} style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                      {showName && !isOwn && (
                        <span className="px-1 mb-0.5 text-[12px] font-semibold" style={{ color: 'var(--accent-text,#60a5fa)' }}>
                          {msg.sender?.fullName}
                        </span>
                      )}
                        {/* Bubble */}
                        {editingMsgId === msg._id ? (
                          <div className="px-3 py-1.5 rounded-2xl text-[15px] leading-relaxed min-w-0 bg-blue-500 text-white rounded-br-sm" style={{ width: editWidth ? `${editWidth}px` : undefined, minWidth: 190, maxWidth: '100%', overflowWrap: 'anywhere' }}>
                            <div className="flex items-center gap-0.5 pb-1.5 mb-1.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('bold'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('italic'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Italic"><Italic className="h-3.5 w-3.5" /></button>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('underline'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Underline"><Underline className="h-3.5 w-3.5" /></button>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('strikeThrough'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('insertUnorderedList'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Bullet list"><List className="h-3.5 w-3.5" /></button>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('formatBlock', 'blockquote'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Quote"><TextQuote className="h-3.5 w-3.5" /></button>
                              <button onMouseDown={e => { e.preventDefault(); applyEditCommand('fontName', 'monospace'); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="Inline code"><Code2 className="h-3.5 w-3.5" /></button>
                              <div className="relative flex items-center gap-1">
                                <button type="button" onMouseDown={e => { e.preventDefault(); setEditColorOpen(v => !v); }} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10" title="More text colors">
                                  <Palette className="h-3.5 w-3.5" />
                                </button>
                                {editPalette.map(color => (
                                  <button key={color} onMouseDown={e => { e.preventDefault(); applyEditColor(color); }} className="relative h-5 w-5 rounded-full border transition-transform hover:scale-110" style={{ background: color, borderColor: editTextColor === color ? '#60a5fa' : color === '#ffffff' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)', boxShadow: editTextColor === color ? '0 0 0 2px rgba(0,0,0,0.35), 0 0 0 4px #60a5fa' : undefined }} aria-pressed={editTextColor === color} title={`Text color ${color}`}>
                                    {editTextColor === color && <Check className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2" style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }} />}
                                  </button>
                                ))}
                                {editColorOpen && (
                                  <div className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-7 gap-1.5 overflow-y-auto rounded-xl p-2 shadow-2xl" style={{ background: '#18181c', border: '1px solid rgba(255,255,255,0.12)', width: 210, maxHeight: 156 }}>
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
                              onBeforeInput={handleEditColorBeforeInput}
                              onInput={syncEditDraft}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak'); syncEditDraft(); }
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onPaste={e => {
                                const text = e.clipboardData?.getData('text/plain') || '';
                                const html = e.clipboardData?.getData('text/html') || '';
                                if (html && hasRichFormatting(html)) {
                                  e.preventDefault();
                                  const editorHtml = clipboardHtmlToEditorHtml(html);
                                  document.execCommand('insertHTML', false, shouldPreferPlainTextLayout(text, editorHtml) ? markdownTextToEditorHtml(text) : editorHtml);
                                  requestAnimationFrame(syncEditDraft);
                                  return;
                                }
                                if (text) {
                                  e.preventDefault();
                                  const markdown = hasMarkdownSyntax(text);
                                  document.execCommand(markdown ? 'insertHTML' : 'insertText', false, markdown ? markdownTextToEditorHtml(text) : text);
                                  requestAnimationFrame(syncEditDraft);
                                }
                              }}
                              className="min-h-7 max-h-40 overflow-y-auto outline-none text-[15px] leading-relaxed text-white"
                              style={{ minWidth: 0, display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', caretColor: '#fff' }}
                            />
                            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                              <span style={{ fontSize: 8, opacity: 0.5 }}>Enter · Esc</span>
                              <div className="flex-1" />
                              <button onClick={cancelEdit} className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.15)' }}>Cancel</button>
                              <button onClick={saveEdit} disabled={editSaving || !editDraft.trim()} className="text-[11px] px-2 py-1 rounded-md font-semibold disabled:opacity-40" style={{ background: '#34c97d', color: '#fff' }}>
                                {editSaving ? '...' : 'Update'}
                              </button>
                            </div>
                          </div>
                        ) : (
                        <div className={cn(
                          'text-[15px] leading-relaxed min-w-0',
                          bareMessage ? 'p-0 bg-transparent text-foreground' : 'px-3 py-1.5 rounded-2xl',
                          !bareMessage && (isOwn ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm')
                        )} data-popup-bubble-id={msg._id} style={{ overflowWrap: 'anywhere' }}>
                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div className={cn('mb-1 px-2 py-1 rounded-lg text-[12px] border-l-2', isOwn ? 'bg-white/15 border-white/60' : 'bg-black/5 border-blue-400')}
                              style={{ maxWidth: 180 }}>
                              <div className={cn('font-semibold truncate', isOwn ? 'text-white/80' : 'text-blue-400')}>
                                {(msg.replyTo as any)?.sender?.fullName || 'Reply'}
                              </div>
                              <div className={cn('truncate', isOwn ? 'text-white/60' : 'text-foreground/50')}>
                                {messagePreviewText((msg.replyTo as any)?.content) || '📎 Attachment'}
                              </div>
                            </div>
                          )}
                          {imageAttachments.length > 0 && (
                            <div className={cn(
                              imageAttachments.length === 1 ? 'block' : 'grid gap-1 overflow-hidden rounded-2xl',
                              imageAttachments.length === 2 && 'grid-cols-2',
                              imageAttachments.length >= 3 && 'grid-cols-2'
                            )} style={imageAttachments.length > 1 ? { width: 190 } : undefined}>
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
                                      imageAttachments.length === 1 ? 'rounded-2xl' : 'aspect-square',
                                      imageAttachments.length > 1 && 'h-24'
                                    )}
                                    style={imageAttachments.length === 1 ? { maxHeight: 180, maxWidth: 220, minWidth: 100 } : undefined}
                                    title="Preview image"
                                  >
                                    <img
                                      src={src}
                                      alt={a.originalName || 'photo'}
                                      className={cn(
                                        imageAttachments.length === 1
                                          ? 'block max-h-[180px] w-full object-contain'
                                          : 'h-full w-full object-cover'
                                      )}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {msg.type !== 'image'
                            ? emojiOnly
                              ? <span className="block text-[32px] leading-none">{msg.content}</span>
                              : renderContent(msg, isOwn)
                            : msg.content ? <span>{msg.content}</span> : null}
                          {(msg as any).isEdited && <span style={{ fontSize: 8, opacity: 0.45, marginLeft: 3 }}>(edited)</span>}
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
                                const member = conv.members?.find((x: any) => x._id === uid);
                                return member?.fullName || '';
                              }).filter(Boolean);
                              const popId = msg._id + ':' + r.emoji;
                              const isPopOpen = openReactPop === popId;
                              return (
                                <div key={r.emoji} className="relative"
                                  onMouseEnter={() => setOpenReactPop(popId)}
                                  onMouseLeave={() => setOpenReactPop(null)}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
                                        if (mine) handleReact(msg._id, r.emoji);
                                        else setOpenReactPop(isPopOpen ? null : popId);
                                      } else {
                                        handleReact(msg._id, r.emoji);
                                      }
                                    }}
                                    className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] cursor-pointer transition-all border',
                                      mine ? 'border-blue-400/60 bg-blue-500/10 text-blue-300' : 'border-white/10 bg-white/5 text-foreground/70 hover:border-white/20'
                                    )}
                                    title={mine ? `Remove ${r.emoji} reaction` : `React with ${r.emoji}`}
                                    aria-label={mine ? `Remove ${r.emoji} reaction` : `React with ${r.emoji}`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span style={{ fontSize: 9 }}>{r.users.length}</span>
                                  </button>
                                  {isPopOpen && whoArr.length > 0 && (
                                    <div
                                      className={cn('absolute z-50 bottom-full mb-1.5 px-2.5 py-1.5 rounded-lg text-[10px] min-w-[100px] max-w-[170px]',
                                        isOwn ? 'right-0' : 'left-0')}
                                      style={{ background: '#1a1b1e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', pointerEvents: 'none' }}
                                    >
                                      <div className="text-sm text-center mb-1">{r.emoji}</div>
                                      {whoArr.map((name: string, i: number) => (
                                        <div key={i} className="text-white/70 leading-tight truncate">{name}</div>
                                      ))}
                                    </div>
                                  )}
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
                      className={cn('w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[13px] transition-colors',
                        idx === mentionIdx ? 'bg-blue-500/15 text-blue-400' : 'hover:bg-muted/60 text-foreground')}
                    >
                      <span className="font-semibold text-blue-400">@{opt.id === 'all' ? opt.name : opt.fullName}</span>
                      {opt.id === 'all' && <span className="text-muted-foreground truncate">{opt.fullName}</span>}
                    </button>
                  ))}
                </div>
              )}
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-blue-500/5">
                  <div className="w-0.5 self-stretch rounded-full bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-blue-400">{replyTo.sender?.fullName}</div>
                    <div className="text-[12px] text-muted-foreground truncate">{messagePreviewText(replyTo.content) || '📎 Attachment'}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {/* ── FB Messenger-style bottom toolbar ── */}
              {pendingAttachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-b border-border/40 px-3 py-2">
                  {pendingAttachments.map((item, index) => {
                    const isImage = item.file.type.startsWith('image/');
                    return (
                      <div key={`${item.file.name}-${index}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                        {isImage ? (
                          <button
                            type="button"
                            onClick={() => setMediaPreview({ src: item.previewUrl, name: item.file.name })}
                            className="block h-full w-full"
                            title="Preview image"
                          >
                            <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold text-muted-foreground">
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
              <div className="flex min-w-0 items-center gap-1 overflow-hidden px-2 py-1.5">
                {/* Left icon buttons */}
                <input ref={fileRef} type="file" multiple hidden onChange={e => { stageFiles(e.target.files); e.target.value = ''; }} />
                <button title="More" onClick={() => { if (fileRef.current) { fileRef.current.accept = ''; fileRef.current.click(); } }}
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors">
                  <Plus className="h-5 w-5" />
                </button>
                <button title="Photo" onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click(); } }}
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors">
                  <ImageIcon className="h-4.5 w-4.5" />
                </button>
                <button title="GIF" onClick={() => toast.info('GIF coming soon')}
                  className="shrink-0 h-8 px-1.5 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors font-extrabold text-[11px] tracking-tight">
                  GIF
                </button>
                <div className="relative shrink-0">
                  <button title="More text colors" onClick={() => setTextColorOpen(v => !v)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors">
                    <Palette className="h-4 w-4" />
                  </button>
                  {textColorOpen && (
                    <div
                      className="absolute bottom-full left-0 mb-2 grid grid-cols-7 gap-1.5 overflow-y-auto rounded-xl border bg-card p-2 shadow-xl z-50"
                      style={{ borderColor: 'rgba(255,255,255,0.12)', width: 210, maxHeight: 156 }}
                    >
                      {MORE_TEXT_COLORS.map(color => (
                        <button
                          key={color}
                          onMouseDown={e => { e.preventDefault(); chooseExpandedTextColor(color); }}
                          className="relative h-6 w-6 rounded-full border transition-transform hover:scale-110"
                          style={{
                            background: color,
                            borderColor: selectedTextColor === color ? '#60a5fa' : color === '#ffffff' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)',
                            boxShadow: selectedTextColor === color ? '0 0 0 2px hsl(var(--card)), 0 0 0 4px #60a5fa' : undefined,
                          }}
                          aria-pressed={selectedTextColor === color}
                          title={`Text color ${color}`}
                        >
                          {selectedTextColor === color && (
                            <Check
                              className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2"
                              style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden">
                  {textPalette.map(color => (
                    <button
                      key={color}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); applyTextColor(color); }}
                      className="relative h-5 w-5 rounded-full border transition-transform hover:scale-110"
                      style={{
                        background: color,
                        borderColor: selectedTextColor === color ? '#60a5fa' : color === '#ffffff' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)',
                        boxShadow: selectedTextColor === color ? '0 0 0 2px hsl(var(--card)), 0 0 0 4px #60a5fa' : undefined,
                      }}
                      aria-pressed={selectedTextColor === color}
                      title={`Text color ${color}`}
                    >
                      {selectedTextColor === color && (
                        <Check
                          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
                          style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Text input */}
                <div className="relative flex min-w-0 max-w-full flex-1 items-center bg-muted/60 rounded-full px-3" style={{ minHeight: 34 }}>
                  {!input && (
                    <span className="absolute left-3 text-[15px] text-muted-foreground/55 pointer-events-none select-none">Aa</span>
                  )}
                  <div
                    ref={inputRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBeforeInput={handleColorBeforeInput}
                    onInput={handleTyping}
                    onKeyDown={handleKeyDown}
                    onPaste={e => {
                      const text = e.clipboardData?.getData('text/plain') || '';
                      const html = e.clipboardData?.getData('text/html') || '';
                      const shouldUsePlainText = !!text && !!html && richPasteDropsVinLikeToken(text, html);
                      if (html && hasRichFormatting(html) && !shouldUsePlainText) {
                        e.preventDefault();
                        const editorHtml = clipboardHtmlToEditorHtml(html);
                        document.execCommand('insertHTML', false, shouldPreferPlainTextLayout(text, editorHtml) ? markdownTextToEditorHtml(text) : editorHtml);
                        requestAnimationFrame(() => { const el = inputRef.current; if (el) setInput(el.innerText.replace(/\n$/, '')); });
                        return;
                      }
                      const richText = text || (html ? clipboardHtmlToPlainText(html) : '');
                      if (richText) {
                        e.preventDefault();
                        if (hasMarkdownSyntax(richText)) {
                          document.execCommand('insertHTML', false, markdownTextToEditorHtml(richText));
                        } else {
                          document.execCommand('insertText', false, richText);
                        }
                        requestAnimationFrame(() => { const el = inputRef.current; if (el) setInput(el.innerText.replace(/\n$/, '')); });
                      }
                    }}
                    onBlur={() => setTimeout(() => { setMentionQuery(null); setMentionAnchor(-1); }, 150)}
                    className="w-full min-w-0 max-w-full overflow-x-hidden outline-none"
                    style={{ fontSize: 15, minHeight: '1.25rem', maxHeight: 80, overflowY: 'auto', overflowX: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.4' }}
                  />
                </div>

                {/* Right buttons */}
                {input.trim() || pendingAttachments.length > 0 ? (
                  <button title="Send" onClick={handleSend} disabled={sending}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-40">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                ) : (
                  <button title="Like" onClick={handleSendThumbsUp} disabled={sending}
                    className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-40">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Fixed action bar portal (FB Messenger style: 3 buttons) ── */}
      {barPos && hovMsg && typeof document !== 'undefined' && createPortal(
        <div
          className={cn('fixed z-[9998] flex items-center gap-0.5 px-0.5 py-0.5', barPos.isOwn && 'flex-row-reverse')}
          style={{
            top: barPos.top,
            left: barPos.left,
          }}
          onMouseEnter={handleBarEnter}
          onMouseLeave={handleBarLeave}
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
                setQuickReactMsgId(hovMsg);
                setQuickReactPos({ top: btn.top - 52, left: Math.max(8, Math.min(btn.left - 4, window.innerWidth - 240 - 8)) });
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
          <button title="More actions"
            className="hover:bg-white/10 rounded-full p-1.5 transition-colors"
            style={{ color: moreMenuMsgId === hovMsg ? '#5b7cf6' : 'rgba(255,255,255,0.55)' }}
            onClick={(e) => {
              e.stopPropagation();
              const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
              if (moreMenuMsgId === hovMsg) {
                moreMenuMsgIdRef.current = null;
                setMoreMenuMsgId(null); setMoreMenuPos(null);
              } else {
                const ddH = 220;
                const top = btn.bottom + 4 + ddH > window.innerHeight - 8
                  ? btn.top - ddH - 4
                  : btn.bottom + 4;
                const left = Math.max(8, Math.min(btn.left, window.innerWidth - 208 - 8));
                moreMenuMsgIdRef.current = hovMsg;
                setMoreMenuMsgId(hovMsg); setMoreMenuPos({ top, left });
              }
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>,
        document.body
      )}

      {/* ── Quick-react popup (6 emoji + full-picker button) ── */}
      {quickReactMsgId && quickReactPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={quickReactRef}
          className="fixed z-[9999] flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            top: quickReactPos.top,
            left: quickReactPos.left,
            background: '#1e1f23',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
          onMouseEnter={handleBarEnter}
          onMouseLeave={handleBarLeave}
        >
          {['❤️','😂','😮','😢','👌','👍'].map(emoji => (
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
        </div>,
        document.body
      )}

      {/* ── More-actions dropdown portal ── */}
      {moreMenuMsgId && moreMenuPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={moreMenuRef}
          className="rounded-xl overflow-hidden"
          style={{
            position: 'fixed', zIndex: 9999,
            top: moreMenuPos.top, left: moreMenuPos.left,
            minWidth: 208,
            background: '#18181c',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(() => {
            const msg = messages.find(m => m._id === moreMenuMsgId);
            const isOwnMsg = msg?.sender?._id === crmUserId;
            const imgAtt = msg?.attachments?.find((a: any) => a.mimeType?.startsWith('image/'));
            const close = () => { moreMenuMsgIdRef.current = null; setMoreMenuMsgId(null); setMoreMenuPos(null); };
            const isPinned = pinnedMsgIds.has(moreMenuMsgId);
            const row = 'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5';
            const ic = { color: 'rgba(255,255,255,0.5)' };
            return (
              <div className="py-1">
                <button className={row} onClick={() => { if (msg) setForwardMsg(msg); close(); }}>
                  <Share2 className="h-4 w-4 shrink-0" style={ic} />
                  <span style={{ fontSize: 13, color: '#e8e8ea' }}>Forward message</span>
                </button>
                <button className={row} onClick={() => { toast.info('Mark as unread coming soon'); close(); }}>
                  <MailOpen className="h-4 w-4 shrink-0" style={ic} />
                  <span style={{ fontSize: 13, color: '#e8e8ea' }}>Mark as unread</span>
                </button>
                <button className={row} onClick={() => { toast.info('Star coming soon'); close(); }}>
                  <Star className="h-4 w-4 shrink-0" style={ic} />
                  <span style={{ fontSize: 13, color: '#e8e8ea' }}>Star</span>
                </button>
                <button className={row} onClick={() => {
                  setPinnedMsgIds(prev => { const n = new Set(prev); isPinned ? n.delete(moreMenuMsgId) : n.add(moreMenuMsgId); return n; });
                  isPinned ? toast('Message unpinned') : toast.success('Message pinned');
                  close();
                }}>
                  <Pin className="h-4 w-4 shrink-0" style={{ color: isPinned ? '#5b7cf6' : 'rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: 13, color: '#e8e8ea' }}>{isPinned ? 'Unpin message' : 'Pin message'}</span>
                </button>
                {msg?.content && (
                  <button className={row} onClick={() => {
                    navigator.clipboard.writeText(msg.content)
                      .then(() => toast.success('Message copied'))
                      .catch(() => toast.error('Could not copy message'));
                    close();
                  }}>
                    <Copy className="h-4 w-4 shrink-0" style={ic} />
                    <span style={{ fontSize: 13, color: '#e8e8ea' }}>Copy message</span>
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
                  <span style={{ fontSize: 13, color: '#e8e8ea' }}>Copy message link</span>
                </button>
                {imgAtt && (
                  <button className={row} onClick={async () => {
                    try { await copyImageToClipboard(imgAtt.url); toast.success('Image copied'); }
                    catch { toast.error('Could not copy image'); }
                    close();
                  }}>
                    <Copy className="h-4 w-4 shrink-0" style={ic} />
                    <span style={{ fontSize: 13, color: '#e8e8ea' }}>Copy image</span>
                  </button>
                )}
                {isOwnMsg && (
                  <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />
                    {!!msg?.content?.trim() && !msg?.isDeleted && !['voice', 'poll', 'event'].includes(msg.type) && (
                      <button className={row} onClick={() => { startEdit(moreMenuMsgId); close(); }}>
                        <Pencil className="h-4 w-4 shrink-0" style={ic} />
                        <span style={{ fontSize: 13, color: '#e8e8ea' }}>Edit message</span>
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

      {/* ── Chat settings dropdown ── */}
      {mediaPreview && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center overflow-hidden bg-black/90 p-4"
          onClick={() => setMediaPreview(null)}
          onWheel={e => {
            e.preventDefault();
            applyMediaPreviewZoom(mediaPreviewZoom + (e.deltaY < 0 ? 0.2 : -0.2));
          }}
        >
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
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setMediaPreview(null)}
            title="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
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
            background: '#1e1f23',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(() => {
            const close = () => setChatSettingsOpen(false);
            const row = 'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 cursor-pointer';
            const ic = 'h-5 w-5 shrink-0';
            const label = (text: string) => <span style={{ fontSize: 14, color: '#e8e8ea', fontWeight: 500 }}>{text}</span>;
            const sep = <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />;
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
                  <Pin className={ic} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  {label('View pinned messages')}
                </button>

                {/* Members — only for group chats */}
                {conv.type === 'group' && (
                  <button className={row} onClick={() => {
                    toast.info(`${conv.members.length} members in this group.`);
                    close();
                  }}>
                    <Users className={ic} style={{ color: 'rgba(255,255,255,0.5)' }} />
                    {label(`Members (${conv.members.length})`)}
                  </button>
                )}

                {sep}

                {/* Mute notifications */}
                <button className={row} onClick={() => { toast.info('Mute coming soon.'); close(); }}>
                  <BellOff className={ic} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  {label('Mute notifications')}
                </button>

                {/* Archive chat */}
                <button className={row} onClick={() => { toast.info('Archive coming soon.'); close(); }}>
                  <Archive className={ic} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  {label('Archive chat')}
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
  const rightPx = POPUP_RIGHT + MAX_VISIBLE_POPUPS * (POPUP_W + POPUP_GAP);
  const dockRight = `min(${rightPx}px, calc(100vw - 56px))`;

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
          className="fixed z-[52] w-72 overflow-hidden rounded-2xl border bg-card shadow-2xl"
          style={{ borderColor: 'rgba(255,255,255,0.12)', right: dockRight, bottom: 64 }}
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
                  className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/5"
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
        className="fixed bottom-3 z-[51]"
        style={{ right: dockRight }}
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
      </div>
    </>
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

  const visibleChatIds = openChats.slice(0, MAX_VISIBLE_POPUPS);
  const hiddenChatIds = openChats.slice(MAX_VISIBLE_POPUPS);
  const hiddenConvs = hiddenChatIds
    .map((convId) => conversations.find((c) => c._id === convId))
    .filter((conv): conv is SSConv => Boolean(conv));

  return (
    <>
      {visibleChatIds.map((convId, index) => {
        const conv = conversations.find((c) => c._id === convId);
        if (!conv) return null;
        return (
          <ChatPopup
            key={convId}
            conv={conv}
            stackIndex={index}
            isMinimized={minimizedChats.has(convId)}
            onClose={() => closeChatPopup(convId)}
            onToggleMinimize={() => toggleMinimize(convId)}
          />
        );
      })}
      <ChatOverflowDock
        hiddenConvs={hiddenConvs}
        crmUserId={crmUserId}
        onOpen={openChatPopup}
        onClose={closeChatPopup}
      />
    </>
  );
}
