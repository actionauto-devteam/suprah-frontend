"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchLeads } from "@/lib/api/leadIntake";

export interface PickedLead {
  _id: string;
  name: string;
  status: string;
  phone?: string;
  email?: string;
  unverified?: boolean;
}

export function LeadSearchPicker({
  value,
  onChange,
  excludeIds = [],
}: {
  value: PickedLead | null;
  onChange: (lead: PickedLead | null) => void;
  excludeIds?: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PickedLead[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchLeads(term)
        .then((found) => {
          if (!cancelled) setResults(found.filter((lead) => !excludeIds.includes(lead._id)));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, excludeIds]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search leads by name, phone or email"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[13px] outline-none focus:border-emerald-400 dark:border-emerald-400/20 dark:bg-[#0a1410]"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      {results.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-emerald-400/15">
          {results.map((lead) => (
            <li key={lead._id}>
              <button
                type="button"
                onClick={() => onChange(lead)}
                disabled={lead.unverified}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-[12px] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-400/5",
                  value?._id === lead._id && "bg-emerald-50 dark:bg-emerald-400/10",
                )}
              >
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {lead.name} · {lead.status}
                  {lead.unverified ? " · unverified chat" : ""}
                </span>
                <span className="text-[11px] text-slate-400">{[lead.phone, lead.email].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
