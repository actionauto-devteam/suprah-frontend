"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fmtMonthYearMDT } from "@/lib/timezone";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deptLabel } from "@/lib/departments";
import { useTeamMemberProfile } from "@/hooks/useTeamPulse";
import type { OnlineStatus } from "@/hooks/useTeamPulse";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S, ROLE_STYLE, ROLE_LABEL } from "../../_components/team-pulse-constants";
import { StatusDot, PresenceAvatarDot } from "../../_components/StatusDot";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === "string" ? params.userId : null;

  const { data: profile, isLoading } = useTeamMemberProfile(userId);
  const { openDm, loading: dmLoading } = useOpenDm();
  const status = (profile?.onlineStatus ?? "offline") as OnlineStatus;

  const infoItems = [
    {
      icon: Briefcase,
      label: "Job Title",
      value: profile?.personalInfo?.jobTitle,
      color: "text-amber-500",
    },
    {
      icon: Building2,
      label: "Department",
      value: profile?.personalInfo?.department
        ? deptLabel(profile.personalInfo.department)
        : null,
      color: "text-cyan-500",
    },
    {
      icon: Phone,
      label: "Phone",
      value: profile?.personalInfo?.phone,
      color: "text-blue-500",
      href: profile?.personalInfo?.phone ? `tel:${profile.personalInfo.phone}` : undefined,
    },
    {
      icon: Mail,
      label: "Email",
      value: profile?.email,
      color: "text-violet-500",
      href: profile?.email ? `mailto:${profile.email}` : undefined,
    },
    {
      icon: MapPin,
      label: "Location",
      value: profile?.personalInfo?.location,
      color: "text-emerald-500",
    },
    {
      icon: Globe,
      label: "Timezone",
      value: (profile?.personalInfo as any)?.timezone,
      color: "text-indigo-500",
    },
    {
      icon: Globe,
      label: "Language",
      value: (profile?.personalInfo as any)?.language,
      color: "text-violet-500",
    },
    {
      icon: User,
      label: "Gender",
      value: (profile?.personalInfo as any)?.gender
        ? String((profile?.personalInfo as any).gender).charAt(0).toUpperCase() +
          String((profile?.personalInfo as any).gender).slice(1)
        : null,
      color: "text-pink-500",
    },
    {
      icon: CalendarDays,
      label: "Birthday",
      value: (profile?.personalInfo as any)?.dateOfBirth
        ? new Date(((profile?.personalInfo as any).dateOfBirth as string).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
        : null,
      color: "text-rose-500",
    },
  ].filter((i) => i.value);

  return (
    <div className="p-4 sm:p-5 container mx-auto max-w-3xl pb-8 animate-in fade-in duration-500">
      {/* Back button */}
      <div className="mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => router.push("/team-pulse")}
        >
          <ArrowLeft className="size-4" />
          Back to Team
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && !profile && (
        <div className="flex flex-col items-center py-20 text-center">
          <User className="size-12 text-muted-foreground/20 mb-3" />
          <p className="font-bold text-muted-foreground">Profile not found</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => router.push("/team-pulse")}
          >
            Go back to Team Pulse
          </Button>
        </div>
      )}

      {!isLoading && profile && (
        <div className="space-y-4">
          {/* Hero banner */}
          <div className="relative bg-linear-to-br from-primary/80 via-primary/60 to-primary/40 rounded-2xl px-5 sm:px-7 pt-5 sm:pt-7 pb-5 sm:pb-6 overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative flex items-start gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <Avatar className="size-20 sm:size-24 ring-4 ring-white/60 ring-offset-2 ring-offset-primary/50 shadow-xl">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-3xl font-black bg-primary/30 text-white">
                    {profile.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <PresenceAvatarDot status={status} deviceType={profile.lastDeviceType} sizeClass="size-5" borderClass="border-[3px] border-white" shadowClass="shadow-md" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {profile.name}
                  </h1>
                  <Badge
                    className={cn(
                      "text-[10px] font-black px-2 h-5 uppercase tracking-wide border",
                      ROLE_STYLE[profile.role] ?? ROLE_STYLE.employee,
                    )}
                  >
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </Badge>
                </div>
                {profile.personalInfo?.jobTitle && (
                  <p className="text-white/80 text-sm flex items-center gap-1.5 mb-0.5">
                    <Briefcase className="size-3.5 shrink-0" />
                    {profile.personalInfo.jobTitle}
                    {profile.personalInfo?.department && (
                      <span className="text-white/50">
                        · {deptLabel(profile.personalInfo.department)}
                      </span>
                    )}
                  </p>
                )}
                {profile.email && (
                  <p className="text-white/70 text-sm flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" />
                    <a
                      href={`mailto:${profile.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {profile.email}
                    </a>
                  </p>
                )}
                {profile.customStatus && (
                  <p className="mt-2 text-xs italic text-white/60">
                    "{profile.customStatus}"
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold px-2 py-1 gap-1.5 border shrink-0 self-start hidden sm:flex",
                  S.badge[status],
                )}
              >
                <StatusDot s={status} size="md" />
                {S.label[status]}
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="relative mt-4 flex gap-2 flex-wrap">
              {profile.email && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-semibold"
                  asChild
                >
                  <a href={`mailto:${profile.email}`}>
                    <Mail className="size-3.5" />
                    Send Email
                  </a>
                </Button>
              )}
              {profile.personalInfo?.phone && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-semibold"
                  asChild
                >
                  <a href={`tel:${profile.personalInfo.phone}`}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-semibold"
                onClick={() => userId && openDm(userId)}
                disabled={dmLoading}
              >
                {dmLoading ? (
                  <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <MessageCircle className="size-3.5" />
                )}
                {dmLoading ? "Opening…" : "Message"}
              </Button>
            </div>
          </div>

          {/* Bio */}
          {profile.personalInfo?.bio && (
            <div className="px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                About
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {profile.personalInfo.bio}
              </p>
            </div>
          )}

          {/* Info grid */}
          {infoItems.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">
                Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {infoItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/10 transition-colors"
                  >
                    <item.icon className={cn("size-4 shrink-0", item.color)} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                        {item.label}
                      </p>
                      {"href" in item && item.href ? (
                        <a
                          href={item.href}
                          className="text-sm font-semibold truncate block hover:text-primary transition-colors"
                        >
                          {item.value as string}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold truncate">{item.value as string}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account status */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">
              Account
            </p>
            <div className="flex flex-wrap gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  S.badge[status],
                )}
              >
                <StatusDot s={status} />
                {S.label[status]}
              </div>
              {(profile as any).accountStatus?.isActive !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                    (profile as any).accountStatus?.isActive
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      (profile as any).accountStatus?.isActive ? "bg-green-500" : "bg-red-400",
                    )}
                  />
                  {(profile as any).accountStatus?.isActive ? "Active" : "Inactive"}
                </div>
              )}
              {(profile as any).accountStatus?.isVerified !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                    (profile as any).accountStatus?.isVerified
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40"
                      : "bg-muted/60 text-muted-foreground border-border/40",
                  )}
                >
                  <Shield className="size-3" />
                  {(profile as any).accountStatus?.isVerified ? "Verified" : "Unverified"}
                </div>
              )}
              {profile.createdAt && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-muted/40 text-muted-foreground border-border/30">
                  <CalendarDays className="size-3" />
                  Member since {fmtMonthYearMDT(profile.createdAt)}
                </div>
              )}
              {profile.lastActive && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-muted/40 text-muted-foreground border-border/30">
                  <Clock className="size-3" />
                  {status === "offline" ? "Last active" : "Active"}{" "}
                  {formatDistanceToNow(new Date(profile.lastActive), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
