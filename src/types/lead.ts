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

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Pending"
  | "Appointment Set"
  | "Closed";

export interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  senderEmail?: string;
  senderName?: string;
  source: string;
  status: LeadStatus;
  vehicle: VehicleInterest;
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
