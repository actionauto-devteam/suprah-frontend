"use client";

import type { ReactNode } from "react";

export function SettingNavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-2.5 min-h-11 rounded-lg text-xs sm:text-sm font-medium transition-all ${active
        ? "bg-primary text-white shadow-sm"
        : "text-muted-foreground hover:bg-secondary"
        }`}
    >
      <div
        className={`transition-transform duration-200 shrink-0 ${active ? "scale-110" : ""}`}
      >
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}
