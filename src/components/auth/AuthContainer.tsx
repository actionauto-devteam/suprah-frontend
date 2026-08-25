"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function AuthContainer({
  initialMode: _initialMode,
}: {
  initialMode?: "signin" | "signup";
}) {
  void _initialMode;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isSignUpPath = pathname.includes("sign-up");
  const mode = isSignUpPath ? "signup" : "signin";

  const setMode = (newMode: "signin" | "signup") => {
    const targetPath = newMode === "signup" ? "/sign-up" : "/sign-in";
    const currentParams = searchParams.toString();
    const finalPath = currentParams
      ? `${targetPath}?${currentParams}`
      : targetPath;
    router.push(finalPath, { scroll: false });
  };

  return (
    <AuthSplitLayout>
      <AnimatePresence mode="wait" initial={false}>
        {mode === "signin" ? (
          <motion.div
            key="signin-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full"
          >
            <SignInForm onToggleMode={() => setMode("signup")} />
          </motion.div>
        ) : (
          <motion.div
            key="signup-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full"
          >
            <SignUpForm onToggleMode={() => setMode("signin")} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthSplitLayout>
  );
}
