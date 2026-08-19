"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";

export interface OneDeskContact {
  _id: string;
  name: string;
  phoneNumber: string;
}

/**
 * Org-shared phonebook for Suprah One Desk's SMS/Call panes.
 * Backed by /api/crm/contacts (crmAuth — same crm_token as the rest of the
 * module).
 */
export function useContacts(token: string) {
  const [contacts, setContacts] = React.useState<OneDeskContact[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await apiClient.get("/api/crm/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(response.data?.data?.contacts ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createContact = React.useCallback(
    async (input: { name: string; phoneNumber: string }) => {
      const response = await apiClient.post("/api/crm/contacts", input, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contact: OneDeskContact = response.data?.data?.contact;
      setContacts((current) => [...current, contact].sort((a, b) => a.name.localeCompare(b.name)));
      return contact;
    },
    [token],
  );

  const deleteContact = React.useCallback(
    async (id: string) => {
      await apiClient.delete(`/api/crm/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts((current) => current.filter((contact) => contact._id !== id));
    },
    [token],
  );

  return { contacts, loading, refresh, createContact, deleteContact };
}
