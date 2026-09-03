import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface StepperProps {
  steps: readonly StepperStep[];
  currentStepId: string;
  completedStepIds: ReadonlySet<string> | string[];
  onStepClick?: (id: string) => void;
  className?: string;
}

// Generic controlled stepper, replacing the two independently hand-rolled
// step-circle implementations in DriverVerificationForm.tsx and
// DocumentsPage.tsx. Mobile-first: condensed circles-only row on small
// widths, full label row from `sm:` up — this is the driver-facing PWA
// surface, so it needs to hold up on a phone screen first.
export function Stepper({ steps, currentStepId, completedStepIds, onStepClick, className }: StepperProps) {
  const completed = completedStepIds instanceof Set ? completedStepIds : new Set(completedStepIds);

  return (
    <div className={cn('flex items-center justify-center gap-0 px-2', className)}>
      {steps.map((step, i) => {
        const active = currentStepId === step.id;
        const done = completed.has(step.id);
        const Icon = step.icon;
        const clickable = Boolean(onStepClick);

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step.id)}
              className={cn('relative z-10 flex flex-col items-center gap-1.5', !clickable && 'cursor-default')}
            >
              <div
                className={cn(
                  'size-10 rounded-xl flex items-center justify-center border-2 transition-all',
                  active ? 'bg-primary/15 border-primary/50' : done ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-muted border-border',
                )}
              >
                {done ? (
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Icon className={cn('size-4.5', active ? 'text-foreground' : 'text-muted-foreground')} />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold hidden sm:block',
                  active ? 'text-foreground' : done ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 rounded-full bg-border relative -mt-5 sm:-mt-5" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
