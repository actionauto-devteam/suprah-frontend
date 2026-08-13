import { AuthContainer } from "@/components/auth/AuthContainer";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500/60 uppercase tracking-widest italic animate-pulse">
                    Preparing secure sign up...
                </p>
            </div>
        }>
            <AuthContainer initialMode="signup" />
        </Suspense>
    );
}
