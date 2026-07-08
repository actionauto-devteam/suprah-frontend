'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: Date;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useProfileToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useProfileToast must be inside ProfileToastProvider');
  return ctx;
}

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
  success: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
    bar: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    bar: 'bg-red-500',
  },
  warning: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
    bar: 'bg-amber-500',
  },
  info: {
    bg: 'bg-white dark:bg-gray-900',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    bar: 'bg-blue-500',
  },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Denver' });
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const duration = toast.duration || 4000;
  const Icon = icons[toast.type];
  const style = styles[toast.type];

  useEffect(() => {
    const leaveTimer = setTimeout(() => setIsLeaving(true), duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      className={cn(
        'relative w-80 rounded-xl border shadow-lg overflow-hidden pointer-events-auto',
        'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        style.bg, style.border,
        isLeaving ? 'opacity-0 translate-x-6 scale-95' : 'opacity-100 translate-x-0 scale-100',
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pr-9">
        <div className={cn('mt-0.5 flex-shrink-0', style.icon)}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{toast.message}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="size-3 text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">{formatTime(toast.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={() => { setIsLeaving(true); setTimeout(() => onDismiss(toast.id), 200); }}
          className="absolute top-2.5 right-2.5 p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {/* Timer bar */}
      <div className="h-[3px] w-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn('h-full origin-left', style.bar)}
          style={{ animation: `shrink ${duration}ms linear forwards` }}
        />
      </div>
    </div>
  );
}

const MAX_TOASTS = 3;

export function ProfileToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id' | 'createdAt'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { ...t, id, createdAt: new Date() }];
      // Keep only latest MAX_TOASTS
      return next.slice(-MAX_TOASTS);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
