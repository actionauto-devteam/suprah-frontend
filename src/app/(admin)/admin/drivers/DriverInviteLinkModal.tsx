"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, CheckCircle2, Copy, Link2, Loader2, Mail, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverInvite {
  shortCode: string;
  link: string;
  expiresAt: string;
  multiUse: boolean;
}

type BulkResult = { email: string; status: "sent" | "already_registered" | "error"; reason?: string };

function getErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.message || anyErr?.message || fallback;
}

function SingleLinkTab() {
  const { getToken } = useAuth();
  const [multiUse, setMultiUse] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<DriverInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setInvite(null);
    try {
      const token = await getToken();
      const res = await apiClient.post(
        "/api/admin/drivers/invite-link",
        { count: 1, multiUse },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const list = res.data?.data?.invites ?? [];
      if (list.length > 0) setInvite(list[0]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to generate invite link."));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!invite) return;
    navigator.clipboard.writeText(invite.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div>
          <Label htmlFor="multi-use" className="text-sm font-medium">Multi-use</Label>
          <p className="text-xs text-muted-foreground">Allow more than one driver to sign up with this link.</p>
        </div>
        <Switch id="multi-use" checked={multiUse} onCheckedChange={setMultiUse} disabled={loading} />
      </div>

      {!invite && (
        <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate Link"}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {invite && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
            <span className="flex-1 truncate text-sm font-mono">{invite.link}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Expires {new Date(invite.expiresAt).toLocaleString()} · {invite.multiUse ? "multi-use" : "single-use"}
          </p>
        </div>
      )}
    </div>
  );
}

function BulkInviteTab() {
  const { getToken } = useAuth();
  const [emailsRaw, setEmailsRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [summary, setSummary] = useState<{ sent: number; skipped: number; failed: number } | null>(null);

  const handleSend = async () => {
    const emails = emailsRaw
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) { setError("Please enter at least one email."); return; }
    if (emails.length > 50) { setError("Maximum 50 emails at once."); return; }

    setLoading(true);
    setError("");
    setResults([]);
    setSummary(null);

    try {
      const token = await getToken();
      const res = await apiClient.post(
        "/api/admin/drivers/invite-link/bulk",
        { emails },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data?.data;
      setResults(data?.results ?? []);
      setSummary({ sent: data?.sent ?? 0, skipped: data?.skipped ?? 0, failed: data?.failed ?? 0 });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send invites."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEmailsRaw("");
    setResults([]);
    setSummary(null);
    setError("");
  };

  return (
    <div className="space-y-4 pt-4">
      {!summary ? (
        <>
          <div>
            <p className="text-sm font-medium mb-1.5">Driver emails</p>
            <p className="text-xs text-muted-foreground mb-2">One email per line or comma-separated (max 50). Each gets their own single-use invite link.</p>
            <textarea
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              placeholder={"driver1@email.com\ndriver2@email.com\ndriver3@email.com"}
              rows={8}
              className="w-full rounded-lg border bg-muted/20 text-sm placeholder:text-muted-foreground/50 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <Button onClick={handleSend} disabled={loading || !emailsRaw.trim()} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {loading ? "Sending…" : "Send invite links"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600">{summary.sent} sent</span>
            {summary.skipped > 0 && <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-600">{summary.skipped} already registered</span>}
            {summary.failed > 0 && <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-600">{summary.failed} failed</span>}
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
            {results.map((r) => (
              <div key={r.email} className="flex items-center gap-2 px-3 py-2 text-sm">
                {r.status === "sent" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className={cn("h-3.5 w-3.5 shrink-0", r.status === "already_registered" ? "text-amber-500" : "text-red-500")} />
                )}
                <span className="truncate flex-1">{r.email}</span>
                {r.reason && <span className="text-xs text-muted-foreground shrink-0">{r.reason}</span>}
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={reset} className="w-full">Send more</Button>
        </>
      )}
    </div>
  );
}

export function DriverInviteLinkModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Driver Invite Links
          </DialogTitle>
          <DialogDescription>
            Anyone who signs up through these links joins as a driver with no organization tied to the account.
            Their application still goes through the normal approval queue on this page.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Link</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Invite</TabsTrigger>
          </TabsList>
          <TabsContent value="single"><SingleLinkTab /></TabsContent>
          <TabsContent value="bulk"><BulkInviteTab /></TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
