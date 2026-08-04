import * as React from "react";
import {
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";

interface ChannelConfig {
  label: string;
  icon: React.ReactNode;
  className: string;
}

export const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  email: {
    label: "Email",
    icon: <Mail className="h-2.5 w-2.5" />,
    className:
      "bg-sky-500/12 text-sky-800 border-sky-600/30 dark:bg-sky-500/16 dark:text-sky-300 dark:border-sky-400/30",
  },
  sms: {
    label: "SMS",
    icon: <MessageSquare className="h-2.5 w-2.5" />,
    className:
      "bg-emerald-500/12 text-emerald-800 border-emerald-600/30 dark:bg-emerald-500/16 dark:text-emerald-300 dark:border-emerald-400/30",
  },
  adf: {
    label: "ADF",
    icon: <FileText className="h-2.5 w-2.5" />,
    className:
      "bg-orange-500/12 text-orange-800 border-orange-600/30 dark:bg-orange-500/16 dark:text-orange-300 dark:border-orange-400/30",
  },
  phone: {
    label: "Phone",
    icon: <Phone className="h-2.5 w-2.5" />,
    className:
      "bg-violet-500/12 text-violet-800 border-violet-600/30 dark:bg-violet-500/16 dark:text-violet-300 dark:border-violet-400/30",
  },
  web: {
    label: "Web",
    icon: <Globe className="h-2.5 w-2.5" />,
    className:
      "bg-cyan-500/12 text-cyan-800 border-cyan-600/30 dark:bg-cyan-500/16 dark:text-cyan-300 dark:border-cyan-400/30",
  },
};

export const ChannelBadge = React.memo(
  ({ channel }: { channel?: string }) => {
    const config =
      CHANNEL_CONFIG[channel || "email"] || CHANNEL_CONFIG.email;

    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${config.className}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  },
);

ChannelBadge.displayName = "ChannelBadge";