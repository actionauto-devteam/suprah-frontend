"use client";

import * as React from "react";
import { Camera, CameraOff, ImageUp, Loader2, PencilLine, RotateCcw, ScanBarcode, ShieldCheck, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  emptyLicenseFields,
  formatLicenseAddress,
  parseAamvaNameAddress,
  type LicenseField,
  type LicenseNameAddress,
} from "@/lib/driverLicense/aamva";
import {
  decodeLicenseBarcode,
  imageDataFromFile,
  imageDataFromVideo,
  preloadLicenseDecoder,
} from "@/lib/driverLicense/decodeLicenseBarcode";

export interface LicenseCurrentValues {
  firstName: string;
  lastName: string;
  address: string;
}

export interface LicenseAppliedValues {
  firstName?: string;
  lastName?: string;
  address?: string;
}

type Phase = "intro" | "starting" | "denied" | "unavailable" | "scanning" | "processing" | "no-barcode" | "unsupported" | "error" | "review";
type Target = "firstName" | "lastName" | "address";
type Choice = "keep" | "use";

interface DriverLicenseScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: LicenseCurrentValues;
  onApply: (values: LicenseAppliedValues) => void;
  saveHint: string;
}

const FIELD_LABELS: Record<LicenseField, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  street: "Street address",
  city: "City",
  state: "State",
  postalCode: "ZIP code",
};

const TARGET_LABELS: Record<Target, string> = {
  firstName: "First name",
  lastName: "Last name",
  address: "Address",
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const proposedValues = (fields: LicenseNameAddress, includeMiddle: boolean): Record<Target, string> => ({
  firstName: [fields.firstName.trim(), includeMiddle ? fields.middleName.trim() : ""].filter(Boolean).join(" "),
  lastName: fields.lastName.trim(),
  address: formatLicenseAddress(fields),
});

const defaultChoices = (current: LicenseCurrentValues, proposed: Record<Target, string>): Record<Target, Choice> => {
  const pick = (target: Target): Choice => (current[target].trim() && !same(current[target], proposed[target]) ? "keep" : "use");
  return { firstName: pick("firstName"), lastName: pick("lastName"), address: pick("address") };
};

const cameraErrorPhase = (error: unknown): Phase => {
  const name = (error as { name?: string } | null)?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  return "unavailable";
};

export function DriverLicenseScanDialog({ open, onOpenChange, current, onApply, saveHint }: DriverLicenseScanDialogProps) {
  const ids = React.useId();
  const [phase, setPhase] = React.useState<Phase>("intro");
  const [consent, setConsent] = React.useState(false);
  const [fields, setFields] = React.useState<LicenseNameAddress>(emptyLicenseFields);
  const [missing, setMissing] = React.useState<LicenseField[]>([]);
  const [fromScan, setFromScan] = React.useState(false);
  const [includeMiddle, setIncludeMiddle] = React.useState(false);
  const [choices, setChoices] = React.useState<Record<Target, Choice>>({ firstName: "use", lastName: "use", address: "use" });
  const [slowHint, setSlowHint] = React.useState(false);
  const [cameraBusy, setCameraBusy] = React.useState(false);
  const [errorText, setErrorText] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const hintRef = React.useRef<number | null>(null);
  const runRef = React.useRef(0);
  const currentRef = React.useRef(current);

  React.useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const stopCamera = React.useCallback(() => {
    runRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (hintRef.current !== null) window.clearTimeout(hintRef.current);
    timerRef.current = null;
    hintRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const reset = React.useCallback(() => {
    stopCamera();
    setPhase("intro");
    setConsent(false);
    setFields(emptyLicenseFields());
    setMissing([]);
    setFromScan(false);
    setIncludeMiddle(false);
    setSlowHint(false);
    setCameraBusy(false);
    setErrorText("");
    if (fileRef.current) fileRef.current.value = "";
  }, [stopCamera]);

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  React.useEffect(() => {
    if (open) preloadLicenseDecoder().catch(() => undefined);
  }, [open]);

  const openReview = React.useCallback((next: LicenseNameAddress, nextMissing: LicenseField[], scanned: boolean) => {
    setFields(next);
    setMissing(nextMissing);
    setFromScan(scanned);
    setIncludeMiddle(false);
    setChoices(defaultChoices(currentRef.current, proposedValues(next, false)));
    setPhase("review");
  }, []);

  const handlePayload = React.useCallback(
    (payload: string) => {
      const parsed = parseAamvaNameAddress(payload);
      if (parsed.status === "unsupported") {
        setPhase("unsupported");
        return;
      }
      openReview(parsed.fields, parsed.missing, true);
    },
    [openReview],
  );

  const failDecoder = React.useCallback(() => {
    stopCamera();
    setErrorText("The scanner couldn't start on this device. Try again, or enter the details by hand.");
    setPhase("error");
  }, [stopCamera]);

  const startCamera = async () => {
    stopCamera();
    setSlowHint(false);
    setCameraBusy(false);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unavailable");
      return;
    }
    const run = runRef.current;
    setPhase("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
    } catch (error) {
      if (run !== runRef.current) return;
      setCameraBusy((error as { name?: string } | null)?.name === "NotReadableError");
      setPhase(cameraErrorPhase(error));
      return;
    }
    if (run !== runRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    setPhase("scanning");
  };

  React.useEffect(() => {
    if (phase !== "scanning") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    const run = runRef.current;
    video.srcObject = stream;
    video.play().catch(() => undefined);
    hintRef.current = window.setTimeout(() => setSlowHint(true), 20000);
    const tick = async () => {
      if (run !== runRef.current) return;
      try {
        const frame = video.readyState >= 2 ? imageDataFromVideo(video) : null;
        const text = frame ? await decodeLicenseBarcode(frame) : null;
        if (run !== runRef.current) return;
        if (text) {
          stopCamera();
          handlePayload(text);
          return;
        }
      } catch {
        if (run === runRef.current) failDecoder();
        return;
      }
      timerRef.current = window.setTimeout(tick, 250);
    };
    timerRef.current = window.setTimeout(tick, 400);
  }, [phase, stopCamera, handlePayload, failDecoder]);

  const chooseFile = () => {
    stopCamera();
    fileRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      setErrorText("Choose a photo of the license, such as a JPG or PNG.");
      setPhase("error");
      return;
    }
    stopCamera();
    const run = runRef.current;
    setPhase("processing");
    let frames: ImageData[] = [];
    try {
      frames = await imageDataFromFile(file);
    } catch {
      if (run !== runRef.current) return;
      setErrorText("This photo couldn't be opened here. Try a JPG or PNG photo.");
      setPhase("error");
      return;
    }
    try {
      let text: string | null = null;
      for (const frame of frames) {
        text = await decodeLicenseBarcode(frame);
        if (text) break;
      }
      if (run !== runRef.current) return;
      if (text) handlePayload(text);
      else setPhase("no-barcode");
    } catch {
      if (run === runRef.current) failDecoder();
    }
  };

  const enterManually = () => {
    stopCamera();
    openReview(emptyLicenseFields(), [], false);
  };

  const proposed = proposedValues(fields, includeMiddle);
  const changes = (Object.keys(TARGET_LABELS) as Target[]).map((target) => {
    const now = current[target].trim();
    const next = proposed[target];
    const conflict = Boolean(now && next && !same(now, next));
    const applies = Boolean(next) && !same(now, next) && (!now || choices[target] === "use");
    return { target, now, next, conflict, applies };
  });
  const pending = changes.filter((change) => change.applies);

  const apply = () => {
    const values: LicenseAppliedValues = {};
    for (const change of pending) values[change.target] = change.next;
    onApply(values);
    onOpenChange(false);
  };

  const updateField = (field: LicenseField, value: string) => setFields((previous) => ({ ...previous, [field]: value }));

  const scanning = phase === "starting" || phase === "scanning";
  const actionClass = "h-11 sm:h-10";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[200] w-[calc(100vw-1rem)] max-w-lg gap-3 p-4 sm:max-w-lg sm:p-6"
        overlayClassName="z-[200]"
        data-testid="license-scan-dialog"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {phase === "review" ? "Check the details" : "Scan driver's license"}
          </DialogTitle>
          <DialogDescription>
            {phase === "review"
              ? fromScan
                ? "Read from the license barcode. Fix anything that looks wrong before adding it."
                : "Type the customer's name and address."
              : "Fill in the customer's name and address from the barcode on the back of their license."}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void handleFile(event)}
          data-testid="license-file-input"
        />

        {phase === "intro" && (
          <div className="space-y-3">
            <div className="flex gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-[13px] leading-snug">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p>
                The license is read on this device only. Only the name and address you confirm are kept. The photo, license number, and
                date of birth are never saved or uploaded.
              </p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-[13px] leading-snug">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span>The customer agreed to have their license scanned.</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" className={actionClass} disabled={!consent} onClick={() => void startCamera()}>
                <Camera className="h-4 w-4" />
                Use camera
              </Button>
              <Button type="button" variant="outline" className={actionClass} disabled={!consent} onClick={chooseFile}>
                <ImageUp className="h-4 w-4" />
                Upload photo
              </Button>
            </div>
            <Button type="button" variant="ghost" className="h-10 w-full text-muted-foreground" onClick={enterManually}>
              <PencilLine className="h-4 w-4" />
              Enter details by hand
            </Button>
          </div>
        )}

        {scanning && (
          <div className="space-y-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
                aria-label="Camera view for the license barcode"
              />
              <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-[34%] -translate-y-1/2 rounded-md border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              {phase === "starting" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center text-sm text-white">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Opening the camera…</span>
                  <span className="text-xs text-white/75">Allow camera access if your browser asks.</span>
                </div>
              )}
            </div>
            <p role="status" aria-live="polite" className="text-[13px] leading-snug text-muted-foreground">
              {phase === "scanning"
                ? slowHint
                  ? "Still looking. Move closer so the barcode fills the box, avoid glare, and hold steady, or upload a photo instead."
                  : "Point the camera at the barcode on the back of the license and hold it steady inside the box."
                : "Starting the camera…"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className={actionClass} onClick={() => { stopCamera(); setPhase("intro"); }}>
                Cancel
              </Button>
              <Button type="button" variant="outline" className={actionClass} onClick={chooseFile}>
                <ImageUp className="h-4 w-4" />
                Upload photo
              </Button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            Photo selected. Reading the barcode…
          </div>
        )}

        {(phase === "denied" || phase === "unavailable" || phase === "no-barcode" || phase === "unsupported" || phase === "error") && (
          <div className="space-y-3">
            <div role="alert" className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] p-3 text-[13px] leading-snug">
              {phase === "denied" || phase === "unavailable" ? (
                <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <p>
                {phase === "denied" &&
                  "Camera access is blocked. Allow the camera for this site in your browser settings, or upload a photo of the barcode instead."}
                {phase === "unavailable" &&
                  (cameraBusy
                    ? "The camera is being used by another app. Close it and try again, or upload a photo instead."
                    : "No camera is available here. Upload a photo of the barcode instead.")}
                {phase === "no-barcode" &&
                  "We couldn't read a barcode. Make sure the whole barcode on the back of the license is in the photo, in focus, and free of glare."}
                {phase === "unsupported" &&
                  "This barcode isn't a supported driver's license. Only US and Canadian licenses and ID cards with the standard barcode can be read."}
                {phase === "error" && errorText}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {phase !== "unavailable" && (
                <Button type="button" className={actionClass} onClick={() => (phase === "denied" ? void startCamera() : setPhase("intro"))}>
                  <RotateCcw className="h-4 w-4" />
                  Try again
                </Button>
              )}
              <Button type="button" variant="outline" className={actionClass} onClick={chooseFile}>
                <ImageUp className="h-4 w-4" />
                Upload photo
              </Button>
            </div>
            <Button type="button" variant="ghost" className="h-10 w-full text-muted-foreground" onClick={enterManually}>
              <PencilLine className="h-4 w-4" />
              Enter details by hand
            </Button>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-3">
            {fromScan && missing.length > 0 && (
              <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/[0.08] p-3 text-[13px] leading-snug">
                Some details weren&apos;t on the barcode: {missing.map((field) => FIELD_LABELS[field]).join(", ")}. Fill them in if you have them.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {(["firstName", "lastName"] as LicenseField[]).map((field) => (
                <div key={field} className="min-w-0 space-y-1">
                  <Label htmlFor={`${ids}-${field}`} className="text-xs">{FIELD_LABELS[field]}</Label>
                  <Input id={`${ids}-${field}`} value={fields[field]} onChange={(event) => updateField(field, event.target.value)} className="h-10 text-base sm:text-sm" />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${ids}-middleName`} className="text-xs">Middle name</Label>
              <Input id={`${ids}-middleName`} value={fields.middleName} onChange={(event) => updateField("middleName", event.target.value)} className="h-10 text-base sm:text-sm" />
              {fields.middleName.trim() && (
                <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={includeMiddle} onChange={(event) => setIncludeMiddle(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                  Add the middle name to the first name (the CRM has no separate middle name field)
                </label>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${ids}-street`} className="text-xs">Street address</Label>
              <Input id={`${ids}-street`} value={fields.street} onChange={(event) => updateField("street", event.target.value)} className="h-10 text-base sm:text-sm" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]">
              <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
                <Label htmlFor={`${ids}-city`} className="text-xs">City</Label>
                <Input id={`${ids}-city`} value={fields.city} onChange={(event) => updateField("city", event.target.value)} className="h-10 text-base sm:text-sm" autoComplete="off" />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor={`${ids}-state`} className="text-xs">State</Label>
                <Input id={`${ids}-state`} value={fields.state} maxLength={2} onChange={(event) => updateField("state", event.target.value.toUpperCase())} className="h-10 text-base uppercase sm:text-sm" autoComplete="off" />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor={`${ids}-postalCode`} className="text-xs">ZIP code</Label>
                <Input id={`${ids}-postalCode`} value={fields.postalCode} maxLength={10} onChange={(event) => updateField("postalCode", event.target.value)} className="h-10 text-base sm:text-sm" autoComplete="off" />
              </div>
            </div>

            <div className="rounded-lg border" data-testid="license-changes">
              <p className="border-b px-3 py-2 text-xs font-semibold">What will change</p>
              <ul className="divide-y">
                {changes.map((change) => (
                  <li key={change.target} className="space-y-1.5 px-3 py-2 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{TARGET_LABELS[change.target]}</span>
                      {!change.next ? (
                        <span className="text-xs text-muted-foreground">Nothing to add</span>
                      ) : same(change.now, change.next) ? (
                        <span className="text-xs text-muted-foreground">No change</span>
                      ) : !change.now ? (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Will be added</span>
                      ) : null}
                    </div>
                    {change.next && !same(change.now, change.next) && (
                      <div className="grid gap-1 text-xs">
                        {change.now && (
                          <p className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">
                            Now: <span className="text-foreground">{change.now}</span>
                          </p>
                        )}
                        <p className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">
                          New: <span className="text-foreground">{change.next}</span>
                        </p>
                      </div>
                    )}
                    {change.conflict && (
                      <div role="radiogroup" aria-label={`${TARGET_LABELS[change.target]} choice`} className="grid grid-cols-2 gap-1.5">
                        {(["keep", "use"] as Choice[]).map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            role="radio"
                            aria-checked={choices[change.target] === choice}
                            onClick={() => setChoices((previous) => ({ ...previous, [change.target]: choice }))}
                            className={cn(
                              "h-9 rounded-md border text-xs font-medium transition",
                              choices[change.target] === choice
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "bg-background hover:bg-muted",
                            )}
                          >
                            {choice === "keep" ? "Keep current" : "Use new"}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">{saveHint}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className={actionClass} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" className={actionClass} disabled={pending.length === 0} onClick={apply}>
                {pending.length === 0 ? "No changes" : "Add to form"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
