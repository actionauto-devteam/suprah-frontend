import {
  Bell, Package, Truck, ShieldCheck, Mail, User, UserPlus,
  CheckCircle2, XCircle, DollarSign, Calendar, Car, MapPin,
  CreditCard, Users, Megaphone, MessageSquare, Clock, Tag,
  TrendingUp, AlertTriangle, Shield, Award, Send, LogIn,
  BarChart3, Boxes, Fingerprint, Timer, type LucideIcon,
} from 'lucide-react';
import { Notification, NotificationCategory } from '@/types/notification';
import {
  notificationPreferenceCategories,
  adminNotificationPreferenceCategories,
} from './notification-preference-categories';

type IconColorMap = {
  icon: LucideIcon;
  gradient: string;
  bg: string;
};

const TYPE_MAP: Record<string, IconColorMap> = {
  quote_created: { icon: Package, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  quote_updated: { icon: TrendingUp, gradient: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500' },
  quote_deleted: { icon: Package, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  quote_converted: { icon: Tag, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500' },
  shipment_created: { icon: Truck, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  shipment_updated: { icon: Truck, gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-500' },
  shipment_deleted: { icon: Truck, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-500' },
  shipment_status_changed: { icon: BarChart3, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500' },
  shipment_assigned: { icon: Send, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500' },
  shipment_picked_up: { icon: Truck, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500' },
  shipment_delivered: { icon: CheckCircle2, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500' },
  proof_of_delivery: { icon: ShieldCheck, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500' },
  vehicle_added: { icon: Car, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  vehicle_updated: { icon: Car, gradient: 'from-sky-500 to-cyan-500', bg: 'bg-sky-500' },
  vehicle_sold: { icon: DollarSign, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  vehicle_status_changed: { icon: Car, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  inventory_sync: { icon: Boxes, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  new_inventory_alert: { icon: Boxes, gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500' },
  appointment_created: { icon: Calendar, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  appointment_updated: { icon: Calendar, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-500' },
  appointment_cancelled: { icon: Calendar, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  appointment_reminder: { icon: Clock, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  guest_response: { icon: Users, gradient: 'from-teal-500 to-emerald-500', bg: 'bg-teal-500' },
  new_lead: { icon: UserPlus, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  lead_assigned: { icon: User, gradient: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500' },
  lead_status_changed: { icon: TrendingUp, gradient: 'from-teal-500 to-green-500', bg: 'bg-teal-500' },
  crm_message: { icon: MessageSquare, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  crm_task_assigned: { icon: Clock, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500' },
  crm_task_due: { icon: AlertTriangle, gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500' },
  crm_biometric: { icon: Fingerprint, gradient: 'from-violet-500 to-indigo-500', bg: 'bg-violet-500' },
  crm_timeproof: { icon: Timer, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500' },
  driver_request: { icon: UserPlus, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500' },
  driver_request_approved: { icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  driver_request_rejected: { icon: XCircle, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  driver_assigned: { icon: Truck, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500' },
  driver_location_update: { icon: MapPin, gradient: 'from-blue-500 to-sky-500', bg: 'bg-blue-500' },
  driver_dispatch_alert: { icon: AlertTriangle, gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500' },
  driver_payout: { icon: DollarSign, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500' },
  payment_received: { icon: CreditCard, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  payment_pending: { icon: CreditCard, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500' },
  payment_failed: { icon: CreditCard, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500' },
  payment_request: { icon: CreditCard, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  payout_processed: { icon: DollarSign, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500' },
  team_invite_sent: { icon: Send, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  team_member_joined: { icon: UserPlus, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  team_member_left: { icon: User, gradient: 'from-gray-500 to-slate-500', bg: 'bg-gray-500' },
  role_changed: { icon: Shield, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  eotm_winner_announced: { icon: Award, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500' },
  password_changed: { icon: ShieldCheck, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  email_changed: { icon: Mail, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  profile_updated: { icon: User, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500' },
  login_alert: { icon: LogIn, gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500' },
  system_announcement: { icon: Megaphone, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-500' },
  message_received: { icon: MessageSquare, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
  reminder: { icon: Clock, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
  general: { icon: Bell, gradient: 'from-gray-500 to-slate-500', bg: 'bg-gray-500' },
  referral_joined: { icon: Award, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  referral_rewarded: { icon: DollarSign, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500' },
  delivery_confirmed: { icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  proof_submitted: { icon: ShieldCheck, gradient: 'from-teal-500 to-emerald-500', bg: 'bg-teal-500' },
  aftermarket_inquiry: { icon: Megaphone, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500' },
  aftermarket_invoice: { icon: CreditCard, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  aftermarket_order: { icon: Tag, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500' },
};

const DEFAULT_MAP: IconColorMap = {
  icon: Bell,
  gradient: 'from-gray-500 to-slate-500',
  bg: 'bg-gray-500',
};

export function getNotificationMeta(type: string): IconColorMap {
  return TYPE_MAP[type] || DEFAULT_MAP;
}

// Flat (non-gradient) icon tint per color family — full class strings are
// written out literally so Tailwind's static content scan picks them up even
// though the lookup key is resolved at runtime (a template-literal class
// name like `bg-${color}-500/10` would never be generated by Tailwind).
const FLAT_COLOR_MAP: Record<string, { iconBg: string; iconText: string }> = {
  blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-600 dark:text-blue-400' },
  indigo: { iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-600 dark:text-indigo-400' },
  red: { iconBg: 'bg-red-500/10', iconText: 'text-red-600 dark:text-red-400' },
  rose: { iconBg: 'bg-rose-500/10', iconText: 'text-rose-600 dark:text-rose-400' },
  emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400' },
  green: { iconBg: 'bg-green-500/10', iconText: 'text-green-600 dark:text-green-400' },
  teal: { iconBg: 'bg-teal-500/10', iconText: 'text-teal-600 dark:text-teal-400' },
  cyan: { iconBg: 'bg-cyan-500/10', iconText: 'text-cyan-600 dark:text-cyan-400' },
  sky: { iconBg: 'bg-sky-500/10', iconText: 'text-sky-600 dark:text-sky-400' },
  violet: { iconBg: 'bg-violet-500/10', iconText: 'text-violet-600 dark:text-violet-400' },
  purple: { iconBg: 'bg-purple-500/10', iconText: 'text-purple-600 dark:text-purple-400' },
  amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-600 dark:text-amber-400' },
  orange: { iconBg: 'bg-orange-500/10', iconText: 'text-orange-600 dark:text-orange-400' },
  yellow: { iconBg: 'bg-yellow-500/10', iconText: 'text-yellow-600 dark:text-yellow-400' },
  gray: { iconBg: 'bg-gray-500/10', iconText: 'text-gray-600 dark:text-gray-400' },
  slate: { iconBg: 'bg-slate-500/10', iconText: 'text-slate-600 dark:text-slate-400' },
};

/** Flat (non-gradient, non-glow) icon box tint for a notification type. */
export function getNotificationFlatColor(type: string): { iconBg: string; iconText: string } {
  const { bg } = getNotificationMeta(type);
  const colorName = bg.match(/^bg-([a-z]+)-\d+$/)?.[1] ?? 'gray';
  return FLAT_COLOR_MAP[colorName] ?? FLAT_COLOR_MAP.gray;
}

// Human-readable labels for every notification type — used anywhere a raw
// `type` string would otherwise leak into the UI as snake_case (e.g. the
// "type" filter dropdown). Falls back to a title-cased version of the raw
// type for anything not explicitly listed, so nothing ever renders raw.
const TYPE_LABELS: Record<string, string> = {
  quote_created: 'Quote Created',
  quote_updated: 'Quote Updated',
  quote_deleted: 'Quote Deleted',
  quote_converted: 'Quote Converted',
  quote_accepted: 'Quote Accepted',
  shipment_created: 'Shipment Created',
  shipment_updated: 'Shipment Updated',
  shipment_deleted: 'Shipment Deleted',
  shipment_status_changed: 'Shipment Status Changed',
  shipment_assigned: 'Shipment Assigned',
  shipment_picked_up: 'Shipment Picked Up',
  shipment_delivered: 'Shipment Delivered',
  proof_of_delivery: 'Proof of Delivery',
  shipment_arrived_at_pickup: 'Arrived at Pickup',
  shipment_arrived_at_delivery: 'Arrived at Delivery',
  vehicle_added: 'Vehicle Added',
  vehicle_updated: 'Vehicle Updated',
  vehicle_sold: 'Vehicle Sold',
  vehicle_status_changed: 'Vehicle Status Changed',
  inventory_sync: 'Inventory Sync',
  new_inventory_alert: 'New Inventory Alert',
  appointment_created: 'Appointment Created',
  appointment_updated: 'Appointment Updated',
  appointment_cancelled: 'Appointment Cancelled',
  appointment_reminder: 'Appointment Reminder',
  guest_response: 'Guest Response',
  new_lead: 'New Lead',
  lead_assigned: 'Lead Assigned',
  lead_status_changed: 'Lead Status Changed',
  crm_message: 'New Message',
  crm_task_assigned: 'Task Assigned',
  crm_task_due: 'Task Due',
  crm_biometric: 'Biometric Event',
  crm_timeproof: 'TimeProof Alert',
  driver_request: 'Driver Request',
  driver_request_approved: 'Driver Request Approved',
  driver_request_rejected: 'Driver Request Rejected',
  driver_assigned: 'Driver Assigned',
  driver_location_update: 'Driver Location Update',
  driver_payout: 'Driver Payout',
  payment_received: 'Payment Received',
  payment_pending: 'Payment Pending',
  payment_failed: 'Payment Failed',
  payment_request: 'Payment Request',
  payout_processed: 'Payout Processed',
  team_invite_sent: 'Team Invite Sent',
  team_member_joined: 'Team Member Joined',
  team_member_left: 'Team Member Left',
  role_changed: 'Role Changed',
  eotm_winner_announced: 'Employee of the Month',
  password_changed: 'Password Changed',
  email_changed: 'Email Changed',
  profile_updated: 'Profile Updated',
  login_alert: 'Login Alert',
  system_announcement: 'System Announcement',
  message_received: 'Message Received',
  reminder: 'Reminder',
  general: 'General',
  referral_joined: 'Referral Joined',
  referral_rewarded: 'Referral Reward',
  delivery_confirmed: 'Delivery Confirmed',
  proof_submitted: 'Proof Submitted',
  ping: 'Ping',
  absence_requested: 'Absence Requested',
  absence_approved: 'Absence Approved',
  absence_rejected: 'Absence Rejected',
  board_note_posted: 'Team Board Post',
  location_share_requested: 'Location Share Requested',
  agent_idle: 'Went Idle',
  agent_idle_escalation: 'Idle 15+ Minutes',
  agent_screen_recording_missing: 'Screen Recording Permission Revoked',
  aftermarket_inquiry: 'Aftermarket Inquiry',
  aftermarket_invoice: 'Aftermarket Invoice',
  aftermarket_order: 'Aftermarket Order',
  feed_mention_post: 'Mentioned in a Post',
  feed_mention_comment: 'Mentioned in a Comment',
  feed_comment_on_post: 'New Comment',
  feed_announcement: 'Feed Announcement',
  pm_task_assigned: 'Project Task Assigned',
  pm_task_comment: 'Project Task Comment',
  pm_task_status: 'Project Task Status Changed',
  pm_task_updated: 'Project Task Updated',
  pm_group_added: 'Added to Project Group',
  pm_task_mention: 'Mentioned in a Task',
  pm_task_deadline: 'Project Task Deadline',
  calendar_event_reminder: 'Event Reminder',
  calendar_event_today: "Today's Event",
  driver_tracker_geofence_alert: 'Geofence Alert',
  driver_tracker_offline_alert: 'Driver Offline',
  driver_tracker_place_visit: 'Place Visit',
  driver_dispatch_alert: 'Driver Dispatch Alert',
  wallet_low_balance: 'Low Balance',
  wallet_payout_failed: 'Payout Failed',
  admin_broadcast: 'Admin Broadcast',
  admin_system_alert: 'System Alert',
  admin_staff_activity: 'Staff Activity',
  admin_security_audit: 'Security & Audit',
};

function humanizeFallback(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Human-readable label for a raw notification type (never renders snake_case). */
export function getNotificationTypeLabel(type: string): string {
  return TYPE_LABELS[type] || humanizeFallback(type);
}

/**
 * Maps a legacy notification type to the new backend `NotificationCategory`
 * key (camelCase, matches NotificationPreferences fields) — only needed as a
 * fallback for notifications persisted before the `category` field existed
 * on the Notification doc. Every notification created from here on already
 * carries `category` directly from the backend.
 */
function inferLegacyCategory(type: string): NotificationCategory {
  if (type.startsWith('quote_') || type.startsWith('shipment_') || type === 'proof_of_delivery'
    || type === 'proof_submitted' || type === 'delivery_confirmed' || type.startsWith('driver_request')
    || type === 'driver_assigned' || type === 'driver_payout') return 'transportation';
  if (type.startsWith('vehicle_') || type.startsWith('inventory_') || type === 'new_inventory_alert') return 'inventory';
  if (type.startsWith('appointment_') || type === 'guest_response') return 'appointments';
  if (type.startsWith('new_lead') || type.startsWith('lead_') || type.startsWith('crm_')
    || type === 'reminder' || type === 'location_share_requested' || type.startsWith('aftermarket_')) return 'crm';
  if (type.startsWith('feed_')) return 'feeds';
  if (type.startsWith('pm_')) return 'projectManagement';
  if (type.startsWith('calendar_')) return 'calendar';
  if (type === 'driver_location_update' || type.startsWith('driver_tracker_') || type === 'driver_dispatch_alert') return 'driverTracker';
  if (type.startsWith('payment_') || type.startsWith('payout_') || type.startsWith('wallet_')) return 'wallet';
  if (type.startsWith('team_') || type === 'role_changed' || type === 'board_note_posted'
    || type === 'ping' || type.startsWith('absence_') || type === 'eotm_winner_announced') return 'team';
  if (['password_changed', 'email_changed', 'profile_updated', 'login_alert'].includes(type)) return 'account';
  if (type.startsWith('referral_')) return 'referrals';
  if (type === 'admin_broadcast') return 'adminBroadcasts';
  if (type === 'admin_system_alert') return 'adminSystemAlerts';
  if (type === 'admin_staff_activity') return 'adminStaffActivity';
  if (type === 'admin_security_audit') return 'adminSecurityAudit';
  if (type === 'agent_idle' || type === 'agent_idle_escalation' || type === 'agent_screen_recording_missing') return 'adminStaffActivity';
  return 'system';
}

/** Resolves the notification's category, preferring the backend-provided field. */
export function resolveNotificationCategory(notification: Notification): NotificationCategory {
  return notification.category ?? inferLegacyCategory(notification.type);
}

/**
 * Everything admins actually monitor via the Locator/TimeProof feature: geofence
 * enter/exit alerts, shift alerts (connection lost, stale clockout, location turned
 * off mid-shift — all fired through the same admin_staff_activity type), an admin
 * asking someone to share, and TimeProof-side location/idle alerts. Used to power
 * the sidebar's Locator badge and the dedicated notification feed on the Locator
 * tab, kept separate from the general bell/inbox per that feature's own request.
 */
const LOCATOR_NOTIFICATION_TYPES = new Set([
  'driver_tracker_geofence_alert',
  'location_share_requested',
  'admin_staff_activity',
  'crm_timeproof',
  'agent_idle',
  'agent_idle_escalation',
  'agent_screen_recording_missing',
]);

export function isLocatorNotification(notification: Notification): boolean {
  return LOCATOR_NOTIFICATION_TYPES.has(notification.type);
}

const CATEGORY_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  [...notificationPreferenceCategories, ...adminNotificationPreferenceCategories].map(
    (c) => [c.key, c.label],
  ),
);

/** Human-readable label for the notification's category (e.g. "Project Management"). */
export function getNotificationCategoryLabel(notification: Notification): string {
  const key = resolveNotificationCategory(notification);
  return CATEGORY_LABEL_BY_KEY[key] || key;
}

const ROUTE_MAP: Record<string, string> = {
  quote_created: '/transportation', quote_updated: '/transportation', quote_deleted: '/transportation', quote_converted: '/transportation',
  shipment_created: '/transportation', shipment_updated: '/transportation', shipment_deleted: '/transportation',
  shipment_status_changed: '/transportation', shipment_assigned: '/transportation', shipment_picked_up: '/transportation',
  shipment_delivered: '/transportation', proof_of_delivery: '/transportation',
  vehicle_added: '/inventory', vehicle_updated: '/inventory', vehicle_sold: '/inventory',
  vehicle_status_changed: '/inventory', inventory_sync: '/inventory', new_inventory_alert: '/inventory',
  appointment_created: '/crm/appointments', appointment_updated: '/crm/appointments',
  appointment_cancelled: '/crm/appointments', appointment_reminder: '/crm/appointments', guest_response: '/crm/appointments',
  new_lead: '/crm', lead_assigned: '/crm', lead_status_changed: '/crm',
  reminder: '/crm',
  crm_message: '/crm/supra-space', crm_task_assigned: '/crm', crm_task_due: '/crm',
  crm_biometric: '/crm/biometrics', crm_timeproof: '/crm/biometrics',
  driver_request: '/driver-tracker', driver_request_approved: '/driver/loads', driver_request_rejected: '/driver/loads',
  driver_assigned: '/driver/loads', driver_payout: '/driver/earnings',
  message_received: '/crm/supra-space',
  aftermarket_inquiry: '/crm/support-center?tab=aftermarket', aftermarket_invoice: '/customer/payments', aftermarket_order: '/crm/aftermarket',
  driver_location_update: '/driver-tracker',
  driver_tracker_offline_alert: '/driver-tracker',
  driver_dispatch_alert: '/driver/notifications',
  payment_request: '/customer/payments', payment_received: '/billing', payment_pending: '/billing', payment_failed: '/billing',
  payout_processed: '/billing',
  team_invite_sent: '/settings', team_member_joined: '/settings', team_member_left: '/settings', role_changed: '/settings',
  eotm_winner_announced: '/recognition/employee-of-the-month',
  password_changed: '/profile', email_changed: '/profile', profile_updated: '/profile', login_alert: '/profile',
  referral_joined: '/customer/refer', referral_rewarded: '/customer/refer',
  system_announcement: '/notifications', general: '/notifications',
  delivery_confirmed: '/transportation', proof_submitted: '/transportation',
};

const DRIVER_ROUTE_MAP: Record<string, string> = {
  driver_dispatch_alert: '/driver/notifications',
  driver_request_approved: '/driver/loads', driver_request_rejected: '/driver/loads',
  driver_assigned: '/driver/loads', driver_payout: '/driver/earnings',
  shipment_assigned: '/driver/loads', shipment_picked_up: '/driver/loads', shipment_delivered: '/driver/loads',
  password_changed: '/driver/profile', email_changed: '/driver/profile', profile_updated: '/driver/profile', login_alert: '/driver/profile',
};

const CUSTOMER_ROUTE_MAP: Record<string, string> = {
  payment_request: '/customer/payments', payment_received: '/customer/payments',
  payment_pending: '/customer/payments', payment_failed: '/customer/payments',
  referral_joined: '/customer/refer', referral_rewarded: '/customer/refer',
  password_changed: '/customer/settings', email_changed: '/customer/settings',
  profile_updated: '/customer/settings', login_alert: '/customer/settings',
  aftermarket_invoice: '/customer/payments',
};

const ADMIN_ROUTE_MAP: Record<string, string> = {
  payout_processed: '/admin/payouts', driver_payout: '/admin/payouts',
  password_changed: '/admin/dashboard', email_changed: '/admin/dashboard',
  profile_updated: '/admin/dashboard', login_alert: '/admin/dashboard',
};

const PROJECT_MANAGEMENT_NOTIFICATION_TYPES = new Set([
  'pm_task_assigned',
  'pm_task_comment',
  'pm_task_status',
  'pm_task_updated',
  'pm_group_added',
  'pm_task_mention',
  'pm_task_deadline',
]);

const LEGACY_PROJECT_MANAGEMENT_PATHS = new Set([
  '/crm/project',
  '/crm/project/',
  '/projects',
  '/projects/',
]);

function parseInternalRoute(route: string): URL | null {
  try {
    return new URL(route, 'http://suprah.local');
  } catch {
    return null;
  }
}

function getProjectManagementNotificationRoute(notification: Notification): string {
  const metadataTaskId = String(notification.metadata?.taskId ?? '').trim();
  const metadataGroupId = String(notification.metadata?.groupId ?? '').trim();
  const metadataRoute = typeof notification.metadata?.route === 'string'
    ? notification.metadata.route.trim()
    : '';
  const parsedRoute = metadataRoute ? parseInternalRoute(metadataRoute) : null;
  const routeTaskId = String(parsedRoute?.searchParams.get('task') ?? '').trim();
  const routeGroupId = String(parsedRoute?.searchParams.get('group') ?? '').trim();
  const taskId = metadataTaskId || routeTaskId;
  const groupId = metadataGroupId || routeGroupId;

  const params = new URLSearchParams();
  if (groupId) params.set('group', groupId);
  if (taskId) params.set('task', taskId);

  const query = params.toString();
  return query ? `/project?${query}` : '/project';
}

function getRoleContext(pathname: string): 'driver' | 'customer' | 'admin' | 'dashboard' {
  if (pathname.startsWith('/driver')) return 'driver';
  if (pathname.startsWith('/customer')) return 'customer';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'dashboard';
}

export function getNotificationRoute(notification: Notification, pathname?: string): string | null {
  // GPS-offline alerts must always open the affected driver's isolated
  // Dispatch Chat. Derive the deep link from driverId on the frontend too so
  // notifications created before metadata.route was added remain clickable.
  if (notification.type === 'driver_tracker_offline_alert') {
    const driverId = String(notification.metadata?.driverId ?? '').trim();

    if (driverId) {
      return `/driver-tracker?driverId=${encodeURIComponent(driverId)}&openDispatchChat=1`;
    }

    // Still take Dispatch to Driver Tracker if an old record lacks driverId.
    return '/driver-tracker';
  }

  const metadataRoute = typeof notification.metadata?.route === 'string'
    ? notification.metadata.route
    : '';

  // Project Management's actual frontend route is /project. Repair the old
  // /crm/project alias and the short-lived mistaken /projects alias (or a
  // missing route) so stored notifications keep working, while preserving any
  // future valid custom PM destination supplied in metadata.
  if (PROJECT_MANAGEMENT_NOTIFICATION_TYPES.has(notification.type)) {
    const normalizedRoute = metadataRoute.trim();
    const parsedRoute = normalizedRoute ? parseInternalRoute(normalizedRoute) : null;
    const routePathname = parsedRoute?.pathname ?? '';

    // Compare the pathname, not the full route string. Existing notifications
    // can contain `/projects?task=...`; an exact-string comparison would miss
    // that legacy route and incorrectly pass it through to Next.js as a 404.
    if (!normalizedRoute || LEGACY_PROJECT_MANAGEMENT_PATHS.has(routePathname)) {
      return getProjectManagementNotificationRoute(notification);
    }

    return metadataRoute;
  }

  // Prefer the contextual route embedded in metadata for all other types.
  if (metadataRoute) return metadataRoute;

  if (!pathname) return ROUTE_MAP[notification.type] || '/notifications';

  const role = getRoleContext(pathname);

  if (role === 'driver') return DRIVER_ROUTE_MAP[notification.type] || ROUTE_MAP[notification.type] || '/driver/notifications';
  if (role === 'customer') return CUSTOMER_ROUTE_MAP[notification.type] || ROUTE_MAP[notification.type] || '/customer/notifications';
  if (role === 'admin') return ADMIN_ROUTE_MAP[notification.type] || ROUTE_MAP[notification.type] || '/admin/notifications';
  return ROUTE_MAP[notification.type] || '/notifications';
}

const _TZ = 'America/Denver';

export function formatNotificationDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;

  const dateInMDT = date.toLocaleDateString('en-US', { timeZone: _TZ });
  const nowInMDT = now.toLocaleDateString('en-US', { timeZone: _TZ });
  const yesterdayInMDT = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { timeZone: _TZ });

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: _TZ });

  if (dateInMDT === nowInMDT) return `Today, ${timeStr}`;
  if (dateInMDT === yesterdayInMDT) return `Yesterday, ${timeStr}`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: _TZ });
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: _TZ,
  });
}