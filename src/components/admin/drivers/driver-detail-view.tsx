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
import {
    Loader2, ArrowLeft, Truck, Shield, FileText, FileCheck, CreditCard,
    CheckCircle2, XCircle, Clock, Eye, Ban, Hash, Gauge,
    Star, MapPin, Calendar, Fingerprint, Lock, Scale,
    BadgeCheck, ShieldAlert, AlertTriangle, UserCheck,
    Mail, Globe, Wrench, Building2, History
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { REQUIRED_DOCUMENTS, trailerTypeOptions, specialFeatureOptions, hitchTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

const Stat = ({ label, value, color, icon: Icon, gradient }: { label: string; value: string | number; color?: string; icon?: React.ElementType; gradient?: string }) => (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 p-4">
        {gradient && <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r', gradient)} />}
        <div className="flex items-center gap-3">
            {Icon && <div className={cn('size-10 rounded-xl flex items-center justify-center bg-muted/20', color)}><Icon className="size-5" /></div>}
            <div>
                <p className={cn('text-2xl font-black tabular-nums', color || 'text-foreground')}>{value}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{label}</p>
            </div>
        </div>
    </motion.div>
);

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
    const { getToken } = useAuth();
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('overview');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectDocId, setRejectDocId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null);
    const [previewObjectUrl, setPreviewObjectUrl] = useState('');
    const [previewMimeType, setPreviewMimeType] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [approving, setApproving] = useState(false);

    const [driverRequest, setDriverRequest] = useState<{ _id: string; status: string } | null>(null);
    const [decidingRequest, setDecidingRequest] = useState<'approve' | 'reject' | null>(null);
    const [showRejectAppDialog, setShowRejectAppDialog] = useState(false);

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

    const handleReject = async (docId: string) => {
        if (!rejectReason.trim() || rejectReason.trim().length < 3) {
            toast.error('Please provide a rejection reason (min 3 characters)');
            return;
        }
        setActionLoading(docId);
        try {
            const token = await getToken();
            await apiClient.patch(
                `/api/admin/drivers/${driverId}/documents/${docId}/reject`,
                {
                    reason: rejectReason.trim(),
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

    useEffect(() => {
        if (!previewDoc?._id) {
            if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
            setPreviewObjectUrl('');
            setPreviewMimeType('');
            setPreviewError('');
            setPreviewLoading(false);
            return;
        }

        let cancelled = false;
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        setPreviewObjectUrl('');
        setPreviewMimeType(previewDoc.mimeType || '');
        setPreviewError('');
        setPreviewLoading(true);

        void (async () => {
            try {
                const token = await getToken();
                const response = await apiClient.get(
                    `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(previewDoc._id)}/file`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: 'blob',
                    },
                );
                if (cancelled) return;
                const contentType =
                    String(response.headers?.['content-type'] || '').split(';')[0] ||
                    previewDoc.mimeType ||
                    'application/octet-stream';
                const blob = response.data instanceof Blob
                    ? response.data
                    : new Blob([response.data], { type: contentType });
                setPreviewMimeType(contentType);
                setPreviewObjectUrl(URL.createObjectURL(blob));
            } catch (error: any) {
                if (!cancelled) {
                    setPreviewError(
                        error?.response?.data?.message ||
                        'This document could not be opened securely.',
                    );
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    // previewObjectUrl is intentionally excluded to avoid refetching after the
    // created object URL is stored. It is revoked on the next preview/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverId, getToken, previewDoc]);

    useEffect(() => () => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    }, [previewObjectUrl]);

    const closePreview = () => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        setPreviewObjectUrl('');
        setPreviewDoc(null);
        setPreviewMimeType('');
        setPreviewError('');
        setPreviewLoading(false);
    };

    const user = profile ? getUser(profile.userId) : null;
    const documents = profile?.documents || [];
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
    const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
    const optionalDocs = REQUIRED_DOCUMENTS.filter(d => !d.required);

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

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative"><div className="size-16 rounded-full border-4 border-primary/20 animate-pulse" /><Loader2 className="size-8 animate-spin text-primary absolute inset-0 m-auto" /></div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Driver Profile</p>
        </div>
    );

    if (!profile) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <ShieldAlert className="size-12 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground">Driver profile not found</p>
            <Link href="/admin/drivers"><Button variant="outline" className="gap-2"><ArrowLeft className="size-4" /> Back to Drivers</Button></Link>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">

                <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                    <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950" />
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                    <div className="relative p-5 sm:p-7">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div className="flex items-center gap-4">
                                <Link href="/admin/drivers" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm shrink-0">
                                    <ArrowLeft className="size-4.5 text-white/80" />
                                </Link>
                                <Avatar className="size-14 border-2 border-white/15 shadow-xl shrink-0">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback className="bg-white/10 text-white font-black text-lg">{getInitials(user?.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{user?.name || 'Unknown Driver'}</h1>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {user?.email && <span className="flex items-center gap-1.5 text-xs text-white/40"><Mail className="size-3" />{user.email}</span>}
                                        <Badge className={cn('text-[10px] font-bold px-2 h-5 border-0',
                                            profile.verificationStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
                                                profile.verificationStatus === 'under_review' ? 'bg-amber-500/20 text-amber-400' :
                                                    profile.verificationStatus === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-white/10 text-white/50')}>
                                            {(profile.verificationStatus || 'not_started').replace(/_/g, ' ')}
                                        </Badge>
                                        <Badge className={cn('text-[10px] font-bold px-2 h-5 border-0 capitalize',
                                            profile.operationalStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                                profile.operationalStatus === 'maintenance' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-white/10 text-white/50')}>
                                            {(profile.operationalStatus || 'unknown').replace(/_/g, ' ')}
                                        </Badge>
                                        {profile.isComplianceExpired && <Badge className="text-[10px] bg-red-500/20 text-red-400 border-0 gap-0.5"><AlertTriangle className="size-2.5" /> Expired</Badge>}
                                    </div>
                                </div>
                            </div>
                            <div className="hidden sm:flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                    <span className="text-5xl font-black tabular-nums text-white">{profile.profileCompletionScore || 0}%</span>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Profile Score</p>
                                </div>
                                {profile.verificationStatus !== 'verified' && (
                                    <Button onClick={() => setShowApproveDialog(true)}
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20 h-11 px-5 rounded-xl font-bold">
                                        <BadgeCheck className="size-4.5" /> Approve Driver
                                    </Button>
                                )}
                                {profile.verificationStatus === 'verified' && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                                        <BadgeCheck className="size-5 text-emerald-400" />
                                        <span className="text-sm font-bold text-emerald-400">Approved</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {profile.verificationStatus !== 'verified' && (
                            <div className="sm:hidden mb-5">
                                <Button onClick={() => setShowApproveDialog(true)}
                                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20 h-11 rounded-xl font-bold">
                                    <BadgeCheck className="size-4.5" /> Approve Driver
                                </Button>
                            </div>
                        )}

                        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-5">
                            <motion.div className={cn('h-full rounded-full bg-linear-to-r',
                                (profile.profileCompletionScore || 0) >= 80 ? 'from-emerald-400 to-teal-400' :
                                    (profile.profileCompletionScore || 0) >= 50 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-400')}
                                initial={false} animate={{ width: `${profile.profileCompletionScore || 0}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                        </div>

                        {driverRequest?.status === 'pending' && (
                            <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0"><Clock className="size-5 text-amber-400" /></div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-300">Driver Account Application — Pending Review</p>
                                        <p className="text-xs text-amber-400/70 mt-0.5">Review the details below, then approve or reject this application. The driver will be notified by email either way.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button variant="outline" onClick={() => setShowRejectAppDialog(true)} disabled={!!decidingRequest}
                                        className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl">
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
                                <BadgeCheck className="size-4 text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-400">Account application approved — driver can log in</span>
                            </div>
                        )}
                        {driverRequest?.status === 'rejected' && (
                            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 flex items-center gap-2">
                                <XCircle className="size-4 text-red-400" />
                                <span className="text-xs font-semibold text-red-400">Account application rejected</span>
                            </div>
                        )}

                        <div className="flex gap-1.5">
                            {TABS.map(t => {
                                const active = tab === t.id;
                                return (
                                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                        className={cn('flex-1 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 p-3 sm:p-3.5 rounded-xl transition-all border relative overflow-hidden',
                                            active ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/3 border-white/5 hover:bg-white/6')}>
                                        {active && <motion.div layoutId="drv-tab" className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary to-blue-400" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}
                                        <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-white/10' : 'bg-white/5')}>
                                            <t.icon className={cn('size-4', active ? 'text-white' : 'text-white/30')} />
                                        </div>
                                        <span className={cn('text-[11px] sm:text-xs font-bold', active ? 'text-white' : 'text-white/30')}>{t.label}</span>
                                        {t.id === 'documents' && stats && stats.pending > 0 && (
                                            <span className="absolute top-2 right-2 size-4 rounded-full bg-amber-500 text-[9px] font-black text-white flex items-center justify-center">{stats.pending}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

                        {tab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <Stat label="Documents" value={stats?.total || 0} icon={FileText} gradient="from-blue-500 to-indigo-500" />
                                    <Stat label="Verified" value={stats?.verified || 0} color="text-emerald-500" icon={CheckCircle2} gradient="from-emerald-500 to-teal-500" />
                                    <Stat label="Pending" value={stats?.pending || 0} color="text-amber-500" icon={Clock} gradient="from-amber-500 to-orange-500" />
                                    <Stat label="Capacity" value={`${profile.maxVehicleCapacity || 0} veh`} color="text-blue-500" icon={Truck} gradient="from-violet-500 to-purple-500" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                            <div className="absolute inset-0 bg-linear-to-br from-blue-500/3 via-transparent to-indigo-500/3" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-600 to-indigo-500" />
                                            <div className="relative p-6">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-11 rounded-xl bg-linear-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25"><Truck className="size-5" /></div>
                                                    <div><h3 className="text-sm font-black">Equipment Summary</h3><p className="text-[10px] text-muted-foreground">Truck & Trailer Configuration</p></div>
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
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                            <div className="absolute inset-0 bg-linear-to-br from-violet-500/3 via-transparent to-purple-500/3" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-600 to-purple-500" />
                                            <div className="relative p-6">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-11 rounded-xl bg-linear-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25"><Fingerprint className="size-5" /></div>
                                                    <div><h3 className="text-sm font-black">Identity & Verification</h3><p className="text-[10px] text-muted-foreground">Security Status</p></div>
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
                                                        <Badge className={cn('text-[10px] capitalize font-bold',
                                                            profile.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                                profile.verificationStatus === 'under_review' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                    'bg-muted/20 text-muted-foreground border-border/20')}>
                                                            {(profile.verificationStatus || 'not_started').replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/3 via-transparent to-teal-500/3" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-600 to-teal-500" />
                                            <div className="relative p-6">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-11 rounded-xl bg-linear-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25"><CreditCard className="size-5" /></div>
                                                    <div><h3 className="text-sm font-black">Credentials</h3><p className="text-[10px] text-muted-foreground">License & Insurance</p></div>
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
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                            <div className="absolute inset-0 bg-linear-to-br from-amber-500/3 via-transparent to-orange-500/3" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 to-orange-500" />
                                            <div className="relative p-6">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-11 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25"><MapPin className="size-5" /></div>
                                                    <div><h3 className="text-sm font-black">Logistics</h3><p className="text-[10px] text-muted-foreground">Location & Availability</p></div>
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
                                    </motion.div>
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
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                        <div className="absolute inset-0 bg-linear-to-br from-blue-500/3 via-transparent to-indigo-500/3" />
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-600 to-indigo-500" />
                                        <div className="relative p-6">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="size-11 rounded-xl bg-linear-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25"><Truck className="size-5" /></div>
                                                <div><h3 className="text-sm font-black">Truck Details</h3><p className="text-[10px] text-muted-foreground">Primary Vehicle Information</p></div>
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
                                </motion.div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {/* Operating Authority */}
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl h-full">
                                            <div className="absolute inset-0 bg-linear-to-br from-slate-500/3 via-transparent to-zinc-500/3" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-slate-600 to-zinc-500" />
                                            <div className="relative p-6">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-11 rounded-xl bg-linear-to-br from-slate-600 to-zinc-500 flex items-center justify-center text-white shadow-lg shadow-slate-500/25"><Building2 className="size-5" /></div>
                                                    <div><h3 className="text-sm font-black">Operating Authority</h3><p className="text-[10px] text-muted-foreground">Federal Numbers</p></div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border/15 bg-muted/5">
                                                        <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Hash className="size-5 text-blue-500" /></div>
                                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DOT Number</p><p className="text-lg font-mono font-black">{profile.dotNumber || '—'}</p></div>
                                                    </div>
                                                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border/15 bg-muted/5">
                                                        <div className="size-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Hash className="size-5 text-violet-500" /></div>
                                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">MC Number</p><p className="text-lg font-mono font-black">{profile.mcNumber || '—'}</p></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Special Features */}
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl h-full">
                                            <div className="absolute inset-0 bg-linear-to-br from-violet-500/3 via-transparent to-purple-500/3" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-600 to-purple-500" />
                                            <div className="relative p-6">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-11 rounded-xl bg-linear-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25"><Star className="size-5" /></div>
                                                    <div><h3 className="text-sm font-black">Special Features</h3><p className="text-[10px] text-muted-foreground">Equipment Capabilities</p></div>
                                                    <Badge className="ml-auto text-xs font-bold bg-linear-to-r from-violet-600 to-purple-500 text-white border-0 shadow-lg shadow-violet-500/25">{profile.specialFeatures?.length || 0}</Badge>
                                                </div>
                                                {profile.specialFeatures?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {profile.specialFeatures.map((f, idx) => {
                                                            const opt = specialFeatureOptions.find(o => o.value === f);
                                                            return (
                                                                <motion.div key={f} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }}>
                                                                    <Badge variant="outline" className="text-xs capitalize font-semibold px-3 py-1.5 rounded-lg bg-violet-500/5 border-violet-500/20 text-violet-700 dark:text-violet-300">
                                                                        <CheckCircle2 className="size-3 mr-1.5 text-violet-500" />{opt?.label || f.replace(/_/g, ' ')}
                                                                    </Badge>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : <p className="text-sm text-muted-foreground italic">No features configured</p>}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Trailer Details */}
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/3 via-transparent to-teal-500/3" />
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-600 to-teal-500" />
                                        <div className="relative p-6">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="size-11 rounded-xl bg-linear-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25"><Wrench className="size-5" /></div>
                                                <div><h3 className="text-sm font-black">Trailer Details</h3><p className="text-[10px] text-muted-foreground">Trailer Configuration & Specs</p></div>
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
                                </motion.div>
                            </div>
                        )}

                        {tab === 'documents' && (
                            <div className="space-y-6">
                                {/* Stats row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <Stat label="Total" value={stats?.total || 0} icon={FileText} gradient="from-blue-500 to-indigo-500" />
                                    <Stat label="Verified" value={stats?.verified || 0} color="text-emerald-500" icon={CheckCircle2} gradient="from-emerald-500 to-teal-500" />
                                    <Stat label="Pending" value={stats?.pending || 0} color="text-amber-500" icon={Clock} gradient="from-amber-500 to-orange-500" />
                                    <Stat label="Rejected" value={stats?.rejected || 0} color="text-red-500" icon={XCircle} gradient="from-red-500 to-rose-500" />
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-muted-foreground">Document Completion</span>
                                        <span className="font-black text-foreground">{stats?.verified || 0}/{requiredDocs.length} required</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted/20 border border-border/10 overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${requiredDocs.length > 0 ? ((stats?.verified || 0) / requiredDocs.length) * 100 : 0}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500" />
                                    </div>
                                </div>

                                {/* Required documents */}
                                <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                    <div className="absolute inset-0 bg-linear-to-br from-emerald-500/3 via-transparent to-teal-500/3" />
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-600 to-teal-500" />
                                    <div className="relative p-6">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="size-11 rounded-xl bg-linear-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25"><FileCheck className="size-5" /></div>
                                            <div className="flex-1"><h3 className="text-sm font-black">Required Documents</h3><p className="text-[10px] text-muted-foreground">All required compliance documents</p></div>
                                        </div>
                                        <div className="space-y-3">
                                            {requiredDocs.map((req, idx) => {
                                                const ups = documents.filter((d: ComplianceDocument) => d.type === req.type);
                                                const status = ups.length === 0 ? 'missing' : ups.some((d: ComplianceDocument) => d.verified) ? 'verified' : ups.some((d: ComplianceDocument) => d.reviewStatus === 'rejected') ? 'rejected' : 'pending';
                                                const DocIcon = DOC_ICONS[req.type] || FileText;
                                                return (
                                                    <motion.div key={req.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                                                        className={cn('rounded-xl border-2 overflow-hidden transition-all',
                                                            status === 'verified' ? 'border-emerald-500/20 bg-emerald-500/3' :
                                                                status === 'rejected' ? 'border-red-500/20 bg-red-500/3' :
                                                                    status === 'pending' ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15 bg-muted/3')}>
                                                        <div className="flex items-center gap-3 p-4">
                                                            <div className={cn('size-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                                                                status === 'verified' ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' :
                                                                    status === 'rejected' ? 'bg-red-500/10 ring-1 ring-red-500/20' :
                                                                        status === 'pending' ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-muted/20')}>
                                                                <DocIcon className={cn('size-5',
                                                                    status === 'verified' ? 'text-emerald-500' :
                                                                        status === 'rejected' ? 'text-red-500' :
                                                                            status === 'pending' ? 'text-amber-500' : 'text-muted-foreground')} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h3 className="text-sm font-bold">{req.label}</h3>
                                                                    <Badge className={cn('text-[9px] h-4 px-1.5 border font-bold',
                                                                        status === 'verified' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                                            status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                                status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                                                    'bg-destructive/10 text-destructive border-destructive/20')}>
                                                                        {status === 'verified' ? 'VERIFIED' : status === 'pending' ? 'REVIEWING' : status === 'rejected' ? 'REJECTED' : 'MISSING'}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">{req.description}</p>
                                                            </div>
                                                        </div>
                                                        {ups.length > 0 && (
                                                            <div className="border-t border-border/10 divide-y divide-border/5">
                                                                {ups.map((doc: ComplianceDocument) => {
                                                                    const ex = doc.expiresAt ? getExpStatus(doc.expiresAt) : null;
                                                                    return (
                                                                        <div key={doc._id} className="p-4 space-y-3 group">
                                                                            <div className="flex items-start gap-3">
                                                                                <div className="size-8 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 mt-0.5">
                                                                                    <DocIcon className="size-4 text-muted-foreground" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs font-bold truncate">{doc.label || doc.fileName}</p>
                                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-muted-foreground">
                                                                                        <span className="font-semibold">{fmtSize(doc.fileSize)}</span>
                                                                                        {doc.uploadedAt && <><span className="text-muted-foreground/30">·</span><span>Uploaded {fmtDate(doc.uploadedAt)}</span></>}
                                                                                        {doc.verifiedAt && <><span className="text-muted-foreground/30">·</span><span className="text-emerald-500 font-bold">Verified {fmtDate(doc.verifiedAt)}</span></>}
                                                                                        {ex && <><span className="text-muted-foreground/30">·</span><span className={cn('font-bold', ex.c)}>{ex.l}</span></>}
                                                                                    </div>
                                                                                    {doc.reviewStatus === 'rejected' && doc.rejectionReason && (
                                                                                        <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15">
                                                                                            <p className="text-[10px] text-red-500 italic flex items-center gap-1"><Ban className="size-3" /> {doc.rejectionReason}</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                                    {doc._id && (
                                                                                        <Button size="icon" variant="ghost" className="size-8 rounded-lg" onClick={() => setPreviewDoc(doc)}>
                                                                                            <Eye className="size-4" />
                                                                                        </Button>
                                                                                    )}
                                                                                    {!doc.verified && doc.reviewStatus !== 'rejected' && (
                                                                                        <>
                                                                                            <Button size="icon" variant="ghost"
                                                                                                className="size-8 rounded-lg text-emerald-500 hover:bg-emerald-500/10"
                                                                                                onClick={() => handleVerify(doc._id)} disabled={actionLoading === doc._id}>
                                                                                                {actionLoading === doc._id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                                                                            </Button>
                                                                                            <Button size="icon" variant="ghost"
                                                                                                className="size-8 rounded-lg text-red-500 hover:bg-red-500/10"
                                                                                                onClick={() => { setRejectDocId(doc._id); setRejectReason(''); }} disabled={actionLoading === doc._id}>
                                                                                                <XCircle className="size-4" />
                                                                                            </Button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Optional documents */}
                                {optionalDocs.length > 0 && (
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                        <div className="absolute inset-0 bg-linear-to-br from-slate-500/3 via-transparent to-zinc-500/3" />
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-slate-500 to-zinc-400" />
                                        <div className="relative p-6">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="size-11 rounded-xl bg-linear-to-br from-slate-500 to-zinc-500 flex items-center justify-center text-white shadow-lg shadow-slate-500/25"><FileText className="size-5" /></div>
                                                <div className="flex-1"><h3 className="text-sm font-black">Optional Documents</h3><p className="text-[10px] text-muted-foreground">Additional compliance documents</p></div>
                                            </div>
                                            <div className="space-y-2.5">
                                                {optionalDocs.map((req, idx) => {
                                                    const ups = documents.filter((d: ComplianceDocument) => d.type === req.type);
                                                    const status = ups.length === 0 ? 'missing' : ups.some((d: ComplianceDocument) => d.verified) ? 'verified' : 'pending';
                                                    const DocIcon = DOC_ICONS[req.type] || FileText;
                                                    return (
                                                        <motion.div key={req.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                                                            className={cn('rounded-xl border-2 p-4 flex items-center gap-3 transition-all',
                                                                status === 'verified' ? 'border-emerald-500/20 bg-emerald-500/3' : status === 'pending' ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15')}>
                                                            <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0',
                                                                status === 'verified' ? 'bg-emerald-500/10' : status === 'pending' ? 'bg-amber-500/10' : 'bg-muted/20')}>
                                                                <DocIcon className={cn('size-4', status === 'verified' ? 'text-emerald-500' : status === 'pending' ? 'text-amber-500' : 'text-muted-foreground')} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2"><h3 className="text-sm font-bold">{req.label}</h3><Badge variant="outline" className="text-[9px] h-4 font-semibold">Optional</Badge></div>
                                                                {ups.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    {ups.map((doc: ComplianceDocument) => (
                                                                        <Badge key={doc._id} variant="outline" className="gap-1 text-[10px] font-semibold cursor-pointer hover:bg-muted/30 rounded-lg transition-colors" onClick={() => setPreviewDoc(doc)}>
                                                                            <Eye className="size-2.5" /> {doc.fileName} {doc.verified && <CheckCircle2 className="size-2.5 text-emerald-500" />}
                                                                        </Badge>
                                                                    ))}
                                                                </div>}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'compliance' && (
                            <div className="space-y-6">
                                {/* License & Insurance */}
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/3 via-transparent to-teal-500/3" />
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-600 to-teal-500" />
                                        <div className="relative p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="size-11 rounded-xl bg-linear-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25"><CreditCard className="size-5" /></div>
                                                <div className="flex-1"><h3 className="text-sm font-black">License & Insurance Details</h3><p className="text-[10px] text-muted-foreground">Compliance expiration tracking</p></div>
                                                {profile.isComplianceExpired && <Badge variant="destructive" className="gap-1 text-xs font-bold"><AlertTriangle className="size-3" /> Expired Items</Badge>}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {/* CDL */}
                                                <div className={cn('p-4 rounded-xl border-2 space-y-3 transition-all',
                                                    getExpStatus(profile.licenseExpirationDate).c.includes('red') ? 'border-red-500/20 bg-red-500/3' :
                                                        getExpStatus(profile.licenseExpirationDate).c.includes('amber') ? 'border-amber-500/20 bg-amber-500/3' : 'border-border/15')}>
                                                    <div className="flex items-center gap-2"><CreditCard className="size-4 text-blue-500" /><p className="text-xs font-black">Commercial Driver License</p></div>
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
                                                    <div className="flex items-center gap-2"><FileText className="size-4 text-violet-500" /><p className="text-xs font-black">DOT Medical Card</p></div>
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
                                                    <div className="flex items-center gap-2"><Shield className="size-4 text-emerald-500" /><p className="text-xs font-black">Insurance</p></div>
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
                                </motion.div>

                                {/* Identity Verification */}
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                        <div className="absolute inset-0 bg-linear-to-br from-violet-500/3 via-transparent to-purple-500/3" />
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-600 to-purple-500" />
                                        <div className="relative p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="size-11 rounded-xl bg-linear-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25"><Fingerprint className="size-5" /></div>
                                                <div><h3 className="text-sm font-black">Identity Verification</h3><p className="text-[10px] text-muted-foreground">Security & compliance checks</p></div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { ok: !!profile.ssnLast4, label: 'SSN (Last 4)', value: profile.ssnLast4 ? `••••${profile.ssnLast4}` : '—', mono: true, iconOk: CheckCircle2, iconNo: Lock },
                                                    { ok: !!profile.backgroundCheckConsent, label: 'Background Check', value: profile.backgroundCheckConsent ? 'Authorized' : 'Not authorized', sub: profile.backgroundCheckConsentDate ? fmtDate(profile.backgroundCheckConsentDate) : undefined, iconOk: CheckCircle2, iconNo: XCircle },
                                                    { ok: !!profile.verificationAgreement, label: 'Agreement', value: profile.verificationAgreement ? 'Accepted' : 'Not accepted', sub: profile.verificationAgreementDate ? fmtDate(profile.verificationAgreementDate) : undefined, iconOk: CheckCircle2, iconNo: Scale },
                                                    { ok: profile.verificationStatus === 'verified', pending: profile.verificationStatus === 'under_review', label: 'Status', value: (profile.verificationStatus || 'not_started').replace(/_/g, ' '), iconOk: BadgeCheck, iconNo: ShieldAlert, iconPending: Clock },
                                                ].map((item, idx) => {
                                                    const isPending = 'pending' in item && item.pending;
                                                    const StatusIcon = isPending ? (item as { iconPending: React.ElementType }).iconPending : item.ok ? item.iconOk : item.iconNo;
                                                    return (
                                                        <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + idx * 0.05 }}
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
                                                                {'sub' in item && item.sub && <p className="text-[10px] text-muted-foreground">{item.sub}</p>}
                                                            </div>
                                                        </motion.div>
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
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/15 bg-linear-to-br from-background via-background to-background/50 shadow-xl">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-slate-600 to-zinc-500" />
                                        <div className="relative p-6">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="size-11 rounded-xl bg-linear-to-br from-slate-600 to-zinc-500 flex items-center justify-center text-white shadow-lg shadow-slate-500/20"><History className="size-5" /></div>
                                                <div><h3 className="text-sm font-black">Review History</h3><p className="text-[10px] text-muted-foreground">Persistent Driver Verification review events</p></div>
                                            </div>
                                            {reviewHistory.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic">No Driver Verification review events have been recorded yet.</p>
                                            ) : (
                                                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                                                    {reviewHistory.map((event, index) => (
                                                        <div key={event._id || `${event.createdAt}-${index}`} className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                                                <div>
                                                                    <p className="text-sm font-bold capitalize">{String(event.action || 'review event').replace(/_/g, ' ')}</p>
                                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                        {event.actorName || 'System'}{event.actorRole ? ` · ${event.actorRole}` : ''}{event.loadNumber ? ` · Load ${event.loadNumber}` : ''}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{fmtDateTime(event.createdAt)}</span>
                                                            </div>
                                                            {(event.previousStatus || event.newStatus) && (
                                                                <p className="mt-2 text-xs text-muted-foreground">
                                                                    {event.previousStatus || '—'} → <span className="font-semibold text-foreground">{event.newStatus || '—'}</span>
                                                                </p>
                                                            )}
                                                            {event.reason && <p className="mt-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs">Reason: {event.reason}</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>

            </motion.div>

            <Dialog open={!!previewDoc} onOpenChange={(nextOpen) => { if (!nextOpen) closePreview(); }}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-5 pb-3 shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-sm font-black">
                            <FileText className="size-4" /> {previewDoc?.label || previewDoc?.fileName}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-3 text-[11px]">
                            <span>{fmtSize(previewDoc?.fileSize)}</span>
                            {previewDoc?.uploadedAt && <span>Uploaded {fmtDate(previewDoc.uploadedAt)}</span>}
                            <Badge className={cn('text-[9px] h-4 px-1.5',
                                previewDoc?.verified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    previewDoc?.reviewStatus === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                        'bg-amber-500/10 text-amber-600 border-amber-500/20')}>
                                {previewDoc?.verified ? 'Verified' : previewDoc?.reviewStatus === 'rejected' ? 'Rejected' : 'Pending'}
                            </Badge>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-auto px-5 pb-5">
                        {previewLoading ? (
                            <div className="flex min-h-80 items-center justify-center">
                                <Loader2 className="size-7 animate-spin text-primary" />
                            </div>
                        ) : previewError ? (
                            <div className="flex min-h-80 items-center justify-center text-center text-sm text-destructive">
                                {previewError}
                            </div>
                        ) : previewObjectUrl && previewMimeType.startsWith('image/') ? (
                            <img src={previewObjectUrl} alt={previewDoc?.label || previewDoc?.fileName || 'Driver document'} className="w-full rounded-xl border border-border/20" />
                        ) : previewObjectUrl && previewMimeType === 'application/pdf' ? (
                            <iframe src={previewObjectUrl} className="w-full h-[60vh] rounded-xl border border-border/20" title={previewDoc?.label || 'Driver document'} />
                        ) : previewObjectUrl ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <FileText className="size-16 text-muted-foreground/20" />
                                <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                                <Button asChild variant="outline"><a href={previewObjectUrl} target="_blank" rel="noopener noreferrer">Open File</a></Button>
                            </div>
                        ) : null}
                    </div>
                    {previewDoc && !previewDoc.verified && previewDoc.reviewStatus !== 'rejected' && (
                        <div className="border-t border-border/20 p-4 flex items-center justify-end gap-2 shrink-0">
                            <Button variant="outline" className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => { setRejectDocId(previewDoc._id); closePreview(); }}>
                                <XCircle className="size-4" /> Reject
                            </Button>
                            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                                onClick={() => { void handleVerify(previewDoc._id); closePreview(); }}
                                disabled={actionLoading === previewDoc._id}>
                                {actionLoading === previewDoc._id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Verify
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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