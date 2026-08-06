"use client"

import * as React from "react"
import { FileSignature, ScrollText, Check } from "lucide-react"
import { LoadContract } from "./types"
import { SignaturePad } from "./SignaturePad"
import { cn } from "@/lib/utils"

// ─── Digital Signature (Create Load) ─────────────────────────────────────────
// The image-upload signature is replaced by a freehand SignaturePad.
// The pad auto-loads the user's saved signature from their profile, so
// returning users arrive at this step already signed — they only redraw
// when they want to change it.

interface ContractSectionProps {
  contract: LoadContract
  onChange: (contract: LoadContract) => void
  /** Signer name default, e.g. the logged-in user's name */
  defaultSignerName?: string
}

const TRANSPORT_TERMS = [
  "The carrier agrees to transport the listed vehicles from the pickup location to the delivery location in the condition received, normal road wear excepted.",
  "The dispatcher confirms all vehicle, contact, and scheduling information entered in this load is accurate to the best of their knowledge.",
  "Carrier pay, COP/COD amounts, and the resulting balance are as stated in the Pricing section of this load.",
  "Proof of delivery (photo) is required before a load can be confirmed as Delivered.",
  "Either party may cancel prior to pickup; loads In-Transit cannot be cancelled or deleted in the system.",
]

export function ContractSection({
  contract,
  onChange,
  defaultSignerName = "",
}: ContractSectionProps) {
  // Seed signer name once from the logged-in user
  React.useEffect(() => {
    if (!contract.signerName && defaultSignerName) {
      onChange({ ...contract, signerName: defaultSignerName })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSignerName])

  const setSignature = React.useCallback(
    (dataUrl: string | null) => {
      onChange({ ...contract, signatureDataUrl: dataUrl })
    },
    [contract, onChange],
  )

  return (
    <div className="space-y-4">
      {/* ── Terms ── */}
      <div className="rounded-xl border border-border/60 bg-background/40 p-4 relative overflow-hidden">
        <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
          <ScrollText className="size-3" /> Transport Terms
        </p>
        <ol className="space-y-2">
          {TRANSPORT_TERMS.map((term, i) => (
            <li key={i} className="flex gap-2.5 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              {term}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Agreement checkbox ── */}
      <button
        type="button"
        onClick={() =>
          onChange({ ...contract, agreedToTerms: !contract.agreedToTerms })
        }
        aria-pressed={contract.agreedToTerms}
        className={cn(
          "w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          contract.agreedToTerms
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-border/60 bg-background/40 hover:border-emerald-500/25",
        )}
      >
        <div
          className={cn(
            "size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
            contract.agreedToTerms
              ? "border-emerald-500 bg-emerald-500"
              : "border-border",
          )}
        >
          {contract.agreedToTerms && <Check className="size-3 text-white" />}
        </div>
        <p className="text-xs font-bold text-foreground">
          I have read and agree to the transport terms on behalf of my
          organization.
        </p>
      </button>

      {/* ── Signer name ── */}
      <div>
        <label
          htmlFor="contract-signer-name"
          className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1.5"
        >
          Signer Name
        </label>
        <input
          id="contract-signer-name"
          type="text"
          value={contract.signerName ?? ""}
          onChange={(e) =>
            onChange({ ...contract, signerName: e.target.value })
          }
          placeholder="Full name of the person signing"
          maxLength={160}
          className={cn(
            "w-full h-10 rounded-xl border border-border/60 bg-background/40 px-3 text-sm font-medium",
            "placeholder:text-muted-foreground/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          )}
        />
      </div>

      {/* ── Signature pad ── */}
      <div>
        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
          <FileSignature className="size-3" /> Digital Signature
        </p>
        <SignaturePad
          value={contract.signatureDataUrl ?? null}
          onChange={setSignature}
          saveToProfile
        />
        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
          Your signature is saved to your profile and applied automatically on
          future loads. You can redraw or remove it anytime.
        </p>
      </div>
    </div>
  )
}