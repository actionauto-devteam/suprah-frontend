/**
 * The links at the bottom of the Notifications drawer (2026-11-13).
 *
 * General inbox and CRM inbox are staff pages: a driver or customer who opened
 * them was only sent back to their own home. Their drawer shows no inbox links,
 * and Preferences opens their own notification preferences page.
 */
export interface NotificationDrawerLinks {
  /** Show the General inbox and CRM inbox links. */
  showInboxLinks: boolean;
  preferencesHref: string;
}

export function notificationDrawerLinks(role: string | null | undefined, pathname: string): NotificationDrawerLinks {
  if (role === "driver") return { showInboxLinks: false, preferencesHref: "/driver/notifications/preferences" };
  if (role === "customer") return { showInboxLinks: false, preferencesHref: "/customer/notifications/preferences" };
  return {
    showInboxLinks: true,
    preferencesHref: pathname.startsWith("/crm") ? "/crm/notifications/preferences" : "/notifications/preferences",
  };
}
