"use client";

import React, { useState, useEffect } from "react";
import { Share, PlusSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Technical Note: iOS Web Push requires the app to be "Added to Home Screen".
 * This component handles the discovery gating for iOS users.
 */
export function IOSInstallHint() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Detect iOS Browser (not already a standalone app)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = (window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone === true;

        // Don't bug the user if explicitly dismissed in localStorage
        const dismissed = localStorage.getItem("ios_install_hint_dismissed");

        if (isIOS && !isStandalone && !dismissed) {
            // Delay presentation so it doesn't steal focus from initial splash
            const timer = setTimeout(() => setShow(true), 6000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem("ios_install_hint_dismissed", "true");
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[60] p-4 lg:hidden"
            >
                <div className="relative overflow-hidden rounded-t-[32px] bg-background border-t border-x border-border/50 p-7 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.5)]">
                    {/* Handlebar Decoration */}
                    <div className="mx-auto w-12 h-1.5 rounded-full bg-muted/40 mb-6" />

                    <button
                        onClick={handleDismiss}
                        className="absolute right-6 top-7 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <div className="space-y-6 text-center pb-4">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight">Enable Push Notifications</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed px-2">
                                Action Auto requires being added to your Home Screen to deliver real-time alerts on iOS.
                            </p>
                        </div>

                        <div className="bg-muted/20 rounded-2xl p-5 space-y-5">
                            <div className="flex items-center gap-4 text-left">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                                    <Share className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-foreground">Step 1</p>
                                    <p className="text-[13px] text-muted-foreground">Tap the <strong>Share</strong> button in Safari's toolbar</p>
                                </div>
                            </div>

                            <div className="ml-5 border-l border-dashed border-border h-4" />

                            <div className="flex items-center gap-4 text-left">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                                    <PlusSquare className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-foreground">Step 2</p>
                                    <p className="text-[13px] text-muted-foreground">Scroll down and select <strong>Add to Home Screen</strong></p>
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em] font-black">
                            Official PWA Setup
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
