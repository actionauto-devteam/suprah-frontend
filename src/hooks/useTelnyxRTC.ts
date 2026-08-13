"use client";

import { useCallback, useEffect, useRef } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";
import { apiClient } from "@/lib/api-client";
import { commActions } from "@/lib/communicationStore";

let client: TelnyxRTC | null = null;
let loggingIn = false;
let callerNumber = "";
let currentCall: any = null;
let expectingInbound = false; // set true right after a successful claim
let remoteAudioEl: HTMLAudioElement | null = null;

const newClientCallId = () =>
  `cc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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
    await apiClient.post("/api/crm/communications/calls/log", body);
  } catch {
    /* history logging must never break the call itself */
  }
}

async function ensureClient(): Promise<TelnyxRTC> {
  if (client) return client;
  if (loggingIn) {
    await new Promise((r) => {
      const t = setInterval(() => {
        if (!loggingIn) {
          clearInterval(t);
          r(null);
        }
      }, 150);
    });
    if (client) return client;
  }

  loggingIn = true;
  try {
    const { data } = await apiClient.post("/api/crm/communications/rtc/token");
    const payload = data?.data || data;
    callerNumber = payload.callerNumber || "";

    const c = new TelnyxRTC({ login_token: payload.token });
    c.remoteElement = ensureAudioElement() as any;

    c.on("telnyx.ready", () => commActions.setSoftphoneReady(true));
    c.on("telnyx.error", () => commActions.setSoftphoneReady(false));
    c.on("telnyx.socket.close", () => {
      commActions.setSoftphoneReady(false);
      client = null; // force re-login (token is short-lived)
    });

    c.on("telnyx.notification", (notification: any) => {
      if (notification.type !== "callUpdate" || !notification.call) return;
      const call = notification.call;

      switch (call.state) {
        case "ringing": {
          // Inbound INVITE. Only auto-answer if we just claimed a call —
          // anything else is unexpected and gets rejected.
          if (expectingInbound) {
            expectingInbound = false;
            currentCall = call;
            call.answer();
            commActions.patchActiveCall({ phase: "connecting" });
          } else {
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
    });

    await c.connect();
    client = c;
    return c;
  } finally {
    loggingIn = false;
  }
}

export function useTelnyxRTC() {
  const mounted = useRef(false);

  // Warm the softphone up on mount so inbound bridging works immediately.
  useEffect(() => {
    mounted.current = true;
    ensureClient().catch(() => commActions.setSoftphoneReady(false));
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Outbound call from the customer profile. */
  const dial = useCallback(
    async (phoneNumber: string, opts?: { customerId?: string; displayName?: string }) => {
      const c = await ensureClient();
      const clientCallId = newClientCallId();

      commActions.setActiveCall({
        kind: "outbound",
        phase: "ringing",
        phoneNumber,
        displayName: opts?.displayName,
        muted: false,
        clientCallId,
      });

      await reportCall({
        clientCallId,
        event: "start",
        toPhone: phoneNumber,
        customerId: opts?.customerId,
      });

      const call = c.newCall({
        destinationNumber: phoneNumber,
        callerNumber,
        audio: true,
        video: false,
      });
      (call as any).__clientCallId = clientCallId;
      currentCall = call;
    },
    []
  );

  /** Claim + auto-answer an inbound ringing call. */
  const answerInbound = useCallback(async (callLogId: string, meta: { phoneNumber: string; displayName?: string }) => {
    await ensureClient(); // must be registered before the backend transfers
    expectingInbound = true;
    commActions.setActiveCall({
      kind: "inbound",
      phase: "connecting",
      phoneNumber: meta.phoneNumber,
      displayName: meta.displayName,
      muted: false,
      callLogId,
    });
    try {
      await apiClient.post(`/api/crm/communications/calls/${callLogId}/claim`);
      commActions.dismissIncoming(callLogId);
    } catch (err: any) {
      expectingInbound = false;
      commActions.setActiveCall(null);
      commActions.dismissIncoming(callLogId);
      throw err;
    }
  }, []);

  const hangup = useCallback(() => {
    try {
      currentCall?.hangup();
    } catch {
      /* already ended */
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
      return true;
    } catch {
      return false;
    }
  }, []);

  return { dial, answerInbound, hangup, toggleMute, toggleHold };
}
