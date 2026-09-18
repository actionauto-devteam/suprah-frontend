'use client';

import * as React from 'react';
import { BarChart3, CalendarPlus, Check, Copy, Link2, Loader2, Plus, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { DEPARTMENTS, deptLabel } from '@/lib/departments';
import { useIsMobile } from '@/hooks/use-mobile';

export type MeetingDraft = { title: string; scheduledAt: string };

export function PollModal({ onClose, onCreate }: { onClose: () => void; onCreate: (question: string, options: string[], multiple: boolean) => void }) {
  const [question, setQuestion] = React.useState('');
  const [options, setOptions] = React.useState(['', '']);
  const [multiple, setMultiple] = React.useState(false);
  const valid = question.trim() && options.filter(option => option.trim()).length >= 2;
  return <div className="ss4-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="ss4-poll-title" className="ss4-modal flex max-h-[calc(var(--ss4-vvh,100dvh)-1rem)] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl"><div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 id="ss4-poll-title" className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Poll</h2></div><button onClick={onClose} aria-label="Close poll creator" className="ss4-icon-btn h-10 w-10"><X className="h-4 w-4" /></button></div><div className="min-h-0 space-y-3 overflow-y-auto px-4 py-4 ss4-scroll"><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask a question..." className="h-9 w-full rounded-lg px-3 text-sm ss4-search-input" /><div className="space-y-2">{options.map((option, index) => <div key={index} className="flex items-center gap-2"><input value={option} onChange={event => setOptions(previous => previous.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} placeholder={`Option ${index + 1}`} className="h-9 flex-1 rounded-lg px-3 text-sm ss4-search-input" />{options.length > 2 && <button onClick={() => setOptions(previous => previous.filter((_, optionIndex) => optionIndex !== index))} className="ss4-icon-btn h-7 w-7"><X className="h-3.5 w-3.5" /></button>}</div>)}{options.length < 6 && <button onClick={() => setOptions(previous => [...previous, ''])} className="ss4-pill-btn flex h-8 w-full items-center justify-center gap-1.5 px-3" style={{ fontSize: 12 }}><Plus className="h-3.5 w-3.5" /> Add option</button>}</div><label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><input type="checkbox" checked={multiple} onChange={event => setMultiple(event.target.checked)} /> Allow multiple answers</label><button disabled={!valid} onClick={() => valid && onCreate(question.trim(), options.map(option => option.trim()).filter(Boolean), multiple)} className="ss4-send-btn h-9 w-full rounded-lg font-semibold" style={{ fontSize: 13, opacity: valid ? 1 : 0.4 }}>Create Poll</button></div></div></div>;
}

export function EventModal({ onClose, onCreate }: { onClose: () => void; onCreate: (event: { title: string; description: string; location: string; startTime: string; endTime: string }) => void }) {
  const [title, setTitle] = React.useState(''); const [description, setDescription] = React.useState(''); const [location, setLocation] = React.useState(''); const [startTime, setStartTime] = React.useState(''); const [endTime, setEndTime] = React.useState('');
  const mobilePicker = useIsMobile(); const valid = title.trim() && startTime; const dateInputClass = 'mt-1 h-9 w-full rounded-lg px-3 text-sm ss4-search-input';
  return <div className="ss4-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="ss4-event-title" className="ss4-modal flex max-h-[calc(var(--ss4-vvh,100dvh)-1rem)] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl"><div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}><div className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 id="ss4-event-title" className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Event</h2></div><button onClick={onClose} aria-label="Close event creator" className="ss4-icon-btn h-10 w-10"><X className="h-4 w-4" /></button></div><div className="min-h-0 space-y-2.5 overflow-y-auto px-4 py-4 ss4-scroll"><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Event title" className="h-9 w-full rounded-lg px-3 text-sm ss4-search-input" /><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Location (optional)" className="h-9 w-full rounded-lg px-3 text-sm ss4-search-input" /><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Description (optional)" rows={2} className="w-full resize-none rounded-lg px-3 py-2 text-sm ss4-search-input" /><div><label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Starts</label>{mobilePicker ? <input type="datetime-local" value={startTime} onChange={event => setStartTime(event.target.value)} className={dateInputClass} /> : <DateTimePicker value={startTime} onChange={setStartTime} placeholder="Pick start date & time" className="mt-1 h-9 text-sm" />}</div><div><label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ends (optional)</label>{mobilePicker ? <input type="datetime-local" value={endTime} onChange={event => setEndTime(event.target.value)} className={dateInputClass} /> : <DateTimePicker value={endTime} onChange={setEndTime} placeholder="Pick end date & time" className="mt-1 h-9 text-sm" />}</div><button disabled={!valid} onClick={() => valid && onCreate({ title: title.trim(), description, location, startTime, endTime })} className="ss4-send-btn mt-1 h-9 w-full rounded-lg font-semibold" style={{ fontSize: 13, opacity: valid ? 1 : 0.4 }}>Create Event</button></div></div></div>;
}

export function MeetingModal({ onClose, onCreate, onCreateLink, canAddToMessage }: { onClose: () => void; onCreate: (meeting: MeetingDraft) => void; onCreateLink: (meeting: MeetingDraft) => Promise<string>; canAddToMessage: boolean }) {
  const [title, setTitle] = React.useState('Video meeting'); const [scheduledAt, setScheduledAt] = React.useState(''); const [generatedLink, setGeneratedLink] = React.useState(''); const [creatingLink, setCreatingLink] = React.useState(false);
  const meeting = React.useMemo(() => ({ title: title.trim() || 'Video meeting', scheduledAt }), [title, scheduledAt]);
  const copy = async () => { try { await navigator.clipboard.writeText(generatedLink); toast.success('Meeting link copied'); } catch { toast.error('Could not copy meeting link'); } };
  const createLink = async () => { setCreatingLink(true); try { setGeneratedLink(await onCreateLink(meeting)); } finally { setCreatingLink(false); } };
  return <div className="ss4-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="ss4-meeting-title" className="ss4-modal flex max-h-[calc(var(--ss4-vvh,100dvh)-1rem)] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl"><div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}><div className="flex items-center gap-2"><Video className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 id="ss4-meeting-title" className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Meeting</h2></div><button onClick={onClose} aria-label="Close meeting creator" className="ss4-icon-btn h-10 w-10"><X className="h-4 w-4" /></button></div><div className="min-h-0 space-y-2.5 overflow-y-auto px-4 py-4 ss4-scroll"><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Meeting title" className="h-9 w-full rounded-lg px-3 text-sm ss4-search-input" /><label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Date and time (optional)</label><input value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} type="datetime-local" className="h-9 w-full rounded-lg px-3 text-sm ss4-search-input" />{generatedLink && <div className="space-y-2 rounded-xl p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}><label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Meeting link</label><div className="flex items-center gap-2"><input readOnly value={generatedLink} className="h-9 min-w-0 flex-1 rounded-lg px-3 text-xs ss4-search-input" /><button onClick={copy} className="ss4-icon-btn h-9 w-9 shrink-0" title="Copy meeting link"><Copy className="h-4 w-4" /></button></div></div>}{canAddToMessage && <button onClick={() => onCreate(meeting)} className="ss4-pill-btn flex h-9 w-full items-center justify-center gap-2 rounded-lg font-semibold" style={{ fontSize: 13 }}><Video className="h-3.5 w-3.5" /> Add to Message</button>}<button disabled={creatingLink} onClick={createLink} className="ss4-send-btn flex h-9 w-full items-center justify-center gap-2 rounded-lg font-semibold" style={{ fontSize: 13, opacity: creatingLink ? 0.7 : 1 }}>{creatingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}{creatingLink ? 'Creating link...' : 'Create Link'}</button></div></div></div>;
}

export function MeetingJoinInfoModal({
  link,
  onClose,
}: {
  link: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Meeting link copied');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy meeting link');
    }
  };
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="ss4-display font-bold" style={{ fontSize: 22, color: 'var(--text-primary)' }}>Here&apos;s your joining info</h2>
            <p className="mt-3 leading-relaxed" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Send this to people you want to meet with. Be sure to save it so you can use it later.
            </p>
          </div>
          <button onClick={onClose} className="ss4-icon-btn h-8 w-8 shrink-0" title="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}>
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate ss4-mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{link}</span>
              <button onClick={copyLink} className="ss4-icon-btn h-10 w-10 shrink-0" title="Copy link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={copyLink} className="mt-4 h-9 px-3 rounded-lg ss4-pill-btn font-semibold flex items-center gap-2" style={{ fontSize: 13 }}>
              <Link2 className="h-4 w-4" /> {copied ? 'Copied' : 'Copy meeting link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScheduleMeetingModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; scheduledAt: string; endTime: string; department: string }) => Promise<void>;
}) {
  const [title, setTitle] = React.useState('Video meeting');
  const [description, setDescription] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [department, setDepartment] = React.useState('all');
  const [saving, setSaving] = React.useState(false);
  const valid = title.trim() && scheduledAt;
  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), scheduledAt, endTime, department });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="ss4-modal w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Schedule in Suprah Calendar</h2>
          </div>
          <button onClick={onClose} className="ss4-icon-btn h-8 w-8" title="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" className="w-full h-10 rounded-lg px-3 text-sm ss4-search-input" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Agenda or notes (optional)" rows={3} className="w-full rounded-lg px-3 py-2 text-sm ss4-search-input resize-none" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Date and time</label>
              <input value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} type="datetime-local" className="mt-1 w-full h-10 rounded-lg px-3 text-sm ss4-search-input" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ends (optional)</label>
              <input value={endTime} onChange={e => setEndTime(e.target.value)} type="datetime-local" className="mt-1 w-full h-10 rounded-lg px-3 text-sm ss4-search-input" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Notify department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="mt-1 w-full h-10 rounded-lg px-3 text-sm ss4-search-input">
              <option value="all">All departments</option>
              {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <p className="mt-1.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {department === 'all' ? 'Everyone in CRM will be added to the calendar event.' : `${deptLabel(department)} members will be added and notified.`}
            </p>
          </div>
          <button disabled={!valid || saving} onClick={submit} className="w-full h-10 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: valid && !saving ? 1 : 0.5 }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {saving ? 'Scheduling...' : 'Schedule meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}
