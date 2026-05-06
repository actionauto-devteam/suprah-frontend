"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CinematicPane } from "./CinematicPane";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function AuthContainer({
  initialMode,
}: {
  initialMode?: "signin" | "signup";
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Explicitly determine mode from current path or search param
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
    <div className="h-dvh w-full bg-[#050505] flex items-center justify-center px-0 md:px-6 lg:px-12 overflow-hidden font-sans">
      {/* Main Unified Wrapper */}
      <div className="relative w-full max-w-350ll md:h-[min(900px,94vh)] bg-[#0a0a0a] md:rounded-[3rem] overflow-hidden border border-white/3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] flex flex-col md:flex-row">
        {/* Left Pane: Cinematic Visual (STATIC) */}
        <div className="w-full md:w-[55%] h-[35vh] md:h-full z-10 relative">
          <CinematicPane />
          {/* Subtle inner shadow to blend with form */}
          <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-[#0a0a0a] to-transparent z-20 pointer-events-none hidden md:block" />
        </div>

        {/* Right Pane: Form (DYNAMIC) */}
        <div className="w-full md:w-[45%] h-full flex items-center justify-center p-8 md:p-12 lg:p-20 z-20 bg-[#0a0a0a] relative overflow-y-auto custom-scrollbar">
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
        </div>

        {/* Global Overlays */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-40" />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
