"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import type { Load } from "@/types/load";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReviewLoad = Load & {
  acceptanceMaterialVersion?: string;
  requiresDispatchReconfirmation?: boolean;
};

interface AssignmentReconfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: string | null;
  loadLabel?: string;
  onConfirmed?: () => Promise<void> | void;
}

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function locationText(location: Load["pickupLocation"] | Load["deliveryLocation"] | undefined) {
  if (!location) return "Not provided";
  return [location.address || location.street, location.city, location.state, location.zip]
    .filter(Boolean)
    .join(", ") || "Not provided";
}

function money(value?: number) {
  return value == null ? "Not provided" : `$${value.toLocaleString()}`;
}

function extractMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function AssignmentReconfirmDialog({
  open,
  onOpenChange,
  loadId,
  loadLabel,
  onConfirmed,
}: AssignmentReconfirmDialogProps) {
  const { getToken } = useAuth();
  const [load, setLoad] = React.useState<ReviewLoad | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLoad = React.useCallback(async () => {
    if (!loadId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing authentication token");
      const response = await apiClient.get(
        `/api/driver-tracking/loads/${encodeURIComponent(loadId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (response.data?.data || null) as ReviewLoad | null;
      // Never show a response that belongs to a different load.
      if (data && String(data._id) !== String(loadId)) {
        throw new Error("Load detail response mismatch");
      }
      setLoad(data);
    } catch (err) {
      setError("Failed to fetch load details");
    } finally {
      setLoading(false);
    }
  }, [loadId, getToken]);

  React.useEffect(() => {
    if (open && loadId) {
      fetchLoad();
    } else {
      setLoad(null);
      setError(null);
    }
  }, [open, loadId, fetchLoad]);

  const handleConfirm = React.useCallback(async () => {
    const reviewedMaterialVersion = load?.acceptanceMaterialVersion;
    if (!load || !reviewedMaterialVersion) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing authentication token");
      await apiClient.post(
        `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/reconfirm-assignment`,
        { reviewedMaterialVersion },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Assignment reconfirmed");
      try {
        await onConfirmed?.();
      } catch {
        // The reconfirmation already succeeded; a failed parent refresh must
        // not be reported as a failed confirmation.
      }
      onOpenChange(false);
    } catch (err: any) {
      const message = extractMessage(err, "Failed to reconfirm the assignment");
      // 409: the load changed while it was being reviewed (or is no longer
      // Assigned). Reload so the dispatcher reviews the latest terms.
      if (err?.response?.status === 409) await fetchLoad();
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [load, getToken, onConfirmed, onOpenChange, fetchLoad]);

  const driverName =
    load && typeof load.assignedDriverId === "object" && load.assignedDriverId
      ? load.assignedDriverId.name || load.assignedDriverId.email || "Assigned driver"
      : "Assigned driver";
  const instructions = [
    load?.additionalInfo?.instructions,
    load?.additionalInfo?.specialInstructions,
    load?.additionalInfo?.loadSpecificTerms,
  ].filter(Boolean) as string[];
  const canConfirm =
    !!load?.acceptanceMaterialVersion &&
    load?.status === "Assigned" &&
    !loading &&
    !submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reconfirm assignment</DialogTitle>
          <DialogDescription>
            {loadLabel || (load ? `Load #${load.loadNumber}` : "")}
            {" — review the current load details before confirming."}
          </DialogDescription>
        </DialogHeader>

        {loading && !load ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {load ? (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{load.status}</Badge>
              {load.requiresDispatchReconfirmation ? (
                <Badge variant="destructive">Changed since assignment</Badge>
              ) : (
                <Badge variant="secondary">Up to date</Badge>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Truck className="h-4 w-4" />
                {driverName}
              </span>
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">Pickup</div>
                  <div>{locationText(load.pickupLocation)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">Delivery</div>
                  <div>{locationText(load.deliveryLocation)}</div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <div className="font-medium">First available</div>
                <div>{formatDate(load.dates?.firstAvailable)}</div>
              </div>
              <div>
                <div className="font-medium">Pickup deadline</div>
                <div>{formatDate(load.dates?.pickupDeadline)}</div>
              </div>
              <div>
                <div className="font-medium">Delivery deadline</div>
                <div>{formatDate(load.dates?.deliveryDeadline)}</div>
              </div>
            </section>

            <section>
              <div className="font-medium">
                Vehicles ({load.vehicles?.length ?? 0})
              </div>
              {load.vehicles?.length ? (
                <ul className="mt-1 list-disc pl-5">
                  {load.vehicles.map((vehicle, index) => (
                    <li key={vehicle.vin || vehicle.vehicleId || index}>
                      {[vehicle.year, vehicle.make, vehicle.model]
                        .filter(Boolean)
                        .join(" ") || "Vehicle"}
                      {vehicle.vin ? ` · ${vehicle.vin}` : ""}
                      {` · ${vehicle.condition}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Not provided</div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {load.pricing?.isPricingEnabled === false ? (
                <div className="sm:col-span-3">Compensation was skipped for this load.</div>
              ) : (
                <>
                  <div>
                    <div className="font-medium">Carrier pay</div>
                    <div>{money(load.pricing?.carrierPayAmount)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Price per mile</div>
                    <div>{money(load.pricing?.pricePerMile)}</div>
                  </div>
                  <div>
                    <div className="font-medium">COP/COD</div>
                    <div>{money(load.pricing?.copCodAmount)}</div>
                  </div>
                </>
              )}
            </section>

            <section>
              <div className="font-medium">Instructions</div>
              {instructions.length ? (
                instructions.map((text, index) => (
                  <p key={index} className="whitespace-pre-wrap">
                    {text}
                  </p>
                ))
              ) : (
                <div>Not provided</div>
              )}
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={fetchLoad}
            disabled={loading || submitting || !loadId}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirm assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}