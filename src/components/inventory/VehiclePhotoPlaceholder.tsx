import { CarFront } from "lucide-react";

/** A quiet photo-sized surface; no extra image request or repeating animation. */
export function VehiclePhotoPlaceholder({ loading }: { loading: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-linear-to-br from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950"
      role={loading ? "status" : undefined}
      aria-label={loading ? "Loading vehicle photo" : undefined}
      aria-hidden={loading ? undefined : true}
    >
      <CarFront
        aria-hidden="true"
        strokeWidth={1}
        className="h-auto w-1/3 max-w-24 text-zinc-400/50 dark:text-zinc-500/45"
      />
    </div>
  );
}