'use client';

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Megaphone } from 'lucide-react';
import { NotificationPage } from '@/components/notifications';
import { BroadcastPushCard } from '@/components/admin/dashboard/BroadcastPushCard';
import { PageHeader } from '@/components/admin/PageHeader';

export default function AdminNotificationsPage() {
  return (
    <div className="container mx-auto space-y-6">
      <PageHeader
        title="Notifications"
        description="Your inbox, plus push announcements to everyone on a role."
      />

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="inbox" className="gap-1.5 px-3">
            <Bell className="size-3.5" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5 px-3">
            <Megaphone className="size-3.5" /> Broadcast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="outline-none">
          <Suspense fallback={null}>
            <NotificationPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="broadcast" className="outline-none">
          <div className="max-w-2xl">
            <BroadcastPushCard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
