"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function conversationLink(leadId: string): string {
  return `${window.location.origin}/crm/leads?lead=${encodeURIComponent(leadId)}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyConversationLinkButton({
  leadId,
  className,
}: {
  leadId?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [manualLink, setManualLink] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!leadId) return null;

  const handleCopy = async () => {
    const link = conversationLink(leadId);
    if (await copyText(link)) {
      setCopied(true);
      toast.success("Link copied", {
        description: "Paste it anywhere. It opens this customer's conversation.",
      });
      return;
    }
    setManualLink(link);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        className={className}
        title="Copy link to this conversation"
        aria-label="Copy link to this conversation"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
      </button>
      <Dialog open={Boolean(manualLink)} onOpenChange={(open) => !open && setManualLink(null)}>
        <DialogContent
          className="w-[calc(100vw-1rem)] sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
        >
          <DialogHeader>
            <DialogTitle>Link to this conversation</DialogTitle>
            <DialogDescription>
              Your browser did not allow copying. Select the link below and copy it.
            </DialogDescription>
          </DialogHeader>
          <input
            ref={inputRef}
            readOnly
            value={manualLink || ""}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm"
            aria-label="Conversation link"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
