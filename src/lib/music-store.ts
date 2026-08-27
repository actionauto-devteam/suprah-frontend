"use client"

/**
 * Global music player engine (Audius-powered) — module-level singleton exposed
 * through useSyncExternalStore (same pattern as feed-notification-store.ts and
 * pulse360-store.ts — no provider required). The <audio> element itself lives
 * here as a plain, un-mounted DOM node, so playback keeps running across route
 * navigation instead of being torn down when the page that opened it unmounts.
 */

import * as React from "react"

const APP_NAME = "SuprahAI"
const FALLBACK_HOST = "https://discoveryprovider.audius.co"

export interface Track {
  id: string
  title: string
  artist: string
  artwork?: string
  durationSec: number
}

interface MusicState {
  queue: Track[]
  index: number
  playing: boolean
  progress: number
  current: number
}

const EMPTY: MusicState = { queue: [], index: -1, playing: false, progress: 0, current: 0 }

let state: MusicState = EMPTY
const listeners = new Set<() => void>()

let audio: HTMLAudioElement | null = null
let hostPromise: Promise<string> | null = null

function emitChange() {
  listeners.forEach((l) => l())
}

function setState(patch: Partial<MusicState>) {
  state = { ...state, ...patch }
  emitChange()
}

function getHost(): Promise<string> {
  if (hostPromise) return hostPromise
  hostPromise = fetch("https://api.audius.co")
    .then((r) => r.json())
    .then((j) => {
      const hosts: string[] = j?.data || []
      return hosts.length ? hosts[Math.floor(Math.random() * hosts.length)] : FALLBACK_HOST
    })
    .catch(() => FALLBACK_HOST)
  return hostPromise
}

function mapTrack(t: any): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name || t.user?.handle || "Unknown artist",
    artwork: t.artwork?.["480x480"] || t.artwork?.["150x150"],
    durationSec: t.duration || 0,
  }
}

function getAudio(): HTMLAudioElement {
  if (audio) return audio
  const el = new Audio()
  el.addEventListener("timeupdate", () => {
    setState({ current: el.currentTime, progress: el.duration ? el.currentTime / el.duration : 0 })
  })
  el.addEventListener("play", () => setState({ playing: true }))
  el.addEventListener("pause", () => setState({ playing: false }))
  el.addEventListener("ended", () => step(1))
  audio = el
  return el
}

export async function playAt(list: Track[], i: number): Promise<void> {
  setState({ queue: list, index: i })
  const host = await getHost()
  const el = getAudio()
  el.src = `${host}/v1/tracks/${list[i].id}/stream?app_name=${APP_NAME}`
  el.play().then(() => setState({ playing: true })).catch(() => setState({ playing: false }))
}

export function togglePlayback(): void {
  const el = audio
  const track = state.index >= 0 ? state.queue[state.index] : null
  if (!el || !track) return
  if (el.paused) el.play().then(() => setState({ playing: true })).catch(() => { })
  else { el.pause(); setState({ playing: false }) }
}

export function step(dir: 1 | -1): void {
  if (state.index < 0) return
  const ni = state.index + dir
  if (ni >= 0 && ni < state.queue.length) playAt(state.queue, ni)
}

export function seekTo(fraction: number): void {
  const el = audio
  if (!el || !el.duration) return
  el.currentTime = Math.max(0, Math.min(1, fraction)) * el.duration
}

export async function searchTracks(q: string): Promise<Track[]> {
  if (!q.trim()) return []
  const host = await getHost()
  const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(q.trim())}&app_name=${APP_NAME}`)
  const json = await res.json()
  return (json?.data || []).map(mapTrack)
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): MusicState {
  return state
}

function getServerSnapshot(): MusicState {
  return EMPTY
}

export function useMusicStore(): MusicState {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
