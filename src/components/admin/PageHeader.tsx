import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ADMIN_EYEBROW_CLASS, ADMIN_HEADER_PANEL_CLASS } from "./theme";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  accent?: string;
  description?: string;
  breadcrumbs?: Crumb[];
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  breadcrumbs,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <ChevronRight className="size-3 opacity-50" />}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          {eyebrow && !breadcrumbs && (
            <span className={ADMIN_EYEBROW_CLASS}>{eyebrow}</span>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
            {accent && <span className="text-muted-foreground"> {accent}</span>}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
          {meta && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">{meta}</div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function PageHeaderPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}

export function LegacyPageHeaderPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ADMIN_HEADER_PANEL_CLASS, className)}>{children}</div>;
}
