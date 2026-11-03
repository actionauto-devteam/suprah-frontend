/**
 * The customer Shop's filters (decided 2026-11-02): read from the page address
 * (so the sidebar's Shop shortcuts and shared links work), sent to the
 * marketplace, and written back to the address. Only filters the marketplace
 * understands are sent; the search waits until the customer stops typing.
 */

export interface ShopFilters {
  search: string
  make?: string
  model?: string
  year?: number
  minPrice?: number
  maxPrice?: number
  minMileage?: number
  maxMileage?: number
  bodyStyle?: string
  location?: string
  sortBy: string
  sortOrder: string
}

const TEXT_KEYS = ["make", "model", "bodyStyle", "location"] as const
const NUMBER_KEYS = ["year", "minPrice", "maxPrice", "minMileage", "maxMileage"] as const

/** How long after the last keystroke the search runs. */
export const SHOP_SEARCH_DELAY_MS = 500

export const EMPTY_SHOP_FILTERS: ShopFilters = { search: "", sortBy: "", sortOrder: "" }

const readNumber = (value: string | null): number | undefined => {
  if (value == null || value.trim() === "") return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

/** The filters in a Shop address (unknown or empty values are left out). */
export function shopFiltersFromParams(params: URLSearchParams): ShopFilters {
  const filters: ShopFilters = {
    search: params.get("search")?.trim() ?? "",
    sortBy: params.get("sortBy")?.trim() ?? "",
    sortOrder: params.get("sortOrder")?.trim() ?? "",
  }
  for (const key of TEXT_KEYS) {
    const value = params.get(key)?.trim()
    if (value && value !== "all") filters[key] = value
  }
  for (const key of NUMBER_KEYS) {
    const value = readNumber(params.get(key))
    if (value !== undefined) filters[key] = value
  }
  return filters
}

/** The page and page size in a Shop address. */
export function shopPagingFromParams(params: URLSearchParams): { page: number; limit: number } {
  const page = Math.max(1, Math.floor(readNumber(params.get("page")) ?? 1))
  const limit = Math.min(100, Math.max(1, Math.floor(readNumber(params.get("limit")) ?? 12)))
  return { page, limit }
}

/** What's sent to the marketplace and written to the address, in a fixed order. */
export function shopQuery(filters: ShopFilters, page: number, limit: number): Record<string, string> {
  const query: Record<string, string> = { page: String(page), limit: String(limit) }
  const search = filters.search.trim()
  if (search) query.search = search
  for (const key of TEXT_KEYS) {
    const value = filters[key]?.trim()
    if (value && value !== "all") query[key] = value
  }
  for (const key of NUMBER_KEYS) {
    const value = filters[key]
    if (typeof value === "number" && Number.isFinite(value)) query[key] = String(value)
  }
  if (filters.sortBy) query.sortBy = filters.sortBy
  if (filters.sortOrder) query.sortOrder = filters.sortOrder
  return query
}

/** The same query as an address string ("page=1&limit=12&..."). */
export function shopQueryString(filters: ShopFilters, page: number, limit: number): string {
  return new URLSearchParams(shopQuery(filters, page, limit)).toString()
}
