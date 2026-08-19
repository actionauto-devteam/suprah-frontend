'use client';

import * as React from 'react';
import { Download, Share, PlusSquare, X, Check, MoreVertical, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// There's no cross-browser API to ask "was I launched from the SupraSpace
// install or the main app install" — both share an origin. A standalone
// window's Navigation Timing entry records the URL the *document* actually
// loaded at, which stays fixed across later client-side (SPA) navigation —
// unlike location.pathname, which would also read /supraspace if the
// main app's shell was simply navigated there. Only a document that was
// entered directly at /supraspace (SupraSpace's own start_url) means
// SupraSpace itself was launched, not the main app's shell.
export function isRunningAsSupraSpaceStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  if (!standalone) return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const entryPath = nav ? new URL(nav.name).pathname : window.location.pathname;
  return entryPath.startsWith('/supraspace');
}

export function InstallSupraSpaceButton({ variant = 'icon' }: { variant?: 'icon' | 'row' }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [installed, setInstalled] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const [platform, setPlatform] = React.useState<Platform>('desktop');

  React.useEffect(() => {
    setInstalled(isRunningAsSupraSpaceStandalone());
    setPlatform(detectPlatform());
    const onBip = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowHint(true);
  };

  if (installed) {
    if (variant !== 'row') return null;
    return (
      <div className="flex items-center gap-3 py-3">
        <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--positive)' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>SupraSpace is installed on this device</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        title="Install SupraSpace"
        className={variant === 'icon' ? 'ss4-theme-btn h-8 w-8 flex items-center justify-center' : 'ss4-icon-btn h-7 px-3 flex items-center gap-1.5'}
        style={variant === 'row' ? { fontSize: 11, fontWeight: 600 } : undefined}
      >
        <Download className="h-3.5 w-3.5" />
        {variant === 'row' && <span>Install App</span>}
      </button>

      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-60 p-4"
          >
            <div className="relative overflow-hidden rounded-t-4xl bg-background border-t border-x border-border/50 p-7 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.5)] mx-auto max-w-md">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-muted/40 mb-6" />
              <button
                onClick={() => setShowHint(false)}
                className="absolute right-6 top-7 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="space-y-6 text-center pb-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Install SupraSpace</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    Add SupraSpace to your Home Screen for its own app icon and reliable message notifications.
                  </p>
                </div>
                <div className="bg-muted/20 rounded-2xl p-5 space-y-5">
                  {platform === 'ios' ? (
                    <>
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                          <Share className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">Step 1</p>
                          <p className="text-[13px] text-muted-foreground">Tap the <strong>Share</strong> button in Safari&apos;s toolbar</p>
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
                    </>
                  ) : platform === 'android' ? (
                    <>
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                          <MoreVertical className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">Step 1</p>
                          <p className="text-[13px] text-muted-foreground">Tap the <strong>⋮ menu</strong> in your browser&apos;s toolbar</p>
                        </div>
                      </div>
                      <div className="ml-5 border-l border-dashed border-border h-4" />
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                          <PlusSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">Step 2</p>
                          <p className="text-[13px] text-muted-foreground">Select <strong>Install app</strong> or <strong>Add to Home screen</strong></p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                          <PlusCircle className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">Step 1</p>
                          <p className="text-[13px] text-muted-foreground">Click the <strong>install icon</strong> in your address bar</p>
                        </div>
                      </div>
                      <div className="ml-5 border-l border-dashed border-border h-4" />
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                          <MoreVertical className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">No install icon?</p>
                          <p className="text-[13px] text-muted-foreground">Open the <strong>⋮ menu</strong> → <strong>Install SupraSpace…</strong></p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 pt-1">Not seeing either option? Your browser may not support installing apps — try Chrome or Edge.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
