"use client";

import * as React from "react";
import { MapPin, Shield, Bell, Zap, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_STORAGE_KEY,
  type SettingsSection,
  type SystemSettings,
} from "./settings-constants";
import { SettingNavItem } from "./SettingNavItem";

const SETTINGS_NAV_ITEMS: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}> = [
    { id: "account", label: "Account Details", icon: Users },
    { id: "locations", label: "Locations & Inventory", icon: MapPin },
    { id: "security", label: "Security / RBAC", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Zap },
  ];

export function SystemSettingsTab() {
  const [activeSettingsSection, setActiveSettingsSection] =
    React.useState<SettingsSection>("account");
  const [savingSettingsSection, setSavingSettingsSection] =
    React.useState<SettingsSection | null>(null);
  const [systemSettings, setSystemSettings] = React.useState<SystemSettings>(
    DEFAULT_SYSTEM_SETTINGS,
  );
  const [draftSystemSettings, setDraftSystemSettings] =
    React.useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [editingSettingsSection, setEditingSettingsSection] =
    React.useState<SettingsSection | null>(null);

  React.useEffect(() => {
    try {
      const rawSettings = window.localStorage.getItem(
        SYSTEM_SETTINGS_STORAGE_KEY,
      );
      if (!rawSettings) return;

      const parsedSettings = JSON.parse(rawSettings) as Partial<SystemSettings>;
      const nextSettings: SystemSettings = {
        account: {
          ...DEFAULT_SYSTEM_SETTINGS.account,
          ...parsedSettings.account,
        },
        locations: {
          ...DEFAULT_SYSTEM_SETTINGS.locations,
          ...parsedSettings.locations,
        },
        security: {
          ...DEFAULT_SYSTEM_SETTINGS.security,
          ...parsedSettings.security,
        },
        notifications: {
          ...DEFAULT_SYSTEM_SETTINGS.notifications,
          ...parsedSettings.notifications,
        },
        integrations: {},
      };

      setSystemSettings(nextSettings);
    } catch {
      toast.error("Failed to load saved system settings.");
    }
  }, []);

  const openSystemSettingsEditor = (section: SettingsSection) => {
    setDraftSystemSettings(systemSettings);
    setEditingSettingsSection(section);
  };

  const updateDraftSettings = (
    section: SettingsSection,
    updates: Record<string, string | boolean>,
  ) => {
    setDraftSystemSettings(
      (prev) =>
        ({
          ...prev,
          [section]: {
            ...prev[section],
            ...updates,
          },
        }) as SystemSettings,
    );
  };

  const handleSaveEditedSystemSettings = async () => {
    if (!editingSettingsSection) return;
    const section = editingSettingsSection;
    setSavingSettingsSection(section);
    try {
      window.localStorage.setItem(
        SYSTEM_SETTINGS_STORAGE_KEY,
        JSON.stringify(draftSystemSettings),
      );
      setSystemSettings(draftSystemSettings);
      setEditingSettingsSection(null);
      toast.success("Changes saved successfully");
    } catch {
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSavingSettingsSection(null);
    }
  };

  const editingSettingsLabel = editingSettingsSection
    ? SETTINGS_NAV_ITEMS.find((item) => item.id === editingSettingsSection)
      ?.label
    : null;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          System Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your dealership profile, security preferences, and global
          configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        { }
        <div className="xl:col-span-1 flex gap-1.5 overflow-x-auto no-scrollbar xl:flex-col xl:gap-2 xl:overflow-visible pb-1">
          {SETTINGS_NAV_ITEMS.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.id} className="shrink-0 xl:shrink xl:w-full">
                <SettingNavItem
                  label={item.label}
                  icon={<ItemIcon className="size-4" />}
                  active={activeSettingsSection === item.id}
                  onClick={() => setActiveSettingsSection(item.id)}
                />
              </div>
            );
          })}
        </div>

        { }
        <div className="xl:col-span-3 space-y-4 sm:space-y-6">
          {activeSettingsSection === "account" && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Dealership Profile
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Information about your primary dealership location.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Dealership Name
                    </label>
                    <Input value={systemSettings.account.dealershipName} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Primary Location
                    </label>
                    <Input value={systemSettings.account.primaryLocation} readOnly />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Auto-Sync DMS
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically pull VIN-level data from your dealer
                      management system.
                    </p>
                  </div>
                  <Switch checked={systemSettings.account.autoSyncDms} disabled />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Public Condition Reports
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Make condition reports accessible via public URL for
                      VDP pages.
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.account.publicConditionReports}
                    disabled
                  />
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2 h-10 sm:h-9 bg-primary px-8 w-full sm:w-auto"
                    onClick={() => openSystemSettingsEditor("account")}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSettingsSection === "locations" && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Locations & Inventory Defaults
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure operational defaults for lots, inventory
                  intake, and assignment behavior.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Default Intake Location
                    </label>
                    <Input value={systemSettings.locations.defaultIntakeLocation} readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Inventory Hold Window (Days)
                    </label>
                    <Input value={systemSettings.locations.inventoryHoldWindowDays} readOnly />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Auto-assign to Nearest Lot
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically assign incoming units based on
                      distance and lot capacity.
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.locations.autoAssignNearestLot}
                    disabled
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2 h-10 sm:h-9 bg-primary px-8 w-full sm:w-auto"
                    onClick={() => openSystemSettingsEditor("locations")}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSettingsSection === "security" && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Security / RBAC
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage authentication hardening and role-based access
                  controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Require MFA for Staff
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Require two-factor authentication for all employee
                      accounts.
                    </p>
                  </div>
                  <Switch checked={systemSettings.security.requireMfaForStaff} disabled />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Strict Role Enforcement
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Prevent cross-role access to pages and data by
                      default.
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.security.strictRoleEnforcement}
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Session Timeout (Minutes)
                  </label>
                  <Input value={systemSettings.security.sessionTimeoutMinutes} readOnly />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2 h-10 sm:h-9 bg-primary px-8 w-full sm:w-auto"
                    onClick={() => openSystemSettingsEditor("security")}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSettingsSection === "notifications" && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Choose where operational alerts and system events should
                  be delivered.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Email Alerts
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Receive dispatch and inventory updates by email.
                    </p>
                  </div>
                  <Switch checked={systemSettings.notifications.emailAlerts} disabled />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">
                      Push Notifications
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Receive real-time alerts in-app for urgent actions.
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.notifications.pushNotifications}
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Daily Digest Time
                  </label>
                  <Input value={systemSettings.notifications.dailyDigestTime} readOnly />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2 h-10 sm:h-9 bg-primary px-8 w-full sm:w-auto"
                    onClick={() => openSystemSettingsEditor("notifications")}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSettingsSection === "integrations" && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Integrations
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Connect third-party platforms to synchronize data and
                  automate workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Google Calendar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sync appointments and reminders
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Dealer Management System
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sync inventory and pricing updates
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">Needs Setup</Badge>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2 h-10 sm:h-9 bg-primary px-8 w-full sm:w-auto"
                    onClick={() => openSystemSettingsEditor("integrations")}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={!!editingSettingsSection}
        onOpenChange={(open) => {
          if (!open) setEditingSettingsSection(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit {editingSettingsLabel}
            </DialogTitle>
            <DialogDescription>
              Update this system settings section, then save your changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingSettingsSection === "account" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Dealership Name
                    </label>
                    <Input
                      value={draftSystemSettings.account.dealershipName}
                      onChange={(event) =>
                        updateDraftSettings("account", {
                          dealershipName: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Primary Location
                    </label>
                    <Input
                      value={draftSystemSettings.account.primaryLocation}
                      onChange={(event) =>
                        updateDraftSettings("account", {
                          primaryLocation: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Auto-Sync DMS</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically pull VIN-level data.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.account.autoSyncDms}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("account", { autoSyncDms: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Public Condition Reports
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Make reports accessible via public URL.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.account.publicConditionReports}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("account", {
                        publicConditionReports: checked,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "locations" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Default Intake Location
                    </label>
                    <Input
                      value={draftSystemSettings.locations.defaultIntakeLocation}
                      onChange={(event) =>
                        updateDraftSettings("locations", {
                          defaultIntakeLocation: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Inventory Hold Window (Days)
                    </label>
                    <Input
                      value={draftSystemSettings.locations.inventoryHoldWindowDays}
                      onChange={(event) =>
                        updateDraftSettings("locations", {
                          inventoryHoldWindowDays: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Auto-assign to Nearest Lot
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assign incoming units by distance and capacity.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.locations.autoAssignNearestLot}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("locations", {
                        autoAssignNearestLot: checked,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "security" && (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Require MFA for Staff
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Require two-factor authentication for employees.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.security.requireMfaForStaff}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("security", {
                        requireMfaForStaff: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Strict Role Enforcement
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prevent cross-role access by default.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.security.strictRoleEnforcement}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("security", {
                        strictRoleEnforcement: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Session Timeout (Minutes)
                  </label>
                  <Input
                    value={draftSystemSettings.security.sessionTimeoutMinutes}
                    onChange={(event) =>
                      updateDraftSettings("security", {
                        sessionTimeoutMinutes: event.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "notifications" && (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Email Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Receive dispatch and inventory updates by email.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.notifications.emailAlerts}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("notifications", {
                        emailAlerts: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive real-time in-app alerts.
                    </p>
                  </div>
                  <Switch
                    checked={draftSystemSettings.notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      updateDraftSettings("notifications", {
                        pushNotifications: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Daily Digest Time
                  </label>
                  <Input
                    value={draftSystemSettings.notifications.dailyDigestTime}
                    onChange={(event) =>
                      updateDraftSettings("notifications", {
                        dailyDigestTime: event.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {editingSettingsSection === "integrations" && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Integration connection editing is not configured yet. Current
                connection statuses are shown in the settings card.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:h-9"
              onClick={() => setEditingSettingsSection(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 sm:h-9 bg-primary"
              onClick={handleSaveEditedSystemSettings}
              disabled={
                !!editingSettingsSection &&
                savingSettingsSection === editingSettingsSection
              }
            >
              {!!editingSettingsSection &&
                savingSettingsSection === editingSettingsSection
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
