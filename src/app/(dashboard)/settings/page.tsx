"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Settings as SettingsIcon,
  MapPin,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationMembersSettings } from "@/components/settings/org-members-settings";
import { ReportsFilesTab } from "@/components/settings/ReportsFilesTab";
import { SystemSettingsTab } from "@/components/settings/SystemSettingsTab";

function SettingsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "reports";

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
      <div>
        <h1 className="text-lg sm:text-xl font-bold truncate">
          Action Auto Utah
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          System Administrator Settings
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border p-1 rounded-lg h-auto min-h-11 mb-6">
          <TabsTrigger
            value="reports"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <FileText className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Reports</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <SettingsIcon className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Settings</span>
          </TabsTrigger>
          <TabsTrigger
            value="dealership"
            className="w-full min-w-0 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-4 py-2.5 data-[state=active]:bg-secondary shadow-none"
          >
            <MapPin className="size-4 shrink-0 hidden sm:block" />
            <span className="truncate">Organization</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="m-0">
          <ReportsFilesTab />
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <SystemSettingsTab />
        </TabsContent>

        <TabsContent value="dealership" className="m-0">
          <Card className="border-none shadow-sm bg-card p-0 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4">
              <CardTitle className="text-lg font-bold">
                Dealership Management
              </CardTitle>
              <CardDescription>
                Manage your dealership profile, invites, and team roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-h-100">
              <OrganizationMembersSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UtilitiesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}
