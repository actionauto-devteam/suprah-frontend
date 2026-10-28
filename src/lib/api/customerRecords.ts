import { apiClient } from "@/lib/api-client";

export type CustomerRecordStatus = "active" | "inactive" | "all";
export type CustomerRecordSort = "recent" | "name" | "newest";

export interface CustomerLeadCounts {
  total: number;
  open: number;
  closed: number;
}

export interface CustomerRecordListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  hasValidEmail: boolean;
  hasValidPhone: boolean;
  city: string;
  state: string;
  source: string;
  isActive: boolean;
  createdAt: string;
  leads: CustomerLeadCounts;
  vehiclesOfInterest: number;
  lastActivity: string | null;
}

export interface CustomerRecordList {
  customers: CustomerRecordListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  status: CustomerRecordStatus;
  sort: CustomerRecordSort;
}

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface CustomerRelatedLead {
  id: string;
  name: string;
  status: string;
  closed: boolean;
  source: string;
  sourceProvider: string;
  channel: string;
  vehicle: string;
  assignedTo: string;
  location: string;
  createdAt: string;
  lastActivity: string | null;
}

export interface CustomerVehicleInterest {
  year: string;
  make: string;
  model: string;
  trim: string;
  vin: string;
  stock: string;
  leadId: string | null;
  askedAt: string | null;
  leadStatus: string | null;
  inventoryStatus: string | null;
}

export interface CustomerLeadMarkedSold {
  leadId: string;
  status: string;
  vehicle: string;
  markedAt: string | null;
}

export interface CustomerReturningVisit {
  leadId: string;
  at: string;
  previousLeadId: string;
  previousStatus: string;
  previousClosedAt: string;
}

export interface CustomerAppointment {
  id: string;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  leadId: string | null;
  upcoming: boolean;
}

export interface CustomerProfileData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    alternatePhone: string;
    hasValidEmail: boolean;
    hasValidPhone: boolean;
    address: CustomerAddress;
    addressText: string;
    notes: string;
    preferredContactMethod: "email" | "phone" | "sms" | null;
    source: string;
    sourceLeadId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  relatedLeads: CustomerRelatedLead[];
  vehicles: { interest: CustomerVehicleInterest[]; owned: unknown[]; ownedAvailable: boolean };
  purchases: { available: boolean; verified: unknown[]; leadsMarkedSold: CustomerLeadMarkedSold[] };
  appointments: CustomerAppointment[];
  service: { available: boolean; records: unknown[] };
  summary: {
    leads: CustomerLeadCounts;
    appointments: { total: number; upcoming: number; completed: number };
    texts: { received: number; sent: number };
    calls: number | null;
    notes: number;
    vehiclesOfInterest: number;
    verifiedVehicles: number | null;
    firstContact: string | null;
    lastActivity: string | null;
    leadsNeedingReview: number | null;
    additionalInquiries: number | null;
    returning: { count: number; latest: CustomerReturningVisit } | null;
    verifiedPurchases: number | null;
    ownedVehicles: number | null;
    serviceVisits: number | null;
  };
}

export type CustomerTimelineFilter = "all" | "inquiry" | "appointment" | "status" | "assignment";

export interface CustomerTimelineEvent {
  id: string;
  at: string;
  category: "record" | "inquiry" | "appointment" | "status" | "assignment";
  type: string;
  title: string;
  detail: string;
  leadId: string | null;
  appointmentId: string | null;
  meta: {
    notPurchase?: boolean;
    newLead?: boolean;
    previousStatus?: string;
    previousClosedAt?: string;
    startTime?: string | null;
    from?: string;
    to?: string;
  };
}

export interface CustomerTimelinePage {
  items: CustomerTimelineEvent[];
  nextCursor: string | null;
  filter: CustomerTimelineFilter;
  counts: Record<CustomerTimelineFilter, number>;
  truncated: boolean;
}

export interface CustomerRecordUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: CustomerAddress;
  notes?: string;
  preferredContactMethod?: "email" | "phone" | "sms";
}

const authHeaders = (token: string | null) => (token ? { Authorization: `Bearer ${token}` } : {});

export async function fetchCustomerRecords(
  token: string | null,
  params: { search: string; status: CustomerRecordStatus; sort: CustomerRecordSort; page: number; limit?: number },
): Promise<CustomerRecordList> {
  const response = await apiClient.get("/api/crm/customer-records", {
    headers: authHeaders(token),
    params: { search: params.search || undefined, status: params.status, sort: params.sort, page: params.page, limit: params.limit ?? 25 },
  });
  return response.data?.data as CustomerRecordList;
}

export async function fetchCustomerProfile(token: string | null, id: string): Promise<CustomerProfileData> {
  const response = await apiClient.get(`/api/crm/customer-records/${encodeURIComponent(id)}`, { headers: authHeaders(token) });
  return response.data?.data as CustomerProfileData;
}

export async function fetchCustomerTimeline(
  token: string | null,
  id: string,
  params: { filter: CustomerTimelineFilter; before?: string | null; limit?: number },
): Promise<CustomerTimelinePage> {
  const response = await apiClient.get(`/api/crm/customer-records/${encodeURIComponent(id)}/timeline`, {
    headers: authHeaders(token),
    params: { filter: params.filter, before: params.before || undefined, limit: params.limit ?? 25 },
  });
  return response.data?.data as CustomerTimelinePage;
}

export async function updateCustomerRecord(token: string | null, id: string, changes: CustomerRecordUpdate): Promise<CustomerProfileData> {
  const response = await apiClient.patch(`/api/crm/customer-records/${encodeURIComponent(id)}`, changes, { headers: authHeaders(token) });
  return response.data?.data as CustomerProfileData;
}

export interface CustomerCatchUpStatus {
  canView: boolean;
  ready: boolean;
  remaining: number;
}

export async function fetchCustomerCatchUpStatus(token: string | null): Promise<CustomerCatchUpStatus> {
  const response = await apiClient.get("/api/crm/customer-records/catch-up", { headers: authHeaders(token) });
  return response.data?.data as CustomerCatchUpStatus;
}

export function customerRecordErrorStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return typeof status === "number" ? status : null;
}

export function customerRecordErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
