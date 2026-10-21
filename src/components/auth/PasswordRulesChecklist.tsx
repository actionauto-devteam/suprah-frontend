"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/lib/password-rules";

/**
 * Shows what the password needs before the person types, and ticks off each
 * rule as it's met. `unmetClassName` sets the color of the title and of rules
 * not met yet (for always-dark pages).
 */
export function PasswordRulesChecklist({
  password,
  className,
  unmetClassName = "text-muted-foreground",
}: {
  password: string;
  className?: string;
  unmetClassName?: string;
}) {
  return (
    <div className={cn("space-y-1.5 pt-1", className)} aria-live="polite">
      <p className={cn("text-[11px] font-semibold", unmetClassName)}>Your password needs:</p>
      <div className="grid grid-cols-2 gap-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <div
              key={rule.key}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
                passed ? "text-emerald-500" : unmetClassName,
              )}
            >
              {passed ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-50" />}
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
