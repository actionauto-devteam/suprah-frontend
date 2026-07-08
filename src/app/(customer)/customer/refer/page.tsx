"use client"

import * as React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Share2, Wallet, ArrowUpRight, TrendingUp, Users, CheckCircle2, Loader2, Receipt, Lightbulb } from "lucide-react"
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-5 sm:pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5 sm:gap-3">
                        <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" /> Refer & Earn
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base lg:text-lg">
                        Share Action Auto with friends and family. When they buy a car using your code, you instantly earn <strong className="text-primary">$100 cash</strong>.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                {/* Left Col: Digital Wallet & Link (Takes 2 columns) */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">

                    {/* Action Auto Black Card (Digital Wallet) */}
                    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-zinc-950 text-white shadow-2xl border border-zinc-800 p-5 sm:p-8 lg:p-10 group">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors duration-1000" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl group-hover:bg-primary/25 transition-colors duration-1000" />

                        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6 sm:gap-8">
                            <div className="min-w-0">
                                <p className="text-zinc-400 font-medium tracking-widest uppercase mb-2 text-xs sm:text-sm">Available Balance</p>
                                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-white to-zinc-400 truncate">
                                    ${walletBalance.toFixed(2)}
                                </h2>
                                {totalPendingWithdrawals > 0 && (
                                    <p className="text-orange-400 text-xs sm:text-sm font-medium mt-1">
                                        (${totalPendingWithdrawals.toFixed(2)} pending) — ${netAvailableBalance.toFixed(2)} available
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    disabled={netAvailableBalance <= 0}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-lg h-11 sm:h-12 px-6 rounded-xl font-bold disabled:opacity-50 touch-manipulation">
                                    Withdraw Funds
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Share Code Section */}
                    <Card className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <h3 className="text-lg sm:text-xl font-bold mb-2">Your Unique Referral Code</h3>
                        <p className="text-muted-foreground mb-5 sm:mb-6 text-sm sm:text-base">Tell your friends to show this code to their salesperson, or share the direct link below.</p>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 w-full min-w-0 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 flex justify-between items-center gap-2">
                                <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-primary truncate">{referralCode}</span>
                                <Button onClick={handleCopyLink} variant="ghost" size="icon" className="shrink-0 hover:bg-primary/10 hover:text-primary text-zinc-400 touch-manipulation">
                                    <Copy className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 sm:mt-6">
                            <Button variant="outline" onClick={shareToWhatsApp} className="w-full h-11 sm:h-12 text-sm bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/20 transition-colors touch-manipulation">
                                WhatsApp
                            </Button>
                            <Button variant="outline" onClick={shareToTwitter} className="w-full h-11 sm:h-12 text-sm bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white border-[#1DA1F2]/20 transition-colors touch-manipulation">
                                Twitter
                            </Button>
                            <Button variant="outline" onClick={shareToFacebook} className="w-full h-11 sm:h-12 text-sm bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-600/20 transition-colors touch-manipulation">
                                Facebook
                            </Button>
                            <Button onClick={handleNativeShare} className="w-full h-11 sm:h-12 text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 touch-manipulation">
                                <Share2 className="w-4 h-4 mr-2" /> Share Link
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Col: Stats & History */}
                <div className="flex flex-col gap-4 sm:gap-6">

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border/40 bg-zinc-50 dark:bg-zinc-900">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                                <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <p className="text-zinc-500 text-xs sm:text-sm font-medium mb-1">Total Earned</p>
                            <h4 className="text-xl sm:text-2xl font-bold">${totalEarned.toFixed(0)}</h4>
                        </Card>

                        <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border/40 bg-zinc-50 dark:bg-zinc-900">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-chart-2/15 flex items-center justify-center mb-3 sm:mb-4">
                                <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-chart-2" />
                            </div>
                            <p className="text-zinc-500 text-xs sm:text-sm font-medium mb-1">Network</p>
                            <h4 className="text-xl sm:text-2xl font-bold">{pendingLeads} Joined</h4>
                        </Card>
                    </div>

                    <Card className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border/40 bg-white dark:bg-zinc-950 shadow-sm flex flex-col ${transactions.length > 0 ? "flex-1 h-100 sm:h-125" : ""}`}>
                        <h3 className="font-bold text-base sm:text-lg mb-4 sm:mb-6 flex justify-between items-center">
                            Ledger History
                        </h3>

                        {transactions.length === 0 ? (
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Receipt className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-foreground">No transactions yet</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-56">Your earnings and withdrawals will show up here once a friend buys using your code.</p>
                                </div>
                                <div className="w-full mt-2 rounded-xl bg-primary/5 border border-primary/10 p-3.5 text-left flex items-start gap-2.5">
                                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">Tip:</span> Share your code above with friends shopping for a car — you earn <span className="font-semibold text-primary">$100</span> the moment they buy.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                                {transactions.map((t) => (
                                    <div key={t._id} className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'deposit' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                                                {t.type === 'deposit' ? <ArrowUpRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 rotate-180" /> : <ArrowUpRight className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground capitalize truncate">
                                                    {t.type} {t.status === 'pending' && <span className="text-xs ml-1 text-orange-500">(Pending)</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate max-w-28 sm:max-w-40">{t.note}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-bold text-sm sm:text-base ${t.type === 'deposit' ? 'text-primary' : 'text-foreground'}`}>
                                                {t.type === 'deposit' ? '+' : '-'}${t.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}</p>
                                        </div>
                                    </div>
                                ))}

                                <div className="py-8 text-center border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-4">
                                    <CheckCircle2 className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-400 font-medium tracking-wide">End of recent history</p>
                                </div>
                            </div>
                        )}
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
                            <Button type="button" variant="outline" className="touch-manipulation" onClick={() => setIsWithdrawModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isWithdrawing} className="bg-primary hover:bg-primary/90 text-primary-foreground touch-manipulation">
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
