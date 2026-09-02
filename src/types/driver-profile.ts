export type TrailerType =
  | "open_3car_wedge"
  | "open_2car"
  | "enclosed_2car"
  | "enclosed_3car"
  | "flatbed"
  | "hotshot"
  | "dually_flatbed"
  | "gooseneck"
  | "lowboy"
  | "step_deck"
  | "9car_stinger"
  | "7car_stinger"
  | "5car_open"
  | "rgn"
  | "double_drop"
  | "power_only"
  | "other";

export type OperationalStatus =
  | "active"
  | "on_leave"
  | "maintenance"
  | "terminated";

export type ComplianceDocumentType =
  | "drivers_license"
  | "medical_card"
  | "insurance_certificate"
  | "vehicle_registration"
  | "dot_inspection"
  | "w9_form"
  | "operating_authority"
  | "cargo_insurance"
  | "liability_insurance"
  | "other";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "in_progress"
  | "under_review"
  | "verified"
  // Legacy aliases retained during rolling deployment.
  | "not_started"
  | "rejected";

export interface ComplianceDocument {
  _id: string;
  type: ComplianceDocumentType;
  label: string;
  fileUrl: string;
  fileKey?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  expiresAt?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  reviewStatus?: ReviewStatus;
}

export type HitchType = "fifth_wheel" | "gooseneck" | "bumper_pull" | "pintle";

export interface DriverEquipment {
  trailerType: TrailerType;
  maxVehicleCapacity: number;
  truckMake: string;
  truckModel: string;
  truckYear?: number;
  trailerLength?: number;
  dotNumber: string;
  mcNumber: string;
  vin?: string;
  plateNumber?: string;
  truckColor?: string;
  gvwr?: number;
  trailerAxles?: number;
  trailerGvwr?: number;
  engineType?: string;
  trailerMake?: string;
  trailerModel?: string;
  trailerYear?: number;
  hitchType?: HitchType;
  specialFeatures: string[];
}

export interface DriverCompliance {
  driversLicenseNumber: string;
  licenseState: string;
  licenseExpirationDate?: string;
  medicalCardExpirationDate?: string;
  insuranceExpirationDate?: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  documents: ComplianceDocument[];
}

export interface DriverLogistics {
  operationalStatus: OperationalStatus;
  homeBase: {
    type: string;
    coordinates: number[];
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  serviceRadius: number;
  preferredRoutes: string[];
  availableDays: string[];
}

export interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface DriverProfile {
  _id: string;
  userId: string | PopulatedUser;
  organizationId?: string;

  // Driver Verification identity/contact snapshot.
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  trailerType: TrailerType;
  maxVehicleCapacity: number;
  truckMake: string;
  truckModel: string;
  truckYear?: number;
  trailerLength?: number;
  dotNumber: string;
  mcNumber: string;
  vin?: string;
  plateNumber?: string;
  truckColor?: string;
  gvwr?: number;
  trailerAxles?: number;
  trailerGvwr?: number;
  engineType?: string;
  trailerMake?: string;
  trailerModel?: string;
  trailerYear?: number;
  hitchType?: string;
  specialFeatures: string[];

  driversLicenseNumber: string;
  licenseState: string;
  licenseExpirationDate?: string;
  medicalCardExpirationDate?: string;
  insuranceExpirationDate?: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  documents: ComplianceDocument[];

  operationalStatus: OperationalStatus;
  homeBase: {
    type: string;
    coordinates: number[];
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  serviceRadius: number;
  preferredRoutes: string[];
  availableDays: string[];

  ssnLast4?: string;
  backgroundCheckConsent?: boolean;
  backgroundCheckConsentDate?: string;
  verificationAgreement?: boolean;
  verificationAgreementDate?: string;
  verificationStatus?: VerificationStatus;
  verificationNotes?: string;
  profileCompletionScore: number;
  isComplianceExpired: boolean;
  createdAt: string;
  updatedAt: string;

  complianceSummary?: {
    uploadedCount: number;
    totalRequired: number;
    percentage: number;
    missingTypes: string[];
  };
}

export interface AvailableLoad {
  _id: string;
  origin: string;
  destination: string;
  trackingNumber?: string;
  status: string;
  requestedPickupDate?: string;
  scheduledPickup?: string;
  scheduledDelivery?: string;
  trailerTypeRequired?: string;
  vehicleCount?: number;
  preservedQuoteData?: {
    firstName?: string;
    lastName?: string;
    vehicleName?: string;
    miles?: number;
    rate?: number;
    enclosedTrailer?: boolean;
    units?: number;
  };
  createdAt: string;
}