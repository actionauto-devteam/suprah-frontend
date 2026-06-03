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
  title: "Suprah AI",
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
    title: "Action Auto",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

import { AuthProvider } from "@/providers/AuthProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PushPrompt } from "@/components/pwa/PushPrompt";
import { IOSInstallHint } from "@/components/pwa/IOSInstallHint";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

import { Toaster } from "@/components/ui/sonner";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
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
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
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
            <ImpersonationBanner />
            {process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true" && <DevRoleSwitcher />}
            <ServiceWorkerRegistration />
            <InstallPrompt />
            <PushPrompt />
            <IOSInstallHint />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}