"use client";

import React, { useState, useEffect } from "react";
import { useCrmWebPush } from "@/hooks/useCrmWebPush";
import { Bell, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface CrmPushPromptProps {
  role: string;
}

export function CrmPushPrompt({ role }: CrmPushPromptProps) {
  const { isSupported, isSubscribed, subscribe, isLoading } = useCrmWebPush();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!role || !isSupported || isSubscribed || isLoading) return;

    const dismissed = sessionStorage.getItem("crm_push_prompt_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => setShowPrompt(true), 5000);
    return () => clearTimeout(timer);
  }, [role, isSupported, isSubscribed, isLoading]);

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("crm_push_prompt_dismissed", "true");
  };

  const handleSubscribe = async () => {
    await subscribe();
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -10, opacity: 0, scale: 0.95 }}
        className="fixed top-20 right-6 z-50 w-[360px]"
      >
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />

          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-zinc-600 hover:text-zinc-400 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Bell className="h-5 w-5 text-amber-400" />
            </div>

            <div className="flex-1 pr-4">
              <h3 className="text-sm font-bold tracking-tight text-zinc-100">
                Enable Notifications
              </h3>
              <p className="mt-1 text-xs text-zinc-400 leading-normal">
                Get notified on any device when you receive messages or are mentioned — even when the app is closed.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
              <ShieldAlert className="h-3 w-3" />
              SupraSpace Push
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs h-8 px-3 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all font-semibold"
              >
                Later
              </Button>
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={isLoading}
                className="text-xs h-8 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                Enable
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
