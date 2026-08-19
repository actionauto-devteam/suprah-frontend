'use client';

import * as React from 'react';
import { Loader2, UserMinus, UserPlus, Users2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Avatar } from './Shared';
import { EMAIL_RE, getErrorMessage } from './utils';
import type { ConvParticipant, MailConv } from './types';

export function ManageParticipantsModal({ token, conv, onClose, onChanged }: {
  token: string;
  conv: MailConv;
  onClose: () => void;
  onChanged: (updated: MailConv) => void;
}) {
  const auth = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [participants, setParticipants] = React.useState<ConvParticipant[]>(conv.participants);
  const [emailDraft, setEmailDraft] = React.useState('');
  const [nameDraft, setNameDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const draftValid = EMAIL_RE.test(emailDraft.trim());

  const add = async () => {
    const e = emailDraft.trim().toLowerCase();
    if (!draftValid || busy) return;
    if (participants.some((p) => p.email === e)) { toast.error('Already in this conversation.'); return; }
    setBusy(true);
    try {
      const r = await apiClient.post(
        `/api/mail/conversations/${conv._id}/participants`,
        { email: e, name: nameDraft.trim() || undefined },
        { headers: auth },
      );
      const updated: MailConv = r.data?.data;
      setParticipants(updated.participants);
      onChanged(updated);
      setEmailDraft('');
      setNameDraft('');
      toast.success('Member added');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add member.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (email: string) => {
    if (busy) return;
    if (participants.length <= 1) { toast.error('A conversation needs at least one member.'); return; }
    setBusy(true);
    try {
      const r = await apiClient.delete(
        `/api/mail/conversations/${conv._id}/participants/${encodeURIComponent(email)}`,
        { headers: auth },
      );
      const updated: MailConv = r.data?.data;
      setParticipants(updated.participants);
      onChanged(updated);
      toast.success('Member removed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove member.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm5-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="sm5-modal sm5-sheet w-full max-w-md overflow-hidden flex flex-col rounded-t-2xl rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: 'calc(100dvh - 32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm5-modal-header flex items-center justify-between px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="sm5-title-lg">Members</h2>
            <span className="sm5-meta sm5-mono">{participants.length}</span>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-7 w-7" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="sm5-modal-body flex-1 overflow-y-auto sm5-scroll px-4 py-3 space-y-1.5">
          {participants.map((p) => (
            <div key={p.email} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'var(--bg-hover)' }}>
              <Avatar seed={p.name || p.email} size={32} fontSize={11} />
              <div className="min-w-0 flex-1">
                <p className="sm5-title-sm truncate">{p.name || p.email}</p>
                {p.name && <p className="sm5-supporting truncate">{p.email}</p>}
              </div>
              <button
                onClick={() => remove(p.email)}
                disabled={busy || participants.length <= 1}
                className="sm5-icon-btn h-7 w-7 shrink-0"
                title="Remove member"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div
          className="sm5-modal-footer shrink-0 px-4 py-3 space-y-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div>
          <label className="sm5-field-label">Add participant</label>
          <div className="flex gap-2">
            <input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Add email address"
              className="sm5-input flex-1 h-9 px-3 text-xs"
            />
            <button onClick={add} disabled={!draftValid || busy} className="sm5-btn h-9 px-3 flex items-center gap-1 shrink-0" style={{ fontSize: 12 }}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Add
            </button>
          </div>
          </div>
          <div>
            <label className="sm5-field-label">Name</label>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Name (optional)"
            className="sm5-input w-full h-9 px-3 text-xs"
          />
          </div>
          <p className="sm5-helper-card sm5-helper px-3 py-2.5">
            New members only receive messages sent after they're added — earlier emails already went out without them.
          </p>
        </div>
      </div>
    </div>
  );
}