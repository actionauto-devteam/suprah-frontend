"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Headset, Loader2, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { fmtShortDateTimeMDT } from "@/lib/timezone";
import {
  afterSaleError,
  createSupportRequest,
  fetchSupportRequests,
  updateSupportRequest,
  type SupportRequestItem,
  type SupportRequestList,
  type SupportRequestStatus,
} from "@/lib/api/afterSale";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm";

const STATUS_STYLES: Record<SupportRequestStatus, string> = {
  open: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  in_progress: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300",
  waiting_on_customer: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  resolved: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
};

function historyLine(entry: SupportRequestItem["history"][number]): string {
  if (entry.action === "created") return "Created the request";
  if (entry.action === "status") return `Changed the status to ${entry.to ? entry.to.replace(/_/g, " ") : "—"}`;
  if (entry.action === "assigned") return entry.to ? `Assigned it to ${entry.to}` : "Removed the assignee";
  return `Note: ${entry.note}`;
}

function NewRequestForm({ customerId, options, onDone }: { customerId: string; options: SupportRequestList; onDone: () => void }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [error, setError] = React.useState("");
  const mutation = useMutation({
    mutationFn: async () => createSupportRequest(await getToken(), customerId, { type, details: details.trim(), assignedTo: assignedTo || null }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-support", customerId] });
      toast.success("Support request added");
      onDone();
    },
    onError: (err) => setError(afterSaleError(err, "Couldn't add the request. Please try again.")),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!type) return setError("Pick the type of request.");
    if (!details.trim()) return setError("Write what the customer needs.");
    mutation.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-3" aria-label="New support request">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          Type
          <select value={type} onChange={(event) => setType(event.target.value)} className={fieldClass}>
            <option value="">Pick a type</option>
            {options.types.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Assign to
          <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className={fieldClass}>
            <option value="">Nobody yet</option>
            {options.team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium">
        What does the customer need?
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value.slice(0, 2000))}
          rows={3}
          className="w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:text-sm"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className="h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted sm:h-10">
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:h-10"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Add request
        </button>
      </div>
    </form>
  );
}

function RequestRow({ customerId, item, options }: { customerId: string; item: SupportRequestItem; options: SupportRequestList }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = React.useState("");
  const [showHistory, setShowHistory] = React.useState(false);
  const mutation = useMutation({
    mutationFn: async (body: { status?: SupportRequestStatus; assignedTo?: string | null; note?: string }) => updateSupportRequest(await getToken(), customerId, item.id, body),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({ queryKey: ["customer-support", customerId] });
      if (body.note) setNote("");
      toast.success("Support request updated");
    },
    onError: (err) => toast.error(afterSaleError(err, "Couldn't update the request.")),
  });
  return (
    <li className="space-y-2 rounded-lg border p-3" data-testid="support-request">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[item.status])}>{item.statusLabel}</span>
        <span className="text-xs font-medium">{item.typeLabel}</span>
        <span className="text-xs text-muted-foreground">
          Added {fmtShortDateTimeMDT(item.createdAt)} by {item.createdBy?.name || "a team member"}
        </span>
      </div>
      <p className="wrap-break-word whitespace-pre-wrap text-sm">{item.details}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          Status
          <select
            value={item.status}
            disabled={mutation.isPending}
            onChange={(event) => mutation.mutate({ status: event.target.value as SupportRequestStatus })}
            className={fieldClass}
          >
            {options.statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Assigned to
          <select
            value={item.assignedTo || ""}
            disabled={mutation.isPending}
            onChange={(event) => mutation.mutate({ assignedTo: event.target.value || null })}
            className={fieldClass}
          >
            <option value="">Nobody</option>
            {item.assignedTo && !options.team.some((member) => member.id === item.assignedTo) && <option value={item.assignedTo}>{item.assignedName || "Former team member"}</option>}
            {options.team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (note.trim()) mutation.mutate({ note: note.trim() });
        }}
      >
        <input value={note} onChange={(event) => setNote(event.target.value.slice(0, 1000))} placeholder="Add a note" aria-label="Add a note" className={fieldClass} />
        <button type="submit" disabled={!note.trim() || mutation.isPending} className="h-11 shrink-0 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40 sm:h-10">
          Save note
        </button>
      </form>
      <button type="button" onClick={() => setShowHistory((value) => !value)} className="inline-flex min-h-8 items-center text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400" aria-expanded={showHistory}>
        {showHistory ? "Hide history" : `Show history (${item.history.length})`}
      </button>
      {showHistory && (
        <ol className="space-y-1 border-l pl-3">
          {item.history
            .slice()
            .reverse()
            .map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="text-xs">
                <span className="wrap-break-word">{historyLine(entry)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {entry.by?.name || "Team member"} · {fmtShortDateTimeMDT(entry.at)}
                </span>
              </li>
            ))}
        </ol>
      )}
    </li>
  );
}

export function CustomerSupportTab({ customerId }: { customerId: string }) {
  const { getToken } = useAuth();
  const [adding, setAdding] = React.useState(false);
  const query = useQuery({
    queryKey: ["customer-support", customerId],
    queryFn: async () => fetchSupportRequests(await getToken(), customerId),
    staleTime: 15_000,
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading support requests…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="rounded-xl border bg-card p-4 text-center text-sm">
        <p>{afterSaleError(query.error, "Couldn't load the support requests.")}</p>
        <button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }
  const data = query.data;
  const open = data.items.filter((item) => item.status !== "resolved");
  const resolved = data.items.filter((item) => item.status === "resolved");
  return (
    <section className="rounded-xl border bg-card" aria-label="Support requests">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Headset className="h-4 w-4 text-muted-foreground" />
          Support requests ({open.length} open)
        </h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 sm:h-9">
            <Plus className="h-4 w-4" />
            New request
          </button>
        )}
      </div>
      <div className="space-y-3 p-4">
        {adding && <NewRequestForm customerId={customerId} options={data} onDone={() => setAdding(false)} />}
        {open.length ? (
          <ul className="space-y-2">{open.map((item) => <RequestRow key={item.id} customerId={customerId} item={item} options={data} />)}</ul>
        ) : (
          !adding && <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">No open support requests for this customer.</p>
        )}
        {resolved.length > 0 && (
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">Resolved ({resolved.length})</summary>
            <ul className="space-y-2 p-3 pt-0">{resolved.map((item) => <RequestRow key={item.id} customerId={customerId} item={item} options={data} />)}</ul>
          </details>
        )}
      </div>
    </section>
  );
}
