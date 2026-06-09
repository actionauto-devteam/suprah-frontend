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
import { ArrowRight, ArrowLeft, TrendingDown, MessageCircle, Car } from "lucide-react";
import Link from "next/link";

interface TradeInEstimatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type Condition = "Excellent" | "Good" | "Fair" | "Poor";

const CONDITION_OPTIONS: Array<{ value: Condition; label: string; desc: string }> = [
  { value: "Excellent", label: "Excellent", desc: "Like new, no damage" },
  { value: "Good",      label: "Good",      desc: "Minor wear, runs great" },
  { value: "Fair",      label: "Fair",      desc: "Noticeable wear or repairs needed" },
  { value: "Poor",      label: "Poor",      desc: "Major repairs required" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);

function calculateEstimate(
  year: number,
  mileage: number,
  condition: Condition,
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

  const adjusted = Math.max(500, (depreciated - mileagePenalty) * conditionMultipliers[condition]);

  const low  = Math.max(500, Math.round((adjusted * 0.90) / 500) * 500);
  const high = Math.max(low + 500, Math.round((adjusted * 1.10) / 500) * 500);

  return { low, high };
}

export function TradeInEstimatorModal({ isOpen, onOpenChange }: TradeInEstimatorModalProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [year, setYear] = React.useState<string>(String(CURRENT_YEAR - 3));
  const [make, setMake] = React.useState("");
  const [model, setModel] = React.useState("");
  const [mileage, setMileage] = React.useState("");
  const [condition, setCondition] = React.useState<Condition>("Good");

  const estimate = React.useMemo(() => {
    if (step !== 2) return null;
    return calculateEstimate(Number(year), Number(mileage) || 0, condition);
  }, [step, year, mileage, condition]);

  const step1Valid = year && make.trim() && model.trim() && mileage;

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setMake(""); setModel(""); setMileage("");
      setCondition("Good");
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
                Estimated Trade-In Value
              </p>
              <p className="text-4xl font-black text-foreground tabular-nums">
                ${estimate.low.toLocaleString()}
                <span className="text-muted-foreground font-normal text-2xl mx-2">–</span>
                ${estimate.high.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on current market conditions for your vehicle
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed text-center">
                This is a rough estimate for guidance. Actual trade-in value is confirmed at time of inspection by our team — it could be higher!
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
