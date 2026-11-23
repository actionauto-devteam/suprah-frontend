"use client"

/**
 * Admin → SuprahPay (2026-11-21), for Suprah super admins: Suprah's fee and
 * the largest payment (decisions A5 and B3), which dealerships have SuprahPay
 * (decision A3), and the weekly payouts to dealerships (decision A4). Every
 * action is checked again on the server; this page only asks first.
 */
import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, RefreshCw, Send } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/admin/PageHeader"
import { useAlert } from "@/components/AlertDialog"
import { formatCurrency } from "@/utils/format"
import { fmtDateMDT } from "@/lib/timezone"

interface PlatformSettings {
    feePercent: number
    maxPaymentAmount: number
    stripeMaxPayment: number
}

interface DealershipRow {
    _id: string
    name: string
    tier: string | null
    suprahPayOn: boolean
    switchSet: boolean
}

interface PayoutRow {
    _id: string
    name: string
    /** Archived, but still owed money (or a payment is on hold), so it stays on the list. */
    archived?: boolean
    suprahPayOn: boolean
    payoutAccountConnected: boolean
    sending: boolean
    amount: number
    paymentsTotal: number
    suprahFee: number
    adjustments: number
    paymentCount: number
    heldCount: number
}

interface PayoutRecord {
    _id: string
    organizationName: string
    amount: number
    paymentCount: number
    status: "sending" | "sent" | "failed"
    failureReason: string | null
    sentAt: string | null
    createdAt: string
}

interface PayoutList {
    cutoff: string
    dealerships: PayoutRow[]
    history: PayoutRecord[]
}

const dataOf = <T,>(res: { data?: { data?: unknown } }) => res?.data?.data as T

const errorText = (e: unknown, fallback: string) => {
    const message = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
    return typeof message === "string" && message ? message : fallback
}

const TIER_NAMES: Record<string, string> = {
    suprah_go: "Suprah Go",
    suprah_premium: "Premium",
    suprah_premium_pro: "Premium Pro",
    suprah_premium_ultra: "Premium Ultra",
    suprah_origin: "Suprah Origin",
}

export default function AdminSuprahPayPage() {
    const queryClient = useQueryClient()
    const { confirm, AlertComponent } = useAlert()

    const settingsQuery = useQuery({
        queryKey: ["admin-suprahpay", "settings"],
        queryFn: async () => dataOf<PlatformSettings>(await apiClient.get("/api/admin/suprahpay/settings")),
    })
    const dealershipsQuery = useQuery({
        queryKey: ["admin-suprahpay", "dealerships"],
        queryFn: async () => dataOf<DealershipRow[]>(await apiClient.get("/api/admin/suprahpay/dealerships")),
    })
    const payoutsQuery = useQuery({
        queryKey: ["admin-suprahpay", "payouts"],
        queryFn: async () => dataOf<PayoutList>(await apiClient.get("/api/admin/suprahpay/payouts")),
    })
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-suprahpay"] })

    /* ── Suprah's fee and the largest payment ─────────────────────────────── */
    const [fee, setFee] = React.useState("")
    const [limit, setLimit] = React.useState("")
    const [settingsError, setSettingsError] = React.useState<string | null>(null)
    const [savingSettings, setSavingSettings] = React.useState(false)
    React.useEffect(() => {
        if (!settingsQuery.data) return
        setFee(String(settingsQuery.data.feePercent))
        setLimit(String(settingsQuery.data.maxPaymentAmount))
    }, [settingsQuery.data])

    const saveSettings = async () => {
        const feePercent = Number(fee.trim())
        const maxPaymentAmount = Number(limit.trim())
        if (fee.trim() === "" || !Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
            setSettingsError("Enter Suprah's fee as a percentage from 0 to 100.")
            return
        }
        if (limit.trim() === "" || !Number.isFinite(maxPaymentAmount) || maxPaymentAmount <= 0 || maxPaymentAmount > 999_999.99) {
            setSettingsError("Enter the largest payment as an amount above $0 and up to $999,999.99.")
            return
        }
        setSettingsError(null)
        setSavingSettings(true)
        try {
            await apiClient.put("/api/admin/suprahpay/settings", { feePercent, maxPaymentAmount })
            toast.success("SuprahPay settings saved", { description: "New invoices use them from now on." })
            refresh()
        } catch (e) {
            setSettingsError(errorText(e, "The settings weren't saved. Please try again."))
        } finally {
            setSavingSettings(false)
        }
    }

    /* ── SuprahPay on or off per dealership ──────────────────────────────── */
    const [switchingId, setSwitchingId] = React.useState<string | null>(null)
    const setSuprahPay = async (row: DealershipRow, enabled: boolean) => {
        const run = async () => {
            setSwitchingId(row._id)
            try {
                await apiClient.put(`/api/admin/suprahpay/dealerships/${encodeURIComponent(row._id)}`, { enabled })
                toast.success(enabled ? `SuprahPay is on for ${row.name}` : `SuprahPay is off for ${row.name}`)
                refresh()
            } catch (e) {
                toast.error("SuprahPay wasn't changed", { description: errorText(e, "Please try again.") })
            } finally {
                setSwitchingId(null)
            }
        }
        if (enabled) return run()
        await confirm(
            `Turn SuprahPay off for ${row.name}?`,
            "They won't be able to send payment requests or invoices until it's turned back on. Invoices already sent can still be paid, and what Suprah owes them is still paid out.",
            run,
            "Turn off",
            "Keep on",
        )
    }

    /* ── Weekly payouts ──────────────────────────────────────────────────── */
    const [sendingId, setSendingId] = React.useState<string | null>(null)
    const sendPayout = async (row: PayoutRow) => {
        await confirm(
            `Send ${formatCurrency(row.amount)} to ${row.name}?`,
            `This sends what Suprah owes them for ${row.paymentCount} card payment${row.paymentCount === 1 ? "" : "s"} to their Stripe payout account. It can't be undone here.`,
            async () => {
                setSendingId(row._id)
                try {
                    await apiClient.post(`/api/admin/suprahpay/payouts/${encodeURIComponent(row._id)}/send`, { amount: row.amount })
                    toast.success(`${formatCurrency(row.amount)} sent to ${row.name}`)
                } catch (e) {
                    toast.error("The payout wasn't sent", { description: errorText(e, "Please refresh and try again.") })
                } finally {
                    setSendingId(null)
                    refresh()
                }
            },
            "Send payout",
            "Cancel",
        )
    }

    const [checkingId, setCheckingId] = React.useState<string | null>(null)
    const checkPayout = async (record: PayoutRecord) => {
        setCheckingId(record._id)
        try {
            await apiClient.post(`/api/admin/suprahpay/payouts/record/${encodeURIComponent(record._id)}/check`)
            toast.success("Stripe confirmed the payout")
        } catch (e) {
            toast.error("The payout isn't confirmed", { description: errorText(e, "Please try again.") })
        } finally {
            setCheckingId(null)
            refresh()
        }
    }

    const payouts = payoutsQuery.data
    const weekEnding = payouts ? fmtDateMDT(new Date(new Date(payouts.cutoff).getTime() - 60_000).toISOString()) : ""

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <PageHeader
                title="SuprahPay"
                description="Suprah's fee and payment limit, which dealerships have SuprahPay, and the weekly payouts to dealerships."
                actions={
                    <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                }
            />

            {/* Weekly payouts */}
            <Card className="space-y-4 p-4 sm:p-5">
                <div>
                    <h2 className="text-base font-semibold">This week&apos;s payouts</h2>
                    <p className="text-sm text-muted-foreground">
                        {payouts ? `Card payments paid up to the end of ${weekEnding} (Utah time), less Suprah's fee and any refunds.` : "Loading…"}
                    </p>
                </div>
                {payoutsQuery.isError ? (
                    <p role="alert" className="text-sm text-destructive">The payouts couldn&apos;t be loaded. Refresh to try again.</p>
                ) : !payouts ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading payouts" />
                ) : payouts.dealerships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No dealership has SuprahPay yet.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {payouts.dealerships.map((row) => {
                            const blocked = !row.payoutAccountConnected
                                ? "No payout account yet"
                                : row.sending
                                    ? "A payout is being sent"
                                    : row.amount <= 0
                                        ? row.amount < 0 ? "Refunds are more than this week's payments: carried to next week" : "Nothing to send this week"
                                        : null
                            return (
                                <li key={row._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                                    <div className="min-w-0 flex-1 basis-56">
                                        <p className="flex flex-wrap items-center gap-2 font-medium [overflow-wrap:anywhere]">
                                            {row.name}
                                            {row.archived && <Badge variant="secondary">Archived</Badge>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {row.paymentCount} payment{row.paymentCount === 1 ? "" : "s"} · Suprah&apos;s fee {formatCurrency(row.suprahFee)}
                                            {row.adjustments ? ` · refunds and disputes ${formatCurrency(row.adjustments)}` : ""}
                                            {row.heldCount ? ` · ${row.heldCount} on hold for a card dispute` : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-mono text-base font-semibold tabular-nums">{formatCurrency(row.amount)}</span>
                                        {blocked ? (
                                            <span className="text-xs text-muted-foreground">{blocked}</span>
                                        ) : (
                                            <Button size="sm" className="h-10 gap-1.5" disabled={sendingId === row._id} onClick={() => sendPayout(row)}>
                                                {sendingId === row._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                                Send
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Card>

            {/* Suprah's fee and payment limit */}
            <Card className="space-y-4 p-4 sm:p-5">
                <div>
                    <h2 className="text-base font-semibold">Fee and payment limit</h2>
                    <p className="text-sm text-muted-foreground">Apply to every dealership. Each invoice keeps the fee rate from when it was sent.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="suprahpay-fee">Suprah&apos;s fee (%)</Label>
                        <Input id="suprahpay-fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Taken from what Suprah pays the dealership. Card processing fees are Suprah&apos;s.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="suprahpay-limit">Largest payment ($)</Label>
                        <Input id="suprahpay-limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
                        <p className="text-xs text-muted-foreground">The most a customer can pay online at once (Stripe&apos;s limit is $999,999.99).</p>
                    </div>
                </div>
                {settingsError && <p role="alert" className="text-sm text-destructive">{settingsError}</p>}
                <Button onClick={saveSettings} disabled={savingSettings || !settingsQuery.data} className="gap-1.5">
                    {savingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                </Button>
            </Card>

            {/* SuprahPay per dealership */}
            <Card className="space-y-4 p-4 sm:p-5">
                <div>
                    <h2 className="text-base font-semibold">Dealerships</h2>
                    <p className="text-sm text-muted-foreground">
                        Turn SuprahPay on for a dealership when it&apos;s ready. Suprah Origin dealerships have it until it&apos;s turned off.
                    </p>
                </div>
                {dealershipsQuery.isError ? (
                    <p role="alert" className="text-sm text-destructive">The dealerships couldn&apos;t be loaded. Refresh to try again.</p>
                ) : !dealershipsQuery.data ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading dealerships" />
                ) : (
                    <ul className="divide-y divide-border">
                        {dealershipsQuery.data.map((row) => (
                            <li key={row._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                <div className="min-w-0 flex-1 basis-56">
                                    <p className="font-medium [overflow-wrap:anywhere]">{row.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(row.tier && TIER_NAMES[row.tier]) || "No plan"}
                                        {row.switchSet ? "" : " · follows the plan"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={row.suprahPayOn ? "default" : "secondary"}>{row.suprahPayOn ? "On" : "Off"}</Badge>
                                    <Switch
                                        checked={row.suprahPayOn}
                                        disabled={switchingId === row._id}
                                        onCheckedChange={(checked) => setSuprahPay(row, checked)}
                                        aria-label={`SuprahPay for ${row.name}`}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Recent payouts */}
            <Card className="space-y-4 p-4 sm:p-5">
                <h2 className="text-base font-semibold">Recent payouts</h2>
                {!payouts ? null : payouts.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payouts yet.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {payouts.history.map((record) => (
                            <li key={record._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                                <div className="min-w-0 flex-1 basis-56">
                                    <p className="font-medium [overflow-wrap:anywhere]">{record.organizationName || "Dealership"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {fmtDateMDT(record.sentAt ?? record.createdAt)} · {record.paymentCount} payment{record.paymentCount === 1 ? "" : "s"}
                                    </p>
                                    {record.failureReason && (
                                        <p className="mt-1 text-xs text-destructive [overflow-wrap:anywhere]">{record.failureReason}</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-mono font-semibold tabular-nums">{formatCurrency(record.amount)}</span>
                                    <Badge variant={record.status === "sent" ? "default" : record.status === "failed" ? "destructive" : "secondary"}>
                                        {record.status === "sent" ? "Sent" : record.status === "failed" ? "Not sent" : "Sending"}
                                    </Badge>
                                    {record.status === "sending" && (
                                        <Button size="sm" variant="outline" className="h-10" disabled={checkingId === record._id} onClick={() => checkPayout(record)}>
                                            {checkingId === record._id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Check again
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <AlertComponent />
        </div>
    )
}
