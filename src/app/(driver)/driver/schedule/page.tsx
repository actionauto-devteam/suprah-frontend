"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  Loader2,
  Package,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusThemes: Record<string, string> = {
  Posted:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Assigned:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Accepted:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Picked Up":
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "In-Transit":
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Delivered:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
  Cancelled:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

interface GroupedLoads {
  [date: string]: any[];
}

export default function DriverSchedulePage() {
  const { getToken } = useAuth();
  const [loads, setLoads] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get("/api/driver-tracking/my-loads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const loadsData = res.data?.data?.loads || res.data?.data || [];
      setLoads(Array.isArray(loadsData) ? loadsData : []);
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const upcoming = loads.filter(
    (load) => load.status !== "Delivered" && load.status !== "Cancelled",
  );

  const grouped = React.useMemo(() => {
    const groups: GroupedLoads = {};

    upcoming.forEach((load) => {
      const deadline =
        load.dates?.pickupDeadline || load.dates?.firstAvailable;
      const dateStr = deadline
        ? new Date(deadline).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })
        : "Unscheduled";

      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(load);
    });

    return groups;
  }, [upcoming]);

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;

    const dateA =
      grouped[a][0].dates?.pickupDeadline ||
      grouped[a][0].dates?.firstAvailable;
    const dateB =
      grouped[b][0].dates?.pickupDeadline ||
      grouped[b][0].dates?.firstAvailable;

    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            My Schedule
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {upcoming.length} upcoming{" "}
            {upcoming.length === 1 ? "assignment" : "assignments"}
          </p>
        </header>

        {sortedDates.length === 0 ? (
          <Card className="rounded-2xl border-border/80 bg-card shadow-sm ring-1 ring-border/20">
            <CardContent className="flex min-h-80 flex-col items-center justify-center px-5 py-14 text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 shadow-sm">
                <Package className="size-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-black">Schedule Clear</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                No upcoming loads assigned. Check the load board for new
                opportunities.
              </p>
              <Button
                asChild
                className="mt-6 rounded-xl border border-amber-600 bg-amber-600 px-6 font-bold text-white shadow-sm hover:bg-amber-500"
              >
                <Link href="/driver/available-loads">Browse Loads</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute bottom-0 left-[7px] top-5 w-0.5 rounded-full bg-linear-to-b from-amber-500/60 via-amber-500/25 to-transparent" />

            <div className="flex flex-col gap-9">
              {sortedDates.map((date, dateIdx) => (
                <motion.section
                  key={date}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: dateIdx * 0.08 }}
                >
                  <div className="relative z-10 mb-4 flex items-center gap-3">
                    <div className="size-4 rounded-full border-[4px] border-background bg-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]" />
                    <h2 className="text-sm font-black uppercase tracking-[0.08em] text-amber-700 dark:text-amber-400">
                      {date}
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 pl-7">
                    {grouped[date].map((load, loadIdx) => (
                      <Link
                        key={load._id}
                        href={`/driver/loads/${load._id}`}
                        className="block"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: loadIdx * 0.04 }}
                          whileHover={{ y: -2 }}
                          className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-border/10 transition-all hover:border-amber-500/40 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Load #
                              </p>
                              <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                                {load.trackingNumber || load.loadNumber}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 font-bold",
                                statusThemes[load.status] ||
                                  "border-border/70 bg-muted/40 text-muted-foreground",
                              )}
                            >
                              {load.status}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                Origin
                              </p>
                              <p className="mt-0.5 truncate text-sm font-bold">
                                {load.origin ||
                                  `${load.pickupLocation?.city}, ${load.pickupLocation?.state}`}
                              </p>
                            </div>

                            <ArrowRight className="size-4 text-amber-500" />

                            <div className="min-w-0 text-right">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                Destination
                              </p>
                              <p className="mt-0.5 truncate text-sm font-bold">
                                {load.destination ||
                                  `${load.deliveryLocation?.city}, ${load.deliveryLocation?.state}`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="size-3.5 text-amber-500" />
                              <span className="font-mono">
                                {load.dates?.pickupDeadline
                                  ? new Date(
                                      load.dates.pickupDeadline,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Flexible"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                              Details
                              <ChevronRight className="size-3.5" />
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}