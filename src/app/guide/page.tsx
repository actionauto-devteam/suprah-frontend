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
  ChevronDown,
  Languages,
  MonitorSmartphone,
  PlayCircle,
} from "lucide-react";

type Platform = "windows" | "mac";
type Lang = "en" | "tl";
type GuideTab = "download" | "usage";

// ─── Small bilingual UI strings ───────────────────────────────────────────────

const UI = {
  en: {
    langLabel: "Language",
    tabDownload: "Download & Install",
    tabUsage: "How to Use It",
    heading: "Set Up Suprah AI - Timeproof Clock",
    subheading: "Follow these steps on your computer. It only takes a few minutes!",
    usageHeading: "Using Suprah AI - Timeproof Clock",
    usageSubheading: "What the app does every day, explained simply.",
    windows: "Windows",
    mac: "macOS",
    doneTitle: "All done! The app starts automatically",
    doneBody: (icon: string) => (
      <>Every time you turn on your computer, Suprah AI - Timeproof Clock will start on its own. You don&apos;t need to open it again — just look for the <span className="font-medium text-zinc-400">AA</span> icon {icon}.</>
    ),
    trayIconWin: "in the system tray (bottom-right).",
    trayIconMac: "in the menu bar (top-right).",
    footer: "Having trouble? Contact your admin for help.",
  },
  tl: {
    langLabel: "Wika",
    tabDownload: "Pag-download at Pag-install",
    tabUsage: "Paano Gamitin",
    heading: "I-set Up ang Suprah AI - Timeproof Clock",
    subheading: "Sundan ang mga hakbang na ito sa iyong computer. Ilang minuto lang ito!",
    usageHeading: "Paggamit ng Suprah AI - Timeproof Clock",
    usageSubheading: "Simpleng paliwanag kung ano ang ginagawa ng app araw-araw.",
    windows: "Windows",
    mac: "macOS",
    doneTitle: "Tapos na! Awtomatikong bubukas ang app",
    doneBody: (icon: string) => (
      <>Tuwing bubuksan mo ang computer mo, awtomatikong tatakbo ang Suprah AI - Timeproof Clock. Hindi mo na ito kailangang buksan ulit — hanapin lang ang <span className="font-medium text-zinc-400">AA</span> icon {icon}.</>
    ),
    trayIconWin: "sa system tray (kanang-baba).",
    trayIconMac: "sa menu bar (kanang-taas).",
    footer: "May problema ka ba? Makipag-ugnayan sa iyong admin para tumulong.",
  },
} as const;

// ─── OS Visual Mockups ────────────────────────────────────────────────────────

function WindowsBrowserWarning({ lang }: { lang: Lang }) {
  const caption = lang === "en" ? "What you'll see in your browser first" : "Ito muna ang makikita mo sa browser mo";
  const hint = lang === "en" ? "Click the arrow, then \"Keep\"" : "I-click ang arrow, tapos \"Keep\"";
  return (
    <div className="mt-3 max-w-[320px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{caption}</p>
      <div className="overflow-hidden rounded-md border border-zinc-600 bg-[#2b2b2b] shadow-xl">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] text-zinc-300">SuprahTraySetup.exe isn&apos;t commonly downloaded.</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </div>
        <div className="border-t border-zinc-700 bg-[#3a3a3a] px-3 py-2 flex justify-end">
          <div className="rounded bg-zinc-600 px-3 py-1 text-[10px] font-semibold text-white ring-2 ring-emerald-400">
            Keep
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {hint}
      </p>
    </div>
  );
}

function WindowsSmartScreen({ lang }: { lang: Lang }) {
  const caption = lang === "en" ? "What you'll see on screen" : "Ito ang makikita mo sa screen";
  const hint = lang === "en" ? 'Click the highlighted "Run anyway" button' : 'I-click ang naka-highlight na "Run anyway"';
  const afterInfo = lang === "en" ? 'After clicking "More info", you\'ll see this:' : 'Pagkatapos i-click ang "More info", ito ang lalabas:';
  return (
    <div className="mt-3 max-w-[300px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{caption}</p>
      <div className="overflow-hidden rounded-md border border-zinc-600 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#1a1a2e] px-3 py-1.5">
          <span className="text-[10px] text-zinc-400">Windows Security</span>
          <div className="flex gap-1">
            <div className="h-2 w-4 rounded-sm bg-zinc-600 text-[7px] text-center leading-2">—</div>
            <div className="h-2 w-4 rounded-sm bg-zinc-600" />
            <div className="h-2 w-4 rounded-sm bg-red-500" />
          </div>
        </div>
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
              <button className="mt-1.5 text-[10px] font-medium text-[#0078D7] underline">More info</button>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <div className="rounded border border-gray-300 px-3 py-1 text-[10px] text-gray-600">Don&apos;t run</div>
          </div>
        </div>
        <div className="border-t border-gray-200 bg-gray-50 px-4 pb-3 pt-2.5">
          <p className="mb-2 text-[9px] font-medium text-gray-400">↓ {afterInfo}</p>
          <div className="flex justify-end gap-2">
            <div className="rounded border border-gray-300 px-3 py-1 text-[10px] text-gray-600">Don&apos;t run</div>
            <div className="rounded bg-[#0078D7] px-3 py-1 text-[10px] font-semibold text-white ring-2 ring-emerald-400">
              Run anyway
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {hint}
      </p>
    </div>
  );
}

function WindowsTaskbar({ lang }: { lang: Lang }) {
  const caption = lang === "en" ? "Where to find the app" : "Saan hahanapin ang app";
  const hint = lang === "en" ? "The AA icon is at the bottom-right corner of your screen" : "Ang AA icon ay nasa kanang-ibabang sulok ng iyong screen";
  return (
    <div className="mt-3 max-w-[320px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{caption}</p>
      <div className="overflow-hidden rounded-md border border-zinc-700">
        <div className="h-10 bg-zinc-900" />
        <div className="flex items-center justify-between bg-[#1a1a1a] px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm bg-[#0078D7]" />
            <div className="h-1 w-8 rounded bg-zinc-700" />
            <div className="h-1 w-8 rounded bg-zinc-700" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="rounded px-1.5 py-0.5 text-[9px] text-zinc-500">^</div>
            <div className="h-3 w-3 rounded-sm bg-zinc-700" />
            <div className="h-3 w-3 rounded-sm bg-zinc-700" />
            <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-400">AA</div>
            <div className="text-[9px] text-zinc-500 leading-tight text-right">
              <div>3:22 PM</div>
              <div>7/7/2026</div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {hint}
      </p>
    </div>
  );
}

function MacDragToApps({ lang }: { lang: Lang }) {
  const caption = lang === "en" ? "What you'll see when you open the DMG" : "Ito ang makikita mo pagkabukas ng DMG";
  const hint = lang === "en" ? "Drag the AA icon onto the Applications folder" : "I-drag ang AA icon papunta sa Applications folder";
  const dragHere = lang === "en" ? "drag here" : "i-drag dito";
  return (
    <div className="mt-3 max-w-[300px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{caption}</p>
      <div className="overflow-hidden rounded-md border border-zinc-700">
        <div className="flex items-center gap-1.5 bg-[#2c2c2e] px-3 py-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] text-zinc-400">SuprahTraySetup</span>
        </div>
        <div className="flex items-center justify-around bg-[#1c1c1e] px-6 py-5">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <span className="text-[10px] font-black text-emerald-400">AA</span>
            </div>
            <span className="text-[9px] text-zinc-400">Suprah AI - Timeproof Clock</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ChevronRight className="h-6 w-6 text-zinc-400" />
            <span className="text-[8px] text-zinc-600">{dragHere}</span>
          </div>
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
        {hint}
      </p>
    </div>
  );
}

function MacGatekeeper({ lang }: { lang: Lang }) {
  const step1 = lang === "en" ? "What you'll see — Step 1: close this pop-up" : "Ito ang makikita mo — Hakbang 1: isara ang pop-up na ito";
  const variantNote = lang === "en"
    ? <>Depending on your macOS version, the buttons may say <span className="font-semibold text-white">&quot;Show in Finder&quot; / &quot;OK&quot;</span> OR <span className="font-semibold text-white">&quot;Move to Trash&quot; / &quot;Cancel&quot;</span> — either is fine.</>
    : <>Depende sa macOS version mo, maaaring &quot;Show in Finder&quot; / &quot;OK&quot; O &quot;Move to Trash&quot; / &quot;Cancel&quot; ang makikita mong buttons — pareho lang, okay lang alinman dyan.</>;
  const dangerNote = lang === "en"
    ? <>Never click <span className="font-semibold text-red-400">&quot;Move to Trash&quot;</span> — that deletes the app. Always click <span className="font-semibold text-emerald-400">&quot;Cancel&quot;</span> (or &quot;OK&quot;) to just close the pop-up.</>
    : <>Huwag kailanman i-click ang <span className="font-semibold text-red-400">&quot;Move to Trash&quot;</span> — made-delete nito ang app. Laging i-click ang <span className="font-semibold text-emerald-400">&quot;Cancel&quot;</span> (o &quot;OK&quot;) para lang isara ang pop-up.</>;
  const step2 = lang === "en" ? 'Step 2: then go here and click "Open Anyway"' : 'Hakbang 2: pumunta dito at i-click ang "Open Anyway"';
  const hint = lang === "en" ? 'Click the highlighted "Open Anyway" button' : 'I-click ang naka-highlight na "Open Anyway"';
  return (
    <div className="mt-3 max-w-[300px] space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">{step1}</p>
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
            &quot;Suprah AI - Timeproof Clock&quot; cannot be opened because the developer cannot be verified.
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">macOS cannot verify that this app is free from malware.</p>
          <div className="mt-3 flex justify-center gap-2">
            <div className="rounded-md bg-[#3a3a3c] px-4 py-1.5 text-[10px] text-zinc-300">Move to Trash</div>
            <div className="rounded-md bg-[#3a3a3c] px-4 py-1.5 text-[10px] font-semibold text-white ring-2 ring-emerald-400">Cancel</div>
          </div>
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-500">{variantNote}</p>
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-red-300">{dangerNote}</p>
      </div>

      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 pt-1">{step2}</p>
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
              &quot;Suprah AI - Timeproof Clock&quot; was blocked from use because it is not from an identified developer.
            </p>
            <div className="mt-2 flex justify-end">
              <div className="rounded-md bg-[#0a7aff] px-3 py-1 text-[9px] font-semibold text-white ring-2 ring-emerald-400">Open Anyway</div>
            </div>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {hint}
      </p>
    </div>
  );
}

function MacMenuBar({ lang }: { lang: Lang }) {
  const caption = lang === "en" ? "Where to find the app" : "Saan hahanapin ang app";
  const hint = lang === "en" ? "The AA icon is at the top-right corner of your screen" : "Ang AA icon ay nasa kanang-itaas na sulok ng iyong screen";
  return (
    <div className="mt-3 max-w-[320px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{caption}</p>
      <div className="overflow-hidden rounded-md border border-zinc-700">
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
            <div className="rounded px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400">AA</div>
            <div className="text-[10px] text-zinc-400">3:22 PM</div>
          </div>
        </div>
        <div className="h-8 bg-zinc-900" />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {hint}
      </p>
    </div>
  );
}

function TrayPopupMockup({ lang, waiting }: { lang: Lang; waiting: boolean }) {
  const caption = lang === "en" ? "What the popup looks like" : "Ito ang itsura ng popup";
  return (
    <div className="mt-3 max-w-[260px]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{caption}</p>
      <div className="overflow-hidden rounded-xl border border-zinc-700 bg-[#111111] shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-zinc-800 px-3.5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-black text-white">AA</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-zinc-200">{waiting ? "Suprah AI - Timeproof Clock" : "Jane Dela Cruz"}</p>
            <p className="text-[9px] text-zinc-600">{waiting ? (lang === "en" ? "Waiting for sign-in" : "Naghihintay ng sign-in") : "Employee"}</p>
          </div>
          <div className={cn("h-2 w-2 rounded-full", waiting ? "bg-zinc-700" : "bg-emerald-500")} />
        </div>
        <div className="p-3.5">
          {waiting ? (
            <p className="text-[10px] leading-relaxed text-zinc-500">
              {lang === "en"
                ? "Not signed in yet. Sign in on the dashboard in your browser — this connects automatically."
                : "Hindi pa naka-sign in. Mag-sign in sa dashboard gamit ang browser mo — awtomatiko itong kokonekta."}
            </p>
          ) : (
            <div className="rounded-lg bg-emerald-600 py-2 text-center text-[10px] font-bold text-white">
              {lang === "en" ? "Start Shift" : "Simulan ang Shift"}
            </div>
          )}
        </div>
      </div>
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

function getDownloadSteps(platform: Platform, lang: Lang): Step[] {
  const b = (s: string) => <span className="font-semibold text-white">{s}</span>;
  const code = (s: string) => <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">{s}</code>;

  if (platform === "windows") {
    if (lang === "en") {
      return [
        {
          title: "Go to the Timeproof Clock page",
          body: <>Log in to the Action Auto website. On the left menu, click {b("Timeproof Clock")}. Scroll down until you see the {b("Desktop Tray App")} section.</>,
        },
        {
          title: 'Click "Download for Windows"',
          body: <>Click the {b("Download for Windows")} button. A file called {code("SuprahTraySetup.exe")} will start downloading. Wait for it to finish — check the bottom of your browser.</>,
        },
        {
          title: "Your browser may warn you first — this is normal",
          body: <>Chrome and Edge sometimes flag new apps as &quot;not commonly downloaded.&quot; This just means it&apos;s a newer file, not that something is wrong.</>,
          visual: <WindowsBrowserWarning lang={lang} />,
          warning: <>Click the small arrow next to the download, then click {b("Keep")} (you may see a second confirmation — click {b("Keep anyway")}).</>,
        },
        {
          title: "Open the downloaded file",
          body: <>Find the file in your {b("Downloads")} folder and double-click it. Windows will show a blue warning screen — this is normal and safe to continue.</>,
          visual: <WindowsSmartScreen lang={lang} />,
          warning: <>Click {b("More info")} first, then click {b("Run anyway")}. This tells Windows you trust the file.</>,
        },
        {
          title: "Follow the installation steps",
          body: <>A setup window will open. Keep clicking {b("Next")} until you see the {b("Install")} button. Click it and wait a few seconds. When it says &quot;Completed,&quot; click {b("Finish")}.</>,
        },
        {
          title: "Find the app in your system tray",
          body: <>The app does NOT open a regular window — it hides in the {b("system tray")} at the {b("bottom-right of your screen")}, near the clock. Look for the small {b("AA")} icon there.</>,
          visual: <WindowsTaskbar lang={lang} />,
          tip: <>Don&apos;t see it? Click the small {b("up arrow (^)")} near the clock — hidden icons live there.</>,
        },
        {
          title: "That's it — no login needed here",
          body: <>You do NOT need to type any username or password into this app. As soon as you&apos;re signed in on the website, it connects on its own within a few seconds.</>,
        },
      ];
    }
    return [
      {
        title: "Pumunta sa Timeproof Clock page",
        body: <>Mag-log in sa Action Auto website. Sa kaliwang menu, i-click ang {b("Timeproof Clock")}. I-scroll pababa hanggang makita mo ang {b("Desktop Tray App")} section.</>,
      },
      {
        title: 'I-click ang "Download for Windows"',
        body: <>I-click ang {b("Download for Windows")} button. Magsisimula mag-download ang file na tinatawag na {code("SuprahTraySetup.exe")}. Hintayin matapos — tingnan sa ibaba ng browser mo.</>,
      },
      {
        title: "Baka mag-warning muna ang browser mo — normal lang ito",
        body: <>Minsan tinatawag ng Chrome at Edge ang bagong apps na &quot;not commonly downloaded.&quot; Ibig sabihin lang nito, bago pa ang file na ito, walang mali.</>,
        visual: <WindowsBrowserWarning lang={lang} />,
        warning: <>I-click ang maliit na arrow sa tabi ng download, tapos i-click ang {b("Keep")} (baka may isa pang confirmation — i-click ang {b("Keep anyway")}).</>,
      },
      {
        title: "Buksan ang na-download na file",
        body: <>Hanapin ang file sa {b("Downloads")} folder mo at i-double-click. Magpapakita ng blue warning screen ang Windows — normal lang ito at ligtas na magpatuloy.</>,
        visual: <WindowsSmartScreen lang={lang} />,
        warning: <>I-click muna ang {b("More info")}, tapos i-click ang {b("Run anyway")}. Sinasabi nito sa Windows na pinagkakatiwalaan mo ang file.</>,
      },
      {
        title: "Sundan ang installation steps",
        body: <>Magbubukas ng setup window. Ituloy ang pag-click ng {b("Next")} hanggang makita mo ang {b("Install")} button. I-click ito at hintayin ng ilang segundo. Kapag &quot;Completed&quot; na, i-click ang {b("Finish")}.</>,
      },
      {
        title: "Hanapin ang app sa system tray mo",
        body: <>Hindi ito nagbubukas ng regular window — nagtatago ito sa {b("system tray")} sa {b("kanang-ibaba ng screen mo")}, malapit sa oras. Hanapin ang maliit na {b("AA")} icon doon.</>,
        visual: <WindowsTaskbar lang={lang} />,
        tip: <>Hindi mo makita? I-click ang maliit na {b("up arrow (^)")} malapit sa oras — doon nakatago ang mga hidden icons.</>,
      },
      {
        title: "Tapos na — walang kailangang i-login dito",
        body: <>Hindi mo na kailangang mag-type ng username o password sa app na ito. Sa sandaling naka-sign in ka na sa website, awtomatiko itong kokonekta sa loob ng ilang segundo.</>,
      },
    ];
  }

  // Mac
  if (lang === "en") {
    return [
      {
        title: "Go to the Timeproof Clock page",
        body: <>Log in to the Action Auto website. On the left menu, click {b("Timeproof Clock")}. Scroll down until you see the {b("Desktop Tray App")} section.</>,
      },
      {
        title: 'Click "Download for Mac"',
        body: <>Click the {b("Download for Mac")} button. A file called {code("SuprahTraySetup.dmg")} will download to your {b("Downloads")} folder.</>,
      },
      {
        title: "Open the DMG file",
        body: <>Go to your {b("Downloads")} folder and double-click the {code(".dmg")} file. A window will pop up — you&apos;ll see the app icon and an Applications folder next to each other.</>,
      },
      {
        title: "Drag the app into Applications",
        body: <>{b("Drag")} the app icon onto the {b("Applications")} folder icon. Wait a few seconds for it to copy. Then close the window.</>,
        visual: <MacDragToApps lang={lang} />,
      },
      {
        title: "Open the app — your Mac will warn you (this is normal!)",
        body: <>Go to your {b("Applications")} folder and double-click {b("Suprah AI - Timeproof Clock")}. Your Mac will show a pop-up saying it can&apos;t be opened. Don&apos;t worry — just follow the two steps below. The exact button names can differ by macOS version (some say &quot;Show in Finder&quot; / &quot;OK&quot;, others say &quot;Move to Trash&quot; / &quot;Cancel&quot;) — that&apos;s normal too.</>,
        visual: <MacGatekeeper lang={lang} />,
        warning: <>This warning is {<span className="font-semibold">normal</span>} — it appears for any app not sold through the App Store. Just follow the steps in the picture above, and {<span className="font-semibold">never click &quot;Move to Trash&quot;</span>} — that deletes the app. Click &quot;Cancel&quot; (or &quot;OK&quot;) instead to just close the pop-up.</>,
      },
      {
        title: "Allow Screen Recording when asked",
        body: <>The first time the app opens, it will ask for permission to record your screen. This is needed so it can take automatic screenshots as proof of your work. Click {b("Allow")} when the pop-up appears.</>,
        tip: <>If you accidentally clicked {<span className="font-semibold">Don&apos;t Allow</span>}, go to {<span className="font-semibold">System Settings → Privacy &amp; Security → Screen Recording</span>} and turn the toggle {b("ON")} for Suprah AI - Timeproof Clock.</>,
      },
      {
        title: "Screenshots stopped working after a while? Here's the fix",
        body: <>Sometimes, after the app updates itself, your Mac quietly turns the screenshot permission back {b("OFF")} on its own — even if it was working fine before. This is not something you did wrong, and it can happen again later too. If your admin tells you screenshots aren&apos;t coming through, follow these steps:</>,
        tip: (
          <div className="space-y-1.5">
            <p>1. Click the {b("Apple menu")} (🍎) at the top-left of your screen, then click {b("System Settings")}.</p>
            <p>2. Click {b("Privacy & Security")} on the left side.</p>
            <p>3. Click {b("Screen Recording")}.</p>
            <p>4. Find {b("Suprah AI - Timeproof Clock")} in the list.</p>
            <p>5. If the switch is already ON, turn it {b("OFF")}, wait a second, then turn it {b("ON")} again. If it&apos;s OFF, just turn it {b("ON")}.</p>
            <p>6. Quit the app completely — click the small {b("AA")} icon in your menu bar, then {b("Sign Out")} — then open {b("Suprah AI - Timeproof Clock")} again from your {b("Applications")} folder.</p>
          </div>
        ),
      },
      {
        title: "Find the app in your menu bar — no login needed",
        body: <>The app does NOT open a normal window — it lives in your {b("menu bar")} at the {b("top-right of your screen")}, near the Wi-Fi and battery icons. Look for the small {b("AA")} icon.</>,
        visual: <MacMenuBar lang={lang} />,
        tip: <>You do NOT need to type a username or password here. As soon as you&apos;re signed in on the website, it connects on its own within a few seconds.</>,
      },
    ];
  }
  return [
    {
      title: "Pumunta sa Timeproof Clock page",
      body: <>Mag-log in sa Action Auto website. Sa kaliwang menu, i-click ang {b("Timeproof Clock")}. I-scroll pababa hanggang makita mo ang {b("Desktop Tray App")} section.</>,
    },
    {
      title: 'I-click ang "Download for Mac"',
      body: <>I-click ang {b("Download for Mac")} button. Mag-do-download ang file na tinatawag na {code("SuprahTraySetup.dmg")} sa {b("Downloads")} folder mo.</>,
    },
    {
      title: "Buksan ang DMG file",
      body: <>Pumunta sa {b("Downloads")} folder mo at i-double-click ang {code(".dmg")} file. Magpapakita ng window — makikita mo ang app icon at Applications folder na magkatabi.</>,
    },
    {
      title: "I-drag ang app papunta sa Applications",
      body: <>{b("I-drag")} ang app icon papunta sa {b("Applications")} folder icon. Hintayin ng ilang segundo habang nagko-copy. Pagkatapos, isara ang window.</>,
      visual: <MacDragToApps lang={lang} />,
    },
    {
      title: "Buksan ang app — magwa-warning ang Mac mo (normal lang ito!)",
      body: <>Pumunta sa {b("Applications")} folder mo at i-double-click ang {b("Suprah AI - Timeproof Clock")}. Magpapakita ang Mac mo ng pop-up na sabing hindi ito mabuksan. Wag mag-alala — sundan lang ang dalawang hakbang sa ibaba. Maaaring magkaiba ang eksaktong pangalan ng button depende sa macOS version (may &quot;Show in Finder&quot; / &quot;OK&quot;, may &quot;Move to Trash&quot; / &quot;Cancel&quot;) — normal lang din iyon.</>,
      visual: <MacGatekeeper lang={lang} />,
      warning: <>Normal lang ang warning na ito — lumalabas ito para sa kahit anong app na hindi binenta sa App Store. Sundan lang ang mga hakbang sa larawan sa itaas, at {<span className="font-semibold">huwag kailanman i-click ang &quot;Move to Trash&quot;</span>} — made-delete nito ang app. I-click na lang ang &quot;Cancel&quot; (o &quot;OK&quot;) para lang isara ang pop-up.</>,
    },
    {
      title: "Payagan ang Screen Recording kapag tinanong",
      body: <>Sa unang beses na buksan ang app, hihingi ito ng permiso na i-record ang screen mo. Kailangan ito para makakuha ito ng automatic screenshots bilang proof ng trabaho mo. I-click ang {b("Allow")} kapag lumabas ang pop-up.</>,
      tip: <>Kung na-click mo nang aksidente ang {<span className="font-semibold">Don&apos;t Allow</span>}, pumunta sa {<span className="font-semibold">System Settings → Privacy &amp; Security → Screen Recording</span>} at i-on ang toggle para sa Suprah AI - Timeproof Clock.</>,
    },
    {
      title: "Tumigil ba ang screenshots pagkalipas ng ilang araw? Ito ang ayos",
      body: <>Minsan, pagkatapos mag-update ang app, tahimik na ino-OFF ulit ng Mac mo ang screenshot permission — kahit gumagana ito dati. Hindi ito dahil sa nagawa mong mali, at pwede itong maulit sa hinaharap. Kung sinabi ng admin mo na hindi na dumarating ang mga screenshots mo, sundan ang mga hakbang na ito:</>,
      tip: (
        <div className="space-y-1.5">
          <p>1. I-click ang {b("Apple menu")} (🍎) sa kaliwang-itaas ng screen mo, tapos i-click ang {b("System Settings")}.</p>
          <p>2. I-click ang {b("Privacy & Security")} sa kaliwang bahagi.</p>
          <p>3. I-click ang {b("Screen Recording")}.</p>
          <p>4. Hanapin ang {b("Suprah AI - Timeproof Clock")} sa listahan.</p>
          <p>5. Kung naka-ON na ang switch, i-OFF muna ito, maghintay ng isang segundo, tapos i-ON ulit. Kung naka-OFF ito, i-ON lang.</p>
          <p>6. I-close nang tuluyan ang app — i-click ang maliit na {b("AA")} icon sa menu bar mo, tapos {b("Sign Out")} — pagkatapos buksan ulit ang {b("Suprah AI - Timeproof Clock")} mula sa {b("Applications")} folder mo.</p>
        </div>
      ),
    },
    {
      title: "Hanapin ang app sa menu bar mo — walang kailangang i-login",
      body: <>Hindi ito nagbubukas ng normal na window — nakatira ito sa {b("menu bar")} mo sa {b("kanang-itaas ng screen mo")}, malapit sa Wi-Fi at battery icons. Hanapin ang maliit na {b("AA")} icon.</>,
      visual: <MacMenuBar lang={lang} />,
      tip: <>Hindi mo kailangang mag-type ng username o password dito. Sa sandaling naka-sign in ka na sa website, awtomatiko itong kokonekta sa loob ng ilang segundo.</>,
    },
  ];
}

function getUsageSteps(platform: Platform, lang: Lang): Step[] {
  const b = (s: string) => <span className="font-semibold text-white">{s}</span>;
  const iconLoc = lang === "en"
    ? (platform === "windows" ? "bottom-right of your screen, near the clock" : "top-right of your screen, near Wi-Fi and battery")
    : (platform === "windows" ? "kanang-ibaba ng screen mo, malapit sa oras" : "kanang-itaas ng screen mo, malapit sa Wi-Fi at battery");

  if (lang === "en") {
    return [
      {
        title: "Find the little AA icon",
        body: <>It&apos;s always there, quietly running, at the {b(iconLoc)}.</>,
      },
      {
        title: "Click it to open the popup",
        body: <>A small panel appears showing your name and current status.</>,
        visual: <TrayPopupMockup lang={lang} waiting={false} />,
      },
      {
        title: 'If it says "Waiting for sign-in"',
        body: <>That just means the app hasn&apos;t connected yet. Go to the Action Auto website in your browser and log in — the app will connect itself within a few seconds. You never type a password into the app itself.</>,
        visual: <TrayPopupMockup lang={lang} waiting />,
      },
      {
        title: "Start your shift",
        body: <>Once connected, click {b("Start Shift")} — either right there in the popup, or on the website. Both do the exact same thing.</>,
      },
      {
        title: "Work as normal",
        body: <>While your shift is on, the app quietly takes occasional screenshots in the background as proof of work. This is expected and normal — you don&apos;t need to do anything.</>,
      },
      {
        title: 'Taking a break? Click "Break"',
        body: <>This pauses your work timer. Click it again ({b("Resume")}) when you&apos;re back.</>,
      },
      {
        title: 'Done for the day? Click "End Shift"',
        body: <>Do this from the popup or the website. If you forget, you can also end your shift later from your phone — see the website for that option.</>,
      },
      {
        title: "You never need to fully close the app",
        body: <>Just leave it running in the background — it starts automatically every time you turn on your computer, and remembers your sign-in.</>,
      },
    ];
  }
  return [
    {
      title: "Hanapin ang maliit na AA icon",
      body: <>Laging nandito ito, tahimik na tumatakbo, sa {b(iconLoc)}.</>,
    },
    {
      title: "I-click ito para buksan ang popup",
      body: <>May lalabas na maliit na panel na may pangalan mo at kasalukuyang status.</>,
      visual: <TrayPopupMockup lang={lang} waiting={false} />,
    },
    {
      title: 'Kung sabing "Waiting for sign-in"',
      body: <>Ibig sabihin lang nito ay hindi pa nakakonekta ang app. Pumunta sa Action Auto website gamit ang browser mo at mag-log in — awtomatiko na itong kokonekta sa loob ng ilang segundo. Hindi ka kailanman magta-type ng password sa app mismo.</>,
      visual: <TrayPopupMockup lang={lang} waiting />,
    },
    {
      title: "Simulan ang shift mo",
      body: <>Kapag nakakonekta na, i-click ang {b("Start Shift")} — maaari mismo sa popup, o kaya sa website. Pareho lang ang ginagawa ng dalawa.</>,
    },
    {
      title: "Magtrabaho nang normal",
      body: <>Habang naka-on ang shift mo, tahimik na kumukuha ng paminsan-minsang screenshots ang app sa background bilang proof of work. Normal lang ito — wala kang kailangang gawin.</>,
    },
    {
      title: 'Magbe-break? I-click ang "Break"',
      body: <>Ito ay pinapahinto ang work timer mo. I-click ulit ({b("Resume")}) kapag bumalik ka na.</>,
    },
    {
      title: 'Tapos na para sa araw? I-click ang "End Shift"',
      body: <>Gawin ito mula sa popup o sa website. Kung nakalimutan mo, pwede mo ring tapusin ang shift mo mamaya gamit ang phone mo — tingnan ang website para diyan.</>,
    },
    {
      title: "Hindi mo kailanman kailangang isara nang tuluyan ang app",
      body: <>Iwan mo na lang itong tumatakbo sa background — awtomatiko itong bubukas tuwing bubuksan mo ang computer mo, at naaalala nito ang sign-in mo.</>,
    },
  ];
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-400">
          {index + 1}
        </div>
        {!isLast && <div className="mt-2 w-px flex-1 bg-zinc-800" />}
      </div>

      <div className="min-w-0 flex-1 pb-8">
        <h3 className="mb-2 text-[15px] font-semibold leading-snug text-white">{step.title}</h3>
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

// ─── Language dropdown ─────────────────────────────────────────────────────────

function LangDropdown({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const options: { key: Lang; label: string }[] = [
    { key: "en", label: "English" },
    { key: "tl", label: "Tagalog" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700"
      >
        <Languages className="h-3.5 w-3.5 text-emerald-400" />
        {options.find((o) => o.key === lang)?.label}
        <ChevronDown className={cn("h-3 w-3 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-32 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => { setLang(o.key); setOpen(false); }}
              className={cn(
                "block w-full px-3 py-2 text-left text-xs",
                o.key === lang ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [platform, setPlatform] = React.useState<Platform>("windows");
  const [lang, setLang] = React.useState<Lang>("en");
  const [tab, setTab] = React.useState<GuideTab>("download");
  const t = UI[lang];

  const steps = tab === "download" ? getDownloadSteps(platform, lang) : getUsageSteps(platform, lang);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-[30%] h-[50%] w-[40%] rounded-full bg-emerald-500/4 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-xl">
        {/* Language dropdown */}
        <div className="mb-6 flex justify-end">
          <LangDropdown lang={lang} setLang={setLang} />
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            {tab === "download" ? <Download className="h-6 w-6 text-emerald-400" /> : <PlayCircle className="h-6 w-6 text-emerald-400" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {tab === "download" ? t.heading : t.usageHeading}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {tab === "download" ? t.subheading : t.usageSubheading}
          </p>
        </div>

        {/* Guide tabs: Download vs Usage */}
        <div className="mb-4 flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            onClick={() => setTab("download")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              tab === "download" ? "bg-emerald-500/15 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Download className="h-4 w-4" />
            {t.tabDownload}
          </button>
          <button
            onClick={() => setTab("usage")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              tab === "usage" ? "bg-emerald-500/15 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <MonitorSmartphone className="h-4 w-4" />
            {t.tabUsage}
          </button>
        </div>

        {/* Platform tabs */}
        <div className="mb-8 flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            onClick={() => setPlatform("windows")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              platform === "windows" ? "bg-emerald-500/15 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Monitor className="h-4 w-4" />
            {t.windows}
          </button>
          <button
            onClick={() => setPlatform("mac")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              platform === "mac" ? "bg-emerald-500/15 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Apple className="h-4 w-4" />
            {t.mac}
          </button>
        </div>

        {/* Steps */}
        <div>
          {steps.map((step, i) => (
            <div key={`${tab}-${platform}-${lang}-${i}`}>
              <StepCard step={step} index={i} isLast={i === steps.length - 1} />
            </div>
          ))}
        </div>

        {/* Done banner — only on the Download tab */}
        {tab === "download" && (
          <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">{t.doneTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {t.doneBody(platform === "windows" ? t.trayIconWin : t.trayIconMac)}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-zinc-600">{t.footer}</p>
      </div>
    </div>
  );
}
