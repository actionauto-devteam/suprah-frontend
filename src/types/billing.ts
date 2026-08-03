export type PaymentLineItemKind =
  | "product"
  | "fee"
  | "charge"
  | "discount";

export interface PaymentLineItem {
  label: string;
  kind: PaymentLineItemKind;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";

export type PaymentSource =
  | "manual"
  | "aftermarket";

export interface Payment {
  _id: string;
  organizationId: string;
  orgId?: string;
  customerId: string;

  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  amount: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  lineItems?: PaymentLineItem[];

  currency: string;
  description: string;
  status: PaymentStatus;

  source?: PaymentSource;
  aftermarketProductId?: string;
  inquiryId?: string;

  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripeCustomerId?: string;
  stripeChargeId?: string;
  paymentMethod?: string;
  receiptUrl?: string;

  quoteId?: string;
  shipmentId?: string;
  loadId?: string;
  invoiceNumber?: string;

  failureReason?: string;
  notes?: string;
  paidAt?: string;
  dueDate?: string;

  createdBy?:
    | string
    | {
        _id: string;
        name: string;
        email: string;
      };

  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  byStatus: Record<string, { count: number; totalAmount: number }>;
  totalCount: number;
  totalRevenue: number;
  pendingAmount: number;
}

export interface CreatePaymentData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  currency?: string;
  description: string;
  quoteId?: string;
  shipmentId?: string;
  dueDate?: string;
  notes?: string;
}
