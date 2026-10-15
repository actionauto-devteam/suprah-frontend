import { apiClient } from "@/lib/api-client"

// Vehicle condition reports: the driver's photos and damage notes for each
// vehicle at pickup and delivery, and the customer's signature at delivery.
// Mirrors suprah-backend src/constants/conditionReport.ts.

export type ConditionStop = "pickup" | "delivery"

export const CONDITION_AREA_LABELS: Record<string, string> = {
  front: "Front bumper",
  hood: "Hood",
  roof: "Roof",
  trunk: "Trunk",
  rear: "Rear bumper",
  left_front: "Left front",
  left_rear: "Left rear",
  right_front: "Right front",
  right_rear: "Right rear",
  glass: "Glass",
  wheels: "Wheels / tires",
  interior: "Interior",
}

export const CONDITION_DAMAGE_LABELS: Record<string, string> = {
  scratch: "Scratch",
  dent: "Dent",
  chip: "Chip",
  crack: "Crack",
  broken_or_missing: "Broken or missing part",
  other: "Other",
}

export interface ConditionPhoto {
  id: string
  url: string | null
  uploadedAt: string | null
}

export interface ConditionReport {
  id: string
  stop: ConditionStop
  vehicleIndex: number
  driverId?: string | null
  driverName?: string | null
  photos: ConditionPhoto[]
  damageAreas: string[]
  damageTypes: string[]
  note: string
  updatedAt: string | null
}

export interface DeliverySignature {
  signerName: string
  signedAt: string
  signatureDataUrl?: string
  driverName?: string
}

export interface MyConditionReport {
  loadNumber: string
  status: string
  editableStops: ConditionStop[]
  photosPerVehicle: number
  vehicles: Array<{ index: number; label: string; vin: string }>
  reports: ConditionReport[]
  signature: DeliverySignature | null
}

const conditionPath = (loadId: string) =>
  `/api/driver-tracking/loads/${encodeURIComponent(loadId)}/condition`

const auth = (token: string | null) => ({ headers: { Authorization: `Bearer ${token}` } })

export async function getMyConditionReport(loadId: string, token: string | null): Promise<MyConditionReport> {
  const res = await apiClient.get(conditionPath(loadId), auth(token))
  return res.data?.data
}

export async function addConditionPhoto(
  loadId: string,
  stop: ConditionStop,
  vehicleIndex: number,
  file: File,
  token: string | null,
): Promise<ConditionReport> {
  const form = new FormData()
  form.append("proof", file)
  const res = await apiClient.post(`${conditionPath(loadId)}/${stop}/${vehicleIndex}/photos`, form, auth(token))
  return res.data?.data
}

export async function removeConditionPhoto(
  loadId: string,
  stop: ConditionStop,
  vehicleIndex: number,
  photoId: string,
  token: string | null,
): Promise<ConditionReport | null> {
  const res = await apiClient.delete(
    `${conditionPath(loadId)}/${stop}/${vehicleIndex}/photos/${encodeURIComponent(photoId)}`,
    auth(token),
  )
  return res.data?.data ?? null
}

export async function saveConditionDetails(
  loadId: string,
  stop: ConditionStop,
  vehicleIndex: number,
  details: { damageAreas: string[]; damageTypes: string[]; note: string },
  token: string | null,
): Promise<ConditionReport> {
  const res = await apiClient.put(`${conditionPath(loadId)}/${stop}/${vehicleIndex}`, details, auth(token))
  return res.data?.data
}

export async function saveDeliverySignature(
  loadId: string,
  signature: { signerName: string; signatureDataUrl: string },
  token: string | null,
): Promise<{ signerName: string; signedAt: string }> {
  const res = await apiClient.put(`${conditionPath(loadId)}/signature`, signature, auth(token))
  return res.data?.data
}
