"use client";

/**
 * Bills from Suprah (2026-11-25): Suprah bills the dealership the driver's
 * pay for its own loads ("For the dealership" in Create Load). Admins and
 * staff with Finance access pay them by card on Stripe's page; the driver is
 * paid once the bill is paid and the load is delivered. The server checks
 * who may pay.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, Truck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { userErrorMessage } from "@/lib/user-error";
import { Card, FONT, PrimaryButton, StatusBadge, T, numeric } from "@/components/billing/ui";
import { suprahPayToast } from "@/components/billing/SuprahPayToast";
import { formatCurrency } from "@/utils/format";
import { useSuprahPayScope } from "@/hooks/useSuprahPay";

interface SuprahBill {
  _id: string;
  amount: number;
  status: string;
  invoiceNumber?: string;
  description?: string;
  createdAt: string;
  paidAt?: string | null;
  loadId?: { _id: string; loadNumber?: string; status?: string } | null;
}

const AWAITING = new Set(["pending", "failed", "processing"]);

export function SuprahBillsCard({ canPay }: { canPay: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [payingId, setPayingId] = React.useState<string | null>(null);
  // Per person and dealership, like the other SuprahPay data.
  const scope = useSuprahPayScope();

  const bills = useQuery({
    queryKey: ["suprahpay", scope, "suprah-bills"],
    queryFn: async () => ((await apiClient.get("/api/payments/suprah-bills")).data?.data ?? []) as SuprahBill[],
    staleTime: 30_000,
  });
  const { refetch } = bills;

  // Back from Stripe's page: paid, or left without paying.
  React.useEffect(() => {
    const billId = params.get("bill");
    const status = params.get("billStatus");
    if (!billId || (status !== "paid" && status !== "left")) return;
    void (async () => {
      try {
        const res = await apiClient.post(`/api/payments/suprah-bills/${encodeURIComponent(billId)}/check`, { left: status === "left" });
        const now = (res.data as { data?: { status?: string } })?.data?.status;
        if (now === "succeeded") suprahPayToast.success("Bill paid", "The driver can be paid once the load is delivered.");
        else if (status === "left") suprahPayToast.error("Bill not paid", "Nothing was charged. Pay it whenever you're ready.");
        else suprahPayToast.success("Payment received by Stripe", "It shows as paid here in a moment.");
      } catch {
        // The bill's status still updates from Stripe on its own.
      }
      void refetch();
      router.replace("/billing");
    })();
  }, [params, refetch, router]);

  const pay = async (bill: SuprahBill) => {
    setPayingId(bill._id);
    try {
      const res = await apiClient.post(`/api/payments/suprah-bills/${encodeURIComponent(bill._id)}/pay`);
      const url = (res.data as { data?: { url?: unknown } })?.data?.url;
      if (typeof url === "string" && url.startsWith("https://")) {
        window.location.assign(url); // Stripe's own payment page
        return;
      }
      suprahPayToast.error("Bill not paid", "Stripe didn't send a payment page. Please try again.");
    } catch (error) {
      suprahPayToast.error("Bill not paid", userErrorMessage(error, "pay this bill"));
      void refetch();
    }
    setPayingId(null);
  };

  const list = bills.data ?? [];
  if (bills.isLoading || (list.length === 0 && !bills.isError)) return null;
  const unpaid = list.filter((bill) => AWAITING.has(bill.status));

  return (
    <Card pad="18px 20px" style={{ display: "grid", gap: 14, fontFamily: FONT }}>
      <div>
        <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
          <Truck aria-hidden style={{ width: 16, height: 16, color: T.brand }} /> Bills from Suprah
        </p>
        <p style={{ fontSize: 12.5, color: T.textSub, margin: "4px 0 0", lineHeight: 1.5 }}>
          The driver&apos;s pay on your dealership&apos;s own loads. Each driver is paid once their load&apos;s bill is paid and the load is delivered.
          {unpaid.length > 0 ? ` ${unpaid.length} to pay.` : ""}
        </p>
      </div>

      {bills.isError ? (
        <p role="alert" style={{ fontSize: 13, color: T.danger, margin: 0 }}>The bills couldn&apos;t be loaded. Refresh to try again.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {list.map((bill) => (
            <li
              key={bill._id}
              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10,
                border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px" }}
            >
              <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: T.text, margin: 0, overflowWrap: "anywhere" }}>
                  {bill.loadId?._id ? (
                    <Link href={`/transportation/load/${bill.loadId._id}`} style={{ color: T.text, textDecoration: "underline", textUnderlineOffset: 2 }}>
                      Load {bill.loadId.loadNumber ?? ""}
                    </Link>
                  ) : (
                    bill.description || "Shipping"
                  )}
                  {bill.invoiceNumber ? <span style={{ color: T.textMute, fontWeight: 500 }}> · {bill.invoiceNumber}</span> : null}
                </p>
                <p style={{ fontSize: 12, color: T.textMute, margin: "2px 0 0" }}>
                  {bill.paidAt ? `Paid ${new Date(bill.paidAt).toLocaleDateString()}` : `Billed ${new Date(bill.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text, ...numeric }}>{formatCurrency(bill.amount)}</span>
                <StatusBadge status={bill.status} />
                {canPay && AWAITING.has(bill.status) && (
                  <PrimaryButton type="button" onClick={() => pay(bill)} disabled={payingId !== null} style={{ padding: "8px 12px", fontSize: 13 }}>
                    {payingId === bill._id ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <CreditCard style={{ width: 15, height: 15 }} />}
                    Pay
                  </PrimaryButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!canPay && unpaid.length > 0 && (
        <p style={{ fontSize: 12, color: T.textMute, margin: 0 }}>Your dealership&apos;s admins and staff with Finance access can pay these.</p>
      )}
    </Card>
  );
}
