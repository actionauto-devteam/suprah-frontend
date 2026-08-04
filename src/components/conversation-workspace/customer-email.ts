export interface CustomerEmailSource {
  email?: string | null;
  senderEmail?: string | null;
  channel?: string | null;
  centralIngestion?: boolean | null;
}

const KNOWN_INTERNAL_SOURCE_EMAILS = new Set([
  "leads@dealerscloud.com",
  "actionautoutah.dev@gmail.com",
]);

const normalizeEmail = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isInternalSourceEmail = (value: string) =>
  KNOWN_INTERNAL_SOURCE_EMAILS.has(value);

export function resolveCustomerEmail(
  lead: CustomerEmailSource | null | undefined,
): string {
  const savedCustomerEmail = normalizeEmail(lead?.email);

  // The editable CRM email is always the canonical customer address.
  if (isValidEmail(savedCustomerEmail)) {
    return savedCustomerEmail;
  }

  const rawSenderEmail = normalizeEmail(lead?.senderEmail);

  if (!isValidEmail(rawSenderEmail)) {
    return "";
  }

  // ADF/central ingestion senderEmail commonly points to the dealership inbox,
  // not the customer. Showing or sending to it would be misleading.
  if (
    lead?.channel === "adf" ||
    lead?.centralIngestion === true ||
    isInternalSourceEmail(rawSenderEmail)
  ) {
    return "";
  }

  // Legacy non-central email leads may only have senderEmail populated.
  return rawSenderEmail;
}