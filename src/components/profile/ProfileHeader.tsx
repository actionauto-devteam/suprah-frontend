import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Camera,
  MapPin,
  CircleDot,
  Crown,
  Truck,
  Zap,
  Calendar,
  ShieldCheck,
  Globe,
  User,
  Mail,
  Pencil,
  Share2,
  Copy,
  Facebook,
  Linkedin,
  MessageCircle,
} from "lucide-react";
import { UserProfile, OnlineStatus } from "@/types/user";
import { cn, resolveImageUrl, getInitials } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import ProfileImageCropper from "@/components/ProfileImageCropper";
import { onlineStatusOptions, languageOptions } from "./profile-constants";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-cyan-500 to-teal-600",
  "from-emerald-500 to-green-600",
  "from-amber-500 to-orange-600",
  "from-red-500 to-rose-600",
  "from-fuchsia-500 to-pink-600",
];

const getInitialColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

interface ProfileHeaderProps {
  profile: UserProfile | null;
  authUser: any;
  avatarUrl: string | null;
  onlineStatus: OnlineStatus;
  customStatus: string;
  triggerRefresh: () => void;
  setAvatarUrl: (url: string | null) => void;
  refreshAuthUser?: () => Promise<void> | void;
  getToken: () => Promise<string | null>;
  setShowStatusDialog: (show: boolean) => void;
  onEditProfile?: () => void;
}

const normalizeAvatarValue = (value?: string | null) => {
  const normalized = (value || "").trim();
  if (!normalized) return "";
  if (normalized === "null" || normalized === "undefined") return "";
  return normalized;
};

const roleBadgeConfig: Record<
  string,
  { label: string; icon: typeof Crown; gradient: string }
> = {
  super_admin: {
    label: "Super Admin",
    icon: Crown,
    gradient: "from-amber-400 to-orange-500",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    gradient: "from-blue-400 to-indigo-500",
  },
  driver: {
    label: "Driver",
    icon: Truck,
    gradient: "from-emerald-400 to-teal-500",
  },
  customer: {
    label: "Customer",
    icon: User,
    gradient: "from-slate-400 to-gray-500",
  },
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  authUser,
  avatarUrl,
  onlineStatus,
  customStatus,
  triggerRefresh,
  setAvatarUrl,
  refreshAuthUser,
  getToken,
  setShowStatusDialog,
  onEditProfile,
}) => {
  const [isCropperOpen, setIsCropperOpen] = React.useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false);
  const currentStatus =
    onlineStatusOptions.find((s) => s.value === onlineStatus) ||
    onlineStatusOptions[0];
  const role =
    roleBadgeConfig[profile?.role || "customer"] || roleBadgeConfig.customer;
  const RoleIcon = role.icon;

  const handleSaveAvatar = async (croppedImage: Blob) => {
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("avatar", croppedImage, "avatar.jpg");

      const response = await apiClient.patch("/api/profile/avatar", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const newUrl = response.data.data.avatar;
      if (!newUrl) {
        toast.error("Failed to update avatar URL");
        throw new Error("Avatar URL missing in response");
      }
      const cacheBustedUrl = `${newUrl}${newUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
      setAvatarUrl(cacheBustedUrl);
      await refreshAuthUser?.();
      triggerRefresh();
      toast.success("Profile picture updated");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update avatar");
      throw error;
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const token = await getToken();
      await apiClient.delete("/api/profile/avatar", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvatarUrl("");
      await refreshAuthUser?.();
      triggerRefresh();
      toast.success("Profile picture removed");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove avatar");
      throw error;
    }
  };

  const handleCopyId = () => {
    const id = profile?._id?.slice(-8).toUpperCase();
    if (id) {
      navigator.clipboard.writeText(id);
      toast.success("Account ID copied");
    }
  };

  const getProfileShareUrl = () => {
    if (typeof window === "undefined") return "/profile";
    return `${window.location.origin}/profile`;
  };

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(getProfileShareUrl());
      toast.success("Profile link copied");
    } catch {
      toast.error("Unable to copy profile link");
    }
  };

  const handleShareExternally = async () => {
    await handleCopyProfileLink();
    toast.info("Use the social share options in this menu.");
  };

  const openShareWindow = (targetUrl: string) => {
    if (typeof window === "undefined") return false;
    const popup = window.open(
      targetUrl,
      "_blank",
      "noopener,noreferrer,width=620,height=700",
    );
    return Boolean(popup);
  };

  const handleShareToPlatform = async (
    platform: "facebook" | "x" | "linkedin" | "whatsapp" | "email",
  ) => {
    const url = getProfileShareUrl();
    const title = `${displayName} • Action Auto`;
    const text = `View ${displayName}'s profile on Action Auto`;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(text);

    const shareUrlByPlatform: Record<typeof platform, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    };

    const opened = openShareWindow(shareUrlByPlatform[platform]);
    if (!opened) {
      await handleCopyProfileLink();
      toast.info("Popup blocked. Profile link copied instead.");
    }
  };

  const displayName =
    profile?.name ||
    (profile?.firstName
      ? `${profile.firstName} ${profile.lastName || ""}`.trim()
      : null) ||
    authUser?.fullName ||
    authUser?.firstName ||
    "User";

  const avatarSource =
    avatarUrl !== null
      ? avatarUrl
      : profile?.avatarUrl || profile?.avatar || authUser?.imageUrl;
  const avatarSrc = normalizeAvatarValue(avatarSource);
  const resolvedAvatarSrc = resolveImageUrl(avatarSrc);
  const showAvatarImage = Boolean(resolvedAvatarSrc) && !avatarLoadFailed;

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  const initialGradient = getInitialColor(displayName);

  return (
    <div className="relative mb-6 sm:mb-8 w-full max-w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border border-gray-200/60 dark:border-white/10 group h-fit flex flex-col">
      <div className="absolute inset-0 bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.07]">
          <svg
            className="w-full h-full"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M-50 350 Q200 320 400 330 Q600 340 850 310"
              stroke="url(#roadGrad)"
              strokeWidth="80"
              fill="none"
              opacity="0.4"
            />
            <line
              x1="0"
              y1="335"
              x2="800"
              y2="325"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="20 15"
              opacity="0.5"
              className="animate-road-dash"
            />
          </svg>
        </div>

        <div className="absolute bottom-8 sm:bottom-12 right-12 sm:right-24 opacity-[0.08] animate-car-cruise">
          <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
            <path
              d="M20 35 L25 20 Q30 10 45 10 L75 10 Q90 10 95 20 L100 35"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
            />
            <rect
              x="15"
              y="35"
              width="90"
              height="10"
              rx="3"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="35"
              cy="48"
              r="6"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="85"
              cy="48"
              r="6"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
            />
            <rect
              x="30"
              y="14"
              width="18"
              height="12"
              rx="2"
              stroke="#06b6d4"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <rect
              x="55"
              y="14"
              width="18"
              height="12"
              rx="2"
              stroke="#06b6d4"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
          </svg>
        </div>

        <div className="absolute bottom-6 sm:bottom-10 left-[15%] opacity-[0.06] animate-car-cruise-slow">
          <svg width="80" height="35" viewBox="0 0 120 50" fill="none">
            <path
              d="M20 35 L25 20 Q30 10 45 10 L75 10 Q90 10 95 20 L100 35"
              stroke="#06b6d4"
              strokeWidth="2"
              fill="none"
            />
            <rect
              x="15"
              y="35"
              width="90"
              height="10"
              rx="3"
              stroke="#06b6d4"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="35"
              cy="48"
              r="6"
              stroke="#06b6d4"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="85"
              cy="48"
              r="6"
              stroke="#06b6d4"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="absolute top-6 right-[20%] w-1.5 h-1.5 rounded-full bg-emerald-400/30 animate-pulse" />
        <div
          className="absolute top-12 right-[35%] w-1 h-1 rounded-full bg-cyan-400/20 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-8 left-[25%] w-1 h-1 rounded-full bg-emerald-300/20 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 via-transparent to-cyan-500/10" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black/40 to-transparent" />

      <div className="relative w-full min-w-0 px-4 py-5 sm:px-8 sm:py-8 md:px-10 md:py-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-8">
        <div className="relative group/avatar shrink-0">
          <div className="absolute -inset-1 rounded-2xl sm:rounded-3xl bg-linear-to-br from-emerald-400/40 to-cyan-400/40 blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
          <div
            className="relative w-20 h-20 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl sm:rounded-3xl overflow-hidden ring-[3px] ring-white/20 dark:ring-white/10 shadow-2xl transition-all duration-300 group-hover/avatar:ring-emerald-400/50 cursor-pointer"
            onClick={() => setIsCropperOpen(true)}
          >
            {showAvatarImage ? (
              <img
                src={resolvedAvatarSrc}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full bg-linear-to-br flex items-center justify-center",
                  initialGradient,
                )}
              >
                <span className="text-white font-bold text-2xl sm:text-4xl md:text-5xl select-none">
                  {getInitials(displayName)}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <Camera className="size-6 sm:size-8 text-white drop-shadow-lg" />
            </div>
          </div>

          <ProfileImageCropper
            isOpen={isCropperOpen}
            onClose={() => setIsCropperOpen(false)}
            onSave={handleSaveAvatar}
            onRemove={handleRemoveAvatar}
            currentImage={showAvatarImage ? resolvedAvatarSrc : undefined}
          />

          <button
            onClick={() => setShowStatusDialog(true)}
            className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 h-7 w-7 sm:h-9 sm:w-9 rounded-xl bg-gray-900 dark:bg-zinc-900 shadow-lg border-2 border-gray-700 hover:scale-110 transition-all active:scale-95 flex items-center justify-center"
          >
            <div
              className={cn(
                "w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full",
                currentStatus.color,
              )}
            />
          </button>
        </div>

        <div className="flex-1 min-w-0 w-full text-center sm:text-left space-y-2.5 sm:space-y-3">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight break-words sm:truncate max-w-full">
              {displayName}
            </h1>
            <Badge
              className={cn(
                "bg-linear-to-r text-white border-0 shadow-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0",
                role.gradient,
              )}
            >
              <RoleIcon className="size-3 mr-1" />
              {role.label}
            </Badge>
          </div>

          {profile?.email && (
            <p className="text-white/40 text-xs sm:text-sm font-medium break-all sm:break-normal sm:truncate">
              {profile.email}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full">
            <button
              onClick={() => setShowStatusDialog(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all max-w-full"
            >
              <CircleDot
                className={cn(
                  "size-3",
                  currentStatus.color.replace("bg-", "text-"),
                )}
              />
              <span className="text-white/70 font-medium text-xs truncate max-w-32 sm:max-w-60">
                {customStatus || "Set your status..."}
              </span>
            </button>
            <div className="hidden sm:flex items-center gap-3 text-white/40 text-xs font-medium">
              {profile?.personalInfo?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3 text-emerald-400/60" />
                  {profile.personalInfo.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-3 text-cyan-400/60" />
                {profile?.personalInfo?.language
                  ? languageOptions.find(
                      (l) => l.code === profile?.personalInfo?.language,
                    )?.name
                  : "English"}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto flex items-center justify-center sm:justify-end flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm font-medium max-w-full"
              >
                <Share2 className="size-3.5 mr-1.5" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 bg-gray-900 border-white/10 text-white"
            >
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={handleCopyProfileLink}
              >
                <Copy className="size-4 mr-2" />
                Copy profile link
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={handleShareExternally}
              >
                <Share2 className="size-4 mr-2" />
                Copy & share manually
              </DropdownMenuItem>
              <div className="my-1 mx-2 h-px bg-white/10" />
              <p className="px-3 py-1 text-[11px] uppercase tracking-wide text-white/50">
                Share using
              </p>
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={() => handleShareToPlatform("facebook")}
              >
                <Facebook className="size-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={() => handleShareToPlatform("x")}
              >
                <Share2 className="size-4 mr-2" />X (Twitter)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={() => handleShareToPlatform("linkedin")}
              >
                <Linkedin className="size-4 mr-2" />
                LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={() => handleShareToPlatform("whatsapp")}
              >
                <MessageCircle className="size-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-white/10 focus:text-white"
                onClick={() => handleShareToPlatform("email")}
              >
                <Mail className="size-4 mr-2" />
                Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm font-medium hidden sm:inline-flex"
            onClick={handleCopyId}
          >
            <Copy className="size-3.5 mr-1.5" />
            ID
          </Button>
        </div>
      </div>

      <div className="relative w-full border-t border-white/5 bg-white/3 backdrop-blur-md px-4 py-3.5 sm:px-8 sm:py-4 grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            label: "Role",
            value: profile?.role?.replace("_", " ") || "Customer",
            icon: Crown,
            color: "text-amber-400/80",
          },
          {
            label: "Account ID",
            value: profile?._id?.slice(-8).toUpperCase() || "NEW",
            icon: Zap,
            color: "text-cyan-400/80",
          },
          {
            label: "Member Since",
            value: profile?.createdAt
              ? new Date(profile.createdAt).getFullYear().toString()
              : new Date().getFullYear().toString(),
            icon: Calendar,
            color: "text-emerald-400/80",
          },
          {
            label: "Identity",
            value: profile?.securityStatus?.emailVerified
              ? "Verified"
              : "Unverified",
            icon: ShieldCheck,
            color: "text-pink-400/80",
          },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col gap-0.5 min-w-0">
            <span className="text-white/25 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
              {stat.label}
            </span>
            <div className="flex items-center gap-1.5">
              <stat.icon className={cn("size-3.5 sm:size-4", stat.color)} />
              <span className="text-white/80 font-bold text-sm sm:text-base capitalize truncate min-w-0">
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
