export type LeadCampaignKind = "price_drop" | "reengagement" | "sms_campaign" | "email_campaign";

export interface LeadTypeOption {
  value: string;
  label: string;
}

export interface LeadTypeGroup {
  title: string;
  hint: string;
  options: LeadTypeOption[];
}

export const LEAD_TYPE_GROUPS: LeadTypeGroup[] = [
  {
    title: "Inbound",
    hint: "The customer reached out first. Use Source to narrow it to KSL, website, web chat and more.",
    options: [{ value: "inbound", label: "All inbound" }],
  },
  {
    title: "Outbound",
    hint: "Our team reached out first.",
    options: [
      { value: "outbound", label: "All outbound" },
      { value: "outbound:team_text", label: "Team texted first" },
      { value: "outbound:team_call", label: "Team called first" },
      { value: "outbound:added_by_team", label: "Added by team" },
    ],
  },
  {
    title: "Campaigns",
    hint: "Leads we sent a price drop, re-engagement text or campaign to.",
    options: [
      { value: "campaign", label: "All campaigns" },
      { value: "campaign:price_drop", label: "Price drop emails" },
      { value: "campaign:reengagement", label: "Re-engagement texts" },
      { value: "campaign:sms_campaign", label: "SMS campaigns" },
      { value: "campaign:email_campaign", label: "Email campaigns" },
    ],
  },
];

export const CAMPAIGN_KIND_LABEL: Record<LeadCampaignKind, string> = {
  price_drop: "Price drop",
  reengagement: "Re-engagement",
  sms_campaign: "SMS campaign",
  email_campaign: "Email campaign",
};

export function campaignKindLabel(kind: unknown): string {
  return typeof kind === "string" && kind in CAMPAIGN_KIND_LABEL ? CAMPAIGN_KIND_LABEL[kind as LeadCampaignKind] : "Campaign";
}

export function leadTypeLabel(value: string | null | undefined): string {
  if (!value) return "All lead types";
  for (const group of LEAD_TYPE_GROUPS) {
    const option = group.options.find((item) => item.value === value);
    if (option) return option.label;
  }
  return value;
}

export function isCampaignLeadType(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("campaign");
}
