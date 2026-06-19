"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export function CinematicPane() {
    return (
        <div className="relative w-full h-full overflow-hidden bg-black select-none">
            <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0 z-0"
            >
                <Image
                    src="/camaro.png"
                    alt="Cinematic Corvette"
                    fill
                    className="object-cover object-center md:object-[center_48%]"
                    priority
                    quality={100}
                />
            </motion.div>

            <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/55 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 hidden h-20 bg-linear-to-t from-black/60 to-transparent pointer-events-none md:block" />

            <div
                className="absolute left-4 z-10 flex items-center gap-2 md:left-7"
                style={{ top: "max(0.875rem, env(safe-area-inset-top))" }}
            >
                <Image
                    src="/favicon.png"
                    alt="Suprah.ai"
                    width={160}
                    height={80}
                    className="h-8 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] sm:h-9 md:h-11"
                    priority
                />
            </div>

            <div className="absolute bottom-4 left-4 z-10 hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75 md:flex md:left-7">
                <span>Inventory</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>Deals</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>Reports</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>Team</span>
            </div>
        </div>
    );
}
