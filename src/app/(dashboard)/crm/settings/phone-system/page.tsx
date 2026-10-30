"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, PhoneCall } from "lucide-react";
import { useCallRecordingApi, type RecordingAccess } from "@/hooks/useCallRecordingApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HowItWorks } from "@/components/crm/phone-system/HowItWorks";
import { PHONE_SYSTEM_HELP, type PhoneSystemTab } from "@/components/crm/phone-system/help";
import { PhoneNumbersPanel } from "@/components/crm/phone-system/PhoneNumbersPanel";
import { PhoneMenuPanel } from "@/components/crm/phone-system/PhoneMenuPanel";
import { MyCallsPanel } from "@/components/crm/phone-system/MyCallsPanel";
import { RecordingsPanel } from "@/components/crm/phone-system/RecordingsPanel";

const TABS: { value: PhoneSystemTab; label: string; title: string; description: string }[] = [
  { value: "numbers", label: "Numbers", title: "Phone numbers", description: "Your dealership's phone numbers and who answers each one." },
  { value: "menu", label: "Phone Menu", title: "Phone menu", description: "What callers hear and where each key sends them." },
  { value: "my-calls", label: "My Calls", title: "My calls", description: "Make customer calls ring your own phone too." },
  { value: "recordings", label: "Recordings", title: "Call recordings", description: "Calls your team recorded, ready to listen to and review." },
];

const PANELS: Record<PhoneSystemTab, () => ReactNode> = {
  numbers: () => <PhoneNumbersPanel />,
  menu: () => <PhoneMenuPanel />,
  "my-calls": () => <MyCallsPanel />,
  recordings: () => <RecordingsPanel />,
};

function PhoneSystem() {
  const { request, orgId, authKey } = useCallRecordingApi();
  const pathname = usePathname();
  const params = useSearchParams();
  const access = useQuery({ queryKey: ["call-recording-access", orgId, authKey], retry: false, queryFn: () => request<RecordingAccess>("get", "/recording-access") });
  const admin = Boolean(access.data?.admin);
  const canListen = admin || Boolean(access.data?.permissions.includes("view"));
  const allowed = TABS.filter((tab) => tab.value === "my-calls" || (tab.value === "recordings" ? canListen : admin));
  const current = allowed.find((tab) => tab.value === params.get("tab"))?.value || allowed[0].value;

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-3 border-b pb-4">
        <Link href="/crm/settings" aria-label="Back to settings" title="Back to settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <PhoneCall className="h-5 w-5 text-emerald-500" />
            Phone System
          </h1>
          <p className="text-sm text-muted-foreground">Your dealership&apos;s phone numbers, phone menu, call recordings and your own phone setting, in one place.</p>
        </div>
      </header>
      {access.isPending ? (
        <Loader2 aria-label="Loading phone system" className="h-5 w-5 animate-spin" />
      ) : (
        <Tabs value={current} onValueChange={(value) => window.history.replaceState(null, "", `${pathname}?tab=${value}`)} className="min-w-0 space-y-5">
          <TabsList aria-label="Phone system sections" className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
            {allowed.map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="min-h-10">{tab.label}</TabsTrigger>)}
          </TabsList>
          {allowed.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="min-w-0">
              <section aria-labelledby={`phone-system-${tab.value}`} className="min-w-0 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id={`phone-system-${tab.value}`} className="text-base font-semibold">{tab.title}</h2>
                    <p className="text-sm text-muted-foreground">{tab.description}</p>
                  </div>
                  <HowItWorks topic={PHONE_SYSTEM_HELP[tab.value]} />
                </div>
                {PANELS[tab.value]()}
              </section>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </main>
  );
}

export default function PhoneSystemPage() {
  return (
    <Suspense fallback={<Loader2 aria-label="Loading phone system" className="m-6 h-5 w-5 animate-spin" />}>
      <PhoneSystem />
    </Suspense>
  );
}
