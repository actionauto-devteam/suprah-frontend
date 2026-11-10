import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { usableQuotePhone } from "@/lib/quote-phone";
import type { ShippingQuoteFormData } from "@/types/inventory";

/**
 * The signed-in customer's name and email, to pre-fill the shipping quote
 * form. The server uses the account's name and email either way.
 */
export function useCustomerQuoteContact(): Partial<ShippingQuoteFormData> {
  const { user } = useUser();
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  return React.useMemo(() => ({ firstName, lastName, email }), [firstName, lastName, email]);
}

/**
 * The signed-in customer's account phone, to fill in the shipping quote form
 * (2026-11-10). It's read from their profile only once the form is open, and
 * kept for a few minutes. The customer can change it; the dealership calls
 * the number on the form. Empty when the account has no usable phone.
 */
export function useCustomerAccountPhone(formOpen: boolean): string {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const { data } = useQuery({
    queryKey: ["customer-account-phone", userId],
    queryFn: async () => {
      const response = await apiClient.get("/api/profile");
      return usableQuotePhone(response.data?.data?.personalInfo?.phone);
    },
    enabled: formOpen && Boolean(userId),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return data ?? "";
}
