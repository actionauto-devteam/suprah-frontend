"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Calendar,
  Search,
  ArrowLeft,
  Loader2,
  User,
  Clock,
  Building2,
  IdCard,
  Shield,
  LogIn,
  LogOut,
  Camera,
  AlertCircle,
  Truck,
  FileText,
  Car,
  DollarSign,
  Gift,
  Zap,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import {
  initializeSocket,
  getSocket,
} from "@/lib/socket.client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CrmUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  todayTimeLogs?: TimeLog[];
}

interface TimeLog {
  _id: string;
  type: "time-in" | "time-out";
  timestamp: string;
  note?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string | Date | undefined | null) {
  if (!date) return "—";
  const d = new Date(date as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(ts: string) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CrmProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"profile" | "activity">(
    "profile",
  );
  const [currentUser, setCurrentUser] = React.useState<CrmUser | null>(null);
  const [viewedUser, setViewedUser] = React.useState<CrmUser | null>(null);
  const [mainAvatar, setMainAvatar] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<CrmUser[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [token, setToken] = React.useState("");

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editAvatarFile, setEditAvatarFile] = React.useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = React.useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isOwnProfile = viewedUser?._id === currentUser?._id;
  const viewedIsActive = viewedUser?.isActive !== false;

  // Load current CRM user
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) {
      router.replace("/crm");
      return;
    }
    setToken(t);
    apiClient
      .get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => {
        const u = res.data?.data || res.data;
        setCurrentUser(u);
        setViewedUser(u);
      })
      .catch(() => router.replace("/crm"))
      .finally(() => setIsLoading(false));
  }, [router]);

  // Fetch main system avatar for sync
  React.useEffect(() => {
    apiClient
      .get("/api/profile")
      .then((res) => {
        const p = res.data?.data || res.data;
        const av = p?.avatar || p?.avatarUrl;
        if (av) setMainAvatar(av);
      })
      .catch(() => { });
  }, []);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm.trim() || !token) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await apiClient.get(
          `/api/crm/users?search=${encodeURIComponent(searchTerm)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const allUsers: CrmUser[] = res.data?.data?.users || [];
        const q = searchTerm.trim().toLowerCase();
        const filtered = allUsers.filter((u) =>
          u.fullName?.toLowerCase().includes(q),
        );
        filtered.sort((a, b) => {
          const aName = (a.fullName ?? "").toLowerCase();
          const bName = (b.fullName ?? "").toLowerCase();
          const aStarts = aName.startsWith(q);
          const bStarts = bName.startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aName.localeCompare(bName);
        });
        setSearchResults(filtered.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, token]);

  // Edit dialog
  const handleOpenEdit = () => {
    setEditName(currentUser?.fullName ?? "");
    setEditEmail(currentUser?.email ?? "");
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setSaveError("");
    setIsEditOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setEditAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    if (!trimmedName) {
      setSaveError("Name cannot be empty.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setSaveError("Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    try {
      let newAvatarUrl = mainAvatar;

      if (editAvatarFile) {
        const formData = new FormData();
        formData.append(
          "avatar",
          editAvatarFile,
          editAvatarFile.name || "avatar.jpg",
        );
        const avatarRes = await apiClient.patch(
          "/api/profile/avatar",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        const av =
          avatarRes.data?.data?.avatar ||
          avatarRes.data?.data?.user?.avatar ||
          avatarRes.data?.avatar;
        if (av) {
          newAvatarUrl = `${av}?v=${Date.now()}`;
          setMainAvatar(newAvatarUrl);
        }
      }

      const nameChanged = trimmedName !== currentUser.fullName;
      const emailChanged = trimmedEmail !== currentUser.email;

      if (nameChanged)
        await apiClient.patch("/api/profile", { name: trimmedName });

      if (nameChanged || emailChanged) {
        try {
          await apiClient.patch(
            `/api/crm/users/${currentUser._id}`,
            {
              ...(nameChanged && { fullName: trimmedName }),
              ...(emailChanged && { email: trimmedEmail }),
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch {
          /* non-admin: CRM record unchanged */
        }
      }

      const updated: CrmUser = {
        ...currentUser,
        fullName: trimmedName,
        email: emailChanged ? trimmedEmail : currentUser.email,
        ...(newAvatarUrl ? { avatar: newAvatarUrl } : {}),
      };
      setCurrentUser(updated);
      setViewedUser(updated);
      setIsEditOpen(false);
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  const user = viewedUser;
  const resolvedAvatar = isOwnProfile && mainAvatar ? mainAvatar : user?.avatar;
  const editPreviewSrc =
    editAvatarPreview ?? (mainAvatar || currentUser?.avatar);

  return (
    <div className="h-[calc(100dvh-5rem)] flex flex-col bg-background overflow-hidden">

      {/* ── Sticky Header ───────────────────────────────────────────────────── */}
      <div className="border-b border-border/30 bg-background shrink-0 relative z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-3">

          {/* Title row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-[16px] font-bold tracking-tight">Team Directory</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10 pointer-events-none" />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground/40 z-10" />
            )}
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-[13px] rounded-lg border-border/30 bg-muted/10 focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30"
            />

            {/* Search Results Dropdown */}
            {searchTerm.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/30 bg-card shadow-2xl overflow-hidden">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 px-5 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u, i) => (
                    <button
                      key={u._id}
                      onClick={() => {
                        setViewedUser(u);
                        setSearchTerm("");
                        setSearchResults([]);
                        setActiveTab("profile");
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left ${i < searchResults.length - 1 ? "border-b border-border/20" : ""
                        }`}
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-border/30 shrink-0">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-slate-700 text-white text-xs font-bold">
                          {initials(u.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{u.fullName}</p>
                        <p className="text-[12px] text-muted-foreground/60">{u.username}</p>
                      </div>
                      <span className="text-[11px] text-emerald-500/80 capitalize shrink-0 border border-emerald-500/30 px-2 py-0.5 rounded-sm">
                        {u.role}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="flex items-center justify-center gap-2 px-5 py-4 text-sm text-muted-foreground/60">
                    <User className="h-4 w-4" />
                    No team members found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0.75 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">

          {/* Viewing another user banner */}
          {!isOwnProfile && viewedUser && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-[13px] text-muted-foreground">
                  Viewing{" "}
                  <span className="font-semibold text-foreground">
                    {viewedUser.fullName}
                  </span>
                  's profile
                </span>
              </div>
              <button
                onClick={() => {
                  setViewedUser(currentUser);
                  setActiveTab("profile");
                }}
                className="flex items-center gap-1 text-[12px] text-emerald-500 hover:text-emerald-400 transition-colors shrink-0"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to my profile
              </button>
            </div>
          )}

          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          <div className="flex border-b border-border/30">
            {(["profile", "activity"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={tab === "activity" && !isOwnProfile}
                className={`px-1 mr-6 pb-3 text-[14px] font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === tab
                  ? "border-emerald-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab === "profile" ? "User Profile" : "Activity Log"}
              </button>
            ))}
          </div>

          {/* ── Tab Content ─────────────────────────────────────────────────── */}
          {user ? (
            activeTab === "profile" ? (
              <div className="space-y-4">

                {/* ── Profile Header Card ─────────────────────────────────── */}
                <div className="rounded-xl border border-border/30 bg-card px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-5">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Avatar className="h-17 w-17 ring-2 ring-border/30 shadow-lg">
                          <AvatarImage src={resolvedAvatar} />
                          <AvatarFallback className="bg-slate-700 text-white text-xl font-bold">
                            {initials(user.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        {viewedIsActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-card" />
                        )}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-[17px] font-bold leading-tight tracking-tight">
                          {user.fullName}
                        </h2>
                        <p className="text-[12px] text-muted-foreground/70 mt-0.5">
                          Joined {formatDate(user.createdAt)}
                        </p>
                        <div className="flex items-center flex-wrap gap-2 mt-2.5">
                          <span className="inline-flex items-center border border-emerald-500/40 text-emerald-500 bg-emerald-500/10 capitalize text-[11px] h-5.5 px-2.5 rounded-sm font-medium">
                            {user.role}
                          </span>
                          <span className="text-[12px] text-muted-foreground/60 font-mono">
                            {user.username}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0 pt-0.5">
                      {isOwnProfile ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-4 text-[13px] border-emerald-500/40 text-emerald-500 bg-transparent hover:bg-emerald-500/10 hover:text-emerald-400 rounded-md"
                          onClick={handleOpenEdit}
                        >
                          Edit Profile
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 px-4 text-[13px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-md gap-1.5"
                          onClick={() =>
                            router.push(`/crm/supra-space?userId=${user._id}`)
                          }
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Message
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Contact Details + Account Summary ───────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contact Details */}
                  <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border/30">
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        Contact Details
                      </h3>
                    </div>
                    <div className="divide-y divide-border/20">
                      <InfoRow icon={User} label="Name" value={user.fullName} />
                      <InfoRow icon={IdCard} label="Employee ID" value={user.username} />
                      <InfoRow icon={Mail} label="Email" value={user.email} />
                    </div>
                  </div>

                  {/* Account Summary */}
                  <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border/30">
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        Account Summary
                      </h3>
                    </div>
                    <div className="divide-y divide-border/20">
                      {/* Status */}
                      <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                          <Shield className="h-4.25 w-4.25 text-muted-foreground/40" />
                          <span className="text-[14px] text-muted-foreground">Status</span>
                        </div>
                        <span
                          className={`inline-flex items-center text-[12px] px-2.5 py-0.5 rounded-full font-medium ${viewedIsActive
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                            }`}
                        >
                          {viewedIsActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <InfoRow icon={Building2} label="Role" value={user.role} capitalize />
                      {user.lastLoginAt && (
                        <InfoRow icon={Clock} label="Last Login" value={formatDate(user.lastLoginAt)} />
                      )}
                      <InfoRow icon={Calendar} label="Joined" value={formatDate(user.createdAt)} />
                    </div>
                  </div>
                </div>

                {/* ── Compact Activity Log ─────────────────────────────────── */}
                <ActivityLogSection
                  token={token}
                  todayLogs={user.todayTimeLogs ?? []}
                  compact
                  onViewAll={isOwnProfile ? () => setActiveTab("activity") : undefined}
                />
              </div>
            ) : (
              <ActivityLogSection
                token={token}
                todayLogs={user.todayTimeLogs ?? []}
              />
            )
          ) : (
            <div className="flex items-center justify-center py-24">
              <p className="text-[14px] text-muted-foreground">Profile not found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Profile Dialog ───────────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Changes sync to your main account automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group focus:outline-none"
                aria-label="Change profile photo"
              >
                <Avatar className="h-20 w-20 ring-2 ring-border/40 shadow-md">
                  <AvatarImage src={editPreviewSrc ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white text-lg font-bold">
                    {initials(currentUser?.fullName ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <p className="text-[12px] text-muted-foreground">Click photo to change</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium" htmlFor="edit-name">
                Full Name
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your full name"
                className="rounded-lg border-border/40 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium" htmlFor="edit-email">
                Email Address
              </label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-lg border-border/40 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30"
                disabled={isSaving}
              />
            </div>

            {saveError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-[13px] text-destructive">{saveError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg border-border/40"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <Icon className="h-4.25 w-4.25 text-muted-foreground/40" />
        <span className="text-[14px] text-muted-foreground">{label}</span>
      </div>
      <span
        className={`text-[14px] font-medium text-right truncate max-w-[55%] ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Activity Log Helpers ──────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 15;

// Only display meaningful actions — matches backend IMPORTANT_ACTIVITY_TYPES + CRM time logs
const IMPORTANT_ACTIVITY_TYPES = new Set([
  "time-in",
  "time-out",
  "profile_update",
  "avatar_updated",
  "shipment_created",
  "shipment_updated",
  "shipment_deleted",
  "load_created",
  "load_updated",
  "load_deleted",
  "load_posted",
  "load_assigned",
  "load_delivered",
  "quote_created",
  "quote_updated",
  "quote_deleted",
  "payment_completed",
  "payout_received",
]);

function getActivityStyle(type: string): {
  Icon: React.ElementType;
  className: string;
} {
  const t = type.toLowerCase();
  if (t === "time-in")
    return { Icon: LogIn, className: "bg-emerald-500/15 text-emerald-400" };
  if (t === "time-out")
    return { Icon: LogOut, className: "bg-orange-500/15 text-orange-400" };
  if (t.startsWith("load") || t.startsWith("shipment"))
    return { Icon: Truck, className: "bg-blue-500/15 text-blue-400" };
  if (t.startsWith("quote"))
    return { Icon: FileText, className: "bg-indigo-500/15 text-indigo-400" };
  if (t.startsWith("vehicle"))
    return { Icon: Car, className: "bg-sky-500/15 text-sky-400" };
  if (t.includes("payment") || t.includes("payout") || t.includes("wallet") || t.includes("withdrawal"))
    return { Icon: DollarSign, className: "bg-yellow-500/15 text-yellow-500" };
  if (t.includes("password") || t.includes("compliance") || t.includes("doc_"))
    return { Icon: Shield, className: "bg-emerald-500/15 text-emerald-500" };
  if (t.includes("profile") || t.includes("avatar") || t.includes("settings") || t.includes("email_change"))
    return { Icon: User, className: "bg-blue-500/15 text-blue-400" };
  if (t.includes("calendar"))
    return { Icon: Calendar, className: "bg-blue-500/15 text-blue-400" };
  if (t.includes("referral"))
    return { Icon: Gift, className: "bg-pink-500/15 text-pink-400" };
  if (t.includes("mail") || t.includes("email"))
    return { Icon: Mail, className: "bg-blue-500/15 text-blue-400" };
  return { Icon: Zap, className: "bg-emerald-500/15 text-emerald-500" };
}

function getDayLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Activity Log Section ──────────────────────────────────────────────────────

function ActivityLogSection({
  token,
  todayLogs,
  compact,
  onViewAll,
}: {
  token: string;
  todayLogs: TimeLog[];
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const socketRef = React.useRef<ReturnType<typeof getSocket>>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  // Load activities
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [mainRes, crmRes] = await Promise.allSettled([
          apiClient.get("/api/profile/activities?limit=200"),
          token
            ? apiClient.get("/api/crm/time-logs", {
              headers: { Authorization: `Bearer ${token}` },
            })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const mainItems: ActivityItem[] = [];
        if (mainRes.status === "fulfilled" && mainRes.value) {
          const data = mainRes.value.data?.data ?? [];
          for (const a of Array.isArray(data) ? data : []) {
            if (!IMPORTANT_ACTIVITY_TYPES.has(a.type)) continue;
            mainItems.push({
              id: a._id,
              type: a.type ?? "other",
              title: a.title ?? a.type ?? "Activity",
              description: a.description ?? "",
              timestamp: a.timestamp ?? a.createdAt,
            });
          }
        }

        const crmItems: ActivityItem[] = [];
        if (crmRes.status === "fulfilled" && crmRes.value) {
          const raw =
            crmRes.value.data?.data?.logs ??
            crmRes.value.data?.data ??
            crmRes.value.data?.logs ??
            [];
          for (const log of Array.isArray(raw) ? raw : []) {
            crmItems.push({
              id: log._id,
              type: log.type,
              title: log.type === "time-in" ? "Clocked In" : "Clocked Out",
              description:
                log.note ??
                (log.type === "time-in"
                  ? "Started work session"
                  : "Ended work session"),
              timestamp: log.timestamp,
            });
          }
        } else if (todayLogs.length > 0) {
          for (const log of todayLogs) {
            crmItems.push({
              id: log._id,
              type: log.type,
              title: log.type === "time-in" ? "Clocked In" : "Clocked Out",
              description: log.note ?? "",
              timestamp: log.timestamp,
            });
          }
        }

        const merged = [...mainItems, ...crmItems].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        if (!cancelled) setItems(merged);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, todayLogs]);

  // Real-time socket
  React.useEffect(() => {
    if (!token) return;
    try {
      const sock = initializeSocket(token);
      socketRef.current = sock;

      sock.on("profile:activity_created", (activity: any) => {
        if (!IMPORTANT_ACTIVITY_TYPES.has(activity.type)) return;
        const newActivity: ActivityItem = {
          id: activity._id,
          type: activity.type ?? "other",
          title: activity.title ?? activity.type ?? "Activity",
          description: activity.description ?? "",
          timestamp: activity.timestamp ?? activity.createdAt,
        };
        setItems((prev) => [newActivity, ...prev]);
      });

      sock.on("crm:time_log_created", (log: any) => {
        const newActivity: ActivityItem = {
          id: log._id,
          type: log.type,
          title: log.type === "time-in" ? "Clocked In" : "Clocked Out",
          description:
            log.note ??
            (log.type === "time-in" ? "Started work session" : "Ended work session"),
          timestamp: log.timestamp,
        };
        setItems((prev) => [newActivity, ...prev]);
      });

      sock.on("activity:created", (activity: any) => {
        if (!IMPORTANT_ACTIVITY_TYPES.has(activity.type)) return;
        const newActivity: ActivityItem = {
          id: activity._id,
          type: activity.type ?? "other",
          title: activity.title ?? activity.type ?? "Activity",
          description: activity.description ?? "",
          timestamp: activity.timestamp ?? activity.createdAt,
        };
        setItems((prev) => [newActivity, ...prev]);
      });
    } catch (error) {
      console.error("Failed to initialize socket for activities:", error);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current?.off("profile:activity_created");
        socketRef.current?.off("crm:time_log_created");
        socketRef.current?.off("activity:created");
      }
    };
  }, [token]);

  // ── Compact mode (dot timeline in User Profile tab) ──────────────────────
  if (compact) {
    const recent = items.slice(0, 5);
    return (
      <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/30">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Activity Log
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground/60">No activity yet</p>
          </div>
        ) : (
          <div className="px-5 py-1 divide-y divide-border/20">
            {recent.map((item) => (
              <div key={item.id} className="flex items-start gap-4 py-3.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.75 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium leading-snug">{item.title}</p>
                  <p className="text-[12px] text-muted-foreground/55 mt-0.5">
                    {formatDateTime(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="block w-full px-5 py-3 border-t border-border/30 text-[13px] text-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/10 transition-colors"
          >
            View all activity
          </button>
        )}
      </div>
    );
  }

  // ── Full mode (Activity Log tab) ─────────────────────────────────────────

  const months = (() => {
    const seen = new Set<string>();
    for (const item of items) {
      const d = new Date(item.timestamp);
      seen.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(seen).sort().reverse();
  })();

  const filtered = selectedMonth === "all"
    ? items
    : items.filter((item) => {
      const d = new Date(item.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const grouped = (() => {
    const groups: { label: string; items: ActivityItem[] }[] = [];
    const indexMap: Record<string, number> = {};
    for (const item of paginated) {
      const label = getDayLabel(item.timestamp);
      if (indexMap[label] === undefined) {
        indexMap[label] = groups.length;
        groups.push({ label, items: [] });
      }
      groups[indexMap[label]].items.push(item);
    }
    return groups;
  })();

  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/30 bg-card p-16 text-center">
        <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-[14px] font-medium text-muted-foreground">No activity logs yet</p>
        <p className="text-[12px] text-muted-foreground/50 mt-1.5">
          Actions across the app will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground/70">
          <span className="font-medium text-foreground">{filtered.length}</span>{" "}
          event{filtered.length !== 1 ? "s" : ""}
          {selectedMonth !== "all" && (
            <span className="text-muted-foreground/50"> · {formatMonthLabel(selectedMonth)}</span>
          )}
        </p>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-9 w-44 text-[13px] rounded-lg border-border/30 bg-muted/10">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Day-grouped activity */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-card p-10 text-center">
          <p className="text-[14px] text-muted-foreground">No activity for this period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div
              key={group.label}
              className="rounded-xl border border-border/30 bg-card overflow-hidden"
            >
              {/* Day header */}
              <div className="px-5 py-3 border-b border-border/30 bg-muted/10">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.label}
                </p>
              </div>

              {/* Items */}
              <div className="divide-y divide-border/20">
                {group.items.map((item) => {
                  const { Icon, className } = getActivityStyle(item.type);
                  return (
                    <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                      <div
                        className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${className}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium leading-snug">{item.title}</p>
                        {item.description && (
                          <p className="text-[12px] text-muted-foreground/55 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[12px] text-muted-foreground/55 shrink-0 pt-0.5 tabular-nums">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 pb-3">
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-[13px] gap-2 rounded-lg border-border/30"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-[13px] text-muted-foreground">
            Page <span className="font-medium text-foreground">{safePage}</span>{" "}
            of <span className="font-medium text-foreground">{totalPages}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-[13px] gap-2 rounded-lg border-border/30"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
