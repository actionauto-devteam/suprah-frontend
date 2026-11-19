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
    Loader2,
    History,
} from "lucide-react"
import {
    useAdminPendingWithdrawals,
    useApproveWithdrawal,
    useRejectWithdrawal,
} from "@/hooks/api/useAdminReferral"
import { fmtDateMDT } from "@/lib/timezone"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/admin/PageHeader"
import { StatCard } from "@/components/admin/StatCard"
import { TableLoadingSkeleton } from "@/components/shared/EmptyLoadingState"
import { useAlert } from "@/components/AlertDialog"

export default function AdminPayoutsPage() {
    const { data: withdrawals, isLoading } = useAdminPendingWithdrawals();
    const { mutate: approve } = useApproveWithdrawal();
    const { mutate: reject, isPending: isRejecting } = useRejectWithdrawal();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const { confirm, AlertComponent } = useAlert();

    const filteredWithdrawals = withdrawals?.filter(w =>
        w.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.withdrawalMethod?.details?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleApprove = (id: string) => {
        confirm(
            "Approve Payout",
            "Are you sure you want to approve this payout? Ensure you have manually transferred the funds first.",
            async () => {
                approve(id);
            },
            "Approve",
            "Cancel",
        );
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
            <div className="p-4 sm:p-6 lg:p-8 container mx-auto">
                <TableLoadingSkeleton />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 container mx-auto">
            <PageHeader
                title="Referral payouts"
                description="Withdrawal requests awaiting manual approval."
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard
                    icon={History}
                    label="Pending requests"
                    value={withdrawals?.length || 0}
                    helper="Awaiting a decision"
                    tone={withdrawals?.length ? "attention" : "default"}
                />
                <StatCard
                    icon={CreditCard}
                    label="Pending amount"
                    value={`$${withdrawals?.reduce((sum, w) => sum + w.amount, 0).toFixed(2) || "0.00"}`}
                    helper="Total across requests"
                />
            </div>

            {/* Main Content */}
            <Card className="gap-0 overflow-hidden rounded-lg border-border py-0 shadow-none">
                <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name, email or details…"
                            className="h-8 pl-8 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Phones: one card per request (the table needed sideways scrolling). */}
                <ul className="divide-y divide-border md:hidden">
                    {filteredWithdrawals.length === 0 ? (
                        <li className="px-4 py-10 text-center text-sm text-muted-foreground">No pending requests found.</li>
                    ) : (
                        filteredWithdrawals.map((w) => (
                            <li key={w._id} className="space-y-3 px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground [overflow-wrap:anywhere]">{w.user.name}</p>
                                        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{w.user.email}</p>
                                    </div>
                                    <span className="shrink-0 font-mono font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                        ${w.amount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <Badge variant="secondary" className="w-fit capitalize">{w.withdrawalMethod?.type.replace('_', ' ')}</Badge>
                                    <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{w.withdrawalMethod?.details}</p>
                                    <p className="text-xs text-muted-foreground">{fmtDateMDT(w.createdAt)}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" asChild className="h-10 gap-1.5">
                                        <Link href={`/admin/payouts/${w._id}/audit`}>
                                            <History className="w-3.5 h-3.5" /> Audit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleApprove(w._id)}
                                        className="h-10 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
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
                                        className="h-10 gap-1.5 text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                    </Button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>

                <div className="hidden md:block">
                    <Table>
                        <TableHeader className="bg-muted/60">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="h-9 text-xs font-medium text-muted-foreground">Partner</TableHead>
                                <TableHead className="h-9 text-xs font-medium text-muted-foreground">Amount</TableHead>
                                <TableHead className="h-9 text-xs font-medium text-muted-foreground">Method</TableHead>
                                <TableHead className="h-9 text-xs font-medium text-muted-foreground">Date</TableHead>
                                <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
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
                                    <TableRow key={w._id} className="group h-12 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{w.user.name}</span>
                                                <span className="text-xs text-muted-foreground">{w.user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
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
                                            {fmtDateMDT(w.createdAt)}
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
                                                    className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
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
                                                    aria-label={`Reject ${w.user.name}'s withdrawal`}
                                                    className="h-8 text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
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
                </div>
            </Card>



            {/* Reject Modal */}
            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent className="sm:max-w-106.25">
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

            <AlertComponent />
        </div>
    )
}
