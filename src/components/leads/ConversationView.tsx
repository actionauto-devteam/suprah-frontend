"use client";

import * as React from "react";
import {
  Mail,
  MessageSquare,
  Users,
  Phone,
  X,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./atomic/Avatar";

interface ConversationViewProps {
  lead: any;
  threads?: any[];
  hideConversationChrome?: boolean;
  onClose: () => void;
  sourceEmail: string;
  siblingCount?: number;
  onReplyToSiblings?: () => void;
}

interface InquiryField {
  label: string;
  value: string;
}

interface InquirySection {
  title: string;
  fields: InquiryField[];
}

const getLeadName = (lead: any) =>
  [lead?.firstName, lead?.lastName]
    .filter(Boolean)
    .join(" ") ||
  lead?.senderName ||
  "Unknown";

const getMessageText = (message: any) =>
  message?.body ||
  message?.text ||
  message?.snippet ||
  message?.content ||
  "";

const isOutboundMessage = (
  message: any,
  sourceEmail: string,
) => {
  const direction = String(
    message?.direction || "",
  ).toLowerCase();

  if (direction) {
    return (
      direction === "outbound" ||
      direction === "sent"
    );
  }

  const from = String(
    message?.from ||
    message?.sender ||
    message?.senderEmail ||
    "",
  ).toLowerCase();

  return Boolean(
    from &&
    sourceEmail &&
    from.includes(sourceEmail.toLowerCase()),
  );
};

const formatTimestamp = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const cleanValue = (value: unknown) => {
  const text = String(value || "").trim();

  if (
    !text ||
    text.toLowerCase() === "undefined" ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "not provided"
  ) {
    return "";
  }

  return text;
};

const getFieldFromText = (
  text: string,
  labels: string[],
) => {
  for (const label of labels) {
    const expression = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*:\\s*(.+)`,
      "i",
    );

    const match = text.match(expression);

    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return "";
};

const buildInquirySections = (
  lead: any,
  message: any,
): InquirySection[] => {
  const text = getMessageText(message);

  const name =
    cleanValue(
      [lead?.firstName, lead?.lastName]
        .filter(Boolean)
        .join(" "),
    ) ||
    cleanValue(lead?.senderName) ||
    getFieldFromText(text, ["Name"]);

  const email =
    cleanValue(lead?.email) ||
    cleanValue(lead?.senderEmail) ||
    getFieldFromText(text, ["Email"]);

  const phone =
    cleanValue(lead?.phone) ||
    getFieldFromText(text, ["Phone"]);

  const address =
    cleanValue(lead?.address) ||
    getFieldFromText(text, ["Address"]);

  const vehicle =
    cleanValue(
      [
        lead?.vehicle?.year,
        lead?.vehicle?.make,
        lead?.vehicle?.model,
      ]
        .filter(Boolean)
        .join(" "),
    ) ||
    getFieldFromText(text, ["Vehicle"]);

  const condition =
    cleanValue(lead?.vehicle?.condition) ||
    getFieldFromText(text, ["Condition"]);

  const vin =
    cleanValue(lead?.vehicle?.vin) ||
    getFieldFromText(text, ["VIN"]);

  const stock =
    cleanValue(lead?.vehicle?.stock) ||
    getFieldFromText(text, ["Stock", "Stock #"]);

  const dealer =
    cleanValue(lead?.dealerVendor) ||
    cleanValue(lead?.dealerName) ||
    getFieldFromText(text, [
      "Dealer/Vendor",
      "Dealer",
    ]);

  const requestDate =
    cleanValue(lead?.requestDate) ||
    getFieldFromText(text, ["Request Date"]) ||
    cleanValue(lead?.createdAt);

  const contactFields: InquiryField[] = [
    { label: "Name", value: name || "Unknown" },
    { label: "Email", value: email },
    { label: "Phone", value: phone },
    { label: "Address", value: address },
  ].filter((field) => field.value);

  const vehicleFields: InquiryField[] = [
    { label: "Vehicle", value: vehicle },
    { label: "Condition", value: condition },
    { label: "VIN", value: vin },
    { label: "Stock #", value: stock },
  ].filter((field) => field.value);

  const leadFields: InquiryField[] = [
    { label: "Dealer/Vendor", value: dealer },
    {
      label: "Request Date",
      value: requestDate
        ? formatTimestamp(requestDate)
        : "",
    },
  ].filter((field) => field.value);

  return [
    {
      title: "Contact Information",
      fields: contactFields,
    },
    {
      title: "Vehicle Interest",
      fields: vehicleFields,
    },
    {
      title: "Lead Details",
      fields: leadFields,
    },
  ].filter((section) => section.fields.length > 0);
};

/*
 * FIX: the customer's actual message was NEVER rendered by the inquiry card.
 * buildInquirySections only produces Contact/Vehicle/Lead-Details fields, so
 * the person's typed inquiry — even when present on the lead — was dropped
 * at render time. This extractor finds the message from, in order:
 *   1. lead.comments (set at ingestion / by the backfill script)
 *   2. a "— Customer Comments —" section inside the message text
 *   3. a labeled block in the raw text ("SHOPPER COMMENT:", "Comments:", …)
 */
/*
 * Aggregator summaries (DealersCloud forwarding CarGurus/Autotrader) arrive
 * as one pipe-delimited line full of metadata. When such text reaches the
 * UI, pull out just the human message. IMPORTANT: customers often include
 * their own email/phone INSIDE the message ("You can reach me at ..."), so
 * a segment is only rejected for containing an email when it does NOT read
 * like a sentence.
 */
const AGGREGATOR_MARKERS =
  /view shopper signals|cargurus imv|likelihood to buy|deal rating|shopper signals/i;

const looksLikeSentence = (text: string) =>
  /[.!?]/.test(text) && text.split(/\s+/).length >= 6;

const cleanAggregatorText = (raw: string): string => {
  const text = (raw || "").replace(/\s+/g, " ").trim();
  if (!text || !AGGREGATOR_MARKERS.test(text)) return text;

  const METADATA_PREFIXES = [
    "view shopper signals", "likelihood to buy", "cargurus", "deal rating",
    "is from shippable", "delivery cost", "price + delivery", "vin:",
    "stock#", "stock #", "sales lead", "switch opportunity", "lead type",
    "tracking", "pixall", "tcpaoptin",
  ];
  const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  const EMAIL_RE = /[^\s]+@[^\s]+\.[^\s]+/;
  const URL_RE = /https?:\/\//i;

  for (const segment of text.split("|").map((part) => part.trim())) {
    const candidate = segment.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (candidate.length < 15 || candidate.length > 600) continue;

    const lower = candidate.toLowerCase();
    if (METADATA_PREFIXES.some((prefix) => lower.startsWith(prefix))) continue;
    if (URL_RE.test(candidate) || VIN_RE.test(candidate)) continue;
    if (EMAIL_RE.test(candidate) && !looksLikeSentence(candidate)) continue;
    if (!/[a-zA-Z]{3}/.test(candidate)) continue;
    if (candidate.split(" ").length < 4) continue;

    return candidate;
  }
  return text; // nothing better found — show the original rather than nothing
};

const extractCustomerComments = (
  lead: any,
  message: any,
): string => {
  const direct = cleanValue(lead?.comments);
  if (direct) return cleanAggregatorText(direct);

  const text = getMessageText(message);
  if (!text) return "";

  const section = text.match(
    /—\s*Customer Comments\s*—\s*\n?([\s\S]*?)(?=\n\s*—\s|$)/i,
  );
  if (section?.[1]?.trim()) {
    return cleanAggregatorText(section[1].trim());
  }

  const labeled = text.match(
    /\b(?:shopper\s+comments?|customer\s+comments?|comments?|customer\s+message)\s*:\s*\n?([\s\S]{10,600}?)(?=\n\s*\n|\n[A-Z][A-Z0-9 \/#&'.-]{2,}:|$)/i,
  );
  const candidate = labeled?.[1]?.replace(/\s+/g, " ").trim() || "";
  if (
    candidate.length >= 10 &&
    !/^https?:\/\//i.test(candidate) &&
    !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(candidate)
  ) {
    return cleanAggregatorText(candidate);
  }
  const fromRaw = cleanAggregatorText(text);
  return fromRaw !== text.replace(/\s+/g, " ").trim() ? fromRaw : "";
};

const isLeadInquiryMessage = (
  message: any,
  index: number,
) => {
  const text = getMessageText(message).toLowerCase();

  return Boolean(
    message?.isLeadFallback ||
    index === 0 ||
    text.includes("new lead from credit application") ||
    text.includes("contact information") ||
    text.includes("vehicle interest"),
  );
};

/* ============================================================================
 * PODIUM-STYLE REDESIGN (conversation pane)
 * Light, airy inbox aesthetic: soft canvas, white inbound bubbles with a
 * hairline border, tinted outbound bubbles, small "Name · time" attributions,
 * centered day chips and system lines, and a card-based inquiry block.
 * All logic, props, and data fixes above are unchanged — this section is
 * presentation only, self-contained Tailwind with dark-mode variants.
 * ==========================================================================*/

const DAY_CHIP_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dayKeyOf = (value: any) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toDateString();
};

const dayChipLabel = (value: any) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return DAY_CHIP_FORMAT.format(date);
};

function DayChip({ label }: { label: string }) {
  if (!label) return null;
  return (
    <div className="my-4 flex items-center justify-center">
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 first:mt-0 dark:text-slate-500">
      {children}
    </p>
  );
}

function InquiryFieldRow({
  field,
  isLast,
}: {
  field: InquiryField;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[92px_minmax(0,1fr)] items-baseline gap-3 py-1.5",
        !isLast && "border-b border-slate-100 dark:border-white/5",
      )}
    >
      <span className="text-right text-xs text-slate-400 dark:text-slate-500">
        {field.label}
      </span>
      <span className="min-w-0 wrap-break-word text-[13px] font-medium text-slate-800 dark:text-slate-100">
        {field.value}
      </span>
    </div>
  );
}

/**
 * LeadInquiryDetails — the customer/vehicle/lead field grid, pinned as a
 * sticky collapsible strip at the top of the conversation (it no longer
 * lives inside the thread). Exported so it can also be mounted at the top
 * of LeadDetailsPanel if preferred.
 */
export function LeadInquiryDetails({
  lead,
  defaultExpanded = true,
}: {
  lead: any;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const sections = buildInquirySections(lead, {
    body: lead?.parsedContent || lead?.body || "",
  });
  if (sections.length === 0) return null;

  const vehicleLine = [
    lead?.vehicle?.year,
    lead?.vehicle?.make,
    lead?.vehicle?.model,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
        aria-expanded={expanded}
      >
        <ClipboardList className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Lead details
        </span>
        {!expanded && vehicleLine && (
          <span className="min-w-0 truncate text-xs text-slate-400 dark:text-slate-500">
            · {vehicleLine}
            {lead?.vehicle?.stock ? ` · #${lead.vehicle.stock}` : ""}
          </span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-x-8 px-4 pb-3 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className={cn(
                "min-w-0",
                section.title === "Lead Details" && "lg:col-span-2",
              )}
            >
              <SectionTitle>{section.title}</SectionTitle>
              <div
                className={cn(
                  section.title === "Lead Details" &&
                    "grid grid-cols-1 gap-x-8 md:grid-cols-2",
                )}
              >
                {section.fields.map((field, index) => (
                  <InquiryFieldRow
                    key={`${section.title}-${field.label}`}
                    field={field}
                    isLast={index === section.fields.length - 1}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConversationView({
  lead,
  threads = [],
  hideConversationChrome = false,
  onClose,
  sourceEmail,
  siblingCount = 0,
  onReplyToSiblings,
}: ConversationViewProps) {
  const messageAreaRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    const element = messageAreaRef.current;
    if (!element) return;
    const frameId = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [lead?._id]);

  React.useEffect(() => {
    const keepConversationAtBottom = () => {
      const element = messageAreaRef.current;
      if (!element) return;
      window.requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    };
    window.addEventListener(
      "crm-leads:keep-conversation-bottom",
      keepConversationAtBottom,
    );
    return () => {
      window.removeEventListener(
        "crm-leads:keep-conversation-bottom",
        keepConversationAtBottom,
      );
    };
  }, []);

  let lastDayKey = "";

  return (
    <section className="suprah-conversation-shell suprah-center-conversation-content flex flex-1 min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {!hideConversationChrome && (
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
          <Avatar first={lead?.firstName} last={lead?.lastName} size="sm" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {getLeadName(lead)}
              </h2>
              {lead?.status && (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  {lead.status}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-400 dark:text-slate-500">
              {lead?.phone && (
                <>
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="shrink-0">{lead.phone}</span>
                  <span className="shrink-0">·</span>
                </>
              )}
              <span className="truncate">
                {lead?.source || "Lead Inbox"}
                {lead?.subject ? ` · ${lead.subject}` : ""}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-300"
            aria-label="Close conversation"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
      )}

      {/* Sticky lead-details strip — always visible, never scrolls away */}
      <LeadInquiryDetails lead={lead} />

      {siblingCount > 0 && (
        <button
          type="button"
          onClick={onReplyToSiblings}
          className="flex items-center gap-2 border-b border-sky-100 bg-sky-50 px-4 py-2 text-[13px] text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15"
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>
            {siblingCount} other {siblingCount === 1 ? "inquiry" : "inquiries"} for this vehicle
          </span>
          <strong className="ml-auto font-semibold underline-offset-2 hover:underline">
            Reply together
          </strong>
        </button>
      )}

      <div
        ref={messageAreaRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-4xl">
          {/* Conversation start marker */}
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Beginning of lead conversation
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatTimestamp(lead?.createdAt) || "Conversation started"}
            </p>
          </div>

          {threads.length === 0 ? (
            <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <strong className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No synced messages yet
                </strong>
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                  The lead inquiry is ready for your first response.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {threads.map((message, index) => {
                const outbound = isOutboundMessage(message, sourceEmail);
                const key =
                  message?._id ||
                  message?.id ||
                  message?.messageId ||
                  `${lead?._id}-${index}`;

                const stamp =
                  message?.createdAt ||
                  message?.date ||
                  message?.timestamp ||
                  lead?.createdAt;
                const dayKey = dayKeyOf(stamp);
                const showDayChip = dayKey !== lastDayKey;
                lastDayKey = dayKey;

                if (!outbound && isLeadInquiryMessage(message, index)) {
                  /*
                   * The thread shows ONLY conversation content. The customer's
                   * message renders as a normal inbound bubble; the field grid
                   * lives in the sticky LeadInquiryDetails strip above.
                   */
                  const inquiryText = extractCustomerComments(lead, message);
                  return (
                    <React.Fragment key={key}>
                      {showDayChip && <DayChip label={dayChipLabel(stamp)} />}
                      {inquiryText ? (
                        <div className="flex w-full items-end justify-start gap-2.5">
                          <Avatar
                            first={lead?.firstName}
                            last={lead?.lastName}
                            size="sm"
                          />
                          <div className="flex min-w-0 max-w-[78%] flex-col items-start sm:max-w-[62%]">
                            <div className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
                              {inquiryText}
                            </div>
                            <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              {getLeadName(lead)} · {formatTimestamp(stamp)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="py-1 text-center text-xs text-slate-400 dark:text-slate-500">
                          {getLeadName(lead)} submitted an inquiry — details pinned above
                        </p>
                      )}
                    </React.Fragment>
                  );
                }

                const text = cleanAggregatorText(getMessageText(message));
                const senderLabel = outbound
                  ? message?.sentBy?.name ||
                    message?.senderName ||
                    message?.sender ||
                    "Action Auto"
                  : getLeadName(lead);

                return (
                  <React.Fragment key={key}>
                    {showDayChip && <DayChip label={dayChipLabel(stamp)} />}
                    <div
                      className={cn(
                        "flex w-full items-end gap-2.5",
                        outbound ? "justify-end" : "justify-start",
                      )}
                    >
                      {!outbound && (
                        <Avatar
                          first={lead?.firstName}
                          last={lead?.lastName}
                          size="sm"
                        />
                      )}

                      <div
                        className={cn(
                          "flex min-w-0 max-w-[78%] flex-col sm:max-w-[62%]",
                          outbound ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "whitespace-pre-wrap wrap-break-word rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
                            outbound
                              ? "rounded-br-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100",
                          )}
                        >
                          {text || "Message content unavailable"}
                        </div>

                        <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {senderLabel} · {formatTimestamp(stamp)}
                        </span>
                      </div>

                      {outbound && (
                        <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-[10px] font-bold text-white shadow-sm">
                          {(message?.sentBy?.name ||
                            message?.senderName ||
                            "AA")
                            .split(" ")
                            .map((part: string) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
