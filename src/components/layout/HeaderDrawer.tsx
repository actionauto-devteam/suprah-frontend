"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function HeaderDrawer({ open, onOpenChange, title, id, triggerRef, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; id: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>; children: React.ReactNode;
}) {
  const [desktop, setDesktop] = React.useState<boolean | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(query.matches);
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const restoreTriggerFocus = () => {
    // A closing mobile panel must not steal focus from a newly opened drawer.
    const anotherDrawerIsOpen = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"][aria-controls]'))
      .some(button => button.getAttribute("aria-controls") !== id &&
        ["notification-drawer", "pulse360-drawer", "suprahspace-drawer"].includes(button.getAttribute("aria-controls") || ""));
    if (!anotherDrawerIsOpen) triggerRef.current?.focus({ preventScroll: true });
  };
  const close = () => { onOpenChange(false); restoreTriggerFocus(); };
  React.useEffect(() => {
    if (!open || !desktop) return;
    closeRef.current?.focus({ preventScroll: true });
  }, [open, desktop]);
  if (!open || desktop === null) return null;
  const body = <>
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
      <h2 className="text-sm font-bold">{title}</h2>
      <button ref={closeRef} type="button" onClick={close} aria-label={"Close " + title}
        className="flex size-10 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></button>
    </div>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  </>;
  if (desktop) return createPortal(
    <aside id={id} aria-label={title} onKeyDown={(event) => {
      if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); close(); }
    }} className="fixed inset-y-0 right-0 z-[70] flex w-[340px] flex-col border-l border-border/70 bg-card shadow-[-18px_0_45px_rgba(0,0,0,0.12)] animate-in slide-in-from-right duration-300 xl:w-[380px] dark:shadow-[-18px_0_45px_rgba(0,0,0,0.32)] motion-reduce:animate-none">
      {body}
    </aside>, document.body);
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent id={id} side="right" showCloseButton={false}
      onCloseAutoFocus={(event) => { event.preventDefault(); restoreTriggerFocus(); }}
      className="w-full max-w-none gap-0 overflow-hidden p-0 sm:w-[340px] sm:max-w-[340px]">
      <SheetTitle className="sr-only">{title}</SheetTitle>
      <SheetDescription className="sr-only">Review {title} and access its actions.</SheetDescription>
      {body}
    </SheetContent>
  </Sheet>;
}