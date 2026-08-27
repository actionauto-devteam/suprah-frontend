"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTableColumnHeader } from "@/components/admin/DataTableColumnHeader";

export interface AdminDriver {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
  memberSince: string | null;
  applicationStatus: "pending" | "approved" | "rejected" | null;
  appliedAt: string | null;
  verificationStatus: string;
  profileCompletionScore: number;
  isComplianceExpired: boolean;
}

const getInitials = (name?: string) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

export const columns: ColumnDef<AdminDriver>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Driver" />,
    cell: ({ row }) => {
      const driver = row.original;
      return (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={driver.avatar || undefined} />
            <AvatarFallback className="text-[10px] font-bold">
              {getInitials(driver.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{driver.name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground truncate">{driver.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "applicationStatus",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Application" />,
    filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    cell: ({ row }) => {
      const status = row.original.applicationStatus;
      return (
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-200",
            status === "approved" && "bg-green-500/10 text-green-600 border-green-200",
            status === "rejected" && "bg-red-500/10 text-red-600 border-red-200",
          )}
        >
          {status || "—"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "verificationStatus",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Verification" />,
    filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.verificationStatus.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "profileCompletionScore",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Profile" />,
    cell: ({ row }) => (
      <span className="text-sm font-semibold tabular-nums">
        {row.original.profileCompletionScore}%
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "outline" : "destructive"}>
        {row.original.isActive ? "Active" : "Suspended"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link
        href={`/admin/drivers/${row.original.id}`}
        className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        View <ChevronRight className="size-3.5" />
      </Link>
    ),
  },
];
