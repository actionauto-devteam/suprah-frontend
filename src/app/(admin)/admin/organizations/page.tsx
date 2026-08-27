'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AdminOrganization, OrgActionsCell, TIER_BADGE_CLASSES } from "./columns"
import { getTierDefinition } from "@/data/subscriptionTiers"
import type { SubscriptionTierId } from "@/types/organization"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Loader2, Mail, Send, X } from 'lucide-react';
import { PageHeader, PageHeaderPill } from "@/components/admin/PageHeader"
import { AdminErrorState } from "@/components/admin/AdminErrorState"
import { StatCard } from "@/components/admin/StatCard"
import { ADMIN_PANEL_CLASS } from "@/components/admin/theme"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { SUBSCRIPTION_TIERS } from "@/data/subscriptionTiers"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type InquiryStatus = "pending" | "invited" | "registered" | "dismissed";

interface DealershipInquiry {
    _id: string;
    email: string;
    status: InquiryStatus;
    createdAt: string;
}

type DealershipRow =
    | { id: string; kind: "organization"; name: string; secondary?: string; status: string; tier?: SubscriptionTierId; createdAt: string; org: AdminOrganization }
    | { id: string; kind: "inquiry"; name: string; status: InquiryStatus; createdAt: string; inquiry: DealershipInquiry };

const TABS = [
    { value: "all", label: "All" },
    { value: "prospects", label: "Prospects" },
    { value: "dealerships", label: "Dealerships" },
    { value: "dismissed", label: "Dismissed" },
] as const;

const STATUS_BADGE: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    suspended: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    archived: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    invited: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dismissed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

type SortOption = "newest" | "oldest" | "name";

export default function DealershipsPage() {
    const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [actioningId, setActioningId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const {
        data: orgs,
        isLoading: orgsLoading,
        isError: orgsError,
        error: orgsErrorObj,
        refetch: refetchOrgs,
    } = useQuery({
        queryKey: ["admin-orgs"],
        queryFn: async () => {
            const res = await apiClient.get("/api/admin/organizations?limit=100");
            return (res.data?.data?.organizations ?? []) as AdminOrganization[];
        },
    });

    const {
        data: inquiries,
        isLoading: inquiriesLoading,
        isError: inquiriesError,
        error: inquiriesErrorObj,
        refetch: refetchInquiries,
    } = useQuery({
        queryKey: ["admin-dealership-inquiries", "all"],
        queryFn: async () => {
            const res = await apiClient.get("/api/admin/dealership-inquiries", { params: { status: "all" } });
            return (res.data?.data?.inquiries ?? []) as DealershipInquiry[];
        },
    });

    const isLoading = orgsLoading || inquiriesLoading;
    const isError = orgsError || inquiriesError;

    const rows: DealershipRow[] = useMemo(() => {
        const orgRows: DealershipRow[] = (orgs ?? []).map((o) => ({
            id: o._id,
            kind: "organization",
            name: o.name,
            secondary: o.slug,
            status: o.status || "active",
            tier: o.subscription?.tier,
            createdAt: o.createdAt,
            org: o,
        }));
        const inquiryRows: DealershipRow[] = (inquiries ?? [])
            .filter((i) => i.status !== "registered")
            .map((i) => ({
                id: i._id,
                kind: "inquiry",
                name: i.email,
                status: i.status,
                createdAt: i.createdAt,
                inquiry: i,
            }));
        return [...orgRows, ...inquiryRows].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [orgs, inquiries]);

    const prospectCount = rows.filter((r) => r.kind === "inquiry" && (r.status === "pending" || r.status === "invited")).length;
    const dealershipCount = rows.filter((r) => r.kind === "organization").length;
    const dismissedCount = rows.filter((r) => r.status === "dismissed").length;

    const visibleRows = rows
        .filter((r) => {
            if (tab === "prospects") return r.kind === "inquiry" && (r.status === "pending" || r.status === "invited");
            if (tab === "dealerships") return r.kind === "organization";
            if (tab === "dismissed") return r.status === "dismissed";
            return r.status !== "dismissed";
        })
        .filter((r) => {
            if (!search.trim()) return true;
            const q = search.trim().toLowerCase();
            return r.name.toLowerCase().includes(q) || (r.kind === "organization" && r.secondary?.toLowerCase().includes(q));
        })
        .filter((r) => {
            if (tierFilter === "all") return true;
            return r.kind === "organization" && r.tier === tierFilter;
        })
        .sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            const at = new Date(a.createdAt).getTime();
            const bt = new Date(b.createdAt).getTime();
            return sortBy === "oldest" ? at - bt : bt - at;
        });

    const invalidateInquiries = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-dealership-inquiries"] });
    };

    const sendLink = async (id: string) => {
        setActioningId(id);
        try {
            await apiClient.post(`/api/admin/dealership-inquiries/${id}/send-link`);
            toast.success("Setup link sent");
            invalidateInquiries();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to send setup link");
        } finally {
            setActioningId(null);
        }
    };

    const dismissInquiry = async (id: string) => {
        setActioningId(id);
        try {
            await apiClient.post(`/api/admin/dealership-inquiries/${id}/dismiss`);
            toast.success("Inquiry dismissed");
            invalidateInquiries();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to dismiss inquiry");
        } finally {
            setActioningId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6 container mx-auto">
                <PageHeader eyebrow="Platform" title="Dealerships" />
                <AdminErrorState
                    message={
                        orgsErrorObj instanceof Error
                            ? orgsErrorObj.message
                            : inquiriesErrorObj instanceof Error
                                ? inquiriesErrorObj.message
                                : "Failed to load dealerships."
                    }
                    onRetry={() => {
                        refetchOrgs();
                        refetchInquiries();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto">
            <PageHeader
                eyebrow="Platform"
                title="All"
                accent="Dealerships"
                meta={<PageHeaderPill><Building2 className="h-3 w-3" /> {rows.length} tracked</PageHeaderPill>}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard icon={Mail} label="Prospects" value={prospectCount} helper="Awaiting outreach" color="amber" />
                <StatCard icon={Building2} label="Active Dealerships" value={dealershipCount} helper="Registered orgs" color="emerald" />
                <StatCard icon={X} label="Dismissed" value={dismissedCount} helper="Closed-out prospects" color="rose" />
            </div>

            <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                            tab === t.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <Card className={cn(ADMIN_PANEL_CLASS, "py-6")}>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-2 py-4">
                        <Input
                            placeholder="Filter by name or slug..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm w-full"
                        />
                        <Select value={tierFilter} onValueChange={setTierFilter}>
                            <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All plans</SelectItem>
                                {SUBSCRIPTION_TIERS.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                            <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest first</SelectItem>
                                <SelectItem value="oldest">Oldest first</SelectItem>
                                <SelectItem value="name">Name A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                        {(search.trim() || tierFilter !== "all") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2"
                                onClick={() => {
                                    setSearch("");
                                    setTierFilter("all");
                                }}
                            >
                                Reset <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Dealership</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleRows.map((row) => (
                                        <TableRow key={`${row.kind}-${row.id}`}>
                                            <TableCell className="font-medium">
                                                {row.kind === "organization" ? (
                                                    <div className="flex flex-col">
                                                        <span>{row.name}</span>
                                                        <span className="text-xs text-muted-foreground">{row.secondary}</span>
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={`mailto:${row.name}`}
                                                        className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                                                    >
                                                        {row.name}
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.kind === "organization" ? (
                                                    <Badge className={TIER_BADGE_CLASSES[getTierDefinition(row.tier).accent] ?? TIER_BADGE_CLASSES.zinc}>
                                                        {getTierDefinition(row.tier).name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={STATUS_BADGE[row.status]}>
                                                    {row.kind === "inquiry" ? row.status : row.status || "active"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(row.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {row.kind === "organization" ? (
                                                    <div className="flex justify-end">
                                                        <OrgActionsCell org={row.org} />
                                                    </div>
                                                ) : row.status === "dismissed" ? (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                ) : (
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        <Button size="sm" variant="outline" className="gap-1.5" asChild>
                                                            <a href={`mailto:${row.inquiry.email}`}>
                                                                <Mail className="h-3.5 w-3.5" /> Contact
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                                            disabled={actioningId === row.id}
                                                            onClick={() => sendLink(row.id)}
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                            {row.status === "invited" ? "Resend" : "Send Link"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="gap-1.5 text-muted-foreground"
                                                            disabled={actioningId === row.id}
                                                            onClick={() => dismissInquiry(row.id)}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Dismiss
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
