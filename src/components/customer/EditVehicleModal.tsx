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
import { updateVehicle, OwnedVehicle } from "@/lib/api/vehicles"
import { toast } from "sonner"
import { CarFront, Loader2 } from "lucide-react"

interface EditVehicleModalProps {
    vehicle: OwnedVehicle | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditVehicleModal({ vehicle, isOpen, onOpenChange }: EditVehicleModalProps) {
    const queryClient = useQueryClient()

    const [color, setColor] = React.useState("")
    const [licensePlate, setLicensePlate] = React.useState("")
    const [trim, setTrim] = React.useState("")
    const [imageUrl, setImageUrl] = React.useState("")

    // Set initial values
    React.useEffect(() => {
        if (vehicle && isOpen) {
            setColor(vehicle.color || "")
            setLicensePlate(vehicle.licensePlate || "")
            setTrim(vehicle.trim || "")
            setImageUrl(vehicle.images?.[0] || "")
        }
    }, [vehicle, isOpen])

    const editMutation = useMutation({
        mutationFn: async () => {
            if (!vehicle?.id) throw new Error("No vehicle selected")
            const payload: Partial<OwnedVehicle> = {
                color: color || undefined,
                licensePlate: licensePlate || undefined,
                trim: trim || undefined,
                images: imageUrl ? [imageUrl] : vehicle.images,
            }
            return updateVehicle(vehicle.id, payload)
        },
        onSuccess: () => {
            toast.success("Vehicle updated successfully!")
            queryClient.invalidateQueries({ queryKey: ["vehicles"] })
            onOpenChange(false)
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to update vehicle.")
        }
    })

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        editMutation.mutate()
    }

    if (!vehicle) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-112.5">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CarFront className="w-5 h-5" /> Edit Vehicle Details
                    </DialogTitle>
                    <DialogDescription>
                        Update your {vehicle.year} {vehicle.make} {vehicle.model}'s information. Keep your garage accurate and personalized.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Top Image URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                        <Input placeholder="https://example.com/car.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                        <p className="text-[10px] text-muted-foreground">Provide an image URL to customize how your car looks in your garage.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Color <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                            <Input placeholder="e.g. Silver" value={color} onChange={e => setColor(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>License Plate <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                            <Input className="uppercase" placeholder="e.g. ABC 123" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Trim / Series <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                        <Input placeholder="e.g. 2SS" value={trim} onChange={e => setTrim(e.target.value)} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={editMutation.isPending}>
                            {editMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {editMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
