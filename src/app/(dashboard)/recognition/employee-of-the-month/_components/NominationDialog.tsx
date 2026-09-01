"use client";

import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { ini } from "../../../components/DashboardPanel";

interface Candidate {
  _id: string;
  fullName: string;
  avatar?: string;
}

export function NominationDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  authHeaders,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  authHeaders: Record<string, string>;
  onSubmitted: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [nominee, setNominee] = React.useState<Candidate | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setCandidates([]);
      setNominee(null);
      setNote("");
      return;
    }
    const handle = setTimeout(() => {
      apiClient
        .get("/api/employee-of-month/candidates", { headers: authHeaders, params: { teamId, q: query } })
        .then((res) => {
          const data = res.data?.data || res.data;
          setCandidates(data?.users || []);
        })
        .catch(() => setCandidates([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [open, query, teamId, authHeaders]);

  const submit = async () => {
    if (!nominee || submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post(
        "/api/employee-of-month/nominations",
        { teamId, nomineeId: nominee._id, note: note.trim() || undefined },
        { headers: authHeaders },
      );
      toast.success(`Nominated ${nominee.fullName}`);
      onSubmitted();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not submit nomination");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0" showCloseButton={false}>
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <DialogTitle className="text-sm">Nominate for {teamName}</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="-mr-1 shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </div>

        {nominee ? (
          <div className="space-y-3 p-4 pt-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/40 p-2.5">
              <Avatar className="size-8">
                <AvatarImage src={resolveImageUrl(nominee.avatar)} />
                <AvatarFallback className="text-[10px]">{ini(nominee.fullName)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm font-bold">{nominee.fullName}</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setNominee(null)}>
                Change
              </Button>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Why are they a great pick? (optional)"
              rows={3}
            />
            <Button className="w-full" disabled={submitting} onClick={submit}>
              Submit nomination
            </Button>
          </div>
        ) : (
          <div className="border-t border-border/30">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search employee by name…" value={query} onValueChange={setQuery} />
              <CommandList>
                {candidates.length === 0 && <CommandEmpty>No employees found on {teamName}.</CommandEmpty>}
                <CommandGroup>
                  {candidates.map((c) => (
                    <CommandItem key={c._id} value={c._id} onSelect={() => setNominee(c)} className="gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={resolveImageUrl(c.avatar)} />
                        <AvatarFallback className="text-[10px]">{ini(c.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{c.fullName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
