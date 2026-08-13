'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, Trash2, Filter, AlertCircle, Search,
  ArrowLeft, Settings, ArrowRightLeft, Copy, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import { useCrmToken } from '@/hooks/useCrmToken';
import { Notification, NotificationCategory } from '@/types/notification';
import { NotificationItem } from './NotificationItem';
import { NotificationDriverModal } from './NotificationDriverModal';
import { NotificationEmptyState, NotificationLoadingState } from './NotificationEmptyState';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';
import { NotificationDetailsModal } from './NotificationDetailsModal';
import { getNotificationRoute, getNotificationTypeLabel, resolveNotificationCategory } from './notification-utils';
import {
  notificationPreferenceCategories,
  adminNotificationPreferenceCategories,
  crmNotificationPreferenceCategories,
  CRM_TYPE_GROUPS,
} from './notification-preference-categories';

type NotificationPageMode = 'general' | 'crm';
type TabFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | Notification['type'];
type SortOption = 'newest' | 'oldest' | 'mostRepeated';
// 'all' | 'cat:{NotificationCategory}' | 'grp:{CRM_TYPE_GROUPS key}'
type FilterSelection = string;

// General mode never shows the `crm` category — that's CRM-portal-only —
// and CRM mode drops the single lumped `crm` chip in favor of CRM_TYPE_GROUPS
// (see below), so it's excluded from both category chip lists.
const GENERAL_CATEGORY_META = [
  ...notificationPreferenceCategories.filter((c) => c.key !== 'crm'),
  ...adminNotificationPreferenceCategories,
];
const CRM_CHIP_CATEGORY_META = crmNotificationPreferenceCategories.filter((c) => c.key !== 'crm');

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'mostRepeated', label: 'Most repeated' },
];

function toMinutes(time: string): number {
  const [hh = '0', mm = '0'] = time.split(':');
  return (Number(hh) * 60) + Number(mm);
}

function hasMeaningfulMetadata(notification: Notification): boolean {
  if (!notification.metadata) return false;

  return Object.values(notification.metadata).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return true;
    return true;
  });
}

interface NotificationDataProps {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (options?: { limit?: number; skip?: number; isRead?: boolean }) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllRead: () => void;
}

function NotificationPageView({
  mode,
  notifications,
  unreadCount,
  totalCount,
  isLoading,
  error,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
}: NotificationDataProps & { mode: NotificationPageMode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const crmToken = useCrmToken();
  const isCrm = mode === 'crm';

  const preferencesPath = isCrm ? '/crm/notifications/preferences'
    : pathname.startsWith('/admin') ? '/admin/notifications/preferences'
    : pathname.startsWith('/driver') ? '/driver/notifications/preferences'
    : pathname.startsWith('/customer') ? '/customer/notifications/preferences'
    : '/notifications/preferences';
  const inboxPath = isCrm ? '/notifications' : '/crm/notifications';
  const showCrossNav = isCrm || !!crmToken;

  const [tab, setTab] = useState<TabFilter>(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'unread' || tabParam === 'read' ? tabParam : 'all';
  });
  const [filterSelection, setFilterSelection] = useState<FilterSelection>('all');
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [sort, setSort] = useState<SortOption>('newest');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [metadataOnly, setMetadataOnly] = useState(false);
  const [broadcastOnly, setBroadcastOnly] = useState(false);
  const [groupedOnly, setGroupedOnly] = useState(false);
  const [modalNotification, setModalNotification] = useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsNotification, setDetailsNotification] = useState<Notification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications({ limit: 0, skip: 0 });

    return () => {
      fetchNotifications({ limit: 50, skip: 0 });
    };
  }, [fetchNotifications]);

  // General mode never shows CRM-category notifications at all — not just an
  // unfilterable chip, suppressed from the feed itself. CRM mode is
  // unaffected (its whole feed is already CrmUser-scoped server-side).
  const visibleNotifications = useMemo(
    () => isCrm ? notifications : notifications.filter((n) => resolveNotificationCategory(n) !== 'crm'),
    [notifications, isCrm]
  );
  const scopedUnreadCount = useMemo(
    () => isCrm ? unreadCount : visibleNotifications.filter((n) => !n.isRead).length,
    [isCrm, unreadCount, visibleNotifications]
  );
  const displayTotal = useMemo(
    () => isCrm ? Math.max(totalCount, notifications.length) : visibleNotifications.length,
    [isCrm, totalCount, notifications.length, visibleNotifications.length]
  );

  const typeOptions = useMemo(
    () => Array.from(new Set(visibleNotifications.map((n) => n.type))).sort(),
    [visibleNotifications]
  );

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleNotifications.forEach((n) => {
      counts[resolveNotificationCategory(n)] = (counts[resolveNotificationCategory(n)] || 0) + 1;
    });
    return counts;
  }, [visibleNotifications]);

  const groupCount = useMemo(() => {
    if (!isCrm) return {};
    const counts: Record<string, number> = {};
    CRM_TYPE_GROUPS.forEach((group) => {
      counts[group.key] = visibleNotifications.filter((n) => group.types.includes(n.type)).length;
    });
    return counts;
  }, [isCrm, visibleNotifications]);

  const filterChips = useMemo(() => {
    const categoryMeta = isCrm ? CRM_CHIP_CATEGORY_META : GENERAL_CATEGORY_META;
    const categoryChips = categoryMeta
      .filter((c) => categoryCount[c.key])
      .map((c) => ({ value: `cat:${c.key}`, label: c.label, count: categoryCount[c.key] }));

    if (!isCrm) return categoryChips;

    const groupChips = CRM_TYPE_GROUPS
      .filter((g) => groupCount[g.key])
      .map((g) => ({ value: `grp:${g.key}`, label: g.label, count: groupCount[g.key] }));

    return [...groupChips, ...categoryChips];
  }, [isCrm, categoryCount, groupCount]);

  const filteredNotifications = useMemo(() => {
    let result = [...visibleNotifications];

    if (tab === 'unread') result = result.filter(n => !n.isRead);
    if (tab === 'read') result = result.filter(n => n.isRead);

    if (filterSelection !== 'all') {
      if (filterSelection.startsWith('cat:')) {
        const cat = filterSelection.slice(4) as NotificationCategory;
        result = result.filter(n => resolveNotificationCategory(n) === cat);
      } else if (filterSelection.startsWith('grp:')) {
        const group = CRM_TYPE_GROUPS.find((g) => `grp:${g.key}` === filterSelection);
        if (group) result = result.filter(n => group.types.includes(n.type));
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q)
        || n.message.toLowerCase().includes(q)
        || Object.values(n.metadata ?? {}).some((value) =>
          String(value ?? '').toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((n) => n.type === typeFilter);
    }

    if (metadataOnly) {
      result = result.filter((n) => hasMeaningfulMetadata(n));
    }

    if (broadcastOnly) {
      result = result.filter((n) => Boolean(n.isBroadcast));
    }

    if (groupedOnly) {
      result = result.filter((n) => (n.occurrenceCount ?? 1) > 1);
    }

    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      result = result.filter((n) => new Date(n.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`);
      result = result.filter((n) => new Date(n.createdAt) <= to);
    }

    if (timeFrom || timeTo) {
      const minFrom = timeFrom ? toMinutes(timeFrom) : null;
      const minTo = timeTo ? toMinutes(timeTo) : null;

      result = result.filter((n) => {
        const createdDate = new Date(n.createdAt);
        if (Number.isNaN(createdDate.getTime())) return false;

        const currentMinutes = createdDate.getHours() * 60 + createdDate.getMinutes();

        if (minFrom !== null && minTo !== null) {
          if (minFrom <= minTo) return currentMinutes >= minFrom && currentMinutes <= minTo;
          return currentMinutes >= minFrom || currentMinutes <= minTo;
        }

        if (minFrom !== null) return currentMinutes >= minFrom;
        if (minTo !== null) return currentMinutes <= minTo;
        return true;
      });
    }

    if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === 'mostRepeated') {
      result.sort((a, b) => (b.occurrenceCount ?? 1) - (a.occurrenceCount ?? 1));
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [visibleNotifications, tab, filterSelection, search, typeFilter, metadataOnly, broadcastOnly, groupedOnly, dateFrom, dateTo, timeFrom, timeTo, sort]);

  const advancedFilterCount = useMemo(
    () => [dateFrom, dateTo, timeFrom, timeTo].filter(Boolean).length
      + (typeFilter !== 'all' ? 1 : 0)
      + (metadataOnly ? 1 : 0)
      + (broadcastOnly ? 1 : 0)
      + (groupedOnly ? 1 : 0),
    [dateFrom, dateTo, timeFrom, timeTo, typeFilter, metadataOnly, broadcastOnly, groupedOnly]
  );
  const hasAnyFilters = advancedFilterCount > 0 || filterSelection !== 'all' || search.trim().length > 0;

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!isCrm && notification.type === 'driver_request') {
      setModalNotification(notification);
      setModalOpen(true);
      if (!notification.isRead) markAsRead(notification._id);
      return true;
    }

    if (!isCrm && notification.type === 'driver_dispatch_alert') {
      setDetailsNotification(notification);
      setDetailsOpen(true);
      if (!notification.isRead) markAsRead(notification._id);
      return true;
    }

    if (!isCrm && notification.type === 'driver_tracker_offline_alert') {
      const route = getNotificationRoute(notification, pathname);

      if (!notification.isRead) {
        markAsRead(notification._id);
      }

      if (route) {
        router.push(route);
      }

      return true;
    }

    const route = getNotificationRoute(notification, pathname);
    if (!route) {
      setDetailsNotification(notification);
      setDetailsOpen(true);
      return true;
    }
    return false;
  }, [markAsRead, pathname, isCrm, router]);

  const clearAllFilters = () => {
    setFilterSelection('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setTypeFilter('all');
    setMetadataOnly(false);
    setBroadcastOnly(false);
    setGroupedOnly(false);
  };

  return (
    <NotificationErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:bg-muted/50 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Bell className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {isCrm ? 'CRM Notifications' : 'Notifications'}
              </h1>
              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                {isCrm ? 'Leads, tasks, messages, and CRM activity' : 'Everything that needs your attention'}
              </p>
            </div>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex h-6 shrink-0 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground"
            >
              {scopedUnreadCount} unread · {displayTotal} total
            </Badge>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            {showCrossNav && (
              <Link
                href={inboxPath}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/40 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <ArrowRightLeft className="size-3.5" />
                {isCrm ? 'General Notifications' : 'CRM Notifications'}
              </Link>
            )}
            <Link
              href={preferencesPath}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/40 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Settings className="size-3.5" />
              Preferences
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={scopedUnreadCount === 0}
              className="h-8 gap-1.5 rounded-lg border-border/40 text-xs"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAllRead}
              disabled={notifications.length === 0}
              className="h-8 gap-1.5 rounded-lg border-border/40 text-xs text-muted-foreground"
            >
              <Trash2 className="size-3.5" />
              Clear read
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200/70 bg-red-50/80 p-3 text-red-600 text-sm dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Filter + list card */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted-foreground/60">
                  Search, filter, and sort your notifications.
                </p>
                {hasAnyFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearAllFilters}
                    className="h-8 rounded-lg border border-border/40 text-xs font-semibold gap-2 self-start sm:self-auto"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Reset filters
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notifications..."
                    className="h-9 rounded-xl border-border/40 bg-background/60 pl-9 text-xs"
                  />
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs">
                      Unread{scopedUnreadCount > 0 ? ` (${scopedUnreadCount})` : ''}
                    </TabsTrigger>
                    <TabsTrigger value="read" className="text-xs">Read</TabsTrigger>
                  </TabsList>
                </Tabs>

                <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                  <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background/60 text-xs">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterSelection('all')}
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      filterSelection === 'all'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border/40 bg-background/60 text-muted-foreground hover:border-border/70',
                    )}
                  >
                    All
                  </button>
                  {filterChips.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setFilterSelection(chip.value)}
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        filterSelection === chip.value
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-border/40 bg-background/60 text-muted-foreground hover:border-border/70',
                      )}
                    >
                      {chip.label}
                      <Badge variant="secondary" className="h-4 rounded-md px-1 text-[10px]">{chip.count}</Badge>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreFilters((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <ChevronDown className={cn('size-3.5 transition-transform', showMoreFilters && 'rotate-180')} />
                  More filters
                  {advancedFilterCount > 0 && (
                    <Badge className="h-4 rounded-md bg-emerald-500 px-1 text-[10px] text-white">{advancedFilterCount}</Badge>
                  )}
                </button>

                {showMoreFilters && (
                  <div className="mt-3 space-y-2.5">
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9 rounded-xl border-border/40 bg-background/60 text-xs"
                      />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9 rounded-xl border-border/40 bg-background/60 text-xs"
                      />
                      <TimePicker
                        format="time"
                        value={timeFrom}
                        onChange={setTimeFrom}
                        placeholder="Start time"
                        className="h-9 rounded-xl border-border/40 bg-background/60 text-xs"
                      />
                      <TimePicker
                        format="time"
                        value={timeTo}
                        onChange={setTimeTo}
                        placeholder="End time"
                        className="h-9 rounded-xl border-border/40 bg-background/60 text-xs"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                        <SelectTrigger className="h-9 w-52 rounded-xl border-border/40 bg-background/60 text-xs">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="all">All types</SelectItem>
                          {typeOptions.map((type) => (
                            <SelectItem key={type} value={type}>{getNotificationTypeLabel(type)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant={metadataOnly ? 'default' : 'outline'}
                        className="h-9 rounded-xl text-xs"
                        onClick={() => setMetadataOnly((v) => !v)}
                      >
                        Has details
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={broadcastOnly ? 'default' : 'outline'}
                        className="h-9 rounded-xl text-xs"
                        onClick={() => setBroadcastOnly((v) => !v)}
                      >
                        Broadcasts only
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={groupedOnly ? 'default' : 'outline'}
                        className="h-9 gap-1.5 rounded-xl text-xs"
                        onClick={() => setGroupedOnly((v) => !v)}
                      >
                        <Copy className="size-3.5" />
                        Grouped only
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-2.5 border-b border-border/30 text-[11px] text-muted-foreground/70">
              Showing {filteredNotifications.length} of {displayTotal} notification{displayTotal !== 1 ? 's' : ''}
              {isLoading && ' · refreshing…'}
            </div>

            <div className="max-h-[min(65vh,720px)] overflow-y-auto notification-scrollbar">
              {isLoading ? (
                <NotificationLoadingState />
              ) : filteredNotifications.length === 0 ? (
                <NotificationEmptyState />
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isCrm && (
        <NotificationDriverModal
          notification={modalNotification}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}

      <NotificationDetailsModal
        notification={detailsNotification}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </NotificationErrorBoundary>
  );
}

function GeneralNotificationPage() {
  const data = useNotifications();
  return <NotificationPageView mode="general" {...data} />;
}

function CrmNotificationPageInner() {
  const data = useCrmNotifications();
  return <NotificationPageView mode="crm" {...data} />;
}

export function NotificationPage({ mode = 'general' }: { mode?: NotificationPageMode } = {}) {
  return mode === 'crm' ? <CrmNotificationPageInner /> : <GeneralNotificationPage />;
}
