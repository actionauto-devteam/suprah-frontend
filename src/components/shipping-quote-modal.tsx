"use client";

import * as React from "react";
import {
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { STATE_ZIP_MAP, US_STATES } from "@/components/create-load/types";

interface ShippingQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onCalculate: (formData: ShippingQuoteFormData) => Promise<void>;
  defaultVehicle?: Vehicle | null;
  initialData?: Partial<ShippingQuoteFormData>;
}

type QuoteFieldImportance = "required" | "recommended" | "optional";

function QuoteFieldLabel({
  htmlFor,
  children,
  importance,
}: {
  htmlFor: string;
  children: React.ReactNode;
  importance: QuoteFieldImportance;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs flex items-center gap-1.5 flex-wrap"
    >
      <span>
        {children}
        {importance === "required" && (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {importance === "recommended" && (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
          Recommended
        </span>
      )}
      {importance === "optional" && (
        <span className="text-[9px] font-semibold text-muted-foreground/70">
          Optional
        </span>
      )}
    </Label>
  );
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
    fromLocationName: "",
    fromStreetAddress: "",
    fromCity: "",
    fromState: "",
    toLocationName: "",
    toStreetAddress: "",
    toCity: "",
    toState: "",
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

  // Auto-populate only reliable origin details from inventory.
  // Street stays empty unless we genuinely know it; do not invent one.
  React.useEffect(() => {
    if (!selectedVehicle) return;

    const locationText = String(selectedVehicle.location || "").trim();
    const isOrem =
      locationText.toUpperCase().includes("OREM") || !locationText;

    let inferredCity = "";
    let inferredState = "";

    const cityStateMatch = locationText.match(
      /(?:^|,\s*)([^,]+),\s*([A-Za-z]{2})\s*$/,
    );

    if (cityStateMatch) {
      inferredCity = cityStateMatch[1].trim();
      inferredState = cityStateMatch[2].toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      fromLocationName:
        prev.fromLocationName || (isOrem ? "Action Auto" : ""),
      fromCity: prev.fromCity || (isOrem ? "Orem" : inferredCity),
      fromState: prev.fromState || (isOrem ? "UT" : inferredState),
      fromZip:
        prev.fromZip || (isOrem ? "84058" : prev.fromZip),
    }));

    setErrors((prev) => ({
      ...prev,
      fromCity: undefined,
      fromState: undefined,
      fromZip: undefined,
    }));
  }, [selectedVehicle]);

  const formatRouteAddress = React.useCallback(
    (street: string, city: string, state: string) =>
      [street.trim(), [city.trim(), state.trim()].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(", "),
    [],
  );

  const validateForm = (
    candidate: ShippingQuoteFormData = formData,
  ): boolean => {
    const newErrors: Partial<Record<keyof ShippingQuoteFormData, string>> = {};

    if (!candidate.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!candidate.lastName.trim())
      newErrors.lastName = "Last name is required";

    if (!candidate.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!candidate.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10,}$/.test(candidate.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Invalid phone number";
    }

    if (!candidate.fromCity.trim())
      newErrors.fromCity = "Origin city is required";
    if (!candidate.fromState.trim())
      newErrors.fromState = "Origin state is required";
    if (!candidate.fromZip.trim()) {
      newErrors.fromZip = "Origin ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(candidate.fromZip)) {
      newErrors.fromZip = "Invalid ZIP code";
    }

    if (!candidate.toCity.trim())
      newErrors.toCity = "Destination city is required";
    if (!candidate.toState.trim())
      newErrors.toState = "Destination state is required";
    if (!candidate.zipCode.trim()) {
      newErrors.zipCode = "Destination ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(candidate.zipCode)) {
      newErrors.zipCode = "Invalid ZIP code";
    }

    // Street address is intentionally recommended, not blocking, at Quote
    // stage. It can be completed when the quote becomes a Load.
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFormData: ShippingQuoteFormData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim().replace(/\s+/g, ""),
      fromLocationName: formData.fromLocationName.trim(),
      fromStreetAddress: formData.fromStreetAddress.trim(),
      fromCity: formData.fromCity.trim(),
      fromState: formData.fromState.trim().toUpperCase(),
      fromZip: formData.fromZip.trim(),
      toLocationName: formData.toLocationName.trim(),
      toStreetAddress: formData.toStreetAddress.trim(),
      toCity: formData.toCity.trim(),
      toState: formData.toState.trim().toUpperCase(),
      zipCode: formData.zipCode.trim(),

      // Legacy fields are generated from the structured inputs and remain the
      // compatibility representation used by existing Quote screens.
      fromAddress: formatRouteAddress(
        formData.fromStreetAddress,
        formData.fromCity,
        formData.fromState,
      ),
      fullAddress: formatRouteAddress(
        formData.toStreetAddress,
        formData.toCity,
        formData.toState,
      ),
    };

    setFormData(trimmedFormData);

    if (!validateForm(trimmedFormData)) return;

    setIsCalculating(true);

    try {
      await onCalculate({
        ...trimmedFormData,
        vehicleId: selectedVehicle?.id,
      });
      onOpenChange(false);

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
        fromLocationName: "",
        fromStreetAddress: "",
        fromCity: "",
        fromState: "",
        toLocationName: "",
        toStreetAddress: "",
        toCity: "",
        toState: "",
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

  const updateRouteState = (
    side: "from" | "to",
    nextState: string,
  ) => {
    const nextZip = nextState ? STATE_ZIP_MAP[nextState] ?? "" : "";

    // State selection updates the REAL controlled ZIP value. Inventory or
    // initial-data hydration is untouched because this helper is called only
    // from the user's State dropdown interaction.
    setFormData((prev) =>
      side === "from"
        ? {
            ...prev,
            fromState: nextState,
            fromZip: nextZip,
          }
        : {
            ...prev,
            toState: nextState,
            zipCode: nextZip,
          },
    );

    setErrors((prev) =>
      side === "from"
        ? {
            ...prev,
            fromState: undefined,
            fromZip: undefined,
          }
        : {
            ...prev,
            toState: undefined,
            zipCode: undefined,
          },
    );
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    setSelectedVehicle(vehicle || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        overlayClassName="!z-[2147483000] bg-black/70 backdrop-blur-[4px]"
        className="!z-[2147483001] w-[calc(100vw-1rem)] max-w-[42rem] sm:w-[calc(100vw-2rem)] max-h-[min(calc(100dvh-1rem),52rem)] overflow-y-auto overscroll-contain custom-scrollbar bg-card border-border text-card-foreground p-3 sm:p-5 [scrollbar-gutter:stable]"
      >
        <DialogHeader className="space-y-3 pb-4 border-b border-border">
          <div>
            <DialogTitle className="text-lg font-bold">
              Calculate Shipping Quote
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Get shipping quotes from your origin to destination.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground mt-4">
          <span className="font-bold text-foreground">Field guide:</span>{" "}
          <span className="text-destructive font-bold">*</span> Required fields
          must be completed to calculate the quote. Recommended fields improve
          dispatch readiness but do not block quote creation.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Vehicle Selection */}
          <section className="rounded-2xl border border-border/70 bg-muted/[0.08] p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start gap-3 border-b border-border/50 pb-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">
                  Vehicle to Transport
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Optional inventory selection for this quote.
                </p>
              </div>
            </div>

            <div className="space-y-4">

            {vehicles?.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs text-yellow-800 dark:text-yellow-300">
                No vehicles available. Check console for details.
              </div>
            )}

            <div className="space-y-2">
              <QuoteFieldLabel htmlFor="vehicle" importance="optional">
                Select Vehicle ({vehicles?.length || 0} available)
              </QuoteFieldLabel>
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
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {selectedVehicle.image ? (
                      <img
                        src={selectedVehicle.image}
                        alt={`${selectedVehicle.year} ${selectedVehicle.make}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
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
          </section>

          {/* Customer Information */}
          <section className="rounded-2xl border border-border/70 bg-muted/[0.08] p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start gap-3 border-b border-border/50 pb-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-foreground">
                    Customer / Contact Information
                  </p>
                  <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Customer
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  These fields belong to the person requesting or receiving the quote.
                </p>
              </div>
            </div>

            <div className="space-y-4">

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="firstName" importance="required">
                  First Name
                </QuoteFieldLabel>
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
                <QuoteFieldLabel htmlFor="lastName" importance="required">
                  Last Name
                </QuoteFieldLabel>
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
              <QuoteFieldLabel htmlFor="email" importance="required">
                Email Address
              </QuoteFieldLabel>
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
              <QuoteFieldLabel htmlFor="phone" importance="required">
                Phone Number
              </QuoteFieldLabel>
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
          </section>

          {/* Route Information */}
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-muted/[0.05] shadow-sm">
            <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">
                    Route Information
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Pickup and delivery are separated below so the two locations are easy to distinguish.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {/* Shipping From */}
              <div className="space-y-4 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Pickup Location
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Where the vehicle is coming from
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Origin
                  </span>
                </div>

            <div className="space-y-2">
              <QuoteFieldLabel
                htmlFor="fromLocationName"
                importance="optional"
              >
                Location / Company Name
              </QuoteFieldLabel>
              <Input
                id="fromLocationName"
                value={formData.fromLocationName}
                onChange={(e) =>
                  updateField("fromLocationName", e.target.value)
                }
                placeholder="Action Auto"
              />
            </div>

            <div className="space-y-2">
              <QuoteFieldLabel
                htmlFor="fromStreetAddress"
                importance="recommended"
              >
                Street Address
              </QuoteFieldLabel>
              <Input
                id="fromStreetAddress"
                value={formData.fromStreetAddress}
                onChange={(e) =>
                  updateField("fromStreetAddress", e.target.value)
                }
                placeholder="1234 Main Street"
              />
              <p className="text-[11px] text-muted-foreground">
                Helpful for dispatch. If unknown, it can be completed when the
                quote becomes a Load.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_140px] gap-3">
              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="fromCity" importance="required">
                  City
                </QuoteFieldLabel>
                <Input
                  id="fromCity"
                  value={formData.fromCity}
                  onChange={(e) => updateField("fromCity", e.target.value)}
                  className={errors.fromCity ? "border-destructive" : ""}
                  placeholder="Orem"
                />
                {errors.fromCity && (
                  <p className="text-xs text-destructive">{errors.fromCity}</p>
                )}
              </div>

              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="fromState" importance="required">
                  State
                </QuoteFieldLabel>
                <select
                  id="fromState"
                  value={formData.fromState}
                  onChange={(e) => updateRouteState("from", e.target.value)}
                  className={`w-full h-10 px-3 py-2 text-sm rounded-md border bg-background ${
                    errors.fromState
                      ? "border-destructive"
                      : "border-input"
                  }`}
                >
                  <option value="">Select…</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.fromState && (
                  <p className="text-xs text-destructive">{errors.fromState}</p>
                )}
              </div>

              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="fromZip" importance="required">
                  ZIP Code
                </QuoteFieldLabel>
                <Input
                  id="fromZip"
                  value={formData.fromZip}
                  onChange={(e) => updateField("fromZip", e.target.value)}
                  className={errors.fromZip ? "border-destructive" : ""}
                  placeholder={
                    formData.fromState
                      ? STATE_ZIP_MAP[formData.fromState] ?? "84058"
                      : "84058"
                  }
                  inputMode="numeric"
                />
                {errors.fromZip && (
                  <p className="text-xs text-destructive">{errors.fromZip}</p>
                )}
              </div>
            </div>



            <div className="space-y-2">
              <QuoteFieldLabel htmlFor="units" importance="required">
                Units
              </QuoteFieldLabel>
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

              {/* Destination */}
              <div className="space-y-4 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPinned className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Delivery Location
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Where the vehicle is going
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Destination
                  </span>
                </div>

            <div className="space-y-2">
              <QuoteFieldLabel
                htmlFor="toLocationName"
                importance="optional"
              >
                Location / Company Name
              </QuoteFieldLabel>
              <Input
                id="toLocationName"
                value={formData.toLocationName}
                onChange={(e) =>
                  updateField("toLocationName", e.target.value)
                }
                placeholder="Auction, dealership, customer, etc."
              />
            </div>

            <div className="space-y-2">
              <QuoteFieldLabel
                htmlFor="toStreetAddress"
                importance="recommended"
              >
                Street Address
              </QuoteFieldLabel>
              <Input
                id="toStreetAddress"
                value={formData.toStreetAddress}
                onChange={(e) =>
                  updateField("toStreetAddress", e.target.value)
                }
                placeholder="456 Oak Street"
              />
              <p className="text-[11px] text-muted-foreground">
                Recommended for dispatch, but not required to calculate the
                quote.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_140px] gap-3">
              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="toCity" importance="required">
                  City
                </QuoteFieldLabel>
                <Input
                  id="toCity"
                  value={formData.toCity}
                  onChange={(e) => updateField("toCity", e.target.value)}
                  className={errors.toCity ? "border-destructive" : ""}
                  placeholder="Los Angeles"
                />
                {errors.toCity && (
                  <p className="text-xs text-destructive">{errors.toCity}</p>
                )}
              </div>

              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="toState" importance="required">
                  State
                </QuoteFieldLabel>
                <select
                  id="toState"
                  value={formData.toState}
                  onChange={(e) => updateRouteState("to", e.target.value)}
                  className={`w-full h-10 px-3 py-2 text-sm rounded-md border bg-background ${
                    errors.toState ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select…</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.toState && (
                  <p className="text-xs text-destructive">{errors.toState}</p>
                )}
              </div>

              <div className="space-y-2">
                <QuoteFieldLabel htmlFor="zipCode" importance="required">
                  ZIP Code
                </QuoteFieldLabel>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  className={errors.zipCode ? "border-destructive" : ""}
                  placeholder={
                    formData.toState
                      ? STATE_ZIP_MAP[formData.toState] ?? "90210"
                      : "90210"
                  }
                  inputMode="numeric"
                />
                {errors.zipCode && (
                  <p className="text-xs text-destructive">{errors.zipCode}</p>
                )}
              </div>
            </div>


          </div>
            </div>
          </section>

          {/* Transport Options */}
          <section className="rounded-2xl border border-border/70 bg-muted/[0.08] p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start gap-3 border-b border-border/50 pb-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">
                  Transport Options
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  These choices apply to the overall shipment, not to a specific location.
                </p>
              </div>
            </div>

            <div className="space-y-4">

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
                    <span className="ml-1.5 text-[9px] font-semibold text-muted-foreground/70">
                      Optional
                    </span>
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
                    <span className="ml-1.5 text-[9px] font-semibold text-muted-foreground/70">
                      Optional
                    </span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vehicle doesn&apos;t run or drive (+20% cost)
                  </p>
                </div>
              </div>
            </div>
          </div>
          </section>

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