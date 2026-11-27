"use client";

/**
 * My Shipments: shipments the customer pays the driver for in cash on
 * delivery (COD), from a quote or booked by the dealership for
 * them (SuprahPay, 2026-11-25). The customer confirms paying; the driver's
 * own confirmation is what settles it. The server checks it all.
 */
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/readable-toast";
import { userErrorMessage } from "@/lib/user-error";
import { Button } from "@/components/ui/button";

interface CashShipment {
  loadId: string;
  loadNumber: string;
  /** "cop" only on shipments saved while testing: shown as cash on delivery. */
  method: "cod" | "cop";
  amount: number | null;
  due: boolean;
  driverConfirmedAt: string | null;
  customerConfirmedAt: string | null;
  route: string;
  status: string;
}

export function CustomerCashPayments() {
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const cash = useQuery({
    queryKey: ["customer-shipments", "cash-payments"],
    queryFn: async () => ((await apiClient.get("/api/quote-requests/cash-payments")).data?.data ?? []) as CashShipment[],
    staleTime: 30_000,
    retry: 1,
  });
  const { refetch } = cash;

  const confirm = async (shipment: CashShipment) => {
    setSavingId(shipment.loadId);
    try {
      await apiClient.post(`/api/quote-requests/cash-payments/${encodeURIComponent(shipment.loadId)}`);
      toast.success("Thanks, your payment is noted.");
      void refetch();
    } catch (error) {
      toast.error(userErrorMessage(error, "confirm this payment"));
    } finally {
      setSavingId(null);
    }
  };

  const list = cash.data ?? [];
  if (cash.isError) {
    return (
      <p role="alert" className="rounded-2xl border border-border/50 bg-card px-4 py-3 text-xs text-muted-foreground break-words">
        Your cash payments to drivers couldn&apos;t be loaded. Refresh to try again.
      </p>
    );
  }
  if (cash.isLoading || list.length === 0) return null;

  return (
    <section aria-labelledby="cash-payments-title" className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2">
        <Banknote className="size-4 text-emerald-500" aria-hidden="true" />
        <h2 id="cash-payments-title" className="text-sm font-bold text-foreground">Cash payments to the driver</h2>
      </div>
      <ul className="space-y-2">
        {list.map((shipment) => {
          const amount = typeof shipment.amount === "number" ? `$${shipment.amount.toFixed(2)}` : "the agreed amount";
          return (
            <li key={shipment.loadId} className="flex flex-col gap-2 rounded-xl border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground break-words">
                  {shipment.route || `Shipment ${shipment.loadNumber}`}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground break-words">
                  You pay the driver {amount} in cash on delivery.
                  {shipment.driverConfirmedAt ? " The driver confirmed receiving it." : ""}
                </p>
              </div>
              {shipment.customerConfirmedAt ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> You confirmed paying
                </span>
              ) : shipment.due ? (
                <Button size="sm" className="min-h-11 shrink-0" disabled={savingId !== null} onClick={() => confirm(shipment)}>
                  {savingId === shipment.loadId ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  I paid the driver {amount}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">You can confirm this once the car is delivered.</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
