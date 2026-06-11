"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useAuth } from "@/providers/AuthProvider";
import { getRoleHome } from "@/lib/navigation";

const REDIRECT_SECONDS = 5;

export default function NotFound() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { orgId } = useAuth();
  const [secondsLeft, setSecondsLeft] = React.useState(REDIRECT_SECONDS);

  const home = isLoaded ? getRoleHome({ role: user?.role, organizationId: orgId }) : null;
  const homeLabel = user ? "Go to Dashboard" : "Go to Sign In";

  React.useEffect(() => {
    if (!home) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [home]);

  React.useEffect(() => {
    if (home && secondsLeft === 0) {
      router.replace(home);
    }
  }, [home, secondsLeft, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card p-8 text-center dark:bg-zinc-900/60">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/4 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Compass className="h-8 w-8 text-primary/60" />
          </div>

          <div className="space-y-1.5">
            <p className="text-5xl font-black tracking-tight text-foreground">404</p>
            <h1 className="text-base font-bold text-foreground">This page doesn&apos;t exist anymore</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              It may have been moved or removed in an update.
              {user ? " Don't worry — your account is safe and you're still signed in." : ""}
            </p>
          </div>

          {home ? (
            <div className="flex w-full flex-col items-center gap-3">
              <Link href={home} className="w-full">
                <Button className="w-full gap-2 rounded-xl font-semibold h-10">
                  <Home className="h-4 w-4" />
                  {homeLabel}
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Go back
              </button>
              <p className="text-[11px] text-muted-foreground/70 tabular-nums">
                Redirecting automatically in {secondsLeft}s...
              </p>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </div>
      </div>
    </div>
  );
}
