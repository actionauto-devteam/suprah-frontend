import {
  Truck, Boxes, Calendar, Users, Rss, ClipboardList, CalendarDays,
  Radar, Wallet, UserPlus, Shield, Award, Megaphone,
  Radio, AlertTriangle, Activity, ShieldAlert, MessageSquare, Fingerprint,
  Tag, Bell, type LucideIcon,
} from 'lucide-react';
import { NotificationCategoryPreferences } from '@/types/notification';

export interface CrmTypeGroup {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  types: string[];
}

// The `crm` category covers ~15 distinct notification types — too coarse a
// single toggle/filter to be useful on its own. These groups break it into
// customizable sub-sets, reused by BOTH the CRM inbox filter chips and the
// preferences page's per-category "customize" disclosure (see
// NotificationCategoryGrid.tsx's `typeGroups` prop) — muting the "Messages"
// group here silences just SupraSpace messages while the `crm` category
// toggle (and every other group within it) stays on.
export const CRM_TYPE_GROUPS: CrmTypeGroup[] = [
  { key: 'crm_leads', label: 'Leads', description: 'New leads and lead status changes', icon: UserPlus, color: 'text-amber-600 dark:text-amber-400', types: ['new_lead', 'lead_assigned', 'lead_status_changed'] },
  { key: 'crm_tasks', label: 'Tasks', description: 'Task assignments and due dates', icon: ClipboardList, color: 'text-orange-600 dark:text-orange-400', types: ['crm_task_assigned', 'crm_task_due'] },
  { key: 'crm_messages', label: 'Messages', description: 'New SupraSpace messages', icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', types: ['crm_message'] },
  { key: 'crm_timeproof', label: 'TimeProof & Biometrics', description: 'Clock events, idle alerts, and biometric checks', icon: Fingerprint, color: 'text-violet-600 dark:text-violet-400', types: ['crm_biometric', 'crm_timeproof', 'agent_idle', 'agent_idle_escalation'] },
  { key: 'crm_aftermarket', label: 'Aftermarket', description: 'Inquiries, invoices, and orders', icon: Tag, color: 'text-emerald-600 dark:text-emerald-400', types: ['aftermarket_inquiry', 'aftermarket_invoice', 'aftermarket_order'] },
  { key: 'crm_reminders', label: 'Reminders & Access', description: 'Reminders, location-share, and customer call requests', icon: Bell, color: 'text-rose-600 dark:text-rose-400', types: ['reminder', 'location_share_requested', 'customer_call_requested'] },
];

export interface NotificationPreferenceCategory {
  key: keyof NotificationCategoryPreferences;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  adminOnly?: boolean;
  // Optional finer-grained breakdown, customizable independently of this
  // category's own master toggle — see NotificationCategoryGrid.tsx.
  typeGroups?: CrmTypeGroup[];
}

// Shown to every member, regardless of role.
export const notificationPreferenceCategories: NotificationPreferenceCategory[] = [
  { key: 'transportation', label: 'Transportation', description: 'Quotes, shipments, and dispatch updates', icon: Truck, color: 'from-blue-500 to-cyan-500' },
  { key: 'inventory', label: 'Inventory', description: 'Vehicle additions, updates, and status changes', icon: Boxes, color: 'from-sky-500 to-indigo-500' },
  { key: 'appointments', label: 'Appointments', description: 'Bookings, reschedules, and cancellations', icon: Calendar, color: 'from-purple-500 to-violet-500' },
  { key: 'crm', label: 'CRM', description: 'Leads, tasks, messages, and aftermarket activity', icon: Users, color: 'from-amber-500 to-orange-500', typeGroups: CRM_TYPE_GROUPS },
  { key: 'feeds', label: 'Supra Feeds', description: 'Mentions, comments, and announcements', icon: Rss, color: 'from-pink-500 to-rose-500' },
  { key: 'projectManagement', label: 'Project Management', description: 'Task assignments, comments, and deadlines', icon: ClipboardList, color: 'from-violet-500 to-purple-600' },
  { key: 'calendar', label: 'Supra Calendar', description: "Today's events and reminders", icon: CalendarDays, color: 'from-teal-500 to-emerald-500' },
  { key: 'driverTracker', label: 'Driver Tracker', description: 'Geofence, offline, and location alerts', icon: Radar, color: 'from-cyan-500 to-blue-500' },
  { key: 'wallet', label: 'Suprah Pay', description: 'Payments, payouts, and withdrawals', icon: Wallet, color: 'from-green-500 to-emerald-600' },
  { key: 'team', label: 'Team', description: 'Invites, role changes, pings, and team board posts', icon: UserPlus, color: 'from-indigo-500 to-blue-500' },
  { key: 'account', label: 'Account & Security', description: 'Profile, email, and login activity', icon: Shield, color: 'from-rose-500 to-red-500' },
  { key: 'referrals', label: 'Referrals & Rewards', description: 'Signups and reward payouts from your referral link', icon: Award, color: 'from-emerald-500 to-teal-600' },
  { key: 'system', label: 'System', description: 'General announcements and messages', icon: Megaphone, color: 'from-gray-500 to-slate-600' },
];

// Personal overlay — rendered only for admin/manager/super_admin roles.
// Turning one off only affects the signed-in admin's own delivery.
export const adminNotificationPreferenceCategories: NotificationPreferenceCategory[] = [
  { key: 'adminBroadcasts', label: 'Broadcasts', description: 'Org-wide announcements sent by admins', icon: Radio, color: 'from-fuchsia-500 to-pink-600', adminOnly: true },
  { key: 'adminSystemAlerts', label: 'System Alerts', description: 'Platform and system-level alerts', icon: AlertTriangle, color: 'from-orange-500 to-red-500', adminOnly: true },
  { key: 'adminStaffActivity', label: 'Staff Activity', description: 'Staff/employee activity requiring admin attention', icon: Activity, color: 'from-blue-500 to-indigo-600', adminOnly: true },
  { key: 'adminSecurityAudit', label: 'Security & Audit', description: 'Security-sensitive and audit-relevant events', icon: ShieldAlert, color: 'from-red-500 to-rose-600', adminOnly: true },
];

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'manager';
}

// CRM-relevant categories only — the rest (transportation, wallet, referrals,
// etc.) are main-site User-identity concerns and never appear on a
// CrmUser-targeted feed. Single source of truth shared by the CRM inbox and
// the CRM notification preferences section, so what a CRM user can toggle
// always matches what their inbox can actually show.
export const CRM_CATEGORY_KEYS: (keyof NotificationCategoryPreferences)[] = [
  'crm', 'feeds', 'projectManagement', 'calendar', 'team', 'account',
];

export const crmNotificationPreferenceCategories: NotificationPreferenceCategory[] =
  notificationPreferenceCategories.filter((c) => (CRM_CATEGORY_KEYS as string[]).includes(c.key));
