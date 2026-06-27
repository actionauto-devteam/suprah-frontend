import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Activity, RefreshCw, Clock } from "lucide-react";
import { RecentActivity } from "@/types/user";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { activityIcons } from "./profile-constants";
import { toast } from "sonner";

interface ActivityTabProps {
  activities: RecentActivity[];
  fetchProfile: () => void;
  isLoading?: boolean;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  activities,
  fetchProfile,
  isLoading = false,
}) => {
  return (
    <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <History className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Recent Activity
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your recent actions and events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="hidden sm:flex gap-1.5 text-xs text-gray-600 dark:text-gray-400"
          >
            <Activity className="size-3" />
            {activities.length} events
          </Badge>
          <button
            onClick={() => {
              fetchProfile();
              toast.info("Activity refreshed");
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw
              className={cn("size-3.5", isLoading && "animate-spin")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <RefreshCw className="size-7 text-gray-400 dark:text-gray-500 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Loading recent activity...
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 max-w-62.5 mx-auto leading-relaxed">
              Syncing your latest actions from the server
            </p>
          </div>
        ) : activities.length > 0 ? (
          <ScrollArea className="h-125 pr-1 sm:pr-2">
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={activity._id || index}
                  className="flex items-stretch gap-3"
                >
                  <div className="relative w-7 shrink-0 flex justify-center">
                    <span
                      className={cn(
                        "absolute top-0 bottom-0 w-px bg-linear-to-b from-purple-400 via-violet-300 to-transparent dark:from-purple-600 dark:via-violet-700",
                        index === activities.length - 1 && "bottom-4",
                      )}
                    />
                    <span className="absolute top-5 size-2.5 rounded-full bg-purple-500 border-2 border-white dark:border-gray-900" />
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        activity.type === "login" &&
                        "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400",
                        activity.type === "profile_update" &&
                        "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
                        activity.type === "password_change" &&
                        "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
                        activity.type === "avatar_updated" &&
                        "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
                        activity.type === "quote_created" &&
                        "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400",
                        activity.type === "shipment_created" &&
                        "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
                        activity.type === "google_calendar_connected" &&
                        "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400",
                        ![
                          "login",
                          "profile_update",
                          "password_change",
                          "avatar_updated",
                          "quote_created",
                          "shipment_created",
                          "google_calendar_connected",
                        ].includes(activity.type) &&
                        "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                      )}
                    >
                      {activityIcons[activity.type] || (
                        <Activity className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 wrap-break-word">
                            {activity.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] shrink-0 hidden sm:flex border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                        >
                          {activity.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="size-3 text-gray-400 dark:text-gray-500" />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <History className="size-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              No recent activity
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 max-w-62.5 mx-auto leading-relaxed">
              Your actions like profile updates, logins, and changes will appear
              here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
