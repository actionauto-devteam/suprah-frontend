"use client";

import * as React from "react";
import { MessageSquare, Mail } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { injectSS4Styles } from "@/lib/ss4-styles";
import { cn } from "@/lib/utils";
import { LeadsTab } from "@/components/LeadsTab";
import SupraSpacePage from "../supra-space/page";
import CommunicationHub from "@/components/crm/CommunicationHub";

injectSS4Styles();

type ActiveTab = "leads" | "comms";

export default function CommsPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("leads");

  return (
    <div
      className={cn("ss4 flex flex-col h-full overflow-hidden")}
      data-theme={theme}
    >
      {/* ── Top tab bar ── */}
      <header className="ss4-topbar shrink-0 z-40">
        <div className="flex items-center h-12 sm:h-12 px-3 sm:px-4 gap-3">
          {/* Left: logo + title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 ss4-logo-mark flex items-center justify-center">
              <MessageSquare
                className="h-3.5 w-3.5"
                style={{ color: "#fff" }}
              />
            </div>
            <div className="hidden sm:block">
              <p
                className="ss4-display font-bold leading-none"
                style={{ fontSize: 13, color: "var(--text-primary)" }}
              >
                Supra Space
              </p>
              <p
                className="leading-none mt-0.5 font-medium"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.18em",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                Team &amp; Leads
              </p>
            </div>
          </div>

          {/* Center: tab switcher — full width on mobile */}
          <div className="ss4-tab-bar flex gap-0.5 flex-1 sm:flex-none sm:mx-auto">
            <button
              onClick={() => setActiveTab("leads")}
              className={cn(
                "ss4-tab flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-5 py-1.5",
                activeTab === "leads" && "ss4-tab-active",
              )}
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="hidden xs:inline sm:inline">Lead Inbox</span>
              <span className="xs:hidden sm:hidden">Leads</span>
            </button>
            <button
              onClick={() => setActiveTab("comms")}
              className={cn(
                "ss4-tab flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-5 py-1.5",
                activeTab === "comms" && "ss4-tab-active",
              )}
            >
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">Comms Hub</span>
              <span className="sm:hidden">Comms</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="hidden sm:block w-7 shrink-0" />
        </div>
      </header>

      {/* ── Content area — both mounted to preserve socket state ── */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={cn(
            "absolute inset-0",
            activeTab === "leads" ? "flex flex-col" : "hidden",
          )}
        >
          <LeadsTab />
        </div>
        <div
          className={cn(
            "absolute inset-0",
            activeTab === "comms" ? "flex flex-col" : "hidden",
          )}
        >
          <CommunicationHub />
        </div>
      </div>
    </div>
  );
}
