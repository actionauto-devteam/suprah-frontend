'use client';

import * as React from 'react';
import {
  Archive, ChevronDown, Download, FileText, Forward, ImageIcon,
  Inbox, Loader2, MailOpen, MailX, PanelLeftClose, PanelLeftOpen, Paperclip,
  Pencil, RefreshCw, Reply, Search, Send, Star, Tag, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Avatar, CenterSpinner, EmptyState, HtmlBodyFrame } from './Shared';
import { ComposeModal } from './ComposeModal';
import { downloadBlob, fmtListDate, fmtSize, getErrorMessage } from './utils';
import type { ComposePrefill, MailAttachmentMeta, MailDraft, MailLabel, MailMessageMeta } from './types';

/* ── System folders ────────────────────────────────────────────────────── */

const SYSTEM_FOLDERS: Array<{ id: string; name: string; icon: React.ComponentType<any> }> = [
  { id: 'INBOX', name: 'Inbox', icon: Inbox },
  { id: 'STARRED', name: 'Starred', icon: Star },
  { id: 'SENT', name: 'Sent', icon: Send },
  { id: 'DRAFTS', name: 'Drafts', icon: FileText }, // virtual — served by /drafts
  { id: 'TRASH', name: 'Trash', icon: Trash2 },
];

/* ── Label rail (desktop sidebar) ──────────────────────────────────────── */

function LabelRail({ labels, activeLabel, searching, collapsed, onToggleCollapse, onSelect, onCompose }: {
  labels: MailLabel[];
  activeLabel: string;
  searching: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: string) => void;
  onCompose: () => void;
}) {
  const userLabels = labels.filter((l) => l.type === 'user');
  const unreadFor = (id: string) => labels.find((l) => l.id === id)?.messagesUnread || 0;

  const FolderButton = ({ id, name, Icon, unread }: {
    id: string; name: string; Icon: React.ComponentType<any>; unread: number;
  }) => {
    const active = activeLabel === id && !searching;
    if (collapsed) {
      return (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={cn('sm5-label-row relative w-full flex items-center justify-center py-2.5', active && 'sm5-label-active')}
          style={{ color: 'var(--text-secondary)' }}
          title={name}
        >
          <Icon className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span
              className="absolute rounded-full"
              style={{ top: 6, right: 10, height: 7, width: 7, background: 'var(--accent)', boxShadow: '0 0 5px rgba(52,201,125,0.7)' }}
            />
          )}
        </button>
      );
    }
    return (
      <button
        key={id}
        onClick={() => onSelect(id)}
        className={cn('sm5-label-row w-full flex items-center gap-3 px-3.5 py-2.5 text-left', active && 'sm5-label-active')}
        style={{ fontSize: 13.5, letterSpacing: '0.045em', color: 'var(--text-secondary)' }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{name}</span>
        {unread > 0 && (
          <span className="sm5-mono font-bold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className="sm5-rail hidden md:flex flex-col shrink-0 transition-[width] duration-200"
      style={{ width: collapsed ? 64 : 224 }}
    >
      {/* Compose lives in the shared toolbar band — aligns with the search bar */}
      <div className={cn('sm5-toolbar', collapsed ? 'px-2.5 justify-center' : 'px-3')}>
        {collapsed ? (
          <button onClick={onCompose} className="sm5-btn h-9 w-9 flex items-center justify-center" title="Compose">
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={onCompose} className="sm5-btn h-9 w-full flex items-center justify-center gap-2" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
            <Pencil className="h-3.5 w-3.5" /> Compose
          </button>
        )}
      </div>

      <div className={cn('flex-1 overflow-y-auto overflow-x-hidden sm5-scroll py-3 space-y-1', collapsed ? 'px-2' : 'px-2.5')}>
        {SYSTEM_FOLDERS.map((f) => (
          <FolderButton key={f.id} id={f.id} name={f.name} Icon={f.icon} unread={f.id === 'INBOX' ? unreadFor('INBOX') : 0} />
        ))}

        {userLabels.length > 0 && (
          <>
            {collapsed
              ? <div className="mx-auto my-3" style={{ height: 1, width: 24, background: 'var(--border-2)' }} />
              : (
                <p className="px-3.5 pt-5 pb-2 font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-tertiary)' }}>
                  Labels
                </p>
              )}
            {userLabels.map((l) => (
              <FolderButton key={l.id} id={l.id} name={l.name} Icon={Tag} unread={l.messagesUnread || 0} />
            ))}
          </>
        )}
      </div>

      {/* Collapse / expand toggle pinned at the bottom */}
      <div className={cn('shrink-0 py-2.5', collapsed ? 'px-2 flex justify-center' : 'px-2.5')} style={{ borderTop: '1px solid var(--border-1)' }}>
        <button
          onClick={onToggleCollapse}
          className={cn('sm5-icon-btn h-9', collapsed ? 'w-9' : 'w-full flex items-center gap-3 px-3.5 justify-start')}
          title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4" />
            : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span style={{ fontSize: 12.5, letterSpacing: '0.045em' }}>Minimize</span>
              </>
            )}
        </button>
      </div>
    </aside>
  );
}

/* ── List rows ─────────────────────────────────────────────────────────── */

function DraftRow({ draft, onOpen, onDiscard }: {
  draft: MailDraft; onOpen: () => void; onDiscard: () => void;
}) {
  const m = draft.message;
  return (
    <div onClick={onOpen} className="sm5-msg-row flex items-start gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--danger)' }}>Draft</span>
          <span className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.to || '(no recipient)'}</span>
          <span className="ml-auto shrink-0 sm5-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{fmtListDate(m.internalDate)}</span>
        </div>
        <p className="truncate mt-0.5 font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.subject}</p>
        <p className="truncate mt-0.5" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{m.snippet}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDiscard(); }}
        className="sm5-icon-btn h-7 w-7 shrink-0 mt-1"
        title="Discard draft"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Message row. Two responsive layouts:
 *  - < lg: stacked (sender / subject / snippet) — comfortable on phones.
 *  - ≥ lg: Gmail-style single line (sender | subject — snippet | date) that
 *    uses the full width freed by moving reading into a modal.
 */
function MessageRow({ msg, onOpen, onAction }: {
  msg: MailMessageMeta;
  onOpen: () => void;
  onAction: (action: string) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={cn('sm5-msg-row flex items-center gap-2.5 px-3 sm:px-4 py-3 lg:py-2.5 group', msg.isUnread && 'bg-emerald-500/[0.04]')}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onAction(msg.isStarred ? 'unstar' : 'star'); }}
        className="shrink-0 self-start lg:self-center mt-0.5 lg:mt-0"
        title={msg.isStarred ? 'Unstar' : 'Star'}
      >
        <Star className="h-4 w-4" style={{ color: msg.isStarred ? '#f0a855' : 'var(--text-disabled)', fill: msg.isStarred ? '#f0a855' : 'none' }} />
      </button>

      <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-3">
        {/* Sender — fixed column on lg */}
        <div className="flex items-center gap-2 lg:w-48 lg:shrink-0">
          <span className={cn('truncate', msg.isUnread ? 'font-bold' : 'font-medium')} style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {msg.from.name || msg.from.email}
          </span>
          {msg.attachments.length > 0 && <Paperclip className="h-3 w-3 shrink-0 lg:hidden" style={{ color: 'var(--text-tertiary)' }} />}
          <span
            className="ml-auto shrink-0 sm5-mono lg:hidden"
            style={{ fontSize: 10.5, color: msg.isUnread ? 'var(--accent-text)' : 'var(--text-tertiary)', fontWeight: msg.isUnread ? 700 : 400 }}
          >
            {fmtListDate(msg.internalDate)}
          </span>
        </div>

        {/* Subject + snippet — inline on lg, stacked below */}
        <div className="min-w-0 flex-1">
          <p className="truncate mt-0.5 lg:mt-0" style={{ fontSize: 13 }}>
            <span className={cn(msg.isUnread && 'font-semibold')} style={{ color: 'var(--text-primary)' }}>{msg.subject}</span>
            <span className="hidden lg:inline" style={{ color: 'var(--text-tertiary)' }}>{'  —  '}{msg.snippet}</span>
          </p>
          <p className="truncate mt-0.5 lg:hidden" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{msg.snippet}</p>
        </div>
      </div>

      {/* Right cluster on lg: attachment, date, hover actions */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {msg.attachments.length > 0 && <Paperclip className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />}
        <span
          className="sm5-mono group-hover:hidden"
          style={{ fontSize: 11, minWidth: 64, textAlign: 'right', color: msg.isUnread ? 'var(--accent-text)' : 'var(--text-tertiary)', fontWeight: msg.isUnread ? 700 : 400 }}
        >
          {fmtListDate(msg.internalDate)}
        </span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onAction(msg.isUnread ? 'read' : 'unread'); }}
            className="sm5-icon-btn h-7 w-7"
            title={msg.isUnread ? 'Mark read' : 'Mark unread'}
          >
            {msg.isUnread ? <MailOpen className="h-3.5 w-3.5" /> : <MailX className="h-3.5 w-3.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onAction('archive'); }} className="sm5-icon-btn h-7 w-7" title="Archive">
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onAction('trash'); }} className="sm5-icon-btn h-7 w-7" title="Trash">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Thread message card (inside the reader modal) ─────────────────────── */

function ThreadMessageCard({ msg, theme, expanded, downloadingKey, onToggle, onReply, onForward, onDownload }: {
  msg: MailMessageMeta;
  theme: 'dark' | 'light';
  expanded: boolean;
  downloadingKey: string | null;
  onToggle: () => void;
  onReply: () => void;
  onForward: () => void;
  onDownload: (att: MailAttachmentMeta) => void;
}) {
  const visibleAtts = msg.attachments.filter((a) => !a.isInline);
  return (
    <div className="rounded-xl sm5-enter" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-1)' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left">
        <Avatar seed={msg.from.name || msg.from.email} size={36} fontSize={12} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate" style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>
              {msg.from.name || msg.from.email}
            </span>
            <span className="ml-auto shrink-0 sm5-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
              {fmtListDate(msg.internalDate)}
            </span>
          </div>
          <p className="truncate mt-0.5" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            {expanded ? `to ${msg.to}${msg.cc ? `, cc ${msg.cc}` : ''}` : msg.snippet}
          </p>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform"
          style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-4">
          {msg.bodyHtml ? (
            <HtmlBodyFrame html={msg.bodyHtml} theme={theme} />
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {msg.bodyText || msg.snippet}
            </p>
          )}

          {visibleAtts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-1)' }}>
              {visibleAtts.map((a) => (
                <button
                  key={a.attachmentId}
                  onClick={() => onDownload(a)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-opacity hover:opacity-80"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', maxWidth: 240 }}
                >
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}>
                    {a.mimeType.startsWith('image/')
                      ? <ImageIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                      : <FileText className="h-4 w-4" style={{ color: 'var(--accent)' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold" style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>{a.filename}</p>
                    <p className="sm5-mono" style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>{fmtSize(a.size)}</p>
                  </div>
                  {downloadingKey === `${msg.id}:${a.attachmentId}`
                    ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                    : <Download className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button onClick={onReply} className="sm5-pill h-8 px-3.5 flex items-center gap-1.5" style={{ fontSize: 12 }}>
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
            <button onClick={onForward} className="sm5-pill h-8 px-3.5 flex items-center gap-1.5" style={{ fontSize: 12 }}>
              <Forward className="h-3.5 w-3.5" /> Forward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Thread reader modal ───────────────────────────────────────────────── */

/**
 * Big, readable reading surface: full-screen on phones, a large centered
 * dialog (max-w-4xl, ~92dvh) on bigger screens. Compose stacks above (z-50).
 */
function ThreadReaderModal({ subject, msgs, theme, loading, expandedIds, downloadingKey, onToggle, onClose, onAction, onReply, onForward, onDownload }: {
  subject: string;
  msgs: MailMessageMeta[];
  theme: 'dark' | 'light';
  loading: boolean;
  expandedIds: Set<string>;
  downloadingKey: string | null;
  onToggle: (id: string) => void;
  onClose: () => void;
  onAction: (msg: MailMessageMeta, action: string) => void;
  onReply: (msg: MailMessageMeta) => void;
  onForward: (msg: MailMessageMeta) => void;
  onDownload: (msg: MailMessageMeta, att: MailAttachmentMeta) => void;
}) {
  const last = msgs[msgs.length - 1];

  // Close on Escape.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sm5-overlay fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4 lg:p-6" onClick={onClose}>
      <div
        className="sm5-modal sm5-sheet w-full h-full sm:h-[92dvh] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl overflow-hidden flex flex-col rounded-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reader header */}
        <div className="flex items-center gap-2 px-3 sm:px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <p className="sm5-display font-bold flex-1 truncate" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
            {subject || '…'}
          </p>
          {last && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => onAction(last, 'unread')} className="sm5-icon-btn h-8 w-8" title="Mark unread">
                <MailX className="h-4 w-4" />
              </button>
              <button onClick={() => onAction(last, 'archive')} className="sm5-icon-btn h-8 w-8" title="Archive">
                <Archive className="h-4 w-4" />
              </button>
              <button onClick={() => onAction(last, 'trash')} className="sm5-icon-btn h-8 w-8" title="Trash">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="h-5 w-px mx-1 shrink-0" style={{ background: 'var(--border-2)' }} />
          <button onClick={onClose} className="sm5-icon-btn h-8 w-8 shrink-0" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thread */}
        <div
          className="flex-1 overflow-y-auto sm5-scroll px-3 sm:px-5 py-4 space-y-3"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {loading && <CenterSpinner />}
          {msgs.map((m) => (
            <ThreadMessageCard
              key={m.id}
              msg={m}
              theme={theme}
              expanded={expandedIds.has(m.id)}
              downloadingKey={downloadingKey}
              onToggle={() => onToggle(m.id)}
              onReply={() => onReply(m)}
              onForward={() => onForward(m)}
              onDownload={(att) => onDownload(m, att)}
            />
          ))}
        </div>

        {/* Quick actions footer */}
        {last && !loading && (
          <div
            className="flex items-center gap-2 px-3 sm:px-5 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-1)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <button onClick={() => onReply(last)} className="sm5-btn h-9 px-4 flex items-center gap-2" style={{ fontSize: 13 }}>
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
            <button onClick={() => onForward(last)} className="sm5-pill h-9 px-4 flex items-center gap-2" style={{ fontSize: 12 }}>
              <Forward className="h-3.5 w-3.5" /> Forward
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Inbox tab ─────────────────────────────────────────────────────────── */

export function InboxTab({ token, theme, refreshSignal, onGlobalRefreshHandled }: {
  token: string;
  theme: 'dark' | 'light';
  refreshSignal: number;
  onGlobalRefreshHandled: () => void;
}) {
  const auth = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [labels, setLabels] = React.useState<MailLabel[]>([]);
  const [activeLabel, setActiveLabel] = React.useState('INBOX');
  const [messages, setMessages] = React.useState<MailMessageMeta[]>([]);
  const [drafts, setDrafts] = React.useState<MailDraft[]>([]);
  const [nextPageToken, setNextPageToken] = React.useState<string | undefined>();
  const [loadingList, setLoadingList] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [searchQ, setSearchQ] = React.useState('');
  const [openThreadId, setOpenThreadId] = React.useState<string | null>(null);
  const [threadMsgs, setThreadMsgs] = React.useState<MailMessageMeta[]>([]);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [compose, setCompose] = React.useState<ComposePrefill | null>(null);
  const [downloadingAtt, setDownloadingAtt] = React.useState<string | null>(null);

  // Sidebar minimize preference — persisted per browser.
  const [railCollapsed, setRailCollapsed] = React.useState(false);
  React.useEffect(() => {
    setRailCollapsed(localStorage.getItem('sm5_rail_collapsed') === '1');
  }, []);
  const toggleRail = () => {
    setRailCollapsed((c) => {
      localStorage.setItem('sm5_rail_collapsed', c ? '0' : '1');
      return !c;
    });
  };

  const isDraftsView = activeLabel === 'DRAFTS';

  /* ── Data fetching ── */

  const fetchLabels = React.useCallback(() => {
    apiClient.get('/api/mail/labels', { headers: auth })
      .then((r: any) => setLabels(r.data?.data?.labels || []))
      .catch(() => { });
  }, [auth]);

  const fetchList = React.useCallback(async (opts: { silent?: boolean; pageToken?: string } = {}) => {
    if (!opts.silent && !opts.pageToken) setLoadingList(true);
    if (opts.pageToken) setLoadingMore(true);
    try {
      if (isDraftsView) {
        const r = await apiClient.get('/api/mail/drafts', { headers: auth, params: { pageToken: opts.pageToken } });
        const d = r.data?.data;
        setDrafts((prev) => (opts.pageToken ? [...prev, ...(d?.drafts || [])] : (d?.drafts || [])));
        setNextPageToken(d?.nextPageToken);
      } else {
        const r = await apiClient.get('/api/mail/messages', {
          headers: auth,
          params: { label: searchQ ? undefined : activeLabel, q: searchQ || undefined, pageToken: opts.pageToken },
        });
        const d = r.data?.data;
        setMessages((prev) => (opts.pageToken ? [...prev, ...(d?.messages || [])] : (d?.messages || [])));
        setNextPageToken(d?.nextPageToken);
      }
    } catch (e) {
      if (!opts.silent) toast.error(getErrorMessage(e, 'Could not load emails.'));
    } finally {
      setLoadingList(false);
      setLoadingMore(false);
    }
  }, [auth, activeLabel, searchQ, isDraftsView]);

  React.useEffect(() => { fetchLabels(); }, [fetchLabels]);
  React.useEffect(() => { setOpenThreadId(null); fetchList(); }, [activeLabel, searchQ]); // eslint-disable-line

  // Realtime refresh signal from the page-level socket.
  React.useEffect(() => {
    if (refreshSignal <= 0) return;
    fetchList({ silent: true });
    fetchLabels();
    if (openThreadId) openThread(openThreadId, { silent: true });
    onGlobalRefreshHandled();
  }, [refreshSignal]); // eslint-disable-line

  // Debounced search.
  React.useEffect(() => {
    const t = setTimeout(() => setSearchQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  /* ── Local mutations ── */

  const patchLocal = (id: string, patch: Partial<MailMessageMeta>) => {
    setMessages((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setThreadMsgs((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const openThread = async (threadId: string, opts: { silent?: boolean } = {}) => {
    setOpenThreadId(threadId);
    if (!opts.silent) { setLoadingThread(true); setThreadMsgs([]); }
    try {
      const r = await apiClient.get(`/api/mail/threads/${threadId}`, { headers: auth });
      const msgs: MailMessageMeta[] = r.data?.data?.messages || [];
      setThreadMsgs(msgs);
      setExpandedIds(new Set(msgs.length ? [msgs[msgs.length - 1].id] : []));
      // Opening marks unread messages as read — mirrored to Gmail.
      msgs.filter((m) => m.isUnread).forEach((m) => {
        patchLocal(m.id, { isUnread: false });
        apiClient.patch(`/api/mail/messages/${m.id}`, { action: 'read' }, { headers: auth }).catch(() => { });
      });
    } catch (e) {
      if (!opts.silent) toast.error(getErrorMessage(e, 'Could not open the email.'));
    } finally {
      setLoadingThread(false);
    }
  };

  const runAction = async (msg: MailMessageMeta, action: string) => {
    const optimistic: Record<string, Partial<MailMessageMeta>> = {
      read: { isUnread: false }, unread: { isUnread: true },
      star: { isStarred: true }, unstar: { isStarred: false },
    };
    if (optimistic[action]) patchLocal(msg.id, optimistic[action]);
    if (['archive', 'trash'].includes(action)) {
      setMessages((p) => p.filter((m) => m.id !== msg.id));
      if (openThreadId === msg.threadId) setOpenThreadId(null);
    }
    try {
      await apiClient.patch(`/api/mail/messages/${msg.id}`, { action }, { headers: auth });
      if (action === 'trash') toast.success('Moved to trash');
      if (action === 'archive') toast.success('Archived');
      fetchLabels();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Action failed.'));
      fetchList({ silent: true });
    }
  };

  const discardDraft = (d: MailDraft) => {
    apiClient.delete(`/api/mail/drafts/${d.draftId}`, { headers: auth })
      .then(() => { toast.success('Draft deleted'); fetchList({ silent: true }); })
      .catch(() => toast.error('Could not delete draft.'));
  };

  const downloadGmailAttachment = async (msg: MailMessageMeta, att: MailAttachmentMeta) => {
    const key = `${msg.id}:${att.attachmentId}`;
    if (downloadingAtt) return;
    setDownloadingAtt(key);
    try {
      const r = await apiClient.get(
        `/api/mail/messages/${msg.id}/attachments/${att.attachmentId}`,
        { headers: auth, params: { filename: att.filename, mimeType: att.mimeType }, responseType: 'blob' },
      );
      downloadBlob(r.data, att.filename);
    } catch {
      toast.error('Could not download attachment.');
    } finally {
      setDownloadingAtt(null);
    }
  };

  /* ── Compose prefills ── */

  const startReply = (msg: MailMessageMeta) => setCompose({
    mode: 'reply',
    to: msg.from.email,
    subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
    body: `\n\n\nOn ${msg.date}, ${msg.from.name || msg.from.email} wrote:\n> ${(msg.bodyText || msg.snippet).split('\n').join('\n> ')}`,
    threadId: msg.threadId,
    inReplyTo: msg.rfc822MessageId,
    references: [msg.references, msg.rfc822MessageId].filter(Boolean).join(' '),
  });

  const startForward = (msg: MailMessageMeta) => setCompose({
    mode: 'forward',
    subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
    body: `\n\n---------- Forwarded message ----------\nFrom: ${msg.from.name || ''} <${msg.from.email}>\nDate: ${msg.date}\nSubject: ${msg.subject}\nTo: ${msg.to}\n\n${msg.bodyText || msg.snippet}`,
  });

  const openDraft = (d: MailDraft) => setCompose({
    mode: 'draft',
    draftId: d.draftId,
    to: d.message.to,
    cc: d.message.cc,
    subject: d.message.subject === '(no subject)' ? '' : d.message.subject,
    body: d.message.bodyText || '',
    threadId: d.message.threadId || undefined,
  });

  const selectFolder = (id: string) => { setQ(''); setSearchQ(''); setActiveLabel(id); };
  const refresh = () => {
    fetchList();
    fetchLabels();
    apiClient.post('/api/mail/sync', {}, { headers: auth }).catch(() => { });
  };

  const listEmpty = isDraftsView ? drafts.length === 0 : messages.length === 0;

  /* ── Render ── */

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <LabelRail
        labels={labels}
        activeLabel={activeLabel}
        searching={!!searchQ}
        collapsed={railCollapsed}
        onToggleCollapse={toggleRail}
        onSelect={selectFolder}
        onCompose={() => setCompose({ mode: 'new' })}
      />

      {/* Message list — full width; reading happens in the modal */}
      <section className="flex flex-col min-w-0 flex-1">
        {/* Search + actions — same toolbar band as the rail's Compose */}
        <div className="sm5-toolbar gap-2 px-3 sm:px-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search mail — Gmail search syntax works"
              className="sm5-input w-full h-9 pl-9 pr-3 text-xs"
            />
          </div>
          <button onClick={() => setCompose({ mode: 'new' })} className="sm5-btn h-9 w-9 flex md:hidden items-center justify-center shrink-0" title="Compose">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={refresh} className="sm5-icon-btn h-9 w-9 shrink-0 ml-auto" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile folder pills */}
        <div className="flex md:hidden gap-1.5 px-3 py-2 overflow-x-auto sm5-scroll shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          {SYSTEM_FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFolder(f.id)}
              className="shrink-0 rounded-full px-3 h-7 font-semibold"
              style={{
                fontSize: 11,
                background: activeLabel === f.id ? 'var(--accent)' : 'var(--bg-hover)',
                color: activeLabel === f.id ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-2)',
              }}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto sm5-scroll">
          {loadingList && <CenterSpinner />}

          {!loadingList && listEmpty && (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              hint={searchQ ? 'No emails match your search' : 'Nothing here yet'}
            />
          )}

          {!loadingList && isDraftsView && drafts.map((d) => (
            <DraftRow key={d.draftId} draft={d} onOpen={() => openDraft(d)} onDiscard={() => discardDraft(d)} />
          ))}

          {!loadingList && !isDraftsView && messages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              onOpen={() => openThread(m.threadId)}
              onAction={(action) => runAction(m, action)}
            />
          ))}

          {!loadingList && nextPageToken && !listEmpty && (
            <div className="flex justify-center py-3">
              <button
                onClick={() => fetchList({ pageToken: nextPageToken })}
                disabled={loadingMore}
                className="sm5-pill h-8 px-4 flex items-center gap-2"
                style={{ fontSize: 12 }}
              >
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load more
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Reader modal — big, readable, responsive */}
      {openThreadId && (
        <ThreadReaderModal
          subject={threadMsgs[0]?.subject || ''}
          msgs={threadMsgs}
          theme={theme}
          loading={loadingThread}
          expandedIds={expandedIds}
          downloadingKey={downloadingAtt}
          onToggle={(id) => setExpandedIds((p) => {
            const n = new Set(p);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
          })}
          onClose={() => setOpenThreadId(null)}
          onAction={runAction}
          onReply={startReply}
          onForward={startForward}
          onDownload={downloadGmailAttachment}
        />
      )}

      {compose && (
        <ComposeModal
          token={token}
          prefill={compose}
          onClose={() => setCompose(null)}
          onSent={() => { fetchList({ silent: true }); fetchLabels(); }}
        />
      )}
    </div>
  );
}