'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Bell, CheckCheck, Trash2, Filter, AlertCircle, Search,
  Sparkles, Radar, Layers3, ArrowUpRight, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { Notification } from '@/types/notification';
import { NotificationItem } from './NotificationItem';
import { NotificationDriverModal } from './NotificationDriverModal';
import { NotificationEmptyState, NotificationLoadingState } from './NotificationEmptyState';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';
import { NotificationDetailsModal } from './NotificationDetailsModal';
import { getNotificationCategory, getNotificationRoute } from './notification-utils';

type TabFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | Notification['type'];

const CATEGORY_OPTIONS = [
  'All', 'Quotes', 'Shipments', 'Vehicles', 'Appointments',
  'CRM', 'Driver', 'Payments', 'Team', 'Account', 'Referrals', 'System',
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

export function NotificationPage() {
  const {
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
  } = useNotifications();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabFilter>(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'unread' || tabParam === 'read' ? tabParam : 'all';
  });
  const [category, setCategory] = useState(() => {
    const categoryParam = searchParams.get('category');
    return categoryParam && CATEGORY_OPTIONS.includes(categoryParam) ? categoryParam : 'All';
  });
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') ?? '');
  const [timeFrom, setTimeFrom] = useState(() => searchParams.get('timeFrom') ?? '');
  const [timeTo, setTimeTo] = useState(() => searchParams.get('timeTo') ?? '');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    () => (searchParams.get('type') as TypeFilter | null) ?? 'all'
  );
  const [metadataOnly, setMetadataOnly] = useState(
    () => searchParams.get('metadataOnly') === 'true'
  );
  const [broadcastOnly, setBroadcastOnly] = useState(
    () => searchParams.get('broadcastOnly') === 'true'
  );
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

  const typeOptions = useMemo(
    () => Array.from(new Set(notifications.map((n) => n.type))).sort(),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (tab === 'unread') result = result.filter(n => !n.isRead);
    if (tab === 'read') result = result.filter(n => n.isRead);

    if (category !== 'All') {
      result = result.filter(n => getNotificationCategory(n.type) === category);
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

    return result;
  }, [
    notifications,
    tab,
    category,
    search,
    typeFilter,
    metadataOnly,
    broadcastOnly,
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
  ]);

  const advancedFilterCount = useMemo(
    () => [dateFrom, dateTo, timeFrom, timeTo].filter(Boolean).length
      + (typeFilter !== 'all' ? 1 : 0)
      + (metadataOnly ? 1 : 0)
      + (broadcastOnly ? 1 : 0),
    [dateFrom, dateTo, timeFrom, timeTo, typeFilter, metadataOnly, broadcastOnly]
  );

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (notification.type === 'driver_request') {
      setModalNotification(notification);
      setModalOpen(true);
      if (!notification.isRead) markAsRead(notification._id);
      return;
    }

    const route = getNotificationRoute(notification, pathname);
    if (!route) {
      setDetailsNotification(notification);
      setDetailsOpen(true);
    }
  }, [markAsRead, pathname]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach(n => {
      const cat = getNotificationCategory(n.type);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const topCategories = useMemo(
    () => Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4),
    [categoryCount]
  );

  const displayTotal = useMemo(
    () => Math.max(totalCount, notifications.length),
    [totalCount, notifications.length]
  );

  const clearAdvancedFilters = () => {
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setTypeFilter('all');
    setMetadataOnly(false);
    setBroadcastOnly(false);
  };

  return (
    <NotificationErrorBoundary>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-3xl -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-glow" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          <Card className="overflow-hidden border-emerald-500/15 bg-card/90 shadow-lg shadow-black/5 animate-fade-in-up">
            <CardContent className="p-5 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-4 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                      Live inbox
                    </span>
                    {advancedFilterCount > 0 && (
                      <Badge variant="outline" className="h-6 rounded-full border-border/50 bg-background/80 px-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {advancedFilterCount} active filters
                      </Badge>
                    )}
                    {unreadCount > 0 ? (
                      <Badge className="h-6 rounded-full bg-emerald-500 px-2.5 text-[10px] uppercase tracking-[0.16em] text-white shadow-sm shadow-emerald-500/20">
                        {unreadCount} unread
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-6 rounded-full border-border/50 px-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        All caught up
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20">
                      <Bell className="size-6" />
                      <Sparkles className="absolute right-1 top-1 size-3.5 animate-pulse text-white/80" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        {unreadCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            {unreadCount} unread
                            {displayTotal > 0 && <span className="text-muted-foreground/50">·</span>}
                            {displayTotal > 0 && `${displayTotal} total`}
                          </span>
                        ) : (
                          <span>{displayTotal > 0 ? `All caught up · ${displayTotal} total` : 'All caught up'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-120">
                  <div className="rounded-2xl border border-emerald-500/15 bg-linear-to-br from-emerald-500/10 to-transparent p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-emerald-500/15 p-1.5 text-emerald-600 dark:text-emerald-400">
                        <Layers3 className="size-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Unread</p>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground transition-all duration-300">{unreadCount}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-500/15 bg-linear-to-br from-cyan-500/10 to-transparent p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-cyan-500/15 p-1.5 text-cyan-600 dark:text-cyan-400">
                        <Radar className="size-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Visible</p>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground transition-all duration-300">{filteredNotifications.length}</p>
                  </div>
                  <div className="rounded-2xl border border-violet-500/15 bg-linear-to-br from-violet-500/10 to-transparent p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-violet-500/15 p-1.5 text-violet-600 dark:text-violet-400">
                        <ArrowUpRight className="size-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground transition-all duration-300">{displayTotal}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/15 bg-linear-to-br from-amber-500/10 to-transparent p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
                        <Filter className="size-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Filters</p>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground transition-all duration-300">{advancedFilterCount}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link
                  href={pathname.startsWith('/driver') ? '/driver/profile?tab=notifications' : '/profile?tab=notifications'}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  <Settings className="size-3.5" />
                  Preferences
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="h-8 gap-1.5 rounded-full border-border/50 bg-background/70 text-xs transition-all hover:-translate-y-0.5 hover:border-emerald-500/30"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteAllRead}
                  disabled={notifications.length === 0}
                  className="h-8 gap-1.5 rounded-full border-border/50 bg-background/70 text-xs text-muted-foreground transition-all hover:-translate-y-0.5"
                >
                  <Trash2 className="size-3.5" />
                  Clear read
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200/70 bg-red-50/80 p-3.5 text-red-600 shadow-sm dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400 animate-fade-in-up">
              <AlertCircle className="size-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Card className="border-border/50 bg-card/90 shadow-sm shadow-black/5 animate-fade-in-up [animation-delay:120ms]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)} className="w-full xl:w-auto">
                  <TabsList className="h-10 w-full rounded-2xl bg-muted/40 p-1.5 shadow-inner sm:w-auto">
                    <TabsTrigger value="all" className="rounded-xl px-3 text-xs font-semibold">
                      All
                      {displayTotal > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-5 rounded-md px-1.5 text-[10px]">
                          {displayTotal}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="rounded-xl px-3 text-xs font-semibold">
                      Unread
                      {unreadCount > 0 && (
                        <Badge className="ml-1.5 h-5 rounded-md bg-emerald-500 px-1.5 text-[10px]">
                          {unreadCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="read" className="rounded-xl px-3 text-xs font-semibold">
                      Read
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:flex-1 xl:justify-end">
                  <div className="relative w-full sm:flex-1 min-w-55">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 w-full rounded-2xl pl-9 text-sm transition-shadow focus-visible:ring-emerald-500/30"
                    />
                  </div>

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-2xl border-border/50 bg-background/70 px-3 text-xs transition-all hover:-translate-y-0.5 hover:border-emerald-500/30">
                        <Filter className="size-3.5" />
                        {category}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="bottom"
                      align="end"
                      sideOffset={6}
                      collisionPadding={12}
                      hideWhenDetached
                      className="z-40 max-h-72 w-52 overflow-y-auto rounded-2xl border-border/50 bg-card/95 p-1.5 shadow-xl"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={opt}
                          onClick={() => setCategory(opt)}
                          className={cn(
                            'my-0.5 min-h-10 justify-between rounded-lg px-3 py-2.5 text-sm leading-5 transition-colors hover:bg-accent/70 focus:bg-accent',
                            category === opt && 'bg-accent font-medium'
                          )}
                        >
                          {opt}
                          {opt !== 'All' && categoryCount[opt] && (
                            <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                              {categoryCount[opt]}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-2xl border-border/50 bg-background/70 px-3 text-xs transition-all hover:-translate-y-0.5 hover:border-emerald-500/30">
                        <Filter className="size-3.5" />
                        More filters
                        {advancedFilterCount > 0 && (
                          <Badge className="h-5 rounded-md bg-emerald-500 px-1.5 text-[10px] text-white">
                            {advancedFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 space-y-4 rounded-3xl border-border/50 bg-card/95 p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">Filter mode</p>
                          <p className="text-[11px] text-muted-foreground">Quick tabs, category, and advanced filters are separated now.</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                          onClick={clearAdvancedFilters}
                        >
                          Reset
                        </Button>
                      </div>

                      <div className="grid gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Time window</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 text-xs"
                          />
                          <TimePicker
                            format="time"
                            value={timeFrom}
                            onChange={setTimeFrom}
                            placeholder="Start time"
                            className="h-9 text-xs"
                          />
                          <TimePicker
                            format="time"
                            value={timeTo}
                            onChange={setTimeTo}
                            placeholder="End time"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Type</p>
                        <Select
                          value={typeFilter}
                          onValueChange={(value) => setTypeFilter(value as TypeFilter)}
                        >
                          <SelectTrigger className="h-9 w-full rounded-2xl text-xs">
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            align="end"
                            sideOffset={6}
                            collisionPadding={12}
                            hideWhenDetached
                            className="z-40 max-h-72 rounded-xl p-1.5"
                          >
                            <SelectItem value="all" className="my-0.5 min-h-9 py-2 leading-5">
                              All types
                            </SelectItem>
                            {typeOptions.map((type) => (
                              <SelectItem key={type} value={type} className="my-0.5 min-h-9 py-2 leading-5">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={metadataOnly ? 'default' : 'outline'}
                          className="h-9 rounded-2xl text-xs transition-all"
                          onClick={() => setMetadataOnly((v) => !v)}
                        >
                          Metadata only
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={broadcastOnly ? 'default' : 'outline'}
                          className="h-9 rounded-2xl text-xs transition-all"
                          onClick={() => setBroadcastOnly((v) => !v)}
                        >
                          Broadcast only
                        </Button>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/30 px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground">
                          {advancedFilterCount > 0 ? `${advancedFilterCount} filters active` : 'No advanced filters applied'}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs"
                          onClick={clearAdvancedFilters}
                        >
                          Clear all
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <Card className="overflow-hidden border-border/50 bg-card/90 shadow-sm shadow-black/5 animate-fade-in-up [animation-delay:220ms] flex flex-col max-h-[min(70vh,720px)]">
              <CardHeader className="border-b border-border/50 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Inbox feed</CardTitle>
                    <CardDescription>
                      Showing {filteredNotifications.length} of {displayTotal} notification{displayTotal !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="h-6 rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 text-[10px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                    {isLoading ? 'Refreshing' : 'Live'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto notification-scrollbar">
                {isLoading ? (
                  <NotificationLoadingState />
                ) : filteredNotifications.length === 0 ? (
                  <NotificationEmptyState />
                ) : (
                  <div className="divide-y divide-border/50">
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
              </CardContent>
            </Card>

            <Card className="hidden xl:flex flex-col border-border/50 bg-card/90 shadow-sm shadow-black/5 sticky top-6 animate-fade-in-up [animation-delay:300ms]">
              <CardHeader className="border-b border-border/50 py-4">
                <CardTitle className="text-sm uppercase tracking-[0.16em]">Summary</CardTitle>
                <CardDescription>
                  A quick read on inbox balance and category mix.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Unread</p>
                    <p className="mt-2 text-2xl font-black tracking-tight">{unreadCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Read</p>
                    <p className="mt-2 text-2xl font-black tracking-tight">{Math.max(displayTotal - unreadCount, 0)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Top categories</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">Based on the notifications currently loaded.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {topCategories.length > 0 ? (
                      topCategories.map(([name, count]) => (
                        <div key={name} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium text-foreground">{name}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500/80"
                              style={{ width: `${Math.max((count / Math.max(displayTotal, 1)) * 100, 8)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No category data yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className="h-8 rounded-full border-border/50 bg-background/70 text-xs"
                    >
                      <CheckCheck className="mr-1.5 size-3.5" />
                      Mark all read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteAllRead}
                      disabled={notifications.length === 0}
                      className="h-8 rounded-full border-border/50 bg-background/70 text-xs text-muted-foreground"
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      Clear read
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </NotificationErrorBoundary>
  );
}
