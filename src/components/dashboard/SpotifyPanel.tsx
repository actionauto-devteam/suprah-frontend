"use client";

import * as React from "react";
import {
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Loader2,
  ListMusic,
  Clock,
  Flame,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type Tab = "playlists" | "recent" | "top";

interface SpotifyStatus {
  connected: boolean;
  displayName?: string;
  product?: string;
}

// Load the Web Playback SDK script once.
let sdkPromise: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Spotify) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export function SpotifyPanel({ compact = false, bare = false }: { compact?: boolean; bare?: boolean }) {
  const [status, setStatus] = React.useState<SpotifyStatus | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [playerState, setPlayerState] = React.useState<any>(null);
  const [tab, setTab] = React.useState<Tab>("playlists");
  const [items, setItems] = React.useState<any[]>([]);
  const [listLoading, setListLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const playerRef = React.useRef<any>(null);

  const isPremium = status?.product === "premium";

  const checkStatus = React.useCallback((signal?: AbortSignal) => {
    return apiClient
      .get("/api/crm/spotify/status", { signal })
      .then((res) => setStatus(res.data?.data || { connected: false }))
      .catch(() => setStatus({ connected: false }));
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    checkStatus(controller.signal);
    const onFocus = () => checkStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [checkStatus]);

  // Web Playback SDK (Premium).
  React.useEffect(() => {
    if (!status?.connected || !isPremium) return;
    let cancelled = false;
    (async () => {
      await loadSdk();
      if (cancelled || !window.Spotify) return;
      const player = new window.Spotify.Player({
        name: "Suprah AI Dashboard",
        volume: 0.5,
        getOAuthToken: async (cb: (t: string) => void) => {
          try {
            const res = await apiClient.get("/api/crm/spotify/token");
            cb(res.data?.data?.accessToken);
          } catch {
            /* token fetch failed */
          }
        },
      });
      player.addListener("ready", ({ device_id }: any) => setDeviceId(device_id));
      player.addListener("not_ready", () => setDeviceId(null));
      player.addListener("player_state_changed", (s: any) => setPlayerState(s));
      player.connect();
      playerRef.current = player;
    })();
    return () => {
      cancelled = true;
      try { playerRef.current?.disconnect(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [status?.connected, isPremium]);

  // Poll now-playing.
  React.useEffect(() => {
    if (!status?.connected) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await apiClient.get("/api/crm/spotify/player");
        if (active && res.data?.data) setPlayerState((prev: any) => res.data.data || prev);
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => { active = false; clearInterval(id); };
  }, [status?.connected]);

  // Browse lists — only fetched when the browse UI is actually visible.
  const browseVisible = !compact || expanded;
  React.useEffect(() => {
    if (!status?.connected || !browseVisible) return;
    const controller = new AbortController();
    setListLoading(true);
    const path =
      tab === "playlists" ? "/api/crm/spotify/playlists"
        : tab === "recent" ? "/api/crm/spotify/recently-played"
          : "/api/crm/spotify/top-tracks";
    apiClient
      .get(path, { signal: controller.signal })
      .then((res) => setItems(res.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setListLoading(false));
    return () => controller.abort();
  }, [tab, status?.connected, browseVisible]);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await apiClient.get("/api/crm/spotify/auth-url");
      const url = res.data?.data?.url;
      if (url) window.location.href = url;
    } catch {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try { await apiClient.post("/api/crm/spotify/disconnect"); } catch { /* ignore */ }
    setStatus({ connected: false });
    setPlayerState(null);
    setDeviceId(null);
    setExpanded(false);
  };

  const togglePlay = () => { if (isPremium) playerRef.current?.togglePlay(); };
  const next = () => (isPremium ? playerRef.current?.nextTrack() : apiClient.post("/api/crm/spotify/player/next").catch(() => {}));
  const prev = () => (isPremium ? playerRef.current?.previousTrack() : apiClient.post("/api/crm/spotify/player/previous").catch(() => {}));
  const setVolume = (v: number) => { if (isPremium) playerRef.current?.setVolume(v); };
  const toggleShuffle = () => {
    const state = !(playerState?.shuffle_state ?? playerState?.shuffle ?? false);
    apiClient.put(`/api/crm/spotify/player/shuffle?state=${state}`).catch(() => {});
  };
  const cycleRepeat = () => {
    const order = ["off", "context", "track"];
    const cur = playerState?.repeat_state || "off";
    const nextState = order[(order.indexOf(cur) + 1) % order.length];
    apiClient.put(`/api/crm/spotify/player/repeat?state=${nextState}`).catch(() => {});
  };
  const playContext = (uri: string, isTrack = false) => {
    const body = isTrack ? { uris: [uri] } : { context_uri: uri };
    apiClient.put("/api/crm/spotify/player/play", { ...body, device_id: deviceId || undefined }).catch(() => {});
  };

  const track = playerState?.track_window?.current_track || playerState?.item || null;
  const paused = playerState?.paused ?? !playerState?.is_playing;
  const albumArt = track?.album?.images?.[0]?.url;
  const trackName = track?.name;
  const artists = (track?.artists || []).map((a: any) => a.name).join(", ");

  /* ── Reusable pieces ─────────────────────────────────────────────────────── */

  const transport = (dense = false) => (
    <div className={`flex items-center justify-center ${dense ? "gap-3" : "gap-4"}`}>
      {!dense && (
        <button onClick={toggleShuffle} className={`transition-colors ${playerState?.shuffle_state ? "text-green-500" : "text-muted-foreground/50 hover:text-foreground"}`}>
          <Shuffle className="size-4" />
        </button>
      )}
      <button onClick={prev} className="text-foreground/80 hover:text-foreground"><SkipBack className={dense ? "size-4" : "size-5"} /></button>
      <button onClick={togglePlay} className={`flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-500 transition-colors ${dense ? "size-9" : "size-11"}`}>
        {paused ? <Play className={`${dense ? "size-4" : "size-5"} translate-x-0.5`} /> : <Pause className={dense ? "size-4" : "size-5"} />}
      </button>
      <button onClick={next} className="text-foreground/80 hover:text-foreground"><SkipForward className={dense ? "size-4" : "size-5"} /></button>
      {!dense && (
        <button onClick={cycleRepeat} className={`transition-colors ${playerState?.repeat_state && playerState.repeat_state !== "off" ? "text-green-500" : "text-muted-foreground/50 hover:text-foreground"}`}>
          <Repeat className="size-4" />
        </button>
      )}
    </div>
  );

  const browse = () => (
    <>
      <div className="flex items-center gap-1 border-b border-border/30">
        {([["playlists", "Playlists", ListMusic], ["recent", "Recent", Clock], ["top", "Top", Flame]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors ${tab === key ? "text-green-500 border-b-2 border-green-500 -mb-px" : "text-muted-foreground/60 hover:text-foreground"}`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          )
        )}
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {listLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground/40" /></div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground/50">Nothing here yet.</p>
        ) : (
          items.map((raw, i) => {
            const isPlaylist = tab === "playlists";
            const t = tab === "recent" ? raw.track : raw;
            const entity = isPlaylist ? raw : t;
            if (!entity) return null;
            const img = isPlaylist ? entity.images?.[0]?.url : entity.album?.images?.[0]?.url;
            const name = entity.name;
            const sub = isPlaylist
              ? `${entity.tracks?.total ?? 0} tracks`
              : (entity.artists || []).map((a: any) => a.name).join(", ");
            return (
              <button
                key={entity.id + i}
                onClick={() => playContext(entity.uri, !isPlaylist)}
                className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                  {img ? <img src={img} alt="" className="size-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{name}</p>
                  <p className="truncate text-[10px] text-muted-foreground/55">{sub}</p>
                </div>
                <Play className="size-3.5 shrink-0 text-muted-foreground/40" />
              </button>
            );
          })
        )}
      </div>
    </>
  );

  /* ── COMPACT (aligns beside the Welcome banner) ──────────────────────────── */

  if (compact) {
    const Shell = ({ children }: { children: React.ReactNode }) =>
      bare ? (
        <div className="relative flex h-full w-full items-center gap-3">{children}</div>
      ) : (
        <section className="relative flex h-full min-h-[92px] items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur-xl shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />
          {children}
        </section>
      );

    if (status === null) {
      return <Shell><div className="flex w-full justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground/50" /></div></Shell>;
    }

    if (!status.connected) {
      return (
        <Shell>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
            <Music2 className="size-5 text-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black tracking-tight">Spotify</p>
            <p className="truncate text-[11px] text-muted-foreground/60">Play music while you work</p>
          </div>
          <button
            onClick={connect}
            disabled={connecting}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-600 hover:bg-green-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <Music2 className="size-3.5" />}
            Connect
          </button>
        </Shell>
      );
    }

    return (
      <div className="relative h-full">
        <Shell>
          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-muted/40">
            {albumArt ? <img src={albumArt} alt="" className="size-full object-cover" /> : (
              <div className="flex size-full items-center justify-center"><Music2 className="size-4 text-muted-foreground/40" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{trackName || "Nothing playing"}</p>
            <p className="truncate text-[11px] text-muted-foreground/60">{artists || status.displayName || "Spotify"}</p>
          </div>
          {isPremium ? (
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={prev} className="text-foreground/70 hover:text-foreground"><SkipBack className="size-4" /></button>
              <button onClick={togglePlay} className="flex size-9 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-500 transition-colors">
                {paused ? <Play className="size-4 translate-x-0.5" /> : <Pause className="size-4" />}
              </button>
              <button onClick={next} className="text-foreground/70 hover:text-foreground"><SkipForward className="size-4" /></button>
            </div>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-600">
              Premium
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Browse"}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </Shell>

        {expanded && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,26rem)] space-y-3 rounded-3xl border border-white/10 bg-background/98 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {isPremium ? (
              <>
                {transport(false)}
                <div className="flex items-center gap-2">
                  <Volume2 className="size-3.5 text-muted-foreground/50" />
                  <input type="range" min={0} max={1} step={0.01} defaultValue={0.5} onChange={(e) => setVolume(Number(e.target.value))} className="h-1 flex-1 cursor-pointer accent-green-500" />
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-600">
                In-app playback control requires Spotify Premium. Browsing still works.
              </p>
            )}
            {browse()}
            <button onClick={disconnect} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/50 hover:text-rose-500 transition-colors">
              <LogOut className="size-3" /> Disconnect Spotify
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── FULL (standalone card) ──────────────────────────────────────────────── */

  const Card = ({ children }: { children: React.ReactNode }) => (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-sm">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border/20">
        <Music2 className="size-4 text-green-500" />
        <h2 className="text-sm font-black tracking-tight">Spotify</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );

  if (status === null) {
    return <Card><div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground/50" /></div></Card>;
  }

  if (!status.connected) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-green-500/10">
            <Music2 className="size-6 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground/70 max-w-xs">
            Connect Spotify to browse your playlists and control playback right from the dashboard.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 rounded-full bg-green-600 hover:bg-green-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {connecting ? <Loader2 className="size-4 animate-spin" /> : <Music2 className="size-4" />}
            Connect Spotify
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted/40">
            {albumArt ? <img src={albumArt} alt="" className="size-full object-cover" /> : (
              <div className="flex size-full items-center justify-center"><Music2 className="size-5 text-muted-foreground/40" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{trackName || "Nothing playing"}</p>
            <p className="truncate text-[11px] text-muted-foreground/60">{artists || status.displayName}</p>
          </div>
        </div>

        {isPremium ? (
          <>
            {transport(false)}
            <div className="flex items-center gap-2">
              <Volume2 className="size-3.5 text-muted-foreground/50" />
              <input type="range" min={0} max={1} step={0.01} defaultValue={0.5} onChange={(e) => setVolume(Number(e.target.value))} className="h-1 flex-1 cursor-pointer accent-green-500" />
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-600">
            In-app playback control requires Spotify Premium. Browsing still works below.
          </p>
        )}

        {browse()}

        <button onClick={disconnect} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/50 hover:text-rose-500 transition-colors">
          <LogOut className="size-3" /> Disconnect Spotify
        </button>
      </div>
    </Card>
  );
}