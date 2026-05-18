import * as React from "react";
import { Phone, Mail, Clock3, Car, X, Calendar } from "lucide-react";
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
}

// Deterministic avatar gradient (mirrors SS4)
const GRADIENTS = [
  "from-[#3a5ce0] to-[#5b7cf6]",
  "from-[#7038c0] to-[#9b6fd6]",
  "from-[#0e7c6a] to-[#22b060]",
  "from-[#b85c00] to-[#f0a855]",
  "from-[#c0385c] to-[#f06090]",
];
function getGradient(str: string) {
  return GRADIENTS[(str || "?").charCodeAt(0) % GRADIENTS.length];
}
function ini(first?: string, last?: string) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
function fmtDateLabel(iso: string) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return date.toLocaleDateString([], { weekday: "long" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ─── Date Separator (SS4 style) ───────────────────────────────────────────────
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-5">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[11px] font-semibold text-muted-foreground/50 bg-muted/40 border border-border/40 rounded-full px-3 py-0.5 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────
function Bubble({ content, isOwn, senderName, showAvatar, time }: {
  content: React.ReactNode;
  isOwn: boolean;
  senderName?: string;
  showAvatar: boolean;
  time?: string;
}) {
  const grad = getGradient(senderName || "");

  return (
    <div className={cn("flex gap-2.5 px-4 sm:px-5", isOwn && "flex-row-reverse")}>
      {/* Avatar slot */}
      {showAvatar ? (
        <div
          className={cn(
            "h-8 w-8 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-white font-bold text-[11px] shadow-sm",
            isOwn
              ? "bg-linear-to-br from-primary/80 to-primary"
              : `bg-linear-to-br ${grad}`
          )}
        >
          {isOwn ? "YOU" : ini(senderName?.split(" ")[0], senderName?.split(" ")[1])}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Column */}
      <div className={cn("flex flex-col gap-1 max-w-[68%]", isOwn && "items-end")}>
        {showAvatar && !isOwn && senderName && (
          <span className="px-1 text-[12px] font-semibold text-muted-foreground/70">
            {senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "px-4 py-2.5 text-[14px] leading-relaxed wrap-break-word",
            isOwn
              ? "bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_4px_20px_rgba(0,0,0,0.15)] rounded-[18px_18px_4px_18px]"
              : "bg-muted/60 dark:bg-card text-foreground border border-border/60 shadow-sm rounded-[18px_18px_18px_4px]"
          )}
        >
          {typeof content === "string" ? (
            <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</p>
          ) : (
            content
          )}
        </div>

        {/* Time */}
        {time && (
          <span className="px-1 text-[10px] tabular-nums text-muted-foreground/40 font-mono">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ConversationView = React.memo(
  ({ lead, threads, onClose, sourceEmail }: ConversationViewProps) => {
    const msgRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (msgRef.current)
        msgRef.current.scrollTop = msgRef.current.scrollHeight;
    }, [threads, lead]);

    const vehicle = lead.vehicle;
    const grad = getGradient(lead.firstName || "");

    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border/60 bg-card/80 shrink-0">
          {/* Lead avatar */}
          <div
            className={`h-9 w-9 rounded-full bg-linear-to-br ${grad} flex items-center justify-center text-white font-bold text-[12px] shadow-sm shrink-0`}
          >
            {ini(lead.firstName, lead.lastName)}
          </div>

          {/* Lead info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[14px] font-bold text-foreground truncate leading-tight">
                {lead.firstName} {lead.lastName}
              </h2>
              <ChannelBadge channel={lead.channel} />
              <StatusPill status={lead.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {lead.email && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <Mail className="h-3 w-3 shrink-0" />
                  {lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <Phone className="h-2.5 w-2.5 shrink-0" />
                  {lead.phone}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <SupraLeoReadButton lead={lead} size="md" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all"
              aria-label="Close conversation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Subject / meta strip ── */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-border/40 bg-muted/10 shrink-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground min-w-0">
              <Mail className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="truncate">{lead.subject || "(No subject)"}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
              <Clock3 className="h-3 w-3 shrink-0" />
              {fmtFull(new Date(lead.createdAt))}
            </div>
            {vehicle?.make && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                <Car className="h-2.5 w-2.5" />
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/30 ml-auto truncate hidden sm:block">
              via {sourceEmail}
            </span>
          </div>
          {lead.appointment && (
            <div className="mt-2 flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/8 border border-primary/15 w-fit">
              <Calendar className="h-3 w-3 text-primary shrink-0" />
              <span className="text-primary font-medium">
                {new Date(lead.appointment.date).toLocaleDateString()} ·{" "}
                {lead.appointment.time}
                {lead.appointment.location && ` · ${lead.appointment.location}`}
              </span>
            </div>
          )}
        </div>

        {/* ── Message stream ── */}
        <div
          ref={msgRef}
          className="flex-1 overflow-y-auto min-h-0 py-5 space-y-3 bg-background [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {/* Date sep: initial lead */}
          <DateSep label={fmtDateLabel(lead.createdAt)} />

          {/* Original lead message */}
          <Bubble
            isOwn={false}
            senderName={`${lead.firstName} ${lead.lastName}`}
            showAvatar={true}
            time={fmtTime(lead.createdAt)}
            content={<ParsedContent content={lead.parsedContent} rawBody={lead.body} />}
          />

          {/* Thread messages */}
          {threads.map((msg: any, idx: number) => {
            const msgBody = msg.message || msg.body || "";
            const msgIsAdf = !msg.isOwn && isAdfBody(msgBody);

            const prevMsg = threads[idx - 1];
            const prevDate = prevMsg
              ? fmtDateLabel(prevMsg.timestamp)
              : fmtDateLabel(lead.createdAt);
            const currDate = fmtDateLabel(msg.timestamp);
            const showDateSep = currDate !== prevDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && <DateSep label={currDate} />}
                <Bubble
                  isOwn={!!msg.isOwn}
                  senderName={msg.isOwn ? "You" : msg.sender}
                  showAvatar={true}
                  time={fmtTime(msg.timestamp)}
                  content={
                    msgIsAdf ? (
                      <ParsedContent rawBody={msgBody} />
                    ) : (
                      msgBody
                    )
                  }
                />
              </React.Fragment>
            );
          })}

          {/* Scroll anchor */}
          <div className="h-2" />
        </div>
      </div>
    );
  },
);

ConversationView.displayName = "ConversationView";
