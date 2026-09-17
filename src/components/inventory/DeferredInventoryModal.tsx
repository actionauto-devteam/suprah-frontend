"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Mount on first use, then retain the original modal's state across closes. */
export function DeferredInventoryModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [hasOpened, setHasOpened] = React.useState(open);
  React.useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  if (!open && !hasOpened) return null;

  return (
    <React.Suspense fallback={open ? (
      <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
        <DialogContent>
          <DialogTitle>Loading…</DialogTitle>
          <DialogDescription role="status">Preparing your vehicle form.</DialogDescription>
        </DialogContent>
      </Dialog>
    ) : null}>
      {children}
    </React.Suspense>
  );
}