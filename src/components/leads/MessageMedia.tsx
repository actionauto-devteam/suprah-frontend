"use client";

import * as React from "react";
import { FileText, ImageIcon, Loader2, Paperclip } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

export interface MessageMediaItem {
  name?: string;
  contentType?: string;
  kind?: "image" | "file";
}

async function fetchBlobUrl(path: string, token: string | null): Promise<string> {
  const response = await apiClient.get(path, {
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return URL.createObjectURL(response.data as Blob);
}

function openInNewTab(url: string, name: string) {
  const opened = window.open(url, "_blank");
  if (opened) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function PhotoThumb({ path, name, outbound }: { path: string; name: string; outbound: boolean }) {
  const { getToken } = useAuth();
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    let created: string | null = null;
    getToken()
      .then((token) => fetchBlobUrl(path, token))
      .then((objectUrl) => {
        created = objectUrl;
        if (alive) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [getToken, path]);

  if (failed) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]", outbound ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 dark:bg-emerald-400/10 dark:text-slate-300")}>
        <ImageIcon className="h-3 w-3 shrink-0" />
        Photo not available
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => url && openInNewTab(url, name)}
      disabled={!url}
      className="relative block h-28 w-28 overflow-hidden rounded-lg border border-black/10 bg-slate-100 dark:border-white/10 dark:bg-slate-800 sm:h-32 sm:w-32"
      aria-label={`Open ${name}`}
      title={`Open ${name}`}
      data-testid="message-photo"
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      )}
    </button>
  );
}

function FileCard({ path, name, outbound, notFoundText = "This file can't be opened from Suprah." }: { path: string; name: string; outbound: boolean; notFoundText?: string }) {
  const { getToken } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const open = async () => {
    setBusy(true);
    setError("");
    try {
      const objectUrl = await fetchBlobUrl(path, await getToken());
      openInNewTab(objectUrl, name);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (caught) {
      const message = (caught as { response?: { status?: number } })?.response?.status === 404
        ? notFoundText
        : "Couldn't open this file. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex max-w-full flex-col">
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className={cn(
          "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] font-medium transition",
          outbound ? "bg-white/15 text-white hover:bg-white/25" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-emerald-400/10 dark:text-slate-200 dark:hover:bg-emerald-400/20",
        )}
        title={`Open ${name}`}
        data-testid="message-file"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : name.toLowerCase().endsWith(".pdf") ? <FileText className="h-3.5 w-3.5 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{name}</span>
      </button>
      {error && <span className={cn("mt-0.5 text-[10px]", outbound ? "text-white/80" : "text-red-500")}>{error}</span>}
    </span>
  );
}

export function TextMessageMedia({ messageId, media, outbound }: { messageId: string; media: MessageMediaItem[]; outbound: boolean }) {
  if (!messageId || !media.length) return null;
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {media.map((item, index) => {
        const path = `/api/crm/communications/messages/${messageId}/media/${index}`;
        const name = item.name || (item.kind === "image" ? `photo-${index + 1}` : `file-${index + 1}`);
        return item.kind === "image"
          ? <PhotoThumb key={`${messageId}-${index}`} path={path} name={name} outbound={outbound} />
          : <FileCard key={`${messageId}-${index}`} path={path} name={name} outbound={outbound} />;
      })}
    </span>
  );
}

export function EmailAttachmentButton({ leadId, gmailId, index, name, outbound }: { leadId: string; gmailId: string; index: number; name: string; outbound: boolean }) {
  return (
    <FileCard
      path={`/api/leads/${leadId}/email-attachments/${gmailId}/${index}`}
      name={name}
      outbound={outbound}
      notFoundText="This file can't be opened from Suprah. Open the email in Gmail to see it."
    />
  );
}
