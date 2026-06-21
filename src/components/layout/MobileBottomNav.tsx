"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type BottomNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    isCenter?: boolean;
};

type MobileBottomNavProps = {
    items: BottomNavItem[];
};

export function MobileBottomNav({ items }: MobileBottomNavProps) {
    const pathname = usePathname();
    const [hidden, setHidden] = React.useState(false);
    const [hiddenForConvo, setHiddenForConvo] = React.useState(false);
    const [pendingHref, setPendingHref] = React.useState<string | null>(null);
    const lastScrollY = React.useRef(0);

    React.useEffect(() => {
        setPendingHref(null);
        setHidden(false);
    }, [pathname]);

    React.useEffect(() => {
        const handler = (e: Event) => {
            setHiddenForConvo((e as CustomEvent<{ active: boolean }>).detail.active);
        };
        window.addEventListener('supraspace:conv-state', handler);
        return () => window.removeEventListener('supraspace:conv-state', handler);
    }, []);

    React.useEffect(() => {
        const el = document.querySelector("main");
        if (!el) return;
        const onScroll = () => {
            const y = el.scrollTop;
            if (Math.abs(y - lastScrollY.current) < 8) return;
            setHidden(y > lastScrollY.current && y > 60);
            lastScrollY.current = y;
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    const isActive = (href: string) => {
        const exact = ["/", "/driver", "/admin/dashboard", "/customer"];
        if (exact.includes(href)) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    const shouldHide = hidden || hiddenForConvo;

    return (
        <motion.nav
            initial={{ y: 140, opacity: 0 }}
            animate={{ y: shouldHide ? 140 : 0, opacity: hiddenForConvo ? 0 : hidden ? 0.88 : 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.85 }}
            className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-30 md:hidden select-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", pointerEvents: hiddenForConvo ? 'none' : undefined }}
        >
            <div className="mx-auto w-[min(100%-1rem,33rem)] mb-2.5">
                <div className="relative rounded-3xl border border-border/40 bg-background/70 dark:bg-background/60 backdrop-blur-2xl shadow-[0_10px_34px_rgba(0,0,0,0.2)] px-1.5 pt-4 pb-1.5 overflow-visible">
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

                    <div className="grid items-end gap-0.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>

                        {items.map((item, index) => {
                            const active = pendingHref === item.href || isActive(item.href);
                            const Icon = item.icon;

                            if (item.isCenter) {
                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ y: 8, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.03, duration: 0.22, ease: "easeOut" }}
                                        className="flex justify-center"
                                    >
                                        <Link
                                            href={item.href}
                                            aria-current={active ? "page" : undefined}
                                            onClick={() => {
                                                setPendingHref(item.href);
                                                setHidden(false);
                                            }}
                                            className="relative -mt-7 flex flex-col items-center gap-0.5"
                                        >
                                            <motion.div
                                                whileTap={{ scale: 0.9 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                                                className={cn(
                                                    "relative flex h-13 w-13 items-center justify-center rounded-full",
                                                    "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
                                                    "transition-all duration-200",
                                                    active
                                                        ? "bg-primary ring-4 ring-primary/25"
                                                        : "bg-primary/95"
                                                )}
                                            >
                                                <motion.div
                                                    animate={{ rotate: active ? 4 : 0, scale: active ? 1.02 : 1 }}
                                                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                                                >
                                                    <Icon className="size-5.5 text-primary-foreground" strokeWidth={active ? 2.5 : 2.15} />
                                                </motion.div>
                                            </motion.div>
                                            <span className={cn(
                                                "text-[9px] font-semibold tracking-wide uppercase",
                                                active ? "text-primary" : "text-muted-foreground/70"
                                            )}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    </motion.div>
                                );
                            }

                            return (
                                <motion.div
                                    key={item.href}
                                    initial={{ y: 8, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.03, duration: 0.22, ease: "easeOut" }}
                                >
                                    <Link
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        onClick={() => {
                                            setPendingHref(item.href);
                                            setHidden(false);
                                        }}
                                        className="flex flex-col items-center gap-0.5 py-1"
                                    >
                                        <motion.div
                                            whileTap={{ scale: 0.84 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                            className="relative flex flex-col items-center gap-0.5"
                                        >
                                            <div className={cn(
                                                "relative flex items-center justify-center rounded-xl px-2.5 py-1 transition-all duration-200",
                                                active ? "bg-primary/14 dark:bg-primary/20" : "bg-transparent"
                                            )}>
                                                {active && (
                                                    <motion.div
                                                        layoutId="navPill"
                                                        className="absolute inset-0 rounded-xl bg-primary/12 dark:bg-primary/18"
                                                        transition={{ type: "spring", stiffness: 380, damping: 36 }}
                                                    />
                                                )}
                                                <Icon
                                                    className={cn(
                                                        "relative size-5 transition-colors duration-200",
                                                        active ? "text-primary" : "text-muted-foreground/60"
                                                    )}
                                                    strokeWidth={active ? 2.45 : 1.8}
                                                />
                                            </div>
                                            <span className={cn(
                                                "text-[9px] font-semibold tracking-wide uppercase transition-colors duration-200",
                                                active ? "text-primary" : "text-muted-foreground/50"
                                            )}>
                                                {item.label}
                                            </span>
                                        </motion.div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
}
