'use client';

import * as React from 'react';

export interface Recommendation {
  id: string;
  name: string;
  image: string;
  priceLabel: string;
  bodyStyle?: string;
  matchScore: number;
  specs: any[];
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  location?: string;
  matchReasons: string[];
  tradeoffs: string[];
}

export interface ShopMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  recommendations?: Recommendation[];
}

export interface ShopPreferences {
  vehicleTypes: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  brands: string[];
  fuelTypes: string[];
  passengers?: number | null;
  usage: string[];
}

const EMPTY_PREFS: ShopPreferences = {
  vehicleTypes: [],
  budgetMin: null,
  budgetMax: null,
  brands: [],
  fuelTypes: [],
  passengers: null,
  usage: [],
};

const SESSION_KEY = 'shop_assistant_session_id';
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api/shop-assistant';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useShopAssistant() {
  const [sessionId, setSessionId] = React.useState<string>('');
  const [messages, setMessages] = React.useState<ShopMessage[]>([]);
  const [preferences, setPreferences] = React.useState<ShopPreferences>(EMPTY_PREFS);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [sending, setSending] = React.useState(false);
  const [loadingSession, setLoadingSession] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Hydrate on mount
  React.useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    if (!id) { setLoadingSession(false); return; }

    fetch(`${API_BASE}/session`, { headers: { 'x-shop-session-id': id } })
      .then((r) => r.json())
      .then((r) => {
        const data = r.data;
        setMessages(
          (data.messages || []).map((m: any) => ({
            id: m._id || crypto.randomUUID(),
            role: m.role,
            content: m.content,
            recommendations: m.recommendations,
          }))
        );
        setPreferences(data.preferences || EMPTY_PREFS);
      })
      .catch(() => setError('Could not load your previous conversation.'))
      .finally(() => setLoadingSession(false));
  }, []);

  const sendMessage = React.useCallback(
    async (text: string) => {
      if (!sessionId) return;
      setError(null);
      const userMsg: ShopMessage = { id: crypto.randomUUID(), role: 'user', content: text };
      const pendingMsg: ShopMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', pending: true };
      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setSending(true);

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-session-id': sessionId },
          body: JSON.stringify({ message: text, sessionId }),
        });
        if (!res.ok) throw new Error('Request failed');
        const { data } = await res.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, content: data.message, recommendations: data.recommendations, pending: false }
              : m
          )
        );
        setPreferences(data.preferences || EMPTY_PREFS);
        setSuggestions(data.suggestions || []);
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, content: "Sorry, I couldn't process that — please try again.", pending: false }
              : m
          )
        );
        setError('Something went wrong. Please try again.');
      } finally {
        setSending(false);
      }
    },
    [sessionId]
  );

  const resetSession = React.useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/session`, {
        method: 'DELETE',
        headers: { 'x-shop-session-id': sessionId },
      });
    } catch {
      // non-fatal
    }
    setMessages([]);
    setPreferences(EMPTY_PREFS);
    setSuggestions([]);
    setError(null);
  }, [sessionId]);

  return { messages, preferences, suggestions, sending, loadingSession, error, sendMessage, resetSession };
}