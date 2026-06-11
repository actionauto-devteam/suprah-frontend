"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  WizardForm,
  FormPatch,
  CONDITIONS,
  TITLE_STATUSES,
  FEATURE_OPTIONS,
} from "./form";

export function StepConditionHistory({ form, patch }: { form: WizardForm; patch: FormPatch }) {
  const toggleFeature = (feature: string) => {
    patch({
      features: form.features.includes(feature)
        ? form.features.filter((f) => f !== feature)
        : [...form.features, feature],
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs">
          Overall Condition<span className="text-red-500"> *</span>
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => patch({ condition: c.value })}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
                form.condition === c.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  form.condition === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {form.condition === c.value && <Check className="h-2.5 w-2.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{c.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{c.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">
          Title Status<span className="text-red-500"> *</span>
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TITLE_STATUSES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => patch({ titleStatus: t.value })}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
                form.titleStatus === t.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  form.titleStatus === t.value ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {form.titleStatus === t.value && <Check className="h-2.5 w-2.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Number of Owners</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 1"
            value={form.ownersCount}
            onChange={(e) => patch({ ownersCount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Number of Keys</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 2"
            value={form.keysCount}
            onChange={(e) => patch({ keysCount: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/50 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">Has it been in an accident?</p>
            <p className="text-[10px] text-muted-foreground">Be honest — this is verified during review.</p>
          </div>
          <Switch
            checked={form.hasAccidentHistory}
            onCheckedChange={(v) => patch({ hasAccidentHistory: v })}
          />
        </div>
        {form.hasAccidentHistory && (
          <Textarea
            placeholder="Describe what happened, what was repaired, and when..."
            value={form.accidentNotes}
            onChange={(e) => patch({ accidentNotes: e.target.value })}
            rows={3}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3.5">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Service records available?</p>
          <p className="text-[10px] text-muted-foreground">Maintenance history helps your car sell faster.</p>
        </div>
        <Switch
          checked={form.hasServiceHistory}
          onCheckedChange={(v) => patch({ hasServiceHistory: v })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Known Issues or Flaws</Label>
        <Textarea
          placeholder="e.g. small dent on rear bumper, AC blows warm, tires at 50%..."
          value={form.knownIssues}
          onChange={(e) => patch({ knownIssues: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Features & Options</Label>
        <div className="flex flex-wrap gap-1.5">
          {FEATURE_OPTIONS.map((feature) => {
            const active = form.features.includes(feature);
            return (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {feature}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
