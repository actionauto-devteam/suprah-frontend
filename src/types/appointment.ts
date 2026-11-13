export type AppointmentType = 'in-person' | 'phone' | 'video' | 'other';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
export type EntryType = 'event' | 'task' | 'reminder' | 'appointment';
export type AppointmentSmsNoticeStatus = 'not_sent' | 'sending' | 'accepted' | 'delivered' | 'failed' | 'unknown';

export interface AppointmentSmsNotice {
  status: AppointmentSmsNoticeStatus;
  reason?: string | null;
  forStartTime?: string;
  updatedAt?: string;
}

export type AppointmentEmailNoticeType = 'invitation' | 'update' | 'cancellation' | 'reminder';

export interface AppointmentEmailNotice {
  status: 'not_sent';
  emailType: AppointmentEmailNoticeType;
  reason: string;
  updatedAt?: string;
}

export interface GuestResponse {
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  respondedAt?: string;
  googleCalendarEventId?: string;
  guestName?: string;
  guestPhone?: string;
}

export interface Participant {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  avatar?: string;
}

export interface CustomerBooking {
  isCustomerBooking: boolean;
  phone?: string;
  email?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingSource?: string;
  bookingNotes?: string;
}

export interface Appointment {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  entryType: EntryType;

  createdBy: Participant;
  participants: Participant[];
  guestEmails: GuestResponse[];

  leadId?: string;
  conversationId?: string;
  vehicleId?: string;
  quoteId?: string;
  shipmentId?: string;

  reminderSent: boolean;
  reminderTime?: string;
  reminderSentAt?: string;
  reminderSms?: AppointmentSmsNotice;
  rescheduleNotice?: AppointmentSmsNotice;
  customerEmailNotice?: AppointmentEmailNotice;
  noShowFollowUpSentAt?: string;
  noShowFollowUpStatus?: 'processing' | 'sent' | 'failed' | 'skipped';
  noShowFollowUpAttemptCount?: number;
  noShowFollowUpLastAttemptAt?: string;
  noShowFollowUpNextRetryAt?: string;
  noShowFollowUpFailureReason?: string;
  reviewRequestSentAt?: string;
  reviewRequestStatus?: 'processing' | 'sent' | 'failed' | 'skipped';
  reviewRequestAttemptCount?: number;
  reviewRequestLastAttemptAt?: string;
  reviewRequestNextRetryAt?: string;
  reviewRequestFailureReason?: string;
  reviewRequestEmailSentAt?: string;
  reviewRequestEmailStatus?: 'processing' | 'sent' | 'failed' | 'skipped';
  reviewRequestEmailAttemptCount?: number;
  reviewRequestEmailLastAttemptAt?: string;
  reviewRequestEmailNextRetryAt?: string;
  reviewRequestEmailFailureReason?: string;
  rescheduleAwaitingReplyAt?: string;
  rescheduleStatedPreference?: string;
  googleCalendarEventId?: string;
  meetingLink?: string;
  notes?: string;
  outcomeNotes?: string;

  createdByModel?: string;
  participantModel?: string;

  // Customer booking information
  customerBooking?: CustomerBooking;

  salesperson?: { userId: string; crmUserId?: string | null; name: string } | null;
  changeHistory?: AppointmentHistoryEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface AppointmentHistoryEntry {
  _id?: string;
  at: string;
  byUserId?: string | null;
  byName: string;
  action: "created" | "updated" | "cancelled" | "status" | "deleted";
  changes: Array<{ field: string; label: string; from?: string; to?: string }>;
}

export interface Message {
  _id: string;
  sender?: Participant | string;
  senderId?: string;
  content: string;
  type?: 'text' | 'file' | 'image' | 'appointment';
  metadata?: any;
  readBy: string[];
  createdAt: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group' | 'individual';
  name?: string;
  participants: Participant[];
  messages: Message[];

  hasAppointment?: boolean;
  appointmentId?: Appointment | string | any;

  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageBy?: Participant;

  createdBy?: Participant;
  avatar?: string;

  isArchived?: boolean;
  archivedBy?: string[];

  createdAt?: string;
  updatedAt: string;
}
