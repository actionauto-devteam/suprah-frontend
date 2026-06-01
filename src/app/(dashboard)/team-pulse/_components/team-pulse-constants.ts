import type { OnlineStatus, AbsenceType, NoteColor, AnnouncementType } from "@/hooks/useTeamPulse";
import { Bell, AlertTriangle, Clock, CalendarDays, MessageCircle } from "lucide-react";

export const S = {
  dot: {
    online: "bg-green-500",
    idle: "bg-amber-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    do_not_disturb: "bg-purple-500",
    offline: "bg-gray-400",
  } as Record<OnlineStatus, string>,
  label: {
    online: "Online",
    idle: "Idle",
    away: "Away",
    busy: "Busy",
    do_not_disturb: "DND",
    offline: "Offline",
  } as Record<OnlineStatus, string>,
  ring: {
    online: "ring-green-500/40",
    idle: "ring-amber-500/40",
    away: "ring-yellow-500/40",
    busy: "ring-red-500/40",
    do_not_disturb: "ring-purple-500/40",
    offline: "ring-border/20",
  } as Record<OnlineStatus, string>,
  badge: {
    online:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40",
    idle: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
    away: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40",
    busy: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40",
    do_not_disturb:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40",
    offline: "bg-muted/60 text-muted-foreground border-border/30",
  } as Record<OnlineStatus, string>,
  borderL: {
    online: "border-l-green-500",
    idle: "border-l-amber-500",
    away: "border-l-yellow-500",
    busy: "border-l-red-500",
    do_not_disturb: "border-l-purple-500",
    offline: "border-l-border/40",
  } as Record<OnlineStatus, string>,
};

export const ROLE_STYLE: Record<string, string> = {
  super_admin:
    "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  admin: "bg-primary/10 text-primary border-primary/20",
  employee: "bg-muted/60 text-muted-foreground border-border/30",
};

export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  employee: "Employee",
};

export const A: Record<
  AbsenceType,
  { label: string; dot: string; pill: string; card: string }
> = {
  absence: {
    label: "Absent",
    dot: "bg-red-400",
    pill: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    card: "bg-red-50/80 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30",
  },
  day_off: {
    label: "Day Off",
    dot: "bg-blue-400",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    card: "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30",
  },
  vacation: {
    label: "Vacation",
    dot: "bg-purple-400",
    pill: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
    card: "bg-purple-50/80 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/30",
  },
  sick: {
    label: "Sick",
    dot: "bg-orange-400",
    pill: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    card: "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30",
  },
  other: {
    label: "Other",
    dot: "bg-gray-400",
    pill: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400",
    card: "bg-gray-50/80 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-700/30",
  },
};

export const ANNOUNCE_CONFIG: Record<
  AnnouncementType,
  {
    label: string;
    icon: React.ComponentType<any>;
    badge: string;
    border: string;
  }
> = {
  general: {
    label: "General",
    icon: MessageCircle,
    badge: "bg-muted/60 text-muted-foreground border-border/30",
    border: "",
  },
  important: {
    label: "Important",
    icon: Bell,
    badge:
      "bg-amber-100 text-amber-700 border-amber-300/50 dark:bg-amber-950/50 dark:text-amber-400",
    border: "ring-1 ring-amber-400/30",
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    badge:
      "bg-red-100 text-red-700 border-red-300/50 dark:bg-red-950/50 dark:text-red-400",
    border: "ring-2 ring-red-400/40",
  },
  reminder: {
    label: "Reminder",
    icon: Clock,
    badge:
      "bg-violet-100 text-violet-700 border-violet-300/50 dark:bg-violet-950/50 dark:text-violet-400",
    border: "ring-1 ring-violet-400/30",
  },
  event: {
    label: "Event",
    icon: CalendarDays,
    badge:
      "bg-emerald-100 text-emerald-700 border-emerald-300/50 dark:bg-emerald-950/50 dark:text-emerald-400",
    border: "ring-1 ring-emerald-400/30",
  },
};

export const N: Record<
  NoteColor,
  { bg: string; top: string; pin: string; hex: string }
> = {
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200/80 dark:border-yellow-700/40",
    top: "bg-yellow-100 dark:bg-yellow-900/70",
    pin: "bg-yellow-400",
    hex: "#facc15",
  },
  blue: {
    bg: "bg-sky-50 dark:bg-sky-950/60 border-sky-200/80 dark:border-sky-700/40",
    top: "bg-sky-100 dark:bg-sky-900/70",
    pin: "bg-sky-400",
    hex: "#38bdf8",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-700/40",
    top: "bg-emerald-100 dark:bg-emerald-900/70",
    pin: "bg-emerald-400",
    hex: "#34d399",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/60 border-pink-200/80 dark:border-pink-700/40",
    top: "bg-pink-100 dark:bg-pink-900/70",
    pin: "bg-pink-400",
    hex: "#f472b6",
  },
  purple: {
    bg: "bg-violet-50 dark:bg-violet-950/60 border-violet-200/80 dark:border-violet-700/40",
    top: "bg-violet-100 dark:bg-violet-900/70",
    pin: "bg-violet-400",
    hex: "#a78bfa",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/60 border-orange-200/80 dark:border-orange-700/40",
    top: "bg-orange-100 dark:bg-orange-900/70",
    pin: "bg-orange-400",
    hex: "#fb923c",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/60 border-red-200/80 dark:border-red-700/40",
    top: "bg-red-100 dark:bg-red-900/70",
    pin: "bg-red-400",
    hex: "#f87171",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/60 border-teal-200/80 dark:border-teal-700/40",
    top: "bg-teal-100 dark:bg-teal-900/70",
    pin: "bg-teal-400",
    hex: "#2dd4bf",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-700/40",
    top: "bg-indigo-100 dark:bg-indigo-900/70",
    pin: "bg-indigo-400",
    hex: "#818cf8",
  },
  lime: {
    bg: "bg-lime-50 dark:bg-lime-950/60 border-lime-200/80 dark:border-lime-700/40",
    top: "bg-lime-100 dark:bg-lime-900/70",
    pin: "bg-lime-400",
    hex: "#a3e635",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-700/40",
    top: "bg-rose-100 dark:bg-rose-900/70",
    pin: "bg-rose-400",
    hex: "#fb7185",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/60 border-sky-200/80 dark:border-sky-700/40",
    top: "bg-sky-100 dark:bg-sky-900/70",
    pin: "bg-sky-400",
    hex: "#38bdf8",
  },
};

export const SKEWS = [
  "-rotate-[1.1deg]",
  "rotate-[0.8deg]",
  "-rotate-[0.4deg]",
  "rotate-[1.3deg]",
  "-rotate-[0.6deg]",
  "rotate-[0.3deg]",
];
