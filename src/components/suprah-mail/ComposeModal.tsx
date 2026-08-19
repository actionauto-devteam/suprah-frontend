'use client';

import * as React from 'react';
import { FileText, Loader2, Paperclip, Pencil, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { PendingFileChip, UploadProgressBar } from './Shared';
import { getErrorMessage, validateFiles } from './utils';
import type { ComposePrefill } from './types';

const TITLES: Record<ComposePrefill['mode'], string> = {
  new: 'New email',
  reply: 'Reply',
  forward: 'Forward',
  draft: 'Edit draft',
};

export function ComposeModal({ token, prefill, onClose, onSent }: {
  token: string;
  prefill: ComposePrefill;
  onClose: () => void;
  onSent: () => void;
}) {
  const auth = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [to, setTo] = React.useState(prefill.to || '');
  const [cc, setCc] = React.useState(prefill.cc || '');
  const [showCc, setShowCc] = React.useState(!!prefill.cc);
  const [subject, setSubject] = React.useState(prefill.subject || '');
  const [body, setBody] = React.useState(prefill.body || '');
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    const result = validateFiles(list, files.length);
    if ('error' in result) { toast.error(result.error); return; }
    if (result.files.length) setFiles((prev) => [...prev, ...result.files]);
  };

  const buildForm = () => {
    const fd = new FormData();
    fd.append('to', to.trim());
    if (cc.trim()) fd.append('cc', cc.trim());
    fd.append('subject', subject.trim());
    fd.append('text', body);
    if (prefill.threadId) fd.append('threadId', prefill.threadId);
    if (prefill.inReplyTo) fd.append('inReplyTo', prefill.inReplyTo);
    if (prefill.references) fd.append('references', prefill.references);
    files.forEach((f) => fd.append('files', f));
    return fd;
  };

  const handleSend = async () => {
    if (!to.trim()) { toast.error('Add at least one recipient.'); return; }
    if (!body.trim() && files.length === 0) { toast.error('Write a message or attach a file.'); return; }
    setSending(true);
    setProgress(files.length ? 0 : null);
    try {
      await apiClient.post('/api/mail/messages/send', buildForm(), {
        headers: { ...auth, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      // Sending an edited draft supersedes the stored draft — clean it up.
      if (prefill.draftId) {
        apiClient.delete(`/api/mail/drafts/${prefill.draftId}`, { headers: auth }).catch(() => { });
      }
      toast.success('Email sent');
      onSent();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Email failed to send.'));
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!to.trim() && !subject.trim() && !body.trim() && files.length === 0) { onClose(); return; }
    setSavingDraft(true);
    try {
      const path = prefill.draftId ? `/api/mail/drafts/${prefill.draftId}` : '/api/mail/drafts';
      const method = prefill.draftId ? 'patch' : 'post';
      await (apiClient as any)[method](path, buildForm(), {
        headers: { ...auth, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Draft saved');
      onSent();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save draft.'));
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="sm5-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="sm5-modal sm5-sheet w-full max-w-2xl overflow-hidden flex flex-col rounded-t-2xl rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: 'calc(100dvh - 24px)' }}
      >
        {/* Header */}
        <div className="sm5-modal-header flex items-center justify-between px-4 sm:px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="sm5-title-lg">
              {TITLES[prefill.mode]}
            </h2>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-8 w-8" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="sm5-modal-body flex-1 overflow-y-auto sm5-scroll px-4 sm:px-5 py-4 space-y-3">
          <div>
            <label className="sm5-field-label">Recipients</label>
            <div className="flex items-center gap-2">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To — separate multiple addresses with commas"
              className="sm5-input flex-1 h-10 px-3 text-sm"
              autoFocus={prefill.mode === 'new'}
            />
            {!showCc && (
              <button onClick={() => setShowCc(true)} className="sm5-pill h-8 px-2.5 shrink-0" style={{ fontSize: 11 }}>
                Cc
              </button>
            )}
            </div>
          </div>
          {showCc && (
            <div>
              <label className="sm5-field-label">Cc</label>
              <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc" className="sm5-input w-full h-10 px-3 text-sm" />
            </div>
          )}
          <div>
            <label className="sm5-field-label">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="sm5-input w-full h-10 px-3 text-sm"
          />
          </div>
          <div>
            <label className="sm5-field-label">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={10}
            className="sm5-input w-full px-3 py-2.5 text-sm resize-y"
            style={{ minHeight: 160, lineHeight: 1.6 }}
          />
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <PendingFileChip
                  key={`${f.name}-${i}`}
                  file={f}
                  onRemove={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                />
              ))}
            </div>
          )}
          {progress !== null && <UploadProgressBar progress={progress} />}
        </div>

        {/* Actions */}
        <div
          className="sm5-modal-footer flex items-center gap-2 px-4 sm:px-5 py-3.5 shrink-0"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
        >
          <button onClick={handleSend} disabled={sending || savingDraft} className="sm5-btn h-9 px-4 flex items-center gap-2" style={{ fontSize: 13 }}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? 'Sending…' : 'Send'}
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} className="sm5-icon-btn h-9 w-9" title="Attach files">
            <Paperclip className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <button onClick={handleSaveDraft} disabled={sending || savingDraft} className="sm5-pill h-9 px-3.5 flex items-center gap-1.5" style={{ fontSize: 12 }}>
            {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Save draft
          </button>
        </div>
      </div>
    </div>
  );
}