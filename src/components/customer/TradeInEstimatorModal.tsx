"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, TrendingDown, MessageCircle, Car, Gavel, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface TradeInEstimatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type Condition = "Excellent" | "Good" | "Fair" | "Poor";
type TitleStatus = "Clean" | "Rebuilt" | "Salvage" | "Lien";

const CONDITION_OPTIONS: Array<{ value: Condition; label: string; desc: string }> = [
  { value: "Excellent", label: "Excellent", desc: "Like new, no damage" },
  { value: "Good",      label: "Good",      desc: "Minor wear, runs great" },
  { value: "Fair",      label: "Fair",      desc: "Noticeable wear or repairs needed" },
  { value: "Poor",      label: "Poor",      desc: "Major repairs required" },
];

const TITLE_OPTIONS: Array<{ value: TitleStatus; label: string }> = [
  { value: "Clean", label: "Clean title" },
  { value: "Rebuilt", label: "Rebuilt title" },
  { value: "Salvage", label: "Salvage title" },
  { value: "Lien", label: "Active lien" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);

function calculateEstimate(
  year: number,
  mileage: number,
  condition: Condition,
  titleStatus: TitleStatus,
  hasAccidentHistory: boolean,
): { low: number; high: number } {
  const age = Math.max(0, CURRENT_YEAR - year);

  const baseMsrp =
    age <= 2 ? 38000 :
    age <= 5 ? 30000 :
    age <= 10 ? 22000 :
    age <= 15 ? 14000 : 8000;

  const depreciated = baseMsrp * Math.pow(1 - 0.175, age);

  const expectedMileage = age * 12000;
  const excessMileage = Math.max(0, mileage - expectedMileage);
  const mileagePenalty = excessMileage * 0.06;

  const conditionMultipliers: Record<Condition, number> = {
    Excellent: 1.05,
    Good:      1.00,
    Fair:      0.83,
    Poor:      0.65,
  };

  // Title issues and accident history hit resale value independently of
  // general "condition" — a salvage-title car in excellent cosmetic shape
  // is still worth far less than a clean-title equivalent.
  const titleMultipliers: Record<TitleStatus, number> = {
    Clean:   1.00,
    Lien:    1.00, // a lien just means payoff is deducted from proceeds, not a value hit
    Rebuilt: 0.75,
    Salvage: 0.40,
  };
  const accidentMultiplier = hasAccidentHistory ? 0.88 : 1.00;

  const adjusted = Math.max(
    300,
    (depreciated - mileagePenalty) * conditionMultipliers[condition] * titleMultipliers[titleStatus] * accidentMultiplier,
  );

  // Wider band than a typical "real" appraisal tool on purpose — this estimator
  // has no access to live market comps, so we'd rather be honest about the
  // uncertainty than imply false precision.
  const low  = Math.max(300, Math.round((adjusted * 0.85) / 100) * 100);
  const high = Math.max(low + 200, Math.round((adjusted * 1.15) / 100) * 100);

  return { low, high };
}

export function TradeInEstimatorModal({ isOpen, onOpenChange }: TradeInEstimatorModalProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [year, setYear] = React.useState<string>(String(CURRENT_YEAR - 3));
  const [make, setMake] = React.useState("");
  const [model, setModel] = React.useState("");
  const [mileage, setMileage] = React.useState("");
  const [condition, setCondition] = React.useState<Condition>("Good");
  const [titleStatus, setTitleStatus] = React.useState<TitleStatus>("Clean");
  const [hasAccidentHistory, setHasAccidentHistory] = React.useState(false);

  const estimate = React.useMemo(() => {
    if (step !== 2) return null;
    return calculateEstimate(Number(year), Number(mileage) || 0, condition, titleStatus, hasAccidentHistory);
  }, [step, year, mileage, condition, titleStatus, hasAccidentHistory]);

  const step1Valid = year && make.trim() && model.trim() && mileage;

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setMake(""); setModel(""); setMileage("");
      setCondition("Good");
      setTitleStatus("Clean");
      setHasAccidentHistory(false);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <TrendingDown className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Trade-In Value Estimator</DialogTitle>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-1">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  s <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {step === 1 ? "Step 1 of 2 — Tell us about your vehicle" : "Step 2 of 2 — Your Estimate"}
          </p>
        </DialogHeader>

        {/* ── Step 1: Vehicle info + condition ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mileage</Label>
                <Input
                  type="number"
                  placeholder="e.g. 45,000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Make</Label>
                <Input
                  placeholder="e.g. Toyota"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input
                  placeholder="e.g. Camry"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Overall Condition</Label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITION_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondition(c.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-all",
                      condition === c.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/40 hover:border-primary/40",
                    )}
                  >
                    <p className={cn("text-sm font-bold", condition === c.value ? "text-primary" : "text-foreground")}>
                      {c.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title Status</Label>
                <Select value={titleStatus} onValueChange={(v) => setTitleStatus(v as TitleStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TITLE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Accident History</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHasAccidentHistory(false)}
                    className={cn(
                      "h-9 rounded-md border text-xs font-semibold transition-all",
                      !hasAccidentHistory ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasAccidentHistory(true)}
                    className={cn(
                      "h-9 rounded-md border text-xs font-semibold transition-all",
                      hasAccidentHistory ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Heads up — this tool only gives a rough, automated ballpark. It&apos;s not an appraisal and not a guaranteed offer.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Get My Estimate <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Result ───────────────────────────────────────────────── */}
        {step === 2 && estimate && (
          <div className="space-y-4 mt-2">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Car className="h-4 w-4 text-primary/60" />
                <p className="text-xs font-semibold text-muted-foreground">
                  {year} {make} {model} · {Number(mileage).toLocaleString()} mi · {condition}
                </p>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                Rough Estimated Range
              </p>
              <p className="text-4xl font-black text-foreground tabular-nums">
                ${estimate.low.toLocaleString()}
                <span className="text-muted-foreground font-normal text-2xl mx-2">–</span>
                ${estimate.high.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {titleStatus !== "Clean" && `${titleStatus} title`}
                {titleStatus !== "Clean" && hasAccidentHistory && " · "}
                {hasAccidentHistory && "Reported accident history"}
                {(titleStatus !== "Clean" || hasAccidentHistory) && " factored in"}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>This is not an appraisal and not a real offer.</strong> It&apos;s a rough, automated estimate from the few details you entered — it does not see your car, its true condition, or live market comps. The actual trade-in value can only be confirmed in person by our team, and may come in higher or lower than this range.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/customer/support" onClick={() => onOpenChange(false)}>
                <Button className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Start a Trade-In Inquiry
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Edit Info
                </Button>
                <Button variant="outline" onClick={resetAndClose}>
                  Close
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
                Want more than an estimate? List your car in our Auction Marketplace and let real buyers make offers on it.
              </p>
              <Link href="/customer/auction/new" onClick={() => onOpenChange(false)}>
                <Button variant="outline" className="w-full gap-2">
                  <Gavel className="h-3.5 w-3.5" />
                  Sell It in the Auction Listing
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
