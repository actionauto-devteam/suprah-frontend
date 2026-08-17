'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, MapPin, Save, Navigation, Route, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { DriverProfile } from '@/types/driver-profile';
import { operationalStatusOptions, US_STATES, AVAILABLE_DAYS } from './driver-profile-constants';
import { PreferredRoutesEditor } from './PreferredRoutesEditor';
import { cn } from '@/lib/utils';

interface LogisticsTabProps {
  profile: DriverProfile | null;
  onSave: (data: any) => Promise<void>;
}

export const LogisticsTab: React.FC<LogisticsTabProps> = ({ profile, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [opStatus, setOpStatus] = useState(profile?.operationalStatus || 'active');
  const [address, setAddress] = useState(profile?.homeBase?.address || '');
  const [city, setCity] = useState(profile?.homeBase?.city || '');
  const [state, setState] = useState(profile?.homeBase?.state || '');
  const [zip, setZip] = useState(profile?.homeBase?.zip || '');
  const [radius, setRadius] = useState(profile?.serviceRadius || 500);
  const [routes, setRoutes] = useState<string[]>(profile?.preferredRoutes || []);
  const [days, setDays] = useState<string[]>(profile?.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  const toggleDay = (d: string) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        operationalStatus: opStatus,
        homeBase: { address: address.trim(), city: city.trim(), state, zip: zip.trim() },
        serviceRadius: radius,
        preferredRoutes: routes,
        availableDays: days,
      });
      toast.success('Logistics saved');
    } catch {
      toast.error('Failed to save logistics');
    } finally {
      setSaving(false);
    }
  };

  const currentStatus = operationalStatusOptions.find(s => s.value === opStatus);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Navigation className="size-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Work Availability</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Set whether you are available for new dispatch work</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {operationalStatusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOpStatus(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  opStatus === opt.value
                    ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className={cn("size-4 rounded-full", opt.color)} />
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{opt.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MapPin className="size-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Home Base</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your base location for load matching and return trips</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Street Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Salt Lake City" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ZIP Code</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="84101" maxLength={10} />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Radius</Label>
              <span className="text-sm font-bold text-emerald-600">{radius} miles</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={25}
              max={3000}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>25 mi</span>
              <span>3,000 mi</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Calendar className="size-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Availability</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your regular working schedule</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
                    days.includes(d.value)
                      ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
              <div className="flex items-center gap-1.5"><Route className="size-3" /> Preferred Routes</div>
            </Label>
            <PreferredRoutesEditor
              routes={routes}
              onChange={setRoutes}
              defaultFromState={state}
              defaultFromCity={city}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Logistics
        </Button>
      </div>
    </div>
  );
};