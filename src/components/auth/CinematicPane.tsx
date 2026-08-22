"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export function CinematicPane() {
    return (
        <div className="relative w-full h-full overflow-hidden bg-black select-none">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-950"
            />

            <div className="absolute inset-0 bg-black/15 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/70 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-linear-to-t from-black/75 to-transparent pointer-events-none md:block" />

            <div
                className="absolute left-4 z-10 flex items-center gap-2 md:left-7"
                style={{ top: "max(0.875rem, env(safe-area-inset-top))" }}
            >
                <Image
                    src="/favicon.png"
                    alt="Suprah.ai"
                    width={160}
                    height={80}
                    className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:h-9 md:h-11"
                    priority
                />
            </div>

            <div className="absolute bottom-4 left-4 z-10 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] md:flex md:left-7">
                <span>Inventory</span>
                <span className="h-1 w-1 rounded-full bg-white/60" />
                <span>Deals</span>
                <span className="h-1 w-1 rounded-full bg-white/60" />
                <span>Reports</span>
                <span className="h-1 w-1 rounded-full bg-white/60" />
                <span>Team</span>
            </div>
        </div>
    );
}
