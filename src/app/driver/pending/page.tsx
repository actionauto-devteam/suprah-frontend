"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, LogOut, RefreshCw } from "lucide-react";
import { DriverVerificationForm } from "@/components/driver-profile/DriverVerificationForm";
import { SUPPORT_EMAIL } from "@/lib/support-contact";

export default function DriverPendingPage() {
  const { getToken, signOut, isLoaded } = useAuth();
  const router = useRouter();
  const [status, setStatus] = React.useState<
    "loading" | "needs-application" | "pending" | "approved" | "rejected" | "no-request"
  >("loading");
  const [checking, setChecking] = React.useState(false);

  const checkStatus = React.useCallback(async function attempt(afterCreate = false): Promise<void> {
    try {
      const token = await getToken();
      if (!token) {
        // Token not ready yet — retry after a short delay
        setTimeout(() => attempt(afterCreate), 1000);
        return;
      }
      const response = await apiClient.getDriverRequestStatus({
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data;

      // The server answers { status: "no-request" } (never an empty answer)
      // when the driver has no application yet. Create it here (that's what
      // alerts the Suprah team to review them), then check again so the
      // driver sees the application form if they haven't finished it.
      if (!data || data.status === "no-request") {
        if (afterCreate) {
          setStatus("no-request");
          return;
        }
        try {
          await apiClient.createDriverRequest({}, { headers: { Authorization: `Bearer ${token}` } });
        } catch {
          setStatus("no-request");
          return;
        }
        return attempt(true);
      }

      if (data.status === "approved") {
        setStatus("approved");
        // Redirect to driver dashboard after a short delay
        setTimeout(() => router.push("/driver"), 1500);
      } else if (data.status === "rejected") {
        setStatus("rejected");
      } else {
        // Still pending — but the driver may not have finished the
        // documents/compliance/agreement application yet. If so, let them
        // finish it here instead of just showing a "please wait" screen.
        try {
          const profileRes = await apiClient.get("/api/driver-profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const verificationStatus = profileRes.data?.data?.verificationStatus;
          if (verificationStatus === "under_review" || verificationStatus === "verified") {
            setStatus("pending");
          } else {
            setStatus("needs-application");
          }
        } catch {
          // If we can't tell, default to letting them complete the
          // application rather than leaving them stuck on a bare wait screen.
          setStatus("needs-application");
        }
      }
    } catch {
      setStatus("no-request");
    }
  }, [getToken, router]);

  React.useEffect(() => {
    if (isLoaded) {
      checkStatus();
    }
  }, [isLoaded, checkStatus]);

  // Check every 15 seconds while pending and the page is on screen; catch up
  // when the driver comes back to it.
  React.useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void checkStatus();
    }, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, checkStatus]);

  const handleRefresh = async () => {
    setChecking(true);
    await checkStatus();
    setChecking(false);
  };

  if (status === "needs-application") {
    return (
      <div className="min-h-screen bg-background p-4 py-10">
        <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Finish Your Application
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps so the Suprah team can review and approve
              your account.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="h-11 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </Button>
        </div>
        <DriverVerificationForm
          onComplete={() => {
            setStatus("pending");
            checkStatus();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-border">
        <CardContent className="p-8 text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <RefreshCw className="size-12 text-muted-foreground animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">
                Checking your account status...
              </p>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-amber-500/10 p-4">
                  <Clock className="size-10 text-amber-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Pending Approval
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your driver application has been sent to the Suprah team for
                  review. We&apos;ll let you know as soon as you&apos;re
                  approved, and this page updates by itself. You don&apos;t
                  need to do anything else.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={checking}
                className="h-11 gap-1.5"
              >
                <RefreshCw
                  className={`size-3.5 ${checking ? "animate-spin" : ""}`}
                />
                Check Status
              </Button>
            </>
          )}

          {status === "approved" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-500/10 p-4">
                  <CheckCircle2 className="size-10 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Approved!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your account has been approved. Redirecting to your
                  dashboard...
                </p>
              </div>
            </>
          )}

          {status === "rejected" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-4">
                  <XCircle className="size-10 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Application Not Approved
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your driver application wasn&apos;t approved. To find out why,
                  or if you think this is a mistake, email{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-foreground underline">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </>
          )}

          {status === "no-request" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4">
                  <Clock className="size-10 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  We Couldn&apos;t Start Your Application
                </h2>
                <p className="text-sm text-muted-foreground">
                  Tap Try Again. If it still doesn&apos;t work, sign out, sign
                  in again, and come back to this page. If the problem stays,
                  email{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-foreground underline">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11 gap-1.5"
                onClick={handleRefresh}
                disabled={checking}
              >
                <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
                Try Again
              </Button>
            </>
          )}

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="h-11 gap-1.5 text-muted-foreground"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
