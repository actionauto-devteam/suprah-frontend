"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/lib/password-rules";

/**
 * Ticks off each password rule as the person types. Shown once they start.
 * `unmetClassName` sets the color of rules not met yet (for always-dark pages).
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
  if (password.length === 0) return null;
  return (
    <div className={cn("grid grid-cols-2 gap-2 pt-1", className)}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <div
            key={rule.key}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-medium transition-colors",
              passed ? "text-emerald-500" : unmetClassName,
            )}
          >
            {passed ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-50" />}
            {rule.label}
          </div>
        );
      })}
    </div>
  );
}
