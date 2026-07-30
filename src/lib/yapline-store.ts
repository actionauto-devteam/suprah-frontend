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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// STUN only — fine on most office/LAN networks. For strict NATs in
// production, add a TURN server here (e.g. coturn on the EC2 box).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

const LS_AUTO_LISTEN = "yapline_auto_listen";
const LS_VOLUME = "yapline_volume";

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
}

export interface YapLineState {
  ready: boolean;                 // socket connected + authed
  myUserId: string | null;
  sessions: Record<string, YapSessionSummary>;
  current: YapCurrent | null;
  autoListen: boolean;
  minimized: boolean;
  error: string | null;
}

// ─── Snapshot store ──────────────────────────────────────────────────────────

let state: YapLineState = {
  ready: false,
  myUserId: null,
  sessions: {},
  current: null,
  autoListen: true,
  minimized: false,
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
}

let socket: Socket | null = null;
let initPromise: Promise<void> | null = null;
let micStream: MediaStream | null = null;
let screenStream: MediaStream | null = null;
const peers = new Map<string, Peer>();
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
      setState({ autoListen: al === null ? true : al === "1" });
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
    });

    // ── In-session events (yap:{conv} room) ──────────────────────────────
    socket.on("yapline:peer-joined", ({ conversationId }: any) => {
      // The newcomer initiates offers toward US — nothing to do but wait for
      // their signal. Roster refresh comes via session-update.
      if (state.current?.conversationId !== conversationId) return;
    });

    socket.on("yapline:peer-left", ({ conversationId, userId }: any) => {
      if (state.current?.conversationId !== conversationId) return;
      closePeer(userId);
    });

    socket.on("yapline:signal", (msg: { conversationId: string; from: string; data: any }) => {
      if (state.current?.conversationId !== msg.conversationId) return;
      void handleSignal(msg.from, msg.data);
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
      if (state.current?.conversationId !== conversationId) return;
      teardownMedia();
      setState({ current: null, error: "YapLine session moved to another tab." });
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

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const polite = (state.myUserId || "") > peerId;
  const peer: Peer = { pc, polite, makingOffer: false, ignoreOffer: false, audioEl: null };
  peers.set(peerId, peer);

  if (initiate) {
    // Fixed media slots — replaceTrack() later, never renegotiate.
    pc.addTransceiver("audio", { direction: "sendrecv" });
    pc.addTransceiver("video", { direction: "sendrecv" });
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
    if (pc.iceConnectionState === "failed") pc.restartIce();
  };

  pc.ontrack = (e) => {
    if (e.track.kind === "audio") {
      const el = peer.audioEl || new Audio();
      peer.audioEl = el;
      el.autoplay = true;
      el.srcObject = e.streams[0] || new MediaStream([e.track]);
      el.volume = state.current?.volume ?? defaultVolume;
      el.muted = !!state.current?.deafened;
      void el.play().catch(() => { /* resumes on next user gesture */ });
    } else {
      remoteScreens.set(peerId, e.streams[0] || new MediaStream([e.track]));
      bumpScreenVersion();
      e.track.onended = () => {
        remoteScreens.delete(peerId);
        bumpScreenVersion();
      };
    }
  };

  return peer;
}

function attachLocalTracks(peer: Peer) {
  const micTrack = micStream?.getAudioTracks()[0] || null;
  const screenTrack = screenStream?.getVideoTracks()[0] || null;
  peer.pc.getTransceivers().forEach((t) => {
    const kind = t.receiver.track?.kind || (t as any).kind;
    if (kind === "audio" && micTrack) void t.sender.replaceTrack(micTrack);
    if (kind === "video" && screenTrack) void t.sender.replaceTrack(screenTrack);
  });
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
        // Answerer side: transceivers were created by the remote offer —
        // hang our local tracks (if any) on them before answering.
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
  if (peer.audioEl) {
    peer.audioEl.srcObject = null;
    peer.audioEl = null;
  }
  if (remoteScreens.delete(userId)) bumpScreenVersion();
}

function bumpScreenVersion() {
  if (state.current) patchCurrent({ screenVersion: state.current.screenVersion + 1 });
}

function teardownMedia() {
  [...peers.keys()].forEach(closePeer);
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  screenStream?.getTracks().forEach((t) => t.stop());
  screenStream = null;
  remoteScreens.clear();
  if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }
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
  if (state.current) await leave(); // one session at a time — like a real radio

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
    },
    minimized: false,
    error: null,
  });

  socket.emit(
    "yapline:join",
    { conversationId, listenOnly: !!opts?.listenOnly },
    (res: { ok: boolean; session?: YapSessionSummary; error?: string }) => {
      if (!res?.ok || !res.session) {
        setState({ current: null, error: res?.error || "Could not join YapLine" });
        return;
      }
      setState({ sessions: { ...state.sessions, [conversationId]: res.session } });
      patchCurrent({
        joining: false,
        conversationName: res.session.conversationName ?? state.current?.conversationName ?? null,
      });
      // We are the newcomer: initiate a peer connection to every existing member.
      res.session.participants
        .filter((p) => p.userId !== state.myUserId)
        .forEach((p) => createPeer(p.userId, true));
      startStatsLoop();
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
  if (cur.transmitting) stopTransmit();
  if (cur.screenSharing) stopScreenShare(true);
  socket?.emit("yapline:leave", { conversationId: cur.conversationId });
  teardownMedia();
  setState({ current: null });
}

async function ensureMic(): Promise<boolean> {
  if (micStream?.getAudioTracks().some((t) => t.readyState === "live")) return true;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const track = micStream.getAudioTracks()[0];
    track.enabled = false; // PTT: closed until the button is held
    peers.forEach((peer) => attachLocalTracks(peer));
    patchCurrent({ micReady: true, listenOnly: false });
    return true;
  } catch {
    setState({ error: "Microphone permission denied — YapLine is listen-only." });
    return false;
  }
}

async function startTransmit(): Promise<void> {
  if (!state.current || state.current.transmitting) return;
  if (!(await ensureMic())) return;
  micStream?.getAudioTracks().forEach((t) => (t.enabled = true));
  chirp("out");
  patchCurrent({ transmitting: true });
  socket?.emit("yapline:speaking", {
    conversationId: state.current.conversationId,
    speaking: true,
  });
}

function stopTransmit(): void {
  if (!state.current) return;
  micStream?.getAudioTracks().forEach((t) => (t.enabled = false));
  if (state.current.transmitting) {
    socket?.emit("yapline:speaking", {
      conversationId: state.current.conversationId,
      speaking: false,
    });
  }
  patchCurrent({ transmitting: false });
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
  peers.forEach((peer) => attachLocalTracks(peer));
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
    peer.pc.getTransceivers().forEach((t) => {
      const kind = t.receiver.track?.kind || (t as any).kind;
      if (kind === "video") void t.sender.replaceTrack(null);
    });
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

export const yapline = {
  ensureInit,
  join,
  leave,
  startTransmit,
  stopTransmit,
  startScreenShare,
  stopScreenShare: () => stopScreenShare(false),
  setDeafened,
  setVolume,
  setAutoListen,
  setMinimized,
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
  myUserId: null,
  sessions: {},
  current: null,
  autoListen: true,
  minimized: false,
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