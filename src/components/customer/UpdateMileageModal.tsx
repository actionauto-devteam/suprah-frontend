import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateVehicleMileage, OwnedVehicle } from "@/lib/api/vehicles"
import { toast } from "sonner"

interface UpdateMileageModalProps {
    vehicle: OwnedVehicle | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UpdateMileageModal({ vehicle, isOpen, onOpenChange }: UpdateMileageModalProps) {
    const queryClient = useQueryClient()
    const [mileage, setMileage] = React.useState("")

    React.useEffect(() => {
        if (vehicle && isOpen) {
            setMileage(vehicle.currentMileage.toString())
        }
    }, [vehicle, isOpen])

    const mutation = useMutation({
        mutationFn: (newMileage: number) => updateVehicleMileage(vehicle!.id, newMileage),
        onSuccess: () => {
            toast.success("Mileage updated successfully!")
            queryClient.invalidateQueries({ queryKey: ["vehicles"] })
            onOpenChange(false)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to update mileage")
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!vehicle) return
        const num = Number(mileage)
        if (num < vehicle.currentMileage) {
            toast.error("New mileage cannot be lower than the current mileage.")
            return
        }
        mutation.mutate(num)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Update Odometer</DialogTitle>
                    <DialogDescription>
                        Enter the exact mileage shown on the dashboard of your {vehicle?.year} {vehicle?.make}.
                    </DialogDescription>, as
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Current Odometer (mi)</Label>
                        <Input
                            type="number"
                            required
                            min={vehicle?.currentMileage || 0}
                            value={mileage}
                            onChange={e => setMileage(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Updating..." : "Update Mileage"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
