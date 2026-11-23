import { apiClient } from "../api-client";

export type LeadHandlerRole = "first_reply" | "took_over" | "follow_up" | "assigned" | "was_assigned";

export type LeadHandlerCounts = {
  texts: number;
  chats: number;
  emails: number;
  callsMade: number;
  callsAnswered: number;
  notes: number;
  statusChanges: number;
};

export interface LeadHandlerPerson {
  key: string;
  name: string;
  isAi: boolean;
  firstAt: string | null;
  lastAt: string | null;
  firstContactAt: string | null;
  tookOverAt: string | null;
  assignedAt: string | null;
  roles: LeadHandlerRole[];
  counts: LeadHandlerCounts;
}

export interface LeadHandlerAssignment {
  toName: string | null;
  fromName: string | null;
  byName: string | null;
  at: string;
}

export interface LeadOpener {
  name: string;
  at: string;
}

export interface LeadHandlers {
  people: LeadHandlerPerson[];
  assignedTo: { name: string; at: string | null } | null;
  assignments: LeadHandlerAssignment[];
  opened?: { people: LeadOpener[]; total: number } | null;
}

export async function fetchLeadHandlers(leadId: string): Promise<LeadHandlers> {
  const res = await apiClient.get(`/api/leads/${leadId}/handlers`);
  return res.data?.data as LeadHandlers;
}

export async function markLeadOpened(leadId: string): Promise<boolean> {
  const res = await apiClient.patch(`/api/leads/${leadId}/opened`);
  return Boolean(res.data?.recorded);
}
