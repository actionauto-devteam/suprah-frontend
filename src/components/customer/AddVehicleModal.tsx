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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decodeVin, DecodedVin } from "@/lib/api/vehicles";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Search, CarFront, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl, cn } from "@/lib/utils";

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
    const [entryMode, setEntryMode] = React.useState<"vin" | "inventory">("vin");
    const [vin, setVin] = React.useState("");
    const [decodedData, setDecodedData] = React.useState<DecodedVin | null>(null);

    // Inventory search state
    const [inventorySearch, setInventorySearch] = React.useState("");
    const [debouncedInventorySearch, setDebouncedInventorySearch] = React.useState("");

    // Step 2 State: Details
    const [mileage, setMileage] = React.useState("");
    const [color, setColor] = React.useState("");
    const [licensePlate, setLicensePlate] = React.useState("");

    // Reset when closed
    React.useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setEntryMode("vin");
            setVin("");
            setDecodedData(null);
            setInventorySearch("");
            setDebouncedInventorySearch("");
            setMileage("");
            setColor("");
            setLicensePlate("");
        }
    }, [isOpen]);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedInventorySearch(inventorySearch), 400);
        return () => clearTimeout(timer);
    }, [inventorySearch]);

    const { data: inventoryVehicles = [], isFetching: isLoadingInventory } = useQuery({
        queryKey: ["add-vehicle-inventory-search", debouncedInventorySearch],
        queryFn: async () => {
            const res = await apiClient.get("/api/vehicles/marketplace", {
                params: { search: debouncedInventorySearch, limit: 8, status: "all" },
            });
            const data = res.data?.data ?? res.data;
            return Array.isArray(data) ? data : (data?.vehicles ?? []);
        },
        enabled: isOpen && entryMode === "inventory",
    });

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

    const handleSelectInventoryVehicle = (v: any) => {
        if (!v.vin) {
            toast.error("This vehicle doesn't have a VIN on file and can't be added yet.");
            return;
        }
        setVin(String(v.vin).toUpperCase());
        setDecodedData({
            make: v.make,
            model: v.model,
            year: String(v.year),
            trim: v.trim || "",
            currentMileage: v.mileage || 0,
            color: v.exteriorColor || v.color || "",
            licensePlate: "",
        });
        setMileage(v.mileage ? String(v.mileage) : "");
        setColor(v.exteriorColor || v.color || "");
        setLicensePlate("");
        setStep(2);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-112.5 max-h-[90dvh] overflow-y-auto custom-scrollbar">
                {step === 1 ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CarFront className="w-5 h-5" /> Add a Vehicle
                            </DialogTitle>
                            <DialogDescription>
                                Add a vehicle by VIN, or pick one straight from our inventory.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "vin" | "inventory")} className="pt-2">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="vin" className="gap-1.5 text-xs">
                                    <Search className="h-3.5 w-3.5" /> VIN Lookup
                                </TabsTrigger>
                                <TabsTrigger value="inventory" className="gap-1.5 text-xs">
                                    <CarFront className="h-3.5 w-3.5" /> From Inventory
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="vin" className="mt-0">
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
                                        <p className="text-[10px] text-muted-foreground">
                                            We&apos;ll automatically pull your car&apos;s make, model, and trim.
                                        </p>
                                    </div>
                                    <div className="pt-2 flex justify-end gap-2">
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
                            </TabsContent>

                            <TabsContent value="inventory" className="mt-0">
                                <div className="space-y-3 pt-4">
                                    <div className="space-y-2">
                                        <Label>Search Inventory</Label>
                                        <Input
                                            placeholder="Search by make, model, or year..."
                                            value={inventorySearch}
                                            onChange={(e) => setInventorySearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                        {isLoadingInventory ? (
                                            <div className="flex items-center justify-center py-10">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : inventoryVehicles.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-center gap-1">
                                                <CarFront className="h-6 w-6 text-muted-foreground/30" />
                                                <p className="text-xs text-muted-foreground">No vehicles found.</p>
                                            </div>
                                        ) : (
                                            inventoryVehicles.map((v: any) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => handleSelectInventoryVehicle(v)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 rounded-xl border border-border/50 p-2.5 text-left transition-colors",
                                                        "hover:border-primary/40 hover:bg-primary/5",
                                                    )}
                                                >
                                                    <div className="h-12 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                                                        {(v.image || v.images?.[0]) ? (
                                                            <img
                                                                src={resolveImageUrl(v.image || v.images?.[0]) || ""}
                                                                alt={`${v.year} ${v.make} ${v.model}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center">
                                                                <CarFront className="h-5 w-5 text-muted-foreground/30" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold truncate">
                                                            {v.year} {v.make} {v.model}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground truncate">
                                                            {v.trim ? `${v.trim} · ` : ""}
                                                            {v.vin ? `VIN ${String(v.vin).slice(-6)}` : "No VIN on file"}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
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
