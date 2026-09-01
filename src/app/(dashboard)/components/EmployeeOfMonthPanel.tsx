"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useCrmUser } from "@/hooks/useCrmUser";
import { Panel, PanelSkeleton } from "./DashboardPanel";
import { EmployeeOfMonthWinnerCard, monthLabel, type EotmEmployee } from "./EmployeeOfMonthWinnerCard";
import { EmployeeOfMonthKudosBar } from "./EmployeeOfMonthKudosBar";

interface TeamWinner {
  teamId: string;
  name: string;
  winnerId: string | null;
  employee: EotmEmployee | null;
}

export function EmployeeOfMonthPanel() {
  const router = useRouter();
  const { token, isLoading: userLoading } = useCrmUser();
  const [month, setMonth] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<TeamWinner[]>([]);
  const [loading, setLoading] = React.useState(true);

  const authHeaders = React.useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token],
  );

  React.useEffect(() => {
    if (userLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiClient
      .get("/api/employee-of-month", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const data = res.data?.data || res.data;
        setMonth(data?.month || null);
        setTeams(data?.teams || []);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [token, userLoading]);

  return (
    <Panel
      title="Employee of the Month"
      icon={Star}
      accent="text-amber-500"
      action="View all"
      onAction={() => router.push("/recognition/employee-of-the-month")}
    >
      {month && (
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50">
          {monthLabel(month)}
        </p>
      )}
      {loading || userLoading ? (
        <PanelSkeleton rows={2} />
      ) : teams.length === 0 ? (
        <p className="text-xs text-muted-foreground/50">No teams configured yet.</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {teams.map((t) => (
            <EmployeeOfMonthWinnerCard key={t.teamId} label={t.name} employee={t.employee}>
              {t.winnerId && <EmployeeOfMonthKudosBar winnerId={t.winnerId} authHeaders={authHeaders} />}
            </EmployeeOfMonthWinnerCard>
          ))}
        </div>
      )}
    </Panel>
  );
}
