import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "../providers/QueryProvider";
import "mapbox-gl/dist/mapbox-gl.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "Suprah.AI",
  description: "Advanced Car Dealership Management",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Suprah.AI",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { AuthProvider } from "@/providers/AuthProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PushPrompt } from "@/components/pwa/PushPrompt";
import { IOSInstallHint } from "@/components/pwa/IOSInstallHint";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { TrayAutoConnect } from "@/components/pwa/TrayAutoConnect";

import { Toaster } from "@/components/ui/sonner";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { SystemStatusBanner } from "@/components/layout/SystemStatusBanner";
import { ReferralCatcher } from "@/components/referral/ReferralCatcher";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";
import { Suspense } from "react";

import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scrollbar-thin" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var DARK_BG='oklch(0.15 0.02 269.18)';var LIGHT_BG='oklch(0.99 0 0)';var root=document.documentElement;try{var t=localStorage.getItem('theme');var isLight=t==='light';root.classList.add(isLight?'light':'dark');root.style.backgroundColor=isLight?LIGHT_BG:DARK_BG;root.style.colorScheme=isLight?'light':'dark'}catch(e){root.classList.add('dark');root.style.backgroundColor=DARK_BG;root.style.colorScheme='dark'}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <SplashScreen />
            <main className="flex-1 overflow-hidden bg-background">
              <QueryProvider>
                <Suspense fallback={null}>
                  <ReferralCatcher />
                </Suspense>
                {children}
              </QueryProvider>
            </main>
            <Toaster position="top-right" />
            <SystemStatusBanner />
            <ImpersonationBanner />
            {process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true" && <DevRoleSwitcher />}
            <ServiceWorkerRegistration />
            <TrayAutoConnect />
            <InstallPrompt />
            <PushPrompt />
            <IOSInstallHint />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}