"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuthActions, useUser, useAuth } from "@/providers/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfileContext } from "@/context/ProfileContext";
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
import {
  User,
  Bell,
  Activity,
  HelpCircle,
  Sparkles,
  Loader2,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { ProfileHeader } from "./ProfileHeader";
import { ProfileOverviewTab } from "./ProfileOverviewTab";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { NotificationsTab } from "./NotificationsTab";
import { ActivityTab } from "./ActivityTab";
import { SupportTab } from "./SupportTab";
import { ProfileDialogs } from "./ProfileDialogs";
import { containsCurseWord } from "./profile-constants";

export const ProfileView: React.FC = () => {
  const { user: authUser } = useUser();
  const { signOut, openUserProfile, refreshUser } = useAuthActions();
  const { getToken } = useAuth();
  const { avatarUrl, setAvatarUrl, triggerRefresh, refreshKey } =
    useProfileContext();
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

  const toastShownRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await apiClient.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data;
      setProfile(data);
      const pInfo = data.personalInfo || {};
      if (pInfo.dateOfBirth) {
        pInfo.dateOfBirth = pInfo.dateOfBirth.substring(0, 10);
      }
      setPersonalInfo(pInfo);
      setPhoneCountryCode(data.personalInfo?.phoneCountryCode || "+1");
      setSocialLinks(data.personalInfo?.socialLinks || []);
      setPreferences(data.notificationPreferences);
      setActivities(data.recentActivities || data.recentActivity || []);
      setHasFetchedActivities(false);
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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, refreshKey]);

  useEffect(() => {
    if (activeTab === "activity" && profile) {
      fetchActivities();
    }
  }, [activeTab, fetchActivities, profile]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

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

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

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

  const handleEnableAllNotifications = async () => {
    if (!preferences) return;
    setSavingPreference("all");
    try {
      const token = await getToken();
      const updates: Record<string, boolean> = {};
      Object.keys(preferences).forEach((key) => {
        if (
          typeof preferences[key as keyof NotificationPreferences] === "boolean"
        )
          updates[key] = true;
      });
      await apiClient.patch("/api/profile/notification-preferences", updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProfile();
      toast.success("All notifications enabled");
    } catch {
      toast.error("Failed to enable notifications");
    } finally {
      setSavingPreference(null);
    }
  };

  const handleDisableAllNotifications = async () => {
    if (!preferences) return;
    setSavingPreference("all");
    try {
      const token = await getToken();
      const updates: Record<string, boolean> = {};
      Object.keys(preferences).forEach((key) => {
        if (
          typeof preferences[key as keyof NotificationPreferences] === "boolean"
        )
          updates[key] = false;
      });
      await apiClient.patch("/api/profile/notification-preferences", updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProfile();
      toast.success("All notifications disabled");
    } catch {
      toast.error("Failed to disable notifications");
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

  const handleUpdateOnlineStatus = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      await apiClient.patch(
        "/api/profile/online-status",
        { status: onlineStatus, customStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Status updated");
      setShowStatusDialog(false);
      setProfile((prev) =>
        prev ? { ...prev, onlineStatus, customStatus } : prev,
      );
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    toast.info("Check your email for a verification link");
    openUserProfile();
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
        refreshAuthUser={refreshUser}
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
        <div className="mb-4 sm:mb-8 bg-white/80 dark:bg-gray-900/70 p-1 sm:p-2 rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10 shadow-sm">
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

        <TabsContent value="overview" className="pt-1 sm:pt-2">
          <ProfileOverviewTab
            profile={profile}
            authUser={authUser}
            activities={activities}
            handleTabChange={handleTabChange}
          />
        </TabsContent>

        <TabsContent value="personal" className="pt-1 sm:pt-2">
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

        <TabsContent value="notifications" className="pt-1 sm:pt-2">
          <NotificationsTab
            preferences={preferences}
            savingPreference={savingPreference}
            profile={profile}
            handleEnableAllNotifications={handleEnableAllNotifications}
            handleDisableAllNotifications={handleDisableAllNotifications}
            handlePreferenceChange={handlePreferenceChange}
            getNotificationStats={getNotificationStats}
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-1 sm:pt-2">
          <ActivityTab
            activities={activities}
            fetchProfile={() => fetchActivities(true)}
            isLoading={activitiesLoading}
          />
        </TabsContent>

        <TabsContent value="support" className="pt-1 sm:pt-2">
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
        showStatusDialog={showStatusDialog}
        setShowStatusDialog={setShowStatusDialog}
        onlineStatus={onlineStatus}
        setOnlineStatus={setOnlineStatus}
        customStatus={customStatus}
        handleCustomStatusChange={handleCustomStatusChange}
        customStatusError={customStatusError}
        handleUpdateOnlineStatus={handleUpdateOnlineStatus}
      />
    </div>
  );
};
