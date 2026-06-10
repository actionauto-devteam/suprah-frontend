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
import { updateVehicle, uploadVehicleImage, OwnedVehicle } from "@/lib/api/vehicles"
import { toast } from "sonner"
import { CarFront, Loader2, Camera } from "lucide-react"
import { resolveImageUrl, cn } from "@/lib/utils"

interface EditVehicleModalProps {
    vehicle: OwnedVehicle | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditVehicleModal({ vehicle, isOpen, onOpenChange }: EditVehicleModalProps) {
    const queryClient = useQueryClient()
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const [color, setColor] = React.useState("")
    const [licensePlate, setLicensePlate] = React.useState("")
    const [trim, setTrim] = React.useState("")
    const [previewUrl, setPreviewUrl] = React.useState("")

    // Set initial values
    React.useEffect(() => {
        if (vehicle && isOpen) {
            setColor(vehicle.color || "")
            setLicensePlate(vehicle.licensePlate || "")
            setTrim(vehicle.trim || "")
            setPreviewUrl(resolveImageUrl(vehicle.images?.[0]) || "")
        }
    }, [vehicle, isOpen])

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            if (!vehicle?.id) throw new Error("No vehicle selected")
            return uploadVehicleImage(vehicle.id, file)
        },
        onSuccess: (updated) => {
            setPreviewUrl(resolveImageUrl(updated.images?.[0]) || "")
            queryClient.invalidateQueries({ queryKey: ["vehicles"] })
            toast.success("Photo updated!")
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to upload photo.")
        }
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file.")
            return
        }
        uploadMutation.mutate(file)
        e.target.value = ""
    }

    const editMutation = useMutation({
        mutationFn: async () => {
            if (!vehicle?.id) throw new Error("No vehicle selected")
            const payload: Partial<OwnedVehicle> = {
                color: color || undefined,
                licensePlate: licensePlate || undefined,
                trim: trim || undefined,
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
                        <Label>Vehicle Photo <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                        <div className="flex items-center gap-3">
                            <div className="h-16 w-24 rounded-xl overflow-hidden bg-muted border border-border/50 shrink-0 relative">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Vehicle" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                        <CarFront className="h-5 w-5 text-muted-foreground/30" />
                                    </div>
                                )}
                                {uploadMutation.isPending && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn("gap-1.5")}
                                disabled={uploadMutation.isPending}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="h-3.5 w-3.5" />
                                {previewUrl ? "Change Photo" : "Upload Photo"}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Upload a photo to customize how your car looks in your garage.</p>
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
