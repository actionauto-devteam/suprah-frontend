'use client';

import * as React from 'react';
import {
  Archive, ChevronDown, Download, FileText, Forward, ImageIcon,
  Inbox, Loader2, MailOpen, MailX, PanelLeftClose, PanelLeftOpen, Paperclip,
  Pencil, Reply, Search, Send, Star, Tag, Trash2, X,
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

function unreadForMobile(labels: MailLabel[], id: string) {
  const gmailLabelId = id === 'DRAFTS' ? 'DRAFT' : id;
  return Math.max(
    0,
    Number(
      labels.find((label) => label.id === gmailLabelId)?.messagesUnread || 0,
    ),
  );
}

type MailboxCacheEntry =
  | {
      kind: 'messages';
      messages: MailMessageMeta[];
      nextPageToken?: string;
      cachedAt: number;
    }
  | {
      kind: 'drafts';
      drafts: MailDraft[];
      nextPageToken?: string;
      cachedAt: number;
    };

const MAILBOX_CACHE_REVALIDATE_MS = 60_000;

type SystemMailboxSummary = {
  id: 'INBOX' | 'STARRED' | 'SENT' | 'DRAFTS' | 'TRASH';
  latestMessageAt: number | null;
  unreadCount: number | null;
  totalCount: number | null;
};

const SYSTEM_MAILBOX_IDS = new Set(
  SYSTEM_FOLDERS.map((folder) => folder.id),
);

const SYSTEM_LABEL_TO_MAILBOX: Record<
  string,
  SystemMailboxSummary['id']
> = {
  INBOX: 'INBOX',
  STARRED: 'STARRED',
  SENT: 'SENT',
  DRAFT: 'DRAFTS',
  TRASH: 'TRASH',
};

function gmailLabelIdForFolder(id: string) {
  return id === 'DRAFTS' ? 'DRAFT' : id;
}

/* ── Label rail (desktop sidebar) ──────────────────────────────────────── */

function LabelRail({
  labels,
  activeLabel,
  searching,
  collapsed,
  query,
  folderActivity,
  mailboxSummaries,
  onQueryChange,
  onCompose,
  onToggleCollapse,
  onSelect,
}: {
  labels: MailLabel[];
  activeLabel: string;
  searching: boolean;
  collapsed: boolean;
  query: string;
  folderActivity: Record<string, number | undefined>;
  mailboxSummaries: Record<string, SystemMailboxSummary | undefined>;
  onQueryChange: (value: string) => void;
  onCompose: () => void;
  onToggleCollapse: () => void;
  onSelect: (id: string) => void;
}) {
  const userLabels = labels.filter((l) => l.type === 'user');
  const unreadFor = (id: string) => {
    const gmailLabelId = gmailLabelIdForFolder(id);
    return (
      labels.find((label) => label.id === gmailLabelId)?.messagesUnread || 0
    );
  };

  const FolderButton = ({ id, name, Icon, unread, latestAt }: {
    id: string;
    name: string;
    Icon: React.ComponentType<any>;
    unread: number;
    latestAt?: number;
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
          <Icon className="h-4.5 w-4.5" />
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
        <span className="min-w-0 flex-1 truncate">{name}</span>

        <div className="ml-auto flex h-[34px] min-w-[68px] shrink-0 flex-col items-end justify-start gap-1">
          <span
            className="sm5-mono min-h-[16px] whitespace-nowrap font-semibold"
            style={{
              fontSize: 11.5,
              color: latestAt
                ? (active ? 'var(--accent-text)' : 'var(--text-tertiary)')
                : 'var(--text-disabled)',
            }}
            aria-label={latestAt ? `Latest activity ${fmtListDate(latestAt)}` : undefined}
          >
            {latestAt ? fmtListDate(latestAt) : ''}
          </span>

          {unread > 0 && (
            <span
              className="rounded-full bg-emerald-600 px-1.5 text-[9px] font-black leading-[18px] text-white"
              style={{ minWidth: 18, height: 18, textAlign: 'center' }}
              aria-label={`${unread} unread email${unread === 1 ? '' : 's'} in ${name}`}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <aside
      className="sm5-rail hidden @md:flex flex-col shrink-0 transition-[width] duration-200"
      style={{ width: collapsed ? 64 : 304 }}
    >
      {/* Desktop Inbox now mirrors Email Chat: Search + primary action live inside the left rail. */}
      <div className={cn('sm5-toolbar gap-2', collapsed ? 'px-2.5 justify-center' : 'px-3')}>
        {collapsed ? (
          <button
            type="button"
            onClick={onCompose}
            className="sm5-btn flex h-9 w-9 items-center justify-center"
            title="Compose new email"
            aria-label="Compose new email"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onQueryChange(event.target.value)
                }
                placeholder="Search mail…"
                className="sm5-input h-9 w-full pl-9 pr-3 text-xs"
                aria-label="Search mail"
              />
            </div>

            <button
              type="button"
              onClick={onCompose}
              className="sm5-btn flex h-9 shrink-0 items-center gap-1.5 px-3"
              style={{ fontSize: 12 }}
              title="Compose new email"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Compose</span>
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <div
          className="flex h-10 shrink-0 items-center gap-2 px-3.5"
          style={{ borderBottom: '1px solid var(--border-1)' }}
        >
          <Inbox className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <span
            className="min-w-0 flex-1 truncate font-bold"
            style={{ fontSize: 12.5, color: 'var(--text-primary)' }}
          >
            Mailboxes
          </span>
        </div>
      )}

      <div className={cn('flex-1 overflow-y-auto overflow-x-hidden sm5-scroll py-3 space-y-1', collapsed ? 'px-2' : 'px-2.5')}>
        {SYSTEM_FOLDERS.map((f) => {
          const summary = mailboxSummaries[f.id];

          return (
            <FolderButton
              key={f.id}
              id={f.id}
              name={f.name}
              Icon={f.icon}
              unread={
                summary?.unreadCount != null
                  ? Math.max(0, Number(summary.unreadCount))
                  : unreadFor(f.id)
              }
              latestAt={
                summary?.latestMessageAt != null
                  ? summary.latestMessageAt
                  : folderActivity[f.id]
              }
            />
          );
        })}

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
              <FolderButton
                key={l.id}
                id={l.id}
                name={l.name}
                Icon={Tag}
                unread={l.messagesUnread || 0}
                latestAt={folderActivity[l.id]}
              />
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

function DraftRow({
  draft,
  onOpen,
  onDiscard,
  opening,
  discarding,
}: {
  draft: MailDraft;
  onOpen: () => void;
  onDiscard: () => void;
  opening: boolean;
  discarding: boolean;
}) {
  const m = draft.message;
  const busy = opening || discarding;

  return (
    <div
      onClick={() => {
        if (!busy) onOpen();
      }}
      className={cn(
        'sm5-msg-row flex items-start gap-3 px-4 py-3.5',
        busy && 'pointer-events-none opacity-70',
      )}
      aria-busy={busy}
    >
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
        onClick={(e) => {
          e.stopPropagation();
          if (!busy) onDiscard();
        }}
        disabled={busy}
        className="sm5-icon-btn h-10 w-10 shrink-0 -mt-0.5"
        title={discarding ? 'Deleting draft…' : opening ? 'Opening draft…' : 'Discard draft'}
        aria-label={discarding ? 'Deleting draft' : 'Discard draft'}
      >
        {discarding
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Trash2 className="h-3.5 w-3.5" />}
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
      className={cn('sm5-msg-row flex items-center gap-2.5 px-3 sm:px-4 py-3 @lg:py-2.5 group', msg.isUnread && 'bg-emerald-500/4')}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onAction(msg.isStarred ? 'unstar' : 'star'); }}
        className="shrink-0 self-start @lg:self-center -m-2 p-2 mt-0.5 @lg:mt-0"
        title={msg.isStarred ? 'Unstar' : 'Star'}
      >
        <Star className="h-4 w-4" style={{ color: msg.isStarred ? '#f0a855' : 'var(--text-disabled)', fill: msg.isStarred ? '#f0a855' : 'none' }} />
      </button>

      <div className="min-w-0 flex-1 @lg:flex @lg:items-center @lg:gap-3">
        {/* Sender — fixed column on lg */}
        <div className="flex items-center gap-2 @lg:w-48 @lg:shrink-0">
          <span className={cn('truncate', msg.isUnread ? 'font-bold' : 'font-medium')} style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {msg.from.name || msg.from.email}
          </span>
          {msg.attachments.length > 0 && <Paperclip className="h-3 w-3 shrink-0 @lg:hidden" style={{ color: 'var(--text-tertiary)' }} />}
          <span
            className="ml-auto shrink-0 sm5-mono @lg:hidden"
            style={{ fontSize: 10.5, color: msg.isUnread ? 'var(--accent-text)' : 'var(--text-tertiary)', fontWeight: msg.isUnread ? 700 : 400 }}
          >
            {fmtListDate(msg.internalDate)}
          </span>
        </div>

        {/* Subject + snippet — inline on lg, stacked below */}
        <div className="min-w-0 flex-1">
          <p className="sm5-body truncate mt-0.5 @lg:mt-0">
            <span className={cn(msg.isUnread && 'font-semibold')} style={{ color: 'var(--text-primary)' }}>{msg.subject}</span>
            <span className="hidden @lg:inline" style={{ color: 'var(--text-tertiary)' }}>{'  —  '}{msg.snippet}</span>
          </p>
          <p className="sm5-supporting truncate mt-0.5 @lg:hidden">{msg.snippet}</p>
        </div>
      </div>

      {/* Right cluster on lg: attachment, date, hover actions */}
      <div className="hidden @lg:flex items-center gap-2 shrink-0">
        {msg.attachments.length > 0 && <Paperclip className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />}
        <span
          className="sm5-mono group-hover:hidden"
          style={{ fontSize: 12.5, minWidth: 88, textAlign: 'right', color: msg.isUnread ? 'var(--accent-text)' : 'var(--text-tertiary)', fontWeight: msg.isUnread ? 700 : 400 }}
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
            <span className="sm5-title-sm truncate">
              {msg.from.name || msg.from.email}
            </span>
            <span className="ml-auto shrink-0 sm5-mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
              {fmtListDate(msg.internalDate)}
            </span>
          </div>
          <p className="sm5-supporting truncate mt-0.5">
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

export function InboxTab({
  token,
  theme,
  refreshSignal,
  manualRefreshSignal,
  onGlobalRefreshHandled,
  onInboxUnreadTotalChange,
}: {
  token: string;
  theme: 'dark' | 'light';
  refreshSignal: number;
  manualRefreshSignal: number;
  onGlobalRefreshHandled: () => void;
  onInboxUnreadTotalChange?: (count: number) => void;
}) {
  const auth = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [labels, setLabels] = React.useState<MailLabel[]>([]);
  const [activeLabel, setActiveLabel] = React.useState('INBOX');
  const [messages, setMessages] = React.useState<MailMessageMeta[]>([]);
  const [drafts, setDrafts] = React.useState<MailDraft[]>([]);
  const [nextPageToken, setNextPageToken] = React.useState<string | undefined>();
  // A freshly-mounted mailbox has not proven that it is empty yet.
  // Start in a loading/unknown state so the first paint can never show a false
  // "Nothing here yet" before the initial mailbox request begins.
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [searchQ, setSearchQ] = React.useState('');
  const [openThreadId, setOpenThreadId] = React.useState<string | null>(null);
  const [threadMsgs, setThreadMsgs] = React.useState<MailMessageMeta[]>([]);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [compose, setCompose] = React.useState<ComposePrefill | null>(null);
  const [downloadingAtt, setDownloadingAtt] = React.useState<string | null>(null);
  const [folderActivity, setFolderActivity] = React.useState<
    Record<string, number | undefined>
  >({});
  const [mailboxSummaries, setMailboxSummaries] = React.useState<
    Record<string, SystemMailboxSummary | undefined>
  >({});
  const [mailboxSummaryStatus, setMailboxSummaryStatus] = React.useState<
    'loading' | 'ready' | 'error'
  >('loading');

  // One Desk's channel selector/pane badge uses the same Gmail-authoritative
  // Inbox unread total as this folder rail. Optimistic read/unread changes also
  // flow through mailboxSummaries, so the outer badge updates immediately.
  const inboxUnreadTotal =
    mailboxSummaries.INBOX?.unreadCount;

  React.useEffect(() => {
    if (inboxUnreadTotal == null) return;

    onInboxUnreadTotalChange?.(
      Math.max(0, Number(inboxUnreadTotal)),
    );
  }, [
    inboxUnreadTotal,
    onInboxUnreadTotalChange,
  ]);

  const [openingDraftId, setOpeningDraftId] = React.useState<string | null>(null);
  const [discardingDraftIds, setDiscardingDraftIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const manualRefreshSignalRef = React.useRef(manualRefreshSignal);
  const labelsRequestSeqRef = React.useRef(0);
  const localMutationRevisionRef = React.useRef(0);
  const openThreadRequestSeqRef = React.useRef(0);

  // Read/unread mutations are optimistic. A mailbox refresh can race the
  // backend PATCH and briefly return the pre-mutation local-index snapshot.
  // Keep the latest desired read state authoritative until that PATCH settles.
  const readMutationTokenRef = React.useRef(0);
  const pendingReadStateRef = React.useRef<
    Map<string, { isUnread: boolean; token: number }>
  >(new Map());

  const openThreadIdRef = React.useRef<string | null>(openThreadId);
  const realtimeRefreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMoreRef = React.useRef(false);
  const mailboxCacheRef = React.useRef<Record<string, MailboxCacheEntry>>({});
  const mailboxSummaryInFlightRef = React.useRef(false);
  const mailboxSummaryPendingRef = React.useRef(false);
  const listInFlightKeysRef = React.useRef<Set<string>>(new Set());
  const listPendingKeysRef = React.useRef<Set<string>>(new Set());

  // Empty-state correctness.
  // A zero-length array is not proof of an empty Gmail folder. Record which
  // exact mailbox/search scopes have received a successful first-page response,
  // and separately record unresolved first-load failures.
  const listResolvedScopesRef = React.useRef<Set<string>>(new Set());
  const listFailedScopesRef = React.useRef<Set<string>>(new Set());

  // Stage 1.4.3 — mailbox state ownership.
  // A request in Inbox must never invalidate a valid Starred/Sent/Drafts/Trash
  // response. Track first-page generations independently per mailbox/search
  // scope and compare async results against the *live* selected view.
  const listGenerationByScopeRef = React.useRef<Map<string, number>>(new Map());
  const activeLabelRef = React.useRef(activeLabel);
  const searchQRef = React.useRef(searchQ);
  const loadingListScopeRef = React.useRef<string | null>(null);
  const loadingMoreRequestKeyRef = React.useRef<string | null>(null);

  const openingDraftIdsRef = React.useRef<Set<string>>(new Set());
  const discardingDraftIdsRef = React.useRef<Set<string>>(new Set());

  // Keep async callbacks pointed at the current render instead of the render
  // in which a long Gmail request originally started.
  activeLabelRef.current = activeLabel;
  searchQRef.current = searchQ;
  openThreadIdRef.current = openThreadId;

  React.useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

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

  React.useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );

  /* ── Data fetching ── */

  const fetchLabels = React.useCallback(async () => {
    const requestSeq = ++labelsRequestSeqRef.current;

    try {
      const response = await apiClient.get('/api/mail/labels', {
        headers: auth,
      });

      if (requestSeq !== labelsRequestSeqRef.current) return;
      setLabels(response.data?.data?.labels || []);
    } catch {
      // Keep the last successful label snapshot during a transient failure.
    }
  }, [auth]);

  const fetchMailboxSummaries = React.useCallback(async () => {
    if (mailboxSummaryInFlightRef.current) {
      // Never overlap summary requests. Preserve exactly one trailing refresh
      // so an event that happens during the in-flight request is not lost.
      mailboxSummaryPendingRef.current = true;
      return;
    }

    mailboxSummaryInFlightRef.current = true;

    try {
      do {
        mailboxSummaryPendingRef.current = false;

        try {
          const response = await apiClient.get(
            '/api/mail/mailbox-summary',
            {
              headers: auth,
              timeout: 30_000,
            },
          );

          const rawMailboxes = Array.isArray(
            response.data?.data?.mailboxes,
          )
            ? response.data.data.mailboxes
            : [];

          const next: Record<
            string,
            SystemMailboxSummary | undefined
          > = {};

          for (const raw of rawMailboxes) {
            const item =
              raw as Partial<SystemMailboxSummary>;
            const id = String(item.id || '');

            if (!SYSTEM_MAILBOX_IDS.has(id)) continue;

            next[id] = {
              id: id as SystemMailboxSummary['id'],
              latestMessageAt:
                item.latestMessageAt == null
                  ? null
                  : Number(item.latestMessageAt),
              unreadCount:
                item.unreadCount == null
                  ? null
                  : Math.max(0, Number(item.unreadCount)),
              totalCount:
                item.totalCount == null
                  ? null
                  : Math.max(0, Number(item.totalCount)),
            };
          }

          setMailboxSummaries(next);
          setMailboxSummaryStatus('ready');
        } catch {
          // Keep the last successful snapshot. If no successful summary has
          // ever loaded in this mount, remember that emptiness is still
          // unconfirmed rather than presenting a false empty folder.
          setMailboxSummaryStatus((current) =>
            current === 'ready' ? current : 'error',
          );

          // Existing label counts and visited-folder activity remain as a
          // graceful fallback.
        }
      } while (mailboxSummaryPendingRef.current);
    } finally {
      mailboxSummaryInFlightRef.current = false;
    }
  }, [auth]);

  const applyPendingReadState = React.useCallback(
    (items: MailMessageMeta[]): MailMessageMeta[] =>
      items.map((message) => {
        const pending = pendingReadStateRef.current.get(message.id);
        if (!pending || message.isUnread === pending.isUnread) {
          return message;
        }

        return {
          ...message,
          isUnread: pending.isUnread,
        };
      }),
    [],
  );

  const fetchList = React.useCallback(async (
    opts: { silent?: boolean; pageToken?: string } = {},
  ) => {
    const isPagination = Boolean(opts.pageToken);

    // Read the live mailbox at invocation time. This is intentionally not
    // captured from an older React render: runAction/realtime/trailing refresh
    // callbacks can finish after the user has switched folders.
    const requestLabel = activeLabelRef.current;
    const requestSearchQ = searchQRef.current;
    const requestDraftsView = requestLabel === 'DRAFTS';
    const cacheable = !requestSearchQ;

    const requestScopeKey = [
      requestDraftsView ? 'drafts' : 'messages',
      requestLabel,
      requestSearchQ,
    ].join('|');

    const requestKey = [
      requestScopeKey,
      opts.pageToken || 'first',
    ].join('|');

    if (listInFlightKeysRef.current.has(requestKey)) {
      if (!isPagination) {
        // Preserve exactly one trailing reconciliation for this mailbox. This
        // is especially important when the user switches away and back while
        // the original request is still in flight.
        listPendingKeysRef.current.add(requestKey);

        if (!opts.silent) {
          loadingListScopeRef.current = requestScopeKey;
          setLoadingList(true);
        }
      }
      return;
    }

    listInFlightKeysRef.current.add(requestKey);

    // A new first-page request supersedes older pagination/first-page results
    // only for this exact mailbox/search scope — never for another folder.
    let requestGeneration =
      listGenerationByScopeRef.current.get(requestScopeKey) || 0;

    if (!isPagination) {
      requestGeneration += 1;
      listGenerationByScopeRef.current.set(
        requestScopeKey,
        requestGeneration,
      );
    }

    const mutationRevisionAtStart =
      localMutationRevisionRef.current;

    if (!opts.silent && !isPagination) {
      loadingListScopeRef.current = requestScopeKey;
      setLoadingList(true);
    }

    if (isPagination) {
      loadingMoreRequestKeyRef.current = requestKey;
      setLoadingMore(true);
    }

    const isStillCurrentGeneration = () =>
      (listGenerationByScopeRef.current.get(requestScopeKey) || 0) ===
      requestGeneration;

    const isLiveView = () => {
      const liveLabel = activeLabelRef.current;
      const liveSearchQ = searchQRef.current;
      const liveDraftsView = liveLabel === 'DRAFTS';

      return (
        liveLabel === requestLabel &&
        liveSearchQ === requestSearchQ &&
        liveDraftsView === requestDraftsView
      );
    };

    try {
      if (requestDraftsView) {
        const response = await apiClient.get('/api/mail/drafts', {
          headers: auth,
          params: { pageToken: opts.pageToken },
        });

        const data = response.data?.data;
        const incomingDrafts: MailDraft[] = data?.drafts || [];

        if (
          isStillCurrentGeneration() &&
          mutationRevisionAtStart === localMutationRevisionRef.current &&
          cacheable
        ) {
          listResolvedScopesRef.current.add(requestScopeKey);
          listFailedScopesRef.current.delete(requestScopeKey);

          const previous = mailboxCacheRef.current[requestLabel];
          const mergedDrafts =
            isPagination && previous?.kind === 'drafts'
              ? [...previous.drafts, ...incomingDrafts]
              : incomingDrafts;

          mailboxCacheRef.current[requestLabel] = {
            kind: 'drafts',
            drafts: mergedDrafts,
            nextPageToken: data?.nextPageToken,
            cachedAt: Date.now(),
          };

          const latestAt = mergedDrafts.reduce(
            (latest, draft) =>
              Math.max(latest, Number(draft.message.internalDate || 0)),
            0,
          );

          if (latestAt) {
            setFolderActivity((current) =>
              current[requestLabel] === latestAt
                ? current
                : { ...current, [requestLabel]: latestAt },
            );
          }
        }

        // A valid Draft response can populate the Draft cache while another
        // folder is selected, but it may only touch visible rows if Drafts is
        // still the live view.
        if (
          !isStillCurrentGeneration() ||
          !isLiveView() ||
          mutationRevisionAtStart !== localMutationRevisionRef.current
        ) {
          return;
        }

        listResolvedScopesRef.current.add(requestScopeKey);
        listFailedScopesRef.current.delete(requestScopeKey);

        setMessages([]);
        setDrafts((current) =>
          isPagination
            ? [...current, ...incomingDrafts]
            : incomingDrafts,
        );
        setNextPageToken(data?.nextPageToken);
      } else {
        const response = await apiClient.get('/api/mail/messages', {
          headers: auth,
          params: {
            label: requestSearchQ ? undefined : requestLabel,
            q: requestSearchQ || undefined,
            pageToken: opts.pageToken,
          },
          timeout: 60_000,
        });

        const data = response.data?.data;
        const incomingMessages = applyPendingReadState(
          (data?.messages || []) as MailMessageMeta[],
        );

        if (
          isStillCurrentGeneration() &&
          mutationRevisionAtStart === localMutationRevisionRef.current &&
          cacheable
        ) {
          listResolvedScopesRef.current.add(requestScopeKey);
          listFailedScopesRef.current.delete(requestScopeKey);

          const previous = mailboxCacheRef.current[requestLabel];
          const mergedMessages =
            isPagination && previous?.kind === 'messages'
              ? [...previous.messages, ...incomingMessages]
              : incomingMessages;

          mailboxCacheRef.current[requestLabel] = {
            kind: 'messages',
            messages: mergedMessages,
            nextPageToken: data?.nextPageToken,
            cachedAt: Date.now(),
          };

          const latestAt = mergedMessages.reduce(
            (latest, message) =>
              Math.max(latest, Number(message.internalDate || 0)),
            0,
          );

          if (latestAt) {
            setFolderActivity((current) =>
              current[requestLabel] === latestAt
                ? current
                : { ...current, [requestLabel]: latestAt },
            );
          }
        }

        if (
          !isStillCurrentGeneration() ||
          !isLiveView() ||
          mutationRevisionAtStart !== localMutationRevisionRef.current
        ) {
          return;
        }

        listResolvedScopesRef.current.add(requestScopeKey);
        listFailedScopesRef.current.delete(requestScopeKey);

        setDrafts([]);
        setMessages((current) =>
          isPagination
            ? [...current, ...incomingMessages]
            : incomingMessages,
        );
        setNextPageToken(data?.nextPageToken);
      }
    } catch (error) {
      if (
        !isPagination &&
        isLiveView() &&
        !listResolvedScopesRef.current.has(requestScopeKey)
      ) {
        listFailedScopesRef.current.add(requestScopeKey);
      }

      // Only show a load error for the mailbox the user is actually looking
      // at. A background response from a folder they already left should not
      // produce a misleading toast.
      if (!opts.silent && isLiveView()) {
        toast.error(getErrorMessage(error, 'Could not load emails.'));
      }
    } finally {
      listInFlightKeysRef.current.delete(requestKey);

      if (
        !isPagination &&
        loadingListScopeRef.current === requestScopeKey &&
        isLiveView()
      ) {
        loadingListScopeRef.current = null;
        setLoadingList(false);
      }

      if (
        isPagination &&
        loadingMoreRequestKeyRef.current === requestKey
      ) {
        loadingMoreRequestKeyRef.current = null;
        setLoadingMore(false);
      }

      const shouldRunTrailing =
        !isPagination &&
        listPendingKeysRef.current.delete(requestKey) &&
        isLiveView();

      if (shouldRunTrailing) {
        window.setTimeout(() => {
          void fetchList({ silent: true });
        }, 0);
      }
    }
  }, [applyPendingReadState, auth]);

  React.useEffect(() => {
    void fetchLabels();
    void fetchMailboxSummaries();
  }, [fetchLabels, fetchMailboxSummaries]);

  React.useEffect(() => {
    openThreadIdRef.current = null;
    ++openThreadRequestSeqRef.current;
    setOpenThreadId(null);

    loadingMoreRef.current = false;
    loadingMoreRequestKeyRef.current = null;
    setLoadingMore(false);

    if (searchQ) {
      setMessages([]);
      setDrafts([]);
      setNextPageToken(undefined);
      loadingListScopeRef.current = [
        'messages',
        activeLabel,
        searchQ,
      ].join('|');
      void fetchList();
      return;
    }

    const cached = mailboxCacheRef.current[activeLabel];

    if (isDraftsView && cached?.kind === 'drafts') {
      setDrafts(cached.drafts);
      setMessages([]);
      setNextPageToken(cached.nextPageToken);
      setLoadingList(false);

      if (Date.now() - cached.cachedAt > MAILBOX_CACHE_REVALIDATE_MS) {
        void fetchList({ silent: true });
      }
      return;
    }

    if (!isDraftsView && cached?.kind === 'messages') {
      setMessages(cached.messages);
      setDrafts([]);
      setNextPageToken(cached.nextPageToken);
      setLoadingList(false);

      if (Date.now() - cached.cachedAt > MAILBOX_CACHE_REVALIDATE_MS) {
        void fetchList({ silent: true });
      }
      return;
    }

    setMessages([]);
    setDrafts([]);
    setNextPageToken(undefined);
    loadingListScopeRef.current = [
      isDraftsView ? 'drafts' : 'messages',
      activeLabel,
      '',
    ].join('|');
    void fetchList();
  }, [activeLabel, fetchList, isDraftsView, searchQ]);

  // Realtime refresh signal from the page-level socket/fallback.
  // Important safeguards:
  // - collapse bursty Gmail history events into one fetch;
  // - never replace an active search result automatically;
  // - never throw away an in-progress "load more" page;
  // - do not reopen/reset the current reader for unrelated new mail.
  React.useEffect(() => {
    if (refreshSignal <= 0) return;

    if (realtimeRefreshTimerRef.current) {
      clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = setTimeout(() => {
      realtimeRefreshTimerRef.current = null;

      void fetchLabels();
      void fetchMailboxSummaries();

      if (!searchQ && !loadingMoreRef.current) {
        void fetchList({ silent: true });
      }

      onGlobalRefreshHandled();
    }, 120);

    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
    };
  }, [
    fetchLabels,
    fetchList,
    fetchMailboxSummaries,
    onGlobalRefreshHandled,
    refreshSignal,
    searchQ,
  ]);

  /**
   * Refresh an already-open reader without invoking openThread().
   *
   * openThread() intentionally owns the user action "open this message" and
   * therefore keeps its original mark-as-read behavior. A global/manual
   * refresh is not a user open, so it must only reload the reader contents and
   * must never PATCH Gmail read state.
   */
  const refreshOpenThread = async (threadId: string) => {
    try {
      const r = await apiClient.get(`/api/mail/threads/${threadId}`, {
        headers: auth,
      });
      const msgs = applyPendingReadState(
        (r.data?.data?.messages || []) as MailMessageMeta[],
      );

      // Use a live ref rather than this async function's render-time closure.
      // A fast folder switch closes the reader immediately; a late thread GET
      // must not repopulate state for that already-closed reader.
      if (openThreadIdRef.current !== threadId) return;

      setThreadMsgs(msgs);
      setExpandedIds(
        new Set(
          msgs.length
            ? [msgs[msgs.length - 1].id]
            : [],
        ),
      );
    } catch {
      // Keep the already-rendered reader usable if the refresh fails.
      // The normal mail error/sync surfaces remain responsible for reporting
      // provider/account problems.
    }
  };

  // Manual refresh from the single Suprah One Desk header control.
  //
  // Order matters:
  //   1) run the existing Gmail history sync;
  //   2) THEN reread the exact active folder/search/draft scope;
  //   3) refresh labels, authoritative mailbox totals, and the open reader.
  //
  // The previous order fetched local-index first and started Gmail sync after
  // it, so a user could click Refresh and simply repaint the same stale data.
  React.useEffect(() => {
    if (manualRefreshSignal === manualRefreshSignalRef.current) return;
    manualRefreshSignalRef.current = manualRefreshSignal;

    let cancelled = false;

    void (async () => {
      try {
        await apiClient.post(
          '/api/mail/sync',
          {},
          { headers: auth },
        );
      } catch {
        // A sync failure should not prevent a read-only reconciliation of the
        // currently visible scope.
      }

      if (cancelled) return;

      await Promise.allSettled([
        fetchList({ silent: true }),
        fetchLabels(),
        fetchMailboxSummaries(),
        openThreadId
          ? refreshOpenThread(openThreadId)
          : Promise.resolve(),
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    auth,
    fetchLabels,
    fetchList,
    fetchMailboxSummaries,
    manualRefreshSignal,
    openThreadId,
  ]); // eslint-disable-line



  // Debounced search.
  React.useEffect(() => {
    const t = setTimeout(() => setSearchQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  /* ── Local mutations ── */

  const patchMessageInMailboxCaches = (
    id: string,
    patch: Partial<MailMessageMeta>,
  ) => {
    for (const [key, entry] of Object.entries(
      mailboxCacheRef.current,
    )) {
      if (entry.kind !== 'messages') continue;

      mailboxCacheRef.current[key] = {
        ...entry,
        messages: entry.messages.map((message) =>
          message.id === id
            ? { ...message, ...patch }
            : message,
        ),
      };
    }
  };

  const removeMessageFromMailboxCaches = (
    id: string,
    options: {
      removeFromAll?: boolean;
      removeFromLabels?: string[];
      invalidateLabels?: string[];
    } = {},
  ) => {
    const removeLabels = new Set(
      options.removeFromLabels || [],
    );
    const invalidateLabels = new Set(
      options.invalidateLabels || [],
    );

    for (const [key, entry] of Object.entries(
      mailboxCacheRef.current,
    )) {
      if (invalidateLabels.has(key)) {
        delete mailboxCacheRef.current[key];
        continue;
      }

      if (entry.kind !== 'messages') continue;
      if (
        !options.removeFromAll &&
        !removeLabels.has(key)
      ) {
        continue;
      }

      mailboxCacheRef.current[key] = {
        ...entry,
        messages: entry.messages.filter(
          (message) => message.id !== id,
        ),
        cachedAt: Date.now(),
      };
    }
  };

  const invalidateMailboxCaches = () => {
    localMutationRevisionRef.current += 1;
    mailboxCacheRef.current = {};
  };

  const upsertMessageIntoStarredCache = (
    message: MailMessageMeta,
  ) => {
    const entry = mailboxCacheRef.current.STARRED;
    if (entry?.kind !== 'messages') return;

    const starredMessage = {
      ...message,
      isStarred: true,
    };

    const nextMessages = [
      starredMessage,
      ...entry.messages.filter(
        (current) => current.id !== message.id,
      ),
    ].sort(
      (a, b) =>
        Number(b.internalDate || 0) -
        Number(a.internalDate || 0),
    );

    mailboxCacheRef.current.STARRED = {
      ...entry,
      messages: nextMessages,
      cachedAt: Date.now(),
    };
  };

  /**
   * System-folder badges render mailboxSummaries before the generic Gmail
   * label snapshot. Keep that displayed value optimistic during read/unread
   * actions, then let the backend summary reconcile the mailbox-wide count
   * against Gmail.
   */
  const adjustMailboxSummaryUnread = (
    affectedMessages: MailMessageMeta[],
    delta: number,
  ) => {
    if (!delta || affectedMessages.length === 0) return;

    const deltas = new Map<
      SystemMailboxSummary['id'],
      number
    >();

    for (const message of affectedMessages) {
      const seen = new Set<
        SystemMailboxSummary['id']
      >();

      for (const labelId of message.labelIds || []) {
        const mailboxId =
          SYSTEM_LABEL_TO_MAILBOX[labelId];

        if (!mailboxId || seen.has(mailboxId)) {
          continue;
        }

        seen.add(mailboxId);
        deltas.set(
          mailboxId,
          (deltas.get(mailboxId) || 0) + delta,
        );
      }
    }

    setMailboxSummaries((current) => {
      let changed = false;
      const next = { ...current };

      for (const [mailboxId, mailboxDelta] of deltas) {
        const summary = next[mailboxId];

        // Do not invent a total from the visible 25-row window. Null means we
        // are still waiting for Gmail's mailbox-wide count.
        if (summary?.unreadCount == null) continue;

        const unreadCount = Math.max(
          0,
          Number(summary.unreadCount) + mailboxDelta,
        );

        if (unreadCount === summary.unreadCount) {
          continue;
        }

        changed = true;
        next[mailboxId] = {
          ...summary,
          unreadCount,
        };
      }

      return changed ? next : current;
    });
  };

  const patchLocal = (id: string, patch: Partial<MailMessageMeta>) => {
    localMutationRevisionRef.current += 1;
    patchMessageInMailboxCaches(id, patch);

    setMessages((p) =>
      p.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
    setThreadMsgs((p) =>
      p.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const openThread = async (
    threadId: string,
    options: {
      silent?: boolean;
      openedMessageId: string;
    },
  ) => {
    const requestSeq =
      ++openThreadRequestSeqRef.current;

    openThreadIdRef.current = threadId;
    setOpenThreadId(threadId);

    if (!options.silent) {
      setLoadingThread(true);
      setThreadMsgs([]);
    }

    try {
      const response = await apiClient.get(
        `/api/mail/threads/${threadId}`,
        { headers: auth },
      );

      // A delayed response from an older reader must never mutate mail after
      // the user switched folder/search, opened another email, or closed it.
      if (
        requestSeq !== openThreadRequestSeqRef.current ||
        openThreadIdRef.current !== threadId
      ) {
        return;
      }

      const msgs = applyPendingReadState(
        (response.data?.data?.messages || []) as MailMessageMeta[],
      );

      setThreadMsgs(msgs);
      setExpandedIds(
        new Set(
          msgs.length
            ? [msgs[msgs.length - 1].id]
            : [],
        ),
      );

      /**
       * Inbox is message-based.
       *
       * The checkpoint previously marked EVERY unread Gmail message inside the
       * loaded thread read. Opening one row could therefore turn several other
       * unread messages read.
       *
       * Only the exact row the user clicked is allowed to become read.
       */
      const openedMessage = msgs.find(
        (message) =>
          message.id === options.openedMessageId,
      );

      if (!openedMessage?.isUnread) {
        return;
      }

      const readMutationToken =
        ++readMutationTokenRef.current;

      pendingReadStateRef.current.set(
        openedMessage.id,
        {
          isUnread: false,
          token: readMutationToken,
        },
      );

      // Immediate optimistic update for ONE message only.
      adjustMailboxSummaryUnread(
        [openedMessage],
        -1,
      );

      setLabels((current) =>
        current.map((label) =>
          openedMessage.labelIds.includes(label.id)
            ? {
                ...label,
                messagesUnread: Math.max(
                  0,
                  Number(label.messagesUnread || 0) - 1,
                ),
              }
            : label,
        ),
      );

      patchLocal(
        openedMessage.id,
        { isUnread: false },
      );

      // Do not hold the reader open while Gmail confirms the read mutation.
      void apiClient
        .patch(
          `/api/mail/messages/${openedMessage.id}`,
          { action: 'read' },
          { headers: auth },
        )
        .then(() => {
          const pending =
            pendingReadStateRef.current.get(
              openedMessage.id,
            );

          // A newer explicit read/unread action owns the state now.
          if (pending?.token !== readMutationToken) {
            return;
          }

          pendingReadStateRef.current.delete(
            openedMessage.id,
          );

          // Reject list responses that began before this mutation settled.
          localMutationRevisionRef.current += 1;

          void fetchLabels();
          void fetchMailboxSummaries();
        })
        .catch(() => {
          const pending =
            pendingReadStateRef.current.get(
              openedMessage.id,
            );

          if (pending?.token !== readMutationToken) {
            return;
          }

          pendingReadStateRef.current.delete(
            openedMessage.id,
          );

          // Gmail did not confirm the read. Fully restore unread everywhere
          // instead of leaving the row falsely read.
          patchLocal(
            openedMessage.id,
            { isUnread: true },
          );

          adjustMailboxSummaryUnread(
            [openedMessage],
            1,
          );

          setLabels((current) =>
            current.map((label) =>
              openedMessage.labelIds.includes(label.id)
                ? {
                    ...label,
                    messagesUnread:
                      Number(label.messagesUnread || 0) + 1,
                  }
                : label,
            ),
          );

          invalidateMailboxCaches();
          void fetchList({ silent: true });
          void fetchLabels();
          void fetchMailboxSummaries();
        });
    } catch (error) {
      if (
        !options.silent &&
        requestSeq === openThreadRequestSeqRef.current &&
        openThreadIdRef.current === threadId
      ) {
        toast.error(
          getErrorMessage(
            error,
            'Could not open the email.',
          ),
        );
      }
    } finally {
      if (
        requestSeq === openThreadRequestSeqRef.current &&
        openThreadIdRef.current === threadId
      ) {
        setLoadingThread(false);
      }
    }
  };

  const runAction = async (
    msg: MailMessageMeta,
    action: string,
  ) => {
    let readMutationToken: number | null = null;
    let unreadBadgeDelta = 0;

    if (
      action === 'read' &&
      msg.isUnread
    ) {
      unreadBadgeDelta = -1;
    }

    if (
      action === 'unread' &&
      !msg.isUnread
    ) {
      unreadBadgeDelta = 1;
    }

    if (unreadBadgeDelta !== 0) {
      adjustMailboxSummaryUnread(
        [msg],
        unreadBadgeDelta,
      );
    }

    if (action === 'read' || action === 'unread') {
      readMutationToken = ++readMutationTokenRef.current;

      pendingReadStateRef.current.set(msg.id, {
        isUnread: action === 'unread',
        token: readMutationToken,
      });
    }

    const optimistic: Record<
      string,
      Partial<MailMessageMeta>
    > = {
      read: { isUnread: false },
      unread: { isUnread: true },
      star: { isStarred: true },
      unstar: { isStarred: false },
    };

    if (optimistic[action]) {
      patchLocal(msg.id, optimistic[action]);
    }

    if (action === 'star') {
      // STARRED is a mailbox membership change, not only a boolean icon.
      // If that mailbox is already cached, make it immediately consistent.
      upsertMessageIntoStarredCache(msg);

      if (
        activeLabelRef.current === 'STARRED' &&
        !searchQRef.current
      ) {
        setMessages((current) => {
          const starredMessage = {
            ...msg,
            isStarred: true,
          };

          return [
            starredMessage,
            ...current.filter(
              (message) => message.id !== msg.id,
            ),
          ].sort(
            (a, b) =>
              Number(b.internalDate || 0) -
              Number(a.internalDate || 0),
          );
        });
      }
    }

    if (action === 'unstar') {
      removeMessageFromMailboxCaches(msg.id, {
        removeFromLabels: ['STARRED'],
      });

      if (
        activeLabelRef.current === 'STARRED' &&
        !searchQRef.current
      ) {
        setMessages((current) =>
          current.filter(
            (message) => message.id !== msg.id,
          ),
        );
      }
    }

    if (action === 'archive') {
      localMutationRevisionRef.current += 1;

      // Gmail archive removes INBOX only. Preserve other loaded mailbox
      // snapshots and update cached Inbox immediately.
      removeMessageFromMailboxCaches(msg.id, {
        removeFromLabels: ['INBOX'],
      });

      if (activeLabel === 'INBOX') {
        setMessages((current) =>
          current.filter(
            (message) => message.id !== msg.id,
          ),
        );
      }

      if (openThreadId === msg.threadId) {
        openThreadIdRef.current = null;
        ++openThreadRequestSeqRef.current;
        setOpenThreadId(null);
      }
    }

    if (action === 'trash') {
      localMutationRevisionRef.current += 1;

      // The message leaves normal folders. Keep those loaded caches in sync,
      // while invalidating TRASH so opening it fetches the newly moved item.
      removeMessageFromMailboxCaches(msg.id, {
        removeFromAll: true,
        invalidateLabels: ['TRASH'],
      });

      if (activeLabel !== 'TRASH') {
        setMessages((current) =>
          current.filter(
            (message) => message.id !== msg.id,
          ),
        );
      }

      if (openThreadId === msg.threadId) {
        openThreadIdRef.current = null;
        ++openThreadRequestSeqRef.current;
        setOpenThreadId(null);
      }
    }

    try {
      await apiClient.patch(
        `/api/mail/messages/${msg.id}`,
        { action },
        { headers: auth },
      );

      if (readMutationToken !== null) {
        const pending =
          pendingReadStateRef.current.get(msg.id);

        if (pending?.token === readMutationToken) {
          pendingReadStateRef.current.delete(msg.id);

          // Invalidate any list response that started while this PATCH was
          // unresolved. If it returns the older read state after settlement,
          // Stage 1.4.3's mutation-revision guard will now discard it.
          localMutationRevisionRef.current += 1;
        }
      }

      if (action === 'trash') {
        toast.success('Moved to trash');
      }
      if (action === 'archive') {
        toast.success('Archived');
      }

      void fetchLabels();
      void fetchMailboxSummaries();

      if (
        (action === 'star' || action === 'unstar') &&
        activeLabelRef.current === 'STARRED' &&
        !searchQRef.current
      ) {
        // If the user switched into Starred while this mutation was in flight,
        // reconcile that live mailbox. Existing request-key dedupe guarantees
        // this becomes at most one trailing refresh.
        void fetchList({ silent: true });
      }

      // Archive/trash already maintain their affected mailbox caches
      // optimistically. Gmail history/socket reconciliation remains the
      // follow-up source of truth.
    } catch (error) {
      if (readMutationToken !== null) {
        const pending =
          pendingReadStateRef.current.get(msg.id);

        if (pending?.token === readMutationToken) {
          pendingReadStateRef.current.delete(msg.id);
          localMutationRevisionRef.current += 1;
        }
      }

      if (unreadBadgeDelta !== 0) {
        adjustMailboxSummaryUnread(
          [msg],
          -unreadBadgeDelta,
        );
      }

      toast.error(
        getErrorMessage(error, 'Action failed.'),
      );

      invalidateMailboxCaches();
      void fetchList({ silent: true });
    }
  };

  const discardDraft = async (d: MailDraft) => {
    const draftId = d.draftId;

    // Ref-based guard is synchronous, so even a very fast double-click cannot
    // create two DELETE requests before React has time to re-render.
    if (discardingDraftIdsRef.current.has(draftId)) return;

    discardingDraftIdsRef.current.add(draftId);
    setDiscardingDraftIds((current) => {
      const next = new Set(current);
      next.add(draftId);
      return next;
    });

    try {
      await apiClient.delete(`/api/mail/drafts/${draftId}`, {
        headers: auth,
      });

      invalidateMailboxCaches();
      setDrafts((current) =>
        current.filter((draft) => draft.draftId !== draftId),
      );

      toast.success('Draft deleted');

      void fetchList({ silent: true });
      void fetchLabels();
      void fetchMailboxSummaries();
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Could not delete draft.'),
      );

      invalidateMailboxCaches();
      void fetchList({ silent: true });
    } finally {
      discardingDraftIdsRef.current.delete(draftId);
      setDiscardingDraftIds((current) => {
        const next = new Set(current);
        next.delete(draftId);
        return next;
      });
    }
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

  const openDraft = async (d: MailDraft) => {
    const draftId = d.draftId;

    if (openingDraftIdsRef.current.has(draftId)) return;
    if (discardingDraftIdsRef.current.has(draftId)) return;

    openingDraftIdsRef.current.add(draftId);
    setOpeningDraftId(draftId);

    try {
      const response = await apiClient.get(
        `/api/mail/drafts/${draftId}`,
        { headers: auth },
      );

      const fullDraft = response.data?.data?.draft as
        | MailDraft
        | undefined;

      if (!fullDraft?.message) {
        throw new Error('Draft detail was not returned');
      }

      setCompose({
        mode: 'draft',
        draftId: fullDraft.draftId || draftId,
        to: fullDraft.message.to,
        cc: fullDraft.message.cc,
        subject:
          fullDraft.message.subject === '(no subject)'
            ? ''
            : fullDraft.message.subject,
        body:
          fullDraft.message.bodyText ||
          (fullDraft.message.bodyHtml
            ? fullDraft.message.snippet
            : ''),
        threadId: fullDraft.message.threadId || undefined,
      });
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Could not open the draft.'),
      );

      // A draft can disappear between list load and click (another device or
      // browser tab). Reconcile instead of leaving a stale row behind.
      invalidateMailboxCaches();
      void fetchList({ silent: true });
      void fetchMailboxSummaries();
    } finally {
      openingDraftIdsRef.current.delete(draftId);
      setOpeningDraftId((current) =>
        current === draftId ? null : current,
      );
    }
  };

  const selectFolder = React.useCallback((id: string) => {
    // Update the live refs immediately so any in-flight async response that
    // settles during this click cannot write rows into the newly selected
    // mailbox.
    activeLabelRef.current = id;
    searchQRef.current = '';

    setQ('');
    setSearchQ('');
    openThreadIdRef.current = null;
    ++openThreadRequestSeqRef.current;
    setOpenThreadId(null);

    loadingMoreRef.current = false;
    loadingMoreRequestKeyRef.current = null;
    setLoadingMore(false);

    const cached = mailboxCacheRef.current[id];
    const draftsView = id === 'DRAFTS';

    if (draftsView && cached?.kind === 'drafts') {
      setDrafts(cached.drafts);
      setMessages([]);
      setNextPageToken(cached.nextPageToken);
      loadingListScopeRef.current = null;
      setLoadingList(false);
    } else if (!draftsView && cached?.kind === 'messages') {
      setMessages(cached.messages);
      setDrafts([]);
      setNextPageToken(cached.nextPageToken);
      loadingListScopeRef.current = null;
      setLoadingList(false);
    } else {
      // Never paint a new mailbox header/selection with the previous mailbox's
      // rows. The active folder and its rows change in the same React batch.
      setMessages([]);
      setDrafts([]);
      setNextPageToken(undefined);
      loadingListScopeRef.current = [
        draftsView ? 'drafts' : 'messages',
        id,
        '',
      ].join('|');
      setLoadingList(true);
    }

    setActiveLabel(id);
  }, []);

  const listEmpty = isDraftsView ? drafts.length === 0 : messages.length === 0;

  const currentListScopeKey = [
    isDraftsView ? 'drafts' : 'messages',
    activeLabel,
    searchQ,
  ].join('|');

  const currentScopeResolved =
    listResolvedScopesRef.current.has(currentListScopeKey);

  const currentScopeFailed =
    listFailedScopesRef.current.has(currentListScopeKey);

  const currentSystemSummary =
    !searchQ && SYSTEM_MAILBOX_IDS.has(activeLabel)
      ? mailboxSummaries[activeLabel]
      : undefined;

  const currentSystemTotal =
    currentSystemSummary?.totalCount == null
      ? null
      : Math.max(0, Number(currentSystemSummary.totalCount));

  // Search has no folder-wide total, so a successful zero-row search is enough
  // to confirm "no matches". For Gmail system folders, require BOTH:
  //   1) a successful first-page list response for the exact current scope;
  //   2) Gmail mailbox summary explicitly reporting totalCount === 0.
  //
  // If Gmail says there are messages (>0), or the summary is still unknown,
  // zero visible rows are treated as "still syncing/checking", never empty.
  const confirmedEmpty =
    !loadingList &&
    listEmpty &&
    currentScopeResolved &&
    (
      Boolean(searchQ) ||
      (
        mailboxSummaryStatus === 'ready' &&
        currentSystemTotal === 0
      )
    );

  const showUnconfirmedMailbox =
    !loadingList &&
    listEmpty &&
    !confirmedEmpty &&
    !currentScopeFailed;

  const showMailboxLoadFailure =
    !loadingList &&
    listEmpty &&
    !confirmedEmpty &&
    currentScopeFailed;

  /* ── Render ── */

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <LabelRail
        labels={labels}
        activeLabel={activeLabel}
        searching={!!searchQ}
        collapsed={railCollapsed}
        query={q}
        folderActivity={folderActivity}
        mailboxSummaries={mailboxSummaries}
        onQueryChange={setQ}
        onCompose={() => setCompose({ mode: 'new' })}
        onToggleCollapse={toggleRail}
        onSelect={selectFolder}
      />

      {/* Message list — full width; reading happens in the modal */}
      <section className="flex flex-col min-w-0 flex-1">
        {/* Mobile-only fallback.
            Do NOT use sm5-toolbar here: that class injects display:flex and can
            override Tailwind's responsive display rule. This explicit flex
            toolbar disappears reliably at md+ while preserving mobile access
            to Search + Compose when the desktop mailbox rail is hidden. */}
        <div
          className="flex h-[54px] shrink-0 items-center gap-2 border-b px-3 @md:!hidden"
          style={{ borderColor: 'var(--border-1)' }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              value={q}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQ(event.target.value)
              }
              placeholder="Search mail…"
              className="sm5-input h-9 w-full pl-9 pr-3 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setCompose({ mode: 'new' })}
            className="sm5-btn flex h-9 shrink-0 items-center gap-1.5 px-3"
            style={{ fontSize: 12 }}
            title="Compose new email"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Compose</span>
          </button>
        </div>

        {/* Mobile folder pills */}
        <div className="flex @md:hidden gap-1.5 px-3 py-2 overflow-x-auto sm5-scroll shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          {SYSTEM_FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFolder(f.id)}
              className="flex shrink-0 items-center rounded-full px-3 h-7 font-semibold"
              style={{
                fontSize: 11,
                background: activeLabel === f.id ? 'var(--accent)' : 'var(--bg-hover)',
                color: activeLabel === f.id ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-2)',
              }}
            >
              <span>{f.name}</span>
              {(() => {
                const summaryUnread =
                  mailboxSummaries[f.id]?.unreadCount;
                const unread =
                  summaryUnread != null
                    ? Math.max(0, Number(summaryUnread))
                    : unreadForMobile(labels, f.id);

                return unread > 0 ? (
                  <span
                    className="ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-black"
                    aria-label={`${unread} unread`}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null;
              })()}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto sm5-scroll">
          {loadingList && <CenterSpinner />}

          {showUnconfirmedMailbox && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <Loader2
                className="mb-3 h-6 w-6 animate-spin"
                style={{ color: 'var(--accent)' }}
              />
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {currentSystemTotal != null && currentSystemTotal > 0
                  ? 'Syncing your messages…'
                  : 'Checking this mailbox…'}
              </div>
              <div
                className="mt-1 max-w-sm text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                We’ll only show an empty folder after Gmail confirms there are
                no messages here.
              </div>
            </div>
          )}

          {showMailboxLoadFailure && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <Inbox
                className="mb-3 h-7 w-7"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Mailbox is still unavailable
              </div>
              <div
                className="mt-1 max-w-sm text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                We couldn’t confirm this folder’s contents yet. Use Refresh to
                try again — we won’t label it empty unless Gmail confirms it.
              </div>
            </div>
          )}

          {confirmedEmpty && (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              hint={searchQ ? 'No emails match your search' : 'Nothing here yet'}
            />
          )}

          {!loadingList && isDraftsView && drafts.map((d) => (
            <DraftRow
              key={d.draftId}
              draft={d}
              onOpen={() => void openDraft(d)}
              onDiscard={() => void discardDraft(d)}
              opening={openingDraftId === d.draftId}
              discarding={discardingDraftIds.has(d.draftId)}
            />
          ))}

          {!loadingList && !isDraftsView && messages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              onOpen={() =>
                openThread(m.threadId, {
                  openedMessageId: m.id,
                })
              }
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
          onClose={() => {
            openThreadIdRef.current = null;
            ++openThreadRequestSeqRef.current;
            setOpenThreadId(null);
          }}
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
          onSent={() => {
            mailboxCacheRef.current = {};
            void fetchList({ silent: true });
            void fetchLabels();
            void fetchMailboxSummaries();
          }}
        />
      )}
    </div>
  );
}