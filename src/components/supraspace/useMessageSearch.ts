'use client';

import * as React from 'react';
import { apiClient } from '@/lib/api-client';

type Cursor = { before: string; beforeId: string };

export function useMessageSearch<T extends { _id: string }>(token: string | null | undefined, query: string, conversationId?: string | null, enabled = true) {
  const [results, setResults] = React.useState<T[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [cursor, setCursor] = React.useState<Cursor | null>(null);
  const [error, setError] = React.useState(false);
  const generation = React.useRef(0);
  const inFlight = React.useRef(false);
  const [retry, setRetry] = React.useState(0);
  const fetchPage = React.useCallback(async (next: Cursor | null, version: number) => {
    inFlight.current = true;
    setSearching(true);
    setError(false);
    try {
      const response = await apiClient.get('/api/supraspace/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: query.trim(), conversationId: conversationId || undefined, ...next },
      });
      if (generation.current !== version) return;
      const messages: T[] = response.data?.data || [];
      setResults(previous => next ? Array.from(new Map([...previous, ...messages].map(message => [message._id, message])).values()) : messages);
      setCursor(response.data?.nextCursor || null);
    } catch {
      if (generation.current === version) setError(true);
    } finally {
      if (generation.current === version) {
        inFlight.current = false;
        setSearching(false);
      }
    }
  }, [token, query, conversationId]);

  React.useEffect(() => {
    const version = ++generation.current;
    setResults([]);
    setCursor(null);
    setError(false);
    inFlight.current = false;
    const valid = enabled && !!token && query.trim().length >= 2;
    setSearching(valid);
    if (!valid) return;
    const timer = window.setTimeout(() => { void fetchPage(null, version); }, 350);
    return () => { window.clearTimeout(timer); generation.current = version + 1; };
  }, [enabled, token, query, conversationId, fetchPage, retry]);

  const loadMore = () => {
    if (inFlight.current) return;
    if (cursor) void fetchPage(cursor, generation.current);
    else if (error) setRetry(previous => previous + 1);
  };
  return { results, searching, hasMore: !!cursor, error, loadMore };
}
