import * as React from "react";
import { Phone, Mail, Clock3, Car, X, Calendar, ArrowLeft, Users } from "lucide-react";
import { ChannelBadge } from "./atomic/ChannelBadge";
import { StatusPill } from "./atomic/StatusPill";
import { ParsedContent } from "./ParsedContent";
import { fmtFull } from "@/lib/lead-utils";
import { SupraLeoReadButton } from "@/components/supra-leo-ai/SupraLeoReadButton";
import { isAdfBody } from "@/lib/adf-parser";
import { cn } from "@/lib/utils";

interface ConversationViewProps {
  lead: any;
  threads: any[];
  onClose: () => void;
  sourceEmail: string;
  siblingCount?: number;
  onReplyToSiblings?: () => void;
}

const AVA_CLASSES = ['ss4-ava-accent', 'ss4-ava-purple', 'ss4-ava-teal', 'ss4-ava-amber', 'ss4-ava-rose'];
function getAvaClass(str: string) {
  return AVA_CLASSES[(str || '?').charCodeAt(0) % AVA_CLASSES.length];
}
function ini(first?: string, last?: string) {
  return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase();
}
const _TZ = 'America/Denver';
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: _TZ }); }
  catch { return ''; }
}
function fmtDateLabel(iso: string) {
  try {
    const date = new Date(iso);
    const dStr = date.toLocaleDateString('en-US', { timeZone: _TZ });
    const todayStr = new Date().toLocaleDateString('en-US', { timeZone: _TZ });
    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { timeZone: _TZ });
    if (dStr === todayStr) return 'Today';
    if (dStr === yesterdayStr) return 'Yesterday';
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: _TZ });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: _TZ });
  } catch { return ''; }
}

// ─── Date Separator ────────────────────────────────────────────────────────────
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3 px-4">
      <div className="flex-1 ss4-date-line" />
      <span className="ss4-date-chip">{label}</span>
      <div className="flex-1 ss4-date-line" />
    </div>
  );
}

// ─── Chat Bubble ───────────────────────────────────────────────────────────────
function Bubble({ content, isOwn, senderName, showAvatar, time }: {
  content: React.ReactNode;
  isOwn: boolean;
  senderName?: string;
  showAvatar: boolean;
  time?: string;
}) {
  const avaClass = getAvaClass(senderName || '');

  return (
    <div className={cn('flex gap-2 px-3 sm:px-4', isOwn && 'flex-row-reverse')}>
      {/* Avatar slot */}
      {showAvatar ? (
        <div className={cn('h-7 w-7 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-white font-bold', isOwn ? 'ss4-ava-accent' : avaClass)}
          style={{ fontSize: 10 }}>
          {isOwn ? 'YOU' : ini(senderName?.split(' ')[0], senderName?.split(' ')[1])}
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}

      {/* Column */}
      <div className={cn('flex flex-col gap-0.5 min-w-0 max-w-[85%] sm:max-w-[75%] lg:max-w-[68%]', isOwn ? 'items-end' : 'items-start')}>
        {showAvatar && !isOwn && senderName && (
          <span className="px-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {senderName}
          </span>
        )}

        {/* Bubble */}
        <div className={cn('px-3 py-2 leading-relaxed wrap-break-word', isOwn ? 'ss4-bubble-own' : 'ss4-bubble-other')}
          style={{ fontSize: 13 }}>
          {typeof content === 'string' ? (
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</p>
          ) : (
            content
          )}
        </div>

        {/* Time */}
        {time && (
          <span className="px-1 ss4-mono tabular-nums" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export const ConversationView = React.memo(
  ({ lead, threads, onClose, sourceEmail, siblingCount = 0, onReplyToSiblings }: ConversationViewProps) => {
    const msgRef = React.useRef<HTMLDivElement>(null);
    const isNearBottomRef = React.useRef(true);

    // Track whether the user is near the bottom before threads change
    const handleScroll = React.useCallback(() => {
      const el = msgRef.current;
      if (!el) return;
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    }, []);

    // Only auto-scroll if user is already at the bottom
    React.useEffect(() => {
      if (msgRef.current && isNearBottomRef.current) {
        msgRef.current.scrollTop = msgRef.current.scrollHeight;
      }
    }, [threads]);

    // Always scroll to bottom when switching to a different lead
    React.useEffect(() => {
      if (msgRef.current) {
        msgRef.current.scrollTop = msgRef.current.scrollHeight;
        isNearBottomRef.current = true;
      }
    }, [lead._id]);

    const vehicle = lead.vehicle;
    const avaClass = getAvaClass(lead.firstName || '');
    const [showHistory, setShowHistory] = React.useState(false);
    const statusHistory: any[] = lead.statusHistory || [];

    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ background: 'var(--bg-base)' }}>

        {/* ── Header ── */}
        <div className="ss4-chat-header flex items-center gap-2 sm:gap-2.5 px-2 sm:px-4 py-2.5 shrink-0">
          <button
            onClick={onClose}
            className="ss4-icon-btn h-9 w-9 lg:hidden shrink-0"
            aria-label="Back to lead list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white font-bold shrink-0', avaClass)}
            style={{ fontSize: 11 }}>
            {ini(lead.firstName, lead.lastName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold truncate leading-tight" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {lead.firstName} {lead.lastName}
              </h2>
              <ChannelBadge channel={lead.channel} />
              <StatusPill status={lead.status} />
              {statusHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ fontSize: 10, color: 'var(--text-tertiary)', border: '1px solid var(--border-1)' }}
                >
                  History ({statusHistory.length})
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
              {lead.email && (
                <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <Mail className="h-2.5 w-2.5 shrink-0" />{lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <Phone className="h-2.5 w-2.5 shrink-0" />{lead.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <SupraLeoReadButton lead={lead} size="md" />
            <button
              onClick={onClose}
              className="ss4-icon-btn hidden lg:flex h-7 w-7"
              aria-label="Close conversation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Subject / meta strip ── */}
        <div className="px-3 sm:px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-1)', background: 'var(--bg-subtle)' }}>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <div className="flex items-start gap-1.5 min-w-0 basis-full sm:basis-auto sm:items-center" style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
              <Mail className="h-2.5 w-2.5 shrink-0 mt-0.5 sm:mt-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="line-clamp-2 sm:line-clamp-1 sm:truncate leading-snug">{lead.subject || '(No subject)'}</span>
            </div>
            <div className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              <Clock3 className="h-2.5 w-2.5 shrink-0" />
              {fmtFull(new Date(lead.createdAt))}
            </div>
            {vehicle?.make && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ fontSize: 10, fontWeight: 600, background: 'var(--accent-muted)', color: 'var(--accent-text)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Car className="h-2 w-2" />
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
              </span>
            )}
            <span className="ss4-mono ml-auto hidden sm:block" style={{ fontSize: 9, color: 'var(--text-disabled)' }}>
              via {sourceEmail}
            </span>
          </div>
          {siblingCount > 0 && onReplyToSiblings && (
            <button
              onClick={onReplyToSiblings}
              className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg w-full sm:w-fit text-left"
              style={{ fontSize: 11, background: 'var(--accent-muted)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-text)' }}
            >
              <Users className="h-3 w-3 shrink-0" />
              <span className="font-medium">
                {siblingCount} other {siblingCount === 1 ? 'inquiry' : 'inquiries'} for this vehicle — Reply to all
              </span>
            </button>
          )}
          {lead.appointment && (
            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit" style={{ fontSize: 10, background: 'var(--accent-muted)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-text)' }}>
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              <span className="font-medium">
                {new Date(lead.appointment.date).toLocaleDateString()} · {lead.appointment.time}
                {lead.appointment.location && ` · ${lead.appointment.location}`}
              </span>
            </div>
          )}
        </div>

        {/* ── Status history timeline ── */}
        {showHistory && statusHistory.length > 0 && (
          <div className="px-3 sm:px-4 py-2.5 shrink-0 space-y-1.5" style={{ borderBottom: '1px solid var(--border-1)', background: 'var(--bg-subtle)' }}>
            {statusHistory.slice().reverse().map((h, idx) => (
              <div key={idx} className="flex items-start gap-2" style={{ fontSize: 11 }}>
                <Clock3 className="h-3 w-3 shrink-0 mt-0.5" style={{ color: 'var(--text-disabled)' }} />
                <div className="min-w-0">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>{h.from || '—'}</strong> → <strong>{h.to}</strong>
                  </span>
                  <span className="ml-1.5" style={{ color: 'var(--text-disabled)' }}>
                    {h.changedAt ? fmtFull(new Date(h.changedAt)) : ''}
                  </span>
                  {h.reason && (
                    <p className="mt-0.5" style={{ color: 'var(--text-tertiary)' }}>&ldquo;{h.reason}&rdquo;</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Message stream ── */}
        <div
          ref={msgRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 py-4 space-y-2.5 ss4-scroll"
          style={{ background: 'var(--bg-base)' }}
        >
          <DateSep label={fmtDateLabel(lead.createdAt)} />

          <Bubble
            isOwn={false}
            senderName={`${lead.firstName} ${lead.lastName}`}
            showAvatar={true}
            time={fmtTime(lead.createdAt)}
            content={<ParsedContent content={lead.parsedContent} rawBody={lead.body} />}
          />

          {threads.map((msg: any, idx: number) => {
            const msgBody = msg.message || msg.body || '';
            const msgIsAdf = !msg.isOwn && isAdfBody(msgBody);
            const prevMsg = threads[idx - 1];
            const prevDate = prevMsg ? fmtDateLabel(prevMsg.timestamp) : fmtDateLabel(lead.createdAt);
            const currDate = fmtDateLabel(msg.timestamp);
            const showDateSep = currDate !== prevDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && <DateSep label={currDate} />}
                <Bubble
                  isOwn={!!msg.isOwn}
                  senderName={msg.isOwn ? 'You' : msg.sender}
                  showAvatar={true}
                  time={fmtTime(msg.timestamp)}
                  content={msgIsAdf ? <ParsedContent rawBody={msgBody} /> : msgBody}
                />
              </React.Fragment>
            );
          })}

          <div className="h-2" />
        </div>
      </div>
    );
  },
);

ConversationView.displayName = 'ConversationView';
