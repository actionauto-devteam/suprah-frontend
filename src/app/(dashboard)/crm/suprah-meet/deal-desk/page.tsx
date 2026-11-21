"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, BellRing, Check, ChevronDown, Copy, DoorOpen, ExternalLink, Globe, Handshake, Hourglass,
  Pencil, Plus, Power, RotateCcw, Trash2, UserCheck, Users, Video, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";
import { DealDeskRoomForm, type DealDeskRoomValues } from "@/components/suprah-meet/DealDeskRoomForm";
import { ROOM_STATE_META, minutesWaited, type HostDealDeskRoom } from "@/lib/meet-deal-desk";

const POLL_MS = 3000;

const apiErrorMessage = (error: unknown, fallback: string) => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
};

export default function DealDeskManagementPage() {
  return (
    <React.Suspense fallback={null}>
      <DealDeskManager />
    </React.Suspense>
  );
}

function DealDeskManager() {
  const router = useRouter();
  const params = useSearchParams();
  const createdCode = params.get("created");

  const [rooms, setRooms] = React.useState<HostDealDeskRoom[]>([]);
  const [ended, setEnded] = React.useState<HostDealDeskRoom[]>([]);
  const [publicUrl, setPublicUrl] = React.useState("");
  const [canViewAll, setCanViewAll] = React.useState(false);
  const [selfId, setSelfId] = React.useState("");
  const [scope, setScope] = React.useState<"mine" | "all">("mine");
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<HostDealDeskRoom | null>(null);
  const [closeTarget, setCloseTarget] = React.useState<HostDealDeskRoom | null>(null);
  const [formBusy, setFormBusy] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [endedOpen, setEndedOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [soundOn, setSoundOn] = React.useState(true);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => { const t = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(t); }, []);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);
  React.useEffect(() => {
    try { setSoundOn(localStorage.getItem("suprah-meet:dd-sound") !== "off"); } catch { /* ignore */ }
  }, []);

  // New-arrival detection across polls.
  const seenQueue = React.useRef<Set<string> | null>(null);
  const soundRef = React.useRef(soundOn);
  soundRef.current = soundOn;

  const loadVersion = React.useRef(0);
  const load = React.useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const res = await apiClient.get("/api/crm/meet/deal-desk/rooms", { params: scope === "all" ? { scope } : {} });
      if (version !== loadVersion.current) return;
      const d = res.data?.data ?? {};
      const nextRooms: HostDealDeskRoom[] = d.rooms ?? [];
      setRooms(nextRooms);
      setEnded(d.ended ?? []);
      setPublicUrl(d.publicUrl ?? "");
      setCanViewAll(Boolean(d.canViewAll));
      setSelfId(d.selfCrmUserId ?? "");
      setError(null);
      setLoaded(true);

      const current = new Set<string>();
      const arrivals: string[] = [];
      for (const r of nextRooms) for (const q of r.queue) {
        const key = `${r.code}:${q.id}`;
        current.add(key);
        if (seenQueue.current && !seenQueue.current.has(key) && r.host.id === d.selfCrmUserId) arrivals.push(`${q.fullName} → ${r.title}`);
      }
      seenQueue.current = current;
      if (arrivals.length) {
        setToast(arrivals.length === 1 ? `New customer in line: ${arrivals[0]}` : `${arrivals.length} new customers in line`);
        if (soundRef.current) chime();
      }
    } catch (err) {
      if (version !== loadVersion.current) return;
      setError(apiErrorMessage(err, "Could not load your Deal Desk rooms."));
      setLoaded(true);
    }
  }, [scope]);

  // Live queue: poll while the tab is visible, refresh immediately on return.
  React.useEffect(() => {
    seenQueue.current = null;
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("online", onVisible); };
  }, [load]);

  const myRooms = rooms.filter((r) => r.host.id === selfId);
  const waitingTotal = myRooms.reduce((n, r) => n + r.queue.length, 0);
  React.useEffect(() => {
    const base = "Deal Desk · Suprah Meet";
    document.title = waitingTotal > 0 ? `(${waitingTotal}) ${base}` : base;
    return () => { document.title = "Suprah Meet"; };
  }, [waitingTotal]);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy((s) => new Set(s).add(key));
    try { await fn(); } finally { setBusy((s) => { const n = new Set(s); n.delete(key); return n; }); }
  };

  const respond = (room: HostDealDeskRoom, entryId: string, action: "admit" | "deny") =>
    withBusy(`${room.code}:${entryId}`, async () => {
      try {
        await apiClient.post(`/api/crm/meet/meetings/${room.code}/waiting/${encodeURIComponent(entryId)}`, { action });
        setRooms((list) => list.map((r) => r.code !== room.code ? r : { ...r, queue: r.queue.filter((q) => q.id !== entryId) }));
        await load();
      } catch (err) { setToast(apiErrorMessage(err, "Could not update the line.")); }
    });

  const toggleOpen = (room: HostDealDeskRoom) => withBusy(room.code, async () => {
    try {
      await apiClient.patch(`/api/crm/meet/deal-desk/rooms/${room.code}`, { isOpen: !room.isOpen });
      setToast(room.isOpen ? "Room hidden from the public page. Customers already in line stay in line." : "Room is listed on the public page again.");
      await load();
    } catch (err) { setToast(apiErrorMessage(err, "Could not update the room.")); }
  });

  const reopen = (room: HostDealDeskRoom) => withBusy(room.code, async () => {
    try {
      await apiClient.post(`/api/crm/meet/deal-desk/rooms/${room.code}/reopen`);
      setToast(`“${room.title}” is open again with the same password.`);
      await load();
    } catch (err) { setToast(apiErrorMessage(err, "Could not reopen the room.")); }
  });

  const closeRoom = (room: HostDealDeskRoom) => withBusy(room.code, async () => {
    try {
      await apiClient.delete(`/api/crm/meet/deal-desk/rooms/${room.code}`);
      setCloseTarget(null);
      setToast("Room closed.");
      await load();
    } catch (err) { setCloseTarget(null); setToast(apiErrorMessage(err, "Could not close the room.")); }
  });

  const create = async (v: DealDeskRoomValues) => {
    setFormBusy(true); setFormError(null);
    try {
      const res = await apiClient.post("/api/crm/meet/deal-desk/rooms", v);
      const code = res.data?.data?.room?.code;
      setShowCreate(false);
      if (code) router.replace(`/crm/suprah-meet/deal-desk?created=${encodeURIComponent(code)}`, { scroll: false });
      await load();
    } catch (err) { setFormError(apiErrorMessage(err, "Could not create the room.")); }
    finally { setFormBusy(false); }
  };

  const saveEdit = async (v: DealDeskRoomValues) => {
    if (!editTarget) return;
    setFormBusy(true); setFormError(null);
    try {
      await apiClient.patch(`/api/crm/meet/deal-desk/rooms/${editTarget.code}`, {
        title: v.title, description: v.description, ...(v.password ? { password: v.password } : {}),
      });
      setEditTarget(null);
      setToast(v.password ? "Room saved. Share the new password with your next customers." : "Room saved.");
      await load();
    } catch (err) { setFormError(apiErrorMessage(err, "Could not save the room.")); }
    finally { setFormBusy(false); }
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(() => setToast(`${label} copied`)).catch(() => setToast("Copy failed — select and copy the link instead."));
  };

  const shown = scope === "all" ? rooms : myRooms;
  const created = createdCode ? rooms.find((r) => r.code === createdCode) : null;
  const totals = {
    open: shown.filter((r) => r.isOpen).length,
    waiting: shown.reduce((n, r) => n + r.queue.length, 0),
    inSession: shown.filter((r) => r.state === "in_session").length,
    available: shown.filter((r) => r.state === "available").length,
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] w-full">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.045)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="absolute -left-32 top-0 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-4 py-5 md:px-8 md:py-7">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/crm/suprah-meet")} aria-label="Back to Suprah Meet"
              className="grid size-9 place-items-center rounded-lg border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500">
              <ArrowLeft className="size-4" />
            </button>
            <SuprahMeetLogo className="size-11" />
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight tracking-tight md:text-xl">
                Deal Desk <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                </span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Suprah Meet · customer rooms</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { const v = !soundOn; setSoundOn(v); try { localStorage.setItem("suprah-meet:dd-sound", v ? "on" : "off"); } catch { /* ignore */ } }}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs", soundOn ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-300" : "text-muted-foreground")}
              title="Play a sound when a customer joins your line">
              <BellRing className="size-3.5" /> {soundOn ? "Sound on" : "Sound off"}
            </button>
            {canViewAll && (
              <div className="grid grid-cols-2 rounded-lg border bg-muted/40 p-0.5 text-xs">
                {(["mine", "all"] as const).map((s) => (
                  <button key={s} onClick={() => setScope(s)}
                    className={cn("rounded-md px-3 py-1.5", scope === s ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
                    {s === "mine" ? "My rooms" : "All reps"}
                  </button>
                ))}
              </div>
            )}
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => { setFormError(null); setShowCreate(true); }}>
              <Plus className="size-4" /> New Deal Desk room
            </Button>
          </div>
        </header>

        {/* Public page link */}
        <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-card/90 p-4 shadow-sm md:flex-row md:items-center">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><Globe className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Public Deal Desk page</p>
            <p className="text-xs text-muted-foreground">Every open room from your dealership is listed here. Customers pick a room by its title and enter its password.</p>
            {publicUrl && <p className="mt-1 truncate font-mono text-xs text-emerald-600 dark:text-emerald-400">{publicUrl}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" className="gap-1.5" disabled={!publicUrl} onClick={() => copy(publicUrl, "Public page link")}><Copy className="size-4" /> Copy</Button>
            <Button variant="outline" className="gap-1.5" disabled={!publicUrl} onClick={() => window.open(publicUrl, "_blank", "noopener")}><ExternalLink className="size-4" /> Open</Button>
          </div>
        </section>

        {created && (
          <section className="mb-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/[.07] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Room created</p>
                <p className="mt-1 font-semibold">{created.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">It is live on the public page now. Send the room link and its password to your customer, or let them find it by title.</p>
                {created.roomUrl && <p className="mt-2 truncate font-mono text-xs">{created.roomUrl}</p>}
              </div>
              <div className="flex gap-2">
                {created.roomUrl && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(created.roomUrl!, "Room link")}><Copy className="size-4" /> Copy link</Button>}
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={() => router.push(`/crm/suprah-meet/room/${created.code}`)}><Video className="size-4" /> Enter room</Button>
                <Button size="icon" variant="ghost" className="size-8" aria-label="Dismiss" onClick={() => router.replace("/crm/suprah-meet/deal-desk", { scroll: false })}><X className="size-4" /></Button>
              </div>
            </div>
          </section>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open rooms" value={totals.open} />
          <Stat label="Customers in line" value={totals.waiting} tone={totals.waiting > 0 ? "warn" : undefined} live />
          <Stat label="In session" value={totals.inSession} />
          <Stat label="Available now" value={totals.available} tone={totals.available > 0 ? "good" : undefined} />
        </div>

        {error && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

        {!loaded ? (
          <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl border bg-muted/30" />)}</div>
        ) : shown.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-10 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500"><Handshake className="size-7" /></div>
            <h2 className="mt-3 text-lg font-semibold">No Deal Desk rooms yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Create a room for each kind of conversation you take — a trade-in appraisal, a finance review, a vehicle walkaround. Customers find it on the public page by its title.</p>
            <Button className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => { setFormError(null); setShowCreate(true); }}><Plus className="size-4" /> Create your first room</Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((room) => (
              <RoomCard key={room.code} room={room} mine={room.host.id === selfId} showHost={scope === "all"} nowMs={nowMs}
                busy={busy} onCopy={copy}
                onEnter={() => router.push(`/crm/suprah-meet/room/${room.code}`)}
                onRespond={(id, a) => void respond(room, id, a)}
                onToggleOpen={() => void toggleOpen(room)}
                onEdit={() => { setFormError(null); setEditTarget(room); }}
                onClose={() => setCloseTarget(room)} />
            ))}
          </div>
        )}

        {ended.length > 0 && (
          <section className="mt-7">
            <button className="flex w-full items-center justify-between rounded-xl border p-4 text-sm" onClick={() => setEndedOpen(!endedOpen)} aria-expanded={endedOpen}>
              <span>Ended rooms ({ended.length})</span><ChevronDown className={cn("size-4 transition-transform", endedOpen && "rotate-180")} />
            </button>
            {endedOpen && (
              <div className="mt-2 space-y-2">
                {ended.map((room) => (
                  <div key={room.code} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card/70 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{room.title}</p>
                      <p className="text-xs text-muted-foreground">{room.code} · {room.servedCount} customer{room.servedCount === 1 ? "" : "s"} served{scope === "all" && room.host.fullName ? ` · ${room.host.fullName}` : ""}</p>
                    </div>
                    {room.host.id === selfId && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={busy.has(room.code)} onClick={() => void reopen(room)}><RotateCcw className="size-4" /> Reopen</Button>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Remove from this list" onClick={() => setCloseTarget(room)}><Trash2 className="size-4" /></Button>
                      </>
                    )}
                  </div>
                ))}
                <p className="px-1 text-xs text-muted-foreground">Recordings and AI summaries of ended rooms stay in Suprah Meet → Earlier meetings.</p>
              </div>
            )}
          </section>
        )}
      </div>

      {(showCreate || editTarget) && (
        <Modal title={editTarget ? "Edit Deal Desk room" : "New Deal Desk room"} sub={editTarget?.code} onClose={() => { setShowCreate(false); setEditTarget(null); }}>
          <DealDeskRoomForm key={editTarget?.code ?? "new"} mode={editTarget ? "edit" : "create"} busy={formBusy} error={formError}
            initial={editTarget ? { title: editTarget.title, description: editTarget.description ?? "" } : undefined}
            onSubmit={(v) => void (editTarget ? saveEdit(v) : create(v))} />
        </Modal>
      )}

      {closeTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setCloseTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-semibold">{closeTarget.status === "ended" ? "Remove this room from the list?" : "Close this room?"}</h3>
            <p className="mb-1 text-sm text-muted-foreground">{closeTarget.title} · {closeTarget.code}</p>
            <p className="mb-4 text-xs text-muted-foreground">
              {closeTarget.status === "ended"
                ? "Its recording and summary stay in Earlier meetings."
                : `It leaves the public page and its link stops working.${closeTarget.queue.length ? ` The ${closeTarget.queue.length} customer${closeTarget.queue.length === 1 ? "" : "s"} in line will be told the room closed.` : ""} To pause instead, turn off “Accepting customers”.`}
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="destructive" disabled={busy.has(closeTarget.code)} onClick={() => void closeRoom(closeTarget)}>
                {closeTarget.status === "ended" ? "Remove" : "Close room"}
              </Button>
              <Button variant="ghost" onClick={() => setCloseTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] w-max max-w-[90%] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-background px-4 py-2 text-center text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone, live }: { label: string; value: number; tone?: "good" | "warn"; live?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card/80 p-4", tone === "warn" && "border-amber-500/40 bg-amber-500/[.06]", tone === "good" && "border-emerald-500/30")}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {live && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}{label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RoomCard({ room, mine, showHost, nowMs, busy, onCopy, onEnter, onRespond, onToggleOpen, onEdit, onClose }: {
  room: HostDealDeskRoom; mine: boolean; showHost: boolean; nowMs: number; busy: Set<string>;
  onCopy: (text: string, label: string) => void; onEnter: () => void;
  onRespond: (entryId: string, action: "admit" | "deny") => void;
  onToggleOpen: () => void; onEdit: () => void; onClose: () => void;
}) {
  const meta = ROOM_STATE_META[room.state];
  const next = room.queue[0];
  const guestsIn = room.inMeeting.filter((p) => !p.isHost);
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card/80 shadow-sm backdrop-blur",
      room.queue.length > 0 && mine && "border-amber-500/40 shadow-amber-950/10")}>
      <div className="flex items-start gap-3 p-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><Handshake className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{room.title}</h3>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
              <span className={cn("size-1.5 rounded-full", meta.dot, room.state === "available" && "animate-pulse")} />{meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{room.code}{showHost && room.host.fullName ? ` · ${room.host.fullName}` : ""}</p>
          {room.description && <p className="mt-1.5 text-sm text-muted-foreground">{room.description}</p>}
        </div>
        {mine && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-emerald-500" title="Edit room" aria-label="Edit room" onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Close room" aria-label="Close room" onClick={onClose}><Trash2 className="size-4" /></Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y bg-muted/20 px-4 py-2.5">
        {room.roomUrl && (
          <button onClick={() => onCopy(room.roomUrl!, "Room link")} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-emerald-500" title="Copy room link">
            <span className="truncate font-mono">{room.roomUrl}</span><Copy className="size-3 shrink-0" />
          </button>
        )}
        {mine && (
          <>
            <button role="switch" aria-checked={room.isOpen} disabled={busy.has(room.code)} onClick={onToggleOpen}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium",
                room.isOpen ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
              <Power className="size-3.5" /> {room.isOpen ? "Accepting customers" : "Not accepting"}
            </button>
            <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={onEnter}>
              <DoorOpen className="size-4" /> {room.hostInRoom ? "Return to room" : "Enter room"}
            </Button>
          </>
        )}
      </div>

      <div className="grid flex-1 gap-4 p-4">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Hourglass className="size-3.5" /> In line <span className="rounded bg-muted px-1.5 text-foreground">{room.queue.length}</span>
            </h4>
            {mine && next && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/40 text-xs" disabled={busy.has(`${room.code}:${next.id}`)} onClick={() => onRespond(next.id, "admit")}>
                <UserCheck className="size-3.5" /> Admit next
              </Button>
            )}
          </div>
          {room.queue.length === 0 ? (
            <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">No one is waiting.</p>
          ) : (
            <ol className="space-y-1.5">
              {room.queue.map((q) => (
                <li key={q.id} className={cn("flex items-center gap-2.5 rounded-xl border bg-background/60 px-3 py-2", q.stale && "opacity-60")}>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{q.position}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{q.fullName}{!q.isGuest && <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">Team</span>}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      waiting {minutesWaited(q.requestedAt, nowMs)}{q.email ? ` · ${q.email}` : ""}{q.stale ? " · may have left the page" : ""}
                    </p>
                  </div>
                  {mine && (
                    <div className="flex shrink-0 gap-1">
                      <button title="Admit" aria-label={`Admit ${q.fullName}`} disabled={busy.has(`${room.code}:${q.id}`)} onClick={() => onRespond(q.id, "admit")}
                        className="grid size-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 disabled:opacity-50 dark:text-emerald-300"><Check className="size-4" /></button>
                      <button title="Decline" aria-label={`Decline ${q.fullName}`} disabled={busy.has(`${room.code}:${q.id}`)} onClick={() => onRespond(q.id, "deny")}
                        className="grid size-8 place-items-center rounded-full bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 disabled:opacity-50 dark:text-rose-300"><X className="size-4" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {mine && room.queue.length > 0 && !room.hostInRoom && (
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">You’re not in this room yet — customers you admit connect as soon as you enter.</p>
          )}
        </section>

        {room.admitted.length > 0 && (
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><UserCheck className="size-3.5" /> Admitted · connecting</h4>
            <div className="flex flex-wrap gap-1.5">
              {room.admitted.map((a) => <span key={a.id} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs">{a.fullName}</span>)}
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Users className="size-3.5" /> In the meeting</h4>
          {room.inMeeting.length === 0 ? (
            <p className="text-xs text-muted-foreground">Room is empty.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {room.inMeeting.map((p) => (
                <span key={p.id} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", p.isGuest ? "border-sky-500/30 bg-sky-500/10" : "bg-muted/50")}>
                  <span className="size-1.5 rounded-full bg-emerald-500" />{p.fullName}
                  {p.isHost ? <span className="text-[10px] text-muted-foreground">host</span> : p.isGuest ? <span className="text-[10px] text-sky-600 dark:text-sky-300">customer</span> : null}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
        <span>{guestsIn.length} customer{guestsIn.length === 1 ? "" : "s"} in room</span>
        <span>{room.servedCount} served</span>
        {room.declinedCount > 0 && <span>{room.declinedCount} declined</span>}
        {room.passwordUpdatedAt && <span>password set {new Date(room.passwordUpdatedAt).toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" })}</span>}
      </footer>
    </article>
  );
}

function Modal({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm md:p-6" onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-2xl border border-emerald-500/25 bg-background p-5 shadow-2xl shadow-emerald-950/40" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SuprahMeetLogo className="size-8" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Two soft tones — no audio asset needed. Browsers allow it after any click on the page. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch { /* audio unavailable */ }
}
