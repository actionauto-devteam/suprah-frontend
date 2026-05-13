"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import {
  FinanceApplicationSchema,
  FinanceApplicationData,
} from "@/lib/schemas/finance-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  FileCheck,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { sanitizeInput } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import type { Vehicle } from "@/types/inventory";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  "Personal Info",
  "Contact Details",
  "Residence",
  "Employment",
  "References",
  "Trade-In",
  "Review & Submit",
];

interface FinanceApplicationFlowProps {
  vehicleId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function FinanceApplicationFlow({
  vehicleId,
  onComplete,
  onCancel,
}: FinanceApplicationFlowProps) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = React.useState(0);
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  const form = useForm<FinanceApplicationData>({
    resolver: zodResolver(FinanceApplicationSchema),
    defaultValues: {
      personal: {
        applicationType: "individual",
        maritalStatus: "single",
        firstName: "",
        lastName: "",
        ssn: "",
        dob: "",
        dlNumber: "",
      },
      contact: {
        email: "",
        phone: "",
      },
      residence: {
        housingStatus: "own",
        monthlyPayment: 0,
        yearsAtAddress: 0,
        monthsAtAddress: 0,
        address: "",
        city: "",
        state: "",
        zipCode: "",
      },
      employment: {
        incomeFrequency: "annually",
        annualIncome: 0,
        employmentYears: 0,
        employmentMonths: 0,
        employerName: "",
        jobTitle: "",
      },
      reference: {
        refName: "",
        refRelationship: "",
        refPhone: "",
      },
      tradeIn: {
        hasTradeIn: false,
        tradeMake: "",
        tradeMileage: "",
      },
    },
    mode: "onChange",
  });

  // Format SSN as user types
  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 9) val = val.slice(0, 9);
    let formatted = val;
    if (val.length > 3 && val.length <= 5)
      formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    else if (val.length > 5)
      formatted = `${val.slice(0, 3)}-${val.slice(3, 5)}-${val.slice(5)}`;
    form.setValue("personal.ssn", formatted);
  };

  // Format Phone as user types: (XXX) XXX-XXXX
  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: Path<FinanceApplicationData>,
  ) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 10) val = val.slice(0, 10);

    let formatted = val;
    if (val.length > 6)
      formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
    else if (val.length > 3) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
    else if (val.length > 0) formatted = `(${val}`;

    form.setValue(fieldName, formatted);
  };

  // Use persistence hook
  const { isReady, clearPersistence } = useFinancePersistence({
    form,
    vehicleId,
  });

  // Fetch vehicle info
  React.useEffect(() => {
    async function fetchVehicle() {
      try {
        const token = await getToken();
        const response = await apiClient.get(`/api/vehicles/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicle(response.data?.data || response.data);
      } catch (e) {
        console.error("Failed to fetch vehicle", e);
      }
    }
    fetchVehicle();
  }, [vehicleId, getToken]);

  const nextStep = async () => {
    const sections = [
      "personal",
      "contact",
      "residence",
      "employment",
      "reference",
      "tradeIn",
    ];
    const currentSection = sections[step] as keyof FinanceApplicationData;

    if (currentSection) {
      const isValid = await form.trigger(currentSection);
      if (!isValid) {
        console.warn(
          `${currentSection} section validation failed`,
          form.formState.errors[currentSection],
        );
        return;
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: FinanceApplicationData) => {
    // Hard Lockdown: If on the final review step, require the
    // explicit confirmation checkbox before proceeding.
    if (step === 6 && !isConfirmed) {
      return;
    }

    // Safety Guard: If 'submitted' (e.g. by Enter key) on an early step,
    // treat it as a 'Continue' action instead of a final submission.
    if (step < STEPS.length - 1) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Submitting Finance Application:", data);
      // Connect to production API here
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setIsSuccess(true);
      clearPersistence();
      if (onComplete) onComplete();
    } catch (e) {
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady)
    return <div className="p-8 text-center">Loading your progress...</div>;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 shadow-2xl border border-zinc-100 dark:border-zinc-800 space-y-6">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Application Submitted!
          </h1>
          <p className="text-xl text-muted-foreground">
            Thank you for your application. Our finance team will review your
            information and contact you within 24 hours.
          </p>
          <div className="pt-8">
            <Button
              size="lg"
              onClick={() => router.back()}
              className="px-12 rounded-full h-12 text-lg"
            >
              Return
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Button
            variant="ghost"
            onClick={onCancel || (() => router.back())}
            className="-ml-3 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mt-2">
            Finance Application
          </h1>
          <p className="text-muted-foreground text-lg">
            Secure credit application for your vehicle
          </p>
        </div>

        {vehicle && (
          <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <img
              src={vehicle.image}
              alt={vehicle.make}
              className="w-16 h-12 object-cover rounded-lg"
            />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {vehicle.year} {vehicle.make}
              </p>
              <p className="text-sm font-bold tracking-tight">
                {vehicle.model}
              </p>
              <p className="text-lg font-black text-green-600 dark:text-green-400 leading-none mt-1">
                ${vehicle.price.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-xl font-bold">{STEPS[step]}</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {Math.round(progress)}% Complete
          </p>
        </div>
        <Progress
          value={progress}
          className="h-2 bg-zinc-200 dark:bg-zinc-800"
        />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="border-zinc-200 p-0 dark:border-zinc-800 shadow-xl rounded-3xl overflow-hidden bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 p-8">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-500">
                Secure 256-bit Encryption
              </span>
            </div>
            <CardTitle className="text-2xl font-bold">{STEPS[step]}</CardTitle>
            <CardDescription className="text-base">
              Please provide accurate information to expedite your approval.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 0 && (
                  <PersonalInfoSection
                    form={form}
                    handleSSNChange={handleSSNChange}
                  />
                )}
                {step === 1 && (
                  <ContactSection
                    form={form}
                    handlePhoneChange={handlePhoneChange}
                  />
                )}
                {step === 2 && <ResidenceSection form={form} />}
                {step === 3 && <EmploymentSection form={form} />}
                {step === 4 && (
                  <ReferenceSection
                    form={form}
                    handlePhoneChange={handlePhoneChange}
                  />
                )}
                {step === 5 && <TradeInSection form={form} />}
                {step === 6 && (
                  <ReviewSection
                    form={form}
                    setStep={setStep}
                    isConfirmed={isConfirmed}
                    setIsConfirmed={setIsConfirmed}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-8 bg-zinc-50/50 dark:bg-zinc-900/20 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 0}
              className="h-11 w-full sm:w-auto px-6 rounded-full"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>

            <div className="flex w-full sm:w-auto gap-3 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="hidden sm:flex items-center gap-2 text-muted-foreground mr-2"
              >
                <Save className="w-4 h-4" /> Progress Saved
              </Button>

              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-11 w-full sm:w-auto px-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-bold"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || (step === 6 && !isConfirmed)}
                  className={`h-11 w-full sm:w-auto px-8 rounded-full font-bold shadow-lg transition-all ${
                    step === 6 && !isConfirmed
                      ? "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                      : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                  }`}
                >
                  {isSubmitting ? "Processing..." : "Submit Application"}{" "}
                  <FileCheck className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

function ErrorMsg({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-[10px] font-bold uppercase tracking-tight text-red-500 mt-1 flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3" /> {message}
    </motion.p>
  );
}

/** Form Sections **/

function PersonalInfoSection({
  form,
  handleSSNChange,
}: {
  form: any;
  handleSSNChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2 col-span-2">
        <Label className="text-xs font-bold uppercase italic tracking-wider">
          Application Type
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant={
              form.watch("personal.applicationType") === "individual"
                ? "default"
                : "outline"
            }
            onClick={() =>
              form.setValue("personal.applicationType", "individual")
            }
            className="h-12 w-full rounded-xl"
          >
            Individual Application
          </Button>
          <Button
            type="button"
            variant={
              form.watch("personal.applicationType") === "joint"
                ? "default"
                : "outline"
            }
            onClick={() => form.setValue("personal.applicationType", "joint")}
            className="h-12 w-full rounded-xl"
          >
            Joint Application
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>First Name</Label>
        <Input
          {...register("personal.firstName")}
          placeholder="Legal First Name"
        />
        <ErrorMsg message={errors.personal?.firstName?.message} />
      </div>
      <div className="space-y-2">
        <Label>Last Name</Label>
        <Input
          {...register("personal.lastName")}
          placeholder="Legal Last Name"
        />
        <ErrorMsg message={errors.personal?.lastName?.message} />
      </div>
      <div className="space-y-2">
        <Label>Social Security Number</Label>
        <Input
          {...register("personal.ssn")}
          placeholder="XXX-XX-XXXX"
          onChange={handleSSNChange}
          maxLength={11}
        />
        <ErrorMsg message={errors.personal?.ssn?.message} />
      </div>
      <div className="space-y-2">
        <Label>Date of Birth</Label>
        <Input type="date" {...register("personal.dob")} />
        <ErrorMsg message={errors.personal?.dob?.message} />
      </div>
      <div className="space-y-2">
        <Label>Driver's License Number</Label>
        <Input
          {...register("personal.dlNumber")}
          placeholder="DL-XXXXXX"
          maxLength={20}
          className="uppercase"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
            register("personal.dlNumber").onChange(e);
          }}
        />
        <ErrorMsg message={errors.personal?.dlNumber?.message} />
      </div>
      <div className="space-y-2">
        <Label>Marital Status</Label>
        <select
          {...register("personal.maritalStatus")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
        </select>
        <ErrorMsg message={errors.personal?.maritalStatus?.message} />
      </div>
    </div>
  );
}

function ContactSection({
  form,
  handlePhoneChange,
}: {
  form: any;
  handlePhoneChange: any;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>Email Address</Label>
        <Input
          type="email"
          {...register("contact.email")}
          placeholder="you@example.com"
        />
        <ErrorMsg message={errors.contact?.email?.message} />
      </div>
      <div className="space-y-2">
        <Label>Mobile Phone</Label>
        <Input
          {...register("contact.phone")}
          placeholder="(555) 000-0000"
          onChange={(e) => handlePhoneChange(e, "contact.phone")}
          maxLength={14}
        />
        <ErrorMsg message={errors.contact?.phone?.message} />
      </div>
    </div>
  );
}

function ResidenceSection({ form }: { form: any }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="col-span-2 space-y-2">
        <Label>Street Address</Label>
        <Input {...register("residence.address")} placeholder="123 Main St" />
        <ErrorMsg message={errors.residence?.address?.message} />
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        <Input {...register("residence.city")} />
        <ErrorMsg message={errors.residence?.city?.message} />
      </div>
      <div className="space-y-2">
        <Label>State</Label>
        <Input
          {...register("residence.state")}
          placeholder="UT"
          maxLength={2}
        />
        <ErrorMsg message={errors.residence?.state?.message} />
      </div>
      <div className="space-y-2">
        <Label>ZIP Code</Label>
        <Input {...register("residence.zipCode")} maxLength={5} />
        <ErrorMsg message={errors.residence?.zipCode?.message} />
      </div>
      <div className="space-y-2">
        <Label>Housing Status</Label>
        <select
          {...register("residence.housingStatus")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="own">Own</option>
          <option value="rent">Rent</option>
          <option value="other">Other</option>
        </select>
        <ErrorMsg message={errors.residence?.housingStatus?.message} />
      </div>
      <div className="space-y-2">
        <Label>Monthly Rent / Mortgage</Label>
        <Input
          type="number"
          {...register("residence.monthlyPayment", { valueAsNumber: true })}
          placeholder="e.g. 1200"
        />
        <ErrorMsg message={errors.residence?.monthlyPayment?.message} />
      </div>
      <div className="space-y-2">
        <Label>Years at Address</Label>
        <Input
          type="number"
          {...register("residence.yearsAtAddress", { valueAsNumber: true })}
        />
        <ErrorMsg message={errors.residence?.yearsAtAddress?.message} />
      </div>
      <div className="space-y-2">
        <Label>Months at Address</Label>
        <Input
          type="number"
          {...register("residence.monthsAtAddress", { valueAsNumber: true })}
          max={11}
        />
        <ErrorMsg message={errors.residence?.monthsAtAddress?.message} />
      </div>
    </div>
  );
}

function EmploymentSection({ form }: { form: any }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>Current Employer</Label>
        <Input {...register("employment.employerName")} />
        <ErrorMsg message={errors.employment?.employerName?.message} />
      </div>
      <div className="space-y-2">
        <Label>Job Title</Label>
        <Input {...register("employment.jobTitle")} />
        <ErrorMsg message={errors.employment?.jobTitle?.message} />
      </div>
      <div className="space-y-2">
        <Label>Annual Gross Income</Label>
        <Input
          type="number"
          {...register("employment.annualIncome", { valueAsNumber: true })}
        />
        <ErrorMsg message={errors.employment?.annualIncome?.message} />
      </div>
      <div className="space-y-2">
        <Label>Income Frequency</Label>
        <select
          {...register("employment.incomeFrequency")}
          className="w-full h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="annually">Annually</option>
          <option value="monthly">Monthly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="weekly">Weekly</option>
        </select>
        <ErrorMsg message={errors.employment?.incomeFrequency?.message} />
      </div>
      <div className="space-y-2">
        <Label>Years Employed</Label>
        <Input
          type="number"
          {...register("employment.employmentYears", { valueAsNumber: true })}
        />
        <ErrorMsg message={errors.employment?.employmentYears?.message} />
      </div>
      <div className="space-y-2">
        <Label>Months Employed</Label>
        <Input
          type="number"
          {...register("employment.employmentMonths", { valueAsNumber: true })}
          max={11}
        />
        <ErrorMsg message={errors.employment?.employmentMonths?.message} />
      </div>
    </div>
  );
}

function ReferenceSection({
  form,
  handlePhoneChange,
}: {
  form: any;
  handlePhoneChange: any;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground italic">
        Please provide one personal reference not living with you.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input {...register("reference.refName")} />
          <ErrorMsg message={errors.reference?.refName?.message} />
        </div>
        <div className="space-y-2">
          <Label>Relationship</Label>
          <Input {...register("reference.refRelationship")} />
          <ErrorMsg message={errors.reference?.refRelationship?.message} />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            {...register("reference.refPhone")}
            placeholder="(555) 000-0000"
            onChange={(e) => handlePhoneChange(e, "reference.refPhone")}
            maxLength={14}
          />
          <ErrorMsg message={errors.reference?.refPhone?.message} />
        </div>
      </div>
    </div>
  );
}

function TradeInSection({ form }: { form: any }) {
  const hasTrade = form.watch("tradeIn.hasTradeIn");
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hasTradeIn"
          {...form.register("tradeIn.hasTradeIn")}
          className="w-5 h-5 rounded border-zinc-300"
        />
        <Label htmlFor="hasTradeIn" className="text-lg font-bold">
          I have a vehicle to trade in
        </Label>
      </div>

      {hasTrade && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="space-y-2">
            <Label>Year/Make/Model</Label>
            <Input
              {...form.register("tradeIn.tradeMake")}
              placeholder="e.g. 2020 Honda Civic"
            />
          </div>
          <div className="space-y-2">
            <Label>Mileage</Label>
            <Input {...form.register("tradeIn.tradeMileage")} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ReviewSection({
  form,
  setStep,
  isConfirmed,
  setIsConfirmed,
}: {
  form: any;
  setStep: (s: number) => void;
  isConfirmed: boolean;
  setIsConfirmed: (v: boolean) => void;
}) {
  const data = form.getValues();

  const SummaryGroup = ({
    title,
    stepIndex,
    children,
  }: {
    title: string;
    stepIndex: number;
    children: React.ReactNode;
  }) => (
    <div className="space-y-4 p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-2">
        <h3 className="text-sm font-black uppercase italic tracking-widest text-zinc-500">
          {title}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep(stepIndex)}
          className="h-8 rounded-full text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
        {children}
      </div>
    </div>
  );

  const SummaryItem = ({
    label,
    value,
  }: {
    label: string;
    value?: string | number | boolean;
  }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-bold tracking-tight truncate">
        {value === true ? "Yes" : value === false ? "No" : value || "—"}
      </p>
    </div>
  );

  // Mask SSN for security
  const maskedSSN = data.personal?.ssn
    ? `XXX-XX-${data.personal.ssn.split("-").pop()}`
    : "—";

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-500 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed font-medium">
          Almost done! Please review all information below. If you see a
          mistake, click the <strong>Edit</strong> button for that section.
        </p>
      </div>

      <div className="space-y-4">
        {/* Personal */}
        <SummaryGroup title="Personal Identity" stepIndex={0}>
          <SummaryItem
            label="Application"
            value={data.personal?.applicationType}
          />
          <SummaryItem label="First Name" value={data.personal?.firstName} />
          <SummaryItem label="Last Name" value={data.personal?.lastName} />
          <SummaryItem label="SSN" value={maskedSSN} />
          <SummaryItem label="DOB" value={data.personal?.dob} />
          <SummaryItem
            label="Marital Status"
            value={data.personal?.maritalStatus}
          />
          <SummaryItem
            label="Driver's License"
            value={data.personal?.dlNumber}
          />
        </SummaryGroup>

        {/* Contact */}
        <SummaryGroup title="Contact Options" stepIndex={1}>
          <SummaryItem label="Email" value={data.contact?.email} />
          <SummaryItem label="Phone" value={data.contact?.phone} />
        </SummaryGroup>

        {/* Residence */}
        <SummaryGroup title="Current Residence" stepIndex={2}>
          <SummaryItem label="Address" value={data.residence?.address} />
          <SummaryItem label="City" value={data.residence?.city} />
          <SummaryItem label="State" value={data.residence?.state} />
          <SummaryItem label="ZIP" value={data.residence?.zipCode} />
          <SummaryItem label="Housing" value={data.residence?.housingStatus} />
          <SummaryItem
            label="Monthly Pmt"
            value={`$${data.residence?.monthlyPayment}`}
          />
          <SummaryItem
            label="Time at Address"
            value={`${data.residence?.yearsAtAddress}y ${data.residence?.monthsAtAddress}m`}
          />
        </SummaryGroup>

        {/* Employment */}
        <SummaryGroup title="Current Employment" stepIndex={3}>
          <SummaryItem label="Employer" value={data.employment?.employerName} />
          <SummaryItem label="Job Title" value={data.employment?.jobTitle} />
          <SummaryItem
            label="Frequency"
            value={data.employment?.incomeFrequency}
          />
          <SummaryItem
            label="Annual Income"
            value={`$${data.employment?.annualIncome?.toLocaleString()}`}
          />
          <SummaryItem
            label="Time Employed"
            value={`${data.employment?.employmentYears}y ${data.employment?.employmentMonths}m`}
          />
        </SummaryGroup>

        {/* References */}
        <SummaryGroup title="Personal Reference" stepIndex={4}>
          <SummaryItem label="Ref Name" value={data.reference?.refName} />
          <SummaryItem
            label="Relationship"
            value={data.reference?.refRelationship}
          />
          <SummaryItem label="Ref Phone" value={data.reference?.refPhone} />
        </SummaryGroup>

        {/* Trade In */}
        <SummaryGroup title="Vehicle Trade-In" stepIndex={5}>
          <SummaryItem label="Has Trade-In" value={data.tradeIn?.hasTradeIn} />
          {data.tradeIn?.hasTradeIn && (
            <>
              <SummaryItem label="Vehicle" value={data.tradeIn?.tradeMake} />
              <SummaryItem label="Mileage" value={data.tradeIn?.tradeMileage} />
            </>
          )}
        </SummaryGroup>
      </div>

      <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800/30 rounded-3xl">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => setIsConfirmed(!isConfirmed)}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              isConfirmed
                ? "bg-green-600 border-green-600 scale-110 shadow-lg shadow-green-600/30"
                : "border-zinc-300"
            }`}
          >
            {isConfirmed && <CheckCircle2 className="w-5 h-5 text-white" />}
          </div>
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            I have reviewed my information and certify it is correct.
          </p>
        </div>
      </div>
    </div>
  );
}
