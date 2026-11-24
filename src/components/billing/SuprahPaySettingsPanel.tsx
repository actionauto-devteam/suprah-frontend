"use client";

/**
 * SuprahPay settings for the dealership (2026-11-21): the default sales tax
 * rate (decision B7), Suprah's fee and payment limit (set by Suprah), and the
 * Stripe payout account Suprah sends the weekly payouts to (decision A4).
 * Everyone on the staff can see them; only admins change them. The server
 * checks this again.
 */
import * as React from "react";
import { Banknote, Loader2, Percent, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Card, FONT, GhostButton, PrimaryButton, T, TextInput, numeric } from "@/components/billing/ui";
import { formatCurrency } from "@/utils/format";
import type { PayoutAccount, SuprahPaySettings } from "@/hooks/useSuprahPay";

const errorText = (e: unknown, fallback: string) => {
  const message = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" && message ? message : fallback;
};

function payoutAccountLabel(account: PayoutAccount | undefined): { text: string; tone: string } {
  if (!account) return { text: "Checking…", tone: T.textMute };
  if (account.error) return { text: account.error, tone: T.warning };
  if (!account.connected) {
    return {
      text: account.needsReconnect ? "Needs to be set up again" : "Not set up yet",
      tone: T.warning,
    };
  }
  // A new or replaced account is checked by Suprah before payouts go to it (2026-11-23).
  if (account.ready && account.awaitingConfirmation) {
    return { text: "Set up: Suprah is checking it before your payouts start", tone: T.textSub };
  }
  if (account.ready) return { text: "Ready: Suprah can send your payouts", tone: T.success };
  if (account.needsMoreInfo) return { text: "Stripe needs more details", tone: T.warning };
  return { text: "Stripe is checking your details", tone: T.textSub };
}

export function SuprahPaySettingsPanel({
  settings,
  payoutAccount,
  onSaved,
}: {
  settings: SuprahPaySettings;
  payoutAccount: PayoutAccount | undefined;
  onSaved: () => void;
}) {
  const [tax, setTax] = React.useState(String(settings.defaultTaxRate ?? 0));
  const [saving, setSaving] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [taxError, setTaxError] = React.useState<string | null>(null);

  React.useEffect(() => setTax(String(settings.defaultTaxRate ?? 0)), [settings.defaultTaxRate]);

  const saveTax = async () => {
    const rate = Number(tax.trim());
    if (tax.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      setTaxError("Enter the sales tax as a percentage from 0 to 100, for example 7.25.");
      return;
    }
    setTaxError(null);
    setSaving(true);
    try {
      await apiClient.put("/api/payments/settings", { defaultTaxRate: rate });
      toast.success("Default sales tax saved", { description: `New invoices start with ${rate}% tax.` });
      onSaved();
    } catch (e) {
      setTaxError(errorText(e, "The tax rate wasn't saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const setUpPayoutAccount = async () => {
    setConnecting(true);
    try {
      const res = await apiClient.post("/api/payments/payout-account/connect");
      const url = (res.data as { data?: { url?: unknown } })?.data?.url;
      if (typeof url === "string" && url.startsWith("https://")) {
        window.location.href = url; // Stripe's own setup page
        return;
      }
      toast.error("Stripe didn't send a setup page. Please try again.");
    } catch (e) {
      toast.error("The payout account can't be set up right now", { description: errorText(e, "Please try again.") });
    }
    setConnecting(false);
  };

  const account = payoutAccountLabel(payoutAccount);
  const accountButton = !payoutAccount?.connected
    ? "Set up payout account"
    : payoutAccount.ready
      ? "Update payout account"
      : "Finish payout account setup";

  return (
    <Card pad="18px 20px" style={{ display: "grid", gap: 18, fontFamily: FONT }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>SuprahPay settings</p>
        <p style={{ fontSize: 12.5, color: T.textSub, margin: "4px 0 0", lineHeight: 1.5 }}>
          {settings.canEdit
            ? "Only your dealership's admins can change these."
            : "Your dealership's admins manage these."}
        </p>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {/* Default tax */}
        <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <label htmlFor="suprahpay-default-tax" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.text }}>
            <Percent aria-hidden style={{ width: 14, height: 14, color: T.brand }} /> Default sales tax (%)
          </label>
          {settings.canEdit ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <TextInput
                id="suprahpay-default-tax"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                hasError={!!taxError}
                aria-describedby="suprahpay-default-tax-help"
                style={{ flex: "1 1 120px", minWidth: 0, ...numeric }}
              />
              <GhostButton type="button" onClick={saveTax} disabled={saving} style={{ flex: "0 0 auto" }}>
                {saving ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : null} Save
              </GhostButton>
            </div>
          ) : (
            <p id="suprahpay-default-tax" style={{ fontSize: 15, fontWeight: 700, margin: 0, ...numeric }}>{settings.defaultTaxRate}%</p>
          )}
          <p id="suprahpay-default-tax-help" style={{ fontSize: 12, color: taxError ? T.danger : T.textMute, margin: 0, lineHeight: 1.45 }} role={taxError ? "alert" : undefined}>
            {taxError ?? "New invoices start with this rate; staff can change it on each invoice."}
          </p>
        </div>

        {/* Payout account */}
        <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
            <Banknote aria-hidden style={{ width: 14, height: 14, color: T.brand }} /> Payout account
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: account.tone, margin: 0, overflowWrap: "anywhere" }}>{account.text}</p>
          <p style={{ fontSize: 12, color: T.textMute, margin: 0, lineHeight: 1.45 }}>
            Suprah sends what it owes your dealership to this Stripe account every week, once it&apos;s approved.
          </p>
          {settings.canEdit && (
            <PrimaryButton type="button" onClick={setUpPayoutAccount} disabled={connecting} style={{ justifySelf: "start", padding: "9px 14px", fontSize: 13 }}>
              {connecting ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : null}
              {accountButton}
            </PrimaryButton>
          )}
        </div>

        {/* Set by Suprah */}
        <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: T.text, margin: 0 }}>
            <ShieldCheck aria-hidden style={{ width: 14, height: 14, color: T.brand }} /> Set by Suprah
          </p>
          <p style={{ fontSize: 13, color: T.textSub, margin: 0, lineHeight: 1.6 }}>
            Suprah&apos;s fee: <strong style={{ color: T.text, ...numeric }}>{settings.feePercent}%</strong> of each card payment
            <br />
            Largest payment: <strong style={{ color: T.text, ...numeric }}>{formatCurrency(settings.maxPaymentAmount)}</strong>
            <br />
            Card processing fees are paid by Suprah.
          </p>
        </div>
      </div>
    </Card>
  );
}
