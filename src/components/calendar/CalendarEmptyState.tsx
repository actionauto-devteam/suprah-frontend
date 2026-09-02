import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Platform-standard empty state: borderless muted icon + title + subtext(+CTA). */
export function CalendarEmptyState({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" aria-hidden />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-xs text-xs font-medium text-muted-foreground">{subtitle}</p>
      {actions && (
        <div className="pointer-events-auto mt-1 flex flex-wrap justify-center gap-2">{actions}</div>
      )}
    </div>
  );
}
