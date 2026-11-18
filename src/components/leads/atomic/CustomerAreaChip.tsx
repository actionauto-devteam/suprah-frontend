import * as React from "react";
import { cn } from "@/lib/utils";
import {
  customerAreaHint,
  customerAreaLabel,
  customerAreaShortLabel,
  readCustomerArea,
  type CustomerAreaCode,
} from "@/lib/customerArea";

const AREA_TONES: Record<CustomerAreaCode, string> = {
  utah: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  utah_435: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  southern_utah: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  out_of_state: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  canada: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  outside_us: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
};

export const CustomerAreaChip = React.memo(function CustomerAreaChip({
  area,
  short = false,
  className,
}: {
  area: unknown;
  short?: boolean;
  className?: string;
}) {
  const parsed = readCustomerArea(area);
  if (!parsed) return null;
  const label = customerAreaLabel(parsed);

  return (
    <span
      className={cn(
        "rounded border px-1.5 py-px text-[10px] font-bold uppercase tracking-wide",
        AREA_TONES[parsed.code],
        className,
      )}
      title={`Customer area: ${label}. ${customerAreaHint(parsed)}`}
      data-testid="lead-customer-area"
    >
      {short ? customerAreaShortLabel(parsed) : label}
    </span>
  );
});
