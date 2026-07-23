"use client"

import * as React from "react"
import {
  ArrowLeft, Loader2, Trash2, Eye, Users, Save, Star, Smartphone, Clock, MapPin,
  CalendarDays, History, Hash, UserPlus, Search, X, ShieldCheck, Radio,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { DEPT_COLOR_PALETTE, DEPT_COLOR_HEX, DepartmentEntry } from "@/lib/departments"

type DepartmentRow = DepartmentEntry & { _id: string }
type Member = {
  id: string
  source: "crm" | "user"
  name: string
  email: string
  avatar?: string
  role: string
  isActive: boolean
}
type CandidateUser = {
  _id: string
  fullName: string
  email: string
  avatar?: string
  role: string
  department?: string
}

interface DepartmentDetailPanelProps {
  token: string
  dept: DepartmentRow
  allDepartments: DepartmentRow[]
  onSaved: () => void
  onDeleted: () => void
  onBack: () => void
}

function formatRelative(iso?: string): string {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.floor(months / 12)} yr ago`
}

function formatDate(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export function DepartmentDetailPanel({ token, dept, allDepartments, onSaved, onDeleted, onBack }: DepartmentDetailPanelProps) {
  const [label, setLabel] = React.useState(dept.label)
  const [color, setColor] = React.useState(dept.color)
  const [isDefault, setIsDefault] = React.useState(!!dept.isDefault)
  const [isMobileMonitoringDept, setIsMobileMonitoringDept] = React.useState(dept.isMobileMonitoringDept)
  const [isTimeEditExempt, setIsTimeEditExempt] = React.useState(dept.isTimeEditExempt)
  const [isMandatoryLocationDept, setIsMandatoryLocationDept] = React.useState(dept.isMandatoryLocationDept)
  const [locationRequiredForTimeproof, setLocationRequiredForTimeproof] = React.useState(dept.locationRequiredForTimeproof !== false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isBusy, setIsBusy] = React.useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  const [members, setMembers] = React.useState<Member[] | null>(null)
  const [membersLoading, setMembersLoading] = React.useState(false)
  const [memberFilter, setMemberFilter] = React.useState("")
  const [confirmRemoveId, setConfirmRemoveId] = React.useState<string | null>(null)
  const [removingId, setRemovingId] = React.useState<string | null>(null)

  const [addOpen, setAddOpen] = React.useState(false)
  const [addSearch, setAddSearch] = React.useState("")
  const [candidates, setCandidates] = React.useState<CandidateUser[]>([])
  const [candidatesLoading, setCandidatesLoading] = React.useState(false)
  const [addingId, setAddingId] = React.useState<string | null>(null)

  const dirty =
    label.trim() !== dept.label ||
    color !== dept.color ||
    isDefault !== !!dept.isDefault ||
    isMobileMonitoringDept !== dept.isMobileMonitoringDept ||
    isTimeEditExempt !== dept.isTimeEditExempt ||
    isMandatoryLocationDept !== dept.isMandatoryLocationDept ||
    locationRequiredForTimeproof !== (dept.locationRequiredForTimeproof !== false)

  React.useEffect(() => {
    setLabel(dept.label)
    setColor(dept.color)
    setIsDefault(!!dept.isDefault)
    setIsMobileMonitoringDept(dept.isMobileMonitoringDept)
    setIsTimeEditExempt(dept.isTimeEditExempt)
    setIsMandatoryLocationDept(dept.isMandatoryLocationDept)
    setLocationRequiredForTimeproof(dept.locationRequiredForTimeproof !== false)
    setMembers(null)
    setMemberFilter("")
    setConfirmRemoveId(null)
    setDeleteModalOpen(false)
  }, [dept])

  const loadMembers = React.useCallback(async () => {
    setMembersLoading(true)
    try {
      const res = await apiClient.get(`/api/crm/departments/${dept._id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = res.data?.data || res.data
      setMembers(data?.members || [])
    } catch {
      toast.error("Failed to load members")
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [dept._id, token])

  React.useEffect(() => {
    if (addSearch.trim().length === 0) {
      setCandidates([])
      return
    }
    setCandidatesLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await apiClient.get("/api/crm/users", {
          params: { search: addSearch.trim(), limit: 8 },
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = res.data?.data || res.data
        const users: CandidateUser[] = (data?.users || []).filter((u: CandidateUser) => u.department !== dept.key)
        setCandidates(users)
      } catch {
        setCandidates([])
      } finally {
        setCandidatesLoading(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [addSearch, token, dept.key])

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Department name is required")
      return
    }
    setIsSaving(true)
    try {
      await apiClient.patch(`/api/crm/departments/${dept._id}`, {
        label: label.trim(),
        color,
        isDefault,
        isMobileMonitoringDept,
        isTimeEditExempt,
        isMandatoryLocationDept,
        locationRequiredForTimeproof,
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success("Department updated")
      onSaved()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save department")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsBusy(true)
    try {
      const res = await apiClient.delete(`/api/crm/departments/${dept._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = res.data?.data || res.data
      if (data?.deleted) {
        toast.success(`${dept.label} deleted`)
        onDeleted()
      } else {
        toast.message(`${dept.label} deactivated — ${data?.memberCount ?? "some"} member(s) still assigned`, {
          description: "Move everyone off it, then delete again to remove it for good.",
        })
        onSaved()
      }
    } catch {
      toast.error("Failed to delete department")
    } finally {
      setIsBusy(false)
      setDeleteModalOpen(false)
    }
  }

  const handleReactivate = async () => {
    setIsBusy(true)
    try {
      await apiClient.patch(`/api/crm/departments/${dept._id}`, { isActive: true }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success(`${dept.label} reactivated`)
      onSaved()
    } catch {
      toast.error("Failed to reactivate department")
    } finally {
      setIsBusy(false)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    if (confirmRemoveId !== member.id) {
      setConfirmRemoveId(member.id)
      return
    }
    setRemovingId(member.id)
    try {
      const res = await apiClient.patch(
        `/api/crm/departments/${dept._id}/members/${member.id}`,
        { source: member.source },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data?.data || res.data
      toast.success(`${member.name} ${data?.fallbackKey ? "moved to the default department" : "removed from department"}`)
      setMembers((prev) => (prev || []).filter((m) => m.id !== member.id))
      onSaved()
    } catch {
      toast.error("Failed to remove member")
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  const handleAddMember = async (candidate: CandidateUser) => {
    setAddingId(candidate._id)
    try {
      await apiClient.patch(`/api/crm/users/${candidate._id}`, { department: dept.key }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success(`${candidate.fullName} added to ${dept.label}`)
      setAddSearch("")
      setAddOpen(false)
      setCandidates([])
      if (members !== null) await loadMembers()
      onSaved()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add member")
    } finally {
      setAddingId(null)
    }
  }

  const position = allDepartments.findIndex((d) => d._id === dept._id) + 1
  const filteredMembers = React.useMemo(() => {
    if (!members) return null
    const q = memberFilter.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
  }, [members, memberFilter])

  const permissionCount = [isMobileMonitoringDept, isTimeEditExempt, isMandatoryLocationDept].filter(Boolean).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-border/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0 rounded-lg lg:hidden shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: DEPT_COLOR_HEX[color] ?? "#9ca3af" }} />
        <p className="text-sm font-bold truncate flex-1 min-w-0">{dept.label}</p>
        {isDefault && (
          <Badge variant="outline" className="text-[9px] h-5 px-1.5 rounded-full font-semibold gap-1 shrink-0">
            <Star className="h-2.5 w-2.5 fill-current" /> Default
          </Badge>
        )}
        {!dept.isActive && (
          <Badge variant="outline" className="text-[9px] h-5 px-1.5 rounded-full font-semibold text-muted-foreground/60 shrink-0">Inactive</Badge>
        )}
      </div>

      <Tabs
        defaultValue="overview"
        className="flex-1 min-h-0 flex flex-col"
        onValueChange={(v) => { if (v === "members" && members === null) loadMembers() }}
      >
        <div className="px-4 sm:px-6 pt-4">
          <TabsList>
            <TabsTrigger value="overview" className="text-xs px-3">Overview</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs px-3">Permissions</TabsTrigger>
            <TabsTrigger value="members" className="text-xs px-3">Members</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-border/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <Users className="h-3 w-3" />
                <p className="text-[10px] font-semibold uppercase tracking-wider">Members</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{dept.memberCount ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <Hash className="h-3 w-3" />
                <p className="text-[10px] font-semibold uppercase tracking-wider">Position</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{position} / {allDepartments.length}</p>
            </div>
            <div className="rounded-xl border border-border/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <CalendarDays className="h-3 w-3" />
                <p className="text-[10px] font-semibold uppercase tracking-wider">Created</p>
              </div>
              <p className="text-xs font-bold truncate" title={formatDate(dept.createdAt)}>{formatDate(dept.createdAt)}</p>
            </div>
            <div className="rounded-xl border border-border/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <History className="h-3 w-3" />
                <p className="text-[10px] font-semibold uppercase tracking-wider">Updated</p>
              </div>
              <p className="text-xs font-bold truncate" title={formatDate(dept.updatedAt)}>{formatRelative(dept.updatedAt)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              className="h-10 rounded-xl text-sm max-w-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Color</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {DEPT_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: DEPT_COLOR_HEX[c] }}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-muted-foreground/50">Preview</p>
                <Badge
                  className="text-[11px] h-6 px-2.5 rounded-full font-semibold border-0"
                  style={{ backgroundColor: `${DEPT_COLOR_HEX[color]}1A`, color: DEPT_COLOR_HEX[color] }}
                >
                  {label.trim() || "Department"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3 max-w-sm">
            <div>
              <p className="text-xs font-semibold">Default department</p>
              <p className="text-[11px] text-muted-foreground/60">New members with no department chosen land here automatically</p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3 max-w-sm">
            <div>
              <p className="text-xs font-semibold">Delete this department</p>
              <p className="text-[11px] text-muted-foreground/60">
                {dept.isActive
                  ? "Deletes instantly if empty, otherwise deactivates it until everyone's moved off."
                  : "Inactive — deleting now removes it permanently."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!dept.isActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={handleReactivate}
                  className="h-8 rounded-lg text-xs gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> Reactivate
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isBusy}
                onClick={() => setDeleteModalOpen(true)}
                className="h-8 rounded-lg text-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/30 p-3">
            <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              These settings apply department-wide and currently govern <span className="font-semibold text-foreground">{dept.memberCount ?? 0} member(s)</span> in {dept.label}.
              {" "}{permissionCount} of 3 toggles are active.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3 rounded-xl border border-border/50 p-3.5 hover:border-border transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Mobile Monitoring</p>
                <p className="text-[11px] text-muted-foreground/60">Uses GPS/stationary tracking instead of desktop screenshots</p>
              </div>
              <Switch checked={isMobileMonitoringDept} onCheckedChange={setIsMobileMonitoringDept} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/50 p-3.5 hover:border-border transition-colors">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Time-Edit Exempt</p>
                <p className="text-[11px] text-muted-foreground/60">Admins cannot correct this department&apos;s time logs</p>
              </div>
              <Switch checked={isTimeEditExempt} onCheckedChange={setIsTimeEditExempt} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/50 p-3.5 hover:border-border transition-colors">
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-rose-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Mandatory Location</p>
                <p className="text-[11px] text-muted-foreground/60">Location sharing is required for this department</p>
              </div>
              <Switch checked={isMandatoryLocationDept} onCheckedChange={setIsMandatoryLocationDept} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/50 p-3.5 hover:border-border transition-colors">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Radio className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Require Location for TimeProof</p>
                <p className="text-[11px] text-muted-foreground/60">Off = no location alerts, no auto-clockout — TimeProof works normally without location sharing</p>
              </div>
              <Switch checked={locationRequiredForTimeproof} onCheckedChange={setLocationRequiredForTimeproof} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="Filter members..."
                className="h-8 rounded-lg text-xs pl-8"
              />
            </div>
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" className="h-8 rounded-lg text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 rounded-xl p-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-muted-foreground/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    autoFocus
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="Search team members by name or email..."
                    className="h-8 rounded-lg text-xs pl-8 pr-7"
                  />
                  {addSearch && (
                    <button type="button" onClick={() => setAddSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto space-y-0.5">
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
                    </div>
                  ) : addSearch.trim().length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50 text-center py-6">Start typing to search your team</p>
                  ) : candidates.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50 text-center py-6">No matches, or they&apos;re already in this department</p>
                  ) : (
                    candidates.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        disabled={addingId === c._id}
                        onClick={() => handleAddMember(c)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60 text-left"
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={c.avatar} alt={c.fullName} />
                          <AvatarFallback className="text-[9px] font-semibold">{c.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{c.fullName}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">{c.email}</p>
                        </div>
                        {addingId === c._id && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
            </div>
          ) : !filteredMembers || filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-6 w-6 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-muted-foreground/70">
                {members && members.length > 0 ? "No members match your filter" : "No members in this department"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1">
              {filteredMembers.map((m) => (
                <div key={`${m.source}-${m.id}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-muted/40">
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar} alt={m.name} />
                      <AvatarFallback className="text-[10px] font-semibold">{m.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                      m.isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{m.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full font-semibold capitalize shrink-0">{m.role}</Badge>
                  <Button
                    type="button"
                    variant={confirmRemoveId === m.id ? "destructive" : "ghost"}
                    size="sm"
                    disabled={removingId === m.id}
                    onClick={() => handleRemoveMember(m)}
                    className="h-7 rounded-lg text-[11px] px-2 gap-1 shrink-0"
                  >
                    {removingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    {confirmRemoveId === m.id ? "Confirm" : "Remove"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border/30 bg-muted/20">
          <p className="text-[11px] text-muted-foreground/60">You have unsaved changes</p>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-2"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isBusy}
        variant="danger"
        title={`Delete ${dept.label}?`}
        description={
          dept.isActive
            ? `This deletes ${dept.label} instantly if no one's assigned to it. If members are still on it, it'll be deactivated instead — hidden from pickers until you move everyone off, at which point deleting again removes it for good.`
            : `${dept.label} is inactive. Deleting it now removes it permanently and cannot be undone.`
        }
        confirmText="Delete"
      />
    </div>
  )
}
