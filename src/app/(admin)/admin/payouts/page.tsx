"use client"

import * as React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Search,
    CreditCard,
    CheckCircle2,
    XCircle,
    Info,
    Loader2,
    User,
    History,
    Calendar,
    ArrowRight,
    BadgeCheck,
    Truck,
    Receipt,
    ExternalLink,
    MapPin,
    Package
} from "lucide-react"
import {
    useAdminPendingWithdrawals,
    useApproveWithdrawal,
    useRejectWithdrawal,
    useWithdrawalAudit
} from "@/hooks/api/useAdminReferral"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export default function AdminPayoutsPage() {
    const { data: withdrawals, isLoading } = useAdminPendingWithdrawals();
    const { mutate: approve, isPending: isApproving } = useApproveWithdrawal();
    const { mutate: reject, isPending: isRejecting } = useRejectWithdrawal();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");



    const filteredWithdrawals = withdrawals?.filter(w =>
        w.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.withdrawalMethod?.details?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleApprove = (id: string) => {
        if (window.confirm("Are you sure you want to approve this payout? Ensure you have manually transferred the funds first.")) {
            approve(id);
        }
    }

    const handleRejectSubmit = () => {
        if (!selectedWithdrawalId) return;
        reject({ id: selectedWithdrawalId, reason: rejectReason }, {
            onSuccess: () => {
                setIsRejectModalOpen(false);
                setRejectReason("");
                setSelectedWithdrawalId(null);
            }
        });
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }



    return (
        <div className="p-8 space-y-8 container mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-primary" /> Referral Payouts
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Verify and manage withdrawal requests from your referral partners.
                </p>
            </div>

            {/* Stats Overview (Optional Placeholder) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Pending</p>
                    <h3 className="text-2xl font-bold">{withdrawals?.length || 0} Requests</h3>
                </Card>
                <Card className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pending Amount</p>
                    <h3 className="text-2xl font-bold text-green-600">
                        ${withdrawals?.reduce((sum, w) => sum + w.amount, 0).toFixed(2) || "0.00"}
                    </h3>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="overflow-hidden border-border/50">
                <div className="p-4 border-b bg-muted/30 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name, email or details..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>,
                            <TableHead>Partner</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWithdrawals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No pending requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredWithdrawals.map((w) => (
                                <TableRow key={w._id} className="group hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{w.user.name}</span>
                                            <span className="text-xs text-muted-foreground">{w.user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono font-bold text-green-600 dark:text-green-400">
                                            ${w.amount.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <Badge variant="secondary" className="w-fit capitalize">{w.withdrawalMethod?.type.replace('_', ' ')}</Badge>
                                            <span className="text-xs text-muted-foreground mt-1">{w.withdrawalMethod?.details}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(w.createdAt), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                                className="h-8 gap-1.5"
                                            >
                                                <Link href={`/admin/payouts/${w._id}/audit`}>
                                                    <History className="w-3.5 h-3.5" /> Audit
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleApprove(w._id)}
                                                className="h-8 bg-green-600 hover:bg-green-500 text-white gap-1.5"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedWithdrawalId(w._id);
                                                    setIsRejectModalOpen(true);
                                                }}
                                                className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>



            {/* Reject Modal */}
            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reject Withdrawal Request</DialogTitle>
                        <DialogDescription>
                            Provide a reason for the rejection. The user will be able to see this note.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Rejection Reason</Label>
                            <Input
                                id="reason"
                                placeholder="e.g. Account details invalid, suspected fraud..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={isRejecting || !rejectReason}
                        >
                            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
