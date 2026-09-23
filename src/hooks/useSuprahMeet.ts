"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConsoleLogger, DefaultActiveSpeakerPolicy, DefaultDeviceController,
  DefaultEventController, DefaultMeetingSession, LogLevel,
  MeetingSessionConfiguration, MeetingSessionStatusCode, NoOpEventReporter,
  type DataMessage, type MeetingSessionStatus, type VideoTileState,
} from "amazon-chime-sdk-js";
import { apiClient } from "@/lib/api-client";
import { meetSounds } from "@/lib/meet-sounds";
import { resolveImageUrl } from "@/lib/utils";
import { MeetSceneRecorder, type SceneData } from "@/lib/meet-scene-recorder";

export interface MeetParticipantInfo {
  crmUserId: string;
  fullName: string;
  avatar?: string | null;
  role: "host" | "participant";
}
export interface RosterEntry {
  attendeeId: string;
  crmUserId: string;
  name: string;
  avatar?: string | null;
  muted: boolean;
  handRaised: boolean;
}
export interface TileInfo { tileId: number; attendeeId: string; isLocal: boolean; isContent: boolean; }
export interface ReactionEvent { id: string; emoji: string; name: string; }
export interface ChatMessage { id: string; name: string; text: string; at: number; isSelf: boolean; }
export interface MeetingInfo {
  _id: string; code: string; title: string;
  status: "scheduled" | "live" | "ended";
  participants: MeetParticipantInfo[];
  recording: { status: string };
}

type Phase = "idle" | "joining" | "in" | "ended" | "error";

const DATA_TOPIC = "suprah-meet";
const CHAT_TOPIC = "meet-chat";
/** ExternalUserId is "crmUserId#session" (see joinMeeting on the backend). */
const crmIdFrom = (externalUserId?: string) => (externalUserId || "").split("#")[0];
/** Content attendee ids are "<attendeeId>#content" — this returns the owner. */
const contentOwner = (attendeeId: string) => attendeeId.split("#")[0];

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
  const clearNotice = useCallback(() => setNotice(null), []);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [videoDeviceCount, setVideoDeviceCount] = useState(0);

  /** Attendee whose content share is the recording scene — hidden from the UI. */
  const [sceneAttendee, setSceneAttendee] = useState("");

  const sessionRef = useRef<DefaultMeetingSession | null>(null);
  const namesRef = useRef<Map<string, MeetParticipantInfo>>(new Map());
  const selfNameRef = useRef("You");
  const selfCrmIdRef = useRef("");
  const selfAttendeeIdRef = useRef("");
  const codeRef = useRef("");
  const leftIntentionallyRef = useRef(false);
  const videoDevicesRef = useRef<{ deviceId: string; label: string }[]>([]);
  const camIndexRef = useRef(0);
  const joinedAtRef = useRef(0);

  // ── Scene-share machinery (the "never black MP4" recorder) ──────────
  const tilesStoreRef = useRef<Record<number, TileInfo>>({});
  const videoElsRef = useRef<Map<number, HTMLVideoElement>>(new Map());
  const rosterRef = useRef<Record<string, RosterEntry>>({});
  const activeSpeakerRef = useRef("");
  const meetingRef = useRef<MeetingInfo | null>(null);
  const localRecorderRef = useRef(false);   // THIS client pressed Record
  const userSharingRef = useRef(false);     // real screen share by this client
  const remoteContentRef = useRef(false);   // someone else is sharing content
  const sceneOnRef = useRef(false);
  const sceneRecRef = useRef<MeetSceneRecorder | null>(null);
  const sceneAnnounceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ignoreNextShareStopRef = useRef(false);

  useEffect(() => { rosterRef.current = roster; }, [roster]);
  useEffect(() => { activeSpeakerRef.current = activeSpeakerId; }, [activeSpeakerId]);
  useEffect(() => { meetingRef.current = meeting; }, [meeting]);

  const av = () => sessionRef.current?.audioVideo ?? null;

  const pushReaction = useCallback((emoji: string, name: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((r) => [...r.slice(-11), { id, emoji, name }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 3600);
  }, []);

  const refreshNames = useCallback(async () => {
    if (!codeRef.current) return;
    try {
      const res = await apiClient.get(`/api/crm/meet/meetings/${codeRef.current}`);
      const info: MeetingInfo = res.data?.data;
      info.participants.forEach((p) => namesRef.current.set(p.crmUserId, p));
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

  const sendData = useCallback((topic: string, payload: Record<string, unknown>, lifetimeMs = 5000) => {
    av()?.realtimeSendDataMessage(topic, JSON.stringify(payload), lifetimeMs);
  }, []);

  /* ── Scene share: build, announce, and keep in sync ─────────────── */

  const buildScene = useCallback((): SceneData => {
    const attendeeToVideo = new Map<string, HTMLVideoElement>();
    Object.values(tilesStoreRef.current).forEach((t) => {
      if (t.isContent) return;
      const el = videoElsRef.current.get(t.tileId);
      if (el) attendeeToVideo.set(t.attendeeId, el);
    });
    const people = Object.values(rosterRef.current).map((p) => ({
      attendeeId: p.attendeeId,
      name: p.name,
      avatar: p.avatar ? resolveImageUrl(p.avatar) : null,
      muted: p.muted,
      speaking: activeSpeakerRef.current === p.attendeeId,
      isSelf: p.attendeeId === selfAttendeeIdRef.current,
      videoEl: attendeeToVideo.get(p.attendeeId) ?? null,
    }));
    return {
      title: meetingRef.current?.title || "Suprah Meet",
      code: codeRef.current,
      people,
    };
  }, []);

  const announceScene = useCallback((on: boolean) => {
    setSceneAttendee(on ? selfAttendeeIdRef.current : "");
    // Lifetime 5 min so late joiners also learn to hide this content tile.
    sendData(DATA_TOPIC, { t: "scene", attendee: selfAttendeeIdRef.current, on }, 300_000);
    if (sceneAnnounceTimerRef.current) {
      clearInterval(sceneAnnounceTimerRef.current);
      sceneAnnounceTimerRef.current = null;
    }
    if (on) {
      sceneAnnounceTimerRef.current = setInterval(() => {
        sendData(DATA_TOPIC, { t: "scene", attendee: selfAttendeeIdRef.current, on: true }, 300_000);
      }, 240_000);
    }
  }, [sendData]);

  const stopSceneShare = useCallback(() => {
    if (!sceneOnRef.current) return;
    sceneOnRef.current = false;
    ignoreNextShareStopRef.current = true;
    av()?.stopContentShare();
    sceneRecRef.current?.stop();
    sceneRecRef.current = null;
    announceScene(false);
  }, [announceScene]);

  /** Desired state: scene share runs iff we're the recorder and no real
   *  content share (ours or anyone's) is active. */
  const syncSceneShare = useCallback(async () => {
    const audioVideo = av();
    if (!audioVideo) return;
    const wantScene =
      localRecorderRef.current && !userSharingRef.current && !remoteContentRef.current;

    if (wantScene && !sceneOnRef.current) {
      try {
        const recorder = new MeetSceneRecorder(buildScene);
        const stream = recorder.start();
        sceneRecRef.current = recorder;
        sceneOnRef.current = true;
        await audioVideo.startContentShare(stream);
        announceScene(true);
      } catch {
        sceneOnRef.current = false;
        sceneRecRef.current?.stop();
        sceneRecRef.current = null;
      }
    } else if (!wantScene && sceneOnRef.current) {
      stopSceneShare();
    }
  }, [announceScene, buildScene, stopSceneShare]);

  /* ── Join ────────────────────────────────────────────────────────── */

  const join = useCallback(async (code: string) => {
    setPhase("joining");
    setError(null);
    setEndedReason(null);
    codeRef.current = code.trim().toUpperCase();
    try {
      const res = await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/join`);
      const data = res.data?.data;
      const meetingInfo: MeetingInfo = data.meeting;
      setMeeting(meetingInfo);
      meetingRef.current = meetingInfo;
      setCanControl(Boolean(data.self?.canControl));
      selfNameRef.current = data.self?.fullName || "You";
      selfCrmIdRef.current = data.self?.crmUserId || "";
      meetingInfo.participants.forEach((p) => namesRef.current.set(p.crmUserId, p));
      setRecording(meetingInfo.recording?.status === "recording");

      const logger = new ConsoleLogger("SuprahMeet", LogLevel.OFF);
      const configuration = new MeetingSessionConfiguration(data.chime.Meeting, data.chime.Attendee);
      const deviceController = new DefaultDeviceController(logger);
      // NoOpEventReporter silences the "Unhandled type received while
      // flattening attributes" telemetry error from Chime's default reporter.
      const eventController = new DefaultEventController(configuration, logger, new NoOpEventReporter());
      const session = new DefaultMeetingSession(configuration, logger, deviceController, eventController);
      sessionRef.current = session;
      setSelfAttendeeId(data.chime.Attendee.AttendeeId);
      selfAttendeeIdRef.current = data.chime.Attendee.AttendeeId;

      const audioVideo = session.audioVideo;

      // Smoothness: cap outgoing video so uplinks never choke the call.
      audioVideo.chooseVideoInputQuality(960, 540, 15);
      audioVideo.setVideoMaxBandwidthKbps(1000);

      audioVideo.realtimeSubscribeToAttendeeIdPresence((attendeeId, present, externalUserId) => {
        if (attendeeId.includes("#content")) return;
        if (present) {
          const crmUserId = crmIdFrom(externalUserId);
          const known = crmUserId ? namesRef.current.get(crmUserId) : undefined;
          const isSelf = attendeeId === data.chime.Attendee.AttendeeId;
          setRoster((r) => ({
            ...r,
            [attendeeId]: {
              attendeeId, crmUserId,
              name: isSelf ? selfNameRef.current : known?.fullName || "Suprah Autrix",
              avatar: known?.avatar ?? null,
              muted: false, handRaised: false,
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
          const info: TileInfo = {
            tileId: tileState.tileId,
            attendeeId: tileState.boundAttendeeId,
            isLocal: Boolean(tileState.localTile),
            isContent: Boolean(tileState.isContent),
          };
          tilesStoreRef.current = { ...tilesStoreRef.current, [info.tileId]: info };
          setTiles(tilesStoreRef.current);

          // A content share from someone else means the scene share yields
          // (their screen becomes the recorded presenter view).
          if (info.isContent && contentOwner(info.attendeeId) !== selfAttendeeIdRef.current) {
            remoteContentRef.current = true;
            setTimeout(() => void syncSceneShare(), 300);
          }
        },
        videoTileWasRemoved: (tileId: number) => {
          const removed = tilesStoreRef.current[tileId];
          const next = { ...tilesStoreRef.current };
          delete next[tileId];
          tilesStoreRef.current = next;
          setTiles(next);

          if (removed?.isContent && contentOwner(removed.attendeeId) !== selfAttendeeIdRef.current) {
            remoteContentRef.current = Object.values(next).some(
              (t) => t.isContent && contentOwner(t.attendeeId) !== selfAttendeeIdRef.current
            );
            setTimeout(() => void syncSceneShare(), 800);
          }
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
        contentShareDidStop: () => {
          if (ignoreNextShareStopRef.current) {
            ignoreNextShareStopRef.current = false;
            return;
          }
          if (sceneOnRef.current) {
            // Our canvas share ended unexpectedly — clean up and let sync retry.
            sceneOnRef.current = false;
            sceneRecRef.current?.stop();
            sceneRecRef.current = null;
            announceScene(false);
          } else {
            userSharingRef.current = false;
            setSharing(false);
          }
          setTimeout(() => void syncSceneShare(), 800);
        },
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
          if (payload.t === "scene") {
            // Hide the recorder's canvas share from everyone's UI.
            setSceneAttendee(payload.on ? String(payload.attendee || "") : "");
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

      const audioInputs = await audioVideo.listAudioInputDevices();
      if (audioInputs[0]) await audioVideo.startAudioInput(audioInputs[0].deviceId);

      const videoInputs = await audioVideo.listVideoInputDevices();
      videoDevicesRef.current = videoInputs.map((d) => ({ deviceId: d.deviceId, label: d.label || "" }));
      const frontIdx = videoDevicesRef.current.findIndex((d) => /front|user/i.test(d.label));
      camIndexRef.current = frontIdx >= 0 ? frontIdx : 0;
      setVideoDeviceCount(videoDevicesRef.current.length);

      audioVideo.start();
      joinedAtRef.current = Date.now();
      setMicOn(true);
      setPhase("in");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Could not join the meeting.");
      setPhase("error");
    }
  }, [announceScene, pushReaction, refreshNames, syncSceneShare]);

  const bindAudio = useCallback((el: HTMLAudioElement | null) => {
    if (el) void av()?.bindAudioElement(el);
  }, []);
  const bindVideoTile = useCallback((tileId: number, el: HTMLVideoElement | null) => {
    if (el) {
      videoElsRef.current.set(tileId, el);
      av()?.bindVideoElement(tileId, el);
    } else {
      videoElsRef.current.delete(tileId);
    }
  }, []);

  const toggleMic = useCallback(() => {
    const audioVideo = av();
    if (!audioVideo) return;
    if (micOn) audioVideo.realtimeMuteLocalAudio();
    else audioVideo.realtimeUnmuteLocalAudio();
    setMicOn(!micOn);
  }, [micOn]);

  const startCamAt = useCallback(async (index: number) => {
    const audioVideo = av();
    const device = videoDevicesRef.current[index];
    if (!audioVideo || !device) throw new Error("No camera found");
    await audioVideo.startVideoInput(device.deviceId);
    audioVideo.startLocalVideoTile();
    camIndexRef.current = index;
  }, []);

  const toggleCam = useCallback(async () => {
    const audioVideo = av();
    if (!audioVideo) return;
    try {
      if (camOn) {
        audioVideo.stopLocalVideoTile();
        await audioVideo.stopVideoInput();
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
  }, [camOn, startCamAt]);

  /** Mobile back/front camera flip — cycles through available cameras. */
  const switchCamera = useCallback(async () => {
    if (!camOn || videoDevicesRef.current.length < 2) return;
    const next = (camIndexRef.current + 1) % videoDevicesRef.current.length;
    try { await startCamAt(next); } catch { /* keep current camera */ }
  }, [camOn, startCamAt]);

  const facingBack = () => /back|rear|environment/i.test(videoDevicesRef.current[camIndexRef.current]?.label || "");

  const toggleShare = useCallback(async () => {
    const audioVideo = av();
    if (!audioVideo) return;
    if (userSharingRef.current) {
      audioVideo.stopContentShare(); // observer clears state and resyncs scene
    } else {
      // A real screen share takes priority over the recording scene share.
      if (sceneOnRef.current) stopSceneShare();
      try {
        await audioVideo.startContentShareFromScreenCapture();
        userSharingRef.current = true;
        setSharing(true);
      } catch {
        // Picker cancelled — bring the scene back if we're recording.
        void syncSceneShare();
      }
    }
  }, [stopSceneShare, syncSceneShare]);

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

  // Recording failures are NON-FATAL: caught here, surfaced via `notice`.
  const startRecording = useCallback(async () => {
    try {
      await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/recording/start`);
      setRecording(true);
      localRecorderRef.current = true;
      meetSounds.recording();
      sendData(DATA_TOPIC, { t: "recording", on: true }, 300_000);
      // Publish the scene so the MP4 always has a picture, cameras or not.
      void syncSceneShare();
    } catch (err: any) {
      setNotice(err?.response?.data?.message ||
        "Recording could not start. Check the backend logs for the AWS reason.");
    }
  }, [sendData, syncSceneShare]);

  const stopRecording = useCallback(async () => {
    try {
      await apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/recording/stop`);
      setRecording(false);
      localRecorderRef.current = false;
      sendData(DATA_TOPIC, { t: "recording", on: false }, 300_000);
      void syncSceneShare(); // tears the scene share down
    } catch (err: any) {
      setNotice(err?.response?.data?.message ||
        "Recording could not be stopped. Check the backend logs for the AWS reason.");
    }
  }, [sendData, syncSceneShare]);

  const teardown = useCallback(async () => {
    localRecorderRef.current = false;
    if (sceneAnnounceTimerRef.current) {
      clearInterval(sceneAnnounceTimerRef.current);
      sceneAnnounceTimerRef.current = null;
    }
    sceneOnRef.current = false;
    sceneRecRef.current?.stop();
    sceneRecRef.current = null;
    const audioVideo = av();
    if (audioVideo) {
      try {
        audioVideo.stopContentShare();
        audioVideo.stopLocalVideoTile();
        await audioVideo.stopVideoInput();
        await audioVideo.stopAudioInput();
        audioVideo.stop();
      } catch { /* best effort */ }
    }
    sessionRef.current = null;
  }, []);

  const leave = useCallback(async () => {
    leftIntentionallyRef.current = true;
    await teardown();
    apiClient.post(`/api/crm/meet/meetings/${codeRef.current}/leave`).catch(() => {});
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

  // The recorder's canvas share is infrastructure, not a presentation —
  // filter it out so no one's UI shows it.
  const visibleTiles = Object.values(tiles).filter((t) => {
    if (!t.isContent) return true;
    const owner = contentOwner(t.attendeeId);
    if (sceneAttendee && owner === sceneAttendee) return false;
    if (sceneOnRef.current && owner === selfAttendeeIdRef.current) return false;
    return true;
  });

  return {
    phase, error, endedReason, meeting, canControl, selfAttendeeId,
    roster, tiles: visibleTiles, activeSpeakerId,
    micOn, camOn, sharing, handRaised, recording, reactions,
    chatMessages, chatUnread, videoDeviceCount,
    notice, clearNotice,
    isBackCamera: facingBack(),
    join, bindAudio, bindVideoTile,
    toggleMic, toggleCam, switchCamera, toggleShare, toggleHand,
    sendReaction, sendChat, markChatRead,
    startRecording, stopRecording, leave, endMeeting,
  };
}