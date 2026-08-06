export type NotificationType =
  | 'quote_created'
  | 'quote_updated'
  | 'quote_deleted'
  | 'quote_converted'
  | 'quote_accepted'
  | 'shipment_created'
  | 'shipment_updated'
  | 'shipment_deleted'
  | 'shipment_status_changed'
  | 'shipment_assigned'
  | 'shipment_picked_up'
  | 'shipment_delivered'
  | 'proof_of_delivery'
  | 'shipment_arrived_at_pickup'
  | 'shipment_arrived_at_delivery'
  | 'vehicle_added'
  | 'vehicle_updated'
  | 'vehicle_sold'
  | 'vehicle_status_changed'
  | 'inventory_sync'
  | 'new_inventory_alert'
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'guest_response'
  | 'new_lead'
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'crm_message'
  | 'crm_task_assigned'
  | 'crm_task_due'
  | 'crm_biometric'
  | 'crm_timeproof'
  | 'driver_request'
  | 'driver_request_approved'
  | 'driver_request_rejected'
  | 'driver_assigned'
  | 'driver_location_update'
  | 'driver_payout'
  | 'payment_received'
  | 'payment_pending'
  | 'payment_failed'
  | 'payment_request'
  | 'payout_processed'
  | 'team_invite_sent'
  | 'team_member_joined'
  | 'team_member_left'
  | 'role_changed'
  | 'password_changed'
  | 'email_changed'
  | 'profile_updated'
  | 'login_alert'
  | 'system_announcement'
  | 'message_received'
  | 'reminder'
  | 'general'
  | 'referral_joined'
  | 'referral_rewarded'
  | 'delivery_confirmed'
  | 'proof_submitted'
  | 'ping'
  | 'absence_requested'
  | 'absence_approved'
  | 'absence_rejected'
  | 'board_note_posted'
  | 'location_share_requested'
  | 'agent_idle'
  | 'agent_idle_escalation'
  | 'aftermarket_inquiry'
  | 'aftermarket_invoice'
  | 'aftermarket_order'
  | 'feed_mention_post'
  | 'feed_mention_comment'
  | 'feed_comment_on_post'
  | 'feed_announcement'
  | 'pm_task_assigned'
  | 'pm_task_comment'
  | 'pm_task_status'
  | 'pm_task_updated'
  | 'pm_group_added'
  | 'pm_task_mention'
  | 'pm_task_deadline'
  | 'calendar_event_reminder'
  | 'calendar_event_today'
  | 'driver_tracker_geofence_alert'
  | 'driver_tracker_offline_alert'
  | 'driver_tracker_place_visit'
  | 'driver_dispatch_alert'
  | 'wallet_low_balance'
  | 'wallet_payout_failed'
  | 'admin_broadcast'
  | 'admin_system_alert'
  | 'admin_staff_activity'
  | 'admin_security_audit';

export type NotificationCategory =
  | 'transportation'
  | 'inventory'
  | 'appointments'
  | 'crm'
  | 'feeds'
  | 'projectManagement'
  | 'calendar'
  | 'driverTracker'
  | 'wallet'
  | 'team'
  | 'account'
  | 'referrals'
  | 'system'
  | 'adminBroadcasts'
  | 'adminSystemAlerts'
  | 'adminStaffActivity'
  | 'adminSecurityAudit';

export interface Notification {
  _id: string;
  userId?: string;
  organizationId?: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  metadata?: {
    quoteId?: string;
    shipmentId?: string;
    appointmentId?: string;
    vehicleId?: string;
    leadId?: string;
    driverRequestId?: string;
    paymentId?: string;
    guestEmail?: string;
    guestName?: string;
    guestPhone?: string;
    status?: string;
    previousStatus?: string;
    respondedAt?: string;
    vehicleName?: string;
    customerName?: string;
    driverName?: string;
    alertId?: string;
    destinationType?: 'site' | 'carshop' | 'specific-shop';
    destinationName?: string;
    address?: string;
    dispatcherMessage?: string;
    response?: 'pending' | 'acknowledged' | 'on_my_way' | 'unable';
    driverEmail?: string;
    trackingNumber?: string;
    amount?: number;
    [key: string]: any;
  };
  isRead: boolean;
  isBroadcast?: boolean;
  // Repeat-event compiling — see backend createNotification()'s grouping.
  // occurrenceCount > 1 means this notification represents multiple
  // compiled occurrences of the same event rather than a single one.
  dedupeKey?: string;
  occurrenceCount?: number;
  lastOccurredAt?: string;
  createdAt: string;
  updatedAt: string;
}

// The original, coarse mechanism — one boolean per category. Kept as its own
// type (rather than folding mutedTypes directly into NotificationPreferences)
// so every function that only ever deals with category toggles
// (handlePreferenceChange, setAll, NotificationCategoryGrid's props) can stay
// typed to exactly this — booleans only, never accidentally handed the
// mutedTypes array.
export interface NotificationCategoryPreferences {
  transportation: boolean;
  inventory: boolean;
  appointments: boolean;
  crm: boolean;
  feeds: boolean;
  projectManagement: boolean;
  calendar: boolean;
  driverTracker: boolean;
  wallet: boolean;
  team: boolean;
  account: boolean;
  referrals: boolean;
  system: boolean;
  // Admin-only overlay — rendered only for admin/manager/super_admin roles,
  // purely personal (never affects delivery to anyone else).
  adminBroadcasts: boolean;
  adminSystemAlerts: boolean;
  adminStaffActivity: boolean;
  adminSecurityAudit: boolean;
}

// Finer-grained mute list layered on top of the category toggles — e.g. the
// `crm` category can stay enabled while a specific type within it (SupraSpace
// messages, `crm_message`) is individually silenced. See CRM_TYPE_GROUPS in
// notification-preference-categories.tsx for the UI grouping used to toggle
// these in bulk per logical sub-area rather than one type at a time.
export interface NotificationPreferences extends NotificationCategoryPreferences {
  mutedTypes: string[];
}

export const defaultNotificationPreferences: NotificationPreferences = {
  transportation: true,
  inventory: true,
  appointments: true,
  crm: true,
  feeds: true,
  projectManagement: true,
  calendar: true,
  driverTracker: true,
  wallet: true,
  team: true,
  account: true,
  referrals: true,
  system: true,
  adminBroadcasts: true,
  adminSystemAlerts: true,
  adminStaffActivity: true,
  adminSecurityAudit: true,
  mutedTypes: [],
};

export const ADMIN_ONLY_PREFERENCE_KEYS: (keyof NotificationCategoryPreferences)[] = [
  'adminBroadcasts',
  'adminSystemAlerts',
  'adminStaffActivity',
  'adminSecurityAudit',
];
