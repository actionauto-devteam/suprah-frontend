"use client"

import { useState, useEffect } from "react"
import { Car, Loader2, Plus } from "lucide-react"
import { useOrg } from "@/hooks/useOrg"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function OrgSelectionPage() {
    const {
        userOrganizations,
        isLoadingUserOrgs,
        createOrganization,
        selectOrganization,
        isCreating,
        isSelecting
    } = useOrg()
    const router = useRouter()
    const [isCreatingNew, setIsCreatingNew] = useState(false)
    const [newOrgName, setNewOrgName] = useState("")
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newOrgName.trim()) return

        try {
            const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]/g, '-')
            await createOrganization({ name: newOrgName, slug })
            toast.success("Dealership created successfully")
            window.location.href = '/'
        } catch (error: any) {
            console.error("Failed to create organization", error)
            const message = error.response?.data?.message || "Failed to create dealership. Please try again."
            toast.error(message)
        }
    }

    const handleSelect = async (orgId: string) => {
        try {
            await selectOrganization(orgId)
            toast.success("Dealership selected")
            window.location.href = '/'
        } catch (error: any) {
            console.error("Failed to select organization", error)
            const message = error.response?.data?.message || "Failed to select dealership. Please try again."
            toast.error(message)
        }
    }

    if (!isMounted || isLoadingUserOrgs) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const hasOrgs = userOrganizations && userOrganizations.length > 0
    const showCreateForm = isCreatingNew || !hasOrgs

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="mb-8 flex flex-col items-center gap-2">
                <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Car className="size-8" />
                </div>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold tracking-tight">SUPRAH.AI</h1>
                    <p className="text-[10px] font-extrabold text-green-600 uppercase tracking-widest leading-none">
                        Powered by Suprah.AI
                    </p>
                </div>
            </div>

            <div className="w-full max-w-md">
                {showCreateForm ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Dealership</CardTitle>
                            <CardDescription>
                                {hasOrgs ? "Add a new dealership to your account." : "Create your first dealership to get started."}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="orgName">Dealership Name</Label>
                                    <Input
                                        id="orgName"
                                        placeholder="e.g. Suprah Motors"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        required
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                {hasOrgs && (
                                    <Button type="button" variant="ghost" onClick={() => setIsCreatingNew(false)}>
                                        Cancel
                                    </Button>
                                )}
                                <Button type="submit" disabled={isCreating} className={!hasOrgs ? "w-full" : ""}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Dealership
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Dealership</CardTitle>
                            <CardDescription>
                                Choose a dealership to manage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {userOrganizations.map((org: any) => (
                                <Button
                                    key={org._id}
                                    variant="outline"
                                    className="w-full justify-start h-12 text-lg font-medium"
                                    onClick={() => handleSelect(org._id)}
                                    disabled={isSelecting}
                                >
                                    {org.imageUrl ? (
                                        <img src={org.imageUrl} alt="" className="mr-2 h-6 w-6 rounded-sm object-cover" />
                                    ) : (
                                        <Car className="mr-2 h-5 w-5 text-muted-foreground" />
                                    )}
                                    {org.name}
                                    {isSelecting && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                </Button>
                            ))}
                        </CardContent>
                        <CardFooter>
                            <Button variant="ghost" className="w-full" onClick={() => setIsCreatingNew(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Dealership
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
                Need help? Contact your system administrator.
            </p>
        </div>
    )
}
