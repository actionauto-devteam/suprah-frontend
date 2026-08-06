'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Search, Plus, Users, MessageSquare, Send, Paperclip,
  X, ChevronLeft, ChevronDown, Download, FileText,
  Loader2, CheckCheck, Hash, Reply, Trash2,
  ArrowLeft, Radio, Bot, Video, Phone,
  Sun, Moon, Sparkles, SmilePlus,
  Smile, Pin, PinOff, Info, ImageIcon,
  Pencil, Check as CheckIcon,
  Mic, BarChart3, CalendarPlus, Archive, ArchiveRestore,
  UserPlus, UserMinus, Palette, Film, Wifi, Clock, MapPin, LogOut, Play, Pause,
  MoreHorizontal, Copy, GripVertical, Link2, Star, MailOpen, Share2,
  Bell, VolumeX, EyeOff,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, TextQuote, Code2, Type, ZoomIn, ZoomOut,
} from 'lucide-react';
import EmojiPicker, { Theme as EmojiTheme, EmojiClickData } from 'emoji-picker-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,

} from '@/components/ui/dropdown-menu';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { useSupraSpaceSocket, SSConversation, SSMessage, SSAttachment, PresenceMap } from '@/hooks/useSupraSpaceSocket';
import { PresenceAvatarDot } from '@/app/(dashboard)/team-pulse/_components/StatusDot';
import { S } from '@/app/(dashboard)/team-pulse/_components/team-pulse-constants';
import { useSupraSpaceMessenger } from '@/context/SupraSpaceMessengerContext';
import { useTheme } from '@/context/ThemeContext';
import { cn, resolveImageUrl } from '@/lib/utils';
import { DEPARTMENTS, deptLabel } from '@/lib/departments';
import { JitsiMeet } from './JitsiMeet';
import { useCall, CallSession } from '@/hooks/useCall';
import { stopCallSound } from '@/lib/notification-sound';
import { CallBanner } from './CallBanner';
import { IncomingCallModal } from './IncomingCallModal';
import { CallExperience } from './CallExperience';
import { EmojiReactionPicker, MobileEmojiReactionSheet } from '@/components/supraspace/EmojiReactionPicker';
import { CrmPushPrompt } from '@/components/crm/CrmPushPrompt';
import { MDT_TZ, fmtTimeMDT, isTodayMDT, isYesterdayMDT } from '@/lib/timezone';
import { MountainTimeClock } from '@/components/layout/MountainTimeClock';
import { SupraSpaceLogo } from '@/components/supraspace/SupraSpaceLogo';

const SS4_MAX_UPLOAD_FILES = 10;
const SS4_MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const SS4_MAX_VIDEO_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
type RichTextFormat = 'bold' | 'italic' | 'underline' | 'strike' | 'list' | 'numbered' | 'quote' | 'code';
type PasteMode = 'formatted' | 'plain';

const SS4_BULLET_GLYPHS = ['•', '◦', '▪'];
const SS4_LIST_INDENT_STEP = '  ';
function ss4BulletGlyphForDepth(depth: number): string {
  const i = ((depth % SS4_BULLET_GLYPHS.length) + SS4_BULLET_GLYPHS.length) % SS4_BULLET_GLYPHS.length;
  return SS4_BULLET_GLYPHS[i];
}
function ss4FindPriorNumberedSibling(value: string, lineStart: number, indentLen: number): number {
  const before = value.slice(0, Math.max(0, lineStart - 1));
  const lines = before.length ? before.split('\n') : [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (!l.trim()) continue;
    const m = l.match(/^(\s*)(\d+)\.(\s+)(.*)$/);
    if (!m) break;
    if (m[1].length === indentLen) return parseInt(m[2], 10);
    if (m[1].length < indentLen) break;
  }
  return 0;
}
const SS4_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.mpeg', '.mpg', '.ogv',
]);
const SS4_REACTIONS = [
  '\u{1f44d}', '\u{2764}\u{fe0f}', '\u{1f602}', '\u{1f62e}', '\u{1f622}', '\u{1f64f}',
  '\u{1f525}', '\u{1f389}', '\u{1f44f}', '\u{1f60d}', '\u{1f914}', '\u{1f440}',
  '\u{1f4af}', '\u{1f64c}', '\u{1f60e}', '\u{1f480}',
];
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || '';
const SS4_TEXT_COLORS = ['#ffffff', '#f87171', '#fb923c', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
const SS4_MORE_TEXT_COLORS = [
  '#ffffff', '#f3f4f6', '#94a3b8', '#64748b', '#111827',
  '#ef4444', '#f87171', '#fb7185', '#f97316', '#fb923c',
  '#f59e0b', '#facc15', '#84cc16', '#22c55e', '#34d399',
  '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#60a5fa',
  '#6366f1', '#818cf8', '#8b5cf6', '#a78bfa', '#d946ef',
  '#f472b6', '#ec4899', '#be185d',
];


// Wallpapers are an even, full-canvas wash (same color at both gradient stops) rather
// than a corner accent that fades to transparent — so the tint reads as an actual chat
// background behind every message (Messenger-style), not just a hint in one corner.
const SS4_THEME_PRESETS: { name: string; accent: string | null; wallpaper: string | null }[] = [
  { name: 'Default', accent: null, wallpaper: null },
  { name: 'Ocean', accent: '#2e7fff', wallpaper: 'linear-gradient(160deg, rgba(46,127,255,0.14) 0%, rgba(46,127,255,0.05) 100%)' },
  { name: 'Sunset', accent: '#f0683c', wallpaper: 'linear-gradient(160deg, rgba(240,104,60,0.16) 0%, rgba(240,104,60,0.06) 100%)' },
  { name: 'Forest', accent: '#22b060', wallpaper: 'linear-gradient(160deg, rgba(34,176,96,0.16) 0%, rgba(34,176,96,0.06) 100%)' },
  { name: 'Berry', accent: '#a855f7', wallpaper: 'linear-gradient(160deg, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.06) 100%)' },
  { name: 'Rose', accent: '#f0568a', wallpaper: 'linear-gradient(160deg, rgba(240,86,138,0.16) 0%, rgba(240,86,138,0.06) 100%)' },
  { name: 'Gold', accent: '#e0a13a', wallpaper: 'linear-gradient(160deg, rgba(224,161,58,0.16) 0%, rgba(224,161,58,0.06) 100%)' },
  { name: 'Slate', accent: '#64748b', wallpaper: 'linear-gradient(160deg, rgba(100,116,139,0.16) 0%, rgba(100,116,139,0.06) 100%)' },
  { name: 'Ice', accent: '#22d3ee', wallpaper: 'linear-gradient(160deg, rgba(34,211,238,0.14) 0%, rgba(34,211,238,0.05) 100%)' },
];

if (typeof document !== 'undefined') {
  let link = document.getElementById('ss4-fonts') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'ss4-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Cabinet+Grotesk:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  let s = document.getElementById('ss4-styles') as HTMLStyleElement | null;
  if (!s) {
    s = document.createElement('style');
    s.id = 'ss4-styles';
    document.head.appendChild(s);
  }
  s.textContent = `
    .ss4[data-theme="dark"] {
      --bg-base:#0e0f11; --bg-elevated:#141618; --bg-overlay:#1a1d21;
      --bg-hover:rgba(255,255,255,0.04); --bg-active:rgba(255,255,255,0.07); --bg-subtle:rgba(255,255,255,0.03);
      --surface-1:#1e2126; --surface-2:#252a31; --surface-3:#2d3340;
      --border-1:rgba(255,255,255,0.06); --border-2:rgba(255,255,255,0.10); --border-3:rgba(255,255,255,0.14);
      --accent:#5b7cf6; --accent-muted:rgba(91,124,246,0.15); --accent-hover:#6b8cf8; --accent-text:#a5b8ff;
      --positive:#34c97d; --positive-muted:rgba(52,201,125,0.12); --warning:#f0a855; --danger:#f05c5c; --danger-muted:rgba(240,92,92,0.12);
      --text-primary:rgba(255,255,255,0.92); --text-secondary:rgba(255,255,255,0.52); --text-tertiary:rgba(255,255,255,0.28); --text-disabled:rgba(255,255,255,0.16);
      --bubble-own-bg:linear-gradient(145deg,#4a6cf0,#5b7cf6); --bubble-own-shadow:0 4px 20px rgba(91,124,246,0.25);
      --bubble-other-bg:var(--surface-2); --bubble-other-border:var(--border-2);
      --sidebar-bg:#111316; --sidebar-border:rgba(255,255,255,0.055);
      --input-bg:var(--surface-1); --input-border:var(--border-2); --input-focus:rgba(91,124,246,0.35);
      --scrollbar:rgba(255,255,255,0.07);
      --shadow-sm:0 1px 3px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.3);
      --shadow-md:0 4px 16px rgba(0,0,0,0.5),0 2px 6px rgba(0,0,0,0.3);
      --shadow-lg:0 20px 60px rgba(0,0,0,0.7),0 8px 24px rgba(0,0,0,0.4);
      --wallpaper:none;
    }
    .ss4[data-theme="light"] {
      --bg-base:#f4f5f7; --bg-elevated:#ffffff; --bg-overlay:#f9fafb;
      --bg-hover:rgba(0,0,0,0.03); --bg-active:rgba(91,124,246,0.08); --bg-subtle:rgba(0,0,0,0.02);
      --surface-1:#ffffff; --surface-2:#f4f5f7; --surface-3:#eaecf0;
      --border-1:rgba(0,0,0,0.06); --border-2:rgba(0,0,0,0.09); --border-3:rgba(0,0,0,0.14);
      --accent:#4a6cf0; --accent-muted:rgba(74,108,240,0.1); --accent-hover:#3a5ce0; --accent-text:#4a6cf0;
      --positive:#22b060; --positive-muted:rgba(34,176,96,0.1); --warning:#e0922a; --danger:#dc3545; --danger-muted:rgba(220,53,69,0.08);
      --text-primary:rgba(0,0,0,0.87); --text-secondary:rgba(0,0,0,0.50); --text-tertiary:rgba(0,0,0,0.32); --text-disabled:rgba(0,0,0,0.20);
      --bubble-own-bg:linear-gradient(145deg,#4a6cf0,#5b7cf6); --bubble-own-shadow:0 3px 14px rgba(74,108,240,0.22);
      --bubble-other-bg:#ffffff; --bubble-other-border:rgba(0,0,0,0.09);
      --sidebar-bg:#ffffff; --sidebar-border:rgba(0,0,0,0.08);
      --input-bg:#ffffff; --input-border:rgba(0,0,0,0.1); --input-focus:rgba(74,108,240,0.3);
      --scrollbar:rgba(0,0,0,0.1);
      --shadow-sm:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06);
      --shadow-md:0 4px 16px rgba(0,0,0,0.1),0 2px 6px rgba(0,0,0,0.06);
      --shadow-lg:0 20px 60px rgba(0,0,0,0.2),0 8px 24px rgba(0,0,0,0.1);
      --wallpaper:none;
    }
    .ss4 { font-family:'Geist',-apple-system,BlinkMacSystemFont,sans-serif; background:var(--bg-base); color:var(--text-primary); -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
    .ss4-display { font-family:'Cabinet Grotesk',sans-serif; }
    .ss4-mono { font-family:'Geist Mono',monospace; }
    .ss4-topbar { background:var(--bg-elevated); border-bottom:1px solid var(--border-1); }
    .ss4-sidebar { background:var(--sidebar-bg); border-right:1px solid var(--sidebar-border); }
    .ss4-conv { border-radius:10px; cursor:pointer; transition:background .15s ease,box-shadow .15s ease; position:relative; }
    .ss4-conv:hover { background:var(--bg-hover); }
    .ss4-conv-active { background:rgba(91,124,246,0.18)!important; }
    .ss4-conv-name { color:var(--text-primary); }
    .ss4-conv-preview { color:var(--text-secondary); }
    .ss4-conv-active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); height:60%; width:3px; background:var(--accent); border-radius:0 3px 3px 0; }
    .ss4-search-input { background:var(--input-bg); border:1px solid var(--input-border); color:var(--text-primary); border-radius:8px; transition:border-color .15s ease,box-shadow .15s ease; }
    .ss4-search-input::placeholder { color:var(--text-tertiary); }
    .ss4-search-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--input-focus); }
    .ss4-search-icon { color:var(--text-tertiary); }
    .ss4-chat-header { background:var(--bg-elevated); border-bottom:1px solid var(--border-1); }
    .ss4-bubble-own { background:var(--bubble-own-bg); box-shadow:var(--bubble-own-shadow); color:#fff; border-radius:18px 18px 4px 18px; }
    .ss4-bubble-other { background:var(--bubble-other-bg); border:1px solid var(--bubble-other-border); color:var(--text-primary); border-radius:18px 18px 18px 4px; box-shadow:var(--shadow-sm); }
    .ss4[data-theme="light"] .ss4-bubble-other .ss4-readable-light-color { color:var(--text-primary)!important; }
    .ss4-msg-column { width:fit-content; max-width:min(72%,42rem); }
    .ss4-msg-bubble { width:100%; max-width:100%; overflow:hidden; font-size:16px; line-height:1.55; }
    .ss4-rich-edit { white-space:pre-wrap; }
    .ss4-rich-edit ul,
    .ss4-rich-edit ol {
      display:block!important;
      margin:.45rem 0!important;
      padding-left:1.55rem!important;
      list-style-position:outside!important;
      white-space:normal;
    }
    .ss4-rich-edit ul { list-style-type:disc!important; }
    .ss4-rich-edit ol { list-style-type:decimal!important; }
    .ss4-rich-edit ul ul { list-style-type:circle!important; }
    .ss4-rich-edit ul ul ul { list-style-type:square!important; }
    .ss4-rich-edit li {
      display:list-item!important;
      margin:.18rem 0!important;
      padding-left:.12rem;
      white-space:pre-wrap;
    }
    .ss4-rich-edit blockquote {
      display:block;
      margin:.45rem 0!important;
      padding:.45rem .7rem!important;
      border-left:3px solid rgba(255,255,255,.72);
      border-radius:0 8px 8px 0;
      background:rgba(0,0,0,.14);
      font-style:italic;
      white-space:pre-wrap;
    }
    .ss4-rich-edit blockquote:empty::before {
      content:'Quote';
      opacity:.55;
      pointer-events:none;
    }
    .ss4-rich-edit code,
    .ss4-rich-edit font[face*="mono" i] {
      display:inline;
      padding:.08rem .3rem;
      border-radius:5px;
      background:rgba(0,0,0,.2);
      font-family:'Geist Mono',monospace!important;
    }
    .ss4-list { display:flex; flex-direction:column; gap:3px; margin:.12em 0 .24em; padding:0; list-style:none; }
    .ss4-list-item { display:flex; align-items:flex-start; gap:7px; margin:0; padding:0; list-style:none; }
    .ss4-list-marker { width:1em; flex:0 0 1em; text-align:center; line-height:1.55; }
    .ss4-list-marker-num { width:auto; min-width:1.35em; flex-basis:auto; text-align:right; }
    .ss4-input-wrap { background:var(--input-bg); border:1.5px solid var(--input-border); border-radius:14px; transition:border-color .18s ease,box-shadow .18s ease; flex-shrink:0; }
    .ss4-input-wrap:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px var(--input-focus); }
    .ss4-composer-main { display:flex!important; flex-direction:column; width:100%; max-width:100%; min-width:0; }
    .ss4-composer-pill { display:flex; align-items:flex-end; gap:8px; min-width:0; cursor:text; }
    .ss4-composer-pill .ss4-composer-editor { display:block; flex:1 1 0%; min-width:0; width:auto; max-width:100%; overflow-x:hidden; overflow-wrap:anywhere; word-break:break-word; -webkit-user-select:text; user-select:text; }
    .ss4-composer-editor { cursor:text; height:auto!important; }
    .ss4-composer-pill button { cursor:pointer; }
    .ss4-mobile-leading,.ss4-mobile-trailing,.ss4-mobile-emoji { display:none!important; }
    .ss4-desktop-toolbar { display:flex!important; }
    .ss4-send-btn { background:var(--accent); color:#fff; border-radius:10px; transition:all .15s ease; box-shadow:0 2px 8px rgba(91,124,246,0.3); }
    .ss4-send-btn:hover:not(:disabled) { background:var(--accent-hover); transform:translateY(-1px); box-shadow:0 4px 16px rgba(91,124,246,0.4); }
    .ss4-send-btn:disabled { background:var(--surface-2); box-shadow:none; cursor:not-allowed; }
    .ss4-icon-btn { border-radius:8px; color:var(--text-tertiary); transition:all .15s ease; display:flex; align-items:center; justify-content:center; }
    .ss4-icon-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .ss4-pill-btn { border-radius:8px; border:1px solid var(--border-2); background:var(--bg-hover); color:var(--text-secondary); transition:all .15s ease; }
    .ss4-pill-btn:hover { background:var(--bg-active); border-color:var(--border-3); color:var(--text-primary); }
    .ss4-video-btn { background:rgba(91,124,246,0.1); border:1px solid rgba(91,124,246,0.2); color:var(--accent-text); border-radius:8px; transition:all .15s ease; }
    .ss4-video-btn:hover { background:rgba(91,124,246,0.18); border-color:rgba(91,124,246,0.35); }
    .ss4-ai-btn { background:linear-gradient(135deg,rgba(120,80,220,0.12),rgba(91,124,246,0.08)); border:1px solid rgba(150,100,240,0.2); color:#b49dff; border-radius:8px; transition:all .15s ease; position:relative; overflow:hidden; }
    .ss4-ai-btn:hover { border-color:rgba(150,100,240,0.4); box-shadow:0 0 16px rgba(120,80,220,0.15); }
    @keyframes ss4-shimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
    .ss4-ai-text { background:linear-gradient(90deg,#b49dff 0%,#a5b8ff 40%,#c4a0ff 70%,#b49dff 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:ss4-shimmer 3s linear infinite; }
    .ss4-reply-bar { background:var(--accent-muted); border:1px solid rgba(91,124,246,0.2); border-left:3px solid var(--accent); border-radius:10px; }
    .ss4-overlay { background:rgba(0,0,0,0.6); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
    .ss4-modal { background:var(--bg-elevated); border:1px solid var(--border-2); border-radius:16px; box-shadow:var(--shadow-lg); }
    .ss4-ava-accent { background:linear-gradient(140deg,#3a5ce0,#5b7cf6); }
    .ss4-ava-purple { background:linear-gradient(140deg,#7038c0,#9b6fd6); }
    .ss4-ava-teal { background:linear-gradient(140deg,#0e7c6a,#22b060); }
    @keyframes ss4-dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4;} 40%{transform:translateY(-4px);opacity:1;} }
    .ss4-typing-dot { animation:ss4-dot-bounce 1.4s ease-in-out infinite; }
    .ss4-msg-actions { background:var(--bg-elevated); border:1px solid var(--border-2); border-radius:10px; box-shadow:var(--shadow-md); }
    @keyframes ss4-action-pop { from{opacity:0;transform:translateY(6px) scale(.92);} to{opacity:1;transform:translateY(0) scale(1);} }
    .ss4-msg-actions-pop { animation:ss4-action-pop .16s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes ss4-mobile-sheet-in { from{opacity:0;transform:translateY(18px);} to{opacity:1;transform:translateY(0);} }
    @keyframes ss4-mobile-pop-in { from{opacity:0;transform:translateY(8px) scale(.96);} to{opacity:1;transform:translateY(0) scale(1);} }
    .ss4-mention-highlight { background:var(--accent-muted,rgba(91,124,246,0.09)); border-left:2px solid var(--accent); padding-left:6px; border-radius:4px; }
    .ss4-section-label { display:inline-flex; align-items:center; padding:3px 8px; border-radius:999px; background:var(--bg-subtle); border:1px solid var(--border-1); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--text-secondary); font-weight:700; }
    .ss4-filter-pill { height:26px!important; padding:0 10px!important; font-size:10.5px!important; line-height:1; }
    .ss4-scroll { -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain; touch-action:pan-y; }
    .ss4-scroll::-webkit-scrollbar { width:4px; }
    .ss4-scroll::-webkit-scrollbar-track { background:transparent; }
    .ss4-scroll::-webkit-scrollbar-thumb { background:var(--scrollbar); border-radius:4px; }
    .ss4-date-line { height:1px; background:var(--border-1); }
    .ss4-date-chip { background:var(--surface-2); border:1px solid var(--border-1); border-radius:20px; color:var(--text-tertiary); font-size:11px; padding:3px 12px; white-space:nowrap; }
    .ss4-vcall-modal { background:#0d1117; border:1px solid rgba(255,255,255,0.08); border-radius:20px; box-shadow:var(--shadow-lg); }
    .ss4-vcall-screen { background:radial-gradient(ellipse at 50% 30%,#141e3a 0%,#0a0d14 100%); position:relative; overflow:hidden; }
    @keyframes ss4-call-ring { 0%,100%{box-shadow:0 0 0 0 rgba(91,124,246,0.4);} 50%{box-shadow:0 0 0 12px rgba(91,124,246,0);} }
    .ss4-calling-ring { animation:ss4-call-ring 2s ease-in-out infinite; }
.ss4-tab-bar {
  background: rgba(127, 127, 127, 0.08);
  border-radius: 8px;
  padding: 3px;
}

.ss4-tab {
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
  color: var(--text-primary, #18181b);
}

.ss4-tab:hover {
  color: var(--text-primary, #18181b);
  background: rgba(127, 127, 127, 0.1);
}

.ss4-tab-active {
  background: var(--accent);
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(91, 124, 246, 0.35);
}
    .ss4-logo-mark { background:linear-gradient(140deg,#16a34a,#34c97d); box-shadow:0 0 0 1px rgba(52,201,125,0.3),0 4px 16px rgba(52,201,125,0.25); border-radius:10px; }
    .ss4-new-btn { background:rgba(91,124,246,0.15); border:1px solid rgba(91,124,246,0.25); border-radius:8px; color:var(--accent-text); transition:all .15s ease; }
    .ss4-new-btn:hover { background:rgba(91,124,246,0.25); }
    .ss4-theme-btn { background:var(--bg-hover); border:1px solid var(--border-2); border-radius:8px; color:var(--text-tertiary); transition:all .15s ease; }
    .ss4-theme-btn:hover { color:var(--text-primary); border-color:var(--border-3); }
    .ss4-file-own { background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.12); border-radius:10px; }
    .ss4-file-other { background:var(--surface-2); border:1px solid var(--border-1); border-radius:10px; }
    .ss4-badge { background:var(--accent); color:#fff; font-size:9px; font-weight:700; border-radius:10px; min-width:16px; height:16px; line-height:16px; padding:0 4px; text-align:center; }
    @keyframes ss4-fade-up { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
    .ss4-msg-enter { animation:ss4-fade-up .2s ease forwards; -webkit-touch-callout:default; -webkit-user-select:text; user-select:text; }
    .ss4-copyable-text { -webkit-user-select:text; user-select:text; cursor:text; }
    .ss4-empty-icon { background:var(--accent-muted); border:1px dashed rgba(91,124,246,0.25); border-radius:16px; }
    .ss4-divider { height:1px; background:var(--border-1); }
    .ss4-reaction-chip { display:inline-flex; align-items:center; gap:3px; padding:1px 7px; border-radius:999px; border:1px solid var(--border-2); background:var(--bg-hover); font-size:11px; cursor:pointer; transition:all .12s ease; }
    .ss4-reaction-chip:hover { border-color:var(--accent); }
    .ss4-reaction-mine { border-color:var(--accent); background:var(--accent-muted); color:var(--accent-text); }
    .ss4-react-pop { background:var(--bg-elevated); border:1px solid var(--border-2); border-radius:999px; box-shadow:var(--shadow-md); padding:4px; display:flex; gap:2px; }
    .ss4-react-pop button { font-size:18px; line-height:1; padding:3px 5px; border-radius:8px; transition:transform .12s ease,background .12s ease; }
    .ss4-react-pop button:hover { transform:scale(1.25); background:var(--bg-hover); }
    .ss4-card { background:var(--bubble-other-bg); border:1px solid var(--bubble-other-border); border-radius:14px; box-shadow:var(--shadow-sm); }
    .ss4-poll-opt { position:relative; overflow:hidden; border:1px solid var(--border-2); border-radius:10px; cursor:pointer; transition:border-color .12s ease; }
    .ss4-poll-opt:hover { border-color:var(--accent); }
    .ss4-poll-fill { position:absolute; left:0; top:0; bottom:0; background:var(--accent-muted); transition:width .35s ease; }
    .ss4-voice-bar { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:14px; }
    @media (max-width:767px) {
      .ss4 input, .ss4 textarea { font-size: 16px !important; }
      .ss4-msg-column { max-width:min(82%,22rem); }
      .ss4-msg-bubble { font-size:18px !important; line-height:1.55 !important; }
      .ss4-msg-sender { font-size:14px !important; }
      .ss4-msg-actions { border-radius:18px!important; padding:5px!important; gap:3px!important; box-shadow:0 10px 30px rgba(0,0,0,.48)!important; }
      .ss4-msg-actions .ss4-action-emoji,
      .ss4-msg-actions .ss4-action-btn { height:36px!important; width:36px!important; font-size:20px!important; border-radius:13px!important; }
      .ss4-msg-actions .ss4-action-btn svg { height:18px!important; width:18px!important; }
      .ss4-msg-actions .ss4-action-divider { height:22px!important; margin-left:3px!important; margin-right:3px!important; }
      .ss4-mobile-no-select,
      .ss4-mobile-no-select .ss4-copyable-text,
      .ss4-mobile-no-select .ss4-msg-bubble {
        -webkit-touch-callout:none!important;
        -webkit-user-select:none!important;
        user-select:none!important;
      }
      .ss4-date-chip { font-size:12px; }
      .ss4-composer-editor { font-size:16px !important; line-height:1.5 !important; min-height:30px; height:auto!important; }
      .ss4-composer-placeholder { font-size:16px !important; top:1px; }
      .ss4-input-wrap { border:0; background:transparent; box-shadow:none; }
      .ss4-input-wrap:focus-within { box-shadow:none; }
      .ss4-mobile-composer-shell { display:flex; align-items:center; gap:10px; padding:4px 0; }
      .ss4-mobile-round-action { height:44px; width:44px; border-radius:999px; flex-shrink:0; background:var(--bubble-other-bg); color:var(--text-primary); display:flex; align-items:center; justify-content:center; }
      .ss4-composer-main { display:grid!important; grid-template-columns:44px minmax(0,1fr) auto; align-items:end; gap:8px; width:100%; max-width:100%; min-width:0; padding:4px 0; }
      .ss4-mobile-leading,.ss4-mobile-trailing,.ss4-mobile-emoji { display:flex!important; align-items:center; justify-content:center; }
      .ss4-mobile-leading { position:relative; }
      .ss4-mobile-trailing { gap:6px; min-width:0; color:var(--text-primary); }
      .ss4-composer-pill { min-height:44px; width:100%; max-width:100%; align-items:center; border-radius:999px; padding:8px 8px 8px 16px; background:var(--bubble-other-bg); min-width:0; overflow:hidden; }
      .ss4-composer-pill .ss4-composer-placeholder { left:16px; top:50%; transform:translateY(-50%); }
      .ss4-composer-pill .ss4-composer-editor { flex:1 1 0%; min-width:0; min-height:24px; max-height:88px; padding:0 !important; }
      .ss4-mobile-emoji { flex:0 0 32px; width:32px; min-width:32px; }
      .ss4-mobile-emoji-panel { position:fixed; left:12px; right:12px; bottom:calc(env(safe-area-inset-bottom) + 76px); z-index:90; max-height:min(360px,calc(100dvh - 180px)); border-radius:14px; overflow:hidden; box-shadow:var(--shadow-lg); }
      .ss4-mobile-emoji-panel .EmojiPickerReact { width:100% !important; max-width:100% !important; border-radius:14px !important; }
      .ss4-mobile-send { height:44px; width:44px; border-radius:999px; flex-shrink:0; background:var(--accent); color:white; display:flex; align-items:center; justify-content:center; }
      .ss4-desktop-toolbar { display:none!important; }
      .ss4-conv { gap:12px; padding-top:10px; padding-bottom:10px; }
      .ss4-section-label { font-size:11px; letter-spacing:.08em; }
      .ss4-sidebar .ss4-search-input { height:38px; font-size:16px !important; }
    }
    @media (max-width:767px) and (hover:none) and (pointer:coarse) {
      .ss4-conv-name { font-size:18px !important; line-height:1.25 !important; }
      .ss4-conv-preview { font-size:17px !important; line-height:1.35 !important; }
      .ss4-conv-time { font-size:12.5px !important; }
    }
    @media (min-width:768px) {
      .ss4-mobile-composer-shell { display:none; }
    }
  `;
}

const ini = (n: string) => (n || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmtTime = (d: string) => fmtTimeMDT(d);
function fmtDate(d: string) {
  const date = new Date(d);
  if (isTodayMDT(date)) return 'Today';
  if (isYesterdayMDT(date)) return 'Yesterday';
  const dayKey = (value: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: MDT_TZ,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(value);
    const valueFor = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value || 0);
    return Date.UTC(valueFor('year'), valueFor('month') - 1, valueFor('day'));
  };
  const days = Math.floor((dayKey(new Date()) - dayKey(date)) / 86400000);
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: MDT_TZ });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ });
}
function fmtRelative(d?: string) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ });
  } catch { return ''; }
}
const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60); const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
};

function getJwtType(token: string | null): string | null {
  if (!token || typeof atob === 'undefined') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as { type?: string };
    return decoded.type || null;
  } catch {
    return null;
  }
}

function cssColorToHex(color: string | null | undefined): string | null {
  if (!color) return null;

  const raw = color.trim().toLowerCase();
  if (!raw || raw === 'transparent') return null;

  const namedColors: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
  };
  if (namedColors[raw]) return namedColors[raw];

  const hexMatch = raw.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hexMatch) {
    const expanded = hexMatch.length <= 4
      ? hexMatch.split('').map(character => character + character).join('')
      : hexMatch;
    const alpha = expanded.length === 8
      ? Number.parseInt(expanded.slice(6, 8), 16)
      : 255;

    if (alpha === 0) return null;
    return `#${expanded.slice(0, 6)}`.toLowerCase();
  }

  const rgbMatch = raw.match(
    /^rgba?\(\s*([+-]?(?:\d*\.?\d+)%?)\s*(?:,|\s)\s*([+-]?(?:\d*\.?\d+)%?)\s*(?:,|\s)\s*([+-]?(?:\d*\.?\d+)%?)(?:\s*(?:\/|,)\s*([+-]?(?:\d*\.?\d+)%?))?\s*\)$/i,
  );
  if (!rgbMatch) return null;

  const parseChannel = (value: string): number => {
    const numeric = Number.parseFloat(value);
    const resolved = value.endsWith('%') ? (numeric / 100) * 255 : numeric;
    return Math.max(0, Math.min(255, Math.round(resolved)));
  };

  const parseAlpha = (value?: string): number => {
    if (!value) return 1;
    const numeric = Number.parseFloat(value);
    return Math.max(
      0,
      Math.min(1, value.endsWith('%') ? numeric / 100 : numeric),
    );
  };

  if (parseAlpha(rgbMatch[4]) === 0) return null;

  return `#${rgbMatch.slice(1, 4)
    .map(parseChannel)
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function getCopiedElementVisibleText(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    const input = element as HTMLInputElement;
    if (input.type === 'hidden') return '';
    return input.value || element.getAttribute('value') || '';
  }
  if (tag === 'textarea') {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value || element.getAttribute('value') || element.textContent || '';
  }
  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    return select.selectedOptions?.[0]?.textContent || select.value || '';
  }
  if (element.textContent?.trim()) return '';
  return element.getAttribute('data-value')
    || element.getAttribute('data-text')
    || element.getAttribute('data-label')
    || element.getAttribute('aria-valuetext')
    || '';
}

function getActiveSelectionColor(root: HTMLElement): string {
  const commandColor = cssColorToHex(String(document.queryCommandValue('foreColor') || ''));
  if (commandColor && SS4_MORE_TEXT_COLORS.includes(commandColor)) return commandColor;

  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const element = node?.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node?.parentElement;
  if (element && root.contains(element)) {
    const computedColor = cssColorToHex(window.getComputedStyle(element).color);
    if (computedColor && SS4_MORE_TEXT_COLORS.includes(computedColor)) return computedColor;
  }

  return '#ffffff';
}


function getRichEditorSelectionRange(root: HTMLElement, savedRange: Range | null): Range {
  const currentSelection = window.getSelection();
  if (currentSelection?.rangeCount) {
    const currentRange = currentSelection.getRangeAt(0);
    if (
      root.contains(currentRange.startContainer)
      && root.contains(currentRange.endContainer)
    ) {
      return currentRange.cloneRange();
    }
  }

  if (
    savedRange
    && root.contains(savedRange.startContainer)
    && root.contains(savedRange.endContainer)
  ) {
    return savedRange.cloneRange();
  }

  const fallbackRange = document.createRange();
  fallbackRange.selectNodeContents(root);
  fallbackRange.collapse(false);
  return fallbackRange;
}

function executeRichEditorCommandPreservingSelection(
  root: HTMLElement,
  savedRange: Range | null,
  command: () => void,
  options: { normalizeListExit?: boolean } = {},
): Range | null {
  const sourceRange = getRichEditorSelectionRange(root, savedRange);
  const selection = window.getSelection();
  if (!selection) return null;

  const createTextBookmark = (range: Range) => {
    const startProbe = document.createRange();
    startProbe.selectNodeContents(root);
    startProbe.setEnd(range.startContainer, range.startOffset);

    const endProbe = document.createRange();
    endProbe.selectNodeContents(root);
    endProbe.setEnd(range.endContainer, range.endOffset);

    return {
      start: startProbe.toString().length,
      end: endProbe.toString().length,
      collapsed: range.collapsed,
    };
  };

  const restoreTextBookmark = (
    bookmark: { start: number; end: number; collapsed: boolean },
  ): Range | null => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    let current = walker.nextNode();
    while (current) {
      const node = current as Text;
      const parent = node.parentElement;
      if (
        node.data
        && !parent?.closest('[data-rich-editor-selection-marker]')
      ) {
        textNodes.push(node);
      }
      current = walker.nextNode();
    }

    if (!textNodes.length) {
      const fallback = document.createRange();
      fallback.selectNodeContents(root);
      fallback.collapse(false);
      selection.removeAllRanges();
      selection.addRange(fallback);
      return fallback.cloneRange();
    }

    const locate = (target: number) => {
      let consumed = 0;

      for (let index = 0; index < textNodes.length; index += 1) {
        const node = textNodes[index];
        const nextConsumed = consumed + node.data.length;

        if (target < nextConsumed) {
          return {
            node,
            offset: Math.max(0, target - consumed),
          };
        }

        if (target === nextConsumed) {
          const nextNode = textNodes[index + 1];
          return nextNode
            ? { node: nextNode, offset: 0 }
            : { node, offset: node.data.length };
        }

        consumed = nextConsumed;
      }

      const lastNode = textNodes[textNodes.length - 1];
      return { node: lastNode, offset: lastNode.data.length };
    };

    const start = locate(bookmark.start);
    const end = bookmark.collapsed
      ? start
      : locate(Math.max(bookmark.start, bookmark.end));

    const restored = document.createRange();
    restored.setStart(start.node, start.offset);
    restored.setEnd(end.node, end.offset);

    selection.removeAllRanges();
    selection.addRange(restored);
    return restored.cloneRange();
  };

  const isVisuallyEmpty = (element: Element): boolean => {
    const visibleText = (element.textContent || '')
      .replace(/[\u200B\u2060]/g, '')
      .trim();

    return (
      !visibleText
      && !element.querySelector(
        'img,video,audio,canvas,svg,input,textarea,button,a[href]',
      )
    );
  };

  const removeLeadingPhantomBlocks = () => {
    // Remove any legacy temporary markers left by an interrupted command.
    root
      .querySelectorAll('[data-rich-editor-selection-marker]')
      .forEach(node => node.remove());

    while (
      root.firstChild?.nodeType === Node.TEXT_NODE
      && !(root.firstChild.textContent || '').trim()
    ) {
      root.firstChild.remove();
    }

    let firstElement = root.firstElementChild;

    // Repeated browser list toggles can leave an empty DIV/P before the
    // original text. A saved message is already trimmed, so this leading
    // empty block is always an editor artifact rather than message content.
    while (
      firstElement
      && root.children.length > 1
      && ['DIV', 'P'].includes(firstElement.tagName)
      && isVisuallyEmpty(firstElement)
    ) {
      firstElement.remove();
      firstElement = root.firstElementChild;
    }

    // Chrome can also create an empty first LI when a list is toggled
    // repeatedly over the same selected lines.
    if (
      firstElement
      && ['UL', 'OL'].includes(firstElement.tagName)
    ) {
      let firstItem = firstElement.firstElementChild;

      while (
        firstItem
        && firstElement.children.length > 1
        && firstItem.tagName === 'LI'
        && isVisuallyEmpty(firstItem)
      ) {
        firstItem.remove();
        firstItem = firstElement.firstElementChild;
      }
    }

    // Remove an entirely empty list wrapper when meaningful content follows it.
    firstElement = root.firstElementChild;
    if (
      firstElement
      && root.children.length > 1
      && ['UL', 'OL'].includes(firstElement.tagName)
      && isVisuallyEmpty(firstElement)
    ) {
      firstElement.remove();
    }
  };

  const bookmark = createTextBookmark(sourceRange);

  root.focus();
  selection.removeAllRanges();
  selection.addRange(sourceRange);

  command();
  removeLeadingPhantomBlocks();

  if (options.normalizeListExit) {
    normalizeRichEditorListExitArtifacts(root);
  }

  return restoreTextBookmark(bookmark);
}


function applyTextColorToRichEditorSelection(root: HTMLElement, color: string): void {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer)
    || !root.contains(range.endContainer)
  ) {
    return;
  }

  if (range.collapsed) {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    return;
  }

  const selectedTextNodes: Text[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const textNode = node as Text;
        const value = textNode.data;
        const parent = textNode.parentElement;

        if (
          !value
          || !parent
          || parent.closest('[data-rich-editor-selection-marker]')
          || !range.intersectsNode(textNode)
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let current = walker.nextNode();
  while (current) {
    selectedTextNodes.push(current as Text);
    current = walker.nextNode();
  }

  // Process from the end so splitting a text node cannot invalidate a later node.
  selectedTextNodes.reverse().forEach(textNode => {
    const originalLength = textNode.data.length;
    let startOffset = textNode === range.startContainer ? range.startOffset : 0;
    let endOffset = textNode === range.endContainer ? range.endOffset : originalLength;

    startOffset = Math.max(0, Math.min(startOffset, originalLength));
    endOffset = Math.max(startOffset, Math.min(endOffset, originalLength));
    if (startOffset === endOffset) return;

    if (endOffset < textNode.data.length) {
      textNode.splitText(endOffset);
    }

    const selectedNode = startOffset > 0
      ? textNode.splitText(startOffset)
      : textNode;

    const parent = selectedNode.parentElement;
    const parentColor = parent
      ? cssColorToHex(parent.style.color || parent.getAttribute('color'))
      : null;

    if (
      parent
      && parent.tagName.toLowerCase() === 'span'
      && parent.childNodes.length === 1
      && parentColor
    ) {
      parent.style.color = color;
      return;
    }

    const colorSpan = document.createElement('span');
    colorSpan.style.color = color;
    selectedNode.parentNode?.insertBefore(colorSpan, selectedNode);
    colorSpan.appendChild(selectedNode);
  });

  // Remove empty wrappers created by repeated color changes, while preserving
  // each block element and every line break.
  root.querySelectorAll<HTMLElement>('span[style*="color"]').forEach(span => {
    if (!span.textContent && !span.querySelector('br')) span.remove();
  });
}

function htmlToMarkdown(el: HTMLElement): string {
  const walk = (node: Node, listDepth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    if (element.hasAttribute('data-rich-editor-selection-marker')) return '';
    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') return element.getAttribute('alt') || element.getAttribute('aria-label') || element.getAttribute('title') || '';

    if (tag === 'ul' || tag === 'ol') {
      return Array.from(element.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map(child => walk(child, listDepth))
        .join('');
    }

    if (tag === 'li') {
      const parent = element.parentElement;
      const ordered = parent?.tagName.toLowerCase() === 'ol';
      const siblings = parent
        ? Array.from(parent.children).filter(child => child.tagName.toLowerCase() === 'li')
        : [];
      const itemIndex = Math.max(0, siblings.indexOf(element));
      const startAt = ordered ? Number(parent?.getAttribute('start') || 1) : 1;
      const marker = ordered ? `${startAt + itemIndex}.` : ss4BulletGlyphForDepth(listDepth);
      const indent = SS4_LIST_INDENT_STEP.repeat(listDepth);

      let ownContent = '';
      let nestedContent = '';
      Array.from(element.childNodes).forEach(child => {
        if (
          child.nodeType === Node.ELEMENT_NODE
          && ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())
        ) {
          nestedContent += walk(child, listDepth + 1);
        } else {
          ownContent += walk(child, listDepth);
        }
      });

      const itemText = ownContent.replace(/\n+/g, ' ').trim();
      return `${indent}${marker}${itemText ? ` ${itemText}` : ''}\n${nestedContent}`;
    }

    let inner = Array.from(element.childNodes).map(child => walk(child, listDepth)).join('');
    if (!inner.trim()) inner = getCopiedElementVisibleText(element);

    const href = tag === 'a' ? element.getAttribute('href') : null;
    const fontFamily = `${element.style?.fontFamily || ''} ${element.getAttribute('face') || ''}`.toLowerCase();
    const isMonospace = /(monospace|courier|consolas|menlo|monaco)/i.test(fontFamily);

    if (tag === 'strong' || tag === 'b' || /^h[1-6]$/.test(tag)) inner = `**${inner}**`;
    else if (tag === 'em' || tag === 'i') inner = `_${inner}_`;
    else if (tag === 'u') inner = `__${inner}__`;
    else if (tag === 's' || tag === 'strike' || tag === 'del') inner = `~~${inner}~~`;
    else if (tag === 'pre') inner = `\`\`\`\n${inner.replace(/```/g, '')}\n\`\`\``;
    else if (tag === 'code' || isMonospace) inner = isSerialLikeText(inner) ? inner : '`' + inner.replace(/`/g, '') + '`';
    else if (tag === 'blockquote') inner = inner.split('\n').map(line => line ? `> ${line}` : '>').join('\n');
    else if (href && /^https?:\/\//i.test(href)) inner = `[${inner || href}](${href})`;

    const color = cssColorToHex(element.style?.color || element.getAttribute('color'));
    if (color && inner.trim()) inner = `{color:${color}}${inner}{/color}`;
    if (['div', 'p', 'section', 'article', 'blockquote', 'pre'].includes(tag) || /^h[1-6]$/.test(tag)) inner = `\n${inner}`;
    return inner;
  };

  const rootColor = cssColorToHex(el.style.color);
  let markdown = normalizeListExitLineSpacing(
    Array.from(el.childNodes).map(child => walk(child, 0)).join('')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
  if (rootColor && rootColor !== '#ffffff' && markdown) markdown = `{color:${rootColor}}${markdown}{/color}`;
  return markdown;
}

function clipboardHtmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') return el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    const visibleValue = getCopiedElementVisibleText(el);
    if (visibleValue) return visibleValue;

    const inner = Array.from(el.childNodes).map(walk).join('');
    if (tag === 'li') return `• ${inner.trimStart()}\n`;
    if (['div', 'p', 'section', 'article'].includes(tag)) return `${inner}\n`;
    return inner;
  };

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

const VIN_LIKE_TOKEN = /[A-HJ-NPR-Z0-9]{17}/g;
const SERIAL_LIKE_TOKEN = /[A-Z0-9][A-Z0-9-]{6,}[A-Z0-9]/g;
const SERIAL_WORD_TOKEN = /[A-Z0-9][A-Z0-9\-\u200B-\u200D\uFEFF]{6,}[A-Z0-9]/g;

function serialLikeTokens(text: string): string[] {
  const normalized = text.toUpperCase();
  const rawTokens = [
    ...(normalized.match(VIN_LIKE_TOKEN) || []),
    ...(normalized.match(SERIAL_LIKE_TOKEN) || []),
    ...(normalized.match(SERIAL_WORD_TOKEN) || []),
  ];
  return [...new Set(rawTokens
    .map(token => token.replace(/[^A-Z0-9]/g, ''))
    .filter(token => {
      if (token.length < 8 || !/[A-Z]/.test(token) || !/\d/.test(token)) return false;
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(token)) return true;
      const digitCount = (token.match(/\d/g) || []).length;
      return digitCount >= 4;
    }))];
}

function isSerialLikeText(text: string): boolean {
  const compact = text.trim().toUpperCase().replace(/-/g, '');
  return compact.length >= 8 && /^[A-Z0-9]+$/.test(compact) && /[A-Z]/.test(compact) && /\d/.test(compact);
}

function preserveVisibleVinLines(serialized: string, visibleText: string): string {
  const visibleLines = visibleText.replace(/\r\n?/g, '\n').split('\n');
  const vins = serialLikeTokens(visibleText);
  if (!vins.length) return serialized;

  const serializedLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  vins.forEach(vin => {
    const serializedSearch = serialized.toUpperCase().replace(/-/g, '');
    if (serializedSearch.includes(vin)) return;
    const visibleLineIndex = visibleLines.findIndex(line => line.toUpperCase().replace(/-/g, '').includes(vin));
    const sourceLine = visibleLineIndex >= 0 ? visibleLines[visibleLineIndex].trim() : vin;
    serializedLines.splice(Math.min(Math.max(visibleLineIndex, 0), serializedLines.length), 0, sourceLine || vin);
    serialized = serializedLines.join('\n');
  });
  return serializedLines.join('\n');
}

function importantVisibleTokens(line: string): string[] {
  return serialLikeTokens(line);
}

function preserveVisiblePayloadLines(serialized: string, visibleText: string): string {
  const visibleLines = visibleText.replace(/\r\n?/g, '\n').split('\n');
  const serializedLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  let serializedSearch = serializedLines.join('\n').toUpperCase().replace(/-/g, '');

  visibleLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const missingImportantToken = importantVisibleTokens(trimmed).some(token => !serializedSearch.includes(token));
    if (!missingImportantToken) return;

    const insertAt = Math.min(Math.max(index, 0), serializedLines.length);
    serializedLines.splice(insertAt, 0, trimmed);
    serializedSearch = serializedLines.join('\n').toUpperCase().replace(/-/g, '');
  });

  return serializedLines.join('\n');
}

function normalizeSerialSearchText(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isEmptyVinLabelLine(line: string): boolean {
  return /^\s*VIN\s*#?\s*:\s*$/i.test(line);
}

function restoreMissingSerialsFromSources(serialized: string, sources: Array<string | null | undefined>): string {
  const sourceText = sources.filter(Boolean).join('\n');
  const tokens = serialLikeTokens(sourceText);
  if (!tokens.length) return serialized;

  const sourceLines = sourceText.replace(/\r\n?/g, '\n').split('\n');
  const restoredLines = serialized.replace(/\r\n?/g, '\n').split('\n');
  let serializedSearch = normalizeSerialSearchText(restoredLines.join('\n'));

  tokens.forEach(token => {
    if (serializedSearch.includes(token)) return;
    const emptyVinLineIndex = restoredLines.findIndex(isEmptyVinLabelLine);
    if (emptyVinLineIndex >= 0 && /^[A-HJ-NPR-Z0-9]{17}$/.test(token)) {
      restoredLines[emptyVinLineIndex] = restoredLines[emptyVinLineIndex].replace(/:\s*$/, `: ${token}`);
      serializedSearch = normalizeSerialSearchText(restoredLines.join('\n'));
      return;
    }
    const sourceLine = sourceLines.find(line => normalizeSerialSearchText(line).includes(token))?.trim();
    const fallback = sourceLine && sourceLine.length <= token.length + 24 ? sourceLine : token;
    if (!fallback) return;
    restoredLines.push(fallback);
    serializedSearch = normalizeSerialSearchText(restoredLines.join('\n'));
  });

  return restoredLines.join('\n');
}

function canonicalizeColorMarkup(value: string): string {
  const tagPattern = /\{\s*(\/)?\s*color(?:\s*:\s*(#[0-9a-f]{3,8}))?\s*\}/gi;
  let result = '';
  let cursor = 0;
  let activeColor: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(value)) !== null) {
    result += value.slice(cursor, match.index);
    const isClosing = Boolean(match[1]);
    const nextColor = match[2]?.toLowerCase() || null;

    if (isClosing) {
      if (activeColor) result += '{/color}';
      activeColor = null;
    } else if (nextColor && nextColor !== activeColor) {
      if (activeColor) result += '{/color}';
      result += `{color:${nextColor}}`;
      activeColor = nextColor;
    }

    cursor = match.index + match[0].length;
  }

  result += value.slice(cursor);
  if (activeColor) result += '{/color}';

  result = result.replace(
    /\{color:(#[0-9a-f]{3,8})\}[ \t]*\{\/color\}/gi,
    '',
  );

  // Merge adjacent same-color fragments only across horizontal whitespace.
  // Never consume \n or \r because those line boundaries are user content.
  let previous = '';
  while (previous !== result) {
    previous = result;
    result = result.replace(
      /\{color:(#[0-9a-f]{3,8})\}([^{}\r\n]*)\{\/color\}([ \t]*)\{color:\1\}/gi,
      '{color:$1}$2$3',
    );
  }

  return result;
}

function richPasteDropsVinLikeToken(plainText: string, html: string): boolean {
  if (!plainText || !html) return false;
  const tokens = serialLikeTokens(plainText);
  if (!tokens.length) return false;
  const htmlText = clipboardHtmlToPlainText(html).toUpperCase().replace(/-/g, '');
  return tokens.some(token => !htmlText.includes(token));
}

function shouldPreferPlainTextLayout(plainText: string, editorHtml: string): boolean {
  if (!plainText.trim() || !editorHtml.trim()) return false;
  const normalizedPlainText = normalizePastedListArtifacts(plainText)
    .replace(/\r\n?/g, '\n')
    .trim();
  const originalPlainText = plainText
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
  if (normalizedPlainText && normalizedPlainText !== originalPlainText) return true;
  const plainBreaks = (plainText.replace(/\r\n/g, '\n').match(/\n/g) || []).length;
  if (plainBreaks < 2) return false;
  const htmlBreaks = (editorHtml.match(/<br\s*\/?>/gi) || []).length;
  return plainBreaks > htmlBreaks + 1;
}

function stripListMarkerNoise(value: string): string {
  return value
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\u00a0/g, ' ');
}

const SS4_SOURCE_BULLET_RE = /^([ \t]*)([\-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]{1,4})\s+(.+)$/u;

function normalizeListExitLineSpacing(value: string): string {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const isListLine = (line: string): boolean =>
    SS4_SOURCE_BULLET_RE.test(line) || /^\s*\d+\.\s+\S/.test(line);

  return lines.map((line, index) => {
    let nextLine = line.replace(/^[\u200B-\u200D\u2060\uFEFF]+/, '');

    if (
      index > 0
      && nextLine.trim()
      && isListLine(lines[index - 1])
      && !isListLine(nextLine)
      && !/^\s*>/.test(nextLine)
    ) {
      // Chrome can leave one invisible/NBSP/normal-space character when a
      // list item is converted back to a normal paragraph. Remove only that
      // browser-created first character; preserve the rest of the user's
      // alignment and spacing.
      nextLine = nextLine.replace(/^\u00A0/, '');
      if (/^ [^ \t]/.test(nextLine)) nextLine = nextLine.slice(1);
    }

    return nextLine;
  }).join('\n');
}

function firstVisibleTextNode(element: Element): Text | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    if (textNode.data) return textNode;
    current = walker.nextNode();
  }

  return null;
}

function normalizeRichEditorListExitArtifacts(root: HTMLElement | null): boolean {
  if (!root) return false;

  let changed = false;
  const topLevelBlocks = Array.from(root.children);

  topLevelBlocks.forEach((element, index) => {
    if (['UL', 'OL'].includes(element.tagName)) return;

    const previous = topLevelBlocks[index - 1];
    if (!previous || !['UL', 'OL'].includes(previous.tagName)) return;

    const htmlElement = element as HTMLElement;
    ['margin-left', 'padding-left', 'text-indent'].forEach(property => {
      if (htmlElement.style.getPropertyValue(property)) {
        htmlElement.style.removeProperty(property);
        changed = true;
      }
    });

    const firstText = firstVisibleTextNode(element);
    if (!firstText) return;

    const original = firstText.data;
    let normalized = original.replace(
      /^[\u00A0\u200B-\u200D\u2060\uFEFF]+/,
      '',
    );

    // Toggling a browser list off can leave exactly one ordinary leading
    // space after its non-breaking placeholder. Remove one only.
    if (/^ [^ \t]/.test(normalized)) normalized = normalized.slice(1);

    if (normalized !== original) {
      firstText.data = normalized;
      changed = true;
    }
  });

  return changed;
}

function isUnsafeNeutralPastedColor(color: string | null): boolean {
  if (!color) return false;
  const raw = color.replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return false;

  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const neutral = maximum - minimum <= 20;
  const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);

  // Very light neutral text disappears on the light composer. Very dark
  // neutral text disappears in dark mode. Let those colors inherit the
  // application theme instead.
  return neutral && (luminance >= 222 || luminance <= 42);
}

function sanitizePastedEditorHtmlForTheme(html: string): string {
  if (!html.trim()) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.body.querySelectorAll<HTMLElement>('*').forEach(element => {
    const rawColor = element.style.color
      || element.style.getPropertyValue('-webkit-text-fill-color')
      || element.style.getPropertyValue('text-fill-color')
      || element.getAttribute('color')
      || '';
    const normalizedColor = cssColorToHex(rawColor);

    if (isUnsafeNeutralPastedColor(normalizedColor)) {
      element.style.removeProperty('color');
      element.style.removeProperty('-webkit-text-fill-color');
      element.style.removeProperty('text-fill-color');
      element.removeAttribute('color');
    }

    // Source backgrounds frequently carry the source application's theme and
    // can make otherwise visible text unreadable in Suprah Space.
    element.style.removeProperty('background');
    element.style.removeProperty('background-color');
    element.style.removeProperty('background-image');
    element.style.removeProperty('text-shadow');
    element.removeAttribute('bgcolor');

    if (!element.getAttribute('style')?.trim()) {
      element.removeAttribute('style');
    }
  });

  return doc.body.innerHTML;
}

function plainTextHasListMarkers(text: string): boolean {
  const normalized = stripListMarkerNoise(text).replace(/\r\n?/g, '\n');
  return normalized.split('\n').some(line => SS4_SOURCE_BULLET_RE.test(line) || /^\s*\d+\.\s+\S/.test(line));
}

function applySourceBulletMarkers(structuredText: string, sourceText: string): string {
  const sourceMarkers = stripListMarkerNoise(sourceText)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.match(SS4_SOURCE_BULLET_RE)?.[2])
    .filter((marker): marker is string => Boolean(marker));

  if (!sourceMarkers.length) return structuredText;

  let markerIndex = 0;
  return structuredText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => {
      const match = line.match(SS4_SOURCE_BULLET_RE);
      if (!match) return line;
      const sourceMarker = sourceMarkers[markerIndex++] || match[2];
      return `${match[1]}${sourceMarker} ${match[3]}`;
    })
    .join('\n');
}

function editorHtmlHasListMarkers(html: string): boolean {
  return /(^|<br\s*\/?>)\s*(?:[-*+\u2022\u00b7\u2023\u2043\u25e6\u25aa\u25ab\u25cf\u25cb\u2013\u2014]|\d+\.)\s+\S/i.test(stripListMarkerNoise(html));
}

function shouldUsePlainTextListLayout(plainText: string, editorHtml: string): boolean {
  if (!plainText.trim()) return false;
  if (!plainTextHasListMarkers(plainText)) return false;
  return !editorHtml.trim() || !editorHtmlHasListMarkers(editorHtml);
}

function normalizeEditorHtmlListArtifacts(html: string): string {
  const marker = String.raw`[\u2022\u00b7\u2023\u2043\u25aa\u25ab\u25cf\u25cb\-*+\u2013\u2014]`;
  const markerOnlyLineRe = new RegExp(
    String.raw`(^|<br\s*\/?>)\s*(${marker})(?:&nbsp;|\s|[\u200b-\u200d\ufeff])*<br\s*\/?>\s*`,
    'gi',
  );

  let normalized = html;
  let previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(markerOnlyLineRe, (_match, prefix: string, listMarker: string) => {
      const cleanPrefix = /^<br/i.test(prefix) ? '<br>' : '';
      return `${cleanPrefix}${listMarker} `;
    });
  }

  return normalized
    .replace(/(?:&nbsp;|\s|[\u200b-\u200d\ufeff])+(<br\s*\/?>)/gi, '$1')
    .replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
    .replace(/^(<br\s*\/?>)+/gi, '')
    .replace(/(<br\s*\/?>)+$/gi, '');
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hasRichFormatting(html: string): boolean {
  return /<(b|strong|i|em|u|s|strike|del|code|li|blockquote|ol|ul|h[1-6])\b/i.test(html)
    || /<font\b[^>]*color\s*=/i.test(html)
    || /style\s*=\s*["'][^"']*(?:font-weight\s*:\s*(?:bold|\d{3,})|font-style\s*:\s*italic|color\s*:\s*[^"';\s][^"';]*)/i.test(html);
}

function htmlAppearsToContainLists(html: string): boolean {
  return /<(?:ul|ol|li)\b/i.test(html)
    || /display\s*:\s*list-item/i.test(html)
    || /mso-list\s*:/i.test(html)
    || /list-style(?:-type)?\s*:/i.test(html)
    || /(?:^|[>\n\r])\s*(?:&bull;|&#8226;|&#x2022;|[\u2022\u00b7\u2023\u2043\u25aa\u25ab\u25cf\u25cb])\s*/i.test(html);
}

function clipboardHtmlToListAwareText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];

  const pushBlankLine = () => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
  };

  const pushLine = (value: string) => {
    const clean = value
      .replace(/[\u200b-\u200d\ufeff]/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    if (clean) lines.push(clean);
  };

  const wrapInlineStyle = (element: HTMLElement, innerValue: string): string => {
    let inner = innerValue;
    if (!inner) return inner;

    const tag = element.tagName.toLowerCase();
    const style = (element.getAttribute('style') || '').toLowerCase();
    const href = tag === 'a' ? element.getAttribute('href') : null;
    const weight = style.match(/font-weight\s*:\s*([^;]+)/)?.[1]?.trim() || '';
    const isBold = tag === 'strong' || tag === 'b' || /^h[1-6]$/.test(tag)
      || weight === 'bold' || Number.parseInt(weight || '0', 10) >= 600;
    const isItalic = tag === 'em' || tag === 'i' || /font-style\s*:\s*italic/.test(style);
    const isUnderline = tag === 'u' || /text-decoration(?:-line)?\s*:[^;]*underline/.test(style);
    const isStrike = tag === 's' || tag === 'strike' || tag === 'del'
      || /text-decoration(?:-line)?\s*:[^;]*line-through/.test(style);

    if (tag === 'code') inner = isSerialLikeText(inner) ? inner : `\`${inner.replace(/`/g, '')}\``;
    if (href && /^https?:\/\//i.test(href)) inner = `[${inner || href}](${href})`;
    if (isBold && !/^\*\*[\s\S]*\*\*$/.test(inner)) inner = `**${inner}**`;
    if (isItalic && !/^_[\s\S]*_$/.test(inner)) inner = `_${inner}_`;
    if (isUnderline && !/^__[\s\S]*__$/.test(inner)) inner = `__${inner}__`;
    if (isStrike && !/^~~[\s\S]*~~$/.test(inner)) inner = `~~${inner}~~`;

    const color = cssColorToHex(element.style?.color || element.getAttribute('color'));
    if (color && inner.trim()) inner = `{color:${color}}${inner}{/color}`;
    return inner;
  };

  const renderInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'ul' || tag === 'ol') return '';
    if (tag === 'br') return '\n';
    if (tag === 'img') return element.getAttribute('alt') || element.getAttribute('aria-label') || element.getAttribute('title') || '';

    const visibleValue = getCopiedElementVisibleText(element);
    if (visibleValue) return visibleValue;

    const inner = Array.from(element.childNodes).map(renderInline).join('');
    return wrapInlineStyle(element, inner);
  };

  const normalizeListItemText = (value: string): string => value
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^(?:&bull;|&#8226;|&#x2022;|[-*+\u2022\u00b7\u2023\u2043\u25e6\u25aa\u25ab\u25cf\u25cb\u2013\u2014])\s+/i, '')
    .trim();

  const directListItemText = (item: HTMLElement): string => normalizeListItemText(
    Array.from(item.childNodes).map(renderInline).join(''),
  );

  const directNestedLists = (item: HTMLElement): HTMLElement[] =>
    Array.from(item.querySelectorAll('ul,ol')).filter((list): list is HTMLElement => list.closest('li') === item);

  const walkList = (list: HTMLElement, depth: number) => {
    const ordered = list.tagName.toLowerCase() === 'ol';
    const startAt = ordered ? Number.parseInt(list.getAttribute('start') || '1', 10) || 1 : 1;
    const items = Array.from(list.children).filter((child): child is HTMLElement => child.tagName.toLowerCase() === 'li');

    items.forEach((item, index) => {
      const content = directListItemText(item);
      const indent = SS4_LIST_INDENT_STEP.repeat(depth);
      const marker = ordered ? `${startAt + index}.` : ss4BulletGlyphForDepth(depth);
      if (content) lines.push(`${indent}${marker} ${content}`);

      const nestedLists = directNestedLists(item);
      nestedLists.forEach(nested => walkList(nested, depth + 1));

      // ChatGPT/Docs commonly use a top-level bullet as a section heading with a
      // nested list beneath it. Preserve the visible separation between groups.
      if (depth === 0 && nestedLists.length > 0 && index < items.length - 1) pushBlankLine();
    });
  };

  const isPseudoListItem = (element: HTMLElement): boolean => {
    const style = (element.getAttribute('style') || '').toLowerCase();
    return style.includes('display:list-item')
      || style.includes('display: list-item')
      || style.includes('mso-list:')
      || style.includes('list-style');
  };

  const pseudoListDepth = (element: HTMLElement): number => {
    const style = (element.getAttribute('style') || '').toLowerCase();
    const level = style.match(/mso-list:[^;]*level(\d+)/)?.[1];
    if (level) return Math.max(0, Number.parseInt(level, 10) - 1);
    const margin = style.match(/margin-left\s*:\s*([\d.]+)(px|pt|in|cm)?/)?.[1];
    if (!margin) return 0;
    return Math.max(0, Math.round(Number.parseFloat(margin) / 36) - 1);
  };

  const walkBlock = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushLine(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return;
    if (tag === 'ul' || tag === 'ol') {
      walkList(element, 0);
      return;
    }

    if (isPseudoListItem(element)) {
      const raw = normalizeListItemText(renderInline(element));
      if (!raw) return;
      const numbered = raw.match(/^(\d+)[.)]\s+(.+)$/);
      const depth = pseudoListDepth(element);
      const indent = SS4_LIST_INDENT_STEP.repeat(depth);
      lines.push(numbered
        ? `${indent}${numbered[1]}. ${numbered[2]}`
        : `${indent}${ss4BulletGlyphForDepth(depth)} ${raw}`);
      return;
    }

    const isHeading = /^h[1-6]$/.test(tag);
    const isBlock = ['div', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'blockquote', 'pre'].includes(tag) || isHeading;
    if (!isBlock) {
      pushLine(renderInline(element));
      return;
    }

    if (isHeading) pushBlankLine();

    let inlineBuffer = '';
    let producedContent = false;
    const flushInline = () => {
      const clean = normalizeListItemText(inlineBuffer);
      inlineBuffer = '';
      if (!clean) return;
      pushLine(isHeading && !/^\*\*[\s\S]*\*\*$/.test(clean) ? `**${clean}**` : clean);
      producedContent = true;
    };

    Array.from(element.childNodes).forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as HTMLElement;
        const childTag = childElement.tagName.toLowerCase();
        const childIsBlock = ['div', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'blockquote', 'pre'].includes(childTag) || /^h[1-6]$/.test(childTag);
        if (childTag === 'ul' || childTag === 'ol' || isPseudoListItem(childElement) || childIsBlock) {
          flushInline();
          walkBlock(child);
          producedContent = true;
          return;
        }
      }
      inlineBuffer += renderInline(child);
    });
    flushInline();

    if (!producedContent && (tag === 'p' || tag === 'div')) pushBlankLine();
    if (isHeading) pushBlankLine();
  };

  Array.from(doc.body.childNodes).forEach(walkBlock);

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clipboardHtmlToEditorHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walk = (node: Node, listMarker?: string): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtmlText(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return '';
    if (tag === 'br') return '<br>';
    if (tag === 'img') return escapeHtmlText(el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || '');
    const visibleValue = getCopiedElementVisibleText(el);
    if (visibleValue) return escapeHtmlText(visibleValue);

    const childHtml = (): string => Array.from(el.childNodes).map(c => walk(c)).join('');
    const elColor = cssColorToHex(el.style?.color || el.getAttribute('color') || '');
    const wrapColor = (inner: string): string =>
      elColor && inner.trim() ? `<span style="color:${elColor}">${inner}</span>` : inner;

    switch (tag) {
      case 'strong': case 'b': return wrapColor(`<strong>${childHtml()}</strong>`);
      case 'em': case 'i': return wrapColor(`<em>${childHtml()}</em>`);
      case 'u': return wrapColor(`<u>${childHtml()}</u>`);
      case 's': case 'strike': case 'del': return wrapColor(`<s>${childHtml()}</s>`);
      case 'code': {
        const codeText = childHtml().replace(/<[^>]*>/g, '');
        return isSerialLikeText(codeText) ? escapeHtmlText(codeText) : '`' + codeText.replace(/`/g, '') + '`';
      }
      case 'pre': {
        const codeText = childHtml().replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
        return codeText.split('\n').map(line => line ? `\`${line.replace(/`/g, '')}\`` : '').join('<br>');
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        const inner = childHtml();
        return /^https?:\/\//i.test(href) ? `<a href="${escapeHtmlText(href)}">${inner || escapeHtmlText(href)}</a>` : inner;
      }
      case 'font': return wrapColor(childHtml());
      case 'li': return `${listMarker || '\u2022 '}${childHtml()}<br>`;
      case 'ul': return Array.from(el.children).map(li => walk(li, '\u2022 ')).join('');
      case 'ol': {
        let i = 1;
        return Array.from(el.children).map(li => walk(li, `${i++}. `)).join('');
      }
      case 'blockquote': return `&gt; ${childHtml()}<br>`;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `<strong>${childHtml()}</strong><br>`;
      case 'div': case 'p': case 'section': case 'article':
        return `${childHtml()}<br>`;
      default: {
        const inner = childHtml();
        if (!inner) return inner;
        const fw = el.style?.fontWeight;
        const fi = el.style?.fontStyle;
        const td = `${el.style?.textDecoration || ''} ${el.style?.textDecorationLine || ''}`;
        let result = inner;
        if (fw === 'bold' || Number.parseInt(fw || '0', 10) >= 600) result = `<strong>${result}</strong>`;
        if (fi === 'italic') result = `<em>${result}</em>`;
        if (td.includes('underline')) result = `<u>${result}</u>`;
        if (td.includes('line-through')) result = `<s>${result}</s>`;
        return wrapColor(result);
      }
    }
  };

  return normalizeEditorHtmlListArtifacts(Array.from(doc.body.childNodes)
    .map(n => walk(n))
    .join('')
    .replace(/(<br>)+$/g, '')
    .replace(/^(<br>)+/g, ''));
}

function stripRichTextMarkupForPlainPaste(value: string): string {
  return value
    .replace(/\{\s*color\s*:\s*#[0-9a-f]{3,8}\s*\}/gi, '')
    .replace(/\{\s*\/\s*color\s*\}/gi, '')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(^|[^\w*])_([^_\n]+)_(?!\w)/g, '$1$2');
}

function clipboardPayloadToPlainText(text: string, html: string): string {
  const structuredListText = html && htmlAppearsToContainLists(html)
    ? clipboardHtmlToListAwareText(html)
    : '';
  const markerPreservedListText = structuredListText
    ? applySourceBulletMarkers(structuredListText, text)
    : '';
  const raw = markerPreservedListText || text || (html ? clipboardHtmlToPlainText(html) : '');
  return normalizePastedListArtifacts(
    stripRichTextMarkupForPlainPaste(raw)
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' '),
  );
}

function clipboardPayloadToRichEditorHtml(text: string, html: string): string {
  if (html) {
    const editorHtml = clipboardHtmlToEditorHtml(html);
    const listAwareText = htmlAppearsToContainLists(html) ? clipboardHtmlToListAwareText(html) : '';
    const markerPreservedListText = listAwareText
      ? applySourceBulletMarkers(listAwareText, text)
      : '';

    if (markerPreservedListText && plainTextHasListMarkers(markerPreservedListText)) {
      return sanitizePastedEditorHtmlForTheme(
        markdownTextToEditorHtml(markerPreservedListText),
      );
    }

    if (
      shouldUsePlainTextListLayout(text, editorHtml)
      || shouldPreferPlainTextLayout(text, editorHtml)
    ) {
      return sanitizePastedEditorHtmlForTheme(
        markdownTextToEditorHtml(text),
      );
    }

    if (editorHtml.trim()) {
      return sanitizePastedEditorHtmlForTheme(editorHtml);
    }
  }

  const sourceText = html && htmlAppearsToContainLists(html) && !plainTextHasListMarkers(text)
    ? clipboardHtmlToListAwareText(html)
    : text;
  const normalizedText = normalizeMessageMarkdownText(sourceText || '');
  const editorHtml = hasMarkdownSyntax(normalizedText)
    ? markdownTextToEditorHtml(normalizedText)
    : escapeHtmlText(normalizedText).replace(/\n/g, '<br>');

  return sanitizePastedEditorHtmlForTheme(editorHtml);
}

function hasMarkdownSyntax(text: string): boolean {
  return /\*\*[\s\S]+?\*\*|__[^_\n]+__|~~[^~\n]+~~|^\s*[-*+\u2022\u00b7\u2023\u2043\u25e6\u25aa\u25ab\u25cf\u25cb\u2013\u2014]\s+\S|^\s*\d+\.\s+\S|^\s*>\s?\S|\{color:#[0-9a-fA-F]{6}\}/m.test(text);
}

function markdownTextToEditorHtml(text: string): string {
  const source = canonicalizeColorMarkup(
    normalizeMessageMarkdownText(text).replace(/\r\n?/g, '\n'),
  );
  const lines = source.split('\n');
  let activeColor: string | null = null;

  const depthFromIndent = (indent: string, marker?: string): number => {
    const expanded = indent.replace(/\t/g, '    ').length;
    const indentDepth = expanded === 0 ? 0 : expanded <= 4 ? 1 : Math.ceil(expanded / 4);
    const markerDepth = marker ? Math.max(0, SS4_BULLET_GLYPHS.indexOf(marker)) : 0;
    return Math.max(indentDepth, markerDepth);
  };

  const applyInlineMarkdown = (value: string): string =>
    escapeHtmlText(value)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');

  const renderColoredInline = (value: string): string => {
    const colorTag = /\{color:(#[0-9a-fA-F]{3,8})\}|\{\/color\}/g;
    let result = activeColor ? `<span style="color:${activeColor}">` : '';
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = colorTag.exec(value)) !== null) {
      result += applyInlineMarkdown(value.slice(cursor, match.index));

      if (match[1]) {
        if (activeColor) result += '</span>';
        activeColor = match[1].toLowerCase();
        result += `<span style="color:${activeColor}">`;
      } else if (activeColor) {
        result += '</span>';
        activeColor = null;
      }

      cursor = match.index + match[0].length;
    }

    result += applyInlineMarkdown(value.slice(cursor));
    if (activeColor) result += '</span>';
    return result;
  };

  return lines.map(line => {
    let marker = '';
    let rest = line;
    const bulletMatch = line.match(SS4_SOURCE_BULLET_RE);
    const numberedMatch = !bulletMatch && line.match(/^([ \t]*)(\d+)\.\s+(.+)$/);
    const quoteMatch = !bulletMatch && !numberedMatch && line.match(/^\s*>\s?(.*)$/);

    if (bulletMatch) {
      const depth = depthFromIndent(bulletMatch[1], bulletMatch[2]);
      marker = `${'&nbsp;'.repeat(depth * SS4_LIST_INDENT_STEP.length)}${escapeHtmlText(bulletMatch[2])} `;
      rest = bulletMatch[3];
    } else if (numberedMatch) {
      const depth = depthFromIndent(numberedMatch[1]);
      marker = `${'&nbsp;'.repeat(depth * SS4_LIST_INDENT_STEP.length)}${numberedMatch[2]}. `;
      rest = numberedMatch[3];
    } else if (quoteMatch) {
      rest = quoteMatch[1];
    }

    const rendered = renderColoredInline(rest) || '<br>';
    if (quoteMatch) return `<blockquote>${rendered}</blockquote>`;
    return `<div>${marker}${rendered}</div>`;
  }).join('');
}

function normalizeMultilineMarkdownBlocks(text: string): string {
  return text.replace(/\*\*([\s\S]*?)\*\*/g, (_match, inner: string) =>
    inner.split('\n').map(line => line ? `**${line}**` : '').join('\n')
  );
}

const STRUCTURED_LEAD_LABEL_PATTERN = '(?:Age|Lead|Original Cost|Retail Price|Maxoffer|Profit)';

function normalizeCopiedMarkdownArtifacts(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cleaned: string[] = [];
  let pendingColor: string | null = null;
  let pendingBold = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const colorStart = trimmed.match(/^\{color:(#[0-9a-fA-F]{6})\}\s*(?:\*\*)?$/);
    if (colorStart) {
      pendingColor = colorStart[1];
      pendingBold = /\*\*$/.test(trimmed);
      continue;
    }

    if (pendingColor) {
      const colorEnd = line.match(/^(.*?)\s*(?:\*\*)?\s*\{\/color\}\s*$/);
      const content = (colorEnd?.[1] ?? line).replace(/\*\*/g, '').trimEnd();
      if (content) {
        const colored = `{color:${pendingColor}}${content}{/color}`;
        cleaned.push(pendingBold ? `**${colored}**` : colored);
      }
      if (colorEnd) pendingColor = null;
      if (colorEnd) pendingBold = false;
      continue;
    }

    if (/^(?:\*\*|__|~~)$/.test(trimmed)) {
      pendingBold = trimmed === '**';
      continue;
    }

    if (pendingBold) {
      if (!trimmed) continue;
      const content = line.replace(/\*\*/g, '').trimEnd();
      if (content) cleaned.push(`**${content}**`);
      pendingBold = false;
      continue;
    }

    if (/\*\*\s*$/.test(line) && !/^\s*\*\*/.test(line)) {
      const content = line.replace(/\*\*\s*$/, '').trimEnd();
      cleaned.push(new RegExp(`^\\s*${STRUCTURED_LEAD_LABEL_PATTERN}:`).test(content) ? `**${content}**` : content);
      continue;
    }

    cleaned.push(line);
  }

  return cleaned
    .join('\n')
    .split('\n')
    .map(line => {
      if (!line.trim()) return line;
      const hasValidBold = /\*\*[^*\n]+\*\*/.test(line);
      if (hasValidBold) return line.replace(/\*{4,}/g, '**');
      return line.replace(/\*\*/g, '');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizeStructuredLeadLayout(text: string): string {
  const labelMatches = text.match(new RegExp(`\\b${STRUCTURED_LEAD_LABEL_PATTERN}:`, 'g')) || [];
  if (labelMatches.length < 3) return text;
  const decoratedLabel = `(?:\\*\\*)?(?:\\{color:#[0-9a-fA-F]{6}\\})?${STRUCTURED_LEAD_LABEL_PATTERN}:`;

  return text
    .replace(/\r\n/g, '\n')
    .replace(new RegExp(`([^\\n])((?:\\*\\*|__|~~|\`|\\{/color\\})+)(?=${STRUCTURED_LEAD_LABEL_PATTERN}:)`, 'g'), '$1$2\n')
    .replace(new RegExp(`(?<!\\n\\*)([^\\n}])(?=${STRUCTURED_LEAD_LABEL_PATTERN}:)`, 'g'), '$1\n')
    .replace(new RegExp(`\\n\\s*\\n+(?=${decoratedLabel})`, 'g'), '\n')
    .replace(/\n\s*\n+/g, '\n')
    .replace(new RegExp(`\\n(?=(?:\\*\\*)?(?:\\{color:#[0-9a-fA-F]{6}\\})?(?:Maxoffer|Profit):)`, 'g'), '\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizeFinalMessageMarkup(text: string): string {
  return text
    .replace(/\{color:(#[0-9a-fA-F]{6})\}\s*(?:\*\*)?\s*\n+\s*([^\n{}]+?)\s*(?:\*\*)?\s*\{\/color\}/g, '{color:$1}$2{/color}')
    .replace(/\{color:(#[0-9a-fA-F]{6})\}\s*\*\*([^{}\n]+?)\*\*\s*\{\/color\}/g, '**{color:$1}$2{/color}**')
    .split('\n')
    .map(line => {
      if (/^\s*(?:\*\*|__|~~)\s*$/.test(line)) return '';
      if (/\*\*\s*$/.test(line) && !/^\s*\*\*/.test(line)) {
        return `**${line.replace(/\*\*\s*$/, '').trimEnd()}**`;
      }
      return line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizePastedListArtifacts(text: string): string {
  const normalizedText = stripListMarkerNoise(text.replace(/•/g, '\u2022'));
  const marker = String.raw`(?:[-*+\u2022\u00b7\u2023\u25e6\u25cf\u25cb\u25aa\u25ab\u2013\u2014])`;
  const markerOnlyRe = new RegExp(String.raw`^\s*${marker}\s*$`);
  const realListItemRe = new RegExp(String.raw`^\s*${marker}\s+\S`);
  const cleanLine = (line: string) => stripListMarkerNoise(line);
  const trimLineStart = (line: string) => stripListMarkerNoise(line).replace(/^[\s\u200b-\u200d\ufeff]+/, '');
  const isMarkerOnly = (line: string) => {
    const clean = cleanLine(line).trim();
    return markerOnlyRe.test(clean) || ['\u2022', '\u00b7', '\u2023', '\u2043', '\u25aa', '\u25ab', '\u25cf', '\u25cb', '-', '*', '+', '\u2013', '\u2014'].includes(clean);
  };
  const isRealListItem = (line: string) => realListItemRe.test(cleanLine(line)) || /^[\s]*[\u2022\u00b7\u2023\u2043\u25aa\u25ab\u25cf\u25cb\-*+\u2013\u2014]\s+\S/.test(cleanLine(line));
  const lines = normalizedText.replace(/\r\n?/g, '\n').split('\n');
  const hasRealListItem = lines.some(line => isRealListItem(line));
  const hasMarkerOnly = lines.some(line => isMarkerOnly(line));
  if (!hasRealListItem && !hasMarkerOnly) return text;

  const cleaned: string[] = [];
  let pendingBullet: string | null = null;

  for (const line of lines) {
    if (isMarkerOnly(line)) {
      pendingBullet = cleanLine(line).trim();
      continue;
    }

    if (pendingBullet) {
      if (!line.trim()) {
        continue;
      }

      cleaned.push(isRealListItem(line) ? trimLineStart(line) : `${pendingBullet} ${trimLineStart(line)}`);
      pendingBullet = null;
      continue;
    }

    cleaned.push(cleanLine(line));
  }

  return cleaned
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function normalizeMessageMarkdownText(text: string): string {
  return normalizeListExitLineSpacing(
    normalizePastedListArtifacts(
      text
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' '),
    ),
  ).trim();
}

function hasSplitListMarkerLines(text: string): boolean {
  const markerOnlyRe = /^[\s\u200b-\u200d\ufeff]*[\u2022\u00b7\u2023\u2043\u25aa\u25ab\u25cf\u25cb\-*+\u2013\u2014][\s\u200b-\u200d\ufeff]*$/;
  const lines = stripListMarkerNoise(text).replace(/\r\n?/g, '\n').split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    if (!markerOnlyRe.test(lines[index])) continue;
    const nextTextLine = lines.slice(index + 1).find(line => line.trim());
    if (nextTextLine) return true;
  }

  return false;
}

function moveContentEditableCaretToEnd(el: HTMLElement): void {
  const selection = window.getSelection?.();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function normalizeContentEditableListArtifacts(el: HTMLElement | null): boolean {
  if (!el) return false;
  const currentText = el.innerText.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  if (!hasSplitListMarkerLines(currentText)) return false;

  const normalizedText = normalizeMessageMarkdownText(currentText);
  if (!normalizedText || normalizedText === currentText.trim()) return false;

  el.innerHTML = markdownTextToEditorHtml(normalizedText);
  moveContentEditableCaretToEnd(el);
  return true;
}

function normalizeMessageMarkdownForDisplay(text: string): string {
  return normalizeMultilineMarkdownBlocks(normalizeMessageMarkdownText(text))
    .replace(/\{color:(#[0-9a-fA-F]{6})\}\s*\*\*([\s\S]*?)\*\*\s*\{\/color\}/g, '**{color:$1}$2{/color}**')
    .replace(/(^|\n)\s*(?:\*\*|__|~~)\s*\n([^\n]+?)\s*(?:\*\*|__|~~)(?=\n|$)/g, (_m, prefix: string, line: string) => `${prefix}**${line.trimEnd()}**`)
    .replace(/(^|\n)\s*(?:\*\*|__|~~)\s*(?=\n|$)/g, '$1')
    .replace(/\n{4,}/g, '\n\n\n');
}

function messagePreviewText(content?: string | null): string {
  if (!content) return '';
  return normalizeMessageMarkdownForDisplay(content)
    .replace(/\{\s*color\s*:\s*#[0-9a-f]{3,8}\s*\}/gi, '')
    .replace(/\{\s*\/\s*color\s*\}/gi, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(^|[^\w*])_([^_\n]+)_(?!\w)/g, '$1$2')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isNearWhiteHexColor(color?: string): boolean {
  const raw = color?.trim().replace(/^#/, '');
  if (!raw || (raw.length !== 3 && raw.length !== 6 && raw.length !== 8)) return false;
  const expanded = raw.length === 3
    ? raw.split('').map(ch => ch + ch).join('')
    : raw.slice(0, 6);
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) && r >= 238 && g >= 238 && b >= 238;
}

function renderMessageContent(content: string, isOwn: boolean): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let index = 0;

    const pushPlain = (plain: string) => {
      if (!plain) return;
      plain = plain.replace(/\{\s*\/?\s*color(?:\s*:\s*#[0-9a-f]{3,8})?\s*\}/gi, '');
      const tokenPattern = /(https?:\/\/[^\s]+|[@#]\w+(?:\s[A-Z][a-zA-Z]*)?)/gi;
      let last = 0;
      let match: RegExpExecArray | null;
      while ((match = tokenPattern.exec(plain)) !== null) {
        if (match.index > last) nodes.push(plain.slice(last, match.index));
        const token = match[0];
        const key = `${keyPrefix}-plain-${index++}`;
        if (/^https?:\/\//i.test(token)) {
          const trailing = token.match(/[),.!?]+$/)?.[0] || '';
          const href = trailing ? token.slice(0, -trailing.length) : token;
          nodes.push(
            <React.Fragment key={key}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: isOwn ? '#fff' : 'var(--accent-text)', wordBreak: 'break-all' }}>{href}</a>
              {trailing}
            </React.Fragment>
          );
        } else {
          nodes.push(isOwn
            ? <span key={key} className="font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>{token}</span>
            : <span key={key} className="font-bold" style={{ color: 'var(--accent-text)' }}>{token}</span>
          );
        }
        last = match.index + token.length;
      }
      if (last < plain.length) nodes.push(plain.slice(last));
    };

    const findNextToken = (from: number) => {
      const candidates: Array<{ start: number; end: number; type: 'color' | 'bold' | 'strike' | 'underline' | 'italic' | 'code' | 'link'; color?: string; contentStart?: number; contentEnd?: number; linkText?: string; linkHref?: string }> = [];
      const linkRe = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
      linkRe.lastIndex = from;
      const linkMatch = linkRe.exec(text);
      if (linkMatch) {
        candidates.push({
          start: linkMatch.index, end: linkMatch.index + linkMatch[0].length,
          type: 'link', linkText: linkMatch[1], linkHref: linkMatch[2],
        });
      }
      const colorRe = /\{\s*color\s*:\s*(#[0-9a-f]{3,8})\s*\}/gi;
      colorRe.lastIndex = from;
      const colorStart = colorRe.exec(text);
      if (colorStart) {
        const closeRe = /\{\s*\/\s*color\s*\}/gi;
        closeRe.lastIndex = colorStart.index + colorStart[0].length;
        const close = closeRe.exec(text);
        if (close) candidates.push({
          start: colorStart.index,
          end: close.index + close[0].length,
          type: 'color',
          color: colorStart[1],
          contentStart: colorStart.index + colorStart[0].length,
          contentEnd: close.index,
        });
      }
      const markerDefs: Array<[string, 'bold' | 'strike' | 'underline' | 'code']> = [['**', 'bold'], ['~~', 'strike'], ['__', 'underline'], ['`', 'code']];
      markerDefs.forEach(([marker, type]) => {
        const start = text.indexOf(marker, from);
        if (start < 0) return;
        const end = text.indexOf(marker, start + marker.length);
        if (end > start + marker.length) candidates.push({ start, end: end + marker.length, type });
      });
      const italicRe = /(^|[^\w*])_([^_\n]+)_(?!\w)/g;
      italicRe.lastIndex = from;
      const italicMatch = italicRe.exec(text);
      if (italicMatch) {
        const markerOffset = italicMatch[1].length;
        candidates.push({ start: italicMatch.index + markerOffset, end: italicMatch.index + italicMatch[0].length, type: 'italic' });
      }
      return candidates.sort((a, b) => a.start - b.start || a.end - b.end)[0] || null;
    };

    while (cursor < text.length) {
      const token = findNextToken(cursor);
      if (!token) {
        pushPlain(text.slice(cursor));
        break;
      }
      if (token.start > cursor) pushPlain(text.slice(cursor, token.start));
      const key = `${keyPrefix}-fmt-${index++}`;
      if (token.type === 'color') {
        const inner = text.slice(token.contentStart, token.contentEnd);
        nodes.push(
          <span key={key} className={!isOwn && isNearWhiteHexColor(token.color) ? 'ss4-readable-light-color' : undefined} style={{ color: token.color }}>
            {renderInline(inner, key)}
          </span>
        );
      } else if (token.type === 'bold') {
        nodes.push(<strong key={key}>{renderInline(text.slice(token.start + 2, token.end - 2), key)}</strong>);
      } else if (token.type === 'strike') {
        nodes.push(<s key={key}>{renderInline(text.slice(token.start + 2, token.end - 2), key)}</s>);
      } else if (token.type === 'underline') {
        nodes.push(<u key={key}>{renderInline(text.slice(token.start + 2, token.end - 2), key)}</u>);
      } else if (token.type === 'italic') {
        nodes.push(<em key={key}>{renderInline(text.slice(token.start + 1, token.end - 1), key)}</em>);
      } else if (token.type === 'link') {
        nodes.push(
          <a key={key} href={token.linkHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: isOwn ? '#fff' : 'var(--accent-text)', wordBreak: 'break-all' }}>
            {renderInline(token.linkText || '', key)}
          </a>
        );
      } else {
        nodes.push(<code key={key} style={{ fontFamily: 'monospace', fontSize: '0.85em', background: 'rgba(128,128,128,0.15)', padding: '1px 4px', borderRadius: 3 }}>{text.slice(token.start + 1, token.end - 1)}</code>);
      }
      cursor = token.end;
    }

    return nodes;
  };

  const normalized = normalizeMessageMarkdownForDisplay(content);
  const rawLines = normalized.split('\n');

  // Block-level syntax the composer's toolbar and rich-paste conversion produce.
  // Nested bullets use two-space indentation and cycle through •, ◦, and ▪.
  const BULLET_RE = /^([ \t]*)([\-*+•·‣⁃◦▪▫●○■□◆◇–—✓✔☑→➤»›]{1,4})\s+(.+)$/u;
  const NUMBERED_RE = /^(\s*)(\d+)\.\s+(.+)$/;
  const QUOTE_RE = /^>\s?(.*)$/;
  const FENCE_RE = /^```/;

  let blockIdx = 0;
  let lineIndex = 0;
  let hasRenderedContent = false;
  let hasPendingBlankLine = false;

  const addSeparation = (kind: 'line' | 'block') => {
    if (!hasRenderedContent) {
      hasPendingBlankLine = false;
      return;
    }

    if (hasPendingBlankLine) {
      result.push(
        <span
          key={`gap-${blockIdx++}`}
          aria-hidden="true"
          style={{ display: 'block', height: '0.5em' }}
        />
      );
    } else if (kind === 'line') {
      result.push(<br key={`br-${blockIdx++}`} />);
    } else {
      result.push(
        <span
          key={`block-gap-${blockIdx++}`}
          aria-hidden="true"
          style={{ display: 'block', height: '0.16em' }}
        />
      );
    }

    hasPendingBlankLine = false;
  };

  while (lineIndex < rawLines.length) {
    const raw = rawLines[lineIndex];

    if (!raw.trim()) {
      hasPendingBlankLine = hasRenderedContent;
      lineIndex++;
      continue;
    }
    if (/^\s*(?:\*\*|__|~~)\s*$/.test(raw)) {
      lineIndex++;
      continue;
    }

    if (FENCE_RE.test(raw)) {
      const codeLines: string[] = [];
      lineIndex++;
      while (lineIndex < rawLines.length && !FENCE_RE.test(rawLines[lineIndex])) {
        codeLines.push(rawLines[lineIndex]);
        lineIndex++;
      }
      if (lineIndex < rawLines.length) lineIndex++;
      addSeparation('block');
      result.push(<pre key={`code-${blockIdx++}`} className="ss4-codeblock"><code>{codeLines.join('\n')}</code></pre>);
      hasRenderedContent = true;
      continue;
    }

    const bulletMatch = raw.match(BULLET_RE);
    if (bulletMatch) {
      const items: Array<{ depth: number; marker: string; text: string }> = [];
      while (lineIndex < rawLines.length) {
        const match = rawLines[lineIndex].match(BULLET_RE);
        if (!match) break;
        const indentDepth = Math.round(match[1].replace(/\t/g, '    ').length / 2);
        const markerDepth = Math.max(0, SS4_BULLET_GLYPHS.indexOf(match[2]));
        items.push({
          depth: Math.max(indentDepth, markerDepth),
          marker: match[2],
          text: match[3],
        });
        lineIndex++;
      }

      addSeparation('block');
      result.push(
        <ul key={`ul-${blockIdx++}`} className="ss4-list">
          {items.map((item, index) => (
            <li key={index} style={{ marginLeft: `${item.depth * 1.1}em` }} className="ss4-list-item">
              <span className="ss4-list-marker">{item.marker}</span>
              <span>{renderInline(item.text, `bullet-${blockIdx}-${index}`)}</span>
            </li>
          ))}
        </ul>
      );
      hasRenderedContent = true;
      continue;
    }

    const numberedMatch = raw.match(NUMBERED_RE);
    if (numberedMatch) {
      const items: Array<{ depth: number; number: string; text: string }> = [];
      while (lineIndex < rawLines.length) {
        const match = rawLines[lineIndex].match(NUMBERED_RE);
        if (!match) break;
        items.push({
          depth: Math.round(match[1].replace(/\t/g, '    ').length / 2),
          number: match[2],
          text: match[3],
        });
        lineIndex++;
      }

      addSeparation('block');
      result.push(
        <ol key={`ol-${blockIdx++}`} className="ss4-list">
          {items.map((item, index) => (
            <li key={index} style={{ marginLeft: `${item.depth * 1.1}em` }} className="ss4-list-item">
              <span className="ss4-list-marker ss4-list-marker-num">{item.number}.</span>
              <span>{renderInline(item.text, `number-${blockIdx}-${index}`)}</span>
            </li>
          ))}
        </ol>
      );
      hasRenderedContent = true;
      continue;
    }

    const quoteMatch = raw.match(QUOTE_RE);
    if (quoteMatch) {
      const quoteLines: string[] = [];
      while (lineIndex < rawLines.length) {
        const match = rawLines[lineIndex].match(QUOTE_RE);
        if (!match) break;
        quoteLines.push(match[1]);
        lineIndex++;
      }

      addSeparation('block');
      result.push(
        <blockquote key={`quote-${blockIdx++}`} className="ss4-blockquote">
          {quoteLines.map((line, index) => (
            <React.Fragment key={index}>
              {index > 0 && <br />}
              {renderInline(line, `quote-${blockIdx}-${index}`)}
            </React.Fragment>
          ))}
        </blockquote>
      );
      hasRenderedContent = true;
      continue;
    }

    const renderLine = (() => {
      if (/\*\*\s*$/.test(raw) && !/^\s*\*\*/.test(raw)) return `**${raw.replace(/\*\*\s*$/, '').trimEnd()}**`;
      if (/^\s*\*\*/.test(raw) && !/\*\*.*\*\*/.test(raw)) return `**${raw.replace(/^\s*\*\*/, '').trimStart()}**`;
      return raw;
    })();

    addSeparation('line');
    result.push(...renderInline(renderLine, `line-${blockIdx++}`));
    hasRenderedContent = true;
    lineIndex++;
  }

  return result;
}
const SS4_AI_CREDIT_MESSAGE = 'Low Suprah Autrix credits \u2014 contact admin to upgrade.';

function sanitizeUserFacingErrorMessage(message: unknown, fallback: string) {
  const value = typeof message === 'string'
    ? message
    : message && typeof message === 'object'
      ? JSON.stringify(message)
      : '';

  if (!value.trim()) return fallback;

  if (/credit balance|plans? & billing|billing|upgrade|purchase credits|anthropic api/i.test(value)) {
    return SS4_AI_CREDIT_MESSAGE;
  }

  if (/invalid_request_error|request_id|status code|no body/i.test(value)) {
    return fallback;
  }

  return value;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null) {
    const response = (error as { response?: { data?: { message?: unknown } | unknown } }).response;
    const data = response?.data;
    const message = data && typeof data === 'object' && 'message' in data
      ? (data as { message?: unknown }).message
      : data;
    const sanitized = sanitizeUserFacingErrorMessage(message, fallback);
    if (sanitized) return sanitized;
  }
  if (error instanceof Error && error.message.trim()) {
    return sanitizeUserFacingErrorMessage(error.message, fallback);
  }
  return fallback;
}
const isVideoFileLike = (file: Pick<File, 'name' | 'type'>) => {
  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
  return file.type.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(extension);
};
const isVideoAttachment = (attachment: SSMessage['attachments'][number]) => {
  const extension = attachment.originalName.includes('.') ? attachment.originalName.slice(attachment.originalName.lastIndexOf('.')).toLowerCase() : '';
  return attachment.mimeType.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(extension);
};
const safeMembers = (c: SSConversation) => (c.members || []).filter(Boolean);
const getConvName = (c: SSConversation, uid: string) => {
  if (c.type === 'group') return c.name || 'Group';
  const other = safeMembers(c).find(m => m._id !== uid);
  return other?.fullName || other?.username || 'Unknown';
};
const getConvAvatar = (c: SSConversation, uid: string) =>
  c.type === 'group' ? c.avatar : safeMembers(c).find(m => m._id !== uid)?.avatar;
const getConvEmoji = (c: SSConversation) => c.type === 'group' ? (c.emoji || null) : null;

const avaColors = ['ss4-ava-accent', 'ss4-ava-purple', 'ss4-ava-teal'];
const getAvaColor = (name: string) => avaColors[(name || 'x').charCodeAt(0) % avaColors.length];

function GroupAvatarFace({ src, name, size = 13 }: { src?: string | null; name: string; size?: number }) {
  const resolved = resolveImageUrl(src);
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => { setBroken(false); }, [resolved]);
  if (resolved && !broken) {
    return <img src={resolved} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />;
  }
  return <span className="text-white font-bold" style={{ fontSize: size }}>{(name || '?').trim().charAt(0).toUpperCase() || '#'}</span>;
}

function ChannelFace({ conv, name, avatar, size = 13 }: { conv: SSConversation; name: string; avatar?: string | null; size?: number }) {
  const emoji = getConvEmoji(conv);
  if (emoji) return <span style={{ fontSize: size + 4, lineHeight: 1 }}>{emoji}</span>;
  return <GroupAvatarFace src={avatar} name={name} size={size} />;
}

interface CrmUser { _id: string; fullName: string; username: string; email?: string; avatar?: string; role: string }
type ConversationFilter = 'all' | 'unread' | 'read' | 'mentions';
const CONVERSATION_FILTERS: Array<{ key: ConversationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'mentions', label: 'Mentions' },
];
interface MeetingJoinRequestedPayload {
  meetingId?: string;
  requester?: { userId?: string; name?: string; email?: string };
}
interface MeetingAdmissionUpdatedPayload {
  meetingId?: string;
  status?: 'pending' | 'approved' | 'denied';
}
interface PendingMeetingDraft {
  title: string;
  scheduledAt: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionAliasesForUser(fullName?: string | null, username?: string | null): string[] {
  const aliases = new Set<string>();
  const name = (fullName || '').trim();
  const user = (username || '').trim().replace(/^@/, '');
  const parts = name.split(/\s+/).filter(Boolean);
  if (name) aliases.add(name);
  if (parts[0]) aliases.add(parts[0]);
  if (parts.length >= 2) aliases.add(`${parts[0]} ${parts[parts.length - 1]}`);
  if (user) aliases.add(user);
  return [...aliases].filter(Boolean);
}

function contentMentionsUser(content: string | null | undefined, fullName?: string | null, username?: string | null): boolean {
  if (!content) return false;
  if (/(^|[^\w])@all(?=$|[^\w])/i.test(content)) return true;
  return mentionAliasesForUser(fullName, username).some((alias) => {
    const normalizedAlias = escapeRegExp(alias).replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^\\w@])@${normalizedAlias}(?=$|[^\\w])`, 'i').test(content);
  });
}

function isConvUnreadForUser(conv: SSConversation, uid: string, manualUnread: Set<string>): boolean {
  if (manualUnread.has(conv._id)) return true;
  if ((conv.unreadCount || 0) > 0) return true;
  const msg = conv.lastMessage;
  return !!uid && !!msg && !msg.isDeleted && msg.sender?._id !== uid && !msg.readBy?.includes(uid);
}

function hasUnreadMentionForUser(
  conv: SSConversation,
  uid: string,
  fullName?: string | null,
  username?: string | null,
  cachedMessages?: SSMessage[],
): boolean {
  if (!uid) return false;
  if ((conv.unreadMentionCount || 0) > 0) return true;
  const candidates = cachedMessages?.length ? cachedMessages : (conv.lastMessage ? [conv.lastMessage as unknown as SSMessage] : []);
  return candidates.some((msg) =>
    !!msg &&
    !msg.isDeleted &&
    msg.sender?._id !== uid &&
    !msg.readBy?.includes(uid) &&
    contentMentionsUser(msg.content, fullName, username)
  );
}

function themeVars(theme?: SSConversation['theme']): React.CSSProperties {
  if (!theme?.accent) return {};
  const a = theme.accent;
  return {
    ['--accent' as any]: a,
    ['--accent-text' as any]: a,
    ['--accent-muted' as any]: `${a}26`,
    ['--bubble-own-bg' as any]: `linear-gradient(145deg, ${a}, ${a})`,
  };
}

function DateSep({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 my-3.5 sm:my-6 px-4 sm:px-5">
      <div className="flex-1 ss4-date-line" />
      <span className="ss4-date-chip">{fmtDate(date)}</span>
      <div className="flex-1 ss4-date-line" />
    </div>
  );
}

function VoicePlayer({ convId, msgId, duration, own }: { convId: string; msgId: string; duration?: number; own: boolean }) {
  const { getToken } = useAuth();
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [cur, setCur] = React.useState(0);
  const [audioErr, setAudioErr] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [voiceToken, setVoiceToken] = React.useState<string | null>(null);
  const total = duration || 0;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const proxySrc = `${API_BASE}/api/supraspace/conversations/${convId}/messages/${msgId}/voice`;

  React.useEffect(() => {
    let cancelled = false;
    getToken().then((freshToken) => {
      if (!cancelled) setVoiceToken(freshToken);
    }).catch(() => {
      if (!cancelled) setVoiceToken(null);
    });
    return () => { cancelled = true; };
  }, [getToken]);

  const handlePlay = React.useCallback(() => {
    const a = audioRef.current;
    if (!a || pending) return;
    if (playing) { a.pause(); return; }
    setPending(true);
    a.play()
      .then(() => setPending(false))
      .catch(() => { setPending(false); setAudioErr(true); });
  }, [playing, pending]);

  return (
    <div className={cn('ss4-voice-bar', own ? 'ss4-file-own' : 'ss4-file-other')} style={{ minWidth: 200, maxWidth: 280 }}>
      <button
        onClick={handlePlay}
        disabled={audioErr}
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
        style={{ background: own ? 'rgba(255,255,255,0.18)' : 'var(--accent-muted)', color: own ? '#fff' : 'var(--accent)' }}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        {audioErr ? (
          <p className="ss4-mono" style={{ fontSize: 10, color: 'var(--danger, #f87171)' }}>Unable to play audio</p>
        ) : (
          <>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: own ? 'rgba(255,255,255,0.2)' : 'var(--border-2)' }}>
              <div style={{ width: total ? `${Math.min(100, (cur / total) * 100)}%` : '0%', height: '100%', background: own ? '#fff' : 'var(--accent)', transition: 'width .1s linear' }} />
            </div>
            <p className="ss4-mono mt-1" style={{ fontSize: 10, color: own ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)' }}>
              {fmtDuration(cur)}{total ? ` / ${fmtDuration(total)}` : ''}
            </p>
          </>
        )}
      </div>
      <audio
        ref={audioRef}
        src={voiceToken ? `${proxySrc}?t=${encodeURIComponent(voiceToken)}` : ''}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={e => setCur((e.target as HTMLAudioElement).currentTime)}
        onError={() => setAudioErr(true)}
      />
    </div>
  );
}

function PollCard({ poll, uid, onVote }: { poll: NonNullable<SSMessage['poll']>; uid: string; onVote: (optionId: string) => void }) {
  const totalVotes = poll.options.reduce((n, o) => n + (o.votes?.length || 0), 0);
  return (
    <div className="ss4-card p-3.5" style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        <p className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{poll.question}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {poll.options.map(o => {
          const count = o.votes?.length || 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const mine = (o.votes || []).includes(uid);
          return (
            <button key={o.id} onClick={() => !poll.closed && onVote(o.id)} className="ss4-poll-opt text-left px-3 py-2"
              style={{ borderColor: mine ? 'var(--accent)' : 'var(--border-2)' }}>
              <div className="ss4-poll-fill" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: mine ? 700 : 500 }}>
                  {mine && <CheckIcon className="inline h-3 w-3 mr-1" style={{ color: 'var(--accent)' }} />}{o.text}
                </span>
                <span className="ss4-mono shrink-0" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}{poll.allowMultiple ? ' · multiple choice' : ''}{poll.closed ? ' · closed' : ''}
      </p>
    </div>
  );
}

function EventCard({ event, uid, onRsvp }: { event: NonNullable<SSMessage['event']>; uid: string; onRsvp: (r: 'going' | 'maybe' | 'declined') => void }) {
  const mine: 'going' | 'maybe' | 'declined' | null =
    (event.going || []).includes(uid) ? 'going' : (event.maybe || []).includes(uid) ? 'maybe' : (event.declined || []).includes(uid) ? 'declined' : null;
  const start = new Date(event.startTime);
  return (
    <div className="ss4-card overflow-hidden" style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="px-3.5 py-2.5" style={{ background: 'var(--accent-muted)', borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <p className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{event.title}</p>
        </div>
      </div>
      <div className="px-3.5 py-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {start.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: MDT_TZ })}
        </div>
        {event.location ? (
          <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" />{event.location}
          </div>
        ) : null}
        {event.description ? <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{event.description}</p> : null}
        <div className="flex items-center gap-1.5 mt-1">
          {(['going', 'maybe', 'declined'] as const).map(r => (
            <button key={r} onClick={() => onRsvp(r)}
              className="flex-1 h-7 rounded-lg capitalize transition-all"
              style={{
                fontSize: 11, fontWeight: 600,
                background: mine === r ? 'var(--accent)' : 'var(--bg-hover)',
                color: mine === r ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-2)'
              }}>
              {r} {(event as any)[r]?.length ? `· ${(event as any)[r].length}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetingCard({
  meeting,
  event,
  onJoin,
}: {
  meeting: NonNullable<NonNullable<SSMessage['metadata']>['meeting']>;
  event?: SSMessage['event'] | null;
  onJoin: (meetingId: string) => void;
}) {
  const start = meeting.scheduledAt || event?.startTime ? new Date(meeting.scheduledAt || event!.startTime) : null;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meetingLink);
      toast.success('Meeting link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="ss4-card overflow-hidden" style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="px-3.5 py-2.5" style={{ background: 'var(--accent-muted)', borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Video className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <p className="font-bold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{meeting.title || 'Video meeting'}</p>
        </div>
      </div>
      <div className="px-3.5 py-3 flex flex-col gap-2">
        {start && (
          <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{start.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: MDT_TZ })}</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-2)' }}>
          <Link2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="truncate ss4-mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{meeting.meetingLink}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onJoin(meeting.meetingId)} className="flex-1 h-8 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-1.5" style={{ fontSize: 12 }}>
            <Video className="h-3.5 w-3.5" /> Join
          </button>
          <button onClick={copyLink} className="h-8 w-8 ss4-icon-btn flex items-center justify-center" title="Copy meeting link">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
          @{meeting.allowedDomain || 'actionautoutah.com'} joins directly. Other domains need host approval.
        </p>
      </div>
    </div>
  );
}

function PendingMeetingPreview({ meeting, onRemove }: { meeting: PendingMeetingDraft; onRemove: () => void }) {
  const start = meeting.scheduledAt ? new Date(meeting.scheduledAt) : null;
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ width: 288, maxWidth: '100%', border: '1px solid rgba(46,127,255,0.55)', background: '#1f7ae8' }}>
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 h-5 w-5 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.35)', color: '#fff' }}
        title="Remove meeting"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="px-3.5 py-3 min-h-28 flex flex-col justify-between">
        <div>
          <p className="font-semibold leading-none" style={{ fontSize: 15, color: '#fff' }}>{meeting.title || 'Video meeting'}</p>
          <p className="mt-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)' }}>SupraSpace Meet</p>
          {start && (
            <p className="mt-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)' }}>
              {start.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: MDT_TZ })}
            </p>
          )}
        </div>
        <Video className="self-end h-12 w-12" style={{ color: 'rgba(255,255,255,0.72)' }} />
      </div>
      <div className="px-3.5 py-2.5 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.74)', color: '#fff' }}>
        <Video className="h-3.5 w-3.5 shrink-0" style={{ color: '#ffd84d' }} />
        <span className="font-semibold" style={{ fontSize: 12 }}>Join video meeting</span>
      </div>
    </div>
  );
}

async function copyImageToClipboard(url: string): Promise<void> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('proxy failed');
  const blob = await res.blob();
  let copyBlob: Blob = blob;
  if (blob.type !== 'image/png') {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.src = blobUrl;
    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 400;
    canvas.height = img.naturalHeight || 400;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    URL.revokeObjectURL(blobUrl);
    copyBlob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': copyBlob })]);
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'download';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function downloadMediaFile(url: string, filename: string): Promise<void> {
  const resolvedUrl = resolveImageUrl(url) || url;
  const fetchUrl = resolvedUrl.includes('.r2.cloudflarestorage.com')
    ? `/api/proxy-image?url=${encodeURIComponent(resolvedUrl)}`
    : resolvedUrl;

  const res = await fetch(fetchUrl, { cache: 'no-store', credentials: 'include' });
  if (!res.ok) throw new Error('download failed');
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

const clampLightboxZoom = (value: number) => Math.min(4, Math.max(1, Number(value.toFixed(2))));
const touchDistance = (touches: React.TouchList | TouchList) => {
  const [first, second] = [touches[0], touches[1]];
  if (!first || !second) return 0;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

function Bubble({
  message, isOwn, showAvatar, uid, onReply, onDelete, onPin, isPinned, onOpenMedia,
  onReact, onVotePoll, onRsvp, onJoinMeeting, nameFor, disableActions, suppressActionsDuringScroll, members = [], hideTime = false, onEditSave, onForward, defaultReactionEmoji,
}: {
  message: SSMessage; isOwn: boolean; showAvatar: boolean; uid: string;
  onReply: (m: SSMessage) => void; onDelete: (id: string) => void;
  onPin?: (id: string) => void; isPinned?: boolean;
  onOpenMedia?: (v: { src: string; type: 'image' | 'video'; name: string }) => void;
  onReact: (id: string, emoji: string) => void;
  onVotePoll: (id: string, optionId: string) => void;
  onRsvp: (id: string, r: 'going' | 'maybe' | 'declined') => void;
  onJoinMeeting: (meetingId: string) => void;
  nameFor: (id: string) => string;
  disableActions?: boolean;
  suppressActionsDuringScroll?: boolean;
  members?: Array<{ _id: string; fullName: string; avatar?: string }>;
  hideTime?: boolean;
  onEditSave?: (id: string, content: string, replacementFiles?: File[]) => Promise<void>;
  onForward?: (m: SSMessage) => void;
  defaultReactionEmoji?: string;
}) {
  const [hov, setHov] = React.useState(false);
  const [openReactPop, setOpenReactPop] = React.useState<string | null>(null);
  type PickerPosition = {
    top: number;
    left?: number;
    right?: number;
    boundary?: { top: number; right: number; bottom: number; left: number };
  };
  const [pickerPos, setPickerPos] = React.useState<PickerPosition | null>(null);
  const pickerPosRef = React.useRef<PickerPosition | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [mobileMenu, setMobileMenu] = React.useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);
  const [mobileEmojiSheetOpen, setMobileEmojiSheetOpen] = React.useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionHoverLockRef = React.useRef(false);
  const [editMode, setEditMode] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);
  const [editWidth, setEditWidth] = React.useState<number | null>(null);
  const editAreaRef = React.useRef<HTMLDivElement>(null);
  const editSelectionRangeRef = React.useRef<Range | null>(null);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const [editReplacementFiles, setEditReplacementFiles] = React.useState<File[]>([]);
  const [editTextColor, setEditTextColor] = React.useState('#ffffff');
  const [editTextPalette, setEditTextPalette] = React.useState(SS4_TEXT_COLORS);
  const [editColorPickerOpen, setEditColorPickerOpen] = React.useState(false);
  const [editPasteMode, setEditPasteMode] = React.useState<PasteMode>('formatted');
  const editPastePlainTextShortcutRef = React.useRef(false);
  const [editActiveFormats, setEditActiveFormats] = React.useState<Record<RichTextFormat, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    list: false,
    numbered: false,
    quote: false,
    code: false,
  });
  const [moreActionsOpen, setMoreActionsOpen_] = React.useState(false);
  const moreActionsOpenRef = React.useRef(false);
  const moreActionsRef = React.useRef<HTMLDivElement>(null);
  const setMoreActionsOpen = (value: boolean) => {
    moreActionsOpenRef.current = value;
    if (!value) actionHoverLockRef.current = false;
    setMoreActionsOpen_(value);
  };
  const [actionsBelow, setActionsBelow] = React.useState(false);
  const [dropdownFixedPos, setDropdownFixedPos] = React.useState<{ top?: number; bottom?: number; left?: number; right?: number; width?: number; maxHeight?: number } | null>(null);
  const dropdownPortalRef = React.useRef<HTMLDivElement>(null);
  const bubbleRowRef = React.useRef<HTMLDivElement>(null);
  const [mobileOverlayHost, setMobileOverlayHost] = React.useState<HTMLElement | null>(null);
  const [mobileReactionPos, setMobileReactionPos] = React.useState<{ top: number; left: number } | null>(null);
  const columnRef = React.useRef<HTMLDivElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const [actionBarPos, setActionBarPos] = React.useState<{ top: number; left: number } | null>(null);
  const swipeStartRef = React.useRef<{ x: number; y: number; active: boolean; direction: 1 | -1 } | null>(null);
  const touchMovedRef = React.useRef(false);
  const swipeOffsetRef = React.useRef(0);
  const swipeRafRef = React.useRef<number | null>(null);
  const swipeCueRef = React.useRef<HTMLDivElement>(null);
  const [swipeCueVisible, setSwipeCueVisible] = React.useState(false);
  const [swipeReplyReady, setSwipeReplyReady] = React.useState(false);
  const editableAttachmentCount = (message.attachments || []).filter(a => !a.mimeType?.startsWith('audio/')).length;
  const canEditMessage = isOwn && !!onEditSave && !['voice', 'poll', 'event'].includes(message.type) && (Boolean(message.content?.trim()) || editableAttachmentCount > 0);
  const hasEditChanges = editDraft.trim() !== (message.content || '').trim() || editReplacementFiles.length > 0;
  const canSaveEdit = !editSaving && Boolean(onEditSave) && (Boolean(editDraft.trim()) || editableAttachmentCount > 0 || editReplacementFiles.length > 0) && hasEditChanges;
  const getMobileOverlayHost = React.useCallback(() => {
    if (typeof document === 'undefined') return null;
    return bubbleRowRef.current?.closest<HTMLElement>('[data-supraspace-chat-boundary="true"]') || null;
  }, []);

  const openMobileActions = React.useCallback(() => {
    const host = getMobileOverlayHost();
    if (!host) return;
    const hostRect = host.getBoundingClientRect();
    const targetRect = (bubbleRef.current || bubbleRowRef.current)?.getBoundingClientRect();
    const stripWidth = 368;
    const stripHeight = 64;
    const left = targetRect
      ? Math.max(10, Math.min(hostRect.width - stripWidth - 10, targetRect.left - hostRect.left + targetRect.width / 2 - stripWidth / 2))
      : Math.max(10, (hostRect.width - stripWidth) / 2);
    const top = targetRect
      ? Math.max(10, Math.min(hostRect.height - stripHeight - 150, targetRect.top - hostRect.top - stripHeight - 8))
      : 88;
    window.getSelection?.()?.removeAllRanges();
    setMobileOverlayHost(host);
    setMobileReactionPos({ top, left });
    setHov(false);
    setMoreActionsOpen(false);
    setDropdownFixedPos(null);
    setMobileMoreOpen(false);
    setMobileEmojiSheetOpen(false);
    closePicker();
    setMobileMenu(true);
  }, [getMobileOverlayHost]);

  React.useEffect(() => {
    if ((!mobileMenu && !mobileMoreOpen && !mobileEmojiSheetOpen) || !mobileOverlayHost) return;

    const scrollEl = mobileOverlayHost.querySelector<HTMLElement>('[data-supraspace-message-scroll="true"]');
    const previousHostTouchAction = mobileOverlayHost.style.touchAction;
    const previousHostOverscroll = mobileOverlayHost.style.overscrollBehavior;
    const previousScrollOverflow = scrollEl?.style.overflowY;

    mobileOverlayHost.style.touchAction = 'none';
    mobileOverlayHost.style.overscrollBehavior = 'contain';
    if (scrollEl) scrollEl.style.overflowY = 'hidden';

    return () => {
      mobileOverlayHost.style.touchAction = previousHostTouchAction;
      mobileOverlayHost.style.overscrollBehavior = previousHostOverscroll;
      if (scrollEl) scrollEl.style.overflowY = previousScrollOverflow || '';
    };
  }, [mobileMenu, mobileMoreOpen, mobileEmojiSheetOpen, mobileOverlayHost]);


  React.useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (swipeRafRef.current !== null) cancelAnimationFrame(swipeRafRef.current);
  }, []);

  React.useEffect(() => {
    if (!moreActionsOpen) return;
    const h = (e: MouseEvent) => {
      const insideBtn = moreActionsRef.current?.contains(e.target as Node);
      const insidePortal = dropdownPortalRef.current?.contains(e.target as Node);
      if (!insideBtn && !insidePortal) {
        setMoreActionsOpen(false); setDropdownFixedPos(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreActionsOpen]);

  const enterEdit = () => {
    const measuredWidth = bubbleRef.current?.getBoundingClientRect().width || 0;
    const rowWidth = bubbleRowRef.current?.getBoundingClientRect().width
      || (typeof window !== 'undefined' ? window.innerWidth : 560);
    const maxResponsiveWidth = Math.max(280, Math.min(560, rowWidth - 72));
    setEditWidth(Math.min(Math.max(measuredWidth, 360), maxResponsiveWidth));
    setEditDraft(message.content || '');
    setEditReplacementFiles([]);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    setEditMode(true);
    setHov(false);
    requestAnimationFrame(() => {
      if (!editAreaRef.current) return;
      editAreaRef.current.innerHTML = markdownTextToEditorHtml(message.content || '');
      editAreaRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editAreaRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editSelectionRangeRef.current = range.cloneRange();
    });
  };
  const copyMessageText = async () => {
    const text = message.content?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy message');
    }
  };
  const syncEditDraft = React.useCallback(() => {
    const next = editAreaRef.current ? canonicalizeColorMarkup(htmlToMarkdown(editAreaRef.current)).trim() : '';
    setEditDraft(next);
    return next;
  }, []);

  const rememberEditSelection = React.useCallback(() => {
    const root = editAreaRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    editSelectionRangeRef.current = range.cloneRange();
  }, []);

  const restoreEditSelection = React.useCallback(() => {
    const root = editAreaRef.current;
    if (!root) return;

    root.focus();
    const selection = window.getSelection();
    if (!selection) return;

    const savedRange = editSelectionRangeRef.current;
    if (
      savedRange
      && root.contains(savedRange.startContainer)
      && root.contains(savedRange.endContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return;
    }

    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(root);
    fallbackRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallbackRange);
    editSelectionRangeRef.current = fallbackRange.cloneRange();
  }, []);

  const refreshEditActiveFormats = React.useCallback(() => {
    try {
      const root = editAreaRef.current;
      const selection = window.getSelection();
      const insideEdit = !!root && !!selection?.anchorNode && root.contains(selection.anchorNode);
      if (!insideEdit) return;
      const blockValue = String(document.queryCommandValue('formatBlock') || '')
        .toLowerCase()
        .replace(/[<>]/g, '');
      const fontValue = String(document.queryCommandValue('fontName') || '').toLowerCase();

      setEditActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        list: document.queryCommandState('insertUnorderedList'),
        numbered: document.queryCommandState('insertOrderedList'),
        quote: blockValue.includes('blockquote'),
        code: /(monospace|courier|consolas|menlo|monaco)/i.test(fontValue),
      });

      setEditTextColor(getActiveSelectionColor(root));
    } catch { }
  }, []);

  const focusEditComposer = React.useCallback(() => {
    editAreaRef.current?.focus();
  }, []);

  const applyEditFormat = React.useCallback((format: RichTextFormat) => {
    const root = editAreaRef.current;
    if (!root) return;

    root.focus();
    const nextRange = executeRichEditorCommandPreservingSelection(
      root,
      editSelectionRangeRef.current,
      () => {
        const commandMap: Partial<Record<RichTextFormat, string>> = {
          bold: 'bold',
          italic: 'italic',
          underline: 'underline',
          strike: 'strikeThrough',
          list: 'insertUnorderedList',
          numbered: 'insertOrderedList',
        };

        const command = commandMap[format];
        if (command) {
          document.execCommand(command, false);
        } else if (format === 'quote') {
          const currentBlock = String(document.queryCommandValue('formatBlock') || '')
            .toLowerCase()
            .replace(/[<>]/g, '');
          document.execCommand(
            'formatBlock',
            false,
            currentBlock.includes('blockquote') ? 'div' : 'blockquote',
          );
        } else if (format === 'code') {
          document.execCommand('styleWithCSS', false, 'true');
          const currentFont = String(document.queryCommandValue('fontName') || '').toLowerCase();
          const codeIsActive = /(monospace|courier|consolas|menlo|monaco)/i.test(currentFont);
          document.execCommand('fontName', false, codeIsActive ? 'Geist' : 'monospace');
        }
      },
      { normalizeListExit: format === 'list' || format === 'numbered' },
    );

    if (nextRange) editSelectionRangeRef.current = nextRange;
    syncEditDraft();
    requestAnimationFrame(refreshEditActiveFormats);
  }, [refreshEditActiveFormats, syncEditDraft]);

  const applyEditTextColor = React.useCallback((color: string) => {
    const root = editAreaRef.current;
    if (!root) return;

    root.focus();
    const nextRange = executeRichEditorCommandPreservingSelection(
      root,
      editSelectionRangeRef.current,
      () => {
        applyTextColorToRichEditorSelection(root, color);
      },
    );

    if (nextRange) editSelectionRangeRef.current = nextRange;
    setEditTextColor(color);
    syncEditDraft();
    requestAnimationFrame(refreshEditActiveFormats);
  }, [refreshEditActiveFormats, syncEditDraft]);

  const chooseExpandedEditTextColor = React.useCallback((color: string) => {
    setEditTextPalette(prev => {
      if (prev.includes(color)) return prev;
      const replaceIndex = prev.includes(editTextColor) ? prev.indexOf(editTextColor) : prev.length - 1;
      const next = [...prev];
      next[replaceIndex] = color;
      return next;
    });
    applyEditTextColor(color);
    setEditColorPickerOpen(false);
  }, [applyEditTextColor, editTextColor]);

  const handleEditColorBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const inputEvent = e.nativeEvent as InputEvent;
    if (editTextColor === '#ffffff' || inputEvent.inputType !== 'insertText' || !inputEvent.data) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, `<span style="color:${editTextColor}">${escapeHtmlText(inputEvent.data)}</span>`);
    syncEditDraft();
  };

  const cancelEdit = () => {
    editSelectionRangeRef.current = null;
    setEditMode(false);
    setEditDraft('');
    setEditWidth(null);
    setEditColorPickerOpen(false);
    setEditReplacementFiles([]);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };
  const saveEdit = async () => {
    const trimmed = syncEditDraft();
    if (!onEditSave) return;
    if (!trimmed && editableAttachmentCount === 0 && editReplacementFiles.length === 0) return;
    if (trimmed === (message.content || '').trim() && editReplacementFiles.length === 0) {
      cancelEdit();
      return;
    }
    setEditSaving(true);
    try {
      await onEditSave(message._id, trimmed, editReplacementFiles.length > 0 ? editReplacementFiles : undefined);
      cancelEdit();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update message. Please try again.'));
    } finally {
      setEditSaving(false);
    }
  };

  const editFormatButtonClass = (format: RichTextFormat) => cn(
    'h-9 w-9 flex items-center justify-center rounded-lg transition-colors',
    editActiveFormats[format] ? 'bg-white/15' : 'hover:bg-white/10'
  );
  const editFormatIconStyle = (format: RichTextFormat) => ({ color: editActiveFormats[format] ? 'var(--accent-text)' : 'currentColor' });

  const openPicker = (pos: PickerPosition) => {
    pickerPosRef.current = pos;
    setPickerPos(pos);
  };
  const closePicker = () => {
    pickerPosRef.current = null;
    setPickerPos(null);
  };
  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = (delay = 360) => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      if (
        !actionHoverLockRef.current
        && !pickerPosRef.current
        && !moreActionsOpenRef.current
      ) {
        setHov(false);
      }
    }, delay);
  };
  const holdActionHover = () => {
    actionHoverLockRef.current = true;
    cancelHide();
    setHov(true);
  };
  const releaseActionHover = () => {
    actionHoverLockRef.current = false;
    scheduleHide(280);
  };

  const positionActionBar = React.useCallback((mode: 'desktop' | 'mobile' = 'desktop') => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const isMobileMode = mode === 'mobile';
    const BAR_W = isMobileMode ? 262 : 175;
    const PAD = 8;
    const chatBoundary = bubbleRowRef.current
      ?.closest<HTMLElement>('[data-supraspace-chat-boundary="true"]')
      ?.getBoundingClientRect();
    const minLeft = Math.max(PAD, (chatBoundary?.left ?? 0) + PAD);
    const maxLeft = Math.min(window.innerWidth - BAR_W - PAD, (chatBoundary?.right ?? window.innerWidth) - BAR_W - PAD);
    const below = isMobileMode ? rect.top < 62 : rect.top < 120;
    const barLeft = isOwn
      ? Math.min(maxLeft, rect.left, rect.right - BAR_W)
      : Math.max(minLeft, rect.left, rect.right - BAR_W);
    setActionsBelow(below);
    setActionBarPos({
      top: below ? rect.bottom + (isMobileMode ? 8 : 4) : rect.top - (isMobileMode ? 48 : 36),
      left: Math.max(minLeft, Math.min(maxLeft, barLeft)),
    });
  }, [isOwn]);

  const showDesktopActions = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (suppressActionsDuringScroll) return;
    cancelHide();
    positionActionBar('desktop');
    setHov(true);
  }, [positionActionBar, suppressActionsDuringScroll]);

  const resetSwipeReply = React.useCallback(() => {
    swipeStartRef.current = null;
    touchMovedRef.current = false;
    swipeOffsetRef.current = 0;
    if (swipeRafRef.current !== null) {
      cancelAnimationFrame(swipeRafRef.current);
      swipeRafRef.current = null;
    }
    if (columnRef.current) {
      columnRef.current.style.transform = '';
      columnRef.current.style.transition = 'transform 180ms cubic-bezier(.2,.8,.2,1)';
    }
    if (swipeCueRef.current) {
      swipeCueRef.current.style.opacity = '0';
      swipeCueRef.current.style.transform = 'translateY(-50%) scale(0.92)';
    }
    setSwipeCueVisible(false);
    setSwipeReplyReady(false);
  }, []);

  const renderSwipeOffset = React.useCallback((offset: number, ready: boolean) => {
    swipeOffsetRef.current = offset;
    if (swipeRafRef.current !== null) return;
    swipeRafRef.current = requestAnimationFrame(() => {
      swipeRafRef.current = null;
      const currentOffset = swipeOffsetRef.current;
      if (columnRef.current) {
        columnRef.current.style.transition = 'none';
        columnRef.current.style.transform = currentOffset ? `translate3d(${currentOffset}px,0,0)` : '';
      }
      if (swipeCueRef.current) {
        const progress = Math.min(1, Math.abs(currentOffset) / 44);
        swipeCueRef.current.style.opacity = String(progress);
        swipeCueRef.current.style.transform = `translateY(-50%) scale(${ready ? 1.06 : 0.94 + progress * 0.08})`;
      }
    });
  }, []);

  const jumpToRepliedMessage = React.useCallback((replyTo: SSMessage['replyTo']) => {
    const targetId =
      typeof replyTo === 'string'
        ? replyTo
        : (replyTo as any)?._id || (replyTo as any)?.id;

    if (!targetId) return;

    const target = document.getElementById(`ss4-msg-${targetId}`);
    if (!target) {
      toast.info('Original message is not loaded yet. Scroll up to load older messages.');
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.animate(
      [
        { boxShadow: '0 0 0 0 rgba(91, 124, 246, 0)', transform: 'scale(1)' },
        { boxShadow: '0 0 0 4px rgba(91, 124, 246, 0.55), 0 0 28px rgba(91, 124, 246, 0.35)', transform: 'scale(1.01)' },
        { boxShadow: '0 0 0 0 rgba(91, 124, 246, 0)', transform: 'scale(1)' },
      ],
      { duration: 1400, easing: 'ease' },
    );
  }, []);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length !== 1) return;
    if ((event.target as HTMLElement | null)?.closest('a, button, textarea, input, [contenteditable="true"], .ss4-reaction-chip')) return;
    touchMovedRef.current = false;
    swipeStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      active: true,
      direction: isOwn ? -1 : 1,
    };
    if (columnRef.current) columnRef.current.style.transition = 'none';
    longPressTimer.current = setTimeout(() => {
      if (touchMovedRef.current || !swipeStartRef.current?.active) return;
      openMobileActions();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleMobileContextMenu = (event: React.MouseEvent) => {
    if (typeof window === 'undefined' || !window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    event.preventDefault();
    openMobileActions();
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    const start = swipeStartRef.current;
    if (!start || !start.active || event.touches.length !== 1) {
      handleTouchEnd();
      return;
    }

    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    const directionalDx = dx * start.direction;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > 8 || absDy > 8) {
      touchMovedRef.current = true;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }

    if (absDy > 10 && absDy > absDx) {
      resetSwipeReply();
      return;
    }

    if (directionalDx <= 10 || absDx <= absDy) {
      renderSwipeOffset(0, false);
      if (swipeCueVisible) setSwipeCueVisible(false);
      if (swipeReplyReady) setSwipeReplyReady(false);
      return;
    }

    event.preventDefault();
    const nextOffset = Math.min(78, Math.sqrt(directionalDx) * 8.8);
    const signedOffset = nextOffset * start.direction;
    const ready = directionalDx >= 58;
    if (!swipeCueVisible) setSwipeCueVisible(true);
    if (ready !== swipeReplyReady) setSwipeReplyReady(ready);
    renderSwipeOffset(signedOffset, ready);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    const start = swipeStartRef.current;
    if (start && Math.abs(swipeOffsetRef.current) >= 58) {
      onReply(message);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
    }
    resetSwipeReply();
  };

  const _nameParts = nameFor(uid).trim().split(/\s+/);
  const currentUserMention = (_nameParts.length >= 2
    ? `@${_nameParts[0]} ${_nameParts[_nameParts.length - 1]}`
    : `@${_nameParts[0]}`).toLowerCase();
  const currentUserFirstName = _nameParts[0].toLowerCase();
  const isMentioned = !isOwn && !!message.content && (
    message.content.includes('@all') ||
    message.content.toLowerCase().includes(currentUserMention) ||
    message.content.toLowerCase().includes(`@${currentUserFirstName}`)
  );

  React.useEffect(() => {
    if (!hov) return;
    const h = (e: MouseEvent) => {
      if (pickerPosRef.current) return;
      if (moreActionsOpenRef.current) return;
      if (dropdownPortalRef.current?.contains(e.target as Node)) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setHov(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [hov]);

  React.useEffect(() => {
    if (!suppressActionsDuringScroll) return;
    if (actionHoverLockRef.current || moreActionsOpenRef.current || pickerPosRef.current) return;
    setHov(false);
    setOpenReactPop(null);
    if (pickerPosRef.current) closePicker();
    if (moreActionsOpenRef.current) {
      setMoreActionsOpen(false);
      setDropdownFixedPos(null);
    }
  }, [suppressActionsDuringScroll]);

  if (message.isDeleted) {
    return (
      <div className={cn('flex gap-2 px-4 sm:gap-2.5 sm:px-5', isOwn && 'flex-row-reverse')}>
        <div className="w-7 sm:w-8 shrink-0" />
        <p className="text-xs italic py-1" style={{ color: 'var(--text-disabled)' }}>This message was deleted</p>
      </div>
    );
  }

  const aColor = getAvaColor(message.sender?.fullName || '');
  const voiceAtt = message.type === 'voice' ? message.attachments.find(a => a.mimeType.startsWith('audio/')) : null;
  const isLightTheme =
    typeof document !== 'undefined' &&
    bubbleRowRef.current?.closest<HTMLElement>('.ss4')?.dataset.theme === 'light';
  const actionSurface = isLightTheme ? '#ffffff' : '#1f232a';
  const actionSurfaceHover = isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.10)';
  const actionText = isLightTheme ? '#111827' : '#f8fafc';
  const actionBorder = isLightTheme ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.14)';

  return (
    <div ref={bubbleRowRef} className={cn('flex gap-2 px-4 sm:gap-2.5 sm:px-5 relative ss4-msg-enter ss4-mobile-no-select', isOwn && 'flex-row-reverse', isMentioned && 'ss4-mention-highlight')}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} onTouchMove={handleTouchMove} onContextMenu={handleMobileContextMenu}>
      {showAvatar ? (
        <div className={cn('h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 mt-0.5 flex items-center justify-center overflow-hidden', aColor)}>
          {message.sender?.avatar
            ? <img src={resolveImageUrl(message.sender.avatar)} alt="" className="w-full h-full object-cover" />
            : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(message.sender?.fullName || '')}</span>}
        </div>
      ) : <div className="w-7 sm:w-8 shrink-0" />}

      <div
        ref={columnRef}
        className={cn('ss4-msg-column flex flex-col gap-1 will-change-transform', isOwn && 'items-end')}
        style={{
          transition: 'transform 180ms cubic-bezier(.2,.8,.2,1)',
        }}
        onMouseEnter={showDesktopActions}
        onMouseLeave={() => scheduleHide()}
      >
        {swipeCueVisible && (
          <div
            ref={swipeCueRef}
            className={cn(
              'absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full md:hidden',
              isOwn ? 'right-10' : 'left-10',
            )}
            style={{
              background: swipeReplyReady ? 'var(--accent)' : 'var(--surface-3)',
              color: swipeReplyReady ? '#fff' : 'var(--text-secondary)',
              opacity: 0,
              transform: 'translateY(-50%) scale(0.92)',
              transition: 'background-color 120ms ease, color 120ms ease',
              boxShadow: 'var(--shadow-md)',
            }}
            aria-hidden="true"
          >
            <Reply className="h-4 w-4" />
          </div>
        )}
        {showAvatar && !isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="ss4-msg-sender font-semibold" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{message.sender?.fullName || 'Deleted User'}</span>
            {isPinned && <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ fontSize: 9, background: 'var(--accent-muted)', color: 'var(--accent-text)' }}>Pinned</span>}
          </div>
        )}

        {message.replyTo && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              jumpToRepliedMessage(message.replyTo);
            }}
            className="rounded-xl px-3 py-2 mb-1 max-w-full ss4-reply-bar text-left transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-(--accent)/50"
            title="Jump to original message"
          >
            <p className="font-semibold truncate" style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--accent-text)' }}>{message.replyTo.sender?.fullName}</p>
            <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{messagePreviewText(message.replyTo.content) || '\u{1f4ce} Attachment'}</p>
          </button>
        )}

        <div ref={bubbleRef} className="relative w-fit">
          {editMode ? (
            <div
              className={cn('ss4-msg-bubble px-3 py-2 text-[13px] leading-relaxed sm:px-4 sm:py-2.5 sm:text-sm', isOwn ? 'ss4-bubble-own' : 'ss4-bubble-other')}
              style={{
                width: editWidth ? `${editWidth}px` : 'min(34rem, calc(100vw - 3rem))',
                minWidth: 0,
                maxWidth: 'min(100%, calc(100vw - 3rem))',
                overflow: 'visible',
              }}
            >
              <div className="flex items-center gap-1 pb-2 mb-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.16)' }}>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('bold'); }} className={editFormatButtonClass('bold')} title="Bold" aria-pressed={editActiveFormats.bold}>
                  <Bold className="h-3.5 w-3.5" style={editFormatIconStyle('bold')} />
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('italic'); }} className={editFormatButtonClass('italic')} title="Italic" aria-pressed={editActiveFormats.italic}>
                  <Italic className="h-3.5 w-3.5" style={editFormatIconStyle('italic')} />
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('underline'); }} className={editFormatButtonClass('underline')} title="Underline" aria-pressed={editActiveFormats.underline}>
                  <Underline className="h-3.5 w-3.5" style={editFormatIconStyle('underline')} />
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('strike'); }} className={editFormatButtonClass('strike')} title="Strikethrough" aria-pressed={editActiveFormats.strike}>
                  <Strikethrough className="h-3.5 w-3.5" style={editFormatIconStyle('strike')} />
                </button>
                <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'rgba(255,255,255,0.16)' }} />
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('list'); }} className={editFormatButtonClass('list')} title="Bullet list" aria-pressed={editActiveFormats.list}>
                  <List className="h-3.5 w-3.5" style={editFormatIconStyle('list')} />
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('numbered'); }} className={editFormatButtonClass('numbered')} title="Numbered list" aria-pressed={editActiveFormats.numbered}>
                  <ListOrdered className="h-3.5 w-3.5" style={editFormatIconStyle('numbered')} />
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('quote'); }} className={editFormatButtonClass('quote')} title="Quote" aria-pressed={editActiveFormats.quote}>
                  <TextQuote className="h-3.5 w-3.5" style={editFormatIconStyle('quote')} />
                </button>
                <button type="button" onMouseDown={e => { e.preventDefault(); applyEditFormat('code'); }} className={editFormatButtonClass('code')} title="Inline code" aria-pressed={editActiveFormats.code}>
                  <Code2 className="h-3.5 w-3.5" style={editFormatIconStyle('code')} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setEditPasteMode(mode => mode === 'formatted' ? 'plain' : 'formatted')}
                  className={cn('h-9 px-2 flex items-center gap-1.5 rounded-lg transition-colors hover:bg-white/10', editPasteMode === 'plain' && 'bg-white/10')}
                  title={editPasteMode === 'formatted' ? 'Paste mode: Keep formatting' : 'Paste mode: Text only'}
                  aria-pressed={editPasteMode === 'plain'}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span style={{ fontSize: 10 }}>{editPasteMode === 'formatted' ? 'Format' : 'Text'}</span>
                </button>
                <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'rgba(255,255,255,0.16)' }} />
                <div className="relative flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      rememberEditSelection();
                      setEditColorPickerOpen(v => !v);
                    }}
                    className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                    title="More text colors"
                    aria-expanded={editColorPickerOpen}
                  >
                    <Palette className="h-3.5 w-3.5" style={{ color: editColorPickerOpen ? 'var(--accent-text)' : 'currentColor' }} />
                  </button>
                  {editTextPalette.map(color => (
                    <button
                      key={color}
                      onMouseDown={e => {
                        e.preventDefault();
                        rememberEditSelection();
                        applyEditTextColor(color);
                      }}
                      className="relative h-6 w-6 rounded-full border transition-transform hover:scale-110"
                      style={{
                        background: color,
                        borderColor: editTextColor === color ? 'var(--accent)' : color === '#ffffff' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)',
                        boxShadow: editTextColor === color ? '0 0 0 2px rgba(0,0,0,0.35), 0 0 0 4px var(--accent)' : undefined,
                      }}
                      aria-pressed={editTextColor === color}
                      title={`Text color ${color}`}
                    >
                      {editTextColor === color && (
                        <CheckIcon
                          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
                          style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }}
                        />
                      )}
                    </button>
                  ))}
                  {editColorPickerOpen && (
                    <div
                      className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-6 gap-2 overflow-y-auto rounded-xl p-3 shadow-2xl"
                      style={{ background: 'var(--surface-3,#18181c)', border: '1px solid var(--border-2)', width: 260, maxHeight: 210 }}
                    >
                      {SS4_MORE_TEXT_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onMouseDown={e => { e.preventDefault(); chooseExpandedEditTextColor(color); }}
                          className="relative h-8 w-8 rounded-full border transition-transform hover:scale-110"
                          style={{
                            background: color,
                            borderColor: editTextColor === color ? 'var(--accent)' : color === '#ffffff' ? 'var(--border-3)' : 'rgba(255,255,255,0.22)',
                            boxShadow: editTextColor === color ? '0 0 0 2px var(--surface-3,#18181c), 0 0 0 4px var(--accent)' : undefined,
                          }}
                          aria-pressed={editTextColor === color}
                          title={`Use ${color}`}
                        >
                          {editTextColor === color && (
                            <CheckIcon
                              className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2"
                              style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div
                ref={editAreaRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => { syncEditDraft(); rememberEditSelection(); refreshEditActiveFormats(); }}
                onFocus={() => { rememberEditSelection(); refreshEditActiveFormats(); }}
                onSelect={() => { rememberEditSelection(); refreshEditActiveFormats(); }}
                onMouseUp={() => { rememberEditSelection(); refreshEditActiveFormats(); }}
                onKeyUp={() => { rememberEditSelection(); refreshEditActiveFormats(); }}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
                    editPastePlainTextShortcutRef.current = true;
                    window.setTimeout(() => { editPastePlainTextShortcutRef.current = false; }, 750);
                  }

                  const selection = window.getSelection();
                  const anchorNode = selection?.anchorNode;
                  const anchorElement = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
                  const isInsideStructuredBlock = Boolean(
                    anchorElement
                    && editAreaRef.current?.contains(anchorElement)
                    && anchorElement.closest('li, blockquote')
                  );

                  if (
                    e.key === 'Enter'
                    && e.altKey
                    && !e.ctrlKey
                    && !e.metaKey
                  ) {
                    e.preventDefault();
                    e.stopPropagation();

                    const inserted = document.execCommand('insertLineBreak');
                    if (!inserted) {
                      document.execCommand('insertHTML', false, '<br>');
                    }

                    syncEditDraft();
                    rememberEditSelection();
                    refreshEditActiveFormats();
                    return;
                  }

                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    saveEdit();
                    return;
                  }

                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (isInsideStructuredBlock) {
                      requestAnimationFrame(() => {
                        syncEditDraft();
                        rememberEditSelection();
                        refreshEditActiveFormats();
                      });
                      return;
                    }
                    e.preventDefault();
                    saveEdit();
                    return;
                  }

                  if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    document.execCommand('insertLineBreak');
                    syncEditDraft();
                    rememberEditSelection();
                    return;
                  }

                  if (e.key === 'Escape') {
                    cancelEdit();
                    return;
                  }

                  if (e.ctrlKey || e.metaKey) {
                    const k = e.key.toLowerCase();
                    const cmd = k === 'b'
                      ? 'bold'
                      : k === 'i'
                        ? 'italic'
                        : k === 'u'
                          ? 'underline'
                          : (e.shiftKey && k === 'x')
                            ? 'strikethrough'
                            : null;
                    if (cmd) {
                      e.preventDefault();
                      document.execCommand(cmd, false);
                      syncEditDraft();
                      rememberEditSelection();
                      refreshEditActiveFormats();
                    }
                    if (k === 'e') {
                      e.preventDefault();
                      applyEditFormat('code');
                    }
                  }
                }}
                onPaste={e => {
                  const text = e.clipboardData?.getData('text/plain') || '';
                  const html = e.clipboardData?.getData('text/html') || '';
                  const shortcutPlainText = editPastePlainTextShortcutRef.current;
                  editPastePlainTextShortcutRef.current = false;
                  const plainText = clipboardPayloadToPlainText(text, html);
                  if (!plainText && !html) return;

                  e.preventDefault();
                  const usePlainText = editPasteMode === 'plain' || shortcutPlainText || richPasteDropsVinLikeToken(text, html);
                  document.execCommand(
                    usePlainText ? 'insertText' : 'insertHTML',
                    false,
                    usePlainText ? plainText : clipboardPayloadToRichEditorHtml(text, html),
                  );
                  requestAnimationFrame(() => {
                    normalizeContentEditableListArtifacts(editAreaRef.current);
                    normalizeRichEditorListExitArtifacts(editAreaRef.current);
                    syncEditDraft();
                    rememberEditSelection();
                  });
                }}
                className="ss4-copyable-text ss4-rich-edit min-h-7 max-h-56 overflow-y-auto outline-none"
                style={{ color: 'inherit', minWidth: 0, display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', caretColor: 'var(--accent)' }}
              />
              {(editableAttachmentCount > 0 || editReplacementFiles.length > 0) && (
                <div className="mt-2 space-y-2 rounded-xl p-2" style={{ background: 'rgba(0,0,0,0.14)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  {editableAttachmentCount > 0 && editReplacementFiles.length === 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold" style={{ fontSize: 10, opacity: 0.65 }}>Current attachment{editableAttachmentCount === 1 ? '' : 's'}</p>
                      {(message.attachments || []).filter(a => !a.mimeType?.startsWith('audio/')).map((att, index) => (
                        <div key={`${att.url}-${index}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          {att.mimeType?.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
                          <span className="min-w-0 flex-1 truncate" style={{ fontSize: 11 }}>{att.originalName || `Attachment ${index + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {editReplacementFiles.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold" style={{ fontSize: 10, opacity: 0.65 }}>Replacement attachment{editReplacementFiles.length === 1 ? '' : 's'}</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                        {editReplacementFiles.map((file, index) => (
                          <FilePreviewItem
                            key={`${file.name}-${file.lastModified}-${index}`}
                            file={file}
                            onRemove={() => setEditReplacementFiles(prev => prev.filter((_, i) => i !== index))}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div
                className="mt-2 flex flex-col gap-2 pt-2 sm:flex-row sm:items-center"
                style={{ borderTop: '1px solid rgba(255,255,255,0.16)' }}
              >
                <span className="min-w-0 truncate" style={{ fontSize: 11, opacity: 0.5 }}>
                  Alt+Enter or Shift+Enter adds a line break · Ctrl/Cmd+Enter saves · Esc cancels
                </span>

                <input
                  ref={editFileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={e => {
                    setEditReplacementFiles(Array.from(e.target.files || []));
                    syncEditDraft();
                  }}
                />

                <div className="grid w-full grid-cols-3 gap-2 sm:ml-auto sm:flex sm:w-auto sm:items-center">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'inherit' }}
                    title={editableAttachmentCount > 0 ? 'Replace attachments' : 'Add attachments'}
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{editableAttachmentCount > 0 ? 'Replace' : 'Attach'}</span>
                  </button>

                  <button
                    onClick={cancelEdit}
                    className="h-8 min-w-0 rounded-lg px-2 text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.14)', color: 'inherit' }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveEdit}
                    disabled={!canSaveEdit}
                    className="h-8 min-w-0 rounded-lg px-2 text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--positive,#34c97d)' }}
                  >
                    {editSaving ? '...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          ) : message.content ? (
            <div
              onDoubleClick={() => !disableActions && onReact(message._id, defaultReactionEmoji || SS4_REACTIONS[0])}
              className={cn('ss4-msg-bubble px-3 py-2 text-[13px] leading-relaxed sm:px-4 sm:py-2.5 sm:text-sm', isOwn ? 'ss4-bubble-own' : 'ss4-bubble-other')}>
              <div className="ss4-copyable-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderMessageContent(message.content, isOwn)}</div>
              {message.isEdited && <span style={{ fontSize: 9, opacity: 0.45, marginLeft: 4 }}>(edited)</span>}
            </div>
          ) : null}
          {hov && !disableActions && !editMode && actionBarPos && createPortal(
            <div
              ref={menuRef}
              data-supraspace-action-ui="true"
              className="ss4-msg-actions ss4-msg-actions-pop"
              style={{
                position: 'fixed',
                zIndex: 9999,
                top: actionBarPos.top,
                left: actionBarPos.left,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 12,
                background: actionSurface,
                color: actionText,
                border: `1px solid ${actionBorder}`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.38)',
                minWidth: 'max-content',
              }}
              onPointerEnter={holdActionHover}
              onPointerLeave={releaseActionHover}
              onPointerDown={event => {
                event.stopPropagation();
                holdActionHover();
              }}
              onMouseDown={event => event.stopPropagation()}
              onClick={event => event.stopPropagation()}
            >
              {SS4_REACTIONS.slice(0, 6).map(emoji => (
                <button key={emoji} onClick={() => onReact(message._id, emoji)}
                  className="ss4-action-emoji h-7 w-7 flex items-center justify-center text-base rounded-lg transition-all hover:scale-125 active:scale-95"
                  style={{ ['--ss4-action-hover' as any]: actionSurfaceHover }}
                  onMouseEnter={(event) => { event.currentTarget.style.background = actionSurfaceHover; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
                >
                  {emoji}
                </button>
              ))}
              <div className="ss4-action-divider w-px h-4 mx-0.5 shrink-0" style={{ background: actionBorder }} />
              <button
                onClick={() => onReply(message)}
                className="ss4-action-btn h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                title="Reply"
                style={{ color: actionText }}
                onMouseEnter={(event) => { event.currentTarget.style.background = actionSurfaceHover; }}
                onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const chatBoundary = bubbleRowRef.current
                      ?.closest<HTMLElement>('[data-supraspace-chat-boundary="true"]')
                      ?.getBoundingClientRect();
                    const pos = {
                      top: btn.top - 348,
                      ...(chatBoundary ? {
                        boundary: {
                          top: chatBoundary.top,
                          right: chatBoundary.right,
                          bottom: chatBoundary.bottom,
                          left: chatBoundary.left,
                        },
                      } : {}),
                      ...(isOwn ? { right: Math.max(8, window.innerWidth - btn.right) } : { left: btn.left }),
                    };
                    pickerPosRef.current ? closePicker() : openPicker(pos);
                  }}
                  className="ss4-action-btn h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                  title="More reactions"
                  style={{ color: pickerPos ? '#22c55e' : actionText }}
                  onMouseEnter={(event) => { event.currentTarget.style.background = actionSurfaceHover; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
                >
                  <SmilePlus className="h-3.5 w-3.5" />
                </button>
              </div>
              { }
              <div className="relative" ref={moreActionsRef}>
                <button
                  type="button"
                  onPointerDown={event => {
                    event.stopPropagation();
                    holdActionHover();
                  }}
                  onMouseDown={event => event.stopPropagation()}
                  onClick={event => {
                    event.stopPropagation();
                    holdActionHover();

                    const willOpen = !moreActionsOpenRef.current;
                    if (willOpen && moreActionsRef.current) {
                      const rect = moreActionsRef.current.getBoundingClientRect();
                      const PAD = 10;
                      const preferredWidth = 228;
                      const width = Math.min(preferredWidth, window.innerWidth - PAD * 2);
                      const openDown = rect.top < 320;
                      const left = Math.max(
                        PAD,
                        Math.min(
                          window.innerWidth - width - PAD,
                          rect.left + rect.width / 2 - width / 2,
                        ),
                      );
                      const availableHeight = openDown
                        ? window.innerHeight - rect.bottom - PAD
                        : rect.top - PAD;

                      setDropdownFixedPos({
                        ...(openDown
                          ? { top: rect.bottom + 6 }
                          : { bottom: window.innerHeight - rect.top + 6 }),
                        left,
                        width,
                        maxHeight: Math.max(180, Math.min(380, availableHeight)),
                      });
                    } else {
                      setDropdownFixedPos(null);
                    }

                    setMoreActionsOpen(willOpen);
                  }}
                  className="ss4-action-btn h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                  title="More actions"
                  style={{ color: moreActionsOpen ? '#5b7cf6' : actionText }}
                  onMouseEnter={(event) => { event.currentTarget.style.background = actionSurfaceHover; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {moreActionsOpen && dropdownFixedPos && createPortal(
                  <div
                    ref={dropdownPortalRef}
                    data-supraspace-action-ui="true"
                    className="rounded-xl overflow-hidden"
                    onPointerEnter={holdActionHover}
                    onPointerLeave={() => {
                      if (!moreActionsOpenRef.current) releaseActionHover();
                    }}
                    onPointerDown={event => {
                      event.stopPropagation();
                      holdActionHover();
                    }}
                    onMouseDown={event => event.stopPropagation()}
                    onClick={event => event.stopPropagation()}
                    style={{
                      position: 'fixed',
                      zIndex: 9999,
                      ...dropdownFixedPos,
                      minWidth: dropdownFixedPos.width,
                      maxWidth: 'calc(100vw - 20px)',
                      maxHeight: dropdownFixedPos.maxHeight,
                      overflowY: 'auto',
                      background: 'var(--surface-3, #1a1b1e)',
                      border: '1px solid var(--border-2, rgba(255,255,255,0.10))',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                    }}
                  >
                    <div className="py-1">
                      { }
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                        onClick={() => { onForward?.(message); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                        <Share2 className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Forward message</span>
                      </button>
                      { }
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                        onClick={() => { toast.info('Mark as unread coming soon'); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                        <MailOpen className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Mark as unread</span>
                      </button>
                      { }
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                        onClick={() => { toast.info('Star coming soon'); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                        <Star className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Star</span>
                      </button>
                      <div style={{ height: 1, background: 'var(--border-2, rgba(255,255,255,0.10))', margin: '3px 0' }} />
                      { }
                      {onPin && (
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          onClick={() => { onPin(message._id); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                          <Pin className="h-4 w-4 shrink-0" style={{ color: isPinned ? 'var(--accent, #5b7cf6)' : 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>{isPinned ? 'Unpin message' : 'Pin message'}</span>
                        </button>
                      )}
                      { }
                      {message.content && (
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          onClick={() => { copyMessageText(); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                          <Copy className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Copy message</span>
                        </button>
                      )}
                      { }
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                        onClick={() => {
                          const url = `${window.location.href.split('#')[0]}#ss4-msg-${message._id}`;
                          navigator.clipboard.writeText(url)
                            .then(() => toast.success('Message link copied'))
                            .catch(() => toast.error('Could not copy link'));
                          setMoreActionsOpen(false); setDropdownFixedPos(null);
                        }}>
                        <Link2 className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Copy message link</span>
                      </button>
                      { }
                      {message.attachments.some(a => a.mimeType.startsWith('image/')) && (
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          onClick={async () => {
                            const att = message.attachments.find(a => a.mimeType.startsWith('image/'));
                            if (!att) return;
                            try { await copyImageToClipboard(att.url); toast.success('Image copied'); }
                            catch { toast.error('Could not copy image'); }
                            setMoreActionsOpen(false); setDropdownFixedPos(null);
                          }}>
                          <ImageIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Copy image</span>
                        </button>
                      )}
                      { }
                      {isOwn && (
                        <div style={{ height: 1, background: 'var(--border-2, rgba(255,255,255,0.10))', margin: '3px 0' }} />
                      )}
                      {canEditMessage && (
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          onClick={() => { enterEdit(); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                          <Pencil className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.52))' }} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary, rgba(255,255,255,0.92))' }}>Edit message</span>
                        </button>
                      )}
                      {isOwn && (
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          onClick={() => { onDelete(message._id); setMoreActionsOpen(false); setDropdownFixedPos(null); }}>
                          <Trash2 className="h-4 w-4 shrink-0" style={{ color: '#f87171' }} />
                          <span style={{ fontSize: 13, color: '#f87171' }}>Delete message</span>
                        </button>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
              {pickerPos && (
                <EmojiReactionPicker
                  position={pickerPos}
                  onSelect={(emoji) => { onReact(message._id, emoji); closePicker(); }}
                  onClose={closePicker}
                />
              )}
            </div>,
            document.body
          )}
        </div>

        {message.type === 'gif' && message.gif?.url && (
          <img src={message.gif.url} alt={message.gif.title || 'GIF'} className="rounded-xl" style={{ maxWidth: 240, maxHeight: 240, display: 'block' }} />
        )}

        {voiceAtt && <VoicePlayer convId={message.conversationId} msgId={message._id} duration={voiceAtt.duration} own={isOwn} />}

        {message.type === 'poll' && message.poll && (
          <PollCard poll={message.poll} uid={uid} onVote={(optId) => onVotePoll(message._id, optId)} />
        )}

        {message.metadata?.meeting?.meetingId && (
          <MeetingCard meeting={message.metadata.meeting} event={message.event} onJoin={onJoinMeeting} />
        )}

        {message.type === 'event' && message.event && !message.metadata?.meeting?.meetingId && (
          <EventCard event={message.event} uid={uid} onRsvp={(r) => onRsvp(message._id, r)} />
        )}

        {message.type !== 'voice' && message.attachments.length > 0 && (
          <div className={cn('flex flex-col gap-1.5', message.content ? 'mt-1' : '')}>
            {(() => {
              const images = message.attachments.filter(a => a.mimeType.startsWith('image/'));
              if (images.length === 0) return null;
              if (images.length === 1) return (
                <button onClick={() => onOpenMedia?.({ src: images[0].url, type: 'image', name: images[0].originalName })}
                  className="block text-left rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity" style={{ width: 'min(420px, 72vw)', height: 220, maxWidth: '100%', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border-2)' }}>
                  <img src={images[0].thumbnailUrl || images[0].url} alt={images[0].originalName} className="h-full w-full rounded-xl object-contain" style={{ display: 'block' }} />
                </button>
              );
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, width: 'min(420px, 72vw)', maxWidth: '100%' }}>
                  {images.map((att, i) => (
                    <button key={`img-${i}`} onClick={() => onOpenMedia?.({ src: att.url, type: 'image', name: att.originalName })}
                      className="block text-left rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity" style={{ height: 150, background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border-2)' }}>
                      <img src={att.thumbnailUrl || att.url} alt={att.originalName} className="w-full h-full object-contain rounded-xl" style={{ display: 'block' }} />
                    </button>
                  ))}
                </div>
              );
            })()}
            {message.attachments.filter(isVideoAttachment).map((att, i) => (
              <div key={`video-${i}`} className="rounded-xl overflow-hidden" style={{ maxWidth: 280 }}>
                <video controls preload="metadata" className="block w-full rounded-xl" style={{ maxHeight: 220 }}>
                  <source src={att.url} type={att.mimeType || 'video/mp4'} />
                </video>
              </div>
            ))}
            {message.attachments.filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/') && !isVideoAttachment(a)).map((att, i) => (
              <button
                key={`file-${i}`}
                type="button"
                onClick={async () => {
                  try {
                    await downloadMediaFile(att.url, att.originalName || 'attachment');
                  } catch {
                    toast.error('Unable to download this file.');
                  }
                }}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80 no-underline', isOwn ? 'ss4-file-own' : 'ss4-file-other')} style={{ maxWidth: 280 }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--accent-muted)' }}>
                  <FileText className="h-4 w-4" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: isOwn ? 'rgba(255,255,255,0.92)' : 'var(--text-primary)' }}>{att.originalName}</p>
                  <p className="mt-0.5 ss4-mono" style={{ fontSize: 10, color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }}>{fmtSize(att.size)}</p>
                </div>
                <Download className="h-3.5 w-3.5 shrink-0" style={{ color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }} />
              </button>
            ))}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-0.5', isOwn && 'justify-end')}>
            {message.reactions.map(r => {
              const mine = (r.users || []).includes(uid);
              const whoArr = (r.users || []).map(nameFor).filter(Boolean);
              const popId = message._id + ':' + r.emoji;
              const isPopOpen = openReactPop === popId;
              return (
                <div key={r.emoji} className="relative"
                  onMouseEnter={() => setOpenReactPop(popId)}
                  onMouseLeave={() => setOpenReactPop(null)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
                        if (mine) onReact(message._id, r.emoji);
                        else setOpenReactPop(isPopOpen ? null : popId);
                      } else {
                        onReact(message._id, r.emoji);
                      }
                    }}
                    className={cn('ss4-reaction-chip', mine && 'ss4-reaction-mine')}
                    title={mine ? `Remove ${r.emoji} reaction` : `React with ${r.emoji}`}
                    aria-label={mine ? `Remove ${r.emoji} reaction` : `React with ${r.emoji}`}
                  >
                    <span>{r.emoji}</span>
                    <span className="ss4-mono" style={{ fontSize: 10 }}>{r.users.length}</span>
                  </button>
                  {isPopOpen && whoArr.length > 0 && (
                    <div
                      className={cn('absolute z-50 bottom-full mb-1.5 px-3 py-2 rounded-xl text-[11px] min-w-27.5 max-w-47.5', isOwn ? 'right-0' : 'left-0')}
                      style={{ background: 'var(--bg-elevated,#1a1b1e)', border: '1px solid var(--border-2,rgba(255,255,255,0.1))', boxShadow: '0 4px 16px rgba(0,0,0,0.35)', pointerEvents: 'none' }}
                    >
                      <div className="text-sm text-center mb-1">{r.emoji}</div>
                      <div>
                        {whoArr.map((name, i) => (<div key={i} className="text-foreground/80 leading-tight truncate">{name}</div>))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(() => {
          const seenByOthers = isOwn
            ? (members as Array<{ _id: string; fullName: string; avatar?: string }>).filter(m => m._id !== uid && (message.readBy || []).includes(m._id))
            : [];
          const hasSeen = seenByOthers.length > 0;
          if (hideTime && !hasSeen) return null;
          return (
            <div className={cn('flex items-center gap-1.5 px-1', isOwn && 'flex-row-reverse')}>
              {!hideTime && <span className="ss4-mono tabular-nums" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtTime(message.createdAt)}</span>}
              {isOwn && (hasSeen ? (
                <div className="flex items-center" style={{ gap: 2 }}>
                  {seenByOthers.slice(0, 5).map(m => (
                    <div key={m._id} title={m.fullName}
                      className={cn('h-3.5 w-3.5 rounded-full overflow-hidden flex items-center justify-center text-white shrink-0', getAvaColor(m.fullName))}
                      style={{ fontSize: 6, border: '1px solid var(--bg-base)' }}>
                      {m.avatar ? <img src={resolveImageUrl(m.avatar)} alt="" className="w-full h-full object-cover" /> : m.fullName[0]?.toUpperCase()}
                    </div>
                  ))}
                  {seenByOthers.length > 5 && <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>+{seenByOthers.length - 5}</span>}
                </div>
              ) : !hideTime ? (
                <CheckIcon className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
              ) : null)}
            </div>
          );
        })()}
      </div>

      {mobileMenu && !disableActions && mobileOverlayHost && createPortal(
        <div
          className="absolute inset-0 z-50 md:hidden"
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        >
          <div
            className="absolute inset-0 bg-transparent"
            onClick={() => { setMobileMenu(false); setMobileMoreOpen(false); setMobileEmojiSheetOpen(false); setMobileReactionPos(null); closePicker(); }}
          />
          {mobileReactionPos && <div
            className="absolute z-20 flex max-w-[calc(100%-20px)] items-center gap-1 rounded-full px-2 py-2"
            style={{
              top: mobileReactionPos.top,
              left: mobileReactionPos.left,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-2)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'ss4-mobile-pop-in .16s cubic-bezier(.2,.8,.2,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            {SS4_REACTIONS.slice(0, 6).map(e => (
              <button
                key={e}
                onClick={() => { onReact(message._id, e); setMobileMenu(false); setMobileReactionPos(null); }}
                className="flex h-11 w-11 items-center justify-center rounded-full text-3xl transition-transform active:scale-90"
                aria-label={`React with ${e}`}
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => {
                closePicker();
                setMobileMenu(false);
                setMobileReactionPos(null);
                setMobileEmojiSheetOpen(true);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full text-4xl"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              aria-label="More reactions"
            >
              +
            </button>
          </div>}
          {pickerPos && (
            <EmojiReactionPicker
              position={pickerPos}
              onSelect={(emoji) => { onReact(message._id, emoji); closePicker(); setMobileMenu(false); setMobileReactionPos(null); }}
              onClose={closePicker}
            />
          )}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 rounded-t-[28px] px-5 pb-5 pt-4"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-primary)',
              borderTop: '1px solid var(--border-2)',
              boxShadow: '0 -18px 48px rgba(0,0,0,0.28)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
              animation: 'ss4-mobile-sheet-in .18s cubic-bezier(.2,.8,.2,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--border-3)' }} />
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => { onReply(message); setMobileMenu(false); setMobileReactionPos(null); }}
                className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3" style={{ color: 'var(--text-primary)' }}>
                <Reply className="h-8 w-8" style={{ color: '#4f7cff' }} />
                <span className="text-center text-sm">Reply</span>
              </button>
              <button
                onClick={() => { setMobileMenu(false); setMobileReactionPos(null); message.content ? copyMessageText() : toast.info('No text to copy'); }}
                className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3" style={{ color: 'var(--text-primary)' }}>
                <Copy className="h-8 w-8" style={{ color: '#4f7cff' }} />
                <span className="text-center text-sm">Copy</span>
              </button>
              <button
                onClick={() => toast.info('Reminder feature coming soon')}
                className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3" style={{ color: 'var(--text-primary)' }}>
                <Clock className="h-8 w-8" style={{ color: '#4f7cff' }} />
                <span className="text-center text-sm">Set reminder</span>
              </button>
              <button
                onClick={() => {
                  closePicker();
                  setMobileMenu(false);
                  setMobileReactionPos(null);
                  setMobileMoreOpen(true);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3" style={{ color: 'var(--text-primary)' }}>
                <List className="h-8 w-8" style={{ color: '#4f7cff' }} />
                <span className="text-center text-sm">More</span>
              </button>
            </div>
          </div>
        </div>,
        mobileOverlayHost,
      )}
      {mobileEmojiSheetOpen && !disableActions && mobileOverlayHost && (
        <MobileEmojiReactionSheet
          host={mobileOverlayHost}
          quickReactions={SS4_REACTIONS.slice(0, 6)}
          onSelect={(emoji) => {
            onReact(message._id, emoji);
            setMobileEmojiSheetOpen(false);
          }}
          onClose={() => setMobileEmojiSheetOpen(false)}
        />
      )}
      {mobileMoreOpen && !disableActions && mobileOverlayHost && createPortal(
        <div
          className="absolute inset-0 z-70 flex items-center justify-center px-8 md:hidden"
          style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(2px)' }}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="relative z-71 w-full max-w-sm rounded-[28px] px-7 py-6"
            style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)', animation: 'ss4-mobile-pop-in .16s cubic-bezier(.2,.8,.2,1) both' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-5 text-3xl font-medium">More</h3>
            <div className="space-y-1">
              <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => toast.info('Translate feature coming soon')}>Translate</button>
              {isOwn && <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => { onDelete(message._id); setMobileMoreOpen(false); }}>Delete</button>}
              {onPin && <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => { onPin(message._id); setMobileMoreOpen(false); }}>{isPinned ? 'Unpin' : 'Pin'}</button>}
              <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => { onForward?.(message); setMobileMoreOpen(false); }}>Forward</button>
              {canEditMessage && <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => { enterEdit(); setMobileMoreOpen(false); }}>Edit</button>}
              <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => toast.info('Make AI image coming soon')}>Make AI image</button>
              <button className="w-full rounded-2xl py-3 text-left text-xl active:bg-white/5" onClick={() => toast.info('Report submitted to admins')}>Report</button>
            </div>
          </div>
        </div>,
        mobileOverlayHost,
      )}
    </div>
  );
}

function VideoCallModal({ conv, uid, onClose, allUsers, token }: {
  conv: SSConversation; uid: string; onClose: () => void; allUsers: CrmUser[]; token: string;
}) {
  const [showJitsi, setShowJitsi] = React.useState(false);
  const name = getConvName(conv, uid);
  const currentUser = React.useMemo(() => allUsers.find(u => u._id === uid) || { fullName: 'User' }, [uid, allUsers]);
  const roomName = React.useMemo(() => `supraspace-${conv._id}`, [conv._id]);

  React.useEffect(() => {
    const fetchToken = async () => {
      try {
        await apiClient.post(`/api/supraspace/conversations/${conv._id}/video-token`, {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) { console.error('[VideoCall] token:', err); }
    };
    if (token && conv._id) fetchToken();
  }, [token, conv._id]);

  React.useEffect(() => {
    const t = setTimeout(() => setShowJitsi(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (showJitsi) {
    return <JitsiMeet roomName={roomName} displayName={currentUser.fullName} onClose={onClose} onError={(e) => { console.error('[Jitsi]', e); onClose(); }} />;
  }

  const avatar = getConvAvatar(conv, uid);
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4 ss4-vcall-modal w-full max-w-sm overflow-hidden flex flex-col" data-theme="dark">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <Video className="h-4 w-4" style={{ color: 'var(--accent-text)' }} />
            <span className="font-semibold" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Video Call</span>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="ss4-vcall-screen flex flex-col items-center justify-center" style={{ height: 260 }}>
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className={cn('h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden ss4-calling-ring', getAvaColor(name))}>
              {conv.type === 'group' ? <GroupAvatarFace src={resolveImageUrl(avatar)} name={name} size={24} />
                : avatar ? <img src={resolveImageUrl(avatar)} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold" style={{ fontSize: 24 }}>{ini(name)}</span>}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="ss4-display font-bold" style={{ fontSize: 17, color: '#fff' }}>{name}</p>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Connecting</span>
                {[0, 1, 2].map(i => <span key={i} className="ss4-typing-dot h-1 w-1 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.4)', animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>
          </div>
        </div>
        <div className="pb-4 pt-2 text-center"><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>Powered by Jitsi Meet</p></div>
      </div>
    </div>
  );
}

function NewConvModal({ users, theme, onClose, onStartDM, onCreateGroup, onCreateSpace, defaultTab = 'dm' }: {
  users: CrmUser[];
  theme: 'dark' | 'light';
  onClose: () => void; onStartDM: (id: string) => void;
  onCreateGroup: (name: string, ids: string[], emoji?: string) => void;
  onCreateSpace: (name: string, convIds: string[], emoji?: string) => void;
  defaultTab?: 'dm' | 'group' | 'space';
}) {
  const [tab, setTab] = React.useState<'dm' | 'group' | 'space'>(defaultTab);
  const [q, setQ] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [groupEmoji, setGroupEmoji] = React.useState('');
  const [sel, setSel] = React.useState<string[]>([]);
  const list = users.filter(u => u.fullName.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectedUsers = users.filter(u => sel.includes(u._id));
  const autoGroupName = selectedUsers.length > 0
    ? `${selectedUsers.slice(0, 3).map(u => u.fullName.split(' ')[0] || u.fullName).join(', ')}${selectedUsers.length > 3 ? ` +${selectedUsers.length - 3}` : ''}`
    : 'New Group';
  const startSmartMessage = () => {
    if (sel.length === 1) {
      onStartDM(sel[0]);
      return;
    }
    if (sel.length > 1) onCreateGroup(autoGroupName, sel);
  };
  const TABS: { key: 'dm' | 'group' | 'space'; label: string }[] = [
    { key: 'dm', label: 'Direct Message' },
    { key: 'group', label: 'Channel' },
    { key: 'space', label: 'Space' },
  ];
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>New Conversation</h2>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 pt-4 pb-3">
          <div className="ss4-tab-bar flex gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setQ(''); }} className={cn('flex-1 h-7 ss4-tab', t.key === tab && 'ss4-tab-active')}
                style={{ fontSize: 11, color: t.key === tab ? '#fff' : (theme === 'light' ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.52)') }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {tab === 'group' && (
            <div className="flex gap-2">
              <input value={groupEmoji} onChange={e => setGroupEmoji(e.target.value)} placeholder="#" className="w-12 h-9 rounded-lg px-2 text-center ss4-search-input" style={{ fontFamily: 'Geist, sans-serif', fontSize: 18 }} maxLength={4} />
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Channel name..." className="flex-1 h-9 rounded-lg px-3 text-sm ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
            </div>
          )}
          {tab === 'space' && (
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Space name..." className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
          )}
          {tab === 'dm' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {selectedUsers.map(u => (
                <span key={u._id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(91,124,246,0.2)' }}>
                  <span className={cn('h-5 w-5 rounded-full shrink-0 flex items-center justify-center overflow-hidden text-white', getAvaColor(u.fullName))} style={{ fontSize: 8, fontWeight: 700 }}>
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : ini(u.fullName)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{u.fullName.split(' ')[0]}</span>
                  <button onClick={() => toggle(u._id)} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }} title={`Remove ${u.fullName}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {tab !== 'space' && (
            <>
              <div className="relative">
                <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
                <input value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search people..."
                  className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input"
                  style={{ fontFamily: 'Geist, sans-serif', color: 'var(--text-primary)', fontWeight: 500 }} />
              </div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto ss4-scroll -mx-1 px-1">
                {list.map(u => {
                  const active = sel.includes(u._id);
                  return (
                    <button key={u._id} onClick={() => toggle(u._id)}
                      className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left', active ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)')}
                      style={active ? { border: '1px solid rgba(91,124,246,0.2)' } : undefined}>
                      <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden', getAvaColor(u.fullName))}>
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(u.fullName)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
                        <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username} · {u.role}</p>
                      </div>
                      {active && <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}><CheckIcon className="h-3 w-3" style={{ color: '#fff' }} /></div>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {tab === 'dm' && sel.length > 0 && (
            <button onClick={startSmartMessage}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
              {sel.length === 1 ? <MessageSquare className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {sel.length === 1 ? 'Send Message' : `Send Message · Create Channel (${sel.length})`}
            </button>
          )}
          {tab === 'group' && sel.length > 0 && (
            <button onClick={() => groupName.trim() && onCreateGroup(groupName, sel, groupEmoji || undefined)} disabled={!groupName.trim()}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: !groupName.trim() ? 0.4 : 1 }}>
              <Users className="h-3.5 w-3.5" /> Create Channel · {sel.length} {sel.length === 1 ? 'member' : 'members'}
            </button>
          )}
          {tab === 'space' && (
            <button onClick={() => groupName.trim() && onCreateSpace(groupName, [], undefined)} disabled={!groupName.trim()}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: !groupName.trim() ? 0.4 : 1 }}>
              <Sparkles className="h-3.5 w-3.5" /> Create Space
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LightboxModal({ src, type, name, onClose }: { src: string; type: 'image' | 'video'; name: string; onClose: () => void }) {
  const [downloading, setDownloading] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const pinchRef = React.useRef<{ distance: number; zoom: number } | null>(null);
  const hasDraggedRef = React.useRef(false);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  React.useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    dragRef.current = null;
    pinchRef.current = null;
  }, [src]);

  const applyZoom = (next: number) => {
    const clamped = clampLightboxZoom(next);
    if (clamped <= 1) setOffset({ x: 0, y: 0 });
    setZoom(clamped);
  };
  const zoomBy = (delta: number) => applyZoom(zoom + delta);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadMediaFile(src, name);
      toast.success('Download started');
    } catch {
      toast.error('Unable to download this file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (type !== 'image') return;
    e.preventDefault();
    applyZoom(zoom + (e.deltaY < 0 ? 0.2 : -0.2));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.preventDefault();
    hasDraggedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    hasDraggedRef.current = true;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    });
  };
  const handleMouseUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (type !== 'image') return;
    if (e.touches.length === 2) {
      pinchRef.current = { distance: touchDistance(e.touches), zoom };
    } else if (e.touches.length === 1 && zoom > 1) {
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    }
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (type !== 'image') return;
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const d = touchDistance(e.touches);
      if (!d || !pinchRef.current.distance) return;
      applyZoom(pinchRef.current.zoom * (d / pinchRef.current.distance));
    } else if (e.touches.length === 1 && dragRef.current) {
      setOffset({
        x: dragRef.current.ox + (e.touches[0].clientX - dragRef.current.startX),
        y: dragRef.current.oy + (e.touches[0].clientY - dragRef.current.startY),
      });
    }
  };
  const handleTouchEnd = () => {
    pinchRef.current = null;
    dragRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-200 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      { }
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="font-medium truncate" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', maxWidth: '55%' }}>{name}</p>
        <div className="flex items-center gap-2">
          {type === 'image' && (
            <div className="hidden sm:flex items-center gap-1">
              <button type="button" onClick={() => zoomBy(-0.25)} disabled={zoom <= 1}
                className="ss4-pill-btn h-7 w-7 flex items-center justify-center disabled:opacity-40" title="Zoom out">
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="ss4-pill-btn h-7 px-2 flex items-center justify-center tabular-nums" style={{ fontSize: 10, minWidth: 46 }}>
                {Math.round(zoom * 100)}%
              </span>
              <button type="button" onClick={() => zoomBy(0.25)} disabled={zoom >= 4}
                className="ss4-pill-btn h-7 w-7 flex items-center justify-center disabled:opacity-40" title="Zoom in">
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>
          )}
          <button type="button" onClick={handleDownload} disabled={downloading}
            className="ss4-pill-btn flex items-center gap-1.5 px-3 h-7 disabled:opacity-60" style={{ fontSize: 11 }}>
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Download
          </button>
          <button onClick={onClose} className="ss4-icon-btn h-8 w-8" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <X className="h-4 w-4" style={{ color: '#fff' }} />
          </button>
        </div>
      </div>

      { }
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{
          cursor: type !== 'image' ? 'default' : zoom > 1 ? 'move' : 'zoom-in',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={(e) => {
          if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            e.stopPropagation();
          }
        }}
      >
        {type === 'image' ? (
          <img
            src={src}
            alt={name}
            draggable={false}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              pointerEvents: 'auto',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
              willChange: 'transform',
            }}
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            className="rounded-xl"
            style={{ maxHeight: '100%', maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          />
        )}
      </div>

      { }
      {type === 'image' && zoom > 1 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '3px 12px' }}>
            Drag to pan · Scroll to zoom · Esc to close
          </span>
        </div>
      )}
    </div>
  );
}

function FilePreviewItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/');
  const isVid = file.type.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(file.name.slice(file.name.lastIndexOf('.')).toLowerCase());
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isImg || isVid) { const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }
  }, [file, isImg, isVid]);
  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden shrink-0" style={{ width: 180, background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
      {preview && isImg ? <img src={preview} alt={file.name} className="w-full object-contain" style={{ height: 128, background: 'rgba(0,0,0,0.16)' }} />
        : preview && isVid ? <video src={preview} className="w-full object-contain" style={{ height: 128, background: 'rgba(0,0,0,0.16)' }} muted />
          : <div className="flex items-center justify-center" style={{ height: 128, background: 'var(--accent-muted)' }}><FileText className="h-8 w-8" style={{ color: 'var(--accent)' }} /></div>}
      <div className="px-2 py-1.5">
        <p className="truncate" style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>{file.name}</p>
        <p className="ss4-mono" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{fmtSize(file.size)}</p>
      </div>
      <button onClick={onRemove} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><X className="h-2.5 w-2.5" style={{ color: '#fff' }} /></button>
    </div>
  );
}

function GifPicker({ onPick, onClose, mobile = false }: { onPick: (g: { url: string; width?: number; height?: number; title?: string }) => void; onClose: () => void; mobile?: boolean }) {
  const [q, setQ] = React.useState('');
  const [gifs, setGifs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const run = React.useCallback(async (query: string) => {
    if (!GIPHY_KEY) return;
    setLoading(true);
    try {
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=pg-13`;
      const r = await fetch(endpoint);
      const d = await r.json();
      setGifs(d?.data || []);
    } catch { setGifs([]); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { run(''); }, [run]);
  React.useEffect(() => { const t = setTimeout(() => run(q), 350); return () => clearTimeout(t); }, [q, run]);

  return (
    <div
      className={cn(mobile ? 'absolute bottom-full right-0 mb-2 z-90 rounded-xl overflow-hidden' : 'absolute bottom-full left-0 mb-2 z-50 rounded-xl overflow-hidden')}
      style={{
        ...(mobile
          ? { width: 'min(300px, calc(100vw - 24px))', maxHeight: 'min(420px, calc(100dvh - 160px))' }
          : { width: 300 }),
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-2)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="p-2" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="relative">
          <Search className="ss4-search-icon absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={GIPHY_KEY ? 'Search GIPHY...' : 'Set NEXT_PUBLIC_GIPHY_API_KEY'} className="w-full h-8 rounded-lg pl-8 pr-3 text-xs ss4-search-input" />
        </div>
      </div>
      <div className="p-2 grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto ss4-scroll">
        {loading && <div className="col-span-2 flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} /></div>}
        {!loading && gifs.length === 0 && <p className="col-span-2 text-center py-6" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{GIPHY_KEY ? 'No results' : 'GIPHY key not configured'}</p>}
        {gifs.map((g: any) => {
          const img = g.images?.fixed_height_small || g.images?.fixed_height;
          return (
            <button key={g.id} onClick={() => { onPick({ url: g.images?.original?.url || img?.url, width: Number(img?.width), height: Number(img?.height), title: g.title }); onClose(); }} className="rounded-lg overflow-hidden" style={{ aspectRatio: '1', background: 'var(--bg-hover)' }}>
              <img src={img?.url} alt={g.title} className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PollModal({ onClose, onCreate }: { onClose: () => void; onCreate: (q: string, opts: string[], multi: boolean) => void }) {
  const [question, setQuestion] = React.useState('');
  const [opts, setOpts] = React.useState(['', '']);
  const [multi, setMulti] = React.useState(false);
  const valid = question.trim() && opts.filter(o => o.trim()).length >= 2;
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Poll</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question..." className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" />
          <div className="space-y-2">
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={o} onChange={e => setOpts(p => p.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`Option ${i + 1}`} className="flex-1 h-9 rounded-lg px-3 text-sm ss4-search-input" />
                {opts.length > 2 && <button onClick={() => setOpts(p => p.filter((_, idx) => idx !== i))} className="ss4-icon-btn h-7 w-7"><X className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
            {opts.length < 6 && <button onClick={() => setOpts(p => [...p, ''])} className="ss4-pill-btn h-8 px-3 flex items-center gap-1.5 w-full justify-center" style={{ fontSize: 12 }}><Plus className="h-3.5 w-3.5" /> Add option</button>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} /> Allow multiple answers
          </label>
          <button disabled={!valid} onClick={() => valid && onCreate(question.trim(), opts.map(o => o.trim()).filter(Boolean), multi)} className="w-full h-9 rounded-lg ss4-send-btn font-semibold" style={{ fontSize: 13, opacity: valid ? 1 : 0.4 }}>Create Poll</button>
        </div>
      </div>
    </div>
  );
}

function EventModal({ onClose, onCreate }: { onClose: () => void; onCreate: (e: { title: string; description: string; location: string; startTime: string; endTime: string }) => void }) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const valid = title.trim() && startTime;
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Event</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg px-3 py-2 text-sm ss4-search-input resize-none" />
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Starts</label>
            <DateTimePicker value={startTime} onChange={setStartTime} placeholder="Pick start date & time" className="h-9 text-sm mt-1" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ends (optional)</label>
            <DateTimePicker value={endTime} onChange={setEndTime} placeholder="Pick end date & time" className="h-9 text-sm mt-1" />
          </div>
          <button disabled={!valid} onClick={() => valid && onCreate({ title: title.trim(), description, location, startTime, endTime })} className="w-full h-9 rounded-lg ss4-send-btn font-semibold mt-1" style={{ fontSize: 13, opacity: valid ? 1 : 0.4 }}>Create Event</button>
        </div>
      </div>
    </div>
  );
}

function MeetingModal({
  onClose,
  onCreate,
  onCreateLink,
  canAddToMessage,
}: {
  onClose: () => void;
  onCreate: (m: PendingMeetingDraft) => void;
  onCreateLink: (m: PendingMeetingDraft) => Promise<string>;
  canAddToMessage: boolean;
}) {
  const [title, setTitle] = React.useState('Video meeting');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [generatedLink, setGeneratedLink] = React.useState('');
  const [creatingLink, setCreatingLink] = React.useState(false);
  const meetingDraft = React.useMemo(
    () => ({ title: title.trim() || 'Video meeting', scheduledAt }),
    [title, scheduledAt]
  );
  const handleCreateLink = async () => {
    setCreatingLink(true);
    try {
      const link = await onCreateLink(meetingDraft);
      setGeneratedLink(link);
    } finally {
      setCreatingLink(false);
    }
  };
  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success('Meeting link copied');
    } catch {
      toast.error('Could not copy meeting link');
    }
  };
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><Video className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Meeting</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" />
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Date and time (optional)</label>
          <input value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} type="datetime-local" className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" />
          {generatedLink && (
            <div className="rounded-xl p-2.5 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Meeting link</label>
              <div className="flex items-center gap-2">
                <input readOnly value={generatedLink} className="min-w-0 flex-1 h-9 rounded-lg px-3 text-xs ss4-search-input" />
                <button onClick={handleCopyLink} className="ss4-icon-btn h-9 w-9 shrink-0" title="Copy meeting link">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {canAddToMessage && (
            <button onClick={() => onCreate(meetingDraft)} className="w-full h-9 rounded-lg ss4-pill-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
              <Video className="h-3.5 w-3.5" /> Add to Message
            </button>
          )}
          <button disabled={creatingLink} onClick={handleCreateLink} className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: creatingLink ? 0.7 : 1 }}>
            {creatingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            {creatingLink ? 'Creating link...' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MeetingJoinInfoModal({
  link,
  onClose,
}: {
  link: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Meeting link copied');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy meeting link');
    }
  };
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="ss4-display font-bold" style={{ fontSize: 22, color: 'var(--text-primary)' }}>Here&apos;s your joining info</h2>
            <p className="mt-3 leading-relaxed" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Send this to people you want to meet with. Be sure to save it so you can use it later.
            </p>
          </div>
          <button onClick={onClose} className="ss4-icon-btn h-8 w-8 shrink-0" title="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}>
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate ss4-mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{link}</span>
              <button onClick={copyLink} className="ss4-icon-btn h-10 w-10 shrink-0" title="Copy link">
                {copied ? <CheckIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={copyLink} className="mt-4 h-9 px-3 rounded-lg ss4-pill-btn font-semibold flex items-center gap-2" style={{ fontSize: 13 }}>
              <Link2 className="h-4 w-4" /> {copied ? 'Copied' : 'Copy meeting link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleMeetingModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; scheduledAt: string; endTime: string; department: string }) => Promise<void>;
}) {
  const [title, setTitle] = React.useState('Video meeting');
  const [description, setDescription] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [department, setDepartment] = React.useState('all');
  const [saving, setSaving] = React.useState(false);
  const valid = title.trim() && scheduledAt;
  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), scheduledAt, endTime, department });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="ss4-modal w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Schedule in Suprah Calendar</h2>
          </div>
          <button onClick={onClose} className="ss4-icon-btn h-8 w-8" title="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" className="w-full h-10 rounded-lg px-3 text-sm ss4-search-input" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Agenda or notes (optional)" rows={3} className="w-full rounded-lg px-3 py-2 text-sm ss4-search-input resize-none" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Date and time</label>
              <input value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} type="datetime-local" className="mt-1 w-full h-10 rounded-lg px-3 text-sm ss4-search-input" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ends (optional)</label>
              <input value={endTime} onChange={e => setEndTime(e.target.value)} type="datetime-local" className="mt-1 w-full h-10 rounded-lg px-3 text-sm ss4-search-input" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Notify department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="mt-1 w-full h-10 rounded-lg px-3 text-sm ss4-search-input">
              <option value="all">All departments</option>
              {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <p className="mt-1.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {department === 'all' ? 'Everyone in CRM will be added to the calendar event.' : `${deptLabel(department)} members will be added and notified.`}
            </p>
          </div>
          <button disabled={!valid || saving} onClick={submit} className="w-full h-10 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: valid && !saving ? 1 : 0.5 }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {saving ? 'Scheduling...' : 'Schedule meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemeModal({ current, onClose, onApply }: { current?: SSConversation['theme']; onClose: () => void; onApply: (t: { accent: string | null; wallpaper: string | null; emoji: string | null }) => void }) {
  const [accent, setAccent] = React.useState<string | null>(current?.accent || null);
  const [wallpaper, setWallpaper] = React.useState<string | null>(current?.wallpaper || null);
  const [emoji, setEmoji] = React.useState<string | null>(current?.emoji || null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const emojiBtnRef = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><Palette className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Chat Theme</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="ss4-section-label mb-2">Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {SS4_THEME_PRESETS.map(p => (
                <button key={p.name} onClick={() => { setAccent(p.accent); setWallpaper(p.wallpaper); }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                  style={{ border: `1px solid ${accent === p.accent ? 'var(--accent)' : 'var(--border-2)'}`, background: accent === p.accent ? 'var(--accent-muted)' : 'transparent' }}>
                  <span className="h-7 w-7 rounded-full" style={{ background: p.accent || 'linear-gradient(140deg,#4a6cf0,#5b7cf6)' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="ss4-section-label mb-2">Custom color</p>
            <div className="flex items-center gap-3">
              <input type="color" value={accent || '#5b7cf6'} onChange={e => setAccent(e.target.value)} className="h-9 w-12 rounded-lg cursor-pointer" style={{ background: 'transparent', border: '1px solid var(--border-2)' }} />
              <span className="ss4-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{accent || 'default'}</span>
            </div>
          </div>
          <div>
            <p className="ss4-section-label mb-2">Default reaction (double-click a message)</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SS4_REACTIONS.slice(0, 8).map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110"
                  style={{ border: `1px solid ${emoji === e ? 'var(--accent)' : 'var(--border-2)'}`, background: emoji === e ? 'var(--accent-muted)' : 'transparent' }}>
                  {e}
                </button>
              ))}
              <button ref={emojiBtnRef} onClick={() => setPickerOpen(v => !v)}
                className="h-9 w-9 flex items-center justify-center rounded-lg transition-all hover:scale-110"
                style={{ border: '1px solid var(--border-2)' }}
                title="More emojis">
                <SmilePlus className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
              {pickerOpen && (
                <EmojiReactionPicker
                  onSelect={e => setEmoji(e)}
                  onClose={() => setPickerOpen(false)}
                  position={emojiBtnRef.current ? { top: emojiBtnRef.current.getBoundingClientRect().bottom + 6, left: emojiBtnRef.current.getBoundingClientRect().left } : { top: 200, left: 200 }}
                />
              )}
            </div>
          </div>
          <button onClick={() => onApply({ accent, wallpaper, emoji })} className="w-full h-9 rounded-lg ss4-send-btn font-semibold" style={{ fontSize: 13 }}>Apply Theme</button>
        </div>
      </div>
    </div>
  );
}

function ManageMembersModal({ users, existingIds, onClose, onAdd }: {
  users: CrmUser[]; existingIds: string[]; onClose: () => void; onAdd: (ids: string[]) => void;
}) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState<string[]>([]);
  const list = users.filter(u => !existingIds.includes(u._id) && (u.fullName.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase())));
  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" style={{ color: 'var(--accent)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Add Members</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="relative">
            <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people..." className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input" />
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto ss4-scroll -mx-1 px-1">
            {list.length === 0 && <p className="text-center py-6" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Everyone is already a member</p>}
            {list.map(u => {
              const active = sel.includes(u._id);
              return (
                <button key={u._id} onClick={() => toggle(u._id)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left', active ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)')} style={active ? { border: '1px solid rgba(91,124,246,0.2)' } : undefined}>
                  <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden', getAvaColor(u.fullName))}>
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(u.fullName)}</span>}
                  </div>
                  <div className="min-w-0 flex-1"><p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p><p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username} · {u.role}</p></div>
                  {active && <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}><CheckIcon className="h-3 w-3" style={{ color: '#fff' }} /></div>}
                </button>
              );
            })}
          </div>
          {sel.length > 0 && <button onClick={() => onAdd(sel)} className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13 }}><UserPlus className="h-3.5 w-3.5" /> Add {sel.length} {sel.length === 1 ? 'member' : 'members'}</button>}
        </div>
      </div>
    </div>
  );
}

function ForwardMessageModal({ users, message, token, onClose }: {
  users: CrmUser[]; message: SSMessage; token: string; onClose: () => void;
}) {
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<CrmUser[]>([]);
  const [sending, setSending] = React.useState(false);

  const filtered = users.filter(u => {
    if (selected.some(s => s._id === u._id)) return false;
    const lq = q.toLowerCase();
    return u.fullName.toLowerCase().includes(lq) || u.username.toLowerCase().includes(lq);
  });

  const addUser = (u: CrmUser) => { setSelected(p => [...p, u]); setQ(''); };
  const removeUser = (id: string) => setSelected(p => p.filter(s => s._id !== id));

  const handleForward = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    let ok = 0;
    for (const user of selected) {
      try {
        const r = await apiClient.post('/api/supraspace/conversations/direct', { targetUserId: user._id }, { headers: { Authorization: `Bearer ${token}` } });
        const convId = r.data?.data?._id;
        if (convId && message.content) {
          await apiClient.post(`/api/supraspace/conversations/${convId}/messages`, { content: message.content }, { headers: { Authorization: `Bearer ${token}` } });
        }
        ok++;
      } catch { }
    }
    setSending(false);
    if (ok > 0) toast.success(ok === 1 ? 'Message forwarded.' : `Message forwarded to ${ok} people.`);
    else toast.error('Could not forward the message.');
    onClose();
  };

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="ss4-modal w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Forward message</h2>
          </div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {selected.map(u => (
                <span key={u._id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(91,124,246,0.2)' }}>
                  <span className={cn('h-5 w-5 rounded-full shrink-0 flex items-center justify-center overflow-hidden text-white', getAvaColor(u.fullName))} style={{ fontSize: 8, fontWeight: 700 }}>
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : ini(u.fullName)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{u.fullName.split(' ')[0]}</span>
                  <button onClick={() => removeUser(u._id)} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input" />
          </div>
          <div className="space-y-0.5 max-h-52 overflow-y-auto ss4-scroll -mx-1 px-1">
            {filtered.length === 0 && <p className="text-center py-6" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{q ? 'No people found' : 'All users selected'}</p>}
            {filtered.map(u => (
              <button key={u._id} onClick={() => addUser(u)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left hover:bg-(--bg-hover)">
                <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden text-white', getAvaColor(u.fullName))}>
                  {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{ini(u.fullName)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
                  <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username}</p>
                </div>
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <button onClick={handleForward} disabled={sending} className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: sending ? 0.6 : 1 }}>
              <Share2 className="h-3.5 w-3.5" />
              {sending ? 'Forwarding…' : `Forward to ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationSettingsModal({ conv, convName, prefs, onSave, onClose }: {
  conv: SSConversation;
  convName: string;
  prefs: { type: 'all' | 'main' | 'foryou' | 'none'; muted: boolean };
  onSave: (p: { type: 'all' | 'main' | 'foryou' | 'none'; muted: boolean }) => void;
  onClose: () => void;
}) {
  const [type, setType] = React.useState<'all' | 'main' | 'foryou' | 'none'>(prefs.type);
  const [muted, setMuted] = React.useState(prefs.muted);
  const isDM = conv.type === 'direct';

  const options = isDM
    ? [
      { value: 'all' as const, label: 'All', desc: 'All new messages and threads' },
      { value: 'main' as const, label: 'Main conversations', desc: 'New messages from main conversations, and replies to threads you follow' },
      { value: 'none' as const, label: 'None', desc: 'No notifications' },
    ]
    : [
      { value: 'all' as const, label: 'All', desc: 'All new messages and threads' },
      { value: 'main' as const, label: 'Main conversations', desc: 'New messages from main conversations, and replies to threads you follow' },
      { value: 'foryou' as const, label: 'For you', desc: 'Only @mentions and replies to threads you follow' },
      { value: 'none' as const, label: 'None', desc: 'No notifications' },
    ];

  return (
    <div className="ss4-overlay fixed inset-0 z-200 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#2a2b2f', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: '24px 24px 16px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e3e5e8', marginBottom: 4 }}>{convName}</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Notifications</p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {options.map(opt => (
            <label key={opt.value} onClick={() => setType(opt.value)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${type === opt.value ? '#5865f2' : 'rgba(255,255,255,0.3)'}`, background: type === opt.value ? '#5865f2' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
                {type === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e3e5e8', lineHeight: 1.3 }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2 }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0 14px' }} />

        <label onClick={() => setMuted(m => !m)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${muted ? '#5865f2' : 'rgba(255,255,255,0.3)'}`, background: muted ? '#5865f2' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
            {muted && <CheckIcon className="h-2.5 w-2.5 text-white" />}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#e3e5e8', lineHeight: 1.3 }}>Mute conversation</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2 }}>Muted conversations are italicized and appear at the bottom of your conversation list, and will not appear in Home</p>
          </div>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => { onSave({ type, muted }); onClose(); }} style={{ padding: '8px 20px', borderRadius: 8, background: '#5865f2', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveUsersModal({ users, presence, uid, onClose }: {
  users: CrmUser[]; presence: PresenceMap; uid: string; onClose: () => void;
}) {
  const online = users.filter(u => u._id !== uid && presence[u._id]?.onlineStatus && presence[u._id]?.onlineStatus !== 'offline');
  const offline = users.filter(u => u._id !== uid && (!presence[u._id]?.onlineStatus || presence[u._id]?.onlineStatus === 'offline'));
  const Row = (u: CrmUser, isOn: boolean) => {
    const status = presence[u._id]?.onlineStatus ?? 'offline';
    return (
      <div key={u._id} className="w-full flex items-center gap-3 px-4 py-2.5">
        <div className="relative shrink-0">
          <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden', getAvaColor(u.fullName))} style={{ fontSize: 12 }}>
            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : ini(u.fullName)}
          </div>
          {isOn && <PresenceAvatarDot status={status} deviceType={presence[u._id]?.lastDeviceType ?? undefined} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
          <p style={{ fontSize: 10, color: isOn ? 'var(--positive)' : 'var(--text-tertiary)' }}>{isOn ? S.label[status] : u.role || 'Offline'}</p>
        </div>
        <span className={cn('shrink-0 h-2.5 w-2.5 rounded-full', S.dot[status])} />
      </div>
    );
  };
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><Wifi className="h-4 w-4" style={{ color: 'var(--positive)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Active Now · {online.length}</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto ss4-scroll">
          {online.length > 0 && <div className="px-4 pt-3 pb-1"><span className="ss4-section-label" style={{ color: 'var(--positive)' }}>{'\u{1f7e2}'} Online</span></div>}
          {online.map(u => Row(u, true))}
          {offline.length > 0 && <div className="px-4 pt-3 pb-1"><span className="ss4-section-label">Offline</span></div>}
          {offline.map(u => Row(u, false))}
        </div>
      </div>
    </div>
  );
}

function SummarizeModal({ token, conversationId, onClose }: { token: string; conversationId: string; onClose: () => void }) {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const run = async () => {
    setLoading(true); setSummary(null);
    try {
      const body: any = { conversationId };
      if (from) body.from = new Date(from).toISOString();
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); body.to = d.toISOString(); }
      const r = await apiClient.post('/api/supraleo/summarize', body, { headers: { Authorization: `Bearer ${token}` } });
      setSummary(r.data?.data?.summary || 'No summary returned.');
    } catch (e) { setSummary(getErrorMessage(e, 'Failed to summarize conversation.')); }
    finally { setLoading(false); }
  };

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: '#b49dff' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Summarize with Suprah Autrix</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-3 overflow-y-auto ss4-scroll">
          <div className="flex gap-2">
            <div className="flex-1"><label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input mt-1" /></div>
            <div className="flex-1"><label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input mt-1" /></div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Leave dates empty to summarize the entire conversation.</p>
          <button disabled={loading} onClick={run} className="w-full h-9 rounded-lg ss4-ai-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="ss4-ai-text">{loading ? 'Summarizing…' : 'Generate Summary'}</span>
          </button>
          {summary && (
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{summary}</p>
              <button onClick={() => { navigator.clipboard?.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="ss4-pill-btn h-7 px-3 mt-3 flex items-center gap-1.5" style={{ fontSize: 11 }}>
                <CheckIcon className="h-3 w-3" /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConvRowProps {
  conv: SSConversation;
  compact?: boolean;
  draggable?: boolean;
  activeId: string | null;
  activeConvId: string | null;
  uid: string;
  token: string;
  presence: PresenceMap;
  notifPrefs: Record<string, { type: 'all' | 'main' | 'foryou' | 'none'; muted: boolean }>;
  manualUnread: Set<string>;
  msgs: Record<string, SSMessage[]>;
  composerDraftPreviews: Record<string, string>;
  ctxSpaces: { _id: string; name: string; emoji?: string | null }[];
  dragConvId: string | null;
  openConvMenuId: string | null;
  setOpenConvMenuId: (id: string | null) => void;
  isPinnedConv: (c: SSConversation) => boolean;
  isArchivedConv: (c: SSConversation) => boolean;
  ptrStartRef: React.MutableRefObject<{ x: number; y: number; type: 'conv' | 'space'; id: string; label: string; spaceId?: string | null } | null>;
  convLongPressTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  openConversation: (conversationId: string | null) => void;
  setConvMobileSheet: (id: string | null) => void;
  markRead: (conversationId: string) => void;
  setManualUnread: React.Dispatch<React.SetStateAction<Set<string>>>;
  setConvos: React.Dispatch<React.SetStateAction<SSConversation[]>>;
  togglePinConv: (c: SSConversation) => void;
  saveNotificationPref: (conversationId: string, pref: { type: 'all' | 'main' | 'foryou' | 'none'; muted: boolean }) => void;
  setNotifModalConv: (c: SSConversation | null) => void;
  handleMoveToSpace: (convId: string, spaceId: string | null) => void;
  toggleArchiveConv: (c: SSConversation) => void;
  setDeleteConfirmConv: (c: SSConversation | null) => void;
  setActiveId: (id: string | null) => void;
  setShowInfo: (show: boolean) => void;
}

// Hoisted to module scope on purpose: this used to be defined inside SupraSpacePage's
// render body, which meant every parent re-render created a brand-new component
// identity for it. React can't diff two different component types even with a stable
// `key`, so it unmounted+remounted every row on every re-render, wiping ConvRow's own
// local state (dropdown open/close, hover) — this page re-renders constantly from
// socket traffic (typing, presence, message:new), so the 3-dot menu would open then
// immediately get wiped by the next remount. Keeping this at module scope means the
// component reference never changes, so re-renders just update props in place.
function ConvRow({
  conv, compact, draggable: isDraggable,
  activeId, activeConvId, uid, token, presence, notifPrefs, manualUnread, msgs, composerDraftPreviews, ctxSpaces, dragConvId,
  openConvMenuId, setOpenConvMenuId, isPinnedConv, isArchivedConv, ptrStartRef, convLongPressTimer,
  openConversation, setConvMobileSheet, markRead, setManualUnread, setConvos, togglePinConv, saveNotificationPref,
  setNotifModalConv, handleMoveToSpace, toggleArchiveConv, setDeleteConfirmConv, setActiveId, setShowInfo,
}: ConvRowProps) {
  const isAct = conv._id === activeId;
  const other = safeMembers(conv).find(m => m._id !== uid);
  const otherPresence = other ? presence[other._id] : undefined;
  const online = !!otherPresence?.onlineStatus && otherPresence.onlineStatus !== 'offline';
  const cName = getConvName(conv, uid);
  const cAvatar = getConvAvatar(conv, uid);
  const pinned = isPinnedConv(conv);
  const archived = isArchivedConv(conv);
  const isMuted = notifPrefs[conv._id]?.muted ?? false;
  const unreadCount = manualUnread.has(conv._id) ? Math.max(1, conv.unreadCount || 0) : (conv.unreadCount || 0);
  const isUnread = isConvUnreadForUser(conv, uid, manualUnread);
  const cachedConvMsgs = msgs[conv._id];
  const effectiveLastMsg = (conv.lastMessage && !conv.lastMessage.isDeleted)
    ? conv.lastMessage
    : (cachedConvMsgs?.length ? [...cachedConvMsgs].filter(m => !m.isDeleted).slice(-1)[0] || conv.lastMessage : conv.lastMessage);
  const lastPreview = unreadCount >= 2 ? `${unreadCount} new messages`
    : !effectiveLastMsg ? 'No messages yet'
      : effectiveLastMsg.isDeleted ? 'Message deleted'
        : effectiveLastMsg.type === 'voice' ? '\u{1f3a4} Voice message'
          : effectiveLastMsg.type === 'gif' ? 'GIF'
            : effectiveLastMsg.type === 'poll' ? `\u{1f4ca} ${effectiveLastMsg.poll?.question || 'Poll'}`
              : effectiveLastMsg.type === 'event' ? `\u{1f4c5} ${effectiveLastMsg.event?.title || 'Event'}`
                : messagePreviewText(effectiveLastMsg.content) || (effectiveLastMsg.attachments?.length ? '\u{1f4ce} Attachment' : 'No messages yet');
  const draftPreview = messagePreviewText(composerDraftPreviews[conv._id]);
  const hasDraftPreview = Boolean(draftPreview);
  const senderPrefix = conv.type === 'group' && effectiveLastMsg && !effectiveLastMsg.isDeleted && effectiveLastMsg.sender?._id !== uid ? `${(effectiveLastMsg.sender?.fullName || '').split(' ')[0]}: ` : '';
  const [actionKeyboardFocus, setActionKeyboardFocus] = React.useState(false);
  const ddOpen = openConvMenuId === conv._id;
  const setDdOpen = (v: boolean) => setOpenConvMenuId(v ? conv._id : null);
  const ddTriggerRef = React.useRef<HTMLButtonElement>(null);
  const startLongPress = () => { convLongPressTimer.current = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(40); setConvMobileSheet(conv._id); }, 500); };
  const cancelLongPress = () => { if (convLongPressTimer.current) { clearTimeout(convLongPressTimer.current); convLongPressTimer.current = null; } };
  return (
    <div className={cn('ss4-conv flex items-center gap-2.5 px-3 py-2 group', isAct && 'ss4-conv-active', isUnread && 'bg-blue-500/5', dragConvId === conv._id && 'opacity-40')}
      style={{ cursor: 'pointer', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      data-conv-before={isDraggable ? conv._id : undefined}
      data-conv-section={isDraggable ? ((conv as any).spaceId ?? '__channels__') : undefined}
      onClick={() => openConversation(conv._id)}
      onContextMenu={e => e.preventDefault()}
      onMouseLeave={() => {
        if (!ddTriggerRef.current?.matches(':focus-visible')) {
          ddTriggerRef.current?.blur();
          setActionKeyboardFocus(false);
        }
      }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onTouchMove={cancelLongPress}>
      { }
      {isDraggable && (
        <div
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            ptrStartRef.current = { x: e.clientX, y: e.clientY, type: 'conv', id: conv._id, label: cName, spaceId: (conv as any).spaceId ?? null };
          }}
          className="cursor-grab shrink-0 flex items-center opacity-0 group-hover:opacity-40 hover:opacity-80! transition-opacity"
          style={{ marginLeft: -6, padding: '0 1px' }}>
          <GripVertical className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}
      <div className="relative shrink-0">
        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center overflow-hidden', conv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(cName))}>
          {conv.type === 'group' ? <ChannelFace conv={conv} avatar={cAvatar} name={cName} size={11} /> : cAvatar ? <img src={resolveImageUrl(cAvatar)} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 10 }}>{ini(cName)}</span>}
        </div>
        {conv.type === 'direct' && online ? <PresenceAvatarDot status={otherPresence!.onlineStatus} deviceType={otherPresence?.lastDeviceType ?? undefined} />
          : isUnread ? <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--sidebar-bg)' }} /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {pinned && <Pin className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} />}
          {isMuted && <VolumeX className="h-3 w-3 shrink-0" style={{ color: 'var(--text-tertiary)' }} />}
          <p className={cn('ss4-conv-name font-semibold truncate flex-1', isUnread && 'font-bold', isMuted && 'italic')} style={{ fontSize: 17 }}>{cName}</p>
          <span
            className={cn(
              'ss4-conv-time shrink-0 group-hover:hidden',
              actionKeyboardFocus && 'hidden',
            )}
            style={{ fontSize: 11, color: 'var(--text-disabled)' }}
          >
            {fmtRelative(conv.lastMessageAt || conv.lastMessage?.createdAt)}
          </span>
        </div>
        <p className="ss4-conv-preview truncate mt-0.5" style={{ fontSize: 15, fontWeight: isUnread ? 600 : 400, color: isUnread ? 'var(--foreground)' : undefined }}>
          {hasDraftPreview ? (
            <>
              <span style={{ color: '#ef4444', fontWeight: 800 }}>Draft:</span>
              {' '}
              <span>{draftPreview}</span>
            </>
          ) : (
            <>{senderPrefix}{lastPreview}</>
          )}
        </p>
      </div>
      {!compact && (
        <div
          className={cn(
            'hidden md:flex items-center shrink-0 transition-opacity duration-150',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            actionKeyboardFocus && 'opacity-100 pointer-events-auto',
          )}
        >
          <DropdownMenu open={ddOpen} onOpenChange={setDdOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                ref={ddTriggerRef}
                type="button"
                aria-label={`More actions for ${cName}`}
                onFocus={event => {
                  setActionKeyboardFocus(
                    event.currentTarget.matches(':focus-visible'),
                  );
                }}
                onBlur={() => setActionKeyboardFocus(false)}
                onPointerDown={event => {
                  event.stopPropagation();
                  setActionKeyboardFocus(false);
                }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors hover:bg-(--bg-hover)"
                style={{ color: 'var(--text-secondary)' }}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              className="min-w-52 rounded-xl p-1"
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onCloseAutoFocus={e => e.preventDefault()}
              onPointerDownOutside={e => {
                if (ddTriggerRef.current?.contains(e.target as Node)) e.preventDefault();
              }}
              style={{ background: '#18181c', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
              <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }}
                onClick={() => {
                  if (isUnread) {
                    markRead(conv._id);
                    setManualUnread(p => { const n = new Set(p); n.delete(conv._id); return n; });
                    setConvos(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0, unreadMentionCount: 0 } : c));
                  } else {
                    setManualUnread(p => new Set([...p, conv._id]));
                  }
                }}>
                <MailOpen className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
                {isUnread ? 'Mark as read' : 'Mark as unread'}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => togglePinConv(conv)}>
                {pinned ? <PinOff className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} /> : <Pin className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />}
                {pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }}
                onClick={() => saveNotificationPref(conv._id, { type: notifPrefs[conv._id]?.type ?? 'all', muted: !isMuted })}>
                <VolumeX className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
                {isMuted ? 'Unmute' : 'Mute'}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => setNotifModalConv(conv)}>
                <Bell className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
                <span className="flex flex-col">
                  <span style={{ fontSize: 13, lineHeight: 1.3 }}>Notifications</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{(() => { const t = notifPrefs[conv._id]?.type; return t === 'foryou' ? 'For you' : t === 'none' ? 'None' : t === 'main' ? 'Main conversations' : 'All'; })()}</span>
                </span>
              </DropdownMenuItem>
              {conv.type === 'group' && ctxSpaces.length > 0 && (
                <>
                  {(conv as any).spaceId && (
                    <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => handleMoveToSpace(conv._id, null)}>
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} /> Remove from Space
                    </DropdownMenuItem>
                  )}
                  {ctxSpaces.map(sp => (sp._id !== (conv as any).spaceId) && (
                    <DropdownMenuItem key={sp._id} className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => handleMoveToSpace(conv._id, sp._id)}>
                      <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} /> Move to {sp.emoji ? `${sp.emoji} ` : ''}{sp.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 4px' }} />
              {conv.type === 'direct' && (
                <>
                  <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => toast.info('Block feature coming soon')}>
                    <UserMinus className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} /> Block
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => toggleArchiveConv(conv)}>
                    {archived ? <ArchiveRestore className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} /> : <EyeOff className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />}
                    {archived ? 'Unhide conversation' : 'Hide conversation'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#f87171' }} onClick={() => setDeleteConfirmConv(conv)}>
                    <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete conversation
                  </DropdownMenuItem>
                </>
              )}
              {conv.type === 'group' && (
                <>
                  <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#fb923c' }}
                    onClick={async () => {
                      try {
                        await apiClient.patch(`/api/supraspace/conversations/${conv._id}`, { removeMembers: [uid] }, { headers: { Authorization: `Bearer ${token}` } });
                        setConvos(p => p.filter(c => c._id !== conv._id));
                        if (activeConvId === conv._id) { setActiveId(null); setShowInfo(false); }
                        toast.success('You left the conversation.');
                      } catch { toast.error('Could not leave the conversation.'); }
                    }}>
                    <LogOut className="h-3.5 w-3.5 shrink-0" /> Leave
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 rounded-lg cursor-pointer" style={{ fontSize: 13, color: '#e8e8ea' }} onClick={() => toast.info('Block feature coming soon')}>
                    <UserMinus className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} /> Block
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {compact && (
        <button onClick={e => { e.stopPropagation(); toggleArchiveConv(conv); }} className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ color: 'var(--text-tertiary)' }} title="Unarchive"><ArchiveRestore className="h-3 w-3" /></button>
      )}
    </div>
  );
}

export default function SupraSpacePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const embedded = pathname !== '/crm/supra-space';
  const { theme, setTheme } = useTheme();
  const { getToken: getMainToken } = useAuth();
  const uploadNoticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [token, setToken] = React.useState('');
  const [uid, setUid] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const [convos, setConvos] = React.useState<SSConversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeIdRef = React.useRef<string | null>(null);
  React.useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const inConvHistoryRef = React.useRef(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeId && !inConvHistoryRef.current) {
      inConvHistoryRef.current = true;
      history.pushState({ supraspace: 'conv' }, '');
    } else if (!activeId) {
      inConvHistoryRef.current = false;
    }
  }, [activeId]);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => { if (activeIdRef.current) setActiveId(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('supraspace:conv-state', { detail: { active: !!activeId } }));
    return () => {
      window.dispatchEvent(new CustomEvent('supraspace:conv-state', { detail: { active: false } }));
    };
  }, [activeId]);

  const [msgs, setMsgs] = React.useState<Record<string, SSMessage[]>>({});
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [hasMore, setHasMore] = React.useState<Record<string, boolean>>({});
  const [msgFetchState, setMsgFetchState] = React.useState<Record<string, 'idle' | 'loading' | 'loaded' | 'error' | 'stale'>>({});

  const [input, setInput] = React.useState('');
  const inputTextRef = React.useRef('');
  const pastedPlainTextRef = React.useRef('');
  const [composerHasText, setComposerHasText] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<SSMessage | null>(null);
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const dragCounterRef = React.useRef(0);
  const [pendingMeeting, setPendingMeeting] = React.useState<PendingMeetingDraft | null>(null);
  const [pendingGif, setPendingGif] = React.useState<{ url: string; width?: number; height?: number; title?: string } | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [customScheduleAt, setCustomScheduleAt] = React.useState('');
  const sendLongPressRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendLongPressTriggeredRef = React.useRef(false);
  const [uploadNotice, setUploadNotice] = React.useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);
  const [messageScrollActive, setMessageScrollActive] = React.useState(false);
  const messageScrollIdleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the *user* is actively driving the scroll (wheel/touch/scrollbar
  // drag) vs. a programmatic scroll (auto-scroll-to-bottom, pin-to-bottom, pagination
  // restore). Only real user gestures should suppress hover actions/reaction popovers —
  // otherwise every app-driven scroll slams open reaction tooltips shut mid-interaction.
  const userScrollGestureRef = React.useRef(false);
  const userScrollGestureTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const markUserScrollGesture = React.useCallback((event?: React.SyntheticEvent) => {
    const target = event?.target as HTMLElement | null;
    if (target?.closest('[data-supraspace-action-ui="true"]')) return;

    userScrollGestureRef.current = true;
    if (userScrollGestureTimerRef.current) clearTimeout(userScrollGestureTimerRef.current);
    userScrollGestureTimerRef.current = setTimeout(() => { userScrollGestureRef.current = false; }, 400);
  }, []);

  const [showModal, setShowModal] = React.useState<{ open: boolean; tab: 'dm' | 'group' | 'space' }>({ open: false, tab: 'dm' });
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [collapsedSpaces, setCollapsedSpaces] = React.useState<Set<string>>(new Set());
  const [dragConvId, setDragConvId] = React.useState<string | null>(null);
  const [dropSpaceId, setDropSpaceId] = React.useState<string | null>(null);
  const [dragSpaceId, setDragSpaceId] = React.useState<string | null>(null);
  const [dropBeforeSpaceId, setDropBeforeSpaceId] = React.useState<string | null>(null);
  const [localConvOrder, setLocalConvOrder] = React.useState<string[]>([]);
  const [dropConvBeforeId, setDropConvBeforeId] = React.useState<string | null>(null);
  const dragGhostRef = React.useRef<HTMLDivElement | null>(null);
  const ptrStartRef = React.useRef<{ x: number; y: number; type: 'conv' | 'space'; id: string; label: string; spaceId?: string | null } | null>(null);
  const ptrActiveRef = React.useRef(false);
  const ptrDropZoneRef = React.useRef<string | null>(null);
  const ptrDropConvBeforeRef = React.useRef<string | null>(null);
  const handleMoveToSpaceRef = React.useRef<(convId: string, spaceId: string | null) => void>(() => { });
  const handleSpaceDropRef = React.useRef<(fromId: string, beforeId: string) => void>(() => { });
  const handleReorderConvRef = React.useRef<(fromId: string, beforeId: string) => void>(() => { });
  const [localSpaceOrder, setLocalSpaceOrder] = React.useState<string[]>([]);
  const [deleteSpaceConfirm, setDeleteSpaceConfirm] = React.useState<string | null>(null);
  const [allUsers, setAllUsers] = React.useState<CrmUser[]>([]);
  const [forwardMsg, setForwardMsg] = React.useState<SSMessage | null>(null);
  const [notifModalConv, setNotifModalConv] = React.useState<SSConversation | null>(null);
  const [manualUnread, setManualUnread] = React.useState<Set<string>>(new Set());
  // Keep one conversation menu open at a time. ConvRow is hoisted to module
  // scope, so socket, typing, presence, and composer renders no longer remount it.
  const [openConvMenuId, setOpenConvMenuId] = React.useState<string | null>(null);
  const [q, setQ] = React.useState('');
  const [conversationFilter, setConversationFilter] = React.useState<ConversationFilter>('all');

  const [autrixOpen, setAutrixOpen] = React.useState(false);
  const [autrixLoading, setAutrixLoading] = React.useState(false);
  const [showFormatBar, setShowFormatBar] = React.useState(false);
  const [pasteMode, setPasteMode] = React.useState<PasteMode>('formatted');
  const pastePlainTextShortcutRef = React.useRef(false);
  const [activeFormats, setActiveFormats] = React.useState<Record<RichTextFormat, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    list: false,
    numbered: false,
    quote: false,
    code: false,
  });
  const [activeTextColor, setActiveTextColor] = React.useState('#ffffff');
  const [textPalette, setTextPalette] = React.useState(SS4_TEXT_COLORS);
  const [textColorPickerOpen, setTextColorPickerOpen] = React.useState(false);
  const autrixRef = React.useRef<HTMLDivElement>(null);

  const [showInfo, setShowInfo] = React.useState(false);
  const [infoTab, setInfoTab] = React.useState<'members' | 'media' | 'files' | 'pinned' | 'search'>('members');
  const [convSearchQuery, setConvSearchQuery] = React.useState('');
  const [convSearchResults, setConvSearchResults] = React.useState<any[]>([]);
  const [convSearching, setConvSearching] = React.useState(false);
  React.useEffect(() => {
    if (infoTab !== 'search' || !token || !activeId || convSearchQuery.trim().length < 2) {
      setConvSearchResults([]);
      return;
    }
    setConvSearching(true);
    const t = setTimeout(() => {
      apiClient.get('/api/supraspace/search', { headers: { Authorization: `Bearer ${token}` }, params: { q: convSearchQuery.trim(), conversationId: activeId } })
        .then(r => setConvSearchResults(r.data?.data || [])).catch(() => setConvSearchResults([])).finally(() => setConvSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [infoTab, convSearchQuery, activeId, token]);
  const [ssMediaItems, setSsMediaItems] = React.useState<Array<{ messageId: string; createdAt: string; attachment: SSAttachment }>>([]);
  const [ssFileItems, setSsFileItems] = React.useState<Array<{ messageId: string; createdAt: string; attachment: SSAttachment }>>([]);
  const [ssAttachmentsLoading, setSsAttachmentsLoading] = React.useState(false);

  // Files/Media tab: query the whole conversation directly from the DB rather than
  // filtering only the currently-loaded page of messages — a DM can easily have its
  // one shared file sitting further back than the last ~40 loaded messages.
  React.useEffect(() => {
    if (!showInfo || !activeId || !token) return;
    if (infoTab !== 'media' && infoTab !== 'files') return;
    let cancelled = false;
    setSsAttachmentsLoading(true);
    apiClient
      .get(`/api/supraspace/conversations/${activeId}/attachments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: infoTab, limit: 60 },
      })
      .then((r) => {
        if (cancelled) return;
        const items = r.data?.data?.items || [];
        if (infoTab === 'media') setSsMediaItems(items); else setSsFileItems(items);
      })
      .catch(() => { if (!cancelled) { if (infoTab === 'media') setSsMediaItems([]); else setSsFileItems([]); } })
      .finally(() => { if (!cancelled) setSsAttachmentsLoading(false); });
    return () => { cancelled = true; };
  }, [showInfo, activeId, infoTab, token]);
  const [pinnedMsgIds, setPinnedMsgIds] = React.useState<Set<string>>(new Set());
  const [pinnedModalOpen, setPinnedModalOpen] = React.useState(false);
  const [pinEvents, setPinEvents] = React.useState<Array<{ id: string; pinnerName: string; msgId: string }>>([]);
  const [editingGcName, setEditingGcName] = React.useState(false);
  const [gcNameInput, setGcNameInput] = React.useState('');
  const [gcEmojiInput, setGcEmojiInput] = React.useState('');
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const emojiRef = React.useRef<HTMLDivElement>(null);
  const mobileEmojiRef = React.useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = React.useState<{ src: string; type: 'image' | 'video'; name: string } | null>(null);
  const [memberCard, setMemberCard] = React.useState<{ member: SSConversation['members'][number]; pos: { x: number; y: number } } | null>(null);
  const avatarFileRef = React.useRef<HTMLInputElement>(null);

  const [showArchived, setShowArchived] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [pollOpen, setPollOpen] = React.useState(false);
  const [eventOpen, setEventOpen] = React.useState(false);
  const [meetingOpen, setMeetingOpen] = React.useState(false);
  const [meetingMenuOpen, setMeetingMenuOpen] = React.useState(false);
  const [meetingLinkInfo, setMeetingLinkInfo] = React.useState<string | null>(null);
  const [meetingActionLoading, setMeetingActionLoading] = React.useState<'later' | 'instant' | null>(null);
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = React.useState(false);
  const [gifOpen, setGifOpen] = React.useState(false);
  const [activeUsersOpen, setActiveUsersOpen] = React.useState(false);
  const [summarizeOpen, setSummarizeOpen] = React.useState(false);
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false);
  const createMenuRef = React.useRef<HTMLDivElement>(null);
  const meetingMenuRef = React.useRef<HTMLDivElement>(null);
  const gifRef = React.useRef<HTMLDivElement>(null);
  const mobileGifRef = React.useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [convMobileSheet, setConvMobileSheet] = React.useState<string | null>(null);
  const [deleteConfirmConv, setDeleteConfirmConv] = React.useState<SSConversation | null>(null);
  const convLongPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recording, setRecording] = React.useState(false);
  const [recSeconds, setRecSeconds] = React.useState(0);
  const recSecondsRef = React.useRef(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recChunksRef = React.useRef<Blob[]>([]);
  const recTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const recStreamRef = React.useRef<MediaStream | null>(null);

  const [msgResults, setMsgResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);

  const endRef = React.useRef<HTMLDivElement>(null);
  const messageScrollRef = React.useRef<HTMLDivElement>(null);
  const pendingScrollRestoreRef = React.useRef<{ convId: string; scrollHeight: number; scrollTop: number } | null>(null);
  const forceScrollToBottomRef = React.useRef<string | null>(null);
  const openBottomLockUntilRef = React.useRef(0);
  const openScrollTimersRef = React.useRef<number[]>([]);
  const openBottomReleaseTimerRef = React.useRef<number | null>(null);
  const suppressAutoScrollOnceRef = React.useRef(false);
  const emptyHistoryRetryRef = React.useRef<Record<string, number>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLDivElement>(null);
  const composerCaretOffsetRef = React.useRef<number | null>(null);
  const composerSelectionRangeRef = React.useRef<Range | null>(null);
  const typingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgsRef = React.useRef<Record<string, SSMessage[]>>({});
  const pendingNotificationTargetRef = React.useRef<{ conversationId: string; messageId?: string } | null>(null);
  const composerDraftsRef = React.useRef<Record<string, string>>({});
  const previousComposerConversationRef = React.useRef<string | null>(null);
  const [composerDraftPreviews, setComposerDraftPreviews] = React.useState<Record<string, string>>({});
  React.useEffect(() => { msgsRef.current = msgs; }, [msgs]);

  const syncComposerText = React.useCallback((value: string, commitToState = false) => {
    inputTextRef.current = value;
    const hasText = Boolean(value.trim());
    setComposerHasText(prev => prev === hasText ? prev : hasText);
    if (commitToState) setInput(value);
  }, []);

  React.useEffect(() => {
    inputTextRef.current = input;
    setComposerHasText(Boolean(input.trim()));
  }, [input]);

  const setConversationDraft = React.useCallback((conversationId: string, value: string) => {
    if (value.trim()) {
      composerDraftsRef.current[conversationId] = value;
      setComposerDraftPreviews(prev => prev[conversationId] === value ? prev : { ...prev, [conversationId]: value });
    } else {
      delete composerDraftsRef.current[conversationId];
      setComposerDraftPreviews(prev => {
        if (!(conversationId in prev)) return prev;
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    }
  }, []);

  React.useEffect(() => {
    const conversationId = activeIdRef.current;
    if (!conversationId) return;
    setConversationDraft(conversationId, inputTextRef.current);
  }, [input, setConversationDraft]);

  const pinMessageViewportToBottom = React.useCallback((conversationId = activeIdRef.current) => {
    if (conversationId && activeIdRef.current !== conversationId) return;
    const el = messageScrollRef.current;
    if (!el) return;
    const messageNodes = Array.from(el.querySelectorAll<HTMLElement>('[id^="ss4-msg-"]'));
    const latestNode = messageNodes[messageNodes.length - 1];
    if (latestNode && latestNode.offsetHeight > el.clientHeight * 0.62) {
      el.scrollTop = Math.max(0, latestNode.offsetTop - 16);
    } else {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    }
    setShowJumpToLatest(false);
  }, []);

  const scrollToLatest = React.useCallback((behavior: ScrollBehavior = 'smooth', conversationId = activeIdRef.current) => {
    if (conversationId) forceScrollToBottomRef.current = conversationId;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (conversationId && activeIdRef.current !== conversationId) return;
        pinMessageViewportToBottom(conversationId);
        if (behavior !== 'auto') {
          endRef.current?.scrollIntoView({ behavior, block: 'end' });
        }
        if (Date.now() > openBottomLockUntilRef.current) {
          forceScrollToBottomRef.current = null;
        }
      });
    });
  }, [pinMessageViewportToBottom]);

  const lockConversationOpenToBottom = React.useCallback((conversationId: string) => {
    openScrollTimersRef.current.forEach(clearTimeout);
    openScrollTimersRef.current = [];
    if (openBottomReleaseTimerRef.current) window.clearTimeout(openBottomReleaseTimerRef.current);
    openBottomReleaseTimerRef.current = null;
    pendingScrollRestoreRef.current = null;
    suppressAutoScrollOnceRef.current = false;
    forceScrollToBottomRef.current = conversationId;
    openBottomLockUntilRef.current = Date.now() + 6500;

    [0, 50, 120, 240, 420, 720, 1200, 2000, 3200, 4800, 6500].forEach(delay => {
      const timer = window.setTimeout(() => {
        if (activeIdRef.current !== conversationId) return;
        scrollToLatest('auto', conversationId);
      }, delay);
      openScrollTimersRef.current.push(timer);
    });

    openBottomReleaseTimerRef.current = window.setTimeout(() => {
      if (activeIdRef.current === conversationId) {
        pinMessageViewportToBottom(conversationId);
      }
      if (forceScrollToBottomRef.current === conversationId) {
        forceScrollToBottomRef.current = null;
      }
      openBottomReleaseTimerRef.current = null;
    }, 6700);
  }, [scrollToLatest]);

  // Cancels the "just opened this conversation" pin-to-bottom lock. Called the moment
  // a *real* user scroll gesture happens while the lock is still active — otherwise the
  // queued re-pin timers/ResizeObserver would yank the view back to the bottom a moment
  // after the user manually scrolled up, which read as "it opens, I scroll up, then it
  // snaps back down."
  const cancelOpenBottomLock = React.useCallback(() => {
    openScrollTimersRef.current.forEach(clearTimeout);
    openScrollTimersRef.current = [];
    if (openBottomReleaseTimerRef.current) { window.clearTimeout(openBottomReleaseTimerRef.current); openBottomReleaseTimerRef.current = null; }
    forceScrollToBottomRef.current = null;
    openBottomLockUntilRef.current = 0;
  }, []);

  React.useEffect(() => {
    return () => {
      openScrollTimersRef.current.forEach(clearTimeout);
      openScrollTimersRef.current = [];
      if (openBottomReleaseTimerRef.current) window.clearTimeout(openBottomReleaseTimerRef.current);
      openBottomReleaseTimerRef.current = null;
    };
  }, []);

  // @mention state
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState<number>(-1);
  const [mentionIdx, setMentionIdx] = React.useState(0);

  // #channel-mention state
  const [channelMentionQuery, setChannelMentionQuery] = React.useState<string | null>(null);
  const [channelMentionAnchor, setChannelMentionAnchor] = React.useState<number>(-1);
  const [channelMentionIdx, setChannelMentionIdx] = React.useState(0);

  const { socket, isConnected, presence, typing, joinConversation, leaveConversation, sendTypingStart, sendTypingStop, markRead, markAllRead } = useSupraSpaceSocket(token || null);
  const { markAsRead: ctxMarkAsRead, spaces: ctxSpaces, refreshSpaces, conversations: ctxConversations, refreshConversations: ctxRefreshConvos, notifPrefs, setNotifPrefs } = useSupraSpaceMessenger();
  const saveNotificationPref = React.useCallback((conversationId: string, pref: { type: 'all' | 'main' | 'foryou' | 'none'; muted: boolean }) => {
    const previousPref =
      notifPrefs[conversationId] ||
      convos.find(conv => conv._id === conversationId)?.notificationPreference ||
      { type: 'all' as const, muted: false };
    setNotifPrefs(prev => ({ ...prev, [conversationId]: pref }));
    setConvos(prev => prev.map(conv => conv._id === conversationId ? { ...conv, notificationPreference: pref } : conv));
    if (!token) return;
    apiClient.patch(`/api/supraspace/conversations/${conversationId}/notifications`, pref, {
      headers: { Authorization: `Bearer ${token}` },
      _skipAuthRefresh: true,
    } as any).then((res) => {
      const saved = res.data?.data || pref;
      setNotifPrefs(prev => ({ ...prev, [conversationId]: saved }));
      setConvos(prev => prev.map(conv => conv._id === conversationId ? { ...conv, notificationPreference: saved } : conv));
    }).catch(() => {
      setNotifPrefs(prev => ({ ...prev, [conversationId]: previousPref }));
      setConvos(prev => prev.map(conv => conv._id === conversationId ? { ...conv, notificationPreference: previousPref } : conv));
      toast.error('Could not save notification settings');
    });
  }, [convos, notifPrefs, setNotifPrefs, token]);

  const activeConv = convos.find(c => c._id === activeId);
  const activeMsgs = activeId ? (msgs[activeId] || []) : [];
  const activePinnedMsgs = React.useMemo(
    () => activeMsgs.filter(m => pinnedMsgIds.has(m._id) && !m.isDeleted),
    [activeMsgs, pinnedMsgIds],
  );
  const activeMsgStatus = activeId ? (msgFetchState[activeId] || 'idle') : 'idle';
  const activeConvHasHistorySignal = Boolean(activeConv?.lastMessage || activeConv?.lastMessageAt);
  const msgSeenByMembers = React.useMemo(() => {
    const freshAvatar: Record<string, string | undefined> = {};
    const freshName: Record<string, string | undefined> = {};
    activeMsgs.forEach(m => {
      if (m.sender?._id && !freshAvatar[m.sender._id]) {
        freshAvatar[m.sender._id] = m.sender.avatar;
        freshName[m.sender._id] = m.sender.fullName;
      }
    });
    const lastSeen: Record<string, string> = {};
    activeMsgs.forEach(m => { (m.readBy || []).forEach((id: string) => { if (id !== uid) lastSeen[id] = m._id; }); });
    const result: Record<string, { _id: string; fullName: string; avatar?: string }[]> = {};
    (activeConv ? safeMembers(activeConv) : []).forEach(member => {
      if (member._id === uid) return;
      const lastMsgId = lastSeen[member._id];
      if (lastMsgId) {
        if (!result[lastMsgId]) result[lastMsgId] = [];
        result[lastMsgId].push({
          ...member,
          avatar: freshAvatar[member._id] ?? member.avatar,
          fullName: freshName[member._id] ?? member.fullName,
        });
      }
    });
    return result;
  }, [activeMsgs, activeConv, uid]);
  const isAdmin = !!(activeConv && (
    (activeConv.admins || []).map(String).includes(uid) ||
    String((activeConv as any).createdBy) === uid
  ));
  const isReportGroup = /^DayPulse Reports$/i.test(activeConv?.name || '');
  const isShiftAlertsGroup = /^Shift Alerts$/i.test(activeConv?.name || '');

  const isPinnedConv = React.useCallback((c: SSConversation) => (c.pinnedBy || []).map(String).includes(uid), [uid]);
  const isArchivedConv = React.useCallback((c: SSConversation) => (c.archivedBy || []).map(String).includes(uid), [uid]);

  const nameMap = React.useMemo(() => {
    const m: Record<string, string> = { [uid]: 'You' };
    allUsers.forEach(u => { m[u._id] = u.fullName; });
    convos.forEach(c => c.members.forEach(mem => { if (!m[mem._id]) m[mem._id] = mem.fullName; }));
    return m;
  }, [allUsers, convos, uid]);
  const nameFor = React.useCallback((id: string) => nameMap[id] || 'Someone', [nameMap]);

  const patchConv = React.useCallback((id: string, patch: Partial<SSConversation> | ((c: SSConversation) => SSConversation)) => {
    setConvos(p => p.map(c => c._id === id ? (typeof patch === 'function' ? patch(c) : { ...c, ...patch }) : c));
  }, []);
  const patchMsg = React.useCallback((convId: string, msgId: string, patch: Partial<SSMessage>) => {
    setMsgs(p => ({ ...p, [convId]: (p[convId] || []).map(m => m._id === msgId ? { ...m, ...patch } : m) }));
  }, []);

  const showUploadNotice = React.useCallback((kind: 'success' | 'error' | 'info', text: string) => {
    if (uploadNoticeTimerRef.current) clearTimeout(uploadNoticeTimerRef.current);
    setUploadNotice({ kind, text });
    uploadNoticeTimerRef.current = setTimeout(() => setUploadNotice(null), 3500);
  }, []);
  const me = React.useMemo(() => allUsers.find(u => u._id === uid), [allUsers, uid]);

  const appendMessageLocal = React.useCallback((conversationId: string, message: SSMessage) => {
    // Only splice into a conversation's message cache if that history has actually been
    // fetched before (conversationId already a key in msgsRef.current) — NOT just "has at
    // least one message", since a live event can be the very first thing this client ever
    // sees for a conversation it hasn't opened yet this session (e.g. a background channel
    // like Shift Alerts). Seeding the cache with just that one message would make
    // fetchConversationMessages's "already cached, skip the fetch" check (and the matching
    // msgFetchState — see below) think the FULL history is already loaded, so opening that
    // conversation for the first time would silently skip the real fetch and show only
    // whatever trickled in live instead of the actual history.
    const alreadyLoaded = conversationId in msgsRef.current;
    if (alreadyLoaded) {
      setMsgs(p => {
        const ex = p[conversationId] || [];
        if (ex.find(m => m._id === message._id)) return p;
        const withoutMatchingOptimistic = ex.filter(m => !(
          m._id.startsWith('optimistic-') &&
          m.sender?._id === message.sender?._id &&
          m.content === message.content &&
          m.type === message.type &&
          Math.abs(new Date(message.createdAt).getTime() - new Date(m.createdAt).getTime()) < 30000
        ));
        return { ...p, [conversationId]: [...withoutMatchingOptimistic, message] };
      });
      setMsgFetchState(p => ({ ...p, [conversationId]: 'loaded' }));
    }
    setConvos(p => p.map(c => {
      if (c._id !== conversationId) return c;
      const isIncomingUnread = message.sender?._id !== uid && !message.readBy?.includes(uid) && conversationId !== activeIdRef.current;
      const isIncomingMention = message.sender?._id !== uid && contentMentionsUser(message.content, me?.fullName, me?.username);
      const isIncomingUnreadMention = isIncomingUnread && isIncomingMention;
      return {
        ...c,
        lastMessage: message,
        lastMessageAt: message.createdAt,
        unreadCount: isIncomingUnread ? (c.unreadCount || 0) + 1 : 0,
        mentionCount: isIncomingMention ? (c.mentionCount || 0) + 1 : c.mentionCount || 0,
        unreadMentionCount: isIncomingUnreadMention ? (c.unreadMentionCount || 0) + 1 : (conversationId === activeIdRef.current ? 0 : c.unreadMentionCount || 0),
      };
    })
      .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
  }, [uid, me?.fullName, me?.username]);

  const replaceMessageLocal = React.useCallback((conversationId: string, tempId: string, message: SSMessage) => {
    setMsgs(p => {
      const ex = p[conversationId] || [];
      if (ex.find(m => m._id === message._id)) return { ...p, [conversationId]: ex.filter(m => m._id !== tempId) };
      return { ...p, [conversationId]: ex.map(m => m._id === tempId ? message : m) };
    });
    setConvos(p => p.map(c => c._id === conversationId && c.lastMessage?._id === tempId
      ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
      : c
    ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
  }, []);

  const removeMessageLocal = React.useCallback((conversationId: string, messageId: string) => {
    setMsgs(p => ({ ...p, [conversationId]: (p[conversationId] || []).filter(m => m._id !== messageId) }));
    setConvos(p => p.map(c => c._id === conversationId && c.lastMessage?._id === messageId
      ? { ...c, lastMessage: undefined, lastMessageAt: undefined }
      : c
    ));
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const call = useCall(socket, token, uid);
  const [activeMeeting, setActiveMeeting] = React.useState<CallSession | null>(null);
  const activeMeetingRef = React.useRef<CallSession | null>(null);
  React.useEffect(() => { activeMeetingRef.current = activeMeeting; }, [activeMeeting]);
  const [callRecording, setCallRecording] = React.useState<{ isRecording: boolean; startedAt: string | null } | null>(null);

  React.useEffect(() => {
    if (!socket) return;
    const onStarted = (data: { meetingId: string; recordingStartedAt: string }) => {
      setCallRecording({ isRecording: true, startedAt: data.recordingStartedAt });
    };
    const onStopped = () => setCallRecording(null);
    socket.on('call:recording-started', onStarted);
    socket.on('call:recording-stopped', onStopped);
    return () => {
      socket.off('call:recording-started', onStarted);
      socket.off('call:recording-stopped', onStopped);
    };
  }, [socket]);
  const handleStartCall = React.useCallback(async (conv: SSConversation) => {
    try { setActiveMeeting(await call.startCall(conv._id)); }
    catch (e) { showUploadNotice('error', getErrorMessage(e, 'Could not start the call.')); }
  }, [call, showUploadNotice]);

  const handleJoinCall = React.useCallback(async (meetingId: string) => {
    try { setActiveMeeting(await call.joinCall(meetingId)); }
    catch (e: unknown) {
      const responseStatus = (e as { response?: { status?: number } })?.response?.status;
      if (responseStatus === 202) {
        toast('Waiting for host approval');
        return;
      }
      showUploadNotice('error', getErrorMessage(e, 'Could not join the call.'));
    }
  }, [call, showUploadNotice]);

  const handleLeaveCall = React.useCallback(async () => {
    const mId = activeMeeting?.call?.meetingId;
    setActiveMeeting(null);
    if (mId) await call.endCall(mId);
  }, [activeMeeting, call]);

  const getMainTokenRef = React.useRef(getMainToken);
  getMainTokenRef.current = getMainToken;

  const tokenRef = React.useRef(token);
  React.useEffect(() => { tokenRef.current = token; }, [token]);
  const convosRef = React.useRef<SSConversation[]>([]);
  React.useEffect(() => { convosRef.current = convos; }, [convos]);
  const msgFetchStateRef = React.useRef(msgFetchState);
  React.useEffect(() => { msgFetchStateRef.current = msgFetchState; }, [msgFetchState]);

  const initDoneRef = React.useRef(false);

  const ctxRefreshConvosRef = React.useRef(ctxRefreshConvos);
  React.useEffect(() => { ctxRefreshConvosRef.current = ctxRefreshConvos; }, [ctxRefreshConvos]);

  const fetchConversationMessages = React.useCallback(async (
    conversationId: string,
    options: { force?: boolean; silent?: boolean; scrollToBottom?: boolean } = {},
  ) => {
    const t = tokenRef.current;
    if (!conversationId || !t) return false;

    if (!options.force && conversationId in msgsRef.current) return true;

    const prevStatus = msgFetchStateRef.current[conversationId];
    if (prevStatus === 'loading' && options.silent) return false;

    if (!options.silent) setLoadingMsgs(true);
    setMsgFetchState(p => ({ ...p, [conversationId]: 'loading' }));

    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${t}` },
        params: { limit: 40 },
      });
      const d: SSMessage[] = r.data?.data || [];
      const conv = convosRef.current.find(c => c._id === conversationId);
      const hasHistorySignal = Boolean(conv?.lastMessage || conv?.lastMessageAt);
      const rejectSuspiciousEmpty = d.length === 0 && hasHistorySignal;

      setMsgs(p => {
        if (rejectSuspiciousEmpty) return p;
        return { ...p, [conversationId]: d };
      });
      setHasMore(p => ({ ...p, [conversationId]: d.length === 40 }));
      setMsgFetchState(p => ({
        ...p,
        [conversationId]: rejectSuspiciousEmpty ? 'stale' : 'loaded',
      }));
      if (!rejectSuspiciousEmpty) {
        emptyHistoryRetryRef.current[conversationId] = 0;
        if (options.scrollToBottom) forceScrollToBottomRef.current = conversationId;
      } else {
        const retries = emptyHistoryRetryRef.current[conversationId] || 0;
        if (retries < 2) {
          emptyHistoryRetryRef.current[conversationId] = retries + 1;
          window.setTimeout(() => {
            fetchConversationMessages(conversationId, {
              force: true,
              silent: true,
              scrollToBottom: options.scrollToBottom,
            });
          }, 450 * (retries + 1));
        }
      }
      return !rejectSuspiciousEmpty;
    } catch {
      setMsgFetchState(p => ({ ...p, [conversationId]: 'error' }));
      return false;
    } finally {
      if (!options.silent) setLoadingMsgs(false);
    }
  }, []);

  const openConversation = React.useCallback((conversationId: string | null) => {
    if (!conversationId) return;
    pendingScrollRestoreRef.current = null;
    forceScrollToBottomRef.current = conversationId;
    suppressAutoScrollOnceRef.current = false;
    setShowJumpToLatest(false);
    setShowInfo(false);
    setActiveId(conversationId);
    setManualUnread(p => { if (!p.has(conversationId)) return p; const n = new Set(p); n.delete(conversationId); return n; });

    const hasCachedMessages = conversationId in msgsRef.current;
    const status = msgFetchStateRef.current[conversationId] || 'idle';
    fetchConversationMessages(conversationId, {
      force: !hasCachedMessages || status === 'error' || status === 'stale',
      silent: hasCachedMessages && status === 'loaded',
      scrollToBottom: true,
    });

    lockConversationOpenToBottom(conversationId);
  }, [fetchConversationMessages, lockConversationOpenToBottom]);

  const refreshConvos = React.useCallback(() => {
    const t = tokenRef.current;
    if (!t || !initDoneRef.current) return;
    ctxRefreshConvosRef.current();
    apiClient
      .get('/api/supraspace/conversations', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => {
        const fresh: SSConversation[] = r.data?.data || [];
        setConvos(prev => {
          const freshIds = new Set(fresh.map(c => c._id));
          const localOnly = prev.filter(c => !freshIds.has(c._id));
          return [...fresh, ...localOnly];
        });
      })
      .catch(() => { });
  }, []);

  React.useEffect(() => {
    if (!ctxConversations.length) return;
    setConvos(prev => {
      const prevIds = new Set(prev.map(c => c._id));
      const missing = ctxConversations.filter(c => !prevIds.has(c._id));
      if (!missing.length) return prev;
      return [
        ...prev,
        ...missing.map(c => ({
          ...c,
          admins: (c as any).admins || [],
          theme: { accent: c.theme?.accent ?? null, bubble: null, wallpaper: null, emoji: null },
        } as unknown as SSConversation)),
      ];
    });
  }, [ctxConversations]);

  React.useEffect(() => {
    (async () => {
      let t = localStorage.getItem('crm_token');
      if (t && getJwtType(t) !== 'crm') {
        localStorage.removeItem('crm_token');
        t = null;
      }

      if (!t) {
        try {
          const mainToken = await getMainTokenRef.current();
          if (mainToken) {
            const sso = await apiClient.get('/api/auth/crm-sso', { headers: { Authorization: `Bearer ${mainToken}` } });
            t = sso.data?.data?.token ?? null;
            if (t) localStorage.setItem('crm_token', t);
          }
        } catch { }
      }

      if (!t) {
        try {
          const mainToken = await getMainTokenRef.current();
          if (mainToken) {
            const sso = await apiClient.post('/api/supraspace/session-token', {}, { headers: { Authorization: `Bearer ${mainToken}` } });
            t = sso.data?.data?.token ?? null;
            if (t) localStorage.setItem('crm_token', t);
          }
        } catch { }
      }

      if (!t) { router.replace('/crm'); return; }
      setToken(t);

      try {
        const [me, cv, us] = await Promise.all([
          apiClient.get('/api/crm/me', { headers: { Authorization: `Bearer ${t}` } }),
          apiClient.get('/api/supraspace/conversations', { headers: { Authorization: `Bearer ${t}` } }),
          apiClient.get('/api/supraspace/users', { headers: { Authorization: `Bearer ${t}` } }),
        ]);
        setUid((me.data?.data || me.data)._id);
        const fetchedConvos: SSConversation[] = cv.data?.data || [];
        setConvos(fetchedConvos);
        setAllUsers(us.data?.data || []);

        const urlParams = new URLSearchParams(window.location.search);
        const pendingNotificationConversationId = urlParams.get('conversationId');
        const pendingNotificationMessageId = urlParams.get('messageId');
        if (
          pendingNotificationConversationId &&
          fetchedConvos.some(c => c._id === pendingNotificationConversationId)
        ) {
          pendingNotificationTargetRef.current = {
            conversationId: pendingNotificationConversationId,
            messageId: pendingNotificationMessageId || undefined,
          };
          openConversation(pendingNotificationConversationId);

          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('conversationId');
          cleanUrl.searchParams.delete('messageId');
          window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
        }

        const pendingMeetingId = urlParams.get('meeting');
        if (pendingMeetingId) {
          try {
            const joinRes = await apiClient.post('/api/calls/join', { meetingId: pendingMeetingId }, { headers: { Authorization: `Bearer ${t}` } });
            if (joinRes.status === 202 || joinRes.data?.data?.status === 'pending') {
              toast('Waiting for host approval');
            } else if (joinRes.data?.data?.jitsi) {
              const session = joinRes.data.data as CallSession;
              const convId = session.call?.conversationId;
              if (convId && fetchedConvos.some(c => c._id === String(convId))) openConversation(String(convId));
              setActiveMeeting(session);
            }
            router.replace('/crm/supra-space', { scroll: false });
          } catch (meetingErr: unknown) {
            const message = (meetingErr as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || 'Could not open meeting');
          }
        }

        const pendingUserId = urlParams.get('userId');
        if (pendingUserId) {
          try {
            const dmRes = await apiClient.post(
              '/api/supraspace/conversations/direct',
              { targetUserId: pendingUserId },
              { headers: { Authorization: `Bearer ${t}` } }
            );
            const c = dmRes.data?.data;
            if (c) {
              setConvos((p) => (p.find((x) => x._id === c._id) ? p : [c, ...p]));
              openConversation(c._id);
              router.replace('/crm/supra-space', { scroll: false });
            }
          } catch (dmErr: any) {
            console.error('[SupraSpace] Auto-open DM failed during init:', dmErr);
            toast.error(dmErr?.response?.data?.message || 'Could not open conversation');
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('crm_token');
          router.replace('/crm');
        }
      }
      finally { setLoading(false); initDoneRef.current = true; }
    })();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (loading) return;
    const onFocus = () => {
      refreshConvos();
      if (activeIdRef.current) {
        fetchConversationMessages(activeIdRef.current, { force: true, silent: true });
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loading, refreshConvos, fetchConversationMessages]);

  React.useEffect(() => {
    if (loading) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refreshConvos();
      if (activeIdRef.current) {
        fetchConversationMessages(activeIdRef.current, { force: true, silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loading, refreshConvos, fetchConversationMessages]);

  React.useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      refreshConvos();
      if (activeIdRef.current) {
        fetchConversationMessages(activeIdRef.current, { force: true, silent: true });
      }
    };
    socket.on('connect', onReconnect);
    return () => { socket.off('connect', onReconnect); };
  }, [socket, refreshConvos, fetchConversationMessages]);

  React.useEffect(() => () => { if (uploadNoticeTimerRef.current) clearTimeout(uploadNoticeTimerRef.current); }, []);

  const targetConvId = searchParams.get('convId');
  React.useEffect(() => {
    if (loading || !targetConvId) return;
    openConversation(targetConvId);
    router.replace('/crm/supra-space', { scroll: false });
  }, [loading, targetConvId, router]);

  React.useEffect(() => {
    const target = pendingNotificationTargetRef.current;
    if (!target || target.conversationId !== activeId) return;

    if (!target.messageId) {
      scrollToLatest('auto', target.conversationId);
      pendingNotificationTargetRef.current = null;
      return;
    }

    const conversationMessages = msgs[target.conversationId] || [];
    if (!conversationMessages.some(message => message._id === target.messageId)) return;

    window.setTimeout(() => {
      const el = document.getElementById(`ss4-msg-${target.messageId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el) {
        el.classList.remove('ss4-msg-highlight');
        // Force a reflow so re-adding the class restarts the flash animation even if
        // the same message was just jumped to a moment ago.
        void el.offsetWidth;
        el.classList.add('ss4-msg-highlight');
        window.setTimeout(() => el.classList.remove('ss4-msg-highlight'), 2300);
      }
    }, 160);
    pendingNotificationTargetRef.current = null;
  }, [activeId, msgs, scrollToLatest]);

  const targetUserId = searchParams.get('userId');
  React.useEffect(() => {
    if (loading || !token || !targetUserId) return;
    apiClient
      .post('/api/supraspace/conversations/direct', { targetUserId }, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        const c = r.data?.data;
        if (!c) return;
        setConvos((p) => (p.find((x) => x._id === c._id) ? p : [c, ...p]));
        openConversation(c._id);
        router.replace('/crm/supra-space', { scroll: false });
      })
      .catch((err) => {
        console.error('[SupraSpace] Auto-open DM failed:', err);
        toast.error('Could not open conversation');
      });
  }, [loading, token, targetUserId, router]);

  React.useEffect(() => {
    if (!socket) return;
    const onMsg = ({ conversationId, message }: { conversationId: string; message: SSMessage }) => {
      appendMessageLocal(conversationId, message);
      if (conversationId === activeIdRef.current) {
        fetchConversationMessages(conversationId, { force: true, silent: true });
        ctxMarkAsRead(conversationId);
        setConvos(prev => prev.map(c => {
          if (c._id !== conversationId || !c.lastMessage) return c;
          const rb = c.lastMessage.readBy || [];
          if (rb.includes(uid)) return c;
          return { ...c, unreadCount: 0, unreadMentionCount: 0, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
        }));
      }
    };
    const onDel = ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      patchMsg(conversationId, messageId, { isDeleted: true, content: '', attachments: [] } as any);
      setConvos(p => p.map(c => {
        if (c._id !== conversationId || c.lastMessage?._id !== messageId) return c;
        const cached = msgsRef.current[conversationId] || [];
        const prev = [...cached].filter(m => m._id !== messageId && !m.isDeleted).slice(-1)[0];
        return { ...c, lastMessage: (prev || null) as any, lastMessageAt: prev?.createdAt || c.lastMessageAt };
      }));
    };
    const onNew = (c: SSConversation) => {
      setConvos(p => [c, ...p.filter(x => x._id !== c._id)]);
      setMsgs(p => { const n = { ...p }; delete n[c._id]; return n; });
    };
    const onConvUpdated = (c: any) => {
      if (c?.members) setConvos(p => p.map(x => x._id === c._id ? { ...x, ...c } : x));
      else if (c?._id) patchConv(c._id, c);
    };
    const onConvDeleted = ({ conversationId }: { conversationId: string }) => {
      setConvos(p => p.filter(x => x._id !== conversationId));
      setActiveId(prev => prev === conversationId ? null : prev);
    };
    const onConvTheme = ({ conversationId, theme: th }: { conversationId: string; theme: any }) => patchConv(conversationId, { theme: th });
    const onConvMoved = ({ conversationId, spaceId }: { conversationId: string; spaceId: string | null }) =>
      setConvos(p => p.map(c => c._id === conversationId ? { ...c, spaceId: spaceId || null } as any : c));
    const onSpaceDeleted = ({ spaceId }: { spaceId: string }) =>
      setConvos(p => p.map(c => (c as any).spaceId === spaceId ? { ...c, spaceId: null } as any : c));
    const onReaction = ({ conversationId, messageId, reactions }: any) => patchMsg(conversationId, messageId, { reactions });
    const onPoll = ({ conversationId, messageId, poll }: any) => patchMsg(conversationId, messageId, { poll });
    const onEvent = ({ conversationId, messageId, event }: any) => patchMsg(conversationId, messageId, { event });
    const onMeetingJoinRequested = (payload: MeetingJoinRequestedPayload) => {
      const requester = payload?.requester;
      if (!payload?.meetingId || !requester) return;
      toast(`${requester.name || requester.email} wants to join`, {
        action: {
          label: 'Approve',
          onClick: async () => {
            try {
              await apiClient.post(`/api/calls/meeting/${payload.meetingId}/admission`, {
                userId: requester.userId,
                email: requester.email,
                decision: 'approved',
              }, { headers: { Authorization: `Bearer ${token}` } });
              toast.success('Guest approved');
            } catch (e: unknown) {
              toast.error(getErrorMessage(e, 'Could not approve guest.'));
            }
          },
        },
      });
    };
    const onMeetingAdmissionUpdated = (payload: MeetingAdmissionUpdatedPayload) => {
      if (payload?.status === 'approved' && payload?.meetingId) {
        toast.success('Meeting approved');
        handleJoinCall(payload.meetingId);
      }
    };

    const onEdited = ({ conversationId, messageId, content, attachments, type }: any) => {
      const patch: Partial<SSMessage> = { content, isEdited: true };
      if (Array.isArray(attachments)) patch.attachments = attachments;
      if (type) patch.type = type;
      patchMsg(conversationId, messageId, patch);
    };
    const onCallEnded = ({ conversationId, meetingId }: { conversationId?: string; meetingId?: string }) => {
      const m = activeMeetingRef.current;
      if (!m) return;
      if (m.call?.meetingId === meetingId || m.call?.conversationId === conversationId) {
        setActiveMeeting(null);
      }
    };
    socket.on('message:new', onMsg);
    socket.on('message:deleted', onDel);
    socket.on('message:edited', onEdited);
    socket.on('conversation:new', onNew);
    socket.on('conversation:updated', onConvUpdated);
    socket.on('conversation:deleted', onConvDeleted);
    socket.on('conversation:theme', onConvTheme);
    socket.on('conversation:moved', onConvMoved);
    socket.on('space:deleted', onSpaceDeleted);
    socket.on('message:reaction', onReaction);
    socket.on('message:poll', onPoll);
    socket.on('message:event', onEvent);
    socket.on('meeting:join-requested', onMeetingJoinRequested);
    socket.on('meeting:admission-updated', onMeetingAdmissionUpdated);
    socket.on('call:ended', onCallEnded);
    const onMsgsRead = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (userId === uid) {
        setConvos(prev => prev.map(c => c._id === conversationId ? { ...c, unreadCount: 0, unreadMentionCount: 0 } : c));
      }
      setMsgs((prev) => {
        const convMsgs = prev[conversationId];
        if (!convMsgs) return prev;
        return {
          ...prev,
          [conversationId]: convMsgs.map((m) =>
            (m.readBy || []).includes(userId) ? m : { ...m, readBy: [...(m.readBy || []), userId] }
          ),
        };
      });
    };
    const onProfileUpdated = ({ userId, avatar, fullName }: { userId: string; avatar?: string; fullName?: string }) => {
      if (avatar) {
        setAllUsers(prev => prev.map(u => u._id === userId ? { ...u, avatar } : u));
        setConvos(prev => prev.map(conv => ({
          ...conv,
          members: conv.members.map(m => m._id === userId ? { ...m, avatar } : m),
        })));
      }
    };
    socket.on('messages:read', onMsgsRead);
    socket.on('user:profile:updated', onProfileUpdated);
    const onAllRead = ({ conversationIds }: { conversationIds: string[] }) => {
      const idSet = new Set(conversationIds);
      setConvos(prev => prev.map(c => {
        if (!idSet.has(c._id)) return c;
        if (!c.lastMessage) return { ...c, unreadCount: 0, unreadMentionCount: 0 };
        const rb = c.lastMessage.readBy || [];
        if (rb.includes(uid)) return { ...c, unreadCount: 0, unreadMentionCount: 0 };
        return { ...c, unreadCount: 0, unreadMentionCount: 0, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
      }));
      setManualUnread(prev => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        idSet.forEach(id => next.delete(id));
        return next;
      });
    };
    socket.on('conversations:all-read', onAllRead);
    return () => {
      socket.off('message:new', onMsg); socket.off('message:deleted', onDel); socket.off('message:edited', onEdited); socket.off('conversation:new', onNew);
      socket.off('conversation:updated', onConvUpdated); socket.off('conversation:deleted', onConvDeleted);
      socket.off('conversation:theme', onConvTheme); socket.off('conversation:moved', onConvMoved); socket.off('space:deleted', onSpaceDeleted); socket.off('message:reaction', onReaction);
      socket.off('message:poll', onPoll); socket.off('message:event', onEvent);
      socket.off('meeting:join-requested', onMeetingJoinRequested);
      socket.off('meeting:admission-updated', onMeetingAdmissionUpdated);
      socket.off('call:ended', onCallEnded);
      socket.off('messages:read', onMsgsRead);
      socket.off('user:profile:updated', onProfileUpdated);
      socket.off('conversations:all-read', onAllRead);
    };
  }, [socket, appendMessageLocal, patchMsg, patchConv, fetchConversationMessages, token, handleJoinCall]);

  React.useLayoutEffect(() => {
    const pending = pendingScrollRestoreRef.current;
    const el = messageScrollRef.current;
    if (!pending || !el || pending.convId !== activeId) return;

    const heightDelta = el.scrollHeight - pending.scrollHeight;
    el.scrollTop = pending.scrollTop + heightDelta;
    suppressAutoScrollOnceRef.current = true;
    pendingScrollRestoreRef.current = null;
  }, [activeId, activeMsgs.length]);

  React.useEffect(() => {
    const el = messageScrollRef.current;
    if (!el || pendingScrollRestoreRef.current) return;

    if (suppressAutoScrollOnceRef.current) {
      suppressAutoScrollOnceRef.current = false;
      return;
    }

    if (forceScrollToBottomRef.current === activeId) {
      requestAnimationFrame(() => {
        const scrollEl = messageScrollRef.current;
        if (!scrollEl || forceScrollToBottomRef.current !== activeId) return;
        scrollEl.scrollTop = scrollEl.scrollHeight;
        endRef.current?.scrollIntoView({ behavior: 'auto' });
        if (Date.now() > openBottomLockUntilRef.current) {
          forceScrollToBottomRef.current = null;
        }
        setShowJumpToLatest(false);
      });
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Used to also auto-stick whenever a short conversation had <=40 messages loaded,
    // regardless of scroll position — meant as a "nothing to scroll away from yet" shortcut,
    // but it actively fights manual scrolling in any channel that keeps receiving new
    // messages while under that count (e.g. a busy background channel like Shift Alerts):
    // every incoming message forced the view back to the bottom even if the user had
    // deliberately scrolled up to read older messages. Distance-from-bottom alone already
    // covers the "nothing to scroll away from" case correctly (there's nowhere to scroll up
    // to yet), so it's the only signal that should matter here.
    const shouldStickToBottom = distanceFromBottom < 220;
    if (shouldStickToBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowJumpToLatest(false);
    }
  }, [activeId, activeMsgs.length]);

  React.useEffect(() => {
    if (!activeId) return;
    const scrollEl = messageScrollRef.current;
    if (!scrollEl || forceScrollToBottomRef.current !== activeId) return;

    const shouldKeepPinned = () =>
      forceScrollToBottomRef.current === activeId &&
      Date.now() <= openBottomLockUntilRef.current;

    const pinIfOpening = () => {
      if (!shouldKeepPinned()) return;
      requestAnimationFrame(() => pinMessageViewportToBottom(activeId));
    };

    const observed = new Set<Element>();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(pinIfOpening)
        : null;

    const observeChildren = () => {
      if (!resizeObserver) return;
      Array.from(scrollEl.children).forEach((child) => {
        if (observed.has(child)) return;
        observed.add(child);
        resizeObserver.observe(child);
      });
    };

    observeChildren();
    pinIfOpening();

    const mutationObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            observeChildren();
            pinIfOpening();
          })
        : null;

    mutationObserver?.observe(scrollEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class'],
    });

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [activeId, activeMsgs.length, pinMessageViewportToBottom]);

  React.useEffect(() => {
    const THRESH = 5;
    const onMove = (e: PointerEvent) => {
      const start = ptrStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!ptrActiveRef.current) {
        if (Math.hypot(dx, dy) < THRESH) return;
        ptrActiveRef.current = true;
        if (start.type === 'conv') setDragConvId(start.id);
        else setDragSpaceId(start.id);
        const ghost = dragGhostRef.current;
        if (ghost) { ghost.textContent = start.label; ghost.style.left = `${e.clientX + 12}px`; ghost.style.top = `${e.clientY - 12}px`; ghost.style.display = 'block'; }
        return;
      }
      e.preventDefault();
      const ghost = dragGhostRef.current;
      if (ghost) { ghost.style.left = `${e.clientX + 12}px`; ghost.style.top = `${e.clientY - 12}px`; }
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;
      if (start.type === 'conv') {
        const convBefore = el.closest('[data-conv-before]') as HTMLElement | null;
        const targetConvId = convBefore?.dataset.convBefore ?? null;
        const targetSection = convBefore?.dataset.convSection ?? null;
        const sourceSection = start.spaceId ?? '__channels__';
        if (targetConvId && targetConvId !== start.id && targetSection === sourceSection) {
          ptrDropConvBeforeRef.current = targetConvId;
          ptrDropZoneRef.current = null;
          setDropConvBeforeId(targetConvId);
          setDropSpaceId(null);
        } else {
          const zone = (el.closest('[data-drop-zone]') as HTMLElement | null)?.dataset.dropZone ?? null;
          ptrDropZoneRef.current = zone;
          ptrDropConvBeforeRef.current = null;
          setDropSpaceId(zone);
          setDropConvBeforeId(null);
        }
      } else {
        const raw = (el.closest('[data-drop-before]') as HTMLElement | null)?.dataset.dropBefore ?? null;
        setDropBeforeSpaceId(raw !== start.id ? raw : null);
      }
    };
    const onUp = (e: PointerEvent) => {
      const start = ptrStartRef.current;
      if (!start) return;
      if (ptrActiveRef.current) {
        if (start.type === 'conv') {
          const reorderTarget = ptrDropConvBeforeRef.current;
          const zone = ptrDropZoneRef.current;
          if (reorderTarget) {
            handleReorderConvRef.current(start.id, reorderTarget);
          } else if (zone) {
            const targetSpaceId = zone === '__channels__' ? null : zone;
            if (targetSpaceId !== (start.spaceId ?? null)) {
              handleMoveToSpaceRef.current(start.id, targetSpaceId);
            }
          }
          setDragConvId(null); setDropSpaceId(null); setDropConvBeforeId(null);
        } else {
          const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
          const beforeId = (el?.closest('[data-drop-before]') as HTMLElement | null)?.dataset.dropBefore ?? null;
          if (beforeId && beforeId !== start.id) handleSpaceDropRef.current(start.id, beforeId);
          setDragSpaceId(null); setDropBeforeSpaceId(null);
        }
      }
      const ghost = dragGhostRef.current;
      if (ghost) ghost.style.display = 'none';
      ptrStartRef.current = null;
      ptrActiveRef.current = false;
      ptrDropZoneRef.current = null;
      ptrDropConvBeforeRef.current = null;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const activeMsgsMissing = !!(activeId && !(activeId in msgs));

  React.useEffect(() => {
    if (!activeId || !token) return;
    const status = msgFetchStateRef.current[activeId] || 'idle';
    const shouldFetch =
      !(activeId in msgsRef.current) ||
      status === 'error' ||
      status === 'stale' ||
      forceScrollToBottomRef.current === activeId;

    if (shouldFetch) {
      fetchConversationMessages(activeId, {
        force: true,
        scrollToBottom: forceScrollToBottomRef.current === activeId,
      });
    }
    markRead(activeId);
    ctxMarkAsRead(activeId);
    setConvos(prev => prev.map(c => {
      if (c._id !== activeId || !c.lastMessage) return c;
      const rb = c.lastMessage.readBy || [];
      if (rb.includes(uid)) return { ...c, unreadCount: 0, unreadMentionCount: 0 };
      return { ...c, unreadCount: 0, unreadMentionCount: 0, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
    }));
    call.refreshStatus(activeId);
  }, [activeId, token, activeMsgsMissing, fetchConversationMessages]); // eslint-disable-line

  React.useEffect(() => {
    if (!activeId || !isConnected) return;
    joinConversation(activeId);
    return () => leaveConversation(activeId);
  }, [activeId, isConnected, joinConversation, leaveConversation]);

  React.useEffect(() => {
    const previousId = previousComposerConversationRef.current;
    if (previousId) {
      const currentDraft = textareaRef.current ? htmlToMarkdown(textareaRef.current) : inputTextRef.current || '';
      setConversationDraft(previousId, currentDraft);
    }

    const nextDraft = activeId ? composerDraftsRef.current[activeId] || '' : '';
    syncComposerText(nextDraft, true);
    setReplyTo(null);
    setPendingFiles([]);
    setPendingMeeting(null);
    setPendingGif(null);
    setUploadNotice(null);
    setShowInfo(false);
    setMentionQuery(null);
    setMentionAnchor(-1);
    setEmojiOpen(false);
    setScheduleOpen(false);
    if (textareaRef.current) {
      textareaRef.current.innerHTML = nextDraft ? markdownTextToEditorHtml(nextDraft) : '';
    }
    previousComposerConversationRef.current = activeId;
  }, [activeId]);

  React.useEffect(() => {
    const make = (ref: React.RefObject<HTMLDivElement | null>, close: () => void) => (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const hs: Array<[boolean, (e: MouseEvent) => void]> = [
      [autrixOpen, make(autrixRef, () => setAutrixOpen(false))],
      [emojiOpen, (e: MouseEvent) => {
        const target = e.target as Node;
        if (emojiRef.current?.contains(target) || mobileEmojiRef.current?.contains(target)) return;
        setEmojiOpen(false);
      }],
      [createMenuOpen, make(createMenuRef, () => setCreateMenuOpen(false))],
      [meetingMenuOpen, make(meetingMenuRef, () => setMeetingMenuOpen(false))],
      [gifOpen, (e: MouseEvent) => {
        const target = e.target as Node;
        if (!gifRef.current?.contains(target) && !mobileGifRef.current?.contains(target)) setGifOpen(false);
      }],
    ];
    const active = hs.filter(([on]) => on).map(([, h]) => h);
    active.forEach(h => document.addEventListener('mousedown', h));
    return () => active.forEach(h => document.removeEventListener('mousedown', h));
  }, [autrixOpen, emojiOpen, createMenuOpen, meetingMenuOpen, gifOpen]);

  React.useEffect(() => {
    if (!memberCard) return;
    const h = (e: MouseEvent) => { const el = document.getElementById('ss4-member-card'); if (el && !el.contains(e.target as Node)) setMemberCard(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [memberCard]);

  React.useEffect(() => {
    if (!token || q.trim().length < 2) { setMsgResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      apiClient.get('/api/supraspace/search', { headers: { Authorization: `Bearer ${token}` }, params: { q: q.trim() } })
        .then(r => setMsgResults(r.data?.data || [])).catch(() => setMsgResults([])).finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q, token]);

  const handleSend = async (scheduledAt?: string) => {
    if (!activeId || sending) return;
    const currentComposerText = textareaRef.current?.innerText.replace(/\n$/, '') || inputTextRef.current || input;
    const hasText = Boolean(currentComposerText.trim());
    const hasPendingFiles = pendingFiles.length > 0;
    const hasPendingMeeting = !!pendingMeeting;
    const hasPendingGif = !!pendingGif;
    if (!hasText && !hasPendingFiles && !hasPendingMeeting && !hasPendingGif) return;
    const conversationId = activeId;
    const visibleComposerText = textareaRef.current?.innerText || inputTextRef.current || input;
    const serializedComposerText = textareaRef.current ? htmlToMarkdown(textareaRef.current) : (inputTextRef.current || input).trim();
    const content = normalizeMessageMarkdownText(
      canonicalizeColorMarkup(
        restoreMissingSerialsFromSources(
          preserveVisiblePayloadLines(
            preserveVisibleVinLines(serializedComposerText, visibleComposerText),
            visibleComposerText,
          ),
          [
            visibleComposerText,
            inputTextRef.current,
            pastedPlainTextRef.current,
            textareaRef.current?.textContent || '',
            serializedComposerText,
            pendingFiles.map(file => file.name).join('\n'),
          ],
        ),
      ),
    );
    const replyMessageId = replyTo?._id;
    const isScheduledSend = Boolean(scheduledAt);
    if (isScheduledSend && (hasPendingFiles || hasPendingMeeting)) {
      showUploadNotice('error', 'Schedule send currently supports text and GIF messages only.');
      return;
    }
    setSending(true);
    sendTypingStop(conversationId);
    let optimisticTextId: string | null = null;
    try {
      if (hasPendingMeeting) {
        if (hasPendingFiles || hasPendingGif) {
          showUploadNotice('error', 'Send attachments and GIFs separately before sending a meeting.');
          return;
        }
        const r = await apiClient.post('/api/calls/meeting', {
          conversationId,
          title: pendingMeeting.title,
          scheduledAt: pendingMeeting.scheduledAt || undefined,
          optionalMessage: content,
        }, { headers: { Authorization: `Bearer ${token}` } });
        if (r.data?.data?.message) appendMessageLocal(conversationId, r.data.data.message);
        setPendingMeeting(null); pastedPlainTextRef.current = ''; if (conversationId) setConversationDraft(conversationId, ''); syncComposerText('', true); if (textareaRef.current) textareaRef.current.innerHTML = ''; setReplyTo(null);
        if (r.data?.data?.meetingLink) {
          try { await navigator.clipboard.writeText(r.data.data.meetingLink); toast.success('Meeting sent and link copied'); }
          catch { toast.success('Meeting sent'); }
        }
      } else if (hasPendingFiles) {
        if (hasPendingGif) {
          showUploadNotice('error', 'Send GIFs separately from file attachments.');
          return;
        }
        setUploading(true);
        const fd = new FormData();
        pendingFiles.forEach(f => fd.append('files', f));
        if (content) fd.append('content', content);
        if (replyMessageId) fd.append('replyTo', replyMessageId);
        const r = await apiClient.post(`/api/supraspace/conversations/${conversationId}/upload`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
        if (r.data?.data) appendMessageLocal(conversationId, r.data.data);
        setPendingFiles([]); pastedPlainTextRef.current = ''; if (conversationId) setConversationDraft(conversationId, ''); syncComposerText('', true); if (textareaRef.current) textareaRef.current.innerHTML = ''; setReplyTo(null);
        showUploadNotice('success', pendingFiles.length === 1 ? 'Attachment sent.' : `${pendingFiles.length} attachments sent.`);
      } else if (hasPendingGif) {
        const r = await apiClient.post(
          `/api/supraspace/conversations/${conversationId}/messages`,
          { content, gif: pendingGif, replyTo: replyMessageId, scheduledAt },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.status === 202) toast.success('Message scheduled');
        else if (r.data?.data) appendMessageLocal(conversationId, r.data.data);
        setPendingGif(null); pastedPlainTextRef.current = ''; if (conversationId) setConversationDraft(conversationId, ''); syncComposerText('', true); if (textareaRef.current) textareaRef.current.innerHTML = ''; setReplyTo(null);
      } else {
        const tempId = scheduledAt ? null : `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (tempId) {
          optimisticTextId = tempId;
          const member = activeConv?.members.find(m => m._id === uid);
          appendMessageLocal(conversationId, {
            _id: tempId,
            conversationId,
            sender: {
              _id: uid,
              fullName: me?.fullName || member?.fullName || 'You',
              username: me?.username || member?.username || 'you',
              avatar: me?.avatar || member?.avatar,
            },
            content,
            type: 'text',
            attachments: [],
            reactions: [],
            readBy: [uid],
            replyTo: replyTo || null,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
          });
        }
        pastedPlainTextRef.current = ''; if (conversationId) setConversationDraft(conversationId, ''); syncComposerText('', true); if (textareaRef.current) textareaRef.current.innerHTML = ''; setReplyTo(null);
        if (tempId) setSending(false);
        const r = await apiClient.post(
          `/api/supraspace/conversations/${conversationId}/messages`,
          { content, replyTo: replyMessageId, scheduledAt },
          { headers: { Authorization: `Bearer ${token}` }, _skipAuthRefresh: true } as any
        );
        if (r.status === 202) toast.success('Message scheduled');
        else if (r.data?.data) {
          if (tempId) replaceMessageLocal(conversationId, tempId, r.data.data);
          else appendMessageLocal(conversationId, r.data.data);
        }
      }
    } catch (error) {
      if (hasPendingFiles) showUploadNotice('error', getErrorMessage(error, 'Failed to send attachment.'));
      else if (hasPendingMeeting) showUploadNotice('error', getErrorMessage(error, 'Failed to send meeting.'));
      else if (hasPendingGif) showUploadNotice('error', getErrorMessage(error, 'Failed to send GIF.'));
      else {
        if (optimisticTextId) removeMessageLocal(conversationId, optimisticTextId);
        const currentDraft = textareaRef.current?.innerText.replace(/\n$/, '') || inputTextRef.current || '';
        if (!currentDraft.trim()) syncComposerText(content, true);
        showUploadNotice('error', getErrorMessage(error, 'Message failed to send.'));
      }
    } finally { setSending(false); setUploading(false); }
  };

  const canScheduleSend = Boolean(composerHasText || pendingGif) && pendingFiles.length === 0 && !pendingMeeting && !sending;
  const scheduleOptions = React.useMemo(() => {
    const now = new Date();
    const today8 = new Date(now); today8.setHours(8, 0, 0, 0);
    const today1 = new Date(now); today1.setHours(13, 0, 0, 0);
    const nextMonday = new Date(now);
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(8, 0, 0, 0);
    return [
      today8 > now ? { label: 'Today at 8:00 AM', at: today8 } : null,
      today1 > now ? { label: 'Today at 1:00 PM', at: today1 } : null,
      { label: 'Next Monday at 8:00 AM', at: nextMonday },
    ].filter(Boolean) as Array<{ label: string; at: Date }>;
  }, [scheduleOpen]);

  const openScheduleSheet = React.useCallback(() => {
    if (!canScheduleSend) return;
    setScheduleOpen(true);
  }, [canScheduleSend]);

  const startSendPress = React.useCallback(() => {
    sendLongPressTriggeredRef.current = false;
    if (sendLongPressRef.current) clearTimeout(sendLongPressRef.current);
    sendLongPressRef.current = setTimeout(() => {
      sendLongPressTriggeredRef.current = true;
      openScheduleSheet();
    }, 520);
  }, [openScheduleSheet]);

  const finishSendPress = React.useCallback(() => {
    if (sendLongPressRef.current) {
      clearTimeout(sendLongPressRef.current);
      sendLongPressRef.current = null;
    }
  }, []);

  React.useEffect(() => () => {
    if (sendLongPressRef.current) clearTimeout(sendLongPressRef.current);
  }, []);

  const scheduleSendFor = React.useCallback((date: Date) => {
    setScheduleOpen(false);
    handleSend(date.toISOString());
  }, [handleSend]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !activeId) return;
    const selected = Array.from(files); if (!selected.length) return;
    if (pendingFiles.length + selected.length > SS4_MAX_UPLOAD_FILES) { showUploadNotice('error', `You can attach up to ${SS4_MAX_UPLOAD_FILES} files.`); return; }
    for (const f of selected) {
      if (f.size === 0) { showUploadNotice('error', `${f.name} is empty.`); return; }
      const vid = isVideoFileLike(f);
      if (f.size > (vid ? SS4_MAX_VIDEO_UPLOAD_SIZE_BYTES : SS4_MAX_UPLOAD_SIZE_BYTES)) { showUploadNotice('error', `${f.name} exceeds ${vid ? '40 MB' : '25 MB'}.`); return; }
    }
    setPendingFiles(prev => [...prev, ...selected]);
    showUploadNotice('info', selected.length === 1 ? `${selected[0].name} attached. Press Send.` : `${selected.length} files attached.`);
  };
  const removePendingFile = (i: number) => setPendingFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files') || !activeId) return;
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files') || !activeId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (!activeId) return;
    const { files } = e.dataTransfer;
    if (files.length > 0) handleUpload(files);
  };

  const refreshActiveFormats = React.useCallback(() => {
    try {
      const el = textareaRef.current;
      const selection = window.getSelection();
      if (
        !el
        || !selection
        || selection.rangeCount === 0
        || !selection.anchorNode
        || !el.contains(selection.anchorNode)
      ) {
        return;
      }

      const cursor = getCaretOffset(el);
      const value = el.innerText.replace(/\n$/, '');
      const lineStart = value.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
      const lineEndRaw = value.indexOf('\n', cursor);
      const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
      const line = value.slice(lineStart, lineEnd);
      const beforeCursor = line.slice(0, Math.max(0, cursor - lineStart));
      const blockValue = String(document.queryCommandValue('formatBlock') || '')
        .toLowerCase()
        .replace(/[<>]/g, '');
      const fontValue = String(document.queryCommandValue('fontName') || '')
        .toLowerCase();

      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        list:
          document.queryCommandState('insertUnorderedList')
          || /^[•◦▪]\s/.test(line.trimStart()),
        numbered:
          document.queryCommandState('insertOrderedList')
          || /^\d+\.\s/.test(line.trimStart()),
        quote:
          blockValue.includes('blockquote')
          || line.trimStart().startsWith('> '),
        code:
          /(monospace|courier|consolas|menlo|monaco)/i.test(fontValue)
          || beforeCursor.split('`').length % 2 === 0,
      });

      setActiveTextColor(getActiveSelectionColor(el));
    } catch {
      // Browser formatting-state detection is best effort.
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('selectionchange', refreshActiveFormats);
    return () => document.removeEventListener('selectionchange', refreshActiveFormats);
  }, [refreshActiveFormats]);

  const getCaretOffset = (el: HTMLElement): number => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      return el.innerText.replace(/\n$/, '').length;
    }
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  };

  const rangeFromTextOffset = React.useCallback((el: HTMLElement, offset: number) => {
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, offset);
    let node = walker.nextNode();

    while (node) {
      const textLength = node.textContent?.length ?? 0;
      if (remaining <= textLength) {
        range.setStart(node, remaining);
        range.collapse(true);
        return range;
      }
      remaining -= textLength;
      node = walker.nextNode();
    }

    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  }, []);

  const saveComposerSelection = React.useCallback(() => {
    const el = textareaRef.current;
    const selection = window.getSelection();
    if (!el) return;
    if (!selection || selection.rangeCount === 0) {
      composerCaretOffsetRef.current = el.innerText.replace(/\n$/, '').length;
      return;
    }

    const range = selection.getRangeAt(0);
    if (el.contains(range.startContainer) && el.contains(range.endContainer)) {
      composerCaretOffsetRef.current = getCaretOffset(el);
      composerSelectionRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreComposerSelection = React.useCallback(() => {
    const el = textareaRef.current;
    const selection = window.getSelection();
    const range = composerSelectionRangeRef.current;
    if (!el || !selection || !range) return false;
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, []);

  const focusComposerAtSavedCaret = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const text = el.innerText.replace(/\n$/, '');
    const offset = Math.max(0, Math.min(composerCaretOffsetRef.current ?? text.length, text.length));
    el.focus();

    requestAnimationFrame(() => {
      const range = rangeFromTextOffset(el, offset);
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(range);
      composerCaretOffsetRef.current = offset;
    });
  }, [rangeFromTextOffset]);

  const insertComposerText = React.useCallback((text: string, options?: { preferEndOnZero?: boolean }) => {
    const el = textareaRef.current;
    if (!el) return;

    const currentText = el.innerText.replace(/\n$/, '');
    const fallbackOffset = currentText.length;
    const savedOffset = composerCaretOffsetRef.current;
    let safeOffset = Math.max(0, Math.min(savedOffset ?? fallbackOffset, currentText.length));
    if (options?.preferEndOnZero && safeOffset === 0 && currentText.length > 0) {
      safeOffset = currentText.length;
    }
    const nextText = `${currentText.slice(0, safeOffset)}${text}${currentText.slice(safeOffset)}`;
    const nextOffset = safeOffset + text.length;

    el.textContent = nextText;
    el.focus();

    const range = rangeFromTextOffset(el, nextOffset);
    range.collapse(true);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    composerCaretOffsetRef.current = nextOffset;
    syncComposerText(nextText, true);
    refreshActiveFormats();
  }, [rangeFromTextOffset, refreshActiveFormats, syncComposerText]);

  const prepareMobileEmojiPicker = React.useCallback(() => {
    saveComposerSelection();
    const currentText = textareaRef.current?.innerText.replace(/\n$/, '') || inputTextRef.current || input;
    if (currentText.length > 0 && (composerCaretOffsetRef.current == null || composerCaretOffsetRef.current <= 0)) {
      composerCaretOffsetRef.current = currentText.length;
    }
    setEmojiOpen(v => !v);
  }, [input, saveComposerSelection]);

  const setEditableTextAndCaret = React.useCallback((text: string, caretOffset: number) => {
    const el = textareaRef.current;
    if (!el) return;
    el.textContent = text;
    el.focus();

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    const textNode = el.firstChild;
    const safeOffset = Math.min(caretOffset, text.length);

    if (textNode?.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, safeOffset);
    } else {
      range.setStart(el, el.childNodes.length);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    refreshActiveFormats();
  }, [refreshActiveFormats]);

  const handleTyping = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const val = el.innerText.replace(/\n$/, '');
    syncComposerText(val);
    const inputEvent = e.nativeEvent as InputEvent;
    const shouldInspectMention =
      mentionAnchor >= 0 ||
      inputEvent.data === '@' ||
      inputEvent.inputType === 'insertFromPaste';

    if (shouldInspectMention) {
      const cursor = getCaretOffset(el);
      composerCaretOffsetRef.current = cursor === 0 && val.length > 0 ? val.length : cursor;
      if (mentionAnchor >= 0) {
        if (cursor <= mentionAnchor || val[mentionAnchor] !== '@') {
          setMentionQuery(null); setMentionAnchor(-1);
        } else {
          const q = val.slice(mentionAnchor + 1, cursor);
          if (q.includes('  ')) { setMentionQuery(null); setMentionAnchor(-1); }
          else { setMentionQuery(q); setMentionIdx(0); }
        }
      } else {
        const match = val.slice(0, cursor).match(/@(\w*)$/);
        if (match) { setMentionQuery(match[1]); setMentionAnchor(cursor - match[0].length); setMentionIdx(0); }
      }
    }

    const shouldInspectChannelMention =
      channelMentionAnchor >= 0 ||
      inputEvent.data === '#' ||
      inputEvent.inputType === 'insertFromPaste';

    if (shouldInspectChannelMention) {
      const cursor = getCaretOffset(el);
      composerCaretOffsetRef.current = cursor === 0 && val.length > 0 ? val.length : cursor;
      if (channelMentionAnchor >= 0) {
        if (cursor <= channelMentionAnchor || val[channelMentionAnchor] !== '#') {
          setChannelMentionQuery(null); setChannelMentionAnchor(-1);
        } else {
          const q = val.slice(channelMentionAnchor + 1, cursor);
          if (q.includes('  ')) { setChannelMentionQuery(null); setChannelMentionAnchor(-1); }
          else { setChannelMentionQuery(q); setChannelMentionIdx(0); }
        }
      } else {
        const match = val.slice(0, cursor).match(/#(\w*)$/);
        if (match) { setChannelMentionQuery(match[1]); setChannelMentionAnchor(cursor - match[0].length); setChannelMentionIdx(0); }
      }
    }
    if (!activeId) return;
    sendTypingStart(activeId);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => sendTypingStop(activeId!), 2000);
  };

  const inspectMentionAnywhere = React.useCallback((value: string) => {
    if (!activeConv) return false;
    const mentionTokenRe = /(^|[^\w@])@([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+){0,2})/g;
    const rawCandidates: Array<{ anchor: number; query: string; length: number }> = [];
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = mentionTokenRe.exec(value)) !== null) {
      const anchor = tokenMatch.index + tokenMatch[1].length;
      const rawQuery = tokenMatch[2].trim();
      if (!rawQuery) continue;
      const queryParts = rawQuery.split(/\s+/).filter(Boolean);
      const queryVariants = queryParts
        .map((_part, index) => queryParts.slice(0, queryParts.length - index).join(' '))
        .filter(Boolean);

      const matchedQuery = queryVariants.find(query => {
        const queryLower = query.toLowerCase();
        return queryLower === 'all' || activeConv.members.some(member => {
          if (member._id === uid) return false;
          const fullName = member.fullName.trim().toLowerCase();
          const username = (member.username || '').trim().replace(/^@/, '').toLowerCase();
          const parts = fullName.split(/\s+/).filter(Boolean);
          const display = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
          return fullName.includes(queryLower)
            || display.startsWith(queryLower)
            || parts[0]?.startsWith(queryLower)
            || username.startsWith(queryLower);
        });
      });

      if (matchedQuery) rawCandidates.push({ anchor, query: matchedQuery, length: matchedQuery.length });
    }

    const aliases = [
      ...(activeConv.type === 'group' ? ['all'] : []),
      ...activeConv.members
        .filter(m => m._id !== uid)
        .flatMap(m => {
          const parts = m.fullName.trim().split(/\s+/).filter(Boolean);
          const display = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
          return [display, m.fullName, parts[0], m.username].filter(Boolean) as string[];
        }),
    ];

    const candidates: Array<{ anchor: number; query: string; length: number }> = [];
    aliases.forEach(alias => {
      const normalizedAlias = escapeRegExp(alias.trim()).replace(/\s+/g, '\\s+');
      const re = new RegExp(`(^|[^\\w@])@${normalizedAlias}(?=$|[^\\w])`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = re.exec(value)) !== null) {
        const anchor = match.index + match[1].length;
        const matched = value.slice(anchor + 1, re.lastIndex).trim();
        candidates.push({ anchor, query: matched, length: matched.length });
      }
    });

    const best = [...rawCandidates, ...candidates].sort((a, b) => b.anchor - a.anchor || b.length - a.length)[0];
    if (!best) return false;
    setMentionQuery(best.query);
    setMentionAnchor(best.anchor);
    setMentionIdx(0);
    return true;
  }, [activeConv, uid]);

  const insertMention = React.useCallback((name: string) => {
    const el = textareaRef.current;
    if (!el || mentionAnchor < 0) return;
    const selection = window.getSelection();
    const range = rangeFromTextOffset(el, mentionAnchor);
    const endRange = rangeFromTextOffset(el, mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    range.setEnd(endRange.startContainer, endRange.startOffset);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand('insertText', false, `@${name} `);
    const next = el.innerText.replace(/\n$/, '');
    const caretOffset = mentionAnchor + name.length + 2;
    syncComposerText(next, true);
    setMentionQuery(null);
    setMentionAnchor(-1);
    composerCaretOffsetRef.current = caretOffset;
    saveComposerSelection();
    requestAnimationFrame(refreshActiveFormats);
  }, [mentionAnchor, mentionQuery, rangeFromTextOffset, refreshActiveFormats, saveComposerSelection, syncComposerText]);

  const insertChannelMention = React.useCallback((name: string) => {
    const el = textareaRef.current;
    if (!el || channelMentionAnchor < 0) return;
    const selection = window.getSelection();
    const range = rangeFromTextOffset(el, channelMentionAnchor);
    const endRange = rangeFromTextOffset(el, channelMentionAnchor + 1 + (channelMentionQuery?.length ?? 0));
    range.setEnd(endRange.startContainer, endRange.startOffset);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand('insertText', false, `#${name} `);
    const next = el.innerText.replace(/\n$/, '');
    const caretOffset = channelMentionAnchor + name.length + 2;
    syncComposerText(next, true);
    setChannelMentionQuery(null);
    setChannelMentionAnchor(-1);
    composerCaretOffsetRef.current = caretOffset;
    saveComposerSelection();
    requestAnimationFrame(refreshActiveFormats);
  }, [channelMentionAnchor, channelMentionQuery, rangeFromTextOffset, refreshActiveFormats, saveComposerSelection, syncComposerText]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
        const seconds = recSecondsRef.current;
        recStreamRef.current?.getTracks().forEach(t => t.stop());
        if (blob.size > 0 && activeId) {
          const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          const fd = new FormData(); fd.append('files', file); fd.append('duration', String(seconds));
          try {
            const r = await apiClient.post(`/api/supraspace/conversations/${activeId}/upload`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            if (r.data?.data) appendMessageLocal(activeId, r.data.data);
          } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to send voice note.')); }
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true); setRecSeconds(0); recSecondsRef.current = 0;
      recTimerRef.current = setInterval(() => { recSecondsRef.current += 1; setRecSeconds(recSecondsRef.current); }, 1000);
    } catch { showUploadNotice('error', 'Microphone permission denied.'); }
  };
  const stopRecording = (cancel = false) => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (cancel) { recChunksRef.current = []; recStreamRef.current?.getTracks().forEach(t => t.stop()); mediaRecorderRef.current?.stop(); }
    else mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const selectGif = (gif: { url: string; width?: number; height?: number; title?: string }) => {
    setPendingGif(gif);
    setGifOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!activeId) return;
    setMsgs(p => ({
      ...p, [activeId]: (p[activeId] || []).map(m => {
        if (m._id !== msgId) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex(r => r.emoji === emoji);
        if (idx >= 0) {
          const has = reactions[idx].users.includes(uid);
          const users = has ? reactions[idx].users.filter(u => u !== uid) : [...reactions[idx].users, uid];
          if (users.length === 0) reactions.splice(idx, 1); else reactions[idx] = { ...reactions[idx], users };
        } else reactions.push({ emoji, users: [uid] } as any);
        return { ...m, reactions };
      })
    }));
    try { await apiClient.post(`/api/supraspace/messages/${msgId}/react`, { emoji }, { headers: { Authorization: `Bearer ${token}` } }); } catch { }
  };
  const handleVotePoll = async (msgId: string, optionId: string) => {
    try { const r = await apiClient.post(`/api/supraspace/messages/${msgId}/poll/vote`, { optionId }, { headers: { Authorization: `Bearer ${token}` } }); if (activeId && r.data?.data?.poll) patchMsg(activeId, msgId, { poll: r.data.data.poll }); } catch { }
  };
  const handleRsvp = async (msgId: string, response: 'going' | 'maybe' | 'declined') => {
    try { const r = await apiClient.post(`/api/supraspace/messages/${msgId}/event/rsvp`, { response }, { headers: { Authorization: `Bearer ${token}` } }); if (activeId && r.data?.data?.event) patchMsg(activeId, msgId, { event: r.data.data.event }); } catch { }
  };
  const createPoll = async (question: string, options: string[], allowMultiple: boolean) => {
    if (!activeId) return; setPollOpen(false);
    try { const r = await apiClient.post(`/api/supraspace/conversations/${activeId}/poll`, { question, options, allowMultiple }, { headers: { Authorization: `Bearer ${token}` } }); if (r.data?.data) appendMessageLocal(activeId, r.data.data); } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to create poll.')); }
  };
  const createEvent = async (ev: { title: string; description: string; location: string; startTime: string; endTime: string }) => {
    if (!activeId) return; setEventOpen(false);
    try { const r = await apiClient.post(`/api/supraspace/conversations/${activeId}/event`, ev, { headers: { Authorization: `Bearer ${token}` } }); if (r.data?.data) appendMessageLocal(activeId, r.data.data); } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to create event.')); }
  };
  const createMeeting = (meeting: PendingMeetingDraft) => {
    if (!activeId) return;
    setPendingMeeting({ title: meeting.title || 'Video meeting', scheduledAt: meeting.scheduledAt || '' });
    setMeetingOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
  const createStandaloneMeeting = async (meeting: PendingMeetingDraft) => {
    const r = await apiClient.post('/api/calls/meeting', {
      title: meeting.title || 'Video meeting',
      scheduledAt: meeting.scheduledAt || undefined,
    }, { headers: { Authorization: `Bearer ${token}` } });
    const meetingLink = r.data?.data?.meetingLink;
    const meetingId = r.data?.data?.call?.meetingId;
    if (!meetingLink || !meetingId) throw new Error('Meeting link was not returned');
    return { meetingLink, meetingId };
  };
  const createMeetingLink = async (meeting: PendingMeetingDraft) => {
    try {
      const { meetingLink } = await createStandaloneMeeting(meeting);
      try {
        await navigator.clipboard.writeText(meetingLink);
        toast.success('Meeting link created and copied');
      } catch {
        toast.success('Meeting link created');
      }
      return meetingLink;
    } catch (e) {
      showUploadNotice('error', getErrorMessage(e, 'Failed to create meeting link.'));
      throw e;
    }
  };
  const handleCreateMeetingForLater = async () => {
    setMeetingMenuOpen(false);
    setMeetingActionLoading('later');
    try {
      const { meetingLink } = await createStandaloneMeeting({ title: 'Video meeting', scheduledAt: '' });
      setMeetingLinkInfo(meetingLink);
      try {
        await navigator.clipboard.writeText(meetingLink);
        toast.success('Meeting link created and copied');
      } catch {
        toast.success('Meeting link created');
      }
    } catch (e) {
      showUploadNotice('error', getErrorMessage(e, 'Failed to create meeting link.'));
    } finally {
      setMeetingActionLoading(null);
    }
  };
  const handleStartInstantMeeting = async () => {
    setMeetingMenuOpen(false);
    setMeetingActionLoading('instant');
    try {
      const { meetingId } = await createStandaloneMeeting({ title: 'Instant meeting', scheduledAt: '' });
      setActiveMeeting(await call.joinCall(meetingId));
    } catch (e) {
      showUploadNotice('error', getErrorMessage(e, 'Failed to start instant meeting.'));
    } finally {
      setMeetingActionLoading(null);
    }
  };
  const handleScheduleSuprahMeeting = async (data: { title: string; description: string; scheduledAt: string; endTime: string; department: string }) => {
    try {
      const r = await apiClient.post('/api/calls/meeting/schedule', {
        title: data.title,
        description: data.description || undefined,
        scheduledAt: data.scheduledAt,
        endTime: data.endTime || undefined,
        department: data.department,
      }, { headers: { Authorization: `Bearer ${token}` } });
      const meetingLink = r.data?.data?.meetingLink;
      const participantCount = r.data?.data?.participantCount;
      setScheduleMeetingOpen(false);
      if (meetingLink) setMeetingLinkInfo(meetingLink);
      toast.success(`Meeting scheduled${participantCount ? ` for ${participantCount} participant${participantCount === 1 ? '' : 's'}` : ''}`);
    } catch (e) {
      showUploadNotice('error', getErrorMessage(e, 'Failed to schedule meeting.'));
      throw e;
    }
  };

  const handleEdit = async (msgId: string, content: string, replacementFiles?: File[]) => {
    if (!activeId) return;
    if (replacementFiles?.length) {
      const fd = new FormData();
      fd.append('content', content);
      replacementFiles.forEach(file => fd.append('files', file));
      const r = await apiClient.patch(`/api/supraspace/messages/${msgId}/attachments`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const updated = r.data?.data;
      if (updated) {
        patchMsg(activeId, msgId, {
          content: updated.content,
          attachments: updated.attachments || [],
          type: updated.type,
          isEdited: true,
        } as Partial<SSMessage>);
      }
      return;
    }

    const r = await apiClient.patch(`/api/supraspace/messages/${msgId}`, { content }, { headers: { Authorization: `Bearer ${token}` } });
    if (r.data?.data) patchMsg(activeId, msgId, { content: r.data.data.content, isEdited: true });
  };

  const handleDelete = async (msgId: string) => {
    if (!activeId) return;
    patchMsg(activeId, msgId, { isDeleted: true, content: '', attachments: [] } as any);
    try { await apiClient.delete(`/api/supraspace/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } }); }
    catch { patchMsg(activeId, msgId, { isDeleted: false } as any); }
  };
  const handlePinToggle = (msgId: string) => {
    const alreadyPinned = pinnedMsgIds.has(msgId);
    setPinnedMsgIds(prev => { const n = new Set(prev); alreadyPinned ? n.delete(msgId) : n.add(msgId); return n; });
    if (alreadyPinned) {
      toast('Message unpinned');
      setPinEvents(pe => pe.filter(e => e.msgId !== msgId));
    } else {
      toast.success('Message pinned');
      const pinnerName = activeConv?.members.find(m => m._id === uid)?.fullName || 'You';
      setPinEvents(pe => [...pe, { id: 'pin-' + msgId, pinnerName, msgId }]);
    }
  };

  const jumpToMessage = React.useCallback((msgId: string) => {
    setPinnedModalOpen(false);
    setShowInfo(false);
    window.setTimeout(() => {
      const target = document.getElementById(`ss4-msg-${msgId}`);
      if (!target) {
        toast.info('Pinned message is not loaded yet. Scroll up to load older messages.');
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.animate(
        [
          { boxShadow: '0 0 0 0 rgba(46, 213, 127, 0)', transform: 'scale(1)' },
          { boxShadow: '0 0 0 4px rgba(46, 213, 127, 0.5), 0 0 26px rgba(46, 213, 127, 0.28)', transform: 'scale(1.01)' },
          { boxShadow: '0 0 0 0 rgba(46, 213, 127, 0)', transform: 'scale(1)' },
        ],
        { duration: 1300, easing: 'ease' },
      );
    }, 120);
  }, []);

  const togglePinConv = async (c: SSConversation) => {
    const pinned = !isPinnedConv(c);
    patchConv(c._id, { pinnedBy: pinned ? [...(c.pinnedBy || []), uid] : (c.pinnedBy || []).filter(x => String(x) !== uid) } as any);
    try { await apiClient.post(`/api/supraspace/conversations/${c._id}/pin`, { pinned }, { headers: { Authorization: `Bearer ${token}` } }); } catch { }
  };
  const toggleArchiveConv = async (c: SSConversation) => {
    const archived = !isArchivedConv(c);
    patchConv(c._id, { archivedBy: archived ? [...(c.archivedBy || []), uid] : (c.archivedBy || []).filter(x => String(x) !== uid) } as any);
    try { await apiClient.post(`/api/supraspace/conversations/${c._id}/archive`, { archived }, { headers: { Authorization: `Bearer ${token}` } }); } catch { }
  };
  const deleteConversation = async (c: SSConversation) => {
    setConfirmDelete(false); setShowInfo(false);
    try {
      await apiClient.delete(`/api/supraspace/conversations/${c._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setConvos(p => p.filter(x => x._id !== c._id));
      setActiveId(prev => prev === c._id ? null : prev);
      setMsgs(p => { const n = { ...p }; delete n[c._id]; return n; });
    } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to delete.')); }
  };
  const addMembers = async (ids: string[]) => {
    if (!activeConv) return; setManageOpen(false);
    try { const r = await apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, { addMembers: ids }, { headers: { Authorization: `Bearer ${token}` } }); if (r.data?.data) patchConv(activeConv._id, r.data.data); } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to add members.')); }
  };
  const removeMember = async (memberId: string) => {
    if (!activeConv) return;
    const leaving = memberId === uid;
    try {
      const r = await apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, { removeMembers: [memberId] }, { headers: { Authorization: `Bearer ${token}` } });
      if (leaving) { setConvos(p => p.filter(x => x._id !== activeConv._id)); setActiveId(null); setShowInfo(false); }
      else if (r.data?.data) patchConv(activeConv._id, r.data.data);
    } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to remove member.')); }
  };
  const updateChannelDetails = async (name: string, emoji: string) => {
    if (!activeConv || !name.trim()) return;
    const next = { name: name.trim(), emoji: emoji.trim() || null };
    patchConv(activeConv._id, next);
    try { await apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, next, { headers: { Authorization: `Bearer ${token}` } }); } catch { }
  };
  const applyTheme = async (t: { accent: string | null; wallpaper: string | null; emoji: string | null }) => {
    if (!activeConv) return; setThemeOpen(false);
    patchConv(activeConv._id, { theme: { ...(activeConv.theme || {}), ...t } } as any);
    try { await apiClient.patch(`/api/supraspace/conversations/${activeConv._id}/theme`, { theme: { ...(activeConv.theme || {}), ...t } }, { headers: { Authorization: `Bearer ${token}` } }); } catch { }
  };
  const uploadAvatar = (file: File) => {
    if (!activeConv) return;
    const raw = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 400, 400); ctx.drawImage(img, 0, 0, 400, 400); }
      URL.revokeObjectURL(raw);
      patchConv(activeConv._id, { avatar: canvas.toDataURL('image/jpeg', 0.9) });
      canvas.toBlob(blob => {
        if (!blob) return;
        const fd = new FormData(); fd.append('avatar', blob, 'avatar.jpg');
        apiClient.post(`/api/supraspace/conversations/${activeConv._id}/avatar`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } })
          .then(r => { if (r.data?.data?.avatar) patchConv(activeConv._id, { avatar: r.data.data.avatar }); }).catch(() => { });
      }, 'image/jpeg', 0.9);
    };
    img.src = raw;
  };

  const handleAutrix = async (action: 'improve' | 'draft' | 'formal' | 'casual') => {
    setAutrixOpen(false); setAutrixLoading(true);
    const currentDraft = textareaRef.current?.innerText.replace(/\n$/, '') || inputTextRef.current || input;
    try {
      if (action === 'draft' && !currentDraft.trim() && activeId) {
        const r = await apiClient.post('/api/supraleo/draft', { conversationId: activeId }, { headers: { Authorization: `Bearer ${token}` } });
        const reply = r.data?.data?.draft || r.data?.data?.message || '';
        if (reply.trim()) syncComposerText(reply.trim(), true);
        return;
      }
      const recent = activeMsgs.slice(-10).map(m => `${m.sender?.fullName || 'User'}: ${m.content || '(attachment)'}`).join('\n');
      const cName = activeConv?.name || 'this conversation';
      const prompts: Record<string, string> = {
        improve: `Improve this draft for clarity and professionalism. Return only the improved text:\n\n"${currentDraft.trim()}"`,
        formal: `Rewrite this message in a formal, professional tone. Return only the text:\n\n"${currentDraft.trim()}"`,
        casual: `Rewrite this message in a friendly, casual tone. Return only the text:\n\n"${currentDraft.trim()}"`,
        draft: `Draft a brief professional reply for "${cName}". Return only the message text.\n\nRecent:\n${recent || '(none)'}`,
      };
      const r = await apiClient.post('/api/supraleo/refine', { text: prompts[action] }, { headers: { Authorization: `Bearer ${token}` } });
      const reply = r.data?.data?.refined || '';
      if (reply.trim()) { syncComposerText(reply.trim(), true); if (textareaRef.current) textareaRef.current.innerText = reply.trim(); }
    } catch (err: any) {
      const msg = getErrorMessage(err, 'AI service is unavailable');
      toast.error(msg);
    } finally { setAutrixLoading(false); }
  };

  const handleFormattedLineBreak = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return false;
    const value = el.innerText.replace(/\n$/, '');
    const cursor = getCaretOffset(el);
    const lineStart = value.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
    const lineEndRaw = value.indexOf('\n', cursor);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const line = value.slice(lineStart, lineEnd);
    const leading = line.match(/^\s*/)?.[0] || '';
    const trimmed = line.trim();

    if (/^[•◦▪]$/.test(trimmed)) {
      const next = `${value.slice(0, lineStart)}${value.slice(cursor)}`;
      syncComposerText(next, true);
      setEditableTextAndCaret(next, lineStart);
      requestAnimationFrame(refreshActiveFormats);
      return true;
    }
    const bulletMatch = line.match(/^(\s*)([•◦▪])(\s+)(.*)$/);
    if (bulletMatch) {
      const listIndent = leading;
      const insert = `\n${listIndent}${bulletMatch[2]} `;
      const next = `${value.slice(0, cursor)}${insert}${value.slice(cursor)}`;
      const caret = cursor + insert.length;
      syncComposerText(next, true);
      setEditableTextAndCaret(next, caret);
      requestAnimationFrame(refreshActiveFormats);
      return true;
    }
    if (/^\d+\.$/.test(trimmed)) {
      const next = `${value.slice(0, lineStart)}${value.slice(cursor)}`;
      syncComposerText(next, true);
      setEditableTextAndCaret(next, lineStart);
      requestAnimationFrame(refreshActiveFormats);
      return true;
    }
    const numberedMatch = line.match(/^(\s*)(\d+)\.(\s+)(.*)$/);
    if (numberedMatch) {
      const nextNum = parseInt(numberedMatch[2], 10) + 1;
      const insert = `\n${numberedMatch[1]}${nextNum}. `;
      const next = `${value.slice(0, cursor)}${insert}${value.slice(cursor)}`;
      const caret = cursor + insert.length;
      syncComposerText(next, true);
      setEditableTextAndCaret(next, caret);
      requestAnimationFrame(refreshActiveFormats);
      return true;
    }
    if (trimmed === '>') {
      const next = `${value.slice(0, lineStart)}${value.slice(cursor)}`;
      syncComposerText(next, true);
      setEditableTextAndCaret(next, lineStart);
      requestAnimationFrame(refreshActiveFormats);
      return true;
    }
    if (line.trimStart().startsWith('> ')) {
      const insert = `\n${leading}> `;
      const next = `${value.slice(0, cursor)}${insert}${value.slice(cursor)}`;
      const caret = cursor + insert.length;
      syncComposerText(next, true);
      setEditableTextAndCaret(next, caret);
      requestAnimationFrame(refreshActiveFormats);
      return true;
    }
    return false;
  }, [refreshActiveFormats, setEditableTextAndCaret, syncComposerText]);

  const insertComposerSoftLineBreak = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return false;

    el.focus();
    const selection = window.getSelection();
    if (
      !selection
      || selection.rangeCount === 0
      || !selection.anchorNode
      || !el.contains(selection.anchorNode)
    ) {
      focusComposerAtSavedCaret();
    }

    const inserted = document.execCommand('insertLineBreak');
    if (!inserted) {
      document.execCommand('insertHTML', false, '<br>');
    }

    const nextText = el.innerText.replace(/\n$/, '');
    syncComposerText(nextText, true);
    saveComposerSelection();
    refreshActiveFormats();
    return true;
  }, [
    focusComposerAtSavedCaret,
    refreshActiveFormats,
    saveComposerSelection,
    syncComposerText,
  ]);

  const applyFormat = React.useCallback((type: RichTextFormat | 'link' | 'codeblock') => {
    const el = textareaRef.current;
    if (!el) return;

    el.focus();
    const currentSelection = window.getSelection();
    const selectedText = currentSelection?.toString() || '';

    const nextRange = executeRichEditorCommandPreservingSelection(
      el,
      composerSelectionRangeRef.current,
      () => {
        const commandMap: Partial<Record<RichTextFormat, string>> = {
          bold: 'bold',
          italic: 'italic',
          underline: 'underline',
          strike: 'strikeThrough',
          list: 'insertUnorderedList',
          numbered: 'insertOrderedList',
        };

        const command = commandMap[type as RichTextFormat];
        if (command) {
          document.execCommand(command, false);
          return;
        }

        if (type === 'quote') {
          const currentBlock = String(document.queryCommandValue('formatBlock') || '')
            .toLowerCase()
            .replace(/[<>]/g, '');
          document.execCommand(
            'formatBlock',
            false,
            currentBlock.includes('blockquote') ? 'div' : 'blockquote',
          );
          return;
        }

        if (type === 'code') {
          document.execCommand('styleWithCSS', false, 'true');
          const currentFont = String(document.queryCommandValue('fontName') || '')
            .toLowerCase();
          const codeIsActive = /(monospace|courier|consolas|menlo|monaco)/i
            .test(currentFont);
          document.execCommand(
            'fontName',
            false,
            codeIsActive ? 'Geist' : 'monospace',
          );
          return;
        }

        if (type === 'codeblock') {
          const currentBlock = String(document.queryCommandValue('formatBlock') || '')
            .toLowerCase()
            .replace(/[<>]/g, '');
          document.execCommand(
            'formatBlock',
            false,
            currentBlock === 'pre' ? 'div' : 'pre',
          );
          return;
        }

        if (type === 'link') {
          document.execCommand(
            'insertText',
            false,
            selectedText ? `[${selectedText}](url)` : '[text](url)',
          );
        }
      },
      {
        normalizeListExit: type === 'list' || type === 'numbered',
      },
    );

    if (nextRange) {
      composerSelectionRangeRef.current = nextRange;
    }

    const nextText = el.innerText.replace(/\n$/, '');
    syncComposerText(nextText, true);
    saveComposerSelection();
    requestAnimationFrame(refreshActiveFormats);
  }, [
    refreshActiveFormats,
    saveComposerSelection,
    syncComposerText,
  ]);

  // Tab/Shift+Tab on a bullet or numbered-list line: Tab nests one level deeper (cycling
  // bullet glyph •→◦→▪, or renumbering from the nearest sibling at the new indent),
  // Shift+Tab un-nests. Returns false (and lets Tab behave normally) when the cursor
  // isn't on a list line.
  const handleListIndent = React.useCallback((outdent: boolean): boolean => {
    const el = textareaRef.current;
    if (!el) return false;
    const value = el.innerText.replace(/\n$/, '');
    const cursor = getCaretOffset(el);
    const lineStart = value.lastIndexOf('\n', Math.max(cursor - 1, 0)) + 1;
    const lineEndRaw = value.indexOf('\n', cursor);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const line = value.slice(lineStart, lineEnd);

    const bulletMatch = line.match(/^(\s*)([•◦▪])(\s+)(.*)$/);
    const numberedMatch = !bulletMatch ? line.match(/^(\s*)(\d+)\.(\s+)(.*)$/) : null;
    if (!bulletMatch && !numberedMatch) return false;

    const leading = (bulletMatch || numberedMatch)![1];
    if (outdent && leading.length === 0) return true;
    const nextLeading = outdent
      ? leading.slice(0, Math.max(0, leading.length - SS4_LIST_INDENT_STEP.length))
      : leading + SS4_LIST_INDENT_STEP;

    let newLine: string;
    if (bulletMatch) {
      const glyphIdx = SS4_BULLET_GLYPHS.indexOf(bulletMatch[2]);
      const nextGlyphIdx = outdent
        ? ((glyphIdx - 1) % SS4_BULLET_GLYPHS.length + SS4_BULLET_GLYPHS.length) % SS4_BULLET_GLYPHS.length
        : (glyphIdx + 1) % SS4_BULLET_GLYPHS.length;
      newLine = `${nextLeading}${SS4_BULLET_GLYPHS[nextGlyphIdx]} ${bulletMatch[4]}`;
    } else {
      const priorSibling = ss4FindPriorNumberedSibling(value, lineStart, nextLeading.length);
      newLine = `${nextLeading}${priorSibling + 1}. ${numberedMatch![4]}`;
    }

    const next = `${value.slice(0, lineStart)}${newLine}${value.slice(lineEnd)}`;
    const caret = cursor + (newLine.length - line.length);
    syncComposerText(next, true);
    setEditableTextAndCaret(next, Math.max(lineStart, caret));
    requestAnimationFrame(refreshActiveFormats);
    return true;
  }, [refreshActiveFormats, setEditableTextAndCaret, syncComposerText]);

  const applyTextColor = React.useCallback((color: string) => {
    const el = textareaRef.current;
    if (!el) return;

    el.focus();
    const nextRange = executeRichEditorCommandPreservingSelection(
      el,
      composerSelectionRangeRef.current,
      () => {
        applyTextColorToRichEditorSelection(el, color);
      },
    );

    if (nextRange) {
      composerSelectionRangeRef.current = nextRange;
    }

    setActiveTextColor(color);
    syncComposerText(el.innerText.replace(/\n$/, ''), true);
    saveComposerSelection();
    requestAnimationFrame(refreshActiveFormats);
  }, [
    refreshActiveFormats,
    saveComposerSelection,
    syncComposerText,
  ]);

  const chooseExpandedTextColor = React.useCallback((color: string) => {
    setTextPalette(prev => {
      if (prev.includes(color)) return prev;
      const replaceIndex = prev.includes(activeTextColor) ? prev.indexOf(activeTextColor) : prev.length - 1;
      const next = [...prev];
      next[replaceIndex] = color;
      return next;
    });
    applyTextColor(color);
    setTextColorPickerOpen(false);
  }, [activeTextColor, applyTextColor]);

  const formatButtonClass = React.useCallback((format: RichTextFormat) => cn(
    'h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-(--bg-hover)',
    activeFormats[format] && 'ss4-video-btn'
  ), [activeFormats]);

  const formatIconStyle = React.useCallback((format: RichTextFormat): React.CSSProperties => ({
    color: activeFormats[format] ? 'var(--accent-text)' : 'var(--text-secondary)',
  }), [activeFormats]);

  const handleDM = async (targetId: string) => {
    setShowModal({ open: false, tab: 'dm' }); setActiveUsersOpen(false);
    try {
      const r = await apiClient.post('/api/supraspace/conversations/direct', { targetUserId: targetId }, { headers: { Authorization: `Bearer ${token}` } });
      const c = r.data?.data;
      setConvos(p => p.find(x => x._id === c._id) ? p : [c, ...p]); openConversation(c._id);
    } catch { }
  };
  const handleGroup = async (name: string, ids: string[], emoji?: string) => {
    setShowModal({ open: false, tab: 'dm' });
    try { const r = await apiClient.post('/api/supraspace/conversations/group', { name, emoji, memberIds: ids }, { headers: { Authorization: `Bearer ${token}` } }); setConvos(p => [r.data?.data, ...p]); openConversation(r.data?.data._id); } catch { }
  };
  const handleCreateSpace = async (name: string, convIds: string[], emoji?: string) => {
    setShowModal({ open: false, tab: 'dm' });
    try {
      const r = await apiClient.post('/api/supraspace/spaces', { name, emoji }, { headers: { Authorization: `Bearer ${token}` } });
      const newSpaceId = r.data?.data?._id;
      refreshSpaces();
    } catch { }
  };
  const handleMoveToSpace = async (convId: string, spaceId: string | null) => {
    try {
      await apiClient.patch(`/api/supraspace/conversations/${convId}/space`, { spaceId }, { headers: { Authorization: `Bearer ${token}` } });
      setConvos(p => p.map(c => c._id === convId ? { ...c, spaceId: spaceId || null } as any : c));
    } catch { }
  };
  const handleDeleteSpace = async (spaceId: string) => {
    setDeleteSpaceConfirm(null);
    try {
      await apiClient.delete(`/api/supraspace/spaces/${spaceId}`, { headers: { Authorization: `Bearer ${token}` } });
      setConvos(p => p.map(c => (c as any).spaceId === spaceId ? { ...c, spaceId: null } as any : c));
      setLocalSpaceOrder(p => p.filter(id => id !== spaceId));
      refreshSpaces();
    } catch { }
  };
  const handleSpaceDrop = (fromSpaceId: string, targetSpaceId: string) => {
    if (fromSpaceId === targetSpaceId) return;
    const base = localSpaceOrder.length ? localSpaceOrder : ctxSpaces.map(sp => sp._id);
    const order = [...base];
    const fromIdx = order.indexOf(fromSpaceId);
    if (fromIdx !== -1) order.splice(fromIdx, 1);
    const toIdx = order.indexOf(targetSpaceId);
    order.splice(toIdx, 0, fromSpaceId);
    setLocalSpaceOrder(order);
  };
  const handleReorderConv = (fromId: string, beforeId: string) => {
    const allGroupIds = normalList.filter(c => c.type === 'group').map(c => c._id);
    const base = localConvOrder.length ? [...localConvOrder] : allGroupIds;
    allGroupIds.forEach(id => { if (!base.includes(id)) base.push(id); });
    const fromIdx = base.indexOf(fromId);
    if (fromIdx !== -1) base.splice(fromIdx, 1);
    const toIdx = base.indexOf(beforeId);
    base.splice(toIdx >= 0 ? toIdx : base.length, 0, fromId);
    setLocalConvOrder(base);
  };

  handleMoveToSpaceRef.current = handleMoveToSpace;
  handleSpaceDropRef.current = handleSpaceDrop;
  handleReorderConvRef.current = handleReorderConv;

  const loadMore = React.useCallback(async () => {
    if (!activeId || !hasMore[activeId] || loadingMsgs) return;
    if (forceScrollToBottomRef.current === activeId) return;
    const scrollEl = messageScrollRef.current;
    if (scrollEl) {
      pendingScrollRestoreRef.current = {
        convId: activeId,
        scrollHeight: scrollEl.scrollHeight,
        scrollTop: scrollEl.scrollTop,
      };
    }
    setLoadingMsgs(true);
    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${activeId}/messages`, { headers: { Authorization: `Bearer ${token}` }, params: { before: activeMsgs[0]?.createdAt, limit: 40 } });
      const d = r.data?.data || [];
      setMsgs(p => ({ ...p, [activeId]: [...d, ...(p[activeId] || [])] }));
      setHasMore(p => ({ ...p, [activeId]: d.length === 40 }));
    } catch {
      pendingScrollRestoreRef.current = null;
    } finally { setLoadingMsgs(false); }
  }, [activeId, activeMsgs, hasMore, loadingMsgs, token]);

  const handleMessageScroll = React.useCallback(() => {
    const el = messageScrollRef.current;
    if (!el || !activeId) return;
    if (forceScrollToBottomRef.current === activeId && Date.now() <= openBottomLockUntilRef.current) {
      if (userScrollGestureRef.current) {
        cancelOpenBottomLock();
      } else {
        setShowJumpToLatest(false);
        return;
      }
    }
    if (userScrollGestureRef.current) {
      setMessageScrollActive(true);
      if (messageScrollIdleTimerRef.current) clearTimeout(messageScrollIdleTimerRef.current);
      messageScrollIdleTimerRef.current = setTimeout(() => setMessageScrollActive(false), 220);
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 360);
    if (!hasMore[activeId] || loadingMsgs) return;
    if (el.scrollTop < 180) loadMore();
  }, [activeId, hasMore, loadingMsgs, loadMore, cancelOpenBottomLock]);

  React.useEffect(() => {
    return () => {
      if (messageScrollIdleTimerRef.current) clearTimeout(messageScrollIdleTimerRef.current);
      if (userScrollGestureTimerRef.current) clearTimeout(userScrollGestureTimerRef.current);
    };
  }, []);

  // Jumps to a specific message from a search hit (or the in-conversation search
  // below) — deliberately does NOT call openConversation(), which always fetches
  // the latest 40 messages and forces a scroll-to-bottom (it has no concept of
  // "open, but at a specific spot"). A search hit is very often OLDER than the
  // most recent 40, so that path would load the wrong window and the previous
  // fixed-delay getElementById lookup would silently find nothing. Instead this
  // fetches the messages page anchored on the target's own timestamp (so the hit
  // is guaranteed to be in the loaded window in one request) and hands off to the
  // same pendingNotificationTargetRef effect notifications already use, which
  // waits for the message to actually be present in state before scrolling.
  const openSearchResult = React.useCallback(async (convId: string, messageId: string, createdAt?: string) => {
    setQ('');
    pendingScrollRestoreRef.current = null;
    if (forceScrollToBottomRef.current === convId) forceScrollToBottomRef.current = null;
    suppressAutoScrollOnceRef.current = true;
    setShowJumpToLatest(false);
    setShowInfo(false);
    setActiveId(convId);
    setManualUnread(p => { if (!p.has(convId)) return p; const n = new Set(p); n.delete(convId); return n; });
    pendingNotificationTargetRef.current = { conversationId: convId, messageId };

    if ((msgsRef.current[convId] || []).some(m => m._id === messageId)) return;

    const t = tokenRef.current;
    if (!t) return;
    setLoadingMsgs(true);
    try {
      const params: Record<string, string | number> = { limit: 40 };
      if (createdAt) params.before = new Date(new Date(createdAt).getTime() + 1000).toISOString();
      const r = await apiClient.get(`/api/supraspace/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${t}` }, params,
      });
      const d: SSMessage[] = r.data?.data || [];
      setMsgs(p => ({ ...p, [convId]: d }));
      setHasMore(p => ({ ...p, [convId]: d.length === 40 }));
      setMsgFetchState(p => ({ ...p, [convId]: 'loaded' }));
    } catch {
      // Falls back to whatever openConversation-style caching already had — the
      // pendingNotificationTargetRef effect simply won't find the target and no
      // scroll happens, same graceful no-op as a failed notification deep link.
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const typers = activeId ? (typing[activeId] || []).filter(t => t.userId !== uid) : [];
  const themeStyle = themeVars(activeConv?.theme);

  const mentionOptions = React.useMemo(() => {
    if (mentionQuery === null || !activeConv) return [];
    const q = mentionQuery.toLowerCase();
    const memberOpts = activeConv.members
      .filter(m => m._id !== uid)
      .map(m => ({
        id: m._id,
        name: (() => { const p = m.fullName.trim().split(/\s+/); return p.length >= 2 ? `${p[0]} ${p[p.length - 1]}` : p[0]; })(),
        fullName: m.fullName,
        avatar: m.avatar as string | undefined,
      }));
    const allOpt = activeConv.type === 'group'
      ? [{ id: 'all', name: 'all', fullName: 'Notify all members', avatar: undefined as string | undefined }]
      : [];
    const opts = [...allOpt, ...memberOpts];
    if (!q) return opts;
    return opts.filter(o => o.name.toLowerCase().startsWith(q) || o.fullName.toLowerCase().includes(q));
  }, [mentionQuery, activeConv, uid]);

  const channelMentionOptions = React.useMemo(() => {
    if (channelMentionQuery === null) return [];
    const q = channelMentionQuery.toLowerCase();
    const opts = convos
      .filter(c => c.type === 'group' && c._id !== activeId && c.name)
      .map(c => ({ id: c._id, name: (c.name as string).replace(/\s+/g, ''), label: `${c.emoji ? c.emoji + ' ' : ''}${c.name}` }));
    if (!q) return opts;
    return opts.filter(o => o.name.toLowerCase().startsWith(q) || o.label.toLowerCase().includes(q));
  }, [channelMentionQuery, convos, activeId]);
  const wallpaper = activeConv?.theme?.wallpaper || undefined;

  const matchesConversationFilter = React.useCallback((conv: SSConversation) => {
    const unread = isConvUnreadForUser(conv, uid, manualUnread);
    if (conversationFilter === 'unread') return unread;
    if (conversationFilter === 'read') return !unread;
    if (conversationFilter === 'mentions') return hasUnreadMentionForUser(conv, uid, me?.fullName, me?.username, msgs[conv._id]);
    return true;
  }, [conversationFilter, uid, manualUnread, me?.fullName, me?.username, msgs]);
  const visibleConvos = convos.filter(c =>
    getConvName(c, uid).toLowerCase().includes(q.toLowerCase()) &&
    matchesConversationFilter(c)
  );
  const pinnedList = visibleConvos.filter(c => isPinnedConv(c) && !isArchivedConv(c));
  const archivedList = convos.filter(c => isArchivedConv(c) && matchesConversationFilter(c));
  const normalList = visibleConvos.filter(c => !isPinnedConv(c) && !isArchivedConv(c));
  const dmList = normalList.filter(c => c.type === 'direct');
  const channelList = React.useMemo(() => {
    const activeSpaceIds = new Set(ctxSpaces.map(s => s._id));
    const list = normalList.filter(c => {
      if (c.type !== 'group') return false;
      const sid = (c as any).spaceId;
      return !sid || !activeSpaceIds.has(sid);
    });
    if (!localConvOrder.length) return list;
    return [...list].sort((a, b) => {
      const ai = localConvOrder.indexOf(a._id);
      const bi = localConvOrder.indexOf(b._id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalList, localConvOrder, ctxSpaces]);
  const toggleSection = (key: string) => setCollapsedSections(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleSpaceCollapse = (id: string) => setCollapsedSpaces(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const orderedSpaces = React.useMemo(() => {
    if (!localSpaceOrder.length) return ctxSpaces;
    const map = Object.fromEntries(ctxSpaces.map(sp => [sp._id, sp]));
    const result = localSpaceOrder.map(id => map[id]).filter(Boolean);
    ctxSpaces.forEach(sp => { if (!localSpaceOrder.includes(sp._id)) result.push(sp); });
    return result;
  }, [ctxSpaces, localSpaceOrder]);

  const sharedConvRowProps = {
    activeId, activeConvId: activeConv?._id ?? null, uid, token, presence, notifPrefs, manualUnread, msgs, composerDraftPreviews, ctxSpaces, dragConvId,
    openConvMenuId, setOpenConvMenuId, isPinnedConv, isArchivedConv, ptrStartRef, convLongPressTimer,
    openConversation, setConvMobileSheet, markRead, setManualUnread, setConvos, togglePinConv, saveNotificationPref,
    setNotifModalConv, handleMoveToSpace, toggleArchiveConv, setDeleteConfirmConv, setActiveId, setShowInfo,
  };

  if (loading) return (
    <div className={cn('ss4 flex items-center justify-center h-full min-h-screen')} data-theme={theme}>
      <div className="flex flex-col items-center gap-4">
        <SupraSpaceLogo size={56} />
        <div className="flex flex-col items-center gap-2">
          <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Suprah <span style={{ color: 'var(--positive)' }}>Space</span></p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.01em' }}>The Communication Hub That Drives Every Deal</p>
          <div className="flex gap-1.5">{[0, 1, 2].map(i => <span key={i} className="ss4-typing-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {me?.role && <CrmPushPrompt role={me.role} />}
      { }
      {(dragConvId || dragSpaceId) && (
        <style>{`* { cursor: grabbing !important; }`}</style>
      )}
      { }
      {typeof window !== 'undefined' && createPortal(
        <div ref={dragGhostRef} style={{
          display: 'none',
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 99999,
          background: 'var(--surface-2, #252a31)',
          border: '1px solid var(--accent, #5b7cf6)',
          borderRadius: 8,
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary, rgba(255,255,255,0.92))',
          boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
          whiteSpace: 'nowrap',
        }} />,
        document.body
      )}
      <div className={cn('ss4 absolute inset-0 flex flex-col overflow-hidden')} data-theme={theme}>
        { }
        <header className={cn('ss4-topbar shrink-0 z-40', activeId ? 'hidden lg:block' : '')} style={{ minHeight: 52 }}>
          <div className="flex items-center justify-between h-full px-3 sm:px-4 py-2.5">
            <div className="flex items-center gap-3">
              {!embedded && (<><button onClick={() => router.push('/crm/dashboard')} className="ss4-icon-btn h-8 w-8"><ArrowLeft className="h-4 w-4" /></button><div className="h-5 w-px" style={{ background: 'var(--border-2)' }} /></>)}
              <div className="flex items-center gap-2.5">
                <SupraSpaceLogo size={32} className="shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <p className="ss4-display font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Suprah <span style={{ color: 'var(--positive)' }}>Space</span></p>
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: isConnected ? 'var(--positive)' : 'var(--text-disabled)', boxShadow: isConnected ? '0 0 6px rgba(52,201,125,0.7)' : 'none' }} />
                    {isConnected && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--positive)', letterSpacing: '0.06em' }}>Live</span>}
                  </div>
                  <p className="leading-none mt-0.5 font-medium" style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>The Communication Hub That Drives Every Deal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <MountainTimeClock compact />
              <button onClick={() => setActiveUsersOpen(true)} className="ss4-video-btn h-8 px-3 flex items-center gap-1.5" title="Active users">
                <Wifi className="h-3.5 w-3.5" />
                <span className="font-semibold hidden sm:inline" style={{ fontSize: 11 }}>{allUsers.filter(u => u._id !== uid && presence[u._id]?.onlineStatus && presence[u._id]?.onlineStatus !== 'offline').length} active</span>
              </button>
              <button onClick={toggleTheme} className="ss4-theme-btn h-8 w-8 flex items-center justify-center" title="Toggle theme">{theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}</button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          { }
          <aside className={cn(
            'ss4-sidebar flex-col overflow-hidden',
            'absolute inset-0 z-20',
            'lg:relative lg:inset-auto lg:z-auto lg:flex lg:w-72 lg:shrink-0 lg:translate-x-0',
            activeId ? 'hidden -translate-x-full lg:flex' : 'flex translate-x-0',
          )}>
            <div className="px-4 pt-5 pb-3 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="ss4-section-label">Messages</span>
                <div className="flex items-center gap-1.5">
                  {convos.some(c => isConvUnreadForUser(c, uid, manualUnread)) && (
                    <button
                      onClick={() => {
                        markAllRead();
                        setConvos(prev => prev.map(c => {
                          if (!c.lastMessage) return { ...c, unreadCount: 0, unreadMentionCount: 0 };
                          const rb = c.lastMessage.readBy || [];
                          if (rb.includes(uid)) return { ...c, unreadCount: 0, unreadMentionCount: 0 };
                          return { ...c, unreadCount: 0, unreadMentionCount: 0, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
                        }));
                        setManualUnread(new Set());
                      }}
                      className="ss4-icon-btn h-7 w-7"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="ss4-new-btn h-7 px-2.5 flex items-center gap-1.5" title="New conversation"><Plus className="h-3 w-3" /><span className="font-semibold" style={{ fontSize: 11 }}>New</span></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-40 rounded-xl p-1" style={{ background: theme === 'dark' ? '#141618' : '#ffffff', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => setShowModal({ open: true, tab: 'dm' })}>
                        <MessageSquare className="h-3.5 w-3.5" /> Direct Message
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => setShowModal({ open: true, tab: 'group' })}>
                        <Hash className="h-3.5 w-3.5" /> New Channel
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => setShowModal({ open: true, tab: 'space' })}>
                        <Sparkles className="h-3.5 w-3.5" /> New Space
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div ref={meetingMenuRef} className="relative">
                    <button
                      onClick={() => setMeetingMenuOpen(v => !v)}
                      className="ss4-video-btn h-7 px-2.5 flex items-center gap-1.5"
                      title="New meeting"
                      disabled={!!meetingActionLoading}
                      style={{ opacity: meetingActionLoading ? 0.7 : 1 }}
                    >
                      {meetingActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
                      <span className="font-semibold hidden sm:inline" style={{ fontSize: 11 }}>Meet</span>
                    </button>
                    {meetingMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 z-50 w-59 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)' }}>
                        <button onClick={handleCreateMeetingForLater} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg hover:bg-(--bg-hover)" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          <Link2 className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                          Create a meeting link for later
                        </button>
                        <button onClick={handleStartInstantMeeting} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg hover:bg-(--bg-hover)" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          <Plus className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                          Start an instant meeting
                        </button>
                        <button onClick={() => { setMeetingMenuOpen(false); setScheduleMeetingOpen(true); }} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg hover:bg-(--bg-hover)" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          <CalendarPlus className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                          Schedule in Suprah Calendar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chats & messages…" className="w-full h-9 rounded-lg pl-9 pr-3 text-xs ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {CONVERSATION_FILTERS.map((filter) => {
                  const active = conversationFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setConversationFilter(filter.key)}
                      className="shrink-0 rounded-full transition-colors"
                      style={{
                        background: active ? 'var(--accent)' : 'var(--bg-hover)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-2)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '26px',
                        minHeight: '26px',
                        maxHeight: '26px',
                        padding: '0 10px',
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mx-4 ss4-divider" />

            <div className="flex-1 min-h-0 overflow-y-auto ss4-scroll pb-2">
              {q.trim().length >= 2 && (
                <div className="pt-2">
                  <div className="px-3 pb-1.5 flex items-center justify-between">
                    <span className="ss4-section-label">Messages{searching ? '…' : ` · ${msgResults.length}`}</span>
                  </div>
                  {msgResults.map((m: any) => {
                    const c = m.conversationId; const cName = c?.type === 'group' ? (c?.name || 'Channel') : 'Direct message';
                    return (
                      <button key={m._id} onClick={() => openSearchResult(c?._id || c, m._id, m.createdAt)} className="ss4-conv w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left">
                        <span className="font-semibold truncate w-full" style={{ fontSize: 11.5, color: 'var(--accent-text)' }}>{cName} · {m.sender?.fullName}</span>
                        <span className="truncate w-full" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{messagePreviewText(m.content)}</span>
                      </button>
                    );
                  })}
                  {!searching && msgResults.length === 0 && <p className="px-3 py-2" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No matching messages</p>}
                  <div className="mx-3 my-2 ss4-divider" />
                </div>
              )}

              {pinnedList.length > 0 && (
                <div className="pt-1">
                  <div className="px-3 pt-2 pb-1.5"><span className="ss4-section-label"><Pin className="h-2.5 w-2.5 mr-1" /> Pinned</span></div>
                  <div className="px-2 space-y-0.5">{pinnedList.map(c => <ConvRow key={c._id} conv={c} {...sharedConvRowProps} />)}</div>
                </div>
              )}

              { }
              {dmList.length > 0 && (
                <div>
                  <button className="w-full px-3 pt-3 pb-1.5 flex items-center justify-between group" onClick={() => toggleSection('dm')}>
                    <span className="ss4-section-label"><MessageSquare className="h-2.5 w-2.5 mr-1" /> Direct Messages</span>
                    <ChevronLeft className="h-3 w-3 transition-transform" style={{ color: 'var(--text-tertiary)', transform: collapsedSections.has('dm') ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                  </button>
                  {!collapsedSections.has('dm') && <div className="px-2 space-y-0.5">{dmList.map(c => <ConvRow key={c._id} conv={c} {...sharedConvRowProps} />)}</div>}
                </div>
              )}

              { }
              {orderedSpaces.length > 0 && (
                <div>
                  <button className="w-full px-3 pt-3 pb-1.5 flex items-center justify-between" onClick={() => toggleSection('spaces')}>
                    <span className="ss4-section-label"><Sparkles className="h-2.5 w-2.5 mr-1" /> Spaces</span>
                    <ChevronLeft className="h-3 w-3 transition-transform" style={{ color: 'var(--text-tertiary)', transform: collapsedSections.has('spaces') ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                  </button>
                  {!collapsedSections.has('spaces') && orderedSpaces.map((space, idx) => {
                    const spaceConvsRaw = normalList.filter(c => c.type === 'group' && (c as any).spaceId === space._id);
                    const spaceConvs = localConvOrder.length
                      ? [...spaceConvsRaw].sort((a, b) => { const ai = localConvOrder.indexOf(a._id); const bi = localConvOrder.indexOf(b._id); return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi); })
                      : spaceConvsRaw;
                    const isCollapsed = collapsedSpaces.has(space._id);
                    const isConvDropTarget = dropSpaceId === space._id && !!dragConvId;
                    const isSpaceDropTarget = dropBeforeSpaceId === space._id && !!dragSpaceId && dragSpaceId !== space._id;
                    return (
                      <div key={space._id}
                        data-drop-zone={space._id}
                        data-drop-before={space._id}>
                        { }
                        {isSpaceDropTarget && (
                          <div style={{ height: 2, background: 'var(--accent)', borderRadius: 1, margin: '2px 8px' }} />
                        )}
                        <div
                          style={{ borderRadius: 8, transition: 'background .15s', background: isConvDropTarget ? 'rgba(91,124,246,0.12)' : 'transparent', outline: isConvDropTarget ? '1.5px dashed var(--accent)' : 'none', margin: '0 4px 2px' }}>
                          <div className="group flex items-center gap-1 px-2 py-1.5">
                            { }
                            <div
                              onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                e.preventDefault();
                                ptrStartRef.current = { x: e.clientX, y: e.clientY, type: 'space', id: space._id, label: space.name };
                              }}
                              className="cursor-grab shrink-0 flex items-center opacity-0 group-hover:opacity-40 hover:opacity-80! transition-opacity"
                              style={{ padding: '0 1px' }}>
                              <GripVertical className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
                            </div>
                            <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left" onClick={() => toggleSpaceCollapse(space._id)}>
                              <ChevronLeft className="h-3 w-3 shrink-0 transition-transform" style={{ color: 'var(--text-tertiary)', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                              <span className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                {space.emoji ? `${space.emoji} ` : ''}{space.name}
                              </span>
                              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginLeft: 2 }}>{spaceConvs.length}</span>
                            </button>
                            { }
                            <button onClick={(e) => { e.stopPropagation(); setDeleteSpaceConfirm(space._id); }}
                              className="shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity h-5 w-5 flex items-center justify-center rounded"
                              style={{ color: 'var(--text-tertiary)' }}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          {!isCollapsed && (
                            <div className="px-1 pb-1 space-y-0.5">
                              {spaceConvs.map(c => (
                                <React.Fragment key={c._id}>
                                  {dropConvBeforeId === c._id && <div style={{ height: 2, background: 'var(--accent)', borderRadius: 1, margin: '1px 4px' }} />}
                                  <ConvRow conv={c} draggable {...sharedConvRowProps} />
                                </React.Fragment>
                              ))}
                              {spaceConvs.length === 0 && (
                                <p className="px-3 py-1.5 text-center" style={{ fontSize: 10.5, color: 'var(--text-disabled)' }}>Drag a channel here</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              { }
              {(channelList.length > 0 || !!dragConvId) && (
                <div
                  data-drop-zone="__channels__"
                  style={{ borderRadius: 8, transition: 'background .15s', background: dropSpaceId === '__channels__' ? 'rgba(91,124,246,0.12)' : 'transparent', outline: dropSpaceId === '__channels__' ? '1.5px dashed var(--accent)' : 'none', margin: dropSpaceId === '__channels__' ? '0 4px 2px' : undefined }}>
                  <button className="w-full px-3 pt-3 pb-1.5 flex items-center justify-between" onClick={() => toggleSection('channels')}>
                    <span className="ss4-section-label"><Hash className="h-2.5 w-2.5 mr-1" /> Channels</span>
                    <ChevronLeft className="h-3 w-3 transition-transform" style={{ color: 'var(--text-tertiary)', transform: collapsedSections.has('channels') ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                  </button>
                  {!collapsedSections.has('channels') && (
                    <div className="px-2 space-y-0.5">
                      {channelList.map(c => (
                        <React.Fragment key={c._id}>
                          {dropConvBeforeId === c._id && <div style={{ height: 2, background: 'var(--accent)', borderRadius: 1, margin: '1px 4px' }} />}
                          <ConvRow conv={c} draggable {...sharedConvRowProps} />
                        </React.Fragment>
                      ))}
                      {channelList.length === 0 && dragConvId && (
                        <p className="px-3 py-1.5 text-center" style={{ fontSize: 10.5, color: 'var(--text-disabled)' }}>Drop here to remove from Space</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {normalList.length === 0 && pinnedList.length === 0 && q.trim().length < 2 && (
                <div className="flex flex-col items-center justify-center h-40 gap-3 px-3">
                  <div className="h-10 w-10 rounded-xl ss4-empty-icon flex items-center justify-center"><MessageSquare className="h-4 w-4" style={{ color: 'var(--accent)' }} /></div>
                  <p className="text-center" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {conversationFilter === 'all' ? 'No conversations yet' : `No ${CONVERSATION_FILTERS.find(f => f.key === conversationFilter)?.label.toLowerCase()} conversations`}
                  </p>
                </div>
              )}

              {archivedList.length > 0 && (
                <div className="pt-3">
                  <button onClick={() => setShowArchived(v => !v)} className="w-full px-3 pt-2 pb-1.5 flex items-center justify-between">
                    <span className="ss4-section-label"><Archive className="h-2.5 w-2.5 mr-1" /> Archived · {archivedList.length}</span>
                    <ChevronLeft className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)', transform: showArchived ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
                  </button>
                  {showArchived && <div className="px-2 space-y-0.5">{archivedList.map(c => <ConvRow key={c._id} conv={c} compact {...sharedConvRowProps} />)}</div>}
                </div>
              )}
            </div>
          </aside>

          { }
          <main
            className={cn(
              'flex-col min-h-0 overflow-hidden',
              'absolute inset-0 z-10',
              'lg:relative lg:inset-auto lg:z-auto lg:flex lg:flex-1 lg:translate-x-0',
              !activeId ? 'hidden translate-x-full lg:flex' : 'flex translate-x-0',
            )}
            style={themeStyle}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div
              data-supraspace-chat-boundary="true"
              className="relative flex-1 flex min-h-0 flex-col overflow-hidden min-w-0"
              style={{ background: 'var(--bg-base)' }}
            >
              {isDraggingOver && activeId && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                  <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--accent)', textAlign: 'center', maxWidth: 300 }}>
                    <Paperclip className="h-9 w-9" style={{ color: 'var(--accent)' }} />
                    <p className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Drop to attach</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Files will be added to your message</p>
                  </div>
                </div>
              )}
              {!activeId && (
                <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-4" style={{ background: 'var(--bg-base)' }}>
                  <SupraSpaceLogo size={64} />
                  <div className="text-center">
                    <p className="ss4-display font-bold" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Suprah <span style={{ color: 'var(--positive)' }}>Space</span></p>
                    <p className="mt-1.5" style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>The Communication Hub That Drives Every Deal</p>
                    <p className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-disabled)' }}>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}

              {activeId && activeConv && (
                <>
                  { }
                  <div className="ss4-chat-header shrink-0 flex items-center gap-2.5 px-3 py-3.5 lg:px-4 lg:py-3">
                    <button className="lg:hidden ss4-icon-btn h-10 w-10 shrink-0" onClick={() => { setActiveId(null); setShowInfo(false); }} aria-label="Back to conversations"><ChevronLeft className="h-5 w-5" /></button>
                    <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <div className="relative shrink-0">
                        <div className={cn('h-10.5 w-10.5 lg:h-9 lg:w-9 rounded-full flex items-center justify-center overflow-hidden', activeConv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(getConvName(activeConv, uid)))}>
                          {activeConv.type === 'group' ? <ChannelFace conv={activeConv} avatar={resolveImageUrl(getConvAvatar(activeConv, uid))} name={getConvName(activeConv, uid)} size={14} /> : getConvAvatar(activeConv, uid) ? <img src={resolveImageUrl(getConvAvatar(activeConv, uid))} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold text-sm lg:text-[11px]">{ini(getConvName(activeConv, uid))}</span>}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="ss4-display font-bold leading-tight truncate text-[17px] lg:text-sm" style={{ color: 'var(--text-primary)' }}>{getConvName(activeConv, uid)}</p>
                        <p className="mt-0.5 leading-tight text-[13px] lg:mt-1 lg:text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {activeConv.type === 'group' ? `${safeMembers(activeConv).length} members` : (() => {
                            const o = safeMembers(activeConv).find(m => m._id !== uid);
                            const status = o ? presence[o._id]?.onlineStatus : undefined;
                            if (!status || status === 'offline') return 'Offline';
                            return <span style={{ color: status === 'online' ? 'var(--positive)' : 'var(--text-tertiary)' }}>{'\u{1f7e2}'} {S.label[status]}</span>;
                          })()}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="ss4-video-btn h-10 min-w-10 px-2.5 lg:h-8 lg:min-w-0 lg:px-3 flex items-center justify-center gap-1.5" title="Start a call"><Phone className="h-5 w-5 lg:h-3.5 lg:w-3.5" /><span className="font-semibold hidden sm:inline" style={{ fontSize: 12 }}>Call</span></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl" style={{ background: theme === 'dark' ? '#141618' : '#ffffff', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}>
                          <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => handleStartCall(activeConv)}><Video className="h-3.5 w-3.5" /> Video Call</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => handleStartCall(activeConv)}><Phone className="h-3.5 w-3.5" /> Voice Call</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => setMeetingOpen(true)}><CalendarPlus className="h-3.5 w-3.5" /> Create Meeting</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <button onClick={() => setShowInfo(v => !v)} className={cn('ss4-icon-btn h-10 w-10 lg:h-8 lg:w-8', showInfo && 'ss4-video-btn')} title="Details"><Info className="h-5 w-5 lg:h-4 lg:w-4" /></button>
                    </div>
                  </div>

                  { }
                  {call.liveCalls[activeId] && !activeMeeting && (
                    <CallBanner call={call.liveCalls[activeId]} onJoin={() => handleJoinCall(call.liveCalls[activeId].meetingId)} />
                  )}

                  { }
                  {(() => {
                    const pinnedMsgs = activePinnedMsgs;
                    if (pinnedMsgs.length === 0) return null;
                    const latest = pinnedMsgs[pinnedMsgs.length - 1];
                    return (
                      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 transition-colors sm:gap-2.5 sm:px-4 sm:py-2"
                        style={{ background: 'var(--accent-muted)', borderBottom: '1px solid var(--border-1)' }}>
                        <Pin className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                        <div className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setPinnedModalOpen(true)}>
                          <p className="font-semibold" style={{ fontSize: 10, color: 'var(--accent-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pinned Messages{pinnedMsgs.length > 1 ? ' (' + pinnedMsgs.length + ')' : ''}</p>
                          <p className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{latest.sender?.fullName || 'Deleted User'}: {messagePreviewText(latest.content) || String.fromCodePoint(128206) + ' Attachment'}</p>
                        </div>
                        <button onClick={() => handlePinToggle(latest._id)} className="ss4-icon-btn h-6 w-6 shrink-0" title="Unpin"><X className="h-3 w-3" /></button>
                      </div>
                    );
                  })()}

                  {/* Messages */}
                  <div className="relative flex-1 min-h-0">
                    <div
                      ref={messageScrollRef}
                      onScroll={handleMessageScroll}
                      onWheel={markUserScrollGesture}
                      onTouchMove={markUserScrollGesture}
                      onMouseDown={markUserScrollGesture}
                      data-supraspace-message-scroll="true"
                      className="h-full overflow-y-auto py-2 space-y-1 ss4-scroll sm:py-3 sm:space-y-1.5"
                      style={{ ...(wallpaper ? { backgroundImage: wallpaper } : {}), overflowAnchor: 'none' }}
                      onLoadCapture={() => {
                        if (activeId && forceScrollToBottomRef.current === activeId && Date.now() <= openBottomLockUntilRef.current) {
                          scrollToLatest('auto', activeId);
                        }
                      }}
                    >
                      {hasMore[activeId] && (
                        <div className="flex justify-center pb-3">
                          <button onClick={loadMore} className="font-medium px-4 py-1.5 rounded-full inline-flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-hover)' }}>
                            {loadingMsgs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Scroll up for earlier messages'}
                          </button>
                        </div>
                      )}
                      {(loadingMsgs || activeMsgStatus === 'loading') && activeMsgs.length === 0 && <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} /></div>}
                      {!loadingMsgs && activeMsgs.length === 0 && activeConv && activeMsgStatus !== 'error' && activeMsgStatus !== 'stale' && !activeConvHasHistorySignal && (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 select-none">
                          <span style={{ fontSize: 44, lineHeight: 1 }}>{'\u{1f44b}'}</span>
                          <p className="font-semibold mt-2" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                            {activeConv.type === 'direct'
                              ? `Say Hi to ${safeMembers(activeConv).find(m => m._id !== uid)?.fullName || 'your friend'}!`
                              : `Welcome to ${activeConv.name || 'this channel'}!`}
                          </p>
                          <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                            {activeConv.type === 'direct' ? 'Send a message to start the conversation.' : 'Be the first to send a message.'}
                          </p>
                        </div>
                      )}
                      {activeMsgs.map((msg, i) => {
                        const prevMsg = activeMsgs[i - 1] || null;
                        const nextMsg = activeMsgs[i + 1] || null;
                        const showDate = !prevMsg || fmtDate(msg.createdAt) !== fmtDate(prevMsg.createdAt);
                        const showAvatar = !prevMsg || prevMsg.sender?._id !== msg.sender?._id || showDate;
                        const hideTime = !!(nextMsg
                          && nextMsg.sender?._id === msg.sender?._id
                          && fmtDate(nextMsg.createdAt) === fmtDate(msg.createdAt)
                          && new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000
                        );
                        return (
                          <React.Fragment key={msg._id}>
                            {showDate && <DateSep date={msg.createdAt} />}
                            <div id={`ss4-msg-${msg._id}`}>
                              <Bubble message={msg} isOwn={msg.sender?._id === uid} showAvatar={showAvatar} uid={uid} onReply={setReplyTo} onDelete={handleDelete} onPin={handlePinToggle} isPinned={pinnedMsgIds.has(msg._id)} onOpenMedia={setLightbox} onReact={handleReact} onVotePoll={handleVotePoll} onRsvp={handleRsvp} onJoinMeeting={handleJoinCall} nameFor={nameFor} members={msgSeenByMembers[msg._id] || []} hideTime={hideTime} onEditSave={handleEdit} onForward={setForwardMsg} suppressActionsDuringScroll={messageScrollActive} defaultReactionEmoji={activeConv?.theme?.emoji || SS4_REACTIONS[0]} />
                            </div>
                            {pinEvents.find(e => e.msgId === msg._id) && (() => {
                              const ev = pinEvents.find(e => e.msgId === msg._id)!;
                              return (
                                <div className="flex items-center justify-center px-3 py-1 my-0.5 sm:px-4 sm:py-1.5">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full sm:px-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-1)' }}>
                                    <span style={{ fontSize: 14 }}>{'\u{1f4cc}'}</span>
                                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.pinnerName}</span>{' pinned a message to the board'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </React.Fragment>
                        );
                      })}
                      {typers.length > 0 && (
                        <div className="flex gap-2 px-4 py-1 sm:gap-2.5 sm:px-5">
                          <div className="w-7 sm:w-8" />
                          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl rounded-tl-sm sm:gap-2.5 sm:px-4 sm:py-2.5" style={{ background: 'var(--bubble-other-bg)', border: '1px solid var(--bubble-other-border)' }}>
                            <span className="italic" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{typers.map(t => t.fullName).join(', ')} {typers.length === 1 ? 'is' : 'are'} typing</span>
                            <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="ss4-typing-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />)}</div>
                          </div>
                        </div>
                      )}
                      <div ref={endRef} />
                    </div>
                    {showJumpToLatest && (
                      <button
                        type="button"
                        onClick={() => scrollToLatest('smooth')}
                        className="absolute bottom-3 left-1/2 z-20 h-10 w-10 -translate-x-1/2 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                        style={{ background: 'var(--accent)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
                        title="Jump to latest"
                        aria-label="Jump to latest messages"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  { }
                  <div className="shrink-0 px-2.5 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] space-y-1 md:pb-2 sm:px-4 sm:pt-2 sm:space-y-1.5">
                    {replyTo && (
                      <div className="ss4-reply-bar flex items-center gap-2 px-3 py-2.5">
                        <Reply className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                        <div className="min-w-0 flex-1"><p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{replyTo.sender?.fullName || 'Deleted User'}</p><p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{messagePreviewText(replyTo.content) || '\u{1f4ce} Attachment'}</p></div>
                        <button onClick={() => setReplyTo(null)} className="ss4-icon-btn p-1 h-6 w-6"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                    {pendingFiles.length > 0 && (
                      <div className="ss4-reply-bar flex flex-col gap-2 px-3 py-2.5">
                        <div className="flex items-center justify-between"><p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{pendingFiles.length} attachment{pendingFiles.length === 1 ? '' : 's'} ready</p><button onClick={() => setPendingFiles([])} className="ss4-icon-btn h-6 px-2" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Clear all</button></div>
                        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{pendingFiles.map((file, index) => <FilePreviewItem key={`${file.name}-${index}`} file={file} onRemove={() => removePendingFile(index)} />)}</div>
                      </div>
                    )}
                    {pendingMeeting && (
                      <div className="ss4-reply-bar px-3 py-2.5">
                        <PendingMeetingPreview meeting={pendingMeeting} onRemove={() => setPendingMeeting(null)} />
                      </div>
                    )}
                    {pendingGif && (
                      <div className="ss4-reply-bar flex items-start gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="font-semibold truncate" style={{ fontSize: 11, color: 'var(--accent-text)' }}>
                              GIF ready to send
                            </p>
                            <button onClick={() => setPendingGif(null)} className="ss4-icon-btn h-6 w-6 shrink-0" title="Remove GIF">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <img
                            src={pendingGif.url}
                            alt={pendingGif.title || 'Selected GIF'}
                            className="rounded-lg object-cover"
                            style={{ maxWidth: 220, maxHeight: 150, border: '1px solid var(--border-2)' }}
                          />
                        </div>
                      </div>
                    )}

                    {isReportGroup || isShiftAlertsGroup ? (
                      <div className="ss4-input-wrap flex items-center justify-center gap-2 px-4 py-3" style={{ minHeight: 56 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                          {isShiftAlertsGroup ? 'Read-only · Shift alerts are posted here automatically' : 'Read-only · DayPulse reports are posted here automatically'}
                        </span>
                      </div>
                    ) : recording ? (
                      <div className="ss4-input-wrap flex items-center gap-3 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)', animation: 'ss4-call-ring 1.5s infinite' }} />
                        <span className="ss4-mono flex-1" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Recording… {fmtDuration(recSeconds)}</span>
                        <button onClick={() => stopRecording(true)} className="ss4-icon-btn h-8 w-8" title="Cancel"><Trash2 className="h-4 w-4" style={{ color: 'var(--danger)' }} /></button>
                        <button onClick={() => stopRecording(false)} className="ss4-send-btn h-8 w-8 flex items-center justify-center" title="Send"><Send className="h-3.5 w-3.5" style={{ color: '#fff' }} /></button>
                      </div>
                    ) : (
                      <div className="ss4-input-wrap flex flex-col">
                        {mentionQuery !== null && mentionOptions.length > 0 && (
                          <div className="px-2 pt-1.5 pb-1" style={{ borderBottom: '1px solid var(--border-1)' }}>
                            {mentionOptions.map((opt, idx) => (
                              <button key={opt.id}
                                onMouseDown={e => { e.preventDefault(); insertMention(opt.name); }}
                                className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
                                  idx === mentionIdx ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)'
                                )}>
                                {opt.id === 'all'
                                  ? <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}>
                                    <Users className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                                  </div>
                                  : <div className={cn('h-6 w-6 rounded-full flex items-center justify-center overflow-hidden text-white font-semibold shrink-0', getAvaColor(opt.fullName))} style={{ fontSize: 9 }}>
                                    {opt.avatar ? <img src={opt.avatar} alt="" className="w-full h-full object-cover" /> : ini(opt.fullName)}
                                  </div>
                                }
                                <div className="min-w-0 flex items-baseline gap-1.5">
                                  <span className="font-semibold" style={{ fontSize: 12, color: 'var(--accent-text)' }}>@{opt.id === 'all' ? opt.name : opt.fullName}</span>
                                  {opt.id === 'all' && <span className="truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{opt.fullName}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {channelMentionQuery !== null && channelMentionOptions.length > 0 && (
                          <div className="px-2 pt-1.5 pb-1" style={{ borderBottom: '1px solid var(--border-1)' }}>
                            {channelMentionOptions.map((opt, idx) => (
                              <button key={opt.id}
                                onMouseDown={e => { e.preventDefault(); insertChannelMention(opt.name); }}
                                className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
                                  idx === channelMentionIdx ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)'
                                )}>
                                <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}>
                                  <Hash className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                                </div>
                                <span className="font-semibold truncate" style={{ fontSize: 12, color: 'var(--accent-text)' }}>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {showFormatBar && (
                          <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5 flex-wrap" style={{ borderBottom: '1px solid var(--border-1)' }}>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('bold'); }} className={formatButtonClass('bold')} title="Bold" aria-pressed={activeFormats.bold}>
                              <Bold className="h-3.5 w-3.5" style={formatIconStyle('bold')} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('italic'); }} className={formatButtonClass('italic')} title="Italic" aria-pressed={activeFormats.italic}>
                              <Italic className="h-3.5 w-3.5" style={formatIconStyle('italic')} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('underline'); }} className={formatButtonClass('underline')} title="Underline" aria-pressed={activeFormats.underline}>
                              <Underline className="h-3.5 w-3.5" style={formatIconStyle('underline')} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('strike'); }} className={formatButtonClass('strike')} title="Strikethrough" aria-pressed={activeFormats.strike}>
                              <Strikethrough className="h-3.5 w-3.5" style={formatIconStyle('strike')} />
                            </button>
                            <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'var(--border-1)' }} />
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('list'); }} className={formatButtonClass('list')} title="Bullet list (Tab to nest)" aria-pressed={activeFormats.list}>
                              <List className="h-3.5 w-3.5" style={formatIconStyle('list')} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('numbered'); }} className={formatButtonClass('numbered')} title="Numbered list (Tab to nest)" aria-pressed={activeFormats.numbered}>
                              <ListOrdered className="h-3.5 w-3.5" style={formatIconStyle('numbered')} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('quote'); }} className={formatButtonClass('quote')} title="Quote" aria-pressed={activeFormats.quote}>
                              <TextQuote className="h-3.5 w-3.5" style={formatIconStyle('quote')} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('link'); }} className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-(--bg-hover)" title="Link">
                              <Link2 className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
                            </button>
                            <button type="button" onMouseDown={e => { e.preventDefault(); applyFormat('code'); }} className={formatButtonClass('code')} title="Inline code" aria-pressed={activeFormats.code}>
                              <Code2 className="h-3.5 w-3.5" style={formatIconStyle('code')} />
                            </button>
                            <button
                              type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => setPasteMode(mode => mode === 'formatted' ? 'plain' : 'formatted')}
                              className={cn('h-9 px-2.5 flex items-center gap-1.5 rounded-lg transition-colors hover:bg-(--bg-hover)', pasteMode === 'plain' && 'ss4-video-btn')}
                              title={pasteMode === 'formatted' ? 'Paste mode: Keep formatting' : 'Paste mode: Text only'}
                              aria-pressed={pasteMode === 'plain'}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="font-semibold" style={{ fontSize: 10 }}>{pasteMode === 'formatted' ? 'Keep format' : 'Text only'}</span>
                            </button>
                            <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'var(--border-1)' }} />
                            <div className="relative flex items-center gap-2 px-1" title="Text color">
                              <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); saveComposerSelection(); setTextColorPickerOpen(v => !v); }}
                                className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-(--bg-hover)"
                                title="More text colors"
                                aria-expanded={textColorPickerOpen}
                              >
                                <Palette className="h-3.5 w-3.5 shrink-0" style={{ color: textColorPickerOpen ? 'var(--accent-text)' : 'var(--text-secondary)' }} />
                              </button>
                              {textPalette.map(color => (
                                <button
                                  key={color}
                                  onMouseDown={e => { e.preventDefault(); saveComposerSelection(); applyTextColor(color); }}
                                  className="relative h-6 w-6 rounded-full border transition-transform hover:scale-110"
                                  style={{
                                    background: color,
                                    borderColor: activeTextColor === color ? 'var(--accent)' : color === '#ffffff' ? 'var(--border-3)' : 'rgba(255,255,255,0.2)',
                                    boxShadow: activeTextColor === color ? '0 0 0 2px var(--bg-base), 0 0 0 4px var(--accent)' : undefined,
                                  }}
                                  aria-pressed={activeTextColor === color}
                                  title={`Text color ${color}`}
                                >
                                  {activeTextColor === color && (
                                    <CheckIcon
                                      className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
                                      style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }}
                                    />
                                  )}
                                </button>
                              ))}
                              {textColorPickerOpen && (
                                <div
                                  className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-6 gap-2 overflow-y-auto rounded-xl p-3 shadow-2xl"
                                  style={{ background: 'var(--surface-3,#18181c)', border: '1px solid var(--border-2)', width: 260, maxHeight: 210 }}
                                >
                                  {SS4_MORE_TEXT_COLORS.map(color => (
                                    <button
                                      key={color}
                                      type="button"
                                      onMouseDown={e => { e.preventDefault(); saveComposerSelection(); chooseExpandedTextColor(color); }}
                                      className="relative h-8 w-8 rounded-full border transition-transform hover:scale-110"
                                      style={{
                                        background: color,
                                        borderColor: activeTextColor === color ? 'var(--accent)' : color === '#ffffff' ? 'var(--border-3)' : 'rgba(255,255,255,0.22)',
                                        boxShadow: activeTextColor === color ? '0 0 0 2px var(--surface-3,#18181c), 0 0 0 4px var(--accent)' : undefined,
                                      }}
                                      aria-pressed={activeTextColor === color}
                                      title={`Use ${color}`}
                                    >
                                      {activeTextColor === color && (
                                        <CheckIcon
                                          className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2"
                                          style={{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#ffffff' }}
                                        />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'var(--border-1)' }} />
                            <button
                              onMouseDown={e => { e.preventDefault(); handleAutrix('improve'); }}
                              disabled={autrixLoading || !composerHasText}
                              className="h-9 px-3 flex items-center gap-1.5 rounded-lg font-semibold transition-colors hover:bg-(--bg-hover) disabled:opacity-40"
                              title="Refine with AI"
                            >
                              {autrixLoading
                                ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: '#b49dff' }} />
                                : <Sparkles className="h-3 w-3" style={{ color: '#b49dff' }} />}
                              <span style={{ fontSize: 11, color: '#b49dff' }}>Refine</span>
                            </button>
                          </div>
                        )}
                        <div className="ss4-composer-main flex flex-col max-md:grid max-md:grid-cols-[44px_minmax(0,1fr)_auto] max-md:items-end max-md:gap-2 px-3 pt-2.5 pb-1.5 sm:px-3.5 sm:pt-3 sm:pb-2">
                          <div className="ss4-mobile-leading flex md:hidden">
                            <button onClick={() => fileRef.current?.click()} className="ss4-mobile-round-action" title="Add">
                              <Plus className="h-6 w-6" />
                            </button>
                          </div>
                          <div
                            className="ss4-composer-pill relative flex-1 min-w-0"
                            onClick={e => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('.ss4-composer-editor')) return;
                              focusComposerAtSavedCaret();
                            }}
                          >
                            {!composerHasText && <span className="ss4-composer-placeholder absolute top-0.5 left-0 text-sm pointer-events-none select-none" style={{ color: 'var(--text-disabled)' }}>Message...</span>}
                            <div
                              ref={textareaRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={event => {
                                handleTyping(event);
                                saveComposerSelection();
                                refreshActiveFormats();
                              }}
                              onFocus={() => {
                                saveComposerSelection();
                                refreshActiveFormats();
                              }}
                              onSelect={() => {
                                saveComposerSelection();
                                refreshActiveFormats();
                              }}
                              onMouseDown={e => e.stopPropagation()}
                              onMouseUp={() => {
                                saveComposerSelection();
                                refreshActiveFormats();
                              }}
                              onKeyUp={() => {
                                saveComposerSelection();
                                refreshActiveFormats();
                              }}
                              onKeyDown={e => {
                                if (
                                  (e.ctrlKey || e.metaKey)
                                  && e.shiftKey
                                  && e.key.toLowerCase() === 'v'
                                ) {
                                  pastePlainTextShortcutRef.current = true;
                                  window.setTimeout(() => {
                                    pastePlainTextShortcutRef.current = false;
                                  }, 750);
                                }

                                if (
                                  e.key === 'Enter'
                                  && e.altKey
                                  && !e.ctrlKey
                                  && !e.metaKey
                                ) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  insertComposerSoftLineBreak();
                                  return;
                                }

                                if (
                                  e.key === 'Enter'
                                  && (e.ctrlKey || e.metaKey)
                                ) {
                                  e.preventDefault();
                                  handleSend();
                                  return;
                                }

                                if (
                                  mentionQuery !== null
                                  && mentionOptions.length > 0
                                ) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setMentionIdx(index => Math.min(
                                      index + 1,
                                      mentionOptions.length - 1,
                                    ));
                                    return;
                                  }
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setMentionIdx(index => Math.max(index - 1, 0));
                                    return;
                                  }
                                  if (
                                    e.key === 'Enter'
                                    || e.key === 'Tab'
                                  ) {
                                    e.preventDefault();
                                    insertMention(mentionOptions[mentionIdx].name);
                                    return;
                                  }
                                  if (e.key === 'Escape') {
                                    setMentionQuery(null);
                                    setMentionAnchor(-1);
                                    return;
                                  }
                                }

                                if (
                                  channelMentionQuery !== null
                                  && channelMentionOptions.length > 0
                                ) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setChannelMentionIdx(index => Math.min(
                                      index + 1,
                                      channelMentionOptions.length - 1,
                                    ));
                                    return;
                                  }
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setChannelMentionIdx(index => Math.max(index - 1, 0));
                                    return;
                                  }
                                  if (
                                    e.key === 'Enter'
                                    || e.key === 'Tab'
                                  ) {
                                    e.preventDefault();
                                    insertChannelMention(
                                      channelMentionOptions[channelMentionIdx].name,
                                    );
                                    return;
                                  }
                                  if (e.key === 'Escape') {
                                    setChannelMentionQuery(null);
                                    setChannelMentionAnchor(-1);
                                    return;
                                  }
                                }

                                const selection = window.getSelection();
                                const anchorNode = selection?.anchorNode;
                                const anchorElement = anchorNode instanceof HTMLElement
                                  ? anchorNode
                                  : anchorNode?.parentElement;
                                const isInsideStructuredBlock = Boolean(
                                  anchorElement
                                  && textareaRef.current?.contains(anchorElement)
                                  && anchorElement.closest('li, blockquote'),
                                );

                                if (
                                  e.key === 'Enter'
                                  && !e.shiftKey
                                  && !e.altKey
                                ) {
                                  if (isInsideStructuredBlock) {
                                    requestAnimationFrame(() => {
                                      const el = textareaRef.current;
                                      if (!el) return;

                                      normalizeContentEditableListArtifacts(el);
                                      normalizeRichEditorListExitArtifacts(el);
                                      syncComposerText(
                                        el.innerText.replace(/\n$/, ''),
                                        true,
                                      );
                                      saveComposerSelection();
                                      refreshActiveFormats();
                                    });
                                    return;
                                  }

                                  if (handleFormattedLineBreak()) {
                                    e.preventDefault();
                                    return;
                                  }

                                  e.preventDefault();
                                  handleSend();
                                  return;
                                }

                                if (
                                  e.key === 'Enter'
                                  && e.shiftKey
                                ) {
                                  e.preventDefault();
                                  insertComposerSoftLineBreak();
                                  return;
                                }

                                if (e.key === 'Tab') {
                                  if (
                                    anchorElement
                                    && textareaRef.current?.contains(anchorElement)
                                    && anchorElement.closest('li')
                                  ) {
                                    e.preventDefault();
                                    document.execCommand(
                                      e.shiftKey ? 'outdent' : 'indent',
                                      false,
                                    );
                                    const el = textareaRef.current;
                                    if (el) {
                                      normalizeContentEditableListArtifacts(el);
                                      syncComposerText(
                                        el.innerText.replace(/\n$/, ''),
                                        true,
                                      );
                                      saveComposerSelection();
                                      requestAnimationFrame(refreshActiveFormats);
                                    }
                                    return;
                                  }

                                  if (handleListIndent(e.shiftKey)) {
                                    e.preventDefault();
                                    return;
                                  }
                                }

                                if (e.key === 'Escape') {
                                  setMentionQuery(null);
                                  setMentionAnchor(-1);
                                  setChannelMentionQuery(null);
                                  setChannelMentionAnchor(-1);
                                  setTextColorPickerOpen(false);
                                  return;
                                }

                                if (e.ctrlKey || e.metaKey) {
                                  const key = e.key.toLowerCase();

                                  if (key === 'b') {
                                    e.preventDefault();
                                    applyFormat('bold');
                                    return;
                                  }
                                  if (key === 'i') {
                                    e.preventDefault();
                                    applyFormat('italic');
                                    return;
                                  }
                                  if (key === 'u') {
                                    e.preventDefault();
                                    applyFormat('underline');
                                    return;
                                  }
                                  if (key === 'k') {
                                    e.preventDefault();
                                    applyFormat('link');
                                    return;
                                  }
                                  if (key === 'e') {
                                    e.preventDefault();
                                    applyFormat('code');
                                    return;
                                  }
                                  if (e.shiftKey && key === 'x') {
                                    e.preventDefault();
                                    applyFormat('strike');
                                    return;
                                  }
                                  if (e.shiftKey && key === 'c') {
                                    e.preventDefault();
                                    applyFormat('codeblock');
                                    return;
                                  }
                                  if (e.shiftKey && key === '7') {
                                    e.preventDefault();
                                    applyFormat('numbered');
                                    return;
                                  }
                                  if (e.shiftKey && key === '8') {
                                    e.preventDefault();
                                    applyFormat('list');
                                    return;
                                  }
                                  if (e.shiftKey && key === '9') {
                                    e.preventDefault();
                                    applyFormat('quote');
                                  }
                                }
                              }}
                              onPaste={e => {
                                const items = e.clipboardData?.items;
                                const text = e.clipboardData?.getData('text/plain') || '';
                                const html = e.clipboardData?.getData('text/html') || '';
                                const shortcutPlainText = pastePlainTextShortcutRef.current;
                                pastePlainTextShortcutRef.current = false;
                                if (text.trim()) pastedPlainTextRef.current = [pastedPlainTextRef.current, text].filter(Boolean).join('\n');

                                const plainText = clipboardPayloadToPlainText(text, html);
                                if (plainText || html) {
                                  e.preventDefault();
                                  const usePlainText = pasteMode === 'plain' || shortcutPlainText || richPasteDropsVinLikeToken(text, html);
                                  document.execCommand(
                                    usePlainText ? 'insertText' : 'insertHTML',
                                    false,
                                    usePlainText ? plainText : clipboardPayloadToRichEditorHtml(text, html),
                                  );
                                  requestAnimationFrame(() => {
                                    const el = textareaRef.current;
                                    if (el) {
                                      normalizeContentEditableListArtifacts(el);
                                      normalizeRichEditorListExitArtifacts(el);
                                      const nextText = el.innerText.replace(/\n$/, '');
                                      syncComposerText(nextText, true);
                                      inspectMentionAnywhere(nextText);
                                      saveComposerSelection();
                                    }
                                  });
                                  return;
                                }

                                const imgItems = items ? Array.from(items).filter(it => it.type.startsWith('image/')) : [];
                                if (imgItems.length > 0) {
                                  e.preventDefault();
                                  const files = imgItems.map(it => it.getAsFile()).filter((f): f is File => f !== null);
                                  if (files.length > 0) { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); handleUpload(dt.files); }
                                }
                              }}
                              onBlur={() => setTimeout(() => { setMentionQuery(null); setMentionAnchor(-1); }, 150)}
                              className="ss4-composer-editor ss4-rich-edit text-sm focus:outline-none max-h-36 min-h-7 py-0.5 overflow-y-auto"
                              style={{ fontFamily: 'Geist, sans-serif', lineHeight: '1.55', caretColor: 'var(--accent)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%', overflowX: 'hidden', outline: 'none' }}
                            />
                            <div ref={mobileEmojiRef} className="relative ss4-mobile-emoji flex md:hidden">
                              <button
                                onPointerDown={e => { e.preventDefault(); prepareMobileEmojiPicker(); }}
                                onClick={e => { if (e.detail === 0) prepareMobileEmojiPicker(); }}
                                className="ss4-icon-btn h-8 w-8"
                                title="Emoji"
                              >
                                <Smile className="h-5 w-5" />
                              </button>
                              {emojiOpen && (
                                <div
                                  className="ss4-mobile-emoji-panel"
                                  onPointerDown={e => e.stopPropagation()}
                                >
                                  <EmojiPicker onEmojiClick={(d: EmojiClickData) => { insertComposerText(d.emoji, { preferEndOnZero: true }); setEmojiOpen(false); }} theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT} width="100%" height={340} searchDisabled={false} skinTonesDisabled lazyLoadEmojis />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ss4-mobile-trailing flex md:hidden">
                            {composerHasText || pendingFiles.length > 0 || pendingGif ? (
                              <button
                                onPointerDown={() => startSendPress()}
                                onPointerUp={finishSendPress}
                                onPointerCancel={finishSendPress}
                                onPointerLeave={finishSendPress}
                                onContextMenu={e => e.preventDefault()}
                                onClick={() => {
                                  if (sendLongPressTriggeredRef.current) return;
                                  handleSend();
                                }}
                                disabled={sending}
                                className="ss4-mobile-send"
                                title="Send"
                              >
                                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                              </button>
                            ) : (
                              <>
                                <div ref={mobileGifRef} className="relative">
                                  <button onClick={() => setGifOpen(v => !v)} className="ss4-icon-btn h-10 px-1.5 font-bold" title="GIF" aria-label="Choose a GIF">
                                    <span style={{ fontSize: 12 }}>GIF</span>
                                  </button>
                                  {gifOpen && <GifPicker mobile onPick={selectGif} onClose={() => setGifOpen(false)} />}
                                </div>
                                <button onClick={() => fileRef.current?.click()} className="ss4-icon-btn h-10 w-10" title="Image"><ImageIcon className="h-6 w-6" /></button>
                                <button onClick={startRecording} className="ss4-icon-btn h-10 w-10" title="Voice message"><Mic className="h-6 w-6" /></button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="ss4-desktop-toolbar hidden md:flex items-center justify-between px-2.5 pb-2 pt-0.5 sm:px-3 sm:pb-2.5 sm:pt-1">
                          <div className="flex items-center gap-0.5">
                            <input ref={fileRef} type="file" multiple hidden onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
                            <button onClick={() => fileRef.current?.click()} className="ss4-icon-btn h-7 w-7 sm:h-8 sm:w-8" title="Attach files"><Paperclip className="h-4 w-4" /></button>
                            <button onClick={startRecording} className="ss4-icon-btn h-7 w-7 sm:h-8 sm:w-8" title="Voice message"><Mic className="h-4 w-4" /></button>
                            <div ref={gifRef} className="relative">
                              <button onClick={() => setGifOpen(v => !v)} className="ss4-icon-btn h-7 w-7 sm:h-8 sm:w-8" title="GIF"><Film className="h-4 w-4" /></button>
                              {gifOpen && <GifPicker onPick={selectGif} onClose={() => setGifOpen(false)} />}
                            </div>
                            <div ref={emojiRef} className="relative">
                              <button
                                onPointerDown={e => { e.preventDefault(); saveComposerSelection(); setEmojiOpen(v => !v); }}
                                onClick={e => { if (e.detail === 0) setEmojiOpen(v => !v); }}
                                className="ss4-icon-btn h-7 w-7 sm:h-8 sm:w-8"
                                title="Emoji"
                              >
                                <Smile className="h-4 w-4" />
                              </button>
                              {emojiOpen && (
                                <div
                                  className="absolute bottom-full left-0 mb-2 z-50"
                                  onPointerDown={e => e.stopPropagation()}
                                >
                                  <EmojiPicker onEmojiClick={(d: EmojiClickData) => { insertComposerText(d.emoji); setEmojiOpen(false); }} theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT} width={300} height={380} searchDisabled={false} skinTonesDisabled lazyLoadEmojis />
                                </div>
                              )}
                            </div>
                            <div ref={createMenuRef} className="relative">
                              <button onClick={() => setCreateMenuOpen(v => !v)} className="ss4-icon-btn h-7 w-7 sm:h-8 sm:w-8" title="Poll or event"><Plus className="h-4 w-4" /></button>
                              {createMenuOpen && (
                                <div className="absolute bottom-full left-0 mb-2 z-50 rounded-xl overflow-hidden py-1" style={{ width: 160, background: 'var(--bg-elevated)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)' }}>
                                  <button onClick={() => { setCreateMenuOpen(false); setPollOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><BarChart3 className="h-3.5 w-3.5" /> Create Poll</button>
                                  <button onClick={() => { setCreateMenuOpen(false); setEventOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><CalendarPlus className="h-3.5 w-3.5" /> Create Event</button>
                                  <button onClick={() => { setCreateMenuOpen(false); setMeetingOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><Video className="h-3.5 w-3.5" /> Create Meeting</button>
                                </div>
                              )}
                            </div>
                            <div ref={autrixRef} className="relative">
                              <button onClick={() => setAutrixOpen(v => !v)} className="ss4-ai-btn h-7 px-2 flex items-center gap-1.5 sm:h-8 sm:px-2.5" title="Suprah Autrix">
                                {autrixLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#b49dff' }} /> : <Sparkles className="h-3.5 w-3.5" style={{ color: '#b49dff' }} />}
                                <span className="ss4-ai-text font-semibold hidden sm:inline" style={{ fontSize: 11 }}>Autrix</span>
                              </button>
                              {autrixOpen && (
                                <div className="absolute bottom-full left-0 mb-2 z-50 rounded-xl overflow-hidden py-1" style={{ width: 180, background: 'var(--bg-elevated)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)' }}>
                                  {([['improve', 'Improve writing'], ['formal', 'Make formal'], ['casual', 'Make casual'], ['draft', 'Draft a reply']] as const).map(([action, label]) => (
                                    <button key={action} onClick={() => handleAutrix(action)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><Sparkles className="h-3 w-3" style={{ color: '#b49dff' }} /> {label}</button>
                                  ))}
                                  <div className="mx-2 my-1 ss4-divider" />
                                  <button onClick={() => { setAutrixOpen(false); setSummarizeOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><FileText className="h-3 w-3" style={{ color: '#b49dff' }} /> Summarize chat</button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setShowFormatBar(v => !v)}
                              className={cn('ss4-icon-btn h-9 w-9', showFormatBar && 'ss4-video-btn')}
                              title="Formatting options"
                            >
                              <Type className="h-4 w-4" />
                            </button>
                          </div>
                          <button onClick={() => handleSend()} disabled={sending || (!composerHasText && pendingFiles.length === 0 && !pendingMeeting && !pendingGif)} className="ss4-send-btn h-7 w-7 flex items-center justify-center shrink-0 sm:h-8 sm:w-8">
                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadNotice && (
                      <p className="px-1" style={{ fontSize: 11, color: uploadNotice.kind === 'error' ? 'var(--danger)' : uploadNotice.kind === 'success' ? 'var(--positive)' : 'var(--text-tertiary)' }}>{uploadNotice.text}</p>
                    )}
                    {scheduleOpen && (
                      <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/45 md:items-center" onClick={() => setScheduleOpen(false)}>
                        <div
                          className="w-full max-w-md rounded-t-3xl border px-0 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl md:rounded-2xl"
                          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-2)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="mx-auto mb-5 h-1 w-12 rounded-full" style={{ background: 'var(--text-secondary)' }} />
                          <div className="px-6 pb-5">
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Schedule send</h3>
                          </div>
                          <div className="border-t" style={{ borderColor: 'var(--border-1)' }}>
                            {scheduleOptions.map(option => (
                              <button
                                key={option.label}
                                onClick={() => scheduleSendFor(option.at)}
                                className="block w-full px-6 py-4 text-left transition-colors hover:bg-(--bg-hover)"
                                style={{ color: 'var(--text-primary)', fontSize: 16 }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <div className="border-t px-6 py-4 space-y-3" style={{ borderColor: 'var(--border-1)' }}>
                            <label className="flex items-center gap-3 font-semibold" style={{ color: 'var(--text-primary)', fontSize: 15 }}>
                              <CalendarPlus className="h-5 w-5" />
                              Pick a custom time
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="datetime-local"
                                value={customScheduleAt}
                                onChange={e => setCustomScheduleAt(e.target.value)}
                                className="min-w-0 flex-1 rounded-lg border px-3 py-2"
                                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)', fontSize: 16 }}
                              />
                              <button
                                onClick={() => {
                                  const date = new Date(customScheduleAt);
                                  if (!customScheduleAt || Number.isNaN(date.getTime()) || date.getTime() <= Date.now() + 30_000) {
                                    toast.error('Pick a future time');
                                    return;
                                  }
                                  scheduleSendFor(date);
                                }}
                                className="ss4-send-btn px-4 font-semibold"
                                style={{ borderRadius: 10, fontSize: 13 }}
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            { }
            {showInfo && activeId && activeConv && (() => {
              const cName = getConvName(activeConv, uid);
              const cAvatar = getConvAvatar(activeConv, uid);
              const pinnedMsgs = activeMsgs.filter(m => pinnedMsgIds.has(m._id));
              return (
                <div className="absolute inset-0 z-30 flex flex-col" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="ss4-chat-header shrink-0 flex items-center gap-2.5 px-4 py-3">
                    <button onClick={() => setShowInfo(false)} className="ss4-icon-btn h-8 w-8"><ChevronLeft className="h-4 w-4" /></button>
                    <p className="ss4-display font-bold flex-1" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Details</p>
                    <button onClick={() => setShowInfo(false)} className="ss4-icon-btn h-8 w-8"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto ss4-scroll">
                    { }
                    <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4">
                      <div className="relative">
                        <div className={cn('h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden', activeConv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(cName))}>
                          {activeConv.type === 'group' ? <ChannelFace conv={activeConv} avatar={cAvatar} name={cName} size={28} /> : cAvatar ? <img src={resolveImageUrl(cAvatar)} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold" style={{ fontSize: 26 }}>{ini(cName)}</span>}
                        </div>
                        {activeConv.type === 'group' && isAdmin && (
                          <>
                            <input ref={avatarFileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
                            <button onClick={() => avatarFileRef.current?.click()} className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', border: '2px solid var(--bg-elevated)' }} title="Change photo"><ImageIcon className="h-3.5 w-3.5" style={{ color: '#fff' }} /></button>
                          </>
                        )}
                      </div>

                      {activeConv.type === 'group' && editingGcName ? (
                        <div className="flex items-center gap-2 w-full max-w-xs">
                          <input value={gcEmojiInput} onChange={e => setGcEmojiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { updateChannelDetails(gcNameInput, gcEmojiInput); setEditingGcName(false); } }} placeholder="#" className="w-11 h-8 rounded-lg px-2 text-sm ss4-search-input text-center" maxLength={4} />
                          <input autoFocus value={gcNameInput} onChange={e => setGcNameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { updateChannelDetails(gcNameInput, gcEmojiInput); setEditingGcName(false); } }} className="flex-1 h-8 rounded-lg px-3 text-sm ss4-search-input text-center" />
                          <button onClick={() => { updateChannelDetails(gcNameInput, gcEmojiInput); setEditingGcName(false); }} className="ss4-send-btn h-8 w-8 flex items-center justify-center"><CheckIcon className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="ss4-display font-bold text-center" style={{ fontSize: 18, color: 'var(--text-primary)' }}>{activeConv.type === 'group' && activeConv.emoji ? `${activeConv.emoji} ` : ''}{cName}</p>
                          {activeConv.type === 'group' && isAdmin && <button onClick={() => { setGcNameInput(cName); setGcEmojiInput(activeConv.emoji || ''); setEditingGcName(true); }} className="ss4-icon-btn h-6 w-6"><Pencil className="h-3 w-3" /></button>}
                        </div>
                      )}
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{activeConv.type === 'group' ? `${activeConv.members.length} members` : 'Direct message'}</p>

                      {activeConv.type === 'group' && (
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => setManageOpen(true)} className="ss4-pill-btn h-8 px-3 flex items-center gap-1.5" style={{ fontSize: 12 }}><UserPlus className="h-3.5 w-3.5" /> Add</button>
                          <button onClick={() => setThemeOpen(true)} className="ss4-pill-btn h-8 px-3 flex items-center gap-1.5" style={{ fontSize: 12 }}><Palette className="h-3.5 w-3.5" /> Theme</button>
                        </div>
                      )}
                      {activeConv.type === 'direct' && (
                        <button onClick={() => setThemeOpen(true)} className="ss4-pill-btn h-8 px-3 flex items-center gap-1.5 mt-1" style={{ fontSize: 12 }}><Palette className="h-3.5 w-3.5" /> Theme</button>
                      )}
                    </div>

                    { }
                    <div className="px-4">
                      <div className="ss4-tab-bar flex gap-1">
                        {(['members', 'media', 'files', 'pinned', 'search'] as const).map(t => (
                          <button key={t} onClick={() => setInfoTab(t)} className={cn('flex-1 h-7 ss4-tab capitalize', t === infoTab && 'ss4-tab-active')}>{t}</button>
                        ))}
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      {infoTab === 'members' && (
                        <div className="space-y-0.5">
                          {safeMembers(activeConv).map(m => {
                            const memberPresence = presence[m._id];
                            const isOnline = !!memberPresence?.onlineStatus && memberPresence.onlineStatus !== 'offline';
                            const memberIsAdmin = (activeConv.admins || []).map(String).includes(m._id);
                            return (
                              <div key={m._id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-(--bg-hover)">
                                <button onClick={e => setMemberCard({ member: m, pos: { x: e.clientX, y: e.clientY } })} className="relative shrink-0">
                                  <div className={cn('h-9 w-9 rounded-full flex items-center justify-center overflow-hidden', getAvaColor(m.fullName))}>
                                    {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 12 }}>{ini(m.fullName)}</span>}
                                  </div>
                                  {isOnline && <PresenceAvatarDot status={memberPresence!.onlineStatus} deviceType={memberPresence?.lastDeviceType ?? undefined} />}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.fullName}{m._id === uid ? ' (You)' : ''}</p>
                                  <p style={{ fontSize: 11, color: isOnline ? 'var(--positive)' : 'var(--text-tertiary)' }}>{memberIsAdmin ? 'Admin' : (isOnline ? 'Active now' : 'Offline')}</p>
                                </div>
                                {activeConv.type === 'group' && isAdmin && m._id !== uid && (
                                  <button onClick={() => removeMember(m._id)} className="ss4-icon-btn h-7 w-7" title="Remove" style={{ color: 'var(--danger)' }}><UserMinus className="h-3.5 w-3.5" /></button>
                                )}
                              </div>
                            );
                          })}
                          {activeConv.type === 'group' && (
                            <button onClick={() => removeMember(uid)} className="w-full flex items-center gap-2 px-2 py-2.5 mt-2 rounded-lg hover:bg-(--danger-muted)" style={{ color: 'var(--danger)', fontSize: 13 }}><LogOut className="h-4 w-4" /> Leave channel</button>
                          )}
                        </div>
                      )}

                      {infoTab === 'media' && (
                        ssAttachmentsLoading && ssMediaItems.length === 0
                          ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
                          : ssMediaItems.length === 0
                          ? <p className="text-center py-8" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No media yet</p>
                          : <div className="grid grid-cols-3 gap-1.5">
                            {ssMediaItems.map(({ messageId, attachment: a }, i) => {
                              const isVid = isVideoAttachment(a);
                              return (
                                <button key={`${messageId}-${i}`} onClick={() => setLightbox({ src: a.url, type: isVid ? 'video' : 'image', name: a.originalName })} className="aspect-square rounded-lg overflow-hidden relative" style={{ background: 'var(--bg-hover)' }}>
                                  {isVid ? <><video src={a.url} className="w-full h-full object-cover" muted /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="h-5 w-5" style={{ color: '#fff' }} /></div></> : <img src={a.thumbnailUrl || a.url} alt={a.originalName} className="w-full h-full object-cover" />}
                                </button>
                              );
                            })}
                          </div>
                      )}

                      {infoTab === 'files' && (
                        ssAttachmentsLoading && ssFileItems.length === 0
                          ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
                          : ssFileItems.length === 0
                          ? <p className="text-center py-8" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No files yet</p>
                          : <div className="space-y-1.5">
                            {ssFileItems.map(({ messageId, attachment: a }, i) => (
                              <a key={`${messageId}-${i}`} href={a.url} download={a.originalName} className="flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline ss4-file-other">
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}><FileText className="h-4 w-4" style={{ color: 'var(--accent)' }} /></div>
                                <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.originalName}</p><p className="ss4-mono mt-0.5" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtSize(a.size)}</p></div>
                                <Download className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                              </a>
                            ))}
                          </div>
                      )}

                      {infoTab === 'pinned' && (
                        pinnedMsgs.length === 0
                          ? <p className="text-center py-8" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No pinned messages</p>
                          : <div className="space-y-2">
                            {pinnedMsgs.map(m => (
                              <button key={m._id} onClick={() => { setShowInfo(false); if (activeId) openSearchResult(activeId, m._id, m.createdAt); }} className="w-full text-left rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                                <p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{m.sender?.fullName || 'Deleted User'}</p>
                                <p className="truncate mt-0.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{messagePreviewText(m.content) || '\u{1f4ce} Attachment'}</p>
                              </button>
                            ))}
                          </div>
                      )}
                      {infoTab === 'search' && (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
                            <input
                              autoFocus
                              value={convSearchQuery}
                              onChange={e => setConvSearchQuery(e.target.value)}
                              placeholder={`Search in ${cName}…`}
                              className="w-full h-9 rounded-lg pl-9 pr-3 text-xs ss4-search-input"
                              style={{ fontFamily: 'Geist, sans-serif' }}
                            />
                          </div>
                          {convSearchQuery.trim().length >= 2 && (
                            convSearching ? (
                              <p className="text-center py-6" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Searching…</p>
                            ) : convSearchResults.length === 0 ? (
                              <p className="text-center py-6" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No matching messages</p>
                            ) : (
                              <div className="space-y-2">
                                {convSearchResults.map((m: any) => (
                                  <button
                                    key={m._id}
                                    onClick={() => { setShowInfo(false); openSearchResult(activeId, m._id, m.createdAt); }}
                                    className="w-full text-left rounded-xl px-3 py-2.5"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-semibold truncate" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{m.sender?.fullName || 'Deleted User'}</p>
                                      <p className="shrink-0" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtRelative(m.createdAt)}</p>
                                    </div>
                                    <p className="truncate mt-0.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{messagePreviewText(m.content) || '\u{1f4ce} Attachment'}</p>
                                  </button>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    { }
                    {(activeConv.type === 'direct' || isAdmin) && (
                      <div className="px-4 pb-8 pt-2">
                        <div className="mx-1 mb-3 ss4-divider" />
                        <p className="ss4-section-label mb-2" style={{ color: 'var(--danger)' }}>Danger Zone</p>
                        {!confirmDelete ? (
                          <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-(--danger-muted)" style={{ color: 'var(--danger)', fontSize: 13, border: '1px solid var(--danger-muted)' }}><Trash2 className="h-4 w-4" /> Delete conversation</button>
                        ) : (
                          <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'var(--danger-muted)', border: '1px solid rgba(240,92,92,0.3)' }}>
                            <p style={{ fontSize: 12, color: 'var(--text-primary)' }}>Delete this conversation for everyone? This cannot be undone.</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setConfirmDelete(false)} className="flex-1 h-8 rounded-lg ss4-pill-btn" style={{ fontSize: 12 }}>Cancel</button>
                              <button onClick={() => deleteConversation(activeConv)} className="flex-1 h-8 rounded-lg font-semibold" style={{ fontSize: 12, background: 'var(--danger)', color: '#fff' }}>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </main>
        </div>

        { }
        {showModal.open && (
          <NewConvModal users={allUsers.filter(u => u._id !== uid)} theme={theme} defaultTab={showModal.tab} onClose={() => setShowModal({ open: false, tab: 'dm' })} onStartDM={handleDM} onCreateGroup={handleGroup} onCreateSpace={handleCreateSpace} />
        )}

        { }
        {call.incoming && !activeMeeting && (
          <IncomingCallModal
            call={call.incoming}
            onJoin={() => handleJoinCall(call.incoming!.meetingId)}
            onDismiss={() => { stopCallSound(); call.setIncoming(null); }}
          />
        )}
        {activeMeeting && (
          <CallExperience
            session={activeMeeting}
            displayName={me?.fullName || 'User'}
            email={me?.email}
            avatarUrl={me?.avatar}
            currentUserId={uid}
            token={token}
            conversationMembers={activeConv ? safeMembers(activeConv) : []}
            callRecording={callRecording}
            onRecordingChange={setCallRecording}
            onClose={handleLeaveCall}
          />
        )}

        {manageOpen && activeConv && (
          <ManageMembersModal users={allUsers} existingIds={safeMembers(activeConv).map(m => m._id)} onClose={() => setManageOpen(false)} onAdd={addMembers} />
        )}
        {themeOpen && activeConv && (
          <ThemeModal current={activeConv.theme} onClose={() => setThemeOpen(false)} onApply={applyTheme} />
        )}
        {pollOpen && <PollModal onClose={() => setPollOpen(false)} onCreate={createPoll} />}
        {eventOpen && <EventModal onClose={() => setEventOpen(false)} onCreate={createEvent} />}
        {meetingOpen && (
          <MeetingModal
            onClose={() => setMeetingOpen(false)}
            onCreate={createMeeting}
            onCreateLink={createMeetingLink}
            canAddToMessage={!!activeId}
          />
        )}
        {meetingLinkInfo && (
          <MeetingJoinInfoModal link={meetingLinkInfo} onClose={() => setMeetingLinkInfo(null)} />
        )}
        {scheduleMeetingOpen && (
          <ScheduleMeetingModal onClose={() => setScheduleMeetingOpen(false)} onSubmit={handleScheduleSuprahMeeting} />
        )}
        {activeUsersOpen && (
          <ActiveUsersModal users={allUsers} presence={presence} uid={uid} onClose={() => setActiveUsersOpen(false)} />
        )}
        {summarizeOpen && activeId && (
          <SummarizeModal token={token} conversationId={activeId} onClose={() => setSummarizeOpen(false)} />
        )}
        {pinnedModalOpen && activeConv && (
          <div
            className="fixed inset-0 z-60 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setPinnedModalOpen(false)}
          >
            <div
              className="ss4 flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-w-lg sm:rounded-2xl"
              data-theme={theme}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-1)' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  <Pin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Pinned messages</h3>
                  <p className="truncate" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {getConvName(activeConv, uid)} · {activePinnedMsgs.length} pinned
                  </p>
                </div>
                <button onClick={() => setPinnedModalOpen(false)} className="ss4-icon-btn h-9 w-9 shrink-0" aria-label="Close pinned messages">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 ss4-scroll">
                {activePinnedMsgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <PinOff className="h-8 w-8" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="font-semibold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>No pinned messages</p>
                    <p className="max-w-xs" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Pinned messages from this conversation will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activePinnedMsgs.slice().reverse().map(m => (
                      <div key={m._id} className="rounded-2xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                        <button type="button" onClick={() => jumpToMessage(m._id)} className="block w-full text-left">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold" style={{ fontSize: 12, color: 'var(--accent-text)' }}>{m.sender?.fullName || 'Deleted User'}</p>
                              <p className="ss4-mono mt-0.5" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtDate(m.createdAt)} · {fmtTime(m.createdAt)}</p>
                            </div>
                            <ChevronLeft className="h-3.5 w-3.5 rotate-180 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                          <p className="line-clamp-3 leading-relaxed" style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {messagePreviewText(m.content) || String.fromCodePoint(128206) + ` ${m.attachments?.length || 1} attachment${(m.attachments?.length || 1) === 1 ? '' : 's'}`}
                          </p>
                        </button>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button type="button" onClick={() => jumpToMessage(m._id)} className="ss4-pill-btn h-8 px-3" style={{ fontSize: 12 }}>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePinToggle(m._id)}
                            className="h-8 rounded-lg px-3 font-semibold"
                            style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-muted)', border: '1px solid rgba(240,92,92,0.22)' }}
                          >
                            Unpin
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {forwardMsg && (
          <ForwardMessageModal message={forwardMsg} users={allUsers.filter(u => u._id !== uid)} token={token} onClose={() => setForwardMsg(null)} />
        )}
        {notifModalConv && (
          <NotificationSettingsModal
            conv={notifModalConv}
            convName={getConvName(notifModalConv, uid)}
            prefs={notifPrefs[notifModalConv._id] ?? notifModalConv.notificationPreference ?? { type: 'all', muted: false }}
            onSave={p => saveNotificationPref(notifModalConv._id, p)}
            onClose={() => setNotifModalConv(null)}
          />
        )}

        { }
        {memberCard && (() => {
          const m = memberCard.member;
          const memberCardPresence = presence[m._id];
          const isOnline = !!memberCardPresence?.onlineStatus && memberCardPresence.onlineStatus !== 'offline';
          return (
            <div className="ss4-overlay fixed inset-0 z-100 flex items-center justify-center p-4" onClick={() => setMemberCard(null)}>
              <div id="ss4-member-card" className="ss4-modal w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4">
                  <div className="relative">
                    <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden', getAvaColor(m.fullName))}>
                      {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold" style={{ fontSize: 22 }}>{ini(m.fullName)}</span>}
                    </div>
                    {isOnline && <PresenceAvatarDot status={memberCardPresence!.onlineStatus} deviceType={memberCardPresence?.lastDeviceType ?? undefined} sizeClass="size-3" />}
                  </div>
                  <div className="text-center">
                    <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{m.fullName}</p>
                    <p style={{ fontSize: 11, color: isOnline && memberCardPresence?.onlineStatus === 'online' ? 'var(--positive)' : 'var(--text-tertiary)' }}>{isOnline ? `\u{1f7e2} ${S.label[memberCardPresence!.onlineStatus]}` : 'Offline'}</p>
                  </div>
                  {m._id !== uid && (
                    <button onClick={() => { setMemberCard(null); handleDM(m._id); }} className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13 }}><MessageSquare className="h-3.5 w-3.5" /> Message</button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {lightbox && <LightboxModal src={lightbox.src} type={lightbox.type} name={lightbox.name} onClose={() => setLightbox(null)} />}

        { }
        {convMobileSheet && (() => {
          const sheetConv = convos.find(c => c._id === convMobileSheet);
          if (!sheetConv) return null;
          const pinned = isPinnedConv(sheetConv);
          const archived = isArchivedConv(sheetConv);
          const cName = getConvName(sheetConv, uid);
          const sheetIsUnread = isConvUnreadForUser(sheetConv, uid, manualUnread);
          const toggleSheetReadState = () => {
            if (sheetIsUnread) {
              markRead(sheetConv._id);
              ctxMarkAsRead(sheetConv._id);
              setManualUnread(p => { const n = new Set(p); n.delete(sheetConv._id); return n; });
              setConvos(prev => prev.map(c => {
                if (c._id !== sheetConv._id || !c.lastMessage) return c._id === sheetConv._id ? { ...c, unreadCount: 0, unreadMentionCount: 0 } : c;
                const rb = c.lastMessage.readBy || [];
                if (uid && !rb.includes(uid)) return { ...c, unreadCount: 0, unreadMentionCount: 0, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
                return { ...c, unreadCount: 0, unreadMentionCount: 0 };
              }));
            } else {
              setManualUnread(p => new Set([...p, sheetConv._id]));
            }
            setConvMobileSheet(null);
          };
          const sheetActions: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }[] = [
            { icon: <MailOpen className="h-5 w-5" />, label: sheetIsUnread ? 'Mark as read' : 'Mark as unread', onClick: toggleSheetReadState },
            { icon: pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />, label: pinned ? 'Unpin' : 'Pin', onClick: () => { togglePinConv(sheetConv); setConvMobileSheet(null); } },
            { icon: archived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />, label: archived ? 'Unarchive' : 'Archive', onClick: () => { toggleArchiveConv(sheetConv); setConvMobileSheet(null); } },
            { icon: <Phone className="h-5 w-5" />, label: 'Call', onClick: () => { handleStartCall(sheetConv); openConversation(sheetConv._id); setConvMobileSheet(null); } },
            { icon: <Trash2 className="h-5 w-5" />, label: 'Delete conversation', danger: true, onClick: () => { setConvMobileSheet(null); setDeleteConfirmConv(sheetConv); } },
          ];
          return (
            <div className="ss4-overlay fixed inset-0 z-200 flex items-end" onClick={() => setConvMobileSheet(null)}>
              <div className="w-full rounded-t-2xl pb-safe" onClick={e => e.stopPropagation()}
                style={{ background: 'var(--surface-2,#1c1d20)', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-2,rgba(255,255,255,0.15))' }} />
                </div>
                <p className="text-center font-semibold px-4 pt-1 pb-3 truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{cName}</p>
                <div style={{ height: 1, background: 'var(--border-2,rgba(255,255,255,0.1))', margin: '0 16px 4px' }} />
                <button
                  className="w-full flex items-center gap-4 px-6 py-3.5 transition-colors active:bg-white/5"
                  style={{ color: 'var(--text-primary)', fontSize: 15 }}
                  onClick={() => { setNotifModalConv(sheetConv); setConvMobileSheet(null); }}
                >
                  <Bell className="h-5 w-5" /> Notification settings
                </button>
                {sheetActions.map(a => (
                  <button key={a.label} className="w-full flex items-center gap-4 px-6 py-3.5 transition-colors active:bg-white/5"
                    style={{ color: a.danger ? 'var(--danger)' : 'var(--text-primary)', fontSize: 15 }}
                    onClick={a.onClick}>
                    {a.icon} {a.label}
                  </button>
                ))}
                <div style={{ height: 8 }} />
              </div>
            </div>
          );
        })()}

        { }
        {deleteSpaceConfirm && (
          <div className="ss4-overlay fixed inset-0 z-210 flex items-center justify-center p-4" onClick={() => setDeleteSpaceConfirm(null)}>
            <div className="ss4-modal w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface-2,#1c1d20)', borderRadius: 20, padding: '24px 20px 20px' }}>
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--danger-muted,rgba(239,68,68,0.15))' }}>
                  <Trash2 className="h-5 w-5" style={{ color: 'var(--danger)' }} />
                </div>
              </div>
              <p className="text-center font-bold mb-1" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Delete Space?</p>
              <p className="text-center mb-1" style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                "{orderedSpaces.find(sp => sp._id === deleteSpaceConfirm)?.name}"
              </p>
              <p className="text-center mb-5" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Are you sure you want to delete this space? Channels inside it will be moved back to Channels. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteSpaceConfirm(null)} className="flex-1 h-10 rounded-xl font-semibold" style={{ fontSize: 13, background: 'var(--bg-hover,rgba(255,255,255,0.07))', color: 'var(--text-primary)' }}>Cancel</button>
                <button onClick={() => handleDeleteSpace(deleteSpaceConfirm)} className="flex-1 h-10 rounded-xl font-semibold" style={{ fontSize: 13, background: 'var(--danger)', color: '#fff' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {deleteConfirmConv && (
          <div className="ss4-overlay fixed inset-0 z-210 flex items-center justify-center p-4" onClick={() => setDeleteConfirmConv(null)}>
            <div className="ss4-modal w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface-2,#1c1d20)', borderRadius: 20, padding: '24px 20px 20px' }}>
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--danger-muted,rgba(239,68,68,0.15))' }}>
                  <Trash2 className="h-5 w-5" style={{ color: 'var(--danger)' }} />
                </div>
              </div>
              <p className="text-center font-bold mb-1" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Delete conversation?</p>
              <p className="text-center mb-5" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                "{getConvName(deleteConfirmConv, uid)}" will be permanently deleted for you. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmConv(null)} className="flex-1 h-10 rounded-xl font-semibold" style={{ fontSize: 13, background: 'var(--bg-hover,rgba(255,255,255,0.07))', color: 'var(--text-primary)' }}>Cancel</button>
                <button onClick={() => { deleteConversation(deleteConfirmConv); setDeleteConfirmConv(null); }} className="flex-1 h-10 rounded-xl font-semibold" style={{ fontSize: 13, background: 'var(--danger)', color: '#fff' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}