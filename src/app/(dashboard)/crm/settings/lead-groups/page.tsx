"use client"

import * as React from "react"
import { Users, Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCrmLeadGroups, type CrmLeadGroup } from "@/hooks/useCrmLeadGroups"
import { useTeamMembers } from "@/hooks/useTeamPulse"

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

function GroupForm({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial?: CrmLeadGroup
  onCancel: () => void
  onSave: (payload: { name: string; description?: string; memberIds: string[] }) => Promise<void>
  saving: boolean
}) {
  const { data: teamMembers } = useTeamMembers()
  const [name, setName] = React.useState(initial?.name || "")
  const [description, setDescription] = React.useState(initial?.description || "")
  const [memberIds, setMemberIds] = React.useState<string[]>(initial?.memberIds || [])
  const [memberSearch, setMemberSearch] = React.useState("")
  const [error, setError] = React.useState("")

  const filteredMembers = React.useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return teamMembers || []
    return (teamMembers || []).filter((member) => member.name.toLowerCase().includes(query))
  }, [teamMembers, memberSearch])

  const toggleMember = (id: string) => {
    setMemberIds((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Group name is required")
      return
    }
    setError("")
    try {
      await onSave({ name: name.trim(), description: description.trim(), memberIds })
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this group."))
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{initial ? "Edit group" : "New group"}</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Group name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Online Team"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Members</label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search by name"
              className="w-full rounded-lg border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
            {filteredMembers.map((member) => (
              <label
                key={member._id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={memberIds.includes(member._id)}
                  onChange={() => toggleMember(member._id)}
                  className="h-4 w-4 rounded border-border"
                />
                {member.name}
              </label>
            ))}
            {(!teamMembers || teamMembers.length === 0) && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No team members found.</p>
            )}
            {teamMembers && teamMembers.length > 0 && filteredMembers.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No members match &quot;{memberSearch}&quot;.</p>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeadGroupsSettingsPage() {
  const {
    groups,
    isLoading,
    createGroup,
    isCreatingGroup,
    updateGroup,
    isUpdatingGroup,
    deleteGroup,
  } = useCrmLeadGroups()

  const [creating, setCreating] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-emerald-500" />
          Lead Groups
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Named teams (like &quot;Online Team&quot; or &quot;Sales Team&quot;) that can be @mentioned on internal lead notes — by
          reps, or by the AI Agent when a lead has no assigned rep and a fallback group is configured.
        </p>
      </div>

      {!creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          New group
        </button>
      )}

      {creating && (
        <GroupForm
          saving={isCreatingGroup}
          onCancel={() => setCreating(false)}
          onSave={async (payload) => {
            await createGroup(payload)
            setCreating(false)
          }}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) =>
            editingId === group._id ? (
              <GroupForm
                key={group._id}
                initial={group}
                saving={isUpdatingGroup}
                onCancel={() => setEditingId(null)}
                onSave={async (payload) => {
                  await updateGroup({ id: group._id, ...payload })
                  setEditingId(null)
                }}
              />
            ) : (
              <div key={group._id} className="flex items-center justify-between rounded-xl border bg-card p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {group.memberIds.length} member{group.memberIds.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(group._id)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteGroup(group._id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ),
          )}
          {groups.length === 0 && !creating && (
            <p className="py-6 text-center text-sm text-muted-foreground">No lead groups yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
