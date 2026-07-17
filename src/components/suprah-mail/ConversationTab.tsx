'use client';

import * as React from 'react';
import {
  AlertCircle, Archive, Check as CheckIcon, CheckCheck, ChevronLeft, Download,
  FileText, Loader2, MessageSquare, Paperclip, Plus, Search, Send, UserPlus, Users, Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Avatar, CenterSpinner, PendingFileChip, UploadProgressBar } from './Shared';
import { NewConversationModal } from './NewConversationModal';
import { ManageParticipantsModal } from './ManageParticipantsModal';
import {
  API_BASE, convAvatarSeed, convDisplayName, fmtChatDate, fmtChatTime,
  fmtListDate, fmtSize, getErrorMessage, ini, isGroupConv, senderLabel,
  validateFiles, avaColor,
} from './utils';
import type { ConvAttachment, ConvMessage, ConvPushPayload, MailConv, NewConversationPayload } from './types';

/* ── Attachment bubble ─────────────────────────────────────────────────── */

function ConvAttachmentView({ token, convId, message, att, index }: {
  token: string; convId: string; message: ConvMessage; att: ConvAttachment; index: number;
}) {
  const isImg = att.mimeType.startsWith('image/');
  const own = message.direction === 'outbound';
  // R2-stored files are direct URLs; inbound Gmail files stream through the
  // authenticated proxy (crmAuth accepts ?t= tokens, same as voice notes).
  const href = att.storageUrl
    || `${API_BASE}/api/mail/conversations/${convId}/attachments/${message._id}/${index}?t=${encodeURIComponent(token)}`;

  if (isImg) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden" style={{ maxWidth: 240 }}>
        <img
          src={href}
          alt={att.originalName}
          className="rounded-xl object-cover hover:opacity-90 transition-opacity"
          style={{ maxHeight: 200, display: 'block' }}
        />
      </a>
    );
  }

  return (
    <a
      href={href}
      download={att.originalName}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-opacity hover:opacity-80"
      style={{
        maxWidth: 260,
        background: own ? 'rgba(0,0,0,0.2)' : 'var(--surface-2)',
        border: `1px solid ${own ? 'rgba(255,255,255,0.12)' : 'var(--border-1)'}`,
      }}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: own ? 'rgba(255,255,255,0.12)' : 'var(--accent-muted)' }}>
        <FileText className="h-4 w-4" style={{ color: own ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate" style={{ color: own ? 'rgba(255,255,255,0.92)' : 'var(--text-primary)' }}>{att.originalName}</p>
        <p className="sm5-mono mt-0.5" style={{ fontSize: 10, color: own ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }}>{fmtSize(att.size)}</p>
      </div>
      <Download className="h-3.5 w-3.5 shrink-0" style={{ color: own ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }} />
    </a>
  );
}

/* ── Conversation list row ─────────────────────────────────────────────── */

function ConvRow({ conv, active, onOpen }: { conv: MailConv; active: boolean; onOpen: () => void }) {
  const display = convDisplayName(conv);
  const unread = conv.unreadCount > 0;
  const group = isGroupConv(conv);
  const preview = conv.lastMessagePreview || conv.subject;
  const previewPrefix = conv.lastMessageDirection === 'outbound'
    ? 'You: '
    : (group && conv.lastMessageFromName ? `${conv.lastMessageFromName.split(' ')[0]}: ` : '');

  return (
    <div
      onClick={onOpen}
      className={cn('sm5-conv-row flex items-center gap-2.5 px-3 py-2.5', active && 'sm5-conv-active', unread && 'bg-emerald-500/[0.05]')}
    >
      <Avatar seed={convAvatarSeed(conv)} size={36} fontSize={12} icon={group ? <Users2 className="h-4 w-4" /> : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('truncate', unread ? 'font-bold' : 'font-semibold')} style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{display}</p>
          <span className="ml-auto shrink-0 sm5-mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {conv.lastMessageAt ? fmtListDate(new Date(conv.lastMessageAt).getTime()) : ''}
          </span>
        </div>
        <p
          className="truncate mt-0.5"
          style={{ fontSize: 12, fontWeight: unread ? 600 : 400, color: unread ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          {previewPrefix}{preview}
        </p>
      </div>
      {unread && (
        <span
          className="shrink-0 rounded-full text-white font-bold text-center"
          style={{ fontSize: 9, minWidth: 17, height: 17, lineHeight: '17px', padding: '0 4px', background: 'var(--accent)' }}
        >
          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
        </span>
      )}
    </div>
  );
}

/* ── Chat bubbles ──────────────────────────────────────────────────────── */

function StatusIcon({ m }: { m: ConvMessage }) {
  if (m.status === 'sending') return <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--text-tertiary)' }} />;
  if (m.status === 'failed') return <AlertCircle className="h-3 w-3" style={{ color: 'var(--danger)' }} />;
  if (m.status === 'delivered') return <CheckCheck className="h-3 w-3" style={{ color: 'var(--accent-text)' }} />;
  return <CheckIcon className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />;
}

function ChatBubble({ token, convId, msg, prev, isGroup }: {
  token: string; convId: string; msg: ConvMessage; prev?: ConvMessage; isGroup: boolean;
}) {
  const showDate = !prev || fmtChatDate(prev.sentAt) !== fmtChatDate(msg.sentAt);
  const own = msg.direction === 'outbound';
  // In a group, label an inbound bubble with its sender when the previous
  // bubble came from someone else.
  const showSender = isGroup && !own && (!prev || prev.direction === 'outbound' || prev.fromEmail !== msg.fromEmail);
  const senderColor = avaColor(msg.fromName || msg.fromEmail);

  return (
    <>
      {showDate && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1" style={{ height: 1, background: 'var(--border-1)' }} />
          <span
            className="rounded-full px-3 py-0.5"
            style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}
          >
            {fmtChatDate(msg.sentAt)}
          </span>
          <div className="flex-1" style={{ height: 1, background: 'var(--border-1)' }} />
        </div>
      )}

      <div className={cn('flex flex-col gap-1 sm5-enter', own ? 'items-end' : 'items-start')}>
        {showSender && (
          <div className="flex items-center gap-1.5 pl-1">
            <span
              className="h-4 w-4 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: senderColor, fontSize: 8 }}
            >
              {ini(msg.fromName || msg.fromEmail)}
            </span>
            <span className="font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{senderLabel(msg)}</span>
          </div>
        )}

        {(msg.bodyText || msg.attachments.length === 0) && (
          <div
            className={cn('px-3.5 py-2.5', own ? 'sm5-bubble-own' : 'sm5-bubble-other')}
            style={{ maxWidth: 'min(85%, 34rem)', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {msg.bodyText || '(no text)'}
          </div>
        )}

        {msg.attachments.map((a, idx) => (
          <ConvAttachmentView key={idx} token={token} convId={convId} message={msg} att={a} index={idx} />
        ))}

        <div className={cn('flex items-center gap-1.5 px-1', own && 'flex-row-reverse')}>
          <span className="sm5-mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtChatTime(msg.sentAt)}</span>
          {own && <StatusIcon m={msg} />}
          {msg.status === 'failed' && <span style={{ fontSize: 10, color: 'var(--danger)' }}>{msg.errorMessage || 'Failed to send'}</span>}
        </div>
      </div>
    </>
  );
}

/* ── Conversation tab ──────────────────────────────────────────────────── */

export function ConversationTab({ token, convPush, onConvPushHandled }: {
  token: string;
  convPush: ConvPushPayload | null;
  onConvPushHandled: () => void;
}) {
  const auth = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [convos, setConvos] = React.useState<MailConv[]>([]);
  const [loadingConvos, setLoadingConvos] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeIdRef = React.useRef<string | null>(null);
  React.useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const [msgs, setMsgs] = React.useState<Record<string, ConvMessage[]>>({});
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  const activeConv = convos.find((c) => c._id === activeId);
  const activeMsgs = activeId ? (msgs[activeId] || []) : [];
  const isGroup = isGroupConv(activeConv);

  /* ── Data fetching ── */

  const fetchConvos = React.useCallback(async (silent = false) => {
    if (!silent) setLoadingConvos(true);
    try {
      const r = await apiClient.get('/api/mail/conversations', { headers: auth });
      setConvos(r.data?.data?.conversations || []);
    } catch (e) {
      if (!silent) toast.error(getErrorMessage(e, 'Could not load conversations.'));
    } finally {
      setLoadingConvos(false);
    }
  }, [auth]);

  const fetchMessages = React.useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const r = await apiClient.get(`/api/mail/conversations/${convId}/messages`, { headers: auth });
      setMsgs((p) => ({ ...p, [convId]: r.data?.data?.messages || [] }));
    } catch {
      /* keep whatever we have */
    } finally {
      setLoadingMsgs(false);
    }
  }, [auth]);

  React.useEffect(() => { fetchConvos(); }, [fetchConvos]);

  /* ── Real-time push from the sync engine / send fan-out ── */

  React.useEffect(() => {
    if (!convPush) return;
    const { conversationId, message } = convPush;

    setMsgs((p) => {
      const ex = p[conversationId] || [];
      if (ex.some((m) => m._id === message._id)) {
        return { ...p, [conversationId]: ex.map((m) => (m._id === message._id ? message : m)) };
      }
      return { ...p, [conversationId]: [...ex, message] };
    });

    setConvos((p) => {
      const found = p.find((c) => c._id === conversationId);
      if (!found) { fetchConvos(true); return p; }
      return p
        .map((c) => (c._id === conversationId ? {
          ...c,
          lastMessageAt: message.sentAt,
          lastMessagePreview: message.bodyText?.slice(0, 140) || '📎 Attachment',
          lastMessageDirection: message.direction,
          lastMessageFromName: message.fromName,
          unreadCount: message.direction === 'inbound' && activeIdRef.current !== conversationId
            ? (c.unreadCount || 0) + 1
            : (activeIdRef.current === conversationId ? 0 : c.unreadCount),
        } : c))
        .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    });

    if (activeIdRef.current === conversationId && message.direction === 'inbound') {
      apiClient.post(`/api/mail/conversations/${conversationId}/read`, {}, { headers: auth }).catch(() => { });
    }
    onConvPushHandled();
  }, [convPush]); // eslint-disable-line

  /* ── Slow polling fallback ── */

  React.useEffect(() => {
    const t = setInterval(() => {
      fetchConvos(true);
      if (activeIdRef.current) fetchMessages(activeIdRef.current, true);
    }, 45_000);
    return () => clearInterval(t);
  }, [fetchConvos, fetchMessages]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeId, activeMsgs.length]);

  /* ── Actions ── */

  const openConversation = (convId: string) => {
    setActiveId(convId);
    fetchMessages(convId);
    setConvos((p) => p.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c)));
    apiClient.post(`/api/mail/conversations/${convId}/read`, {}, { headers: auth }).catch(() => { });
  };

  const createConversation = async (payload: NewConversationPayload) => {
    try {
      const r = await apiClient.post('/api/mail/conversations', payload, { headers: auth });
      const conv: MailConv = r.data?.data;
      setNewOpen(false);
      setConvos((p) => (p.some((c) => c._id === conv._id) ? p.map((c) => (c._id === conv._id ? conv : c)) : [conv, ...p]));
      openConversation(conv._id);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not start the conversation.'));
      throw e;
    }
  };

  const applyConvUpdate = (updated: MailConv) => {
    setConvos((p) => p.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
  };

  const archiveActive = () => {
    if (!activeConv) return;
    apiClient.patch(`/api/mail/conversations/${activeConv._id}`, { isArchived: true }, { headers: auth })
      .then(() => {
        toast.success('Conversation archived');
        setConvos((p) => p.filter((c) => c._id !== activeConv._id));
        setActiveId(null);
      })
      .catch(() => toast.error('Could not archive.'));
  };

  const addFiles = (list: FileList | null) => {
    const result = validateFiles(list, files.length);
    if ('error' in result) { toast.error(result.error); return; }
    if (result.files.length) setFiles((prev) => [...prev, ...result.files]);
  };

  const handleSend = async () => {
    if (!activeId || sending) return;
    if (!input.trim() && files.length === 0) return;
    const convId = activeId;
    const text = input.trim();
    setSending(true);
    setProgress(files.length ? 0 : null);
    try {
      const fd = new FormData();
      fd.append('text', text);
      files.forEach((f) => fd.append('files', f));
      const r = await apiClient.post(`/api/mail/conversations/${convId}/messages`, fd, {
        headers: { ...auth, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      const message: ConvMessage = r.data?.data?.message;
      if (message) {
        setMsgs((p) => {
          const ex = p[convId] || [];
          return ex.some((m) => m._id === message._id) ? p : { ...p, [convId]: [...ex, message] };
        });
        setConvos((p) => p
          .map((c) => (c._id === convId ? {
            ...c,
            lastMessageAt: message.sentAt,
            lastMessagePreview: message.bodyText?.slice(0, 140) || '📎 Attachment',
            lastMessageDirection: 'outbound' as const,
            lastMessageFromName: message.fromName,
          } : c))
          .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
      }
      setInput('');
      setFiles([]);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Message failed to send.'));
      fetchMessages(convId, true);
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  const visibleConvos = convos.filter((c) =>
    convDisplayName(c).toLowerCase().includes(q.toLowerCase())
    || c.subject.toLowerCase().includes(q.toLowerCase())
    || c.participants.some((p) => p.email.toLowerCase().includes(q.toLowerCase())),
  );

  /* ── Render ── */

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {/* Conversation list */}
      <aside className={cn('sm5-rail flex-col w-full lg:w-80 lg:shrink-0', activeId ? 'hidden lg:flex' : 'flex')}>
        <div className="sm5-toolbar gap-2 px-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations…"
              className="sm5-input w-full h-9 pl-9 pr-3 text-xs"
            />
          </div>
          <button onClick={() => setNewOpen(true)} className="sm5-btn h-9 px-3 flex items-center gap-1.5 shrink-0" style={{ fontSize: 12 }}>
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto sm5-scroll px-2 py-2 space-y-0.5">
          {loadingConvos && <CenterSpinner />}
          {!loadingConvos && visibleConvos.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-14 px-4 text-center">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent-muted)', border: '1px dashed rgba(52,201,125,0.3)' }}
              >
                <Users className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Chat with anyone outside the platform — one person or a group. Messages travel as email, but feel like chat.
              </p>
            </div>
          )}
          {visibleConvos.map((c) => (
            <ConvRow key={c._id} conv={c} active={activeId === c._id} onOpen={() => openConversation(c._id)} />
          ))}
        </div>
      </aside>

      {/* Chat pane */}
      <main className={cn('flex-col min-w-0 flex-1', activeId ? 'flex sm5-slide-in lg:animate-none' : 'hidden lg:flex')}>
        {!activeId && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageSquare className="h-9 w-9" style={{ color: 'var(--text-disabled)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Select a conversation, or start a new one</p>
          </div>
        )}

        {activeId && activeConv && (
          <>
            {/* Chat header */}
            <div className="sm5-toolbar gap-2.5 px-3" style={{ background: 'var(--bg-elevated)' }}>
              <button onClick={() => setActiveId(null)} className="sm5-icon-btn h-9 w-9 lg:hidden" title="Back">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Avatar seed={convAvatarSeed(activeConv)} size={36} fontSize={12} icon={isGroup ? <Users2 className="h-4 w-4" /> : undefined} />
              <div className="min-w-0 flex-1">
                <p className="sm5-display font-bold truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {convDisplayName(activeConv)}
                </p>
                <p className="truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {isGroup
                    ? `${activeConv.participants.length} members · via email`
                    : `${activeConv.participants[0]?.email || ''} · via email`}
                </p>
              </div>
              <button
                onClick={() => setManageOpen(true)}
                className="sm5-icon-btn h-9 w-9 shrink-0"
                title={isGroup ? 'Manage members' : 'Add members / make group'}
              >
                {isGroup ? <Users2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </button>
              <button onClick={archiveActive} className="sm5-icon-btn h-9 w-9 shrink-0" title="Archive conversation">
                <Archive className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto sm5-scroll px-3 sm:px-4 py-3 space-y-1.5">
              {loadingMsgs && activeMsgs.length === 0 && <CenterSpinner />}
              {!loadingMsgs && activeMsgs.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
                  <span style={{ fontSize: 40, lineHeight: 1 }}>{isGroup ? '👥' : '✉️'}</span>
                  <p className="font-semibold mt-2" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {isGroup ? 'Start the group conversation' : `Say hello to ${convDisplayName(activeConv)}`}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {isGroup
                      ? 'Your first message is emailed to all members — their replies land here for everyone.'
                      : 'Your first message opens the email thread — replies land here as chat, in real time.'}
                  </p>
                </div>
              )}
              {activeMsgs.map((m, i) => (
                <ChatBubble key={m._id} token={token} convId={activeConv._id} msg={m} prev={activeMsgs[i - 1]} isGroup={isGroup} />
              ))}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="shrink-0 px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:pb-3 space-y-1.5">
              {files.length > 0 && (
                <div
                  className="flex flex-wrap gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--accent-muted)', border: '1px solid rgba(52,201,125,0.2)' }}
                >
                  {files.map((f, i) => (
                    <PendingFileChip key={`${f.name}-${i}`} file={f} onRemove={() => setFiles((p) => p.filter((_, idx) => idx !== i))} />
                  ))}
                </div>
              )}
              {progress !== null && <UploadProgressBar progress={progress} />}
              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2"
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)' }}
              >
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <button onClick={() => fileRef.current?.click()} className="sm5-icon-btn h-9 w-9 shrink-0" title="Attach files">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={isGroup ? 'Message the group… (emailed to all)' : 'Message… (delivered as email)'}
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none py-1.5"
                  style={{ fontSize: 14, color: 'var(--text-primary)', maxHeight: 120, lineHeight: 1.5 }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && files.length === 0)}
                  className="sm5-btn h-9 w-9 flex items-center justify-center shrink-0"
                  title="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {newOpen && <NewConversationModal onClose={() => setNewOpen(false)} onCreate={createConversation} />}
      {manageOpen && activeConv && (
        <ManageParticipantsModal token={token} conv={activeConv} onClose={() => setManageOpen(false)} onChanged={applyConvUpdate} />
      )}
    </div>
  );
}