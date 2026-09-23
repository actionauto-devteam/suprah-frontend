"use client";

import * as React from "react";
import { Download, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface Summary {
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
}

interface RecState {
  status: "idle" | "recording" | "processing" | "ready" | "failed";
  error?: string;
}
interface AiState {
  status: "idle" | "transcribing" | "summarizing" | "ready" | "failed";
  summary?: Summary;
  error?: string;
}

/**
 * Post-meeting panel: recording download + AI summary generation.
 * Polls the two status endpoints; each GET on /ai advances the server-side
 * state machine (transcribing → summarizing → ready).
 */
export function MeetingSummaryPanel({ code }: { code: string }) {
  const [rec, setRec] = React.useState<RecState>({ status: "idle" });
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [ai, setAi] = React.useState<AiState>({ status: "idle" });
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const [recRes, aiRes] = await Promise.all([
        apiClient.get(`/api/crm/meet/meetings/${code}/recordings`),
        apiClient.get(`/api/crm/meet/meetings/${code}/ai`),
      ]);
      setRec(recRes.data?.data?.recording ?? { status: "idle" });
      setDownloadUrl(recRes.data?.data?.downloadUrl ?? null);
      setAi(aiRes.data?.data?.ai ?? { status: "idle" });
      setLoaded(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load meeting details.");
    }
  }, [code]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const pending =
    rec.status === "recording" || rec.status === "processing" ||
    ai.status === "transcribing" || ai.status === "summarizing";

  React.useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [pending, refresh]);

  const generate = async () => {
    setError(null);
    try {
      await apiClient.post(`/api/crm/meet/meetings/${code}/ai/process`);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not start AI processing.");
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Recording */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">Recording:</span>
        {!loaded && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Checking…
          </span>
        )}
        {loaded && rec.status === "idle" && (
          <span className="text-muted-foreground">No recording found</span>
        )}
        {loaded && rec.status === "recording" && (
          <span className="flex items-center gap-1.5 text-rose-500">
            <Loader2 className="size-3.5 animate-spin" /> Recording in progress…
          </span>
        )}
        {loaded && rec.status === "processing" && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Saving recording… this can take a few minutes.
          </span>
        )}
        {loaded && rec.status === "failed" && (
          <span className="text-destructive">Failed{rec.error ? ` — ${rec.error}` : ""}</span>
        )}
        {loaded && rec.status === "ready" && downloadUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="mr-1.5 size-3.5" /> Download MP4
            </a>
          </Button>
        )}
      </div>

      {/* AI summary */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <Bot className="size-4 text-emerald-500" /> AI meeting summary
          </span>
          {ai.status === "idle" && (
            <Button size="sm" onClick={() => void generate()} disabled={rec.status !== "ready" && rec.status !== "processing"}>
              Generate summary
            </Button>
          )}
          {(ai.status === "transcribing" || ai.status === "summarizing") && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {ai.status === "transcribing" ? "Transcribing recording…" : "Writing summary…"}
            </span>
          )}
          {ai.status === "failed" && (
            <span className="text-destructive">
              Failed{ai.error ? ` — ${ai.error}` : ""}.{" "}
              <button className="underline" onClick={() => void generate()}>
                Retry
              </button>
            </span>
          )}
        </div>

        {ai.status === "idle" && rec.status !== "ready" && (
          <p className="text-xs text-muted-foreground">
            The summary is generated from the meeting recording — record the meeting to enable it.
          </p>
        )}

        {ai.status === "ready" && ai.summary && (
          <div className="space-y-3">
            <p>{ai.summary.overview}</p>
            <SummaryList title="Key points" items={ai.summary.keyPoints} />
            <SummaryList title="Decisions" items={ai.summary.decisions} />
            <SummaryList title="Action items" items={ai.summary.actionItems} />
          </div>
        )}
      </div>

      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}