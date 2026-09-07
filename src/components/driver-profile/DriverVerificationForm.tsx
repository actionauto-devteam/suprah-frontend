'use client';

import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useOrg } from '@/hooks/useOrg';
import { apiClient } from '@/lib/api-client';
import { ComplianceDocument } from '@/types/driver-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Shield, Upload, Trash2, FileText, AlertTriangle, CheckCircle2, Clock,
  Lock, ShieldCheck, X, Camera, Paperclip, Ban, ChevronRight, ClipboardCheck, Scale,
  FileCheck, CreditCard, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { REQUIRED_DOCUMENTS, documentTypeOptions, US_STATES } from './driver-profile-constants';
import { cn } from '@/lib/utils';
import { Stepper, type StepperStep } from './Stepper';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

const APPLICATION_STEPS: readonly StepperStep[] = [
  { id: 'documents', label: 'Documents', icon: FileCheck },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'agreement', label: 'Agreement', icon: Scale },
] as const;

type ApplicationStepId = (typeof APPLICATION_STEPS)[number]['id'];

const DOC_ICONS: Record<string, React.ElementType> = {
  drivers_license: CreditCard, medical_card: FileText, insurance_certificate: Shield,
  vehicle_registration: FileText, operating_authority: Building2, w9_form: FileText,
  dot_inspection: FileCheck, cargo_insurance: Shield, liability_insurance: Shield, other: Paperclip,
};

const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export function DriverVerificationForm({ onComplete }: { onComplete: () => void }) {
  const { getToken } = useAuth();
  const { organization } = useOrg();

  const [loading, setLoading] = React.useState(true);
  const [activeStep, setActiveStep] = React.useState<ApplicationStepId>('documents');
  const [documents, setDocuments] = React.useState<ComplianceDocument[]>([]);

  // Compliance
  const [licenseNumber, setLicenseNumber] = React.useState('');
  const [licenseState, setLicenseState] = React.useState('');
  const [licenseExp, setLicenseExp] = React.useState('');
  const [medicalExp, setMedicalExp] = React.useState('');
  const [insuranceExp, setInsuranceExp] = React.useState('');
  const [insuranceProvider, setInsuranceProvider] = React.useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = React.useState('');
  const [savingCompliance, setSavingCompliance] = React.useState(false);

  // Agreement
  const [ssnLast4, setSsnLast4] = React.useState('');
  const [bgCheckConsent, setBgCheckConsent] = React.useState(false);
  const [verificationAgreement, setVerificationAgreement] = React.useState(false);
  const [agreementScrolledToBottom, setAgreementScrolledToBottom] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Upload dialog
  const [uploadType, setUploadType] = React.useState('drivers_license');
  const [uploadLabel, setUploadLabel] = React.useState('');
  const [uploadExpiry, setUploadExpiry] = React.useState('');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<ComplianceDocument | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = React.useState('');
  const [previewMimeType, setPreviewMimeType] = React.useState('');
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const agreementContentRef = React.useRef<HTMLDivElement>(null);

  const fetchProfile = React.useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/api/driver-profile', { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data?.data;
      if (d) {
        setDocuments(d.documents || []);
        setLicenseNumber(d.driversLicenseNumber || '');
        setLicenseState(d.licenseState || '');
        setLicenseExp(d.licenseExpirationDate?.substring(0, 10) || '');
        setMedicalExp(d.medicalCardExpirationDate?.substring(0, 10) || '');
        setInsuranceExp(d.insuranceExpirationDate?.substring(0, 10) || '');
        setInsuranceProvider(d.insuranceProvider || '');
        setInsurancePolicyNumber(d.insurancePolicyNumber || '');
        setSsnLast4(d.ssnLast4 || '');
        setBgCheckConsent(!!d.backgroundCheckConsent);
        setVerificationAgreement(!!d.verificationAgreement);
      }
    } catch {
      toast.error('Failed to load your application data');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
  const optionalDocs = REQUIRED_DOCUMENTS.filter(d => !d.required);
  const getDocStatus = (type: string) => {
    const docs = documents.filter(d => d.type === type);
    if (!docs.length) return 'missing';
    if (docs.some(d => d.verified)) return 'verified';
    if (docs.some(d => d.reviewStatus === 'rejected')) return 'rejected';
    return 'pending';
  };
  const uploadedCount = requiredDocs.filter(d => getDocStatus(d.type) !== 'missing').length;
  const documentsDone = uploadedCount === requiredDocs.length;
  const complianceDone = !!(licenseNumber.trim() && licenseExp);
  const completedStepIds = React.useMemo(() => {
    const done = new Set<string>();
    if (documentsDone) done.add('documents');
    if (complianceDone) done.add('compliance');
    return done;
  }, [documentsDone, complianceDone]);

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
      if (res.data?.data) setDocuments(res.data.data.documents || []);
      toast.success('Document uploaded');
      setShowUploadDialog(false);
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      const token = await getToken();
      const res = await apiClient.delete(`/api/driver-profile/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.data) setDocuments(res.data.data.documents || []);
      toast.success('Document removed');
      setShowDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveCompliance = async () => {
    if (!complianceDone) { toast.error('Please complete all required compliance fields'); return; }
    setSavingCompliance(true);
    try {
      const token = await getToken();
      await apiClient.patch('/api/driver-profile/compliance', {
        driversLicenseNumber: licenseNumber.trim(), licenseState,
        licenseExpirationDate: licenseExp || undefined, medicalCardExpirationDate: medicalExp || undefined,
        insuranceExpirationDate: insuranceExp || undefined, insuranceProvider: insuranceProvider.trim(),
        insurancePolicyNumber: insurancePolicyNumber.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setActiveStep('agreement');
    } catch {
      toast.error('Failed to save compliance info');
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (ssnLast4.replace(/\D/g, '').length !== 4) { toast.error('Please enter exactly 4 digits for SSN'); return; }
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiClient.patch('/api/driver-profile/identity-verification', {
        ssnLast4: ssnLast4.replace(/\D/g, ''),
        backgroundCheckConsent: bgCheckConsent || undefined,
        verificationAgreement: verificationAgreement || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Application submitted for review');
      onComplete();
    } catch {
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  // Document preview — blob-fetched the same way the superadmin review
  // screen previews driver documents, so applicants can confirm the right
  // file uploaded before submitting.
  React.useEffect(() => {
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
          `/api/driver-profile/documents/${encodeURIComponent(previewDoc._id)}/file`,
          { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' },
        );
        if (cancelled) return;
        const contentType =
          String(response.headers?.['content-type'] || '').split(';')[0] || previewDoc.mimeType || 'application/octet-stream';
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType });
        setPreviewMimeType(contentType);
        setPreviewObjectUrl(URL.createObjectURL(blob));
      } catch (error: unknown) {
        if (!cancelled) {
          const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setPreviewError(message || 'This document could not be opened securely.');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, previewDoc]);

  React.useEffect(() => () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  }, [previewObjectUrl]);

  const closePreview = () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl('');
    setPreviewDoc(null);
  };

  if (loading) {
    return <PageLoadingState className="min-h-[40vh]" />;
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Complete Your Application</h1>
        <p className="text-muted-foreground text-sm">A few more details before your dealer admin can review your account.</p>
      </div>

      <Stepper
        steps={APPLICATION_STEPS}
        currentStepId={activeStep}
        completedStepIds={completedStepIds}
        onStepClick={(id) => setActiveStep(id as ApplicationStepId)}
        className="mb-8"
      />

      <div key={activeStep} className="animate-in fade-in slide-in-from-right-4 duration-200">

        {activeStep === 'documents' && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-foreground">Required Documents</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{uploadedCount} of {requiredDocs.length} uploaded</p>
              </div>
              <StatusBadge status={documentsDone ? 'approved' : 'pending'} domain="documentReview" className="text-xs" />
            </div>

            {requiredDocs.map(req => {
              const status = getDocStatus(req.type);
              const ups = documents.filter(d => d.type === req.type);
              const Icon = DOC_ICONS[req.type] || FileText;
              return (
                <div key={req.type} className={cn('rounded-xl border-2 overflow-hidden',
                  status === 'verified' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    status === 'rejected' ? 'border-red-500/30 bg-red-500/5' :
                      status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border')}>
                  <div className="p-3.5 flex items-center gap-3.5">
                    <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0',
                      status === 'verified' ? 'bg-emerald-500/15' : status === 'rejected' ? 'bg-red-500/15' : status === 'pending' ? 'bg-amber-500/15' : 'bg-muted')}>
                      {status === 'verified' ? <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" /> :
                        status === 'rejected' ? <Ban className="size-5 text-red-600 dark:text-red-400" /> :
                          status === 'pending' ? <Clock className="size-5 text-amber-600 dark:text-amber-400" /> :
                            <Icon className="size-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{req.label}</p>
                      <p className="text-[11px] text-muted-foreground">{req.description}</p>
                      {ups[0] && (
                        <button type="button" onClick={() => setPreviewDoc(ups[0])} className="text-[11px] text-muted-foreground mt-0.5 underline decoration-dotted hover:text-foreground">
                          {ups[0].fileName} · {fmtSize(ups[0].fileSize)}
                        </button>
                      )}
                      {status === 'rejected' && ups[0]?.rejectionReason && (
                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 italic flex items-center gap-1"><Ban className="size-3" /> {ups[0].rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ups[0] && (
                        <Button size="icon" variant="ghost" className="size-11 text-red-600 hover:bg-red-500/10 dark:text-red-400" onClick={() => setShowDeleteConfirm(ups[0]._id)} disabled={deletingId === ups[0]._id}>
                          {deletingId === ups[0]._id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </Button>
                      )}
                      <Button variant={status === 'missing' ? 'default' : 'outline'} size="sm" onClick={() => openUploadFor(req.type)} className="h-11 gap-1.5 rounded-lg">
                        {status === 'missing' ? <Camera className="size-3.5" /> : <Upload className="size-3.5" />}
                        {status === 'missing' ? 'Upload' : 'Replace'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {optionalDocs.length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-3 pb-1"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Optional</span><div className="h-px flex-1 bg-border" /></div>
                {optionalDocs.map(req => {
                  const ups = documents.filter(d => d.type === req.type);
                  return (
                    <div key={req.type} className="rounded-xl border border-border p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{req.label}</p>
                        {ups[0] && <p className="text-[10px] text-muted-foreground">{ups[0].fileName}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openUploadFor(req.type)} className="gap-1.5 rounded-lg"><Upload className="size-3.5" /></Button>
                    </div>
                  );
                })}
              </>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => setActiveStep('compliance')} disabled={!documentsDone} className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
                Next: Compliance <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {activeStep === 'compliance' && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">License &amp; Insurance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Required for FMCSA compliance</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">CDL Number *</Label>
                <Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="DL-XXXXXXXX" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">License State *</Label>
                <Select value={licenseState} onValueChange={setLicenseState}>
                  <SelectTrigger className="h-11 rounded-xl w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">CDL Expiration *</Label>
                <Input type="date" value={licenseExp} onChange={e => setLicenseExp(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Medical Card Expires</Label>
                <Input type="date" value={medicalExp} onChange={e => setMedicalExp(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Insurance Provider</Label>
                <Input value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} placeholder="e.g. Progressive" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Policy Number</Label>
                <Input value={insurancePolicyNumber} onChange={e => setInsurancePolicyNumber(e.target.value)} placeholder="e.g. POL-123456" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Insurance Expires</Label>
                <Input type="date" value={insuranceExp} onChange={e => setInsuranceExp(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setActiveStep('documents')} className="text-muted-foreground">Back</Button>
              <Button onClick={handleSaveCompliance} disabled={savingCompliance || !complianceDone} className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
                {savingCompliance ? <Loader2 className="size-4 animate-spin" /> : null} Next: Agreement <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {activeStep === 'agreement' && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Verification Agreement</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Please review and accept the terms</p>
            </div>

            <div ref={agreementContentRef} onScroll={(e) => {
              const el = e.currentTarget;
              setAgreementScrolledToBottom(Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 20);
            }} className="rounded-xl border border-border bg-muted/30 max-h-[35vh] overflow-y-auto p-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-1.5">1. Independent Contractor Relationship</h3>
                <p>By accepting this Agreement, Driver acknowledges that they are engaged as an independent contractor and not as an employee. Driver retains the right to accept or decline any load assignment.</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-1.5">2. Document Authenticity</h3>
                <p>Driver represents that all documents submitted are genuine, authentic, current, and unaltered, and may be verified directly with issuing authorities including the DMV, FMCSA, and insurance carriers.</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-1.5">3. Regulatory Compliance</h3>
                <p>Driver shall comply with all applicable federal, state, and local transportation laws, including 49 CFR Parts 390-399 and FMCSA Hours of Service regulations, and maintain a valid CDL and DOT medical certification.</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-1.5">4. Background Check Authorization</h3>
                <p>Driver authorizes a background investigation including criminal records, driving records, and employment history, in accordance with the Fair Credit Reporting Act (FCRA).</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-1.5">5. Electronic Signature</h3>
                <p>By checking the acceptance box below, Driver acknowledges they have read this Agreement in its entirety and their electronic acceptance constitutes a legally binding signature under the E-SIGN Act and UETA.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Last 4 Digits of SSN *</Label>
              <Input value={ssnLast4} onChange={e => setSsnLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4} className="h-11 w-32 font-mono rounded-xl" />
            </div>

            <label className={cn('flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
              bgCheckConsent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-foreground/20')}>
              <input type="checkbox" checked={bgCheckConsent} onChange={e => setBgCheckConsent(e.target.checked)} className="mt-0.5 size-4 rounded border-border accent-emerald-600" />
              <div>
                <span className="text-sm font-bold text-foreground">Background Check Authorization *</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">I authorize {organization?.name || "Your Dealership"} to conduct a background check per the FCRA.</p>
              </div>
            </label>

            <label className={cn('flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
              bgCheckConsent && ssnLast4.length === 4 ? (verificationAgreement ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-500/40 hover:border-emerald-500/60') : 'border-border opacity-50 cursor-not-allowed')}>
              <input type="checkbox" checked={verificationAgreement}
                onChange={e => {
                  if (agreementScrolledToBottom && bgCheckConsent && ssnLast4.length === 4) setVerificationAgreement(e.target.checked);
                }}
                disabled={!agreementScrolledToBottom || !bgCheckConsent || ssnLast4.length !== 4}
                className="mt-0.5 size-4 rounded border-border accent-emerald-600" />
              <div>
                <span className="text-sm font-bold text-foreground">I accept the Verification Agreement *</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {!bgCheckConsent || ssnLast4.length !== 4 ? 'Complete the fields above first.' : !agreementScrolledToBottom ? 'Scroll to the bottom of the agreement to enable acceptance.' : 'By checking this, you agree to all terms above.'}
                </p>
              </div>
            </label>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90">Your application (documents, compliance info, and this agreement) will be sent to your organization&apos;s admin for review. You&apos;ll receive an email once it&apos;s approved or declined.</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setActiveStep('compliance')} className="text-muted-foreground">Back</Button>
              <Button onClick={handleSubmitApplication} disabled={submitting || !verificationAgreement} className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} Submit Application
              </Button>
            </div>
          </div>
        )}

      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="size-5" /> Upload Document</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5"><Lock className="size-3.5 text-emerald-500" /> Encrypted upload. Max 5MB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Document Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Select document type" /></SelectTrigger>
                <SelectContent>{documentTypeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Label / Description</Label>
              <Input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} placeholder="e.g. CDL Front Side" maxLength={100} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Expiration Date (optional)</Label>
              <Input type="date" value={uploadExpiry} onChange={e => setUploadExpiry(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">File</Label>
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                className={cn('flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                  dragOver ? 'border-blue-500 bg-blue-500/10' : uploadFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border hover:border-blue-500/50')}>
                {uploadFile ? (
                  <div className="flex items-center gap-3 w-full px-4">
                    <FileText className="size-6 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtSize(uploadFile.size)}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="size-8" onClick={e => { e.stopPropagation(); setUploadFile(null); }}><X className="size-4" /></Button>
                  </div>
                ) : (
                  <>
                    <Camera className="size-8 text-muted-foreground/50" />
                    <p className="text-sm font-bold text-center">Drop file here or click to browse</p>
                    <p className="text-xs text-muted-foreground/70">JPG, PNG, WebP, or PDF up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadLabel.trim()} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="size-5" /> Delete Document</DialogTitle>
            <DialogDescription>This will permanently remove the document. You can re-upload it later.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Keep</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} disabled={deletingId === showDeleteConfirm} className="flex-1 gap-2">
              {deletingId === showDeleteConfirm ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={(nextOpen) => { if (!nextOpen) closePreview(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-5 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-black">
              <FileText className="size-4" /> {previewDoc?.label || previewDoc?.fileName}
            </DialogTitle>
            <DialogDescription>{fmtSize(previewDoc?.fileSize || 0)}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto px-5 pb-5">
            {previewLoading ? (
              <PageLoadingState className="min-h-80" />
            ) : previewError ? (
              <div className="flex min-h-80 items-center justify-center text-center text-sm text-destructive">{previewError}</div>
            ) : previewObjectUrl && previewMimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewObjectUrl} alt={previewDoc?.label || previewDoc?.fileName || 'Driver document'} className="w-full rounded-xl border border-border" />
            ) : previewObjectUrl && previewMimeType === 'application/pdf' ? (
              <iframe src={previewObjectUrl} className="w-full h-[60vh] rounded-xl border border-border" title={previewDoc?.label || 'Driver document'} />
            ) : previewObjectUrl ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <FileText className="size-16 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                <Button asChild variant="outline"><a href={previewObjectUrl} target="_blank" rel="noopener noreferrer">Open File</a></Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
