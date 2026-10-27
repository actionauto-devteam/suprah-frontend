import * as React from "react";
import { useUser } from "@/providers/AuthProvider";
import type { ShippingQuoteFormData } from "@/types/inventory";

/**
 * The signed-in customer's name and email, to pre-fill the shipping quote
 * form. The server uses the account's details either way.
 */
export function useCustomerQuoteContact(): Partial<ShippingQuoteFormData> {
  const { user } = useUser();
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  return React.useMemo(() => ({ firstName, lastName, email }), [firstName, lastName, email]);
}
