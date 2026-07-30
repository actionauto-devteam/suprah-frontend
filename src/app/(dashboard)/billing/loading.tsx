import { Loader2 } from "lucide-react";

export default function BillingLoading() {
  return (
    <div className="min-h-[60vh] w-full bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground/60 tracking-wide">
          Loading…
        </p>
      </div>
    </div>
  );
}
