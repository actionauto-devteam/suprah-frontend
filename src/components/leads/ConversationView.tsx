"use client";

import * as React from "react";
import {
  Mail,
  MessageSquare,
  Users,
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

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span
        className="h-px flex-1"
        style={{
          background: "var(--border-2)",
        }}
      />

      <span
        className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{
          color: "var(--accent)",
        }}
      >
        {children}
      </span>

      <span
        className="h-px flex-1"
        style={{
          background: "var(--border-2)",
        }}
      />
    </div>
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
        "grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-2.5",
        !isLast && "border-b",
      )}
      style={{
        borderColor: "var(--border-1)",
      }}
    >
      <span
        className="text-right text-xs"
        style={{
          color: "var(--text-tertiary)",
        }}
      >
        {field.label}
      </span>

      <strong
        className="min-w-0 wrap-break-word text-xs font-semibold"
        style={{
          color: "var(--text-primary)",
        }}
      >
        {field.value}
      </strong>
    </div>
  );
}

function InquiryCard({
  lead,
  message,
}: {
  lead: any;
  message: any;
}) {
  const sections = buildInquirySections(
    lead,
    message,
  );

  const contactSection = sections.find(
    (section) =>
      section.title === "Contact Information",
  );

  const vehicleSection = sections.find(
    (section) =>
      section.title === "Vehicle Interest",
  );

  const leadSection = sections.find(
    (section) =>
      section.title === "Lead Details",
  );

  const senderName = getLeadName(lead);

  return (
    <div className="flex w-full items-start justify-start gap-2.5">
      <Avatar
        first={lead?.firstName}
        last={lead?.lastName}
        size="sm"
      />

      <div className="min-w-0 w-full max-w-170">
        <p
          className="mb-1.5 text-xs font-semibold"
          style={{
            color: "var(--text-secondary)",
          }}
        >
          {senderName}
        </p>

        <article
          className="overflow-hidden rounded-2xl border px-4 pb-4 pt-3"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-2)",
            boxShadow:
              "0 10px 28px rgba(0, 0, 0, 0.16)",
          }}
        >
          <h3
            className="text-sm font-semibold leading-snug"
            style={{
              color: "var(--text-primary)",
            }}
          >
            {message?.subject ||
              lead?.subject ||
              "New Lead from Credit Application"}
          </h3>

          {(contactSection || vehicleSection) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {contactSection && (
                <section className="min-w-0">
                  <SectionTitle>
                    {contactSection.title}
                  </SectionTitle>

                  <div>
                    {contactSection.fields.map(
                      (field, index) => (
                        <InquiryFieldRow
                          key={`${contactSection.title}-${field.label}`}
                          field={field}
                          isLast={
                            index ===
                            contactSection.fields.length - 1
                          }
                        />
                      ),
                    )}
                  </div>
                </section>
              )}

              {vehicleSection && (
                <section className="min-w-0">
                  <SectionTitle>
                    {vehicleSection.title}
                  </SectionTitle>

                  <div>
                    {vehicleSection.fields.map(
                      (field, index) => (
                        <InquiryFieldRow
                          key={`${vehicleSection.title}-${field.label}`}
                          field={field}
                          isLast={
                            index ===
                            vehicleSection.fields.length - 1
                          }
                        />
                      ),
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {leadSection && (
            <section className="min-w-0">
              <SectionTitle>
                {leadSection.title}
              </SectionTitle>

              <div className="grid grid-cols-1 gap-x-5 md:grid-cols-2">
                {leadSection.fields.map(
                  (field, index) => (
                    <InquiryFieldRow
                      key={`${leadSection.title}-${field.label}`}
                      field={field}
                      isLast={
                        index ===
                        leadSection.fields.length - 1
                      }
                    />
                  ),
                )}
              </div>
            </section>
          )}
        </article>

        <time
          className="mt-1.5 block text-[10px]"
          style={{
            color: "var(--text-tertiary)",
          }}
        >
          {formatTimestamp(
            message?.createdAt ||
            message?.date ||
            message?.timestamp ||
            lead?.createdAt,
          )}
        </time>
      </div>
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
  const messageAreaRef =
    React.useRef<HTMLDivElement | null>(null);

  const leadName = getLeadName(lead);

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

  return (
    <section className="suprah-conversation-shell suprah-center-conversation-content flex flex-1 min-h-0 flex-col overflow-hidden">
      {!hideConversationChrome && (
        <>
          <header className="suprah-conversation-header">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                first={lead?.firstName}
                last={lead?.lastName}
                size="md"
              />

              <div className="min-w-0">
                <h2 className="truncate">
                  {leadName}
                </h2>

                <p className="truncate">
                  {lead?.phone ||
                    lead?.email ||
                    lead?.senderEmail ||
                    "No contact information"}
                </p>
              </div>
            </div>
          </header>

          <div className="suprah-meta-bar">
            <span>
              {lead?.source || "Lead Inbox"}
            </span>

            <span>
              {lead?.subject ||
                "Lead conversation"}
            </span>

            <span>{sourceEmail}</span>
          </div>
        </>
      )}

      {siblingCount > 0 && (
        <button
          type="button"
          onClick={onReplyToSiblings}
          className="suprah-sibling-banner"
        >
          <Users className="h-4 w-4 shrink-0" />

          <span>
            {siblingCount} other{" "}
            {siblingCount === 1
              ? "inquiry"
              : "inquiries"}{" "}
            for this vehicle
          </span>

          <strong>Reply together</strong>
        </button>
      )}

      <div
        ref={messageAreaRef}
        className="suprah-message-area flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        <div className="mx-auto w-full max-w-5xl">
          <div className="suprah-conversation-start">
            <div className="suprah-phone-icon">
              <MessageSquare className="h-5 w-5" />
            </div>

            <h3>
              Beginning of lead conversation
            </h3>

            <p>
              {formatTimestamp(lead?.createdAt) ||
                "Conversation started"}
            </p>
          </div>

          {threads.length === 0 ? (
            <div className="suprah-empty-thread">
              <Mail className="h-5 w-5" />

              <div>
                <strong>
                  No synced messages yet
                </strong>

                <p>
                  The lead inquiry is ready for your
                  first response.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-5">
              {threads.map((message, index) => {
                const outbound =
                  isOutboundMessage(
                    message,
                    sourceEmail,
                  );

                const key =
                  message?._id ||
                  message?.id ||
                  message?.messageId ||
                  `${lead?._id}-${index}`;

                if (
                  !outbound &&
                  isLeadInquiryMessage(
                    message,
                    index,
                  )
                ) {
                  return (
                    <InquiryCard
                      key={key}
                      lead={lead}
                      message={message}
                    />
                  );
                }

                const text =
                  getMessageText(message);

                return (
                  <div
                    key={key}
                    className={cn(
                      "suprah-message-row",
                      outbound
                        ? "outbound"
                        : "inbound",
                    )}
                  >
                    {!outbound && (
                      <Avatar
                        first={lead?.firstName}
                        last={lead?.lastName}
                        size="sm"
                      />
                    )}

                    <div className="suprah-message-column">
                      <div className="suprah-message-bubble whitespace-pre-wrap">
                        {text ||
                          "Message content unavailable"}
                      </div>

                      <span className="suprah-message-time">
                        {formatTimestamp(
                          message?.createdAt ||
                          message?.date ||
                          message?.timestamp,
                        )}
                      </span>
                    </div>

                    {outbound && (
                      <div className="suprah-small-avatar">
                        AA
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}