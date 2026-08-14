"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import type {
  ConditionFilter,
  DealerProfile,
  DealerRollup,
  DealerSearchResult,
  LeaderboardsResponse,
  ModelDetail,
  OpportunitiesResponse,
  OverviewResponse,
  PerformanceBoard,
  PerformanceBoardKey,
  RecommendationsResponse,
  ScopeOptions,
  ScopeType,
  Segment,
  SupplyResponse,
  TrendsResponse,
  WatchlistResponse,
} from "@/types/suprah-radar";

const BASE = "/api/suprah-radar";
const STALE = 120_000;
const AUTO_REFRESH_MS = 300_000;

const live = {
  staleTime: STALE,
  refetchInterval: AUTO_REFRESH_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  placeholderData: <T,>(previous: T) => previous,
} as const;

export interface MarketFilters {
  scope: ScopeType;
  state?: string;
  city?: string;
  condition: ConditionFilter;
  days: number;
}

export const defaultFilters: MarketFilters = {
  scope: "national",
  condition: "all",
  days: 30,
};

function toParams(f: MarketFilters, extra: Record<string, unknown> = {}) {
  return {
    scope: f.scope,
    state: f.state,
    city: f.city,
    condition: f.condition,
    days: f.days,
    ...extra,
  };
}

function keyOf(f: MarketFilters) {
  return [f.scope, f.state ?? "", f.city ?? "", f.condition, f.days];
}

function useAuthHeaders() {
  const { getToken } = useAuth();
  return useCallback(async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);
}

function unwrap<T>(response: { data?: { data?: T } | T }): T {
  const body = response.data as { data?: T } | undefined;
  return ((body && "data" in (body as object) ? (body as { data?: T }).data : body) ?? null) as T;
}

export function useMarketOverview(filters: MarketFilters) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<OverviewResponse>({
    queryKey: ["market-iq-overview", ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/overview`, { ...headers, params: toParams(filters) });
      return unwrap<OverviewResponse>(res);
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useMarketLeaderboards(
  filters: MarketFilters,
  limit = 10,
  competitorsOnly = false,
) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<LeaderboardsResponse>({
    queryKey: ["market-iq-leaderboards", ...keyOf(filters), limit, competitorsOnly],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/leaderboards`, {
        ...headers,
        params: toParams(filters, { limit, competitors: competitorsOnly ? 1 : undefined }),
      });
      return unwrap<LeaderboardsResponse>(res);
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useMarketTrends(filters: MarketFilters, weeks = 12) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<TrendsResponse>({
    queryKey: ["market-iq-trends", ...keyOf(filters), weeks],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/trends`, {
        ...headers,
        params: toParams(filters, { weeks }),
      });
      const data = unwrap<TrendsResponse>(res);
      return { ...data, series: data?.series ?? [], priceByYear: data?.priceByYear ?? [] };
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useMarketSupply(filters: MarketFilters, weeks = 7) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<SupplyResponse>({
    queryKey: ["market-iq-supply", ...keyOf(filters), weeks],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/supply`, {
        ...headers,
        params: toParams(filters, { weeks }),
      });
      const data = unwrap<SupplyResponse>(res);
      return { ...data, low: data?.low ?? [], high: data?.high ?? [] };
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useDealerPerformance(
  filters: MarketFilters,
  board: PerformanceBoardKey,
  page: number,
  competitorsOnly = false,
) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<PerformanceBoard>({
    queryKey: ["market-iq-performance", ...keyOf(filters), board, page, competitorsOnly],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/dealer-performance`, {
        ...headers,
        params: toParams(filters, {
          board,
          page,
          competitors: competitorsOnly ? 1 : undefined,
        }),
      });
      return unwrap<PerformanceBoard>(res);
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useRecommendations(filters: MarketFilters, days = 90) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<RecommendationsResponse>({
    queryKey: ["market-iq-recommendations", ...keyOf(filters), days],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/recommendations`, {
        ...headers,
        params: toParams(filters, { days }),
      });
      const data = unwrap<RecommendationsResponse>(res);
      return { ...data, buy: data?.buy ?? [], caution: data?.caution ?? [] };
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useMarketSegments(filters: MarketFilters) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<Segment[]>({
    queryKey: ["market-iq-segments", ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/segments`, { ...headers, params: toParams(filters) });
      return unwrap<{ segments: Segment[] }>(res)?.segments ?? [];
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useMarketOpportunities(filters: MarketFilters) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<OpportunitiesResponse>({
    queryKey: ["market-iq-opportunities", ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/opportunities`, {
        ...headers,
        params: toParams(filters),
      });
      return unwrap<OpportunitiesResponse>(res);
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useModelDetail(
  target: { make: string; model: string } | null,
  filters: MarketFilters,
) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<ModelDetail>({
    queryKey: ["market-iq-model", target?.make, target?.model, ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/model-detail`, {
        ...headers,
        params: toParams(filters, { make: target?.make, model: target?.model }),
      });
      return unwrap<ModelDetail>(res);
    },
    enabled: !!target?.make && !!target?.model && !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useScopeOptions() {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<ScopeOptions>({
    queryKey: ["market-iq-scope-options"],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/scope-options`, headers);
      return unwrap<ScopeOptions>(res);
    },
    enabled: !!isLoaded && !!isSignedIn,
    staleTime: 3_600_000,
  });
}

export function useDealerSearch(term: string, enabled: boolean) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<DealerSearchResult[]>({
    queryKey: ["market-iq-dealers", term],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/dealers`, {
        ...headers,
        params: { search: term, limit: 20 },
      });
      return unwrap<DealerSearchResult[]>(res) ?? [];
    },
    enabled: enabled && !!isLoaded && !!isSignedIn,
    staleTime: 60_000,
  });
}

export function useDealerProfile(dealerId: string | null, filters: MarketFilters) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<DealerProfile>({
    queryKey: ["market-iq-dealer", dealerId, ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/dealers/${dealerId}`, {
        ...headers,
        params: toParams(filters),
      });
      return unwrap<DealerProfile>(res);
    },
    enabled: !!dealerId && !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useDealerComparison(ids: string[], filters: MarketFilters) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<DealerRollup[]>({
    queryKey: ["market-iq-compare", ids.join(","), ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/compare`, {
        ...headers,
        params: toParams(filters, { ids: ids.join(",") }),
      });
      return unwrap<DealerRollup[]>(res) ?? [];
    },
    enabled: ids.length > 0 && !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useWatchlist(filters: MarketFilters) {
  const { isLoaded, isSignedIn } = useAuth();
  const getHeaders = useAuthHeaders();

  return useQuery<WatchlistResponse>({
    queryKey: ["market-iq-watchlist", ...keyOf(filters)],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get(`${BASE}/watchlist`, { ...headers, params: toParams(filters) });
      return unwrap<WatchlistResponse>(res) ?? { watches: [], dealers: [] };
    },
    enabled: !!isLoaded && !!isSignedIn,
    ...live,
  });
}

export function useToggleWatch() {
  const queryClient = useQueryClient();
  const getHeaders = useAuthHeaders();

  return useMutation({
    mutationFn: async ({ dealerId, watched }: { dealerId: string; watched: boolean }) => {
      const headers = await getHeaders();
      if (watched) {
        await apiClient.delete(`${BASE}/watchlist/${dealerId}`, headers);
        return { dealerId, watched: false };
      }
      await apiClient.post(`${BASE}/watchlist`, { dealerId }, headers);
      return { dealerId, watched: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-iq-watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["market-iq-dealers"] });
    },
  });
}

export async function downloadMarketCsv(
  filters: MarketFilters,
  getToken: () => Promise<string | null>,
) {
  const token = await getToken();
  const res = await apiClient.get(`${BASE}/export`, {
    headers: { Authorization: `Bearer ${token}` },
    params: toParams(filters),
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `suprah-radar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
