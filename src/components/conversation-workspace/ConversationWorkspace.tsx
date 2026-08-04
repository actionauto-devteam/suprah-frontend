"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WorkspaceViewportMode } from "./workspace-types";

export function useWorkspaceViewportMode(): WorkspaceViewportMode {
  const [mode, setMode] = React.useState<WorkspaceViewportMode>("wide");

  React.useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      setMode(width < 1024 ? "narrow" : width < 1440 ? "compact" : "wide");
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
}

export function ConversationWorkspace({
  viewportMode,
  hasSelection,
  detailsExpanded,
  children,
  className,
}: {
  viewportMode: WorkspaceViewportMode;
  hasSelection: boolean;
  detailsExpanded: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "cw-workspace relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden",
        className,
      )}
      data-viewport-mode={viewportMode}
      data-has-selection={hasSelection ? "true" : "false"}
      data-details-expanded={detailsExpanded ? "true" : "false"}
    >
      {children}
    </div>
  );
}
