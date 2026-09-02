'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Truck, Save, Wrench, Hash, Ruler, Calendar, Star, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { DriverProfile } from '@/types/driver-profile';
import { trailerTypeOptions, specialFeatureOptions } from './driver-profile-constants';
import { cn } from '@/lib/utils';

interface EquipmentTabProps {
  profile: DriverProfile | null;
  onSave: (data: any) => Promise<void>;
}

export const EquipmentTab: React.FC<EquipmentTabProps> = ({ profile, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [trailerType, setTrailerType] = useState(profile?.trailerType || '');
  const [maxVehicleCapacity, setMaxVehicleCapacity] = useState(profile?.maxVehicleCapacity || 1);
  const [truckMake, setTruckMake] = useState(profile?.truckMake || '');
  const [truckModel, setTruckModel] = useState(profile?.truckModel || '');
  const [truckYear, setTruckYear] = useState<number | undefined>(profile?.truckYear);
  const [trailerLength, setTrailerLength] = useState<number | undefined>(profile?.trailerLength);
  const [dotNumber, setDotNumber] = useState(profile?.dotNumber || '');
  const [mcNumber, setMcNumber] = useState(profile?.mcNumber || '');
  const [features, setFeatures] = useState<string[]>(profile?.specialFeatures || []);

  const toggleFeature = (val: string) => {
    setFeatures(prev => prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        trailerType: trailerType || undefined,
        maxVehicleCapacity: trailerType ? maxVehicleCapacity : undefined,
        truckMake: truckMake.trim(),
        truckModel: truckModel.trim(),
        truckYear: truckYear || undefined,
        trailerLength: trailerLength || undefined,
        dotNumber: dotNumber.trim(),
        mcNumber: mcNumber.trim(),
        specialFeatures: features,
      });
      toast.success('Equipment saved');
    } catch {
      toast.error('Failed to save equipment');
    } finally {
      setSaving(false);
    }
  };

  const selectedTrailer = trailerTypeOptions.find(t => t.value === trailerType);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Truck className="size-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Trailer & Equipment</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your trailer type determines which loads you see</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trailer Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trailerTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTrailerType(opt.value)}
                  className={cn(
                    "flex flex-col p-3 rounded-xl border-2 transition-all text-left",
                    trailerType === opt.value
                      ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    {trailerType === opt.value && <CheckCircle2 className="size-4 text-emerald-500" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</span>
                  <Badge variant="outline" className="mt-1.5 text-[10px] w-fit">{opt.capacity}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Hash className="size-3" /> Max Vehicle Capacity
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={maxVehicleCapacity}
                  onChange={(e) => setMaxVehicleCapacity(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={!trailerType}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  {selectedTrailer
                    ? `vehicles (${selectedTrailer.capacity})`
                    : 'Select a trailer type first'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Ruler className="size-3" /> Trailer Length (ft)
              </Label>
              <Input
                type="number"
                min={0}
                max={80}
                value={trailerLength || ''}
                onChange={(e) => setTrailerLength(parseInt(e.target.value) || undefined)}
                placeholder="e.g. 53"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Wrench className="size-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Truck Details</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your truck and authority information</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Make</Label>
              <Input value={truckMake} onChange={(e) => setTruckMake(e.target.value)} placeholder="e.g. Peterbilt" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Model</Label>
              <Input value={truckModel} onChange={(e) => setTruckModel(e.target.value)} placeholder="e.g. 389" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3" /> Year
              </Label>
              <Input
                type="number"
                min={1990}
                max={2030}
                value={truckYear || ''}
                onChange={(e) => setTruckYear(parseInt(e.target.value) || undefined)}
                placeholder="e.g. 2024"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DOT Number</Label>
              <Input value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} placeholder="e.g. 1234567" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">MC Number</Label>
              <Input value={mcNumber} onChange={(e) => setMcNumber(e.target.value)} placeholder="e.g. MC-123456" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Star className="size-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Special Features</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Capabilities that make your rig stand out</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {specialFeatureOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleFeature(opt.value)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left text-sm font-medium",
                  features.includes(opt.value)
                    ? "border-violet-500 bg-violet-500/5 text-violet-700 dark:text-violet-400"
                    : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                {features.includes(opt.value) && <CheckCircle2 className="size-3.5 text-violet-500 shrink-0" />}
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Equipment
        </Button>
      </div>
    </div>
  );
};