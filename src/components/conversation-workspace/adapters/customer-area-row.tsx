import { MapPinned } from "lucide-react";
import { CUSTOMER_AREA_UNKNOWN_TEXT, customerAreaHint, customerAreaLabel } from "@/lib/customerArea";
import type { WorkspaceDetailRow } from "../workspace-types";

export function customerAreaDetailRow(area: unknown): WorkspaceDetailRow {
  const label = customerAreaLabel(area);

  return {
    id: "customer-area",
    label: "Customer area",
    icon: <MapPinned size={15} />,
    value: label ? (
      <span data-testid="lead-customer-area-detail">
        <span className="block font-medium">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
          {customerAreaHint(area)}
        </span>
      </span>
    ) : (
      CUSTOMER_AREA_UNKNOWN_TEXT
    ),
  };
}
