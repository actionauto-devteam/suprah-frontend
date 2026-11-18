export type CustomerAreaCode = "utah" | "utah_435" | "southern_utah" | "out_of_state" | "canada" | "outside_us"
export type CustomerAreaBasis = "zip" | "state" | "phone"

export interface CustomerArea {
  code: CustomerAreaCode
  basis: CustomerAreaBasis
  detail?: string
}

export type CustomerAreaFilter = "utah" | "utah_435" | "southern_utah" | "out_of_state" | "outside" | "none"

export const CUSTOMER_AREA_UNKNOWN_TEXT = "Can't tell from the address or phone number"

export const CUSTOMER_AREA_FILTER_OPTIONS: Array<{ value: CustomerAreaFilter; label: string; hint: string }> = [
  { value: "utah", label: "Utah", hint: "801 or 385 number, or a Utah address. ZIP codes starting with 847 are under Southern Utah." },
  { value: "utah_435", label: "Utah (435)", hint: "435 number and no address that shows where in Utah" },
  { value: "southern_utah", label: "Southern Utah", hint: "Address with a ZIP code starting with 847, such as St. George or Cedar City" },
  { value: "out_of_state", label: "Out of state", hint: "Address or area code from another state" },
  { value: "outside", label: "Canada or outside the US", hint: "Address or phone number from another country" },
  { value: "none", label: "No area info", hint: CUSTOMER_AREA_UNKNOWN_TEXT },
]

const AREA_LABELS: Record<CustomerAreaCode, string> = {
  utah: "Utah",
  utah_435: "Utah (435)",
  southern_utah: "Southern Utah",
  out_of_state: "Out of state",
  canada: "Canada",
  outside_us: "Outside US",
}

const MOVED_NOTE = "People keep their number when they move, so confirm with the customer."

function countryName(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code
  } catch {
    return code
  }
}

export function readCustomerArea(value: unknown): CustomerArea | null {
  if (!value || typeof value !== "object") return null
  const area = value as Partial<CustomerArea>
  if (typeof area.code !== "string" || !Object.prototype.hasOwnProperty.call(AREA_LABELS, area.code)) return null
  const basis: CustomerAreaBasis = area.basis === "zip" || area.basis === "state" ? area.basis : "phone"
  return { code: area.code, basis, detail: typeof area.detail === "string" ? area.detail : "" }
}

function shownDetail(area: CustomerArea): string {
  if (!area.detail) return ""
  return area.code === "outside_us" && area.basis === "phone" ? countryName(area.detail) : area.detail
}

export function customerAreaShortLabel(value: unknown): string {
  const area = readCustomerArea(value)
  return area ? AREA_LABELS[area.code] : ""
}

export function customerAreaLabel(value: unknown): string {
  const area = readCustomerArea(value)
  if (!area) return ""
  const label = AREA_LABELS[area.code]
  const detail = area.code === "out_of_state" || area.code === "outside_us" ? shownDetail(area) : ""
  return detail ? `${label} · ${detail}` : label
}

export function customerAreaHint(value: unknown): string {
  const area = readCustomerArea(value)
  if (!area) return ""
  const shown = shownDetail(area)
  const detail = shown ? ` (${shown})` : ""
  if (area.basis === "zip") {
    if (area.code === "southern_utah") {
      return `From the ZIP code in the address${detail}. This is the St. George and Cedar City side of Utah, far from Lehi and Orem.`
    }
    return area.code === "canada"
      ? `From the postal code in the address${detail}.`
      : `From the ZIP code in the address${detail}.`
  }
  if (area.basis === "state") return `From the address${detail}.`
  if (area.code === "utah_435") {
    return "Area code 435 covers Utah outside the Salt Lake and Provo areas, such as St. George, Logan, Park City and Moab. Ask the customer how far they are."
  }
  if (area.code === "canada") return `From the phone's area code${detail}, a Canadian number.`
  if (area.code === "outside_us") return `From the phone number's country${detail}.`
  return `From the phone's area code${detail}. ${MOVED_NOTE}`
}

export function customerAreaFilterLabel(value: string | null | undefined): string {
  return CUSTOMER_AREA_FILTER_OPTIONS.find((option) => option.value === value)?.label || ""
}

export function isCustomerAreaFilter(value: unknown): value is CustomerAreaFilter {
  return CUSTOMER_AREA_FILTER_OPTIONS.some((option) => option.value === value)
}
