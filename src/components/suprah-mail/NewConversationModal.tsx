'use client';

import * as React from 'react';
import { Loader2, MessageSquare, Plus, UserPlus, Users2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from './Shared';
import { EMAIL_RE } from './utils';
import type { NewConversationPayload } from './types';

export function NewConversationModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (payload: NewConversationPayload) => Promise<void>;
}) {
  const [entries, setEntries] = React.useState<{ email: string; name?: string }[]>([]);
  const [emailDraft, setEmailDraft] = React.useState('');
  const [nameDraft, setNameDraft] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const draftValid = EMAIL_RE.test(emailDraft.trim());
  const isGroup = entries.length > 1;

  const addEntry = () => {
    const e = emailDraft.trim().toLowerCase();
    if (!draftValid) return;
    if (entries.some((x) => x.email === e)) { toast.error('That address is already added.'); return; }
    setEntries((p) => [...p, { email: e, name: nameDraft.trim() || undefined }]);
    setEmailDraft('');
    setNameDraft('');
  };

  const submit = async () => {
    // Allow submitting with the draft still in the input if it's valid.
    let list = entries;
    if (draftValid && !entries.some((x) => x.email === emailDraft.trim().toLowerCase())) {
      list = [...entries, { email: emailDraft.trim().toLowerCase(), name: nameDraft.trim() || undefined }];
    }
    if (list.length === 0) { toast.error('Add at least one recipient.'); return; }
    setCreating(true);
    try {
      await onCreate({
        participants: list,
        title: list.length > 1 ? (title.trim() || undefined) : undefined,
        subject: subject.trim(),
      });
    } finally {
      setCreating(false);
    }
  };

  const onEnterAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addEntry(); }
  };

  return (
    <div className="sm5-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="sm5-modal sm5-sheet w-full max-w-md overflow-hidden flex flex-col rounded-t-2xl rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: 'calc(100dvh - 32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2">
            {isGroup
              ? <Users2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              : <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent)' }} />}
            <h2 className="sm5-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
              {isGroup ? 'New Group' : 'New Conversation'}
            </h2>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-7 w-7" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="px-4 py-4 space-y-3 overflow-y-auto sm5-scroll"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {/* Added recipients as chips */}
          {entries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entries.map((p) => (
                <span
                  key={p.email}
                  className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1"
                  style={{ background: 'var(--accent-muted)', border: '1px solid rgba(52,201,125,0.25)' }}
                >
                  <Avatar seed={p.name || p.email} size={20} fontSize={9} />
                  <span className="font-medium" style={{ fontSize: 11.5, color: 'var(--accent-text)' }}>{p.name || p.email}</span>
                  <button onClick={() => setEntries((prev) => prev.filter((x) => x.email !== p.email))} className="shrink-0" title="Remove">
                    <X className="h-3 w-3" style={{ color: 'var(--accent-text)' }} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Recipient entry row */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                autoFocus
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={onEnterAdd}
                placeholder="Email address"
                className="sm5-input flex-1 h-10 px-3 text-sm"
              />
              <button onClick={addEntry} disabled={!draftValid} className="sm5-pill h-10 px-3 flex items-center gap-1 shrink-0" style={{ fontSize: 12 }} title="Add recipient">
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={onEnterAdd}
              placeholder="Name for that address (optional)"
              className="sm5-input w-full h-10 px-3 text-sm"
            />
          </div>

          {/* Group title only when 2+ */}
          {isGroup && (
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name (optional)" className="sm5-input w-full h-10 px-3 text-sm" />
          )}

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional — used for the email thread)"
            className="sm5-input w-full h-10 px-3 text-sm"
          />

          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            {isGroup
              ? 'Every message is emailed to all members (reply-all). Anyone who replies is seen by everyone.'
              : 'Messages are delivered as real emails from your connected Gmail. Add another recipient to make it a group.'}
          </p>

          <button
            disabled={creating || (entries.length === 0 && !draftValid)}
            onClick={submit}
            className="sm5-btn w-full h-10 flex items-center justify-center gap-2"
            style={{ fontSize: 13 }}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isGroup ? 'Start group' : 'Start conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}