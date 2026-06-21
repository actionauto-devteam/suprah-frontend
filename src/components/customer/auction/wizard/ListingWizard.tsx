"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, Loader2, Save, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AuctionListing,
  fetchListing,
  createListing,
  updateListing,
  submitListing,
} from "@/lib/api/auctionListings";
import { cn } from "@/lib/utils";
import {
  WizardForm,
  EMPTY_FORM,
  hydrateForm,
  toPayload,
  getRequirements,
  stepForMissingField,
} from "./form";
import { StepVehicleInfo } from "./StepVehicleInfo";
import { StepConditionHistory } from "./StepConditionHistory";
import { StepPhotos } from "./StepPhotos";
import { StepPricing } from "./StepPricing";
import { StepReview } from "./StepReview";

const STEPS = [
  { n: 1, label: "Vehicle" },
  { n: 2, label: "Condition" },
  { n: 3, label: "Photos" },
  { n: 4, label: "Pricing" },
  { n: 5, label: "Review" },
];

const EDITABLE = ["DRAFT", "REJECTED", "WITHDRAWN"];

export function ListingWizard({ listingId: initialListingId }: { listingId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialStep = Math.min(5, Math.max(1, Number(searchParams.get("step")) || 1));
  const [listingId, setListingId] = React.useState<string | null>(initialListingId ?? null);
  const [step, setStep] = React.useState(initialListingId ? initialStep : 1);
  const [form, setForm] = React.useState<WizardForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const hydratedRef = React.useRef(false);

  const { data: listing = null, isLoading: isLoadingListing } = useQuery({
    queryKey: ["auctionListing", listingId],
    queryFn: () => fetchListing(listingId!),
    enabled: !!listingId,
  });

  React.useEffect(() => {
    if (!listing || hydratedRef.current) return;
    if (!EDITABLE.includes(listing.status)) {
      router.replace(`/customer/auction/${listing.id}`);
      return;
    }
    setForm(hydrateForm(listing));
    hydratedRef.current = true;
  }, [listing, router]);

  const patch = React.useCallback(
    (partial: Partial<WizardForm>) => setForm((f) => ({ ...f, ...partial })),
    [],
  );

  const syncUrl = (id: string, n: number) => {
    window.history.replaceState(null, "", `/customer/auction/${id}/edit?step=${n}`);
  };

  const persist = async (): Promise<AuctionListing> => {
    const payload = toPayload(form);
    if (!listingId) {
      const created = await createListing(payload);
      hydratedRef.current = true;
      setListingId(created.id);
      queryClient.setQueryData(["auctionListing", created.id], created);
      return created;
    }
    const updated = await updateListing(listingId, payload);
    queryClient.setQueryData(["auctionListing", listingId], updated);
    return updated;
  };

  const goTo = async (n: number) => {
    if (isSaving || isSubmitting || n === step) return;
    setIsSaving(true);
    try {
      const saved = await persist();
      setStep(n);
      syncUrl(saved.id, n);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save your progress");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExit = async () => {
    if (isSaving || isSubmitting) return;
    setIsSaving(true);
    try {
      await persist();
      queryClient.invalidateQueries({ queryKey: ["auctionListings"] });
      toast.success("Progress saved — finish anytime from your listings");
      router.push("/customer?tab=sell");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save your progress");
      setIsSaving(false);
    }
  };

  const requirements = React.useMemo(() => getRequirements(form, listing), [form, listing]);
  const missingCount = requirements.filter((r) => !r.done).length;

  const handleSubmit = async () => {
    if (isSaving || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const saved = await persist();
      const submitted = await submitListing(saved.id);
      queryClient.setQueryData(["auctionListing", submitted.id], submitted);
      queryClient.invalidateQueries({ queryKey: ["auctionListings"] });
      toast.success("Your car has been submitted for review!");
      router.push(`/customer/auction/${submitted.id}`);
    } catch (error: any) {
      const fields: string[] = Array.isArray(error?.response?.data?.errors)
        ? error.response.data.errors
        : [];
      if (fields.length > 0) {
        setStep(Math.min(...fields.map(stepForMissingField)));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      toast.error(error?.response?.data?.message || "Failed to submit your listing");
      setIsSubmitting(false);
    }
  };

  const isResubmit = listing?.status === "REJECTED" || listing?.status === "WITHDRAWN";
  const isBusy = isSaving || isSubmitting;
  const waitingForListing = !!listingId && !listing && isLoadingListing;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Link
          href="/customer?tab=sell"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to listings"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
            {isResubmit ? "Update Your Listing" : listingId ? "Continue Your Listing" : "Sell Your Car"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Step {step} of {STEPS.length} · {STEPS[step - 1].label}
          </p>
        </div>
      </div>

      {listing?.status === "REJECTED" && listing.rejectionReason && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/8 p-3.5 dark:bg-red-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-red-700 dark:text-red-400">This listing was rejected</p>
            <p className="text-xs text-red-700/80 dark:text-red-400/80">{listing.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div className="h-px w-3 shrink-0 bg-border sm:w-6" />}
              <button
                type="button"
                onClick={() => s.n < step && goTo(s.n)}
                disabled={s.n > step || isBusy}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                  s.n === step
                    ? "bg-foreground text-background"
                    : s.n < step
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {s.n < step ? <Check className="h-3 w-3" /> : s.n}
                </span>
                <span className="hidden xs:inline">{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
        <Progress value={(step / STEPS.length) * 100} className="h-1" />
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-4 dark:bg-zinc-900/60 sm:p-5">
        {waitingForListing ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {step === 1 && <StepVehicleInfo form={form} patch={patch} />}
            {step === 2 && <StepConditionHistory form={form} patch={patch} />}
            {step === 3 &&
              (listing ? (
                <StepPhotos listing={listing} />
              ) : (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ))}
            {step === 4 && <StepPricing form={form} patch={patch} />}
            {step === 5 && (
              <StepReview form={form} listing={listing} requirements={requirements} onJump={goTo} />
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+72px)] md:bottom-0 z-40 -mx-1 rounded-t-2xl border border-border/50 bg-background/90 backdrop-blur-md shadow-lg">
        <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 rounded-xl"
            disabled={step === 1 || isBusy}
            onClick={() => goTo(step - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl"
              disabled={isBusy}
              onClick={handleSaveExit}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Save & Exit</span>
              <span className="sm:hidden">Save</span>
            </Button>

            {step < STEPS.length ? (
              <Button
                type="button"
                size="sm"
                className="gap-1 rounded-xl"
                disabled={isBusy}
                onClick={() => goTo(step + 1)}
              >
                Next
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 rounded-xl"
                disabled={isBusy || missingCount > 0}
                onClick={handleSubmit}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {isResubmit ? "Resubmit for Review" : "Submit for Review"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
