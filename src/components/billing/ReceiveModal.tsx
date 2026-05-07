"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/*
 * Supra / Car-Dealership theme tokens
 * ─────────────────────────────────────
 * bg-card   : #0d0d10   charcoal body
 * accent    : #E55A00   Supra Prominence Orange
 * surface   : rgba(255,255,255,0.05)
 * border    : rgba(255,255,255,0.10)
 * text-hi   : #ffffff
 * text-mid  : rgba(255,255,255,0.65)
 * text-lo   : rgba(255,255,255,0.28)
 * mono font : 'Share Tech Mono', monospace
 * disp font : 'Rajdhani', sans-serif
 */

const ORANGE  = "#E55A00";
const DISPLAY = "'Rajdhani', var(--font-sans), sans-serif";
const MONO    = "'Share Tech Mono', 'Roboto Mono', monospace";

// ─── Theme tokens (CSS vars — auto-adapt to light/dark) ───────────────────────
const MODAL_BG     = "var(--card)";
const MODAL_BORDER = "var(--border)";
const TEXT_HI      = "var(--card-foreground)";
const TEXT_MID     = "var(--muted-foreground)";
const TEXT_LO      = "color-mix(in srgb, var(--muted-foreground) 55%, transparent)";
const TEXT_FAINT   = "color-mix(in srgb, var(--muted-foreground) 40%, transparent)";
const SURFACE      = "color-mix(in srgb, var(--foreground) 5%, transparent)";

// ─── Pure-JS QR matrix builder (no external dep) ─────────────────────────────
function buildQRMatrix(text: string): number[][] {
  const N = 25;
  const m: number[][] = Array.from({ length: N }, () => new Array(N).fill(-1));
  const finder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++)
        m[r0 + r][c0 + c] =
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
            ? 1
            : 0;
    for (let i = 0; i < 8; i++) {
      if (r0 + 7 < N) m[r0 + 7][c0 + i] = 0;
      if (c0 + 7 < N && r0 + i < N) m[r0 + i][c0 + 7] = 0;
    }
  };
  finder(0, 0);
  finder(0, N - 7);
  finder(N - 7, 0);
  for (let i = 8; i < N - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  const ap = N - 7;
  for (let r = ap - 2; r <= ap + 2; r++)
    for (let c = ap - 2; c <= ap + 2; c++)
      m[r][c] =
        r === ap - 2 ||
        r === ap + 2 ||
        c === ap - 2 ||
        c === ap + 2 ||
        (r === ap && c === ap)
          ? 1
          : 0;
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (m[r][c] !== -1) continue;
      h = (Math.imul(1664525, h) + 1013904223) | 0;
      m[r][c] = (h >>> 16) & 1;
    }
  return m;
}

function QRCodeSVG({ data, size = 168 }: { data: string; size?: number }) {
  const matrix = buildQRMatrix(data);
  const N = matrix.length;
  const cell = size / N;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", borderRadius: 6 }}
    >
      <rect width={size} height={size} fill="white" />
      {matrix.flatMap((row, r) =>
        row.map((v, c) =>
          v === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={+(c * cell).toFixed(2)}
              y={+(r * cell).toFixed(2)}
              width={+(cell + 0.5).toFixed(2)}
              height={+(cell + 0.5).toFixed(2)}
              fill="#0d0d10"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

// ─── Themed sub-components ────────────────────────────────────────────────────
function SupraInput({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        fontFamily: DISPLAY,
        fontSize: 13,
        background: SURFACE,
        border: `1px solid ${focused ? ORANGE : MODAL_BORDER}`,
        borderRadius: 8,
        padding: "8px 12px",
        color: TEXT_HI,
        outline: "none",
        boxShadow: focused ? "0 0 0 3px rgba(229,90,0,0.13)" : "none",
        transition: "border-color 0.14s, box-shadow 0.14s",
      }}
    />
  );
}

function SupraLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.11em",
        textTransform: "uppercase" as const,
        color: TEXT_LO,
        marginBottom: 6,
        fontFamily: DISPLAY,
      }}
    >
      {children}
    </label>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ReceiveModalProps {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

// ─── ReceiveModal ─────────────────────────────────────────────────────────────
export function ReceiveModal({
  open,
  userId,
  userName,
  onClose,
}: ReceiveModalProps) {
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAmount("");
      setNotes("");
      setCopied(false);
    }
  }, [open]);

  const qrPayload = [
    `pay:${userId}`,
    amount ? `amt:${parseFloat(amount).toFixed(2)}` : "",
    notes ? `ref:${encodeURIComponent(notes)}` : "",
  ]
    .filter(Boolean)
    .join("|");

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${userId}`
      : `/pay/${userId}`;
  const params = new URLSearchParams();
  if (amount) params.set("amt", amount);
  if (notes) params.set("ref", notes);
  const paymentLink = params.toString()
    ? `${baseUrl}?${params.toString()}`
    : baseUrl;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(paymentLink); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // corner bracket positions for QR frame
  const corners: React.CSSProperties[] = [
    {
      top: 0,
      left: 0,
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderTopLeftRadius: 4,
    },
    {
      top: 0,
      right: 0,
      borderTopWidth: 2,
      borderRightWidth: 2,
      borderTopRightRadius: 4,
    },
    {
      bottom: 0,
      left: 0,
      borderBottomWidth: 2,
      borderLeftWidth: 2,
      borderBottomLeftRadius: 4,
    },
    {
      bottom: 0,
      right: 0,
      borderBottomWidth: 2,
      borderRightWidth: 2,
      borderBottomRightRadius: 4,
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      {/*
       * Override shadcn DialogContent for full Supra theming.
       * [&>button]:hidden — suppresses the auto-added close button; we render our own.
       */}
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-[4px]"
        className="p-0! border-0! bg-transparent! shadow-none! sm:max-w-sm overflow-hidden rounded-2xl [&>button]:hidden w-[calc(100%-2rem)]"
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
          @keyframes supraSheen{0%,62%{left:-110%}100%{left:230%}}
          @keyframes supraSpin{to{transform:rotate(360deg)}}
        `}</style>

        {/* ── Supra shell ── */}
        <div
          style={{
            position: "relative",
            background: MODAL_BG,
            borderRadius: 16,
            overflow: "hidden",
            fontFamily: DISPLAY,
          }}
        >
          {/* Carbon texture */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage: `
              repeating-linear-gradient(45deg, color-mix(in srgb, var(--foreground) 2%, transparent) 0px, color-mix(in srgb, var(--foreground) 2%, transparent) 1px, transparent 1px, transparent 8px),
              repeating-linear-gradient(-45deg, color-mix(in srgb, var(--foreground) 1%, transparent) 0px, color-mix(in srgb, var(--foreground) 1%, transparent) 1px, transparent 1px, transparent 8px)
            `,
            }}
          />
          {/* Left racing stripe */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: ORANGE,
            }}
          />
          {/* Top accent line */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 4,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, ${ORANGE}, rgba(229,90,0,0.25), transparent)`,
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 11,
              right: 11,
              width: 28,
              height: 28,
              borderRadius: 6,
              background: SURFACE,
              border: `1px solid ${MODAL_BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              style={{ color: TEXT_MID } as React.CSSProperties}
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* ── Content ── */}
          <div style={{ position: "relative", padding: "20px 22px 22px 20px" }}>
            {/* Header */}
            <div style={{ marginBottom: 18, paddingRight: 30 }}>
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: TEXT_HI,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                Receive Money
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: TEXT_LO,
                  marginTop: 4,
                  letterSpacing: "0.02em",
                }}
              >
                Share your QR code or payment link
              </p>
            </div>

            {/* QR with targeting bracket corners */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ position: "relative", padding: 14 }}>
                {corners.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      width: 18,
                      height: 18,
                      borderColor: ORANGE,
                      borderStyle: "solid",
                      borderWidth: 0,
                      ...s,
                    }}
                  />
                ))}
                <div
                  style={{
                    background: "white",
                    borderRadius: 8,
                    padding: 8,
                    lineHeight: 0,
                  }}
                >
                  <QRCodeSVG data={qrPayload} size={168} />
                </div>
              </div>
            </div>

            {/* Account pill */}
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${MODAL_BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "rgba(229,90,0,0.62)",
                  letterSpacing: "0.09em",
                }}
              >
                {userId}
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: TEXT_HI,
                  marginTop: 3,
                }}
              >
                {userName}
              </p>
            </div>

            {/* Amount + notes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 13,
              }}
            >
              <div>
                <SupraLabel htmlFor="rcv-amt">Amount (optional)</SupraLabel>
                <SupraInput
                  id="rcv-amt"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <SupraLabel htmlFor="rcv-ref">Reference note</SupraLabel>
                <SupraInput
                  id="rcv-ref"
                  placeholder="Invoice #001"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              style={{
                position: "relative",
                overflow: "hidden",
                width: "100%",
                padding: "11px 14px",
                borderRadius: 8,
                background: ORANGE,
                border: "none",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: DISPLAY,
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#cf4f00")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = ORANGE)}
            >
              {!copied && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "-110%",
                    width: "55%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)",
                    transform: "skewX(-20deg)",
                    animation: "supraSheen 3.2s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
              )}
              {copied ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 13 4 16" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copied ? "Copied!" : "Copy payment link"}
            </button>

            {/* Link preview */}
            <p
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: TEXT_FAINT,
                textAlign: "center",
                marginTop: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {paymentLink}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
