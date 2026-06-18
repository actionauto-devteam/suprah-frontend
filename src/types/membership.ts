export interface MembershipTier {
  _id: string;
  name: string;
  slug: string;
  rank: number;
  minPoints: number;
  discountPercent: number;
  benefits: string[];
  colorTheme: {
    primary: string;
    secondary: string;
    gradient: string[];
  };
  isActive: boolean;
}

export interface MembershipPoints {
  lifetimePoints: number;
  currentPoints: number;
  currentTierSlug: string;
  currentTierRank: number;
}

export interface MembershipStatus {
  points: MembershipPoints;
  currentTier: MembershipTier;
  nextTier: MembershipTier | null;
  pointsToNextTier: number | null;
  progressPercent: number;
}

export type PointSourceType =
  | 'aftermarket_order'
  | 'service_appointment'
  | 'test_drive'
  | 'referral_conversion'
  | 'profile_completion'
  | 'account_anniversary'
  | 'admin_adjustment';

export interface PointTransaction {
  _id: string;
  delta: number;
  balanceAfter: number;
  sourceType: PointSourceType;
  sourceId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PointHistoryResponse {
  transactions: PointTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface DiscountTokenResponse {
  token: string;
  discountPercent: number;
  tierSlug: string;
  expiresAt: string;
}
