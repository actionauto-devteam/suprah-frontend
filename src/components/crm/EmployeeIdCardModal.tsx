"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Car, Download, Share2, Loader2, Mail, Phone } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deptLabel, deptColorHex } from "@/lib/departments";
import { useOrg } from "@/hooks/useOrg";

interface EmployeeIdCardUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
  createdAt: string;
  hireDate?: string;
  department?: string;
  personalInfo?: {
    department?: string;
    jobTitle?: string;
    phone?: string;
  };
}

interface EmployeeIdCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: EmployeeIdCardUser | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EmployeeIdCardModal({ open, onOpenChange, user }: EmployeeIdCardModalProps) {
  const { organization } = useOrg();
  const dealerName = organization?.name || "Your Dealership";
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState<"download" | "share" | null>(null);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          overlayClassName="bg-black/70 backdrop-blur-[4px]"
          className="w-[calc(100vw-3rem)] max-w-75 p-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:text-white/80 [&>button]:top-3 [&>button]:left-3 [&>button]:right-auto [&>button]:z-50"
        >
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-16">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            <p className="text-xs font-medium text-zinc-400">Loading employee ID…</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const department = user.department ?? user.personalInfo?.department;
  const deptColor = deptColorHex(department);
  const deptText = deptLabel(department);
  const jobTitle = user.personalInfo?.jobTitle;
  const isActive = user.isActive !== false;
  const sinceYear = new Date(user.hireDate ?? user.createdAt).getFullYear();
  const fileSafeName = user.fullName.trim().toLowerCase().replace(/\s+/g, "-") || "employee";

  const qrValue = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${user.fullName}`,
    `ORG:${dealerName}`,
    `TITLE:${jobTitle || deptText}`,
    `EMAIL:${user.email}`,
    "END:VCARD",
  ].join("\n");

  const generatePng = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
  };

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting("download");
    try {
      const dataUrl = await generatePng();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${fileSafeName}-employee-id.png`;
      link.href = dataUrl;
      link.click();
      toast.success("ID card downloaded!");
    } catch {
      toast.error("Couldn't generate the ID card. Please try again.");
    } finally {
      setIsExporting(null);
    }
  };

  const handleShare = async () => {
    if (isExporting) return;
    setIsExporting("share");
    try {
      const dataUrl = await generatePng();
      if (!dataUrl) return;

      const canUseWebShare = typeof navigator !== "undefined" && !!navigator.share;
      const blob = canUseWebShare ? await (await fetch(dataUrl)).blob() : null;
      const file = blob
        ? new File([blob], `${fileSafeName}-employee-id.png`, { type: "image/png" })
        : null;

      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${user.fullName} — ${dealerName} Employee ID`,
        });
      } else if (canUseWebShare) {
        await navigator.share({
          title: `${user.fullName} — ${dealerName} Employee ID`,
          text: `${user.fullName} · ${deptText}`,
        });
      } else {
        const link = document.createElement("a");
        link.download = `${fileSafeName}-employee-id.png`;
        link.href = dataUrl;
        link.click();
        toast.success("ID card downloaded!");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Couldn't share the ID card. Please try again.");
      }
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-[4px]"
        className="w-[calc(100vw-3rem)] max-w-75 p-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:text-white/80 [&>button]:top-3 [&>button]:left-3 [&>button]:right-auto [&>button]:z-50"
      >
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-white select-none"
          style={{ boxShadow: "0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.06)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: `repeating-linear-gradient(135deg, ${deptColor}0a 0px, ${deptColor}0a 1px, transparent 1px, transparent 10px)`,
            }}
          />

          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-2 w-9 rounded-full bg-zinc-300 z-20" />

          <div
            className="relative flex flex-col items-center pt-6 pb-11 px-4"
            style={{ background: deptColor }}
          >
            <div className="h-7 w-7 rounded-lg bg-white/25 flex items-center justify-center mb-1.5">
              <Car className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-[11px] font-black tracking-[0.2em] uppercase text-white leading-none">
              {dealerName}
            </p>
            <p className="text-[7px] tracking-[0.18em] uppercase text-white/85 mt-1 font-semibold leading-none">
              Employee Identification
            </p>
          </div>

          <div className="relative z-10 flex justify-center -mt-9">
            <Avatar className="h-18 w-18 ring-4 ring-white shadow-md">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-zinc-100 text-zinc-500 text-lg font-bold">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute bottom-0.5 h-3 w-3 rounded-full ring-2 ring-white"
              style={{
                left: "calc(50% + 20px)",
                background: isActive ? "#22c55e" : "#9ca3af",
              }}
            />
          </div>

          <div className="relative z-10 px-4 pt-2 text-center">
            <p className="text-[16px] font-black text-zinc-900 leading-tight truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-zinc-500 font-semibold mt-0.5 truncate">
              {jobTitle || (user.role.charAt(0).toUpperCase() + user.role.slice(1))}
            </p>

            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-2.5">
              <span
                className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ background: `${deptColor}14`, borderColor: `${deptColor}55`, color: deptColor }}
              >
                {deptText}
              </span>
              <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500">
                {user.role}
              </span>
            </div>
          </div>

          <div className="relative z-10 mx-4 mt-3.5 pt-2.5 border-t border-dashed border-zinc-200 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[6.5px] uppercase tracking-[0.16em] text-zinc-400 font-bold">
                Team Member Since
              </p>
              <p className="text-[11px] font-bold text-zinc-700 mt-0.5">{sinceYear}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: isActive ? "#22c55e" : "#9ca3af" }}
              />
              <span className="text-[8px] font-bold uppercase tracking-wide text-zinc-500">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="relative z-10 mx-4 mt-3 space-y-1.5 text-left">
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
              <span className="text-[9px] font-medium text-zinc-600 truncate">{user.email}</span>
            </div>
            {user.personalInfo?.phone && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Phone className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                <span className="text-[9px] font-medium text-zinc-600 truncate">
                  {user.personalInfo.phone}
                </span>
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center px-4 pt-3.5 pb-4">
            <div className="border border-zinc-200 rounded-lg p-1">
              <QRCodeSVG value={qrValue} size={44} bgColor="#ffffff" fgColor="#18181b" level="M" marginSize={0} />
            </div>
            <p className="text-[6px] tracking-[0.14em] uppercase text-zinc-400 font-bold mt-1.5 text-center leading-relaxed">
              Property of {dealerName} — if found, please return
            </p>
          </div>

          <div className="relative z-10 h-2" style={{ background: deptColor }} />
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            onClick={handleDownload}
            disabled={isExporting !== null}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl h-11 font-semibold backdrop-blur-sm"
          >
            {isExporting === "download" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
          <Button
            onClick={handleShare}
            disabled={isExporting !== null}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl h-11 font-semibold backdrop-blur-sm"
          >
            {isExporting === "share" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
