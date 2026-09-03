'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { DriverProfile, ComplianceDocument, PopulatedUser } from '@/types/driver-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2, ArrowLeft, Truck, Shield, FileText, FileCheck, CreditCard,
    CheckCircle2, XCircle, Clock, Eye, Ban, Hash, Gauge,
    Star, MapPin, Calendar, Fingerprint, Lock, Scale,
    BadgeCheck, ShieldAlert, AlertTriangle, UserCheck,
    Mail, Globe, Wrench, Building2, History, UserRoundCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { REQUIRED_DOCUMENTS, trailerTypeOptions, specialFeatureOptions, hitchTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';
import { DocumentReviewWorkspace } from './DocumentReviewWorkspace';
import { ADMIN_HEADER_PANEL_CLASS } from '@/components/admin/theme';
import { StatCard } from '@/components/admin/StatCard';

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : '—';
const fmtDateTime = (d?: string) => d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver', timeZoneName: 'short' }).format(new Date(d)) : '—';
const fmtSize = (b?: number) => !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const getExpStatus = (d?: string) => {
    if (!d) return { l: 'Not Set', c: 'text-muted-foreground' };
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
    if (days < 0) return { l: `Expired ${Math.abs(days)}d ago`, c: 'text-red-500' };
    if (days <= 30) return { l: `${days}d left`, c: 'text-amber-500' };
    if (days <= 90) return { l: `${days}d`, c: 'text-yellow-500' };
    return { l: `${days}d`, c: 'text-emerald-500' };
};

const getUser = (userId: string | PopulatedUser): PopulatedUser | null =>
    typeof userId === 'object' && userId !== null ? userId : null;

const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

type Tab = 'overview' | 'equipment' | 'documents' | 'compliance';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: UserCheck },
    { id: 'equipment', label: 'Equipment', icon: Truck },
    { id: 'documents', label: 'Documents', icon: FileCheck },
    { id: 'compliance', label: 'Compliance', icon: Shield },
];

const DOC_ICONS: Record<string, React.ElementType> = {
    drivers_license: CreditCard, medical_card: FileText, insurance_certificate: Shield,
    vehicle_registration: FileText, operating_authority: Building2, w9_form: FileText,
    dot_inspection: FileCheck, cargo_insurance: Shield, liability_insurance: Shield, other: FileText,
};

const Field = ({ label, value, mono, icon: Icon }: { label: string; value?: string | number | null; mono?: boolean; icon?: React.ElementType }) => (
    <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            {Icon && <Icon className="size-3 text-muted-foreground/60" />}{label}
        </p>
        <p className={cn('text-sm font-semibold', !value && 'text-muted-foreground italic', mono && 'font-mono tracking-wide')}>
            {value || 'Not provided'}
        </p>
    </div>
);

export function DriverDetailView({ driverId }: { driverId: string }) {
    const { getToken, userId } = useAuth();
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('overview');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectDocId, setRejectDocId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [approving, setApproving] = useState(false);

    const [driverRequest, setDriverRequest] = useState<{ _id: string; status: string } | null>(null);
    const [decidingRequest, setDecidingRequest] = useState<'approve' | 'reject' | null>(null);
    const [showRejectAppDialog, setShowRejectAppDialog] = useState(false);

    const [claim, setClaim] = useState<{ id: string; name: string } | null>(null);
    const [claimBusy, setClaimBusy] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await apiClient.get(`/api/admin/drivers/${driverId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProfile(res.data?.data || null);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to load driver profile');
        } finally {
            setLoading(false);
        }
    }, [getToken, driverId]);

    const fetchDriverRequest = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await apiClient.getDriverRequestByDriver(driverId, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDriverRequest(res.data?.data || null);
        } catch {
            // Non-fatal — the account may have been approved through another
            // path (invite link / convert lead) and never had a request at all.
        }
    }, [getToken, driverId]);

    useEffect(() => { fetchProfile(); fetchDriverRequest(); }, [fetchProfile, fetchDriverRequest]);

    // Claim this driver's review on mount so a second admin working the
    // review queue sees it's already being worked, and release it again on
    // navigate-away. A stale claim (tab closed without unmounting cleanly)
    // still expires server-side after its TTL — see reviewClaim.service.ts.
    useEffect(() => {
        if (!driverId) return;
        let cancelled = false;
        setClaimBusy(true);
        (async () => {
            try {
                const token = await getToken();
                await apiClient.post(
                    `/api/admin/review-queue/driver-profile/${driverId}/claim`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (!cancelled) setClaim({ id: userId || '', name: 'you' });
            } catch (error: any) {
                if (!cancelled) {
                    const claimedByName = error?.response?.data?.errors?.[0]?.claimedByName;
                    setClaim(claimedByName ? { id: '', name: claimedByName } : null);
                }
            } finally {
                if (!cancelled) setClaimBusy(false);
            }
        })();

        return () => {
            cancelled = true;
            void (async () => {
                try {
                    const token = await getToken();
                    await apiClient.post(
                        `/api/admin/review-queue/driver-profile/${driverId}/release`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } },
                    );
                } catch {
                    // Best-effort — a missed release still expires via the claim TTL.
                }
            })();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverId]);

    const handleApproveApplication = async () => {
        if (!driverRequest) return;
        setDecidingRequest('approve');
        try {
            const token = await getToken();
            await apiClient.approveDriverRequest(driverRequest._id, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Driver application approved — they can now log in');
            await Promise.all([fetchProfile(), fetchDriverRequest()]);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to approve the application');
        } finally {
            setDecidingRequest(null);
        }
    };

    const handleRejectApplication = async () => {
        if (!driverRequest) return;
        setDecidingRequest('reject');
        try {
            const token = await getToken();
            await apiClient.rejectDriverRequest(driverRequest._id, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Driver application rejected');
            setShowRejectAppDialog(false);
            await fetchDriverRequest();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reject the application');
        } finally {
            setDecidingRequest(null);
        }
    };

    const handleVerify = async (docId: string) => {
        setActionLoading(docId);
        try {
            const token = await getToken();
            await apiClient.patch(
                `/api/admin/drivers/${driverId}/documents/${docId}/verify`,
                {
                    verified: true,
                    expectedUploadedAt: documents.find((doc: ComplianceDocument) => doc._id === docId)?.uploadedAt || undefined,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await fetchProfile();
            toast.success('Document verified');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to verify document');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectDocument = async (docId: string, why: string) => {
        const reason = why.trim();
        if (reason.length < 3) {
            toast.error('Please provide a rejection reason (min 3 characters)');
            return;
        }
        setActionLoading(docId);
        try {
            const token = await getToken();
            await apiClient.patch(
                `/api/admin/drivers/${driverId}/documents/${docId}/reject`,
                {
                    reason,
                    expectedUploadedAt: documents.find((doc: ComplianceDocument) => doc._id === docId)?.uploadedAt || undefined,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await fetchProfile();
            toast.success('Document rejected');
            setRejectDocId(null);
            setRejectReason('');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reject document');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = (docId: string) => handleRejectDocument(docId, rejectReason);

    const submitNote = async () => {
        const note = noteDraft.trim();
        if (note.length < 2 || savingNote) return;
        setSavingNote(true);
        try {
            const token = await getToken();
            await apiClient.post(
                `/api/admin/drivers/${driverId}/notes`,
                { note },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setNoteDraft('');
            await fetchProfile();
            toast.success('Note added');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to add note');
        } finally {
            setSavingNote(false);
        }
    };

    const handleApproveDriver = async () => {
        setApproving(true);
        try {
            const token = await getToken();
            await apiClient.patch(
                `/api/admin/drivers/${driverId}/approve`,
                { expectedUpdatedAt: profile?.updatedAt || undefined },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await fetchProfile();
            toast.success('Driver profile approved successfully');
            setShowApproveDialog(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to approve driver profile');
        } finally {
            setApproving(false);
        }
    };

    const loadDocumentFile = useCallback(async (doc: ComplianceDocument) => {
        const token = await getToken();
        const response = await apiClient.get(
            `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(doc._id)}/file`,
            { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' },
        );
        const contentType =
            String(response.headers?.['content-type'] || '').split(';')[0] ||
            doc.mimeType ||
            'application/octet-stream';
        const blob = response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: contentType });
        return { url: URL.createObjectURL(blob), mimeType: contentType };
    }, [driverId, getToken]);

    const openReviewAt = (doc: ComplianceDocument) => {
        const idx = documents.findIndex((d: ComplianceDocument) => d._id === doc._id);
        setReviewIndex(idx < 0 ? 0 : idx);
        setReviewOpen(true);
    };

    const user = profile ? getUser(profile.userId) : null;
    const documents = useMemo(() => profile?.documents || [], [profile]);
    const reviewEligibility = (profile as any)?.eligibility as {
        eligible?: boolean;
        blockers?: string[];
    } | undefined;
    const finalApprovalBlockers = [
        ...(reviewEligibility?.blockers || []),
        ...(driverRequest?.status === 'rejected'
            ? ['Latest Driver Account application is rejected; a new pending application is required']
            : []),
    ];
    const finalApprovalEligible = Boolean(reviewEligibility?.eligible) && driverRequest?.status !== 'rejected';
    const reviewHistory = ((profile as any)?.reviewHistory || []) as Array<{
        _id?: string;
        actorName?: string;
        actorRole?: string;
        action?: string;
        previousStatus?: string;
        newStatus?: string;
        reason?: string;
        loadNumber?: string;
        createdAt?: string;
    }>;
    const requiredDocs = useMemo(() => REQUIRED_DOCUMENTS.filter(d => d.required), []);

    const missingDocs = useMemo(() => {
        if (!profile) return [];
        const uploadedTypes = new Set(documents.map((d: ComplianceDocument) => d.type));
        return requiredDocs.filter(r => !uploadedTypes.has(r.type));
    }, [profile, documents, requiredDocs]);

    const stats = useMemo(() => {
        if (!profile) return null;
        const docs = profile.documents || [];
        const verified = docs.filter((d: ComplianceDocument) => d.verified).length;
        const pending = docs.filter((d: ComplianceDocument) => !d.verified && d.reviewStatus !== 'rejected').length;
        const rejected = docs.filter((d: ComplianceDocument) => d.reviewStatus === 'rejected').length;
        return { verified, pending, rejected, total: docs.length };
    }, [profile]);

    const trailerInfo = trailerTypeOptions.find(t => t.value === profile?.trailerType);
    const hitchInfo = hitchTypeOptions.find(h => h.value === profile?.hitchType);

    if (loading) return <PageLoadingState className="min-h-[60vh]" />;

    if (!profile) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <ShieldAlert className="size-12 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground">Driver profile not found</p>
            <Link href="/admin/drivers"><Button variant="outline" className="gap-2"><ArrowLeft className="size-4" /> Back to Drivers</Button></Link>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-5 animate-in fade-in duration-300">

            <div className={cn(ADMIN_HEADER_PANEL_CLASS, 'p-5 sm:p-7')}>
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/0" />
                <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/6 blur-3xl" />
                <div className="relative">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/drivers" className="p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors border border-border/40 shrink-0">
                                <ArrowLeft className="size-4.5 text-foreground/80" />
                            </Link>
                            <Avatar className="size-14 border-2 border-border/40 shadow-xl shrink-0">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback className="bg-muted text-base font-medium text-foreground">{getInitials(user?.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{user?.name || 'Unknown Driver'}</h1>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {user?.email && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" />{user.email}</span>}
                                    <StatusBadge status={profile.verificationStatus || 'not_started'} domain="driverVerification" />
                                    <StatusBadge status={profile.operationalStatus || 'active'} domain="driverOperational" />
                                    {profile.isComplianceExpired && <Badge variant="outline" className="text-[10px] gap-0.5 border-red-200 bg-red-500/10 text-red-600 dark:border-red-500/30 dark:text-red-400"><AlertTriangle className="size-2.5" /> Expired</Badge>}
                                    {!claimBusy && claim && (
                                        <Badge variant="outline" className="gap-1 text-[10px] font-semibold">
                                            <UserRoundCheck className="size-2.5" /> {claim.id ? 'You are reviewing this driver' : `Being reviewed by ${claim.name}`}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 shrink-0">
                            <div className="text-right">
                                <span className="text-3xl font-semibold tabular-nums text-foreground">{profile.profileCompletionScore || 0}%</span>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Profile Score</p>
                            </div>
                            {profile.verificationStatus !== 'verified' && (
                                <Button onClick={() => setShowApproveDialog(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-11 px-5 rounded-xl font-bold">
                                    <BadgeCheck className="size-4.5" /> Approve Driver
                                </Button>
                            )}
                            {profile.verificationStatus === 'verified' && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                                    <BadgeCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Approved</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {profile.verificationStatus !== 'verified' && (
                        <div className="sm:hidden mb-5">
                            <Button onClick={() => setShowApproveDialog(true)} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-11 rounded-xl font-bold">
                                <BadgeCheck className="size-4.5" /> Approve Driver
                            </Button>
                        </div>
                    )}

                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-5">
                        <div
                            className={cn('h-full rounded-full bg-linear-to-r transition-all duration-500 ease-out',
                                (profile.profileCompletionScore || 0) >= 80 ? 'from-emerald-400 to-teal-400' :
                                    (profile.profileCompletionScore || 0) >= 50 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-400')}
                            style={{ width: `${profile.profileCompletionScore || 0}%` }}
                        />
                    </div>

                    {driverRequest?.status === 'pending' && (
                        <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0"><Clock className="size-5 text-amber-600 dark:text-amber-400" /></div>
                                <div>
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Driver Account Application — Pending Review</p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">Review the details below, then approve or reject this application. The driver will be notified by email either way.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" onClick={() => setShowRejectAppDialog(true)} disabled={!!decidingRequest}
                                    className="gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 rounded-xl">
                                    <XCircle className="size-4" /> Reject
                                </Button>
                                <Button onClick={handleApproveApplication} disabled={!!decidingRequest || !finalApprovalEligible}
                                    title={!finalApprovalEligible ? (finalApprovalBlockers[0] || 'Complete Driver Verification requirements first') : undefined}
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                                    {decidingRequest === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />} Approve Application
                                </Button>
                            </div>
                        </div>
                    )}
                    {driverRequest?.status === 'approved' && (
                        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2">
                            <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Account application approved — driver can log in</span>
                        </div>
                    )}
                    {driverRequest?.status === 'rejected' && (
                        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 flex items-center gap-2">
                            <XCircle className="size-4 text-red-600 dark:text-red-400" />
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">Account application rejected</span>
                        </div>
                    )}

                    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                            {TABS.map(t => (
                                <TabsTrigger key={t.id} value={t.id} className="relative flex-col sm:flex-row gap-1.5 sm:gap-2 py-2.5">
                                    <t.icon className="size-4" />
                                    <span className="text-[11px] sm:text-xs font-bold">{t.label}</span>
                                    {t.id === 'documents' && stats && stats.pending > 0 && (
                                        <span className="absolute top-1 right-1 sm:static size-4 rounded-full bg-amber-500 text-[9px] font-semibold text-white flex items-center justify-center">{stats.pending}</span>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div key={tab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {tab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatCard label="Documents" value={stats?.total || 0} icon={FileText} />
                                    <StatCard label="Verified" value={stats?.verified || 0} icon={CheckCircle2} tone={stats?.verified ? 'positive' : 'default'} />
                                    <StatCard label="Awaiting review" value={stats?.pending || 0} icon={Clock} tone={stats?.pending ? 'attention' : 'default'} />
                                    <StatCard label="Capacity" value={`${profile.maxVehicleCapacity || 0} veh`} icon={Truck} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    <div>
                                        <div className="rounded-lg border border-border bg-card">
                                            <div className="p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Truck className="size-4" /></div>
                                                    <div><h3 className="text-sm font-medium">Equipment Summary</h3><p className="text-xs text-muted-foreground">Truck & Trailer Configuration</p></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="Truck" value={profile.truckMake && profile.truckModel ? `${profile.truckMake} ${profile.truckModel}` : undefined} icon={Truck} />
                                                    <Field label="Year" value={profile.truckYear} icon={Calendar} />
                                                    <Field label="Trailer Type" value={trailerInfo?.label} icon={Wrench} />
                                                    <Field label="Capacity" value={profile.maxVehicleCapacity ? `${profile.maxVehicleCapacity} vehicles` : undefined} icon={Gauge} />
                                                    <Field label="DOT #" value={profile.dotNumber} mono icon={Hash} />
                                                    <Field label="MC #" value={profile.mcNumber} mono icon={Hash} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="rounded-lg border border-border bg-card">
                                            <div className="p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Fingerprint className="size-4" /></div>
                                                    <div><h3 className="text-sm font-medium">Identity & Verification</h3><p className="text-xs text-muted-foreground">Security Status</p></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="SSN" value={profile.ssnLast4 ? `••••${profile.ssnLast4}` : undefined} mono icon={Lock} />
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Shield className="size-3 text-muted-foreground/60" />Background Check</p>
                                                        <div className="flex items-center gap-1.5">
                                                            {profile.backgroundCheckConsent ?
                                                                <><CheckCircle2 className="size-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Authorized</span></> :
                                                                <><XCircle className="size-4 text-muted-foreground" /><span className="text-sm font-semibold text-muted-foreground">Not authorized</span></>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Scale className="size-3 text-muted-foreground/60" />Agreement</p>
                                                        <div className="flex items-center gap-1.5">
                                                            {profile.verificationAgreement ?
                                                                <><CheckCircle2 className="size-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Accepted</span></> :
                                                                <><XCircle className="size-4 text-muted-foreground" /><span className="text-sm font-semibold text-muted-foreground">Not accepted</span></>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><BadgeCheck className="size-3 text-muted-foreground/60" />Verification</p>
                                                        <StatusBadge status={profile.verificationStatus || 'not_started'} domain="driverVerification" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="rounded-lg border border-border bg-card">
                                            <div className="p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><CreditCard className="size-4" /></div>
                                                    <div><h3 className="text-sm font-medium">Credentials</h3><p className="text-xs text-muted-foreground">License & Insurance</p></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="CDL Number" value={profile.driversLicenseNumber} mono />
                                                    <Field label="License State" value={profile.licenseState} />
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CDL Expiration</p>
                                                        <p className={cn('text-sm font-semibold', getExpStatus(profile.licenseExpirationDate).c)}>
                                                            {profile.licenseExpirationDate ? `${fmtDate(profile.licenseExpirationDate)} (${getExpStatus(profile.licenseExpirationDate).l})` : 'Not set'}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Medical Expiration</p>
                                                        <p className={cn('text-sm font-semibold', getExpStatus(profile.medicalCardExpirationDate).c)}>
                                                            {profile.medicalCardExpirationDate ? `${fmtDate(profile.medicalCardExpirationDate)} (${getExpStatus(profile.medicalCardExpirationDate).l})` : 'Not set'}
                                                        </p>
                                                    </div>
                                                    <Field label="Insurance Provider" value={profile.insuranceProvider} />
                                                    <Field label="Policy Number" value={profile.insurancePolicyNumber} mono />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="rounded-lg border border-border bg-card">
                                            <div className="p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><MapPin className="size-4" /></div>
                                                    <div><h3 className="text-sm font-medium">Logistics</h3><p className="text-xs text-muted-foreground">Location & Availability</p></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="Home Base" value={profile.homeBase?.address || (profile.homeBase?.city && profile.homeBase?.state ? `${profile.homeBase.city}, ${profile.homeBase.state}` : undefined)} icon={MapPin} />
                                                    <Field label="Service Radius" value={profile.serviceRadius ? `${profile.serviceRadius} mi` : undefined} icon={Globe} />
                                                    <div className="col-span-2 space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preferred Routes</p>
                                                        {profile.preferredRoutes?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">{profile.preferredRoutes.map(r => <Badge key={r} variant="outline" className="text-[10px] font-semibold">{r}</Badge>)}</div>
                                                        ) : <p className="text-sm font-semibold text-muted-foreground italic">Not provided</p>}
                                                    </div>
                                                    <div className="col-span-2 space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available Days</p>
                                                        {profile.availableDays?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">{profile.availableDays.map(d => <Badge key={d} variant="outline" className="text-[10px] capitalize font-semibold">{d}</Badge>)}</div>
                                                        ) : <p className="text-sm font-semibold text-muted-foreground italic">Not provided</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 px-1">
                                    <span>Profile created {fmtDate(profile.createdAt)}</span>
                                    <span>·</span>
                                    <span>Last updated {fmtDate(profile.updatedAt)}</span>
                                </div>
                            </div>
                        )}

                        {tab === 'equipment' && (
                            <div className="space-y-6">
                                {/* Truck Details */}
                                <div>
                                    <div className="rounded-lg border border-border bg-card">
                                        <div className="p-5">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Truck className="size-4" /></div>
                                                <div><h3 className="text-sm font-medium">Truck Details</h3><p className="text-xs text-muted-foreground">Primary Vehicle Information</p></div>
                                                {profile.truckColor && (
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <div className="size-5 rounded-full border-2 border-white/20 shadow-sm" style={{ backgroundColor: profile.truckColor?.toLowerCase() || '#888' }} />
                                                        <span className="text-xs font-semibold capitalize text-muted-foreground">{profile.truckColor}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <Field label="Make" value={profile.truckMake} icon={Truck} />
                                                <Field label="Model" value={profile.truckModel} icon={Wrench} />
                                                <Field label="Year" value={profile.truckYear} icon={Calendar} />
                                                <Field label="Engine Type" value={profile.engineType} icon={Gauge} />
                                                <Field label="GVWR" value={profile.gvwr ? `${profile.gvwr.toLocaleString()} lbs` : undefined} icon={Gauge} />
                                                <Field label="VIN" value={profile.vin} mono icon={Hash} />
                                                <Field label="License Plate" value={profile.plateNumber} mono icon={CreditCard} />
                                                <Field label="Color" value={profile.truckColor} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {/* Operating Authority */}
                                    <div>
                                        <div className="rounded-lg border border-border bg-card h-full">
                                            <div className="p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Building2 className="size-4" /></div>
                                                    <div><h3 className="text-sm font-medium">Operating Authority</h3><p className="text-xs text-muted-foreground">Federal Numbers</p></div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border/15 bg-muted/5">
                                                        <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Hash className="size-5 text-blue-500" /></div>
                                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DOT Number</p><p className="font-mono text-base font-semibold">{profile.dotNumber || '—'}</p></div>
                                                    </div>
                                                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border/15 bg-muted/5">
                                                        <div className="size-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Hash className="size-5 text-violet-500" /></div>
                                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">MC Number</p><p className="font-mono text-base font-semibold">{profile.mcNumber || '—'}</p></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Special Features */}
                                    <div>
                                        <div className="rounded-lg border border-border bg-card h-full">
                                            <div className="p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Star className="size-4" /></div>
                                                    <div><h3 className="text-sm font-medium">Special Features</h3><p className="text-xs text-muted-foreground">Equipment Capabilities</p></div>
                                                    <Badge className="ml-auto text-xs font-bold bg-linear-to-r from-violet-600 to-purple-500 text-white border-0 shadow-lg shadow-violet-500/25">{profile.specialFeatures?.length || 0}</Badge>
                                                </div>
                                                {profile.specialFeatures?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {profile.specialFeatures.map((f) => {
                                                            const opt = specialFeatureOptions.find(o => o.value === f);
                                                            return (
                                                                <div key={f}>
                                                                    <Badge variant="outline" className="text-xs capitalize font-semibold px-3 py-1.5 rounded-lg bg-violet-500/5 border-violet-500/20 text-violet-700 dark:text-violet-300">
                                                                        <CheckCircle2 className="size-3 mr-1.5 text-violet-500" />{opt?.label || f.replace(/_/g, ' ')}
                                                                    </Badge>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : <p className="text-sm text-muted-foreground italic">No features configured</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trailer Details */}
                                <div>
                                    <div className="rounded-lg border border-border bg-card">
                                        <div className="p-5">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Wrench className="size-4" /></div>
                                                <div><h3 className="text-sm font-medium">Trailer Details</h3><p className="text-xs text-muted-foreground">Trailer Configuration & Specs</p></div>
                                                {trailerInfo && (
                                                    <Badge className="ml-auto text-[10px] font-bold capitalize bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{trailerInfo.category}</Badge>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                                <Field label="Type" value={trailerInfo?.label} icon={Wrench} />
                                                <Field label="Make" value={profile.trailerMake} />
                                                <Field label="Model" value={profile.trailerModel} />
                                                <Field label="Year" value={profile.trailerYear} icon={Calendar} />
                                                <Field label="Hitch" value={hitchInfo?.label} />
                                                <Field label="Capacity" value={trailerInfo?.capacity} icon={Gauge} />
                                                <Field label="Length" value={profile.trailerLength ? `${profile.trailerLength} ft` : undefined} />
                                                <Field label="Axles" value={profile.trailerAxles} />
                                                <Field label="GVWR" value={profile.trailerGvwr ? `${profile.trailerGvwr.toLocaleString()} lbs` : undefined} icon={Gauge} />
                                                <Field label="Max Vehicles" value={profile.maxVehicleCapacity} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'documents' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Required complete</p>
                                            <p className="text-lg font-semibold tabular-nums">
                                                {stats?.verified || 0}
                                                <span className="text-sm font-normal text-muted-foreground">/{requiredDocs.length}</span>
                                            </p>
                                        </div>
                                        <div className="h-8 w-px bg-border" />
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Awaiting review</p>
                                                <p className={cn('text-lg font-semibold tabular-nums', (stats?.pending || 0) > 0 && 'text-amber-600 dark:text-amber-400')}>
                                                    {stats?.pending || 0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Rejected</p>
                                                <p className={cn('text-lg font-semibold tabular-nums', (stats?.rejected || 0) > 0 && 'text-red-600 dark:text-red-400')}>
                                                    {stats?.rejected || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => { setReviewIndex(0); setReviewOpen(true); }}
                                        disabled={documents.length === 0}
                                        className="gap-2"
                                    >
                                        <Eye className="size-4" />
                                        {(stats?.pending || 0) > 0 ? `Review ${stats?.pending} pending` : 'Open review'}
                                    </Button>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-border bg-card">
                                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Compliance documents
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {documents.length} uploaded
                                        </span>
                                    </div>

                                    <div className="divide-y divide-border">
                                        {REQUIRED_DOCUMENTS.map((req) => {
                                            const ups = documents.filter((d: ComplianceDocument) => d.type === req.type);
                                            const status = ups.length === 0
                                                ? 'missing'
                                                : ups.some((d: ComplianceDocument) => d.verified)
                                                    ? 'approved'
                                                    : ups.some((d: ComplianceDocument) => d.reviewStatus === 'rejected')
                                                        ? 'rejected'
                                                        : 'pending';
                                            const DocIcon = DOC_ICONS[req.type] || FileText;
                                            const latest = ups[ups.length - 1];
                                            const ex = latest?.expiresAt ? getExpStatus(latest.expiresAt) : null;

                                            return (
                                                <div key={req.type} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                                                    <div className={cn(
                                                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                                                        status === 'approved' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : status === 'rejected' ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400'
                                                                : status === 'pending' ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                    : 'border-border bg-muted text-muted-foreground',
                                                    )}>
                                                        <DocIcon className="size-4" />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-medium text-foreground">{req.label}</span>
                                                            {!req.required && (
                                                                <span className="rounded border border-border px-1.5 py-px text-[10px] text-muted-foreground">
                                                                    Optional
                                                                </span>
                                                            )}
                                                            <StatusBadge status={status} domain="documentReview" />
                                                        </div>

                                                        {latest ? (
                                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                                <span className="truncate">{latest.fileName}</span>
                                                                <span aria-hidden>·</span>
                                                                <span className="tabular-nums">{fmtSize(latest.fileSize)}</span>
                                                                <span aria-hidden>·</span>
                                                                <span>Uploaded {fmtDate(latest.uploadedAt)}</span>
                                                                {ex && (
                                                                    <>
                                                                        <span aria-hidden>·</span>
                                                                        <span className={ex.c}>{ex.l}</span>
                                                                    </>
                                                                )}
                                                                {ups.length > 1 && (
                                                                    <>
                                                                        <span aria-hidden>·</span>
                                                                        <span>{ups.length} versions</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="mt-1 text-xs text-muted-foreground">{req.description}</p>
                                                        )}

                                                        {latest?.reviewStatus === 'rejected' && latest.rejectionReason && (
                                                            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                                                                <Ban className="mt-0.5 size-3 shrink-0" />
                                                                {latest.rejectionReason}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {latest && (
                                                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                                            {!latest.verified && latest.reviewStatus !== 'rejected' && (
                                                                <>
                                                                    <Button
                                                                        size="icon" variant="ghost"
                                                                        className="size-8 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                                                                        onClick={() => handleVerify(latest._id)}
                                                                        disabled={actionLoading === latest._id}
                                                                        aria-label={`Approve ${req.label}`}
                                                                    >
                                                                        {actionLoading === latest._id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                                                    </Button>
                                                                    <Button
                                                                        size="icon" variant="ghost"
                                                                        className="size-8 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                                                        onClick={() => { setRejectDocId(latest._id); setRejectReason(''); }}
                                                                        disabled={actionLoading === latest._id}
                                                                        aria-label={`Reject ${req.label}`}
                                                                    >
                                                                        <XCircle className="size-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 gap-1.5"
                                                                onClick={() => openReviewAt(latest)}
                                                            >
                                                                <Eye className="size-3.5" /> Review
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'compliance' && (
                            <div className="space-y-6">
                                {/* License & Insurance */}
                                <div>
                                    <div className="rounded-lg border border-border bg-card">
                                        <div className="p-5">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><CreditCard className="size-4" /></div>
                                                <div className="flex-1"><h3 className="text-sm font-medium">License & Insurance Details</h3><p className="text-xs text-muted-foreground">Compliance expiration tracking</p></div>
                                                {profile.isComplianceExpired && <Badge variant="destructive" className="gap-1 text-xs font-bold"><AlertTriangle className="size-3" /> Expired Items</Badge>}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {/* CDL */}
                                                <div className={cn('p-4 rounded-xl border-2 space-y-3 transition-all',
                                                    getExpStatus(profile.licenseExpirationDate).c.includes('red') ? 'border-red-500/20 bg-red-500/3' :
                                                        getExpStatus(profile.licenseExpirationDate).c.includes('amber') ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15')}>
                                                    <div className="flex items-center gap-2"><CreditCard className="size-4 text-blue-500" /><p className="text-xs font-semibold">Commercial Driver License</p></div>
                                                    <Field label="License Number" value={profile.driversLicenseNumber} mono />
                                                    <Field label="Issuing State" value={profile.licenseState} />
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiration</p>
                                                        <p className={cn('text-sm font-bold', getExpStatus(profile.licenseExpirationDate).c)}>
                                                            {profile.licenseExpirationDate ? fmtDate(profile.licenseExpirationDate) : 'Not set'}
                                                        </p>
                                                        {profile.licenseExpirationDate && (
                                                            <Badge className={cn('text-[9px] font-bold',
                                                                getExpStatus(profile.licenseExpirationDate).c.includes('red') ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                                    getExpStatus(profile.licenseExpirationDate).c.includes('amber') ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20')}>
                                                                {getExpStatus(profile.licenseExpirationDate).l}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Medical Card */}
                                                <div className={cn('p-4 rounded-xl border-2 space-y-3 transition-all',
                                                    getExpStatus(profile.medicalCardExpirationDate).c.includes('red') ? 'border-red-500/20 bg-red-500/3' :
                                                        getExpStatus(profile.medicalCardExpirationDate).c.includes('amber') ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15')}>
                                                    <div className="flex items-center gap-2"><FileText className="size-4 text-violet-500" /><p className="text-xs font-semibold">DOT Medical Card</p></div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiration</p>
                                                        <p className={cn('text-sm font-bold', getExpStatus(profile.medicalCardExpirationDate).c)}>
                                                            {profile.medicalCardExpirationDate ? fmtDate(profile.medicalCardExpirationDate) : 'Not set'}
                                                        </p>
                                                        {profile.medicalCardExpirationDate && (
                                                            <Badge className={cn('text-[9px] font-bold',
                                                                getExpStatus(profile.medicalCardExpirationDate).c.includes('red') ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                                    getExpStatus(profile.medicalCardExpirationDate).c.includes('amber') ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20')}>
                                                                {getExpStatus(profile.medicalCardExpirationDate).l}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Insurance */}
                                                <div className={cn('p-4 rounded-xl border-2 space-y-3 transition-all',
                                                    getExpStatus(profile.insuranceExpirationDate).c.includes('red') ? 'border-red-500/20 bg-red-500/3' :
                                                        getExpStatus(profile.insuranceExpirationDate).c.includes('amber') ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15')}>
                                                    <div className="flex items-center gap-2"><Shield className="size-4 text-emerald-500" /><p className="text-xs font-semibold">Insurance</p></div>
                                                    <Field label="Provider" value={profile.insuranceProvider} />
                                                    <Field label="Policy Number" value={profile.insurancePolicyNumber} mono />
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiration</p>
                                                        <p className={cn('text-sm font-bold', getExpStatus(profile.insuranceExpirationDate).c)}>
                                                            {profile.insuranceExpirationDate ? fmtDate(profile.insuranceExpirationDate) : 'Not set'}
                                                        </p>
                                                        {profile.insuranceExpirationDate && (
                                                            <Badge className={cn('text-[9px] font-bold',
                                                                getExpStatus(profile.insuranceExpirationDate).c.includes('red') ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                                    getExpStatus(profile.insuranceExpirationDate).c.includes('amber') ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20')}>
                                                                {getExpStatus(profile.insuranceExpirationDate).l}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Identity Verification */}
                                <div>
                                    <div className="rounded-lg border border-border bg-card">
                                        <div className="p-5">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Fingerprint className="size-4" /></div>
                                                <div><h3 className="text-sm font-medium">Identity Verification</h3><p className="text-xs text-muted-foreground">Security & compliance checks</p></div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { ok: !!profile.ssnLast4, label: 'SSN (Last 4)', value: profile.ssnLast4 ? `••••${profile.ssnLast4}` : '—', mono: true, iconOk: CheckCircle2, iconNo: Lock },
                                                    { ok: !!profile.backgroundCheckConsent, label: 'Background Check', value: profile.backgroundCheckConsent ? 'Authorized' : 'Not authorized', sub: profile.backgroundCheckConsentDate ? fmtDate(profile.backgroundCheckConsentDate) : undefined, iconOk: CheckCircle2, iconNo: XCircle },
                                                    { ok: !!profile.verificationAgreement, label: 'Agreement', value: profile.verificationAgreement ? 'Accepted' : 'Not accepted', sub: profile.verificationAgreementDate ? fmtDate(profile.verificationAgreementDate) : undefined, iconOk: CheckCircle2, iconNo: Scale },
                                                    { ok: profile.verificationStatus === 'verified', pending: profile.verificationStatus === 'under_review', label: 'Status', value: (profile.verificationStatus || 'not_started').replace(/_/g, ' '), iconOk: BadgeCheck, iconNo: ShieldAlert, iconPending: Clock },
                                                ].map((item) => {
                                                    const isPending = 'pending' in item && item.pending;
                                                    const StatusIcon = isPending ? (item as { iconPending: React.ElementType }).iconPending : item.ok ? item.iconOk : item.iconNo;
                                                    return (
                                                        <div key={item.label}
                                                            className={cn('flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                                                                item.ok ? 'border-emerald-500/20 bg-emerald-500/3' :
                                                                    isPending ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15')}>
                                                            <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                                                                item.ok ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' :
                                                                    isPending ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-muted/20')}>
                                                                <StatusIcon className={cn('size-5',
                                                                    item.ok ? 'text-emerald-500' : isPending ? 'text-amber-500' : 'text-muted-foreground')} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold">{item.label}</p>
                                                                <p className={cn('text-sm font-semibold capitalize',
                                                                    item.ok ? 'text-emerald-600 dark:text-emerald-400' :
                                                                        isPending ? 'text-amber-600 dark:text-amber-400' : '')}>
                                                                    {item.value}
                                                                </p>
                                                                {'sub' in item && item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {profile.verificationNotes && (
                                                <div className="mt-5 p-4 rounded-xl border-2 border-border/15 bg-muted/5">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><FileText className="size-3" />Admin Notes</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{profile.verificationNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-card">
                                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <History className="size-3.5 text-muted-foreground" />
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                Review timeline
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{reviewHistory.length} events</span>
                                    </div>

                                    <div className="border-b border-border p-3">
                                        <div className="flex gap-2">
                                            <Input
                                                value={noteDraft}
                                                onChange={(e) => setNoteDraft(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitNote(); } }}
                                                placeholder="Leave a note for the review team..."
                                                maxLength={1000}
                                                className="h-9"
                                            />
                                            <Button
                                                size="sm"
                                                className="h-9 shrink-0"
                                                onClick={() => void submitNote()}
                                                disabled={savingNote || noteDraft.trim().length < 2}
                                            >
                                                {savingNote ? <Loader2 className="size-4 animate-spin" /> : 'Add note'}
                                            </Button>
                                        </div>
                                    </div>

                                    {reviewHistory.length === 0 ? (
                                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No review activity yet.
                                        </p>
                                    ) : (
                                        <div className="max-h-96 overflow-y-auto">
                                            {reviewHistory.map((event, index) => {
                                                const isNote = event.action === 'note_added';
                                                const action = String(event.action || 'review event');
                                                return (
                                                    <div
                                                        key={event._id || `${event.createdAt}-${index}`}
                                                        className="relative flex gap-3 px-4 py-3 last:pb-4"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <span className={cn(
                                                                'mt-1 size-2 shrink-0 rounded-full',
                                                                isNote ? 'bg-blue-500'
                                                                    : action.includes('approved') ? 'bg-emerald-500'
                                                                        : action.includes('rejected') ? 'bg-red-500'
                                                                            : 'bg-muted-foreground/40',
                                                            )} />
                                                            {index < reviewHistory.length - 1 && (
                                                                <span className="mt-1 w-px flex-1 bg-border" />
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 flex-1 pb-1">
                                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                                                <p className="text-sm text-foreground">
                                                                    <span className="font-medium">{event.actorName || 'System'}</span>
                                                                    <span className="text-muted-foreground">
                                                                        {' '}{isNote ? 'left a note' : action.replace(/_/g, ' ')}
                                                                    </span>
                                                                </p>
                                                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                                    {fmtDateTime(event.createdAt)}
                                                                </span>
                                                            </div>

                                                            {!isNote && (event.previousStatus || event.newStatus) && (
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    {event.previousStatus || '\u2014'} &rarr; <span className="font-medium text-foreground">{event.newStatus || '\u2014'}</span>
                                                                </p>
                                                            )}

                                                            {event.reason && (
                                                                <p className={cn(
                                                                    'mt-1.5 rounded-md px-2.5 py-1.5 text-xs',
                                                                    isNote ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground',
                                                                )}>
                                                                    {event.reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

            </div>

            <DocumentReviewWorkspace
                open={reviewOpen}
                onOpenChange={setReviewOpen}
                documents={documents}
                startIndex={reviewIndex}
                profile={profile}
                driverName={user?.name || 'Unknown Driver'}
                loadFile={loadDocumentFile}
                onApprove={(doc) => handleVerify(doc._id)}
                onReject={(doc, why) => handleRejectDocument(doc._id, why)}
            />

            <Dialog open={!!rejectDocId} onOpenChange={() => setRejectDocId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="size-5" /> Reject Document</DialogTitle>
                        <DialogDescription>The driver will be notified and asked to re-upload.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rejection Reason</label>
                        <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="e.g. Document is blurry, expired, wrong type..." maxLength={500} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDocId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => rejectDocId && handleReject(rejectDocId)}
                            disabled={!rejectReason.trim() || rejectReason.trim().length < 3 || !!actionLoading} className="gap-2">
                            {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BadgeCheck className="size-5 text-emerald-500" /> Approve Driver Profile
                        </DialogTitle>
                        <DialogDescription>
                            The backend will re-check all Driver Information, required document approvals, Agreement status and credential blockers before final approval.
                        </DialogDescription>
                    </DialogHeader>
                    {missingDocs.length > 0 && (
                        <div className="rounded-xl border-2 border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                        {missingDocs.length} missing document{missingDocs.length > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                                        The following required documents have not been uploaded:
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1.5 pl-7">
                                {missingDocs.map(d => (
                                    <div key={d.type} className="flex items-center gap-2 text-xs">
                                        <XCircle className="size-3.5 text-amber-500 shrink-0" />
                                        <span className="font-semibold text-amber-700 dark:text-amber-300">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {stats && stats.pending > 0 && (
                        <div className="rounded-xl border border-border/20 bg-muted/10 p-3 flex items-center gap-2">
                            <Clock className="size-4 text-amber-500 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                                <span className="font-bold">{stats.pending}</span> document{stats.pending > 1 ? 's' : ''} still pending review
                            </p>
                        </div>
                    )}
                    {finalApprovalBlockers.length > 0 && (
                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Final approval unavailable</p>
                            <div className="mt-2 space-y-1.5">
                                {finalApprovalBlockers.map((blocker) => (
                                    <div key={blocker} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                                        <span>{blocker}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
                        <Button onClick={handleApproveDriver} disabled={approving || !finalApprovalEligible}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
                            {approving ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                            Approve Driver
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showRejectAppDialog} onOpenChange={setShowRejectAppDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="size-5 text-red-500" /> Reject Application
                        </DialogTitle>
                        <DialogDescription>
                            {user?.name || 'This driver'} will be notified by email that their driver application was not approved. This cannot be undone from here.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowRejectAppDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectApplication} disabled={decidingRequest === 'reject'} className="gap-2">
                            {decidingRequest === 'reject' ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} Reject Application
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}