"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Landmark,
  Briefcase,
  Home,
  User,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Vehicle } from "@/types/inventory";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

interface FinanceApplicationModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export function FinanceApplicationModal({
  vehicle,
  isOpen,
  onClose,
}: FinanceApplicationModalProps) {
  const { isSignedIn } = useAuth();
  const [step, setStep] = React.useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dob: "",
      ssn: "",
      maritalStatus: "",
    },
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
    },
    employmentInfo: {
      employer: "",
      jobTitle: "",
      income: "",
      incomeFrequency: "Yearly" as "Yearly" | "Monthly" | "Weekly",
      yearsAtJob: "1",
    },
  });

  if (!vehicle) return null;

  const nextStep = () =>
    setStep((prev) => (prev < 5 ? prev + 1 : prev) as Step);
  const prevStep = () =>
    setStep((prev) => (prev > 1 ? prev - 1 : prev) as Step);

  const updateNestedField = (
    section: keyof typeof formData,
    field: string,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      nextStep();
      return;
    }

    if (!isSignedIn) {
      toast.error("Please sign in to submit a finance application");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.submitFinanceApplication({
        vehicleId: vehicle.id,
        personalInfo: {
          ...formData.personalInfo,
          address: formData.address,
        },
        employmentInfo: formData.employmentInfo,
      });

      setIsSuccess(true);

      setTimeout(() => {
        onClose();
        setStep(1);
        setIsSuccess(false);
      }, 3000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        "Failed to submit application. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepInfo = [
    { title: "Application Type", icon: Landmark },
    { title: "Personal Info", icon: User },
    { title: "Residence", icon: Home },
    { title: "Employment", icon: Briefcase },
    { title: "Review", icon: ShieldCheck },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-200 p-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl h-162.5 flex flex-col">
        {/* Header with Progress */}
        <div className="bg-zinc-900 text-white p-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Landmark className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Secure Credit Application</h2>
                <p className="text-xs text-zinc-400 font-medium tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-green-500" /> 256-BIT
                  ENCRYPTED & SECURE
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="flex justify-between px-2">
            {stepInfo.map((info, i) => {
              const Icon = info.icon;
              const active = step >= i + 1;
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${active ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${active ? "text-white" : "text-zinc-600"}`}
                  >
                    {info.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Left: Vehicle Sidebar */}
          <div className="hidden md:flex w-64 bg-zinc-50 dark:bg-zinc-900/50 p-6 flex-col border-r border-zinc-200 dark:border-zinc-800">
            <div className="space-y-4">
              <div className="aspect-video rounded-xl overflow-hidden shadow-sm border border-black/5">
                <img
                  src={vehicle.image}
                  alt={vehicle.model}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white">
                  {vehicle.year} {vehicle.make}
                </h4>
                <p className="text-sm text-zinc-500">{vehicle.model}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-400">Retail Price</span>
                  <span className="text-zinc-900 dark:text-zinc-200 line-through">
                    ${(vehicle.price + 995).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    VIP Price
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    ${vehicle.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl border border-black/5">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center">
                Reference #
              </p>
              <p className="text-center font-mono text-zinc-600 dark:text-zinc-300">
                AA-{vehicle.stockNumber}
              </p>
            </div>
          </div>

          {/* Right: Steps Container */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {isSuccess ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Application Submitted
                  </h3>
                  <p className="text-zinc-500 mt-2 max-w-xs mx-auto">
                    Your credit application has been securely transmitted. A
                    finance specialist will contact you shortly.
                  </p>
                </div>
                <Button
                  onClick={onClose}
                  className="px-8 font-bold text-white bg-zinc-900 dark:bg-green-600"
                >
                  Close Portal
                </Button>
              </div>
            ) : !isSignedIn ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12 px-4 shadow-inner rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
                <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-zinc-400" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">
                    Identity Required
                  </h4>
                  <p className="text-zinc-500 max-w-70 mx-auto">
                    This is a secure financial document. Please sign in to
                    verify your identity before proceeding.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    (window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`)
                  }
                  className="w-full max-w-60 h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold rounded-xl shadow-xl active:scale-[0.98] transition-all"
                >
                  <LogIn className="w-5 h-5 mr-3" />
                  Secure Login
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-8 h-full flex flex-col"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                  >
                    {/* Step 1: Type */}
                    {step === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                            Getting Started
                          </h3>
                          <p className="text-sm text-zinc-500">
                            Choose how you would like to apply for financing
                            today.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 rounded-xl border-2 border-green-500 bg-green-500/5 cursor-pointer flex items-center justify-between group transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-zinc-900 dark:text-white">
                                  Individual Application
                                </h4>
                                <p className="text-xs text-zinc-500">
                                  I am applying by myself
                                </p>
                              </div>
                            </div>
                            <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            </div>
                          </div>
                          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 cursor-pointer flex items-center justify-between group transition-all opacity-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg flex items-center justify-center">
                                <Landmark className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-zinc-900 dark:text-white">
                                  Joint Application
                                </h4>
                                <p className="text-xs text-zinc-500">
                                  Check back soon for co-borrowers
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Personal */}
                    {step === 2 && (
                      <div className="space-y-6">
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                          Personal Identification
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input
                              required
                              value={formData.personalInfo.firstName}
                              onChange={(e) =>
                                updateNestedField(
                                  "personalInfo",
                                  "firstName",
                                  e.target.value,
                                )
                              }
                              placeholder="First"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input
                              required
                              value={formData.personalInfo.lastName}
                              onChange={(e) =>
                                updateNestedField(
                                  "personalInfo",
                                  "lastName",
                                  e.target.value,
                                )
                              }
                              placeholder="Last"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                              required
                              type="email"
                              value={formData.personalInfo.email}
                              onChange={(e) =>
                                updateNestedField(
                                  "personalInfo",
                                  "email",
                                  e.target.value,
                                )
                              }
                              placeholder="email@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                              required
                              type="tel"
                              value={formData.personalInfo.phone}
                              onChange={(e) =>
                                updateNestedField(
                                  "personalInfo",
                                  "phone",
                                  e.target.value,
                                )
                              }
                              placeholder="(555) 000-0000"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Social Security Number</Label>
                          <Input
                            required
                            type="password"
                            value={formData.personalInfo.ssn}
                            onChange={(e) =>
                              updateNestedField(
                                "personalInfo",
                                "ssn",
                                e.target.value,
                              )
                            }
                            placeholder="XXX - XX - XXXX"
                            className="font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Date of Birth</Label>
                            <Input
                              required
                              type="date"
                              value={formData.personalInfo.dob}
                              onChange={(e) =>
                                updateNestedField(
                                  "personalInfo",
                                  "dob",
                                  e.target.value,
                                )
                              }
                              className="pr-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:shrink-0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Marital Status</Label>
                            <Select
                              value={formData.personalInfo.maritalStatus}
                              onValueChange={(val) =>
                                updateNestedField(
                                  "personalInfo",
                                  "maritalStatus",
                                  val,
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="s">Single</SelectItem>
                                <SelectItem value="m">Married</SelectItem>
                                <SelectItem value="d">Divorced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Residence */}
                    {step === 3 && (
                      <div className="space-y-6">
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                          Current Residence
                        </h3>
                        <div className="space-y-2">
                          <Label>Street Address</Label>
                          <Input
                            required
                            value={formData.address.street}
                            onChange={(e) =>
                              updateNestedField(
                                "address",
                                "street",
                                e.target.value,
                              )
                            }
                            placeholder="Address"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>City</Label>
                            <Input
                              required
                              value={formData.address.city}
                              onChange={(e) =>
                                updateNestedField(
                                  "address",
                                  "city",
                                  e.target.value,
                                )
                              }
                              placeholder="City"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ZIP Code</Label>
                            <Input
                              required
                              value={formData.address.zip}
                              onChange={(e) =>
                                updateNestedField(
                                  "address",
                                  "zip",
                                  e.target.value,
                                )
                              }
                              placeholder="ZIP"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input
                            required
                            value={formData.address.state}
                            onChange={(e) =>
                              updateNestedField(
                                "address",
                                "state",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. UT"
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 4: Employment */}
                    {step === 4 && (
                      <div className="space-y-6">
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                          Employment & Income
                        </h3>
                        <div className="space-y-2">
                          <Label>Employer Name</Label>
                          <Input
                            required
                            value={formData.employmentInfo.employer}
                            onChange={(e) =>
                              updateNestedField(
                                "employmentInfo",
                                "employer",
                                e.target.value,
                              )
                            }
                            placeholder="Company Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Job Title</Label>
                          <Input
                            required
                            value={formData.employmentInfo.jobTitle}
                            onChange={(e) =>
                              updateNestedField(
                                "employmentInfo",
                                "jobTitle",
                                e.target.value,
                              )
                            }
                            placeholder="Software Engineer / etc"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Annual Gross Income</Label>
                            <Input
                              required
                              value={formData.employmentInfo.income}
                              onChange={(e) =>
                                updateNestedField(
                                  "employmentInfo",
                                  "income",
                                  e.target.value,
                                )
                              }
                              placeholder="$0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Income Frequency</Label>
                            <Select
                              value={formData.employmentInfo.incomeFrequency}
                              onValueChange={(val: any) =>
                                updateNestedField(
                                  "employmentInfo",
                                  "incomeFrequency",
                                  val,
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yearly">Annually</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Review */}
                    {step === 5 && (
                      <div className="space-y-6">
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                          Identity Verification
                        </h3>
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="pt-1">
                              <ShieldCheck className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                              By submitting this application, you verify that
                              the information is correct and authorize Action
                              Auto Utah to perform a credit check. We use
                              bank-level encryption to protect your data.
                            </p>
                          </div>
                          <div className="flex items-center gap-4 p-3 bg-white dark:bg-black rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <Input
                              type="checkbox"
                              className="w-4 h-4"
                              required
                              id="consent"
                            />
                            <Label
                              htmlFor="consent"
                              className="text-xs font-bold cursor-pointer"
                            >
                              I agree to the Terms & Credit Disclosure
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-auto flex justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={prevStep}
                    disabled={step === 1 || isSubmitting}
                    className="gap-2 font-bold"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-zinc-900 dark:bg-green-600 hover:bg-zinc-800 dark:hover:bg-green-700 text-white font-bold gap-2 min-w-35"
                  >
                    {isSubmitting ? (
                      "Processing..."
                    ) : step === 5 ? (
                      "Submit Application"
                    ) : (
                      <>
                        Next Step <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
