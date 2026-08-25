import { DriverAuthForm } from "@/components/auth/DriverAuthForm";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function DriverSignUpPage() {
  return (
    <AuthSplitLayout>
      <Suspense
        fallback={
          <div className="flex w-full flex-col items-center gap-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-muted-foreground">
              Preparing driver application...
            </p>
          </div>
        }
      >
        <DriverAuthForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
