"use client";

import * as React from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MessageSquare,
  Send,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Vehicle } from "@/types/inventory";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { LogIn, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sanitizeInput } from "@/lib/utils";

const InquirySchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name too long"),
  email: z.string().email("Invalid email address").max(100, "Email too long"),
  phone: z
    .string()
    .min(14, "Phone number must be at least 10 digits")
    .max(14, "Invalid phone format"),
  message: z.string().max(500, "Message too long").optional(),
});

type InquiryData = z.infer<typeof InquirySchema>;

function ErrorMsg({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="text-[10px] font-bold uppercase tracking-tight text-red-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
      <AlertCircle className="w-3 h-3" /> {message}
    </div>
  );
}

interface VehicleInquiryModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VehicleInquiryModal({
  vehicle,
  isOpen,
  onClose,
}: VehicleInquiryModalProps) {
  const isMobile = useIsMobile();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InquiryData>({
    resolver: zodResolver(InquirySchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  // Pre-fill user data when modal opens or user changes
  React.useEffect(() => {
    if (isSignedIn && user && isOpen) {
      setValue("firstName", user.firstName || "");
      setValue("lastName", user.lastName || "");
      setValue("email", user.primaryEmailAddress?.emailAddress || "");
    }
  }, [isSignedIn, user, isOpen, setValue]);

  if (!vehicle) return null;

  // Format Phone as user types: (XXX) XXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 10) val = val.slice(0, 10);

    let formatted = val;
    if (val.length > 6)
      formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
    else if (val.length > 3) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
    else if (val.length > 0) formatted = `(${val}`;

    setValue("phone", formatted, { shouldValidate: true });
  };

  const onSubmit = async (data: InquiryData) => {
    if (!isSignedIn) {
      toast.error("Please sign in to submit an inquiry");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.submitInquiry({
        vehicleId: vehicle.id,
        comments: sanitizeInput(data.message || ""),
        firstName: sanitizeInput(data.firstName),
        lastName: sanitizeInput(data.lastName),
        email: sanitizeInput(data.email),
        phone: sanitizeInput(data.phone),
      });

      setIsSuccess(true);

      // Auto close after 3 seconds on success
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 3000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send inquiry. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl",
          isMobile
            ? "inset-x-0 top-auto left-0 bottom-16 translate-x-0 translate-y-0 max-w-none rounded-b-none rounded-t-2xl border-x-0 border-b-0 h-[calc(100dvh-4rem)]"
            : "sm:max-w-[700px] max-h-[90dvh]",
        )}
      >
        <DialogHeader className="bg-zinc-900 text-white p-4 md:p-6 shrink-0">
          <DialogTitle className="text-2xl font-bold text-center tracking-tight">
            Check Availability
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close availability inquiry"
            className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="flex flex-col md:flex-row min-h-0 h-full overflow-hidden">
          {/* Left side: Vehicle Summary */}
          <div className="w-full md:w-5/12 bg-zinc-50 dark:bg-zinc-900/50 p-4 md:p-6 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-md border border-white/20">
                <img
                  src={vehicle.image}
                  alt={`${vehicle.year} ${vehicle.make}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white leading-tight">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-zinc-500 font-medium">{vehicle.trim}</p>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Price
                </p>
                <p className="text-3xl font-black text-green-600 dark:text-green-400">
                  ${vehicle.price.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-400">Stock #</span>
                  <span className="text-zinc-900 dark:text-zinc-200">
                    {vehicle.stockNumber}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-400">VIN</span>
                  <span className="text-zinc-900 dark:text-zinc-200 font-mono">
                    {vehicle.vin}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Inquiry Form */}
          <div className="w-full md:w-7/12 p-4 md:p-8 min-h-0 overflow-y-auto pb-24 md:pb-8">
            {isSuccess ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center text-center space-y-4 py-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Inquiry Sent!
                </h4>
                <p className="text-zinc-500">
                  A specialist will check availability and get back to you
                  shortly.
                </p>
              </div>
            ) : !isSignedIn ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center text-center space-y-6 py-12 px-4 shadow-inner rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
                <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-400" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    Login Required
                  </h4>
                  <p className="text-sm text-zinc-500 max-w-[240px] mx-auto">
                    Please sign in to your ActionAuto account to process this
                    secure inquiry.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    (window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`)
                  }
                  className="w-full max-w-[200px] h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl shadow-lg border-b-4 border-zinc-700 dark:border-zinc-300 active:border-b-0 active:translate-y-1 transition-all"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 mb-2">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-400 uppercase tracking-widest mb-1">
                    Authenticated Account
                  </p>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Please confirm or update your contact details below so the
                    dealer can reach you.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="firstName"
                      className="text-xs font-bold uppercase tracking-wider text-zinc-500"
                    >
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        id="firstName"
                        {...register("firstName")}
                        placeholder="First Name"
                        maxLength={50}
                        className="pl-10 h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                    <ErrorMsg message={errors.firstName?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-xs font-bold uppercase tracking-wider text-zinc-500"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      placeholder="Last Name"
                      maxLength={50}
                      className="h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500/50"
                    />
                    <ErrorMsg message={errors.lastName?.message} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold uppercase tracking-wider text-zinc-500"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="email@example.com"
                        maxLength={100}
                        className="pl-10 h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                    <ErrorMsg message={errors.email?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="phone"
                      className="text-xs font-bold uppercase tracking-wider text-zinc-500"
                    >
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        onChange={handlePhoneChange}
                        placeholder="(555) 000-0000"
                        maxLength={14}
                        className="pl-10 h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                    <ErrorMsg message={errors.phone?.message} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="message"
                    className="text-xs font-bold uppercase tracking-wider text-zinc-500"
                  >
                    Message (Optional)
                  </Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Textarea
                      id="message"
                      {...register("message")}
                      placeholder="I'm interested in this vehicle. Is it still available?"
                      maxLength={500}
                      className="pl-10 min-h-[80px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 resize-none focus:ring-2 focus:ring-green-500/50"
                    />
                  </div>
                  <ErrorMsg message={errors.message?.message} />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-green-600 dark:hover:bg-green-700 font-bold text-lg shadow-lg active:scale-[0.98] transition-all"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Inquiry
                    </div>
                  )}
                </Button>
                <p className="text-[10px] text-zinc-400 text-center uppercase tracking-widest font-medium pt-2">
                  Secure & Private Inquiries
                </p>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
