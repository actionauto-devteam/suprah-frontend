import * as React from "react";
import { LEAD_STATUS_CONFIG, getLeadStatusStyle } from "@/lib/leadStatus";

export const STATUS_CONFIG = LEAD_STATUS_CONFIG;

export const StatusPill = React.memo(
  ({ status }: { status: string }) => {
    const config = getLeadStatusStyle(status);

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${config.bg} ${config.text} ${config.border}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  },
);

StatusPill.displayName = "StatusPill";
