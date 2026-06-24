'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmationVariant = 'primary' | 'danger' | 'success' | 'warning';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmationModalProps) {

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="size-5 text-red-500" />,
          button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
          ring: 'focus:ring-red-500',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-500" />,
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
          ring: 'focus:ring-emerald-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="size-5 text-amber-500" />,
          button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
          ring: 'focus:ring-amber-500',
        };
      default:
        return {
          icon: <Info className="size-5 text-blue-500" />,
          button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
          ring: 'focus:ring-blue-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="w-[calc(100vw-1rem)] sm:max-w-100 rounded-2xl gap-6 p-6">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-xl border",
              variant === 'danger' && "bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/50",
              variant === 'success' && "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50",
              variant === 'warning' && "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50",
              variant === 'primary' && "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50",
            )}>
              {styles.icon}
            </div>
            <AlertDialogTitle className="text-xl font-black tracking-tight">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground/80">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel asChild>
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" disabled={isLoading}>
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              disabled={isLoading}
              className={cn("rounded-xl font-bold uppercase tracking-widest text-[10px] min-w-25 shadow-lg", styles.button, styles.ring)}
            >
              {isLoading ? <Loader2 className="size-3.5 animate-spin mr-2" /> : null}
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
