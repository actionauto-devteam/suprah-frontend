'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState, FieldRow } from '@/components/admin/primitives';
import { Activity, Building2, Truck, ArrowUpRight, UserRound } from 'lucide-react';

interface Detail {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationRole: string | null;
    isActive: boolean;
    avatar: string | null;
    phone: string | null;
    createdAt: string;
    lastLogin: string | null;
    onboardingCompleted: boolean;
    organization: { id: string; name: string; slug?: string; status: string } | null;
  };
  driverProfile: {
    verificationStatus: string;
    operationalStatus: string;
    profileCompletionScore: number;
    isComplianceExpired: boolean;
    documentCount: number;
  } | null;
  recentActivity: {
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
  }[];
}

const initials = (name?: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const fmtDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

const relative = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function UserDetailSheet({
  userId,
  onOpenChange,
}: {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data as Detail;
    },
    enabled: Boolean(userId),
  });

  return (
    <Sheet open={Boolean(userId)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-3 text-base">
            {isLoading ? (
              <Skeleton className="size-9 rounded-full" />
            ) : (
              <Avatar className="size-9">
                <AvatarImage src={data?.user.avatar || undefined} />
                <AvatarFallback className="text-xs">{initials(data?.user.name)}</AvatarFallback>
              </Avatar>
            )}
            <span className="min-w-0 truncate">
              {isLoading ? <Skeleton className="h-5 w-40" /> : data?.user.name}
            </span>
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {data && (
                <>
                  <span className="text-xs">{data.user.email}</span>
                  <StatusBadge
                    status={data.user.isActive ? 'active' : 'suspended'}
                    domain="activeStatus"
                  />
                </>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4">
            {isLoading ? (
              <>
                <Skeleton className="h-32 rounded-md" />
                <Skeleton className="h-40 rounded-md" />
              </>
            ) : !data ? (
              <EmptyState icon={UserRound} title="Could not load this user" />
            ) : (
              <>
                <div className="divide-y divide-border rounded-md border border-border px-3">
                  <FieldRow label="Platform role" value={data.user.role.replace(/_/g, ' ')} />
                  {data.user.organizationRole && (
                    <FieldRow label="Dealership role" value={data.user.organizationRole} />
                  )}
                  <FieldRow label="Phone" value={data.user.phone || undefined} />
                  <FieldRow label="Joined" value={fmtDate(data.user.createdAt) || undefined} />
                  <FieldRow label="Last sign-in" value={fmtDate(data.user.lastLogin) || undefined} />
                  <FieldRow
                    label="Onboarding"
                    value={data.user.onboardingCompleted ? 'Complete' : 'Incomplete'}
                  />
                </div>

                {data.user.organization && (
                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{data.user.organization.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {data.user.organization.slug}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={data.user.organization.status} domain="orgStatus" />
                    </div>
                  </div>
                )}

                {data.driverProfile && (
                  <div className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Driver profile</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                        <Link href={`/admin/drivers/${data.user.id}`}>
                          Open <ArrowUpRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={data.driverProfile.verificationStatus} domain="driverVerification" />
                      <StatusBadge status={data.driverProfile.operationalStatus} domain="driverOperational" />
                      <span className="text-xs text-muted-foreground">
                        {data.driverProfile.documentCount} documents ·{' '}
                        {data.driverProfile.profileCompletionScore}% complete
                      </span>
                    </div>
                    {data.driverProfile.isComplianceExpired && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        Compliance has expired for this driver.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent activity
                  </p>
                  {data.recentActivity.length === 0 ? (
                    <EmptyState icon={Activity} title="No recorded activity" className="py-8" />
                  ) : (
                    <div className="divide-y divide-border rounded-md border border-border">
                      {data.recentActivity.map((entry) => (
                        <div key={entry.id} className="px-3 py-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-sm">{entry.title}</p>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {relative(entry.createdAt)}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
