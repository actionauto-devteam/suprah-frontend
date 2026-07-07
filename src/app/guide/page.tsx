"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Download,
  Monitor,
  Apple,
  CheckCircle2,
  AlertTriangle,
  MousePointer,
  Shield,
  ChevronRight,
} from "lucide-react";

type Platform = "windows" | "mac";

// ─── OS Visual Mockups ────────────────────────────────────────────────────────

function WindowsSmartScreen() {
  return (
    <div className="mt-3 max-w-[300px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        What you&apos;ll see on screen
      </p>
      <div className="overflow-hidden rounded-md border border-zinc-600 bg-white shadow-xl">
        {/* Title bar */}
        <div className="flex items-center justify-between bg-[#1a1a2e] px-3 py-1.5">
          <span className="text-[10px] text-zinc-400">Windows Security</span>
          <div className="flex gap-1">
            <div className="h-2 w-4 rounded-sm bg-zinc-600 text-[7px] text-center leading-2">—</div>
            <div className="h-2 w-4 rounded-sm bg-zinc-600" />
            <div className="h-2 w-4 rounded-sm bg-red-500" />
          </div>
        </div>
        {/* Body */}
        <div className="bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Shield className="h-5 w-5 text-[#0078D7]" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-900">Windows protected your PC</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
                Microsoft Defender SmartScreen prevented an unrecognized app from starting.
              </p>
              <button className="mt-1.5 text-[10px] font-medium text-[#0078D7] underline">
                More info
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <div className="rounded border border-gray-300 px-3 py-1 text-[10px] text-gray-600">
              Don&apos;t run
            </div>
          </div>
        </div>
        {/* After clicking More info */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 pb-3 pt-2.5">
          <p className="mb-2 text-[9px] font-medium text-gray-400">
            ↓ After clicking &quot;More info&quot;, you&apos;ll see this:
          </p>
          <div className="flex justify-end gap-2">
            <div className="rounded border border-gray-300 px-3 py-1 text-[10px] text-gray-600">
              Don&apos;t run
            </div>
            <div className="rounded bg-[#0078D7] px-3 py-1 text-[10px] font-semibold text-white ring-2 ring-emerald-400">
              Run anyway
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Click the highlighted &quot;Run anyway&quot; button
      </p>
    </div>
  );
}

function WindowsTaskbar() {
  return (
    <div className="mt-3 max-w-[320px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        Where to find the app
      </p>
      <div className="overflow-hidden rounded-md border border-zinc-700">
        {/* Fake screen content */}
        <div className="h-10 bg-zinc-900" />
        {/* Windows taskbar */}
        <div className="flex items-center justify-between bg-[#1a1a1a] px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm bg-[#0078D7]" />
            <div className="h-1 w-8 rounded bg-zinc-700" />
            <div className="h-1 w-8 rounded bg-zinc-700" />
          </div>
          <div className="flex items-center gap-1.5">
            {/* Hidden icons ^ */}
            <div className="rounded px-1.5 py-0.5 text-[9px] text-zinc-500">^</div>
            {/* System icons */}
            <div className="h-3 w-3 rounded-sm bg-zinc-700" />
            <div className="h-3 w-3 rounded-sm bg-zinc-700" />
            {/* AA icon highlighted */}
            <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-400">
              AA
            </div>
            {/* Time */}
            <div className="text-[9px] text-zinc-500 leading-tight text-right">
              <div>3:22 PM</div>
              <div>7/7/2026</div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        The AA icon is at the bottom-right corner of your screen
      </p>
    </div>
  );
}

function MacDragToApps() {
  return (
    <div className="mt-3 max-w-[300px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        What you&apos;ll see when you open the DMG
      </p>
      <div className="overflow-hidden rounded-md border border-zinc-700">
        {/* macOS window title bar */}
        <div className="flex items-center gap-1.5 bg-[#2c2c2e] px-3 py-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] text-zinc-400">ActionAutoTraySetup</span>
        </div>
        {/* DMG content */}
        <div className="flex items-center justify-around bg-[#1c1c1e] px-6 py-5">
          {/* App icon */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <span className="text-[10px] font-black text-emerald-400">AA</span>
            </div>
            <span className="text-[9px] text-zinc-400">Action Auto Tray</span>
          </div>
          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <ChevronRight className="h-6 w-6 text-zinc-400" />
            <span className="text-[8px] text-zinc-600">drag here</span>
          </div>
          {/* Applications folder */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-700/60">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
            </div>
            <span className="text-[9px] text-zinc-400">Applications</span>
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Drag the AA icon onto the Applications folder
      </p>
    </div>
  );
}

function MacGatekeeper() {
  return (
    <div className="mt-3 max-w-[300px] space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        What you&apos;ll see — Step 1: close this pop-up
      </p>
      {/* macOS alert dialog */}
      <div className="overflow-hidden rounded-xl border border-zinc-600 bg-[#2c2c2e] shadow-2xl">
        <div className="p-4 text-center">
          <div className="relative mx-auto mb-3 h-12 w-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <span className="text-[11px] font-black text-emerald-400">AA</span>
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
              <span className="text-[9px] font-bold text-white">✕</span>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-white leading-snug">
            &quot;Action Auto Tray&quot; cannot be opened because it is from an unidentified developer.
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">
            macOS cannot verify that this app is free from malware.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <div className="rounded-md bg-[#3a3a3c] px-4 py-1.5 text-[10px] text-zinc-300">
              Show in Finder
            </div>
            <div className="rounded-md bg-[#0a7aff] px-4 py-1.5 text-[10px] font-semibold text-white ring-2 ring-emerald-400">
              OK
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 pt-1">
        Step 2: then go here and click &quot;Open Anyway&quot;
      </p>
      {/* macOS Privacy & Security snippet */}
      <div className="overflow-hidden rounded-xl border border-zinc-600 bg-[#1c1c1e] shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-zinc-700 bg-[#2c2c2e] px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <div className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[9px] text-zinc-400">System Settings · Privacy &amp; Security</span>
        </div>
        <div className="p-3">
          <div className="rounded-lg border border-zinc-700 bg-[#2c2c2e] p-3">
            <p className="text-[9px] text-zinc-400 leading-relaxed">
              &quot;Action Auto Tray&quot; was blocked from use because it is not from an identified developer.
            </p>
            <div className="mt-2 flex justify-end">
              <div className="rounded-md bg-[#0a7aff] px-3 py-1 text-[9px] font-semibold text-white ring-2 ring-emerald-400">
                Open Anyway
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Click the highlighted &quot;Open Anyway&quot; button
      </p>
    </div>
  );
}

function MacMenuBar() {
  return (
    <div className="mt-3 max-w-[320px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        Where to find the app
      </p>
      <div className="overflow-hidden rounded-md border border-zinc-700">
        {/* macOS menu bar */}
        <div className="flex items-center justify-between bg-zinc-900/90 px-3 py-1.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black text-white">🍎</span>
            <span className="text-[10px] font-semibold text-white">Finder</span>
            <span className="text-[10px] text-zinc-400">File</span>
            <span className="text-[10px] text-zinc-400">Edit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-zinc-700" />
            <div className="h-3 w-3 rounded-sm bg-zinc-700" />
            {/* AA icon highlighted */}
            <div className="rounded px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400">
              AA
            </div>
            <div className="text-[10px] text-zinc-400">3:22 PM</div>
          </div>
        </div>
        {/* Screen content area */}
        <div className="h-8 bg-zinc-900" />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        The AA icon is at the top-right corner of your screen
      </p>
    </div>
  );
}

// ─── Step data ────────────────────────────────────────────────────────────────

interface Step {
  title: string;
  body: React.ReactNode;
  visual?: React.ReactNode;
  warning?: React.ReactNode;
  tip?: React.ReactNode;
}

const WINDOWS_STEPS: Step[] = [
  {
    title: "Go to the Timeproof Clock page",
    body: (
      <>
        Log in to the Action Auto website. On the left menu, click{" "}
        <span className="font-semibold text-white">Timeproof Clock</span>. Scroll
        down until you see the{" "}
        <span className="font-semibold text-white">Desktop Tray App</span> section.
      </>
    ),
  },
  {
    title: 'Click "Download for Windows"',
    body: (
      <>
        Click the{" "}
        <span className="font-semibold text-white">Download for Windows</span>{" "}
        button. A file called{" "}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">
          ActionAutoTraySetup.exe
        </code>{" "}
        will start downloading. Wait for it to finish — check the bottom of your browser.
      </>
    ),
  },
  {
    title: "Open the downloaded file",
    body: (
      <>
        Find the file in your{" "}
        <span className="font-semibold text-white">Downloads</span> folder and
        double-click it. Windows will show a blue warning screen — this is normal
        and safe to continue.
      </>
    ),
    visual: <WindowsSmartScreen />,
    warning: (
      <>
        Click <span className="font-semibold">More info</span> first, then click{" "}
        <span className="font-semibold">Run anyway</span>. This tells Windows you
        trust the file.
      </>
    ),
  },
  {
    title: "Follow the installation steps",
    body: (
      <>
        A setup window will open. Keep clicking{" "}
        <span className="font-semibold text-white">Next</span> until you see the{" "}
        <span className="font-semibold text-white">Install</span> button. Click it
        and wait a few seconds. When it says &quot;Completed,&quot; click{" "}
        <span className="font-semibold text-white">Finish</span>.
      </>
    ),
  },
  {
    title: "Find the app in your system tray",
    body: (
      <>
        The app does NOT open a regular window — it hides in the{" "}
        <span className="font-semibold text-white">system tray</span> at the{" "}
        <span className="font-semibold text-white">bottom-right of your screen</span>,
        near the clock. Look for the small{" "}
        <span className="font-semibold text-white">AA</span> icon there.
      </>
    ),
    visual: <WindowsTaskbar />,
    tip: (
      <>
        Don&apos;t see it? Click the small{" "}
        <span className="font-semibold text-white">up arrow (^)</span> near the
        clock — hidden icons live there.
      </>
    ),
  },
  {
    title: "Click the icon and log in",
    body: (
      <>
        Click the <span className="font-semibold text-white">AA</span> icon. A
        small panel will pop up — enter your{" "}
        <span className="font-semibold text-white">Action Auto username and password</span>,
        then click <span className="font-semibold text-white">Log In</span>. Done!
      </>
    ),
  },
];

const MAC_STEPS: Step[] = [
  {
    title: "Go to the Timeproof Clock page",
    body: (
      <>
        Log in to the Action Auto website. On the left menu, click{" "}
        <span className="font-semibold text-white">Timeproof Clock</span>. Scroll
        down until you see the{" "}
        <span className="font-semibold text-white">Desktop Tray App</span> section.
      </>
    ),
  },
  {
    title: 'Click "Download for Mac"',
    body: (
      <>
        Click the{" "}
        <span className="font-semibold text-white">Download for Mac</span> button.
        A file called{" "}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">
          ActionAutoTraySetup.dmg
        </code>{" "}
        will download to your{" "}
        <span className="font-semibold text-white">Downloads</span> folder.
      </>
    ),
  },
  {
    title: "Open the DMG file",
    body: (
      <>
        Go to your <span className="font-semibold text-white">Downloads</span>{" "}
        folder and double-click the{" "}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">
          .dmg
        </code>{" "}
        file. A window will pop up — you&apos;ll see the app icon and an
        Applications folder next to each other.
      </>
    ),
  },
  {
    title: "Drag the app into Applications",
    body: (
      <>
        <span className="font-semibold text-white">Drag</span> the app icon onto
        the <span className="font-semibold text-white">Applications</span> folder
        icon. Wait a few seconds for it to copy. Then close the window.
      </>
    ),
    visual: <MacDragToApps />,
  },
  {
    title: "Open the app — your Mac will warn you (this is normal!)",
    body: (
      <>
        Go to your{" "}
        <span className="font-semibold text-white">Applications</span> folder and
        double-click <span className="font-semibold text-white">Action Auto Tray</span>.
        Your Mac will show a pop-up saying it can&apos;t be opened. Don&apos;t worry — just
        follow the two steps below.
      </>
    ),
    visual: <MacGatekeeper />,
    warning: (
      <>
        This warning is <span className="font-semibold">normal</span> — it appears
        for any app not sold through the App Store. Just follow the steps in the
        picture above.
      </>
    ),
  },
  {
    title: "Allow Screen Recording when asked",
    body: (
      <>
        The first time the app opens, it will ask for permission to record your
        screen. This is needed so it can take automatic screenshots as proof of
        your work. Click{" "}
        <span className="font-semibold text-white">Allow</span> when the pop-up
        appears.
      </>
    ),
    tip: (
      <>
        If you accidentally clicked <span className="font-semibold">Don&apos;t Allow</span>,
        go to <span className="font-semibold">System Settings → Privacy &amp; Security
        → Screen Recording</span> and turn the toggle{" "}
        <span className="font-semibold text-white">ON</span> for Action Auto Tray.
      </>
    ),
  },
  {
    title: "Find the app in your menu bar and log in",
    body: (
      <>
        The app does NOT open a normal window — it lives in your{" "}
        <span className="font-semibold text-white">menu bar</span> at the{" "}
        <span className="font-semibold text-white">top-right of your screen</span>,
        near the Wi-Fi and battery icons. Look for the small{" "}
        <span className="font-semibold text-white">AA</span> icon.
      </>
    ),
    visual: <MacMenuBar />,
    tip: (
      <>
        Click the <span className="font-semibold text-white">AA</span> icon, enter
        your Action Auto username and password, then click{" "}
        <span className="font-semibold text-white">Log In</span>.
      </>
    ),
  },
];

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-400">
          {index + 1}
        </div>
        <div className="mt-2 w-px flex-1 bg-zinc-800" />
      </div>

      <div className="min-w-0 flex-1 pb-8">
        <h3 className="mb-2 text-[15px] font-semibold leading-snug text-white">
          {step.title}
        </h3>
        <p className="text-sm leading-relaxed text-zinc-400">{step.body}</p>

        {step.visual}

        {step.warning && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
            <div className="flex gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm leading-relaxed text-amber-300/90">{step.warning}</p>
            </div>
          </div>
        )}

        {step.tip && (
          <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3.5">
            <div className="flex gap-2.5">
              <MousePointer className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <p className="text-sm leading-relaxed text-zinc-400">{step.tip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [platform, setPlatform] = React.useState<Platform>("windows");
  const steps = platform === "windows" ? WINDOWS_STEPS : MAC_STEPS;

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-[30%] h-[50%] w-[40%] rounded-full bg-emerald-500/4 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <Download className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Install Action Auto Tray
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Follow these steps to set up the app on your computer. It only takes a few minutes!
          </p>
        </div>

        {/* Platform tabs */}
        <div className="mb-8 flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            onClick={() => setPlatform("windows")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              platform === "windows"
                ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Monitor className="h-4 w-4" />
            Windows
          </button>
          <button
            onClick={() => setPlatform("mac")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              platform === "mac"
                ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Apple className="h-4 w-4" />
            macOS
          </button>
        </div>

        {/* Steps */}
        <div>
          {steps.map((step, i) => (
            <div
              key={`${platform}-${i}`}
              className={cn(i === steps.length - 1 && "[&_.w-px]:hidden")}
            >
              <StepCard step={step} index={i} />
            </div>
          ))}
        </div>

        {/* Done banner */}
        <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                All done! The app starts automatically
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                Every time you turn on your computer, Action Auto Tray will start on its own. You
                don&apos;t need to open it again — just look for the{" "}
                <span className="font-medium text-zinc-400">AA</span> icon{" "}
                {platform === "windows"
                  ? "in the system tray (bottom-right)."
                  : "in the menu bar (top-right)."}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Having trouble? Contact your admin for help.
        </p>
      </div>
    </div>
  );
}
