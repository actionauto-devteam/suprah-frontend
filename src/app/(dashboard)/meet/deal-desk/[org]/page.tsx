"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Handshake, Hourglass, KeyRound, Lock, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, resolveImageUrl } from "@/lib/utils";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";
import {
  PublicApiError, ROOM_STATE_META, dealDeskPublic, handOffGuestPass,
  type PublicDealDeskRoom, type QueueStatus,
} from "@/lib/meet-deal-desk";

/*
 * Public Deal Desk queuing page — /meet/deal-desk/<organizationId>[?room=MEET-1234]
 * No Suprah account. Lists every open Deal Desk room for the dealership,
 * asks for the selected room's password, keeps the customer's place in line,
 * then hands them to the regular Suprah Meet guest page once admitted.
 */

const LIST_POLL_MS = 5000;
const QUEUE_POLL_MS = 3000;

interface ActiveEntry { code: string; title: string; token: string; }
const activeKey = (org: string) => `suprah-meet:dd-active:${org}`;
const profileKey = "suprah-meet:dd-profile";

function readActive(org: string): ActiveEntry | null {
  try { const raw = sessionStorage.getItem(activeKey(org)); return raw ? JSON.parse(raw) as ActiveEntry : null; } catch { return null; }
}
function writeActive(org: string, v: ActiveEntry | null) {
  try { if (v) sessionStorage.setItem(activeKey(org), JSON.stringify(v)); else sessionStorage.removeItem(activeKey(org)); } catch { /* ignore */ }
}

export default function DealDeskPublicPage() {
  return (
    <React.Suspense fallback={null}>
      <DealDeskPublic />
    </React.Suspense>
  );
}

function DealDeskPublic() {
  const router = useRouter();
  const params = useParams<{ org: string }>();
  const search = useSearchParams();
  const org = String(params.org || "");
  const roomParam = (search.get("room") || "").toUpperCase();

  const [rooms, setRooms] = React.useState<PublicDealDeskRoom[]>([]);
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<PublicDealDeskRoom | null>(null);
  const [active, setActive] = React.useState<ActiveEntry | null>(null);
  const [status, setStatus] = React.useState<QueueStatus | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const autoOpened = React.useRef(false);

  React.useEffect(() => { setActive(readActive(org)); }, [org]);

  const loadRooms = React.useCallback(async () => {
    try {
      const d = await dealDeskPublic<{ rooms: PublicDealDeskRoom[]; organizationName: string | null }>(`/${encodeURIComponent(org)}/rooms`);
      setRooms(d.rooms ?? []);
      setOrgName(d.organizationName ?? null);
      setListError(null);
    } catch (err) {
      setListError(err instanceof PublicApiError && err.status === 404 ? "This Deal Desk page does not exist. Check the link you were sent." : "We couldn't load the rooms. Retrying…");
    } finally { setLoaded(true); }
  }, [org]);

  // Room list — live while browsing.
  React.useEffect(() => {
    if (active) return;
    void loadRooms();
    const t = setInterval(() => { if (document.visibilityState === "visible") void loadRooms(); }, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [loadRooms, active]);

  // ?room=CODE (the room's own link) opens that room's password prompt.
  React.useEffect(() => {
    if (autoOpened.current || active || !roomParam || !loaded) return;
    autoOpened.current = true;
    const match = rooms.find((r) => r.code === roomParam);
    if (match) setSelected(match);
    else setNotice("That room isn’t available right now. You can pick another room below.");
  }, [roomParam, rooms, loaded, active]);

  // Place in line — live while waiting.
  React.useEffect(() => {
    if (!active) { setStatus(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const s = await dealDeskPublic<QueueStatus>(`/${encodeURIComponent(org)}/rooms/${encodeURIComponent(active.code)}/queue`, { token: active.token });
        if (cancelled) return;
        setStatus(s);
        if (s.state === "admitted") {
          handOffGuestPass(active.code, active.token);
          writeActive(org, null);
          router.push(`/meet/${encodeURIComponent(active.code)}`);
        }
        if (s.state === "expired" || s.state === "left") {
          writeActive(org, null); setActive(null);
          setNotice("Your place in line expired. Choose the room again to rejoin.");
        }
      } catch { /* transient — keep polling */ }
    };
    void poll();
    const t = setInterval(poll, QUEUE_POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [active, org, router]);

  const leaveLine = async () => {
    if (!active) return;
    await dealDeskPublic(`/${encodeURIComponent(org)}/rooms/${encodeURIComponent(active.code)}/leave`, { method: "POST", body: {}, token: active.token }).catch(() => {});
    writeActive(org, null); setActive(null);
  };

  const backToRooms = () => { writeActive(org, null); setActive(null); setStatus(null); };

  const filtered = rooms.filter((r) => {
    const needle = q.trim().toLowerCase();
    return !needle || r.title.toLowerCase().includes(needle) || (r.description ?? "").toLowerCase().includes(needle) || r.rep.name.toLowerCase().includes(needle);
  });

  return (
    <div className="relative min-h-dvh w-full bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.045)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="absolute -left-32 top-0 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-8">
        <header className="mb-6 flex items-center gap-3">
          <SuprahMeetLogo className="size-11" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{orgName ?? "Suprah Meet"}</p>
            <h1 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">Deal <span className="text-emerald-500">Desk</span></h1>
          </div>
        </header>

        {active ? (
          <QueueCard active={active} status={status} onLeave={() => void leaveLine()} onBack={backToRooms} />
        ) : (
          <>
            <section className="mb-5 rounded-2xl border border-emerald-500/25 bg-card/90 p-5 shadow-sm backdrop-blur">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Meet your representative</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose the room that matches your appointment, enter the password your representative gave you, and we’ll hold your place in line.</p>
              <div className="relative mt-4 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms or representatives" aria-label="Search rooms" className="h-11 pl-9" />
              </div>
            </section>

            {notice && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                <span className="flex-1">{notice}</span>
                <button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="size-4" /></button>
              </div>
            )}
            {listError && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{listError}</p>}

            {!loaded ? (
              <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/30" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed p-10 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500"><Handshake className="size-7" /></div>
                <p className="mt-3 font-medium">{rooms.length === 0 ? "No rooms are open right now" : "No rooms match your search"}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  {rooms.length === 0 ? "This page updates on its own — keep it open and your representative’s room will appear here." : "Try the title your representative mentioned."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((room) => <RoomTile key={room.code} room={room} onSelect={() => setSelected(room)} />)}
              </div>
            )}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Every room is protected by its own password. No account needed.
            </p>
          </>
        )}
      </div>

      {selected && (
        <EnterDialog org={org} room={selected} onClose={() => setSelected(null)}
          onEntered={(entry) => { writeActive(org, entry); setActive(entry); setSelected(null); setNotice(null); }} />
      )}
    </div>
  );
}

function RepAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  const [broken, setBroken] = React.useState(false);
  const url = avatar ? resolveImageUrl(avatar) : "";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return url && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" onError={() => setBroken(true)} className="size-9 rounded-full object-cover ring-1 ring-emerald-500/25" />
  ) : (
    <span className="grid size-9 place-items-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-300">{initials}</span>
  );
}

function RoomTile({ room, onSelect }: { room: PublicDealDeskRoom; onSelect: () => void }) {
  const meta = ROOM_STATE_META[room.state];
  return (
    <button onClick={onSelect}
      className="group flex flex-col rounded-2xl border bg-card/80 p-4 text-left shadow-sm backdrop-blur transition-colors hover:border-emerald-500/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{room.title}</h3>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
          <span className={cn("size-1.5 rounded-full", meta.dot)} />{meta.publicLabel}
        </span>
      </div>
      {room.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{room.description}</p>}
      <div className="mt-4 flex items-center gap-2.5">
        <RepAvatar name={room.rep.name} avatar={room.rep.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{room.rep.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" /> {room.queueLength === 0 ? "No wait" : `${room.queueLength} in line`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-emerald-500">
          <Lock className="size-3.5" /> Join <ArrowRight className="size-3.5" />
        </span>
      </div>
    </button>
  );
}

function EnterDialog({ org, room, onClose, onEntered }: {
  org: string; room: PublicDealDeskRoom; onClose: () => void; onEntered: (entry: ActiveEntry) => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pwRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "null") as { name?: string; email?: string } | null;
      if (saved?.name) setName(saved.name);
      if (saved?.email) setEmail(saved.email);
    } catch { /* ignore */ }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!password) { pwRef.current?.focus(); return setError("Enter the room password."); }
    setBusy(true);
    try {
      const d = await dealDeskPublic<{ guestToken: string; code: string; title: string }>(
        `/${encodeURIComponent(org)}/rooms/${encodeURIComponent(room.code)}/enter`,
        { method: "POST", body: { name: name.trim(), email: email.trim() || undefined, password } });
      try { localStorage.setItem(profileKey, JSON.stringify({ name: name.trim(), email: email.trim() })); } catch { /* ignore */ }
      onEntered({ code: d.code, title: d.title, token: d.guestToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the line.");
      if (err instanceof PublicApiError && err.status === 403) { setPassword(""); pwRef.current?.focus(); }
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="dd-enter-title"
        className="my-auto w-full max-w-md rounded-2xl border border-emerald-500/25 bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Join the line</p>
            <h2 id="dd-enter-title" className="mt-1 text-lg font-semibold leading-snug">{room.title}</h2>
            <p className="text-sm text-muted-foreground">with {room.rep.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="dd-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">Your name</label>
            <Input id="dd-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className="h-11" autoFocus={!name} />
          </div>
          <div>
            <label htmlFor="dd-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">Email <span className="text-muted-foreground/70">(optional — for the meeting recap)</span></label>
            <Input id="dd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} className="h-11" />
          </div>
          <div>
            <label htmlFor="dd-pw" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><KeyRound className="size-3.5" /> Room password</label>
            <div className="relative">
              <Input id="dd-pw" ref={pwRef} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="off" className="h-11 pr-10" autoFocus={!!name} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={busy} className="h-11 w-full gap-2 bg-emerald-600 hover:bg-emerald-500">
            {busy ? "Checking…" : <>Join the line <ArrowRight className="size-4" /></>}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">Your representative sees your name and admits you when they’re ready.</p>
        </form>
      </div>
    </div>
  );
}

function QueueCard({ active, status, onLeave, onBack }: {
  active: ActiveEntry; status: QueueStatus | null; onLeave: () => void; onBack: () => void;
}) {
  const s = status?.state ?? "waiting";
  if (s === "denied" || s === "closed" || s === "ended") {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border bg-card/90 p-6 text-center shadow-xl md:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted"><X className="size-7 text-muted-foreground" /></div>
        <h2 className="mt-4 text-xl font-semibold">{s === "denied" ? "Your representative couldn’t take you in this room" : "This room has closed"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{active.title}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">Please choose another room, or contact your representative directly.</p>
        <Button className="mt-5 bg-emerald-600 hover:bg-emerald-500" onClick={onBack}>See open rooms</Button>
      </div>
    );
  }
  const admitted = s === "admitted";
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-emerald-500/20 bg-card/90 p-6 text-center shadow-xl backdrop-blur md:p-8" aria-live="polite">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/10">
        {admitted ? <Check className="size-8 text-emerald-500" /> : <Hourglass className="size-8 animate-pulse text-emerald-500" />}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" /> {admitted ? "Admitted — connecting" : "You’re in line"}
      </div>
      <h2 className="mt-3 text-xl font-semibold">{active.title}</h2>
      {!admitted && (
        <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-2 text-left">
          <div className="rounded-xl border bg-background/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Your place</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{status?.position ? `#${status.position}` : "—"}</p>
          </div>
          <div className="rounded-xl border bg-background/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Representative</p>
            <p className="mt-1 text-sm font-medium">{status?.repInRoom ? (status.roomState === "in_session" ? "With another customer" : "Ready in the room") : "Joining soon"}</p>
          </div>
        </div>
      )}
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
        {admitted ? "Opening the meeting…" : "Keep this page open. It updates on its own and takes you into the meeting the moment you’re admitted."}
      </p>
      {!admitted && <Button className="mt-5" variant="outline" onClick={onLeave}>Leave the line</Button>}
    </div>
  );
}
