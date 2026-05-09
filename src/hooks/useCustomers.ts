"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerTransaction {
  _id: string;
  type: "lead" | "appointment" | "purchase" | "quote" | "inquiry" | "other";
  status: "pending" | "active" | "completed" | "cancelled" | "failed";
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  referenceId?: string;
  referenceModel?: string;
  metadata?: Record<string, any>;
  occurredAt: string;
  createdAt?: string;
}

export interface CustomerConversation {
  _id: string;
  channel: "email" | "sms" | "phone" | "in-person" | "chat" | "other";
  direction: "inbound" | "outbound";
  senderType: "customer" | "agent" | "system";
  senderName?: string;
  content: string;
  subject?: string;
  referenceId?: string;
  sentAt: string;
  createdAt?: string;
}

export interface Customer {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  tags?: string[];
  preferredContactMethod?: "email" | "phone" | "sms";
  source: "lead" | "manual" | "import" | "booking";
  sourceLeadId?: string;
  isActive: boolean;
  vehicleInterest?: {
    year?: string;
    make?: string;
    model?: string;
    trim?: string;
    vin?: string;
    budget?: string;
    condition?: "new" | "used" | "certified";
  };
  transactions: CustomerTransaction[];
  conversations: CustomerConversation[];
  stats: {
    totalTransactions: number;
    totalConversations: number;
    totalAppointments: number;
    lastContactedAt?: string;
    firstContactedAt?: string;
    lifetimeValue?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  notes?: string;
  tags?: string[];
  preferredContactMethod?: "email" | "phone" | "sms";
  vehicleInterest?: {
    year?: string;
    make?: string;
    model?: string;
    trim?: string;
    vin?: string;
    budget?: string;
    condition?: "new" | "used" | "certified";
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingCustomer?: Customer;
  matchType?: "email_and_phone" | "email_only" | "phone_only";
}

export interface CustomerStats {
  total: number;
  active: number;
  fromLeads: number;
  manual: number;
  recentlyAdded: number;
}

export interface BackfillResult {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
}

interface UseCustomersOptions {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCustomers(opts: UseCustomersOptions = {}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const getHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);

  const { page = 1, limit = 20, search = "", source, sortBy = "createdAt", sortOrder = "desc" } = opts;

  // ── Customer list ──────────────────────────────────────────────────────────
  const {
    data: listData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customers", page, limit, search, source, sortBy, sortOrder],
    queryFn: async () => {
      const headers = await getHeaders();
      const params: any = { page, limit, sortBy, sortOrder };
      if (search) params.search = search;
      if (source) params.source = source;
      const res = await apiClient.get("/api/customers", { ...headers, params });
      return res.data?.data || { customers: [], total: 0, page: 1, pages: 1 };
    },
    staleTime: 30_000,
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: stats, refetch: refetchStats } = useQuery<CustomerStats>({
    queryKey: ["customers-stats"],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await apiClient.get("/api/customers/stats", headers);
      return res.data?.data || { total: 0, active: 0, fromLeads: 0, manual: 0, recentlyAdded: 0 };
    },
    staleTime: 60_000,
  });

  // ── Fetch single customer ──────────────────────────────────────────────────
  const fetchCustomer = React.useCallback(
    async (id: string): Promise<Customer> => {
      const headers = await getHeaders();
      const res = await apiClient.get(`/api/customers/${id}`, headers);
      return res.data?.data;
    },
    [getHeaders],
  );

  // ── Duplicate check ────────────────────────────────────────────────────────
  const checkDuplicate = React.useCallback(
    async (email: string, phone: string, excludeId?: string): Promise<DuplicateCheckResult> => {
      const headers = await getHeaders();
      const params: any = {};
      if (email) params.email = email;
      if (phone) params.phone = phone;
      if (excludeId) params.excludeId = excludeId;
      const res = await apiClient.get("/api/customers/check-duplicate", { ...headers, params });
      return res.data?.data || { isDuplicate: false };
    },
    [getHeaders],
  );

  // ── Create ─────────────────────────────────────────────────────────────────
  const {
    mutateAsync: createCustomer,
    isPending: isCreating,
  } = useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const headers = await getHeaders();
      const res = await apiClient.post("/api/customers", data, headers);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-stats"] });
    },
  });

  // ── Update ─────────────────────────────────────────────────────────────────
  const {
    mutateAsync: updateCustomer,
    isPending: isUpdating,
  } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCustomerInput> }) => {
      const headers = await getHeaders();
      const res = await apiClient.patch(`/api/customers/${id}`, data, headers);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const {
    mutateAsync: deleteCustomer,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getHeaders();
      await apiClient.delete(`/api/customers/${id}`, headers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-stats"] });
    },
  });

  // ── Add conversation ───────────────────────────────────────────────────────
  const {
    mutateAsync: addConversation,
    isPending: isAddingConversation,
  } = useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: any }) => {
      const headers = await getHeaders();
      const res = await apiClient.post(`/api/customers/${customerId}/conversations`, data, headers);
      return res.data?.data;
    },
  });

  // ── Backfill all existing leads → customers ────────────────────────────────
  // POST /api/customers/backfill-from-leads
  // Safe to call multiple times — duplicate detection prevents double-entries.
  const {
    mutateAsync: backfillFromLeads,
    isPending: isBackfilling,
  } = useMutation({
    mutationFn: async (): Promise<BackfillResult> => {
      const headers = await getHeaders();
      const res = await apiClient.post("/api/customers/backfill-from-leads", {}, {
        ...headers,
        // Backfill can take a while on large datasets — give it 5 minutes
        timeout: 300_000,
      });
      return res.data?.data as BackfillResult;
    },
    onSuccess: () => {
      // Refresh list and stats after backfill completes
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-stats"] });
    },
  });

  return {
    customers: listData?.customers ?? [],
    total: listData?.total ?? 0,
    pages: listData?.pages ?? 1,
    stats,
    isLoading,
    error,
    refetch,
    fetchCustomer,
    checkDuplicate,
    createCustomer,
    isCreating,
    updateCustomer,
    isUpdating,
    deleteCustomer,
    isDeleting,
    addConversation,
    isAddingConversation,
    backfillFromLeads,
    isBackfilling,
  };
}