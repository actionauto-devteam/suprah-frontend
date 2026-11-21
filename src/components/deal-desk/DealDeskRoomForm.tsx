"use client";

import * as React from "react";
import { Eye, EyeOff, Handshake, KeyRound, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DealDeskRoomValues { title: string; description: string; password: string; }

const PASSWORD_MIN = 4;

/**
 * Title / description / password fields for a Deal Desk room.
 * create: password required.  edit: blank password keeps the current one.
 */
export function DealDeskRoomForm({ mode, initial, busy, error, onSubmit }: {
  mode: "create" | "edit";
  initial?: Partial<DealDeskRoomValues>;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: DealDeskRoomValues) => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (title.trim().length < 3) return setLocalError("Give the room a clear title (at least 3 characters).");
    const changingPassword = mode === "create" || password.length > 0;
    if (changingPassword) {
      if (password.trim().length < PASSWORD_MIN) return setLocalError(`The password must be at least ${PASSWORD_MIN} characters.`);
      if (password !== confirm) return setLocalError("The two passwords don't match.");
    }
    onSubmit({ title: title.trim(), description: description.trim(), password: changingPassword ? password : "" });
  };

  const shown = localError ?? error ?? null;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="dd-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Room title <span className="text-muted-foreground/70">— customers pick a room by this</span>
        </label>
        <Input id="dd-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
          placeholder="e.g. Trade-in appraisal with Marco" className="h-10" autoFocus />
      </div>
      <div>
        <label htmlFor="dd-desc" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Short description <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <textarea id="dd-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} rows={2}
          placeholder="What customers can get help with in this room"
          className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:border-emerald-500/60 focus:outline-none" />
      </div>
      <div className="rounded-xl border bg-muted/30 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <KeyRound className="size-3.5" />
          {mode === "create" ? "Room password" : "Change password"}
          {mode === "edit" && <span className="font-normal text-muted-foreground/70">— leave blank to keep the current one</span>}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "create" ? "Password" : "New password"} autoComplete="new-password"
              aria-label="Room password" className="h-10 pr-9" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password" autoComplete="new-password" aria-label="Confirm room password"
            className={cn("h-10", confirm && confirm !== password && "border-destructive/60")} />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Share this password with your customer directly. It is stored encrypted, never shown on the public Deal Desk page,
          and each room has its own.
        </p>
      </div>
      {shown && <p className="text-sm text-destructive">{shown}</p>}
      <Button type="submit" disabled={busy}
        className="h-11 w-full gap-2 bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500">
        {mode === "create" ? <><Plus className="size-4" /><Handshake className="size-4" /> Create Deal Desk room</> : <><Pencil className="size-4" /> Save room</>}
      </Button>
    </form>
  );
}
