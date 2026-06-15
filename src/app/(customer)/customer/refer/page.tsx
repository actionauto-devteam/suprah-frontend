"use client"

import * as React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Share2, Wallet, ArrowUpRight, TrendingUp, Users, CheckCircle2, Loader2 } from "lucide-react"
import { useWalletDashboard, useRequestWithdrawal } from "@/hooks/api/useWallet"
import { toast } from "sonner"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function ReferAndEarnPage() {
    const { data: dashboard, isLoading } = useWalletDashboard();
    const { mutate: withdrawFunds, isPending: isWithdrawing } = useRequestWithdrawal();

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState("venmo");
    const [withdrawDetails, setWithdrawDetails] = useState("");

    const handleCopyLink = () => {
        if (!dashboard?.referralCode) return;
        const link = `${window.location.origin}/referral/${dashboard.referralCode}`;
        navigator.clipboard.writeText(link);
        toast.success("Referral link copied to clipboard!");
    }

    const getShareLink = () => {
        if (!dashboard?.referralCode) return "";
        return `${window.location.origin}/referral/${dashboard.referralCode}`;
    }

    const shareToWhatsApp = () => {
        const link = getShareLink();
        if (!link) return;
        window.open(`https://wa.me/?text=${encodeURIComponent('Hey! Check out Action Auto using my referral link: ' + link)}`, '_blank');
    }

    const shareToTwitter = () => {
        const link = getShareLink();
        if (!link) return;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Buy your next car from Action Auto and we both get rewarded!')}&url=${encodeURIComponent(link)}`, '_blank');
    }

    const shareToFacebook = () => {
        const link = getShareLink();
        if (!link) return;
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
    }

    const handleNativeShare = async () => {
        const link = getShareLink();
        if (!link) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Action Auto Referral',
                    text: 'Buy your next car from Action Auto and we both get rewarded!',
                    url: link,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            handleCopyLink();
        }
    }

    const handleWithdrawSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(withdrawAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (amountNum > (dashboard?.walletBalance || 0)) {
            toast.error("Amount exceeds wallet balance");
            return;
        }

        withdrawFunds(
            { amount: amountNum, methodType: withdrawMethod, methodDetails: withdrawDetails },
            {
                onSuccess: () => {
                    setIsWithdrawModalOpen(false);
                    setWithdrawAmount("");
                    setWithdrawDetails("");
                }
            }
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
        )
    }

    const walletBalance = dashboard?.walletBalance || 0;
    const totalEarned = dashboard?.totalEarned || 0;
    const pendingLeads = dashboard?.pendingLeads || 0;
    const referralCode = dashboard?.referralCode || "PENDING";
    const transactions = dashboard?.recentTransactions || [];

    // Calculate pending withdrawals to show "Net Available"
    const totalPendingWithdrawals = transactions
        .filter(t => t.type === 'withdrawal' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const netAvailableBalance = Math.max(0, walletBalance - totalPendingWithdrawals);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-green-500" /> Refer & Earn
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-lg">
                        Share Action Auto with friends and family. When they buy a car using your code, you instantly earn <strong className="text-green-600 dark:text-green-400">$100 cash</strong>.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Digital Wallet & Link (Takes 2 columns) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Action Auto Black Card (Digital Wallet) */}
                    <div className="relative overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-2xl border border-zinc-800 p-8 sm:p-10 group">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/20 rounded-full blur-3xl group-hover:bg-green-500/30 transition-colors duration-1000" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors duration-1000" />

                        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-8">
                            <div>
                                <p className="text-zinc-400 font-medium tracking-widest uppercase mb-2">Available Balance</p>
                                <h2 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-white to-zinc-400">
                                    ${walletBalance.toFixed(2)}
                                </h2>
                                {totalPendingWithdrawals > 0 && (
                                    <p className="text-orange-400 text-sm font-medium mt-1">
                                        (${totalPendingWithdrawals.toFixed(2)} pending) — ${netAvailableBalance.toFixed(2)} available
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    disabled={netAvailableBalance <= 0}
                                    className="bg-green-600 hover:bg-green-500 text-white border-none shadow-lg h-12 px-6 rounded-xl font-bold disabled:opacity-50">
                                    Withdraw Funds
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Share Code Section */}
                    <Card className="p-8 rounded-3xl shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <h3 className="text-xl font-bold mb-2">Your Unique Referral Code</h3>
                        <p className="text-muted-foreground mb-6">Tell your friends to show this code to their salesperson, or share the direct link below.</p>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                                <span className="font-mono text-lg font-bold tracking-wider text-green-700 dark:text-green-400">{referralCode}</span>
                                <Button onClick={handleCopyLink} variant="ghost" size="icon" className="hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 text-zinc-400">
                                    <Copy className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                            <Button variant="outline" onClick={shareToWhatsApp} className="w-full h-12 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/20 transition-colors">
                                WhatsApp
                            </Button>
                            <Button variant="outline" onClick={shareToTwitter} className="w-full h-12 bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white border-[#1DA1F2]/20 transition-colors">
                                Twitter
                            </Button>
                            <Button variant="outline" onClick={shareToFacebook} className="w-full h-12 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-600/20 transition-colors">
                                Facebook
                            </Button>
                            <Button onClick={handleNativeShare} className="w-full h-12 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                                <Share2 className="w-4 h-4 mr-2" /> Share Link
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Col: Stats & History */}
                <div className="flex flex-col gap-6">

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-6 rounded-3xl border-border/40 bg-zinc-50 dark:bg-zinc-900">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-zinc-500 text-sm font-medium mb-1">Total Earned</p>
                            <h4 className="text-2xl font-bold">${totalEarned.toFixed(0)}</h4>
                        </Card>

                        <Card className="p-6 rounded-3xl border-border/40 bg-zinc-50 dark:bg-zinc-900">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-zinc-500 text-sm font-medium mb-1">Network</p>
                            <h4 className="text-2xl font-bold">{pendingLeads} Joined</h4>
                        </Card>
                    </div>

                    <Card className="flex-1 p-6 rounded-3xl border-border/40 bg-white dark:bg-zinc-950 shadow-sm flex flex-col h-125">
                        <h3 className="font-bold text-lg mb-6 flex justify-between items-center">
                            Ledger History
                        </h3>

                        <div className="space-y-5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                            {transactions.length === 0 ? (
                                <div className="text-center text-muted-foreground pt-10">No transactions yet.</div>
                            ) : (
                                transactions.map((t) => (
                                    <div key={t._id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'deposit' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {t.type === 'deposit' ? <ArrowUpRight className="w-5 h-5 rotate-180" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-foreground capitalize">
                                                    {t.type} {t.status === 'pending' && <span className="text-xs ml-1 text-orange-500">(Pending)</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate max-w-30 sm:max-w-40">{t.note}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${t.type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                                                {t.type === 'deposit' ? '+' : '-'}${t.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}

                            {transactions.length > 0 && (
                                <div className="py-8 text-center border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-4">
                                    <CheckCircle2 className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-400 font-medium tracking-wide">End of recent history</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Withdrawal Modal */}
            <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Withdraw Funds</DialogTitle>
                        <DialogDescription>
                            Submit a request to transfer your wallet balance to your bank or Venmo account. Transfers usually process within 1-2 business days.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleWithdrawSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount to Withdraw (Max: ${netAvailableBalance.toFixed(2)})</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                max={netAvailableBalance}
                                placeholder="0.00"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="method">Transfer Method</Label>
                            <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="venmo">Venmo</SelectItem>
                                    <SelectItem value="paypal">PayPal</SelectItem>
                                    <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                                    <SelectItem value="check">Physical Check</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="details">Account Details</Label>
                            <Input
                                id="details"
                                placeholder={withdrawMethod === 'venmo' ? "@username" : "Account numbers / email etc."}
                                value={withdrawDetails}
                                onChange={(e) => setWithdrawDetails(e.target.value)}
                                required
                            />
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsWithdrawModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isWithdrawing} className="bg-green-600 hover:bg-green-500 text-white">
                                {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Request Transfer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
