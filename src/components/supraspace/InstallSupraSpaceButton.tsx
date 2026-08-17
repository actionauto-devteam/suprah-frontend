'use client';

import * as React from 'react';
import { Download, Share, PlusSquare, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function isIOSDevice(): boolean {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// There's no cross-browser API to ask "was I launched from the SupraSpace
// install or the main app install" — both share an origin. Standalone mode
// + landing on this route is the closest reliable signal, since SupraSpace's
// start_url points here.
function isRunningAsSupraSpaceStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return standalone && window.location.pathname.startsWith('/crm/supra-space');
}

export function InstallSupraSpaceButton({ variant = 'icon' }: { variant?: 'icon' | 'row' }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [installed, setInstalled] = React.useState(false);
  const [showIOSHint, setShowIOSHint] = React.useState(false);
  const [checkedIOS, setCheckedIOS] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isRunningAsSupraSpaceStandalone());
    setCheckedIOS(isIOSDevice());
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
    if (checkedIOS) setShowIOSHint(true);
  };

  const canInstall = !!deferredPrompt || checkedIOS;

  if (installed) {
    if (variant !== 'row') return null;
    return (
      <div className="flex items-center gap-3 py-3">
        <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--positive)' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>SupraSpace is installed on this device</p>
      </div>
    );
  }

  if (!canInstall) return null;

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
        {showIOSHint && (
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
                onClick={() => setShowIOSHint(false)}
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
