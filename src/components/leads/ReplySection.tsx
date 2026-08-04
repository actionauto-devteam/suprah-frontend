"use client";

import * as React from "react";
import {
  Send,
  Circle,
  ChevronDown,
  Calendar,
  XCircle,
  Lock,
  LockOpen,
  Truck,
  Smile,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_CONFIG } from "./atomic/StatusPill";
import { StatusReasonModal } from "./StatusReasonModal";

interface ReplySectionProps {
  isClosed: boolean;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  onSend: (attachments?: File[]) => void | Promise<void>;
  isSending: boolean;
  onStatusChange: (status: string, reason?: string) => void;
  onApptOpen: () => void;
  onReopen: (reason?: string) => void;
  onQuoteShipping: () => void;
  selectedLeadStatus: string;
}

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
    onReopen,
    onQuoteShipping,
    selectedLeadStatus,
  }: ReplySectionProps) => {
    const [reasonModal, setReasonModal] = React.useState<
      null | "close" | "reopen"
    >(null);

    const [attachments, setAttachments] = React.useState<File[]>([]);
    const [attachmentError, setAttachmentError] = React.useState("");
    const [emojiOpen, setEmojiOpen] = React.useState(false);

    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const emojiMenuRef = React.useRef<HTMLDivElement | null>(null);

    const resizeTextarea = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight =
        Number.parseFloat(computedStyle.lineHeight) || 20;
      const minHeight = lineHeight * 2 + 20;
      const maxHeight = Math.min(
        Math.max(window.innerHeight * 0.34, 160),
        320,
      );

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

    const handleReasonConfirm = (reason: string) => {
      if (reasonModal === "close") {
        onStatusChange("Closed", reason);
      } else if (reasonModal === "reopen") {
        onReopen(reason);
      }

      setReasonModal(null);
    };

    const reasonModalProps =
      reasonModal === "close"
        ? {
          title: "Close this ticket",
          description:
            "Why is this inquiry being closed? This is logged on the ticket for the team to see later.",
          confirmLabel: "Close ticket",
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

    const insertEmoji = (emoji: string) => {
      const textarea = textareaRef.current;

      if (!textarea) {
        setReplyMessage(`${replyMessage}${emoji}`);
        setEmojiOpen(false);
        return;
      }

      const start = textarea.selectionStart ?? replyMessage.length;
      const end = textarea.selectionEnd ?? replyMessage.length;

      const nextValue =
        replyMessage.slice(0, start) +
        emoji +
        replyMessage.slice(end);

      setReplyMessage(nextValue);
      setEmojiOpen(false);

      window.setTimeout(() => {
        textarea.focus();
        const nextCursor = start + emoji.length;
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);
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
        (!replyMessage.trim() && attachments.length === 0)
      ) {
        return;
      }

      try {
        await onSend(attachments);
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
          <div
            className="flex shrink-0 items-center justify-between px-5 py-3.5"
            style={{
              borderTop: "1px solid var(--border-1)",
              background: "var(--bg-elevated)",
            }}
          >
            <div className="flex items-center gap-2">
              <Lock
                className="h-3.5 w-3.5"
                style={{ color: "var(--text-disabled)" }}
              />

              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                }}
              >
                This inquiry is closed
              </span>
            </div>

            <button
              type="button"
              onClick={() => setReasonModal("reopen")}
              className="ss4-pill-btn flex h-9 items-center gap-1.5 px-3 text-xs font-medium sm:h-7"
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
      <div
        className="suprah-reply-section shrink-0 px-2 py-2 sm:px-4"
        style={{
          borderTop: "1px solid var(--border-1)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="ss4-input-wrap relative overflow-visible">
          <textarea
            ref={textareaRef}
            value={replyMessage}
            onChange={(event) => {
              setReplyMessage(event.target.value);
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
            className="suprah-composer-field suprah-composer-message suprah-reply-textarea block w-full resize-none bg-transparent px-3 pb-2 pt-3 leading-snug outline-none sm:px-4"
            style={{
              minHeight: 56,
              maxHeight: "34vh",
              fontSize: 14,
              color: "var(--text-primary)",
              overflowY: "hidden",
            }}
          />

          {attachments.length > 0 && (
            <div
              className="flex flex-wrap gap-2 border-t px-3 py-2"
              style={{ borderColor: "var(--border-1)" }}
            >
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border px-2.5 py-2"
                  style={{
                    background: "var(--bg-hover)",
                    borderColor: "var(--border-1)",
                  }}
                >
                  {isImageFile(file) ? (
                    <ImageIcon
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--accent)" }}
                    />
                  ) : (
                    <FileText
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--accent)" }}
                    />
                  )}

                  <div className="min-w-0">
                    <p
                      className="max-w-45 truncate text-xs font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {file.name}
                    </p>

                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="ss4-icon-btn flex h-6 w-6 shrink-0 items-center justify-center"
                    aria-label={`Remove ${file.name}`}
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {attachmentError && (
            <p
              className="border-t px-3 py-2 text-xs"
              style={{
                borderColor: "var(--border-1)",
                color: "var(--danger, #ef4444)",
              }}
            >
              {attachmentError}
            </p>
          )}

          <div
            className="grid select-none grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2 sm:flex sm:flex-wrap sm:items-center"
            style={{ borderTop: "1px solid var(--border-1)" }}
          >
            <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-1 sm:flex-wrap sm:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                  >
                    <Circle className="h-3 w-3" />
                    Status
                    <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="z-50 min-w-40 rounded-xl border border-border bg-popover p-1 shadow-lg"
                >
                  {Object.entries(STATUS_CONFIG)
                    .filter(
                      ([status]) =>
                        status !== selectedLeadStatus &&
                        status !== "Inbound Calls",
                    )
                    .map(([status, config]) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() =>
                          status === "Closed"
                            ? setReasonModal("close")
                            : onStatusChange(status)
                        }
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground focus:bg-muted focus:text-foreground"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`}
                        />
                        {config.label}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={onApptOpen}
                className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
              >
                <Calendar className="h-3 w-3" />
                Schedule
              </button>

              <button
                type="button"
                onClick={onQuoteShipping}
                className="ss4-pill-btn flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-medium sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
              >
                <Truck className="h-3 w-3" />
                Quote
              </button>

              <button
                type="button"
                onClick={() => setReasonModal("close")}
                className="flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[11px] font-medium transition-all sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]"
                style={{
                  color: "var(--danger)",
                  opacity: 0.7,
                }}
              >
                <XCircle className="h-3 w-3" />
                Close
              </button>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 self-stretch sm:ml-auto sm:self-auto">
              <div ref={emojiMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((previous) => !previous)}
                  disabled={isSending}
                  className="ss4-icon-btn inline-flex h-9 w-9 items-center justify-center sm:h-7 sm:w-7"
                  title="Add emoji"
                  aria-label="Add emoji"
                  aria-expanded={emojiOpen}
                >
                  <Smile className="h-4 w-4" />
                </button>

                {emojiOpen && (
                  <div
                    className="absolute bottom-full right-0 z-100 mb-2 grid w-55 grid-cols-8 gap-1 rounded-xl border p-2 shadow-xl"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--border-2)",
                    }}
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-(--bg-hover)"
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
                disabled={isSending}
                className="ss4-icon-btn inline-flex h-9 w-9 items-center justify-center sm:h-7 sm:w-7"
                title="Attach file (maximum 5 MB per file)"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => void handleSendReply()}
                disabled={
                  isSending ||
                  (!replyMessage.trim() && attachments.length === 0)
                }
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:h-7"
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                }}
                title={
                  replyMessage.trim() || attachments.length > 0
                    ? "Send reply"
                    : "Write a reply or attach a file"
                }
                aria-label="Send reply"
              >
                <Send className="h-3.5 w-3.5 shrink-0" />
                <span>{isSending ? "Sending…" : "Send"}</span>
              </button>
            </div>
          </div>
        </div>

        <StatusReasonModal
          open={reasonModal === "close"}
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