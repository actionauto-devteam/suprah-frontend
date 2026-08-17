"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { DriverTrackingItem } from "@/types/driver-tracking";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
  requestId?: string | null;
  onUpdated?: () => void | Promise<void>;
  activeDrivers?: DriverTrackingItem[];
  onReassignLoad?: (loadId: string, newDriverId: string) => Promise<boolean>;
}

type ReassignLoadTarget = {
  id: string;
  loadNumber: string;
};

type LoadHandlingDecision =
  | "keep_assigned"
  | "reassign"
  | "return_available";

const LOAD_HANDLING_COPY: Record<
  LoadHandlingDecision,
  { title: string; description: string }
> = {
  keep_assigned: {
    title: "Keep Assigned",
    description:
      "Keep the driver's current active loads with them while the requested Work Availability change takes effect.",
  },
  reassign: {
    title: "Reassign",
    description:
      "Approve the request, block new work, and move the active loads to other eligible drivers using the existing reassignment controls.",
  },
  return_available: {
    title: "Return to Available",
    description:
      "Clear the driver assignment and return the current active loads to the Available load pool for Dispatch to handle.",
  },
};

export function DriverStatusRequestReviewDialog({
  open,
  onOpenChange,
  driver,
  requestId,
  onUpdated,
  activeDrivers = [],
  onReassignLoad,
}: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const resolvedRequestId = requestId || driver?.statusRequest?.id || null;

  const [request, setRequest] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [action, setAction] = React.useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [loadHandling, setLoadHandling] =
    React.useState<LoadHandlingDecision>("keep_assigned");
  const [retainedGpsRequired, setRetainedGpsRequired] = React.useState(true);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [reassignTarget, setReassignTarget] =
    React.useState<ReassignLoadTarget | null>(null);
  const [driverSearch, setDriverSearch] = React.useState("");
  const [reassigningDriverId, setReassigningDriverId] =
    React.useState<string | null>(null);

  const fetchRequest = React.useCallback(async () => {
    if (!open || !resolvedRequestId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const response = await apiClient.get(
        `/api/driver-profile/status-requests/${resolvedRequestId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const nextRequest = response.data?.data ?? null;
      setRequest(nextRequest);

      if (nextRequest?.loadHandlingDecision) {
        setLoadHandling(nextRequest.loadHandlingDecision);
        setRetainedGpsRequired(nextRequest.retainedGpsRequired !== false);
      } else if (nextRequest?.status === "pending") {
        setLoadHandling("keep_assigned");
        setRetainedGpsRequired(true);
        setAdvancedOpen(false);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to load the Work Availability request",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, open, resolvedRequestId]);

  React.useEffect(() => {
    void fetchRequest();
    if (!open) {
      setRequest(null);
      setRejectReason("");
      setLoadHandling("keep_assigned");
      setRetainedGpsRequired(true);
      setAdvancedOpen(false);
      setReassignTarget(null);
      setDriverSearch("");
      setReassigningDriverId(null);
    }
  }, [fetchRequest, open]);

  const currentLoads = React.useMemo(
    () =>
      Array.isArray(request?.currentActiveLoads)
        ? request.currentActiveLoads
        : [],
    [request?.currentActiveLoads],
  );

  const submissionLoads = React.useMemo(
    () =>
      Array.isArray(request?.affectedLoadIds) ? request.affectedLoadIds : [],
    [request?.affectedLoadIds],
  );

  const loadsToShow = currentLoads.length > 0 ? currentLoads : submissionLoads;

  const takeAction = async (nextAction: "approve" | "reject") => {
    if (!resolvedRequestId) return;
    if (nextAction === "reject" && rejectReason.trim().length < 3) {
      toast.error("Enter a reason for rejecting this request");
      return;
    }

    setAction(nextAction);
    try {
      const token = await getToken();
      const body =
        nextAction === "reject"
          ? { reason: rejectReason.trim() }
          : {
              loadHandling,
              retainedGpsRequired:
                loadHandling === "keep_assigned"
                  ? retainedGpsRequired
                  : false,
            };

      const response = await apiClient.post(
        `/api/driver-profile/status-requests/${resolvedRequestId}/${nextAction}`,
        body,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(response.data?.message || `Request ${nextAction}d`);
      await fetchRequest();
      await onUpdated?.();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || `Unable to ${nextAction} request`,
      );
    } finally {
      setAction(null);
    }
  };

  const emergency = request?.priority === "emergency";
  const emergencyActive = Boolean(
    emergency &&
      ["pending", "approved_awaiting_reassignment"].includes(request?.status),
  );
  const awaiting = request?.status === "approved_awaiting_reassignment";
  const awaitingReassignment =
    awaiting && request?.loadHandlingDecision === "reassign";
  const requestedStatus =
    request?.requestedStatus === "maintenance" ? "In Shop" : "On Leave";
  const requestDriverId = String(
    request?.driverId?._id ??
      request?.driverId ??
      driver?.driver?.id ??
      driver?.id ??
      "",
  );

  const reassignCandidates = React.useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    return activeDrivers
      .filter((candidate) => {
        const candidateId = String(candidate.driver?.id ?? candidate.id ?? "");
        if (
          !candidate.assignable ||
          !candidateId ||
          candidateId === requestDriverId
        ) {
          return false;
        }
        if (!q) return true;
        const name = candidate.driver?.name?.toLowerCase() || "";
        const email = candidate.driver?.email?.toLowerCase() || "";
        return name.includes(q) || email.includes(q);
      })
      .sort((a, b) =>
        String(a.driver?.name || "").localeCompare(
          String(b.driver?.name || ""),
        ),
      );
  }, [activeDrivers, driverSearch, requestDriverId]);

  const beginReassign = React.useCallback((load: any) => {
    const id = String(load?._id ?? load?.id ?? "");
    if (!id) {
      toast.error("This load does not have a valid ID for reassignment");
      return;
    }
    setDriverSearch("");
    setReassignTarget({
      id,
      loadNumber: String(load?.loadNumber ?? id.slice(-8)),
    });
  }, []);

  const reassignLoad = React.useCallback(
    async (candidate: DriverTrackingItem) => {
      if (!reassignTarget || !onReassignLoad) return;
      const newDriverId = String(candidate.driver?.id ?? candidate.id ?? "");
      if (!newDriverId) return;

      setReassigningDriverId(newDriverId);
      try {
        const succeeded = await onReassignLoad(reassignTarget.id, newDriverId);
        if (!succeeded) return;

        setReassignTarget(null);
        setDriverSearch("");
        await fetchRequest();
        await onUpdated?.();
      } finally {
        setReassigningDriverId(null);
      }
    },
    [fetchRequest, onReassignLoad, onUpdated, reassignTarget],
  );

  const approveLabel =
    currentLoads.length === 0
      ? "Approve Request"
      : loadHandling === "keep_assigned"
        ? "Approve & Keep Loads"
        : loadHandling === "return_available"
          ? "Approve & Return Loads"
          : "Approve & Start Reassignment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[88vh] sm:max-w-3xl duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0" overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-6 sm:py-5">
          <DialogTitle className="flex items-start gap-2 break-words text-lg font-black [overflow-wrap:anywhere] sm:text-xl">
            {emergency ? (
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-500" />
            ) : (
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
            )}
            <span>
              {emergency
                ? "Emergency Driver Request"
                : "Work Availability Change Request"}
            </span>
          </DialogTitle>
          <DialogDescription className="break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
            {emergency
              ? "Review the driver's urgent request and active loads. Emergency handling remains immediate and does not wait for normal approval."
              : currentLoads.length > 0
                ? "Choose one clear load-handling action. Keep Assigned is the default and requires GPS by default, with optional GPS available under Advanced Options."
                : "Review the request and approve or reject it. No active-load handling decision is currently required."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : request ? (
            <div className="space-y-5">
              {emergencyActive && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-red-700 [overflow-wrap:anywhere] dark:text-red-400">
                      Emergency Release Active
                    </p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                      New work is already blocked. Reassign or remove the driver's active loads. This emergency flow does not wait for normal approval.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="Driver"
                  value={request.driverId?.name || driver?.driver?.name || "Driver"}
                />
                <Info label="Requested Availability" value={requestedStatus} />
                <Info label="Priority" value={emergency ? "Emergency" : "Standard"} />
                <Info
                  label="State"
                  value={String(request.status || "").replace(/_/g, " ")}
                />
              </div>

              {(request.reason || request.message) && (
                <div className="space-y-3 rounded-xl border border-border/60 p-4">
                  {request.reason && (
                    <Info
                      label="Reason"
                      value={String(request.reason).replace(/_/g, " ")}
                    />
                  )}
                  {request.message && (
                    <Info label="Driver Message" value={request.message} />
                  )}
                </div>
              )}

              {!emergency &&
                request.status === "pending" &&
                currentLoads.length > 0 && (
                  <section className="space-y-3">
                    <div>
                      <p className="text-sm font-black text-foreground">
                        Active Load Handling
                      </p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                        Choose one action for all {currentLoads.length} current active load{currentLoads.length === 1 ? "" : "s"}. You can still use individual reassignment controls if you choose Reassign.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {(
                        [
                          ["keep_assigned", PackageCheck],
                          ["reassign", RefreshCw],
                          ["return_available", Undo2],
                        ] as const
                      ).map(([key, Icon]) => {
                        const selected = loadHandling === key;
                        const copy = LOAD_HANDLING_COPY[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setLoadHandling(key);
                              if (key !== "keep_assigned") setAdvancedOpen(false);
                            }}
                            className={`w-full rounded-xl border p-4 text-left transition-all ${
                              selected
                                ? "border-emerald-500/45 bg-emerald-500/[0.07] shadow-sm"
                                : "border-border/60 bg-background hover:border-emerald-500/25 hover:bg-muted/20"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                  selected
                                    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <Icon className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="break-words text-sm font-black [overflow-wrap:anywhere]">
                                    {copy.title}
                                  </p>
                                  {key === "keep_assigned" && (
                                    <Badge
                                      variant="outline"
                                      className="h-5 shrink-0 text-[9px] font-bold"
                                    >
                                      Default
                                    </Badge>
                                  )}
                                  {selected && (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                  )}
                                </div>
                                <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                                  {copy.description}
                                </p>
                                {key === "keep_assigned" && (
                                  <p className="mt-2 break-words text-xs font-semibold text-emerald-700 [overflow-wrap:anywhere] dark:text-emerald-400">
                                    GPS is required by default while retained loads remain active.
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {loadHandling === "keep_assigned" && (
                      <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-4">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 text-left"
                          onClick={() => setAdvancedOpen((current) => !current)}
                        >
                          <div className="min-w-0">
                            <p className="break-words text-xs font-black [overflow-wrap:anywhere]">
                              Advanced Options
                            </p>
                            <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                              Only change this if Dispatch intentionally wants GPS to remain optional.
                            </p>
                          </div>
                          {advancedOpen ? (
                            <ChevronUp className="size-4 shrink-0" />
                          ) : (
                            <ChevronDown className="size-4 shrink-0" />
                          )}
                        </button>

                        {advancedOpen && (
                          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 bg-background p-3">
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 shrink-0 accent-emerald-600"
                              checked={!retainedGpsRequired}
                              onChange={(event) =>
                                setRetainedGpsRequired(!event.target.checked)
                              }
                            />
                            <span className="min-w-0">
                              <span className="block break-words text-xs font-bold [overflow-wrap:anywhere]">
                                Allow GPS to remain optional
                              </span>
                              <span className="mt-1 block break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                                The loads stay assigned, but the driver may turn location sharing on or off while {requestedStatus}. Leave this unchecked to require GPS.
                              </span>
                            </span>
                          </label>
                        )}
                      </div>
                    )}

                    {loadHandling === "return_available" && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <p className="break-words text-xs leading-relaxed text-amber-800 [overflow-wrap:anywhere] dark:text-amber-300">
                          Approving this option clears the driver's assignment from all current active loads and returns them to Posted / Available for Dispatch.
                        </p>
                      </div>
                    )}
                  </section>
                )}

              {loadsToShow.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {currentLoads.length > 0
                        ? "Current Active Loads"
                        : "Affected Loads at Submission"}
                    </p>
                    {currentLoads.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {currentLoads.length} active
                      </Badge>
                    )}
                  </div>

                  {loadsToShow.map((load: any) => {
                    const loadId = String(
                      load?._id ??
                        load?.id ??
                        (typeof load === "string" ? load : ""),
                    );
                    const loadNumber = String(
                      load?.loadNumber ??
                        (typeof load === "string"
                          ? load.slice(-8)
                          : loadId.slice(-8)),
                    );
                    const canActImmediately =
                      Boolean(loadId) &&
                      currentLoads.length > 0 &&
                      (emergencyActive || awaitingReassignment);

                    return (
                      <div
                        key={loadId || String(load)}
                        className="space-y-2 rounded-xl border border-border/50 px-3 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                            {loadNumber}
                          </span>
                          {load.status && (
                            <Badge variant="outline" className="text-[10px]">
                              {load.status}
                            </Badge>
                          )}
                        </div>

                        {canActImmediately && (
                          <div className="grid grid-cols-1 gap-2 border-t border-border/30 pt-2 sm:grid-cols-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-9 gap-1.5 text-xs font-semibold"
                              onClick={() => {
                                const query = load?.loadNumber || loadId;
                                router.push(
                                  `/transportation?search=${encodeURIComponent(String(query))}`,
                                );
                              }}
                            >
                              <Eye className="size-3.5" />
                              View Load
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-9 gap-1.5 border-amber-500/30 text-xs font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                              disabled={!onReassignLoad}
                              onClick={() => beginReassign(load)}
                            >
                              <RefreshCw className="size-3.5" />
                              Reassign
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}

              {(emergencyActive || awaitingReassignment) && reassignTarget && (
                <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black [overflow-wrap:anywhere]">
                        Reassign {reassignTarget.loadNumber}
                      </p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                        Choose another eligible Active driver. The requesting driver remains blocked from new work during reassignment.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0 px-2 text-xs"
                      onClick={() => setReassignTarget(null)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      value={driverSearch}
                      onChange={(event) => setDriverSearch(event.target.value)}
                      placeholder="Search available drivers..."
                      className="h-10 pl-9 text-sm"
                    />
                  </div>

                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {reassignCandidates.length === 0 ? (
                      <div className="rounded-lg border border-border/40 px-3 py-5 text-center text-xs text-muted-foreground">
                        No other eligible drivers are available.
                      </div>
                    ) : (
                      reassignCandidates.map((candidate) => {
                        const candidateId = String(
                          candidate.driver?.id ?? candidate.id,
                        );
                        return (
                          <div
                            key={candidateId}
                            className="flex flex-col gap-3 rounded-lg border border-border/40 bg-background/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                                {candidate.driver?.name || "Driver"}
                              </p>
                              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                                {candidate.shipments?.length || 0} active load{(candidate.shipments?.length || 0) === 1 ? "" : "s"}
                                {candidate.driver?.email
                                  ? ` · ${candidate.driver.email}`
                                  : ""}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 w-full shrink-0 px-3 text-xs font-bold sm:w-auto"
                              disabled={reassigningDriverId !== null}
                              onClick={() => void reassignLoad(candidate)}
                            >
                              {reassigningDriverId === candidateId ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Reassign"
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {Array.isArray(request.attachments) &&
                request.attachments.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Supporting Files
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {request.attachments.map(
                        (attachment: any, index: number) => (
                          <a
                            key={attachment.id || index}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 items-start gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40"
                          >
                            <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 break-all text-xs font-semibold [overflow-wrap:anywhere]">
                              {attachment.fileName || `Attachment ${index + 1}`}
                            </span>
                            <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                          </a>
                        ),
                      )}
                    </div>
                  </section>
                )}

              {!emergency && request.status === "pending" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">
                    Rejection reason
                  </label>
                  <Textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Required only when rejecting this request"
                    className="min-h-20 resize-y text-sm"
                  />
                </div>
              )}

              {awaitingReassignment && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="break-words text-sm font-bold text-amber-800 [overflow-wrap:anywhere] dark:text-amber-300">
                    Approved — Reassignment in Progress
                  </p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-amber-700 [overflow-wrap:anywhere] dark:text-amber-400">
                    New work is blocked. Reassign the active loads above. The requested Work Availability change applies automatically after all active loads are moved away from this driver.
                  </p>
                </div>
              )}

              {request.status === "completed" &&
                request.loadHandlingDecision === "keep_assigned" && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-emerald-700 [overflow-wrap:anywhere] dark:text-emerald-400">
                          Loads Kept Assigned
                        </p>
                        <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                          {request.retainedGpsRequired
                            ? "GPS is required by Dispatch while the retained active loads remain assigned."
                            : "GPS remains optional while the retained active loads remain assigned."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Work Availability request not found.
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {!emergency && request?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="w-full border-red-500/25 text-red-600 hover:bg-red-500/10 sm:w-auto"
                  disabled={action !== null}
                  onClick={() => void takeAction("reject")}
                >
                  {action === "reject" && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Reject
                </Button>
                <Button
                  className="w-full sm:w-auto sm:min-w-44"
                  disabled={action !== null}
                  onClick={() => void takeAction("approve")}
                >
                  {action === "approve" && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  <span className="break-words text-center [overflow-wrap:anywhere]">
                    {approveLabel}
                  </span>
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-semibold capitalize [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}