"use client";

import * as React from "react";
import {
  X,
  MapPin,
  User,
  Mail,
  Phone,
  MapPinned,
  Package,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Vehicle, ShippingQuoteFormData } from "@/types/inventory";

interface ShippingQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onCalculate: (formData: ShippingQuoteFormData) => Promise<void>;
  defaultVehicle?: Vehicle | null;
  initialData?: Partial<ShippingQuoteFormData>;
}

export function ShippingQuoteModal({
  open,
  onOpenChange,
  vehicles = [],
  onCalculate,
  defaultVehicle,
  initialData,
}: ShippingQuoteModalProps) {
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(
    null,
  );
  const [formData, setFormData] = React.useState<ShippingQuoteFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: "",
    units: 1,
    fullAddress: "",
    enclosedTrailer: false,
    vehicleInoperable: false,
    fromZip: "",
    fromAddress: "",
  });

  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ShippingQuoteFormData, string>>
  >({});

  React.useEffect(() => {
    if (open) {
      if (defaultVehicle) {
        setSelectedVehicle(defaultVehicle);
      }
      if (initialData) {
        setFormData((prev) => ({
          ...prev,
          ...initialData,
        }));
      }
    }
  }, [open, vehicles, defaultVehicle, initialData]);

  // Auto-populate origin data when a vehicle is selected (or pre-selected)
  React.useEffect(() => {
    if (selectedVehicle) {
      const isOrem =
        selectedVehicle.location?.toUpperCase().includes("OREM") ||
        !selectedVehicle.location;

      setFormData((prev) => ({
        ...prev,
        // Only auto-populate if the field is currently empty or was previous default
        fromZip:
          !prev.fromZip || prev.fromZip === "84791"
            ? isOrem
              ? "84058"
              : prev.fromZip
            : prev.fromZip,
        fromAddress:
          !prev.fromAddress || prev.fromAddress === "123 Main St, Orem, UT"
            ? isOrem
              ? "Action Auto - Orem, UT"
              : selectedVehicle.location || prev.fromAddress
            : prev.fromAddress,
      }));

      setErrors((prev) => ({
        ...prev,
        fromZip: undefined,
        fromAddress: undefined,
      }));
    }
  }, [selectedVehicle]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingQuoteFormData, string>> = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Invalid phone number";
    }

    if (!formData.fromZip.trim()) {
      newErrors.fromZip = "Origin ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.fromZip)) {
      newErrors.fromZip = "Invalid ZIP code";
    }

    if (!formData.fromAddress.trim()) {
      newErrors.fromAddress = "Origin address is required";
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = "Destination ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = "Invalid ZIP code";
    }

    if (!formData.fullAddress.trim()) {
      newErrors.fullAddress = "Destination address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim all string values in formData before validation and submission
    const trimmedFormData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim().replace(/\s+/g, ""),
      zipCode: formData.zipCode.trim(),
      fullAddress: formData.fullAddress.trim(),
      fromZip: formData.fromZip.trim(),
      fromAddress: formData.fromAddress.trim(),
    };

    // Update local state with trimmed data so user sees it
    setFormData(trimmedFormData);

    if (!validateForm()) return;

    setIsCalculating(true);

    try {
      await onCalculate({
        ...trimmedFormData,
        vehicleId: selectedVehicle?.id,
      });
      onOpenChange(false);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        zipCode: "",
        units: 1,
        fullAddress: "",
        enclosedTrailer: false,
        vehicleInoperable: false,
        fromZip: "",
        fromAddress: "",
      });
      setSelectedVehicle(null);
      setErrors({});
    } catch (error) {
      console.error("Error submitting quote:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const updateField = (
    field: keyof ShippingQuoteFormData,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    setSelectedVehicle(vehicle || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-[4px]"
        className="max-w-[500px] max-h-[90vh] overflow-y-auto custom-scrollbar bg-card border-border text-card-foreground"
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="space-y-3 pb-4 border-b border-border">
          <div>
            <DialogTitle className="text-lg font-bold">
              Calculate Shipping Quote
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Get shipping quotes from your origin to destination
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Vehicle Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Package className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Vehicle Selection (Optional)
              </span>
            </div>

            {vehicles?.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                No vehicles available. Check console for details.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="vehicle" className="text-xs">
                Select Vehicle ({vehicles?.length || 0} available)
              </Label>
              <div className="relative">
                <select
                  id="vehicle"
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none pr-10"
                  onChange={(e) => handleVehicleSelect(e.target.value)}
                  value={selectedVehicle?.id || ""}
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} -{" "}
                      {vehicle.stockNumber}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {selectedVehicle && (
              <div className="bg-muted/50 p-3 rounded-lg border border-border">
                <div className="flex gap-3">
                  <div className="w-20 h-16 rounded overflow-hidden bg-muted">
                    <img
                      src={selectedVehicle.image}
                      alt={`${selectedVehicle.year} ${selectedVehicle.make}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-xs">
                    <p>
                      <strong>Stock:</strong> {selectedVehicle.stockNumber}
                    </p>
                    <p>
                      <strong>VIN:</strong> {selectedVehicle.vin}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedVehicle.location}
                    </p>
                    <p>
                      <strong>Price:</strong> $
                      {selectedVehicle.price?.toLocaleString() || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-3">
              <User className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Customer Information
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={errors.firstName ? "border-destructive" : ""}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={errors.lastName ? "border-destructive" : ""}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
                  placeholder="(555) 123-4567"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Shipping From */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-3">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-semibold">Shipping From</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fromZip" className="text-xs">
                  Origin ZIP Code
                </Label>
                <Input
                  id="fromZip"
                  value={formData.fromZip}
                  onChange={(e) => updateField("fromZip", e.target.value)}
                  className={errors.fromZip ? "border-destructive" : ""}
                  placeholder="84058"
                />
                {errors.fromZip && (
                  <p className="text-xs text-destructive">{errors.fromZip}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="units" className="text-xs">
                  Units
                </Label>
                <Input
                  id="units"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.units}
                  onChange={(e) =>
                    updateField("units", parseInt(e.target.value) || 1)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromAddress" className="text-xs">
                Full Origin Address
              </Label>
              <Input
                id="fromAddress"
                value={formData.fromAddress}
                onChange={(e) => updateField("fromAddress", e.target.value)}
                className={errors.fromAddress ? "border-destructive" : ""}
                placeholder="Action Auto - Orem, UT"
              />
              {errors.fromAddress && (
                <p className="text-xs text-destructive">{errors.fromAddress}</p>
              )}
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPinned className="w-4 h-4" />
              <span className="text-sm font-semibold">Destination</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-xs">
                Destination ZIP Code
              </Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => updateField("zipCode", e.target.value)}
                className={errors.zipCode ? "border-destructive" : ""}
                placeholder="90210"
              />
              {errors.zipCode && (
                <p className="text-xs text-destructive">{errors.zipCode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs">
                Full Destination Address
              </Label>
              <Input
                id="address"
                value={formData.fullAddress}
                onChange={(e) => updateField("fullAddress", e.target.value)}
                className={errors.fullAddress ? "border-destructive" : ""}
                placeholder="456 Oak St, Los Angeles, CA"
              />
              {errors.fullAddress && (
                <p className="text-xs text-destructive">{errors.fullAddress}</p>
              )}
            </div>
          </div>

          {/* Transport Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              <span className="text-sm font-semibold">Transport Options</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 bg-accent/30 p-3 rounded-lg border border-border">
                <Checkbox
                  id="enclosedTrailer"
                  checked={formData.enclosedTrailer}
                  onCheckedChange={(checked) =>
                    updateField("enclosedTrailer", checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="enclosedTrailer"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Enclosed Trailer
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extra protection for your vehicle (+40% cost)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-accent/30 p-3 rounded-lg border border-border">
                <Checkbox
                  id="vehicleInoperable"
                  checked={formData.vehicleInoperable}
                  onCheckedChange={(checked) =>
                    updateField("vehicleInoperable", checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="vehicleInoperable"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Vehicle is inoperable
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vehicle doesn&apos;t run or drive (+20% cost)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isCalculating}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isCalculating}>
              {isCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Calculate Quote"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
