export interface DriverPayout {
  _id: string;
  organizationId: string;
  loadId: string | { _id: string; loadNumber?: string; trackingNumber?: string; origin?: string; destination?: string };
  driverId: string | { _id: string; name: string; email: string; avatar?: string };
  driverName: string;
  driverEmail: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  stripeTransferId?: string;
  payoutNumber?: string;
  paidAt?: string;
  failureReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverableLoad {
  _id: string;
  loadNumber?: string;
  trackingNumber?: string;
  origin: string;
  destination: string;
  delivered?: string;
  createdAt: string;
  assignedDriverId: {
    _id: string;
    name: string;
    email: string;
    stripeConnectAccountId?: string;
  };
  preservedQuoteData?: {
    rate?: number;
    vehicleName?: string;
    firstName?: string;
    lastName?: string;
  };
  existingPayout?: DriverPayout | null;
  pendingConfirmation?: boolean;
  proofOfDelivery?: {
    imageUrl: string;
    submittedAt: string;
    note?: string;
    confirmedAt?: string;
  };
}

export interface DriverPayoutStats {
  totalPaid: number;
  totalPending: number;
  countPaid: number;
  countPending: number;
  countFailed: number;
}

export interface CreatePayoutData {
  loadId: string;
  driverId: string;
  amount: number;
  description?: string;
  notes?: string;
}

export interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  /** Stripe can send transfers to this account. */
  transfersActive?: boolean;
  /** Ready to receive payouts (driver accounts never charge cards). */
  ready?: boolean;
  /** Stripe is waiting on the driver for more information. */
  needsMoreInfo?: boolean;
}

/**
 * Whether a payout account can receive payouts (2026-11-19). Uses the
 * server's answer, and on an older server falls back to bank payouts being
 * on: card charges stay off for driver accounts, so they must not count.
 */
export function payoutAccountReady(status: StripeConnectStatus | null | undefined): boolean {
  if (!status?.connected) return false;
  if (typeof status.ready === "boolean") return status.ready;
  return status.detailsSubmitted === true && status.payoutsEnabled === true;
}
