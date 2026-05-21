import { UpgradeForm } from "@/components/auth/UpgradeForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function UpgradePage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#050505] overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_52%)]" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-zinc-400">
              Initializing upgrade flow....
            </p>
          </div>
        }
      >
        <UpgradeForm />
      </Suspense>
    </div>
  );
}
