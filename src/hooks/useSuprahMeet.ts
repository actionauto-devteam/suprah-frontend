"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackgroundBlurVideoFrameProcessor, BackgroundReplacementVideoFrameProcessor,
  ConsoleLogger, DefaultActiveSpeakerPolicy, DefaultDeviceController,
  DefaultEventController, DefaultMeetingSession, DefaultVideoTransformDevice,
  LogLevel, MeetingSessionConfiguration, MeetingSessionStatusCode,
  NoOpEventReporter,
  type DataMessage, type MeetingSessionStatus, type VideoTileState,
} from "amazon-chime-sdk-js";
import { apiClient } from "@/lib/api-client";
import { meetSounds } from "@/lib/meet-sounds";

export interface MeetParticipantInfo {
  crmUserId: string;               // "guest:<id>" for external guests
  fullName: string;
  avatar?: string | null;
  role: "host" | "participant";
  isGuest?: boolean;
}
export interface RosterEntry {
  attendeeId: string;
  crmUserId: string;               // "guest:<id>" for external guests
  name: string;
  avatar?: string | null;
  muted: boolean;
  handRaised: boolean;
  isGuest?: boolean;
}
export interface TileInfo { tileId: number; attendeeId: string; isLocal: boolean; isContent: boolean; }
export interface ReactionEvent { id: string; emoji: string; name: string; }
export interface ChatMessage { id: string; name: string; text: string; at: number; isSelf: boolean; }
export interface MeetingInfo {
  _id: string; code: string; title: string;
  status: "scheduled" | "live" | "ended";
  startedAt?: string | null;       // set by the backend when the meeting goes live
  participants: MeetParticipantInfo[];
  recording: { status: string };
}

type Phase = "idle" | "joining" | "in" | "ended" | "error";

const DATA_TOPIC = "suprah-meet";
const CHAT_TOPIC = "meet-chat";
/* ── Virtual background scenes ──────────────────────────────────────────────
 * Drawn on a canvas at runtime (no image assets to host or load). The same
 * scenes power personal backgrounds AND Together Mode, where every camera is
 * replaced with the identical room so the grid reads as one shared space. */
export type MeetSceneKey = "showroom" | "office" | "skyline" | "midnight";
export type MeetBackground = "none" | "blur" | MeetSceneKey;

export const MEET_SCENES: { key: MeetSceneKey; label: string; css: string }[] = [
  { key: "showroom", label: "Emerald showroom", css: "linear-gradient(160deg,#071410 0%,#0d2b1f 55%,#134034 100%)" },
  { key: "office",   label: "Night office",     css: "linear-gradient(160deg,#0b1220 0%,#16213a 60%,#1f2c4d 100%)" },
  { key: "skyline",  label: "Dusk skyline",     css: "linear-gradient(180deg,#0b1026 0%,#25204d 55%,#5a2a53 100%)" },
  { key: "midnight", label: "Midnight",         css: "linear-gradient(160deg,#04060c 0%,#0a0f1d 100%)" },
];
const isSceneKey = (v: unknown): v is MeetSceneKey => MEET_SCENES.some((s) => s.key === v);

const sceneCache = new Map<MeetSceneKey, Blob>();
async function sceneBlob(key: MeetSceneKey): Promise<Blob> {
  const hit = sceneCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  const stops: Record<MeetSceneKey, [string, string, string]> = {
    showroom: ["#071410", "#0d2b1f", "#134034"],
    office:   ["#0b1220", "#16213a", "#1f2c4d"],
    skyline:  ["#0b1026", "#25204d", "#5a2a53"],
    midnight: ["#04060c", "#0a0f1d", "#0a0f1d"],
  };
  const [a, b, c] = stops[key];
  const g = ctx.createLinearGradient(0, 0, 320, 720);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
  if (key === "showroom") {          // faint digital grid, matches the room UI
    ctx.strokeStyle = "rgba(16,185,129,0.10)"; ctx.lineWidth = 1;
    for (let x = 0; x <= 1280; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
    for (let y = 0; y <= 720; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
  } else if (key === "skyline") {    // blocky building silhouettes on the horizon
    ctx.fillStyle = "rgba(5,8,20,0.9)";
    for (let x = 0; x < 1280; x += 90) {
      const h = 140 + ((x * 37) % 160);
      ctx.fillRect(x, 720 - h, 70, h);
    }
  } else if (key === "midnight") {   // sparse stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 90; i++) {
      const x = (i * 137.5) % 1280, y = (i * 89.7) % 500;
      ctx.fillRect(x, y, (i % 3) === 0 ? 2 : 1, (i % 3) === 0 ? 2 : 1);
    }
  } else {                           // office window panes
    ctx.fillStyle = "rgba(120,160,255,0.06)";
    for (let x = 120; x < 1200; x += 260) ctx.fillRect(x, 90, 180, 380);
  }
  // gentle vignette so faces pop
  const v = ctx.createRadialGradient(640, 330, 240, 640, 360, 900);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, 1280, 720);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((bl) => (bl ? res(bl) : rej(new Error("scene render failed"))), "image/jpeg", 0.9));
  sceneCache.set(key, blob);
  return blob;
}

/** ExternalUserId is "crmUserId#session" (see joinMeeting on the backend). */
const crmIdFrom = (externalUserId?: string) => (externalUserId || "").split("#")[0];

export function useSuprahMeet() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [canControl, setCanControl] = useState(false);
  const [selfAttendeeId, setSelfAttendeeId] = useState("");

  const [roster, setRoster] = useState<Record<string, RosterEntry>>({});
  const [tiles, setTiles] = useState<Record<number, TileInfo>>({});
  const [activeSpeakerId, setActiveSpeakerId] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);

  // Non-fatal problems (e.g. recording failed on AWS) — shown as a toast.
  const [notice, setNotice] = useState<string | null>(null);

  // Virtual backgrounds + Together Mode
  const [background, setBackgroundState] = useState<MeetBackground>("none");
  const [backgroundsSupported, setBackgroundsSupported] = useState(false);
  const [togetherScene, setTogetherSceneState] = useState<MeetSceneKey | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [videoDeviceCount, setVideoDeviceCount] = useState(0);

  const sessionRef = useRef<DefaultMeetingSession | null>(null);
  const namesRef = useRef<Map<string, MeetParticipantInfo>>(new Map());
  const selfNameRef = useRef("You");
  const selfCrmIdRef = useRef("");
  const codeRef = useRef("");
  const leftIntentionallyRef = useRef(false);
  const videoDevicesRef = useRef<{ deviceId: string; label: string }[]>([]);
  const camIndexRef = useRef(0);
  const joinedAtRef = useRef(0);
  const backgroundRef = useRef<MeetBackground>("none");
  const togetherRef = useRef<MeetSceneKey | null>(null);
  const togetherOwnerRef = useRef(false);        // did WE turn Together Mode on?
  const transformRef = useRef<DefaultVideoTransformDevice | null>(null);
  const applyTogetherRef = useRef<(scene: MeetSceneKey | null) => void>(() => {});
  // The hidden <audio> element (mounted in MeetSessionProvider). It mounts
  // BEFORE any meeting exists, so we remember it here and bind it during
  // join() — binding at mount time would hit a null session and remote audio
  // would never play.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // External-guest mode: set when join() is given a guest pass. All backend
  // calls then use the public /guest endpoints with this bearer token.
  const guestTokenRef = useRef<string | null>(null);
  // Screen-share hardening (mobile): wake lock while sharing + hard end
  // detection so remote tiles never freeze on a dead share.
  const wakeLockRef = useRef<any>(null);
  const sharingRef = useRef(false);
  const contentStreamRef = useRef<MediaStream | null>(null);
  // Whether a microphone input was ever successfully started. When mic access
  // is blocked, we JOIN ANYWAY (listen-only) instead of failing the whole
  // meeting with Chime's "Error fetching device." — and the mic button then
  // retries acquisition once the user unblocks it.
  const micStartedRef = useRef(false);

  const av = () => sessionRef.current?.audioVideo ?? null;

  const pushReaction = useCallback((emoji: string, name: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((r) => [...r.slice(-11), { id, emoji, name }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 3600);
  }, []);

  const refreshNames = useCallback(async () => {
    if (!codeRef.current) return;
    try {
      const res = guestTokenRef.current
        ? await apiClient.get(`/api/crm/meet/guest/${codeRef.current}/roster`,
            { headers: { Authorization: `Bearer ${guestTokenRef.current}` } })
        : await apiClient.get(`/api/crm/meet/meetings/${codeRef.current}`);
      const info = res.data?.data;
      const list: MeetParticipantInfo[] = info?.participants ?? [];
      list.forEach((p) => namesRef.current.set(p.crmUserId, p));
      setRoster((r) => {
        const next = { ...r };
        Object.values(next).forEach((entry) => {
          const known = namesRef.current.get(entry.crmUserId);
          if (known) {
            entry.name = known.fullName;
            entry.avatar = known.avatar ?? entry.avatar;
          }
        });
        return next;
      });
    } catch { /* best-effort */ }
  }, []);

  const join = useCallback(async (code: string, guest?: { token: string }) => {
    setPhase("joining");
    setError(null);
    setEndedReason(null);
    codeRef.current = code.trim().toUpperCase();
    guestTokenRef.current = guest?.token ?? null;
    try {
      const res = guestTokenRef.current
        ? await apiClient.post(`/api/crm/meet/guest/${codeRef.current}/join`, {},
            { headers: { Authorization: `Bearer ${guestTokenRef.current}` } })
        : await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/join`);
      const data = res.data?.data;
      const meetingInfo: MeetingInfo = data.meeting;
      setMeeting(meetingInfo);
      setCanControl(Boolean(data.self?.canControl));
      selfNameRef.current = data.self?.fullName || "You";
      selfCrmIdRef.current = data.self?.crmUserId || "";
      meetingInfo.participants.forEach((p) => namesRef.current.set(p.crmUserId, p));
      setRecording(meetingInfo.recording?.status === "recording");

      const logger = new ConsoleLogger("SuprahMeet", LogLevel.ERROR);
      const configuration = new MeetingSessionConfiguration(data.chime.Meeting, data.chime.Attendee);
      const deviceController = new DefaultDeviceController(logger);
      // NoOpEventReporter silences the "Unhandled type received while
      // flattening attributes" telemetry error from Chime's default reporter.
      const eventController = new DefaultEventController(configuration, logger, new NoOpEventReporter());
      const session = new DefaultMeetingSession(configuration, logger, deviceController, eventController);
      sessionRef.current = session;
      setSelfAttendeeId(data.chime.Attendee.AttendeeId);

      const audioVideo = session.audioVideo;

      // Smoothness: cap outgoing video so uplinks never choke the call.
      audioVideo.chooseVideoInputQuality(960, 540, 15);
      audioVideo.setVideoMaxBandwidthKbps(1000);

      audioVideo.realtimeSubscribeToAttendeeIdPresence((attendeeId, present, externalUserId) => {
        if (attendeeId.includes("#content")) return;
        if (present) {
          const crmUserId = crmIdFrom(externalUserId);
          const isGuestAtt = crmUserId.startsWith("guest:");
          const known = crmUserId ? namesRef.current.get(crmUserId) : undefined;
          const isSelf = attendeeId === data.chime.Attendee.AttendeeId;
          setRoster((r) => ({
            ...r,
            [attendeeId]: {
              attendeeId, crmUserId,
              name: isSelf ? selfNameRef.current : known?.fullName || (isGuestAtt ? "Guest" : "Joining…"),
              avatar: known?.avatar ?? null,
              muted: false, handRaised: false,
              isGuest: isGuestAtt,
            },
          }));
          if (!known && !isSelf) void refreshNames();
          if (!isSelf && Date.now() - joinedAtRef.current > 2000) meetSounds.join();
          audioVideo.realtimeSubscribeToVolumeIndicator(attendeeId, (_id, _volume, muted) => {
            if (muted === null) return;
            setRoster((r) => (r[attendeeId] ? { ...r, [attendeeId]: { ...r[attendeeId], muted } } : r));
          });
        } else {
          audioVideo.realtimeUnsubscribeFromVolumeIndicator(attendeeId);
          if (Date.now() - joinedAtRef.current > 2000) meetSounds.leave();
          setRoster((r) => { const next = { ...r }; delete next[attendeeId]; return next; });
        }
      });

      audioVideo.subscribeToActiveSpeakerDetector(
        new DefaultActiveSpeakerPolicy(), (ids) => setActiveSpeakerId(ids[0] ?? "")
      );

      audioVideo.addObserver({
        videoTileDidUpdate: (tileState: VideoTileState) => {
          if (!tileState.tileId || !tileState.boundAttendeeId) return;
          setTiles((t) => ({
            ...t,
            [tileState.tileId!]: {
              tileId: tileState.tileId!,
              attendeeId: tileState.boundAttendeeId!,
              isLocal: Boolean(tileState.localTile),
              isContent: Boolean(tileState.isContent),
            },
          }));
        },
        videoTileWasRemoved: (tileId: number) => {
          setTiles((t) => { const next = { ...t }; delete next[tileId]; return next; });
        },
        audioVideoDidStop: (status: MeetingSessionStatus) => {
          if (leftIntentionallyRef.current) return;
          const code = status.statusCode();
          if (code === MeetingSessionStatusCode.MeetingEnded) {
            setEndedReason("The host ended this meeting for everyone.");
          } else if (code === MeetingSessionStatusCode.AudioJoinedFromAnotherDevice) {
            setEndedReason("You joined this meeting from another device, so this session was disconnected.");
          } else if (code !== MeetingSessionStatusCode.Left) {
            setEndedReason("The connection to the meeting was lost.");
          }
          setPhase("ended");
        },
      });

      audioVideo.addContentShareObserver({
        contentShareDidStop: () => { sharingRef.current = false; setSharing(false); releaseWakeLock(); },
      });

      audioVideo.realtimeSubscribeToReceiveDataMessage(DATA_TOPIC, (msg: DataMessage) => {
        try {
          const payload = JSON.parse(msg.text());
          if (payload.t === "reaction") { pushReaction(payload.emoji, payload.name); meetSounds.reaction(); }
          if (payload.t === "hand") {
            if (payload.up) meetSounds.hand();
            setRoster((r) =>
              r[msg.senderAttendeeId]
                ? { ...r, [msg.senderAttendeeId]: { ...r[msg.senderAttendeeId], handRaised: Boolean(payload.up) } }
                : r
            );
          }
          if (payload.t === "recording") {
            setRecording(Boolean(payload.on));
            if (payload.on) meetSounds.recording();
          }
          if (payload.t === "together") {
            applyTogetherRef.current(isSceneKey(payload.scene) ? payload.scene : null);
          }
        } catch { /* ignore malformed */ }
      });

      audioVideo.realtimeSubscribeToReceiveDataMessage(CHAT_TOPIC, (msg: DataMessage) => {
        try {
          const payload = JSON.parse(msg.text());
          setChatMessages((m) => [...m, {
            id: `${msg.timestampMs}-${msg.senderAttendeeId}`,
            name: payload.name || "Unknown",
            text: String(payload.text || ""),
            at: msg.timestampMs,
            isSelf: false,
          }]);
          setChatUnread((u) => u + 1);
          meetSounds.chat();
        } catch { /* ignore */ }
      });

      // Devices: NEVER let a blocked/busy mic or camera kill the join.
      // (Chime throws GetUserMediaError "Error fetching device." when the
      // browser refuses the device — e.g. permissions set to Block.)
      micStartedRef.current = false;
      try {
        const audioInputs = await audioVideo.listAudioInputDevices();
        if (audioInputs[0]) {
          await audioVideo.startAudioInput(audioInputs[0].deviceId);
          micStartedRef.current = true;
        }
      } catch { /* mic blocked or in use — join listen-only */ }

      try {
        const videoInputs = await audioVideo.listVideoInputDevices();
        videoDevicesRef.current = videoInputs.map((d) => ({ deviceId: d.deviceId, label: d.label || "" }));
      } catch { videoDevicesRef.current = []; }
      const frontIdx = videoDevicesRef.current.findIndex((d) => /front|user/i.test(d.label));
      camIndexRef.current = frontIdx >= 0 ? frontIdx : 0;
      setVideoDeviceCount(videoDevicesRef.current.length);

      // Bind remote audio NOW — the provider's <audio> element mounted long
      // before this session existed, so its ref-time bind was a no-op.
      if (audioElRef.current) {
        await audioVideo.bindAudioElement(audioElRef.current).catch(() => {});
      }

      audioVideo.start();
      joinedAtRef.current = Date.now();
      setMicOn(micStartedRef.current);
      if (!micStartedRef.current) {
        setNotice("You've joined without a microphone — the browser is blocking it (or another app is using it). Allow the mic in the site permissions, then tap the mic button.");
      }
      setPhase("in");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Could not join the meeting.");
      setPhase("error");
    }
  }, [pushReaction, refreshNames]);

  const bindAudio = useCallback((el: HTMLAudioElement | null) => {
    audioElRef.current = el;
    if (el) void av()?.bindAudioElement(el).catch(() => {});
  }, []);
  const bindVideoTile = useCallback((tileId: number, el: HTMLVideoElement | null) => {
    if (el) av()?.bindVideoElement(tileId, el);
  }, []);

  const toggleMic = useCallback(async () => {
    const audioVideo = av();
    if (!audioVideo) return;
    if (micOn) {
      audioVideo.realtimeMuteLocalAudio();
      setMicOn(false);
      return;
    }
    // If the mic was blocked at join time, retry acquiring it now (the user
    // may have just allowed it in the browser's site permissions).
    if (!micStartedRef.current) {
      try {
        const audioInputs = await audioVideo.listAudioInputDevices();
        if (!audioInputs[0]) throw new Error("no mic");
        await audioVideo.startAudioInput(audioInputs[0].deviceId);
        micStartedRef.current = true;
      } catch {
        setNotice("The microphone is still blocked. Open the browser's site permissions for suprah-app.com, set Microphone to Allow, then try again.");
        return;
      }
    }
    audioVideo.realtimeUnmuteLocalAudio();
    setMicOn(true);
  }, [micOn]);

  // Backgrounds need WebGL2 + WASM — probe once, hide the UI when unsupported.
  useEffect(() => {
    let on = true;
    void (async () => {
      try {
        const [blur, repl] = await Promise.all([
          BackgroundBlurVideoFrameProcessor.isSupported(),
          BackgroundReplacementVideoFrameProcessor.isSupported(),
        ]);
        if (on) setBackgroundsSupported(Boolean(blur && repl));
      } catch { if (on) setBackgroundsSupported(false); }
    })();
    return () => { on = false; };
  }, []);

  /** Together Mode overrides the personal background while it is active. */
  const effectiveBackground = () => togetherRef.current ?? backgroundRef.current;

  const stopTransform = useCallback(async () => {
    const t = transformRef.current;
    transformRef.current = null;
    if (t) await t.stop().catch(() => {});
  }, []);

  /** Wrap the raw camera in a blur/replacement pipeline when one is wanted. */
  const buildVideoDevice = useCallback(async (deviceId: string) => {
    await stopTransform();
    const wanted = effectiveBackground();
    if (wanted === "none") return deviceId;
    try {
      const processor = wanted === "blur"
        ? await BackgroundBlurVideoFrameProcessor.create()
        : await BackgroundReplacementVideoFrameProcessor.create(undefined, {
            imageBlob: await sceneBlob(wanted),
          });
      if (!processor || !sessionRef.current) return deviceId;
      const device = new DefaultVideoTransformDevice(
        sessionRef.current.logger, deviceId, [processor]);
      transformRef.current = device;
      return device;
    } catch {
      return deviceId; // effect unavailable → plain camera, never break video
    }
  }, [stopTransform]);

  const startCamAt = useCallback(async (index: number) => {
    const audioVideo = av();
    const device = videoDevicesRef.current[index];
    if (!audioVideo || !device) throw new Error("No camera found");
    await audioVideo.startVideoInput(await buildVideoDevice(device.deviceId));
    audioVideo.startLocalVideoTile();
    camIndexRef.current = index;
  }, [buildVideoDevice]);

  const toggleCam = useCallback(async () => {
    const audioVideo = av();
    if (!audioVideo) return;
    try {
      if (camOn) {
        audioVideo.stopLocalVideoTile();
        await audioVideo.stopVideoInput();
        await stopTransform();
        setCamOn(false);
      } else {
        if (videoDevicesRef.current.length === 0) {
          const inputs = await audioVideo.listVideoInputDevices();
          videoDevicesRef.current = inputs.map((d) => ({ deviceId: d.deviceId, label: d.label || "" }));
          setVideoDeviceCount(videoDevicesRef.current.length);
        }
        await startCamAt(camIndexRef.current);
        setCamOn(true);
      }
    } catch { setCamOn(false); }
  }, [camOn, startCamAt, stopTransform]);

  /** Mobile back/front camera flip — cycles through available cameras. */
  const switchCamera = useCallback(async () => {
    if (!camOn || videoDevicesRef.current.length < 2) return;
    const next = (camIndexRef.current + 1) % videoDevicesRef.current.length;
    try { await startCamAt(next); } catch { /* keep current camera */ }
  }, [camOn, startCamAt]);

  const facingBack = () => /back|rear|environment/i.test(videoDevicesRef.current[camIndexRef.current]?.label || "");

  /** Pick a personal background ("none" | "blur" | scene). */
  const setBackground = useCallback(async (next: MeetBackground) => {
    backgroundRef.current = next;
    setBackgroundState(next);
    if (togetherRef.current) return;         // Together Mode wins until it's off
    if (camOn) { try { await startCamAt(camIndexRef.current); } catch { /* keep cam */ } }
  }, [camOn, startCamAt]);

  const applyTogether = useCallback(async (scene: MeetSceneKey | null) => {
    if (togetherRef.current === scene) return;
    togetherRef.current = scene;
    setTogetherSceneState(scene);
    if (scene === null) togetherOwnerRef.current = false;
    if (camOn) { try { await startCamAt(camIndexRef.current); } catch { /* keep cam */ } }
  }, [camOn, startCamAt]);
  useEffect(() => {
    applyTogetherRef.current = (scene) => { void applyTogether(scene); };
  }, [applyTogether]);


  /** Can this browser REALLY capture a screen? Phone browsers cannot — iOS
   *  has no screen capture for web at all, and Android Chrome DEFINES
   *  getDisplayMedia but always rejects it with NotAllowedError (a known
   *  quirk that fools plain feature detection). So: mobile UA → treat as
   *  unsupported and present the BACK CAMERA as the shared content instead,
   *  which works on every phone today. True phone screen-share requires the
   *  native companion app (ReplayKit / MediaProjection). */
  const isMobileUA =
    typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      // iPadOS reports itself as desktop Safari ("MacIntel") but has touch.
      ((navigator as any).platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1));
  const shareSupported =
    !isMobileUA &&
    typeof navigator !== "undefined" &&
    Boolean((navigator.mediaDevices as any)?.getDisplayMedia);

  const acquireWakeLock = useCallback(async () => {
    try { wakeLockRef.current = await (navigator as any).wakeLock?.request?.("screen") ?? null; }
    catch { /* not granted / unsupported — share still works */ }
  }, []);
  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release?.(); } catch { /* already gone */ }
    wakeLockRef.current = null;
  }, []);
  // The OS releases the wake lock when the app backgrounds; re-acquire when
  // the user comes back so a long share doesn't die to the screen dimming.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && wakeLockRef.current === null && sharingRef.current) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWakeLock]);

  const markShareStopped = useCallback(() => {
    sharingRef.current = false;
    setSharing(false);
    // Stop any camera track we opened for the mobile fallback presentation.
    try { contentStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* gone */ }
    contentStreamRef.current = null;
    releaseWakeLock();
  }, [releaseWakeLock]);

  const toggleShare = useCallback(async () => {
    const audioVideo = av();
    if (!audioVideo) return;
    if (sharing) {
      audioVideo.stopContentShare();
      markShareStopped();
    } else {
      try {
        let stream: MediaStream | undefined;
        if (shareSupported) {
          // Desktop: capture the screen OURSELVES instead of via Chime's
          // startContentShareFromScreenCapture. Chime wraps every failure —
          // including a plain picker cancel — in GetUserMediaError ("Error
          // fetching device.") and, depending on SDK version, drops the real
          // cause, making cancels impossible to tell apart from failures.
          // Raw getDisplayMedia keeps real DOMException names (NotAllowedError
          // on cancel, NotReadableError when the OS blocks capture).
          stream = await (navigator.mediaDevices as any).getDisplayMedia({
            video: { frameRate: { ideal: 15 } },
            audio: false,
          });
          contentStreamRef.current = stream ?? null;
          if (stream) await audioVideo.startContentShare(stream);
        } else {
          // Phones: no mobile browser can capture the screen (Android Chrome
          // and iOS Safari both lack getDisplayMedia — OS-level capture needs
          // a native app). WORKING fallback: present the BACK CAMERA as the
          // shared content, full-screen for everyone — point the phone at the
          // vehicle, document, or whiteboard you want to show.
          //
          // Phones usually allow only ONE camera open at a time: if the
          // meeting camera is already running, acquiring a second one throws
          // Chime's "Error fetching device." — so release ours first.
          if (camOn) {
            try {
              audioVideo.stopLocalVideoTile();
              await audioVideo.stopVideoInput();
              await stopTransform();
              setCamOn(false);
            } catch { /* keep going — the capture below may still work */ }
          }
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
          } catch {
            // Some devices misreport facingMode — retry with any camera.
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
          contentStreamRef.current = stream;
          await audioVideo.startContentShare(stream);
          setNotice("Phone browsers can't capture the screen, so you're presenting your BACK CAMERA instead — point it at what you want to show. Your meeting camera was turned off to free the lens.");
        }
        sharingRef.current = true;
        setSharing(true);
        void acquireWakeLock();
        // The OS/browser can kill the broadcast at any time (stop button,
        // permission revoked, device locked). Tear Chime's share down the
        // instant the track dies so nobody is left seeing a frozen frame.
        stream?.getVideoTracks?.().forEach((t) =>
          t.addEventListener("ended", () => {
            try { audioVideo.stopContentShare(); } catch { /* already stopped */ }
            markShareStopped();
          })
        );
      } catch (err: any) {
        // Chime wraps capture failures in GetUserMediaError, whose message is
        // the unhelpful "Error fetching device." — the REAL reason sits in
        // err.cause. A plain CANCEL of the share picker lands here too (cause
        // NotAllowedError), and must stay silent.
        const cause = err?.cause;
        const name: string = cause?.name || err?.name || "";
        if (name === "NotAllowedError") { markShareStopped(); return; }
        if (name === "NotReadableError" || name === "AbortError") {
          setNotice(shareSupported
            ? "The screen couldn't be captured — the operating system is blocking it. On a Mac: System Settings → Privacy & Security → Screen Recording → allow your browser, then restart the browser."
            : "The camera couldn't be started — it may be in use by another app. Close other camera apps and try again.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setNotice("No usable camera/screen source was found on this device.");
        } else {
          setNotice(`Couldn't start sharing${cause?.message || err?.message ? `: ${cause?.message || err.message}` : "."}`);
        }
        markShareStopped();
      }
    }
  }, [sharing, shareSupported, camOn, stopTransform, acquireWakeLock, markShareStopped]);

  const sendData = useCallback((topic: string, payload: Record<string, unknown>, lifetimeMs = 5000) => {
    av()?.realtimeSendDataMessage(topic, JSON.stringify(payload), lifetimeMs);
  }, []);

  /** Host/admin: put EVERYONE in the same room (scene), or null to turn it off. */
  const toggleTogether = useCallback((scene: MeetSceneKey | null) => {
    togetherOwnerRef.current = scene !== null;
    sendData(DATA_TOPIC, { t: "together", scene }, 300_000);
    void applyTogether(scene);
  }, [sendData, applyTogether]);

  // Late joiners: whoever turned Together Mode on rebroadcasts the scene every
  // 8s, so someone who joins mid-meeting lands in the same room.
  useEffect(() => {
    if (!togetherScene || !togetherOwnerRef.current) return;
    const t = setInterval(
      () => sendData(DATA_TOPIC, { t: "together", scene: togetherScene }, 300_000), 8000);
    return () => clearInterval(t);
  }, [togetherScene, sendData]);

  const sendReaction = useCallback((emoji: string) => {
    sendData(DATA_TOPIC, { t: "reaction", emoji, name: selfNameRef.current });
    pushReaction(emoji, selfNameRef.current);
    meetSounds.reaction();
  }, [pushReaction, sendData]);

  const toggleHand = useCallback(() => {
    const up = !handRaised;
    setHandRaised(up);
    if (up) meetSounds.hand();
    sendData(DATA_TOPIC, { t: "hand", up }, 300_000);
    const selfId = sessionRef.current?.configuration.credentials?.attendeeId ?? "";
    setRoster((r) => (r[selfId] ? { ...r, [selfId]: { ...r[selfId], handRaised: up } } : r));
  }, [handRaised, sendData]);

  const sendChat = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    sendData(CHAT_TOPIC, { name: selfNameRef.current, text: clean }, 60_000);
    setChatMessages((m) => [...m, {
      id: `${Date.now()}-self`, name: selfNameRef.current, text: clean, at: Date.now(), isSelf: true,
    }]);
  }, [sendData]);

  const markChatRead = useCallback(() => setChatUnread(0), []);

  // Recording failures are NON-FATAL: caught here, surfaced via `notice`,
  // never thrown — so the room stays up and nothing hits the console as an
  // unhandled rejection.
  const startRecording = useCallback(async () => {
    try {
      await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/recording/start`);
      setRecording(true);
      meetSounds.recording();
      sendData(DATA_TOPIC, { t: "recording", on: true }, 300_000);
    } catch (err: any) {
      setNotice(err?.response?.data?.message ||
        "Recording could not start. Check the backend logs for the AWS reason.");
    }
  }, [sendData]);

  const stopRecording = useCallback(async () => {
    try {
      await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/recording/stop`);
      setRecording(false);
      sendData(DATA_TOPIC, { t: "recording", on: false }, 300_000);
    } catch (err: any) {
      setNotice(err?.response?.data?.message ||
        "Recording could not be stopped. Check the backend logs for the AWS reason.");
    }
  }, [sendData]);

  const teardown = useCallback(async () => {
    const audioVideo = av();
    if (audioVideo) {
      try {
        audioVideo.stopContentShare();
        audioVideo.stopLocalVideoTile();
        await audioVideo.stopVideoInput();
        await stopTransform();
        await audioVideo.stopAudioInput();
        audioVideo.stop();
      } catch { /* best effort */ }
    }
    releaseWakeLock();
    sessionRef.current = null;
  }, [stopTransform, releaseWakeLock]);

  const leave = useCallback(async () => {
    leftIntentionallyRef.current = true;
    await teardown();
    const leaveUrl = guestTokenRef.current
      ? `/api/crm/meet/guest/${codeRef.current}/leave`
      : `/api/crm/meet/meetings/${codeRef.current}/leave`;
    apiClient.post(leaveUrl, {}, guestTokenRef.current
      ? { headers: { Authorization: `Bearer ${guestTokenRef.current}` } }
      : undefined).catch(() => {});
    setPhase("ended");
  }, [teardown]);

  const endMeeting = useCallback(async () => {
    leftIntentionallyRef.current = true;
    try {
      await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/end`);
    } catch (err: any) {
      leftIntentionallyRef.current = false;
      setNotice(err?.response?.data?.message || "Could not end the meeting.");
      return;
    }
    await teardown();
    setEndedReason(null);
    setPhase("ended");
  }, [teardown]);

  useEffect(() => () => { leftIntentionallyRef.current = true; void teardown(); }, [teardown]);

  return {
    phase, error, endedReason, meeting, canControl, selfAttendeeId, shareSupported,
    roster, tiles: Object.values(tiles), activeSpeakerId,
    micOn, camOn, sharing, handRaised, recording, reactions,
    chatMessages, chatUnread, videoDeviceCount,
    notice, clearNotice,
    background, setBackground, backgroundsSupported,
    togetherScene, toggleTogether,
    isBackCamera: facingBack(),
    join, bindAudio, bindVideoTile,
    toggleMic, toggleCam, switchCamera, toggleShare, toggleHand,
    sendReaction, sendChat, markChatRead,
    startRecording, stopRecording, leave, endMeeting,
  };
}