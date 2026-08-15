"use client";

import React, { useState, useEffect } from "react";
import { useWebPush } from "@/hooks/useWebPush";
import { Bell, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function PushPrompt() {
    const { isSupported, isSubscribed, subscribe, isLoading } = useWebPush();
    const [showPrompt, setShowPrompt] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // If not supported, already subscribed, or loading, do nothing
        if (!isSupported || isSubscribed || isLoading) return;

        // Dimissal check - don't harass the user in the same session
        const dismissed = sessionStorage.getItem("push_prompt_dismissed");
        if (dismissed) return;

        // Trigger logic: only show on dashboards (post-milestone entry points)
        const isDashboard = pathname?.includes('/driver') ||
            pathname?.includes('/customer') ||
            pathname?.includes('/admin');

        if (!isDashboard) return;

        // SCOPE PROTECTION: Strictly exclude CRM routes as per user instruction
        if (pathname?.startsWith("/crm")) return;

        // Show prompt after a delay to ensure it feels non-intrusive
        const timer = setTimeout(() => setShowPrompt(true), 4000);
        return () => clearTimeout(timer);
    }, [isSupported, isSubscribed, isLoading, pathname]);

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem("push_prompt_dismissed", "true");
    };

    const handleSubscribe = async () => {
        await subscribe();
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.95 }}
                className="fixed bottom-6 left-6 right-6 z-50 md:left-auto md:right-8 md:w-[380px]"
            >
                <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5">
                    {/* Subtle Glow Effect */}
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

                    <button
                        onClick={handleDismiss}
                        className="absolute right-4 top-4 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 shadow-inner">
                            <Bell className="h-5 w-5 text-emerald-500" />
                        </div>

                        <div className="flex-1 pr-4">
                            <h3 className="text-sm font-bold tracking-tight text-foreground">Enable Real-Time Alerts</h3>
                            <p className="mt-1 text-xs text-muted-foreground leading-normal">
                                Receive instant notifications for shipments, payouts, and team messages even when you're away.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider">
                            <ShieldCheck className="h-3 w-3" />
                            Standard PWA Push
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismiss}
                                className="text-xs h-8 px-3 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all font-semibold"
                            >
                                Maybe Later
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSubscribe}
                                className="text-xs h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
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
