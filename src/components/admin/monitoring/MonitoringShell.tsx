"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ShieldAlert, HeartPulse, Terminal, LayoutDashboard } from "lucide-react";
import { OverviewTab } from './renderers/OverviewTab';
import { ActivityFeed } from './renderers/ActivityFeed';
import { HealthBoard } from './renderers/HealthBoard';
import { AuditExplorer } from './renderers/AuditExplorer';
import { LogTerminal } from './renderers/LogTerminal';
import { PageHeader } from '@/components/admin/PageHeader';

interface MonitoringShellProps {
    initialData: {
        systemStats?: { organizations: number; users: number };
        financials?: { mrr: number; totalRevenue: number; activeSubscriptions: number };
    }
}

const TABS = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'activity', label: 'Activity', icon: Activity },
    { value: 'health', label: 'Health', icon: HeartPulse },
    { value: 'audits', label: 'Audit', icon: ShieldAlert },
    { value: 'logs', label: 'Logs', icon: Terminal },
];

export function MonitoringShell({ initialData }: MonitoringShellProps) {
    return (
        <div className="container mx-auto space-y-6 pb-10">
            <PageHeader
                title="Operations"
                description="Everything waiting on the team, plus platform health."
            />

            <Tabs defaultValue="overview" className="space-y-6">
                <div className="-mx-1 overflow-x-auto px-1">
                    <TabsList className="h-9">
                        {TABS.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 px-3">
                                <tab.icon className="size-3.5" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="overview" className="outline-none">
                    <OverviewTab
                        systemStats={initialData.systemStats}
                        financials={initialData.financials}
                    />
                </TabsContent>

                <TabsContent value="activity" className="outline-none">
                    <ActivityFeed />
                </TabsContent>

                <TabsContent value="health" className="outline-none">
                    <HealthBoard />
                </TabsContent>

                <TabsContent value="audits" className="outline-none">
                    <AuditExplorer />
                </TabsContent>

                <TabsContent value="logs" className="outline-none">
                    <LogTerminal />
                </TabsContent>
            </Tabs>
        </div>
    );
}
