"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Camera, Folder, Image as ImageIcon, Loader2, Paperclip, Plus, Send, Smile, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A message box laid out like Suprah Space's, with only what Dispatch Chat
 * supports: photos, videos and files, quick emojis, and Send.
 * - Phone: round + (opens "Add to message"), a rounded message pill with the
 *   emoji button inside, then a photo button and a round Send button.
 * - Computer: one rounded box, the message on top and a toolbar below
 *   (attach and emoji on the left, Send on the right).
 */
export function SupraStyleComposer({
  draft,
  onDraftChange,
  onSubmit,
  placeholder,
  disabled,
  sending,
  canSend,
  maxLength,
  emojis,
  onFiles,
  fileAccept,
  attachDisabled,
  attachments,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  /** Nothing can be written (for example an inactive dispatcher). */
  disabled: boolean;
  sending: boolean;
  /** There's text or a file, and sending is allowed right now. */
  canSend: boolean;
  maxLength: number;
  emojis: readonly string[];
  onFiles: (files: File[]) => void;
  /** File types the Files picker offers; the server checks every file anyway. */
  fileAccept?: string;
  attachDisabled: boolean;
  /** The chosen files, shown above the message box. */
  attachments?: React.ReactNode;
}) {
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const filesInputRef = React.useRef<HTMLInputElement | null>(null);

  // Grow with the message, up to the box's maximum height.
  React.useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft]);

  React.useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const submit = () => {
    if (!canSend) return;
    setEmojiOpen(false);
    onSubmit();
  };

  const insertEmoji = (emoji: string) => {
    const element = textareaRef.current;
    const start = element?.selectionStart ?? draft.length;
    const end = element?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, maxLength);
    onDraftChange(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      const caret = Math.min(start + emoji.length, next.length);
      element.setSelectionRange(caret, caret);
    });
  };

  const choose = (input: React.RefObject<HTMLInputElement | null>) => {
    input.current?.click();
    setSheetOpen(false);
  };

  const pickerProps = {
    type: "file" as const,
    multiple: true,
    className: "hidden",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length) onFiles(files);
    },
  };

  const sheetItems: Array<{ label: string; icon: React.ReactNode; input: React.RefObject<HTMLInputElement | null> }> = [
    { label: "Photos & Videos", icon: <ImageIcon className="size-6" />, input: mediaInputRef },
    { label: "Videos", icon: <Video className="size-6" />, input: videoInputRef },
    { label: "Camera", icon: <Camera className="size-6" />, input: cameraInputRef },
    { label: "Files", icon: <Folder className="size-6" />, input: filesInputRef },
  ];

  return (
    <div className="relative">
      {attachments}

      {emojiOpen && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-popover p-2 shadow-xl md:left-0 md:right-auto">
          <p className="px-1 pb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Quick emotes</p>
          <div className="grid grid-cols-8 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex size-7 items-center justify-center rounded-lg text-base hover:bg-muted"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <input ref={mediaInputRef} accept="image/*,video/*" {...pickerProps} />
      <input ref={videoInputRef} accept="video/*" {...pickerProps} />
      <input ref={cameraInputRef} accept="image/*" capture="environment" {...pickerProps} />
      <input ref={filesInputRef} accept={fileAccept} {...pickerProps} />

      <div className="rounded-[14px] border-[1.5px] border-border/80 bg-background/60 transition-[border-color,box-shadow] focus-within:border-emerald-500 focus-within:ring-[3px] focus-within:ring-emerald-500/20 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:focus-within:ring-0">
        <div className="flex min-w-0 flex-col px-3 pb-1.5 pt-2.5 max-md:grid max-md:grid-cols-[44px_minmax(0,1fr)_auto] max-md:items-end max-md:gap-2 max-md:px-0 max-md:py-1 sm:px-3.5">
          {/* Phone: add photos, videos or files. */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              disabled={attachDisabled}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 disabled:opacity-50"
              title="Add to message"
              aria-label="Add to message"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
            >
              <Plus className="size-6" />
            </button>
          </div>

          <div
            className="flex min-w-0 items-end gap-2 max-md:min-h-11 max-md:items-center max-md:overflow-hidden max-md:rounded-full max-md:bg-muted max-md:py-2 max-md:pl-4 max-md:pr-2"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              textareaRef.current?.focus();
            }}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              maxLength={maxLength}
              placeholder={placeholder}
              disabled={disabled}
              aria-label="Message"
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              className="block max-h-40 min-h-6 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed max-md:max-h-[88px] max-md:text-base"
            />
            {/* Phone: emoji inside the message pill. */}
            <button
              type="button"
              onClick={() => setEmojiOpen((current) => !current)}
              disabled={disabled}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors disabled:opacity-50 md:hidden",
                emojiOpen && "text-emerald-600 dark:text-emerald-400",
              )}
              aria-label="Add emoji"
              aria-pressed={emojiOpen}
            >
              <Smile className="size-5" />
            </button>
          </div>

          {/* Phone: photo button and Send (where Suprah Space has the mic). */}
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              disabled={attachDisabled}
              className="flex h-10 w-[34px] shrink-0 items-center justify-center rounded-full text-foreground disabled:opacity-50"
              title="Add attachment"
              aria-label="Add attachment"
              aria-haspopup="dialog"
            >
              <ImageIcon className="size-6" />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-transform active:scale-95 disabled:opacity-40"
              title="Send"
              aria-label="Send"
            >
              {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </div>
        </div>

        {/* Computer: toolbar under the message. */}
        <div className="hidden items-center justify-between px-2.5 pb-2.5 pt-1 sm:px-3 md:flex">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => filesInputRef.current?.click()}
              disabled={attachDisabled}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              title="Attach photos or files (up to 5, 25 MB each)"
              aria-label="Attach photos or files"
            >
              <Paperclip className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setEmojiOpen((current) => !current)}
              disabled={disabled}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
                emojiOpen && "bg-muted text-foreground",
              )}
              title="Emoji"
              aria-label="Add emoji"
              aria-pressed={emojiOpen}
            >
              <Smile className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {draft.length > maxLength - 500 && (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {draft.length}/{maxLength}
              </span>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
              title="Send (Enter). Shift+Enter adds a new line."
              aria-label="Send"
            >
              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {sheetOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end bg-black/60 md:hidden" onClick={() => setSheetOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add to message"
              className="flex max-h-[calc(100dvh-72px)] w-full select-none flex-col rounded-t-[28px] bg-popover px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3 shadow-[0_-16px_48px_rgba(0,0,0,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-9 rounded-full bg-border" />
                  <p className="text-sm font-semibold">Add to message</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label="Close attachment menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="min-h-0 space-y-1 overflow-y-auto overscroll-contain">
                {sheetItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => choose(item.input)}
                    className="flex w-full items-center gap-5 rounded-2xl px-3 py-3.5 text-left active:bg-muted"
                  >
                    <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="shrink-0 px-3 pt-2 text-[11px] text-muted-foreground">Up to 5 files, 25 MB each.</p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
