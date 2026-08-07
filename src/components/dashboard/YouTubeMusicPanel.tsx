"use client";

import * as React from "react";
import {
  Music2,
  Search,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Loader2,
} from "lucide-react";

/**
 * YouTube-powered music player.
 *
 * Search runs through our own backend (/api/crm/youtube/search) so the
 * YouTube Data API key stays server-side. Playback uses the official YouTube
 * IFrame Player API — full tracks, with YouTube's own transport controls.
 *
 * Notes:
 *  - Requires YOUTUBE_API_KEY on the backend and the /youtube route mounted at
 *    /api/crm/youtube (see integration notes).
 *  - Non-Premium YouTube accounts may see/hear ads (YouTube's player, not ours).
 */

interface Track {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
  durationSec: number;
}

// ── Load the IFrame Player API once (promise-cached) ──────────────────────────
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(w.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

function fmt(s: number) {
  if (!s || !isFinite(s)) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function YouTubeMusicPanel({ compact = false, bare = false }: { compact?: boolean; bare?: boolean }) {
  const [open, setOpen] = React.useState(!compact);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Track[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [queue, setQueue] = React.useState<Track[]>([]);
  const [index, setIndex] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const [playerReady, setPlayerReady] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);
  const pendingRef = React.useRef<string | null>(null); // videoId queued before player is ready

  const track = index >= 0 ? queue[index] : null;

  // Keep a ref to the current step handler so onStateChange (bound once) can
  // always advance to the freshest queue/index.
  const advanceRef = React.useRef<() => void>(() => {});

  // ── Create the player once ──────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !wrapRef.current) return;
      const host = document.createElement("div");
      wrapRef.current.appendChild(host);
      playerRef.current = new YT.Player(host, {
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            setPlayerReady(true);
            if (pendingRef.current) {
              playerRef.current.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e: any) => {
            const YTP = (window as any).YT?.PlayerState;
            if (!YTP) return;
            if (e.data === YTP.PLAYING) { setPlaying(true); setErrorMsg(null); }
            else if (e.data === YTP.PAUSED) setPlaying(false);
            else if (e.data === YTP.ENDED) advanceRef.current();
          },
          onError: () => {
            // 100 = unavailable, 101/150 = embedding disabled, 2/5 = param/HTML5.
            // Skip to the next result rather than dead-ending on a blocked track.
            setErrorMsg("That track can't be played here — skipping…");
            advanceRef.current();
            window.setTimeout(() => setErrorMsg(null), 2600);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, []);

  const playAt = React.useCallback((list: Track[], i: number) => {
    setQueue(list);
    setIndex(i);
    const vid = list[i].videoId;
    if (playerRef.current && playerReady) playerRef.current.loadVideoById(vid);
    else pendingRef.current = vid;
  }, [playerReady]);

  const step = React.useCallback((dir: 1 | -1) => {
    setIndex((cur) => {
      const ni = cur + dir;
      if (ni >= 0 && ni < queue.length) {
        const vid = queue[ni].videoId;
        if (playerRef.current && playerReady) playerRef.current.loadVideoById(vid);
        return ni;
      }
      return cur;
    });
  }, [queue, playerReady]);

  // Auto-advance on track end always uses the latest step().
  React.useEffect(() => { advanceRef.current = () => step(1); }, [step]);

  const toggle = () => {
    const p = playerRef.current;
    if (!p || index < 0) return;
    const YTP = (window as any).YT?.PlayerState;
    if (p.getPlayerState && p.getPlayerState() === YTP?.PLAYING) p.pauseVideo();
    else p.playVideo();
  };

  const search = React.useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setError(null); return; }
    setSearching(true);
    setError(null);
    try {
      const { apiClient } = await import("@/lib/api-client");
      const res = await apiClient.get(`/api/crm/youtube/search?q=${encodeURIComponent(q.trim())}`);
      setResults(res.data?.data?.results || []);
    } catch (e: any) {
      setResults([]);
      setError(e?.response?.data?.message || "Search failed. Check the YouTube API key/quota.");
    } finally {
      setSearching(false);
    }
  }, []);

  React.useEffect(() => {
    const id = setTimeout(() => search(query), 450);
    return () => clearTimeout(id);
  }, [query, search]);

  // ── Pieces ──────────────────────────────────────────────────────────────────
  const playerBox = (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-black aspect-video">
      <div ref={wrapRef} className="size-full" />
      {!track && (
        <div className="pointer-events-none -mt-[56.25%] flex aspect-video items-center justify-center text-muted-foreground/40">
          <Music2 className="size-6" />
        </div>
      )}
      {errorMsg && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/70 px-3 py-1.5 text-center text-[11px] font-medium text-amber-300">
          {errorMsg}
        </div>
      )}
    </div>
  );

  const nowPlaying = (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{track?.title || "YouTube Music"}</p>
        <p className="truncate text-[10px] text-muted-foreground/60">
          {track ? `${track.channel}${track.durationSec ? " · " + fmt(track.durationSec) : ""}` : "Search to play"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => step(-1)} disabled={index <= 0} className="text-foreground/70 hover:text-foreground disabled:opacity-30"><SkipBack className="size-4" /></button>
        <button onClick={toggle} disabled={index < 0} className="flex size-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-500 disabled:opacity-40">
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-0.5" />}
        </button>
        <button onClick={() => step(1)} disabled={index < 0 || index >= queue.length - 1} className="text-foreground/70 hover:text-foreground disabled:opacity-30"><SkipForward className="size-4" /></button>
        <button onClick={() => setOpen((v) => !v)} className="ml-0.5 rounded-full p-1.5 text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground" aria-label="Search">
          {open ? <X className="size-4" /> : <Search className="size-4" />}
        </button>
      </div>
    </div>
  );

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs or artists…"
        className="w-full rounded-xl border border-border/40 bg-background/50 py-2 pl-9 pr-3 text-sm focus:border-green-500/40 focus:outline-none placeholder:text-muted-foreground/40"
      />
    </div>
  );

  const resultsList = (
    <div className="max-h-64 space-y-1 overflow-y-auto">
      {searching ? (
        <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground/40" /></div>
      ) : error ? (
        <p className="py-6 text-center text-xs text-rose-500">{error}</p>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground/50">
          {query.trim() ? "No results." : "Search for a song or artist."}
        </p>
      ) : (
        results.map((t, i) => {
          const active = track?.videoId === t.videoId;
          return (
            <button
              key={t.videoId}
              onClick={() => playAt(results, i)}
              className={`flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors ${active ? "bg-green-500/10" : "hover:bg-muted/40"}`}
            >
              <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-muted/40">
                {t.thumbnail ? <img src={t.thumbnail} alt="" className="size-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-semibold ${active ? "text-green-600" : ""}`}>{t.title}</p>
                <p className="truncate text-[10px] text-muted-foreground/55">{t.channel}</p>
              </div>
              {t.durationSec > 0 && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/40">{fmt(t.durationSec)}</span>}
            </button>
          );
        })
      )}
    </div>
  );

  // ── BARE (banner) ─────────────────────────────────────────────────────────
  if (bare) {
    return (
      <div className="relative w-full min-w-0">
        {playerBox}
        <div className="mt-1.5">{nowPlaying}</div>
        {open && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,26rem)] space-y-2 rounded-3xl border border-white/10 bg-background/98 p-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {searchBox}
            {resultsList}
          </div>
        )}
      </div>
    );
  }

  // ── CARD ────────────────────────────────────────────────────────────────────
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-border/20 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Music2 className="size-4 text-green-500" />
          <h2 className="text-sm font-black tracking-tight">Music</h2>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground/60 hover:text-foreground">
          {open ? <X className="size-4" /> : <Search className="size-4" />}
        </button>
      </div>
      <div className="space-y-3 p-4">
        {playerBox}
        {nowPlaying}
        {open && (
          <>
            {searchBox}
            {resultsList}
          </>
        )}
      </div>
    </section>
  );
}