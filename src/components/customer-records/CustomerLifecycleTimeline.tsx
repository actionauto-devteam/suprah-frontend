"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CalendarDays, Info, Loader2, MessageSquarePlus, RefreshCw, RotateCcw, Tag, UserCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { fmtFullDateTimeMDT } from "@/lib/timezone";
import {
  fetchCustomerTimeline,
  type CustomerTimelineEvent,
  type CustomerTimelineFilter,
  type CustomerTimelinePage,
} from "@/lib/api/customerRecords";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ value: CustomerTimelineFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "inquiry", label: "Inquiries" },
  { value: "appointment", label: "Appointments" },
  { value: "status", label: "Status changes" },
  { value: "assignment", label: "Assignments" },
];

const CATEGORY_STYLE: Record<CustomerTimelineEvent["category"], { icon: React.ReactNode; tone: string }> = {
  record: { icon: <UserPlus className="h-3.5 w-3.5" />, tone: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  inquiry: { icon: <MessageSquarePlus className="h-3.5 w-3.5" />, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  appointment: { icon: <CalendarDays className="h-3.5 w-3.5" />, tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  status: { icon: <Tag className="h-3.5 w-3.5" />, tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  assignment: { icon: <UserCheck className="h-3.5 w-3.5" />, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
};

function TimelineItem({ event }: { event: CustomerTimelineEvent }) {
  const style = event.type === "returning_inquiry"
    ? { icon: <RotateCcw className="h-3.5 w-3.5" />, tone: "bg-emerald-600 text-white dark:bg-emerald-500" }
    : CATEGORY_STYLE[event.category];
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0" data-event-type={event.type}>
      <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
      <span className={cn("relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", style.tone)}>{style.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <p className="wrap-break-word text-sm font-medium">{event.title}</p>
          <time dateTime={event.at} className="shrink-0 text-[11px] text-muted-foreground">
            {fmtFullDateTimeMDT(event.at)}
          </time>
        </div>
        {event.detail && <p className="wrap-break-word text-xs text-muted-foreground">{event.detail}</p>}
        {event.type === "returning_inquiry" && event.meta.previousClosedAt && (
          <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
            Came back after an earlier lead was closed ({event.meta.previousStatus}) on {fmtFullDateTimeMDT(event.meta.previousClosedAt)}.
          </p>
        )}
        {event.meta.notPurchase && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
            <Info className="h-3 w-3" />
            Lead status only — not a verified purchase
          </p>
        )}
        {event.category === "appointment" && event.meta.startTime && event.type.endsWith("scheduled") && (
          <p className="text-[11px] text-muted-foreground">For {fmtFullDateTimeMDT(event.meta.startTime)}</p>
        )}
        {event.leadId && (
          <Link href={`/crm/leads?leadId=${event.leadId}`} className="mt-0.5 inline-flex min-h-8 items-center text-xs text-emerald-700 hover:underline dark:text-emerald-400">
            Open lead
          </Link>
        )}
      </div>
    </li>
  );
}

export function CustomerLifecycleTimeline({ customerId }: { customerId: string }) {
  const { getToken } = useAuth();
  const [filter, setFilter] = React.useState<CustomerTimelineFilter>("all");
  const query = useInfiniteQuery<CustomerTimelinePage>({
    queryKey: ["customer-record-timeline", customerId, filter],
    queryFn: async ({ pageParam }) => fetchCustomerTimeline(await getToken(), customerId, { filter, before: (pageParam as string | null) ?? null, limit: 25 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const pages = query.data?.pages ?? [];
  const counts = pages[0]?.counts;
  const events = pages.flatMap((page) => page.items);

  return (
    <section className="rounded-xl border bg-card" aria-labelledby="customer-timeline-heading">
      <div className="flex flex-col gap-2 border-b px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="customer-timeline-heading" className="text-sm font-semibold">Customer lifecycle</h2>
          <p className="text-[11px] text-muted-foreground">Newest first · Mountain Time (dealership time)</p>
        </div>
        <div role="group" aria-label="Filter timeline" className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition",
                filter === option.value ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background hover:bg-muted",
              )}
            >
              {option.label}
              {counts && <span className={cn("tabular-nums", filter === option.value ? "text-white/80" : "text-muted-foreground")}>{counts[option.value]}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Loading timeline">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading timeline…
          </div>
        ) : query.isError ? (
          <div role="alert" className="text-center">
            <p className="text-sm">Couldn&apos;t load the timeline.</p>
            <button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : events.length ? (
          <>
            <ol aria-label="Customer timeline">
              {events.map((event) => (
                <TimelineItem key={event.id} event={event} />
              ))}
            </ol>
            {query.hasNextPage && (
              <button
                type="button"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                {query.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                Show older events
              </button>
            )}
            {pages[0]?.truncated && (
              <p className="mt-3 text-[11px] text-muted-foreground">This customer has a very long history; the oldest records may not all be listed here.</p>
            )}
          </>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            {filter === "all" ? "No recorded events for this customer yet." : "No events of this type."}
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Built from this customer&apos;s linked leads, inquiries and appointments. Purchases, owned vehicles and service visits aren&apos;t linked to Customer Records yet.
        </p>
      </div>
    </section>
  );
}
