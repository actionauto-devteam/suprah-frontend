"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

/**
 * useShopAssistant
 *
 * Conversation + recommendation state for the Suprah Autrix shop assistant.
 * Auth follows the same pattern as CustomerConcernChat: a fresh token from
 * useAuth().getToken() on every request, never localStorage for the token.
 *
 * A client `sessionId` is kept as a graceful fallback; when the customer is
 * signed in the server keys the session by the customer id regardless.
 */

export interface ShopPreferences {
  vehicleTypes: string[];
  brands: string[];
  fuelTypes: string[];
  usage: string[];
  features: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  passengers?: number | null;
  yearMin?: number | null;
  maxMileage?: number | null;
}

export interface Recommendation {
  id: string;
  vin: string;
  name: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  priceLabel: string;
  mileage: number;
  bodyStyle: string;
  fuelType: string;
  transmission: string;
  driveTrain: string;
  exteriorColor: string;
  image: string;
  location: string;
  specs: string[];
  matchScore: number;
  matchReasons: string[];
  tradeoffs: string[];
}

export interface ShopMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
  pending?: boolean;
}

const SESSION_KEY = "supra_shop_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      (window.crypto?.randomUUID?.() as string) ||
      `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const EMPTY_PREFS: ShopPreferences = {
  vehicleTypes: [],
  brands: [],
  fuelTypes: [],
  usage: [],
  features: [],
  budgetMin: null,
  budgetMax: null,
  passengers: null,
  yearMin: null,
  maxMileage: null,
};

export function useShopAssistant() {
  const { getToken } = useAuth();

  const [messages, setMessages] = React.useState<ShopMessage[]>([]);
  const [preferences, setPreferences] = React.useState<ShopPreferences>(EMPTY_PREFS);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isExact, setIsExact] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [loadingSession, setLoadingSession] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const sessionIdRef = React.useRef<string>("");

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  // Restore session on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      sessionIdRef.current = getSessionId();
      try {
        const headers = await authHeaders();
        const r = await apiClient.get("/api/customer-shop-ai/session", {
          headers,
          params: { sessionId: sessionIdRef.current },
        });
        if (cancelled) return;
        const data = r.data?.data;
        if (data) {
          if (data.sessionId) sessionIdRef.current = data.sessionId;
          setPreferences({ ...EMPTY_PREFS, ...(data.preferences || {}) });
          setSuggestions(data.suggestions || []);
          const restored: ShopMessage[] = (data.messages || []).map(
            (m: any, i: number) => ({
              id: m._id || `restored_${i}`,
              role: m.role,
              content: m.content,
              recommendations: m.recommendations || undefined,
            })
          );
          setMessages(restored);
          // Surface the most recent recommendation set, if any.
          const lastWithRecs = [...restored]
            .reverse()
            .find((m) => m.recommendations?.length);
          if (lastWithRecs?.recommendations)
            setRecommendations(lastWithRecs.recommendations);
        }
      } catch {
        // Non-fatal: start fresh.
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;

      setError(null);
      const userMsg: ShopMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        content,
      };
      const pendingId = `a_${Date.now()}`;
      setMessages((p) => [
        ...p,
        userMsg,
        { id: pendingId, role: "assistant", content: "", pending: true },
      ]);
      setSending(true);

      try {
        const headers = await authHeaders();
        const r = await apiClient.post(
          "/api/customer-shop-ai/chat",
          { message: content, sessionId: sessionIdRef.current },
          { headers }
        );
        const data = r.data?.data;
        if (data?.sessionId) sessionIdRef.current = data.sessionId;

        const recs: Recommendation[] = data?.recommendations || [];
        setPreferences({ ...EMPTY_PREFS, ...(data?.preferences || {}) });
        setSuggestions(data?.suggestions || []);
        setIsExact(data?.isExact !== false);
        if (recs.length) setRecommendations(recs);

        setMessages((p) =>
          p.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  content: data?.reply || "…",
                  recommendations: recs.length ? recs : undefined,
                }
              : m
          )
        );
      } catch (e: any) {
        setMessages((p) => p.filter((m) => m.id !== pendingId));
        setError(
          e?.response?.data?.message ||
            "Something went wrong reaching the assistant. Please try again."
        );
      } finally {
        setSending(false);
      }
    },
    [authHeaders, sending]
  );

  const resetSession = React.useCallback(async () => {
    try {
      const headers = await authHeaders();
      await apiClient.post(
        "/api/customer-shop-ai/reset",
        { sessionId: sessionIdRef.current },
        { headers }
      );
    } catch {
      /* ignore */
    }
    setMessages([]);
    setPreferences(EMPTY_PREFS);
    setRecommendations([]);
    setSuggestions([]);
    setError(null);
  }, [authHeaders]);

  return {
    messages,
    preferences,
    recommendations,
    suggestions,
    isExact,
    sending,
    loadingSession,
    error,
    sendMessage,
    resetSession,
  };
}