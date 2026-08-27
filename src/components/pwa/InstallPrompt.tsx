"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { X, Share, PlusSquare, Download } from "lucide-react";

const SUPRASPACE_SUBDOMAIN = "space.suprah-app.com";

export const InstallPrompt = () => {
    const pathname = usePathname();
    const { isInstallable, isIOS, isStandalone, handleInstallClick } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // SupraSpace has its own install affordance (its manifest/scope is
    // different from this one) — showing this banner there too would offer
    // two competing "install" actions for the same click. Covers every
    // surface SupraSpace's page.tsx is actually reached from: its own
    // subdomain (usePathname() there still reads "/" — the middleware
    // rewrite is invisible to the browser, so a hostname check is required
    // too), the main-domain path, and the dashboard-embedded routes.
    const inSupraSpace =
        pathname?.startsWith("/supraspace") ||
        pathname?.startsWith("/crm/supra-space") ||
        pathname?.startsWith("/crm/conversations") ||
        (typeof window !== "undefined" && window.location.hostname === SUPRASPACE_SUBDOMAIN);

    useEffect(() => {
        if (inSupraSpace) return;
        // Check if user has already dismissed the prompt in this session
        const dismissed = sessionStorage.getItem("pwa-prompt-dismissed");
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        // Show prompt after a short delay if it's installable and not already standalone
        if ((isInstallable || isIOS) && !isStandalone) {
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isInstallable, isIOS, isStandalone]);

    const dismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        sessionStorage.setItem("pwa-prompt-dismissed", "true");
    };

    if (!isVisible || isDismissed || isStandalone || inSupraSpace) return null;

    return (
        <div className="fixed bottom-6 left-1/2 z-9999 w-[90%] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="relative overflow-hidden rounded-2xl border border-border/10 bg-background/80 p-6 backdrop-blur-xl shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={dismiss}
                    className="absolute right-4 top-4 text-foreground/40 hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Download size={24} />
                    </div>

                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">
                            Install Dashboard
                        </h3>
                        <p className="mt-1 text-sm text-foreground/60 leading-relaxed">
                            Install Suprah.AI for a faster, full-screen experience and offline access.
                        </p>

                        <div className="mt-4">
                            {isIOS ? (
                                <div className="space-y-3 rounded-lg bg-foreground/5 p-3 text-sm text-foreground/80 border border-foreground/5">
                                    <p className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground/10 text-xs font-bold">1</span>
                                        Tap the Share button <Share size={16} className="text-blue-400" />
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded bg-background/10 text-xs font-bold">2</span>
                                        Select <span className="font-medium text-foreground">"Add to Home Screen"</span> <PlusSquare size={16} className="text-foreground" />
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleInstallClick}
                                    className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                >
                                    Install Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
