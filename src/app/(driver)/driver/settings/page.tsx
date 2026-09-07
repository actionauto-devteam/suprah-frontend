"use client";

import * as React from "react";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, MapPin, Moon, Wallet, CheckCircle2, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { StripeConnectStatus } from "@/types/driver-payout";

export default function DriverSettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { theme, setTheme } = useTheme();

  const [connectStatus, setConnectStatus] = React.useState<StripeConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = React.useState(true);
  const [onboardLoading, setOnboardLoading] = React.useState(false);
  const [onboardError, setOnboardError] = React.useState<string | null>(null);

  // Check Stripe Connect status on mount
  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = await getToken();
        const res = await apiClient.get("/api/driver-payouts/connect/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConnectStatus(res.data.data);
      } catch {
        setConnectStatus({ connected: false });
      } finally {
        setConnectLoading(false);
      }
    };
    fetchStatus();
  }, [getToken]);

  // Handle Stripe onboarding redirect
  const handleConnectStripe = async () => {
    setOnboardLoading(true);
    setOnboardError(null);
    try {
      const token = await getToken();
      const res = await apiClient.post(
        "/api/driver-payouts/connect/onboard",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const url = res.data.data?.url;
      if (url) window.location.href = url;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to connect Stripe account.";
      setOnboardError(msg);
    } finally {
      setOnboardLoading(false);
    }
  };

  // Check URL params for Stripe return
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success" || params.get("stripe") === "refresh") {
      // Re-fetch status after returning from Stripe
      const refetch = async () => {
        try {
          const token = await getToken();
          const res = await apiClient.get("/api/driver-payouts/connect/status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setConnectStatus(res.data.data);
        } catch {}
      };
      refetch();
      window.history.replaceState({}, "", "/driver/settings");
    }
  }, [getToken]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your preferences.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="size-4" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="flex items-center gap-2">
              <span>Dark Mode</span>
            </Label>
            <Switch
              id="dark-mode"
              checked={theme === "dark"}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="load-notifications">New load assignments</Label>
            <Switch id="load-notifications" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="status-notifications">Status updates</Label>
            <Switch id="status-notifications" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-share">Auto-share location on login</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically start GPS sharing when you open the app.
              </p>
            </div>
            <Switch id="auto-share" />
          </div>
        </CardContent>
      </Card>

      {/* Stripe Payout Account */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="size-4" />
              Stripe Payout Account
            </CardTitle>
            {!connectLoading && connectStatus?.connected && connectStatus.chargesEnabled && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" variant="outline">
                <CheckCircle2 className="size-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          <CardDescription>
            Connect your bank account to receive payouts from your dealer after completing loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking Stripe connection...
            </div>
          ) : connectStatus?.connected ? (
            <div className="space-y-3">
              {connectStatus.chargesEnabled && connectStatus.payoutsEnabled ? (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Your account is fully set up</p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      Payouts from your dealer will be deposited directly into your bank account.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Account setup incomplete</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                      Your Stripe account needs more information before payouts can be received.
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={handleConnectStripe}
                disabled={onboardLoading}
              >
                {onboardLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="size-4 mr-2" />
                )}
                {connectStatus.detailsSubmitted ? "Manage Stripe Account" : "Complete Setup"}
              </Button>
              {onboardError && <StripeErrorBox message={onboardError} />}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t connected a Stripe account yet. Connect your bank account so your dealer can send you payouts for completed loads.
              </p>
              <Button className="h-11" onClick={handleConnectStripe} disabled={onboardLoading}>
                {onboardLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="size-4 mr-2" />
                )}
                Connect Stripe Account
              </Button>
              {onboardError && <StripeErrorBox message={onboardError} />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StripeErrorBox({ message }: { message: string }) {
  const isConnectError =
    message.toLowerCase().includes("connect") ||
    message.toLowerCase().includes("dashboard.stripe.com");

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
      <AlertTriangle className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
      <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
        <p>{message}</p>
        {isConnectError && (
          <a
            href="https://dashboard.stripe.com/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline text-red-700 dark:text-red-300 hover:opacity-80"
          >
            <ExternalLink className="size-3" />
            Enable Stripe Connect at dashboard.stripe.com/connect
          </a>
        )}
      </div>
    </div>
  );
}
