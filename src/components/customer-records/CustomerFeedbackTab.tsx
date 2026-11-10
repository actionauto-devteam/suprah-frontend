"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RefreshCw, Star } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { fmtShortDateTimeMDT } from "@/lib/timezone";
import { afterSaleError, fetchCustomerFeedback, type CustomerFeedbackItem } from "@/lib/api/afterSale";
import { cn } from "@/lib/utils";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} className={cn("h-4 w-4", index <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600")} />
      ))}
    </span>
  );
}

function FeedbackRow({ item }: { item: CustomerFeedbackItem }) {
  const sentBy = item.channel === "email" ? "email" : "text";
  return (
    <li className="space-y-1.5 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {item.status === "answered" && item.rating ? (
          <Stars value={item.rating} />
        ) : (
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{item.expired ? "No answer, link expired" : "Waiting for an answer"}</span>
        )}
        {item.lowRating && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Low rating, task created
          </span>
        )}
      </div>
      {item.comment ? <p className="wrap-break-word whitespace-pre-wrap text-sm">{item.comment}</p> : item.status === "answered" ? <p className="text-xs italic text-muted-foreground">No comment</p> : null}
      <p className="text-xs text-muted-foreground">
        Asked by {sentBy} {fmtShortDateTimeMDT(item.requestedAt)}
        {item.answeredAt ? ` · Answered ${fmtShortDateTimeMDT(item.answeredAt)}` : ""}
        {item.source === "automation" ? " · From an automation" : " · After an appointment"}
      </p>
      {item.leadId && (
        <Link href={`/crm/leads?leadId=${item.leadId}`} className="inline-flex min-h-8 items-center text-xs text-emerald-700 hover:underline dark:text-emerald-400">
          Open the lead
        </Link>
      )}
    </li>
  );
}

export function CustomerFeedbackTab({ customerId }: { customerId: string }) {
  const { getToken } = useAuth();
  const query = useQuery({
    queryKey: ["customer-feedback", customerId],
    queryFn: async () => fetchCustomerFeedback(await getToken(), customerId),
    staleTime: 15_000,
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading feedback…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div role="alert" className="rounded-xl border bg-card p-4 text-center text-sm">
        <p>{afterSaleError(query.error, "Couldn't load the feedback.")}</p>
        <button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  const data = query.data;
  return (
    <section className="rounded-xl border bg-card" aria-label="Customer feedback">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Star className="h-4 w-4 text-muted-foreground" />
          Feedback
        </h2>
        <p className="text-xs text-muted-foreground" data-testid="feedback-summary">
          {data.average !== null ? `Average ${data.average} of 5 from ${data.answered} ${data.answered === 1 ? "answer" : "answers"}` : "No ratings yet"}
          {` · ${data.requested} ${data.requested === 1 ? "request" : "requests"} sent`}
        </p>
      </div>
      <div className="space-y-2 p-4">
        {data.items.length ? (
          <ul className="space-y-2">{data.items.map((item) => <FeedbackRow key={item.id} item={item} />)}</ul>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            No feedback yet. Review invitations sent after an appointment or by an automation ask the customer to rate their visit, and the answers show here.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          A rating of 1 or 2 stars creates a task for managers. Every customer sees the public review link, whatever they rate.
        </p>
      </div>
    </section>
  );
}
