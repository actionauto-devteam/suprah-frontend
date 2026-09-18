"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { commActions, useCommStore, CommMessage, CommCall } from "@/lib/communicationStore";
import type { WorkspaceActivityItem } from "@/components/conversation-workspace/workspace-types";

export function useLeadCommunicationActivity(
  leadId: string | undefined,
  phone: string | undefined,
) {
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { messagesByConversation, callsByCustomer } = useCommStore();

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(
        `/api/crm/communications/customers/${leadId}/thread`,
        { params: { leadId, ...(phone ? { phone } : {}) } },
      );
      const payload = data?.data || data;
      if (payload.conversation) {
        setConversationId(payload.conversation._id);
        commActions.seedMessages(payload.conversation._id, payload.messages || []);
      }
      commActions.seedCalls(leadId, payload.calls || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [leadId, phone]);

  useEffect(() => {
    void load();
  }, [load]);

  const messages: CommMessage[] = conversationId ? messagesByConversation[conversationId] || [] : [];
  const calls: CommCall[] = leadId ? callsByCustomer[leadId] || [] : [];

  const items: WorkspaceActivityItem[] = [
    ...messages.map(
      (m): WorkspaceActivityItem => ({
        id: `sms-${m._id}`,
        kind: "sms",
        title: m.direction === "outbound" ? "Text sent" : "Text received",
        description: m.body,
        createdAt: m.createdAt,
      }),
    ),
    ...calls.map((c): WorkspaceActivityItem => {
      const missed = c.status === "missed" || c.status === "canceled" || c.status === "failed";
      const title =
        c.direction === "inbound"
          ? missed
            ? "Missed call"
            : "Inbound call"
          : "Outbound call";
      const description = c.durationSec
        ? `Duration: ${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s`
        : undefined;

      return {
        id: `call-${c._id}`,
        kind: "call",
        title,
        description,
        createdAt: c.createdAt,
      };
    }),
  ];

  return { items, loading, refetch: load };
}
