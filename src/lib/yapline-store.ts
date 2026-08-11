"use client";

/**
 * Suprah YapLine — global push-to-talk voice + screen share engine.
 *
 * Module-level singleton exposed through useSyncExternalStore (same pattern as
 * the feed-notification and Pulse360 stores — NO provider required). Any
 * component can call useYapLine(); the engine connects once per tab and keeps
 * receiving broadcasts on every route as long as the app is open.
 *
 * Media path: WebRTC mesh, peer-to-peer. The SupraSpace socket only relays
 * signaling + presence — audio/screen never touch the backend.
 *
 * Transceiver strategy: every peer connection is created with ONE audio and
 * ONE video transceiver (sendrecv). Mic and screen tracks are attached with
 * sender.replaceTrack(), which never triggers renegotiation — so the mesh
 * negotiates exactly once per peer and stays rock-solid afterwards. The
 * newcomer always initiates the offer (server tells existing peers to wait).
 */

import { io as ioClient, Socket } from "socket.io-client";
import { useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ─── ICE configuration ──────────────────────────────────────────────────────
 * Fetched from the API rather than hard-coded, because TURN credentials are
 * per-user and short-lived. STUN alone only connects peers who can reach each
 * other directly — fine inside one office, useless for a distributed team
 * behind home routers, hotspots and CGNAT. TURN relays the media through a
 * server both ends can reach, which is what makes remote calls work at all.
 *
 * The fallback below is STUN-only and exists purely so a failed fetch can't
 * take the whole feature down; `iceHasTurn` tells the UI when we're running
 * without a relay so remote users get a warning instead of silence.
 * ------------------------------------------------------------------------ */

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

let iceServers: RTCIceServer[] = FALLBACK_ICE;
let iceExpiresAt = 0;
let iceHasTurn = false;
let iceFetch: Promise<void> | null = null;

/** Load (or refresh) ICE servers. Cheap no-op while the cached set is valid. */
function loadIceConfig(force = false): Promise<void> {
  if (!force && Date.now() < iceExpiresAt) return Promise.resolve();
  if (iceFetch) return iceFetch;
  iceFetch = apiClient
    .get("/api/crm/yapline/ice")
    .then((res) => {
      const d = res.data?.data || {};
      if (Array.isArray(d.iceServers) && d.iceServers.length) {
        iceServers = d.iceServers;
        iceHasTurn = !!d.hasTurn;
          // Refresh well before expiry (10 minutes early, or halfway through a
        // short TTL). Credentials are rotated into every LIVE peer connection
        // too, so a session that runs all day never hits an expired relay.
        const ttlMs = (d.ttl || 86400) * 1000;
        iceExpiresAt = Date.now() + Math.max(30_000, ttlMs - Math.min(600_000, ttlMs / 2));
        rotateIceIntoLivePeers();
      }
      setState({ relayReady: iceHasTurn });
    })
    .catch(() => {
      // Keep whatever we had; try again on the next peer.
      iceExpiresAt = Date.now() + 30_000;
    })
    .finally(() => {
      iceFetch = null;
    });
  return iceFetch;
}

/**
 * Peer-connection config. `iceCandidatePoolSize` pre-gathers candidates so the
 * first offer already carries relay routes — noticeably faster connects for
 * remote users, who need the TURN path more often than not.
 */
function rtcConfig(): RTCConfiguration {
  return { iceServers, iceCandidatePoolSize: 4 };
}

/**
 * Push fresh credentials into every open connection. Existing media keeps
 * flowing untouched — this only ensures that if a route dies later, the
 * recovery path has valid credentials to rebuild with.
 */
function rotateIceIntoLivePeers() {
  const apply = (pc: RTCPeerConnection) => {
    try { pc.setConfiguration(rtcConfig()); } catch { /* older impls */ }
  };
  peers.forEach((p) => apply(p.pc));
  monitorPeers.forEach((m) => m.forEach((p) => apply(p.pc)));
}

const LS_AUTO_LISTEN = "yapline_auto_listen";
const LS_VOLUME = "yapline_volume";
const LS_PTT_KEY = "yapline_ptt_key";
const DEFAULT_PTT_KEY = "`";

function loadPttKey(): string {
  if (typeof window === "undefined") return DEFAULT_PTT_KEY;
  try {
    return localStorage.getItem(LS_PTT_KEY) || DEFAULT_PTT_KEY;
  } catch {
    return DEFAULT_PTT_KEY;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface YapParticipant {
  userId: string;
  fullName: string;
  avatar?: string | null;
  speaking: boolean;
  sharingScreen: boolean;
  listenOnly: boolean;
}

export interface YapSessionSummary {
  conversationId: string;
  conversationName: string | null;
  startedBy: string;
  startedAt: number;
  participants: YapParticipant[];
  speakingIds: string[];
  screenSharerId: string | null;
}

export type YapQuality = "unknown" | "good" | "fair" | "poor";

export interface YapCurrent {
  conversationId: string;
  conversationName: string | null;
  joining: boolean;
  listenOnly: boolean;
  micReady: boolean;
  transmitting: boolean;
  deafened: boolean;
  volume: number; // 0..1
  quality: YapQuality;
  screenSharing: boolean; // me
  screenVersion: number;  // bumped whenever remote screen streams change
  /**
   * Open-mic model: the mic is LIVE unless muted. `micMuted` is the single
   * source of truth for whether this user's voice is going out; `transmitting`
   * is now derived voice-activity (are they actually making sound right now),
   * used only for the speaking rings.
   */
  micMuted: boolean;
}

// A "monitor" is a listen-only channel joined alongside (not instead of) the
// active one — receive audio only, never sends the mic, never screen-shares.
// Lets someone scan several channels at once, like a real multi-channel radio.
export interface YapMonitor {
  conversationId: string;
  conversationName: string | null;
  volume: number;
  deafened: boolean;
}

/** Active channel (if any) + monitors together can't exceed this. */
export const MAX_JOINED_CHANNELS = 5;

export interface YapLineState {
  ready: boolean;                 // socket connected + authed
  /**
   * Browsers refuse to play audio in a tab the user hasn't interacted with.
   * When that happens we surface it instead of leaving people staring at a
   * "connected" session they cannot hear — the UI shows a tap-to-enable
   * prompt, and any click anywhere in the app clears it.
   */
  audioBlocked: boolean;
  /**
   * True when a TURN relay is configured. Without one, peers on different
   * networks frequently cannot connect at all — the UI warns instead of
   * leaving remote users guessing why they hear nothing.
   */
  relayReady: boolean;
  myUserId: string | null;
  sessions: Record<string, YapSessionSummary>;
  current: YapCurrent | null;
  monitors: Record<string, YapMonitor>;
  autoListen: boolean;
  minimized: boolean;
  pttKey: string;
  error: string | null;
}

// ─── Snapshot store ──────────────────────────────────────────────────────────

let state: YapLineState = {
  ready: false,
  audioBlocked: false,
  relayReady: false,
  myUserId: null,
  sessions: {},
  current: null,
  monitors: {},
  // Opt-in: silently pulling someone into a live audio session they never
  // asked to join — just because a teammate opened a YapLine somewhere — is
  // exactly the "auto joined into a channel for no reason" surprise. The
  // toggle lives on the full YapLine page for anyone who actually wants it.
  autoListen: false,
  // The dock lives as a single orb by default — it expands only when the user
  // taps it, so it never occupies the corner of the screen uninvited.
  minimized: true,
  pttKey: loadPttKey(),
  error: null,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<YapLineState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function patchCurrent(patch: Partial<YapCurrent>) {
  if (!state.current) return;
  setState({ current: { ...state.current, ...patch } });
}

// ─── Engine internals (never in the snapshot) ────────────────────────────────

interface Peer {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  audioEl: HTMLAudioElement | null;
  /**
   * Senders are cached at negotiation time instead of being re-discovered by
   * scanning transceivers for `receiver.track.kind`. That scan was unreliable:
   * on the answering side a transceiver's receiver track can be absent or
   * still kind-less at the moment we attach, so the mic silently landed on no
   * sender at all — the classic "I'm talking and nobody hears me".
   */
  audioSender: RTCRtpSender | null;
  videoSender: RTCRtpSender | null;
}

// A monitor peer is deliberately dumber than the active-channel Peer above:
// audio-only, recvonly, we never attach a local track and never renegotiate,
// so there's no glare to handle and no polite/impolite side to pick.
interface MonitorPeer {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement | null;
}

let socket: Socket | null = null;
let initPromise: Promise<void> | null = null;
let micStream: MediaStream | null = null;

/* ─── Audio sink ────────────────────────────────────────────────────────────
 * Every remote voice needs a real, DOM-attached <audio> element. Detached
 * elements are unreliable across browsers, and autoplay policy blocks play()
 * outright on tabs the user hasn't clicked yet — which is why a listener could
 * be fully connected, see the speaking rings light up, and still hear nothing.
 * We keep one hidden container, retry every blocked element on the first user
 * gesture, and expose `audioBlocked` so the UI can ask for that one tap.
 * ------------------------------------------------------------------------ */

let audioRoot: HTMLDivElement | null = null;
const pendingPlay = new Set<HTMLAudioElement>();
let unlockBound = false;

function getAudioRoot(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  if (audioRoot?.isConnected) return audioRoot;
  audioRoot = document.createElement("div");
  audioRoot.id = "yapline-audio-sink";
  audioRoot.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;";
  document.body.appendChild(audioRoot);
  return audioRoot;
}

function createSink(): HTMLAudioElement {
  const el = document.createElement("audio");
  el.autoplay = true;
  // iOS Safari refuses inline playback without this and hijacks the session.
  el.setAttribute("playsinline", "");
  (el as any).playsInline = true;
  getAudioRoot()?.appendChild(el);
  return el;
}

function bindUnlockOnce() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const unlock = () => {
    void resumeAudio();
  };
  ["pointerdown", "keydown", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, unlock, { passive: true })
  );
}

/** Retry every element the browser refused to start. Safe to call anytime. */
async function resumeAudio(): Promise<void> {
  if (audioCtx?.state === "suspended") {
    try { await audioCtx.resume(); } catch { /* noop */ }
  }
  const els = Array.from(pendingPlay);
  await Promise.all(
    els.map(async (el) => {
      try {
        await el.play();
        pendingPlay.delete(el);
      } catch {
        /* still blocked — stays queued for the next gesture */
      }
    })
  );
  if (pendingPlay.size === 0 && state.audioBlocked) setState({ audioBlocked: false });
}

/** Start (or restart) playback on a sink, tracking blocked ones. */
function playSink(el: HTMLAudioElement) {
  bindUnlockOnce();
  el.play()
    .then(() => {
      pendingPlay.delete(el);
      if (pendingPlay.size === 0 && state.audioBlocked) setState({ audioBlocked: false });
    })
    .catch(() => {
      pendingPlay.add(el);
      if (!state.audioBlocked) setState({ audioBlocked: true });
    });
}

function destroySink(el: HTMLAudioElement | null) {
  if (!el) return;
  pendingPlay.delete(el);
  try { el.pause(); } catch { /* noop */ }
  el.srcObject = null;
  el.remove();
}
let screenStream: MediaStream | null = null;
const peers = new Map<string, Peer>();
// conversationId -> userId -> MonitorPeer. Kept entirely separate from `peers`
// (the active channel's mesh) so nothing about monitoring can ever touch or
// regress push-to-talk / screen-share on the channel you're actually using.
const monitorPeers = new Map<string, Map<string, MonitorPeer>>();
const remoteScreens = new Map<string, MediaStream>();
let statsTimer: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;

/** Read a remote screen-share stream (components re-render via screenVersion). */
export function getRemoteScreenStream(userId: string): MediaStream | null {
  return remoteScreens.get(userId) || null;
}

// ─── Chirp (walkie-talkie "over" tone) ───────────────────────────────────────

function chirp(kind: "in" | "out") {
  try {
    if (state.current?.deafened) return;
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(kind === "in" ? 880 : 660, t);
    osc.frequency.setValueAtTime(kind === "in" ? 1174 : 523, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch {
    /* audio cues are cosmetic */
  }
}

// ─── Socket bootstrap ────────────────────────────────────────────────────────

async function ensureInit(): Promise<void> {
  if (typeof window === "undefined") return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Persisted preferences
    try {
      const al = localStorage.getItem(LS_AUTO_LISTEN);
      const vol = localStorage.getItem(LS_VOLUME);
      setState({ autoListen: al === null ? false : al === "1" });
      if (vol !== null) defaultVolume = Math.min(1, Math.max(0, Number(vol) || 1));
    } catch { /* ignore */ }

    // CRM socket token — same issuance path SupraSpace uses.
    const res = await apiClient.post("/api/supraspace/session-token");
    const token: string | undefined = res.data?.data?.token;
    if (!token) throw new Error("No CRM session token");

    // Decode our own userId from the token payload (id claim).
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      if (payload?.id) setState({ myUserId: String(payload.id) });
    } catch { /* non-fatal */ }

    socket = ioClient(API_URL, {
      path: "/socket/supraspace",
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1500,
    });

    socket.on("connect", () => {
      setState({ ready: true, error: null });
      hydrate();
      // If a session was live when the socket dropped, rejoin it.
      if (state.current) void rejoin(state.current.conversationId, state.current.listenOnly);
      if (Object.keys(state.monitors).length > 0) void rejoinMonitors();
    });

    socket.on("disconnect", () => {
      setState({ ready: false });
      // Quality lives on the active session, not top-level state — RTT stats
      // are meaningless while the socket is down, so show "measuring…" until
      // the reconnect + rejoin restores real numbers. No-ops when not in a
      // session (patchCurrent guards on state.current).
      patchCurrent({ quality: "unknown" });
    });
    socket.on("connect_error", (err) =>
      setState({ error: err?.message || "YapLine connection error" })
    );

    // ── Session fanout (arrives on user:{id} — works on every page) ──────
    socket.on("yapline:session-started", (s: YapSessionSummary) => {
      setState({ sessions: { ...state.sessions, [s.conversationId]: s } });
      const mine = s.participants.some((p) => p.userId === state.myUserId);
      if (!mine) {
        chirp("in");
        if (state.autoListen && !state.current) {
          void join(s.conversationId, s.conversationName, { listenOnly: true });
        }
      }
    });

    socket.on("yapline:session-update", (s: YapSessionSummary) => {
      setState({ sessions: { ...state.sessions, [s.conversationId]: s } });
    });

    socket.on("yapline:session-ended", ({ conversationId }: { conversationId: string }) => {
      const next = { ...state.sessions };
      delete next[conversationId];
      setState({ sessions: next });
      if (state.current?.conversationId === conversationId) {
        teardownMedia();
        setState({ current: null });
      }
      if (state.monitors[conversationId]) {
        teardownMonitor(conversationId);
        const nm = { ...state.monitors };
        delete nm[conversationId];
        setState({ monitors: nm });
      }
    });

    // ── In-session events (yap:{conv} room) ──────────────────────────────
    socket.on("yapline:peer-joined", ({ conversationId }: any) => {
      // The newcomer initiates offers toward US — nothing to do but wait for
      // their signal. Roster refresh comes via session-update.
      if (state.current?.conversationId !== conversationId && !state.monitors[conversationId]) return;
    });

    socket.on("yapline:peer-left", ({ conversationId, userId }: any) => {
      if (state.current?.conversationId === conversationId) { closePeer(userId); return; }
      if (state.monitors[conversationId]) closeMonitorPeer(conversationId, userId);
    });

    // Warm the relay credentials during startup so the first join is instant.
    void loadIceConfig();

    socket.on("yapline:signal", (msg: { conversationId: string; from: string; data: any }) => {
      if (state.current?.conversationId === msg.conversationId) { void handleSignal(msg.from, msg.data); return; }
      if (state.monitors[msg.conversationId]) void handleMonitorSignal(msg.conversationId, msg.from, msg.data);
    });

    socket.on("yapline:speaking", ({ conversationId, userId, speaking }: any) => {
      if (state.current?.conversationId !== conversationId) return;
      if (speaking && userId !== state.myUserId) chirp("in");
    });

    socket.on("yapline:screen-preempted", ({ conversationId }: any) => {
      if (state.current?.conversationId !== conversationId) return;
      stopScreenShare(true);
    });

    socket.on("yapline:replaced", ({ conversationId }: any) => {
      if (state.current?.conversationId === conversationId) {
        teardownMedia();
        setState({ current: null, error: "YapLine moved to another tab or device." });
        return;
      }
      if (state.monitors[conversationId]) {
        teardownMonitor(conversationId);
        const next = { ...state.monitors };
        delete next[conversationId];
        setState({ monitors: next });
      }
    });
  })().catch((err) => {
    initPromise = null;
    setState({ error: err?.message || "YapLine failed to start" });
  });

  return initPromise;
}

let defaultVolume = 1;

async function hydrate() {
  try {
    const res = await apiClient.get("/api/crm/yapline/sessions");
    const list: YapSessionSummary[] = res.data?.data || [];
    const map: Record<string, YapSessionSummary> = {};
    list.forEach((s) => (map[s.conversationId] = s));
    setState({ sessions: map });
  } catch { /* widget/dock will retry via socket events */ }
}

// ─── Peer lifecycle ──────────────────────────────────────────────────────────

function sendSignal(to: string, data: any) {
  if (!socket || !state.current) return;
  socket.emit("yapline:signal", {
    conversationId: state.current.conversationId,
    to,
    data,
  });
}

function createPeer(peerId: string, initiate: boolean): Peer {
  const existing = peers.get(peerId);
  if (existing) return existing;

  const pc = new RTCPeerConnection(rtcConfig());
  const polite = (state.myUserId || "") > peerId;
  const peer: Peer = {
    pc,
    polite,
    makingOffer: false,
    ignoreOffer: false,
    audioEl: null,
    audioSender: null,
    videoSender: null,
  };
  peers.set(peerId, peer);

  if (initiate) {
    // Fixed media slots — replaceTrack() later, never renegotiate. Senders are
    // captured here so attaching the mic later can never miss its target.
    peer.audioSender = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
    peer.videoSender = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
    attachLocalTracks(peer);
  }

  pc.onnegotiationneeded = async () => {
    try {
      peer.makingOffer = true;
      await pc.setLocalDescription();
      sendSignal(peerId, { description: pc.localDescription });
    } catch {
      /* connection-state handlers recover */
    } finally {
      peer.makingOffer = false;
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) sendSignal(peerId, { candidate: e.candidate });
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") {
      // Expired TURN credentials look exactly like a dead path, so refresh
      // them before retrying — this is the usual cause of a long session
      // dropping a peer that reconnects fine afterwards.
      void loadIceConfig(true).then(() => {
        try {
          pc.setConfiguration(rtcConfig());
        } catch {
          /* not supported everywhere — restartIce still helps */
        }
        pc.restartIce();
      });
    }
  };

  pc.ontrack = (e) => {
    if (e.track.kind === "audio") {
      const el = peer.audioEl || createSink();
      peer.audioEl = el;
      el.srcObject = e.streams[0] || new MediaStream([e.track]);
      el.volume = state.current?.volume ?? defaultVolume;
      el.muted = !!state.current?.deafened;
      playSink(el);
      // A remote that unmutes after a reconnect needs the sink kicked again;
      // some browsers pause the element when the track goes silent.
      e.track.onunmute = () => playSink(el);
      return;
    }

    /* Video. The screen transceiver is negotiated up-front and sits EMPTY
     * until someone actually shares, so ontrack fires immediately with a
     * muted, frameless track. Registering that as a screen is what painted
     * everyone a black rectangle. Only publish the stream once real frames
     * arrive (unmute), and pull it the moment they stop. */
    const stream = e.streams[0] || new MediaStream([e.track]);
    const publish = () => {
      remoteScreens.set(peerId, stream);
      bumpScreenVersion();
    };
    const retract = () => {
      if (remoteScreens.delete(peerId)) bumpScreenVersion();
    };
    if (!e.track.muted) publish();
    e.track.onunmute = publish;
    e.track.onmute = retract;
    e.track.onended = retract;
  };

  return peer;
}

/** Late-bind senders on the answering side, where the remote offer created them. */
function captureSenders(peer: Peer) {
  if (peer.audioSender && peer.videoSender) return;
  peer.pc.getTransceivers().forEach((t) => {
    // mid ordering is stable: the offer always declares audio first, then
    // video, so it disambiguates even before receiver tracks materialise.
    const kind =
      t.sender.track?.kind ||
      t.receiver.track?.kind ||
      (t.mid === "0" ? "audio" : t.mid === "1" ? "video" : null);
    if (kind === "audio" && !peer.audioSender) peer.audioSender = t.sender;
    if (kind === "video" && !peer.videoSender) peer.videoSender = t.sender;
  });
}

function attachLocalTracks(peer: Peer) {
  captureSenders(peer);
  const micTrack = micStream?.getAudioTracks()[0] || null;
  const screenTrack = screenStream?.getVideoTracks()[0] || null;
  if (micTrack && peer.audioSender && peer.audioSender.track !== micTrack) {
    void peer.audioSender.replaceTrack(micTrack).catch(() => { /* peer closing */ });
  }
  if (screenTrack && peer.videoSender && peer.videoSender.track !== screenTrack) {
    void peer.videoSender.replaceTrack(screenTrack).catch(() => { /* peer closing */ });
  }
}

async function handleSignal(from: string, data: any) {
  const peer = createPeer(from, false);
  const { pc } = peer;
  try {
    if (data.description) {
      const desc: RTCSessionDescriptionInit = data.description;
      const collision = desc.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
      peer.ignoreOffer = !peer.polite && collision;
      if (peer.ignoreOffer) return;
      await pc.setRemoteDescription(desc);
      if (desc.type === "offer") {
        // Answerer side: transceivers were created by the remote offer, and
        // the spec defaults their LOCAL direction to "recvonly". That silently
        // breaks full-duplex — replaceTrack() attaches the mic/screen with no
        // error, but the negotiated direction never lets media leave this
        // side: PTT transmits nothing and a shared screen arrives black.
        // Claim both directions before answering so the one-and-only
        // negotiation is sendrecv both ways.
        pc.getTransceivers().forEach((t) => {
          try { t.direction = "sendrecv"; } catch { /* older impls: read-only */ }
        });
        captureSenders(peer);
        attachLocalTracks(peer);
        await pc.setLocalDescription();
        sendSignal(from, { description: pc.localDescription });
      }
    } else if (data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (err) {
        if (!peer.ignoreOffer) throw err;
      }
    }
  } catch {
    /* individual peer failures shouldn't kill the session */
  }
}

function closePeer(userId: string) {
  const peer = peers.get(userId);
  if (!peer) return;
  peers.delete(userId);
  try { peer.pc.close(); } catch { /* noop */ }
  destroySink(peer.audioEl);
  peer.audioEl = null;
  if (remoteScreens.delete(userId)) bumpScreenVersion();
}

// ─── Monitor peer lifecycle (listen-only, additional channels) ──────────────

function sendMonitorSignal(conversationId: string, to: string, data: any) {
  socket?.emit("yapline:signal", { conversationId, to, data });
}

function createMonitorPeer(conversationId: string, peerId: string, initiate: boolean): MonitorPeer {
  let convPeers = monitorPeers.get(conversationId);
  if (!convPeers) {
    convPeers = new Map();
    monitorPeers.set(conversationId, convPeers);
  }
  const existing = convPeers.get(peerId);
  if (existing) return existing;

  const pc = new RTCPeerConnection(rtcConfig());
  const peer: MonitorPeer = { pc, audioEl: null };
  convPeers.set(peerId, peer);

  if (initiate) {
    // recvonly only — we never send audio into a monitored channel.
    pc.addTransceiver("audio", { direction: "recvonly" });
  }

  pc.onnegotiationneeded = async () => {
    try {
      await pc.setLocalDescription();
      sendMonitorSignal(conversationId, peerId, { description: pc.localDescription });
    } catch {
      /* ICE restart recovers */
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) sendMonitorSignal(conversationId, peerId, { candidate: e.candidate });
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") pc.restartIce();
  };

  pc.ontrack = (e) => {
    if (e.track.kind !== "audio") return;
    const el = peer.audioEl || createSink();
    peer.audioEl = el;
    el.srcObject = e.streams[0] || new MediaStream([e.track]);
    const mon = state.monitors[conversationId];
    el.volume = mon?.volume ?? defaultVolume;
    el.muted = !!mon?.deafened;
    playSink(el);
    e.track.onunmute = () => playSink(el);
  };

  return peer;
}

async function handleMonitorSignal(conversationId: string, from: string, data: any) {
  const peer = createMonitorPeer(conversationId, from, false);
  try {
    if (data.description) {
      await peer.pc.setRemoteDescription(data.description);
      if (data.description.type === "offer") {
        await peer.pc.setLocalDescription();
        sendMonitorSignal(conversationId, from, { description: peer.pc.localDescription });
      }
    } else if (data.candidate) {
      await peer.pc.addIceCandidate(data.candidate);
    }
  } catch {
    /* individual peer failures shouldn't kill the monitor */
  }
}

function closeMonitorPeer(conversationId: string, userId: string) {
  const convPeers = monitorPeers.get(conversationId);
  const peer = convPeers?.get(userId);
  if (!peer) return;
  convPeers!.delete(userId);
  try { peer.pc.close(); } catch { /* noop */ }
  if (peer.audioEl) {
    peer.audioEl.srcObject = null;
    peer.audioEl = null;
  }
}

function teardownMonitor(conversationId: string) {
  const convPeers = monitorPeers.get(conversationId);
  if (!convPeers) return;
  convPeers.forEach((peer) => {
    try { peer.pc.close(); } catch { /* noop */ }
    if (peer.audioEl) {
      peer.audioEl.srcObject = null;
      peer.audioEl = null;
    }
  });
  monitorPeers.delete(conversationId);
}

function totalJoinedChannelCount(): number {
  return (state.current ? 1 : 0) + Object.keys(state.monitors).length;
}

async function joinMonitor(conversationId: string, conversationName?: string | null): Promise<void> {
  await ensureInit();
  if (!socket) return;
  if (state.current?.conversationId === conversationId || state.monitors[conversationId]) return;
  if (totalJoinedChannelCount() >= MAX_JOINED_CHANNELS) {
    setState({ error: `You can only be in up to ${MAX_JOINED_CHANNELS} channels at once — leave one first.` });
    return;
  }

  setState({
    monitors: {
      ...state.monitors,
      [conversationId]: {
        conversationId,
        conversationName: conversationName ?? state.sessions[conversationId]?.conversationName ?? null,
        volume: defaultVolume,
        deafened: false,
      },
    },
    error: null,
  });

  socket.emit(
    "yapline:join",
    { conversationId, listenOnly: true },
    (res: { ok: boolean; session?: YapSessionSummary; error?: string; movedFromAnotherDevice?: boolean }) => {
      if (!res?.ok || !res.session) {
        const next = { ...state.monitors };
        delete next[conversationId];
        setState({ monitors: next, error: res?.error || "Could not join channel" });
        return;
      }
      setState({ sessions: { ...state.sessions, [conversationId]: res.session } });
      // We are the newcomer: initiate a recvonly connection to every existing member.
      res.session.participants
        .filter((p) => p.userId !== state.myUserId)
        .forEach((p) => createMonitorPeer(conversationId, p.userId, true));
      if (res.movedFromAnotherDevice) {
        toast.info("Moved your connection to this channel here — you were already on it from another device.");
      }
    }
  );
}

function leaveMonitor(conversationId: string): void {
  if (!state.monitors[conversationId]) return;
  socket?.emit("yapline:leave", { conversationId });
  teardownMonitor(conversationId);
  const next = { ...state.monitors };
  delete next[conversationId];
  setState({ monitors: next });
}

function setMonitorVolume(conversationId: string, volume: number): void {
  const mon = state.monitors[conversationId];
  if (!mon) return;
  const v = Math.min(1, Math.max(0, volume));
  setState({ monitors: { ...state.monitors, [conversationId]: { ...mon, volume: v } } });
  monitorPeers.get(conversationId)?.forEach((p) => { if (p.audioEl) p.audioEl.volume = v; });
}

function setMonitorDeafened(conversationId: string, deafened: boolean): void {
  const mon = state.monitors[conversationId];
  if (!mon) return;
  setState({ monitors: { ...state.monitors, [conversationId]: { ...mon, deafened } } });
  monitorPeers.get(conversationId)?.forEach((p) => { if (p.audioEl) p.audioEl.muted = deafened; });
}

async function rejoinMonitors(): Promise<void> {
  const ids = Object.keys(state.monitors);
  for (const id of ids) {
    const name = state.monitors[id]?.conversationName;
    teardownMonitor(id);
    const next = { ...state.monitors };
    delete next[id];
    setState({ monitors: next });
    await joinMonitor(id, name);
  }
}

function bumpScreenVersion() {
  if (state.current) patchCurrent({ screenVersion: state.current.screenVersion + 1 });
}

function teardownMedia() {
  [...peers.keys()].forEach(closePeer);
  stopVad();
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  screenStream?.getTracks().forEach((t) => t.stop());
  screenStream = null;
  remoteScreens.clear();
  stopWatchdog();
  if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }
}

/* ─── Session watchdog ───────────────────────────────────────────────────────
 * Discord-style "always on" means the line must repair itself without anyone
 * noticing. Every few seconds we check that each person on the roster has a
 * healthy connection to us, and fix what doesn't:
 *
 *   - roster member with NO peer  → build one (a lost signal, a race on join)
 *   - peer stuck failed/closed    → tear down and rebuild from scratch
 *   - stale peer not on roster    → close it
 *   - credentials near expiry     → refresh in the background
 *   - audio sink paused/blocked   → nudge it back into playing
 *
 * Rebuilds are deliberately one-sided: only the peer with the lower userId
 * re-initiates, so both ends can't rebuild simultaneously and glare forever.
 * ------------------------------------------------------------------------ */

let watchdogTimer: ReturnType<typeof setInterval> | null = null;
const peerRetry = new Map<string, number>();

function peerIsDead(pc: RTCPeerConnection): boolean {
  return (
    pc.connectionState === "failed" ||
    pc.connectionState === "closed" ||
    pc.iceConnectionState === "failed" ||
    pc.iceConnectionState === "closed"
  );
}

function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    const cur = state.current;
    if (!cur) return;

    // Keep credentials ahead of expiry so recovery never stalls on auth.
    void loadIceConfig();

    const roster = (state.sessions[cur.conversationId]?.participants || [])
      .map((p) => p.userId)
      .filter((id) => id !== state.myUserId);

    // Drop connections to people who have left.
    peers.forEach((_p, id) => {
      if (!roster.includes(id)) closePeer(id);
    });

    roster.forEach((id) => {
      const peer = peers.get(id);
      if (!peer) {
        // Missing entirely — only one side initiates to avoid dueling offers.
        if ((state.myUserId || "") < id) createPeer(id, true);
        return;
      }
      if (!peerIsDead(peer.pc)) {
        peerRetry.delete(id);
        return;
      }
      // Dead. Rebuild, with a light backoff so a genuinely unreachable peer
      // doesn't spin.
      const attempts = peerRetry.get(id) || 0;
      peerRetry.set(id, attempts + 1);
      if (attempts > 0 && attempts % 3 !== 0) return;
      closePeer(id);
      if ((state.myUserId || "") < id) createPeer(id, true);
    });

    // Sinks that the browser paused (tab restore, device change, autoplay).
    peers.forEach((p) => {
      if (p.audioEl && p.audioEl.paused && p.audioEl.srcObject) playSink(p.audioEl);
    });
  }, 4000);
}

function stopWatchdog() {
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = null;
  peerRetry.clear();
}

/* Audio must survive backgrounded tabs, sleeping laptops and device changes —
 * all of which routinely pause elements or suspend the audio context. */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void resumeAudio();
  });
  if (typeof navigator !== "undefined" && navigator.mediaDevices) {
    navigator.mediaDevices.addEventListener?.("devicechange", () => {
      void resumeAudio();
    });
  }
}

// ─── Connection quality sampling ─────────────────────────────────────────────

function startStatsLoop() {
  if (statsTimer) clearInterval(statsTimer);
  statsTimer = setInterval(async () => {
    if (!state.current || peers.size === 0) {
      patchCurrent({ quality: "unknown" });
      return;
    }
    let rtts: number[] = [];
    let anyBad = false;
    for (const peer of peers.values()) {
      const st = peer.pc.iceConnectionState;
      if (st === "disconnected" || st === "failed") anyBad = true;
      try {
        const stats = await peer.pc.getStats();
        stats.forEach((r: any) => {
          if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime != null) {
            rtts.push(r.currentRoundTripTime);
          }
        });
      } catch { /* skip */ }
    }
    let quality: YapQuality = "unknown";
    if (anyBad) quality = "poor";
    else if (rtts.length) {
      const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;
      quality = avg < 0.15 ? "good" : avg < 0.35 ? "fair" : "poor";
    }
    patchCurrent({ quality });
  }, 5000);
}

// ─── Public actions ──────────────────────────────────────────────────────────



async function join(
  conversationId: string,
  conversationName?: string | null,
  opts?: { listenOnly?: boolean }
): Promise<void> {
  await ensureInit();
  if (!socket) return;
  if (state.current?.conversationId === conversationId) return;
  // Promoting a monitored channel to active — drop the recvonly monitor
  // connection first so we don't double-join the same session as both roles.
  if (state.monitors[conversationId]) leaveMonitor(conversationId);
  else if (!state.current && totalJoinedChannelCount() >= MAX_JOINED_CHANNELS) {
    setState({ error: `You can only be in up to ${MAX_JOINED_CHANNELS} channels at once — leave one first.` });
    return;
  }
  if (state.current) await leave(); // only one ACTIVE (talk-capable) channel at a time — monitors are separate

  // Joining never pops the panel open. The dock stays an orb until the user
  // taps it — same on desktop and mobile — so starting a line from the page,
  // the widget, or an auto-listen never throws a panel over their work.
  const startMinimized = true;

  setState({
    current: {
      conversationId,
      conversationName: conversationName ?? state.sessions[conversationId]?.conversationName ?? null,
      joining: true,
      listenOnly: !!opts?.listenOnly,
      micReady: false,
      transmitting: false,
      deafened: false,
      volume: defaultVolume,
      quality: "unknown",
      screenSharing: false,
      screenVersion: 0,
      // Open-mic model: you join muted, then unmute to hold the floor for as
      // long as you like. Nobody is ever live the instant they connect.
      micMuted: true,
    },
    minimized: startMinimized,
    error: null,
  });

  // Credentials must be in hand BEFORE any peer connection is constructed —
  // an RTCPeerConnection built without TURN can never acquire a relay
  // candidate later, no matter how the network turns out.
  await loadIceConfig();

  socket.emit(
    "yapline:join",
    { conversationId, listenOnly: !!opts?.listenOnly },
    (res: { ok: boolean; session?: YapSessionSummary; error?: string; movedFromAnotherDevice?: boolean }) => {
      if (!res?.ok || !res.session) {
        setState({ current: null, error: res?.error || "Could not join YapLine" });
        return;
      }
      setState({ sessions: { ...state.sessions, [conversationId]: res.session } });
      patchCurrent({
        joining: false,
        conversationName: res.session.conversationName ?? state.current?.conversationName ?? null,
      });
      // Grab the mic BEFORE building peer connections. Attaching it after
      // negotiation relies on replaceTrack landing on a live sender, and any
      // hiccup there ends with a connected user whose voice goes nowhere.
      // With the track in hand first, every offer carries real audio from the
      // first packet. It stays disabled (muted) until the user unmutes.
      const negotiate = () => {
        res.session!.participants
          .filter((p) => p.userId !== state.myUserId)
          .forEach((p) => createPeer(p.userId, true));
        startStatsLoop();
        startWatchdog();
      };
      if (opts?.listenOnly) {
        negotiate();
      } else {
        void ensureMic().finally(negotiate);
      }
      // You were already connected to this channel from another tab/device —
      // the server just moved that session here rather than starting fresh.
      // Without this, joining from your phone while still connected on your
      // PC looks like nothing happened here and a silent disconnect there.
      if (res.movedFromAnotherDevice) {
        toast.info("Moved your YapLine here — you were already connected on another device.");
      }
    }
  );
}

async function rejoin(conversationId: string, listenOnly: boolean) {
  teardownMedia();
  const name = state.current?.conversationName;
  setState({ current: null });
  await join(conversationId, name, { listenOnly });
}

async function leave(): Promise<void> {
  const cur = state.current;
  if (!cur) return;
  if (!cur.micMuted) micStream?.getAudioTracks().forEach((t) => (t.enabled = false));
  if (cur.screenSharing) stopScreenShare(true);
  socket?.emit("yapline:leave", { conversationId: cur.conversationId });
  teardownMedia();
  setState({ current: null });
}

async function pingChannel(conversationId: string, targetUserId?: string, targetName?: string): Promise<void> {
  await ensureInit();
  if (!socket) return;
  socket.emit(
    "yapline:ping-channel",
    { conversationId, targetUserId },
    (res: { ok: boolean; notified?: number; error?: string }) => {
      if (!res?.ok) {
        toast.error(res?.error || "Could not ping the channel.");
        return;
      }
      if (targetUserId) {
        toast.success(res.notified ? `Pinged ${targetName || "them"} to join.` : "They're already in the channel.");
        return;
      }
      toast.success(
        res.notified ? `Pinged ${res.notified} member${res.notified === 1 ? "" : "s"} to join.` : "Everyone's already here."
      );
    }
  );
}

async function ensureMic(): Promise<boolean> {
  if (micStream?.getAudioTracks().some((t) => t.readyState === "live")) return true;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const track = micStream.getAudioTracks()[0];
    // Open-mic: the track is live but disabled while muted. Toggling
    // `enabled` is instant and never renegotiates, so unmuting is immediate.
    track.enabled = !(state.current?.micMuted ?? true);
    peers.forEach((peer) => attachLocalTracks(peer));
    startVad();
    patchCurrent({ micReady: true, listenOnly: false });
    return true;
  } catch {
    setState({ error: "Microphone permission denied — YapLine is listen-only." });
    return false;
  }
}

/* ─── Voice activity detection ───────────────────────────────────────────────
 * With an open mic there's no button press to announce "I'm talking", so the
 * speaking rings are driven by actual sound. A cheap RMS meter on the mic
 * stream flips `speaking` with a short hang-time so normal pauses between
 * words don't strobe everyone's UI.
 * ------------------------------------------------------------------------ */

let vadTimer: ReturnType<typeof setInterval> | null = null;
let vadAnalyser: AnalyserNode | null = null;
let vadSource: MediaStreamAudioSourceNode | null = null;
/**
 * Derived from the DOM signature rather than written as a bare Float32Array.
 * TypeScript 5.7 made typed arrays generic over their backing buffer, so a
 * plain `Float32Array` annotation widens to `ArrayBufferLike` and stops
 * matching getFloatTimeDomainData. Reading the parameter type off AnalyserNode
 * keeps this correct on both old and new TypeScript.
 */
type TimeDomainBuffer = Parameters<AnalyserNode["getFloatTimeDomainData"]>[0];
let vadBuf: TimeDomainBuffer | null = null;
let vadSpeaking = false;
let vadQuietSince = 0;

const VAD_THRESHOLD = 0.012; // RMS floor — above room tone, below whispering
const VAD_HANG_MS = 450;     // keep "speaking" through short pauses

function startVad() {
  if (vadTimer != null || !micStream) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    vadSource = audioCtx.createMediaStreamSource(micStream);
    vadAnalyser = audioCtx.createAnalyser();
    vadAnalyser.fftSize = 1024;
    vadBuf = new Float32Array(vadAnalyser.fftSize);
    vadSource.connect(vadAnalyser);
  } catch {
    return; // no analyser: rings just won't animate, audio is unaffected
  }

  // setInterval, NOT requestAnimationFrame: rAF is frozen in background tabs,
  // which would leave the speaking flag stuck on whatever it was when the user
  // switched away — everyone else would see them "talking" forever.
  const tick = () => {
    const cur = state.current;
    if (!vadAnalyser || !vadBuf || !cur) return;

    // Muted mic can't be "speaking" — bail out and settle the flag.
    if (cur.micMuted) {
      if (vadSpeaking) emitSpeaking(false);
      return;
    }
    vadAnalyser.getFloatTimeDomainData(vadBuf);
    let sum = 0;
    for (let i = 0; i < vadBuf.length; i++) sum += vadBuf[i] * vadBuf[i];
    const rms = Math.sqrt(sum / vadBuf.length);

    const now = Date.now();
    if (rms > VAD_THRESHOLD) {
      vadQuietSince = 0;
      if (!vadSpeaking) emitSpeaking(true);
    } else if (vadSpeaking) {
      if (!vadQuietSince) vadQuietSince = now;
      else if (now - vadQuietSince > VAD_HANG_MS) emitSpeaking(false);
    }
  };
  vadTimer = setInterval(tick, 120);
}

function stopVad() {
  if (vadTimer != null) clearInterval(vadTimer);
  vadTimer = null;
  try { vadSource?.disconnect(); } catch { /* noop */ }
  vadSource = null;
  vadAnalyser = null;
  vadBuf = null;
  if (vadSpeaking) emitSpeaking(false);
}

function emitSpeaking(speaking: boolean) {
  vadSpeaking = speaking;
  if (!speaking) vadQuietSince = 0;
  patchCurrent({ transmitting: speaking });
  if (!state.current) return;
  socket?.emit("yapline:speaking", {
    conversationId: state.current.conversationId,
    speaking,
  });
}

/**
 * Open-mic control. `muted: false` opens the mic and keeps it open until the
 * user closes it again — no holding anything down, so people can talk
 * continuously.
 */
async function setMicMuted(muted: boolean): Promise<void> {
  const cur = state.current;
  if (!cur) return;
  if (!muted) {
    // Any click that unmutes is also a user gesture — good moment to clear a
    // blocked audio sink so the user isn't left mute AND deaf.
    void resumeAudio();
    if (!(await ensureMic())) return;
  }
  micStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  patchCurrent({ micMuted: muted });
  chirp(muted ? "in" : "out");
  if (muted && vadSpeaking) emitSpeaking(false);
}

async function toggleMic(): Promise<void> {
  await setMicMuted(!(state.current?.micMuted ?? true));
}

/**
 * Legacy push-to-talk entry points, kept so any caller still wired to
 * press/release keeps working: press unmutes, release is a no-op in open-mic
 * mode (the mic stays live until explicitly muted).
 */
async function startTransmit(): Promise<void> {
  await setMicMuted(false);
}

function stopTransmit(): void {
  /* open-mic: releasing a button no longer closes the mic */
}

async function startScreenShare(): Promise<void> {
  if (!state.current || state.current.screenSharing) return;
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 } },
      audio: false,
    });
  } catch {
    return; // user cancelled the picker
  }
  const track = screenStream.getVideoTracks()[0];
  track.onended = () => stopScreenShare(false);
  // Make sure every peer's video slot can actually send before the track goes
  // on it — a slot left recvonly accepts replaceTrack without complaint and
  // then quietly transmits nothing, which is what showed up as a black frame.
  peers.forEach((peer) => {
    captureSenders(peer);
    peer.pc.getTransceivers().forEach((t) => {
      if (t.sender === peer.videoSender && t.direction !== "sendrecv") {
        try { t.direction = "sendrecv"; } catch { /* read-only impls */ }
      }
    });
    attachLocalTracks(peer);
  });
  patchCurrent({ screenSharing: true });
  socket?.emit("yapline:screen", {
    conversationId: state.current.conversationId,
    sharing: true,
  });
}

function stopScreenShare(silent: boolean): void {
  const cur = state.current;
  screenStream?.getTracks().forEach((t) => t.stop());
  screenStream = null;
  peers.forEach((peer) => {
    if (peer.videoSender) {
      void peer.videoSender.replaceTrack(null).catch(() => { /* peer closing */ });
    }
  });
  if (cur) {
    patchCurrent({ screenSharing: false });
    if (!silent || cur.screenSharing) {
      socket?.emit("yapline:screen", { conversationId: cur.conversationId, sharing: false });
    }
  }
}

function setDeafened(deafened: boolean): void {
  patchCurrent({ deafened });
  peers.forEach((p) => { if (p.audioEl) p.audioEl.muted = deafened; });
  if (!deafened) void resumeAudio();
}

function setVolume(volume: number): void {
  const v = Math.min(1, Math.max(0, volume));
  defaultVolume = v;
  try { localStorage.setItem(LS_VOLUME, String(v)); } catch { /* ignore */ }
  patchCurrent({ volume: v });
  peers.forEach((p) => { if (p.audioEl) p.audioEl.volume = v; });
}

function setAutoListen(on: boolean): void {
  try { localStorage.setItem(LS_AUTO_LISTEN, on ? "1" : "0"); } catch { /* ignore */ }
  setState({ autoListen: on });
}

function setMinimized(min: boolean): void {
  setState({ minimized: min });
}

function setPttKey(key: string): void {
  try { localStorage.setItem(LS_PTT_KEY, key); } catch { /* ignore */ }
  setState({ pttKey: key });
}

export const yapline = {
  ensureInit,
  join,
  leave,
  pingChannel,
  startTransmit,
  stopTransmit,
  setMicMuted,
  toggleMic,
  resumeAudio,
  startScreenShare,
  stopScreenShare: () => stopScreenShare(false),
  setDeafened,
  setVolume,
  setAutoListen,
  setMinimized,
  setPttKey,
  joinMonitor,
  leaveMonitor,
  setMonitorVolume,
  setMonitorDeafened,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function subscribe(cb: () => void) {
  listeners.add(cb);
  void ensureInit();
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const serverSnapshot: YapLineState = {
  ready: false,
  audioBlocked: false,
  relayReady: false,
  myUserId: null,
  sessions: {},
  current: null,
  monitors: {},
  autoListen: false,
  minimized: true,
  pttKey: DEFAULT_PTT_KEY,
  error: null,
};
const getServerSnapshot = () => serverSnapshot;

export function useYapLine(): YapLineState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Sidebar badge: number of live sessions in the user's conversations. */
export function useYapLineActiveCount(): number {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Object.keys(s.sessions).length;
}