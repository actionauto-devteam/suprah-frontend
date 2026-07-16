import type { ComponentType, CSSProperties } from "react";
import {
  MapPin, Building2, Warehouse, Car, Wrench, ParkingCircle,
  Fuel, Home, Store, Factory, Truck, Flag,
} from "lucide-react";

export const PLACE_ICON_PRESETS: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  MapPin, Building2, Warehouse, Car, Wrench, ParkingCircle,
  Fuel, Home, Store, Factory, Truck, Flag,
};

export const PLACE_ICON_NAMES = Object.keys(PLACE_ICON_PRESETS);
