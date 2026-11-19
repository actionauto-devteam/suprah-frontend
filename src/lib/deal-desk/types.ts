export type DealStage =
  | 'draft'
  | 'submitted'
  | 'picked_up'
  | 'processing'
  | 'needs_info'
  | 'structured'
  | 'ready_for_fi'
  | 'offered'
  | 'in_fi'
  | 'signed'
  | 'funded'
  | 'cancelled';

export type DealSource = 'supra' | 'web' | 'crm';

export interface PersonRef {
  id?: string;
  name: string;
}

export interface DealSummary {
  id: string;
  dealNumber: number;
  source: DealSource;
  stage: DealStage;
  stageLabel: string;
  stageEnteredAt: string;
  customerName: string;
  vehicleLabel: string;
  salesperson: PersonRef | null;
  reviewer: PersonRef | null;
  financeManager: PersonRef | null;
  offer: { fmId?: string; fmName?: string; offeredAt?: string; expiresAt?: string; round?: number } | null;
  rotations: number;
  escalated: boolean;
  amountFinanced?: number;
  ltv?: number;
  dti?: number;
  pti?: number;
  readiness?: number;
  estPayment?: number;
  bestLender: { name: string; fit: string; rate?: number } | null;
  blockingFlags: number;
  warningFlags: number;
  docCount: number;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

export interface DealFlag {
  level: 'block' | 'warn' | 'info';
  code: string;
  message: string;
}

export interface LenderMatch {
  lenderId?: string;
  name: string;
  type?: string;
  fit: 'strong' | 'good' | 'stretch' | 'fail';
  score: number;
  rate?: number;
  rateMax?: number;
  term?: number;
  payment?: number;
  dti?: number;
  pti?: number;
  reasons: string[];
}

export interface DealDocument {
  id: string;
  kind: string;
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
  uploadedBy: PersonRef | null;
  hasExtraction: boolean;
}

export interface DealDetail extends DealSummary {
  customer: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dob?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
  };
  coBuyer: { present?: boolean; firstName?: string; lastName?: string; grossMonthlyIncome?: number };
  vehicle: {
    vin?: string;
    stockNumber?: string;
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    mileage?: number;
    condition?: 'new' | 'used' | 'cpo';
    price?: number;
    bookValue?: number;
    bookSource?: string;
  };
  tradeIn: { present?: boolean; vin?: string; year?: number; make?: string; model?: string; mileage?: number; allowance?: number; payoff?: number; lienholder?: string };
  fourSquare: { salePrice?: number; docFee?: number; otherFees?: number; taxRate?: number; downPayment?: number; backendProducts?: number; desiredPayment?: number; desiredTerm?: number };
  creditApp: {
    employer?: string;
    jobTitle?: string;
    employmentMonths?: number;
    grossMonthlyIncome?: number;
    otherMonthlyIncome?: number;
    housingStatus?: 'own' | 'rent' | 'family' | 'other';
    housingPayment?: number;
    residenceMonths?: number;
    monthlyDebt?: number;
    creditScore?: number;
    creditScoreSource?: 'self_reported' | 'bureau' | 'lender';
    ssnLast4?: string;
    ssnMasked?: string;
    hasFullSsn?: boolean;
    consent?: { granted: boolean; at?: string };
  };
  documents: DealDocument[];
  analysis: null | {
    computedAt: string;
    rulesVersion: string;
    taxAmount: number;
    netTrade: number;
    amountFinanced: number;
    bookValueUsed?: number;
    ltv?: number;
    dti?: number;
    pti?: number;
    estRate?: number;
    estTerm?: number;
    estPayment?: number;
    readiness: number;
    flags: DealFlag[];
    aiSummary?: string;
    aiProvider?: string;
    hasExtraction?: boolean;
  };
  lenderMatches: LenderMatch[];
  stageHistory: { stage: DealStage; label: string; enteredAt: string; exitedAt?: string; durationMs?: number; actorName?: string }[];
  offerAttempts: { fmId: string; fmName?: string; offeredAt?: string; outcome: string; at: string; round: number }[];
  timestamps: Record<string, string | undefined>;
  needsInfoNote?: string;
  cancelReason?: string;
  depositRequested: boolean;
}

export interface DealMessage {
  id: string;
  dealId: string;
  kind: 'user' | 'system' | 'ai';
  authorId?: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface DealEvent {
  id: string;
  action: string;
  actorName?: string;
  from?: string;
  to?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface DealPermissions {
  edit: boolean;
  submit: boolean;
  pickup: boolean;
  returnToQueue: boolean;
  analyze: boolean;
  requestInfo: boolean;
  approve: boolean;
  approveOverride: boolean;
  acceptOffer: boolean;
  declineOffer: boolean;
  release: boolean;
  markSigned: boolean;
  markFunded: boolean;
  cancel: boolean;
  backToStructured: boolean;
  revealSsn: boolean;
  uploadDocs: boolean;
  message: boolean;
}

export interface Roles {
  isAdmin: boolean;
  isManager: boolean;
  isReviewer: boolean;
  isFm: boolean;
  isStaff: boolean;
}

export interface Bootstrap {
  actor: { id: string; name: string; role: string };
  roles: Roles;
  settings: {
    sla: Record<string, number>;
    acceptWindowSeconds: number;
    requireDocsToSubmit: boolean;
    defaultTaxRate: number;
    defaultDocFee: number;
    aiEnabled: boolean;
  };
  capabilities: { aiProvider: 'anthropic' | 'openai' | 'none'; piiEncryption: boolean };
  myPresence: { available: boolean; activeDealCount: number } | null;
  consentText: string;
  requiredDocuments: string[];
  documentKinds: string[];
}

export interface FmPresence {
  userId: string;
  name: string;
  available: boolean;
  activeDealCount: number;
  lastAssignedAt: string | null;
}

export interface TimingStat {
  count: number;
  avgMs: number | null;
  medianMs: number | null;
  p90Ms: number | null;
}

export interface QueueMetrics {
  range: string;
  since: string;
  generatedAt: string;
  sla: Record<string, number>;
  live: {
    open: number;
    late: number;
    byStage: { stage: DealStage; label: string; target?: number; count: number; ok: number; warn: number; late: number; oldestMs: number }[];
  };
  timings: {
    firstPickup: TimingStat;
    submitToFi: TimingStat;
    submitToSigned: TimingStat;
    fmAccept: TimingStat;
    timeInFi: TimingStat;
    byStage: ({ stage: DealStage; label: string; target?: number } & TimingStat)[];
  };
  rotation: { acceptedDeals: number; declined: number; expired: number; escalated: number; avgRotationsPerDeal: number };
  bySource: Record<string, number>;
  byFm: { id: string; name: string; offers: number; accepted: number; declined: number; expired: number; signed: number; acceptRate: number; avgAcceptMs: number | null }[];
  bySalesperson: { id: string; name: string; submitted: number; needsInfo: number; signed: number; avgPickupMs: number | null }[];
  daily: { date: string; submitted: number; signed: number; funded: number }[];
  presence: FmPresence[];
}

export interface DealDeskSettings {
  orgKey: string;
  dealerName: string;
  reviewerIds: string[];
  financeManagerIds: string[];
  managerIds: string[];
  acceptWindowSeconds: number;
  maxRoundsBeforeEscalation: number;
  maxActiveDealsPerFm: number;
  slaMinutes: Record<string, number>;
  defaultTaxRate: number;
  defaultDocFee: number;
  maxRateMarkup: number;
  aiEnabled: boolean;
  requireDocsToSubmit: boolean;
  widget: { enabled: boolean; allowedOrigins: string[]; depositAmount: number; headline?: string; accentColor?: string };
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
  department?: string;
}

export interface Lender {
  id: string;
  name: string;
  type: 'bank' | 'credit_union' | 'captive' | 'subprime' | 'other';
  active: boolean;
  minScore?: number;
  maxLtv?: number;
  maxDti?: number;
  maxPti?: number;
  maxTerm?: number;
  minAmount?: number;
  maxAmount?: number;
  maxMileage?: number;
  maxVehicleAge?: number;
  rateTiers: { minScore: number; rate: number }[];
  notes?: string;
}

export type DealScope = 'needs_me' | 'open' | 'mine' | 'closed' | 'drafts';
