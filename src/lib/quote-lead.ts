/**
 * The CRM lead a quote is linked to (matched by the customer's email, then
 * phone), ready to show on quote cards. Returns null for unlinked quotes.
 */
export interface QuoteLeadRef {
  _id: string;
  firstName?: string;
  lastName?: string;
}

export function linkedLead(leadId: QuoteLeadRef | string | null | undefined): { id: string; name: string } | null {
  if (!leadId) return null;
  if (typeof leadId === "string") return { id: leadId, name: "View lead" };
  const name = [leadId.firstName, leadId.lastName].map((part) => String(part ?? "").trim()).filter(Boolean).join(" ");
  return { id: String(leadId._id), name: name || "View lead" };
}

/** Where the lead opens in the CRM (the website only; the iPhone app has no CRM pages). */
export function leadPageHref(id: string): string {
  return `/crm/leads?leadId=${encodeURIComponent(id)}`;
}
