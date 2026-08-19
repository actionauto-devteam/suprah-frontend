"use client";

import * as React from "react";
import { Loader2, User, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "./utils";
import type { OneDeskContact } from "@/hooks/useContacts";

/**
 * Name/Phone fields + Save action, extracted so it can be embedded either
 * inside its own full-page modal (SaveContactModal, below) or reused
 * elsewhere for naming an already-open, not-yet-saved conversation.
 */
export function ContactForm({
  initialPhoneNumber,
  onSave,
  onSaved,
}: {
  initialPhoneNumber?: string;
  onSave: (input: { name: string; phoneNumber: string }) => Promise<OneDeskContact>;
  onSaved?: (contact: OneDeskContact) => void;
}) {
  const [name, setName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState(initialPhoneNumber || "");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phoneNumber.trim() || saving) return;
    setSaving(true);
    try {
      const contact = await onSave({ name: name.trim(), phoneNumber: phoneNumber.trim() });
      toast.success(`Saved "${name.trim()}" to Contacts`);
      setName("");
      setPhoneNumber("");
      onSaved?.(contact);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save this contact."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="sm5-field-label">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
          placeholder="Contact name"
          className="sm5-input h-10 w-full px-3 text-sm"
        />
      </div>

      <div>
        <label className="sm5-field-label">Phone Number</label>
        <input
          value={phoneNumber}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(event.target.value)}
          placeholder="Phone number"
          inputMode="tel"
          className="sm5-input h-10 w-full px-3 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!name.trim() || !phoneNumber.trim() || saving}
        className="sm5-btn flex h-10 w-full items-center justify-center gap-2"
        style={{ fontSize: 13 }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
        {saving ? "Saving…" : "Save Contact"}
      </button>
    </div>
  );
}

export function SaveContactModal({
  initialPhoneNumber,
  onClose,
  onSave,
  onSaved,
}: {
  initialPhoneNumber?: string;
  onClose: () => void;
  onSave: (input: { name: string; phoneNumber: string }) => Promise<OneDeskContact>;
  onSaved?: (contact: OneDeskContact) => void;
}) {
  return (
    <div
      className="sm5-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sm5-modal sm5-sheet flex w-full max-w-md flex-col overflow-hidden rounded-2xl"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        <div
          className="sm5-modal-header flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-1)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <User className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
            <h2 className="sm5-title-lg truncate" style={{ fontSize: 16, color: "var(--text-primary)" }}>
              New Contact
            </h2>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-7 w-7 shrink-0" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="overflow-y-auto px-4 pt-4 sm5-scroll"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <ContactForm
            initialPhoneNumber={initialPhoneNumber}
            onSave={onSave}
            onSaved={(contact) => {
              onSaved?.(contact);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
