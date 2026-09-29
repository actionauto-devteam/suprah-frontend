"use client";

import * as React from "react";
import { History, Image as ImageIcon, Loader2, PenLine, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { userErrorMessage } from "@/lib/user-error";
import { useAuth } from "@/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HistoryPhoto {
  url: string | null;
  submittedAt: string | null;
  note: string;
}

interface AssignmentHistoryEntry {
  id: string;
  driverName: string | null;
  dispatcherName: string | null;
  endedByName: string | null;
  replacementDriverName: string | null;
  endReason: "reassigned" | "removed";
  statusAtEnd: string;
  endedAt: string | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  inTransitAt: string | null;
  pickupPhoto: HistoryPhoto | null;
  deliveryPhoto: HistoryPhoto | null;
  signature: { signerName: string; signedAt: string; imageDataUrl: string | null } | null;
}

interface LoadAssignmentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: string | null;
}

function formatWhen(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function PhotoLink({ label, photo }: { label: string; photo: HistoryPhoto }) {
  if (!photo.url) {
    return <p className="text-xs text-muted-foreground">{label}: the photo file couldn&apos;t be opened.</p>;
  }
  return (
    <a
      href={photo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-lg border border-border/60 bg-muted/20"
      title={`Open ${label.toLowerCase()} in a new tab`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={label} className="h-32 w-full object-cover transition-transform group-hover:scale-[1.02]" />
      <span className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold">
        <ImageIcon className="size-3" /> {label}
        {photo.submittedAt ? <span className="font-normal text-muted-foreground"> · {formatWhen(photo.submittedAt)}</span> : null}
      </span>
      {photo.note ? <span className="block px-2 pb-2 text-xs text-muted-foreground">Note: {photo.note}</span> : null}
    </a>
  );
}

/**
 * Drivers who previously had this load (reassigned or removed), with their
 * pickup/delivery photos, contract signature and lifecycle times.
 */
export function LoadAssignmentHistoryDialog({ open, onOpenChange, loadId }: LoadAssignmentHistoryDialogProps) {
  const { getToken } = useAuth();
  const [entries, setEntries] = React.useState<AssignmentHistoryEntry[]>([]);
  const [loadNumber, setLoadNumber] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchHistory = React.useCallback(async () => {
    if (!loadId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get(
        `/api/driver-tracking/loads/${encodeURIComponent(loadId)}/assignment-history`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      setEntries(response.data?.data?.entries ?? []);
      setLoadNumber(response.data?.data?.loadNumber ?? "");
    } catch (err) {
      setError(userErrorMessage(err, "load the assignment history"));
    } finally {
      setLoading(false);
    }
  }, [loadId, getToken]);

  React.useEffect(() => {
    if (open && loadId) void fetchHistory();
    if (!open) {
      setEntries([]);
      setError(null);
    }
  }, [open, loadId, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" /> Assignment history
          </DialogTitle>
          <DialogDescription>
            {loadNumber ? `Load ${loadNumber} — ` : ""}drivers who previously had this load, with their photos,
            signature and times. Newest first.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void fetchHistory()}>
              <RefreshCw className="mr-2 size-3.5" /> Try again
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No driver has been reassigned or removed from this load.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">{entry.driverName ?? "Former driver"}</p>
                  <Badge variant="outline">
                    {entry.endReason === "reassigned" ? "Reassigned" : "Removed"} while {entry.statusAtEnd}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatWhen(entry.endedAt)}
                  {entry.endedByName ? ` by ${entry.endedByName}` : ""}
                  {entry.replacementDriverName ? ` · handed to ${entry.replacementDriverName}` : ""}
                  {entry.dispatcherName ? ` · responsible dispatcher: ${entry.dispatcherName}` : ""}
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  {[
                    ["Assigned", entry.assignedAt],
                    ["Accepted", entry.acceptedAt],
                    ["Picked up", entry.pickedUpAt],
                    ["In transit", entry.inTransitAt],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="font-semibold text-muted-foreground">{label}</dt>
                      <dd>{formatWhen(value as string | null) ?? "—"}</dd>
                    </div>
                  ))}
                </dl>

                {(entry.pickupPhoto || entry.deliveryPhoto) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {entry.pickupPhoto ? <PhotoLink label="Pickup photo" photo={entry.pickupPhoto} /> : null}
                    {entry.deliveryPhoto ? <PhotoLink label="Delivery photo" photo={entry.deliveryPhoto} /> : null}
                  </div>
                )}

                {entry.signature ? (
                  <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-3">
                    <p className="flex items-center gap-1 text-xs font-semibold">
                      <PenLine className="size-3" /> Signed by {entry.signature.signerName || "the driver"}
                      <span className="font-normal text-muted-foreground"> · {formatWhen(entry.signature.signedAt)}</span>
                    </p>
                    {entry.signature.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.signature.imageDataUrl} alt="Driver signature" className="mt-2 h-16 rounded bg-white p-1" />
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
