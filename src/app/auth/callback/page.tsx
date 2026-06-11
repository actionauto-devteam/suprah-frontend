"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { sanitizeRedirectUrl } from "@/lib/navigation";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (error) {
            router.push(`/sign-in?error=${encodeURIComponent(error)}`);
            return;
        }

        // Token implies successful backend login (and the HttpOnly refresh cookie is set).
        // Since the app wraps all pages in <AuthProvider /> which calls `refreshUser()` on mount,
        // the session will be automatically detected and synchronized.
        // We just need to wait a tick and push them into the dashboard.
        if (token) {
            // Push to dashboard or specify redirect and force a full refresh so layout triggers the token sync properly.
            const redirectUrl = sanitizeRedirectUrl(searchParams.get("redirect_url"));
            router.push(redirectUrl || "/");
            router.refresh();
        } else {
            router.push("/sign-in");
        }
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Authenticating...</h2>
                <p className="text-sm text-muted-foreground">Please wait while we log you in securely.</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">Authenticating...</h2>
                    <p className="text-sm text-muted-foreground">Please wait while we log you in securely.</p>
                </div>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
