import * as React from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decodeVin, DecodedVin } from "@/lib/api/vehicles";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Search, CarFront, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AddVehicleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVehicleModal({
  isOpen,
  onOpenChange,
}: AddVehicleModalProps) {
  const queryClient = useQueryClient();

  // Step 1 State: Lookup
  const [step, setStep] = React.useState<1 | 2>(1);
  const [vin, setVin] = React.useState("");
  const [decodedData, setDecodedData] = React.useState<DecodedVin | null>(null);

  // Step 2 State: Details
  const [mileage, setMileage] = React.useState("");
  const [color, setColor] = React.useState("");
  const [licensePlate, setLicensePlate] = React.useState("");

  // Reset when closed
  React.useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setVin("");
      setDecodedData(null);
      setMileage("");
      setColor("");
      setLicensePlate("");
    }
  }, [isOpen]);

  // Mutation 1: Decode VIN
  const decodeMutation = useMutation({
    mutationFn: (vinCode: string) => decodeVin(vinCode),
    onSuccess: (data) => {
      setDecodedData(data);
      setMileage(
        data.currentMileage && data.currentMileage > 0
          ? String(data.currentMileage)
          : "",
      );
      setColor(data.color || "");
      setLicensePlate(data.licensePlate || "");
      setStep(2);
      toast.success("Vehicle found!");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Could not decode this VIN. Please check it and try again.",
      );
    },
  });

  // Mutation 2: Save Vehicle
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!decodedData) throw new Error("No vehicle data");
      const payload = {
        vin: vin.toUpperCase(),
        make: decodedData.make,
        model: decodedData.model,
        year: decodedData.year,
        trim: decodedData.trim || "",
        currentMileage: Number(mileage || 0),
        color: color || "",
        licensePlate: licensePlate || "",
      };
      return apiClient.post("/api/customer/vehicles", payload);
    },
    onSuccess: () => {
      toast.success("Vehicle added to your garage!");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save vehicle. You might have already added this VIN.",
      );
    },
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (vin.length !== 17) {
      toast.error("A standard VIN must be exactly 17 characters long.");
      return;
    }
    decodeMutation.mutate(vin.toUpperCase());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (mileage && isNaN(Number(mileage))) {
      toast.error("Please enter a valid odometer reading.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" /> Smart VIN Lookup
              </DialogTitle>
              <DialogDescription>
                Enter your 17-character Vehicle Identification Number to
                automatically securely pull your car's details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLookup} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Vehicle Identification Number (VIN)</Label>
                <Input
                  required
                  minLength={17}
                  maxLength={17}
                  className="uppercase font-mono text-lg tracking-widest"
                  placeholder="e.g. 1G1RC6E45EU123..."
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={decodeMutation.isPending || vin.length !== 17}
                >
                  {decodeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {decodeMutation.isPending ? "Decoding..." : "Search VIN"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CarFront className="w-5 h-5 text-green-600" /> Verify & Add
                Details
              </DialogTitle>
              <DialogDescription>
                We successfully decoded your vehicle! Please enter its current
                mileage to finish setup.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border flex flex-col items-center text-center">
                <h3 className="text-xl font-bold tracking-tight">
                  {decodedData?.year} {decodedData?.make} {decodedData?.model}
                </h3>
                {decodedData?.trim && (
                  <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
                    {decodedData.trim}
                  </p>
                )}
                <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none shrink-0 self-center">
                  VIN Verified
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Current Odometer (mi)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 45000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Color{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    placeholder="e.g. Silver"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    License Plate{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    className="uppercase"
                    placeholder="e.g. ABC 123"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {saveMutation.isPending ? "Saving..." : "Save to Garage"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
