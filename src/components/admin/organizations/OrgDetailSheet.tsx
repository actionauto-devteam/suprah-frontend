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
import { EmptyState } from '@/components/admin/primitives';
import { Users, Car, Mail, ArrowUpRight, Building2, Send } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationRole: string | null;
  isActive: boolean;
  avatar: string | null;
  joinedAt: string;
}

interface Detail {
  organization: {
    id: string;
    name: string;
    slug?: string;
    status: string;
    createdAt: string;
    subscription?: { tier?: string; status?: string } | null;
    contactEmail?: string | null;
    phone?: string | null;
  };
  members: Member[];
  counts: {
    members: number;
    vehicles: number;
    leads: number;
    pendingInvites: number;
    byRole: { role: string; count: number }[];
  };
}

const initials = (name?: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const fmtDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function OrgDetailSheet({
  orgId,
  onOpenChange,
}: {
  orgId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-org-detail', orgId],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get(`/api/admin/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data as Detail;
    },
    enabled: Boolean(orgId),
  });

  return (
    <Sheet open={Boolean(orgId)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-muted-foreground" />
            {isLoading ? <Skeleton className="h-5 w-40" /> : data?.organization.name}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {data && (
                <>
                  <StatusBadge status={data.organization.status} domain="orgStatus" />
                  {data.organization.subscription?.tier && (
                    <span className="text-xs capitalize text-muted-foreground">
                      {String(data.organization.subscription.tier).replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Since {fmtDate(data.organization.createdAt)}
                  </span>
                </>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4">
            {isLoading ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-md" />
                  ))}
                </div>
                <Skeleton className="h-40 rounded-md" />
              </>
            ) : !data ? (
              <EmptyState icon={Building2} title="Could not load this dealership" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Metric icon={Users} label="Members" value={data.counts.members} />
                  <Metric icon={Car} label="Vehicles" value={data.counts.vehicles} />
                  <Metric icon={Mail} label="Leads" value={data.counts.leads} />
                  <Metric icon={Send} label="Pending invites" value={data.counts.pendingInvites} />
                </div>

                {data.counts.byRole.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Roles
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.counts.byRole.map((row) => (
                        <span
                          key={row.role}
                          className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground"
                        >
                          {row.role.replace(/_/g, ' ')}
                          {' · '}
                          <span className="tabular-nums text-foreground">{row.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Members
                    </p>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                      <Link href="/admin/users">
                        All users <ArrowUpRight className="size-3" />
                      </Link>
                    </Button>
                  </div>

                  {data.members.length === 0 ? (
                    <EmptyState icon={Users} title="No members yet" className="py-8" />
                  ) : (
                    <div className="divide-y divide-border rounded-md border border-border">
                      {data.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-2.5 px-3 py-2">
                          <Avatar className="size-7 shrink-0">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback className="text-[10px]">{initials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{member.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <span className="shrink-0 text-xs capitalize text-muted-foreground">
                            {member.role.replace(/_/g, ' ')}
                          </span>
                          {!member.isActive && (
                            <StatusBadge status="suspended" domain="activeStatus" className="shrink-0" />
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
