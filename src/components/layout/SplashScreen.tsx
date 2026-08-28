"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SUPRASPACE_SUBDOMAIN = "space.suprah-app.com";

// SupraSpace is meant to feel like its own dedicated, focused messaging app —
// this "SUPRAH." branded splash (with its own ~1.35s forced duration) is
// Suprah AI's, and showing it first made every SupraSpace load look like two
// stacked loading screens back to back. SupraSpace's own loading state (its
// logo + "Suprah Space" text, in supraspace/page.tsx) already covers this
// route on its own. Path-only check (no hostname) so the server-rendered
// initial value matches the client's — safe for every surface reached by
// pathname (/supraspace, /crm/supra-space, /crm/conversations). The
// subdomain needs an extra client-only check below since its middleware
// rewrite is invisible to the browser (usePathname() there still reads "/").
function isSupraSpacePathname(pathname: string | null): boolean {
    return !!pathname && (
        pathname.startsWith("/supraspace") ||
        pathname.startsWith("/crm/supra-space") ||
        pathname.startsWith("/crm/conversations")
    );
}

export const SplashScreen = () => {
    const pathname = usePathname();
    const skipForSupraSpace = isSupraSpacePathname(pathname);

    const [isVisible, setIsVisible] = useState(!skipForSupraSpace);
    const [count, setCount] = useState(0);
    const [status, setStatus] = useState("Initializing Core...");

    // Catches the SupraSpace subdomain specifically — hostname is only known
    // client-side, so this can't be part of the SSR-safe initial state above.
    useEffect(() => {
        if (window.location.hostname === SUPRASPACE_SUBDOMAIN) setIsVisible(false);
    }, []);

    useEffect(() => {
        if (skipForSupraSpace) return;
        // Force scroll lock on initial load so user can't scroll past the splash
        document.body.style.overflow = "hidden";

        const duration = 1000;
        const steps = 100;
        const intervalTime = duration / steps;

        const statusMessages = [
            "Booting...",
            "Checking Access...",
            "Loading Assets...",
            "Locked In."
        ];

        const interval = setInterval(() => {
            setCount((prev) => {
                if (prev < 100) {
                    const newCount = prev + 1;
                    if (newCount > 30 && newCount < 70) setStatus(statusMessages[1]);
                    if (newCount >= 70 && newCount < 100) setStatus(statusMessages[2]);
                    if (newCount === 100) setStatus(statusMessages[3]);
                    return newCount;
                }
                clearInterval(interval);
                return 100;
            });
        }, intervalTime);

        const timeout = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => document.body.style.overflow = "auto", 350);
        }, duration + 350);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
            document.body.style.overflow = "auto";
        };
    }, []);

    // Staggered letters
    const letters = "SUPRAH.".split("");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const letterVariants = {
        hidden: { y: 100, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100
            }
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="splash-screen"
                    className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
                    initial={{ y: 0 }}
                    exit={{
                        y: "-100%",
                        transition: { duration: 0.35, ease: [0.76, 0, 0.24, 1] },
                    }}
                >
                    {/* Animated Background Grid */}
                    <div className="absolute inset-0 z-0">
                        <svg className="w-full h-full opacity-5" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                        <motion.div
                            className="absolute inset-0 bg-linear-to-t from-[#000000] to-transparent bg-opacity-80"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="z-10 flex flex-col items-center">

                        {/* Staggered Text Reveal */}
                        <div className="overflow-hidden mb-8">
                            <motion.div
                                className="flex"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {letters.map((letter, index) => (
                                    <motion.span
                                        key={index}
                                        className={`text-6xl md:text-9xl font-black font-mono tracking-tighter ${letter === '.' ? 'text-green-500' : 'text-white'
                                            }`}
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </motion.div>
                        </div>

                        {/* Dynamic Status Text & Counter */}
                        <div className="w-75 flex flex-col gap-2">
                            <div className="flex justify-between items-end mb-1">
                                <motion.span
                                    key={status} // Key changing triggers animation
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white/60 text-xs font-mono uppercase tracking-widest"
                                >
                                    {status}
                                </motion.span>
                                <span className="text-white text-lg font-bold font-mono">{count}%</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-linear-to-r from-emerald-500 to-green-400"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${count}%` }}
                                />
                            </div>
                        </div>
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
};
