"use client"

import * as React from "react"
import {
  Loader2,
  UserX,
  MoreVertical,
  Pencil,
  Trash2,
  PowerOff,
  Power,
  KeyRound,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  UserMinus,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { apiClient } from "@/lib/api-client"
import { EditUserModal } from "@/components/crm/EditUserModal"
import { ResetPasswordModal } from "@/components/crm/ResetPasswordModal"
import { OffboardModal } from "@/components/crm/OffboardModal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmUserRow {
  _id: string
  fullName: string
  username: string
  email: string
  avatar?: string
  role: "employee" | "manager" | "admin"
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  birthday?: string
  hireDate?: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UsersTableProps {
  token: string
  refreshKey: number
}

type SortField = "fullName" | "username" | "role" | "status" | "createdAt"
type SortOrder = "asc" | "desc"
type RoleFilter = "all" | "employee" | "manager" | "admin"
type StatusFilter = "all" | "active" | "inactive"
type DateJoinedFilter = "all" | "7d" | "30d" | "90d" | "year"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ini(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    admin: {
      label: "Admin",
      className: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    },
    manager: {
      label: "Manager",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    employee: {
      label: "Employee",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
  }
  const cfg = map[role] ?? { label: role, className: "" }
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-5 px-2 rounded-full font-semibold capitalize ${cfg.className}`}
    >
      {cfg.label}
    </Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-5 px-2 rounded-full font-semibold ${isActive
          ? "bg-green-500/10 text-green-600 border-green-500/20"
          : "bg-red-500/8 text-red-500 border-red-500/20"
        }`}
    >
      <span
        className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-400"
          }`}
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )
}

function SortHeaderButton({
  label,
  field,
  activeSortBy,
  sortOrder,
  onSort,
}: {
  label: string
  field: SortField
  activeSortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
}) {
  const isActive = activeSortBy === field
  const SortIcon = isActive ? (sortOrder === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
    >
      {label}
      <SortIcon className="h-3 w-3" />
    </button>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as {
      response?: {
        data?: {
          message?: string
        }
      }
    }

    return response.response?.data?.message || fallback
  }

  return error instanceof Error ? error.message || fallback : fallback
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border/20 last:border-0">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-muted/40 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 rounded bg-muted/40 animate-pulse" />
            <div className="h-2 w-36 rounded bg-muted/30 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="h-2.5 w-24 rounded bg-muted/40 animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 w-16 rounded-full bg-muted/40 animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 w-14 rounded-full bg-muted/40 animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-2.5 w-20 rounded bg-muted/30 animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-6 w-6 rounded-lg bg-muted/30 animate-pulse" />
      </td>
    </tr>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsersTable({ token, refreshKey }: UsersTableProps) {
  const [users, setUsers] = React.useState<CrmUserRow[]>([])
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [actioningId, setActioningId] = React.useState<string | null>(null)
  const [editTarget, setEditTarget] = React.useState<CrmUserRow | null>(null)
  const [resetTarget, setResetTarget] = React.useState<CrmUserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CrmUserRow | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [offboardTarget, setOffboardTarget] = React.useState<CrmUserRow | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [dateJoinedFilter, setDateJoinedFilter] = React.useState<DateJoinedFilter>("all")
  const [sortBy, setSortBy] = React.useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const hasFilters =
    searchTerm.trim().length > 0 ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    dateJoinedFilter !== "all"

  const clearFilters = () => {
    setSearchTerm("")
    setRoleFilter("all")
    setStatusFilter("all")
    setDateJoinedFilter("all")
    setSortBy("createdAt")
    setSortOrder("desc")
    setPage(1)
    setPageSize(10)
  }

  const fetchUsers = React.useCallback(async (targetPage: number) => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: String(pageSize),
      sortBy,
      sortOrder,
    })

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim())
    }

    if (roleFilter !== "all") {
      params.set("role", roleFilter)
    }

    if (statusFilter !== "all") {
      params.set("status", statusFilter)
    }

    if (dateJoinedFilter !== "all") {
      params.set("dateJoined", dateJoinedFilter)
    }

    try {
      const res = await apiClient.get(`/api/crm/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = res.data?.data || res.data
      const nextUsers = data?.users || []
      const nextPagination = data?.pagination || {
        page: targetPage,
        limit: pageSize,
        total: data?.total || nextUsers.length,
        totalPages: Math.ceil((data?.total || nextUsers.length) / pageSize),
      }

      if (nextPagination.totalPages > 0 && targetPage > nextPagination.totalPages) {
        setPage(nextPagination.totalPages)
        return
      }

      setUsers(nextUsers)
      setPagination({
        page: nextPagination.page || targetPage,
        limit: nextPagination.limit || pageSize,
        total: nextPagination.total || nextUsers.length,
        totalPages:
          nextPagination.totalPages ||
          Math.ceil((nextPagination.total || nextUsers.length) / (nextPagination.limit || pageSize)),
      })
    } catch {
      setUsers([])
      setPagination({
        page: targetPage,
        limit: pageSize,
        total: 0,
        totalPages: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [token, pageSize, sortBy, sortOrder, searchTerm, roleFilter, statusFilter, dateJoinedFilter])

  React.useEffect(() => {
    fetchUsers(page)
  }, [fetchUsers, page, refreshKey])

  const handleSort = (field: SortField) => {
    setPage(1)
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortBy(field)
    setSortOrder("asc")
  }

  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)
  const totalPages = pagination.totalPages
  const pageButtons = React.useMemo(() => {
    if (totalPages <= 0) return []
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)
    const normalizedStart = Math.max(1, end - 4)

    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index)
  }, [page, totalPages])

  // ── Toggle active/inactive ──
  const handleToggleStatus = async (user: CrmUserRow) => {
    setActioningId(user._id)
    try {
      await apiClient.patch(
        `/api/crm/users/${user._id}/status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`${user.fullName} has been ${user.isActive ? "deactivated" : "reactivated"}.`)
      fetchUsers(page)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update status."))
    } finally {
      setActioningId(null)
    }
  }

  // ── Delete (confirmed via AlertDialog) ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/api/crm/users/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success(`${deleteTarget.fullName} has been deleted.`)
      setDeleteTarget(null)
      fetchUsers(page)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete user."))
    } finally {
      setDeleting(false)
    }
  }

  const isEmpty = !loading && users.length === 0
  const emptyMessage = hasFilters ? "No results found" : "No users found"
  const emptyDescription = hasFilters
    ? "Try adjusting the search, filters, or sort order."
    : "Create a new CRM account by clicking the button above."

  const renderUserActions = (u: CrmUserRow) => {
    if (actioningId === u._id) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground/40 hover:text-muted-foreground/70">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-lg border-border/40">
          <DropdownMenuItem
            onClick={() => setEditTarget(u)}
            className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            Edit User
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setResetTarget(u)}
            className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600">Reset Password</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleToggleStatus(u)}
            className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer"
          >
            {u.isActive ? (
              <>
                <PowerOff className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600">Deactivate</span>
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600">Reactivate</span>
              </>
            )}
          </DropdownMenuItem>

          {u.isActive && (
            <DropdownMenuItem
              onClick={() => setOffboardTarget(u)}
              className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer text-amber-600 focus:text-amber-600 focus:bg-amber-500/5"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Offboard
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={() => setDeleteTarget(u)}
            className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <div className="rounded-b-2xl border-t border-border/30 bg-background/40">
        <div className="px-5 py-4 border-b border-border/20 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground/50">
                Search, filter, sort, and page through CRM users.
              </p>
              <p className="text-[11px] text-muted-foreground/30 mt-0.5">
                Search by name, email, or employee ID.
              </p>
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                className="h-8 rounded-xl border border-border/40 text-xs font-semibold gap-2"
              >
                <Filter className="h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setPage(1)
                }}
                placeholder="Search users by name, email, or employee ID"
                className="h-9 rounded-xl border-border/40 bg-background/60 pl-9 text-xs"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as RoleFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background/60 text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background/60 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={dateJoinedFilter}
              onValueChange={(value) => {
                setDateJoinedFilter(value as DateJoinedFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background/60 text-xs">
                <SelectValue placeholder="Date joined" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any date</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border-border/40 bg-background/60 text-xs">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 md:hidden">
          {loading
            ? Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/35 bg-card/70 p-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted/40 animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-muted/40 animate-pulse" />
                    <div className="h-2.5 w-44 max-w-full rounded bg-muted/30 animate-pulse" />
                    <div className="h-6 w-28 rounded-lg bg-muted/30 animate-pulse" />
                  </div>
                </div>
              </div>
            ))
            : isEmpty
              ? (
                <div className="rounded-2xl border border-dashed border-border/35 px-5 py-12 text-center">
                  <UserX className="mx-auto h-7 w-7 text-muted-foreground/20" />
                  <p className="mt-3 text-sm font-semibold text-muted-foreground/50">
                    {emptyMessage}
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground/35">
                    {emptyDescription}
                  </p>
                </div>
              )
              : users.map((u) => (
                <div
                  key={u._id}
                  className="rounded-2xl border border-border/35 bg-card/80 p-4 shadow-xs transition-colors active:bg-muted/20"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback
                        className={`text-[10px] font-bold text-white ${u.role === "admin"
                            ? "bg-violet-500"
                            : u.role === "manager"
                              ? "bg-blue-500"
                              : "bg-emerald-600"
                          }`}
                      >
                        {ini(u.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight text-foreground">
                            {u.fullName}
                          </p>
                          <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground/60">
                            {u.email}
                          </p>
                        </div>
                        <div className="shrink-0">{renderUserActions(u)}</div>
                      </div>

                      <div className="mt-3 rounded-xl border border-border/35 bg-muted/20 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                          Employee ID
                        </p>
                        <p className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                          {u.username}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <RoleBadge role={u.role} />
                        <StatusBadge isActive={u.isActive} />
                        <span className="rounded-full border border-border/35 bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground/60">
                          Joined {formatDate(u.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/2">
                <th className="px-5 py-3 text-left">
                  <SortHeaderButton
                    label="User"
                    field="fullName"
                    activeSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-5 py-3 text-left">
                  <SortHeaderButton
                    label="Employee ID"
                    field="username"
                    activeSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-5 py-3 text-left">
                  <SortHeaderButton
                    label="Role"
                    field="role"
                    activeSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-5 py-3 text-left">
                  <SortHeaderButton
                    label="Status"
                    field="status"
                    activeSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-5 py-3 text-left">
                  <SortHeaderButton
                    label="Joined"
                    field="createdAt"
                    activeSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
                : isEmpty
                  ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-border/25 flex items-center justify-center mb-4">
                            <UserX className="h-6 w-6 text-muted-foreground/15" />
                          </div>
                          <p className="text-sm font-semibold text-muted-foreground/40">
                            {emptyMessage}
                          </p>
                          <p className="text-xs text-muted-foreground/25 mt-1 max-w-xs">
                            {emptyDescription}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : users.map((u) => (
                    <tr
                      key={u._id}
                      className="border-b border-border/20 last:border-0 hover:bg-muted/2.5 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback
                              className={`text-[9px] font-bold text-white ${u.role === "admin"
                                  ? "bg-violet-500"
                                  : u.role === "manager"
                                    ? "bg-blue-500"
                                    : "bg-emerald-600"
                                }`}
                            >
                              {ini(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">{u.fullName}</p>
                            <p className="text-[11px] text-muted-foreground/40 truncate mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-md">
                          {u.username}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge isActive={u.isActive} />
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-[11px] text-muted-foreground/40">
                          {formatDate(u.createdAt)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {renderUserActions(u)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground/30">
            {pagination.total === 0
              ? hasFilters
                ? "No results match the selected search and filters."
                : "No users available."
              : `Showing ${startItem}-${endItem} of ${pagination.total} users`}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-8 rounded-xl border border-border/40 px-3 text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>

            {pageButtons.length > 0 && pageButtons[0] > 1 && (
              <>
                <Button
                  type="button"
                  variant={pagination.page === 1 ? "default" : "ghost"}
                  size="sm"
                  disabled={loading}
                  onClick={() => setPage(1)}
                  className="h-8 min-w-8 rounded-xl border border-border/40 px-3 text-xs font-semibold"
                >
                  1
                </Button>
                <span className="px-1 text-xs text-muted-foreground/30">…</span>
              </>
            )}

            {pageButtons.map((buttonPage) => (
              <Button
                key={buttonPage}
                type="button"
                variant={pagination.page === buttonPage ? "default" : "ghost"}
                size="sm"
                disabled={loading}
                onClick={() => setPage(buttonPage)}
                className="h-8 min-w-8 rounded-xl border border-border/40 px-3 text-xs font-semibold"
              >
                {buttonPage}
              </Button>
            ))}

            {pageButtons.length > 0 && pageButtons[pageButtons.length - 1] < totalPages && (
              <>
                <span className="px-1 text-xs text-muted-foreground/30">…</span>
                <Button
                  type="button"
                  variant={pagination.page === totalPages ? "default" : "ghost"}
                  size="sm"
                  disabled={loading}
                  onClick={() => setPage(totalPages)}
                  className="h-8 min-w-8 rounded-xl border border-border/40 px-3 text-xs font-semibold"
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading || pagination.totalPages === 0}
              onClick={() => setPage((current) => current + 1)}
              className="h-8 rounded-xl border border-border/40 px-3 text-xs font-semibold gap-1.5"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <EditUserModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        token={token}
        user={editTarget}
        onUpdated={() => {
          setEditTarget(null)
          fetchUsers(page)
        }}
      />

      {/* Reset password modal */}
      <ResetPasswordModal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        token={token}
        user={resetTarget}
        onReset={() => setResetTarget(null)}
      />

      {/* Offboard modal */}
      <OffboardModal
        open={!!offboardTarget}
        onClose={() => setOffboardTarget(null)}
        token={token}
        user={offboardTarget}
        onOffboarded={() => {
          setOffboardTarget(null)
          fetchUsers(page)
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">Delete user?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/60 leading-relaxed">
              This will permanently delete <span className="font-semibold text-foreground">{deleteTarget?.fullName}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="h-9 rounded-xl text-xs font-semibold border-border/50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="h-9 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-600/20 gap-2"
            >
              {deleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</> : <><Trash2 className="h-3.5 w-3.5" /> Delete</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
