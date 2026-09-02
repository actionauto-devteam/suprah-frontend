'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  FileWarning,
  Fingerprint,
  Loader2,
  Lock,
  Paperclip,
  RotateCcw,
  Save,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/providers/AuthProvider';
import { useOrg } from '@/hooks/useOrg';
import { apiClient } from '@/lib/api-client';
import {
  ComplianceDocument,
  DriverProfile,
  VerificationStatus,
} from '@/types/driver-profile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  REQUIRED_DOCUMENTS,
  documentTypeOptions,
  US_STATES,
} from './driver-profile-constants';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'documents', label: 'Documents', icon: FileCheck },
  { id: 'personal', label: 'Information', icon: UserCheck },
  { id: 'agreement', label: 'Agreement', icon: Scale },
  { id: 'review', label: 'Approval', icon: BadgeCheck },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const DOC_ICONS: Record<string, React.ElementType> = {
  drivers_license: CreditCard,
  medical_card: FileText,
  insurance_certificate: Shield,
  vehicle_registration: FileText,
  operating_authority: Building2,
  w9_form: FileText,
  dot_inspection: FileCheck,
  cargo_insurance: Shield,
  liability_insurance: Shield,
  other: Paperclip,
};

const formatSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'File';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  });

const expirationStatus = (value?: string) => {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, className: 'text-red-500' };
  if (days <= 30) return { label: `${days}d left`, className: 'text-amber-500' };
  return { label: `${days}d`, className: 'text-emerald-500' };
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

const DEFAULT_ZIP_BY_STATE_CODE: Record<string, string> = {
  AL: '35004',
  AK: '99501',
  AZ: '85001',
  AR: '71601',
  CA: '90001',
  CO: '80001',
  CT: '06001',
  DE: '19701',
  FL: '32003',
  GA: '30002',
  HI: '96701',
  ID: '83201',
  IL: '60001',
  IN: '46001',
  IA: '50001',
  KS: '66002',
  KY: '40003',
  LA: '70001',
  ME: '03901',
  MD: '20601',
  MA: '01001',
  MI: '48001',
  MN: '55001',
  MS: '38601',
  MO: '63001',
  MT: '59001',
  NE: '68001',
  NV: '89101',
  NH: '03031',
  NJ: '07001',
  NM: '87001',
  NY: '10001',
  NC: '27006',
  ND: '58001',
  OH: '43001',
  OK: '73001',
  OR: '97001',
  PA: '15001',
  RI: '02801',
  SC: '29001',
  SD: '57001',
  TN: '37010',
  TX: '75001',
  UT: '84001',
  VT: '05001',
  VA: '20101',
  WA: '98001',
  WV: '24701',
  WI: '53001',
  WY: '82001',
  DC: '20001',
};

const getStateCode = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] || '';
};

const getDefaultZipForState = (rawValue: string) => {
  const code = getStateCode(rawValue);
  return code ? DEFAULT_ZIP_BY_STATE_CODE[code] || '' : '';
};

const resolveDriverStateOption = (rawValue: string) => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return '';

  // Works whether US_STATES contains abbreviations or full state names.
  const direct = US_STATES.find(
    (state) => String(state).trim().toLowerCase() === normalized,
  );
  if (direct) return String(direct);

  const code = STATE_NAME_TO_CODE[normalized];
  if (!code) return '';

  return (
    US_STATES.find(
      (state) => String(state).trim().toUpperCase() === code,
    ) || ''
  ).toString();
};

const parseSafeProfileLocation = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return { city: '', state: '' };

  // Driver Verification location autofill is intentionally US-only.
  // Accept only a simple "City, State" value whose state resolves to one of
  // the configured US_STATES options. Non-US regions are ignored rather than
  // copied into the verification record.
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 2) {
    return { city: '', state: '' };
  }

  const [city, rawState] = parts;
  const state = resolveDriverStateOption(rawState);

  if (!city || !state) {
    return { city: '', state: '' };
  }

  return { city, state };
};

const parseSafeAccountName = (account: any) => {
  const explicitFirst = String(account?.firstName || '').trim();
  const explicitLast = String(account?.lastName || '').trim();

  if (explicitFirst || explicitLast) {
    return {
      firstName: explicitFirst,
      lastName: explicitLast,
    };
  }

  // User.model currently stores one required full-name field. For empty
  // verification fields only, split the first token from the remaining
  // tokens as an editable starting value. Nothing is persisted automatically.
  const fullName = String(account?.name || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const toDateInputValue = (value?: string | Date | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const getLatestDocumentExpiration = (
  documents: ComplianceDocument[] | undefined,
  type: string,
) => {
  const matching = (documents || [])
    .filter((doc) => doc.type === type && doc.expiresAt)
    .sort((a, b) => {
      const aTime = new Date(a.uploadedAt || 0).getTime();
      const bTime = new Date(b.uploadedAt || 0).getTime();
      return bTime - aTime;
    });

  return toDateInputValue(matching[0]?.expiresAt);
};

const DOCUMENT_EXPIRY_TYPES = new Set([
  'drivers_license',
  'medical_card',
  'insurance_certificate',
  'liability_insurance',
  'cargo_insurance',
]);

export const DocumentsPage: React.FC = () => {
  const { getToken } = useAuth();
  const { organization } = useOrg();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<StepId>('documents');

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
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('unverified');

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('drivers_license');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ComplianceDocument | null>(null);
  const [viewingObjectUrl, setViewingObjectUrl] = useState('');
  const [viewingMimeType, setViewingMimeType] = useState('');
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingError, setViewingError] = useState('');
  const [replaceTarget, setReplaceTarget] =
    useState<ComplianceDocument | null>(null);
  const [accountPrefill, setAccountPrefill] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    state: string;
  } | null>(null);

  const accountAutofillAppliedRef = useRef(false);
  const [agreementScrolledToBottom, setAgreementScrolledToBottom] = useState(false);
  const agreementContentRef = useRef<HTMLDivElement>(null);
  const stepStorageKey = 'driver-verification-active-step';

  const documents = profile?.documents ?? [];

  const uploadedLicenseExpiration = useMemo(
    () => getLatestDocumentExpiration(documents, 'drivers_license'),
    [documents],
  );
  const uploadedMedicalExpiration = useMemo(
    () => getLatestDocumentExpiration(documents, 'medical_card'),
    [documents],
  );
  const uploadedInsuranceExpiration = useMemo(
    () => getLatestDocumentExpiration(documents, 'insurance_certificate'),
    [documents],
  );

  const licenseExpirationConflict =
    Boolean(uploadedLicenseExpiration && licenseExp) &&
    uploadedLicenseExpiration !== licenseExp;
  const medicalExpirationConflict =
    Boolean(uploadedMedicalExpiration && medicalExp) &&
    uploadedMedicalExpiration !== medicalExp;
  const insuranceExpirationConflict =
    Boolean(uploadedInsuranceExpiration && insuranceExp) &&
    uploadedInsuranceExpiration !== insuranceExp;

  const requiredDocs = useMemo(
    () => REQUIRED_DOCUMENTS.filter((item) => item.required),
    [],
  );
  const optionalDocs = useMemo(
    () => REQUIRED_DOCUMENTS.filter((item) => !item.required),
    [],
  );

  const getDocStatus = useCallback(
    (type: string) => {
      const matching = documents.filter((doc) => doc.type === type);
      if (!matching.length) return 'missing';
      if (matching.some((doc) => doc.verified)) return 'verified';
      if (matching.some((doc) => doc.reviewStatus === 'rejected')) return 'rejected';
      return 'pending';
    },
    [documents],
  );

  const uploadedCount = requiredDocs.filter(
    (item) => getDocStatus(item.type) !== 'missing',
  ).length;
  const verifiedCount = requiredDocs.filter(
    (item) => getDocStatus(item.type) === 'verified',
  ).length;

  const personalRequirements = useMemo(
    () => [
      { label: 'First Name', complete: Boolean(driverFirstName.trim()) },
      { label: 'Last Name', complete: Boolean(driverLastName.trim()) },
      { label: 'CDL Number', complete: Boolean(licenseNumber.trim()) },
      { label: 'License State', complete: Boolean(licenseState) },
      { label: 'CDL Expiration', complete: Boolean(licenseExp) },
      { label: 'Insurance Provider', complete: Boolean(insuranceProvider.trim()) },
      { label: 'Policy Number', complete: Boolean(insurancePolicyNumber.trim()) },
      { label: 'VIN', complete: Boolean(vehicleVin.trim()) },
      {
        label: 'SSN Last 4',
        complete: ssnLast4.replace(/\D/g, '').length === 4,
      },
      {
        label: 'Background Check Authorization',
        complete: bgCheckConsent,
      },
    ],
    [
      bgCheckConsent,
      driverFirstName,
      driverLastName,
      insurancePolicyNumber,
      insuranceProvider,
      licenseExp,
      licenseNumber,
      licenseState,
      ssnLast4,
      vehicleVin,
    ],
  );

  const missingPersonalRequirements = useMemo(
    () => personalRequirements.filter((item) => !item.complete),
    [personalRequirements],
  );
  const personalInfoComplete = missingPersonalRequirements.length === 0;
  const hasAnyPersonalInfo = personalRequirements.some((item) => item.complete);

  const profileAutofillConflicts = useMemo(() => {
    if (!accountPrefill) return [] as string[];

    const conflicts: string[] = [];
    const same = (a: string, b: string) =>
      a.trim().toLowerCase() === b.trim().toLowerCase();

    if (
      driverFirstName.trim() &&
      accountPrefill.firstName &&
      !same(driverFirstName, accountPrefill.firstName)
    ) {
      conflicts.push('First Name');
    }
    if (
      driverLastName.trim() &&
      accountPrefill.lastName &&
      !same(driverLastName, accountPrefill.lastName)
    ) {
      conflicts.push('Last Name');
    }

    const driverPhoneDigits = driverPhone.replace(/\D/g, '');
    if (
      driverPhoneDigits &&
      accountPrefill.phone &&
      driverPhoneDigits !== accountPrefill.phone
    ) {
      conflicts.push('Phone');
    }

    if (
      driverCity.trim() &&
      accountPrefill.city &&
      !same(driverCity, accountPrefill.city)
    ) {
      conflicts.push('City');
    }
    if (
      driverState.trim() &&
      accountPrefill.state &&
      !same(driverState, accountPrefill.state)
    ) {
      conflicts.push('State');
    }

    return conflicts;
  }, [
    accountPrefill,
    driverCity,
    driverFirstName,
    driverLastName,
    driverPhone,
    driverState,
  ]);

  const stepStatus = useMemo(
    () => ({
      documents:
        uploadedCount === requiredDocs.length
          ? 'done'
          : uploadedCount > 0
            ? 'partial'
            : 'pending',
      personal: personalInfoComplete
        ? 'done'
        : hasAnyPersonalInfo
          ? 'partial'
          : 'pending',
      agreement: verificationAgreement ? 'done' : 'pending',
      review:
        verificationStatus === 'verified'
          ? 'done'
          : verificationStatus === 'under_review'
            ? 'partial'
            : 'pending',
    }),
    [
      hasAnyPersonalInfo,
      personalInfoComplete,
      requiredDocs.length,
      uploadedCount,
      verificationAgreement,
      verificationStatus,
    ],
  );

  const overallPct = useMemo(() => {
    let score = 0;
    score += Math.round((uploadedCount / Math.max(requiredDocs.length, 1)) * 30);
    if (personalInfoComplete) score += 25;
    if (verificationAgreement) score += 20;
    score += Math.round((verifiedCount / Math.max(requiredDocs.length, 1)) * 25);
    return Math.min(score, 100);
  }, [
    personalInfoComplete,
    requiredDocs.length,
    uploadedCount,
    verificationAgreement,
    verifiedCount,
  ]);

  const hydrateProfile = useCallback((data: DriverProfile) => {
    setProfile(data);
    setLicenseNumber(data.driversLicenseNumber || '');
    setLicenseState(data.licenseState || '');
    setLicenseExp(
      toDateInputValue(data.licenseExpirationDate) ||
        getLatestDocumentExpiration(data.documents, 'drivers_license'),
    );
    setMedicalExp(
      toDateInputValue(data.medicalCardExpirationDate) ||
        getLatestDocumentExpiration(data.documents, 'medical_card'),
    );
    setInsuranceExp(
      toDateInputValue(data.insuranceExpirationDate) ||
        getLatestDocumentExpiration(data.documents, 'insurance_certificate'),
    );
    setInsuranceProvider(data.insuranceProvider || '');
    setInsurancePolicyNumber(data.insurancePolicyNumber || '');

    setDriverFirstName(data.firstName || '');
    setDriverLastName(data.lastName || '');
    setDriverPhone(data.phone || '');
    setDriverAddress(data.address || '');
    setDriverCity(data.city || '');
    setDriverState(data.state || '');
    setDriverZip(data.zipCode || '');

    setVehicleMake(data.truckMake || '');
    setVehicleModel(data.truckModel || '');
    setVehicleYear(data.truckYear == null ? '' : String(data.truckYear));
    setVehicleVin(data.vin || '');
    setVehicleLicensePlate(data.plateNumber || '');

    setSsnLast4(data.ssnLast4 || '');
    setBgCheckConsent(Boolean(data.backgroundCheckConsent));
    setVerificationAgreement(Boolean(data.verificationAgreement));
    setVerificationStatus(
      (data.verificationStatus || 'unverified') as VerificationStatus,
    );
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [driverResult, accountResult] = await Promise.allSettled([
        apiClient.get('/api/driver-profile', { headers }),
        apiClient.get('/api/profile', { headers }),
      ]);

      if (driverResult.status !== 'fulfilled') {
        throw driverResult.reason;
      }

      const data = driverResult.value.data?.data as DriverProfile | undefined;
      if (!data) return;

      hydrateProfile(data);

      if (accountResult.status === 'fulfilled') {
        const account = accountResult.value.data?.data;
        const accountPersonal = account?.personalInfo || {};
        const accountName = parseSafeAccountName(account);
        const accountPhone = String(accountPersonal.phone || '').replace(/\D/g, '');
        const accountLocation = parseSafeProfileLocation(accountPersonal.location);

        setAccountPrefill({
          firstName: accountName.firstName,
          lastName: accountName.lastName,
          phone: accountPhone.length === 10 ? accountPhone : '',
          city: accountLocation.city,
          state: accountLocation.state,
        });

        // Safe Profile -> Driver Verification autofill.
        //
        // Rules:
        // 1. Persisted DriverProfile values ALWAYS win.
        // 2. Autofill changes local form state only. Nothing is silently saved.
        // 3. Only fields that can be mapped without inventing data are reused.
        // 4. The driver can review/edit every autofilled value before Save & Next.
        if (!String(data.firstName || '').trim() && accountName.firstName) {
          setDriverFirstName(accountName.firstName);
        }

        if (!String(data.lastName || '').trim() && accountName.lastName) {
          setDriverLastName(accountName.lastName);
        }

        if (!String(data.phone || '').trim() && accountPhone.length === 10) {
          setDriverPhone(accountPhone);
        }

        if (!String(data.city || '').trim() && accountLocation.city) {
          setDriverCity(accountLocation.city);
        }

        if (!String(data.state || '').trim() && accountLocation.state) {
          setDriverState(accountLocation.state);
        }
      }

      // Equipment -> Driver Verification is already handled by hydrateProfile:
      // truckMake/truckModel/truckYear/vin/plateNumber populate the matching
      // Vehicle Information fields from the canonical DriverProfile record.
      //
      // Street Address and ZIP are not available in the normal Profile schema,
      // so they are intentionally left for the driver to provide.
      //
      // Do not infer the active wizard step from completion state here.
      // Navigation is the driver's choice and is persisted below.
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to load Driver Verification data',
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, hydrateProfile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedStep = window.sessionStorage.getItem(stepStorageKey);
      if (
        storedStep === 'documents' ||
        storedStep === 'personal' ||
        storedStep === 'agreement' ||
        storedStep === 'review'
      ) {
        setActiveStep(storedStep);
      }
    }

    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    window.sessionStorage.setItem(stepStorageKey, activeStep);
  }, [activeStep, loading]);

  useEffect(() => {
    if (!accountPrefill || accountAutofillAppliedRef.current) return;

    // Re-apply the Profile source once after both requests settle. This makes
    // the behavior independent of which tab is currently visible, while still
    // allowing every autofilled value to be edited normally afterward.
    setDriverFirstName((current) => current.trim() || accountPrefill.firstName);
    setDriverLastName((current) => current.trim() || accountPrefill.lastName);
    setDriverPhone((current) => current.trim() || accountPrefill.phone);
    setDriverCity((current) => current.trim() || accountPrefill.city);

    if (!driverState.trim() && accountPrefill.state) {
      setDriverState(accountPrefill.state);
      setDriverZip(
        (current) =>
          current.trim() || getDefaultZipForState(accountPrefill.state),
      );
    }

    accountAutofillAppliedRef.current = true;
  }, [accountPrefill, driverState]);

  // If the agreement fits without scrolling, do not trap the user behind an
  // onScroll event that can never fire.
  useEffect(() => {
    if (activeStep !== 'agreement') return;
    if (verificationAgreement) {
      setAgreementScrolledToBottom(true);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const element = agreementContentRef.current;
      if (!element) return;
      if (element.scrollHeight <= element.clientHeight + 20) {
        setAgreementScrolledToBottom(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeStep, verificationAgreement]);

  const handleDriverStateChange = useCallback(
    (nextState: string) => {
      if (nextState === driverState) {
        setDriverState(nextState);
        return;
      }

      setDriverState(nextState);

      // State alone cannot identify the exact postal ZIP. Use a representative
      // default ZIP as an editable starting point whenever the driver
      // explicitly changes the selected State.
      const defaultZip = getDefaultZipForState(nextState);
      if (defaultZip) {
        setDriverZip(defaultZip);
      }
    },
    [driverState],
  );

  const handleSavePersonalInfo = async () => {
    if (!personalInfoComplete) {
      toast.error(
        `Complete the required fields: ${missingPersonalRequirements
          .map((item) => item.label)
          .join(', ')}`,
      );
      return;
    }

    setSavingPersonal(true);
    try {
      const token = await getToken();
      const response = await apiClient.patch(
        '/api/driver-profile/personal-info',
        {
          firstName: driverFirstName.trim(),
          lastName: driverLastName.trim(),
          phone: driverPhone.trim() || undefined,
          address: driverAddress.trim() || undefined,
          city: driverCity.trim() || undefined,
          state: driverState || undefined,
          zipCode: driverZip.trim() || undefined,
          vehicleMake: vehicleMake.trim() || undefined,
          vehicleModel: vehicleModel.trim() || undefined,
          vehicleYear: vehicleYear ? Number.parseInt(vehicleYear, 10) : undefined,
          vehicleVin: vehicleVin.trim().toUpperCase(),
          vehicleLicensePlate:
            vehicleLicensePlate.trim().toUpperCase() || undefined,
          driversLicenseNumber: licenseNumber.trim(),
          licenseState,
          licenseExpirationDate: licenseExp,
          medicalCardExpirationDate: medicalExp || undefined,
          insuranceExpirationDate: insuranceExp || undefined,
          insuranceProvider: insuranceProvider.trim(),
          insurancePolicyNumber: insurancePolicyNumber.trim(),
          ssnLast4: ssnLast4.replace(/\D/g, ''),
          backgroundCheckConsent: bgCheckConsent,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const data = response.data?.data as DriverProfile | undefined;
      if (data) hydrateProfile(data);
      toast.success('Driver verification information saved');
      setActiveStep('agreement');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to save Driver Verification information',
      );
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (uploadedCount < requiredDocs.length) {
      toast.error('Upload all required documents before submitting');
      return;
    }
    if (!personalInfoComplete) {
      toast.error(
        `Return to Information and complete: ${missingPersonalRequirements
          .map((item) => item.label)
          .join(', ')}`,
      );
      return;
    }
    if (!verificationAgreement) {
      toast.error('Accept the Verification Agreement before submitting');
      return;
    }

    setSavingIdentity(true);
    try {
      const token = await getToken();
      const response = await apiClient.patch(
        '/api/driver-profile/identity-verification',
        {
          ssnLast4: ssnLast4.replace(/\D/g, ''),
          backgroundCheckConsent: bgCheckConsent,
          verificationAgreement: true,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = response.data?.data as DriverProfile | undefined;
      if (data) hydrateProfile(data);
      toast.success(
        data?.verificationStatus === 'verified'
          ? 'Driver Verification completed'
          : 'Driver Verification submitted for admin review',
      );
      setActiveStep('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to submit Driver Verification',
      );
    } finally {
      setSavingIdentity(false);
    }
  };

  const closeDocumentViewer = useCallback(() => {
    if (viewingObjectUrl) {
      URL.revokeObjectURL(viewingObjectUrl);
    }
    setViewingObjectUrl('');
    setViewingMimeType('');
    setViewingError('');
    setViewingLoading(false);
    setViewingDoc(null);
  }, [viewingObjectUrl]);

  const openDocumentViewer = useCallback(
    async (doc: ComplianceDocument) => {
      if (viewingObjectUrl) {
        URL.revokeObjectURL(viewingObjectUrl);
      }

      setViewingDoc(doc);
      setViewingObjectUrl('');
      setViewingMimeType(doc.mimeType || '');
      setViewingError('');
      setViewingLoading(true);

      try {
        const token = await getToken();
        const response = await apiClient.get(
          `/api/driver-profile/documents/${doc._id}/file`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
          },
        );

        const contentType =
          String(response.headers?.['content-type'] || '').split(';')[0] ||
          doc.mimeType ||
          'application/octet-stream';

        const blob =
          response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: contentType });

        setViewingMimeType(contentType);
        setViewingObjectUrl(URL.createObjectURL(blob));
      } catch (error: any) {
        setViewingError(
          error?.response?.data?.message ||
            'This document could not be opened. You can replace or delete it.',
        );
      } finally {
        setViewingLoading(false);
      }
    },
    [getToken, viewingObjectUrl],
  );

  useEffect(
    () => () => {
      if (viewingObjectUrl) URL.revokeObjectURL(viewingObjectUrl);
    },
    [viewingObjectUrl],
  );

  const openReplaceFor = useCallback((doc: ComplianceDocument) => {
    setReplaceTarget(doc);
    setUploadType(doc.type);
    setUploadLabel(doc.label || doc.fileName || '');
    setUploadExpiry(toDateInputValue(doc.expiresAt));
    setUploadFile(null);
    setDragOver(false);
    setShowUploadDialog(true);
  }, []);

  const getInformationExpirationForDocument = useCallback(
    (type: string) => {
      if (type === 'drivers_license') return licenseExp;
      if (type === 'medical_card') return medicalExp;
      if (type === 'insurance_certificate') return insuranceExp;
      return '';
    },
    [insuranceExp, licenseExp, medicalExp],
  );

  const openUploadFor = (type: string) => {
    setReplaceTarget(null);
    setUploadType(type);
    setUploadLabel(
      REQUIRED_DOCUMENTS.find((item) => item.type === type)?.label || '',
    );

    // Information -> Documents reuse:
    // if the matching Information expiration is already known, reuse it in
    // the upload dialog so the driver does not type the same date twice.
    setUploadExpiry(getInformationExpirationForDocument(type));
    setUploadFile(null);
    setDragOver(false);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadLabel.trim()) {
      toast.error('Please select a file and provide a label');
      return;
    }
    if (uploadFile.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }

    const uploadRequiresExpiry = DOCUMENT_EXPIRY_TYPES.has(uploadType);
    if (uploadRequiresExpiry && !uploadExpiry) {
      toast.error('Expiration date is required for this document');
      return;
    }

    const existingInformationExpiration =
      getInformationExpirationForDocument(uploadType);

    setUploading(true);
    try {
      const token = await getToken();
      const body = new FormData();
      body.append('document', uploadFile);
      body.append('type', uploadType);
      body.append('label', uploadLabel.trim());
      if (uploadExpiry) body.append('expiresAt', uploadExpiry);

      const uploadEndpoint = replaceTarget
        ? `/api/driver-profile/documents/${replaceTarget._id}/replace`
        : '/api/driver-profile/documents';

      const response = await apiClient.post(
        uploadEndpoint,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const updated = response.data?.data as DriverProfile | undefined;

      // IMPORTANT: do not call fetchProfile() here.
      //
      // fetchProfile() resolves the "best resume step", which used to force the
      // driver from Documents into Agreement immediately after an upload. A
      // document mutation should update document/profile data only and preserve
      // the step the driver intentionally has open.
      if (updated) {
        setProfile(updated);
        setVerificationStatus(
          (updated.verificationStatus || verificationStatus) as VerificationStatus,
        );

        // Documents -> Information reuse. Only fill an empty local field.
        // Existing Information values are never silently overwritten.
        if (uploadExpiry) {
          if (uploadType === 'drivers_license' && !licenseExp) {
            setLicenseExp(uploadExpiry);
          } else if (uploadType === 'medical_card' && !medicalExp) {
            setMedicalExp(uploadExpiry);
          } else if (
            uploadType === 'insurance_certificate' &&
            !insuranceExp
          ) {
            setInsuranceExp(uploadExpiry);
          }
        }
      }

      toast.success(
        replaceTarget
          ? 'Document replaced — pending review'
          : 'Document uploaded — pending review',
      );

      if (
        uploadExpiry &&
        existingInformationExpiration &&
        existingInformationExpiration !== uploadExpiry
      ) {
        toast.warning(
          `The uploaded document expires ${uploadExpiry}, while Information currently shows ${existingInformationExpiration}. The existing Information value was kept — review it before Save & Next.`,
        );
      }

      setShowUploadDialog(false);
      setReplaceTarget(null);
      // Deliberately preserve activeStep so the driver can continue uploading
      // optional/supporting documents without being forced into Agreement.
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const token = await getToken();
      const response = await apiClient.delete(
        `/api/driver-profile/documents/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const updated = response.data?.data as DriverProfile | undefined;
      if (updated) {
        setProfile(updated);
        setVerificationStatus(
          (updated.verificationStatus || verificationStatus) as VerificationStatus,
        );
      }

      toast.success('Document removed');
      setShowDeleteConfirm(null);
      // Preserve the current step after document deletion as well.
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Securing Connection
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl">
          <div className="p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/driver/profile"
                  className="rounded-xl border border-border/70 p-2.5 hover:bg-muted"
                >
                  <ArrowLeft className="size-4" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black sm:text-3xl">
                      Driver Verification
                    </h1>
                    <Badge className="hidden gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 sm:flex">
                      <Lock className="size-3" /> Encrypted
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    FMCSA-compliant driver onboarding
                  </p>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-4xl font-black">{overallPct}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Complete
                </p>
              </div>
            </div>

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                animate={{ width: `${overallPct}%` }}
              />
            </div>

            <div className="flex items-center gap-1">
              {STEPS.map((step, index) => {
                const status = stepStatus[step.id];
                const Icon = step.icon;
                const active = activeStep === step.id;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          'flex size-11 items-center justify-center rounded-xl border-2',
                          active
                            ? 'border-primary bg-primary/10'
                            : status === 'done'
                              ? 'border-emerald-500/40 bg-emerald-500/10'
                              : status === 'partial'
                                ? 'border-amber-500/40 bg-amber-500/10'
                                : 'border-border/70',
                        )}
                      >
                        {status === 'done' ? (
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        ) : (
                          <Icon className="size-5" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold">{step.label}</span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className="h-0.5 flex-1 bg-border/60" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {verificationStatus === 'verified' && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-center gap-4 p-5">
              <Sparkles className="size-7 text-emerald-500" />
              <div>
                <h2 className="font-black text-emerald-600">
                  Profile Approved & Verified
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your Driver Verification is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
          >
            {activeStep === 'documents' && (
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  <FileCheck className="size-8 text-emerald-500" />
                  <div>
                    <h2 className="text-2xl font-black">Required Documents</h2>
                    <p className="text-sm text-muted-foreground">
                      {uploadedCount} of {requiredDocs.length} uploaded •{' '}
                      {verifiedCount} verified
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {requiredDocs.map((item) => {
                    const status = getDocStatus(item.type);
                    const Icon = DOC_ICONS[item.type] || FileText;
                    const matching = documents.filter((doc) => doc.type === item.type);
                    return (
                      <div
                        key={item.type}
                        className="overflow-hidden rounded-2xl border border-border/70"
                      >
                        <div className="flex items-start gap-4 p-4">
                          <Icon className="mt-1 size-6 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold">{item.label}</h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  status === 'verified' && 'border-emerald-500/30 text-emerald-600',
                                  status === 'pending' && 'border-amber-500/30 text-amber-600',
                                  status === 'rejected' && 'border-red-500/30 text-red-600',
                                )}
                              >
                                {status === 'missing'
                                  ? 'REQUIRED'
                                  : status === 'verified'
                                    ? 'VERIFIED'
                                    : status === 'rejected'
                                      ? 'REJECTED'
                                      : 'UNDER REVIEW'}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openUploadFor(item.type)}
                            disabled={documents.length >= 20}
                          >
                            <Upload className="mr-1.5 size-4" />
                            {status === 'missing' ? 'Upload' : 'Upload New'}
                          </Button>
                        </div>

                        {matching.length > 0 && (
                          <div className="space-y-2 border-t border-border/60 bg-muted/20 p-4">
                            {matching.map((doc) => {
                              const exp = expirationStatus(doc.expiresAt);
                              return (
                                <div key={doc._id} className="flex items-center gap-3">
                                  <FileText className="size-4 text-muted-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold">
                                      {doc.label || doc.fileName}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                      <span>{formatSize(doc.fileSize)}</span>
                                      {doc.uploadedAt && (
                                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                                      )}
                                      {exp && (
                                        <span className={exp.className}>{exp.label}</span>
                                      )}
                                    </div>
                                    {doc.reviewStatus === 'rejected' &&
                                      doc.rejectionReason && (
                                        <div className="mt-2 flex gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-[10px] text-red-600">
                                          <FileWarning className="size-3 shrink-0" />
                                          {doc.rejectionReason}
                                        </div>
                                      )}
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="View document"
                                    onClick={() => void openDocumentViewer(doc)}
                                  >
                                    <Eye className="size-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Replace document"
                                    onClick={() => openReplaceFor(doc)}
                                  >
                                    <RotateCcw className="size-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Delete document"
                                    className="text-destructive"
                                    onClick={() => setShowDeleteConfirm(doc._id)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {optionalDocs.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Optional Documents
                    </p>

                    {optionalDocs.map((item) => {
                      const matching = documents.filter(
                        (doc) => doc.type === item.type,
                      );
                      const Icon = DOC_ICONS[item.type] || FileText;

                      return (
                        <div
                          key={item.type}
                          className="overflow-hidden rounded-xl border border-border/70"
                        >
                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm font-bold">{item.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUploadFor(item.type)}
                              disabled={documents.length >= 20}
                            >
                              <Upload className="mr-1.5 size-4" />
                              {matching.length ? 'Upload New' : 'Upload'}
                            </Button>
                          </div>

                          {matching.length > 0 && (
                            <div className="space-y-2 border-t border-border/60 bg-muted/20 p-3">
                              {matching.map((doc) => {
                                const exp = expirationStatus(doc.expiresAt);

                                return (
                                  <div
                                    key={doc._id}
                                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 p-2.5"
                                  >
                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-semibold">
                                        {doc.label || doc.fileName}
                                      </p>
                                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                        <span>{formatSize(doc.fileSize)}</span>
                                        {doc.uploadedAt && (
                                          <span>
                                            Uploaded {formatDate(doc.uploadedAt)}
                                          </span>
                                        )}
                                        {exp && (
                                          <span className={exp.className}>
                                            {exp.label}
                                          </span>
                                        )}
                                        <span>
                                          {doc.reviewStatus === 'rejected'
                                            ? 'Rejected'
                                            : doc.verified
                                              ? 'Verified'
                                              : 'Pending review'}
                                        </span>
                                      </div>
                                      {doc.reviewStatus === 'rejected' &&
                                        doc.rejectionReason && (
                                          <div className="mt-2 flex gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-[10px] text-red-600">
                                            <FileWarning className="size-3 shrink-0" />
                                            {doc.rejectionReason}
                                          </div>
                                        )}
                                    </div>

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="View document"
                                      onClick={() => void openDocumentViewer(doc)}
                                    >
                                      <Eye className="size-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Replace document"
                                      onClick={() => openReplaceFor(doc)}
                                    >
                                      <RotateCcw className="size-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Delete document"
                                      className="text-destructive"
                                      onClick={() => setShowDeleteConfirm(doc._id)}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 flex justify-end border-t border-border/60 pt-5">
                  <Button
                    onClick={() => setActiveStep('personal')}
                    disabled={uploadedCount < requiredDocs.length}
                  >
                    Next: Information <ChevronRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 'personal' && (
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  <UserCheck className="size-8 text-blue-500" />
                  <div>
                    <h2 className="text-2xl font-black">Your Information</h2>
                    <p className="text-sm text-muted-foreground">
                      Complete all required identity, license, insurance, and vehicle fields.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <section className="space-y-4 rounded-2xl border border-border/70 p-5">
                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-muted-foreground">
                        Driver Details
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Empty Name and Phone fields are autofilled from your saved Profile. City and State are autofilled only when Profile Location is a valid U.S. "City, State" value. All autofilled values remain editable and are saved only when you choose Save & Next.
                      </p>
                      {profileAutofillConflicts.length > 0 && (
                        <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                          Your saved Driver Verification currently differs from Profile for: {profileAutofillConflicts.join(', ')}. The existing verification values were kept. Use the field-level Profile action below whenever you want to replace a specific value.
                        </div>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>First Name *</Label>
                        <Input value={driverFirstName} onChange={(e) => setDriverFirstName(e.target.value)} />
                        {accountPrefill?.firstName &&
                          profileAutofillConflicts.includes('First Name') && (
                            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                              Profile First Name: {accountPrefill.firstName}.{' '}
                              <button
                                type="button"
                                onClick={() => setDriverFirstName(accountPrefill.firstName)}
                                className="font-bold underline underline-offset-2"
                              >
                                Use Profile value
                              </button>
                            </div>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name *</Label>
                        <Input value={driverLastName} onChange={(e) => setDriverLastName(e.target.value)} />
                        {accountPrefill?.lastName &&
                          profileAutofillConflicts.includes('Last Name') && (
                            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                              Profile Last Name: {accountPrefill.lastName}.{' '}
                              <button
                                type="button"
                                onClick={() => setDriverLastName(accountPrefill.lastName)}
                                className="font-bold underline underline-offset-2"
                              >
                                Use Profile value
                              </button>
                            </div>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
                        {accountPrefill?.phone &&
                          profileAutofillConflicts.includes('Phone') && (
                            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                              Profile Phone: {accountPrefill.phone}.{' '}
                              <button
                                type="button"
                                onClick={() => setDriverPhone(accountPrefill.phone)}
                                className="font-bold underline underline-offset-2"
                              >
                                Use Profile value
                              </button>
                            </div>
                          )}
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Empty matching fields are filled from information you already provided in Profile or Equipment. Saved Driver Verification values always take priority, and autofilled values are not persisted until you choose Save & Next.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={driverCity} onChange={(e) => setDriverCity(e.target.value)} />
                        {accountPrefill?.city &&
                          profileAutofillConflicts.includes('City') && (
                            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                              Profile City: {accountPrefill.city}.{' '}
                              <button
                                type="button"
                                onClick={() => setDriverCity(accountPrefill.city)}
                                className="font-bold underline underline-offset-2"
                              >
                                Use Profile value
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input value={driverAddress} onChange={(e) => setDriverAddress(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Select value={driverState} onValueChange={handleDriverStateChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {accountPrefill?.state &&
                          profileAutofillConflicts.includes('State') && (
                            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                              Profile State: {accountPrefill.state}.{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setDriverState(accountPrefill.state);
                                  const defaultZip = getDefaultZipForState(
                                    accountPrefill.state,
                                  );
                                  if (defaultZip) {
                                    setDriverZip(defaultZip);
                                  }
                                }}
                                className="font-bold underline underline-offset-2"
                              >
                                Use Profile value
                              </button>
                            </div>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label>ZIP Code</Label>
                        <Input
                          value={driverZip}
                          inputMode="numeric"
                          maxLength={10}
                          onChange={(e) =>
                            setDriverZip(
                              e.target.value
                                .replace(/[^0-9-]/g, '')
                                .slice(0, 10),
                            )
                          }
                        />
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Selecting a State provides a representative default ZIP. You can edit it to the driver's exact ZIP before Save & Next.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-border/70 p-5">
                    <h3 className="font-bold uppercase tracking-wider text-muted-foreground">
                      License & Insurance
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>CDL Number *</Label>
                        <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>License State *</Label>
                        <Select value={licenseState} onValueChange={setLicenseState}>
                          <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CDL Expiration *</Label>
                        <Input type="date" value={licenseExp} onChange={(e) => setLicenseExp(e.target.value)} />
                        {licenseExpirationConflict && (
                          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                            Uploaded CDL expiration: {uploadedLicenseExpiration}. Information currently shows {licenseExp}.{' '}
                            <button
                              type="button"
                              onClick={() => setLicenseExp(uploadedLicenseExpiration)}
                              className="font-bold underline underline-offset-2"
                            >
                              Use uploaded date
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Medical Card Expires</Label>
                        <Input type="date" value={medicalExp} onChange={(e) => setMedicalExp(e.target.value)} />
                        {medicalExpirationConflict && (
                          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                            Uploaded Medical Card expiration: {uploadedMedicalExpiration}. Information currently shows {medicalExp}.{' '}
                            <button
                              type="button"
                              onClick={() => setMedicalExp(uploadedMedicalExpiration)}
                              className="font-bold underline underline-offset-2"
                            >
                              Use uploaded date
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance Provider *</Label>
                        <Input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Policy Number *</Label>
                        <Input value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance Expires</Label>
                        <Input type="date" value={insuranceExp} onChange={(e) => setInsuranceExp(e.target.value)} />
                        {insuranceExpirationConflict && (
                          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                            Uploaded Insurance Certificate expiration: {uploadedInsuranceExpiration}. Information currently shows {insuranceExp}.{' '}
                            <button
                              type="button"
                              onClick={() => setInsuranceExp(uploadedInsuranceExpiration)}
                              className="font-bold underline underline-offset-2"
                            >
                              Use uploaded date
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-border/70 p-5">
                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-muted-foreground">
                        Vehicle Information
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Make, model, year, VIN, and license plate automatically reuse your saved Equipment information when available.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Make</Label>
                        <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input
                          inputMode="numeric"
                          value={vehicleYear}
                          onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>VIN *</Label>
                        <Input
                          maxLength={17}
                          value={vehicleVin}
                          onChange={(e) => setVehicleVin(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>License Plate</Label>
                        <Input
                          value={vehicleLicensePlate}
                          onChange={(e) => setVehicleLicensePlate(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-border/70 p-5">
                    <h3 className="font-bold uppercase tracking-wider text-muted-foreground">
                      Security & Identity
                    </h3>
                    <div className="space-y-2">
                      <Label>SSN Last 4 *</Label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        value={ssnLast4}
                        onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="max-w-xs font-mono tracking-[0.3em]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used only for identity and background verification.
                      </p>
                    </div>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4',
                        bgCheckConsent
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-border/60',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={bgCheckConsent}
                        onChange={(e) => setBgCheckConsent(e.target.checked)}
                        className="mt-1 size-5 accent-emerald-600"
                      />
                      <div>
                        <p className="font-bold">Background Check Authorization *</p>
                        <p className="text-xs text-muted-foreground">
                          I authorize {organization?.name || 'Your Dealership'} to conduct permitted background checks in accordance with applicable law.
                        </p>
                      </div>
                    </label>
                  </section>

                  {missingPersonalRequirements.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                      <strong>Still required:</strong>{' '}
                      {missingPersonalRequirements.map((item) => item.label).join(', ')}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border/60 pt-5">
                    <Button variant="ghost" onClick={() => setActiveStep('documents')}>
                      <ArrowLeft className="mr-1.5 size-4" /> Back
                    </Button>
                    <Button onClick={handleSavePersonalInfo} disabled={savingPersonal}>
                      {savingPersonal ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 size-4" />
                      )}
                      Save & Next <ChevronRight className="ml-1.5 size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'agreement' && (
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  <Scale className="size-8 text-amber-500" />
                  <div>
                    <h2 className="text-2xl font-black">Verification Agreement</h2>
                    <p className="text-sm text-muted-foreground">
                      Review the agreement before submitting your Driver Verification.
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <AlertTriangle className="size-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-bold text-amber-700 dark:text-amber-400">
                      Read the entire agreement before accepting
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                      Scroll to the bottom to enable acceptance.
                    </p>
                  </div>
                </div>

                <div
                  ref={agreementContentRef}
                  onScroll={(event) => {
                    const element = event.currentTarget;
                    const atBottom =
                      Math.abs(
                        element.scrollHeight - element.scrollTop - element.clientHeight,
                      ) < 20;
                    if (atBottom) setAgreementScrolledToBottom(true);
                  }}
                  className="mb-5 max-h-[50vh] space-y-5 overflow-y-auto rounded-2xl border border-border/70 p-5 text-sm leading-relaxed text-muted-foreground"
                >
                  <h3 className="text-lg font-black text-foreground">Driver Services Agreement</h3>
                  <p>
                    1. The driver confirms that the information and credentials submitted through the platform are accurate, current, and authentic.
                  </p>
                  <p>
                    2. The driver agrees to maintain required licenses, insurance, medical certifications, and other transportation credentials applicable to the work performed.
                  </p>
                  <p>
                    3. The driver authorizes verification of submitted credentials with appropriate issuing authorities where permitted.
                  </p>
                  <p>
                    4. The driver agrees to comply with applicable federal, state, and local transportation and safety requirements.
                  </p>
                  <p>
                    5. The driver authorizes permitted background and driving-record checks in accordance with applicable law and the Fair Credit Reporting Act.
                  </p>
                  <p>
                    6. Sensitive information submitted for verification may be used for compliance, onboarding, dispatch, payment, and safety purposes subject to applicable privacy and security controls.
                  </p>
                  <p>
                    7. By accepting below, the driver confirms that they have reviewed this agreement and intend their electronic acceptance to serve as a binding acknowledgment where permitted by law.
                  </p>
                  <p className="text-xs italic text-muted-foreground/60">Last updated January 15, 2025</p>
                </div>

                <label
                  className={cn(
                    'flex items-start gap-3 rounded-xl border-2 p-4',
                    personalInfoComplete && uploadedCount === requiredDocs.length
                      ? 'cursor-pointer border-primary/40 bg-primary/5'
                      : 'cursor-not-allowed border-border/60 opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={verificationAgreement}
                    disabled={
                      !agreementScrolledToBottom ||
                      !personalInfoComplete ||
                      uploadedCount < requiredDocs.length
                    }
                    onChange={(e) => setVerificationAgreement(e.target.checked)}
                    className="mt-1 size-5 accent-emerald-600"
                  />
                  <div>
                    <p className="font-bold">I accept the Verification Agreement *</p>
                    <p className="text-xs text-muted-foreground">
                      {uploadedCount < requiredDocs.length
                        ? `Upload all ${requiredDocs.length} required document${requiredDocs.length === 1 ? '' : 's'} first.`
                        : !personalInfoComplete
                          ? `Complete the Information section first: ${missingPersonalRequirements.map((item) => item.label).join(', ')}`
                          : !agreementScrolledToBottom
                            ? 'Please scroll to the bottom of the agreement to enable acceptance.'
                            : 'You can now accept and submit for review.'}
                    </p>
                  </div>
                </label>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-5">
                  <Button variant="ghost" onClick={() => setActiveStep('personal')}>
                    <ArrowLeft className="mr-1.5 size-4" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={
                      savingIdentity ||
                      !verificationAgreement ||
                      !personalInfoComplete ||
                      uploadedCount < requiredDocs.length
                    }
                  >
                    {savingIdentity ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-1.5 size-4" />
                    )}
                    Submit for Admin Review
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 'review' && (
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  {verificationStatus === 'verified' ? (
                    <BadgeCheck className="size-8 text-emerald-500" />
                  ) : verificationStatus === 'under_review' ? (
                    <Clock className="size-8 text-amber-500" />
                  ) : (
                    <ShieldAlert className="size-8 text-muted-foreground" />
                  )}
                  <div>
                    <h2 className="text-2xl font-black">
                      {verificationStatus === 'verified'
                        ? 'Driver Verified ✓'
                        : verificationStatus === 'under_review'
                          ? 'Verification Under Review'
                          : 'Review Your Submission'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {verificationStatus === 'verified'
                        ? 'Your Driver Verification and final approval are complete.'
                        : verificationStatus === 'under_review'
                          ? 'Your Documents, Information and Agreement were submitted successfully. Review stages below update as the admin completes them.'
                          : 'Complete the previous steps before submitting for admin review.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: 'Submitted',
                      description: 'Documents, Information and Agreement received',
                      done: verificationStatus === 'under_review' || verificationStatus === 'verified',
                      pending: false,
                    },
                    {
                      label: 'Document Review',
                      description:
                        verifiedCount === requiredDocs.length
                          ? 'Required documents approved'
                          : `${Math.max(requiredDocs.length - verifiedCount, 0)} required document${Math.max(requiredDocs.length - verifiedCount, 0) === 1 ? '' : 's'} awaiting approval`,
                      done: verifiedCount === requiredDocs.length,
                      pending: verificationStatus === 'under_review' && verifiedCount !== requiredDocs.length,
                    },
                    {
                      label: 'Verification Review',
                      description:
                        verificationStatus === 'verified'
                          ? 'Verification review complete'
                          : 'Waiting for authorized reviewer',
                      done: verificationStatus === 'verified',
                      pending: verificationStatus === 'under_review',
                    },
                    {
                      label: 'Final Approval',
                      description:
                        verificationStatus === 'verified'
                          ? 'Driver verified'
                          : 'Pending backend eligibility and final reviewer approval',
                      done: verificationStatus === 'verified',
                      pending: verificationStatus === 'under_review',
                    },
                  ].map((stage) => (
                    <div
                      key={stage.label}
                      className={cn(
                        'flex items-start gap-4 rounded-2xl border p-4',
                        stage.done
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : stage.pending
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-border/70 bg-muted/[0.08]',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border',
                          stage.done
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                            : stage.pending
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                              : 'border-border/70 bg-muted text-muted-foreground',
                        )}
                      >
                        {stage.done ? (
                          <CheckCircle2 className="size-5" />
                        ) : stage.pending ? (
                          <Clock className="size-5" />
                        ) : (
                          <span className="size-2 rounded-full border border-current" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black">{stage.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
                  <Button variant="ghost" onClick={() => setActiveStep('agreement')}>
                    <ArrowLeft className="mr-1.5 size-4" /> Back
                  </Button>
                  {verificationStatus === 'verified' && (
                    <Button asChild>
                      <Link href="/driver/available-loads">
                        Browse Available Loads <ChevronRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Dialog
        open={showUploadDialog}
        onOpenChange={(open) => {
          setShowUploadDialog(open);
          if (!open) {
            setReplaceTarget(null);
            setUploadFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {replaceTarget ? 'Replace Document' : 'Upload Document'}
            </DialogTitle>
            <DialogDescription>
              {replaceTarget
                ? 'The existing file remains available until the replacement is safely saved. JPG, PNG, WebP, or PDF; maximum 5MB.'
                : 'JPG, PNG, WebP, or PDF. Maximum file size 5MB.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={uploadType}
                onValueChange={setUploadType}
                disabled={Boolean(replaceTarget)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label / Description</Label>
              <Input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>
                Expiration Date
                {DOCUMENT_EXPIRY_TYPES.has(uploadType) ? ' *' : ''}
              </Label>
              <Input
                type="date"
                value={uploadExpiry}
                onChange={(e) => setUploadExpiry(e.target.value)}
              />
              {getInformationExpirationForDocument(uploadType) && (
                <p className="text-[11px] text-muted-foreground">
                  Reused from Information. You can edit it for this uploaded document before upload.
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center',
                dragOver ? 'border-primary bg-primary/5' : 'border-border/70',
              )}
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="size-5" />
                  <span className="max-w-[240px] truncate text-sm font-bold">
                    {uploadFile.name}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadFile(null);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Camera className="mx-auto mb-2 size-8 text-muted-foreground" />
                  <p className="font-bold">Drop file here or click to browse</p>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setReplaceTarget(null);
                setUploadFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                uploading ||
                !uploadFile ||
                !uploadLabel.trim() ||
                (DOCUMENT_EXPIRY_TYPES.has(uploadType) && !uploadExpiry)
              }
            >
              {uploading ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-4" />
              )}
              {replaceTarget ? 'Replace Document' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(showDeleteConfirm)}
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              This permanently removes the selected verification document.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && void handleDelete(showDeleteConfirm)}
              disabled={deletingId === showDeleteConfirm}
            >
              {deletingId === showDeleteConfirm ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 size-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewingDoc)}
        onOpenChange={(open) => {
          if (!open) closeDocumentViewer();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>View Document</DialogTitle>
            <DialogDescription>
              {viewingDoc?.fileName || viewingDoc?.label}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[280px] flex-1 overflow-auto rounded-xl border border-border/70 p-3">
            {viewingLoading ? (
              <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Opening secure document…
              </div>
            ) : viewingError ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                <FileWarning className="size-8 text-amber-500" />
                <div>
                  <p className="font-bold">Document preview unavailable</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {viewingError}
                  </p>
                </div>
                {viewingDoc && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const doc = viewingDoc;
                      closeDocumentViewer();
                      openReplaceFor(doc);
                    }}
                  >
                    <RotateCcw className="mr-1.5 size-4" />
                    Replace File
                  </Button>
                )}
              </div>
            ) : viewingObjectUrl ? (
              viewingMimeType === 'application/pdf' ||
              viewingDoc?.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${viewingObjectUrl}#toolbar=1`}
                  title={viewingDoc?.fileName || viewingDoc?.label || 'Driver document'}
                  className="min-h-[560px] w-full rounded-lg"
                />
              ) : viewingMimeType.startsWith('image/') ? (
                <img
                  src={viewingObjectUrl}
                  alt={viewingDoc?.fileName || viewingDoc?.label || 'Driver document'}
                  className="mx-auto max-h-[70vh] max-w-full object-contain"
                />
              ) : (
                <div className="flex min-h-[280px] items-center justify-center">
                  <a
                    href={viewingObjectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-primary underline underline-offset-4"
                  >
                    Open file
                  </a>
                </div>
              )
            ) : null}
          </div>

          {viewingDoc && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  const doc = viewingDoc;
                  closeDocumentViewer();
                  openReplaceFor(doc);
                }}
              >
                <RotateCcw className="mr-1.5 size-4" />
                Replace
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const docId = viewingDoc._id;
                  closeDocumentViewer();
                  setShowDeleteConfirm(docId);
                }}
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};