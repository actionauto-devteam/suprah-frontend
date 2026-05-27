// Type definitions for car inventory and shipping quotes

export interface Vehicle {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
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
  featured?: boolean;
  engine?: string;
  videoUrl?: string;
  comments?: string;
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
  zipCode: string;
  units: number;
  fullAddress: string;
  enclosedTrailer: boolean;
  vehicleInoperable: boolean;
  fromZip: string;
  fromAddress: string;
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
