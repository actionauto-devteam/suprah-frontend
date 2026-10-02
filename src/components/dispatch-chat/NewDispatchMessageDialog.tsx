"use client";

import * as React from "react";
import { Loader2, MessageSquare, SquarePen, Truck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { nameInitials, participantAvatarSrc } from "@/components/dispatch-chat/DispatchChatDialog";
import type { DispatchContact } from "@/lib/api/driver-dispatch-inbox";

function ContactRow({
  contact,
  opening,
  disabled,
  onChoose,
}: {
  contact: DispatchContact;
  opening: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const avatar = participantAvatarSrc(contact.dispatcher.avatar);
  const route = [contact.load.origin, contact.load.destination].filter(Boolean).join(" → ");
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 disabled:opacity-60"
    >
      <Avatar className="size-10 shrink-0 border border-border/60">
        {avatar && <AvatarImage src={avatar} alt={contact.dispatcher.name} className="object-cover" />}
        <AvatarFallback className="bg-emerald-500/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
          {nameInitials(contact.dispatcher.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{contact.dispatcher.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {contact.load.loadNumber} · {contact.load.status}
          {route ? ` · ${route}` : ""}
        </span>
        {contact.loadCount > 1 && (
          <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
            +{contact.loadCount - 1} more load{contact.loadCount === 2 ? "" : "s"} with this dispatcher
          </span>
        )}
      </span>
      {opening ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-emerald-500" />
      ) : (
        <MessageSquare className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
    </button>
  );
}

/**
 * "New message": the driver picks the dispatcher of one of their current loads
 * or a load delivered in the last 30 days.
 */
export function NewDispatchMessageDialog({
  open,
  onOpenChange,
  contacts,
  openingLoadId,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: DispatchContact[];
  openingLoadId: string | null;
  onChoose: (contact: DispatchContact) => void;
}) {
  const current = contacts.filter((contact) => contact.current);
  const recent = contacts.filter((contact) => !contact.current);
  const renderRows = (rows: DispatchContact[]) =>
    rows.map((contact) => (
      <ContactRow
        key={`${contact.dispatcher.id}:${contact.load.id}`}
        contact={contact}
        opening={openingLoadId === contact.load.id}
        disabled={openingLoadId !== null}
        onChoose={() => onChoose(contact)}
      />
    ));

  return (
    <Dialog open={open} onOpenChange={(next) => openingLoadId === null && onOpenChange(next)}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-5">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
            <SquarePen className="size-4.5 text-emerald-500" />
            New message
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Write to the dispatcher of a load you have now, or one you delivered in the last 30 days.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Truck className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-black">No dispatchers to message yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                When you&apos;re assigned a load, its dispatcher shows up here. To ask about a load on the board, tap
                Message Dispatcher on that load in Available Loads.
              </p>
            </div>
          ) : (
            <>
              {current.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Your current loads</p>
                  {renderRows(current)}
                </div>
              )}
              {recent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Delivered in the last 30 days
                  </p>
                  {renderRows(recent)}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
