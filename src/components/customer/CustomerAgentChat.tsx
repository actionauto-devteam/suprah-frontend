"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { WebChatWidget } from "@/components/webchat/WebChatWidget";
import { useDraggableWidget } from "@/hooks/useDraggableWidget";
import { dealershipChatTitle, getDealershipChat } from "@/lib/api/customerDealershipChat";
import { useAuth, useUser } from "@/providers/AuthProvider";

/**
 * The chat on every customer portal page (decided 2026-11-02): the customer's
 * own dealership's AI Agent, already knowing who they are, in place of the old
 * "Find my car" assistant. The button can be dragged anywhere and stays where
 * it was left. Nothing shows when the dealership has no chat.
 */
export function CustomerAgentChat() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { data: chat } = useQuery({
    queryKey: ["customer-dealership-chat"],
    queryFn: async () => getDealershipChat(await getToken()),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const { setNode, style, handleProps } = useDraggableWidget<HTMLButtonElement>("suprah:customer-agent-chat");

  if (!chat?.available || !chat.orgKey) return null;

  return (
    <WebChatWidget
      orgKey={chat.orgKey}
      title={dealershipChatTitle(chat)}
      prefill={{
        name: user?.fullName ?? undefined,
        email: user?.primaryEmailAddress?.emailAddress ?? undefined,
      }}
      launcher={{
        setNode,
        style,
        handleProps,
        // Starts above the phone menu (and its raised circle, which can be on
        // the right-hand tab) and the page numbers; customers can move it.
        className: "fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-4 z-40 sm:right-6 md:bottom-24",
      }}
    />
  );
}
