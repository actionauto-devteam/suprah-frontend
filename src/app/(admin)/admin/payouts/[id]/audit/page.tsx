"use client"

import * as React from "react"
import { use } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Loader2,
    User,
    Calendar,
    ArrowLeft,
    BadgeCheck,
    Truck,
    Receipt,
    ExternalLink,
    MapPin,
    Package,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    XCircle,
    CreditCard
} from "lucide-react"
import {
    useWithdrawalAudit,
    useApproveWithdrawal,
    useRejectWithdrawal
} from "@/hooks/api/useAdminReferral"
import { fmtDateMDT, fmtLongDateMDT } from "@/lib/timezone"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function PayoutAuditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: auditData, isLoading, error } = useWithdrawalAudit(id, true);
    const { mutate: approve, isPending: isApproving } = useApproveWithdrawal();
    const { mutate: reject, isPending: isRejecting } = useRejectWithdrawal();

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const handleApprove = () => {
        if (window.confirm("Are you sure you want to approve this payout? Ensure you have manually transferred the funds first.")) {
            approve(id, {
                onSuccess: () => router.push('/admin/payouts')
            });
        }
    }

    const handleRejectSubmit = () => {
        reject({ id, reason: rejectReason }, {
            onSuccess: () => {
                setIsRejectModalOpen(false);
                router.push('/admin/payouts');
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

    if (error || !auditData) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h1 className="text-2xl font-bold">Audit Data Not Found</h1>
                <p className="text-muted-foreground">This withdrawal request may have been processed or moved.</p>
                <Button asChild variant="outline">
                    <Link href="/admin/payouts">Back to Payouts</Link>
                </Button>
            </div>
        )
    }

    const { request, lineage } = auditData;
    const totalEvidence = lineage.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Navigation */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
                        <Link href="/admin/payouts">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-2 sm:gap-3 truncate">
                            Payout Audit <span className="text-muted-foreground/30 font-light">/</span> {request._id.slice(-6)}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">Comprehensive verification of referral credits.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="ghost"
                        className="flex-1 sm:flex-none text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setIsRejectModalOpen(true)}
                    >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white"
                        onClick={handleApprove}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Mark Paid
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Request Summary & Partner Info */}
                <div className="space-y-6">
                    <Card className="p-6 overflow-hidden relative border-none shadow-xl bg-gradient-to-br from-zinc-900 to-zinc-950 text-white">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CreditCard className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-1">Requested Payout</p>
                                <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400">
                                    ${request.amount.toFixed(2)}
                                </h2>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                <div className="text-xs">
                                    <p className="text-zinc-500 font-bold uppercase tracking-tight">Method</p>
                                    <p className="font-semibold capitalize text-zinc-200">{request.withdrawalMethod?.type.replace('_', ' ')}</p>
                                </div>
                                <div className="text-xs text-right">
                                    <p className="text-zinc-500 font-bold uppercase tracking-tight">Status</p>
                                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-none capitalize">{request.status}</Badge>
                                </div>
                            </div>
                            {request.withdrawalMethod?.details && (
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Payout Details</p>
                                    <p className="text-sm font-mono break-all">{request.withdrawalMethod.details}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 border-border/50 shadow-md">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Referral Partner</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg leading-none">John</p>
                                    <p className="text-sm text-muted-foreground mt-1">jolo.signo01@gmail.com</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Evidence Found</span>
                                    <span className="font-bold text-green-600">${totalEvidence.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Coverage</span>
                                    <span className={`font-bold ${totalEvidence >= request.amount ? 'text-green-600' : 'text-orange-500'}`}>
                                        {Math.round((totalEvidence / request.amount) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Evidence Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <BadgeCheck className="w-6 h-6 text-green-600" /> Evidence of Earnings
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                            {lineage.length} Verified Records
                        </p>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-[1.25rem] before:top-4 before:bottom-4 before:w-[1px] before:bg-border/60">
                        {lineage.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed rounded-3xl opacity-50">
                                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <p>No verified transaction data found for this partner.</p>
                            </div>
                        ) : (
                            lineage.map((entry, index) => (
                                <div key={entry._id} className="relative pl-10 group">
                                    {/* Timeline dot */}
                                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white dark:bg-zinc-950 border-4 border-zinc-100 dark:border-zinc-900 group-hover:border-green-100 dark:group-hover:border-green-900/30 transition-colors flex items-center justify-center z-10">
                                        <BadgeCheck className="w-5 h-5 text-green-600" />
                                    </div>

                                    <Card className="overflow-hidden border-border/50 group-hover:border-primary/30 group-hover:shadow-lg transition-all duration-300">
                                        <div className="p-5 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <h4 className="font-black text-lg tracking-tight">{entry.note}</h4>
                                                    {entry.referralInfo && (
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="text-[10px] h-5 bg-muted/50 font-mono">REFERRAL</Badge>
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <User className="w-3 h-3" /> {entry.referralInfo.name}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> {fmtDateMDT(entry.referralInfo.dateJoined)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-green-600 tracking-tighter">+${entry.amount.toFixed(2)}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest">{fmtDateMDT(entry.createdAt)}</p>
                                                </div>
                                            </div>

                                            {/* Full Receipt: Shipment & Payment Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                                {/* Shipment Section */}
                                                <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] f8ont-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
                                                            <Truck className="w-3 h-3" /> Shipment Proof
                                                        </p>
                                                        {entry.shipmentInfo && (
                                                            <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 capitalize">
                                                                {entry.shipmentInfo.status.replace('-', ' ')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {entry.shipmentInfo ? (
                                                        <div className="space-y-2">
                                                            <div>
                                                                <p className="text-sm font-bold text-foreground">#{entry.shipmentInfo.trackingNumber || entry.shipmentInfo._id.slice(-8)}</p>
                                                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <div className="flex flex-col items-center gap-1 group/route">
                                                                        <div className="w-2 h-2 rounded-full border border-blue-400 bg-white" />
                                                                        <div className="w-[1px] h-3 bg-zinc-300 dark:bg-zinc-700" />
                                                                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                                    </div>
                                                                    <div className="space-y-1.5 flex-1">
                                                                        <p className="font-medium truncate underline decoration-dotted decoration-zinc-300 underline-offset-4">{entry.shipmentInfo.origin}</p>
                                                                        <p className="font-medium truncate text-foreground">{entry.shipmentInfo.destination}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground italic py-2">No linked shipment record found.</p>
                                                    )}
                                                </div>

                                                {/* Payment Section */}
                                                <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1.5">
                                                            <Receipt className="w-3 h-3" /> Financial Proof
                                                        </p>
                                                        {entry.paymentInfo && (
                                                            <Badge variant="outline" className="text-[10px] h-5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50 capitalize">
                                                                {entry.paymentInfo.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {entry.paymentInfo ? (
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">{entry.paymentInfo.invoiceNumber || 'Stripe Order'}</p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmtLongDateMDT(entry.paymentInfo.createdAt)}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-foreground">${entry.paymentInfo.amount.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            {entry.paymentInfo.receiptUrl && (
                                                                <Button asChild variant="outline" size="sm" className="w-full h-8 text-[10px] uppercase font-black bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10">
                                                                    <a href={entry.paymentInfo.receiptUrl} target="_blank" rel="noreferrer">
                                                                        <ExternalLink className="w-3 h-3 mr-2" /> View Bank Receipt
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground italic py-2">No linked payment record found.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

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
