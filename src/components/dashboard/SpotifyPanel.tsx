"use client";

import * as React from "react";
import { Pencil, Check, X } from "lucide-react";

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.36-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.56.3z" />
    </svg>
  );
}

/**
 * Embed-based Spotify player.
 *
 * Uses Spotify's public iframe embed (open.spotify.com/embed/...), which needs
 * NO API access, NO per-user OAuth, and NO developer quota — so it works for
 * every user out of the box regardless of Spotify's Extended-Quota limits.
 *
 * Each user can paste their own playlist/album/track link; the choice is
 * remembered per browser via localStorage. A shared default is used otherwise.
 *
 * Note: logged-out visitors hear 30s previews; users logged into Spotify (free
 * or Premium) in the same browser hear full tracks. That's a Spotify embed
 * behavior, not something we control.
 */

// Default + quick presets. These are Spotify editorial playlist links; if any
// ever go stale, just replace the URL — users can always paste their own.
const DEFAULT_URL = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"; // Today's Top Hits
const STORAGE_KEY = "suprah_spotify_embed";
const PRESETS: { label: string; url: string }[] = [
  { label: "Top Hits", url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
  { label: "Lo-Fi", url: "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM" },
  { label: "Chill", url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6" },
  { label: "Focus", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ" },
];

/** Convert any Spotify link/URI into its embeddable form. */
function toEmbedUrl(input: string): string | null {
  if (!input) return null;
  const m = input.match(
    /(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(playlist|track|album|artist|show|episode)[/:]([A-Za-z0-9]+)/,
  );
  if (!m) return null;
  const [, type, id] = m;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=suprah&theme=0`;
}

export function SpotifyPanel({ compact = false, bare = false }: { compact?: boolean; bare?: boolean }) {
  const [url, setUrl] = React.useState<string>(DEFAULT_URL);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Restore this user's saved choice (per browser).
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUrl(saved);
    } catch {
      /* storage unavailable — fall back to default */
    }
  }, []);

  const embedUrl = toEmbedUrl(url) || toEmbedUrl(DEFAULT_URL)!;
  const height = compact ? 152 : 352;

  const apply = (value: string) => {
    const embed = toEmbedUrl(value);
    if (!embed) {
      setError("Paste a Spotify playlist, album, or track link.");
      return;
    }
    setUrl(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setError(null);
    setEditing(false);
    setDraft("");
  };

  const player = (
    <iframe
      key={embedUrl}
      src={embedUrl}
      title="Spotify player"
      width="100%"
      height={height}
      style={{ borderRadius: 12, border: 0, display: "block" }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );

  const changeBtn = (
    <button
      onClick={() => { setDraft(""); setError(null); setEditing((v) => !v); }}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground/60 transition-colors hover:text-green-600"
    >
      <Pencil className="size-3" /> Change
    </button>
  );

  const editor = editing && (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(draft);
            if (e.key === "Escape") { setEditing(false); setError(null); }
          }}
          placeholder="Paste a Spotify link…"
          className="min-w-0 flex-1 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 text-sm focus:border-green-500/40 focus:outline-none placeholder:text-muted-foreground/40"
        />
        <button onClick={() => apply(draft)} className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-500" aria-label="Apply">
          <Check className="size-3.5" />
        </button>
        <button onClick={() => { setEditing(false); setError(null); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50" aria-label="Cancel">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => apply(p.url)}
            className="rounded-full border border-border/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-green-500/40 hover:text-green-600"
          >
            {p.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );

  // BARE — embedded directly inside the Welcome banner. A label + a matching
  // translucent frame around the iframe keeps Spotify's own dark embed chrome
  // from reading as an unrelated black box dropped into the glass banner.
  if (bare) {
    return (
      <div className="w-full min-w-0">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground/50">
            <SpotifyIcon className="size-3 text-green-500 shrink-0" /> Team Jams
          </span>
          {changeBtn}
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black/20 shadow-inner">
          {player}
        </div>
        {editor}
      </div>
    );
  }

  // CARD — standalone (compact or full).
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-border/20 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <SpotifyIcon className="size-4 text-green-500 shrink-0" />
          <h2 className="text-base font-black tracking-tight">Spotify</h2>
        </div>
        {changeBtn}
      </div>
      <div className="p-4">
        {player}
        {editor}
      </div>
    </section>
  );
}