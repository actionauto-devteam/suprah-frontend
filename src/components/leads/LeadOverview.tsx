"use client";

import * as React from "react";
import { Car, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AssigneePicker } from "./atomic/AssigneePicker";
import { assigneeIdOf } from "./useConfirmedAssign";
import { VehiclePicker } from "./VehiclePicker";
import { WorkspaceStatusSelect } from "@/components/conversation-workspace/ContactDetailsPanel";
import type { WorkspaceStatusOption } from "@/components/conversation-workspace/workspace-types";
import { useAuth } from "@/providers/AuthProvider";

type OverviewLead = {
  _id?: string;
  status?: string;
  assignedTo?: unknown;
  vehicleId?: unknown;
  vehicle?: { year?: string | number; make?: string; model?: string; stock?: string } | null;
};

const labelClass = "text-[10px] font-semibold uppercase tracking-[0.12em]";

export function LeadOverview({
  lead,
  statusOptions,
  onStatusChange,
  onAssign,
  onPickVehicle,
}: {
  lead: OverviewLead | null | undefined;
  statusOptions: WorkspaceStatusOption[];
  onStatusChange: (status: string) => void;
  onAssign?: (userId: string | null) => Promise<void>;
  onPickVehicle?: (vehicleId: string) => Promise<void>;
}) {
  const { userId: me } = useAuth();
  const owner = assigneeIdOf(lead?.assignedTo);
  const [taking, setTaking] = React.useState(false);
  const statusId = React.useId();
  const vehicle = [lead?.vehicle?.year, lead?.vehicle?.make, lead?.vehicle?.model].filter(Boolean).join(" ");
  const stock = String(lead?.vehicle?.stock || "").trim();

  const assignToMe = async () => {
    if (!me || !onAssign) return;
    setTaking(true);
    try {
      await onAssign(me);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Couldn't save the assignment. Please try again.");
    } finally {
      setTaking(false);
    }
  };

  return (
    <div
      className="mt-3 grid grid-cols-[86px_minmax(0,1fr)] items-center gap-x-2 gap-y-2 rounded-xl border p-3"
      style={{ borderColor: "var(--border-1)", background: "var(--bg-subtle)" }}
      data-testid="lead-overview"
    >
      <label htmlFor={statusId} className={labelClass} style={{ color: "var(--text-tertiary)" }}>
        Status
      </label>
      <WorkspaceStatusSelect
        id={statusId}
        value={lead?.status || "New"}
        options={statusOptions}
        onChange={onStatusChange}
        className="h-8 px-2"
      />

      <span className={`${labelClass} self-start pt-2.5`} style={{ color: "var(--text-tertiary)" }}>
        Assigned to
      </span>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        {onAssign ? (
          <AssigneePicker
            key={`${lead?._id || ""}:${owner || ""}`}
            currentAssignedTo={owner}
            onAssign={onAssign}
            className="h-8 w-full min-w-0"
          />
        ) : (
          <span className="truncate text-xs">{owner ? "Assigned" : "Unassigned"}</span>
        )}
        {me && onAssign && owner !== me ? (
          <button
            type="button"
            onClick={() => void assignToMe()}
            disabled={taking}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-300"
            data-testid="overview-assign-to-me"
          >
            {taking ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
            Assign to me
          </button>
        ) : null}
      </div>

      <span className={labelClass} style={{ color: "var(--text-tertiary)" }}>
        Vehicle
      </span>
      <div className="flex min-w-0 items-start gap-1.5 text-xs" data-testid="overview-vehicle">
        <Car className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
        <span className="min-w-0 flex-1 leading-snug [overflow-wrap:anywhere]">
          {vehicle || "No vehicle yet"}
          {stock ? (
            <span className="ml-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              #{stock}
            </span>
          ) : null}
        </span>
        {onPickVehicle ? (
          <span className="shrink-0 pl-1">
            <VehiclePicker
              key={String(lead?._id || "")}
              currentVehicleId={lead?.vehicleId ? String(lead.vehicleId) : null}
              hasVehicle={Boolean(vehicle || stock)}
              onPick={onPickVehicle}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}
