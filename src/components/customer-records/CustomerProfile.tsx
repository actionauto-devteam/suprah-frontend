"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  StickyNote,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/providers/AuthProvider";
import { fmtDateMDT, fmtShortDateTimeMDT } from "@/lib/timezone";
import { getLeadStatusStyle } from "@/lib/leadStatus";
import { getAppointmentStatusStyle } from "@/lib/appointmentStatus";
import {
  customerRecordErrorMessage,
  customerRecordErrorStatus,
  fetchCustomerProfile,
  updateCustomerRecord,
  type CustomerProfileData,
  type CustomerRecordUpdate,
  type CustomerRelatedLead,
} from "@/lib/api/customerRecords";
import { CUSTOMER_LIST_FLAG, displayPhone, relativeTime } from "./CustomerRecordsList";
import { CustomerLifecycleTimeline } from "./CustomerLifecycleTimeline";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  lead: "Created from a lead",
  manual: "Added by staff",
  import: "Imported",
  booking: "Created from a booking",
};

const CONTACT_METHOD_LABELS: Record<string, string> = { email: "Email", phone: "Phone call", sms: "Text message" };

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm";

const dateOrDash = (value: string | null | undefined) => (value ? fmtDateMDT(value) : "—");

const INVENTORY_LABELS: Record<string, { label: string; tone: string }> = {
  "Ready for Sale": { label: "In stock", tone: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
  "In Recon": { label: "Being prepared for sale", tone: "border-sky-500/30 text-sky-700 dark:text-sky-400" },
  "In Transit": { label: "In transit", tone: "border-sky-500/30 text-sky-700 dark:text-sky-400" },
  Sold: { label: "Sold — buyer not recorded here", tone: "border-amber-500/30 text-amber-700 dark:text-amber-400" },
  Removed: { label: "No longer in inventory", tone: "" },
};

function InventoryStatus({ status }: { status: string | null }) {
  const known = status ? INVENTORY_LABELS[status] : null;
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground", known?.tone)}>
      {known ? `Inventory: ${known.label}` : status ? `Inventory: ${status}` : "Not linked to inventory"}
    </span>
  );
}

function SectionCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{children}</p>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="break-words text-sm [overflow-wrap:anywhere]">{value}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 wrap-break-word text-base font-semibold">{value}</p>
      {hint && <p className="wrap-break-word text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LeadStatusPill({ status }: { status: string }) {
  const style = getLeadStatusStyle(status);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", style.bg, style.text, style.border)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label || status}
    </span>
  );
}

function LeadRow({ lead }: { lead: CustomerRelatedLead }) {
  const activity = relativeTime(lead.lastActivity);
  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <LeadStatusPill status={lead.status} />
          <span className="text-xs text-muted-foreground">
            {lead.source}
            {lead.sourceProvider ? ` · ${lead.sourceProvider}` : ""}
          </span>
        </div>
        <p className="wrap-break-word text-sm font-medium">{lead.vehicle || "No vehicle listed"}</p>
        <p className="text-xs text-muted-foreground">
          Created {dateOrDash(lead.createdAt)}
          {activity ? ` · Active ${activity}` : ""}
          {lead.assignedTo ? ` · ${lead.assignedTo}` : ""}
        </p>
      </div>
      <Link
        href={`/crm/leads?leadId=${lead.id}`}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted sm:h-9"
      >
        Open lead
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </li>
  );
}

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
  preferredContactMethod: string;
};

const formFromProfile = (profile: CustomerProfileData): FormState => ({
  firstName: profile.customer.firstName || "",
  lastName: profile.customer.lastName || "",
  email: profile.customer.email || "",
  phone: profile.customer.phone || "",
  alternatePhone: profile.customer.alternatePhone || "",
  street: profile.customer.address.street,
  city: profile.customer.address.city,
  state: profile.customer.address.state,
  postalCode: profile.customer.address.postalCode,
  notes: profile.customer.notes || "",
  preferredContactMethod: profile.customer.preferredContactMethod || "",
});

function CustomerInformationForm({ profile, customerId }: { profile: CustomerProfileData; customerId: string }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const initial = React.useMemo(() => formFromProfile(profile), [profile]);
  const [form, setForm] = React.useState<FormState>(initial);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setForm(initial);
    setError("");
  }, [initial]);

  const dirty = (Object.keys(initial) as Array<keyof FormState>).some((key) => form[key] !== initial[key]);
  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const changes: CustomerRecordUpdate = {};
      if (form.firstName !== initial.firstName) changes.firstName = form.firstName;
      if (form.lastName !== initial.lastName) changes.lastName = form.lastName;
      if (form.email !== initial.email) changes.email = form.email;
      if (form.phone !== initial.phone) changes.phone = form.phone;
      if (form.alternatePhone !== initial.alternatePhone) changes.alternatePhone = form.alternatePhone;
      if (form.notes !== initial.notes) changes.notes = form.notes;
      if (form.preferredContactMethod && form.preferredContactMethod !== initial.preferredContactMethod) {
        changes.preferredContactMethod = form.preferredContactMethod as CustomerRecordUpdate["preferredContactMethod"];
      }
      if (["street", "city", "state", "postalCode"].some((key) => form[key as keyof FormState] !== initial[key as keyof FormState])) {
        changes.address = { street: form.street, city: form.city, state: form.state, postalCode: form.postalCode };
      }
      return updateCustomerRecord(await getToken(), customerId, changes);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["customer-record", customerId], updated);
      void queryClient.invalidateQueries({ queryKey: ["customer-records"] });
      toast.success("Customer details saved");
    },
    onError: (mutationError) => {
      setError(customerRecordErrorMessage(mutationError, "Couldn't save the customer details. Please try again."));
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Customer information">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          First name
          <input value={form.firstName} onChange={set("firstName")} className={fieldClass} autoComplete="off" required />
        </label>
        <label className="space-y-1 text-xs font-medium">
          Last name
          <input value={form.lastName} onChange={set("lastName")} className={fieldClass} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium">
          Email
          <input type="email" value={form.email} onChange={set("email")} className={fieldClass} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium">
          Phone
          <input type="tel" value={form.phone} onChange={set("phone")} className={fieldClass} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium">
          Other phone
          <input type="tel" value={form.alternatePhone} onChange={set("alternatePhone")} className={fieldClass} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium">
          Preferred contact
          <select value={form.preferredContactMethod} onChange={set("preferredContactMethod")} className={fieldClass}>
            <option value="" disabled>
              Not set
            </option>
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
            <option value="sms">Text message</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium">
        Street address
        <input value={form.street} onChange={set("street")} className={fieldClass} autoComplete="off" />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem]">
        <label className="col-span-2 space-y-1 text-xs font-medium sm:col-span-1">
          City
          <input value={form.city} onChange={set("city")} className={fieldClass} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium">
          State
          <input value={form.state} onChange={set("state")} className={fieldClass} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium">
          ZIP code
          <input value={form.postalCode} onChange={set("postalCode")} className={fieldClass} autoComplete="off" />
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium">
        Notes
        <textarea
          value={form.notes}
          onChange={set("notes")}
          rows={3}
          maxLength={2000}
          className="w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:text-sm"
        />
      </label>
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        Changing the email or phone re-checks which leads belong to this customer. Details that match another customer can&apos;t be saved here.
      </p>
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={!dirty || mutation.isPending}
          onClick={() => {
            setForm(initial);
            setError("");
          }}
          className="h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40 sm:h-10"
        >
          Cancel changes
        </button>
        <button
          type="submit"
          disabled={!dirty || mutation.isPending}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 sm:h-10"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save customer details
        </button>
      </div>
    </form>
  );
}

export function CustomerProfile({ customerId }: { customerId: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [tab, setTab] = React.useState("overview");

  const query = useQuery({
    queryKey: ["customer-record", customerId],
    queryFn: async () => fetchCustomerProfile(await getToken(), customerId),
    staleTime: 15_000,
    retry: (count, error) => ![403, 404].includes(customerRecordErrorStatus(error) || 0) && count < 2,
  });

  const goBack = () => {
    let fromList = false;
    try {
      fromList = window.sessionStorage.getItem(CUSTOMER_LIST_FLAG) === "1";
      window.sessionStorage.removeItem(CUSTOMER_LIST_FLAG);
    } catch {}
    if (fromList) router.back();
    else router.push("/crm/customers");
  };

  const profile = query.data;
  const errorStatus = customerRecordErrorStatus(query.error);

  const back = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Customer Records
    </button>
  );

  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6" aria-label="Loading customer">
        {back}
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError || !profile) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
        {back}
        <div role="alert" className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">
            {errorStatus === 404
              ? "This customer record wasn't found."
              : errorStatus === 403
                ? "You don't have access to this customer record."
                : "Couldn't load this customer record."}
          </p>
          {errorStatus !== 404 && errorStatus !== 403 && (
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const { customer, summary } = profile;
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Unnamed customer";
  const initialsText = [customer.firstName, customer.lastName].map((part) => part?.trim()?.[0] || "").join("").toUpperCase() || "?";
  const openLeads = profile.relatedLeads.filter((lead) => !lead.closed);
  const closedLeads = profile.relatedLeads.filter((lead) => lead.closed);
  const upcoming = profile.appointments.filter((appointment) => appointment.upcoming);
  const past = profile.appointments.filter((appointment) => !appointment.upcoming);
  const lastActivity = relativeTime(summary.lastActivity);
  const relationship = [
    `${summary.leads.total} ${summary.leads.total === 1 ? "lead" : "leads"}${summary.leads.total ? ` (${summary.leads.open} open, ${summary.leads.closed} closed)` : ""}`,
    `${summary.appointments.total} ${summary.appointments.total === 1 ? "appointment" : "appointments"}`,
    lastActivity ? `last activity ${lastActivity}` : "no recorded activity yet",
  ].join(" · ");
  const phone = displayPhone(customer.phone);
  const altPhone = displayPhone(customer.alternatePhone);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      {back}

      <header className="rounded-xl border bg-card p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            {initialsText}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-lg font-semibold">{name}</h1>
              <Badge variant="outline" className={cn("text-[11px]", customer.isActive ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "")}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
              {summary.returning && (
                <Badge variant="outline" className="gap-1 border-emerald-600/40 bg-emerald-500/10 text-[11px] text-emerald-800 dark:text-emerald-300" data-testid="returning-badge">
                  <RotateCcw className="h-3 w-3" />
                  Returning customer
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {SOURCE_LABELS[customer.source] || "Customer record"} · Since {dateOrDash(customer.createdAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {customer.email && (
                <span className="inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {customer.email}
                </span>
              )}
              {phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {phone}
                </span>
              )}
              {!customer.email && !phone && <span className="text-xs italic text-muted-foreground">No contact details on file</span>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground" data-testid="customer-relationship">
              {relationship}
            </p>
            {summary.returning && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-emerald-800 dark:text-emerald-300" data-testid="returning-note">
                <span>
                  Came back with a new inquiry on {dateOrDash(summary.returning.latest.at)} after an earlier lead was closed ({summary.returning.latest.previousStatus}).
                </span>
                <Link href={`/crm/leads?leadId=${summary.returning.latest.leadId}`} className="inline-flex min-h-8 items-center font-medium underline-offset-2 hover:underline">
                  Open the new lead
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="customer-metrics">
        <Metric
          label="Leads"
          value={summary.leads.total}
          hint={`${summary.leads.open} open · ${summary.leads.closed} closed${summary.additionalInquiries ? ` · ${summary.additionalInquiries} more ${summary.additionalInquiries === 1 ? "inquiry" : "inquiries"}` : ""}`}
        />
        <Metric label="Appointments" value={summary.appointments.total} hint={`${summary.appointments.upcoming} upcoming · ${summary.appointments.completed} completed`} />
        <Metric label="Vehicles asked about" value={summary.vehiclesOfInterest} hint="From the customer's inquiries" />
        <Metric label="Last activity" value={lastActivity || "None yet"} hint={summary.firstContact ? `First contact ${dateOrDash(summary.firstContact)}` : undefined} />
      </div>

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground" data-testid="customer-unlinked-note">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        Purchases, owned vehicles and service visits aren&apos;t linked to Customer Records yet, so they aren&apos;t counted here.
      </p>

      {Boolean(summary.leadsNeedingReview) && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          {summary.leadsNeedingReview} {summary.leadsNeedingReview === 1 ? "lead has" : "leads have"} contact details that also match another
          customer. {summary.leadsNeedingReview === 1 ? "It was" : "They were"} kept separate and not added to this record.
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-3">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto whitespace-nowrap p-1">
          <TabsTrigger value="overview" className="h-9 flex-none px-3">Overview</TabsTrigger>
          <TabsTrigger value="timeline" className="h-9 flex-none px-3">Timeline</TabsTrigger>
          <TabsTrigger value="leads" className="h-9 flex-none px-3">Leads ({summary.leads.total})</TabsTrigger>
          <TabsTrigger value="vehicles" className="h-9 flex-none px-3">Vehicles</TabsTrigger>
          <TabsTrigger value="purchases" className="h-9 flex-none px-3">Purchases</TabsTrigger>
          <TabsTrigger value="appointments" className="h-9 flex-none px-3">Appointments</TabsTrigger>
          <TabsTrigger value="details" className="h-9 flex-none px-3">Customer info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-3 md:grid-cols-2">
          <SectionCard title="Contact details" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={customer.email || <span className="text-muted-foreground">Not on file</span>} />
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={phone || <span className="text-muted-foreground">Not on file</span>} />
            {altPhone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Other phone" value={altPhone} />}
            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={customer.addressText || <span className="text-muted-foreground">Not on file</span>} />
            <InfoRow
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="Preferred contact"
              value={customer.preferredContactMethod ? CONTACT_METHOD_LABELS[customer.preferredContactMethod] : <span className="text-muted-foreground">Not set</span>}
            />
          </SectionCard>
          <SectionCard title="Record" icon={<Info className="h-4 w-4 text-muted-foreground" />}>
            <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="Origin" value={SOURCE_LABELS[customer.source] || "Customer record"} />
            <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Record created" value={dateOrDash(customer.createdAt)} />
            <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Last updated" value={dateOrDash(customer.updatedAt)} />
            {customer.sourceLeadId && (
              <InfoRow
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                label="First lead"
                value={
                  <Link href={`/crm/leads?leadId=${customer.sourceLeadId}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                    Open the lead this record came from
                  </Link>
                }
              />
            )}
            <InfoRow icon={<StickyNote className="h-3.5 w-3.5" />} label="Notes" value={customer.notes || <span className="text-muted-foreground">No notes</span>} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="leads" className="space-y-3">
          <SectionCard title={`Open leads (${openLeads.length})`}>
            {openLeads.length ? (
              <ul className="space-y-2">{openLeads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}</ul>
            ) : (
              <EmptyNote>No open leads for this customer.</EmptyNote>
            )}
          </SectionCard>
          <SectionCard title={`Closed leads (${closedLeads.length})`}>
            {closedLeads.length ? (
              <ul className="space-y-2">{closedLeads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}</ul>
            ) : (
              <EmptyNote>No closed leads.</EmptyNote>
            )}
          </SectionCard>
          <p className="text-[11px] text-muted-foreground">Only leads matched to this customer by the same email or phone number are listed.</p>
        </TabsContent>

        <TabsContent value="vehicles" className="grid gap-3 md:grid-cols-2">
          <SectionCard title="Vehicles asked about" icon={<Car className="h-4 w-4 text-muted-foreground" />}>
            {profile.vehicles.interest.length ? (
              <ul className="space-y-2">
                {profile.vehicles.interest.map((vehicle, index) => (
                  <li key={`${vehicle.vin || vehicle.make}-${index}`} className="rounded-lg border p-3">
                    <p className="wrap-break-word text-sm font-medium">
                      {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
                      {vehicle.trim && <span className="font-normal text-muted-foreground"> {vehicle.trim}</span>}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">
                      {[vehicle.vin ? `VIN ${vehicle.vin}` : "", vehicle.stock ? `Stock ${vehicle.stock}` : "", vehicle.askedAt ? `Asked ${dateOrDash(vehicle.askedAt)}` : "From the customer record"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {vehicle.leadId && <InventoryStatus status={vehicle.inventoryStatus} />}
                      {vehicle.leadId && (
                        <Link href={`/crm/leads?leadId=${vehicle.leadId}`} className="inline-flex min-h-8 items-center text-xs text-emerald-700 hover:underline dark:text-emerald-400">
                          Open the inquiry
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>No vehicles in this customer&apos;s inquiries.</EmptyNote>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">Taken from the customer&apos;s inquiries. Asking about a vehicle doesn&apos;t mean they own it.</p>
          </SectionCard>
          <SectionCard title="Owned vehicles" icon={<Car className="h-4 w-4 text-muted-foreground" />}>
            <EmptyNote>
              Owned vehicles are kept on customer app accounts (My Garage), and those accounts aren&apos;t linked to Customer Records yet. No vehicle is
              shown as owned until that link is verified.
            </EmptyNote>
          </SectionCard>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-3">
          <SectionCard title="Verified purchases" icon={<Receipt className="h-4 w-4 text-muted-foreground" />}>
            <EmptyNote>
              Sales recorded in Garage Review are tied to customer app accounts, not to Customer Records, so no verified purchases can be shown here yet.
            </EmptyNote>
          </SectionCard>
          <SectionCard title={`Leads marked Sold (${profile.purchases.leadsMarkedSold.length})`} icon={<Info className="h-4 w-4 text-muted-foreground" />}>
            {profile.purchases.leadsMarkedSold.length ? (
              <ul className="space-y-2">
                {profile.purchases.leadsMarkedSold.map((lead) => (
                  <li key={lead.leadId} className="flex flex-col gap-1.5 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <LeadStatusPill status={lead.status} />
                      <p className="wrap-break-word text-sm font-medium">{lead.vehicle || "No vehicle listed"}</p>
                      <p className="text-xs text-muted-foreground">{lead.markedAt ? `Marked ${dateOrDash(lead.markedAt)}` : "Date not recorded"}</p>
                    </div>
                    <Link
                      href={`/crm/leads?leadId=${lead.leadId}`}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted sm:h-9"
                    >
                      Open lead
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>No leads for this customer are marked Sold.</EmptyNote>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">A lead status of Sold is set by staff on the lead. It isn&apos;t proof of a completed sale.</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-3">
          <SectionCard title={`Upcoming (${upcoming.length})`} icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}>
            {upcoming.length ? (
              <ul className="space-y-2">
                {upcoming.map((appointment) => (
                  <AppointmentRow key={appointment.id} appointment={appointment} />
                ))}
              </ul>
            ) : (
              <EmptyNote>No upcoming appointments.</EmptyNote>
            )}
          </SectionCard>
          <SectionCard title={`Past (${past.length})`} icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}>
            {past.length ? (
              <ul className="space-y-2">
                {past.map((appointment) => (
                  <AppointmentRow key={appointment.id} appointment={appointment} />
                ))}
              </ul>
            ) : (
              <EmptyNote>No past appointments.</EmptyNote>
            )}
          </SectionCard>
          <SectionCard title="Service history" icon={<Wrench className="h-4 w-4 text-muted-foreground" />}>
            <EmptyNote>Service records are kept on customer app accounts, which aren&apos;t linked to Customer Records yet, so no service visits are shown.</EmptyNote>
          </SectionCard>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="customer-activity-counts">
            <Metric label="Texts received" value={summary.texts.received} />
            <Metric label="Texts sent" value={summary.texts.sent} />
            <Metric label="Calls" value={summary.calls ?? "Unavailable"} />
            <Metric label="Notes" value={summary.notes} />
          </div>
          <CustomerLifecycleTimeline customerId={customerId} />
          <p className="text-[11px] text-muted-foreground">Open a lead to read the full conversation.</p>
        </TabsContent>

        <TabsContent value="details">
          <SectionCard title="Customer information">
            <CustomerInformationForm profile={profile} customerId={customerId} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentRow({ appointment }: { appointment: CustomerProfileData["appointments"][number] }) {
  const style = getAppointmentStatusStyle(appointment.status);
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="wrap-break-word text-sm font-medium">{appointment.title}</p>
        <p className="text-xs text-muted-foreground">{appointment.startTime ? fmtShortDateTimeMDT(appointment.startTime) : "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", style.badge)}>{style.label}</span>
        {appointment.leadId && (
          <Link href={`/crm/leads?leadId=${appointment.leadId}`} className="text-xs text-emerald-700 hover:underline dark:text-emerald-400">
            Open lead
          </Link>
        )}
      </div>
    </li>
  );
}
