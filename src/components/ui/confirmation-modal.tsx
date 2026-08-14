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
      <AlertDialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-md duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          <AlertDialogHeader className="text-left">
            <div className="mb-2 flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  'shrink-0 rounded-xl border p-2',
                  variant === 'danger' && 'border-red-100 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
                  variant === 'success' && 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30',
                  variant === 'warning' && 'border-amber-100 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30',
                  variant === 'primary' && 'border-blue-100 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30',
                )}
              >
                {styles.icon}
              </div>
              <AlertDialogTitle className="min-w-0 break-words pt-1 text-lg font-black leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-xl">
                {title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground/80 [overflow-wrap:anywhere]">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel asChild>
              <Button
                variant="ghost"
                className="h-auto min-h-10 w-full whitespace-normal break-words rounded-xl px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest [overflow-wrap:anywhere] sm:w-auto"
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  onConfirm();
                }}
                disabled={isLoading}
                className={cn(
                  'h-auto min-h-10 w-full min-w-0 whitespace-normal break-words rounded-xl px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest shadow-lg [overflow-wrap:anywhere] sm:w-auto sm:min-w-25',
                  styles.button,
                  styles.ring,
                )}
              >
                {isLoading ? <Loader2 className="mr-2 size-3.5 shrink-0 animate-spin" /> : null}
                <span className="break-words [overflow-wrap:anywhere]">{confirmText}</span>
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}