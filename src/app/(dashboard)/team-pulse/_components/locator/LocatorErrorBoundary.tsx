"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

export class LocatorErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Locator] render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/4 p-8 text-center">
          <div className="flex items-center justify-center size-11 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="size-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-black">Beacon hit a snag</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-md">
              The rest of TeamPulse still works. Try again, and if it keeps happening send this message:
            </p>
          </div>
          <code className="max-w-md text-[10px] text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 wrap-break-word">
            {this.state.error.message || String(this.state.error)}
          </code>
          <Button size="sm" variant="outline" onClick={this.reset} className="h-8 text-[11px] font-bold gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
