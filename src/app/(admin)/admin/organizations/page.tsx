'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AdminOrganization, OrgActionsCell, TIER_BADGE_CLASSES } from "./columns"
import { getTierDefinition } from "@/data/subscriptionTiers"
import type { SubscriptionTierId } from "@/types/organization"
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
import { Building2, Mail, Send, X, Search } from 'lucide-react';
import { PageHeader, PageHeaderPill } from "@/components/admin/PageHeader"
import { AdminErrorState } from "@/components/admin/AdminErrorState"
import { StatCard } from "@/components/admin/StatCard"
import { TableLoadingSkeleton } from "@/components/shared/EmptyLoadingState"
import { EmptyState } from "@/components/admin/primitives"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { OrgDetailSheet } from "@/components/admin/organizations/OrgDetailSheet"
import { exportRowsToCsv } from "@/lib/csv-export"
import { Download } from "lucide-react"
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

type SortOption = "newest" | "oldest" | "name";

export default function DealershipsPage() {
    const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [detailOrgId, setDetailOrgId] = useState<string | null>(null);
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
            <div className="space-y-6 container mx-auto">
                <TableLoadingSkeleton />
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
                title="Dealerships"
                description="Registered dealerships and the prospects still being worked."
                meta={<PageHeaderPill><Building2 className="h-3 w-3" /> {rows.length} tracked</PageHeaderPill>}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={!visibleRows.length}
                        onClick={() => exportRowsToCsv('dealerships', visibleRows, [
                            { key: 'name', label: 'Name' },
                            { key: 'status', label: 'Status' },
                            { key: 'kind', label: 'Type' },
                            { key: 'createdAt', label: 'Created' },
                        ])}
                    >
                        <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                }
            />

            <OrgDetailSheet orgId={detailOrgId} onOpenChange={(open) => { if (!open) setDetailOrgId(null); }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <StatCard icon={Mail} label="Prospects" value={prospectCount} helper="Awaiting outreach" tone={prospectCount ? "attention" : "default"} />
                <StatCard icon={Building2} label="Active dealerships" value={dealershipCount} helper="Registered orgs" />
                <StatCard icon={X} label="Dismissed" value={dismissedCount} helper="Closed-out prospects" />
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

            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                    <div className="relative min-w-0 flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search name or slug…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 pl-8 text-sm"
                        />
                    </div>

                    <Select value={tierFilter} onValueChange={setTierFilter}>
                        <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
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
                        <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
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
                            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                            onClick={() => { setSearch(""); setTierFilter("all"); }}
                        >
                            Clear <X className="size-3" />
                        </Button>
                    )}

                    <span className="ml-auto hidden text-xs tabular-nums text-muted-foreground sm:block">
                        {visibleRows.length} shown
                    </span>
                </div>

                {visibleRows.length === 0 ? (
                    <EmptyState
                        icon={Building2}
                        title={search.trim() || tierFilter !== "all" ? "No matches" : "Nothing here yet"}
                        description={
                            search.trim() || tierFilter !== "all"
                                ? "Try a different search or plan filter."
                                : "Dealership prospects and registered dealerships will appear here."
                        }
                    />
                ) : (
                    <>
                        <div className="divide-y divide-border md:hidden">
                            {visibleRows.map((row) => (
                                <div
                                    key={`m-${row.kind}-${row.id}`}
                                    onClick={row.kind === "organization" ? () => setDetailOrgId(row.id) : undefined}
                                    className={cn("px-3 py-3", row.kind === "organization" && "cursor-pointer active:bg-accent/50")}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                                            {row.kind === "organization" ? <Building2 className="size-4" /> : <Mail className="size-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="truncate text-sm font-medium">{row.name}</p>
                                            {row.kind === "organization" && row.secondary && (
                                                <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                <StatusBadge
                                                    status={row.kind === "inquiry" ? row.status : row.status || "active"}
                                                    domain="dealershipStatus"
                                                />
                                                {row.kind === "organization" && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {getTierDefinition(row.tier).name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {row.kind === "inquiry" && row.status !== "dismissed" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 shrink-0 gap-1 text-xs"
                                                disabled={actioningId === row.id}
                                                onClick={(e) => { e.stopPropagation(); sendLink(row.id); }}
                                            >
                                                <Send className="size-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <Table>
                                <TableHeader className="bg-muted/60">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-9 text-xs font-medium text-muted-foreground">Dealership</TableHead>
                                        <TableHead className="h-9 text-xs font-medium text-muted-foreground">Plan</TableHead>
                                        <TableHead className="h-9 text-xs font-medium text-muted-foreground">Status</TableHead>
                                        <TableHead className="h-9 text-xs font-medium text-muted-foreground">Created</TableHead>
                                        <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.map((row) => (
                                        <TableRow
                                            key={`${row.kind}-${row.id}`}
                                            className={cn("h-12", row.kind === "organization" && "cursor-pointer")}
                                            onClick={row.kind === "organization" ? () => setDetailOrgId(row.id) : undefined}
                                        >
                                            <TableCell className="py-1.5 font-medium">
                                                {row.kind === "organization" ? (
                                                    <div className="flex flex-col">
                                                        <span>{row.name}</span>
                                                        <span className="text-xs text-muted-foreground">{row.secondary}</span>
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={`mailto:${row.name}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
                                                    >
                                                        {row.name}
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                                {row.kind === "organization" ? (
                                                    <Badge className={TIER_BADGE_CLASSES[getTierDefinition(row.tier).accent] ?? TIER_BADGE_CLASSES.zinc}>
                                                        {getTierDefinition(row.tier).name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">&mdash;</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                                <StatusBadge
                                                    status={row.kind === "inquiry" ? row.status : row.status || "active"}
                                                    domain="dealershipStatus"
                                                />
                                            </TableCell>
                                            <TableCell className="py-1.5 text-sm text-muted-foreground">
                                                {new Date(row.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right">
                                                {row.kind === "organization" ? (
                                                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                                        <OrgActionsCell org={row.org} />
                                                    </div>
                                                ) : row.status === "dismissed" ? (
                                                    <span className="text-sm text-muted-foreground">&mdash;</span>
                                                ) : (
                                                    <div className="flex flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" asChild>
                                                            <a href={`mailto:${row.inquiry.email}`}>
                                                                <Mail className="size-3" /> Contact
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 gap-1.5 border-emerald-500/30 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                                            disabled={actioningId === row.id}
                                                            onClick={() => sendLink(row.id)}
                                                        >
                                                            <Send className="size-3" />
                                                            {row.status === "invited" ? "Resend" : "Send link"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 gap-1.5 text-xs text-muted-foreground"
                                                            disabled={actioningId === row.id}
                                                            onClick={() => dismissInquiry(row.id)}
                                                        >
                                                            <X className="size-3" /> Dismiss
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
