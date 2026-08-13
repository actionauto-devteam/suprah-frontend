"use client";

import { useSyncExternalStore } from "react";

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
  _id: string;
  customerId?: string | null;
  leadId?: string | null;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  status:
    | "ringing"
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
}

let state: CommState = {
  messagesByConversation: {},
  callsByCustomer: {},
  incomingCalls: [],
  activeCall: null,
  softphoneReady: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

function setState(partial: Partial<CommState>) {
  state = { ...state, ...partial };
  emitChange();
}

/* ------------------------------- selectors ------------------------------ */

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
    if (call.status === "ringing" && call.direction === "inbound") incoming = [call, ...incoming];

    // per-customer history
    let callsByCustomer = state.callsByCustomer;
    if (call.customerId) {
      const list = callsByCustomer[call.customerId] || [];
      const idx = list.findIndex((c) => c._id === call._id);
      const next = idx >= 0 ? [...list.slice(0, idx), call, ...list.slice(idx + 1)] : [call, ...list];
      callsByCustomer = { ...callsByCustomer, [call.customerId]: next };
    }

    setState({ incomingCalls: incoming, callsByCustomer });
  },

  dismissIncoming(callId: string) {
    setState({ incomingCalls: state.incomingCalls.filter((c) => c._id !== callId) });
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
let wired = false;

/** Wire the platform's existing Socket.io client (lib/socket.client) into the
 *  store. Backend emits globally with orgId on the payload, so events for
 *  other orgs are filtered out here. Safe to call more than once. */
export function connectCommunicationSocket(socket: any, orgId: string) {
  if (!socket || wired) return;
  wired = true;
  const mine = (data: any) => !data?.orgId || String(data.orgId) === String(orgId);

  socket.on("comm:message:new", (data: any) => {
    if (mine(data) && data?.message) commActions.upsertMessage(data.message);
  });

  socket.on("comm:message:status", (data: any) => {
    if (mine(data) && data?.messageId)
      commActions.patchMessageStatus(data.conversationId, data.messageId, data.status);
  });

  socket.on("comm:call:incoming", (data: any) => {
    if (mine(data) && data?.call) commActions.upsertCall(data.call);
  });

  socket.on("comm:call:update", (data: any) => {
    if (mine(data) && data?.call) commActions.upsertCall(data.call);
  });
}
