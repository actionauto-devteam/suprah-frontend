export interface Quote {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleId?: {
    _id: string;
    year: number;
    make: string;
    modelName: string;
    vin: string;
    stockNumber: string;
  };
  vehicleName?: string;
  vehicleImage?: string;
  vin?: string;
  stockNumber?: string;
  vehicleLocation?: string;
  fromZip: string;
  toZip: string;
  fromAddress: string;
  toAddress: string;
  units: number;
  enclosedTrailer: boolean;
  vehicleInoperable: boolean;
  miles: number;
  rate: number;
  eta: { min: number; max: number };
  status: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string | null;
  };
  organization?: {
    name: string;
    logoUrl?: string;
  };
}
