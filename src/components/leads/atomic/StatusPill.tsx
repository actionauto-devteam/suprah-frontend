import * as React from "react";
import {
  Calendar,
  Clock3,
  Mail,
  Phone,
  PhoneIncoming,
  XCircle,
} from "lucide-react";

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  icon: React.ReactNode;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  New: {
    bg: "bg-emerald-500/12 dark:bg-emerald-500/16",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-600/30 dark:border-emerald-400/30",
    dot: "bg-emerald-600 dark:bg-emerald-400",
    label: "New",
    icon: <Mail className="h-3 w-3" />,
  },
  Pending: {
    bg: "bg-amber-500/12 dark:bg-amber-500/16",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-600/30 dark:border-amber-400/30",
    dot: "bg-amber-600 dark:bg-amber-400",
    label: "Pending",
    icon: <Clock3 className="h-3 w-3" />,
  },
  Contacted: {
    bg: "bg-sky-500/12 dark:bg-sky-500/16",
    text: "text-sky-800 dark:text-sky-300",
    border: "border-sky-600/30 dark:border-sky-400/30",
    dot: "bg-sky-600 dark:bg-sky-400",
    label: "Contacted",
    icon: <Phone className="h-3 w-3" />,
  },
  "Appointment Set": {
    bg: "bg-violet-500/12 dark:bg-violet-500/16",
    text: "text-violet-800 dark:text-violet-300",
    border: "border-violet-600/30 dark:border-violet-400/30",
    dot: "bg-violet-600 dark:bg-violet-400",
    label: "Appt. Set",
    icon: <Calendar className="h-3 w-3" />,
  },
  Closed: {
    bg: "bg-slate-500/10 dark:bg-slate-400/12",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/25 dark:border-slate-400/25",
    dot: "bg-slate-600 dark:bg-slate-400",
    label: "Closed",
    icon: <XCircle className="h-3 w-3" />,
  },
  "Inbound Calls": {
    bg: "bg-teal-500/12 dark:bg-teal-500/16",
    text: "text-teal-800 dark:text-teal-300",
    border: "border-teal-600/30 dark:border-teal-400/30",
    dot: "bg-teal-600 dark:bg-teal-400",
    label: "Inbound",
    icon: <PhoneIncoming className="h-3 w-3" />,
  },
};

export const StatusPill = React.memo(
  ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;

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