"use client";

import { useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket.client";

export type MessageStatus = "queued" | "sent" | "delivered" | "failed" | "received";

export interface CommMessage {
  _id: string;
  conversationId: string;
  customerId?: string | null;
  leadId?: string | null;
  direction: "inbound" | "outbound";
  body: string;
  from: string;
  to: string;
  status: MessageStatus;
  sentBy?: { userId: string; name?: string; email?: string } | null;
  createdAt: string;
}

export interface CommCall {
  routing?: { selectedLabel?: string; language?: string; stage?: string; type?: string };
  _id: string;
  customerId?: string | null;
  leadId?: string | null;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  status:
    | "ringing"
    | "ivr"
    | "answering"
    | "in-progress"
    | "completed"
    | "missed"
    | "failed"
    | "canceled";
  answeredBy?: { userId: string; name?: string } | null;
  placedBy?: { userId: string; name?: string } | null;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSec?: number;
  customerName?: string;
  lineLabel?: string;
  clientCallId?: string;
  createdAt: string;
}

export interface ActiveCallState {
  kind: "inbound" | "outbound";
  phase: "connecting" | "ringing" | "active" | "ended";
  phoneNumber: string;
  displayName?: string;
  startedAt?: number; // ms epoch when answered — drives the timer
  muted: boolean;
  clientCallId?: string;
  callLogId?: string;
}

interface CommState {
  messagesByConversation: Record<string, CommMessage[]>;
  callsByCustomer: Record<string, CommCall[]>;
  incomingCalls: CommCall[]; // ringing, unclaimed
  activeCall: ActiveCallState | null;
  softphoneReady: boolean;
  callNotice: string | null;
}

let state: CommState = {
  messagesByConversation: {},
  callsByCustomer: {},
  incomingCalls: [],
  activeCall: null,
  softphoneReady: false,
  callNotice: null,
};

const listeners = new Set<() => void>();
const DISMISSED_CALLS_KEY = "suprah-dismissed-calls";
const dismissedCalls = new Set<string>(readDismissedCalls());

function readDismissedCalls(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const parsed = JSON.parse(window.sessionStorage.getItem(DISMISSED_CALLS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string").slice(-50) : [];
  } catch {
    return [];
  }
}

function saveDismissedCalls() {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(DISMISSED_CALLS_KEY, JSON.stringify(Array.from(dismissedCalls).slice(-50)));
  } catch {
    return;
  }
}
const ringingReceivedAt = new Map<string, number>();

const CALL_ENDED_NOTICES: Record<string, string> = {
  missed: "The call couldn't connect to your browser, so it was marked as missed.",
  canceled: "The caller hung up before the call connected.",
  failed: "The call couldn't be connected. Please call the customer back.",
  completed: "The call ended.",
  ringing: "The call couldn't connect to your browser, so it is ringing for your teammates again.",
};

function emitChange() {
  listeners.forEach((l) => l());
}

function setState(partial: Partial<CommState>) {
  state = { ...state, ...partial };
  emitChange();
}

/* ------------------------------- selectors ------------------------------ */

export function getCommState(): CommState {
  return state;
}

export function useCommStore(): CommState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
}

/* -------------------------------- actions ------------------------------- */

export const commActions = {
  seedMessages(conversationId: string, messages: CommMessage[]) {
    setState({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    });
  },

  upsertMessage(message: CommMessage) {
    const list = state.messagesByConversation[message.conversationId] || [];
    const idx = list.findIndex((m) => m._id === message._id);
    const next = idx >= 0 ? [...list.slice(0, idx), message, ...list.slice(idx + 1)] : [...list, message];
    setState({
      messagesByConversation: {
        ...state.messagesByConversation,
        [message.conversationId]: next,
      },
    });
  },

  patchMessageStatus(conversationId: string, messageId: string, status: MessageStatus) {
    const list = state.messagesByConversation[conversationId];
    if (!list) return;
    setState({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: list.map((m) => (m._id === messageId ? { ...m, status } : m)),
      },
    });
  },

  seedCalls(customerId: string, calls: CommCall[]) {
    setState({ callsByCustomer: { ...state.callsByCustomer, [customerId]: calls } });
  },

  upsertCall(call: CommCall) {
    // incoming ringing list
    let incoming = state.incomingCalls.filter((c) => c._id !== call._id);
    if (call.status === "ringing" && call.direction === "inbound" && !dismissedCalls.has(call._id)) {
      incoming = [call, ...incoming];
      if (!ringingReceivedAt.has(call._id)) ringingReceivedAt.set(call._id, Date.now());
    } else {
      ringingReceivedAt.delete(call._id);
    }

    // per-customer history
    let callsByCustomer = state.callsByCustomer;
    const key = call.customerId || call.leadId;
    if (key) {
      const list = callsByCustomer[key] || [];
      const idx = list.findIndex((c) => c._id === call._id);
      const next = idx >= 0 ? [...list.slice(0, idx), call, ...list.slice(idx + 1)] : [call, ...list];
      callsByCustomer = { ...callsByCustomer, [key]: next };
    }

    let activeCall = state.activeCall;
    let callNotice = state.callNotice;
    if (
      activeCall?.kind === "inbound" &&
      activeCall.callLogId === call._id &&
      activeCall.phase !== "active" &&
      CALL_ENDED_NOTICES[call.status]
    ) {
      activeCall = null;
      callNotice = CALL_ENDED_NOTICES[call.status];
    }

    setState({ incomingCalls: incoming, callsByCustomer, activeCall, callNotice });
  },

  replaceRinging(calls: CommCall[], requestedAt: number) {
    const fromServer = calls.filter(
      (call) => call.status === "ringing" && call.direction === "inbound" && !dismissedCalls.has(call._id)
    );
    const serverIds = new Set(fromServer.map((call) => call._id));
    const arrivedDuringRequest = state.incomingCalls.filter(
      (call) => !serverIds.has(call._id) && (ringingReceivedAt.get(call._id) || 0) >= requestedAt
    );
    const next = [...arrivedDuringRequest, ...fromServer];
    const keep = new Set(next.map((call) => call._id));
    Array.from(ringingReceivedAt.keys()).forEach((id) => {
      if (!keep.has(id)) ringingReceivedAt.delete(id);
    });
    fromServer.forEach((call) => {
      if (!ringingReceivedAt.has(call._id)) ringingReceivedAt.set(call._id, Date.now());
    });
    setState({ incomingCalls: next });
  },

  dismissIncoming(callId: string) {
    dismissedCalls.add(callId);
    saveDismissedCalls();
    ringingReceivedAt.delete(callId);
    setState({ incomingCalls: state.incomingCalls.filter((c) => c._id !== callId) });
  },

  clearCallNotice() {
    if (state.callNotice) setState({ callNotice: null });
  },

  setActiveCall(activeCall: ActiveCallState | null) {
    setState({ activeCall });
  },

  patchActiveCall(patch: Partial<ActiveCallState>) {
    if (!state.activeCall) return;
    setState({ activeCall: { ...state.activeCall, ...patch } });
  },

  setSoftphoneReady(softphoneReady: boolean) {
    setState({ softphoneReady });
  },
};

/* ----------------------------- socket wiring ----------------------------- */
/** Call once with your existing Socket.io client instance (the one YapLine /
 *  Pulse360 use) after the user is authenticated. */
let wiredSocket: Socket | null = null;
let wiredOrgId = "";
let unwireSocket: (() => void) | null = null;
const reconnectListeners = new Set<() => void>();

export function onCommunicationReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  if (wiredSocket?.connected) listener();
  return () => {
    reconnectListeners.delete(listener);
  };
}

/** Wire the platform's existing Socket.io client (lib/socket.client) into the
 *  store. Backend emits globally with orgId on the payload, so events for
 *  other orgs are filtered out here. Safe to call more than once. */
export function connectCommunicationSocket(socket: any, orgId: string) {
  const target = getSocket() || socket;
  if (!target) return;
  wiredOrgId = String(orgId);
  if (wiredSocket === target) return;
  unwireSocket?.();
  wiredSocket = target;
  const mine = (data: any) => !data?.orgId || String(data.orgId) === wiredOrgId;

  const handlers = {
    "comm:message:new": (data: any) => {
      if (mine(data) && data?.message) commActions.upsertMessage(data.message);
    },
    "comm:message:status": (data: any) => {
      if (mine(data) && data?.messageId)
        commActions.patchMessageStatus(data.conversationId, data.messageId, data.status);
    },
    "comm:call:incoming": (data: any) => {
      if (mine(data) && data?.call) commActions.upsertCall(data.call);
    },
    "comm:call:update": (data: any) => {
      if (mine(data) && data?.call) commActions.upsertCall(data.call);
    },
    "comm:call:removed": (data: { orgId?: string; callId?: string }) => {
      if (mine(data) && data.callId) commActions.dismissIncoming(data.callId);
    },
    connect: () => {
      reconnectListeners.forEach((listener) => listener());
    },
  };

  Object.entries(handlers).forEach(([event, handler]) => target.on(event, handler));
  unwireSocket = () => {
    Object.entries(handlers).forEach(([event, handler]) => target.off(event, handler));
  };
  if (target.connected) reconnectListeners.forEach((listener) => listener());
}
