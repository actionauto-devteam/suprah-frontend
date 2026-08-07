"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Music2, Search, Play, Pause, SkipBack, SkipForward, X, Loader2 } from "lucide-react";

/**
 * Music player (Audius-powered) — album-art-focused design.
 *
 * Kept under the YouTubeMusicPanel name/export so page.tsx doesn't change, but
 * it streams from the public Audius API: no API key, no OAuth, no quota, no
 * embed, no cookies, no ads. Full tracks stream into a normal <audio> element,
 * so it plays on any machine/network. Catalog = independent artists.
 */

const APP_NAME = "SuprahAI";
const FALLBACK_HOST = "https://discoveryprovider.audius.co";

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  durationSec: number;
}

let hostPromise: Promise<string> | null = null;
function getHost(): Promise<string> {
  if (hostPromise) return hostPromise;
  hostPromise = fetch("https://api.audius.co")
    .then((r) => r.json())
    .then((j) => {
      const hosts: string[] = j?.data || [];
      return hosts.length ? hosts[Math.floor(Math.random() * hosts.length)] : FALLBACK_HOST;
    })
    .catch(() => FALLBACK_HOST);
  return hostPromise;
}

function mapTrack(t: any): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name || t.user?.handle || "Unknown artist",
    artwork: t.artwork?.["480x480"] || t.artwork?.["150x150"],
    durationSec: t.duration || 0,
  };
}

function fmt(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function YouTubeMusicPanel({ compact = false, bare = false }: { compact?: boolean; bare?: boolean }) {
  const [open, setOpen] = React.useState(!compact);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Track[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [queue, setQueue] = React.useState<Track[]>([]);
  const [index, setIndex] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const track = index >= 0 ? queue[index] : null;
  const onSearchToggle = () => setOpen((v) => !v);

  const search = React.useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const host = await getHost();
      const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(q.trim())}&app_name=${APP_NAME}`);
      const json = await res.json();
      setResults((json?.data || []).map(mapTrack));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  React.useEffect(() => {
    const id = setTimeout(() => search(query), 400);
    return () => clearTimeout(id);
  }, [query, search]);

  const playAt = async (list: Track[], i: number) => {
    setQueue(list);
    setIndex(i);
    const host = await getHost();
    const el = audioRef.current;
    if (!el) return;
    el.src = `${host}/v1/tracks/${list[i].id}/stream?app_name=${APP_NAME}`;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !track) return;
    if (el.paused) el.play().then(() => setPlaying(true)).catch(() => {});
    else { el.pause(); setPlaying(false); }
  };

  const step = (dir: 1 | -1) => {
    if (index < 0) return;
    const ni = index + dir;
    if (ni >= 0 && ni < queue.length) playAt(queue, ni);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration;
  };

  const audio = (
    <audio
      ref={audioRef}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        setCurrent(el.currentTime);
        setProgress(el.duration ? el.currentTime / el.duration : 0);
      }}
      onEnded={() => step(1)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      hidden
    />
  );

  // ── Album cover tile ────────────────────────────────────────────────────────
  const Cover = ({ size, glow }: { size: string; glow?: boolean }) => (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-white/10 ${size} ${
        glow && playing ? "shadow-[0_0_28px_-4px_rgba(16,185,129,0.55)]" : "shadow-lg"
      }`}
    >
      {track?.artwork ? (
        <img src={track.artwork} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center"><Music2 className="size-6 text-muted-foreground/40" /></div>
      )}
    </div>
  );

  const progressBar = (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[9px] tabular-nums text-muted-foreground/60">{fmt(current)}</span>
      <div onClick={seek} className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-500 to-green-400" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground/60">{fmt(track?.durationSec || 0)}</span>
    </div>
  );

  const transport = (
    <div className="flex items-center justify-center gap-4">
      <button onClick={() => step(-1)} disabled={index <= 0} className="text-foreground/70 hover:text-foreground disabled:opacity-30"><SkipBack className="size-5" /></button>
      <button onClick={toggle} disabled={!track} className="flex size-11 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-600/30 hover:bg-green-500 hover:scale-105 transition disabled:opacity-40">
        {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
      </button>
      <button onClick={() => step(1)} disabled={index < 0 || index >= queue.length - 1} className="text-foreground/70 hover:text-foreground disabled:opacity-30"><SkipForward className="size-5" /></button>
    </div>
  );

  // ── Search grid (album covers) ──────────────────────────────────────────────
  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs or artists…"
        className="w-full rounded-xl border border-border/40 bg-background/60 py-2.5 pl-9 pr-3 text-sm focus:border-green-500/40 focus:outline-none placeholder:text-muted-foreground/40"
      />
    </div>
  );

  const resultsGrid = (
    <div className="min-h-40">
      {searching ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground/40" /></div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground/40">
          <Music2 className="size-8" />
          <p className="text-xs">{query.trim() ? "No tracks found." : "Search for a song or artist."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {results.map((t, i) => {
            const active = track?.id === t.id;
            return (
              <button key={t.id} onClick={() => playAt(results, i)} className="group text-left">
                <div className={`relative aspect-square overflow-hidden rounded-xl bg-muted/40 ring-1 transition ${active ? "ring-green-500/70" : "ring-white/5 group-hover:ring-white/20"}`}>
                  {t.artwork ? <img src={t.artwork} alt="" className="size-full object-cover" /> : (
                    <div className="flex size-full items-center justify-center"><Music2 className="size-6 text-muted-foreground/40" /></div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/45">
                    <div className="flex size-10 scale-75 items-center justify-center rounded-full bg-green-600 text-white opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                      {active && playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-0.5" />}
                    </div>
                  </div>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400/70" />
                      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                    </span>
                  )}
                  {t.durationSec > 0 && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-medium tabular-nums text-white">{fmt(t.durationSec)}</span>
                  )}
                </div>
                <p className={`mt-1.5 truncate text-xs font-semibold ${active ? "text-green-500" : ""}`}>{t.title}</p>
                <p className="truncate text-[10px] text-muted-foreground/55">{t.artist}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const searchModal =
    open && mounted && createPortal(
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh] sm:items-center sm:pt-4">
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className="relative z-10 flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-background text-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Music2 className="size-4 text-green-500" />
              <p className="text-sm font-black tracking-tight">Search music</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          <div className="px-4 pt-3">{searchBox}</div>
          <div className="flex-1 overflow-y-auto p-4">{resultsGrid}</div>
        </div>
      </div>,
      document.body,
    );

  // ── BARE — art-forward mini-card in the banner ──────────────────────────────
  if (bare) {
    return (
      <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-card/50 p-3">
        {/* album-art color wash */}
        {track?.artwork && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <img src={track.artwork} alt="" className="size-full scale-125 object-cover opacity-25 blur-2xl" />
            <div className="absolute inset-0 bg-linear-to-t from-card via-card/80 to-card/50" />
          </div>
        )}
        {audio}
        <div className="relative space-y-3">
          <div className="flex items-center gap-3">
            <Cover size="size-16" glow />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{track?.title || "Music"}</p>
              <p className="truncate text-[11px] text-muted-foreground/70">{track?.artist || "Search to play"}</p>
            </div>
            <button onClick={onSearchToggle} className="shrink-0 rounded-full border border-white/10 bg-background/40 p-2 text-muted-foreground hover:text-foreground" aria-label="Search">
              <Search className="size-4" />
            </button>
          </div>
          {progressBar}
          {transport}
        </div>
        {searchModal}
      </div>
    );
  }

  // ── CARD — standalone ───────────────────────────────────────────────────────
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 shadow-sm backdrop-blur-xl">
      {track?.artwork && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img src={track.artwork} alt="" className="size-full scale-125 object-cover opacity-20 blur-3xl" />
          <div className="absolute inset-0 bg-linear-to-t from-card via-card/85 to-card/60" />
        </div>
      )}
      {audio}
      <div className="relative">
        <div className="flex items-center justify-between gap-2 border-b border-border/20 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Music2 className="size-4 text-green-500" />
            <h2 className="text-sm font-black tracking-tight">Music</h2>
          </div>
          <button onClick={onSearchToggle} className="rounded-full border border-white/10 bg-background/40 p-1.5 text-muted-foreground hover:text-foreground" aria-label="Search">
            <Search className="size-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 p-5">
          <Cover size="size-40" glow />
          <div className="w-full text-center">
            <p className="truncate text-base font-bold">{track?.title || "Nothing playing"}</p>
            <p className="truncate text-xs text-muted-foreground/70">{track?.artist || "Search to start"}</p>
          </div>
          <div className="w-full">{progressBar}</div>
          {transport}
        </div>
      </div>
      {searchModal}
    </section>
  );
}