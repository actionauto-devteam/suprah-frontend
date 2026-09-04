'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { columns, AdminDriver } from '@/app/(admin)/admin/drivers/columns';
import { DataTable } from '@/components/admin/data-table/DataTable';
import { DataTableFacetedFilter } from '@/components/admin/DataTableFacetedFilter';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldBan, ShieldCheck, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { runBulkSettled } from '@/lib/bulk-action-result';

const APPLICATION_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'No application', value: 'null' },
];

const VERIFICATION_OPTIONS = [
  { label: 'Not started', value: 'not_started' },
  { label: 'Under review', value: 'under_review' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Verified', value: 'verified' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'true' },
  { label: 'Suspended', value: 'false' },
];

const initials = (name?: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

export function DriverDirectoryPanel({
  data,
  isLoading,
  isError,
  error,
  refetch,
}: {
  data?: AdminDriver[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [bulkAction, setBulkAction] = React.useState<'suspend' | 'activate' | null>(null);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
  const [clearSelection, setClearSelection] = React.useState<(() => void) | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const runBulk = async () => {
    if (!bulkAction || pendingIds.length === 0) return;
    setBulkBusy(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      await runBulkSettled(
        pendingIds,
        (id) => apiClient.post(`/api/admin/users/${id}/${bulkAction}`, {}, { headers }),
        { verb: bulkAction === 'suspend' ? 'suspended' : 'activated', noun: 'driver' },
      );
      clearSelection?.();
      setBulkAction(null);
      refetch();
    } finally {
      setBulkBusy(false);
    }
  };

  if (isError) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : 'The driver directory request failed.'}
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <DataTable<AdminDriver>
        columns={columns as never}
        data={data || []}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        storageKey="drivers"
        searchPlaceholder="Search name or email…"
        searchFn={(row, term) =>
          row.name?.toLowerCase().includes(term) || row.email?.toLowerCase().includes(term)
        }
        emptyTitle="No drivers yet"
        emptyDescription="Invite a driver to get the first application moving."
        onRowClick={(row) => router.push(`/admin/drivers/${row.id}`)}
        filters={(table) => (
          <>
            <DataTableFacetedFilter
              column={table.getColumn('applicationStatus')}
              title="Application"
              options={APPLICATION_OPTIONS}
            />
            <DataTableFacetedFilter
              column={table.getColumn('verificationStatus')}
              title="Verification"
              options={VERIFICATION_OPTIONS}
            />
            <DataTableFacetedFilter
              column={table.getColumn('isActive')}
              title="Account"
              options={STATUS_OPTIONS}
            />
          </>
        )}
        bulkBar={(ids, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => { setPendingIds(ids); setClearSelection(() => clear); setBulkAction('activate'); }}
            >
              <ShieldCheck className="size-3.5" /> Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => { setPendingIds(ids); setClearSelection(() => clear); setBulkAction('suspend'); }}
            >
              <ShieldBan className="size-3.5" /> Suspend
            </Button>
          </>
        )}
        renderMobileRow={(driver) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={driver.avatar || undefined} />
              <AvatarFallback className="text-[11px]">{initials(driver.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{driver.name || 'Unknown'}</span>
                {driver.isComplianceExpired && (
                  <AlertTriangle className="size-3 shrink-0 text-red-500" />
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{driver.email}</p>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {driver.applicationStatus && (
                  <StatusBadge status={driver.applicationStatus} domain="driverApplication" />
                )}
                <StatusBadge status={driver.verificationStatus} domain="driverVerification" />
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        )}
      />

      <AlertDialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'suspend' ? 'Suspend' : 'Activate'} {pendingIds.length} driver
              {pendingIds.length === 1 ? '' : 's'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This takes effect immediately on the selected driver accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBulk} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
