"use client";

import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WizardForm, FormPatch, CONTACT_PREFERENCES } from "./form";

export function StepPricing({ form, patch }: { form: WizardForm; patch: FormPatch }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs">
          Asking Price (USD)<span className="text-red-500"> *</span>
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="number"
            min={1}
            placeholder="e.g. 18500"
            className="pl-9 text-base font-semibold tabular-nums"
            value={form.askingPrice}
            onChange={(e) => patch({ askingPrice: e.target.value })}
          />
        </div>
        {Number(form.askingPrice) > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums">
            You&apos;re asking {Number(form.askingPrice).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3.5">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Open to offers?</p>
          <p className="text-[10px] text-muted-foreground">Buyers will see your price is negotiable.</p>
        </div>
        <Switch checked={form.isNegotiable} onCheckedChange={(v) => patch({ isNegotiable: v })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Description<span className="text-red-500"> *</span>
        </Label>
        <Textarea
          placeholder="Tell buyers what makes your car great — how it drives, how it was maintained, recent work done, why you're selling..."
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={6}
        />
        <p className="text-[10px] text-muted-foreground">
          A detailed, honest description builds trust and speeds up review.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">How should we contact you?</Label>
        <Select
          value={form.contactPreference}
          onValueChange={(v) => patch({ contactPreference: v as WizardForm["contactPreference"] })}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_PREFERENCES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
