import { apiClient } from "../api-client";

export type IntakeMode = "off" | "active" | "paused";

export interface ReviewLeadSummary {
  _id: string;
  name: string;
  status: string;
  source?: string | null;
  channel?: string | null;
  assignedTo?: string | null;
  unverified?: boolean;
  createdAt?: string;
}

export interface LeadReviewItem {
  inquiryId: string;
  kind: string;
  channel?: string | null;
  source?: string | null;
  sourceProvider?: string | null;
  receivedAt: string;
  contact: { name?: string | null; phone?: string | null; email?: string | null };
  vehicle?: { year?: string; make?: string; model?: string } | null;
  subject?: string | null;
  message: string;
  review: {
    state: string;
    kind: "unassigned" | "possible_match";
    reason?: string | null;
    resolution?: string | null;
    resolvedBy?: { name?: string } | null;
    resolvedAt?: string | null;
    note?: string | null;
  };
  lead: ReviewLeadSummary | null;
  candidates: ReviewLeadSummary[];
}

export type ReviewResolution = "associate" | "create_lead" | "not_customer_inquiry" | "keep_separate";

export type ActiveLeadLookup =
  | { leadClosed: false }
  | { leadClosed: true; status: "single"; lead: ReviewLeadSummary }
  | { leadClosed: true; status: "multiple"; candidates: ReviewLeadSummary[] }
  | { leadClosed: true; status: "none" | "uncertain" };

export async function getLeadReviews(state: "pending" | "resolved" = "pending") {
  const res = await apiClient.get("/api/crm/lead-intake/reviews", { params: { state } });
  return res.data?.data as { items: LeadReviewItem[]; pending: number; canResolve: boolean };
}

export async function getLeadReviewCount() {
  const res = await apiClient.get("/api/crm/lead-intake/reviews/count");
  return res.data?.data as { pending: number; canResolve: boolean; intakeMode: IntakeMode };
}

export async function resolveLeadReview(inquiryId: string, body: { resolution: ReviewResolution; leadId?: string; note?: string }) {
  const res = await apiClient.post(`/api/crm/lead-intake/reviews/${inquiryId}/resolve`, body);
  return res.data?.data as { inquiryId: string; resolution: string; leadId: string | null };
}

export async function getActiveLeadForClosedLead(leadId: string) {
  const res = await apiClient.get(`/api/crm/lead-intake/leads/${leadId}/active-lead`);
  return res.data?.data as ActiveLeadLookup;
}

export async function startFreshLead(leadId: string, note?: string) {
  const res = await apiClient.post(`/api/crm/lead-intake/leads/${leadId}/fresh-lead`, note ? { note } : {});
  return res.data?.data as { status: string; leadId: string | null };
}

export async function linkUnverifiedLead(leadId: string, targetLeadId: string, note?: string) {
  const res = await apiClient.post(`/api/crm/lead-intake/leads/${leadId}/link`, { targetLeadId, note });
  return res.data?.data as { leadId: string };
}

export async function getIntakeControl() {
  const res = await apiClient.get("/api/crm/lead-intake/control");
  return res.data?.data as { mode: IntakeMode; reason?: string | null; updatedAt?: string | null; canManage: boolean; heldEvents?: number | null };
}

export async function setIntakeControl(mode: IntakeMode, reason: string) {
  const res = await apiClient.put("/api/crm/lead-intake/control", { mode, reason });
  return res.data?.data as { mode: IntakeMode };
}

export interface DuplicateLeadStatus {
  run: {
    state: "running" | "done" | "failed";
    finishedAt?: string | null;
    customers: number;
    leadsCombined: number;
    skippedGroups: number;
    failedGroups: number;
  } | null;
  preview: { customers: number; leads: number; skippedGroups: number; complete: boolean } | null;
}

export async function getDuplicateLeads() {
  const res = await apiClient.get("/api/crm/lead-intake/duplicates");
  return res.data?.data as DuplicateLeadStatus;
}

export async function undoLeadCombine(leadId: string) {
  const res = await apiClient.post(`/api/crm/lead-intake/leads/${leadId}/undo-combine`);
  return res.data?.data as { mainLeadId: string; restoredLeadIds: string[] };
}

export async function searchLeads(search: string) {
  const res = await apiClient.get("/api/leads", { params: { search, limit: 8, page: 1 } });
  const payload = res.data?.data;
  const leads: Array<Record<string, string | undefined>> = payload?.leads || payload?.data || (Array.isArray(payload) ? payload : []);
  return leads.map((lead) => ({
    _id: String(lead._id),
    name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || lead.phone || "Unknown",
    status: lead.status || "",
    phone: lead.phone,
    email: lead.email,
    unverified: lead.intakeIdentity === "unverified",
  }));
}

export function errorMessage(error: unknown, fallback: string): string {
  const shaped = error as { response?: { data?: { message?: string } }; message?: string } | null;
  return shaped?.response?.data?.message || shaped?.message || fallback;
}
