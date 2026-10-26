"use client";

import Link from "next/link";
import { ChevronRight, Contact } from "lucide-react";

interface CustomerRecordLinkProps {
  lead: { customerId?: string | null; customerLink?: { status?: string | null } | null } | null | undefined;
}

export function CustomerRecordLink({ lead }: CustomerRecordLinkProps) {
  const customerId = lead?.customerId ? String(lead.customerId) : "";
  if (!customerId || lead?.customerLink?.status !== "linked") return null;
  return (
    <Link
      href={`/crm/customers/${customerId}`}
      className="flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-(--input-bg)"
      style={{ borderColor: "var(--border-1)", color: "var(--text-primary)" }}
      data-testid="customer-record-link"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Contact className="h-4 w-4 shrink-0" style={{ color: "var(--accent-text)" }} />
        <span className="truncate">Customer record</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5" style={{ color: "var(--accent-text)" }}>
        View
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
