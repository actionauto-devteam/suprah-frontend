'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { X, Minus, Send, Loader2, MessageCircle, Check, Reply, Pin, Trash2, Smile, Pencil, Copy, MoreHorizontal, Link2, Share2, MailOpen, Star, Search, Plus, ImageIcon, ThumbsUp, ChevronDown, ExternalLink, Users, BellOff, Archive } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';
import { SSMessage } from '@/hooks/useSupraSpaceSocket';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { toast } from 'sonner';

// ─── Layout constants ─────────────────────────────────────────────────────────
const POPUP_W     = 400;
const POPUP_GAP   = 8;
const POPUP_RIGHT = 16;
const POPUP_H     = 520;
const HEADER_H    = 48;

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
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Photo', voice: '🎤 Voice message', gif: '🎬 GIF',
  file: '📎 File', poll: '📊 Poll', event: '📅 Event',
};
// Renders message content with markdown formatting (bold, italic, underline, strike, code, bullets, quotes, links, @mentions)
const MD_SPLIT = /(\*\*[^*\n]+\*\*|~~[^~\n]+~~|__[^_\n]+__|_[^_\n]+_|`[^`\n]+`|https?:\/\/[^\s]+|@\w+(?:\s[A-Z][a-zA-Z]*)?)/g;

function renderInlineMd(text: string, isOwn: boolean, keyPrefix: string): React.ReactNode[] {
  return text.split(MD_SPLIT).map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4)
      return <s key={k}>{part.slice(2, -2)}</s>;
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4)
      return <u key={k}>{part.slice(2, -2)}</u>;
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2)
      return <em key={k}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={k} style={{ fontFamily: 'monospace', fontSize: '0.9em', background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', borderRadius: 3, padding: '0 3px' }}>{part.slice(1, -1)}</code>;
    if (/^https?:\/\//.test(part))
      return <a key={k} href={part} target="_blank" rel="noopener noreferrer" style={{ color: isOwn ? 'rgba(255,255,255,0.85)' : '#60a5fa', textDecoration: 'underline' }}>{part}</a>;
    if (/^@/.test(part))
      return <span key={k} className="font-bold" style={isOwn ? { color: 'rgba(255,255,255,0.95)', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' } : { color: '#60a5fa' }}>{part}</span>;
    return part;
  });
}

function renderContent(msg: SSMessage, isOwn: boolean): React.ReactNode {
  const label = MEDIA_LABELS[msg.type];
  if (label) return label;
  const raw = msg.content ?? '';
  // Collapse inline markers whose closing delimiter landed on the next line alone
  const text = raw
    .replace(/\*\*([^*\n]*)\n\*\*/g, '**$1**')
    .replace(/~~([^~\n]*)\n~~/g, '~~$1~~')
    .replace(/__([^_\n]*)\n__/g, '__$1__')
    .replace(/`([^`\n]*)\n`/g, '`$1`');
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, li) => {
    if (li > 0) nodes.push(<br key={`br-${li}`} />);
    if (line.startsWith('• ') || line.startsWith('• ')) {
      nodes.push(
        <span key={`l-${li}`} style={{ display: 'block', paddingLeft: 12 }}>
          {'• '}{renderInlineMd(line.slice(2), isOwn, `l-${li}`)}
        </span>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+\.\s)(.*)/);
      nodes.push(
        <span key={`l-${li}`} style={{ display: 'block', paddingLeft: 12 }}>
          {m![1]}{renderInlineMd(m![2], isOwn, `l-${li}`)}
        </span>
      );
    } else if (line.startsWith('> ')) {
      nodes.push(
        <span key={`l-${li}`} style={{ display: 'block', borderLeft: '2px solid', borderColor: isOwn ? 'rgba(255,255,255,0.4)' : '#60a5fa', paddingLeft: 8, opacity: 0.8 }}>
          {renderInlineMd(line.slice(2), isOwn, `l-${li}`)}
        </span>
      );
    } else {
      nodes.push(...renderInlineMd(line, isOwn, `l-${li}`));
    }
  });
  return <>{nodes}</>;
}

// ─── Paste helpers (mirror of SupraSpace, adapted for plain <input>) ─────────

function hasRichFormatting(html: string): boolean {
  return /<(b|strong|i|em|u|s|strike|del|code|li|blockquote|ol|ul|h[1-6])\b/i.test(html);
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

function hasMarkdownSyntax(text: string): boolean {
  return /\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|^\s*[-*+]\s+\S|^\s*\d+\.\s+\S|^\s*>\s?\S/m.test(text);
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Converts the contentEditable div's innerHTML to markdown for sending
function htmlToMarkdown(el: HTMLElement): string {
  const html = el.innerHTML;
  return html
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '_$1_')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '_$1_')
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '__$1__')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike[^>]*>([\s\S]*?)<\/strike>/gi, '~~$1~~')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner) => '`' + inner.replace(/<[^>]*>/g, '') + '`')
    .replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .trim();
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
    const childHtml = (): string => Array.from(el.childNodes).map(c => walk(c)).join('');
    switch (tag) {
      case 'strong': case 'b': return `<strong>${childHtml()}</strong>`;
      case 'em': case 'i': return `<em>${childHtml()}</em>`;
      case 'u': return `<u>${childHtml()}</u>`;
      case 's': case 'strike': case 'del': return `<s>${childHtml()}</s>`;
      case 'code': return '`' + childHtml().replace(/<[^>]*>/g, '') + '`';
      case 'li': return `• ${childHtml()}<br>`;
      case 'ul': return Array.from(el.children).map(li => walk(li)).join('');
      case 'ol': { let i = 1; return Array.from(el.children).map(() => '').join('') || Array.from(el.children).map(li => { const s = walk(li); return s.replace('• ', `${i++}. `); }).join(''); }
      case 'blockquote': return `&gt; ${childHtml()}<br>`;
      case 'div': case 'p': case 'section': case 'article':
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `${childHtml()}<br>`;
      default: return childHtml();
    }
  };
  return Array.from(doc.body.childNodes)
    .map(n => walk(n))
    .join('')
    .replace(/(<br>)+$/g, '')
    .replace(/^(<br>)+/g, '');
}

function markdownTextToEditorHtml(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const htmlLines = lines.map(line => {
    let marker = '';
    let rest = line;
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const numberedMatch = !bulletMatch && line.match(/^\s*(\d+)\.\s+(.+)$/);
    const quoteMatch = !bulletMatch && !numberedMatch && line.match(/^\s*>\s?(.+)$/);
    if (bulletMatch) { marker = '• '; rest = bulletMatch[1]; }
    else if (numberedMatch) { marker = `${numberedMatch[1]}. `; rest = numberedMatch[2]; }
    else if (quoteMatch) { marker = '&gt; '; rest = quoteMatch[1]; }
    const escaped = escapeHtmlText(rest)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
    return marker + escaped;
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
              const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const avatarLetter = (m.sender?.fullName || 'U')[0].toUpperCase();
              const contentText = MEDIA_LABELS[m.type] || m.content || '';
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
  const [replyTo,  setReplyTo]  = React.useState<SSMessage | null>(null);
  const bottomRef  = React.useRef<HTMLDivElement>(null);
  const inputRef   = React.useRef<HTMLDivElement>(null);
  const headerRef  = React.useRef<HTMLDivElement>(null);

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

  // Hover action bar (portal-based to escape overflow)
  const [hovMsg, setHovMsg] = React.useState<string | null>(null);
  const [barPos, setBarPos] = React.useState<{ top: number; left: number } | null>(null);
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
  const [emojiPickerPos, setEmojiPickerPos] = React.useState<{ top: number; left?: number; right?: number } | null>(null);

  // Reaction tooltip
  const [openReactPop, setOpenReactPop] = React.useState<string | null>(null);

  // ── Hover handlers ──
  const pendingMsgRef = React.useRef<{ id: string; top: number; left: number } | null>(null);

  const handleMsgEnter = (e: React.MouseEvent<HTMLDivElement>, msgId: string, isOwn: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    isOverBar.current = false;
    const bubbleEl = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.rounded-2xl');
    const rect = (bubbleEl ?? e.currentTarget).getBoundingClientRect();
    const BAR_W = 108, PAD = 8;
    const barTop = Math.max(PAD, Math.min(rect.top + rect.height / 2 - 18, window.innerHeight - 44));
    const barLeft = isOwn
      ? Math.max(PAD, rect.left - BAR_W - 4)
      : Math.min(window.innerWidth - BAR_W - PAD, rect.right + 4);
    const pos = { top: barTop, left: barLeft };
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

  const startEdit = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (!msg) return;
    const bubble = document.querySelector<HTMLElement>(`[data-popup-bubble-id="${msgId}"]`);
    const width = bubble?.getBoundingClientRect().width;
    setEditWidth(width ? Math.max(width, 190) : null);
    setEditDraft(msg.content);
    setEditingMsgId(msgId);
    clearBar();
  };

  const saveEdit = async () => {
    if (!editingMsgId || !editDraft.trim() || !crmToken) return;
    const original = messages.find(m => m._id === editingMsgId)?.content;
    if (editDraft.trim() === original) { setEditingMsgId(null); setEditWidth(null); return; }
    setEditSaving(true);
    try {
      await apiClient.patch(`/api/supraspace/messages/${editingMsgId}`, { content: editDraft.trim() },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
      setMessages(prev => prev.map(m => m._id === editingMsgId ? { ...m, content: editDraft.trim(), isEdited: true } : m));
      setEditingMsgId(null);
      setEditWidth(null);
    } catch {} finally { setEditSaving(false); }
  };

  const openEmojiPickerForMsg = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pickerW = 288;
    // Center picker on the button, then clamp so it never exits viewport
    const idealLeft = btn.left + btn.width / 2 - pickerW / 2;
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - pickerW - 8));
    setEmojiPickerMsg(msgId);
    setEmojiPickerPos({ top: btn.top - 350, left });
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
    const before = input.slice(0, mentionAnchor);
    const after  = input.slice(mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    const next   = `${before}@${name} ${after}`;
    const caretOffset = before.length + name.length + 2;
    setInput(next); setMentionQuery(null); setMentionAnchor(-1);
    setTimeout(() => setEditableAndCaret(next, caretOffset), 0);
  }, [input, mentionAnchor, mentionQuery, setEditableAndCaret]);

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
    const text = inputRef.current ? htmlToMarkdown(inputRef.current) : input.trim();
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

  const handleTyping = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const val = (el.innerText || '').replace(/\n$/, '');
    setInput(val);
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
        className="fixed bottom-0 z-50 flex flex-col shadow-2xl rounded-t-xl border border-border/60 bg-card"
        style={{ width: POPUP_W, right: rightPx, height: isMinimized ? HEADER_H : POPUP_H, transition: 'height 0.2s ease' }}
      >
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
                      <div className="max-w-[62%] min-w-0 flex flex-col" style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                      {showName && !isOwn && (
                        <span className="px-1 mb-0.5 text-[12px] font-semibold" style={{ color: 'var(--accent-text,#60a5fa)' }}>
                          {msg.sender?.fullName}
                        </span>
                      )}
                        {/* Bubble */}
                        {editingMsgId === msg._id ? (
                          <div className="px-3 py-1.5 rounded-2xl text-[15px] leading-relaxed min-w-0 bg-blue-500 text-white rounded-br-sm" style={{ width: editWidth ? `${editWidth}px` : undefined, minWidth: 190, maxWidth: '100%', overflowWrap: 'anywhere' }}>
                            <textarea
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { setEditingMsgId(null); setEditWidth(null); } }}
                              autoFocus
                              rows={Math.max(1, editDraft.split('\n').length)}
                              className="w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed text-white"
                              style={{ minWidth: 0, display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            />
                            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                              <span style={{ fontSize: 8, opacity: 0.5 }}>Enter · Esc</span>
                              <div className="flex-1" />
                              <button onClick={() => { setEditingMsgId(null); setEditWidth(null); }} className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.15)' }}>Cancel</button>
                              <button onClick={saveEdit} disabled={editSaving || !editDraft.trim()} className="text-[11px] px-2 py-1 rounded-md font-semibold disabled:opacity-40" style={{ background: '#34c97d', color: '#fff' }}>
                                {editSaving ? '...' : 'Update'}
                              </button>
                            </div>
                          </div>
                        ) : (
                        <div className={cn(
                          'px-3 py-1.5 rounded-2xl text-[15px] leading-relaxed min-w-0',
                          isOwn ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                        )} data-popup-bubble-id={msg._id} style={{ overflowWrap: 'anywhere' }}>
                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div className={cn('mb-1 px-2 py-1 rounded-lg text-[12px] border-l-2', isOwn ? 'bg-white/15 border-white/60' : 'bg-black/5 border-blue-400')}
                              style={{ maxWidth: 180 }}>
                              <div className={cn('font-semibold truncate', isOwn ? 'text-white/80' : 'text-blue-400')}>
                                {(msg.replyTo as any)?.sender?.fullName || 'Reply'}
                              </div>
                              <div className={cn('truncate', isOwn ? 'text-white/60' : 'text-foreground/50')}>
                                {(msg.replyTo as any)?.content || '📎 Attachment'}
                              </div>
                            </div>
                          )}
                          {(msg.attachments || [])
                            .filter((a: any) => a.mimeType?.startsWith('image/'))
                            .map((a: any, i: number) => (
                              <img key={i} src={resolveImageUrl(a.url)} alt="photo"
                                className="rounded-lg max-w-full block" style={{ maxHeight: 160 }} />
                            ))}
                          {msg.type !== 'image'
                            ? renderContent(msg, isOwn)
                            : msg.content ? <span>{msg.content}</span> : null}
                          {(msg as any).isEdited && <span style={{ fontSize: 8, opacity: 0.45, marginLeft: 3 }}>(edited)</span>}
                          {!hideTime && (
                            <div className={cn('flex items-center gap-1 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
                              <span className={cn('text-[11px]', isOwn ? 'text-white/60' : 'text-muted-foreground')}>{msgTime(msg.createdAt)}</span>
                              {isOwn && seenMembers.length === 0 && <Check className="h-2.5 w-2.5 text-white/50" />}
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
                                        setOpenReactPop(isPopOpen ? null : popId);
                                      } else {
                                        handleReact(msg._id, r.emoji);
                                      }
                                    }}
                                    className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] cursor-pointer transition-all border',
                                      mine ? 'border-blue-400/60 bg-blue-500/10 text-blue-300' : 'border-white/10 bg-white/5 text-foreground/70 hover:border-white/20'
                                    )}
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
                    <div className="text-[12px] text-muted-foreground truncate">{replyTo.content || '📎 Attachment'}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {/* ── FB Messenger-style bottom toolbar ── */}
              <div className="flex items-center gap-1 px-2 py-1.5">
                {/* Left icon buttons */}
                <input ref={fileRef} type="file" multiple hidden onChange={e => {
                  const files = e.target.files;
                  if (!files?.length || !crmToken) return;
                  const fd = new FormData();
                  Array.from(files).forEach(f => fd.append('files', f));
                  apiClient.post(`/api/supraspace/conversations/${conv._id}/upload`, fd, {
                    headers: { Authorization: `Bearer ${crmToken}`, 'Content-Type': 'multipart/form-data' },
                  }).then(r => { const m = r.data?.data; if (m) setMessages(prev => prev.find(x => x._id === m._id) ? prev : [...prev, m]); }).catch(() => {});
                  e.target.value = '';
                }} />
                <button title="More" onClick={() => fileRef.current?.click()}
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

                {/* Text input */}
                <div className="relative flex-1 min-w-0 flex items-center bg-muted/60 rounded-full px-3" style={{ minHeight: 34 }}>
                  {!input && (
                    <span className="absolute left-3 text-[15px] text-muted-foreground/55 pointer-events-none select-none">Aa</span>
                  )}
                  <div
                    ref={inputRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleTyping}
                    onKeyDown={handleKeyDown}
                    onPaste={e => {
                      const text = e.clipboardData?.getData('text/plain') || '';
                      const html = e.clipboardData?.getData('text/html') || '';
                      if (html && hasRichFormatting(html)) {
                        e.preventDefault();
                        document.execCommand('insertHTML', false, clipboardHtmlToEditorHtml(html));
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
                    className="w-full outline-none"
                    style={{ fontSize: 15, minHeight: '1.25rem', maxHeight: 80, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.4' }}
                  />
                </div>

                {/* Right buttons */}
                {input.trim() ? (
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
          className="fixed z-[9998] flex items-center gap-0.5 px-0.5 py-0.5"
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
                const left = Math.min(btn.left, window.innerWidth - 208 - 8);
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
                    {msg?.type === 'text' && !msg?.isDeleted && (
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

// ─── Manager ──────────────────────────────────────────────────────────────────
export function ChatPopupManager() {
  const { conversations, openChats, minimizedChats, closeChatPopup, toggleMinimize } = useSupraSpaceMessenger();
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

  return (
    <>
      {openChats.map((convId, index) => {
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
    </>
  );
}
