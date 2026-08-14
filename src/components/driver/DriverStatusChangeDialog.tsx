"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, FileText, FileUp, Loader2, ShieldAlert, Wrench, PauseCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { DriverStatusRequestSnapshot } from "@/hooks/useDriverWorkEligibility";

type RequestedStatus = "on_leave" | "maintenance";
type Priority = "standard" | "emergency";

const REASONS_BY_CONTEXT = {
  standard: {
    on_leave: [
      ["personal_leave", "Personal leave"],
      ["scheduled_time_off", "Scheduled time off"],
      ["vacation_planned_absence", "Vacation / planned absence"],
      ["family_matter", "Family matter"],
      ["medical_appointment", "Medical appointment"],
      ["personal_appointment", "Personal appointment"],
      ["personal_commitment", "Personal commitment"],
      ["bereavement", "Bereavement"],
      ["other", "Other"],
    ],
    maintenance: [
      ["vehicle_maintenance", "Vehicle maintenance"],
      ["scheduled_service", "Scheduled service"],
      ["vehicle_repair", "Vehicle repair"],
      ["equipment_inspection", "Equipment inspection"],
      ["trailer_maintenance", "Trailer maintenance"],
      ["shop_appointment", "Shop appointment"],
      ["non_urgent_mechanical_issue", "Non-urgent mechanical issue"],
      ["other", "Other"],
    ],
  },
  emergency: {
    on_leave: [
      ["medical_emergency", "Medical emergency"],
      ["family_emergency", "Family emergency"],
      ["personal_emergency", "Personal emergency"],
      ["accident_incident", "Accident / incident"],
      ["unsafe_conditions", "Unsafe conditions"],
      ["unable_to_continue_safely", "Unable to continue safely"],
      ["other_emergency", "Other emergency"],
    ],
    maintenance: [
      ["vehicle_breakdown", "Vehicle breakdown"],
      ["mechanical_failure", "Mechanical failure"],
      ["accident_collision", "Accident / collision"],
      ["critical_equipment_issue", "Critical equipment issue"],
      ["unsafe_vehicle_condition", "Unsafe vehicle condition"],
      ["emergency_repair", "Emergency repair"],
      ["unable_to_continue_safely", "Unable to continue safely"],
      ["other_emergency", "Other emergency"],
    ],
  },
} as const;

function reasonLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestedStatus?: RequestedStatus;
  priority?: Priority;
  currentRequest?: DriverStatusRequestSnapshot | null;
  onSubmitted?: () => void | Promise<void>;
}

export function DriverStatusChangeDialog({
  open,
  onOpenChange,
  requestedStatus = "on_leave",
  priority = "standard",
  currentRequest = null,
  onSubmitted,
}: Props) {
  const { getToken } = useAuth();
  const isUpdate = Boolean(currentRequest?.id || currentRequest?._id);
  const [targetStatus, setTargetStatus] = React.useState<RequestedStatus>(requestedStatus);
  const [requestPriority, setRequestPriority] = React.useState<Priority>(priority);
  const [reason, setReason] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [effectiveAt, setEffectiveAt] = React.useState("");
  const [estimatedReturnAt, setEstimatedReturnAt] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setTargetStatus(currentRequest?.requestedStatus ?? requestedStatus);
    setRequestPriority(currentRequest?.priority ?? priority);
    setReason(currentRequest?.reason ?? "");
    setMessage(currentRequest?.message ?? "");
    setEffectiveAt(currentRequest?.effectiveAt?.slice(0, 16) ?? "");
    setEstimatedReturnAt(currentRequest?.estimatedReturnAt?.slice(0, 16) ?? "");
    setFiles([]);
  }, [open, requestedStatus, priority, currentRequest]);

  const emergency = requestPriority === "emergency";

  const reasonOptions = React.useMemo(() => {
    const base = REASONS_BY_CONTEXT[requestPriority][targetStatus];
    if (!reason || base.some(([value]) => value === reason)) {
      return base;
    }

    // Preserve a previously-saved legacy reason while editing an older
    // request, but never mix unrelated choices into a newly-selected status.
    return [[reason, `${reasonLabel(reason)} (current)`], ...base] as const;
  }, [reason, requestPriority, targetStatus]);

  const handleTargetStatusChange = React.useCallback((value: string) => {
    const nextStatus = value as RequestedStatus;
    setTargetStatus(nextStatus);

    const allowed = REASONS_BY_CONTEXT[requestPriority][nextStatus];
    if (reason && !allowed.some(([candidate]) => candidate === reason)) {
      setReason("");
    }
  }, [reason, requestPriority]);

  const handleFileSelection = React.useCallback((incoming: File[]) => {
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]);
    const maxFileSize = 10 * 1024 * 1024;

    const accepted: File[] = [];
    let rejectedType = false;
    let rejectedSize = false;

    for (const file of incoming) {
      if (!allowedTypes.has(file.type)) {
        rejectedType = true;
        continue;
      }
      if (file.size > maxFileSize) {
        rejectedSize = true;
        continue;
      }
      accepted.push(file);
    }

    setFiles((current) => {
      const deduped = [...current];
      for (const file of accepted) {
        const exists = deduped.some(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified,
        );
        if (!exists && deduped.length < 5) deduped.push(file);
      }
      return deduped.slice(0, 5);
    });

    if (incoming.length > 5 || files.length + accepted.length > 5) {
      toast.info("You can attach up to 5 files per request");
    }
    if (rejectedSize) {
      toast.error("Each attachment must be 10 MB or smaller");
    }
    if (rejectedType) {
      toast.error("Only JPG, PNG, WebP, and PDF files are supported");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [files.length]);

  const removeFile = React.useCallback((index: number) => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }, []);

  const formatFileSize = React.useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const submit = async () => {
    if (!emergency && !reason) {
      toast.error("Choose a reason for the status change request");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const form = new FormData();
      if (!isUpdate) {
        form.append("requestedStatus", targetStatus);
        form.append("priority", requestPriority);
      }
      if (reason) form.append("reason", reason);
      if (message.trim()) form.append("message", message.trim());
      if (effectiveAt) form.append("effectiveAt", effectiveAt);
      if (estimatedReturnAt) form.append("estimatedReturnAt", estimatedReturnAt);
      files.slice(0, 5).forEach((file) => form.append("attachments", file));

      if (isUpdate) {
        const requestId = currentRequest?.id || currentRequest?._id;
        await apiClient.patch(
          `/api/driver-profile/status-requests/${requestId}/details`,
          form,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Status request details updated");
      } else {
        const response = await apiClient.post(
          "/api/driver-profile/status-requests",
          form,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success(
          response.data?.message ||
            (emergency
              ? "Emergency request sent to Dispatch"
              : "Status change request submitted"),
        );
      }

      await onSubmitted?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to submit the status request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0" overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 items-start gap-2 break-words pr-7 [overflow-wrap:anywhere]">
            {emergency ? (
              <ShieldAlert className="size-5 text-red-500" />
            ) : targetStatus === "maintenance" ? (
              <Wrench className="size-5 text-blue-500" />
            ) : (
              <PauseCircle className="size-5 text-amber-500" />
            )}
            {isUpdate
              ? "Add Details to Status Request"
              : emergency
                ? "Emergency / Unable to Continue"
                : "Request Dispatch Status Change"}
          </DialogTitle>
          <DialogDescription className="break-words leading-relaxed [overflow-wrap:anywhere]">
            {emergency
              ? "Your safety comes first. Submit what you can now; the remaining details can be added later."
              : "Choose the status you need and add any details that will help Dispatch review your request."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        {!emergency && !isUpdate && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 sm:p-4">
            <p className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
              Have active loads?
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              Dispatch will decide whether to keep them assigned, reassign them, or return them to Available. If they stay assigned to you, GPS is required by default; Dispatch can make GPS optional.
            </p>
          </div>
        )}

        {emergency && !isUpdate && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-500 mt-0.5" />
              <p className="break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                Submitting an emergency request immediately blocks new assignments, load requests, and new load acceptance. Dispatch is notified to handle your current loads. GPS will continue only when location is available and will not block your access to the Driver Portal.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 py-1">
          {!isUpdate && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Requested Status</Label>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${emergency ? "border-red-500/25 bg-red-500/5 text-red-600 dark:text-red-400" : "border-border bg-muted/30 text-muted-foreground"}`}>
                  {emergency ? "Emergency request" : "Standard request"}
                </span>
              </div>
              <Select value={targetStatus} onValueChange={handleTargetStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="maintenance">In Shop</SelectItem>
                </SelectContent>
              </Select>
              <p className="break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {targetStatus === "on_leave"
                  ? "Choose On Leave when you need to step away from work."
                  : "Choose In Shop when your vehicle or equipment needs service or repair."}
              </p>
            </div>
          )}

          {(!emergency || isUpdate) && (
            <>
              <div className="space-y-1.5">
                <Label>{emergency ? "Situation (optional)" : "Reason"}</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={emergency ? "Add a situation if helpful" : "Choose a reason"} /></SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Message to Dispatch {emergency && "(optional)"}</Label>
                <Textarea
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={emergency ? "Share only what you can right now." : "Add any useful context for Dispatch."}
                  maxLength={1500}
                />
              </div>

              <div className={`grid grid-cols-1 ${emergency ? "sm:grid-cols-1" : "sm:grid-cols-2"} gap-3`}>
                {!emergency && (
                  <div className="space-y-1.5">
                    <Label>Effective Date/Time (optional)</Label>
                    <Input type="datetime-local" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Estimated Return (optional)</Label>
                  <Input type="datetime-local" value={estimatedReturnAt} onChange={(event) => setEstimatedReturnAt(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <FileUp className="size-3.5 shrink-0" />
                    <span className="break-words [overflow-wrap:anywhere]">Attachments (optional)</span>
                  </Label>
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    Add a photo or document only if it helps explain your request. You can submit without attaching anything.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) =>
                    handleFileSelection(Array.from(event.target.files || []))
                  }
                />

                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                        Add supporting files
                      </p>
                      <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                        JPG, PNG, WebP, or PDF · up to 5 files · 10 MB each
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || files.length >= 5}
                    >
                      <FileUp className="mr-2 size-4" />
                      {files.length >= 5 ? "5 files added" : "Add files"}
                    </Button>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        Selected files ({files.length}/5)
                      </p>
                      {files.length < 5 && (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={submitting}
                        >
                          Add another
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {files.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2"
                        >
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="break-all text-xs font-medium leading-relaxed text-foreground">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => removeFile(index)}
                            disabled={submitting}
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {emergency && (
                  <p className="break-words text-[10px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    Attachments are never required for an emergency request.
                  </p>
                )}
              </div>
            </>
          )}

          {emergency && !isUpdate && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can leave the details for later. Dispatch will receive the emergency request immediately, and you can add a situation, message, photos, documents, or an estimated return time when you are able.
            </p>
          )}
        </div>

        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className={`${emergency ? "bg-red-600 hover:bg-red-700" : ""} w-full sm:w-auto`}
          >
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isUpdate
              ? "Update Request"
              : emergency
                ? "I Need to Stop Working"
                : "Submit Request"}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}