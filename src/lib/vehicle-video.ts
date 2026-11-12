// ─── A vehicle's video (2026-11-13) ──────────────────────────────────────────
// The Video button opens a window that plays the car's video when it has one:
// a video file, or a YouTube or Vimeo link. The dealer feed doesn't send
// videos today; the vehicle's "videoUrl" is really its page on the dealer's
// website, so that's offered as a link instead, never played as a video.

export type VehicleVideo =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string; provider: "YouTube" | "Vimeo" }

const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i
const YOUTUBE_ID = /^[\w-]{11}$/

/** An http(s) web address, or null for anything else (javascript:, data:, junk). */
export function webAddress(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url : null
  } catch {
    return null
  }
}

/** The video to play for this link, or null when it isn't a video. */
export function vehicleVideo(value: unknown): VehicleVideo | null {
  const url = webAddress(value)
  if (!url) return null
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "")
  const parts = url.pathname.split("/").filter(Boolean)

  let youtubeId = ""
  if (host === "youtu.be") youtubeId = parts[0] ?? ""
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") youtubeId = url.searchParams.get("v") ?? ""
    else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") youtubeId = parts[1] ?? ""
  }
  if (YOUTUBE_ID.test(youtubeId)) {
    return { kind: "embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1` }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((part) => /^\d+$/.test(part))
    if (id) return { kind: "embed", provider: "Vimeo", src: `https://player.vimeo.com/video/${id}` }
  }

  if (VIDEO_FILE.test(url.pathname)) return { kind: "file", src: url.href }
  return null
}

/** The car's page on the dealer's website, when the link is a web page rather than a video. */
export function vehiclePageLink(value: unknown): string | null {
  const url = webAddress(value)
  return url && !vehicleVideo(value) ? url.href : null
}
