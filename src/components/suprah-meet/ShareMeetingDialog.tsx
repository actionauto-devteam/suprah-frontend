"use client";

import * as React from "react";
import {
  AtSign, Check, Copy, Mail, MessageCircle, MessageSquare, Phone, PhoneCall, Send, Share2, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";
import {
  buildMeetInvite, canNativeShare, copyText, isMobileDevice, nativeShareInvite, openShareUrl, shareTargetUrl,
  type ShareTargetKey, type ShareableMeeting,
} from "@/lib/meet-share";

interface TargetDef {
  key: ShareTargetKey;
  label: string;
  icon: React.ReactNode;
  bg: string;
  mobileOnly?: boolean;
}

const TARGETS: TargetDef[] = [
  { key: "gmail", label: "Gmail", icon: <Mail className="size-5" />, bg: "bg-[#EA4335]" },
  { key: "messenger", label: "Messenger", icon: <MessageCircle className="size-5" />, bg: "bg-gradient-to-br from-[#0099FF] to-[#A033FF]" },
  { key: "whatsapp", label: "WhatsApp", icon: <Phone className="size-5" />, bg: "bg-[#25D366]" },
  { key: "sms", label: "Text", icon: <MessageSquare className="size-5" />, bg: "bg-[#34C759]", mobileOnly: true },
  { key: "outlook", label: "Outlook", icon: <Mail className="size-5" />, bg: "bg-[#0078D4]" },
  { key: "email", label: "Email app", icon: <AtSign className="size-5" />, bg: "bg-slate-600" },
  { key: "telegram", label: "Telegram", icon: <Send className="size-5" />, bg: "bg-[#229ED9]" },
  { key: "viber", label: "Viber", icon: <PhoneCall className="size-5" />, bg: "bg-[#7360F2]", mobileOnly: true },
  { key: "teams", label: "Teams", icon: <Users className="size-5" />, bg: "bg-[#5B5FC7]" },
];

export function ShareMeetingDialog({ meetings, heading, onClose }: {
  meetings: ShareableMeeting[];
  heading?: string;
  onClose: () => void;
}) {
  const invite = React.useMemo(() => buildMeetInvite(meetings), [meetings]);
  const multi = meetings.length > 1;
  const [mobile] = React.useState(isMobileDevice);
  const [nativeOk] = React.useState(canNativeShare);
  const [copied, setCopied] = React.useState<"link" | "invite" | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (what: "link" | "invite") => {
    const ok = await copyText(what === "link" ? invite.url : invite.text);
    if (ok) setCopied(what);
    else setNotice("Couldn't copy automatically — press and hold the link to copy it.");
  };

  const shareNative = async () => {
    const result = await nativeShareInvite(invite, multi);
    if (result === "shared") onClose();
    else if (result === "failed") setNotice("This device couldn't open its share menu — pick an app below instead.");
  };

  const shareTo = async (key: ShareTargetKey) => {
    if (key === "messenger" && !mobile) {
      const ok = await copyText(invite.text);
      setNotice(ok
        ? "Invite copied — paste it into the Messenger chat that just opened."
        : "Messenger opened — copy the link above and paste it into the chat.");
    } else {
      setNotice(null);
    }
    openShareUrl(shareTargetUrl(key, invite, mobile));
  };

  const targets = TARGETS.filter((t) => mobile || !t.mobileOnly);
  const first = meetings[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Share meeting invite"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-emerald-500/25 bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-2xl shadow-emerald-950/40 sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <SuprahMeetLogo className="size-8 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight">{heading ?? "Share meeting invite"}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {first.title || "Suprah Meet"}{multi ? ` · ${meetings.length} sessions` : ` · ${first.code}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        {nativeOk && (
          <Button onClick={() => void shareNative()}
            className="mb-4 h-11 w-full gap-2 bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500">
            <Share2 className="size-4" /> {mobile ? "Share to any app" : "More sharing options"}
          </Button>
        )}

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Send with</p>
        <div className="mb-4 grid grid-cols-4 gap-x-1 gap-y-3">
          {targets.map((t) => (
            <button key={t.key} onClick={() => void shareTo(t.key)}
              className="group flex flex-col items-center gap-1.5 rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60">
              <span className={cn("grid size-12 place-items-center rounded-full text-white shadow-sm transition-transform group-hover:scale-105 group-active:scale-95", t.bg)}>
                {t.icon}
              </span>
              <span className="text-center text-[11px] leading-tight text-muted-foreground group-hover:text-foreground">{t.label}</span>
            </button>
          ))}
        </div>

        {notice && (
          <p className="mb-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            {notice}
          </p>
        )}

        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {multi ? "First session link" : "Guest link"}
        </p>
        <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/30 p-1 pl-3">
          <span className="min-w-0 flex-1 select-all truncate text-sm">{invite.url}</span>
          <Button size="sm" variant="secondary" className="shrink-0 gap-1.5" onClick={() => void copy("link")}>
            {copied === "link" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied === "link" ? "Copied" : "Copy"}
          </Button>
        </div>
        <button onClick={() => void copy("invite")}
          className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-500">
          {copied === "invite" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          {copied === "invite" ? "Full invite copied" : "Copy full invite with date, time, and code"}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Anyone with the link can join from any browser — no Suprah account needed.
          Private meetings hold guests in the waiting room until the host admits them.
        </p>
      </div>
    </div>
  );
}
