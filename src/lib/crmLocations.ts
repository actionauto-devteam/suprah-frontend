export type CrmLocationStatus = "active" | "archived"

export interface CrmLocation {
  id: string
  code: string
  name: string
  aliases: string[]
  status: CrmLocationStatus
  archivedAt?: string
  revision: number
  createdByName?: string
  updatedByName?: string
  createdAt: string
  updatedAt: string
}

export interface CrmLocationList {
  locations: CrmLocation[]
  counts: { active: number; archived: number; total: number }
  limits: { perOrg: number; aliases: number; name: number; alias: number; code: number }
  canManage: boolean
}

export interface CrmLocationHistoryEntry {
  id: string
  action: "created" | "updated" | "archived" | "restored"
  revision: number
  before?: { name: string; aliases: string[]; status: CrmLocationStatus }
  after: { code?: string; name: string; aliases: string[]; status: CrmLocationStatus }
  actorName?: string
  actorRole?: string
  createdAt: string
}

export interface CrmLocationSuggestion {
  key: string
  label: string
  variants: string[]
  leadCount: number
  vehicleCount: number
  inReviewLinks: boolean
  usable: boolean
  mapped: { id: string; name: string; code: string; status: CrmLocationStatus } | null
}

export interface CrmLocationIssue {
  field: string
  code: string
  message: string
}

export const LOCATION_HISTORY_LABELS: Record<CrmLocationHistoryEntry["action"], string> = {
  created: "Created",
  updated: "Edited",
  archived: "Archived",
  restored: "Restored",
}

export function normalizeLocationKey(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function suggestLocationCode(name: string): string {
  return normalizeLocationKey(name).replace(/ /g, "-").slice(0, 40).replace(/-+$/, "")
}

export function locationKeys(location: Pick<CrmLocation, "code" | "name" | "aliases">): string[] {
  return Array.from(new Set([location.name, location.code, ...location.aliases].map(normalizeLocationKey).filter(Boolean)))
}
