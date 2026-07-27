"use client";

import * as React from "react";
import Image from "next/image";
import {
  Building2,
  Smartphone,
  UserCircle,
  ArrowLeft,
  ChevronRight,
  Camera,
  ImageUp,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { linkedAccountApi } from "@/lib/linkedAccountApi";


const ORANGE   = "#E55A00";
const DISPLAY  = "'Rajdhani', var(--font-sans), sans-serif";

const BG       = "var(--card)";
const SURFACE  = "color-mix(in srgb, var(--foreground) 5%, transparent)";
const BORDER   = "var(--border)";
const TEXT_HI  = "var(--card-foreground)";
const TEXT_MID = "var(--muted-foreground)";
const TEXT_LO  = "color-mix(in srgb, var(--muted-foreground) 82%, transparent)";

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(image: ImageBitmapSource): Promise<{ rawValue: string }[]>;
  static getSupportedFormats(): Promise<string[]>;
}

type SendType = "bank" | "epay" | "user" | "upload-qr" | "scan-qr";
type SendFlow = "select" | SendType | "confirm" | "success";

interface BankForm {
  bank: string;
  accountNumber: string;
  accountName: string;
  amount: string;
  reference: string;
}
interface EpayForm {
  platform: string;
  mobileNumber: string;
  amount: string;
  reference: string;
}
interface UserForm {
  userId: string;
  amount: string;
  notes: string;
}
interface QrForm {
  recipient: string;
  amount: string;
  notes: string;
  rawData: string;
}
type FormErrors = Partial<Record<string, string>>;


function SupraLabel({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  htmlFor: string;
  required?: boolean;
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
      {required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function SupraInput({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  hasError = false,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasError?: boolean;
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
        border: `1px solid ${hasError ? "#EF4444" : focused ? ORANGE : BORDER}`,
        borderRadius: 8,
        padding: "8px 12px",
        color: TEXT_HI,
        outline: "none",
        boxShadow: focused
          ? `0 0 0 3px rgba(229,90,0,0.13)`
          : hasError
            ? "0 0 0 3px rgba(239,68,68,0.10)"
            : "none",
        transition: "border-color 0.14s, box-shadow 0.14s",
      }}
    />
  );
}

function SupraTextarea({
  id,
  placeholder,
  value,
  onChange,
  rows = 2,
}: {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        fontFamily: DISPLAY,
        fontSize: 13,
        background: SURFACE,
        border: `1px solid ${focused ? ORANGE : BORDER}`,
        borderRadius: 8,
        padding: "8px 12px",
        color: TEXT_HI,
        outline: "none",
        resize: "none",
        boxShadow: focused ? "0 0 0 3px rgba(229,90,0,0.13)" : "none",
        transition: "border-color 0.14s, box-shadow 0.14s",
      }}
    />
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p
      style={{
        fontSize: 11,
        color: "#F87171",
        marginTop: 4,
        fontFamily: DISPLAY,
      }}
    >
      {msg}
    </p>
  );
}

function SupraBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        padding: "11px 14px",
        marginTop: 4,
        borderRadius: 8,
        background: hover && !disabled ? "#cf4f00" : ORANGE,
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
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background 0.14s",
      }}
    >
      {!disabled && (
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
      {children}
    </button>
  );
}

// Back-arrow button
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 6,
        flexShrink: 0,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <ArrowLeft
        style={{ width: 14, height: 14, color: TEXT_MID }}
      />
    </button>
  );
}

// Screen header row
function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 18,
        paddingRight: 32,
      }}
    >
      {onBack && <BackBtn onClick={onBack} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: TEXT_HI,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              fontSize: 11,
              color: TEXT_LO,
              marginTop: 3,
              letterSpacing: "0.02em",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── SendModal ────────────────────────────────────────────────────────────────
interface SendModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  getToken: () => Promise<string | null>;
}

const EPAY_PLATFORMS = ["Venmo", "Zelle", "Cash App", "PayPal", "Apple Pay"];

export function SendModal({
  open,
  onClose,
  onSuccess,
  getToken,
}: SendModalProps) {
  const [flow, setFlow] = React.useState<SendFlow>("select");
  const [sendType, setSendType] = React.useState<SendType | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hoveredOpt, setHoveredOpt] = React.useState<string | null>(null);
  // NEW: error surfaced on the confirm screen if the real transfer fails
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  const [bankForm, setBankForm] = React.useState<BankForm>({
    bank: "",
    accountNumber: "",
    accountName: "",
    amount: "",
    reference: "",
  });
  const [epayForm, setEpayForm] = React.useState<EpayForm>({
    platform: "Venmo",
    mobileNumber: "",
    amount: "",
    reference: "",
  });
  const [userForm, setUserForm] = React.useState<UserForm>({
    userId: "",
    amount: "",
    notes: "",
  });
  const [qrForm, setQrForm] = React.useState<QrForm>({
    recipient: "",
    amount: "",
    notes: "",
    rawData: "",
  });
  const [qrUploadPreview, setQrUploadPreview] = React.useState<string | null>(
    null,
  );
  const [qrDecoding, setQrDecoding] = React.useState(false);
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // ── Reset on open ──────────────────────────────────────────────
  React.useEffect(() => {
    if (open) {
      setFlow("select");
      setSendType(null);
      setErrors({});
      setIsLoading(false);
      setConfirmError(null); // NEW
      setBankForm({
        bank: "",
        accountNumber: "",
        accountName: "",
        amount: "",
        reference: "",
      });
      setEpayForm({
        platform: "Venmo",
        mobileNumber: "",
        amount: "",
        reference: "",
      });
      setUserForm({ userId: "", amount: "", notes: "" });
      setQrForm({ recipient: "", amount: "", notes: "", rawData: "" });
      setQrUploadPreview(null);
      setQrDecoding(false);
      setQrError(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [open]);

  // ── Camera helpers ─────────────────────────────────────────────
  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        startScanLoop();
      }, 100);
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera permission and try again.",
      );
    }
  };

  const startScanLoop = () => {
    if (!("BarcodeDetector" in window)) {
      setCameraError(
        "QR scanning is not supported in this browser. Try uploading a QR image instead.",
      );
      stopCamera();
      return;
    }
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const results = await detector.detect(videoRef.current);
        if (results.length) {
          const parsed = parseQrPayload(results[0].rawValue);
          setQrForm({ rawData: results[0].rawValue, ...parsed });
          stopCamera();
        }
      } catch {
        /* ignore per-frame errors */
      }
    }, 400);
  };

  // ── QR decode ─────────────────────────────────────────────────
  const parseQrPayload = (raw: string) => {
    const amtMatch = raw.match(/amt[=:]([\d.]+)/i);
    const recMatch = raw.match(/pay[=:]([^|&?]+)/i);
    const refMatch = raw.match(/ref[=:]([^|&?]+)/i);
    return {
      recipient: recMatch ? decodeURIComponent(recMatch[1]) : raw.slice(0, 40),
      amount: amtMatch ? amtMatch[1] : "",
      notes: refMatch ? decodeURIComponent(refMatch[1]) : "",
    };
  };

  const decodeImageFile = async (file: File) => {
    setQrDecoding(true);
    setQrError(null);
    try {
      if (!("BarcodeDetector" in window))
        throw new Error(
          "QR decoding not supported in this browser. Enter details manually.",
        );
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      if (!results.length)
        throw new Error("No QR code found. Try a clearer photo.");
      const parsed = parseQrPayload(results[0].rawValue);
      setQrForm({ rawData: results[0].rawValue, ...parsed });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to decode QR code.";
      setQrError(message);
    } finally {
      setQrDecoding(false);
    }
  };

  // ── Validation ─────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (sendType === "bank") {
      if (!bankForm.bank.trim()) e.bank = "Bank name is required";
      if (
        !bankForm.accountNumber ||
        bankForm.accountNumber.replace(/\D/g, "").length < 8
      )
        e.accountNumber = "Min 8 digits";
      if (!bankForm.accountName.trim()) e.accountName = "Required";
      if (!bankForm.amount || parseFloat(bankForm.amount) <= 0)
        e.amount = "Invalid amount";
    } else if (sendType === "epay") {
      if (
        !epayForm.mobileNumber ||
        epayForm.mobileNumber.replace(/\D/g, "").length < 10
      )
        e.mobileNumber = "Invalid number";
      if (!epayForm.amount || parseFloat(epayForm.amount) <= 0)
        e.amount = "Invalid amount";
    } else if (sendType === "user") {
      if (!userForm.userId.trim()) e.userId = "Required";
      if (!userForm.amount || parseFloat(userForm.amount) <= 0)
        e.amount = "Invalid amount";
    } else if (sendType === "upload-qr" || sendType === "scan-qr") {
      if (!qrForm.recipient.trim()) e.recipient = "Required";
      if (!qrForm.amount || parseFloat(qrForm.amount) <= 0)
        e.amount = "Invalid amount";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceed = () => {
    if (validate()) {
      setConfirmError(null);
      setFlow("confirm");
    }
  };

  // ── REAL transfer (Wise / PayPal) ──────────────────────────────
  const handleConfirm = async () => {
    setIsLoading(true);
    setConfirmError(null);
    try {
      // Resolve recipient + email from whichever flow the user chose
      let recipient = getRecipientLabel();
      let recipientEmail: string | undefined;
      let reference: string | undefined;

      if (sendType === "bank") {
        recipient = bankForm.accountName || bankForm.bank;
        reference = bankForm.reference || undefined;
      } else if (sendType === "epay") {
        recipient = epayForm.mobileNumber;
        recipientEmail = epayForm.mobileNumber.includes("@")
          ? epayForm.mobileNumber
          : undefined;
        reference = epayForm.reference || undefined;
      } else if (sendType === "user") {
        recipient = userForm.userId;
        recipientEmail = userForm.userId.includes("@")
          ? userForm.userId
          : undefined;
        reference = userForm.notes || undefined;
      } else if (sendType === "upload-qr" || sendType === "scan-qr") {
        recipient = qrForm.recipient;
        recipientEmail = qrForm.recipient.includes("@")
          ? qrForm.recipient
          : undefined;
        reference = qrForm.notes || undefined;
      }

      await linkedAccountApi.transfer({
        amount: getAmount(),
        currency: "USD",
        recipient,
        recipientEmail,
        reference,
      });

      setFlow("success");
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Transfer failed. Please try again.");
      console.error("[SendModal] transfer error:", err);
      setConfirmError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    onClose();
    onSuccess();
  };

  // ── Data helpers ───────────────────────────────────────────────
  const getAmount = () => {
    if (sendType === "bank") return parseFloat(bankForm.amount || "0");
    if (sendType === "epay") return parseFloat(epayForm.amount || "0");
    if (sendType === "user") return parseFloat(userForm.amount || "0");
    if (sendType === "upload-qr" || sendType === "scan-qr")
      return parseFloat(qrForm.amount || "0");
    return 0;
  };

  const getConfirmRows = (): { label: string; value: string }[] => {
    if (sendType === "bank")
      return [
        { label: "Bank", value: bankForm.bank },
        { label: "Account number", value: bankForm.accountNumber },
        { label: "Account name", value: bankForm.accountName },
        { label: "Reference", value: bankForm.reference || "—" },
      ];
    if (sendType === "epay")
      return [
        { label: "Platform", value: epayForm.platform },
        { label: "Mobile number", value: epayForm.mobileNumber },
        { label: "Reference", value: epayForm.reference || "—" },
      ];
    if (sendType === "user")
      return [
        { label: "Recipient", value: userForm.userId },
        { label: "Notes", value: userForm.notes || "—" },
      ];
    if (sendType === "upload-qr" || sendType === "scan-qr")
      return [
        { label: "Recipient", value: qrForm.recipient },
        { label: "Notes", value: qrForm.notes || "—" },
        {
          label: "QR data",
          value:
            qrForm.rawData.slice(0, 46) +
            (qrForm.rawData.length > 46 ? "…" : ""),
        },
      ];
    return [];
  };

  const getRecipientLabel = () => {
    if (sendType === "bank") return bankForm.accountName;
    if (sendType === "epay") return epayForm.mobileNumber;
    if (sendType === "user") return userForm.userId;
    if (sendType === "upload-qr" || sendType === "scan-qr")
      return qrForm.recipient;
    return "";
  };

  const fmtAmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Camera corner bracket positions ────────────────────────────
  const camCorners: React.CSSProperties[] = [
    { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
    { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
    { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
    { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  ];

  // ── Option card list ────────────────────────────────────────────
  const sendOptions = [
    {
      key: "bank" as SendType,
      Icon: Building2,
      label: "Bank transfer",
      sub: "Chase, Bank of America, Wells Fargo…",
      iconBg: "rgba(59,130,246,0.12)",
      iconColor: "#60A5FA",
    },
    {
      key: "epay" as SendType,
      Icon: Smartphone,
      label: "E-payment platform",
      sub: "Venmo, Zelle, Cash App, PayPal, Apple Pay",
      iconBg: "rgba(168,85,247,0.12)",
      iconColor: "#C084FC",
    },
    {
      key: "user" as SendType,
      Icon: UserCircle,
      label: "System user",
      sub: "Transfer within this platform",
      iconBg: "rgba(34,197,94,0.11)",
      iconColor: "#4ADE80",
    },
    {
      key: "upload-qr" as SendType,
      Icon: ImageUp,
      label: "Upload QR code",
      sub: "Upload a QR image from your device",
      iconBg: "rgba(249,115,22,0.12)",
      iconColor: "#FB923C",
    },
    {
      key: "scan-qr" as SendType,
      Icon: Camera,
      label: "Scan QR code",
      sub: "Use camera to scan a QR code",
      iconBg: "rgba(244,63,94,0.12)",
      iconColor: "#FB7185",
    },
  ];

  // ────────────────────────────────────────────────────────────────
  // Single Dialog — all screens rendered conditionally inside
  // (avoids flash between screen transitions)
  // ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { stopCamera(); onClose(); } }}>
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-[4px]"
        className="!p-0 !border-0 !bg-transparent !shadow-none sm:max-w-[420px] overflow-hidden rounded-2xl [&>button]:hidden w-[calc(100%-2rem)]"
      >
        <DialogTitle className="sr-only">
          Send Money
        </DialogTitle>

        <DialogDescription className="sr-only">
          Choose a transfer method, enter the recipient and payment details, then review and confirm the transaction.
        </DialogDescription>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
          @keyframes supraSheen { 0%, 62% { left: -110%; } 100% { left: 230%; } }
          @keyframes supraSpin  { to { transform: rotate(360deg); } }
          @keyframes supraPulse { 0%,100%{opacity:0.7}50%{opacity:0.3} }
          input::placeholder,
          textarea::placeholder {
            color: var(--muted-foreground);
            opacity: 0.82;
          }
        `}</style>

        {/* ── Supra shell ── */}
        <div
          style={{
            position: "relative",
            background: BG,
            borderRadius: 16,
            overflow: "hidden",
            fontFamily: DISPLAY,
          }}
        >
          {/* Carbon fibre crosshatch */}
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
              background: `linear-gradient(90deg, ${ORANGE}, rgba(229,90,0,0.24), transparent)`,
            }}
          />

          {/* Close button */}
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 11,
              right: 11,
              width: 28,
              height: 28,
              borderRadius: 6,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <X
              style={{ width: 11, height: 11, color: TEXT_MID }}
            />
          </button>

          {/* ── Content ── */}
          <div style={{ position: "relative", padding: "20px 22px 22px 20px" }}>
            {/* ════════════════ SELECT ════════════════ */}
            {flow === "select" && (
              <>
                <ScreenHeader
                  title="Send Money"
                  subtitle="Choose where to send funds"
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {sendOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSendType(opt.key);
                        setFlow(opt.key);
                      }}
                      onMouseEnter={() => setHoveredOpt(opt.key)}
                      onMouseLeave={() => setHoveredOpt(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        background:
                          hoveredOpt === opt.key
                            ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
                            : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                        border: `1px solid ${hoveredOpt === opt.key ? "rgba(229,90,0,0.28)" : BORDER}`,
                        transition: "all 0.14s",
                      }}
                    >
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: opt.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <opt.Icon
                          style={{
                            width: 17,
                            height: 17,
                            color: opt.iconColor,
                          }}
                        />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: TEXT_HI,
                            lineHeight: 1.2,
                          }}
                        >
                          {opt.label}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: TEXT_MID,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {opt.sub}
                        </p>
                      </div>
                      <ChevronRight
                        style={{
                          width: 14,
                          height: 14,
                          color: TEXT_LO,
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ════════════════ BANK FORM ════════════════ */}
            {flow === "bank" && (
              <>
                <ScreenHeader
                  title="Bank Transfer"
                  subtitle="Send to any US bank account"
                  onBack={() => {
                    setFlow("select");
                    setErrors({});
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                >
                  <div>
                    <SupraLabel htmlFor="b-bank" required>
                      Bank name
                    </SupraLabel>
                    <SupraInput
                      id="b-bank"
                      placeholder="Chase, Bank of America…"
                      value={bankForm.bank}
                      onChange={(e) =>
                        setBankForm((f) => ({ ...f, bank: e.target.value }))
                      }
                      hasError={!!errors.bank}
                    />
                    <FieldError msg={errors.bank} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <SupraLabel htmlFor="b-acct" required>
                        Account number
                      </SupraLabel>
                      <SupraInput
                        id="b-acct"
                        placeholder="Routing + acct number"
                        value={bankForm.accountNumber}
                        onChange={(e) =>
                          setBankForm((f) => ({
                            ...f,
                            accountNumber: e.target.value,
                          }))
                        }
                        hasError={!!errors.accountNumber}
                      />
                      <FieldError msg={errors.accountNumber} />
                    </div>
                    <div>
                      <SupraLabel htmlFor="b-name" required>
                        Account name
                      </SupraLabel>
                      <SupraInput
                        id="b-name"
                        placeholder="Full name"
                        value={bankForm.accountName}
                        onChange={(e) =>
                          setBankForm((f) => ({
                            ...f,
                            accountName: e.target.value,
                          }))
                        }
                        hasError={!!errors.accountName}
                      />
                      <FieldError msg={errors.accountName} />
                    </div>
                    <div>
                      <SupraLabel htmlFor="b-amt" required>
                        Amount ($)
                      </SupraLabel>
                      <SupraInput
                        id="b-amt"
                        type="number"
                        placeholder="0.00"
                        value={bankForm.amount}
                        onChange={(e) =>
                          setBankForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        hasError={!!errors.amount}
                      />
                      <FieldError msg={errors.amount} />
                    </div>
                    <div>
                      <SupraLabel htmlFor="b-ref">Reference</SupraLabel>
                      <SupraInput
                        id="b-ref"
                        placeholder="Optional"
                        value={bankForm.reference}
                        onChange={(e) =>
                          setBankForm((f) => ({
                            ...f,
                            reference: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <SupraBtn onClick={handleProceed}>Review transfer</SupraBtn>
                </div>
              </>
            )}

            {/* ════════════════ EPAY FORM ════════════════ */}
            {flow === "epay" && (
              <>
                <ScreenHeader
                  title="E-Payment Platform"
                  subtitle="Venmo, Zelle, Cash App and more"
                  onBack={() => {
                    setFlow("select");
                    setErrors({});
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                >
                  <div>
                    <SupraLabel htmlFor="e-plat" required>
                      Platform
                    </SupraLabel>
                    {/*
                     * shadcn Select with dark-mode class overrides.
                     * SelectContent renders in a Radix portal — dark bg prevents white flash.
                     */}
                    <Select
                      value={epayForm.platform}
                      onValueChange={(v) =>
                        setEpayForm((f) => ({ ...f, platform: v }))
                      }
                    >
                      <SelectTrigger
                        className="h-9 text-sm border-border bg-card text-foreground focus:ring-[rgba(229,90,0,0.15)] focus:border-[#E55A00] [&>svg]:text-muted-foreground"
                        style={{ fontFamily: DISPLAY }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-popover text-popover-foreground">
                        {EPAY_PLATFORMS.map((p) => (
                          <SelectItem
                            key={p}
                            value={p}
                            className="text-sm text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <SupraLabel htmlFor="e-num" required>
                        Mobile number
                      </SupraLabel>
                      <SupraInput
                        id="e-num"
                        type="tel"
                        placeholder="(555) 000-0000"
                        value={epayForm.mobileNumber}
                        onChange={(e) =>
                          setEpayForm((f) => ({
                            ...f,
                            mobileNumber: e.target.value,
                          }))
                        }
                        hasError={!!errors.mobileNumber}
                      />
                      <FieldError msg={errors.mobileNumber} />
                    </div>
                    <div>
                      <SupraLabel htmlFor="e-amt" required>
                        Amount ($)
                      </SupraLabel>
                      <SupraInput
                        id="e-amt"
                        type="number"
                        placeholder="0.00"
                        value={epayForm.amount}
                        onChange={(e) =>
                          setEpayForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        hasError={!!errors.amount}
                      />
                      <FieldError msg={errors.amount} />
                    </div>
                  </div>
                  <div>
                    <SupraLabel htmlFor="e-ref">Reference</SupraLabel>
                    <SupraInput
                      id="e-ref"
                      placeholder="Optional"
                      value={epayForm.reference}
                      onChange={(e) =>
                        setEpayForm((f) => ({
                          ...f,
                          reference: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <SupraBtn onClick={handleProceed}>Review transfer</SupraBtn>
                </div>
              </>
            )}

            {/* ════════════════ USER FORM ════════════════ */}
            {flow === "user" && (
              <>
                <ScreenHeader
                  title="Send to User"
                  subtitle="Transfer within the platform"
                  onBack={() => {
                    setFlow("select");
                    setErrors({});
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                >
                  <div>
                    <SupraLabel htmlFor="u-id" required>
                      User ID or email
                    </SupraLabel>
                    <SupraInput
                      id="u-id"
                      placeholder="USR-XXXX or user@email.com"
                      value={userForm.userId}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, userId: e.target.value }))
                      }
                      hasError={!!errors.userId}
                    />
                    <FieldError msg={errors.userId} />
                  </div>
                  <div>
                    <SupraLabel htmlFor="u-amt" required>
                      Amount ($)
                    </SupraLabel>
                    <SupraInput
                      id="u-amt"
                      type="number"
                      placeholder="0.00"
                      value={userForm.amount}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, amount: e.target.value }))
                      }
                      hasError={!!errors.amount}
                    />
                    <FieldError msg={errors.amount} />
                  </div>
                  <div>
                    <SupraLabel htmlFor="u-notes">Notes</SupraLabel>
                    <SupraTextarea
                      id="u-notes"
                      placeholder="Optional message…"
                      value={userForm.notes}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                  <SupraBtn onClick={handleProceed}>Review transfer</SupraBtn>
                </div>
              </>
            )}

            {/* ════════════════ UPLOAD QR ════════════════ */}
            {flow === "upload-qr" && (
              <>
                <ScreenHeader
                  title="Upload QR Code"
                  subtitle="Auto-fill recipient from image"
                  onBack={() => {
                    setFlow("select");
                    setErrors({});
                    setQrError(null);
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                >
                  {/* Drop zone */}
                  <label
                    htmlFor="qr-upload"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      height: 140,
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.14s",
                      background: qrUploadPreview
                        ? "rgba(229,90,0,0.06)"
                        : "rgba(255,255,255,0.03)",
                      border: `2px dashed ${qrUploadPreview ? "rgba(229,90,0,0.42)" : "rgba(255,255,255,0.14)"}`,
                    }}
                  >
                    {qrUploadPreview ? (
                      <Image
                        src={qrUploadPreview}
                        alt="Uploaded QR"
                        width={110}
                        height={110}
                        unoptimized
                        style={{ objectFit: "contain", borderRadius: 8 }}
                      />
                    ) : (
                      <>
                        <span
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(249,115,22,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ImageUp
                            style={{ width: 20, height: 20, color: "#FB923C" }}
                          />
                        </span>
                        <div style={{ textAlign: "center" }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: TEXT_HI,
                            }}
                          >
                            Click to upload QR image
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: TEXT_MID,
                              marginTop: 2,
                            }}
                          >
                            PNG, JPG, or WebP
                          </p>
                        </div>
                      </>
                    )}
                    <input
                      id="qr-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setQrUploadPreview(URL.createObjectURL(file));
                        setQrForm({
                          recipient: "",
                          amount: "",
                          notes: "",
                          rawData: "",
                        });
                        await decodeImageFile(file);
                      }}
                    />
                  </label>

                  {qrDecoding && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: TEXT_MID,
                      }}
                    >
                      <Loader2
                        style={{
                          width: 13,
                          height: 13,
                          animation: "supraSpin 1s linear infinite",
                        }}
                      />
                      Decoding QR code…
                    </div>
                  )}
                  {qrError && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#F87171",
                        background: "rgba(239,68,68,0.08)",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      {qrError}
                    </p>
                  )}

                  <div>
                    <SupraLabel htmlFor="uqr-rec" required>
                      Recipient
                    </SupraLabel>
                    <SupraInput
                      id="uqr-rec"
                      placeholder="Auto-filled or enter manually"
                      value={qrForm.recipient}
                      onChange={(e) =>
                        setQrForm((f) => ({ ...f, recipient: e.target.value }))
                      }
                      hasError={!!errors.recipient}
                    />
                    <FieldError msg={errors.recipient} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <SupraLabel htmlFor="uqr-amt" required>
                        Amount ($)
                      </SupraLabel>
                      <SupraInput
                        id="uqr-amt"
                        type="number"
                        placeholder="0.00"
                        value={qrForm.amount}
                        onChange={(e) =>
                          setQrForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        hasError={!!errors.amount}
                      />
                      <FieldError msg={errors.amount} />
                    </div>
                    <div>
                      <SupraLabel htmlFor="uqr-notes">Notes</SupraLabel>
                      <SupraInput
                        id="uqr-notes"
                        placeholder="Optional"
                        value={qrForm.notes}
                        onChange={(e) =>
                          setQrForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <SupraBtn onClick={handleProceed} disabled={qrDecoding}>
                    Review transfer
                  </SupraBtn>
                </div>
              </>
            )}

            {/* ════════════════ SCAN QR ════════════════ */}
            {flow === "scan-qr" && (
              <>
                <ScreenHeader
                  title="Scan QR Code"
                  subtitle="Point camera at a QR code"
                  onBack={() => {
                    stopCamera();
                    setFlow("select");
                    setErrors({});
                    setCameraError(null);
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                >
                  {/* Viewfinder / result */}
                  {!qrForm.rawData ? (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#000",
                        aspectRatio: "1 / 1",
                        width: "100%",
                      }}
                    >
                      {cameraActive ? (
                        <>
                          <video
                            ref={videoRef}
                            muted
                            playsInline
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          {/* Scanning overlay */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <div
                              style={{
                                width: 172,
                                height: 172,
                                position: "relative",
                              }}
                            >
                              {camCorners.map((s, i) => (
                                <span
                                  key={i}
                                  style={{
                                    position: "absolute",
                                    width: 22,
                                    height: 22,
                                    borderColor: ORANGE,
                                    borderStyle: "solid",
                                    borderWidth: 0,
                                    borderRadius: 3,
                                    ...s,
                                  }}
                                />
                              ))}
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  top: "50%",
                                  height: 1,
                                  background: `${ORANGE}80`,
                                  animation:
                                    "supraPulse 1.6s ease-in-out infinite",
                                }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={stopCamera}
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 28,
                              height: 28,
                              borderRadius: 20,
                              background: "rgba(0,0,0,0.55)",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <X
                              style={{ width: 12, height: 12, color: "white" }}
                            />
                          </button>
                        </>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            gap: 12,
                            padding: 24,
                          }}
                        >
                          <span
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 14,
                              background: "rgba(244,63,94,0.12)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Camera
                              style={{
                                width: 24,
                                height: 24,
                                color: "#FB7185",
                              }}
                            />
                          </span>
                          <div style={{ textAlign: "center" }}>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: TEXT_HI,
                              }}
                            >
                              Camera not active
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: TEXT_MID,
                                marginTop: 4,
                              }}
                            >
                              {cameraError || "Tap below to start scanning"}
                            </p>
                          </div>
                          {!cameraError && (
                            <button
                              onClick={startCamera}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "8px 18px",
                                borderRadius: 7,
                                background: ORANGE,
                                border: "none",
                                color: "white",
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: DISPLAY,
                                cursor: "pointer",
                              }}
                            >
                              <Camera style={{ width: 13, height: 13 }} />
                              Start camera
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* QR detected state */
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        padding: "13px 0",
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.20)",
                        borderRadius: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "rgba(34,197,94,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4ADE80"
                          strokeWidth="2.5"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </span>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT_HI,
                        }}
                      >
                        QR code detected!
                      </p>
                    </div>
                  )}

                  {cameraError && !cameraActive && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#F87171",
                        background: "rgba(239,68,68,0.08)",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      {cameraError}
                    </p>
                  )}

                  <div>
                    <SupraLabel htmlFor="sqr-rec" required>
                      Recipient
                    </SupraLabel>
                    <SupraInput
                      id="sqr-rec"
                      placeholder="Auto-filled after scan"
                      value={qrForm.recipient}
                      onChange={(e) =>
                        setQrForm((f) => ({ ...f, recipient: e.target.value }))
                      }
                      hasError={!!errors.recipient}
                    />
                    <FieldError msg={errors.recipient} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <SupraLabel htmlFor="sqr-amt" required>
                        Amount ($)
                      </SupraLabel>
                      <SupraInput
                        id="sqr-amt"
                        type="number"
                        placeholder="0.00"
                        value={qrForm.amount}
                        onChange={(e) =>
                          setQrForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        hasError={!!errors.amount}
                      />
                      <FieldError msg={errors.amount} />
                    </div>
                    <div>
                      <SupraLabel htmlFor="sqr-notes">Notes</SupraLabel>
                      <SupraInput
                        id="sqr-notes"
                        placeholder="Optional"
                        value={qrForm.notes}
                        onChange={(e) =>
                          setQrForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <SupraBtn onClick={handleProceed}>Review transfer</SupraBtn>
                </div>
              </>
            )}

            {/* ════════════════ CONFIRM ════════════════ */}
            {flow === "confirm" && (
              <>
                <ScreenHeader
                  title="Confirm Transfer"
                  onBack={() => {
                    setConfirmError(null);
                    setFlow(sendType!);
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 13 }}
                >
                  {/* Amount highlight */}
                  <div
                    style={{
                      background: "rgba(229,90,0,0.09)",
                      border: "1px solid rgba(229,90,0,0.22)",
                      borderRadius: 12,
                      padding: "18px 20px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase" as const,
                        color: ORANGE,
                        marginBottom: 6,
                        fontFamily: DISPLAY,
                      }}
                    >
                      You are sending
                    </p>
                    <p
                      style={{
                        fontSize: 40,
                        fontWeight: 700,
                        color: ORANGE,
                        letterSpacing: "-0.02em",
                        fontFamily: DISPLAY,
                      }}
                    >
                      {fmtAmt(getAmount())}
                    </p>
                  </div>

                  {/* Details table */}
                  <div
                    style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {getConfirmRows().map(({ label, value }, i) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "9px 14px",
                          background:
                            i % 2 === 0
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(255,255,255,0.015)",
                          borderTop:
                            i > 0
                              ? "1px solid rgba(255,255,255,0.05)"
                              : undefined,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase" as const,
                            color: TEXT_MID,
                            fontFamily: DISPLAY,
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: TEXT_HI,
                            maxWidth: "58%",
                            textAlign: "right",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* NEW: transfer error surfaced here instead of silent success */}
                  {confirmError && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 13px",
                        borderRadius: 8,
                        background: "rgba(220,38,38,0.08)",
                        border: "1px solid rgba(220,38,38,0.20)",
                        fontSize: 12,
                        color: "#FCA5A5",
                        fontFamily: DISPLAY,
                      }}
                    >
                      {confirmError}
                    </div>
                  )}

                  <SupraBtn onClick={handleConfirm} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2
                          style={{
                            width: 14,
                            height: 14,
                            animation: "supraSpin 1s linear infinite",
                          }}
                        />
                        Processing…
                      </>
                    ) : (
                      <>
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
                        Confirm &amp; send
                      </>
                    )}
                  </SupraBtn>
                </div>
              </>
            )}

            {/* ════════════════ SUCCESS ════════════════ */}
            {flow === "success" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "16px 0 8px",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(229,90,0,0.12)",
                    border: "1px solid rgba(229,90,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ORANGE}
                    strokeWidth="2.5"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p
                  style={{
                    fontSize: 21,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.01em",
                    marginBottom: 6,
                  }}
                >
                  Transfer successful
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: TEXT_MID,
                    marginBottom: 22,
                    fontFamily: DISPLAY,
                  }}
                >
                  {fmtAmt(getAmount())} sent to {getRecipientLabel()}
                </p>
                <SupraBtn onClick={handleDone}>Done</SupraBtn>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}