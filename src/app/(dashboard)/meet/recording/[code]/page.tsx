"use client";

/**
 * Suprah Meet — secure recording viewer (public page, token-gated).
 * Reached only via the personal link in the distribution email:
 * /meet/recording/<code>?t=<token>. The token is validated server-side and the
 * video plays from a short-lived presigned URL — the raw file is never public.
 */

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Clock, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

interface RecData {
  title: string; code: string; whenStr: string; durationMin: number | null;
  videoUrl: string; viewer: string | null;
  summary: { overview: string; keyPoints: string[]; decisions: string[]; actionItems: string[] } | null;
}

export default function SuprahMeetRecordingPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = decodeURIComponent(String(params.code || "")).toUpperCase();
  const token = search.get("t") || "";

  const [data, setData] = React.useState<RecData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) { setError("This recording link is missing its access token."); return; }
    let on = true;
    void (async () => {
      try {
        const res = await apiClient.get(
          `/api/crm/meet/guest/recording/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`);
        if (on) setData(res.data?.data);
      } catch (err: any) {
        if (on) setError(err?.response?.data?.message || "This recording could not be loaded.");
      }
    })();
    return () => { on = false; };
  }, [code, token]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#071410] p-6 text-center text-emerald-50">
        <div className="grid size-16 place-items-center rounded-2xl bg-rose-500/10">
          <ShieldAlert className="size-8 text-rose-400" />
        </div>
        <p className="text-lg font-medium">Can&apos;t open this recording</p>
        <p className="max-w-md text-sm text-emerald-200/60">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#071410] text-emerald-50">
        <SuprahMeetLogo className="size-12 animate-pulse" />
        <p className="text-sm text-emerald-200/60">Checking your access…</p>
      </div>
    );
  }

  const Section = ({ label, items }: { label: string; items?: string[] }) =>
    items && items.length > 0 ? (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">{label}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-emerald-100/90">
          {items.map((i, n) => <li key={n}>{i}</li>)}
        </ul>
      </div>
    ) : null;

  return (
    <div className="min-h-dvh bg-[#071410] text-emerald-50">
      <header className="flex items-center gap-2.5 border-b border-emerald-400/15 bg-[#0a1410]/80 px-4 py-3">
        <SuprahMeetLogo className="size-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{data.title}</p>
          <p className="flex items-center gap-1.5 text-xs text-emerald-200/50">
            <Clock className="size-3" /> {data.whenStr}{data.durationMin ? ` · ${data.durationMin} min` : ""} · {data.code}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        {/* The presigned URL inside expires after ~1 hour; reloading the page
            (with the email link's token still valid) mints a fresh one. */}
        <video src={data.videoUrl} controls playsInline
          className="w-full rounded-2xl border border-emerald-400/20 bg-black shadow-[0_0_40px_rgba(16,185,129,0.08)]" />

        <div className="rounded-2xl border border-emerald-400/15 bg-[#0f1f19] p-4 md:p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
            AI meeting summary
          </p>
          {data.summary?.overview ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-emerald-100/90">{data.summary.overview}</p>
              <Section label="Key points" items={data.summary.keyPoints} />
              <Section label="Decisions" items={data.summary.decisions} />
              <Section label="Action items" items={data.summary.actionItems} />
            </div>
          ) : (
            <p className="text-sm text-emerald-200/50">The AI summary wasn&apos;t available for this meeting.</p>
          )}
        </div>

        <p className="pb-6 text-center text-[11px] text-emerald-200/40">
          {data.viewer ? `This link was sent to ${data.viewer}. ` : ""}Access expires 7 days after it was sent.
          If the video stops loading, reopen the link from your email.
        </p>
      </main>
    </div>
  );
}
