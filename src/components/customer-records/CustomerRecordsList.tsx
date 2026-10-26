"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Contact, RefreshCw, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import {
  customerRecordErrorStatus,
  fetchCustomerRecords,
  type CustomerRecordListItem,
  type CustomerRecordSort,
  type CustomerRecordStatus,
} from "@/lib/api/customerRecords";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: CustomerRecordStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

const SORT_OPTIONS: Array<{ value: CustomerRecordSort; label: string }> = [
  { value: "recent", label: "Recent activity" },
  { value: "name", label: "Name A–Z" },
  { value: "newest", label: "Newest record" },
];

const SOURCE_LABELS: Record<string, string> = {
  lead: "From a lead",
  manual: "Added by staff",
  import: "Imported",
  booking: "From a booking",
};

const GRID = "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_7.5rem_7rem_8.5rem_1rem]";

const fullName = (customer: { firstName: string; lastName: string }) =>
  [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Unnamed customer";

const initials = (customer: { firstName: string; lastName: string }) =>
  [customer.firstName, customer.lastName].map((part) => part?.trim()?.[0] || "").join("").toUpperCase() || "?";

export const relativeTime = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatDistanceToNow(date, { addSuffix: true }) : "";
};

export const displayPhone = (phone: string) => (phone ? formatSmsRecipient(phone) || phone : "");

export const CUSTOMER_LIST_FLAG = "customer-records:from-list";

const rememberListOrigin = () => {
  try {
    window.sessionStorage.setItem(CUSTOMER_LIST_FLAG, "1");
  } catch {}
};

const readStatus = (value: string | null): CustomerRecordStatus =>
  value === "inactive" || value === "all" ? value : "active";
const readSort = (value: string | null): CustomerRecordSort => (value === "name" || value === "newest" ? value : "recent");
const readPage = (value: string | null) => {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

function CustomerRow({ customer }: { customer: CustomerRecordListItem }) {
  const place = [customer.city, customer.state].filter(Boolean).join(", ");
  const phone = displayPhone(customer.phone);
  const activity = relativeTime(customer.lastActivity);
  return (
    <li>
      <Link
        href={`/crm/customers/${customer.id}`}
        onClick={rememberListOrigin}
        className={cn(
          "grid gap-x-4 gap-y-2 rounded-xl border bg-card p-3 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:items-center md:px-4",
          GRID,
        )}
        data-customer-id={customer.id}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            {initials(customer)}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-medium">{fullName(customer)}</p>
              {!customer.isActive && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{place || SOURCE_LABELS[customer.source] || "Customer"}</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground md:hidden" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5 text-xs text-muted-foreground max-md:pl-12">
          {customer.email && <p className="truncate">{customer.email}</p>}
          {phone && <p className="truncate">{phone}</p>}
          {!customer.email && !phone && <p className="italic">No contact on file</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs max-md:pl-12 md:contents">
          <p className="md:text-sm">
            <span className="font-medium">{customer.leads.total}</span>{" "}
            <span className="text-muted-foreground">{customer.leads.total === 1 ? "lead" : "leads"}</span>
            {customer.leads.total > 0 && (
              <span className="block text-[11px] text-muted-foreground max-md:inline max-md:before:content-['·_'] max-md:before:mx-1">
                {customer.leads.open} open
              </span>
            )}
          </p>
          <p className="text-muted-foreground md:text-sm">
            {customer.vehiclesOfInterest > 0 ? (
              <>
                <span className="font-medium text-foreground">{customer.vehiclesOfInterest}</span> asked about
              </>
            ) : (
              <span className="md:text-xs">No vehicles</span>
            )}
          </p>
          <p className="text-muted-foreground md:text-xs">{activity ? `Active ${activity}` : "No activity yet"}</p>
        </div>
        <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden="true" />
      </Link>
    </li>
  );
}

export function CustomerRecordsList() {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("q") || "";
  const status = readStatus(searchParams.get("status"));
  const sort = readSort(searchParams.get("sort"));
  const page = readPage(searchParams.get("page"));
  const [input, setInput] = React.useState(urlSearch);

  const updateParams = React.useCallback(
    (changes: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || (key === "page" && value === 1) || (key === "status" && value === "active") || (key === "sort" && value === "recent")) next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    setInput(urlSearch);
  }, [urlSearch]);

  React.useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === urlSearch) return;
    const timer = window.setTimeout(() => updateParams({ q: trimmed || null, page: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [input, urlSearch, updateParams]);

  const query = useQuery({
    queryKey: ["customer-records", urlSearch, status, sort, page],
    queryFn: async () => fetchCustomerRecords(await getToken(), { search: urlSearch, status, sort, page }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: (count, error) => customerRecordErrorStatus(error) !== 403 && count < 2,
  });

  const data = query.data;
  const customers = data?.customers || [];
  const errorStatus = customerRecordErrorStatus(query.error);
  const firstItem = data && data.total ? (data.page - 1) * data.limit + 1 : 0;
  const lastItem = data ? Math.min(data.total, data.page * data.limit) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Contact className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Customer Records
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers and the leads connected to them by a matching email or phone number.
          </p>
        </div>
        {data && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {data.total.toLocaleString()} {data.total === 1 ? "customer" : "customers"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            enterKeyHint="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search name, email, or phone"
            aria-label="Search customers"
            className="h-11 w-full rounded-lg border bg-background pl-9 pr-9 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 rounded-lg border bg-card p-0.5" role="group" aria-label="Customer status">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={status === option.value}
                onClick={() => updateParams({ status: option.value, page: 1 })}
                className={cn(
                  "h-9 rounded-md px-3 text-xs font-medium transition sm:h-8",
                  status === option.value ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value, page: 1 })}
            aria-label="Sort customers"
            className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm sm:h-10 sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={cn("hidden px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid md:gap-x-4", GRID)} aria-hidden="true">
        <span>Customer</span>
        <span>Contact</span>
        <span>Leads</span>
        <span>Vehicles</span>
        <span>Last activity</span>
        <span />
      </div>

      {query.isLoading ? (
        <ul className="space-y-2" aria-label="Loading customers">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">
            {errorStatus === 403 ? "You don't have access to Customer Records." : "Couldn't load customer records."}
          </p>
          {errorStatus !== 403 && (
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-sm font-medium">
            {urlSearch
              ? `No customers match "${urlSearch}".`
              : status === "inactive"
                ? "No inactive customers."
                : "No customer records yet."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {urlSearch
              ? "Check the spelling, or search by the full email or phone number."
              : "Customers appear here when a lead's email or phone can be matched, or when staff add one."}
          </p>
          {urlSearch && (
            <button
              type="button"
              onClick={() => setInput("")}
              className="mt-3 inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <ul className={cn("space-y-2 transition-opacity", query.isFetching && "opacity-70")} aria-label="Customers">
          {customers.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} />
          ))}
        </ul>
      )}

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {firstItem.toLocaleString()}–{lastItem.toLocaleString()} of {data.total.toLocaleString()}
          </span>
          {data.pages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateParams({ page: page - 1 })}
                disabled={page <= 1}
                aria-label="Previous page"
                className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[5.5rem] text-center">
                Page {data.page} of {data.pages}
              </span>
              <button
                type="button"
                onClick={() => updateParams({ page: page + 1 })}
                disabled={page >= data.pages}
                aria-label="Next page"
                className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
