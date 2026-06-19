"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  wrapperClassName?: string;
};

function PasswordInput({
  className,
  wrapperClassName,
  disabled,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        disabled={disabled}
        className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center text-zinc-500 dark:text-zinc-400 transition-opacity disabled:opacity-50"
      >
        <span className="relative block h-4 w-4">
          <Eye
            className={cn(
              "absolute inset-0 h-4 w-4 transition-opacity",
              showPassword ? "opacity-0" : "opacity-100"
            )}
          />
          <EyeOff
            className={cn(
              "absolute inset-0 h-4 w-4 transition-opacity",
              showPassword ? "opacity-100" : "opacity-0"
            )}
          />
        </span>
      </button>
    </div>
  );
}

export { PasswordInput };
