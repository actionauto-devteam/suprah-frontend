export interface LoadLocation {
  locationType?: string;
  companyName?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cellPhone?: string;
  phoneExt?: string;
  street?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  buyerReferenceNumber?: string;
  isTwicRequired?: boolean;
  notes?: string;
}

export interface LoadVehicleItem {
  vehicleId?: string;
  hasVin?: boolean;
  vin?: string;
  vehicleType?: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  condition: "Operable" | "Inoperable";
  oversized?: boolean;
  lotNumber?: string;
  licensePlate?: string;
  licenseState?: string;
  carrierNotes?: string;
  imageUrl?: string;
  /** Inspect step — per-vehicle condition photo, or a photo of a QR/tag */
  inspectionPhotoUrl?: string;
}

export interface LoadPricing {
  miles?: number;
  estimatedRate?: number;
  carrierPayAmount?: number;
  copCodAmount?: number;
  balanceAmount?: number;
}

export type LoadStatus =
  | "Draft"
  | "Posted"
  | "Assigned"
  | "Accepted"
  | "Picked Up"
  | "In-Transit"
  | "Delivered"
  | "Cancelled";

export interface Load {
  _id: string;
  organizationId: string;
  createdBy: string;
  loadNumber: string;
  postType: "load-board" | "assign-carrier";
  status: LoadStatus;
  trailerType: string;
  pickupLocation: LoadLocation;
  deliveryLocation: LoadLocation;
  vehicles: LoadVehicleItem[];
  dates?: {
    firstAvailable?: string;
    expirationDate?: string;
    pickupDeadline?: string;
    deliveryDeadline?: string;
    notes?: string;
  };
  pricing?: LoadPricing;
  additionalInfo?: {
    notes?: string;
    instructions?: string;
    visibility: "public" | "private";
    internalLoadId?: string;
    preDispatchNotes?: string;
    specialInstructions?: string;
    loadSpecificTerms?: string;
  };
  contract?: {
    agreedToTerms: boolean;
    signerName?: string;
    signatureDataUrl?: string | null;
    signedAt?: string;
  };
  /** Driver's own signature — separate from the dispatcher's `contract` above */
  driverContract?: {
    agreedToTerms: boolean;
    signerName?: string;
    signatureDataUrl?: string | null;
    signedAt?: string;
  };
  assignedDriverId?: string | {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string | null;
  };
  assignedAt?: string;
  acceptedAt?: string;
  driverAcceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  proofOfDelivery?: {
    imageUrl: string;
    submittedAt: string;
    note?: string;
    confirmedAt?: string;
    confirmedBy?: string;
  };
  createdAt: string;
  updatedAt: string;

  // Driver-specific response fields (injected by backend)
  myRequestStatus?: "pending" | "approved" | "rejected";
  myRequestedAt?: string;
  rejectionReason?: string;
}
