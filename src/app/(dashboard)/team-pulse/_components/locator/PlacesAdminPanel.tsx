"use client";

import * as React from "react";
import { MapPin, Plus, Trash2, Pencil, Loader2, Crosshair, Search, Users, ShieldAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { haversineM } from "@/lib/geo";
import { usePlaces, useCreatePlace, useUpdatePlace, useDeletePlace, useActiveEmployeeLocations, type Place } from "@/hooks/useLocator";
import { PLACE_ICON_PRESETS as ICON_PRESETS, PLACE_ICON_NAMES as ICON_NAMES } from "./placeIcons";

const COLOR_PRESETS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface FormState {
  name: string;
  address: string;
  description: string;
  lat: string;
  lng: string;
  radiusM: number;
  warningEnabled: boolean;
  warningRadiusM: number;
  color: string;
  icon: string;
}

const EMPTY_FORM: FormState = {
  name: "", address: "", description: "", lat: "", lng: "",
  radiusM: 100, warningEnabled: false, warningRadiusM: 150,
  color: COLOR_PRESETS[0], icon: ICON_NAMES[0],
};

interface Props {
  pickMode?: boolean;
  onStartPick?: () => void;
  onCancelPick?: () => void;
  pickedCoords?: { lat: number; lng: number } | null;
  onPickConsumed?: () => void;
  onDraftChange?: (place: Place | null) => void;
}

export function PlacesAdminPanel({ pickMode, onStartPick, onCancelPick, pickedCoords, onPickConsumed, onDraftChange }: Props) {
  const { data: places = [], isLoading } = usePlaces();
  const { data: activeLocations = [] } = useActiveEmployeeLocations(true);
  const { mutate: createPlace, isPending: creating } = useCreatePlace();
  const { mutate: updatePlace, isPending: updating } = useUpdatePlace();
  const { mutate: deletePlace } = useDeletePlace();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Place | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const hereNowByPlace = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const loc of activeLocations) {
      if (loc.sharingState !== "sharing" || !loc.currentPlaceId) continue;
      counts.set(loc.currentPlaceId, (counts.get(loc.currentPlaceId) ?? 0) + 1);
    }
    return counts;
  }, [activeLocations]);

  const filteredPlaces = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) => p.name.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
  }, [places, search]);

  // Warns (does not block) when the place being created/edited would overlap an
  // existing one — two geofences fighting over the same physical spot means an
  // employee standing there could flip between "at Place A" / "at Place B" on
  // consecutive pings depending on tiny GPS jitter. Compares against the wider
  // of radiusM/warningRadiusM on both sides, since the warning ring is real
  // geofence territory too, not just a cosmetic line on the map.
  const overlappingPlaces = React.useMemo(() => {
    if (!dialogOpen) return [];
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return [];
    const myRadius = form.warningEnabled ? Math.max(form.radiusM, form.warningRadiusM) : form.radiusM;
    return places.filter((p) => {
      if (editing && p._id === editing._id) return false;
      const otherRadius = p.warningRadiusM ? Math.max(p.radiusM, p.warningRadiusM) : p.radiusM;
      const distance = haversineM({ lat, lng }, p.coords);
      return distance < myRadius + otherRadius;
    });
  }, [dialogOpen, places, editing, form.lat, form.lng, form.radiusM, form.warningEnabled, form.warningRadiusM]);

  React.useEffect(() => {
    if (!pickedCoords) return;
    setForm((f) => ({ ...f, lat: pickedCoords.lat.toFixed(6), lng: pickedCoords.lng.toFixed(6) }));
    onPickConsumed?.();
  }, [pickedCoords, onPickConsumed]);

  React.useEffect(() => {
    if (!onDraftChange) return;
    if (!dialogOpen) { onDraftChange(null); return; }
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) { onDraftChange(null); return; }
    onDraftChange({
      // Reusing the real place's own _id while editing (instead of a separate "__draft__"
      // id) makes the map's diff-in-place update swap the live-preview values onto the
      // SAME circle instead of drawing a second one on top of it — one circle that visibly
      // grows/shrinks with the slider, not two overlapping rings.
      _id: editing ? editing._id : "__draft__", organizationId: "", name: form.name || "New Place",
      coords: { lat, lng }, radiusM: form.radiusM,
      warningRadiusM: form.warningEnabled ? form.warningRadiusM : undefined,
      icon: form.icon, color: form.color,
      address: form.address, description: form.description, isActive: true, createdBy: "", createdAt: "", updatedAt: "",
    });
  }, [dialogOpen, form, editing, onDraftChange]);

  function closeDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) onCancelPick?.();
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(place: Place) {
    setEditing(place);
    setForm({
      name: place.name,
      address: place.address || "",
      description: place.description || "",
      lat: String(place.coords.lat),
      lng: String(place.coords.lng),
      radiusM: place.radiusM,
      warningEnabled: !!place.warningRadiusM,
      warningRadiusM: place.warningRadiusM || Math.round(place.radiusM * 1.5),
      color: place.color || COLOR_PRESETS[0],
      icon: place.icon || ICON_NAMES[0],
    });
    setDialogOpen(true);
  }

  function submit() {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!form.name.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Name, latitude and longitude are required");
      return;
    }

    const payload = {
      name: form.name.trim(), lat, lng, radiusM: form.radiusM, color: form.color, icon: form.icon,
      warningRadiusM: form.warningEnabled ? form.warningRadiusM : (editing?.warningRadiusM ? null : undefined),
      address: form.address.trim() || undefined,
      description: form.description.trim() || undefined,
    };

    if (editing) {
      updatePlace({ id: editing._id, ...payload }, {
        onSuccess: () => { toast.success("Place updated"); closeDialog(false); },
        onError: () => toast.error("Could not update place"),
      });
    } else {
      createPlace(payload, {
        onSuccess: () => { toast.success("Place created"); closeDialog(false); },
        onError: () => toast.error("Could not create place"),
      });
    }
  }

  function remove(id: string) {
    setDeletingId(id);
    deletePlace(id, {
      onSuccess: () => toast.success("Place removed"),
      onError: () => toast.error("Could not remove place"),
      onSettled: () => setDeletingId(null),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search places…"
            className="pl-7 h-7 text-[11px] bg-background border-border/50"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="h-7 text-[11px] font-bold gap-1 shrink-0">
          <Plus className="size-3.5" />
          Add Place
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
          <MapPin className="size-8" />
          <p className="text-xs">No places yet — add your first branch or lot</p>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
          <Search className="size-8" />
          <p className="text-xs">No places match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredPlaces.map((place) => {
            const PlaceIcon = ICON_PRESETS[place.icon || ""] || MapPin;
            const hereNow = hereNowByPlace.get(place._id) ?? 0;
            return (
            <div key={place._id} className="flex items-start gap-2.5 p-3 rounded-xl border border-border/40 bg-card">
              <div
                className="flex items-center justify-center size-8 rounded-lg shrink-0"
                style={{ backgroundColor: `${place.color || COLOR_PRESETS[0]}20` }}
              >
                <PlaceIcon className="size-4" style={{ color: place.color || COLOR_PRESETS[0] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold truncate">{place.name}</p>
                  {hereNow > 0 && (
                    <span className="flex items-center gap-0.5 text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded shrink-0">
                      <Users className="size-2.5" /> {hereNow} here
                    </span>
                  )}
                </div>
                {place.address && <p className="text-[10px] text-muted-foreground/60 truncate">{place.address}</p>}
                {place.description && <p className="text-[10px] text-muted-foreground/50 mt-0.5 line-clamp-2">{place.description}</p>}
                <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                  {place.radiusM}m radius
                  {place.warningRadiusM && <> · {place.warningRadiusM}m warning zone</>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(place)} className="text-muted-foreground/50 hover:text-foreground p-1">
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => remove(place._id)}
                  disabled={deletingId === place._id}
                  className="text-muted-foreground/50 hover:text-red-500 p-1"
                >
                  {deletingId === place._id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">{editing ? "Edit Place" : "New Place"}</DialogTitle>
            <DialogDescription className="sr-only">
              {editing ? "Edit this company place's details and geofence" : "Add a new company place and geofence"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Main Showroom" className="h-8 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Address (optional)</label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Main St" className="h-8 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Notes (optional)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 300) }))}
                placeholder="Gate code, parking instructions, hours…"
                className="text-xs min-h-16 resize-none"
              />
            </div>

            {onStartPick && (
              <Button
                type="button" size="sm" variant={pickMode ? "default" : "outline"}
                onClick={onStartPick}
                className="w-full h-8 text-[11px] font-bold gap-1.5"
              >
                <Crosshair className="size-3.5" />
                {pickMode ? "Click the live map above…" : "Pick on map"}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Latitude</label>
                <Input value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="34.0522" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Longitude</label>
                <Input value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} placeholder="-118.2437" className="h-8 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Geofence Radius</label>
                <span className="text-[10px] font-bold tabular-nums">{form.radiusM}m</span>
              </div>
              <Slider
                value={[form.radiusM]}
                min={10}
                max={1000}
                step={10}
                onValueChange={([v]) => setForm((f) => ({
                  ...f, radiusM: v,
                  warningRadiusM: Math.max(f.warningRadiusM, v + 20),
                }))}
              />
            </div>

            <div className="space-y-1.5 rounded-lg border border-border/40 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TriangleAlert className="size-3 text-amber-500" />
                  <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Warning Zone</label>
                </div>
                <Switch
                  checked={form.warningEnabled}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, warningEnabled: checked }))}
                />
              </div>
              {form.warningEnabled ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground/50">Stepping outside the radius but staying in here doesn&apos;t count as leaving yet.</p>
                    <span className="text-[10px] font-bold tabular-nums shrink-0 ml-2">{form.warningRadiusM}m</span>
                  </div>
                  <Slider
                    value={[form.warningRadiusM]}
                    min={form.radiusM + 10}
                    max={form.radiusM + 1000}
                    step={10}
                    onValueChange={([v]) => setForm((f) => ({ ...f, warningRadiusM: v }))}
                  />
                </>
              ) : (
                <p className="text-[9px] text-muted-foreground/40">Off — a small step outside the radius counts as leaving right away.</p>
              )}
            </div>

            {overlappingPlaces.length > 0 && (
              <div className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
                <ShieldAlert className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-snug">
                  Overlaps {overlappingPlaces.map((p) => p.name).join(", ")} — an employee here could flip between places on small GPS jitter.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={cn("size-6 rounded-full border-2", form.color === c ? "border-foreground" : "border-transparent")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">Icon</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ICON_NAMES.map((name) => {
                    const Icon = ICON_PRESETS[name];
                    return (
                      <button
                        key={name}
                        onClick={() => setForm((f) => ({ ...f, icon: name }))}
                        className={cn(
                          "flex items-center justify-center size-7 rounded-lg border",
                          form.icon === name ? "border-primary bg-primary/10" : "border-border/40 text-muted-foreground/60",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => closeDialog(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={creating || updating} className="h-8 text-xs font-bold">
              {creating || updating ? <Loader2 className="size-3.5 animate-spin" /> : editing ? "Save Changes" : "Create Place"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
