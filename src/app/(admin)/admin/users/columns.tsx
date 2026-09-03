"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ShieldBan,
  ShieldCheck,
  UserCog,
  Trash2,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserProfile } from "@/types/user";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/admin/DataTableColumnHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface OrgOption {
  _id: string;
  name: string;
}

// Extend User type if needed for extra fields returned by admin API
export interface AdminUser extends UserProfile {
  isActive: boolean;
  organizationId?: any; // Populated with { _id, name }
}

// ─── Actions cell extracted as a proper component so we can use useState ───
function ActionsCell({ user }: { user: AdminUser }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const openOrgDialog = async () => {
    setOrgDialogOpen(true);
    setSelectedOrg(null);
    setOrgSearch("");
    setOrgsLoading(true);
    try {
      const token = await getToken();
      const res = await apiClient.get(`/api/admin/organizations?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrgOptions(res.data?.data?.organizations || []);
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setOrgsLoading(false);
    }
  };

  const filteredOrgs = orgOptions.filter((o) =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase()),
  );

  const handleAssignOrg = async () => {
    if (!selectedOrg) return;
    setIsAssigning(true);
    try {
      const token = await getToken();
      await apiClient.put(
        `/api/admin/users/${user._id}/organization`,
        { organizationId: selectedOrg._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`${user.name} assigned to ${selectedOrg.name}`);
      setOrgDialogOpen(false);
      refreshUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign organization");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSuspend = async () => {
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/admin/users/${user._id}/suspend`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("User suspended");
      refreshUsers();
    } catch {
      toast.error("Failed to suspend user");
    }
  };

  const handleActivate = async () => {
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/admin/users/${user._id}/activate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("User activated");
      refreshUsers();
    } catch {
      toast.error("Failed to activate user");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = await getToken();
      await apiClient.delete(`/api/admin/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`${user.name} has been deleted`);
      refreshUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(user._id)}
          >
            Copy User ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserCog className="mr-2 h-4 w-4" />
            Manage Roles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openOrgDialog}>
            <Building2 className="mr-2 h-4 w-4" />
            Assign Organization
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.isActive ? (
            <DropdownMenuItem onClick={handleSuspend} className="text-red-600">
              <ShieldBan className="mr-2 h-4 w-4" />
              Suspend User
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleActivate}>
              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
              Activate User
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{user.name}</strong>? This will remove their account from
              the database and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Organization</DialogTitle>
            <DialogDescription>
              Choose which dealership/organization <strong>{user.name}</strong> should belong to.
              {user.organizationId?.name && (
                <> Currently: <strong>{user.organizationId.name}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Search organizations..."
            value={orgSearch}
            onChange={(e) => setOrgSearch(e.target.value)}
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {orgsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrgs.length ? (
              filteredOrgs.map((org) => (
                <button
                  key={org._id}
                  onClick={() => setSelectedOrg(org)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    selectedOrg?._id === org._id ? "bg-muted font-medium" : ""
                  }`}
                >
                  {org.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No organizations found.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialogOpen(false)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button onClick={handleAssignOrg} disabled={!selectedOrg || isAssigning}>
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const columns: ColumnDef<AdminUser>[] = [
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge variant={role === "super_admin" ? "default" : "secondary"}>
          {role}
        </Badge>
      );
    },
  },
  {
    id: "organization",
    accessorFn: (row) => row.organizationId?.name ?? "",
    header: "Organization",
    cell: ({ row }) => {
      const org = row.original.organizationId;
      return org ? (
        <span className="text-sm">{org.name}</span>
      ) : (
        <span className="text-xs text-muted-foreground">None</span>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.isActive ? "active" : "suspended"}
        domain="activeStatus"
      />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell user={row.original} />,
  },
];
