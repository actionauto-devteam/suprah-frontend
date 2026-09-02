export interface Vehicle {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  memberPrice?: number;
  memberSavings?: number;
  memberDiscountPercent?: number;
  tierName?: string;
  mileage: number;
  vin: string;
  image: string;
  location: string;
  color?: string;
  transmission?: string;
  fuelType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  status?: string;
  daysOnLot?: number;
  ageDays?: number;
  priceUpdatedAt?: string;
  leadCount?: number;
  images?: string[];
  bodyStyle?: string;
  driveTrain?: string;
  // Extended fields for dashboard view
  currentStep?: string;
  reconStartDate?: string;
  stepEnteredAt?: string;
  marketPrice?: number;
  cost?: number;
  notes?: Array<{
    text: string;
    author: {
      name: string;
      email: string;
    };
    date: string;
  }>;
  dateAdded?: string;
  dateSold?: string;
  featured?: boolean;
  certified?: boolean;
  isNewVehicle?: boolean;
  engine?: string;
  cylinders?: number;
  doors?: number;
  vehicleType?: string;
  options?: string;
  videoUrl?: string;
  comments?: string;
  dealerName?: string;
  dealerAddress?: string;
}

export interface FilterOptions {
  makes: string[];
  models: string[];
  statuses?: string[];
  years: number[];
  locations: string[];
  bodyStyles: string[];
  driveTrains: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InventoryResponse {
  vehicles: Vehicle[];
  total: number;
  pagination: Pagination;
}

export interface ShippingQuoteFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Legacy/generated route fields retained for compatibility with existing
  // Quote cards, APIs, reports, and historical records.
  fromZip: string;
  fromAddress: string;
  zipCode: string;
  fullAddress: string;

  // Structured Quote route fields.
  // Street is intentionally optional/recommended at Quote stage.
  fromLocationName: string;
  fromStreetAddress: string;
  fromCity: string;
  fromState: string;

  toLocationName: string;
  toStreetAddress: string;
  toCity: string;
  toState: string;

  units: number;
  enclosedTrailer: boolean;
  vehicleInoperable: boolean;
  vehicleId?: string;
}

export interface ShippingQuote {
  vehicleId: string;
  basePrice: number;
  enclosedTrailerFee: number;
  inoperableFee: number;
  totalPrice: number;
  estimatedDays: string;
}

export interface QuoteCalculation {
  quotes: Record<string, ShippingQuote>; // vehicleId -> ShippingQuote
  formData: ShippingQuoteFormData;
}