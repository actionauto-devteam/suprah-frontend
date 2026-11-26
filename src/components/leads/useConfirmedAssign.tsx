"use client";

import * as React from "react";
import { Loader2, UserRound, X } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamPulse";
import { useAuth } from "@/providers/AuthProvider";

type PendingAssign = {
  userId: string | null;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export function assigneeIdOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object") {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : null;
  }
  return String(value);
}

export function useConfirmedAssign(
  assignedTo: unknown,
  onAssign: (userId: string | null) => Promise<void>,
) {
  const { userId: me } = useAuth();
  const { data: team = [] } = useTeamMembers();
  const owner = assigneeIdOf(assignedTo);
  const [pending, setPending] = React.useState<PendingAssign | null>(null);
  const [saving, setSaving] = React.useState(false);

  const nameOf = React.useCallback(
    (id: string | null) => {
      if (!id) return "";
      if (id === me) return "you";
      return team.find((member) => member._id === id)?.name || "another teammate";
    },
    [me, team],
  );

  const assign = React.useCallback(
    async (userId: string | null) => {
      const target = userId || null;
      if (target === owner) return;
      if (!owner || owner === me) {
        await onAssign(target);
        return;
      }
      await new Promise<void>((resolve, reject) => setPending({ userId: target, resolve, reject }));
    },
    [owner, me, onAssign],
  );

  const cancel = () => {
    if (saving || !pending) return;
    pending.resolve();
    setPending(null);
  };

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onAssign(pending.userId);
      pending.resolve();
    } catch (error) {
      pending.reject(error);
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const ownerName = nameOf(owner);
  const target = pending?.userId ?? null;
  const takingIt = Boolean(target && target === me);
  const title = takingIt ? "Take this lead?" : target ? "Move this lead?" : "Remove the assignment?";
  const question = takingIt
    ? `This lead is assigned to ${ownerName}. It will move to you.`
    : target
      ? `This lead is assigned to ${ownerName}. It will move to ${nameOf(target)}.`
      : `This lead is assigned to ${ownerName}. It will have no one assigned.`;
  const confirmLabel = takingIt ? "Take this lead" : target ? "Move lead" : "Unassign";

  const dialog = pending ? (
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="assign-confirm-title"
        className="w-full max-w-sm rounded-xl border p-5"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border-2)", boxShadow: "var(--shadow-lg)" }}
        data-testid="assign-confirm"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <UserRound className="h-4 w-4" />
            </span>
            <h3 id="assign-confirm-title" className="text-base font-semibold">{title}</h3>
          </div>
          <button type="button" onClick={cancel} disabled={saving} className="ss4-icon-btn h-8 w-8" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{question}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={cancel} disabled={saving} className="ss4-pill-btn h-9 px-4 text-sm font-medium">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            data-testid="assign-confirm-yes"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { assign, dialog, me: me || null, isMine: Boolean(me && owner === me) };
}
