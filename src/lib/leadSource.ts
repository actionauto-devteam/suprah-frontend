export const LEAD_SOURCE = {
  WEBSITE_BOOKING: "Website Booking",
  WEBSITE_CHAT: "Website Chat",
  WEBSITE_INQUIRY: "Website Inquiry",
  THIRD_PARTY_LEAD: "Third-Party Lead",
  INBOUND_SMS: "Inbound SMS",
  INBOUND_CALL: "Inbound Call",
  EMAIL_INQUIRY: "Email Inquiry",
  MANUAL_ENTRY: "Manual Entry",
  DEMO: "Demo",
} as const;

export type LeadSource = (typeof LEAD_SOURCE)[keyof typeof LEAD_SOURCE];

export const LEAD_SOURCE_VALUES: LeadSource[] = Object.values(LEAD_SOURCE);

export const REPORTABLE_LEAD_SOURCE_VALUES: LeadSource[] = LEAD_SOURCE_VALUES.filter(
  (value) => value !== LEAD_SOURCE.DEMO,
);

export const UNMAPPED_LEAD_SOURCE_LABEL = "Other";
