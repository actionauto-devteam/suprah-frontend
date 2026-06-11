import { apiClient } from "../api-client";

export type ListingStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SOLD"
  | "WITHDRAWN";

export type PhotoSlot =
  | "FRONT"
  | "REAR"
  | "LEFT"
  | "RIGHT"
  | "INTERIOR_FRONT"
  | "INTERIOR_REAR"
  | "ENGINE_BAY"
  | "TRUNK"
  | "ODOMETER"
  | "EXTRA";

export interface ListingPhoto {
  slot: PhotoSlot;
  url: string;
}

export interface ListingStatusEvent {
  status: ListingStatus;
  at: string;
  note?: string;
}

export interface AuctionListing {
  id: string;
  _id: string;
  userId: string;
  ownedVehicleId?: string;
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  mileage?: number;
  transmission?: string;
  fuelType?: string;
  driveTrain?: string;
  engine?: string;
  exteriorColor?: string;
  interiorColor?: string;
  doors?: number;
  seats?: number;
  condition?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  titleStatus?: "CLEAN" | "SALVAGE" | "REBUILT" | "LIEN";
  ownersCount?: number;
  keysCount?: number;
  hasAccidentHistory: boolean;
  accidentNotes?: string;
  hasServiceHistory: boolean;
  knownIssues?: string;
  features: string[];
  askingPrice?: number;
  isNegotiable: boolean;
  description?: string;
  contactPreference: "APP" | "PHONE" | "EMAIL";
  photos: ListingPhoto[];
  status: ListingStatus;
  submittedAt?: string;
  withdrawnAt?: string;
  soldAt?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  statusHistory: ListingStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export type ListingCounts = Record<ListingStatus | "ALL", number>;

export type AuctionListingPayload = Partial<
  Omit<
    AuctionListing,
    | "id"
    | "_id"
    | "userId"
    | "photos"
    | "status"
    | "submittedAt"
    | "withdrawnAt"
    | "soldAt"
    | "rejectionReason"
    | "reviewedAt"
    | "statusHistory"
    | "createdAt"
    | "updatedAt"
  >
>;

export const NAMED_PHOTO_SLOTS: Exclude<PhotoSlot, "EXTRA">[] = [
  "FRONT",
  "REAR",
  "LEFT",
  "RIGHT",
  "INTERIOR_FRONT",
  "INTERIOR_REAR",
  "ENGINE_BAY",
  "TRUNK",
  "ODOMETER",
];

export const REQUIRED_PHOTO_SLOTS: PhotoSlot[] = [
  "FRONT",
  "REAR",
  "LEFT",
  "RIGHT",
  "INTERIOR_FRONT",
];

export const MAX_EXTRA_PHOTOS = 6;

export const PHOTO_SLOT_META: Record<
  PhotoSlot,
  { label: string; description: string; required: boolean }
> = {
  FRONT: { label: "Front", description: "Straight-on front view", required: true },
  REAR: { label: "Rear", description: "Straight-on rear view", required: true },
  LEFT: { label: "Left Side", description: "Full driver side", required: true },
  RIGHT: { label: "Right Side", description: "Full passenger side", required: true },
  INTERIOR_FRONT: { label: "Dashboard", description: "Front seats & dashboard", required: true },
  INTERIOR_REAR: { label: "Rear Seats", description: "Back seat area", required: false },
  ENGINE_BAY: { label: "Engine Bay", description: "Hood open, engine visible", required: false },
  TRUNK: { label: "Trunk", description: "Open cargo area", required: false },
  ODOMETER: { label: "Odometer", description: "Dash showing mileage", required: false },
  EXTRA: { label: "Extra", description: "Anything else worth showing", required: false },
};

export const STATUS_META: Record<
  ListingStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    dotClass: "bg-zinc-400",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    dotClass: "bg-red-500",
  },
  SOLD: {
    label: "Sold",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-500",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    badgeClass: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
    dotClass: "bg-zinc-400",
  },
};

const BASE = "/api/customer/auction-listings";

export const fetchListings = async (
  status?: ListingStatus,
): Promise<{ listings: AuctionListing[]; counts: ListingCounts }> => {
  const response = await apiClient.get(BASE, {
    params: status ? { status } : undefined,
  });
  return { listings: response.data.data, counts: response.data.counts };
};

export const fetchListing = async (id: string): Promise<AuctionListing> => {
  const response = await apiClient.get(`${BASE}/${id}`);
  return response.data.data;
};

export const createListing = async (
  payload: AuctionListingPayload,
): Promise<AuctionListing> => {
  const response = await apiClient.post(BASE, payload);
  return response.data.data;
};

export const updateListing = async (
  id: string,
  payload: AuctionListingPayload,
): Promise<AuctionListing> => {
  const response = await apiClient.put(`${BASE}/${id}`, payload);
  return response.data.data;
};

export const submitListing = async (id: string): Promise<AuctionListing> => {
  const response = await apiClient.post(`${BASE}/${id}/submit`);
  return response.data.data;
};

export const withdrawListing = async (id: string): Promise<AuctionListing> => {
  const response = await apiClient.post(`${BASE}/${id}/withdraw`);
  return response.data.data;
};

export const deleteListing = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/${id}`);
};

export const uploadListingPhoto = async (
  id: string,
  slot: PhotoSlot,
  file: File,
): Promise<AuctionListing> => {
  const formData = new FormData();
  formData.append("photo", file);
  const response = await apiClient.post(
    `${BASE}/${id}/photos/${slot}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data.data;
};

export const deleteListingPhoto = async (
  id: string,
  slot: PhotoSlot,
  url?: string,
): Promise<AuctionListing> => {
  const response = await apiClient.delete(`${BASE}/${id}/photos/${slot}`, {
    params: url ? { url } : undefined,
  });
  return response.data.data;
};

export const getListingTitle = (listing: AuctionListing) => {
  const parts = [listing.year, listing.make, listing.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Untitled Listing";
};

export const getListingPhoto = (listing: AuctionListing) => {
  const front = listing.photos.find((p) => p.slot === "FRONT");
  return front?.url || listing.photos[0]?.url;
};

export const formatPrice = (price?: number) =>
  price && price > 0
    ? price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : undefined;
