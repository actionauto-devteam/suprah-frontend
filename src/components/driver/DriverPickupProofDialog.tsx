"use client";

import * as React from "react";
import { AlertTriangle, Camera, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { Load } from "@/types/load";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { userErrorMessage } from "@/lib/user-error";

type PickupLoad = Pick<Load, "_id" | "loadNumber">;

interface DriverPickupProofDialogProps {
  load: PickupLoad | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onPickedUp: () => Promise<void> | void;
}

function extractMessage(error: any) {
  return (
    userErrorMessage(error, "submit your pickup photo")
  );
}

export function DriverPickupProofDialog({
  load,
  getToken,
  onClose,
  onPickedUp,
}: DriverPickupProofDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const proofSubmittedRef = React.useRef(false);
  const loadId = load?._id ?? null;

  React.useEffect(() => {
    proofSubmittedRef.current = false;
    if (!loadId) {
      setFile(null);
      setNote("");
      setError(null);
      setPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    }
  }, [loadId]);

  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },

    [preview]
  );

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0] || null;
      if (selectedFile) {
        proofSubmittedRef.current = false;
        setFile(selectedFile);
        setPreview((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(selectedFile);
        });
      }
    },
    []
  );

  const handleSubmit = React.useCallback(async () => {
    if (!load || !file) return;
    setSubmitting(true);
    setError(null);

    // Tracks which step failed so the driver knows whether the photo was saved.
    let step: "proof" | "pickup" = "proof";

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      const authHeaders = { Authorization: `Bearer ${token}` };
      const loadPath = `/api/driver-tracking/loads/${encodeURIComponent(load._id)}`;

      // Skip the upload when a previous attempt already saved the photo and only
      // the pickup step failed (e.g. a pending amendment), so retries don't
      // upload the same proof twice.
      if (!proofSubmittedRef.current) {
        const formData = new FormData();
        formData.append("proof", file);
        formData.append("note", note);

        await apiClient.post(`${loadPath}/submit-pickup-proof`, formData, {
          headers: {
            ...authHeaders,
            "Content-Type": "multipart/form-data",
          },
        });
        proofSubmittedRef.current = true;
      }

      // The backend requires a saved pickup photo before it will mark the
      // load Picked Up, so pickup is always a second call after the proof.
      step = "pickup";
      await apiClient.post(`${loadPath}/pickup`, {}, { headers: authHeaders });

      onPickedUp();
    } catch (err) {
      const message = extractMessage(err);
      setError(
        step === "pickup"
          ? `Your pickup photo was saved, but the pickup could not be recorded. ${message}`
          : message
      );
    } finally {
      setSubmitting(false);
    }
  }, [load, file, note, getToken, onPickedUp]);

  return (
    <Dialog open={!!load} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Pickup Proof</DialogTitle>
          <DialogDescription>
            {load ? `Load #${load.loadNumber}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {preview ? (
            <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview((previous) => {
                    if (previous) URL.revokeObjectURL(previous);
                    return null;
                  });
                }}
              >
                <AlertTriangle size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="mr-2" size={16} />
                Take Photo
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => galleryRef.current?.click()}
              >
                <ImageIcon className="mr-2" size={16} />
                Choose from Gallery
              </Button>
              <input
                type="file"
                accept="image/*"
                ref={galleryRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
          <Textarea
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
          />
          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Submit Proof
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}