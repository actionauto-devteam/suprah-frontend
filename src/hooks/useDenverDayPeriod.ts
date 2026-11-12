"use client";

import * as React from "react";
import { denverDayPeriod, denverTzAbbr, toMDT, type DenverDayPeriod } from "@/lib/timezone";

function readStamp(): string {
  const now = new Date();
  return [toMDT(now).toISOString().slice(0, 10), denverDayPeriod(now), denverTzAbbr(now)].join("|");
}

export function useDenverDayPeriod(): { period: DenverDayPeriod; day: string; zone: string } {
  const [stamp, setStamp] = React.useState(readStamp);

  React.useEffect(() => {
    setStamp(readStamp());
    const id = window.setInterval(() => setStamp(readStamp()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [day, period, zone] = stamp.split("|");
  return { period: period as DenverDayPeriod, day, zone };
}
