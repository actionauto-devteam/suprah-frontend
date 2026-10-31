"use client";

import { useEffect, useState } from "react";

export function CallTimer({ startedAt }: { startedAt?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!startedAt) return <span className="tabular-nums">00:00</span>;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {minutes}:{rest}
    </span>
  );
}
