import { apiClient } from "@/lib/api-client";

const authHeaders = (token: string | null) => (token ? { Authorization: `Bearer ${token}` } : {});

export interface CustomerFeedbackItem {
  id: string;
  status: "requested" | "answered";
  rating: number | null;
  comment: string;
  channel: "sms" | "email";
  source: "automation" | "appointment";
  leadId: string | null;
  requestedAt: string;
  answeredAt: string | null;
  lowRating: boolean;
  expired: boolean;
}

export interface CustomerFeedbackList {
  average: number | null;
  answered: number;
  requested: number;
  items: CustomerFeedbackItem[];
}

export async function fetchCustomerFeedback(token: string | null, customerId: string): Promise<CustomerFeedbackList> {
  const response = await apiClient.get(`/api/crm/customer-records/${encodeURIComponent(customerId)}/feedback`, { headers: authHeaders(token) });
  return response.data?.data as CustomerFeedbackList;
}

export type SupportRequestStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved";

export interface SupportRequestItem {
  id: string;
  customerId: string;
  leadId: string | null;
  type: string;
  typeLabel: string;
  details: string;
  status: SupportRequestStatus;
  statusLabel: string;
  assignedTo: string | null;
  assignedName: string;
  createdBy: { userId: string; name: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  history: Array<{ action: "created" | "status" | "assigned" | "note"; from: string | null; to: string | null; note: string; by: { userId: string; name: string }; at: string }>;
}

export interface SupportRequestList {
  items: SupportRequestItem[];
  team: Array<{ id: string; name: string }>;
  types: Array<{ value: string; label: string }>;
  statuses: Array<{ value: SupportRequestStatus; label: string }>;
}

export async function fetchSupportRequests(token: string | null, customerId: string): Promise<SupportRequestList> {
  const response = await apiClient.get(`/api/crm/customer-records/${encodeURIComponent(customerId)}/support-requests`, { headers: authHeaders(token) });
  return response.data?.data as SupportRequestList;
}

export async function createSupportRequest(
  token: string | null,
  customerId: string,
  body: { type: string; details: string; assignedTo: string | null },
): Promise<SupportRequestItem> {
  const response = await apiClient.post(`/api/crm/customer-records/${encodeURIComponent(customerId)}/support-requests`, body, { headers: authHeaders(token) });
  return response.data?.data as SupportRequestItem;
}

export async function updateSupportRequest(
  token: string | null,
  customerId: string,
  requestId: string,
  body: { status?: SupportRequestStatus; assignedTo?: string | null; note?: string },
): Promise<SupportRequestItem> {
  const response = await apiClient.patch(
    `/api/crm/customer-records/${encodeURIComponent(customerId)}/support-requests/${encodeURIComponent(requestId)}`,
    body,
    { headers: authHeaders(token) },
  );
  return response.data?.data as SupportRequestItem;
}

export type DealStage = "new" | "working" | "offer_sent" | "negotiating" | "won" | "lost";

export const DEAL_STAGE_ORDER: DealStage[] = ["new", "working", "offer_sent", "negotiating", "won", "lost"];
export const OPEN_DEAL_STAGES: DealStage[] = ["new", "working", "offer_sent", "negotiating"];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: "New",
  working: "Working",
  offer_sent: "Offer sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

export const DEAL_STAGE_STYLES: Record<DealStage, string> = {
  new: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-400/10 dark:text-zinc-300",
  working: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  offer_sent: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300",
  negotiating: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  won: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  lost: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
};

export interface DealOffer {
  id: string;
  from: "customer" | "dealership";
  amount: number | null;
  note: string;
  by: { userId: string; name: string };
  at: string;
}

export interface Deal {
  id: string;
  leadId: string;
  customerId: string | null;
  title: string;
  customerName: string;
  vehicle: { label: string; vin: string; stock: string };
  stage: DealStage;
  stageLabel: string;
  amountsVisible: boolean;
  canEdit: boolean;
  amount: number | null;
  offers: DealOffer[];
  assignedTo: string | null;
  assignedName: string;
  lostReason: string;
  wonAt: string | null;
  lostAt: string | null;
  createdBy: { name: string; kind: "staff" | "automation" };
  history: Array<{ action: string; from: string | null; to: string | null; by: { userId: string; name: string }; at: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface DealList {
  items: Deal[];
  stages: Array<{ value: DealStage; label: string }>;
  team: Array<{ id: string; name: string }>;
  canAssign: boolean;
  viewerUserId: string | null;
}

export interface DealLeadOption {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  vehicle: string;
  createdAt: string;
}

export async function fetchDeals(token: string | null, params: { search?: string; customerId?: string; mine?: boolean } = {}): Promise<DealList> {
  const response = await apiClient.get("/api/crm/deals", {
    headers: authHeaders(token),
    params: { search: params.search || undefined, customerId: params.customerId || undefined, mine: params.mine ? "true" : undefined },
  });
  return response.data?.data as DealList;
}

export async function searchDealLeads(token: string | null, search: string): Promise<DealLeadOption[]> {
  const response = await apiClient.get("/api/crm/deals/lead-search", { headers: authHeaders(token), params: { search } });
  return (response.data?.data || []) as DealLeadOption[];
}

export async function createDeal(
  token: string | null,
  body: { leadId: string; title?: string; amount?: number | null; assignedTo?: string | null; stage?: DealStage },
): Promise<Deal> {
  const response = await apiClient.post("/api/crm/deals", body, { headers: authHeaders(token) });
  return response.data?.data as Deal;
}

export async function updateDeal(
  token: string | null,
  id: string,
  body: { title?: string; stage?: DealStage; amount?: number | null; assignedTo?: string | null; lostReason?: string; markLeadSold?: boolean },
): Promise<{ deal: Deal; leadSold: string | null }> {
  const response = await apiClient.patch(`/api/crm/deals/${encodeURIComponent(id)}`, body, { headers: authHeaders(token) });
  return response.data?.data as { deal: Deal; leadSold: string | null };
}

export async function addDealOffer(token: string | null, id: string, body: { amount: number; from: "customer" | "dealership"; note: string }): Promise<Deal> {
  const response = await apiClient.post(`/api/crm/deals/${encodeURIComponent(id)}/offers`, body, { headers: authHeaders(token) });
  return response.data?.data as Deal;
}

export async function deleteDeal(token: string | null, id: string): Promise<void> {
  await apiClient.delete(`/api/crm/deals/${encodeURIComponent(id)}`, { headers: authHeaders(token) });
}

export interface PurchaseVehicleInput {
  label?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  stock?: string;
}

export interface CustomerPurchaseItem {
  id: string;
  customerId: string | null;
  leadId: string | null;
  dealId: string | null;
  vehicle: { label: string; year: string; make: string; model: string; trim: string; vin: string; stock: string };
  salePrice: number | null;
  soldAt: string;
  salesperson: { id: string | null; name: string };
  source: "deal" | "lead_sold" | "manual" | "import";
  sourceLabel: string;
  notes: string;
  createdBy: { userId: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPurchaseList {
  items: CustomerPurchaseItem[];
  team: Array<{ id: string; name: string }>;
}

export interface PurchaseInput {
  vehicle: PurchaseVehicleInput;
  salePrice: number | null;
  soldAt: string;
  salespersonId: string | null;
  notes: string;
  leadId?: string | null;
}

export interface SalesImportRow {
  row: number;
  email?: string;
  phone?: string;
  vin?: string;
  stock?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  salePrice?: string;
  soldAt?: string;
  salesperson?: string;
  notes?: string;
}

export interface SalesImportResult {
  added: number;
  duplicates: number;
  unmatched: number;
  invalid: number;
  problems: Array<{ row: number; reason: string }>;
}

export async function fetchCustomerPurchases(token: string | null, customerId: string): Promise<CustomerPurchaseList> {
  const response = await apiClient.get(`/api/crm/customer-records/${encodeURIComponent(customerId)}/purchases`, { headers: authHeaders(token) });
  return response.data?.data as CustomerPurchaseList;
}

export async function createCustomerPurchase(token: string | null, customerId: string, body: PurchaseInput): Promise<CustomerPurchaseItem> {
  const response = await apiClient.post(`/api/crm/customer-records/${encodeURIComponent(customerId)}/purchases`, body, { headers: authHeaders(token) });
  return response.data?.data as CustomerPurchaseItem;
}

export async function updateCustomerPurchase(token: string | null, customerId: string, purchaseId: string, body: Partial<PurchaseInput>): Promise<CustomerPurchaseItem> {
  const response = await apiClient.patch(
    `/api/crm/customer-records/${encodeURIComponent(customerId)}/purchases/${encodeURIComponent(purchaseId)}`,
    body,
    { headers: authHeaders(token) },
  );
  return response.data?.data as CustomerPurchaseItem;
}

export async function deleteCustomerPurchase(token: string | null, customerId: string, purchaseId: string): Promise<void> {
  await apiClient.delete(`/api/crm/customer-records/${encodeURIComponent(customerId)}/purchases/${encodeURIComponent(purchaseId)}`, { headers: authHeaders(token) });
}

export async function importSales(token: string | null, rows: SalesImportRow[]): Promise<SalesImportResult> {
  const response = await apiClient.post("/api/crm/customer-records/purchases/import", { rows }, { headers: authHeaders(token) });
  return response.data?.data as SalesImportResult;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value % 1 ? 2 : 0 });
}

export function afterSaleError(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
