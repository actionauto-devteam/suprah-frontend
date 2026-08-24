'use client';

import * as React from "react"
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PublicShellProps {
    children: React.ReactNode;
    hideNav?: boolean;
    hideThemeToggle?: boolean;
    logoText?: string;
    logoIcon?: string;
}

export function PublicShell({ 
    children, 
    hideNav = false, 
    hideThemeToggle = false, 
    logoText = "Suprah.AI",
    logoIcon = "S"
}: PublicShellProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto h-full px-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                             <span className="text-primary-foreground font-bold text-lg italic">{logoIcon}</span>
                        </div>
                        <span className="text-xl font-bold tracking-tighter uppercase italic">{logoText}</span>
                    </Link>

                    {!hideNav && (
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
                            <Link href="/vehicle-showcase" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Showcase</Link>
                        </nav>
                    )}

                    <div className="flex items-center gap-4">
                        {!hideThemeToggle && <ThemeModeToggle compact />}
                        <Link href="/sign-in">
                            <Button variant="default" size="sm">Sign In</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col">
                {children}
            </main>

            <footer className="py-12 border-t bg-muted/30">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Suprah.AI. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
