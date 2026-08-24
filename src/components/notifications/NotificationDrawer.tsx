'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { useOptionalCrmNotifications } from '@/hooks/useCrmNotifications';
import { useCrmToken } from '@/hooks/useCrmToken';
import { Notification } from '@/types/notification';
import { NotificationItem } from './NotificationItem';
import { NotificationDriverModal } from './NotificationDriverModal';
import { NotificationDetailsModal } from './NotificationDetailsModal';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';
import { NotificationLoadingState } from './NotificationEmptyState';
import {
  getNotificationRoute,
  resolveNotificationCategory,
} from './notification-utils';
import {
  adminNotificationPreferenceCategories,
  CRM_TYPE_GROUPS,
  crmNotificationPreferenceCategories,
  notificationPreferenceCategories,
} from './notification-preference-categories';

type SourceKind = 'general' | 'crm';

type DrawerEntry = {
  source: SourceKind;
  notification: Notification;
};

type FilterLeaf = {
  id: string;
  label: string;
  source: SourceKind;
  kind: 'category' | 'group';
  value: string;
};

type FilterBranch = {
  id: SourceKind;
  label: string;
  leaves: FilterLeaf[];
};

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DRAWER_RENDER_LIMIT = 200;
const OTHER_CRM_GROUP_KEY = 'crm_other';

function useDesktopDrawer() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

const GENERAL_CATEGORY_META = [
  ...notificationPreferenceCategories.filter((category) => category.key !== 'crm'),
  ...adminNotificationPreferenceCategories,
];

const CRM_CATEGORY_META = crmNotificationPreferenceCategories.filter(
  (category) => category.key !== 'crm',
);

function buildFilterBranches(): FilterBranch[] {
  const generalLeaves: FilterLeaf[] = GENERAL_CATEGORY_META.map((category) => ({
    id: `general:cat:${category.key}`,
    label: category.label,
    source: 'general',
    kind: 'category',
    value: String(category.key),
  }));

  const crmGroupLeaves: FilterLeaf[] = [
    ...CRM_TYPE_GROUPS.map((group) => ({
      id: `crm:grp:${group.key}`,
      label: group.label,
      source: 'crm' as const,
      kind: 'group' as const,
      value: group.key,
    })),
    {
      id: `crm:grp:${OTHER_CRM_GROUP_KEY}`,
      label: 'Other CRM Activity',
      source: 'crm' as const,
      kind: 'group' as const,
      value: OTHER_CRM_GROUP_KEY,
    },
  ];

  const crmCategoryLeaves: FilterLeaf[] = CRM_CATEGORY_META.map((category) => ({
    id: `crm:cat:${category.key}`,
    label: category.label,
    source: 'crm',
    kind: 'category',
    value: String(category.key),
  }));

  return [
    { id: 'general', label: 'General', leaves: generalLeaves },
    { id: 'crm', label: 'CRM', leaves: [...crmGroupLeaves, ...crmCategoryLeaves] },
  ];
}

const FILTER_BRANCHES = buildFilterBranches();
const ALL_LEAF_IDS = FILTER_BRANCHES.flatMap((branch) => branch.leaves.map((leaf) => leaf.id));

function notificationMatchesLeaf(entry: DrawerEntry, leaf: FilterLeaf): boolean {
  if (entry.source !== leaf.source) return false;

  const category = resolveNotificationCategory(entry.notification);

  if (leaf.kind === 'category') {
    return category === leaf.value;
  }

  if (entry.source !== 'crm' || category !== 'crm') return false;
  if (leaf.value === OTHER_CRM_GROUP_KEY) {
    return !CRM_TYPE_GROUPS.some((group) => group.types.includes(entry.notification.type));
  }

  const group = CRM_TYPE_GROUPS.find((candidate) => candidate.key === leaf.value);
  return Boolean(group?.types.includes(entry.notification.type));
}

function CheckboxMark({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white transition-colors',
        checked || indeterminate
          ? 'border-emerald-500 bg-emerald-500'
          : 'border-border/80 bg-background',
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2 rounded-full bg-white" />
      ) : checked ? (
        <Check className="size-3" />
      ) : null}
    </span>
  );
}


function ScrollingFilterLabel({ label }: { label: string }) {
  const viewportRef = React.useRef<HTMLSpanElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = React.useState(0);

  React.useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const text = textRef.current;
      if (!viewport || !text) return;

      const nextOverflow = Math.max(0, Math.ceil(text.scrollWidth - viewport.clientWidth + 2));
      setOverflowPx(nextOverflow);
    };

    measure();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;

    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    if (observer && textRef.current) observer.observe(textRef.current);

    return () => observer?.disconnect();
  }, [label]);

  const durationSeconds = Math.min(4.8, Math.max(3.2, 3.2 + overflowPx / 55));

  return (
    <span
      ref={viewportRef}
      className="relative min-w-0 flex-1 overflow-hidden whitespace-nowrap"
      title={label}
    >
      <span
        ref={textRef}
        className={cn(
          'inline-block whitespace-nowrap will-change-transform',
          overflowPx > 0 && 'notification-filter-marquee',
        )}
        style={
          overflowPx > 0
            ? ({
                '--notification-filter-shift': `-${overflowPx}px`,
                '--notification-filter-duration': `${durationSeconds}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {label}
      </span>
    </span>
  );
}

function NotificationFilterMenu({
  selected,
  onChange,
  entries,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  entries: DrawerEntry[];
}) {
  const [open, setOpen] = React.useState(false);
  const [expandedBranches, setExpandedBranches] = React.useState<Set<SourceKind>>(
    () => new Set<SourceKind>(['general', 'crm']),
  );
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const countForLeaf = React.useCallback(
    (leaf: FilterLeaf) => entries.filter((entry) => notificationMatchesLeaf(entry, leaf)).length,
    [entries],
  );

  const allChecked = ALL_LEAF_IDS.every((id) => selected.has(id));
  const allIndeterminate = !allChecked && ALL_LEAF_IDS.some((id) => selected.has(id));

  const selectedCount = selected.size;
  const triggerLabel = allChecked
    ? 'All notifications'
    : selectedCount === 1
      ? '1 filter selected'
      : `${selectedCount} filters selected`;

  const toggleAll = () => {
    onChange(allChecked ? new Set<string>() : new Set<string>(ALL_LEAF_IDS));
  };

  const toggleBranch = (branch: FilterBranch) => {
    const ids = branch.leaves.map((leaf) => leaf.id);
    const isChecked = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => {
      if (isChecked) next.delete(id);
      else next.add(id);
    });
    onChange(next);
  };

  const toggleLeaf = (leaf: FilterLeaf) => {
    const next = new Set(selected);
    if (next.has(leaf.id)) next.delete(leaf.id);
    else next.add(leaf.id);
    onChange(next);
  };

  return (
    <div ref={rootRef} className="shrink-0">
      <style>{`
        @keyframes notification-filter-scroll {
          0%, 18% { transform: translateX(0); }
          82%, 100% { transform: translateX(var(--notification-filter-shift)); }
        }

        .notification-filter-marquee {
          animation: notification-filter-scroll var(--notification-filter-duration) ease-in-out 0.45s infinite alternate;
        }

        @media (prefers-reduced-motion: reduce) {
          .notification-filter-marquee {
            animation: none;
          }
        }
      `}</style>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        className="h-9 w-full justify-between rounded-lg border-border/80 bg-background px-2.5 text-[11px] font-semibold text-foreground hover:bg-muted/40"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Filter className="size-3.5 shrink-0" />
          <span className="truncate">Filter notifications · {triggerLabel}</span>
        </span>
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="max-h-[240px] min-h-28 overflow-y-auto p-2 [scrollbar-width:thin] [scrollbar-gutter:stable]">
            <button
              type="button"
              onClick={toggleAll}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold hover:bg-muted/60"
            >
              <CheckboxMark checked={allChecked} indeterminate={allIndeterminate} />
              <span className="min-w-0 flex-1">All</span>
              <span className="text-[10px] font-medium text-muted-foreground">{entries.length}</span>
            </button>

            <div className="my-1 border-t border-border/50" />

            {FILTER_BRANCHES.map((branch) => {
              const branchIds = branch.leaves.map((leaf) => leaf.id);
              const branchChecked = branchIds.every((id) => selected.has(id));
              const branchIndeterminate =
                !branchChecked && branchIds.some((id) => selected.has(id));
              const expanded = expandedBranches.has(branch.id);
              const branchCount = entries.filter((entry) => entry.source === branch.id).length;

              return (
                <div key={branch.id} className="py-0.5">
                  <div className="flex items-center gap-1 rounded-lg hover:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(expandedBranches);
                        if (expanded) next.delete(branch.id);
                        else next.add(branch.id);
                        setExpandedBranches(next);
                      }}
                      className="flex h-8 w-7 shrink-0 items-center justify-center text-muted-foreground"
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${branch.label}`}
                    >
                      {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBranch(branch)}
                      className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-sm font-semibold"
                    >
                      <CheckboxMark checked={branchChecked} indeterminate={branchIndeterminate} />
                      <ScrollingFilterLabel label={branch.label} />
                      <span className="text-[10px] font-medium text-muted-foreground">{branchCount}</span>
                    </button>
                  </div>

                  {expanded && (
                    <div className="ml-7 border-l border-border/50 pl-2">
                      <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
                        {branch.leaves.map((leaf) => {
                          const checked = selected.has(leaf.id);
                          return (
                            <button
                              key={leaf.id}
                              type="button"
                              onClick={() => toggleLeaf(leaf)}
                              className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              title={leaf.label}
                            >
                              <CheckboxMark checked={checked} />
                              <ScrollingFilterLabel label={leaf.label} />
                              <span className="shrink-0 text-[9px] font-medium text-muted-foreground/80">{countForLeaf(leaf)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationDrawerBody({
  onClose,
}: {
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const crmToken = useCrmToken();
  const general = useNotifications();
  const crm = useOptionalCrmNotifications();

  const [selectedFilters, setSelectedFilters] = React.useState<Set<string>>(
    () => new Set<string>(ALL_LEAF_IDS),
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [modalNotification, setModalNotification] = React.useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailsNotification, setDetailsNotification] = React.useState<Notification | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  React.useEffect(() => {
    general.fetchNotifications({ limit: 0, skip: 0 });
    if (crmToken && crm) crm.fetchNotifications({ limit: 0, skip: 0 });

    return () => {
      general.fetchNotifications({ limit: 50, skip: 0 });
      if (crmToken && crm) crm.fetchNotifications({ limit: 50, skip: 0 });
    };
    // Fetch functions are stable callbacks from their providers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmToken]);

  const entries = React.useMemo<DrawerEntry[]>(() => {
    const generalEntries = general.notifications
      .filter((notification) => resolveNotificationCategory(notification) !== 'crm')
      .map((notification) => ({ source: 'general' as const, notification }));

    const crmEntries = crmToken && crm
      ? crm.notifications.map((notification) => ({ source: 'crm' as const, notification }))
      : [];

    return [...generalEntries, ...crmEntries].sort(
      (a, b) =>
        new Date(b.notification.createdAt).getTime() -
        new Date(a.notification.createdAt).getTime(),
    );
  }, [general.notifications, crm?.notifications, crmToken]);

  const filteredEntries = React.useMemo(() => {
    if (selectedFilters.size === 0) return [];

    const normalizedSearch = searchQuery.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSelectedFilter = FILTER_BRANCHES.some((branch) =>
        branch.leaves.some(
          (leaf) => selectedFilters.has(leaf.id) && notificationMatchesLeaf(entry, leaf),
        ),
      );

      if (!matchesSelectedFilter) return false;
      if (!normalizedSearch) return true;

      const notification = entry.notification;
      const searchableMetadata = Object.values(notification.metadata ?? {})
        .map((value) => String(value ?? ''))
        .join(' ');

      return [
        notification.title,
        notification.message,
        notification.type,
        resolveNotificationCategory(notification),
        searchableMetadata,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [entries, selectedFilters, searchQuery]);

  const displayedEntries = filteredEntries.slice(0, DRAWER_RENDER_LIMIT);

  const scopedGeneralUnread = React.useMemo(
    () => general.notifications.filter(
      (notification) => !notification.isRead && resolveNotificationCategory(notification) !== 'crm',
    ).length,
    [general.notifications],
  );
  const combinedUnread = scopedGeneralUnread + (crmToken && crm ? crm.unreadCount : 0);

  const anyGeneralSelected = FILTER_BRANCHES[0].leaves.some((leaf) => selectedFilters.has(leaf.id));
  const anyCrmSelected = FILTER_BRANCHES[1].leaves.some((leaf) => selectedFilters.has(leaf.id));

  const handleMarkAllAsRead = async () => {
    const jobs: Promise<void>[] = [];
    if (anyGeneralSelected) jobs.push(general.markAllAsRead());
    if (anyCrmSelected && crmToken && crm) jobs.push(crm.markAllAsRead());
    await Promise.all(jobs);
  };

  const handleClearRead = async () => {
    const jobs: Promise<void>[] = [];
    if (anyGeneralSelected) jobs.push(general.deleteAllRead());
    if (anyCrmSelected && crmToken && crm) jobs.push(crm.deleteAllRead());
    await Promise.all(jobs);
  };

  const handleGeneralClick = React.useCallback((notification: Notification) => {
    if (notification.type === 'driver_request') {
      setModalNotification(notification);
      setModalOpen(true);
      if (!notification.isRead) general.markAsRead(notification._id);
      return true;
    }

    if (notification.type === 'driver_dispatch_alert') {
      setDetailsNotification(notification);
      setDetailsOpen(true);
      if (!notification.isRead) general.markAsRead(notification._id);
      return true;
    }

    if (notification.type === 'driver_tracker_offline_alert') {
      const route = getNotificationRoute(notification, pathname);
      if (!notification.isRead) general.markAsRead(notification._id);
      if (route) {
        onClose();
        router.push(route);
      }
      return true;
    }

    return false;
  }, [general, pathname, onClose, router]);

  const hasError = general.error || (crmToken && crm ? crm.error : null);
  const isLoading = general.isLoading || Boolean(crmToken && crm?.isLoading);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-card">
        <div className="shrink-0 border-b border-border/60 bg-card/95 px-4 py-3.5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bell className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold tracking-tight text-foreground">
                  Notifications
                </h2>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  {combinedUnread > 0
                    ? `${combinedUnread} unread notification${combinedUnread === 1 ? '' : 's'}`
                    : 'All caught up'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              onClick={handleMarkAllAsRead}
              disabled={combinedUnread === 0 || (!anyGeneralSelected && !anyCrmSelected)}
              title="Marks all notifications read in the selected notification sources."
            >
              <CheckCheck className="mr-1.5 size-3.5" />
              Read all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              onClick={handleClearRead}
              disabled={!anyGeneralSelected && !anyCrmSelected}
              title="Clears read notifications in the selected notification sources."
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Clear read
            </Button>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="space-y-1.5">
              <label htmlFor="notification-drawer-search" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Search notifications</label>
              <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="notification-drawer-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, message, type, or details..."
                className="h-9 rounded-lg border-border/80 bg-background pl-8 pr-8 text-[11px] text-foreground placeholder:text-muted-foreground/70"
                aria-label="Search notifications"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear notification search"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
              </div>
            </div>

            <NotificationFilterMenu
              selected={selectedFilters}
              onChange={setSelectedFilters}
              entries={entries}
            />
          </div>
        </div>

        {hasError && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="size-3.5 shrink-0" />
              <p className="text-[11px]">{hasError}</p>
            </div>
          </div>
        )}

        <div className="shrink-0 border-b border-border/40 px-4 py-2 text-[10px] text-muted-foreground">
          Showing {Math.min(filteredEntries.length, DRAWER_RENDER_LIMIT)} of {filteredEntries.length} matching notification{filteredEntries.length === 1 ? '' : 's'}
          {filteredEntries.length > DRAWER_RENDER_LIMIT ? ` · newest ${DRAWER_RENDER_LIMIT}` : ''}
        </div>

        <div className="notification-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card/80">
          {isLoading ? (
            <NotificationLoadingState />
          ) : filteredEntries.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Filter className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">No matching notifications</p>
              <p className="mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
                {searchQuery
                  ? 'Try a different search or adjust the notification filters.'
                  : 'Change the notification filters to show more activity.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {displayedEntries.map(({ source, notification }) => (
                <NotificationItem
                  key={`${source}:${notification._id}`}
                  notification={notification}
                  onMarkAsRead={(id) => {
                    if (source === 'general') {
                      void general.markAsRead(id);
                      return;
                    }

                    if (crm) {
                      void crm.markAsRead(id);
                    }
                  }}
                  onDelete={(id) => {
                    if (source === 'general') {
                      void general.deleteNotification(id);
                      return;
                    }

                    if (crm) {
                      void crm.deleteNotification(id);
                    }
                  }}
                  onClick={source === 'general' ? handleGeneralClick : undefined}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/notifications"
                onClick={onClose}
                className="text-[11px] font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                General inbox
              </Link>
              {crmToken && (
                <Link
                  href="/crm/notifications"
                  onClick={onClose}
                  className="text-[11px] font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  CRM inbox
                </Link>
              )}
            </div>
            <Link
              href={pathname.startsWith('/crm') ? '/crm/notifications/preferences' : '/notifications/preferences'}
              onClick={onClose}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Settings className="size-3" />
              Preferences
            </Link>
          </div>
        </div>
      </div>

      <NotificationDriverModal
        notification={modalNotification}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <NotificationDetailsModal
        notification={detailsNotification}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}

function DrawerSurface({ open, onOpenChange }: NotificationDrawerProps) {
  const isDesktop = useDesktopDrawer();

  if (!open) return null;

  if (isDesktop) {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <aside
        id="notification-drawer"
        className="fixed inset-y-0 right-0 z-[70] flex w-[340px] flex-col border-l border-border/70 bg-card shadow-[-18px_0_45px_rgba(0,0,0,0.12)] animate-in slide-in-from-right duration-300 xl:w-[380px] dark:shadow-[-18px_0_45px_rgba(0,0,0,0.32)]"
        aria-label="Notifications"
      >
        <NotificationErrorBoundary>
          <NotificationDrawerBody onClose={() => onOpenChange(false)} />
        </NotificationErrorBoundary>
      </aside>,
      document.body,
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-none gap-0 p-0 sm:w-[340px] sm:max-w-[340px]"
      >
        <SheetTitle className="sr-only">Notifications</SheetTitle>
        <SheetDescription className="sr-only">
          Review and filter general and CRM notifications.
        </SheetDescription>
        <NotificationErrorBoundary>
          <NotificationDrawerBody onClose={() => onOpenChange(false)} />
        </NotificationErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
  return <DrawerSurface open={open} onOpenChange={onOpenChange} />;
}