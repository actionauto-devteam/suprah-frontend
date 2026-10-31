"use client";

import { useCallback, useEffect } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";
import { apiClient } from "@/lib/api-client";
import { commActions, getCommState } from "@/lib/communicationStore";

const READY_TIMEOUT_MS = 12_000;
const ANSWER_WINDOW_MS = 60_000;

let client: TelnyxRTC | null = null;
let connecting: Promise<TelnyxRTC> | null = null;
let callerNumber = "";
let currentCall: any = null;
let pendingAnswer: { callLogId: string; until: number } | null = null;
let refuseInvitesUntil = 0;
let remoteAudioEl: HTMLAudioElement | null = null;

const newClientCallId = () =>
  `cc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

function softphoneError(code: string, message: string) {
  return Object.assign(new Error(message), { code, userMessage: message });
}

function ensureAudioElement(): HTMLAudioElement {
  if (remoteAudioEl) return remoteAudioEl;
  const el = document.createElement("audio");
  el.autoplay = true;
  el.style.display = "none";
  el.id = "suprah-comm-remote-audio";
  document.body.appendChild(el);
  remoteAudioEl = el;
  return el;
}

async function reportCall(body: Record<string, any>) {
  try {
    const response = await apiClient.post("/api/crm/communications/calls/log", body);
    return response.data?.data;
  } catch {
    /* history logging must never break the call itself */
  }
}

interface LoggedCall {
  call?: { _id?: string; from?: string; lineLabel?: string };
  correlation?: Record<string, unknown>;
}

async function startCallLog(body: Record<string, unknown>): Promise<LoggedCall | undefined> {
  try {
    const response = await apiClient.post("/api/crm/communications/calls/log", body);
    return response.data?.data;
  } catch (err) {
    const failure = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
    if (failure?.status === 403 || failure?.status === 503) {
      throw softphoneError("CALL_NOT_ALLOWED", failure.data?.message || "This call can't be placed right now.");
    }
    return undefined;
  }
}

function handleNotification(notification: any) {
  if (notification.type !== "callUpdate" || !notification.call) return;
  const call = notification.call;

  switch (call.state) {
    case "ringing": {
      if (call.direction && call.direction !== "inbound") break;
      const active = getCommState().activeCall;
      if (pendingAnswer && Date.now() < pendingAnswer.until && active?.callLogId === pendingAnswer.callLogId) {
        pendingAnswer = null;
        currentCall = call;
        call.answer();
        commActions.patchActiveCall({ phase: "connecting" });
      } else if (pendingAnswer || Date.now() < refuseInvitesUntil) {
        pendingAnswer = null;
        refuseInvitesUntil = 0;
        call.hangup();
      }
      break;
    }
    case "active": {
      currentCall = call;
      commActions.patchActiveCall({ phase: "active", startedAt: Date.now() });
      const ccid = (call as any).__clientCallId;
      if (ccid) reportCall({ clientCallId: ccid, event: "answered" });
      break;
    }
    case "hangup":
    case "destroy": {
      const ccid = (call as any).__clientCallId;
      if (currentCall === call) {
        currentCall = null;
        commActions.setActiveCall(null);
      }
      if (ccid && !(call as any).__reportedEnd) {
        (call as any).__reportedEnd = true;
        reportCall({ clientCallId: ccid, event: "end", hangupCause: call.cause });
      }
      break;
    }
    default:
      break;
  }
}

async function disconnectClient(c: TelnyxRTC | null) {
  if (!c) return;
  try {
    await Promise.resolve(c.disconnect());
  } catch {
    return;
  }
}

async function createClient(): Promise<TelnyxRTC> {
  const { data } = await apiClient.post("/api/crm/communications/rtc/token");
  const payload = data?.data || data;
  callerNumber = payload.callerNumber || "";

  const c = new TelnyxRTC({ login_token: payload.token });
  c.remoteElement = ensureAudioElement() as any;

  const gate: { settle?: (error?: Error) => void } = {};
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => gate.settle?.(softphoneError("SOFTPHONE_NOT_READY", "Your phone line couldn't connect.")),
      READY_TIMEOUT_MS
    );
    gate.settle = (error?: Error) => {
      clearTimeout(timer);
      gate.settle = undefined;
      if (error) reject(error);
      else resolve();
    };
  });

  c.on("telnyx.ready", () => {
    gate.settle?.();
    if (client === c) commActions.setSoftphoneReady(true);
  });
  c.on("telnyx.error", () => {
    gate.settle?.(softphoneError("SOFTPHONE_NOT_READY", "Your phone line couldn't connect."));
    if (client === c) commActions.setSoftphoneReady(false);
  });
  c.on("telnyx.socket.close", () => {
    gate.settle?.(softphoneError("SOFTPHONE_NOT_READY", "Your phone line couldn't connect."));
    if (client !== c) return;
    client = null;
    commActions.setSoftphoneReady(false);
    void disconnectClient(c);
  });
  c.on("telnyx.notification", handleNotification);

  try {
    await c.connect();
    await ready;
  } catch (error) {
    await disconnectClient(c);
    throw error;
  }
  client = c;
  commActions.setSoftphoneReady(true);
  return c;
}

async function ensureClient(): Promise<TelnyxRTC> {
  if (client) return client;
  if (!connecting) {
    connecting = createClient().finally(() => {
      connecting = null;
    });
  }
  return connecting;
}

async function registerThisTab(): Promise<TelnyxRTC> {
  if (connecting) {
    await connecting.catch(() => undefined);
  }
  const previous = client;
  client = null;
  commActions.setSoftphoneReady(false);
  await disconnectClient(previous);
  return ensureClient();
}

async function ensureMicrophone(outbound = false) {
  const stillRinging = outbound ? "" : " The call is still ringing for your teammates.";
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw softphoneError("MIC_UNAVAILABLE", `This browser can't use a microphone for calls.${stillRinging}`);
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    throw softphoneError(
      "MIC_BLOCKED",
      `Allow microphone access for Suprah in your browser, then try again.${stillRinging}`
    );
  }
}

export function useTelnyxRTC() {
  // Warm the softphone up on mount so inbound bridging works immediately.
  useEffect(() => {
    ensureClient().catch(() => commActions.setSoftphoneReady(false));
  }, []);

  /** Outbound call from the customer profile. */
  const dial = useCallback(
    async (phoneNumber: string, opts?: { customerId?: string; leadId?: string; displayName?: string }) => {
      if (getCommState().activeCall) throw softphoneError("ALREADY_ON_CALL", "You're already on a call.");
      await ensureMicrophone(true);
      const c = await ensureClient().catch(() => {
        throw softphoneError("SOFTPHONE_NOT_READY", "Your phone line couldn't connect. Check your internet connection and try again.");
      });
      const clientCallId = newClientCallId();

      commActions.setActiveCall({
        kind: "outbound",
        phase: "ringing",
        phoneNumber,
        displayName: opts?.displayName,
        muted: false,
        clientCallId,
      });

      let logged: LoggedCall | undefined;
      try {
        logged = await startCallLog({
          clientCallId,
          event: "start",
          toPhone: phoneNumber,
          customerId: opts?.customerId,
          leadId: opts?.leadId,
        });
      } catch (err) {
        commActions.setActiveCall(null);
        throw err;
      }

      const fromNumber = logged?.call?.from || callerNumber;
      if (logged?.call?._id) commActions.patchActiveCall({ callLogId: logged.call._id, fromNumber, lineLabel: logged.call.lineLabel });

      try {
        const call = c.newCall({
          destinationNumber: phoneNumber,
          callerNumber: fromNumber,
          audio: true,
          video: false,
          ...(logged?.correlation ? { clientState: btoa(JSON.stringify({ kind: 'recording-outbound', ...logged.correlation })) } : {}),
        });
        (call as any).__clientCallId = clientCallId;
        currentCall = call;
      } catch {
        commActions.setActiveCall(null);
        void reportCall({ clientCallId, event: "failed", hangupCause: "call-not-started" });
        throw softphoneError("CALL_NOT_STARTED", "Couldn't start the call. Please try again.");
      }
    },
    []
  );

  /** Claim + auto-answer an inbound ringing call. */
  const answerInbound = useCallback(async (callLogId: string, meta: { phoneNumber: string; displayName?: string; fromNumber?: string; lineLabel?: string }) => {
    if (getCommState().activeCall) throw softphoneError("ALREADY_ON_CALL", "You're already on a call.");
    commActions.setActiveCall({
      kind: "inbound",
      phase: "connecting",
      phoneNumber: meta.phoneNumber,
      displayName: meta.displayName,
      muted: false,
      callLogId,
      fromNumber: meta.fromNumber,
      lineLabel: meta.lineLabel,
    });
    try {
      await ensureMicrophone();
      await registerThisTab().catch(() => {
        throw softphoneError(
          "SOFTPHONE_NOT_READY",
          "Your phone line couldn't connect. Check your internet connection and try again. The call is still ringing for your teammates."
        );
      });
    } catch (err) {
      if (getCommState().activeCall?.callLogId === callLogId) commActions.setActiveCall(null);
      throw err;
    }
    if (getCommState().activeCall?.callLogId !== callLogId) return;
    pendingAnswer = { callLogId, until: Date.now() + ANSWER_WINDOW_MS };
    try {
      await apiClient.post(`/api/crm/communications/calls/${callLogId}/claim`);
      commActions.dismissIncoming(callLogId);
    } catch (err: any) {
      if (pendingAnswer?.callLogId === callLogId) pendingAnswer = null;
      if (getCommState().activeCall?.callLogId === callLogId) commActions.setActiveCall(null);
      commActions.dismissIncoming(callLogId);
      throw err;
    }
  }, []);

  const hangup = useCallback(() => {
    if (currentCall) {
      try {
        currentCall.hangup();
      } catch {
        currentCall = null;
      }
    } else if (pendingAnswer) {
      pendingAnswer = null;
      refuseInvitesUntil = Date.now() + ANSWER_WINDOW_MS;
    }
    commActions.setActiveCall(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (!currentCall) return;
    try {
      const next = !(currentCall.isMuted ?? false);
      next ? currentCall.muteAudio() : currentCall.unmuteAudio();
      currentCall.isMuted = next;
      commActions.patchActiveCall({ muted: next });
    } catch {
      /* noop */
    }
  }, []);

  /** Hold/resume the live call. Returns false when no call can be held. */
  const toggleHold = useCallback((hold: boolean): boolean => {
    if (!currentCall) return false;
    try {
      hold ? currentCall.hold() : currentCall.unhold();
      commActions.patchActiveCall({ onHold: hold });
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendDigit = useCallback((digit: string): boolean => {
    if (!currentCall) return false;
    try {
      currentCall.dtmf(digit);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { dial, answerInbound, hangup, toggleMute, toggleHold, sendDigit };
}
