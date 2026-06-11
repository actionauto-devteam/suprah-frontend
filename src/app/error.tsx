"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useAuth } from "@/providers/AuthProvider";
import { getRoleHome } from "@/lib/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user, isLoaded } = useUser();
  const { orgId } = useAuth();
  const home = isLoaded && user ? getRoleHome({ role: user.role, organizationId: orgId }) : "/sign-in";

  React.useEffect(() => {
    console.error("[App Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card p-8 text-center dark:bg-zinc-900/60">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-red-500/6 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-500/70" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-base font-bold text-foreground">Something went wrong</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This page hit an unexpected error. Your account is safe — try again or head back to your dashboard.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <Button onClick={reset} className="w-full gap-2 rounded-xl font-semibold h-10">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Link href={home} className="w-full">
              <Button variant="outline" className="w-full gap-2 rounded-xl font-semibold h-10">
                <Home className="h-4 w-4" />
                {user ? "Go to Dashboard" : "Go to Sign In"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
