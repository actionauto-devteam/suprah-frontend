'use client';

/**
 * Deal Desk UI primitives. Self-contained on purpose (Tailwind + theme
 * tokens only) so the module drops into the app without depending on
 * which shadcn components are installed. Colors come from the app theme
 * (primary, card, muted, border…), so light/dark mode just works.
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn, initials } from '@/lib/deal-desk/format';
import { useToasts, dismissToast } from '@/lib/deal-desk/hooks';
import Link from 'next/link';

/** Caller classes win over base classes in the same size/spacing group (w-, h-, px-, pl-…). */
const GROUPS = ['w', 'h', 'min-h', 'max-h', 'min-w', 'px', 'py', 'pl', 'pr'];
function groupOf(token: string): string | null {
  const t = token.replace(/^[a-z]+:/, '');
  for (const g of GROUPS.sort((a, b) => b.length - a.length)) if (t.startsWith(`${g}-`)) return (token.includes(':') ? token.split(':')[0] + ':' : '') + g;
  return null;
}
function merge(base: string, extra?: string): string {
  if (!extra) return base;
  const taken = new Set(extra.split(/\s+/).map(groupOf).filter(Boolean) as string[]);
  return [...base.split(/\s+/).filter((t) => { const g = groupOf(t); return !g || !taken.has(g); }), extra].join(' ');
}

/* ───────────── Button ───────────── */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warn';
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-background/60 hover:bg-muted text-foreground',
  ghost: 'hover:bg-muted text-foreground',
  danger: 'bg-rose-600 text-white hover:bg-rose-600/90 shadow-sm shadow-rose-600/20',
  success: 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-sm shadow-emerald-600/25',
  warn: 'bg-amber-500 text-white hover:bg-amber-500/90 shadow-sm shadow-amber-500/25',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-11 px-5 text-sm',
        size === 'icon' && 'h-9 w-9',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/* ───────────── Surfaces ───────────── */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative rounded-xl border border-border bg-card/80 text-card-foreground shadow-sm backdrop-blur-sm', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, kicker, actions, icon, className }: { title: React.ReactNode; kicker?: string; actions?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>}
        <div className="min-w-0">
          {kicker && <Kicker>{kicker}</Kicker>}
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-primary/90', className)}>{children}</div>;
}

/** Subtle animated grid + glow behind page headers — the module's visual signature. */
export function DigitalBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_7%,transparent)_1px,transparent_1px)] bg-size-[28px_28px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="absolute -top-24 right-0 h-64 w-[40rem] max-w-full rounded-full bg-primary/10 blur-3xl" />
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, actions, back }: { kicker?: string; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="relative isolate">
      <DigitalBackdrop />
      <div className="flex flex-col gap-4 py-5 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {back}
          {kicker && <Kicker className="mb-1.5">{kicker}</Kicker>}
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ───────────── Pills, dots, avatars ───────────── */

export function Pill({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5', className)}>
      {children}
    </span>
  );
}

export function LiveDot({ className, pulse = true }: { className?: string; pulse?: boolean }) {
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      {pulse && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />}
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}

export function Avatar({ name, size = 'sm', className, ring }: { name?: string | null; size?: 'xs' | 'sm' | 'md'; className?: string; ring?: string }) {
  return (
    <span
      title={name || undefined}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,var(--card))] font-semibold text-primary ring-1 ring-primary/25',
        size === 'xs' && 'size-5 text-[9px]',
        size === 'sm' && 'size-7 text-[10px]',
        size === 'md' && 'size-9 text-xs',
        ring,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin text-muted-foreground', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 grid size-12 place-items-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 text-primary">{icon}</div>}
      <div className="text-sm font-semibold">{title}</div>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
      <span className="flex items-center gap-2">
        <XCircle className="size-4 shrink-0" />
        {message}
      </span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/* ───────────── Form controls ───────────── */

const fieldBase =
  'w-full rounded-lg border border-input bg-background/70 px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string }>(function Input(
  { className, prefix, suffix, ...props },
  ref,
) {
  if (!prefix && !suffix) return <input ref={ref} className={merge(cn(fieldBase, 'h-10'), className)} {...props} />;
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
      <input ref={ref} className={merge(cn(fieldBase, 'h-10', prefix && 'pl-7', suffix && 'pr-10'), className)} {...props} />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={merge(cn(fieldBase, 'min-h-20 py-2'), className)} {...props} />;
});

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={merge(cn(fieldBase, 'h-10 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27none%27 stroke=%27%2394a3b8%27 stroke-width=%272%27%3E%3Cpath d=%27M3 4.5l3 3 3-3%27/%3E%3C/svg%3E")] bg-[position:right_0.75rem_center] bg-no-repeat pr-8'), className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className, required }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium">{label}</span>}
          {description && <span className="block text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-[var(--primary)]" />
      <span>{label}</span>
    </label>
  );
}

/* ───────────── Segmented control & tabs ───────────── */

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode; count?: number }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted/60 p-0.5 [scrollbar-width:none]', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium transition-all',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-xs sm:text-sm',
            value === o.value ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
          {o.count != null && o.count > 0 && (
            <span className={cn('min-w-4 rounded px-1 text-[10px] leading-4', value === o.value ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/15')}>{o.count > 99 ? '99+' : o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; icon?: React.ReactNode; badge?: number; hideOn?: 'lg' }[]; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            'relative inline-flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors',
            value === t.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            t.hideOn === 'lg' && 'lg:hidden',
          )}
        >
          {t.icon}
          {t.label}
          {!!t.badge && <span className="rounded bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{t.badge}</span>}
          {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/60" />}
        </button>
      ))}
    </div>
  );
}

/* ───────────── Modal ───────────── */

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissable = true }: { open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg'; dismissable?: boolean }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dismissable]);
  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in" onClick={() => dismissable && onClose()} />
      <div
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-3xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {dismissable && (
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </button>
          )}
        </div>
        {children && <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────── Toaster ───────────── */

export function Toaster() {
  const items = useToasts();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const icon = { default: Info, success: CheckCircle2, warn: AlertTriangle, error: XCircle };
  const tone = {
    default: 'text-primary',
    success: 'text-emerald-500',
    warn: 'text-amber-500',
    error: 'text-rose-500',
  };
  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[110] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
      {items.map((t) => {
        const Icon = icon[t.tone || 'default'];
        const body = (
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 size-4 shrink-0', tone[t.tone || 'default'])} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.body}</div>}
            </div>
          </div>
        );
        return (
          <div key={t.id} className="pointer-events-auto relative w-full max-w-sm rounded-xl border border-border bg-background/95 p-3 pr-8 shadow-xl backdrop-blur animate-in slide-in-from-bottom-2 fade-in">
            {t.href ? (
              <Link href={t.href} onClick={() => dismissToast(t.id)}>
                {body}
              </Link>
            ) : (
              body
            )}
            <button onClick={() => dismissToast(t.id)} className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

/* ───────────── Stat tile ───────────── */

export function StatTile({ label, value, sub, tone = 'default', icon, live }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad'; icon?: React.ReactNode; live?: boolean }) {
  const toneCls = {
    default: 'text-foreground',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-rose-600 dark:text-rose-400',
  }[tone];
  return (
    <Card className="min-w-[10.5rem] flex-1 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/70">{live ? <LiveDot className="text-emerald-500" /> : icon}</span>
      </div>
      <div className={cn('mt-2 text-2xl font-bold tabular-nums tracking-tight', toneCls)}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
      <div aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 size-20 rounded-full bg-primary/5 blur-xl" />
    </Card>
  );
}
