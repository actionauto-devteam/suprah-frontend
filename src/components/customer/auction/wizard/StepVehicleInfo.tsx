"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, CarFront, PencilLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { decodeVin, fetchOwnedVehicles } from "@/lib/api/vehicles";
import { cn } from "@/lib/utils";
import {
  WizardForm,
  FormPatch,
  BODY_STYLES,
  TRANSMISSIONS,
  FUEL_TYPES,
  DRIVETRAINS,
} from "./form";

type SourceMode = "garage" | "vin" | "manual";

const SOURCE_MODES: { key: SourceMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "garage", label: "From My Garage", icon: CarFront },
  { key: "vin", label: "VIN Lookup", icon: Search },
  { key: "manual", label: "Manual Entry", icon: PencilLine },
];

function SelectField({
  label,
  value,
  options,
  placeholder,
  required,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  required?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StepVehicleInfo({ form, patch }: { form: WizardForm; patch: FormPatch }) {
  const [mode, setMode] = React.useState<SourceMode>("manual");
  const [lookupVin, setLookupVin] = React.useState("");

  const { data: garageVehicles = [], isLoading: isLoadingGarage } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchOwnedVehicles,
    enabled: mode === "garage",
  });

  const decodeMutation = useMutation({
    mutationFn: decodeVin,
    onSuccess: (data, vinCode) => {
      patch({
        vin: vinCode,
        year: data.year || "",
        make: data.make || "",
        model: data.model || "",
        trim: data.trim || "",
        mileage: data.currentMileage && data.currentMileage > 0 ? String(data.currentMileage) : form.mileage,
        exteriorColor: data.color || form.exteriorColor,
        ownedVehicleId: "",
      });
      toast.success("Vehicle details filled from VIN");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Could not decode this VIN. Please check it and try again.");
    },
  });

  const handleLookup = () => {
    if (lookupVin.length !== 17) {
      toast.error("A standard VIN must be exactly 17 characters long.");
      return;
    }
    decodeMutation.mutate(lookupVin.toUpperCase());
  };

  const handlePickGarageVehicle = (id: string) => {
    const v = garageVehicles.find((g) => (g.id || g._id) === id);
    if (!v) return;
    patch({
      ownedVehicleId: id,
      vin: v.vin || "",
      year: v.year || "",
      make: v.make || "",
      model: v.model || "",
      trim: v.trim || "",
      mileage: v.currentMileage ? String(v.currentMileage) : "",
      exteriorColor: v.color || "",
    });
    toast.success(`${v.year} ${v.make} ${v.model} loaded from your garage`);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs">Where is this car coming from?</Label>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
          {SOURCE_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all",
                mode === m.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <m.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "garage" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Pick a vehicle from your garage</Label>
          {isLoadingGarage ? (
            <div className="flex items-center justify-center rounded-xl border border-border/50 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : garageVehicles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
              No vehicles in your garage yet. Use VIN lookup or manual entry instead.
            </p>
          ) : (
            <Select value={form.ownedVehicleId || undefined} onValueChange={handlePickGarageVehicle}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select one of your vehicles..." />
              </SelectTrigger>
              <SelectContent>
                {garageVehicles.map((v) => (
                  <SelectItem key={v.id || v._id} value={v.id || v._id}>
                    {v.year} {v.make} {v.model}
                    {v.trim ? ` ${v.trim}` : ""} · VIN {v.vin.slice(-6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {mode === "vin" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Vehicle Identification Number (VIN)</Label>
          <div className="flex gap-2">
            <Input
              maxLength={17}
              className="uppercase font-mono tracking-widest"
              placeholder="17-character VIN"
              value={lookupVin}
              onChange={(e) => setLookupVin(e.target.value.toUpperCase())}
            />
            <Button
              type="button"
              onClick={handleLookup}
              disabled={decodeMutation.isPending || lookupVin.length !== 17}
              className="shrink-0 gap-1.5"
            >
              {decodeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Decode
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            We&apos;ll automatically pull the make, model, year, and trim.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">
            VIN<span className="text-red-500"> *</span>
          </Label>
          <Input
            maxLength={17}
            className="uppercase font-mono tracking-widest"
            placeholder="17-character VIN"
            value={form.vin}
            onChange={(e) => patch({ vin: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Year<span className="text-red-500"> *</span>
          </Label>
          <Input
            type="number"
            min={1900}
            max={2100}
            placeholder="e.g. 2021"
            value={form.year}
            onChange={(e) => patch({ year: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Make<span className="text-red-500"> *</span>
          </Label>
          <Input placeholder="e.g. Toyota" value={form.make} onChange={(e) => patch({ make: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Model<span className="text-red-500"> *</span>
          </Label>
          <Input placeholder="e.g. Camry" value={form.model} onChange={(e) => patch({ model: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Trim</Label>
          <Input placeholder="e.g. XSE" value={form.trim} onChange={(e) => patch({ trim: e.target.value })} />
        </div>

        <SelectField
          label="Body Style"
          value={form.bodyStyle}
          options={BODY_STYLES}
          placeholder="Select body style"
          onChange={(v) => patch({ bodyStyle: v })}
        />

        <div className="space-y-1.5">
          <Label className="text-xs">
            Mileage (mi)<span className="text-red-500"> *</span>
          </Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 45000"
            value={form.mileage}
            onChange={(e) => patch({ mileage: e.target.value })}
          />
        </div>

        <SelectField
          label="Transmission"
          value={form.transmission}
          options={TRANSMISSIONS}
          placeholder="Select transmission"
          required
          onChange={(v) => patch({ transmission: v })}
        />

        <SelectField
          label="Fuel Type"
          value={form.fuelType}
          options={FUEL_TYPES}
          placeholder="Select fuel type"
          required
          onChange={(v) => patch({ fuelType: v })}
        />

        <SelectField
          label="Drivetrain"
          value={form.driveTrain}
          options={DRIVETRAINS}
          placeholder="Select drivetrain"
          onChange={(v) => patch({ driveTrain: v })}
        />

        <div className="space-y-1.5">
          <Label className="text-xs">Engine</Label>
          <Input
            placeholder="e.g. 2.5L 4-Cylinder"
            value={form.engine}
            onChange={(e) => patch({ engine: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Exterior Color<span className="text-red-500"> *</span>
          </Label>
          <Input
            placeholder="e.g. Silver"
            value={form.exteriorColor}
            onChange={(e) => patch({ exteriorColor: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Interior Color</Label>
          <Input
            placeholder="e.g. Black"
            value={form.interiorColor}
            onChange={(e) => patch({ interiorColor: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Doors</Label>
          <Input
            type="number"
            min={1}
            max={8}
            placeholder="e.g. 4"
            value={form.doors}
            onChange={(e) => patch({ doors: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Seats</Label>
          <Input
            type="number"
            min={1}
            max={15}
            placeholder="e.g. 5"
            value={form.seats}
            onChange={(e) => patch({ seats: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
