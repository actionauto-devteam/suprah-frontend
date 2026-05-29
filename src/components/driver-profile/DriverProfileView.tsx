"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuthActions, useUser, useAuth } from "@/providers/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfileContext } from "@/context/ProfileContext";
import { useOrg } from "@/hooks/useOrg";
import { apiClient } from "@/lib/api-client";
import {
  UserProfile,
  OnlineStatus,
  PersonalInfo,
  RecentActivity,
  SocialLink,
} from "@/types/user";
import { NotificationPreferences } from "@/types/notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  User,
  Bell,
  Activity,
  Sparkles,
  Loader2,
  UserCog,
  CircleDot,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { PersonalInfoTab } from "@/components/profile/PersonalInfoTab";
import { NotificationsTab } from "@/components/profile/NotificationsTab";
import { ActivityTab } from "@/components/profile/ActivityTab";
import { SupportTab } from "@/components/profile/SupportTab";
import { ProfileDialogs } from "@/components/profile/ProfileDialogs";
import { containsCurseWord } from "@/components/profile/profile-constants";
import { DriverOverviewTab } from "./DriverOverviewTab";
import { driverStatusOptions } from "./driver-profile-constants";
import { DriverProfile } from "@/types/driver-profile";

export const DriverProfileView: React.FC = () => {
  const { user: authUser } = useUser();
  const { signOut, openUserProfile } = useAuthActions();
  const { getToken } = useAuth();
  const { avatarUrl, setAvatarUrl, triggerRefresh, refreshKey } =
    useProfileContext();
  const { organization } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({});
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bioError, setBioError] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [hasFetchedActivities, setHasFetchedActivities] = useState(false);
  const [hasFetchedDriverExtras, setHasFetchedDriverExtras] = useState(false);

  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>("online");
  const [customStatus, setCustomStatus] = useState("");
  const [customStatusError, setCustomStatusError] = useState<string | null>(
    null,
  );

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const [driverStats, setDriverStats] = useState({
    deliveriesCompleted: 0,
    onTimeRate: 0,
    totalMiles: 0,
    rating: 0,
    activeDeliveries: 0,
    totalAssigned: 0,
  });

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(
    null,
  );

  const toastShownRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get("/api/profile", { headers });
      const data = response.data.data;
      setProfile(data);
      const pInfo = data.personalInfo || {};
      if (pInfo.dateOfBirth)
        pInfo.dateOfBirth = pInfo.dateOfBirth.substring(0, 10);
      setPersonalInfo(pInfo);
      setPhoneCountryCode(data.personalInfo?.phoneCountryCode || "+1");
      setSocialLinks(data.personalInfo?.socialLinks || []);
      setPreferences(data.notificationPreferences);
      setActivities(data.recentActivity || data.recentActivities || []);
      setHasFetchedActivities(false);
      setHasFetchedDriverExtras(false);
      setOnlineStatus(data.onlineStatus || "online");
      setCustomStatus(data.customStatus || "");
      const resolvedAvatar = data.avatarUrl || data.avatar || "";
      setAvatarUrl(
        resolvedAvatar
          ? `${resolvedAvatar}${resolvedAvatar.includes("?") ? "&" : "?"}v=${Date.now()}`
          : "",
      );
    } catch {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.error("Failed to load profile data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [getToken, setAvatarUrl]);

  const fetchActivities = useCallback(
    async (force = false) => {
      if (activitiesLoading) return;
      if (!force && hasFetchedActivities) return;

      try {
        setActivitiesLoading(true);
        const token = await getToken();
        const activityRes = await apiClient.get("/api/profile/activities", {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 30 },
        });
        const latestActivities = activityRes?.data?.data;
        if (Array.isArray(latestActivities)) {
          setActivities(latestActivities);
        }
      } catch {
      } finally {
        setHasFetchedActivities(true);
        setActivitiesLoading(false);
      }
    },
    [activitiesLoading, getToken, hasFetchedActivities],
  );

  const fetchDriverExtras = useCallback(
    async (force = false) => {
      if (!force && hasFetchedDriverExtras) return;

      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, dpRes] = await Promise.allSettled([
          apiClient.get("/api/profile/driver-stats", { headers }),
          apiClient.get("/api/driver-profile", { headers }),
        ]);

        if (statsRes.status === "fulfilled" && statsRes.value.data?.data) {
          setDriverStats((prev) => ({ ...prev, ...statsRes.value.data.data }));
        }

        if (dpRes.status === "fulfilled" && dpRes.value.data?.data) {
          setDriverProfile(dpRes.value.data.data);
        }
      } catch {
      } finally {
        setHasFetchedDriverExtras(true);
      }
    },
    [getToken, hasFetchedDriverExtras],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, refreshKey]);

  useEffect(() => {
    if (activeTab === "activity" && profile) {
      fetchActivities();
    }
  }, [activeTab, fetchActivities, profile]);

  useEffect(() => {
    if (activeTab === "overview" && profile) {
      fetchDriverExtras();
    }
  }, [activeTab, fetchDriverExtras, profile]);

  const handleTabChange = (value: string) => setActiveTab(value);

  const handleBioChange = (value: string) => {
    setPersonalInfo({ ...personalInfo, bio: value });
    setBioError(value.length > 500 ? "Bio must be 500 characters or less" : "");
  };

  const addSocialLink = () => {
    if (socialLinks.length < 4)
      setSocialLinks([...socialLinks, { label: "", url: "" }]);
  };

  const updateSocialLink = (
    index: number,
    field: "label" | "url",
    value: string,
  ) => {
    const newLinks = [...socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setSocialLinks(newLinks);
  };

  const removeSocialLink = (index: number) =>
    setSocialLinks(socialLinks.filter((_, i) => i !== index));

  const handleSavePersonalInfo = async () => {
    setShowSaveConfirmDialog(false);
    if (personalInfo.bio && personalInfo.bio.length > 500) {
      toast.error("Bio must be 500 characters or less");
      return;
    }
    const phone = personalInfo.phone?.replace(/\D/g, "") || "";
    if (phone && phone.length !== 10) {
      toast.error("Phone number must be a valid 10-digit US number");
      return;
    }
    for (const link of socialLinks) {
      if (link.url && !/^https?:\/\/.+/.test(link.url)) {
        toast.error(
          `Invalid URL for "${link.label || "link"}". Must start with https://`,
        );
        return;
      }
      if (link.label && link.label.length > 30) {
        toast.error("Link labels must be 30 characters or less");
        return;
      }
    }
    const fieldsToCheck = [
      personalInfo.bio,
      personalInfo.jobTitle,
      personalInfo.department,
      customStatus,
    ].filter(Boolean);
    for (const field of fieldsToCheck) {
      if (field && containsCurseWord(field)) {
        toast.error("Please remove inappropriate language");
        return;
      }
    }
    setIsSaving(true);
    try {
      const cleanLinks = socialLinks.filter(
        (l) => l.label?.trim() || l.url?.trim(),
      );
      const updatedInfo = {
        ...personalInfo,
        phoneCountryCode,
        socialLinks: cleanLinks,
      };
      const token = await getToken();
      await apiClient.patch("/api/profile/personal-info", updatedInfo, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Personal information updated");
      setEditingPersonalInfo(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to save information",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!preferences) return;
    setSavingPreference(key);
    const oldPreferences = { ...preferences };
    setPreferences({ ...preferences, [key]: value });
    try {
      const token = await getToken();
      await apiClient.patch(
        "/api/profile/notification-preferences",
        { [key]: value },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch {
      setPreferences(oldPreferences);
      toast.error("Failed to update preferences");
    } finally {
      setSavingPreference(null);
    }
  };

  const handleBulkNotifications = async (enable: boolean) => {
    if (!preferences) return;
    setSavingPreference("all");
    try {
      const token = await getToken();
      const updates: Record<string, boolean> = {};
      Object.keys(preferences).forEach((key) => {
        if (
          typeof preferences[key as keyof NotificationPreferences] === "boolean"
        )
          updates[key] = enable;
      });
      await apiClient.patch("/api/profile/notification-preferences", updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProfile();
      toast.success(
        enable ? "All notifications enabled" : "All notifications disabled",
      );
    } catch {
      toast.error("Failed to update notifications");
    } finally {
      setSavingPreference(null);
    }
  };

  const handleCustomStatusChange = (text: string) => {
    setCustomStatus(text);
    setCustomStatusError(
      containsCurseWord(text) ? "Please remove inappropriate language" : null,
    );
  };

  const handleUpdateDriverStatus = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      await apiClient.patch(
        "/api/profile/personal-info",
        { onlineStatus, customStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Status updated");
      setShowStatusDialog(false);
      fetchProfile();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      const token = await getToken();
      await apiClient.delete("/api/profile/delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Account deleted");
      signOut();
      router.push("/");
    } catch {
      toast.error("Failed to delete account. Contact support.");
    }
  };

  const handleLogout = () => {
    signOut();
    router.push("/");
  };

  const getNotificationStats = () => {
    if (!preferences) return { enabled: 0, total: 0 };
    const keys = Object.keys(preferences).filter(
      (key) =>
        typeof preferences[key as keyof NotificationPreferences] === "boolean",
    );
    return {
      enabled: keys.filter(
        (key) => preferences[key as keyof NotificationPreferences],
      ).length,
      total: keys.length,
    };
  };

  if (isLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="size-10 animate-spin text-emerald-600" />
        </div>
        <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">
          Loading Profile
        </p>
      </div>
    );
  }

  const tabs = [
    { value: "overview", label: "Overview", icon: Sparkles },
    { value: "personal", label: "Personal", icon: UserCog },
    { value: "notifications", label: "Alerts", icon: Bell },
    { value: "activity", label: "Feed", icon: Activity },
    { value: "support", label: "Support", icon: HelpCircle },
  ];

  const currentDriverStatus =
    driverStatusOptions.find((s) => s.value === onlineStatus) ||
    driverStatusOptions[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 animate-fade-in overflow-x-hidden">
      <ProfileHeader
        profile={profile}
        authUser={authUser}
        avatarUrl={avatarUrl}
        onlineStatus={onlineStatus}
        customStatus={customStatus}
        triggerRefresh={triggerRefresh}
        setAvatarUrl={setAvatarUrl}
        getToken={getToken}
        setShowStatusDialog={setShowStatusDialog}
        onEditProfile={() => {
          setActiveTab("personal");
          setEditingPersonalInfo(true);
        }}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="mb-4 sm:mb-8 bg-white/80 dark:bg-gray-900/70 p-1 sm:p-2 rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-800 backdrop-blur-sm sticky top-20 sm:top-24 z-30 shadow-sm">
          <TabsList className="bg-transparent h-auto gap-0.5 sm:gap-1.5 p-0 w-full flex flex-nowrap overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                aria-label={tab.label}
                title={tab.label}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-md rounded-md sm:rounded-xl h-9 w-9 sm:h-auto sm:w-auto p-0 sm:px-4 sm:py-2.5 transition-all inline-flex items-center justify-center sm:justify-start gap-0 sm:gap-2 shrink-0 text-gray-600 dark:text-gray-400 border border-transparent data-[state=active]:border-emerald-500/20"
              >
                <tab.icon className="size-3.5 sm:size-4" />
                <span className="sr-only">{tab.label}</span>
                <span className="hidden sm:inline font-semibold text-xs uppercase tracking-wider">
                  {tab.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <DriverOverviewTab
            profile={profile}
            authUser={authUser}
            activities={activities}
            handleTabChange={handleTabChange}
            driverStats={driverStats}
            organization={organization}
          />
        </TabsContent>

        <TabsContent value="personal">
          <PersonalInfoTab
            personalInfo={personalInfo}
            editingPersonalInfo={editingPersonalInfo}
            isSaving={isSaving}
            phoneCountryCode={phoneCountryCode}
            socialLinks={socialLinks}
            bioError={bioError}
            setEditingPersonalInfo={setEditingPersonalInfo}
            setPersonalInfo={setPersonalInfo}
            setPhoneCountryCode={setPhoneCountryCode}
            setSocialLinks={setSocialLinks}
            handleBioChange={handleBioChange}
            setShowSaveConfirmDialog={setShowSaveConfirmDialog}
            addSocialLink={addSocialLink}
            updateSocialLink={updateSocialLink}
            removeSocialLink={removeSocialLink}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab
            preferences={preferences}
            savingPreference={savingPreference}
            profile={profile}
            handleEnableAllNotifications={() => handleBulkNotifications(true)}
            handleDisableAllNotifications={() => handleBulkNotifications(false)}
            handlePreferenceChange={handlePreferenceChange}
            getNotificationStats={getNotificationStats}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab
            activities={activities}
            fetchProfile={() => fetchActivities(true)}
            isLoading={activitiesLoading}
          />
        </TabsContent>

        <TabsContent value="support">
          <SupportTab />
        </TabsContent>
      </Tabs>

      <ProfileDialogs
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showDeleteConfirmDialog={showDeleteConfirmDialog}
        setShowDeleteConfirmDialog={setShowDeleteConfirmDialog}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        handleDeleteAccount={handleDeleteAccount}
        showLogoutDialog={showLogoutDialog}
        setShowLogoutDialog={setShowLogoutDialog}
        handleLogout={handleLogout}
        showSaveConfirmDialog={showSaveConfirmDialog}
        setShowSaveConfirmDialog={setShowSaveConfirmDialog}
        handleSavePersonalInfo={handleSavePersonalInfo}
        isSaving={isSaving}
        showStatusDialog={false}
        setShowStatusDialog={() => {}}
        onlineStatus={onlineStatus}
        setOnlineStatus={setOnlineStatus}
        customStatus={customStatus}
        handleCustomStatusChange={handleCustomStatusChange}
        customStatusError={customStatusError}
        handleUpdateOnlineStatus={handleUpdateDriverStatus}
      />

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDot className="size-5 text-emerald-600" />
              Set Your Availability
            </DialogTitle>
            <DialogDescription>
              Let dispatch know your current status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Availability Status</Label>
              <div className="grid grid-cols-1 gap-2">
                {driverStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setOnlineStatus(option.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      onlineStatus === option.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-md"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", option.color)} />
                    <div>
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                      <p className="text-xs text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverCustomStatus">
                Status Message (optional)
              </Label>
              <Input
                id="driverCustomStatus"
                value={customStatus}
                onChange={(e) => handleCustomStatusChange(e.target.value)}
                placeholder="E.g., On break until 2pm"
                maxLength={100}
                className={cn(
                  customStatusError &&
                    "border-red-500 focus-visible:ring-red-500",
                )}
              />
              <div className="flex items-center justify-between">
                {customStatusError ? (
                  <p className="text-xs text-red-500">{customStatusError}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Keep it short and clear
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {customStatus.length}/100
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDriverStatus}
              disabled={isSaving || !!customStatusError}
            >
              {isSaving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Check className="size-4 mr-2" />
              )}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
