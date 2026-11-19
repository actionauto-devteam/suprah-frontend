'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, User, Car, Calculator, ClipboardList, FileStack, Send, Eye, EyeOff, Lock, CircleAlert, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, Select, Checkbox, Switch, PageHeader, Kicker, Skeleton, ErrorBanner } from './ui';
import { DocumentsPanel } from './DocumentsPanel';
import { dealDeskApi, type DealPayload } from '@/lib/deal-desk/api';
import { useBootstrap, toast } from '@/lib/deal-desk/hooks';
import { estimate, money, toNum, cn } from '@/lib/deal-desk/format';
import type { DealDetail } from '@/lib/deal-desk/types';

type FormState = {
  customer: { firstName: string; lastName: string; email: string; phone: string; dob: string; street: string; city: string; state: string; zip: string };
  coBuyer: { present: boolean; firstName: string; lastName: string; grossMonthlyIncome: string };
  vehicle: { vin: string; stockNumber: string; year: string; make: string; model: string; trim: string; mileage: string; condition: string; price: string; bookValue: string; bookSource: string };
  tradeIn: { present: boolean; vin: string; year: string; make: string; model: string; mileage: string; allowance: string; payoff: string; lienholder: string };
  fourSquare: { salePrice: string; docFee: string; otherFees: string; taxRate: string; downPayment: string; backendProducts: string; desiredPayment: string; desiredTerm: string };
  creditApp: { employer: string; jobTitle: string; employmentMonths: string; grossMonthlyIncome: string; otherMonthlyIncome: string; housingStatus: string; housingPayment: string; residenceMonths: string; monthlyDebt: string; creditScore: string; creditScoreSource: string; ssn: string; consentGranted: boolean };
};

const s = (v: unknown) => (v == null ? '' : String(v));

function fromDeal(d?: DealDetail | null, defaults?: { taxRate?: number; docFee?: number }): FormState {
  return {
    customer: {
      firstName: s(d?.customer.firstName),
      lastName: s(d?.customer.lastName),
      email: s(d?.customer.email),
      phone: s(d?.customer.phone),
      dob: d?.customer.dob ? d.customer.dob.slice(0, 10) : '',
      street: s(d?.customer.address?.street),
      city: s(d?.customer.address?.city),
      state: s(d?.customer.address?.state),
      zip: s(d?.customer.address?.zip),
    },
    coBuyer: { present: !!d?.coBuyer.present, firstName: s(d?.coBuyer.firstName), lastName: s(d?.coBuyer.lastName), grossMonthlyIncome: s(d?.coBuyer.grossMonthlyIncome) },
    vehicle: {
      vin: s(d?.vehicle.vin),
      stockNumber: s(d?.vehicle.stockNumber),
      year: s(d?.vehicle.year),
      make: s(d?.vehicle.make),
      model: s(d?.vehicle.model),
      trim: s(d?.vehicle.trim),
      mileage: s(d?.vehicle.mileage),
      condition: s(d?.vehicle.condition || 'used'),
      price: s(d?.vehicle.price),
      bookValue: s(d?.vehicle.bookValue),
      bookSource: s(d?.vehicle.bookSource),
    },
    tradeIn: {
      present: !!d?.tradeIn.present,
      vin: s(d?.tradeIn.vin),
      year: s(d?.tradeIn.year),
      make: s(d?.tradeIn.make),
      model: s(d?.tradeIn.model),
      mileage: s(d?.tradeIn.mileage),
      allowance: s(d?.tradeIn.allowance),
      payoff: s(d?.tradeIn.payoff),
      lienholder: s(d?.tradeIn.lienholder),
    },
    fourSquare: {
      salePrice: s(d?.fourSquare.salePrice),
      docFee: s(d?.fourSquare.docFee ?? defaults?.docFee),
      otherFees: s(d?.fourSquare.otherFees),
      taxRate: s(d?.fourSquare.taxRate ?? defaults?.taxRate),
      downPayment: s(d?.fourSquare.downPayment),
      backendProducts: s(d?.fourSquare.backendProducts),
      desiredPayment: s(d?.fourSquare.desiredPayment),
      desiredTerm: s(d?.fourSquare.desiredTerm || 72),
    },
    creditApp: {
      employer: s(d?.creditApp.employer),
      jobTitle: s(d?.creditApp.jobTitle),
      employmentMonths: s(d?.creditApp.employmentMonths),
      grossMonthlyIncome: s(d?.creditApp.grossMonthlyIncome),
      otherMonthlyIncome: s(d?.creditApp.otherMonthlyIncome),
      housingStatus: s(d?.creditApp.housingStatus || 'rent'),
      housingPayment: s(d?.creditApp.housingPayment),
      residenceMonths: s(d?.creditApp.residenceMonths),
      monthlyDebt: s(d?.creditApp.monthlyDebt),
      creditScore: s(d?.creditApp.creditScore),
      creditScoreSource: s(d?.creditApp.creditScoreSource || 'self_reported'),
      ssn: '',
      consentGranted: !!d?.creditApp.consent?.granted,
    },
  };
}

function toPayload(f: FormState, original?: DealDetail | null): DealPayload {
  const p: DealPayload = {
    customer: {
      firstName: f.customer.firstName,
      lastName: f.customer.lastName,
      email: f.customer.email,
      phone: f.customer.phone,
      dob: f.customer.dob || undefined,
      address: { street: f.customer.street, city: f.customer.city, state: f.customer.state, zip: f.customer.zip },
    },
    coBuyer: { present: f.coBuyer.present, firstName: f.coBuyer.firstName, lastName: f.coBuyer.lastName, grossMonthlyIncome: f.coBuyer.grossMonthlyIncome },
    vehicle: { ...f.vehicle, condition: f.vehicle.condition || undefined },
    tradeIn: f.tradeIn,
    fourSquare: f.fourSquare,
    creditApp: {
      ...f.creditApp,
      ssn: f.creditApp.ssn || undefined,
      consentGranted: f.creditApp.consentGranted === !!original?.creditApp.consent?.granted ? undefined : f.creditApp.consentGranted,
      creditScoreSource: f.creditApp.creditScore ? f.creditApp.creditScoreSource : undefined,
      housingStatus: f.creditApp.housingStatus || undefined,
    },
  };
  return p;
}

const STEPS = [
  { key: 'customer', label: 'Customer', icon: User },
  { key: 'vehicle', label: 'Vehicle & trade', icon: Car },
  { key: 'structure', label: 'Four Square', icon: Calculator },
  { key: 'credit', label: 'Credit app', icon: ClipboardList },
  { key: 'docs', label: 'Documents', icon: FileStack },
  { key: 'review', label: 'Review', icon: Send },
] as const;

function checklist(f: FormState, docs: { kind: string }[], requireDocs: boolean) {
  const kinds = new Set(docs.map((d) => d.kind));
  const items = [
    { ok: !!(f.customer.firstName && f.customer.lastName), label: 'Customer name', step: 0 },
    { ok: !!(f.customer.phone || f.customer.email), label: 'Phone or email', step: 0 },
    { ok: !!(f.vehicle.vin || (f.vehicle.year && f.vehicle.make && f.vehicle.model)), label: 'Vehicle', step: 1 },
    { ok: (toNum(f.fourSquare.salePrice) || toNum(f.vehicle.price) || 0) > 0, label: 'Sale price', step: 2 },
    { ok: (toNum(f.creditApp.grossMonthlyIncome) || 0) > 0, label: 'Monthly income', step: 3 },
    { ok: f.creditApp.consentGranted, label: 'Credit authorization', step: 3 },
  ];
  if (requireDocs) {
    items.push({ ok: kinds.has('four_square'), label: 'Four Square document', step: 4 });
    items.push({ ok: kinds.has('credit_app'), label: 'Credit application document', step: 4 });
    items.push({ ok: kinds.has('drivers_license'), label: 'Driver’s license', step: 4 });
  }
  return items;
}

export function DealForm({ dealId }: { dealId?: string }) {
  const router = useRouter();
  const { boot } = useBootstrap();
  const [deal, setDeal] = React.useState<DealDetail | null>(null);
  const [form, setForm] = React.useState<FormState | null>(dealId ? null : fromDeal(null));
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [showSsn, setShowSsn] = React.useState(false);
  const dirty = React.useRef(false);

  React.useEffect(() => {
    if (!dealId) return;
    dealDeskApi
      .getDeal(dealId)
      .then((b) => {
        setDeal(b.deal);
        setForm(fromDeal(b.deal));
      })
      .catch((e) => setLoadError(e.message));
  }, [dealId]);

  React.useEffect(() => {
    if (!dealId && boot && form && !form.fourSquare.taxRate) {
      setForm((f) => (f ? { ...f, fourSquare: { ...f.fourSquare, taxRate: String(boot.settings.defaultTaxRate), docFee: f.fourSquare.docFee || String(boot.settings.defaultDocFee) } } : f));
    }
  }, [boot, dealId, form]);

  const set = <K extends keyof FormState>(section: K, key: keyof FormState[K], value: unknown) => {
    dirty.current = true;
    setForm((f) => (f ? { ...f, [section]: { ...f[section], [key]: value } } : f));
  };

  const save = async (): Promise<DealDetail | null> => {
    if (!form) return null;
    if (!deal && !(form.customer.firstName && form.customer.lastName)) {
      toast({ title: 'Add the customer’s name first', tone: 'warn' });
      return null;
    }
    if (deal && !dirty.current) return deal;
    setSaving(true);
    try {
      const payload = toPayload(form, deal);
      const res = deal ? await dealDeskApi.updateDeal(deal.id, payload) : await dealDeskApi.createDeal(payload);
      setDeal(res.deal);
      dirty.current = false;
      setForm((f) => (f ? { ...f, creditApp: { ...f.creditApp, ssn: '' } } : f));
      if (!deal) router.replace(`/crm/deal-desk/new?edit=${res.deal.id}`, { scroll: false });
      return res.deal;
    } catch (e: any) {
      toast({ title: 'Couldn’t save', body: e.message, tone: 'error' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const go = async (to: number) => {
    if (to > step || dirty.current) {
      const saved = await save();
      if (!saved) return;
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    const saved = await save();
    if (!saved) return;
    setSubmitting(true);
    try {
      const res = await dealDeskApi.submit(saved.id);
      toast({ title: `Deal #${res.deal.dealNumber} submitted`, body: 'It’s in the queue for the online sales team.', tone: 'success' });
      router.push(`/crm/deal-desk/${res.deal.id}`);
    } catch (e: any) {
      toast({ title: 'Not ready to submit', body: e.message, tone: 'warn' }, 9000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <div className="mx-auto max-w-3xl p-6"><ErrorBanner message={loadError} /></div>;
  if (!form) return <div className="mx-auto max-w-5xl space-y-4 p-6"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>;

  const priceEntered = (toNum(form.fourSquare.salePrice) ?? toNum(form.vehicle.price) ?? 0) > 0;
  const est = estimate({
    price: toNum(form.fourSquare.salePrice) ?? toNum(form.vehicle.price),
    docFee: toNum(form.fourSquare.docFee),
    otherFees: toNum(form.fourSquare.otherFees),
    taxRate: toNum(form.fourSquare.taxRate),
    down: toNum(form.fourSquare.downPayment),
    backend: toNum(form.fourSquare.backendProducts),
    tradeAllowance: form.tradeIn.present ? toNum(form.tradeIn.allowance) : 0,
    tradePayoff: form.tradeIn.present ? toNum(form.tradeIn.payoff) : 0,
    term: toNum(form.fourSquare.desiredTerm),
    apr: 7.99,
  });
  const book = toNum(form.vehicle.bookValue);
  const items = checklist(form, deal?.documents || [], boot?.settings.requireDocsToSubmit ?? true);
  const ready = items.every((i) => i.ok);
  const editingSubmitted = deal && !['draft', 'needs_info'].includes(deal.stage);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-32 sm:px-6">
      <PageHeader
        back={
          <Link href={deal ? `/crm/deal-desk/${deal.id}` : '/crm/deal-desk'} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> {deal ? `Deal #${deal.dealNumber}` : 'Deal Queue'}
          </Link>
        }
        kicker="Supra // New Deal channel"
        title={deal ? (editingSubmitted ? `Edit deal #${deal.dealNumber}` : `Deal #${deal.dealNumber}`) : 'New deal'}
        subtitle="Everything the online sales team and the AI need. Saved as you go — you can come back to a draft any time."
        actions={
          deal && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {saving ? 'Saving…' : <><Check className="size-3.5 text-emerald-500" /> Draft saved</>}
            </span>
          )
        }
      />

      {/* stepper */}
      <div className="-mx-3 mb-5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ol className="flex min-w-max items-center gap-1 sm:gap-2">
          {STEPS.map((st, i) => {
            const Icon = st.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={st.key} className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => (i <= step || deal ? go(i) : undefined)}
                  disabled={i > step && !deal}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    active ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25' : done ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  <span>{st.label}</span>
                </button>
                {i < STEPS.length - 1 && <span className={cn('h-px w-4 sm:w-6', i < step ? 'bg-primary/50' : 'bg-border')} />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          {step === 0 && (
            <>
              <CardHeader icon={<User className="size-4" />} kicker="Step 1" title="Customer" />
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <Field label="First name" required><Input value={form.customer.firstName} onChange={(e) => set('customer', 'firstName', e.target.value)} autoComplete="off" /></Field>
                <Field label="Last name" required><Input value={form.customer.lastName} onChange={(e) => set('customer', 'lastName', e.target.value)} autoComplete="off" /></Field>
                <Field label="Mobile phone"><Input type="tel" inputMode="tel" value={form.customer.phone} onChange={(e) => set('customer', 'phone', e.target.value)} placeholder="(801) 555-0123" /></Field>
                <Field label="Email"><Input type="email" value={form.customer.email} onChange={(e) => set('customer', 'email', e.target.value)} /></Field>
                <Field label="Date of birth"><Input type="date" value={form.customer.dob} onChange={(e) => set('customer', 'dob', e.target.value)} /></Field>
                <div className="hidden sm:block" />
                <Field label="Street address" className="sm:col-span-2"><Input value={form.customer.street} onChange={(e) => set('customer', 'street', e.target.value)} /></Field>
                <div className="grid grid-cols-[1fr_5rem_6rem] gap-3 sm:col-span-2">
                  <Field label="City"><Input value={form.customer.city} onChange={(e) => set('customer', 'city', e.target.value)} /></Field>
                  <Field label="State"><Input value={form.customer.state} onChange={(e) => set('customer', 'state', e.target.value.toUpperCase().slice(0, 2))} placeholder="UT" /></Field>
                  <Field label="ZIP"><Input inputMode="numeric" value={form.customer.zip} onChange={(e) => set('customer', 'zip', e.target.value)} /></Field>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
                  <Switch checked={form.coBuyer.present} onChange={(v) => set('coBuyer', 'present', v)} label="Co-buyer" description="Add a co-buyer whose income counts toward the deal" />
                  {form.coBuyer.present && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Field label="First name"><Input value={form.coBuyer.firstName} onChange={(e) => set('coBuyer', 'firstName', e.target.value)} /></Field>
                      <Field label="Last name"><Input value={form.coBuyer.lastName} onChange={(e) => set('coBuyer', 'lastName', e.target.value)} /></Field>
                      <Field label="Gross monthly income"><Input prefix="$" inputMode="decimal" value={form.coBuyer.grossMonthlyIncome} onChange={(e) => set('coBuyer', 'grossMonthlyIncome', e.target.value)} /></Field>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <CardHeader icon={<Car className="size-4" />} kicker="Step 2" title="Vehicle and trade-in" />
              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="VIN" hint="17 characters"><Input value={form.vehicle.vin} onChange={(e) => set('vehicle', 'vin', e.target.value.toUpperCase().slice(0, 17))} className="font-mono tracking-wider" /></Field>
                  <Field label="Stock #"><Input value={form.vehicle.stockNumber} onChange={(e) => set('vehicle', 'stockNumber', e.target.value)} /></Field>
                  <div className="grid grid-cols-[6rem_1fr] gap-3 sm:col-span-2 sm:grid-cols-[6rem_1fr_1fr_1fr]">
                    <Field label="Year"><Input inputMode="numeric" value={form.vehicle.year} onChange={(e) => set('vehicle', 'year', e.target.value)} /></Field>
                    <Field label="Make"><Input value={form.vehicle.make} onChange={(e) => set('vehicle', 'make', e.target.value)} /></Field>
                    <Field label="Model"><Input value={form.vehicle.model} onChange={(e) => set('vehicle', 'model', e.target.value)} /></Field>
                    <Field label="Trim"><Input value={form.vehicle.trim} onChange={(e) => set('vehicle', 'trim', e.target.value)} /></Field>
                  </div>
                  <Field label="Mileage"><Input inputMode="numeric" value={form.vehicle.mileage} onChange={(e) => set('vehicle', 'mileage', e.target.value)} suffix="mi" /></Field>
                  <Field label="Condition">
                    <Select value={form.vehicle.condition} onChange={(e) => set('vehicle', 'condition', e.target.value)}>
                      <option value="used">Used</option>
                      <option value="cpo">Certified pre-owned</option>
                      <option value="new">New</option>
                    </Select>
                  </Field>
                  <Field label="Listed price"><Input prefix="$" inputMode="decimal" value={form.vehicle.price} onChange={(e) => set('vehicle', 'price', e.target.value)} /></Field>
                  <Field label="Book value" hint="Used for LTV"><Input prefix="$" inputMode="decimal" value={form.vehicle.bookValue} onChange={(e) => set('vehicle', 'bookValue', e.target.value)} /></Field>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <Switch checked={form.tradeIn.present} onChange={(v) => set('tradeIn', 'present', v)} label="Trade-in" description="Customer is trading in a vehicle" />
                  {form.tradeIn.present && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Trade VIN"><Input value={form.tradeIn.vin} onChange={(e) => set('tradeIn', 'vin', e.target.value.toUpperCase().slice(0, 17))} className="font-mono" /></Field>
                      <div className="grid grid-cols-[5rem_1fr_1fr] gap-3">
                        <Field label="Year"><Input inputMode="numeric" value={form.tradeIn.year} onChange={(e) => set('tradeIn', 'year', e.target.value)} /></Field>
                        <Field label="Make"><Input value={form.tradeIn.make} onChange={(e) => set('tradeIn', 'make', e.target.value)} /></Field>
                        <Field label="Model"><Input value={form.tradeIn.model} onChange={(e) => set('tradeIn', 'model', e.target.value)} /></Field>
                      </div>
                      <Field label="Mileage"><Input inputMode="numeric" value={form.tradeIn.mileage} onChange={(e) => set('tradeIn', 'mileage', e.target.value)} /></Field>
                      <Field label="Allowance"><Input prefix="$" inputMode="decimal" value={form.tradeIn.allowance} onChange={(e) => set('tradeIn', 'allowance', e.target.value)} /></Field>
                      <Field label="Payoff"><Input prefix="$" inputMode="decimal" value={form.tradeIn.payoff} onChange={(e) => set('tradeIn', 'payoff', e.target.value)} /></Field>
                      <Field label="Lienholder"><Input value={form.tradeIn.lienholder} onChange={(e) => set('tradeIn', 'lienholder', e.target.value)} /></Field>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader icon={<Calculator className="size-4" />} kicker="Step 3" title="Four Square" />
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <Field label="Sale price" required><Input prefix="$" inputMode="decimal" value={form.fourSquare.salePrice} onChange={(e) => set('fourSquare', 'salePrice', e.target.value)} placeholder={form.vehicle.price || ''} /></Field>
                <Field label="Down payment"><Input prefix="$" inputMode="decimal" value={form.fourSquare.downPayment} onChange={(e) => set('fourSquare', 'downPayment', e.target.value)} /></Field>
                <Field label="Doc fee"><Input prefix="$" inputMode="decimal" value={form.fourSquare.docFee} onChange={(e) => set('fourSquare', 'docFee', e.target.value)} /></Field>
                <Field label="Other fees"><Input prefix="$" inputMode="decimal" value={form.fourSquare.otherFees} onChange={(e) => set('fourSquare', 'otherFees', e.target.value)} /></Field>
                <Field label="Sales tax rate"><Input inputMode="decimal" value={form.fourSquare.taxRate} onChange={(e) => set('fourSquare', 'taxRate', e.target.value)} suffix="%" /></Field>
                <Field label="Backend products" hint="Warranty, GAP, etc. (F&I can change this)"><Input prefix="$" inputMode="decimal" value={form.fourSquare.backendProducts} onChange={(e) => set('fourSquare', 'backendProducts', e.target.value)} /></Field>
                <Field label="Customer’s target payment"><Input prefix="$" inputMode="decimal" value={form.fourSquare.desiredPayment} onChange={(e) => set('fourSquare', 'desiredPayment', e.target.value)} suffix="/mo" /></Field>
                <Field label="Term">
                  <Select value={form.fourSquare.desiredTerm} onChange={(e) => set('fourSquare', 'desiredTerm', e.target.value)}>
                    {[36, 48, 60, 66, 72, 75, 84].map((t) => (
                      <option key={t} value={t}>
                        {t} months
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader icon={<ClipboardList className="size-4" />} kicker="Step 4" title="Credit application" actions={<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="size-3" /> Encrypted</span>} />
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <Field label="Employer"><Input value={form.creditApp.employer} onChange={(e) => set('creditApp', 'employer', e.target.value)} /></Field>
                <Field label="Job title"><Input value={form.creditApp.jobTitle} onChange={(e) => set('creditApp', 'jobTitle', e.target.value)} /></Field>
                <Field label="Months at job"><Input inputMode="numeric" value={form.creditApp.employmentMonths} onChange={(e) => set('creditApp', 'employmentMonths', e.target.value)} /></Field>
                <Field label="Gross monthly income" required><Input prefix="$" inputMode="decimal" value={form.creditApp.grossMonthlyIncome} onChange={(e) => set('creditApp', 'grossMonthlyIncome', e.target.value)} /></Field>
                <Field label="Other monthly income"><Input prefix="$" inputMode="decimal" value={form.creditApp.otherMonthlyIncome} onChange={(e) => set('creditApp', 'otherMonthlyIncome', e.target.value)} /></Field>
                <Field label="Existing monthly debt" hint="Cards, loans — not housing"><Input prefix="$" inputMode="decimal" value={form.creditApp.monthlyDebt} onChange={(e) => set('creditApp', 'monthlyDebt', e.target.value)} /></Field>
                <Field label="Housing">
                  <Select value={form.creditApp.housingStatus} onChange={(e) => set('creditApp', 'housingStatus', e.target.value)}>
                    <option value="rent">Rent</option>
                    <option value="own">Own</option>
                    <option value="family">Lives with family</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Housing payment"><Input prefix="$" inputMode="decimal" value={form.creditApp.housingPayment} onChange={(e) => set('creditApp', 'housingPayment', e.target.value)} suffix="/mo" /></Field>
                <Field label="Months at address"><Input inputMode="numeric" value={form.creditApp.residenceMonths} onChange={(e) => set('creditApp', 'residenceMonths', e.target.value)} /></Field>
                <div className="grid grid-cols-[1fr_9rem] gap-3">
                  <Field label="Credit score"><Input inputMode="numeric" value={form.creditApp.creditScore} onChange={(e) => set('creditApp', 'creditScore', e.target.value)} /></Field>
                  <Field label="Source">
                    <Select value={form.creditApp.creditScoreSource} onChange={(e) => set('creditApp', 'creditScoreSource', e.target.value)}>
                      <option value="self_reported">Self-reported</option>
                      <option value="bureau">Bureau pull</option>
                      <option value="lender">Lender</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Social Security number" hint={deal?.creditApp.ssnMasked ? `On file: ${deal.creditApp.ssnMasked} — type to replace` : 'Stored encrypted; only F&I and managers can reveal it'} className="sm:col-span-2">
                  <div className="relative">
                    <Input
                      type={showSsn ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.creditApp.ssn}
                      onChange={(e) => set('creditApp', 'ssn', e.target.value.replace(/[^\d-]/g, '').slice(0, 11))}
                      placeholder={deal?.creditApp.ssnMasked || '•••-••-••••'}
                      className="pr-10 font-mono"
                    />
                    <button type="button" onClick={() => setShowSsn((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={showSsn ? 'Hide' : 'Show'}>
                      {showSsn ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                <div className={cn('rounded-xl border p-4 sm:col-span-2', form.creditApp.consentGranted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
                  <Checkbox checked={form.creditApp.consentGranted} onChange={(v) => set('creditApp', 'consentGranted', v)} label={<><b>The customer authorized a credit check.</b> <span className="text-muted-foreground">{boot?.consentText}</span></>} />
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader icon={<FileStack className="size-4" />} kicker="Step 5" title="Documents" />
              <div className="p-4 sm:p-5">
                {deal ? (
                  <DocumentsPanel dealId={deal.id} documents={deal.documents} canUpload canDelete onChange={setDeal} />
                ) : (
                  <div className="text-sm text-muted-foreground">Save the customer first.</div>
                )}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <CardHeader icon={<Send className="size-4" />} kicker="Step 6" title="Review and submit" />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Summary title="Customer" lines={[`${form.customer.firstName} ${form.customer.lastName}`, form.customer.phone, form.customer.email]} onEdit={() => go(0)} />
                  <Summary title="Vehicle" lines={[[form.vehicle.year, form.vehicle.make, form.vehicle.model, form.vehicle.trim].filter(Boolean).join(' '), form.vehicle.vin, form.tradeIn.present ? `Trade: ${[form.tradeIn.year, form.tradeIn.make, form.tradeIn.model].filter(Boolean).join(' ')}` : 'No trade-in']} onEdit={() => go(1)} />
                  <Summary title="Structure" lines={[`Price ${money(toNum(form.fourSquare.salePrice) ?? toNum(form.vehicle.price))}`, `Down ${money(toNum(form.fourSquare.downPayment) || 0)}`, `${form.fourSquare.desiredTerm} months`]} onEdit={() => go(2)} />
                  <Summary title="Credit" lines={[`Income ${money(toNum(form.creditApp.grossMonthlyIncome))}/mo`, form.creditApp.employer, form.creditApp.consentGranted ? 'Credit authorized ✓' : 'Credit NOT authorized']} onEdit={() => go(3)} />
                </div>
                <div className="rounded-xl border border-border p-4">
                  <Kicker className="mb-2">Checklist</Kicker>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {items.map((i) => (
                      <li key={i.label}>
                        <button onClick={() => !i.ok && go(i.step)} className={cn('flex items-center gap-2 text-sm', i.ok ? 'text-foreground' : 'text-amber-700 hover:underline dark:text-amber-300')}>
                          {i.ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <CircleAlert className="size-4" />}
                          {i.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* nav */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-5">
            <Button variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0} icon={<ArrowLeft className="size-4" />}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)} loading={saving}>
                {deal ? 'Save & continue' : 'Continue'} <ArrowRight className="size-4" />
              </Button>
            ) : editingSubmitted ? (
              <Button onClick={async () => { const d = await save(); if (d) router.push(`/crm/deal-desk/${d.id}`); }} loading={saving} icon={<Check className="size-4" />}>
                Save changes
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting || saving} disabled={!ready} icon={<Send className="size-4" />}>
                Submit to Deal Desk
              </Button>
            )}
          </div>
        </Card>

        {/* side panel */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden">
            <div className="relative p-4">
              <div aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/15 blur-2xl" />
              <Kicker>Live estimate</Kicker>
              <div className="mt-2 text-3xl font-bold tabular-nums">
                {priceEntered ? money(est.payment) : '—'}
                <span className="text-sm font-medium text-muted-foreground">/mo</span>
              </div>
              <div className="text-xs text-muted-foreground">{priceEntered ? `at 7.99% for ${form.fourSquare.desiredTerm || 72} mo · the AI finds real lender rates` : 'Add the sale price to see a payment'}</div>
              {priceEntered && <dl className="mt-3 space-y-1 text-sm">
                <Row k="Amount financed" v={money(est.amount)} />
                <Row k="Sales tax" v={money(est.tax)} />
                {form.tradeIn.present && <Row k="Net trade" v={money(est.netTrade)} />}
                <Row k="LTV" v={book ? `${Math.round((est.amount / book) * 1000) / 10}%` : '—'} />
              </dl>}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Kicker>Ready to submit</Kicker>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {items.filter((i) => i.ok).length}/{items.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(items.filter((i) => i.ok).length / items.length) * 100}%` }} />
            </div>
            <ul className="mt-3 space-y-1.5">
              {items.map((i) => (
                <li key={i.label} className={cn('flex items-center gap-2 text-xs', i.ok ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-foreground')}>
                  {i.ok ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <span className="size-3.5 rounded-full border border-border" />}
                  {i.label}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}

function Summary({ title, lines, onEdit }: { title: string; lines: (string | undefined)[]; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <Kicker>{title}</Kicker>
        <button onClick={onEdit} className="text-xs text-primary hover:underline">
          Edit
        </button>
      </div>
      {lines.filter(Boolean).map((l, i) => (
        <div key={i} className={cn('truncate text-sm', i > 0 && 'text-muted-foreground')}>
          {l}
        </div>
      ))}
    </div>
  );
}
