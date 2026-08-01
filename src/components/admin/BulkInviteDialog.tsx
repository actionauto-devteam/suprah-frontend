"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Users, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"

export function BulkInviteDialog() {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [emails, setEmails] = useState("")
    const [role, setRole] = useState("member")
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState<{
        sent: string[];
        failed: string[];
        alreadyMember: string[];
    } | null>(null)

    const handleInvite = async () => {
        const emailList = emails
            .split(/[\n,;]/)
            .map(e => e.trim())
            .filter(e => e.length > 0)

        if (emailList.length === 0) {
            toast.error("Please enter at least one email address")
            return
        }

        if (emailList.length > 50) {
            toast.error("Maximum 50 emails allowed at once")
            return
        }

        setIsLoading(true)
        try {
            const token = await getToken()
            const response = await apiClient.post("/api/invitations/bulk",
                { emails: emailList, role },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setResults(response.data.data)
            toast.success("Invitations processed successfully")
        } catch (error: any) {
            console.error("Bulk invite error:", error)
            toast.error(error.response?.data?.message || "Failed to send invitations")
        } finally {
            setIsLoading(false)
        }
    }

    const reset = () => {
        setEmails("")
        setRole("member")
        setResults(null)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) reset()
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Bulk Invite
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>Bulk Invite Team Members</DialogTitle>
                    <DialogDescription>
                        Enter multiple email addresses separated by commas, semicolons, or new lines.
                    </DialogDescription>
                </DialogHeader>

                {!results ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="emails">Email Addresses (max 50)</Label>
                            <Textarea
                                id="emails"
                                placeholder="john@example.com, jane@example.com..."
                                className="min-h-37.5 resize-none max-w-112.5"
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Assign Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Member (Employee)</SelectItem>
                                    <SelectItem value="admin">Admin (Manager)</SelectItem>
                                    <SelectItem value="driver">Driver (Logistics)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-green-600 font-medium">
                                    <CheckCircle className="h-4 w-4" />
                                    Sent Successfully
                                </span>
                                <span className="font-bold">{results.sent.length}</span>
                            </div>

                            {results.alreadyMember.length > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-blue-600 font-medium">
                                        <Users className="h-4 w-4" />
                                        Already Members
                                    </span>
                                    <span className="font-bold">{results.alreadyMember.length}</span>
                                </div>
                            )}

                            {results.failed.length > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-destructive font-medium">
                                        <AlertCircle className="h-4 w-4" />
                                        Failed/Invalid
                                    </span>
                                    <span className="font-bold">{results.failed.length}</span>
                                </div>
                            )}
                        </div>

                        {results.failed.length > 0 && (
                            <div className="text-xs text-muted-foreground bg-destructive/5 p-2 rounded border border-destructive/10">
                                <p className="font-bold mb-1">Failed emails:</p>
                                <p>{results.failed.join(", ")}</p>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!results ? (
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleInvite} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Send Invitations
                            </Button>
                        </>
                    ) : (
                        <Button className="w-full" onClick={() => {
                            setOpen(false)
                            reset()
                        }}>Done</Button>
                    )}i
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
