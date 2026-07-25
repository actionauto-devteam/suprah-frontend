'use client';

import React, { useState } from 'react';
import { BellRing, BellOff, Loader2, ShieldCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { NotificationCategoryPreferences, NotificationPreferences } from '@/types/notification';
import {
  notificationPreferenceCategories,
  adminNotificationPreferenceCategories,
  isAdminRole,
  type NotificationPreferenceCategory,
} from './notification-preference-categories';

// Flat (non-gradient) icon tint per color family, derived from each
// category's `from-{color}-500 ...` gradient string — full class strings are
// written out literally so Tailwind's static content scan picks them up
// (a template-literal class like `bg-${color}-500/10` would never be
// generated). Mirrors getNotificationFlatColor in notification-utils.ts.
const FLAT_COLOR_MAP: Record<string, { iconBg: string; iconText: string }> = {
  blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-600 dark:text-blue-400' },
  sky: { iconBg: 'bg-sky-500/10', iconText: 'text-sky-600 dark:text-sky-400' },
  cyan: { iconBg: 'bg-cyan-500/10', iconText: 'text-cyan-600 dark:text-cyan-400' },
  purple: { iconBg: 'bg-purple-500/10', iconText: 'text-purple-600 dark:text-purple-400' },
  violet: { iconBg: 'bg-violet-500/10', iconText: 'text-violet-600 dark:text-violet-400' },
  amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-600 dark:text-amber-400' },
  orange: { iconBg: 'bg-orange-500/10', iconText: 'text-orange-600 dark:text-orange-400' },
  pink: { iconBg: 'bg-pink-500/10', iconText: 'text-pink-600 dark:text-pink-400' },
  rose: { iconBg: 'bg-rose-500/10', iconText: 'text-rose-600 dark:text-rose-400' },
  teal: { iconBg: 'bg-teal-500/10', iconText: 'text-teal-600 dark:text-teal-400' },
  emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400' },
  green: { iconBg: 'bg-green-500/10', iconText: 'text-green-600 dark:text-green-400' },
  indigo: { iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-600 dark:text-indigo-400' },
  red: { iconBg: 'bg-red-500/10', iconText: 'text-red-600 dark:text-red-400' },
  fuchsia: { iconBg: 'bg-fuchsia-500/10', iconText: 'text-fuchsia-600 dark:text-fuchsia-400' },
  gray: { iconBg: 'bg-gray-500/10', iconText: 'text-gray-600 dark:text-gray-400' },
  slate: { iconBg: 'bg-slate-500/10', iconText: 'text-slate-600 dark:text-slate-400' },
};

function flatColorFromGradient(gradient: string): { iconBg: string; iconText: string } {
  const colorName = gradient.match(/^from-([a-z]+)-\d+/)?.[1] ?? 'gray';
  return FLAT_COLOR_MAP[colorName] ?? FLAT_COLOR_MAP.gray;
}

export interface NotificationCategoryGridProps {
  // Which category toggles to render — pass a scoped subset (e.g.
  // crmNotificationPreferenceCategories) so a surface only offers switches
  // for categories its own inbox can actually show. Defaults to the full set.
  categories?: NotificationPreferenceCategory[];
  preferences: NotificationPreferences;
  role: string | undefined;
  savingKey: string | null;
  handlePreferenceChange: (key: keyof NotificationCategoryPreferences, value: boolean) => void;
  setAll: (value: boolean, keys: (keyof NotificationCategoryPreferences)[]) => void;
  onToggleTypeGroup: (types: string[], muted: boolean) => void;
  // Suppresses this grid's own admin overlay — used when a person is admin on
  // BOTH their general and CRM identity, so the page renders one merged
  // admin block (NotificationAdminOverlay) instead of two identical-looking
  // ones, one per section.
  hideAdminOverlay?: boolean;
}

function CategoryRow({
  category,
  preferences,
  savingKey,
  handlePreferenceChange,
  onToggleTypeGroup,
  amber,
}: {
  category: NotificationPreferenceCategory;
  preferences: NotificationPreferences;
  savingKey: string | null;
  handlePreferenceChange: (key: keyof NotificationCategoryPreferences, value: boolean) => void;
  onToggleTypeGroup: (types: string[], muted: boolean) => void;
  amber?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = category.icon;
  const enabled = preferences[category.key];
  const saving = savingKey === category.key;
  const hasGroups = !!category.typeGroups?.length;
  const mutedTypes = preferences.mutedTypes ?? [];
  const flatColor = flatColorFromGradient(category.color);

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        amber ? 'border-amber-200/50 dark:border-amber-900/40' : 'border-border/50',
        enabled ? (amber ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'bg-emerald-50/40 dark:bg-emerald-950/10') : 'bg-background/60',
        saving && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', flatColor.iconBg, flatColor.iconText)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{category.label}</p>
            <p className="text-xs text-muted-foreground truncate">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasGroups && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
            </Button>
          )}
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => handlePreferenceChange(category.key, checked)}
            disabled={saving}
            className={cn('shrink-0', amber ? 'data-[state=checked]:bg-amber-500' : 'data-[state=checked]:bg-emerald-500')}
          />
        </div>
      </div>

      {hasGroups && expanded && (
        <div className="border-t border-border/40 px-3.5 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
            Customize — mute just one part without turning off {category.label}
          </p>
          {category.typeGroups!.map((group) => {
            const GroupIcon = group.icon;
            const groupMuted = group.types.every((t) => mutedTypes.includes(t));
            return (
              <div key={group.key} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <GroupIcon className={cn('size-3.5 shrink-0', group.color)} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{group.label}</p>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{group.description}</p>
                  </div>
                </div>
                <Switch
                  checked={!groupMuted}
                  disabled={!enabled}
                  onCheckedChange={(checked) => onToggleTypeGroup(group.types, !checked)}
                  className="shrink-0 data-[state=checked]:bg-emerald-500"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface NotificationAdminOverlayProps {
  preferences: NotificationPreferences;
  savingKey: string | null;
  handlePreferenceChange: (key: keyof NotificationCategoryPreferences, value: boolean) => void;
  onToggleTypeGroup: (types: string[], muted: boolean) => void;
  label?: string;
}

export function NotificationAdminOverlay({
  preferences,
  savingKey,
  handlePreferenceChange,
  onToggleTypeGroup,
  label = 'Admin-only — personal to your account',
}: NotificationAdminOverlayProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {adminNotificationPreferenceCategories.map((category) => (
          <CategoryRow
            key={category.key}
            category={category}
            preferences={preferences}
            savingKey={savingKey}
            handlePreferenceChange={handlePreferenceChange}
            onToggleTypeGroup={onToggleTypeGroup}
            amber
          />
        ))}
      </div>
    </div>
  );
}

// Category toggles + bulk actions + admin overlay, each row optionally
// expandable into finer per-type mutes (see CategoryRow above) — the
// tutorial hero lives separately above this on the preferences page.
export function NotificationCategoryGrid({
  categories = notificationPreferenceCategories,
  preferences,
  role,
  savingKey,
  handlePreferenceChange,
  setAll,
  onToggleTypeGroup,
  hideAdminOverlay,
}: NotificationCategoryGridProps) {
  const showAdminOverlay = isAdminRole(role) && !hideAdminOverlay;
  const allKeys = [
    ...categories.map((c) => c.key),
    ...(showAdminOverlay ? adminNotificationPreferenceCategories.map((c) => c.key) : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
        <span className="text-sm font-semibold text-muted-foreground">Quick actions:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAll(true, allKeys)}
          disabled={savingKey !== null}
          className="gap-2 text-sm border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
        >
          <BellRing className="size-3.5 text-green-600 dark:text-green-400" />
          Enable All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAll(false, allKeys)}
          disabled={savingKey !== null}
          className="gap-2 text-sm border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
        >
          <BellOff className="size-3.5 text-red-600 dark:text-red-400" />
          Disable All
        </Button>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryRow
            key={category.key}
            category={category}
            preferences={preferences}
            savingKey={savingKey}
            handlePreferenceChange={handlePreferenceChange}
            onToggleTypeGroup={onToggleTypeGroup}
          />
        ))}
      </div>

      {showAdminOverlay && (
        <NotificationAdminOverlay
          preferences={preferences}
          savingKey={savingKey}
          handlePreferenceChange={handlePreferenceChange}
          onToggleTypeGroup={onToggleTypeGroup}
        />
      )}
    </div>
  );
}
