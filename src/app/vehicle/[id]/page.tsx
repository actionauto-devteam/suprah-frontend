"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { VehicleDetailView } from "@/components/inventory/VehicleDetailView"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Vehicle } from "@/types/inventory"
import { ContextualShell } from "@/components/layout/ContextualShell"
import { BookTestDriveModal } from "@/components/customer/BookTestDriveModal"

export default function VehiclePage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { isSignedIn, isLoaded: authLoaded } = useAuth()
    
    const [vehicle, setVehicle] = useState<Vehicle | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [bookingOpen, setBookingOpen] = useState(false)

    useEffect(() => {
        if (!authLoaded) return

        const fetchVehicle = async () => {
            try {
                setLoading(true)
                // Use authenticate fetch if signed in, otherwise public
                const res = isSignedIn 
                    ? await apiClient.getVehicle(id) 
                    : await apiClient.getPublicVehicle(id)

                const data = res.data?.data || res.data
                if (data) {
                    setVehicle(data)
                } else {
                    setError("Vehicle not found")
                }
            } catch (err: any) {
                console.error("Fetch error:", err)
                setError(err.response?.data?.message || "Failed to load vehicle details")
            } finally {
                setLoading(false)
            }
        }

        fetchVehicle()
    }, [id, authLoaded, isSignedIn])

    if (loading) {
        return (
            <ContextualShell hideNav hideThemeToggle logoText="SupraAi" logoIcon="S">
                <div className="max-w-7xl mx-auto p-6 space-y-8 animate-pulse">
                    <Skeleton className="h-12 w-64" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <Skeleton className="lg:col-span-8 aspect-video rounded-xl" />
                        <div className="lg:col-span-4 space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    </div>
                </div>
            </ContextualShell>
        )
    }

    if (error) {
        return (
            <ContextualShell hideNav hideThemeToggle logoText="SupraAi" logoIcon="S">
                <div className="min-h-[60vh] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-background p-8 rounded-2xl border shadow-lg text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Error</h1>
                            <p className="text-muted-foreground">{error}</p>
                        </div>
                        <Button onClick={() => router.back()} variant="outline" className="w-full">
                            Go Back
                        </Button>
                    </div>
                </div>
            </ContextualShell>
        )
    }

    if (!vehicle) return null

    return (
        <ContextualShell hideNav hideThemeToggle logoText="SupraAi" logoIcon="S">
            <div className="max-w-7xl mx-auto w-full p-4 lg:p-8">
                {/* Responsive Title Section */}
                <div className="mb-8 group">
                    <h1 className="text-3xl lg:text-5xl font-black tracking-tighter uppercase italic leading-none">
                        {vehicle.year} {vehicle.make} <span className="text-primary">{vehicle.model}</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-muted-foreground font-semibold">
                        <span className="uppercase tracking-widest text-sm">{vehicle.trim}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        <span className="text-sm">STK: {vehicle.stockNumber}</span>
                    </div>
                </div>

                <VehicleDetailView
                    vehicle={vehicle}
                    onInquiryClick={() => {}}
                    onApplyNow={() => {}}
                    onBookTestDrive={() => setBookingOpen(true)}
                    isPublic={!isSignedIn}
                />
            </div>

            <BookTestDriveModal
                isOpen={bookingOpen}
                onOpenChange={setBookingOpen}
                vehicle={vehicle}
            />
        </ContextualShell>
    )
}
