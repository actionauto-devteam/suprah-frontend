export interface VehicleInterest {
  year: string;
  make: string;
  model: string;
}

export interface Appointment {
  date: Date | string;
  time: string;
  notes?: string;
  location?: string;
}

import type { LeadStatus } from "@/lib/leadStatus";
export type { LeadStatus } from "@/lib/leadStatus";

export interface Lead {
  _id: string;
  customerId?: string;
  customerLink?: {
    status: 'pending' | 'linked' | 'unresolved' | 'ambiguous' | 'conflict' | 'retry';
    reason?: string;
    candidateIds?: string[];
    checkedAt?: string;
    nextRetryAt?: string | null;
  };
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  senderEmail?: string;
  senderName?: string;
  source: string;
  sourceProvider?: string;
  isDemoLead?: boolean;
  status: LeadStatus;
  vehicle: VehicleInterest;
  vehicleId?: string;
  location?: string;
  dealershipLine?: string;
  comments: string;
  subject?: string;
  body?: string;
  threadId?: string;
  messageId?: string;
  isRead?: boolean;
  isPending?: boolean;
  appointment?: Appointment;
  createdAt: string;
  updatedAt: string;
}
