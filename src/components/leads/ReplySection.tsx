"use client";

import * as React from "react";
import {
  Send,
  Circle,
  Calendar,
  CalendarClock,
  XCircle,
  Lock,
  LockOpen,
  Truck,
  Smile,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  Loader2,
  StickyNote,
  AlertTriangle,
  Mail,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { LeadStatusSelect } from "./atomic/LeadStatusSelect";
import { REASON_REQUIRED_STATUSES } from "@/lib/leadStatus";
import { StatusReasonModal } from "./StatusReasonModal";
import { CannedReplyPicker } from "./CannedReplyPicker";
import { LeadNoteComposer } from "./LeadNoteComposer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  describeAiDraftFailure,
  requestAiAgentDraft,
  type AiDraftChannel,
} from "@/lib/api/aiAgentDraft";
import {
  insertIntoOpenComposer,
  readAiDraft,
  registerAiComposer,
  updateAiDraft,
  useAiDraftSlot,
} from "@/lib/aiDraftStore";
import {
  AI_AGENT_NAME_REQUIRED_MESSAGE,
  AI_AGENT_SETTINGS_HREF,
  aiAgentDisplayName,
} from "@/lib/aiAgentIdentity";
import { refreshAiAgentIdentity } from "@/hooks/useAiAgentIdentity";

interface ReplySectionProps {
  isClosed: boolean;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  onSend: (attachments?: File[]) => void | Promise<void>;
  isSending: boolean;
  onStatusChange: (status: string, reason?: string) => void;
  onApptOpen: () => void;
  onReschedule?: () => void;
  onReopen: (reason?: string) => void;
  onQuoteShipping: () => void;
  selectedLeadStatus: string;
  leadContext?: { firstName?: string; lastName?: string; vehicle?: string };
  leadId?: string;
  replyUnavailableReason?: string | null;
  replyNoticeAction?: { label: string; onClick: () => void } | null;
  replyRecipientNote?: { text: string; actionLabel?: string; onAction?: () => void } | null;
  draftChannel?: AiDraftChannel | null;
  aiAgent?: { name: string | null; loading?: boolean; failed?: boolean } | null;
  onAddNote?: (payload: { text: string; mentionedUserIds: string[]; mentionedGroupIds: string[] }) => Promise<void>;
  isSavingNote?: boolean;
  channelSelector?: ReplyChannelSelector | null;
  emailSubject?: { value: string; onChange: (value: string) => void; locked: boolean } | null;
  sendNotice?: { text: string; actionLabel?: string; onAction?: () => void; resend?: boolean } | null;
}

export interface ReplyChannelChoice {
  available: boolean;
  reason: string | null;
  recipientLabel: string | null;
}

export interface ReplyChannelSelector {
  value: "sms" | "email";
  onChange: (channel: "sms" | "email") => void;
  sms: ReplyChannelChoice;
  email: ReplyChannelChoice;
  loading?: boolean;
}

const CHANNEL_LABELS: Record<"sms" | "email", string> = { sms: "Text", email: "Email" };

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".pdf",
  ".docx",
  ".doc",
  ".txt",
  ".csv",
  ".xlsx",
  ".xls",
] as const;

const FILE_ACCEPT_VALUE = ALLOWED_EXTENSIONS.join(",");

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "😊",
  "😍",
  "👍",
  "🙏",
  "🎉",
  "✅",
  "🚗",
  "📅",
  "📞",
  "📧",
  "💬",
  "🔥",
  "❤️",
];

const getFileExtension = (fileName: string) => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1
    ? ""
    : fileName.slice(lastDot).toLowerCase();
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (file: File) =>
  [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(
    getFileExtension(file.name),
  );

export const ReplySection = React.memo(
  ({
    isClosed,
    replyMessage,
    setReplyMessage,
    onSend,
    isSending,
    onStatusChange,
    onApptOpen,
    onReschedule,
    onReopen,
    onQuoteShipping,
    selectedLeadStatus,
    leadContext,
    leadId,
    replyUnavailableReason = null,
    replyNoticeAction = null,
    replyRecipientNote = null,
    draftChannel = null,
    aiAgent = null,
    onAddNote,
    isSavingNote,
    channelSelector = null,
    emailSubject = null,
    sendNotice = null,
  }: ReplySectionProps) => {
    const draftKey = leadId && draftChannel ? `${leadId}:${draftChannel}` : null;
    const smsSelected = channelSelector?.value === "sms";
    const subjectInputId = React.useId();
    const [reasonModal, setReasonModal] = React.useState<
      null | { kind: "status"; status: string } | "reopen"
    >(null);

    const [attachments, setAttachments] = React.useState<File[]>([]);
    const [attachmentError, setAttachmentError] = React.useState("");
    const [emojiOpen, setEmojiOpen] = React.useState(false);

    const [composerMode, setComposerMode] = React.useState<"reply" | "note">("reply");
    const [noteText, setNoteText] = React.useState("");
    const [noteMentionedUserIds, setNoteMentionedUserIds] = React.useState<string[]>([]);
    const [noteMentionedGroupIds, setNoteMentionedGroupIds] = React.useState<string[]>([]);

    React.useEffect(() => {
      setComposerMode("reply");
      setNoteText("");
      setNoteMentionedUserIds([]);
      setNoteMentionedGroupIds([]);
      setAttachments([]);
      setAttachmentError("");
    }, [leadId]);

    const handleSaveNote = async () => {
      const trimmed = noteText.trim();
      if (!trimmed || !onAddNote || isSavingNote) return;
      await onAddNote({
        text: trimmed,
        mentionedUserIds: noteMentionedUserIds,
        mentionedGroupIds: noteMentionedGroupIds,
      });
      setNoteText("");
      setNoteMentionedUserIds([]);
      setNoteMentionedGroupIds([]);
      setComposerMode("reply");
    };

    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const emojiMenuRef = React.useRef<HTMLDivElement | null>(null);

    const queryClient = useQueryClient();
    const draftSlot = useAiDraftSlot(draftKey);
    const latestRef = React.useRef({ key: draftKey, replyMessage });
    const setReplyRef = React.useRef(setReplyMessage);

    React.useEffect(() => {
      latestRef.current = { key: draftKey, replyMessage };
      setReplyRef.current = setReplyMessage;
    }, [draftKey, replyMessage, setReplyMessage]);

    React.useEffect(
      () =>
        registerAiComposer({
          key: draftKey,
          text: () => latestRef.current.replyMessage,
          insert: (draft) => setReplyRef.current(draft),
        }),
      [draftKey],
    );

    const agentLabel = aiAgentDisplayName(aiAgent?.name);
    const identityPending = Boolean(aiAgent?.loading);
    const nameMissing = Boolean(aiAgent) && !identityPending && !aiAgent?.failed && !aiAgent?.name;
    const drafting = Boolean(draftSlot.inFlight);
    const currentFailure = draftSlot.failure || null;
    const currentPending = draftSlot.pending || null;
    const currentNote = draftSlot.note || null;
    const aiDrafted = Boolean(draftSlot.drafted) && replyMessage.trim().length > 0;
    const replyBlocked = Boolean(replyUnavailableReason);
    const draftAvailable = Boolean(leadId && draftChannel && aiAgent);
    const showDraftChip =
      draftAvailable && !isSending && !replyBlocked && !currentPending && (drafting || !replyMessage.trim());
    const showNameNotice =
      draftAvailable && !replyBlocked && (nameMissing ? showDraftChip : Boolean(currentFailure?.nameRequired));

    const handleAiDraft = async () => {
      const key = draftKey;
      if (!key || !leadId || !draftChannel || isSending || replyBlocked || identityPending || nameMissing) return;
      if (readAiDraft(key).inFlight) return;

      const baseline = latestRef.current.key === key ? latestRef.current.replyMessage : "";
      updateAiDraft(key, { inFlight: true, failure: undefined, note: undefined });

      try {
        const result = await requestAiAgentDraft(leadId, draftChannel);
        const inserted = insertIntoOpenComposer(key, baseline, result.draft);
        updateAiDraft(key, {
          inFlight: false,
          note: result.note || undefined,
          pending: inserted ? undefined : result.draft,
          drafted: inserted || readAiDraft(key).drafted,
        });
      } catch (error) {
        const failure = describeAiDraftFailure(error);
        updateAiDraft(key, { inFlight: false, failure });
        if (failure.nameRequired) void refreshAiAgentIdentity(queryClient);
      }
    };

    const insertPendingDraft = () => {
      if (!currentPending || !draftKey) return;
      const current = latestRef.current.replyMessage;
      setReplyMessage(current.trim() ? `${current.trimEnd()}\n\n${currentPending}` : currentPending);
      updateAiDraft(draftKey, { pending: undefined, drafted: true });
    };

    const resizeTextarea = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight =
        Number.parseFloat(computedStyle.lineHeight) || 20;
      const minHeight = lineHeight * 2 + 20;
      const maxHeight = window.innerWidth < 640
        ? Math.min(Math.max(window.innerHeight * 0.24, 96), 200)
        : Math.min(Math.max(window.innerHeight * 0.34, 160), 320);

      textarea.style.height = "auto";

      const nextHeight = Math.min(
        Math.max(textarea.scrollHeight, minHeight),
        maxHeight,
      );

      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? "auto" : "hidden";

      window.dispatchEvent(
        new CustomEvent("crm-leads:keep-conversation-bottom"),
      );
    }, []);

    React.useLayoutEffect(() => {
      resizeTextarea();
    }, [replyMessage, resizeTextarea]);

    React.useEffect(() => {
      const handleResize = () => resizeTextarea();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [resizeTextarea]);

    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea || typeof ResizeObserver === "undefined") return;
      let lastWidth = textarea.clientWidth;
      const observer = new ResizeObserver(() => {
        if (textarea.clientWidth === lastWidth) return;
        lastWidth = textarea.clientWidth;
        window.requestAnimationFrame(resizeTextarea);
      });
      observer.observe(textarea);
      return () => observer.disconnect();
    }, [resizeTextarea, composerMode, isClosed]);

    const handleReasonConfirm = (reason: string) => {
      if (reasonModal && typeof reasonModal === "object" && reasonModal.kind === "status") {
        onStatusChange(reasonModal.status, reason);
      } else if (reasonModal === "reopen") {
        onReopen(reason);
      }

      setReasonModal(null);
    };

    const reasonModalProps =
      reasonModal && typeof reasonModal === "object" && reasonModal.kind === "status"
        ? {
          title: `Move to "${reasonModal.status}"`,
          description:
            "Why is this lead moving to this status? This is logged on the ticket for the team to see later.",
          confirmLabel: "Confirm",
        }
        : {
          title: "Reopen this ticket",
          description:
            "Why is this inquiry being reopened? This is logged on the ticket for the team to see later.",
          confirmLabel: "Reopen ticket",
        };

    React.useEffect(() => {
      if (!emojiOpen) return;

      const closeEmojiMenu = (event: MouseEvent) => {
        if (
          emojiMenuRef.current &&
          !emojiMenuRef.current.contains(event.target as Node)
        ) {
          setEmojiOpen(false);
        }
      };

      document.addEventListener("mousedown", closeEmojiMenu);
      return () => document.removeEventListener("mousedown", closeEmojiMenu);
    }, [emojiOpen]);

    const insertTextAtCursor = (text: string) => {
      const textarea = textareaRef.current;

      if (!textarea) {
        setReplyMessage(`${replyMessage}${text}`);
        return;
      }

      const start = textarea.selectionStart ?? replyMessage.length;
      const end = textarea.selectionEnd ?? replyMessage.length;

      const nextValue =
        replyMessage.slice(0, start) +
        text +
        replyMessage.slice(end);

      setReplyMessage(nextValue);

      window.setTimeout(() => {
        textarea.focus();
        const nextCursor = start + text.length;
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);
    };

    const insertEmoji = (emoji: string) => {
      insertTextAtCursor(emoji);
      setEmojiOpen(false);
    };

    const handleFileSelection = (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const selectedFiles = Array.from(event.target.files || []);
      event.target.value = "";

      if (selectedFiles.length === 0) return;

      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of selectedFiles) {
        const extension = getFileExtension(file.name);

        if (!ALLOWED_EXTENSIONS.includes(extension as any)) {
          errors.push(`${file.name}: unsupported file type.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          errors.push(`${file.name}: exceeds the 5 MB limit.`);
          continue;
        }

        const duplicate = attachments.some(
          (existingFile) =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified,
        );

        if (!duplicate) validFiles.push(file);
      }

      setAttachmentError(errors.join(" "));

      if (validFiles.length > 0) {
        setAttachments((previous) => [...previous, ...validFiles]);
      }
    };

    const removeAttachment = (indexToRemove: number) => {
      setAttachments((previous) =>
        previous.filter((_, index) => index !== indexToRemove),
      );
      setAttachmentError("");
    };

    const handleSendReply = async () => {
      if (
        isSending ||
        replyBlocked ||
        (!replyMessage.trim() && attachments.length === 0) ||
        (smsSelected && attachments.length > 0)
      ) {
        return;
      }

      try {
        const sentKey = draftKey;
        await onSend(attachments);
        if (sentKey) updateAiDraft(sentKey, { drafted: false, note: undefined });
        setAttachments([]);
        setAttachmentError("");
        setEmojiOpen(false);
      } catch {
        // Keep the selected files so the user can retry.
      }
    };

    if (isClosed) {
      return (
        <>
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3.5 dark:border-emerald-400/15 dark:bg-[#0f1f19]">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[13px] text-slate-500 dark:text-slate-400">
                This inquiry is closed
              </span>
            </div>

            <button
              type="button"
              onClick={() => setReasonModal("reopen")}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              <LockOpen className="h-3 w-3" />
              Reopen
            </button>
          </div>

          <StatusReasonModal
            open={reasonModal === "reopen"}
            onOpenChange={(open) => {
              if (!open) setReasonModal(null);
            }}
            onConfirm={handleReasonConfirm}
            {...reasonModalProps}
          />
        </>
      );
    }

    return (
      <div className="suprah-reply-section shrink-0 border-t border-slate-200 bg-slate-50 px-2 py-2 dark:border-emerald-400/15 dark:bg-[#0a1410] sm:px-4 sm:py-2.5">
        <div
          className={
            composerMode === "note"
              ? "relative overflow-visible rounded-2xl border border-amber-400/60 bg-amber-50/30 shadow-sm transition focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/15 dark:border-amber-500/30 dark:bg-amber-950/10"
              : "relative overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-emerald-400/15 dark:bg-[#0f1f19]"
          }
        >
          {composerMode === "reply" && channelSelector && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-3 py-1.5 dark:border-emerald-400/10 sm:px-4 sm:py-2">
              <div
                role="radiogroup"
                aria-label="Send as"
                className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-emerald-400/15 dark:bg-[#0a1410]"
              >
                {(["sms", "email"] as const).map((channel) => {
                  const option = channelSelector[channel];
                  const selected = channelSelector.value === channel;
                  const ChannelIcon = channel === "sms" ? MessageSquare : Mail;
                  return (
                    <button
                      key={channel}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isSending || (!selected && !option.available)}
                      title={option.available ? `Send by ${CHANNEL_LABELS[channel].toLowerCase()}` : option.reason || undefined}
                      onClick={() => {
                        if (!selected) channelSelector.onChange(channel);
                      }}
                      className={
                        selected
                          ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[12px] font-semibold text-emerald-700 shadow-sm dark:bg-[#153426] dark:text-emerald-300 sm:h-7"
                          : "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:text-slate-200 sm:h-7"
                      }
                    >
                      <ChannelIcon className="h-3.5 w-3.5" />
                      {CHANNEL_LABELS[channel]}
                    </button>
                  );
                })}
              </div>
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
                {channelSelector.loading
                  ? "Checking how this customer can be reached…"
                  : channelSelector[channelSelector.value].recipientLabel
                    ? (
                      <>
                        To{" "}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {channelSelector[channelSelector.value].recipientLabel}
                        </span>
                      </>
                    )
                    : null}
              </span>
              {(["sms", "email"] as const)
                .filter((channel) => channel !== channelSelector.value)
                .map((channel) => {
                  const option = channelSelector[channel];
                  if (channelSelector.loading || option.available || !option.reason || option.reason === replyUnavailableReason) return null;
                  return (
                    <p key={channel} className="w-full text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {CHANNEL_LABELS[channel]} isn&apos;t available: {option.reason}
                    </p>
                  );
                })}
            </div>
          )}

          {composerMode === "reply" && showDraftChip && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 px-3 py-1.5 dark:border-emerald-400/10 sm:px-4">
              <button
                type="button"
                onClick={() => void handleAiDraft()}
                disabled={drafting || identityPending || nameMissing}
                className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-3 text-[12px] font-medium text-emerald-700 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300 sm:h-7"
                title={
                  nameMissing
                    ? AI_AGENT_NAME_REQUIRED_MESSAGE
                    : `Ask ${agentLabel} to suggest a reply. Nothing is sent until you press Send.`
                }
                aria-busy={drafting}
              >
                {drafting ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{drafting ? `${agentLabel} is writing…` : `Draft with ${agentLabel}`}</span>
              </button>
              {drafting && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nothing is sent. You can keep typing.
                </span>
              )}
            </div>
          )}

          {composerMode === "reply" && showNameNotice && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 px-3 py-1.5 text-[11px] leading-snug text-slate-600 dark:border-emerald-400/10 dark:text-slate-300 sm:px-4"
            >
              <span className="min-w-0 flex-1">{AI_AGENT_NAME_REQUIRED_MESSAGE}</span>
              <Link
                href={AI_AGENT_SETTINGS_HREF}
                className="shrink-0 font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
              >
                Open CRM Settings
              </Link>
            </div>
          )}

          {composerMode === "reply" && currentPending && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-2 border-b border-emerald-200/70 bg-emerald-50/60 px-3 py-1.5 text-[12px] leading-snug text-emerald-800 dark:border-emerald-400/15 dark:bg-emerald-400/[0.06] dark:text-emerald-200 sm:px-4"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                {replyMessage.trim()
                  ? `${agentLabel}'s suggestion is ready. Your text was kept.`
                  : `${agentLabel}'s suggestion is ready.`}
              </span>
              <button
                type="button"
                onClick={insertPendingDraft}
                className="shrink-0 rounded-md border border-emerald-500/40 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-400/10"
              >
                Add suggestion
              </button>
              <button
                type="button"
                onClick={() => {
                  if (draftKey) updateAiDraft(draftKey, { pending: undefined });
                }}
                className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Dismiss
              </button>
            </div>
          )}

          {composerMode === "reply" && replyUnavailableReason && (
            <div
              role="status"
              className="flex flex-wrap items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 sm:px-4"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">{replyUnavailableReason}</span>
              {replyNoticeAction && (
                <button
                  type="button"
                  onClick={replyNoticeAction.onClick}
                  className="shrink-0 rounded-md border border-amber-400/60 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-400/10"
                >
                  {replyNoticeAction.label}
                </button>
              )}
            </div>
          )}

          {composerMode === "reply" && sendNotice && (
            <div
              role="status"
              className="flex flex-wrap items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 sm:px-4"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">{sendNotice.text}</span>
              {sendNotice.actionLabel && sendNotice.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    sendNotice.onAction?.();
                    if (sendNotice.resend) void handleSendReply();
                  }}
                  disabled={isSending}
                  className="shrink-0 rounded-md border border-amber-400/60 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-400/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-400/10"
                >
                  {sendNotice.actionLabel}
                </button>
              )}
            </div>
          )}

          {composerMode === "reply" && emailSubject && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 px-3 py-1.5 dark:border-emerald-400/10 sm:px-4">
              <label
                htmlFor={subjectInputId}
                className="shrink-0 text-[12px] font-medium text-slate-500 dark:text-slate-400"
              >
                Subject
              </label>
              <input
                id={subjectInputId}
                type="text"
                value={emailSubject.value}
                maxLength={200}
                readOnly={emailSubject.locked}
                disabled={replyBlocked}
                onChange={(event) => emailSubject.onChange(event.target.value)}
                placeholder="Email subject"
                className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 read-only:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:read-only:text-slate-400"
              />
              {emailSubject.locked && (
                <p className="w-full text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  This reply stays in the same email thread, so the subject stays the same.
                </p>
              )}
            </div>
          )}

          {composerMode === "reply" && !replyUnavailableReason && replyRecipientNote && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 text-[12px] leading-snug text-slate-600 dark:border-emerald-400/10 dark:text-slate-300 sm:px-4"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{replyRecipientNote.text}</span>
              {replyRecipientNote.actionLabel && replyRecipientNote.onAction && (
                <button
                  type="button"
                  onClick={replyRecipientNote.onAction}
                  className="shrink-0 text-[11px] font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                >
                  {replyRecipientNote.actionLabel}
                </button>
              )}
            </div>
          )}

          {composerMode === "note" ? (
            <div className="px-3 pb-2 pt-3 sm:px-4">
              <LeadNoteComposer
                bare
                value={noteText}
                onChange={setNoteText}
                mentionedUserIds={noteMentionedUserIds}
                onMentionedUserIdsChange={setNoteMentionedUserIds}
                mentionedGroupIds={noteMentionedGroupIds}
                onMentionedGroupIdsChange={setNoteMentionedGroupIds}
                onSubmit={() => void handleSaveNote()}
                placeholder="Write an internal note — never seen by the customer…"
                disabled={isSavingNote}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={replyMessage}
              disabled={replyBlocked}
              onChange={(event) => {
                setReplyMessage(event.target.value);
                if (!event.target.value.trim() && draftKey && draftSlot.drafted) updateAiDraft(draftKey, { drafted: false });
                window.requestAnimationFrame(resizeTextarea);
              }}
              placeholder="Write a reply…"
              rows={2}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey)
                ) {
                  event.preventDefault();
                  void handleSendReply();
                }
              }}
              className="suprah-composer-field suprah-composer-message suprah-reply-textarea block w-full resize-none bg-transparent px-3 pb-2 pt-3 text-[14px] leading-snug text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500 sm:px-4"
              style={{
                minHeight: 56,
                maxHeight: "34vh",
                overflowY: "hidden",
              }}
            />
          )}

          {composerMode === "reply" && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2 dark:border-emerald-400/10">
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-emerald-400/15 dark:bg-[#153426]/50"
                >
                  {isImageFile(file) ? (
                    <ImageIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}

                  <div className="min-w-0">
                    <p className="max-w-45 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {file.name}
                    </p>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-emerald-400/15 dark:hover:text-slate-200"
                    aria-label={`Remove ${file.name}`}
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {composerMode === "reply" && smsSelected && attachments.length > 0 && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-amber-700 dark:border-emerald-400/10 dark:text-amber-300">
              Attachments can only be sent by email. Remove them or switch to Email.
            </p>
          )}

          {composerMode === "reply" && attachmentError && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-red-500 dark:border-emerald-400/10">
              {attachmentError}
            </p>
          )}

          {composerMode === "reply" && currentFailure && !currentFailure.nameRequired && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2 text-xs text-red-600 dark:border-emerald-400/10 dark:text-red-400"
            >
              <span className="min-w-0 flex-1">{currentFailure.message}</span>
              {currentFailure.retryable && (
                <button
                  type="button"
                  onClick={() => void handleAiDraft()}
                  disabled={drafting || isSending || replyBlocked}
                  className="shrink-0 rounded-md border border-red-300 px-2 py-0.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-400/10"
                >
                  {drafting ? "Retrying…" : "Retry"}
                </button>
              )}
            </div>
          )}

          {composerMode === "reply" && aiDrafted && !currentFailure && (
            <p className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 text-[11px] text-emerald-700 dark:border-emerald-400/10 dark:text-emerald-300">
              <Sparkles className="h-3 w-3 shrink-0" />
              Drafted by {agentLabel} — review and edit before sending.
            </p>
          )}

          {composerMode === "reply" && currentNote && (
            <p className="flex items-start gap-1.5 border-t border-slate-100 px-3 py-1.5 text-[11px] leading-snug text-slate-600 dark:border-emerald-400/10 dark:text-slate-300">
              <StickyNote className="mt-px h-3 w-3 shrink-0 text-amber-500" />
              <span className="min-w-0 [overflow-wrap:anywhere]">Staff only: {currentNote}</span>
            </p>
          )}

          <div className="flex select-none items-center gap-2 border-t border-slate-100 px-2 py-1.5 dark:border-emerald-400/10 sm:flex-wrap sm:px-2.5 sm:py-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-wrap">
              <LeadStatusSelect
                value={selectedLeadStatus}
                excludeCurrent
                triggerLabel={<span className="max-[359px]:sr-only">Status</span>}
                triggerIcon={<Circle className="h-3 w-3" />}
                onChange={(status) =>
                  REASON_REQUIRED_STATUSES.includes(status)
                    ? setReasonModal({ kind: "status", status })
                    : onStatusChange(status)
                }
              />

              <button
                type="button"
                onClick={onApptOpen}
                className="hidden h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-700 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-emerald-300 sm:flex sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
              >
                <Calendar className="h-3 w-3" />
                Schedule
              </button>

              {onReschedule && (
                <button
                  type="button"
                  onClick={onReschedule}
                  className="hidden h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-700 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-emerald-300 sm:flex sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                >
                  <CalendarClock className="h-3 w-3" />
                  Reschedule
                </button>
              )}

              {onAddNote && (
                <button
                  type="button"
                  onClick={() => setComposerMode((mode) => (mode === "note" ? "reply" : "note"))}
                  className={
                    composerMode === "note"
                      ? "flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 text-[11px] font-medium text-amber-700 transition dark:border-amber-400/40 dark:text-amber-300 sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                      : "flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-600 transition hover:border-amber-500/40 hover:bg-amber-500/[0.06] hover:text-amber-700 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-amber-300 sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                  }
                >
                  <StickyNote className="h-3 w-3" />
                  <span className="max-[359px]:sr-only">Note</span>
                </button>
              )}

              <button
                type="button"
                onClick={onQuoteShipping}
                className="hidden h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-700 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-emerald-300 sm:flex sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
              >
                <Truck className="h-3 w-3" />
                Quote
              </button>

              <button
                type="button"
                onClick={() => setReasonModal({ kind: "status", status: "Closed" })}
                className="hidden h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[11px] font-medium text-red-500/80 transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 sm:flex sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
              >
                <XCircle className="h-3 w-3" />
                Close
              </button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-700 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-emerald-300 sm:hidden"
                    title="More actions"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-52">
                  <DropdownMenuItem onSelect={onApptOpen}>
                    <Calendar />
                    Schedule
                  </DropdownMenuItem>
                  {onReschedule && (
                    <DropdownMenuItem onSelect={onReschedule}>
                      <CalendarClock />
                      Reschedule
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onQuoteShipping}>
                    <Truck />
                    Quote shipping
                  </DropdownMenuItem>
                  {composerMode === "reply" && (
                    <DropdownMenuItem
                      disabled={isSending || replyBlocked || smsSelected}
                      onSelect={() => fileInputRef.current?.click()}
                    >
                      <Paperclip />
                      {smsSelected ? "Attach file (email only)" : "Attach file"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setReasonModal({ kind: "status", status: "Closed" })}
                  >
                    <XCircle />
                    Close lead
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 self-stretch sm:ml-auto sm:self-auto">
              {composerMode === "reply" && (
                <>
                  <CannedReplyPicker
                    onInsert={insertTextAtCursor}
                    leadContext={leadContext}
                    disabled={isSending}
                  />

                  <div ref={emojiMenuRef} className="relative hidden sm:block">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((previous) => !previous)}
                      disabled={isSending}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-emerald-400/10 dark:hover:text-slate-300 sm:h-7 sm:w-7"
                      title="Add emoji"
                      aria-label="Add emoji"
                      aria-expanded={emojiOpen}
                    >
                      <Smile className="h-4 w-4" />
                    </button>

                    {emojiOpen && (
                      <div
                        className="absolute bottom-full right-0 z-100 mb-2 grid w-55 grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-emerald-400/15 dark:bg-[#0f1f19]"
                      >
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-slate-100 dark:hover:bg-emerald-400/15"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={FILE_ACCEPT_VALUE}
                    onChange={handleFileSelection}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || replyBlocked || smsSelected}
                    className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-emerald-400/10 dark:hover:text-slate-300 sm:inline-flex sm:h-7 sm:w-7"
                    title={smsSelected ? "Attachments can only be sent by email" : "Attach file (maximum 5 MB per file)"}
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSendReply()}
                    disabled={
                      isSending ||
                      replyBlocked ||
                      (!replyMessage.trim() && attachments.length === 0) ||
                      (smsSelected && attachments.length > 0)
                    }
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 text-[12px] font-semibold text-white shadow-sm shadow-emerald-500/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 dark:from-emerald-500 dark:to-cyan-600 sm:h-7"
                    title={
                      replyUnavailableReason
                        ? replyUnavailableReason
                        : smsSelected && attachments.length > 0
                          ? "Remove the attachments or switch to Email to send them"
                          : replyMessage.trim() || attachments.length > 0
                            ? channelSelector
                              ? `Send ${channelSelector.value === "sms" ? "text" : "email"}`
                              : "Send reply"
                            : "Write a reply or attach a file"
                    }
                    aria-label="Send reply"
                  >
                    <Send className="h-3.5 w-3.5 shrink-0" />
                    <span>{isSending ? "Sending…" : "Send"}</span>
                  </button>
                </>
              )}

              {composerMode === "note" && (
                <button
                  type="button"
                  onClick={() => void handleSaveNote()}
                  disabled={isSavingNote || !noteText.trim()}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 text-[12px] font-semibold text-white shadow-sm shadow-amber-500/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7"
                  title={noteText.trim() ? "Save internal note" : "Write a note first"}
                  aria-label="Save internal note"
                >
                  <StickyNote className="h-3.5 w-3.5 shrink-0" />
                  <span>{isSavingNote ? "Saving…" : "Save note"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <StatusReasonModal
          open={Boolean(reasonModal && typeof reasonModal === "object" && reasonModal.kind === "status")}
          onOpenChange={(open) => {
            if (!open) setReasonModal(null);
          }}
          onConfirm={handleReasonConfirm}
          {...reasonModalProps}
        />
      </div>
    );
  },
);

ReplySection.displayName = "ReplySection";