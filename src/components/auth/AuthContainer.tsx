"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CinematicPane } from "./CinematicPane";
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
    <div className="min-h-dvh w-full bg-[#050505] flex items-center justify-center px-0 md:px-6 lg:px-12 overflow-hidden font-sans">
      {/* Main Unified Wrapper */}
      <div className="relative flex min-h-dvh w-full max-w-350ll flex-col overflow-hidden border border-white/6 bg-[#0a0a0a] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] md:h-[min(900px,94vh)] md:min-h-0 md:rounded-[3rem] md:flex-row">
        {/* Left Pane: Cinematic Visual (STATIC) */}
        <div className="relative z-10 h-[28svh] min-h-[190px] w-full md:h-full md:w-[55%]">
          <CinematicPane />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-transparent md:hidden" />
          {/* Subtle inner shadow to blend with form */}
          <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-[#0a0a0a] to-transparent z-20 pointer-events-none hidden md:block" />
        </div>

        {/* Right Pane: Form (DYNAMIC) */}
        <div className="relative z-20 -mt-8 flex flex-1 items-start justify-center overflow-y-auto rounded-t-[2rem] border-t border-white/8 bg-[#0a0a0a] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 custom-scrollbar md:mt-0 md:h-full md:w-[45%] md:items-center md:rounded-none md:border-t-0 md:p-12 lg:p-20">
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
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #f4f4f5;
          caret-color: #f4f4f5;
          box-shadow: 0 0 0 1000px rgba(9, 9, 11, 0.94) inset;
          border-color: rgba(52, 211, 153, 0.55);
          transition: background-color 9999s ease-out;
        }
      `}</style>
    </div>
  );
}
