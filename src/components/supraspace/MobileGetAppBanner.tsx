'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'ss_mobile_get_app_banner_dismissed';

// Mobile-only nudge shown on the dashboard-embedded SupraSpace view
// (/crm/supra-space), pointing users at the dedicated standalone app
// (/supraspace). Deliberately NOT rendered on /supraspace itself —
// InstallSupraSpaceButton already covers that surface.
export function MobileGetAppBanner() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-60 p-4 lg:hidden"
        >
          <div className="relative overflow-hidden rounded-3xl bg-background border border-border/50 p-5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] mx-auto max-w-md flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft, rgba(99,102,241,0.12))' }}>
              <Download className="h-5 w-5" style={{ color: 'var(--accent, #6366f1)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Get SupraSpace as its own app</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">A lighter, dedicated version — just chats, on your Home Screen.</p>
            </div>
            <a
              href="/supraspace"
              className="shrink-0 rounded-full px-3.5 py-2 text-xs font-bold text-white"
              style={{ background: 'var(--accent, #6366f1)' }}
            >
              Get app
            </a>
            <button onClick={dismiss} className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
