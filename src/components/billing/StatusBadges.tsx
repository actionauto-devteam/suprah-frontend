"use client";

/**
 * Kept for backwards-compatible imports across the billing screens.
 * Everything now resolves to the single shared design kit in ./ui so badges
 * and stat cards are identical everywhere (no more per-file colour drift).
 */

export { StatusBadge, PayoutStatusBadge, StatCard } from "@/components/billing/ui";