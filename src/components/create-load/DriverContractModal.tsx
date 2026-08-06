"use client"

import * as React from "react"
import { Loader2, FileSignature } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ContractSection } from "./ContractSection"
import { LoadContract } from "./types"
import { apiClient } from "@/lib/api-client"

// ─── Driver Contract Modal ────────────────────────────────────────────────────
// Gates "Accept Load" (My Loads) and "Request This Load" (Available Loads /
// board) behind the same terms + signature UI the dispatcher already signs
// with (ContractSection/SignaturePad — including the driver's saved profile
// signature, so a returning driver doesn't redraw it every time).

export interface DriverSignedContract {
  agreedToTerms: true
  signatureDataUrl: string
  signerName: string
}

interface DriverContractModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (contract: DriverSignedContract) => void | Promise<void>
  isSubmitting?: boolean
  title: string
  description: string
  confirmLabel: string
}

export function DriverContractModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  title,
  description,
  confirmLabel,
}: DriverContractModalProps) {
  const [contract, setContract] = React.useState<LoadContract>({
    agreedToTerms: false,
    signatureDataUrl: null,
    signerName: "",
  })
  const [signerName, setSignerName] = React.useState("")

  React.useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    apiClient
      .get("/api/users/me")
      .then((res: { data: any }) => {
        const u = res.data?.data ?? res.data
        if (!cancelled && u?.name) setSignerName(u.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const canConfirm = contract.agreedToTerms && !!contract.signatureDataUrl

  const handleConfirm = async () => {
    if (!canConfirm || !contract.signatureDataUrl) return
    await onConfirm({
      agreedToTerms: true,
      signatureDataUrl: contract.signatureDataUrl,
      signerName: contract.signerName || signerName || "",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="size-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ContractSection
          contract={contract}
          onChange={setContract}
          defaultSignerName={signerName}
        />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isSubmitting} className="gap-1.5">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />}
            {isSubmitting ? "Submitting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
