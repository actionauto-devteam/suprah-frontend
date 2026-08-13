"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, XCircle, LogOut, RefreshCw } from "lucide-react";
import { DriverVerificationForm } from "@/components/driver-profile/DriverVerificationForm";

export default function DriverPendingPage() {
  const { getToken, signOut, isLoaded } = useAuth();
  const router = useRouter();
  const [status, setStatus] = React.useState<
    "loading" | "needs-application" | "pending" | "approved" | "rejected" | "no-request"
  >("loading");
  const [orgName, setOrgName] = React.useState<string>("");
  const [checking, setChecking] = React.useState(false);

  const checkStatus = React.useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        // Token not ready yet — retry after a short delay
        setTimeout(() => checkStatus(), 1000);
        return;
      }
      const response = await apiClient.getDriverRequestStatus({
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data;

      if (!data) {
        // No request yet — driver navigated here before createDriverRequest ran.
        // Create it now, then re-check.
        try {
          await apiClient.createDriverRequest({}, { headers: { Authorization: `Bearer ${token}` } });
          // Re-check after creating
          const recheck = await apiClient.getDriverRequestStatus({ headers: { Authorization: `Bearer ${token}` } });
          const recheckData = recheck.data?.data;
          if (recheckData?.status === "pending") {
            setStatus("pending");
          } else {
            setStatus("no-request");
          }
        } catch {
          setStatus("no-request");
        }
        return;
      }

      setOrgName(
        typeof data.organizationId === "object"
          ? data.organizationId?.name || ""
          : "",
      );

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

  // Poll every 15 seconds when pending
  React.useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [status, checkStatus]);

  const handleRefresh = async () => {
    setChecking(true);
    await checkStatus();
    setChecking(false);
  };

  if (status === "needs-application") {
    return (
      <div className="min-h-screen bg-[#050505] p-4 py-10">
        <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Finish Your Application
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Complete these steps so {orgName || "your organization's admin"}{" "}
              can review and approve your account.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="gap-1.5 text-zinc-400 hover:text-white shrink-0"
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
                  Your driver account request has been sent
                  {orgName ? ` to ${orgName}` : ""}. Please wait for the dealer
                  to approve your request.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={checking}
                className="gap-1.5"
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
                  Request Rejected
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your driver request has been rejected. Please contact the
                  dealer for more information.
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
                  No Request Found
                </h2>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have a driver request yet. Please register as a
                  driver from the login page.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/sign-in")}
              >
                Go to Login
              </Button>
            </>
          )}

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="gap-1.5 text-muted-foreground"
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
