export type ScopeType = "national" | "state" | "metro";
export type ConditionFilter = "all" | "new" | "used";

export interface MarketScope {
  type: ScopeType;
  state?: string;
  city?: string;
  label: string;
  homeState?: string;
  homeCity?: string;
}

export interface DealerRollup {
  id: string;
  name: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  isYou: boolean;
  hasListings: boolean;
  active: number;
  sold: number;
  soldPrev: number;
  acquired: number;
  avgPrice: number;
  avgDaysOnLot: number;
  avgDaysToSell: number;
  freshPct: number;
  agedPct: number;
  sellThrough: number;
  momentum: number;
  newUnits: number;
  usedUnits: number;
  inventoryValue: number;
}

export interface MarketSignal {
  id: string;
  kind: "gainer" | "decliner" | "stocking" | "liquidating";
  dealerId: string;
  dealer: string;
  metric: string;
  change: number;
  detail: string;
}

export interface ModelDetail {
  id: string;
  make: string;
  model: string;
  scope: MarketScope;
  days: number;
  summary: {
    active: number;
    sold: number;
    dealers: number;
    avgPrice: number;
    avgMileage: number;
    avgDaysToSell: number;
    avgDaysOnLot: number;
    sellThrough: number;
    demandIndex: number;
    yours: number;
    yoursSold: number;
  };
  supplySeries: { label: string; value: number }[];
  byYear: {
    year: number;
    active: number;
    sold: number;
    avgPrice: number;
    avgDaysToSell: number;
    yours: number;
  }[];
  topDealers: {
    id: string;
    name: string;
    active: number;
    sold: number;
    avgPrice: number;
    isYou: boolean;
  }[];
  priceBands: { label: string; count: number }[];
  yourUnits: {
    id: string;
    vin: string;
    year: number;
    trim?: string;
    price: number;
    mileage: number;
    ageDays: number;
    step?: string;
  }[];
}

export interface StoreProfile {
  id: string;
  name: string;
  logoUrl?: string;
  memberSince?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
}

export interface MarketSummary {
  dealers: number;
  totalDealers: number;
  dormantDealers: number;
  activeListings: number;
  soldInPeriod: number;
  soldPrevPeriod: number;
  acquiredInPeriod: number;
  avgPrice: number;
  avgDaysOnLot: number;
  avgDaysToSell: number;
  avgInventoryPerDealer: number;
  sellThrough: number;
  salesDelta: number;
  supplyDays: number;
}

export type RankKey = "sales" | "acquisitions" | "turn" | "freshness" | "sellThrough";

export interface YourStanding extends DealerRollup {
  rankDelta: number;
  ranks: Record<RankKey, number | null>;
  percentiles: Record<RankKey, number>;
  vsMarket: {
    avgPrice: number;
    avgDaysOnLot: number;
    avgDaysToSell: number;
    sellThrough: number;
  };
}

export interface PrivateMetrics {
  avgGross: number;
  totalGross: number;
  unitsWithCost: number;
  costBasis: number;
  retailValue: number;
  potentialGross: number;
}

export interface OverviewResponse {
  scope: MarketScope;
  condition: ConditionFilter;
  days: number;
  store: StoreProfile | null;
  market: MarketSummary;
  signals: MarketSignal[];
  you: YourStanding | null;
  private: PrivateMetrics;
}

export interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  isYou: boolean;
  hasListings: boolean;
  momentum: number;
  rankDelta?: number;
  value: number;
}

export interface LeaderboardBoard {
  key: string;
  label: string;
  hint: string;
  unit: string;
  total: number;
  rows: LeaderboardRow[];
}

export interface LeaderboardsResponse {
  scope: MarketScope;
  competitorsOnly: boolean;
  watchedCount: number;
  boards: Record<RankKey, LeaderboardBoard>;
}

export interface TrendPoint {
  label: string;
  listings: number;
  yourListings: number;
  sold: number;
  yourSold: number;
  acquired: number;
  avgListPrice: number;
  avgDaysOnLot: number;
  avgDaysToSell: number;
}

export interface PriceByYearPoint {
  year: number;
  avgPrice: number;
  count: number;
}

export interface TrendsResponse {
  scope: MarketScope;
  weeks: number;
  series: TrendPoint[];
  priceByYear: PriceByYearPoint[];
}

export interface SupplyEntry {
  id: string;
  make: string;
  model: string;
  current: number;
  usual: number;
  yours: number;
  changePct: number;
  series: { label: string; value: number }[];
}

export interface SupplyResponse {
  scope: MarketScope;
  weeks: number;
  low: SupplyEntry[];
  high: SupplyEntry[];
}

export type PerformanceBoardKey = "active" | "turn" | "value" | "cars";

export interface PerformanceBoard {
  key: PerformanceBoardKey;
  label: string;
  hint: string;
  unit: "sold" | "days" | "currency" | "units";
  page: number;
  totalPages: number;
  total: number;
  yourRank: number | null;
  rows: LeaderboardRow[];
}

export interface Recommendation {
  id: string;
  year: number;
  make: string;
  model: string;
  sold: number;
  active: number;
  avgDaysToSell: number;
  avgAge: number;
  avgPrice: number;
  marketSold: number;
  marketActive: number;
  marketDaysToSell: number;
  reason: string;
}

export interface RecommendationsResponse {
  scope: MarketScope;
  days: number;
  buy: Recommendation[];
  caution: Recommendation[];
}

export interface Segment {
  id: string;
  make: string;
  model: string;
  active: number;
  sold: number;
  dealers: number;
  avgPrice: number;
  avgDaysToSell: number;
  sellThrough: number;
  demandIndex: number;
  yours: number;
  yoursSold: number;
  temperature: "hot" | "balanced" | "cold";
}

export interface AcquireOpportunity extends Segment {
  score: number;
}

export interface RepriceOpportunity {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  yourPrice: number;
  marketPrice: number;
  gap: number;
  gapPct: number;
  cohort: number;
  ageDays: number;
  direction: "above" | "below";
  suggestedPrice: number;
}

export interface AgedOpportunity {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  yourPrice: number;
  marketPrice: number;
  ageDays: number;
  marketTurn: number;
  overBy: number;
  step?: string;
}

export interface OpportunitiesResponse {
  scope: MarketScope;
  days: number;
  acquire: AcquireOpportunity[];
  reprice: RepriceOpportunity[];
  aged: AgedOpportunity[];
  scanned: number;
}

export interface DealerSearchResult {
  id: string;
  name: string;
  logoUrl?: string;
  active: number;
  avgPrice: number;
  address?: string;
  state?: string;
  city?: string;
  zip?: string;
  website?: string;
  isYou: boolean;
  hasListings: boolean;
  watched: boolean;
}

export interface DealerProfile {
  id: string;
  name: string;
  logoUrl?: string;
  memberSince?: string;
  isYou: boolean;
  metrics: DealerRollup | null;
  makeMix: { make: string; count: number }[];
  topModels: { make: string; model: string; active: number; sold: number }[];
  priceBands: { label: string; count: number }[];
  period: { added: number; sold: number };
}

export interface ScopeOptions {
  states: { value: string; count: number }[];
  metros: { city: string; state?: string; count: number }[];
}

export interface WatchlistResponse {
  watches: { targetOrganizationId: string; label?: string; createdAt: string }[];
  dealers: DealerRollup[];
}
