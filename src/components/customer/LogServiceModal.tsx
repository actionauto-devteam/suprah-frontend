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
import { logServiceEvent, ServiceRecord } from "@/lib/api/services";
import { OwnedVehicle } from "@/lib/api/vehicles";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface LogServiceModalProps {
    vehicle: OwnedVehicle | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LogServiceModal({
    vehicle,
    isOpen,
    onOpenChange,
}: LogServiceModalProps) {
    const queryClient = useQueryClient();
    const vehicleId = vehicle?.id || vehicle?._id || "";
    const [serviceType, setServiceType] =
        React.useState<ServiceRecord["serviceType"]>("OIL_CHANGE");
    const [date, setDate] = React.useState(
        new Date().toISOString().split("T")[0],
    );
    const [mileage, setMileage] = React.useState("");
    const [locationName, setLocationName] = React.useState("Jiffy Lube");
    const [cost, setCost] = React.useState("");
    const [notes, setNotes] = React.useState("");

    React.useEffect(() => {
        if (vehicle && isOpen) {
            setMileage(vehicle.currentMileage.toString());
        }
    }, [vehicle, isOpen]);

    const mutation = useMutation({
        mutationFn: (data: Omit<ServiceRecord, "_id">) => logServiceEvent(data),
        onSuccess: () => {
            toast.success("Service record logged successfully!");
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            if (vehicleId) {
                queryClient.invalidateQueries({
                    queryKey: ["serviceHistory", vehicleId],
                });
            }
            onOpenChange(false);
            setServiceType("OIL_CHANGE");
            setLocationName("Jiffy Lube");
            setCost("");
            setNotes("");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to log service");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleId) return;

        mutation.mutate({
            vehicleId,
            serviceType,
            date,
            mileageAtService: Number(mileage),
            locationName,
            cost: cost ? Number(cost) : undefined,
            notes,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25 max-h-[90dvh] overflow-y-auto custom-scrollbar">
                <DialogHeader>
                    <DialogTitle>Log Service Event</DialogTitle>
                    <DialogDescription>
                        Record maintenance for your {vehicle?.year} {vehicle?.make}{" "}
                        {vehicle?.model}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Service Type</Label>
                        <Select
                            value={serviceType}
                            onValueChange={(val: any) => setServiceType(val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OIL_CHANGE">Oil Change</SelectItem>
                                <SelectItem value="TIRES">Tires / Rotation</SelectItem>
                                <SelectItem value="BRAKES">Brakes</SelectItem>
                                <SelectItem value="INSPECTION">Inspection</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Date of Service</Label>
                        <Input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Odometer at Service (mi)</Label>
                        <Input
                            type="number"
                            required
                            min={vehicle?.currentMileage || 0}
                            value={mileage}
                            onChange={(e) => setMileage(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Location / Shop Name</Label>
                        <Input
                            required
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="e.g. Jiffy Lube - Lehi"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Cost ($){" "}
                            <span className="text-muted-foreground text-xs font-normal">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Notes{" "}
                            <span className="text-muted-foreground text-xs font-normal">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Swapped synthetic oil"
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Log Service"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
