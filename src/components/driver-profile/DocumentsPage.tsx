'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { DriverProfile, ComplianceDocument, VerificationStatus } from '@/types/driver-profile';
import { useOrg } from '@/hooks/useOrg';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Shield, ArrowLeft, Upload, Trash2, FileText, AlertTriangle,
  CheckCircle2, Clock, Eye, Lock, ShieldCheck, ShieldAlert, X,
  Save, Fingerprint, UserCheck, FileWarning, ChevronRight,
  BadgeCheck, ScanLine, CreditCard, Building2, Scale, FileCheck,
  Camera, Paperclip, TriangleAlert, CircleDot, Ban, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { REQUIRED_DOCUMENTS, documentTypeOptions, US_STATES } from './driver-profile-constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STEPS = [
  { id: 'documents', label: 'Documents', icon: FileCheck, desc: 'Upload required docs', color: 'from-emerald-600 to-teal-500' },
  { id: 'personal', label: 'Information', icon: UserCheck, desc: 'Driver & vehicle details', color: 'from-blue-600 to-indigo-500' },
  { id: 'agreement', label: 'Agreement', icon: Scale, desc: 'Accept terms', color: 'from-amber-500 to-orange-500' },
  { id: 'review', label: 'Approval', icon: BadgeCheck, desc: 'Waiting for admin', color: 'from-emerald-500 to-green-500' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const DOC_ICONS: Record<string, React.ElementType> = {
  drivers_license: CreditCard, medical_card: FileText, insurance_certificate: Shield,
  vehicle_registration: FileText, operating_authority: Building2, w9_form: FileText,
  dot_inspection: FileCheck, cargo_insurance: Shield, liability_insurance: Shield, other: Paperclip,
};

const getExpStatus = (d?: string) => {
  if (!d) return { s: 'none', l: 'Not Set', c: 'text-muted-foreground', bg: 'bg-muted/30' };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  if (days < 0) return { s: 'expired', l: `Expired ${Math.abs(days)}d ago`, c: 'text-red-500', bg: 'bg-red-500/8' };
  if (days <= 30) return { s: 'warn', l: `${days}d left`, c: 'text-amber-500', bg: 'bg-amber-500/8' };
  if (days <= 90) return { s: 'soon', l: `${days}d`, c: 'text-yellow-500', bg: 'bg-yellow-500/8' };
  return { s: 'ok', l: `${days}d`, c: 'text-emerald-500', bg: 'bg-emerald-500/8' };
};

const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' });

const FormSection = ({ icon, items }: { icon: string; items: Array<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string }> }) => (
  <div className="rounded-2xl border-2 border-border/75 bg-muted/15 p-5 space-y-4">
    <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{icon}</h3>
    <div className="space-y-3">
      {items.map((item, idx) => (
        <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">{item.label}</Label>
            {item.type === 'date' ? (
              <Input type="date" value={item.value} onChange={e => item.onChange(e.target.value)} className={cn('h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm', item.className)} />
            ) : (
              <Input value={item.value} onChange={e => item.onChange(e.target.value)} placeholder={item.placeholder} className={cn('h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm', item.className)} />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export const DocumentsPage: React.FC = () => {
  const { getToken } = useAuth();
  const { organization } = useOrg();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>('documents');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [licenseExp, setLicenseExp] = useState('');
  const [medicalExp, setMedicalExp] = useState('');
  const [insuranceExp, setInsuranceExp] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');

  const [driverFirstName, setDriverFirstName] = useState('');
  const [driverLastName, setDriverLastName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverAddress, setDriverAddress] = useState('');
  const [driverCity, setDriverCity] = useState('');
  const [driverState, setDriverState] = useState('');
  const [driverZip, setDriverZip] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleLicensePlate, setVehicleLicensePlate] = useState('');
  const [ssnLast4, setSsnLast4] = useState('');
  const [bgCheckConsent, setBgCheckConsent] = useState(false);
  const [verificationAgreement, setVerificationAgreement] = useState(false);
  const [agreementScrolledToBottom, setAgreementScrolledToBottom] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_started');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const agreementContentRef = useRef<HTMLDivElement>(null);

  const [uploadType, setUploadType] = useState('drivers_license');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ComplianceDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/api/driver-profile', { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data?.data;
      if (d) {
        setProfile(d);
        setLicenseNumber(d.driversLicenseNumber || '');
        setLicenseState(d.licenseState || '');
        setLicenseExp(d.licenseExpirationDate?.substring(0, 10) || '');
        setMedicalExp(d.medicalCardExpirationDate?.substring(0, 10) || '');
        setInsuranceExp(d.insuranceExpirationDate?.substring(0, 10) || '');
        setInsuranceProvider(d.insuranceProvider || '');
        setInsurancePolicyNumber(d.insurancePolicyNumber || '');
        setDriverFirstName(d.firstName || '');
        setDriverLastName(d.lastName || '');
        setDriverPhone(d.phone || '');
        setDriverAddress(d.address || '');
        setDriverCity(d.city || '');
        setDriverState(d.state || '');
        setDriverZip(d.zipCode || '');
        setVehicleMake(d.vehicleMake || '');
        setVehicleModel(d.vehicleModel || '');
        setVehicleYear(d.vehicleYear || '');
        setVehicleVin(d.vehicleVin || '');
        setVehicleLicensePlate(d.vehicleLicensePlate || '');
        setSsnLast4(d.ssnLast4 || '');
        setBgCheckConsent(!!d.backgroundCheckConsent);
        setVerificationAgreement(!!d.verificationAgreement);
        setVerificationStatus(d.verificationStatus || 'not_started');
      }
    } catch { toast.error('Failed to load document data'); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveCompliance = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await apiClient.patch('/api/driver-profile/compliance', {
        driversLicenseNumber: licenseNumber.trim(), licenseState,
        licenseExpirationDate: licenseExp || undefined, medicalCardExpirationDate: medicalExp || undefined,
        insuranceExpirationDate: insuranceExp || undefined, insuranceProvider: insuranceProvider.trim(),
        insurancePolicyNumber: insurancePolicyNumber.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.data) setProfile(res.data.data);
      toast.success('Compliance information saved');
    } catch { toast.error('Failed to save compliance info'); }
    finally { setSaving(false); }
  };

  const handleSavePersonalInfo = async () => {
    if (!driverFirstName.trim() || !driverLastName.trim()) { toast.error('Please enter your name'); return; }
    if (!licenseNumber.trim() || !licenseExp) { toast.error('Please enter license information'); return; }
    if (!insuranceProvider.trim() || !insurancePolicyNumber.trim()) { toast.error('Please enter insurance details'); return; }
    if (!vehicleVin.trim()) { toast.error('Please enter vehicle VIN'); return; }
    setSavingPersonal(true);
    try {
      const token = await getToken();
      const res = await apiClient.patch('/api/driver-profile/personal-info', {
        firstName: driverFirstName.trim(),
        lastName: driverLastName.trim(),
        phone: driverPhone.trim() || undefined,
        address: driverAddress.trim() || undefined,
        city: driverCity.trim() || undefined,
        state: driverState || undefined,
        zipCode: driverZip.trim() || undefined,
        vehicleMake: vehicleMake.trim() || undefined,
        vehicleModel: vehicleModel.trim() || undefined,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : undefined,
        vehicleVin: vehicleVin.trim(),
        vehicleLicensePlate: vehicleLicensePlate.trim() || undefined,
        driversLicenseNumber: licenseNumber.trim(),
        licenseState,
        licenseExpirationDate: licenseExp || undefined,
        medicalCardExpirationDate: medicalExp || undefined,
        insuranceExpirationDate: insuranceExp || undefined,
        insuranceProvider: insuranceProvider.trim(),
        insurancePolicyNumber: insurancePolicyNumber.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.data) setProfile(res.data.data);
      toast.success('Personal information saved');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save personal info'); }
    finally { setSavingPersonal(false); }
  };

  const handleSaveIdentity = async () => {
    if (ssnLast4.replace(/\D/g, '').length !== 4) { toast.error('Please enter exactly 4 digits for SSN'); return; }
    setSavingIdentity(true);
    try {
      const token = await getToken();
      const res = await apiClient.patch('/api/driver-profile/identity-verification', {
        ssnLast4: ssnLast4.replace(/\D/g, ''),
        backgroundCheckConsent: bgCheckConsent || undefined,
        verificationAgreement: verificationAgreement || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.data) { setProfile(res.data.data); setVerificationStatus(res.data.data.verificationStatus || 'not_started'); }
      toast.success('Identity verification updated');
    } catch { toast.error('Failed to save identity verification'); }
    finally { setSavingIdentity(false); }
  };

  const openUploadFor = (type: string) => {
    setUploadType(type);
    const r = REQUIRED_DOCUMENTS.find(d => d.type === type);
    setUploadLabel(r?.label || '');
    setUploadExpiry('');
    setUploadFile(null);
    setDragOver(false);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadLabel.trim()) { toast.error('Please select a file and provide a label'); return; }
    if (uploadFile.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setUploading(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append('document', uploadFile);
      fd.append('type', uploadType);
      fd.append('label', uploadLabel.trim());
      if (uploadExpiry) fd.append('expiresAt', uploadExpiry);
      const res = await apiClient.post('/api/driver-profile/documents', fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data) setProfile(res.data.data);
      toast.success('Document uploaded — pending review');
      setShowUploadDialog(false);
    } catch { toast.error('Failed to upload document'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      const token = await getToken();
      const res = await apiClient.delete(`/api/driver-profile/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.data) setProfile(res.data.data);
      toast.success('Document removed');
      setShowDeleteConfirm(null);
    } catch { toast.error('Failed to delete document'); }
    finally { setDeletingId(null); }
  };

  const documents = profile?.documents || [];
  const getDocStatus = (type: string) => {
    const docs = documents.filter((d: ComplianceDocument) => d.type === type);
    if (!docs.length) return 'missing';
    if (docs.some((d: ComplianceDocument) => d.verified)) return 'verified';
    if (docs.some((d: ComplianceDocument) => d.reviewStatus === 'rejected')) return 'rejected';
    return 'pending';
  };

  const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
  const optionalDocs = REQUIRED_DOCUMENTS.filter(d => !d.required);
  const verifiedCount = requiredDocs.filter(d => getDocStatus(d.type) === 'verified').length;
  const uploadedCount = requiredDocs.filter(d => getDocStatus(d.type) !== 'missing').length;

  const stepStatus = useMemo(() => ({
    documents: uploadedCount === requiredDocs.length ? 'done' : uploadedCount > 0 ? 'partial' : 'pending',
    personal: driverFirstName && licenseNumber && licenseExp && insuranceProvider ? 'done' : driverFirstName || licenseNumber || licenseExp || insuranceProvider ? 'partial' : 'pending',
    agreement: verificationAgreement ? 'done' : 'pending',
    review: verificationStatus === 'verified' ? 'done' : verificationStatus === 'under_review' ? 'partial' : 'pending',
  }), [uploadedCount, requiredDocs.length, driverFirstName, licenseNumber, licenseExp, insuranceProvider, verificationAgreement, verificationStatus]);

  useEffect(() => {
    if (!loading && profile) {
      if (uploadedCount < requiredDocs.length) setActiveStep('documents');
      else if (!driverFirstName || !licenseNumber || !licenseExp) setActiveStep('personal');
      else if (!verificationAgreement) setActiveStep('agreement');
      else setActiveStep('review');
    }
  }, [loading, profile, uploadedCount, requiredDocs.length, driverFirstName, licenseNumber, licenseExp, verificationAgreement]);

  const overallPct = useMemo(() => {
    let s = 0;
    s += Math.round((uploadedCount / Math.max(requiredDocs.length, 1)) * 30);
    if (driverFirstName && licenseNumber && licenseExp && insuranceProvider) s += 25;
    if (verificationAgreement) s += 20;
    s += Math.round((verifiedCount / Math.max(requiredDocs.length, 1)) * 25);
    return Math.min(s, 100);
  }, [uploadedCount, requiredDocs.length, driverFirstName, licenseNumber, licenseExp, insuranceProvider, verificationAgreement, verifiedCount]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="size-16 rounded-full border-4 border-emerald-500/20 animate-pulse" />
        <Loader2 className="size-8 animate-spin text-emerald-500 absolute inset-0 m-auto" />
      </div>
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Securing Connection</p>
    </div>
  );

  const licStatus = getExpStatus(licenseExp);
  const medStatus = getExpStatus(medicalExp);
  const insStatus = getExpStatus(insuranceExp);
  const curStep = STEPS.find(s => s.id === activeStep)!;
  const curIdx = STEPS.findIndex(s => s.id === activeStep);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-lg dark:shadow-2xl ring-1 ring-slate-200/50 dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-emerald-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2l2 3-2 3zM0 20.5V18h20v-2l2 3-2 3H0v-1.5z\' fill=\'%23fff\' fill-opacity=\'.5\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />

          <div className="relative p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <Link href="/driver/profile" className="p-2.5 rounded-xl bg-background/80 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors border border-border/80 dark:border-white/15 shadow-sm">
                  <ArrowLeft className="size-4.5 text-foreground/80 dark:text-white/80" />
                </Link>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Driver Verification</h1>
                    <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/35 shadow-sm">
                      <Lock className="size-3 text-emerald-600 dark:text-emerald-400" /><span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Encrypted</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">FMCSA-compliant driver onboarding</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-4xl font-black tabular-nums text-foreground">{overallPct}%</span>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Complete</p>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 border border-slate-300/70 dark:border-white/10 overflow-hidden mb-5">
              <motion.div className="h-full rounded-full bg-linear-to-r from-emerald-400 to-teal-400" initial={false} animate={{ width: `${overallPct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>

            <div className="relative flex items-center gap-0 px-2">
              {STEPS.map((step, i) => {
                const status = stepStatus[step.id];
                const active = activeStep === step.id;
                return (
                  <React.Fragment key={step.id}>
                    <button type="button" onClick={() => setActiveStep(step.id)} className="relative z-10 flex flex-col items-center gap-1.5 group">
                      <motion.div animate={active ? { scale: 1.15 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={cn('size-10 sm:size-11 rounded-xl flex items-center justify-center transition-all border-2',
                          active ? 'bg-background dark:bg-white/15 border-primary/45 dark:border-white/30 shadow-md ring-1 ring-primary/10' :
                            status === 'done' ? 'bg-emerald-500/12 border-emerald-500/35' :
                              status === 'partial' ? 'bg-amber-500/12 border-amber-500/35' :
                                'bg-background/70 dark:bg-white/5 border-border/80 dark:border-white/15')}>
                        {status === 'done' ? <CheckCircle2 className="size-5 text-emerald-400" /> :
                          <step.icon className={cn('size-4.5', active ? 'text-primary dark:text-white' : 'text-muted-foreground')} />}
                      </motion.div>
                      <span className={cn(
                        'text-[10px] font-bold whitespace-nowrap',
                        active
                          ? 'text-foreground'
                          : status === 'done'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : status === 'partial'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-muted-foreground',
                      )}>{step.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 rounded-full relative -mt-5">
                        <div className="absolute inset-0 bg-slate-300/80 dark:bg-white/10 rounded-full" />
                        <motion.div initial={false} animate={{ width: status === 'done' ? '100%' : '0%' }}
                          className="absolute inset-y-0 left-0 bg-emerald-400/50 rounded-full" transition={{ duration: 0.4 }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {verificationStatus !== 'verified' && (
          <div className="flex items-center justify-center gap-6 flex-wrap py-2">
            {[
              { icon: Lock, label: 'TLS 1.3 Encrypted' },
              { icon: Shield, label: 'AES-256 at Rest' },
              { icon: ShieldCheck, label: 'FMCSA Compliant' },
              { icon: Fingerprint, label: 'SOC 2 Data Handling' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-muted-foreground/75">
                <s.icon className="size-3" /><span className="text-[10px] font-semibold">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {verificationStatus === 'verified' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-2 border-emerald-500/30 bg-emerald-500/5 overflow-hidden rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center"><Sparkles className="size-7 text-emerald-500" /></div>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-emerald-600 dark:text-emerald-400">Profile Approved & Verified</h2>
                  <p className="text-sm text-muted-foreground">All documents verified. You are cleared to access loads and start working.</p>
                </div>
                <BadgeCheck className="size-10 text-emerald-500 hidden sm:block" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={activeStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {activeStep === 'documents' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/65 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
                  <div className="relative p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><FileCheck className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Required Documents</h2>
                        <p className="text-sm text-muted-foreground mt-1">{uploadedCount} of {requiredDocs.length} uploaded • {verifiedCount} verified</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-lg px-4 py-2">{Math.round((uploadedCount / requiredDocs.length) * 100)}%</Badge>
                    </div>

                    <div className="mb-8 h-2 rounded-full bg-border/40 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30" initial={false} animate={{ width: `${(uploadedCount / requiredDocs.length) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                    </div>

                    <div className="space-y-3">
                      {requiredDocs.map((req, idx) => {
                        const status = getDocStatus(req.type);
                        const ups = documents.filter((d: ComplianceDocument) => d.type === req.type);
                        const Icon = DOC_ICONS[req.type] || FileText;
                        return (
                          <motion.div key={req.type} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                            <div className={cn('rounded-2xl border-2 transition-all overflow-hidden',
                              status === 'verified' ? 'border-emerald-500/30 bg-emerald-500/5' :
                                status === 'rejected' ? 'border-red-500/30 bg-red-500/5' :
                                  status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/75 hover:border-primary/50 hover:bg-primary/5')}>
                              <div className="p-4 flex items-start gap-4">
                                <div className={cn('size-12 rounded-xl flex items-center justify-center shrink-0',
                                  status === 'verified' ? 'bg-emerald-500/15' : status === 'rejected' ? 'bg-red-500/15' :
                                    status === 'pending' ? 'bg-amber-500/15' : 'bg-muted/30')}>
                                  {status === 'verified' ? <CheckCircle2 className="size-6 text-emerald-500" /> :
                                    status === 'rejected' ? <Ban className="size-6 text-red-500" /> :
                                      status === 'pending' ? <Clock className="size-6 text-amber-500" /> :
                                        <Icon className="size-6 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-base font-bold">{req.label}</h3>
                                    <Badge className={cn('text-xs px-2 py-1 border font-bold',
                                      status === 'verified' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                        status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                          status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                                            'bg-destructive/10 text-destructive border-destructive/30')}>
                                      {status === 'verified' ? 'VERIFIED' : status === 'pending' ? 'UNDER REVIEW' : status === 'rejected' ? 'REJECTED' : 'REQUIRED'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{req.description}</p>
                                </div>
                                <Button variant={status === 'missing' ? 'default' : 'outline'} size="sm" onClick={() => openUploadFor(req.type)}
                                  disabled={documents.length >= 20} className="shrink-0 gap-2 rounded-xl">
                                  {status === 'missing' ? <Camera className="size-4" /> : <Upload className="size-4" />}
                                  <span>{status === 'missing' ? 'Upload' : 'Replace'}</span>
                                </Button>
                              </div>
                              {ups.length > 0 && (
                                <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                                  {ups.map((doc: ComplianceDocument) => {
                                    const ex = doc.expiresAt ? getExpStatus(doc.expiresAt) : null;
                                    return (
                                      <div key={doc._id} className="flex items-center gap-3 group">
                                        <FileText className="size-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold truncate">{doc.label || doc.fileName}</p>
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[10px] text-muted-foreground">{fmtSize(doc.fileSize)}</span>
                                            {doc.uploadedAt && <span className="text-[10px] text-muted-foreground">Uploaded {fmtDate(doc.uploadedAt)}</span>}
                                            {doc.verified && doc.verifiedAt && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified {fmtDate(doc.verifiedAt)}</span>}
                                            {doc.reviewStatus === 'rejected' && <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">Rejected</span>}
                                            {ex && <span className={cn('text-[10px] font-semibold', ex.c)}>{ex.l}</span>}
                                          </div>
                                          {doc.reviewStatus === 'rejected' && doc.rejectionReason && (
                                            <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                                              <FileWarning className="size-3 text-red-500 shrink-0 mt-0.5" />
                                              <p className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed">{doc.rejectionReason}</p>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                          {doc.fileUrl && <Button size="icon" variant="ghost" className="size-8 hover:bg-primary/20"
                                            onClick={() => setViewingDoc(doc)}>
                                            <Eye className="size-4" />
                                          </Button>}
                                          <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/20"
                                            onClick={() => setShowDeleteConfirm(doc._id)} disabled={deletingId === doc._id}>
                                            {deletingId === doc._id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-4" />}
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {optionalDocs.length > 0 && (
                      <>
                        <div className="flex items-center gap-3 pt-8 pb-4"><div className="h-px flex-1 bg-border/20" /><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Optional Documents</span><div className="h-px flex-1 bg-border/20" /></div>
                        <div className="space-y-2">
                          {optionalDocs.map(req => {
                            const status = getDocStatus(req.type);
                            const ups = documents.filter((d: ComplianceDocument) => d.type === req.type);
                            return (
                              <div key={req.type} className={cn('rounded-2xl border-2 p-4 flex items-center gap-4 transition-all',
                                status === 'verified' ? 'border-emerald-500/30 bg-emerald-500/5' : status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/70')}>
                                <div className="size-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0"><FileText className="size-5 text-muted-foreground" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2"><h3 className="text-sm font-bold">{req.label}</h3><Badge variant="outline" className="text-[9px] h-5 font-bold">Optional</Badge></div>
                                  {ups.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1">
                                    {ups.map((doc: ComplianceDocument) => (
                                      <Badge key={doc._id} variant="outline" className="gap-1 text-[10px] pr-1">
                                        {doc.fileName}<button type="button" onClick={() => setShowDeleteConfirm(doc._id)} className="hover:text-destructive ml-0.5"><X className="size-2.5" /></button>
                                      </Badge>
                                    ))}
                                  </div>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openUploadFor(req.type)} className="gap-1.5 shrink-0 rounded-lg" disabled={documents.length >= 20}><Upload className="size-4" /></Button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between pt-8 border-t border-border/55">
                      <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      <Button onClick={() => setActiveStep('personal')} disabled={uploadedCount < requiredDocs.length} className="gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                        Next: Information <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'personal' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/65 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
                  <div className="relative p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30"><UserCheck className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Your Information</h2>
                        <p className="text-sm text-muted-foreground mt-1">Complete your driver and vehicle details</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <FormSection icon="Driver Details" items={[
                        { label: 'First Name *', value: driverFirstName, onChange: setDriverFirstName, placeholder: 'John' },
                        { label: 'Last Name *', value: driverLastName, onChange: setDriverLastName, placeholder: 'Doe' },
                      ]} />

                      <FormSection icon="Contact Information" items={[
                        { label: 'Phone Number', value: driverPhone, onChange: setDriverPhone, placeholder: '(123) 456-7890' },
                        { label: 'City', value: driverCity, onChange: setDriverCity, placeholder: 'Salt Lake City' },
                      ]} />

                      <div className="rounded-2xl border-2 border-border/75 bg-muted/15 p-5 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Address</h3>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Street Address</Label>
                            <Input value={driverAddress} onChange={e => setDriverAddress(e.target.value)} placeholder="123 Main St" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground">State</Label>
                              <Select value={driverState} onValueChange={setDriverState}>
                                <SelectTrigger className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                                <SelectContent className="border-2 border-border/50 shadow-xl rounded-xl"><motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>{US_STATES.map(s => <SelectItem key={s} value={s} className="cursor-pointer hover:bg-primary/10 focus:bg-primary/20 rounded-lg">{s}</SelectItem>)}</motion.div></SelectContent>
                              </Select>
                            </div>
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground">ZIP Code</Label>
                              <Input value={driverZip} onChange={e => setDriverZip(e.target.value)} placeholder="84111" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      <FormSection icon="License & Credentials" items={[
                        { label: 'CDL Number *', value: licenseNumber, onChange: setLicenseNumber, placeholder: 'DL-XXXXXXXX', className: 'font-mono bg-linear-to-br from-background to-muted/30 border-2 border-border/70 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20' },
                        { label: 'CDL Expiration *', type: 'date', value: licenseExp, onChange: setLicenseExp, className: 'bg-linear-to-br from-background to-muted/30 border-2 border-border/70 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20' },
                      ]} />

                      <div className="rounded-2xl border-2 border-border/75 bg-muted/15 p-5 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">License State *</h3>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                          <Select value={licenseState} onValueChange={setLicenseState}>
                            <SelectTrigger className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent className="border-2 border-border/50 shadow-xl rounded-xl"><motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>{US_STATES.map(s => <SelectItem key={s} value={s} className="cursor-pointer hover:bg-primary/10 focus:bg-primary/20 rounded-lg">{s}</SelectItem>)}</motion.div></SelectContent>
                          </Select>
                        </motion.div>
                      </div>

                      <FormSection icon="Medical & Insurance" items={[
                        { label: 'Medical Card Expires', type: 'date', value: medicalExp, onChange: setMedicalExp, className: 'bg-linear-to-br from-background to-muted/30 border-2 border-border/70 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20' },
                        { label: 'Insurance Expires', type: 'date', value: insuranceExp, onChange: setInsuranceExp, className: 'bg-linear-to-br from-background to-muted/30 border-2 border-border/70 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20' },
                        { label: 'Insurance Provider *', value: insuranceProvider, onChange: setInsuranceProvider, placeholder: 'e.g. Progressive', className: 'bg-linear-to-br from-background to-muted/30 border-2 border-border/70 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20' },
                        { label: 'Policy Number *', value: insurancePolicyNumber, onChange: setInsurancePolicyNumber, placeholder: 'e.g. POL-123456', className: 'font-mono bg-linear-to-br from-background to-muted/30 border-2 border-border/70 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20' },
                      ]} />

                      <div className="rounded-2xl border-2 border-border/75 bg-muted/15 p-5 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Vehicle Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground">Make</Label>
                              <Input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Freightliner" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground">Model</Label>
                              <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Cascadia" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground">Year</Label>
                              <Input value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2020" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                          </motion.div>
                        </div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">VIN *</Label>
                            <Input value={vehicleVin} onChange={e => setVehicleVin(e.target.value.toUpperCase())} placeholder="WBADT43451G..." className="h-11 font-mono uppercase bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">License Plate</Label>
                            <Input value={vehicleLicensePlate} onChange={e => setVehicleLicensePlate(e.target.value.toUpperCase())} placeholder="ABC-1234" className="h-11 font-mono uppercase bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                      </div>

                      <div className="rounded-2xl border-2 border-border/75 bg-muted/15 p-5 space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Security</h3>
                        <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className={cn('flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all',
                          bgCheckConsent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/55 hover:border-border/50')}>
                          <input type="checkbox" checked={bgCheckConsent} onChange={e => setBgCheckConsent(e.target.checked)} className="mt-0.5 size-5 rounded border-2 border-border accent-emerald-600" />
                          <div>
                            <span className="text-sm font-bold">Background Check Authorization *</span>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                              I authorize {organization?.name || "Your Dealership"} to conduct a background check per the Fair Credit Reporting Act (FCRA).
                            </p>
                          </div>
                        </motion.label>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/55">
                        <Button variant="ghost" onClick={() => setActiveStep('documents')} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                        <Button onClick={handleSavePersonalInfo} disabled={savingPersonal || !driverFirstName.trim() || !licenseNumber.trim() || !licenseExp || !vehicleVin.trim() || !bgCheckConsent || !insuranceProvider.trim()} className="gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                          {savingPersonal ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save & Next <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'agreement' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/65 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 via-transparent to-orange-500/5" />
                  <div className="relative p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30"><Scale className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Verification Agreement</h2>
                        <p className="text-sm text-muted-foreground mt-1">Please review and accept the terms</p>
                      </div>
                      {verificationAgreement && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="size-3" /> Accepted</Badge>}
                    </div>

                    <div className="mb-6 p-4 rounded-xl border-2 border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                      <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Read the entire agreement before accepting</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1">Scroll to the bottom to enable the acceptance checkbox</p>
                      </div>
                    </div>

                    <div ref={agreementContentRef} onScroll={(e) => {
                      const el = e.currentTarget;
                      const isAtBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 20;
                      setAgreementScrolledToBottom(isAtBottom);
                    }} className="rounded-2xl border-2 border-border/65 bg-muted/5 max-h-[50vh] overflow-y-auto mb-6">
                      <div className="sticky top-0 z-10 bg-linear-to-b from-background/95 to-background/80 backdrop-blur-sm border-b border-border/55 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Scale className="size-5 text-amber-500" /><span className="font-bold">Driver Services Agreement</span></div>
                        <Badge className="bg-primary/10 text-primary text-xs font-bold">Rev. 2025-01</Badge>
                      </div>
                      <div className="px-6 py-5 space-y-5 text-sm text-muted-foreground leading-relaxed">
                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">1. Scope of Services & Relationship</h3>
                          <p>This Driver Services Agreement ("Agreement") is entered into between Action Auto Utah LLC ("Company") and the undersigned independent contractor driver ("Driver"). By accepting this Agreement, Driver acknowledges that they are engaged as an independent contractor and not as an employee of the Company. Driver retains the right to accept or decline any load assignment. The Company does not control the means or methods by which Driver performs transportation services.</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">2. Document Authenticity & Verification</h3>
                          <p>Driver represents and warrants that all documents, credentials, licenses, certificates, and information submitted through the Action Auto platform are genuine, authentic, current, and unaltered. Driver acknowledges that the Company may verify the authenticity of any submitted document directly with issuing authorities including the DMV, FMCSA, insurance carriers, and medical examiners.</p>
                          <p className="mt-2">The submission of any fraudulent, forged, altered, expired, or misleading document shall constitute a material breach of this Agreement.</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">3. Federal & State Regulatory Compliance</h3>
                          <p>Driver shall at all times comply with all applicable federal, state, and local laws governing transportation, including 49 CFR Parts 390-399, FMCSA Hours of Service regulations, DOT drug and alcohol testing requirements, and state-specific CDL requirements.</p>
                          <p className="mt-2">Driver shall maintain a valid CDL, current DOT medical certification, and keep MC/DOT numbers active and in good standing with the FMCSA.</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">4. Insurance & Liability Requirements</h3>
                          <p>Driver shall maintain minimum insurance coverage: Auto Liability ($750K), Cargo Insurance ($100K), General Liability ($1M), and Workers' Compensation as required. Driver shall provide certificates of insurance prior to accepting loads.</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">5. Credential Maintenance & Notification</h3>
                          <p>Driver is responsible for maintaining all required credentials. Driver shall notify the Company within 48 hours of any expiration, suspension, revocation, or disqualifying events including citations, accidents, or arrests.</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">6. Background Check Authorization</h3>
                          <p>Driver authorizes comprehensive background investigation including criminal records, driving records, MVR, employment history, FMCSA PSP, drug and alcohol testing history, credit review, and reference checks in accordance with the Fair Credit Reporting Act (FCRA).</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">7. Data Privacy, Security & Confidentiality</h3>
                          <p>All sensitive personal information is encrypted using industry-standard AES-256 encryption both in transit (TLS 1.3) and at rest. Access is restricted to authorized personnel. Driver acknowledges consent to collection and use of personal information for verification, compliance, dispatch, payment processing, and safety monitoring.</p>
                        </div>

                        <div>
                          <h3 className="font-bold text-foreground text-base uppercase tracking-wider mb-2">8. Electronic Signature & Acceptance</h3>
                          <p>By checking the acceptance box below, Driver acknowledges that they have read this Agreement in its entirety, understand all terms and conditions, and their electronic acceptance constitutes a legally binding signature under E-SIGN Act and UETA. Driver enters into this Agreement voluntarily and without coercion.</p>
                        </div>

                        <p className="text-xs text-muted-foreground/60 italic">Last updated January 15, 2025</p>
                      </div>
                    </div>

                    <motion.label initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn('flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all',
                      bgCheckConsent && uploadedCount === requiredDocs.length && driverFirstName && licenseNumber && licenseExp ? (
                        verificationAgreement ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-primary/50 hover:border-primary/70 bg-primary/5'
                      ) : 'border-border/55 opacity-60 cursor-not-allowed')}>
                      <input type="checkbox" checked={verificationAgreement} onChange={e => {
                        if (agreementScrolledToBottom && bgCheckConsent && uploadedCount === requiredDocs.length && driverFirstName && licenseNumber && licenseExp) {
                          setVerificationAgreement(e.target.checked);
                        }
                      }} disabled={!agreementScrolledToBottom || !bgCheckConsent || uploadedCount < requiredDocs.length || !driverFirstName || !licenseNumber || !licenseExp} className="mt-0.5 size-5 rounded border-2 border-border accent-emerald-600" />
                      <div>
                        <span className="text-sm font-bold">I accept the Verification Agreement *</span>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {!bgCheckConsent ? 'You must authorize background checks in the Information section first.' : uploadedCount < requiredDocs.length ? `You must upload all ${requiredDocs.length} documents first.` : !driverFirstName || !licenseNumber || !licenseExp ? 'You must complete your Information section first.' : !agreementScrolledToBottom ? 'Please scroll to the bottom of the agreement to enable acceptance.' : 'By checking this, you agree to all terms above.'}
                        </p>
                      </div>
                    </motion.label>

                    <div className="flex items-center justify-between pt-6 border-t border-border/55">
                      <Button variant="ghost" onClick={() => setActiveStep('personal')} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      <Button onClick={handleSaveIdentity}
                        disabled={savingIdentity || !verificationAgreement || uploadedCount < requiredDocs.length || !driverFirstName || !licenseNumber || !licenseExp}
                        className="gap-2 rounded-xl bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20">
                        {savingIdentity ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Submit for Admin Review
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'review' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/65 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-green-500/5" />
                  <div className="relative p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className={cn('size-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-linear-to-br',
                        verificationStatus === 'verified' ? 'from-emerald-500 to-green-500' :
                          verificationStatus === 'under_review' ? 'from-amber-500 to-orange-500' : 'from-slate-500 to-zinc-500')}>
                        {verificationStatus === 'verified' ? <BadgeCheck className="size-7" /> :
                          verificationStatus === 'under_review' ? <Clock className="size-7" /> : <ShieldAlert className="size-7" />}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">
                          {verificationStatus === 'verified' ? 'Profile Verified ✓' :
                            verificationStatus === 'under_review' ? 'Awaiting Admin Review' : 'Review Your Profile'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {verificationStatus === 'verified' ? 'Your profile has been approved and verified.' :
                            verificationStatus === 'under_review' ? 'Our team is reviewing your submission.' : 'Status overview and timeline'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                      {[
                        { label: 'Documents', done: uploadedCount === requiredDocs.length, icon: FileCheck },
                        { label: 'Information', done: !!(driverFirstName && licenseNumber && licenseExp), icon: UserCheck },
                        { label: 'Verified', done: verificationAgreement, icon: Scale },
                        { label: 'Docs Approved', done: verifiedCount > 0, icon: CheckCircle2, sub: `${verifiedCount}/${requiredDocs.length}` },
                        { label: 'Admin Review', done: verificationStatus === 'under_review' || verificationStatus === 'verified', icon: Clock },
                        { label: 'Approved', done: verificationStatus === 'verified', icon: ShieldCheck },
                      ].map((it, idx) => (
                        <motion.div key={it.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                          <div className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                            it.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/70 bg-muted/10')}>
                            <div className={cn('size-10 rounded-lg flex items-center justify-center', it.done ? 'bg-emerald-500/15' : 'bg-muted/20')}>
                              {it.done ? <CheckCircle2 className="size-5 text-emerald-500" /> : <it.icon className="size-5 text-muted-foreground" />}
                            </div>
                            <span className={cn('text-xs font-bold text-center', it.done ? 'text-foreground' : 'text-muted-foreground')}>{it.label}</span>
                            {it.sub && <span className="text-[10px] text-muted-foreground/60">{it.sub}</span>}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {verificationStatus === 'under_review' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border-2 border-amber-500/25 bg-amber-500/8 p-5 mb-8">
                        <div className="flex items-start gap-4">
                          <div className="size-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-1"><Clock className="size-5 text-amber-600 dark:text-amber-400" /></div>
                          <div>
                            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">Verification in Progress</h3>
                            <ol className="text-xs text-amber-600/90 dark:text-amber-400/80 space-y-1.5 list-decimal list-inside leading-relaxed">
                              <li>Submitted at {new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })} - Awaiting admin review</li>
                              <li>Documents will be verified against government records</li>
                              <li>Background check processing (1-2 business days)</li>
                              <li>You'll receive an email notification when approved</li>
                            </ol>
                            <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-3">Typical timeline: <strong>24 hours</strong></p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {verificationStatus === 'verified' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl border-2 border-emerald-500/25 bg-emerald-500/8 p-5 mb-8">
                        <div className="flex items-start gap-4">
                          <div className="size-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-1"><Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" /></div>
                          <div>
                            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">You're All Set!</h3>
                            <p className="text-sm text-emerald-600/90 dark:text-emerald-400/80 leading-relaxed">
                              Your profile has been fully verified and approved by our admin team. You are now cleared to browse available loads, accept shipments, and start working on the platform immediately.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="rounded-2xl border-2 border-border/55 bg-muted/5 p-5">
                      <div className="flex items-start gap-3">
                        <Lock className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-muted-foreground mb-2">Security & Compliance Overview</p>
                          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
                            <li>All documents encrypted with AES-256 (TLS 1.3 in transit)</li>
                            <li>Background check processed according to FCRA</li>
                            <li>Credentials verified with FMCSA and state authorities</li>
                            <li>Compliance data cross-checked against federal records</li>
                            <li>Your data is never shared with third parties</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-border/55">
                      <Button variant="ghost" onClick={() => setActiveStep('agreement')} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      {verificationStatus === 'verified' && (
                        <Button asChild className="gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                          <Link href="/driver/available-loads">Browse Available Loads <ChevronRight className="size-4" /></Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md border-2 border-primary/30 shadow-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="size-10 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg"><Upload className="size-5" /></div>
                <div>
                  <p>Upload Document</p>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">Secure & encrypted upload</p>
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm mt-2 flex items-center gap-2"><Lock className="size-4 text-emerald-500" /> All files are encrypted with AES-256 (TLS 1.3). Max 5MB.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Document Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="h-11 bg-linear-to-br from-background to-muted/40 border-2 border-border/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all hover:border-border/70"><SelectValue placeholder="Select document type" /></SelectTrigger>
                  <SelectContent className="border-2 border-border/50 shadow-xl rounded-xl"><motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>{documentTypeOptions.map(t => <SelectItem key={t.value} value={t.value} className="cursor-pointer hover:bg-primary/10 focus:bg-primary/20 rounded-lg">{t.label}</SelectItem>)}</motion.div></SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Label / Description</Label>
                <Input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} placeholder="e.g. CDL Front Side" maxLength={100} className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/40" />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Expiration Date <span className="text-muted-foreground/60">(optional)</span></Label>
                <Input type="date" value={uploadExpiry} onChange={e => setUploadExpiry(e.target.value)} className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">File Upload</Label>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                <motion.div onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn('flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
                    dragOver ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' : uploadFile ? 'border-emerald-500/40 bg-emerald-500/8 shadow-md shadow-emerald-500/10' : 'border-border/70 hover:border-blue-500/60 hover:bg-blue-500/5 hover:shadow-md')}>

                  {uploadFile ? (
                    <motion.div className="flex items-center gap-3 w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="size-12 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0"><FileText className="size-6 text-emerald-500" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">{fmtSize(uploadFile.size)}</p>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/20" onClick={e => { e.stopPropagation(); setUploadFile(null); }}><X className="size-4" /></Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div className="flex flex-col items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Camera className="size-10 text-muted-foreground/50" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">Drop file here or click to browse</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, WebP, or PDF up to 5MB</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
            <DialogFooter className="gap-2 mt-6 pt-4 border-t border-border/55">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="w-full rounded-xl h-10 border-2 border-border/50 hover:border-border/70">Cancel</Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadLabel.trim()} className="w-full gap-2 rounded-xl h-10 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </motion.div>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm border-2 border-destructive/30 shadow-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="size-10 rounded-xl bg-linear-to-br from-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg"><Trash2 className="size-5" /></div>
                <div>
                  <p>Delete Document</p>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">Permanent action</p>
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm mt-2 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <span>This will permanently remove the document. You may need to re-upload it later to re-verify.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-6 pt-4 border-t border-border/55">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="w-full rounded-xl h-10 border-2 border-border/50 hover:border-border/70">Keep</Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                  disabled={deletingId === showDeleteConfirm} className="w-full gap-2 rounded-xl h-10 bg-linear-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 shadow-lg shadow-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                  {deletingId === showDeleteConfirm ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {deletingId === showDeleteConfirm ? 'Deleting...' : 'Delete Forever'}
                </Button>
              </motion.div>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] border-2 border-primary/30 shadow-2xl flex flex-col">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="flex flex-col h-full">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="size-10 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg"><Eye className="size-5" /></div>
                <div>
                  <p>View Document</p>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">{viewingDoc?.fileName}</p>
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold">{viewingDoc?.type.replace(/_/g, ' ').toUpperCase()}</Badge>
                <span className="text-muted-foreground">{viewingDoc?.uploadedAt ? fmtDate(viewingDoc.uploadedAt) : 'Date unavailable'}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto my-4 bg-muted/20 rounded-xl border border-border/65 p-4">
              {viewingDoc?.fileUrl && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="w-full h-full flex items-center justify-center">
                  {viewingDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${viewingDoc.fileUrl}#toolbar=1`}
                      title={viewingDoc.fileName}
                      className="w-full h-full rounded-lg border border-border/55"
                      style={{ minHeight: '500px' }}
                    />
                  ) : (
                    <img
                      src={viewingDoc.fileUrl}
                      alt={viewingDoc.fileName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  )}
                </motion.div>
              )}
            </div>
            <DialogFooter className="gap-2 shrink-0 pt-4 border-t border-border/55">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="outline" onClick={() => setViewingDoc(null)} className="w-full rounded-xl h-10 border-2 border-border/50 hover:border-border/70">Close</Button>
              </motion.div>
              {viewingDoc?.fileUrl && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button asChild className="w-full gap-2 rounded-xl h-10 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 transition-all">
                    <a href={viewingDoc.fileUrl} download={viewingDoc.fileName} target="_blank" rel="noopener noreferrer">
                      <FileText className="size-4" /> Download
                    </a>
                  </Button>
                </motion.div>
              )}
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};