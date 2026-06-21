'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Search, Plus, Users, MessageSquare, Send, Paperclip,
  X, ChevronLeft, Download, FileText,
  Loader2, CheckCheck, Hash, Reply, Trash2,
  ArrowLeft, Radio, Bot, Video, Phone,
  Sun, Moon, Sparkles, SmilePlus,
  Bell, Smile, Pin, PinOff, Info, ImageIcon,
  Pencil, Check as CheckIcon,
  Mic, BarChart3, CalendarPlus, Archive, ArchiveRestore,
  UserPlus, UserMinus, Palette, Film, Wifi, Clock, MapPin, LogOut, Play, Pause,
  MoreHorizontal,
} from 'lucide-react';
import EmojiPicker, { Theme as EmojiTheme, EmojiClickData } from 'emoji-picker-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { useSupraSpaceSocket, SSConversation, SSMessage } from '@/hooks/useSupraSpaceSocket';
import { useSupraSpaceMessenger } from '@/context/SupraSpaceMessengerContext';
import { useTheme } from '@/context/ThemeContext';
import { cn, resolveImageUrl } from '@/lib/utils';
import { JitsiMeet } from './JitsiMeet';
// ── NEW: calling ──
import { useCall, CallSession } from '@/hooks/useCall';
import { stopCallSound } from '@/lib/notification-sound';
import { CallBanner } from './CallBanner';
import { IncomingCallModal } from './IncomingCallModal';
import { CallExperience } from './CallExperience';
import { EmojiReactionPicker } from '@/components/supraspace/EmojiReactionPicker';

const SS4_MAX_UPLOAD_FILES = 5;
const SS4_MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const SS4_MAX_VIDEO_UPLOAD_SIZE_BYTES = 40 * 1024 * 1024;
const SS4_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.mpeg', '.mpg', '.ogv',
]);
const SS4_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || '';

const SS4_THEME_PRESETS: { name: string; accent: string | null; wallpaper: string | null }[] = [
  { name: 'Default', accent: null, wallpaper: null },
  { name: 'Ocean', accent: '#2e7fff', wallpaper: 'linear-gradient(160deg, rgba(46,127,255,0.10), transparent)' },
  { name: 'Sunset', accent: '#f0683c', wallpaper: 'linear-gradient(160deg, rgba(240,104,60,0.12), transparent)' },
  { name: 'Forest', accent: '#22b060', wallpaper: 'linear-gradient(160deg, rgba(34,176,96,0.12), transparent)' },
  { name: 'Berry', accent: '#a855f7', wallpaper: 'linear-gradient(160deg, rgba(168,85,247,0.12), transparent)' },
  { name: 'Rose', accent: '#f0568a', wallpaper: 'linear-gradient(160deg, rgba(240,86,138,0.12), transparent)' },
  { name: 'Gold', accent: '#e0a13a', wallpaper: 'linear-gradient(160deg, rgba(224,161,58,0.12), transparent)' },
  { name: 'Slate', accent: '#64748b', wallpaper: 'linear-gradient(160deg, rgba(100,116,139,0.12), transparent)' },
];

// ─── Font + Style Injection ──────────────────────────────────────────────────
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
    .ss4-msg-column { width:fit-content; max-width:min(72%,42rem); }
    .ss4-msg-bubble { width:100%; max-width:100%; overflow:hidden; }
    .ss4-input-wrap { background:var(--input-bg); border:1.5px solid var(--input-border); border-radius:14px; transition:border-color .18s ease,box-shadow .18s ease; }
    .ss4-input-wrap:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px var(--input-focus); }
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
    .ss4-online-dot { background:var(--positive); box-shadow:0 0 0 2px var(--sidebar-bg),0 0 6px rgba(52,201,125,0.6); }
    @keyframes ss4-dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4;} 40%{transform:translateY(-4px);opacity:1;} }
    .ss4-typing-dot { animation:ss4-dot-bounce 1.4s ease-in-out infinite; }
    .ss4-msg-actions { background:var(--bg-elevated); border:1px solid var(--border-2); border-radius:10px; box-shadow:var(--shadow-md); }
    .ss4-mention-highlight { background:var(--accent-muted,rgba(91,124,246,0.09)); border-left:2px solid var(--accent); padding-left:6px; border-radius:4px; }
    .ss4-section-label { display:inline-flex; align-items:center; padding:3px 8px; border-radius:999px; background:var(--bg-subtle); border:1px solid var(--border-1); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--text-secondary); font-weight:700; }
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
    .ss4-tab-bar { background:rgba(127,127,127,0.08); border-radius:8px; padding:3px; }
    .ss4-tab { border-radius:6px; font-size:11px; font-weight:600; letter-spacing:.03em; transition:all .15s ease; color:var(--text-secondary); }
    .ss4-tab-active { background:var(--accent); color:#fff; box-shadow:0 2px 8px rgba(91,124,246,0.35); }
    .ss4-logo-mark { background:linear-gradient(140deg,#16a34a,#34c97d); box-shadow:0 0 0 1px rgba(52,201,125,0.3),0 4px 16px rgba(52,201,125,0.25); border-radius:10px; }
    .ss4-new-btn { background:rgba(91,124,246,0.15); border:1px solid rgba(91,124,246,0.25); border-radius:8px; color:var(--accent-text); transition:all .15s ease; }
    .ss4-new-btn:hover { background:rgba(91,124,246,0.25); }
    .ss4-theme-btn { background:var(--bg-hover); border:1px solid var(--border-2); border-radius:8px; color:var(--text-tertiary); transition:all .15s ease; }
    .ss4-theme-btn:hover { color:var(--text-primary); border-color:var(--border-3); }
    .ss4-file-own { background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.12); border-radius:10px; }
    .ss4-file-other { background:var(--surface-2); border:1px solid var(--border-1); border-radius:10px; }
    .ss4-badge { background:var(--accent); color:#fff; font-size:9px; font-weight:700; border-radius:10px; min-width:16px; height:16px; line-height:16px; padding:0 4px; text-align:center; }
    @keyframes ss4-fade-up { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
    .ss4-msg-enter { animation:ss4-fade-up .2s ease forwards; -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
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
    }
  `;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ini = (n: string) => (n || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function fmtDate(d: string) {
  const date = new Date(d), now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtRelative(d?: string) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}
const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60); const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
};

function renderMessageContent(content: string, isOwn: boolean): React.ReactNode[] {
  return content.split(/(\*\*[^*\n]+\*\*|@\w+(?:\s[A-Z][a-zA-Z]*)?)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (/^@/.test(part)) {
      return isOwn
        ? <span key={i} className="font-bold" style={{ color: 'rgba(255,255,255,0.95)', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' }}>{part}</span>
        : <span key={i} className="font-bold" style={{ color: 'var(--accent-text)' }}>{part}</span>;
    }
    return part;
  });
}
function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
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
const getConvName = (c: SSConversation, uid: string) =>
  c.type === 'group' ? (c.name || 'Group') : (c.members.find(m => m._id !== uid)?.fullName || 'Unknown');
const getConvAvatar = (c: SSConversation, uid: string) =>
  c.type === 'group' ? c.avatar : c.members.find(m => m._id !== uid)?.avatar;

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

interface CrmUser { _id: string; fullName: string; username: string; avatar?: string; role: string }

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

// ─── Date Separator ───────────────────────────────────────────────────────────
function DateSep({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-6 px-5">
      <div className="flex-1 ss4-date-line" />
      <span className="ss4-date-chip">{fmtDate(date)}</span>
      <div className="flex-1 ss4-date-line" />
    </div>
  );
}

// ─── Voice note player ────────────────────────────────────────────────────────
function VoicePlayer({ src, duration, own }: { src: string; duration?: number; own: boolean }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [cur, setCur] = React.useState(0);
  const total = duration || 0;
  return (
    <div className={cn('ss4-voice-bar', own ? 'ss4-file-own' : 'ss4-file-other')} style={{ minWidth: 200, maxWidth: 280 }}>
      <button
        onClick={() => { const a = audioRef.current; if (!a) return; if (playing) { a.pause(); } else { a.play(); } }}
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: own ? 'rgba(255,255,255,0.18)' : 'var(--accent-muted)', color: own ? '#fff' : 'var(--accent)' }}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: own ? 'rgba(255,255,255,0.2)' : 'var(--border-2)' }}>
          <div style={{ width: total ? `${Math.min(100, (cur / total) * 100)}%` : '0%', height: '100%', background: own ? '#fff' : 'var(--accent)', transition: 'width .1s linear' }} />
        </div>
        <p className="ss4-mono mt-1" style={{ fontSize: 10, color: own ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)' }}>
          {fmtDuration(cur)}{total ? ` / ${fmtDuration(total)}` : ''}
        </p>
      </div>
      <audio ref={audioRef} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={e => setCur((e.target as HTMLAudioElement).currentTime)} />
    </div>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────
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

// ─── Event card ───────────────────────────────────────────────────────────────
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
          {start.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
              style={{ fontSize: 11, fontWeight: 600,
                background: mine === r ? 'var(--accent)' : 'var(--bg-hover)',
                color: mine === r ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-2)' }}>
              {r} {(event as any)[r]?.length ? `· ${(event as any)[r].length}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function Bubble({
  message, isOwn, showAvatar, uid, onReply, onDelete, onPin, isPinned, onOpenMedia,
  onReact, onVotePoll, onRsvp, nameFor, disableActions, members = [], hideTime = false, onEditSave,
}: {
  message: SSMessage; isOwn: boolean; showAvatar: boolean; uid: string;
  onReply: (m: SSMessage) => void; onDelete: (id: string) => void;
  onPin?: (id: string) => void; isPinned?: boolean;
  onOpenMedia?: (v: { src: string; type: 'image' | 'video'; name: string }) => void;
  onReact: (id: string, emoji: string) => void;
  onVotePoll: (id: string, optionId: string) => void;
  onRsvp: (id: string, r: 'going' | 'maybe' | 'declined') => void;
  nameFor: (id: string) => string;
  disableActions?: boolean;
  members?: Array<{ _id: string; fullName: string; avatar?: string }>;
  hideTime?: boolean;
  onEditSave?: (id: string, content: string) => Promise<void>;
}) {
  const [hov, setHov] = React.useState(false);
  const [openReactPop, setOpenReactPop] = React.useState<string | null>(null);
  const [pickerPos, setPickerPos] = React.useState<{ top: number; left?: number; right?: number } | null>(null);
  const pickerPosRef = React.useRef<{ top: number; left?: number; right?: number } | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [mobileMenu, setMobileMenu] = React.useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);
  const editAreaRef = React.useRef<HTMLTextAreaElement>(null);

  const enterEdit = () => { setEditDraft(message.content); setEditMode(true); setHov(false); };
  const cancelEdit = () => { setEditMode(false); setEditDraft(''); };
  const saveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === message.content || !onEditSave) return;
    setEditSaving(true);
    try { await onEditSave(message._id, trimmed); setEditMode(false); } finally { setEditSaving(false); }
  };

  const openPicker = (pos: { top: number; left?: number; right?: number }) => {
    pickerPosRef.current = pos;
    setPickerPos(pos);
  };
  const closePicker = () => {
    pickerPosRef.current = null;
    setPickerPos(null);
  };
  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => { if (!pickerPosRef.current) setHov(false); }, 180);
  };
  const cancelHide = () => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setMobileMenu(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setHov(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [hov]);

  if (message.isDeleted) {
    return (
      <div className={cn('flex gap-2.5 px-5', isOwn && 'flex-row-reverse')}>
        <div className="w-8 shrink-0" />
        <p className="text-xs italic py-1" style={{ color: 'var(--text-disabled)' }}>This message was deleted</p>
      </div>
    );
  }

  const aColor = getAvaColor(message.sender.fullName);
  const voiceAtt = message.type === 'voice' ? message.attachments.find(a => a.mimeType.startsWith('audio/')) : null;

  return (
    <div className={cn('flex gap-2.5 px-5 relative ss4-msg-enter', isOwn && 'flex-row-reverse', isMentioned && 'ss4-mention-highlight')}
      onMouseEnter={() => { cancelHide(); setHov(true); }} onMouseLeave={scheduleHide}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchEnd}
      onContextMenu={e => e.preventDefault()}>
      {showAvatar ? (
        <div className={cn('h-8 w-8 rounded-full shrink-0 mt-0.5 flex items-center justify-center overflow-hidden', aColor)}>
          {message.sender.avatar
            ? <img src={resolveImageUrl(message.sender.avatar)} alt="" className="w-full h-full object-cover" />
            : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(message.sender.fullName)}</span>}
        </div>
      ) : <div className="w-8 shrink-0" />}

      <div className={cn('ss4-msg-column flex flex-col gap-1', isOwn && 'items-end')}>
        {showAvatar && !isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="font-semibold" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{message.sender.fullName}</span>
            {isPinned && <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ fontSize: 9, background: 'var(--accent-muted)', color: 'var(--accent-text)' }}>📌 Pinned</span>}
          </div>
        )}

        {message.replyTo && (
          <div className="rounded-xl px-3 py-2 mb-1 max-w-full ss4-reply-bar">
            <p className="font-semibold truncate" style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--accent-text)' }}>{message.replyTo.sender?.fullName}</p>
            <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{message.replyTo.content || '📎 Attachment'}</p>
          </div>
        )}

        {message.content ? (
          <div className="relative w-fit">
            {editMode ? (
              <div className={cn('ss4-msg-bubble px-3 py-2.5', isOwn ? 'ss4-bubble-own' : 'ss4-bubble-other')} style={{ minWidth: 200 }}>
                <textarea
                  ref={editAreaRef}
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  rows={Math.max(1, editDraft.split('\n').length)}
                  className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
                  style={{ color: 'inherit', minWidth: 180 }}
                />
                <div className="flex items-center gap-2 mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: 9, opacity: 0.45 }}>Enter to save · Esc to cancel</span>
                  <div className="flex-1" />
                  <button onClick={cancelEdit} className="h-5 px-2 rounded text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: 'inherit' }}>Cancel</button>
                  <button onClick={saveEdit} disabled={editSaving || !editDraft.trim() || editDraft.trim() === message.content}
                    className="h-5 px-2 rounded text-[10px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--positive,#34c97d)' }}>
                    {editSaving ? '...' : 'Update'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn('ss4-msg-bubble px-4 py-2.5 text-sm leading-relaxed', isOwn ? 'ss4-bubble-own' : 'ss4-bubble-other')}>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderMessageContent(message.content, isOwn)}</p>
                {message.isEdited && <span style={{ fontSize: 9, opacity: 0.45, marginLeft: 4 }}>(edited)</span>}
              </div>
            )}
            {hov && !disableActions && !editMode && (
              <div ref={menuRef} className={cn('absolute -top-8 z-20 flex items-center rounded-xl', isOwn ? 'right-0' : 'left-0')}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
                onMouseEnter={cancelHide} onMouseLeave={scheduleHide}>
                {SS4_REACTIONS.slice(0, 3).map(emoji => (
                  <button key={emoji} onClick={() => onReact(message._id, emoji)}
                    className="h-7 w-7 flex items-center justify-center text-base hover:bg-white/10 rounded-lg transition-all hover:scale-125 active:scale-95">
                    {emoji}
                  </button>
                ))}
                <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'var(--border-2)' }} />
                <button onClick={() => onReply(message)} className="ss4-icon-btn h-7 w-7" title="Reply"><Reply className="h-3.5 w-3.5" /></button>
                {onPin && (
                  <button onClick={() => onPin(message._id)} className="ss4-icon-btn h-7 w-7" title={isPinned ? 'Unpin' : 'Pin'}
                    style={{ color: isPinned ? 'var(--accent)' : undefined }}>
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                )}
                {isOwn && onEditSave && message.type === 'text' && (
                  <button onClick={enterEdit} className="ss4-icon-btn h-7 w-7" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {isOwn && (
                  <button onClick={() => onDelete(message._id)} className="ss4-icon-btn h-7 w-7 hover:text-[var(--danger)]" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const pos = {
                        top: btn.top - 348,
                        ...(isOwn ? { right: window.innerWidth - btn.right } : { left: btn.left }),
                      };
                      pickerPosRef.current ? closePicker() : openPicker(pos);
                    }}
                    className="ss4-icon-btn h-7 w-7"
                    title="More reactions"
                    style={{ color: pickerPos ? 'var(--positive)' : undefined }}
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {pickerPos && (
                  <EmojiReactionPicker
                    position={pickerPos}
                    onSelect={(emoji) => { onReact(message._id, emoji); closePicker(); }}
                    onClose={closePicker}
                  />
                )}
              </div>
            )}
          </div>
        ) : null}

        {message.type === 'gif' && message.gif?.url && (
          <img src={message.gif.url} alt={message.gif.title || 'GIF'} className="rounded-xl" style={{ maxWidth: 240, maxHeight: 240, display: 'block' }} />
        )}

        {voiceAtt && <VoicePlayer src={voiceAtt.url} duration={voiceAtt.duration} own={isOwn} />}

        {message.type === 'poll' && message.poll && (
          <PollCard poll={message.poll} uid={uid} onVote={(optId) => onVotePoll(message._id, optId)} />
        )}

        {message.type === 'event' && message.event && (
          <EventCard event={message.event} uid={uid} onRsvp={(r) => onRsvp(message._id, r)} />
        )}

        {message.type !== 'voice' && message.attachments.length > 0 && (
          <div className={cn('flex flex-col gap-1.5', message.content ? 'mt-1' : '')}>
            {message.attachments.filter(a => a.mimeType.startsWith('image/')).map((att, i) => (
              <button key={`img-${i}`} onClick={() => onOpenMedia?.({ src: att.url, type: 'image', name: att.originalName })}
                className="block text-left rounded-xl overflow-hidden cursor-zoom-in" style={{ maxWidth: 260 }}>
                <img src={att.thumbnailUrl || att.url} alt={att.originalName} className="rounded-xl object-cover hover:opacity-90 transition-opacity" style={{ maxHeight: 200, maxWidth: 260, display: 'block' }} />
              </button>
            ))}
            {message.attachments.filter(isVideoAttachment).map((att, i) => (
              <div key={`video-${i}`} className="rounded-xl overflow-hidden" style={{ maxWidth: 280 }}>
                <video controls preload="metadata" className="block w-full rounded-xl" style={{ maxHeight: 220 }}>
                  <source src={att.url} type={att.mimeType || 'video/mp4'} />
                </video>
              </div>
            ))}
            {message.attachments.filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/') && !isVideoAttachment(a)).map((att, i) => (
              <a key={`file-${i}`} href={att.url} download={att.originalName}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80 no-underline', isOwn ? 'ss4-file-own' : 'ss4-file-other')} style={{ maxWidth: 280 }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--accent-muted)' }}>
                  <FileText className="h-4 w-4" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)' }}>{att.originalName}</p>
                  <p className="mt-0.5 opacity-50 ss4-mono" style={{ fontSize: 10 }}>{fmtSize(att.size)}</p>
                </div>
                <Download className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </a>
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
                        setOpenReactPop(isPopOpen ? null : popId);
                      } else {
                        onReact(message._id, r.emoji);
                      }
                    }}
                    className={cn('ss4-reaction-chip', mine && 'ss4-reaction-mine')}
                  >
                    <span>{r.emoji}</span>
                    <span className="ss4-mono" style={{ fontSize: 10 }}>{r.users.length}</span>
                  </button>
                  {isPopOpen && whoArr.length > 0 && (
                    <div
                      className={cn('absolute z-50 bottom-full mb-1.5 px-3 py-2 rounded-xl text-[11px] min-w-[110px] max-w-[190px]', isOwn ? 'right-0' : 'left-0')}
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
            ? (members as Array<{_id:string;fullName:string;avatar?:string}>).filter(m => m._id !== uid && (message.readBy || []).includes(m._id))
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

      {mobileMenu && !disableActions && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobileMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-1)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
            {message.content && (
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{message.sender.fullName}</p>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{message.content}</p>
              </div>
            )}
            <div className="flex justify-around px-4 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
              {SS4_REACTIONS.map(e => (
                <button key={e} onClick={() => { onReact(message._id, e); setMobileMenu(false); }}
                  className="text-2xl p-1 active:scale-90 transition-transform">{e}</button>
              ))}
            </div>
            <div className="py-1">
              <button onClick={() => { onReply(message); setMobileMenu(false); }}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium active:bg-white/5 transition-colors" style={{ color: 'var(--text-primary)' }}>
                <Reply className="h-5 w-5 shrink-0" style={{ color: 'var(--accent)' }} /> Reply
              </button>
              {onPin && (
                <button onClick={() => { onPin(message._id); setMobileMenu(false); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium active:bg-white/5 transition-colors" style={{ color: 'var(--text-primary)' }}>
                  <Pin className="h-5 w-5 shrink-0" style={{ color: isPinned ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  {isPinned ? 'Unpin message' : 'Pin message'}
                </button>
              )}
              {isOwn && (
                <button onClick={() => { onDelete(message._id); setMobileMenu(false); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium active:bg-white/5 transition-colors" style={{ color: 'var(--danger,#f87171)' }}>
                  <Trash2 className="h-5 w-5 shrink-0" /> Delete message
                </button>
              )}
              <button onClick={() => setMobileMenu(false)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium active:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <X className="h-5 w-5 shrink-0" /> Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Video Call Modal (legacy — no longer used; kept so JitsiMeet import stays referenced) ──
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

// ─── New Conversation Modal ───────────────────────────────────────────────────
function NewConvModal({ users, onClose, onStartDM, onCreateGroup, defaultTab = 'dm' }: {
  users: CrmUser[]; onClose: () => void; onStartDM: (id: string) => void; onCreateGroup: (name: string, ids: string[]) => void; defaultTab?: 'dm' | 'group';
}) {
  const [tab, setTab] = React.useState<'dm' | 'group'>(defaultTab);
  const [q, setQ] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [sel, setSel] = React.useState<string[]>([]);
  const list = users.filter(u => u.fullName.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>New Conversation</h2>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 pt-4 pb-3">
          <div className="ss4-tab-bar flex gap-1">
            {(['dm', 'group'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={cn('flex-1 h-7 ss4-tab', t === tab && 'ss4-tab-active')}>{t === 'dm' ? 'Direct Message' : 'New Channel'}</button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {tab === 'group' && (
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Channel name..." className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
          )}
          <div className="relative">
            <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people..." className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto ss4-scroll -mx-1 px-1">
            {list.map(u => {
              const active = sel.includes(u._id);
              return (
                <button key={u._id} onClick={() => tab === 'dm' ? onStartDM(u._id) : toggle(u._id)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left', active ? 'bg-(--accent-muted)' : 'hover:bg-(--bg-hover)')}
                  style={active ? { border: '1px solid rgba(91,124,246,0.2)' } : undefined}>
                  <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden', getAvaColor(u.fullName))}>
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(u.fullName)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
                    <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username} · {u.role}</p>
                  </div>
                  {tab === 'group' && active && <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}><CheckIcon className="h-3 w-3" style={{ color: '#fff' }} /></div>}
                </button>
              );
            })}
          </div>
          {tab === 'group' && sel.length > 0 && (
            <button onClick={() => groupName.trim() && onCreateGroup(groupName, sel)} disabled={!groupName.trim()}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2" style={{ fontSize: 13, opacity: !groupName.trim() ? 0.4 : 1 }}>
              <Users className="h-3.5 w-3.5" /> Create Channel · {sel.length} {sel.length === 1 ? 'member' : 'members'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function LightboxModal({ src, type, name, onClose }: { src: string; type: 'image' | 'video'; name: string; onClose: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="ss4-overlay fixed inset-0 z-200 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-3 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full px-1">
          <p className="font-medium truncate" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{name}</p>
          <div className="flex items-center gap-2">
            <a href={src} download={name} className="ss4-pill-btn flex items-center gap-1.5 px-3 h-7 no-underline" style={{ fontSize: 11 }}><Download className="h-3 w-3" /> Download</a>
            <button onClick={onClose} className="ss4-icon-btn h-8 w-8" style={{ background: 'rgba(255,255,255,0.1)' }}><X className="h-4 w-4" style={{ color: '#fff' }} /></button>
          </div>
        </div>
        {type === 'image'
          ? <img src={src} alt={name} className="rounded-xl max-h-[80vh] max-w-full object-contain" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />
          : <video src={src} controls autoPlay className="rounded-xl max-h-[80vh] max-w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />}
      </div>
    </div>
  );
}

// ─── Pending file preview ─────────────────────────────────────────────────────
function FilePreviewItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/');
  const isVid = file.type.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(file.name.slice(file.name.lastIndexOf('.')).toLowerCase());
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isImg || isVid) { const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }
  }, [file, isImg, isVid]);
  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden shrink-0" style={{ width: 80, background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
      {preview && isImg ? <img src={preview} alt={file.name} className="w-full object-cover" style={{ height: 60 }} />
        : preview && isVid ? <video src={preview} className="w-full object-cover" style={{ height: 60 }} muted />
          : <div className="flex items-center justify-center" style={{ height: 60, background: 'var(--accent-muted)' }}><FileText className="h-6 w-6" style={{ color: 'var(--accent)' }} /></div>}
      <div className="px-1.5 py-1">
        <p className="truncate" style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>{file.name}</p>
        <p className="ss4-mono" style={{ fontSize: 8, color: 'var(--text-disabled)' }}>{fmtSize(file.size)}</p>
      </div>
      <button onClick={onRemove} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><X className="h-2.5 w-2.5" style={{ color: '#fff' }} /></button>
    </div>
  );
}

// ─── GIF Picker ───────────────────────────────────────────────────────────────
function GifPicker({ onPick, onClose }: { onPick: (g: { url: string; width?: number; height?: number; title?: string }) => void; onClose: () => void }) {
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
    <div className="absolute bottom-full left-0 mb-2 z-50 rounded-xl overflow-hidden" style={{ width: 300, background: 'var(--bg-elevated)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)' }}>
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

// ─── Poll Modal ───────────────────────────────────────────────────────────────
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

// ─── Event Modal ──────────────────────────────────────────────────────────────
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
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input mt-1" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ends (optional)</label>
            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input mt-1" />
          </div>
          <button disabled={!valid} onClick={() => valid && onCreate({ title: title.trim(), description, location, startTime, endTime })} className="w-full h-9 rounded-lg ss4-send-btn font-semibold mt-1" style={{ fontSize: 13, opacity: valid ? 1 : 0.4 }}>Create Event</button>
        </div>
      </div>
    </div>
  );
}

// ─── Theme Modal ──────────────────────────────────────────────────────────────
function ThemeModal({ current, onClose, onApply }: { current?: SSConversation['theme']; onClose: () => void; onApply: (t: { accent: string | null; wallpaper: string | null }) => void }) {
  const [accent, setAccent] = React.useState<string | null>(current?.accent || null);
  const [wallpaper, setWallpaper] = React.useState<string | null>(current?.wallpaper || null);
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
          <button onClick={() => onApply({ accent, wallpaper })} className="w-full h-9 rounded-lg ss4-send-btn font-semibold" style={{ fontSize: 13 }}>Apply Theme</button>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Members Modal ─────────────────────────────────────────────────────
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

// ─── Active Users Modal ───────────────────────────────────────────────────────
function ActiveUsersModal({ users, presence, uid, onClose }: {
  users: CrmUser[]; presence: Record<string, 'online' | 'offline'>; uid: string; onClose: () => void;
}) {
  const online = users.filter(u => u._id !== uid && presence[u._id] === 'online');
  const offline = users.filter(u => u._id !== uid && presence[u._id] !== 'online');
  const Row = (u: CrmUser, isOn: boolean) => (
    <div key={u._id} className="w-full flex items-center gap-3 px-4 py-2.5">
      <div className="relative shrink-0">
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden', getAvaColor(u.fullName))} style={{ fontSize: 12 }}>
          {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : ini(u.fullName)}
        </div>
        {isOn && <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
        <p style={{ fontSize: 10, color: isOn ? 'var(--positive)' : 'var(--text-tertiary)' }}>{isOn ? 'Active now' : u.role || 'Offline'}</p>
      </div>
      <span className={cn('shrink-0 h-2.5 w-2.5 rounded-full', isOn ? 'bg-[var(--positive)]' : 'bg-[#6b7280]')} />
    </div>
  );
  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-2"><Wifi className="h-4 w-4" style={{ color: 'var(--positive)' }} /><h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Active Now · {online.length}</h2></div>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto ss4-scroll">
          {online.length > 0 && <div className="px-4 pt-3 pb-1"><span className="ss4-section-label" style={{ color: 'var(--positive)' }}>● Online</span></div>}
          {online.map(u => Row(u, true))}
          {offline.length > 0 && <div className="px-4 pt-3 pb-1"><span className="ss4-section-label">Offline</span></div>}
          {offline.map(u => Row(u, false))}
        </div>
      </div>
    </div>
  );
}

// ─── Summarize Modal ──────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
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

  // On mobile: intercept back button while inside a conversation so it returns to the list
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

  const [input, setInput] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<SSMessage | null>(null);
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [uploadNotice, setUploadNotice] = React.useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [showModal, setShowModal] = React.useState<{ open: boolean; tab: 'dm' | 'group' }>({ open: false, tab: 'dm' });
  const [allUsers, setAllUsers] = React.useState<CrmUser[]>([]);
  const [q, setQ] = React.useState('');

  const [autrixOpen, setAutrixOpen] = React.useState(false);
  const [autrixLoading, setAutrixLoading] = React.useState(false);
  const autrixRef = React.useRef<HTMLDivElement>(null);

  const [showInfo, setShowInfo] = React.useState(false);
  const [infoTab, setInfoTab] = React.useState<'members' | 'media' | 'files' | 'pinned'>('members');
  const [pinnedMsgIds, setPinnedMsgIds] = React.useState<Set<string>>(new Set());
  const [pinEvents, setPinEvents] = React.useState<Array<{id: string; pinnerName: string; msgId: string}>>([]);
  const [editingGcName, setEditingGcName] = React.useState(false);
  const [gcNameInput, setGcNameInput] = React.useState('');
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const emojiRef = React.useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = React.useState<{ src: string; type: 'image' | 'video'; name: string } | null>(null);
  const [memberCard, setMemberCard] = React.useState<{ member: SSConversation['members'][number]; pos: { x: number; y: number } } | null>(null);
  const avatarFileRef = React.useRef<HTMLInputElement>(null);

  const [showArchived, setShowArchived] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [pollOpen, setPollOpen] = React.useState(false);
  const [eventOpen, setEventOpen] = React.useState(false);
  const [gifOpen, setGifOpen] = React.useState(false);
  const [activeUsersOpen, setActiveUsersOpen] = React.useState(false);
  const [summarizeOpen, setSummarizeOpen] = React.useState(false);
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false);
  const createMenuRef = React.useRef<HTMLDivElement>(null);
  const gifRef = React.useRef<HTMLDivElement>(null);
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
  const fileRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const typingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState<number>(-1);
  const [mentionIdx, setMentionIdx] = React.useState(0);

  const { socket, isConnected, presence, typing, joinConversation, leaveConversation, sendTypingStart, sendTypingStop, markRead } = useSupraSpaceSocket(token || null);
  const { markAsRead: ctxMarkAsRead } = useSupraSpaceMessenger();

  const activeConv = convos.find(c => c._id === activeId);
  const activeMsgs = activeId ? (msgs[activeId] || []) : [];
  const msgSeenByMembers = React.useMemo(() => {
    // Build fresh avatar/name from message sender data (more up-to-date than conv.members)
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
    const result: Record<string, {_id:string;fullName:string;avatar?:string}[]> = {};
    (activeConv?.members || []).forEach(member => {
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
  const isAdmin = !!(activeConv && (activeConv.admins || []).map(String).includes(uid));
  const isReportGroup = activeConv?.name === 'Online Team Report';

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

  const appendMessageLocal = React.useCallback((conversationId: string, message: SSMessage) => {
    setMsgs(p => {
      const ex = p[conversationId] || [];
      if (ex.find(m => m._id === message._id)) return p;
      return { ...p, [conversationId]: [...ex, message] };
    });
    setConvos(p => p.map(c => c._id === conversationId ? { ...c, lastMessage: message, lastMessageAt: message.createdAt } : c)
      .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // ── Calling (NEW) ──
  const call = useCall(socket, token, uid);
  const [activeMeeting, setActiveMeeting] = React.useState<CallSession | null>(null);
  const me = React.useMemo(() => allUsers.find(u => u._id === uid), [allUsers, uid]);

  const handleStartCall = React.useCallback(async (conv: SSConversation) => {
    try { setActiveMeeting(await call.startCall(conv._id)); }
    catch (e) { showUploadNotice('error', getErrorMessage(e, 'Could not start the call.')); }
  }, [call, showUploadNotice]);

  const handleJoinCall = React.useCallback(async (meetingId: string) => {
    try { setActiveMeeting(await call.joinCall(meetingId)); }
    catch (e) { showUploadNotice('error', getErrorMessage(e, 'Could not join the call.')); }
  }, [call, showUploadNotice]);

  const handleLeaveCall = React.useCallback(async () => {
    const mId = activeMeeting?.call?.meetingId;
    setActiveMeeting(null);
    if (mId) await call.endCall(mId);
  }, [activeMeeting, call]);

  // ── Init ──
  React.useEffect(() => {
    (async () => {
      let t = localStorage.getItem('crm_token');

      if (!t) {
        try {
          const mainToken = await getMainToken();
          if (mainToken) {
            const sso = await apiClient.get('/api/auth/crm-sso', { headers: { Authorization: `Bearer ${mainToken}` } });
            t = sso.data?.data?.token ?? null;
            if (t) localStorage.setItem('crm_token', t);
          }
        } catch { /* no main app token, fall through */ }
      }

      if (!t) {
        try {
          const mainToken = await getMainToken();
          if (mainToken) {
            const sso = await apiClient.post('/api/supraspace/session-token', {}, { headers: { Authorization: `Bearer ${mainToken}` } });
            t = sso.data?.data?.token ?? null;
            if (t) localStorage.setItem('crm_token', t);
          }
        } catch {}
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

        const pendingUserId = new URLSearchParams(window.location.search).get('userId');
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
              setActiveId(c._id);
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
        }
        router.replace('/crm');
      }
      finally { setLoading(false); }
    })();
  }, [router, getMainToken]);

  React.useEffect(() => () => { if (uploadNoticeTimerRef.current) clearTimeout(uploadNoticeTimerRef.current); }, []);

  const targetConvId = searchParams.get('convId');
  React.useEffect(() => {
    if (loading || !targetConvId) return;
    setActiveId(targetConvId);
    router.replace('/crm/supra-space', { scroll: false });
  }, [loading, targetConvId, router]);

  const targetUserId = searchParams.get('userId');
  React.useEffect(() => {
    if (loading || !token || !targetUserId) return;
    apiClient
      .post('/api/supraspace/conversations/direct', { targetUserId }, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        const c = r.data?.data;
        if (!c) return;
        setConvos((p) => (p.find((x) => x._id === c._id) ? p : [c, ...p]));
        setActiveId(c._id);
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
        ctxMarkAsRead(conversationId);
        setConvos(prev => prev.map(c => {
          if (c._id !== conversationId || !c.lastMessage) return c;
          const rb = c.lastMessage.readBy || [];
          if (rb.includes(uid)) return c;
          return { ...c, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
        }));
      }
    };
    const onDel = ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      patchMsg(conversationId, messageId, { isDeleted: true, content: '', attachments: [] } as any);
    const onNew = (c: SSConversation) => setConvos(p => [c, ...p.filter(x => x._id !== c._id)]);
    const onConvUpdated = (c: any) => {
      if (c?.members) setConvos(p => p.map(x => x._id === c._id ? { ...x, ...c } : x));
      else if (c?._id) patchConv(c._id, c);
    };
    const onConvDeleted = ({ conversationId }: { conversationId: string }) => {
      setConvos(p => p.filter(x => x._id !== conversationId));
      setActiveId(prev => prev === conversationId ? null : prev);
    };
    const onConvTheme = ({ conversationId, theme: th }: { conversationId: string; theme: any }) => patchConv(conversationId, { theme: th });
    const onReaction = ({ conversationId, messageId, reactions }: any) => patchMsg(conversationId, messageId, { reactions });
    const onPoll = ({ conversationId, messageId, poll }: any) => patchMsg(conversationId, messageId, { poll });
    const onEvent = ({ conversationId, messageId, event }: any) => patchMsg(conversationId, messageId, { event });

    const onEdited = ({ conversationId, messageId, content }: any) => patchMsg(conversationId, messageId, { content, isEdited: true });
    socket.on('message:new', onMsg);
    socket.on('message:deleted', onDel);
    socket.on('message:edited', onEdited);
    socket.on('conversation:new', onNew);
    socket.on('conversation:updated', onConvUpdated);
    socket.on('conversation:deleted', onConvDeleted);
    socket.on('conversation:theme', onConvTheme);
    socket.on('message:reaction', onReaction);
    socket.on('message:poll', onPoll);
    socket.on('message:event', onEvent);
    const onMsgsRead = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
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
    return () => {
      socket.off('message:new', onMsg); socket.off('message:deleted', onDel); socket.off('message:edited', onEdited); socket.off('conversation:new', onNew);
      socket.off('conversation:updated', onConvUpdated); socket.off('conversation:deleted', onConvDeleted);
      socket.off('conversation:theme', onConvTheme); socket.off('message:reaction', onReaction);
      socket.off('message:poll', onPoll); socket.off('message:event', onEvent);
      socket.off('messages:read', onMsgsRead);
      socket.off('user:profile:updated', onProfileUpdated);
    };
  }, [socket, appendMessageLocal, patchMsg, patchConv]);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMsgs.length]);

  React.useEffect(() => {
    if (!activeId || !token) return;
    if (!msgs[activeId]) {
      setLoadingMsgs(true);
      apiClient.get(`/api/supraspace/conversations/${activeId}/messages`, { headers: { Authorization: `Bearer ${token}` }, params: { limit: 40 } })
        .then(r => { const d = r.data?.data || []; setMsgs(p => ({ ...p, [activeId]: d })); setHasMore(p => ({ ...p, [activeId]: d.length === 40 })); })
        .finally(() => setLoadingMsgs(false));
    }
    markRead(activeId);
    ctxMarkAsRead(activeId);
    setConvos(prev => prev.map(c => {
      if (c._id !== activeId || !c.lastMessage) return c;
      const rb = c.lastMessage.readBy || [];
      if (rb.includes(uid)) return c;
      return { ...c, lastMessage: { ...c.lastMessage, readBy: [...rb, uid] } };
    }));
    call.refreshStatus(activeId);
  }, [activeId, token]); // eslint-disable-line

  React.useEffect(() => {
    if (!activeId || !isConnected) return;
    joinConversation(activeId);
    return () => leaveConversation(activeId);
  }, [activeId, isConnected, joinConversation, leaveConversation]);

  React.useEffect(() => { setPendingFiles([]); setUploadNotice(null); setShowInfo(false); }, [activeId]);

  React.useEffect(() => {
    const make = (ref: React.RefObject<HTMLDivElement | null>, close: () => void) => (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const hs: Array<[boolean, (e: MouseEvent) => void]> = [
      [autrixOpen, make(autrixRef, () => setAutrixOpen(false))],
      [emojiOpen, make(emojiRef, () => setEmojiOpen(false))],
      [createMenuOpen, make(createMenuRef, () => setCreateMenuOpen(false))],
      [gifOpen, make(gifRef, () => setGifOpen(false))],
    ];
    const active = hs.filter(([on]) => on).map(([, h]) => h);
    active.forEach(h => document.addEventListener('mousedown', h));
    return () => active.forEach(h => document.removeEventListener('mousedown', h));
  }, [autrixOpen, emojiOpen, createMenuOpen, gifOpen]);

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

  const handleSend = async () => {
    if (!activeId || sending) return;
    const hasText = Boolean(input.trim());
    const hasPendingFiles = pendingFiles.length > 0;
    if (!hasText && !hasPendingFiles) return;
    const conversationId = activeId;
    const content = input.trim();
    const replyMessageId = replyTo?._id;
    setSending(true);
    sendTypingStop(conversationId);
    try {
      if (hasPendingFiles) {
        setUploading(true);
        const fd = new FormData();
        pendingFiles.forEach(f => fd.append('files', f));
        if (content) fd.append('content', content);
        if (replyMessageId) fd.append('replyTo', replyMessageId);
        const r = await apiClient.post(`/api/supraspace/conversations/${conversationId}/upload`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
        if (r.data?.data) appendMessageLocal(conversationId, r.data.data);
        setPendingFiles([]); setInput(''); setReplyTo(null);
        showUploadNotice('success', pendingFiles.length === 1 ? 'Attachment sent.' : `${pendingFiles.length} attachments sent.`);
      } else {
        setInput(''); setReplyTo(null);
        const r = await apiClient.post(`/api/supraspace/conversations/${conversationId}/messages`, { content, replyTo: replyMessageId }, { headers: { Authorization: `Bearer ${token}` } });
        if (r.data?.data) appendMessageLocal(conversationId, r.data.data);
      }
    } catch (error) {
      if (hasPendingFiles) showUploadNotice('error', getErrorMessage(error, 'Failed to send attachment.'));
      else setInput(content);
    } finally { setSending(false); setUploading(false); }
  };

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

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    // Detect @mention trigger (anchor-based so names with spaces work)
    const cursor = e.target.selectionStart ?? val.length;
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
    if (!activeId) return;
    sendTypingStart(activeId);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => sendTypingStop(activeId!), 2000);
  };

  const insertMention = React.useCallback((name: string) => {
    const before = input.slice(0, mentionAnchor);
    const after = input.slice(mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    setInput(`${before}@${name} ${after}`);
    setMentionQuery(null);
    setMentionAnchor(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [input, mentionAnchor, mentionQuery]);

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

  const sendGif = async (gif: { url: string; width?: number; height?: number; title?: string }) => {
    if (!activeId) return;
    try {
      const r = await apiClient.post(`/api/supraspace/conversations/${activeId}/messages`, { gif }, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.data) appendMessageLocal(activeId, r.data.data);
    } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to send GIF.')); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!activeId) return;
    setMsgs(p => ({ ...p, [activeId]: (p[activeId] || []).map(m => {
      if (m._id !== msgId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        const has = reactions[idx].users.includes(uid);
        const users = has ? reactions[idx].users.filter(u => u !== uid) : [...reactions[idx].users, uid];
        if (users.length === 0) reactions.splice(idx, 1); else reactions[idx] = { ...reactions[idx], users };
      } else reactions.push({ emoji, users: [uid] } as any);
      return { ...m, reactions };
    }) }));
    try { await apiClient.post(`/api/supraspace/messages/${msgId}/react`, { emoji }, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
  };
  const handleVotePoll = async (msgId: string, optionId: string) => {
    try { const r = await apiClient.post(`/api/supraspace/messages/${msgId}/poll/vote`, { optionId }, { headers: { Authorization: `Bearer ${token}` } }); if (activeId && r.data?.data?.poll) patchMsg(activeId, msgId, { poll: r.data.data.poll }); } catch {}
  };
  const handleRsvp = async (msgId: string, response: 'going' | 'maybe' | 'declined') => {
    try { const r = await apiClient.post(`/api/supraspace/messages/${msgId}/event/rsvp`, { response }, { headers: { Authorization: `Bearer ${token}` } }); if (activeId && r.data?.data?.event) patchMsg(activeId, msgId, { event: r.data.data.event }); } catch {}
  };
  const createPoll = async (question: string, options: string[], allowMultiple: boolean) => {
    if (!activeId) return; setPollOpen(false);
    try { const r = await apiClient.post(`/api/supraspace/conversations/${activeId}/poll`, { question, options, allowMultiple }, { headers: { Authorization: `Bearer ${token}` } }); if (r.data?.data) appendMessageLocal(activeId, r.data.data); } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to create poll.')); }
  };
  const createEvent = async (ev: { title: string; description: string; location: string; startTime: string; endTime: string }) => {
    if (!activeId) return; setEventOpen(false);
    try { const r = await apiClient.post(`/api/supraspace/conversations/${activeId}/event`, ev, { headers: { Authorization: `Bearer ${token}` } }); if (r.data?.data) appendMessageLocal(activeId, r.data.data); } catch (e) { showUploadNotice('error', getErrorMessage(e, 'Failed to create event.')); }
  };

  const handleEdit = async (msgId: string, content: string) => {
    if (!activeId) return;
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

  const togglePinConv = async (c: SSConversation) => {
    const pinned = !isPinnedConv(c);
    patchConv(c._id, { pinnedBy: pinned ? [...(c.pinnedBy || []), uid] : (c.pinnedBy || []).filter(x => String(x) !== uid) } as any);
    try { await apiClient.post(`/api/supraspace/conversations/${c._id}/pin`, { pinned }, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
  };
  const toggleArchiveConv = async (c: SSConversation) => {
    const archived = !isArchivedConv(c);
    patchConv(c._id, { archivedBy: archived ? [...(c.archivedBy || []), uid] : (c.archivedBy || []).filter(x => String(x) !== uid) } as any);
    try { await apiClient.post(`/api/supraspace/conversations/${c._id}/archive`, { archived }, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
  };
  const deleteConversation = async (c: SSConversation) => {
    setConfirmDelete(false); setShowInfo(false);
    try {
      await apiClient.delete(`/api/supraspace/conversations/${c._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setConvos(p => p.filter(x => x._id !== c._id));
      setActiveId(prev => prev === c._id ? null : prev);
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
  const renameChannel = async (name: string) => {
    if (!activeConv || !name.trim()) return;
    patchConv(activeConv._id, { name: name.trim() });
    try { await apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, { name: name.trim() }, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
  };
  const applyTheme = async (t: { accent: string | null; wallpaper: string | null }) => {
    if (!activeConv) return; setThemeOpen(false);
    patchConv(activeConv._id, { theme: { ...(activeConv.theme || {}), ...t } } as any);
    try { await apiClient.patch(`/api/supraspace/conversations/${activeConv._id}/theme`, { theme: { ...(activeConv.theme || {}), ...t } }, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
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
          .then(r => { if (r.data?.data?.avatar) patchConv(activeConv._id, { avatar: r.data.data.avatar }); }).catch(() => {});
      }, 'image/jpeg', 0.9);
    };
    img.src = raw;
  };

  const handleAutrix = async (action: 'improve' | 'draft' | 'formal' | 'casual') => {
    setAutrixOpen(false); setAutrixLoading(true);
    try {
      if (action === 'draft' && !input.trim() && activeId) {
        const r = await apiClient.post('/api/supraleo/draft', { conversationId: activeId }, { headers: { Authorization: `Bearer ${token}` } });
        const reply = r.data?.data?.draft || r.data?.data?.message || '';
        if (reply.trim()) setInput(reply.trim());
        return;
      }
      const recent = activeMsgs.slice(-10).map(m => `${m.sender?.fullName || 'User'}: ${m.content || '(attachment)'}`).join('\n');
      const cName = activeConv?.name || 'this conversation';
      const prompts: Record<string, string> = {
        improve: `Improve this draft for clarity and professionalism. Return only the improved text:\n\n"${input.trim()}"`,
        formal: `Rewrite this message in a formal, professional tone. Return only the text:\n\n"${input.trim()}"`,
        casual: `Rewrite this message in a friendly, casual tone. Return only the text:\n\n"${input.trim()}"`,
        draft: `Draft a brief professional reply for "${cName}". Return only the message text.\n\nRecent:\n${recent || '(none)'}`,
      };
      const r = await apiClient.post('/api/supraleo/chat', { message: prompts[action], module: 'supraspace' }, { headers: { Authorization: `Bearer ${token}` } });
      const reply = r.data?.data?.message || '';
      if (reply.trim()) setInput(reply.trim());
    } catch {} finally { setAutrixLoading(false); }
  };

  const handleDM = async (targetId: string) => {
    setShowModal({ open: false, tab: 'dm' }); setActiveUsersOpen(false);
    try {
      const r = await apiClient.post('/api/supraspace/conversations/direct', { targetUserId: targetId }, { headers: { Authorization: `Bearer ${token}` } });
      const c = r.data?.data;
      setConvos(p => p.find(x => x._id === c._id) ? p : [c, ...p]); setActiveId(c._id);
    } catch {}
  };
  const handleGroup = async (name: string, ids: string[]) => {
    setShowModal({ open: false, tab: 'dm' });
    try { const r = await apiClient.post('/api/supraspace/conversations/group', { name, memberIds: ids }, { headers: { Authorization: `Bearer ${token}` } }); setConvos(p => [r.data?.data, ...p]); setActiveId(r.data?.data._id); } catch {}
  };
  const loadMore = async () => {
    if (!activeId || !hasMore[activeId] || loadingMsgs) return;
    setLoadingMsgs(true);
    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${activeId}/messages`, { headers: { Authorization: `Bearer ${token}` }, params: { before: activeMsgs[0]?.createdAt, limit: 40 } });
      const d = r.data?.data || [];
      setMsgs(p => ({ ...p, [activeId]: [...d, ...(p[activeId] || [])] }));
      setHasMore(p => ({ ...p, [activeId]: d.length === 40 }));
    } catch {} finally { setLoadingMsgs(false); }
  };

  const openSearchResult = (convId: string, messageId: string) => {
    setActiveId(convId); setQ('');
    setTimeout(() => document.getElementById(`ss4-msg-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
  };

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
  const wallpaper = activeConv?.theme?.wallpaper || undefined;

  const visibleConvos = convos.filter(c => getConvName(c, uid).toLowerCase().includes(q.toLowerCase()));
  const pinnedList = visibleConvos.filter(c => isPinnedConv(c) && !isArchivedConv(c));
  const archivedList = convos.filter(c => isArchivedConv(c));
  const normalList = visibleConvos.filter(c => !isPinnedConv(c) && !isArchivedConv(c));

  const ConvRow = ({ conv, compact }: { conv: SSConversation; compact?: boolean }) => {
    const isAct = conv._id === activeId;
    const other = conv.members.find(m => m._id !== uid);
    const online = other ? presence[other._id] === 'online' : false;
    const cName = getConvName(conv, uid);
    const cAvatar = getConvAvatar(conv, uid);
    const pinned = isPinnedConv(conv);
    const archived = isArchivedConv(conv);
    const isUnread = !isAct && conv.lastMessage && uid && !conv.lastMessage.readBy?.includes(uid) && conv.lastMessage.sender?._id !== uid;
    const lastPreview = conv.lastMessage?.isDeleted ? 'Message deleted'
      : conv.lastMessage?.type === 'voice' ? '🎙️ Voice message'
      : conv.lastMessage?.type === 'gif' ? 'GIF'
      : conv.lastMessage?.type === 'poll' ? `📊 ${conv.lastMessage?.poll?.question || 'Poll'}`
      : conv.lastMessage?.type === 'event' ? `📅 ${conv.lastMessage?.event?.title || 'Event'}`
      : conv.lastMessage?.content || (conv.lastMessage?.attachments?.length ? '📎 Attachment' : 'No messages yet');
    const senderPrefix = conv.type === 'group' && conv.lastMessage && conv.lastMessage.sender?._id !== uid ? `${(conv.lastMessage.sender?.fullName || '').split(' ')[0]}: ` : '';
    const [rowHov, setRowHov] = React.useState(false);
    const startLongPress = () => { convLongPressTimer.current = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(40); setConvMobileSheet(conv._id); }, 500); };
    const cancelLongPress = () => { if (convLongPressTimer.current) { clearTimeout(convLongPressTimer.current); convLongPressTimer.current = null; } };
    return (
      <div className={cn('ss4-conv flex items-center gap-2.5 px-3 py-2', isAct && 'ss4-conv-active', isUnread && 'bg-blue-500/5')}
        style={{ cursor: 'pointer', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        onClick={() => setActiveId(conv._id)}
        onContextMenu={e => e.preventDefault()}
        onMouseEnter={() => setRowHov(true)} onMouseLeave={() => setRowHov(false)}
        onTouchStart={startLongPress} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}>
        <div className="relative shrink-0">
          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center overflow-hidden', conv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(cName))}>
            {conv.type === 'group' ? <GroupAvatarFace src={cAvatar} name={cName} size={11} /> : cAvatar ? <img src={resolveImageUrl(cAvatar)} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 10 }}>{ini(cName)}</span>}
          </div>
          {conv.type === 'direct' && online ? <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />
            : isUnread ? <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--sidebar-bg)' }} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {pinned && <Pin className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} />}
            <p className={cn('ss4-conv-name font-semibold truncate flex-1', isUnread && 'font-bold')} style={{ fontSize: 12.5 }}>{cName}</p>
            {!rowHov && <span className="shrink-0" style={{ fontSize: 9.5, color: 'var(--text-disabled)' }}>{fmtRelative(conv.lastMessageAt || conv.lastMessage?.createdAt)}</span>}
          </div>
          <p className="ss4-conv-preview truncate mt-0.5" style={{ fontSize: 11, fontWeight: isUnread ? 600 : 400, color: isUnread ? 'var(--foreground)' : undefined }}>{senderPrefix}{lastPreview}</p>
        </div>
        {!compact && (
          <div className="hidden md:flex items-center shrink-0 transition-opacity" style={{ opacity: isAct || rowHov ? 1 : 0 }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button onClick={e => e.stopPropagation()} className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors hover:bg-(--bg-hover)" style={{ color: 'var(--text-tertiary)' }}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="min-w-[168px] rounded-xl p-1" onClick={e => e.stopPropagation()}
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'rgba(255,255,255,0.85)' }} onClick={() => togglePinConv(conv)}>
                  {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'rgba(255,255,255,0.85)' }} onClick={() => toggleArchiveConv(conv)}>
                  {archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />} {archived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'rgba(255,255,255,0.85)' }} onClick={() => { handleStartCall(conv); setActiveId(conv._id); }}>
                  <Phone className="h-3.5 w-3.5" /> Call
                </DropdownMenuItem>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 4px' }} />
                <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: '#f87171' }} onClick={() => setDeleteConfirmConv(conv)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {compact && (
          <button onClick={e => { e.stopPropagation(); toggleArchiveConv(conv); }} className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ color: 'var(--text-tertiary)' }} title="Unarchive"><ArchiveRestore className="h-3 w-3" /></button>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className={cn('ss4 flex items-center justify-center h-full min-h-screen')} data-theme={theme}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 ss4-logo-mark flex items-center justify-center"><Radio className="h-6 w-6" style={{ color: '#fff' }} /></div>
        <div className="flex flex-col items-center gap-2">
          <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Suprah <span style={{ color: '#E55A00' }}>Space</span></p>
          <div className="flex gap-1.5">{[0, 1, 2].map(i => <span key={i} className="ss4-typing-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('ss4 absolute inset-0 flex flex-col overflow-hidden')} data-theme={theme}>
      {/* Topbar */}
      <header className={cn('ss4-topbar shrink-0 z-40', activeId ? 'hidden lg:block' : '')} style={{ minHeight: 52 }}>
        <div className="flex items-center justify-between h-full px-3 sm:px-4 py-2.5">
          <div className="flex items-center gap-3">
            {!embedded && (<><button onClick={() => router.push('/crm/dashboard')} className="ss4-icon-btn h-8 w-8"><ArrowLeft className="h-4 w-4" /></button><div className="h-5 w-px" style={{ background: 'var(--border-2)' }} /></>)}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 ss4-logo-mark flex items-center justify-center shrink-0"><Radio className="h-3.5 w-3.5" style={{ color: '#fff' }} /></div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <p className="ss4-display font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Suprah <span style={{ color: '#E55A00' }}>Space</span></p>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: isConnected ? 'var(--positive)' : 'var(--text-disabled)', boxShadow: isConnected ? '0 0 6px rgba(52,201,125,0.7)' : 'none' }} />
                  {isConnected && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--positive)', letterSpacing: '0.06em' }}>Live</span>}
                </div>
                <p className="leading-none mt-0.5 font-medium" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Team Messaging</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveUsersOpen(true)} className="ss4-video-btn h-8 px-3 flex items-center gap-1.5" title="Active users">
              <Wifi className="h-3.5 w-3.5" />
              <span className="font-semibold hidden sm:inline" style={{ fontSize: 11 }}>{allUsers.filter(u => u._id !== uid && presence[u._id] === 'online').length} active</span>
            </button>
            <button onClick={toggleTheme} className="ss4-theme-btn h-8 w-8 flex items-center justify-center" title="Toggle theme">{theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}</button>
            <button className="ss4-icon-btn h-8 w-8" title="Notifications"><Bell className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={cn('ss4-sidebar flex flex-col transition-transform duration-300 ease-in-out overflow-hidden', 'absolute inset-0 z-20', 'lg:relative lg:inset-auto lg:z-auto lg:w-72 lg:shrink-0 lg:translate-x-0', activeId ? '-translate-x-full' : 'translate-x-0')}>
          <div className="px-4 pt-5 pb-3 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="ss4-section-label">Messages</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowModal({ open: true, tab: 'dm' })} className="ss4-new-btn h-7 px-2.5 flex items-center gap-1.5" title="New message"><Plus className="h-3 w-3" /><span className="font-semibold" style={{ fontSize: 11 }}>New</span></button>
                <button onClick={() => setShowModal({ open: true, tab: 'group' })} className="ss4-pill-btn h-7 w-7 flex items-center justify-center" title="New channel"><Hash className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="relative">
              <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chats & messages…" className="w-full h-9 rounded-lg pl-9 pr-3 text-xs ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
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
                    <button key={m._id} onClick={() => openSearchResult(c?._id || c, m._id)} className="ss4-conv w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left">
                      <span className="font-semibold truncate w-full" style={{ fontSize: 11.5, color: 'var(--accent-text)' }}>{cName} · {m.sender?.fullName}</span>
                      <span className="truncate w-full" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.content}</span>
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
                <div className="px-2 space-y-0.5">{pinnedList.map(c => <ConvRow key={c._id} conv={c} />)}</div>
              </div>
            )}

            {(['direct', 'group'] as const).map(sectionType => {
              const list = normalList.filter(c => c.type === sectionType);
              if (list.length === 0) return null;
              return (
                <div key={sectionType}>
                  <div className="px-3 pt-3 pb-1.5"><span className="ss4-section-label">{sectionType === 'direct' ? 'Direct Messages' : 'Channels'}</span></div>
                  <div className="px-2 space-y-0.5">{list.map(c => <ConvRow key={c._id} conv={c} />)}</div>
                </div>
              );
            })}

            {normalList.length === 0 && pinnedList.length === 0 && q.trim().length < 2 && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 px-3">
                <div className="h-10 w-10 rounded-xl ss4-empty-icon flex items-center justify-center"><MessageSquare className="h-4 w-4" style={{ color: 'var(--accent)' }} /></div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No conversations yet</p>
              </div>
            )}

            {archivedList.length > 0 && (
              <div className="pt-3">
                <button onClick={() => setShowArchived(v => !v)} className="w-full px-3 pt-2 pb-1.5 flex items-center justify-between">
                  <span className="ss4-section-label"><Archive className="h-2.5 w-2.5 mr-1" /> Archived · {archivedList.length}</span>
                  <ChevronLeft className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)', transform: showArchived ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
                </button>
                {showArchived && <div className="px-2 space-y-0.5">{archivedList.map(c => <ConvRow key={c._id} conv={c} compact />)}</div>}
              </div>
            )}
          </div>
        </aside>

        {/* Chat */}
        <main className={cn('flex flex-col min-h-0 overflow-hidden', 'absolute inset-0 z-10 transition-transform duration-300 ease-in-out', 'lg:relative lg:inset-auto lg:z-auto lg:flex-1 lg:translate-x-0', !activeId ? 'translate-x-full' : 'translate-x-0')} style={themeStyle}>
          <div className="flex-1 flex min-h-0 flex-col overflow-hidden min-w-0" style={{ background: 'var(--bg-base)' }}>
            {!activeId && (
              <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-4" style={{ background: 'var(--bg-base)' }}>
                <div className="h-16 w-16 ss4-logo-mark flex items-center justify-center"><MessageSquare className="h-7 w-7" style={{ color: '#fff' }} /></div>
                <div className="text-center">
                  <p className="ss4-display font-bold" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Suprah <span style={{ color: '#E55A00' }}>Space</span></p>
                  <p className="mt-1" style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Select a conversation to start messaging</p>
                </div>
              </div>
            )}

            {activeId && activeConv && (
              <>
                {/* Chat header */}
                <div className="ss4-chat-header shrink-0 flex items-center gap-2.5 px-3 sm:px-4 py-3">
                  <button className="lg:hidden ss4-icon-btn h-8 w-8" onClick={() => { setActiveId(null); setShowInfo(false); }}><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setShowInfo(true)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <div className="relative shrink-0">
                      <div className={cn('h-9 w-9 rounded-full flex items-center justify-center overflow-hidden', activeConv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(getConvName(activeConv, uid)))}>
                        {activeConv.type === 'group' ? <GroupAvatarFace src={resolveImageUrl(getConvAvatar(activeConv, uid))} name={getConvName(activeConv, uid)} size={12} /> : getConvAvatar(activeConv, uid) ? <img src={resolveImageUrl(getConvAvatar(activeConv, uid))} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(getConvName(activeConv, uid))}</span>}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="ss4-display font-bold leading-none truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{getConvName(activeConv, uid)}</p>
                      <p className="mt-1 leading-none" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {activeConv.type === 'group' ? `${activeConv.members.length} members` : (() => { const o = activeConv.members.find(m => m._id !== uid); return o && presence[o._id] === 'online' ? <span style={{ color: 'var(--positive)' }}>● Active now</span> : 'Offline'; })()}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="ss4-video-btn h-8 px-3 flex items-center gap-1.5" title="Start a call"><Phone className="h-3.5 w-3.5" /><span className="font-semibold hidden sm:inline" style={{ fontSize: 11 }}>Call</span></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-2)' }}>
                        <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => handleStartCall(activeConv)}><Video className="h-3.5 w-3.5" /> Video Call</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }} onClick={() => handleStartCall(activeConv)}><Phone className="h-3.5 w-3.5" /> Voice Call</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button onClick={() => setShowInfo(v => !v)} className={cn('ss4-icon-btn h-8 w-8', showInfo && 'ss4-video-btn')} title="Details"><Info className="h-4 w-4" /></button>
                  </div>
                </div>

                {/* Active call banner */}
                {call.liveCalls[activeId] && !activeMeeting && (
                  <CallBanner call={call.liveCalls[activeId]} onJoin={() => handleJoinCall(call.liveCalls[activeId].meetingId)} />
                )}

                {/* Pinned message banner */}
                {(() => {
                  const pinnedMsgs = activeMsgs.filter(m => pinnedMsgIds.has(m._id) && !m.isDeleted);
                  if (pinnedMsgs.length === 0) return null;
                  const latest = pinnedMsgs[pinnedMsgs.length - 1];
                  return (
                    <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 transition-colors"
                      style={{ background: 'var(--accent-muted)', borderBottom: '1px solid var(--border-1)' }}>
                      <Pin className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <div className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => document.getElementById(`ss4-msg-${latest._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                        <p className="font-semibold" style={{ fontSize: 10, color: 'var(--accent-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pinned Message{pinnedMsgs.length > 1 ? ' (' + pinnedMsgs.length + ')' : ''}</p>
                        <p className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{latest.sender.fullName}: {latest.content || String.fromCodePoint(128206)+' Attachment'}</p>
                      </div>
                      <button onClick={() => handlePinToggle(latest._id)} className="ss4-icon-btn h-6 w-6 shrink-0" title="Unpin"><X className="h-3 w-3" /></button>
                    </div>
                  );
                })()}

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-1.5 ss4-scroll" style={wallpaper ? { backgroundImage: wallpaper } : undefined}>
                  {hasMore[activeId] && (
                    <div className="flex justify-center pb-3">
                      <button onClick={loadMore} className="font-medium px-4 py-1.5 rounded-full" style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-hover)' }}>{loadingMsgs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '↑ Load earlier messages'}</button>
                    </div>
                  )}
                  {loadingMsgs && activeMsgs.length === 0 && <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} /></div>}
                  {activeMsgs.map((msg, i) => {
                    const prevMsg = activeMsgs[i - 1] || null;
                    const nextMsg = activeMsgs[i + 1] || null;
                    const showDate = !prevMsg || fmtDate(msg.createdAt) !== fmtDate(prevMsg.createdAt);
                    const showAvatar = !prevMsg || prevMsg.sender._id !== msg.sender._id || showDate;
                    const hideTime = !!(nextMsg
                      && nextMsg.sender._id === msg.sender._id
                      && fmtDate(nextMsg.createdAt) === fmtDate(msg.createdAt)
                      && new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000
                    );
                    return (
                      <React.Fragment key={msg._id}>
                        {showDate && <DateSep date={msg.createdAt} />}
                        <div id={`ss4-msg-${msg._id}`}>
                          <Bubble message={msg} isOwn={msg.sender._id === uid} showAvatar={showAvatar} uid={uid} onReply={setReplyTo} onDelete={handleDelete} onPin={handlePinToggle} isPinned={pinnedMsgIds.has(msg._id)} onOpenMedia={setLightbox} onReact={handleReact} onVotePoll={handleVotePoll} onRsvp={handleRsvp} nameFor={nameFor} members={msgSeenByMembers[msg._id] || []} hideTime={hideTime} onEditSave={handleEdit} />
                        </div>
                        {pinEvents.find(e => e.msgId === msg._id) && (() => {
                          const ev = pinEvents.find(e => e.msgId === msg._id)!;
                          return (
                            <div className="flex items-center justify-center px-4 py-1.5 my-0.5">
                              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-1)' }}>
                                <span style={{ fontSize: 14 }}>⭐</span>
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
                    <div className="flex gap-2.5 px-5 py-1">
                      <div className="w-8" />
                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bubble-other-bg)', border: '1px solid var(--bubble-other-border)' }}>
                        <span className="italic" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{typers.map(t => t.fullName).join(', ')} {typers.length === 1 ? 'is' : 'are'} typing</span>
                        <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="ss4-typing-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />)}</div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 px-3 sm:px-4 pb-24 md:pb-2 pt-2 space-y-1.5">
                  {replyTo && (
                    <div className="ss4-reply-bar flex items-center gap-2 px-3 py-2.5">
                      <Reply className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <div className="min-w-0 flex-1"><p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{replyTo.sender.fullName}</p><p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{replyTo.content || '📎 Attachment'}</p></div>
                      <button onClick={() => setReplyTo(null)} className="ss4-icon-btn p-1 h-6 w-6"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {pendingFiles.length > 0 && (
                    <div className="ss4-reply-bar flex flex-col gap-2 px-3 py-2.5">
                      <div className="flex items-center justify-between"><p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{pendingFiles.length} attachment{pendingFiles.length === 1 ? '' : 's'} ready</p><button onClick={() => setPendingFiles([])} className="ss4-icon-btn h-6 px-2" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Clear all</button></div>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{pendingFiles.map((file, index) => <FilePreviewItem key={`${file.name}-${index}`} file={file} onRemove={() => removePendingFile(index)} />)}</div>
                    </div>
                  )}

                  {isReportGroup ? (
                    <div className="ss4-input-wrap flex items-center justify-center gap-2 px-4 py-3" style={{ minHeight: 56 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>Read-only · DayPulse reports are posted here automatically</span>
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
                                idx === mentionIdx ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--bg-hover)]'
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
                      <div className="flex items-end gap-2 px-3.5 pt-3 pb-2">
                        <textarea ref={textareaRef} value={input} onChange={handleTyping} onKeyDown={e => {
                          if (mentionQuery !== null && mentionOptions.length > 0) {
                            if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionOptions.length - 1)); return; }
                            if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
                            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mentionIdx].name); return; }
                            if (e.key === 'Escape') { setMentionQuery(null); setMentionAnchor(-1); return; }
                          }
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                        }} onBlur={() => setTimeout(() => { setMentionQuery(null); setMentionAnchor(-1); }, 150)} placeholder="Message..." rows={1} className="flex-1 resize-none bg-transparent text-sm focus:outline-none max-h-36 min-h-7 py-0.5" style={{ fontFamily: 'Geist, sans-serif', lineHeight: '1.55', color: 'var(--text-primary)', caretColor: 'var(--accent)' }} />
                      </div>
                      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                        <div className="flex items-center gap-0.5">
                          <input ref={fileRef} type="file" multiple hidden onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
                          <button onClick={() => fileRef.current?.click()} className="ss4-icon-btn h-8 w-8" title="Attach files"><Paperclip className="h-4 w-4" /></button>
                          <button onClick={startRecording} className="ss4-icon-btn h-8 w-8" title="Voice message"><Mic className="h-4 w-4" /></button>
                          <div ref={gifRef} className="relative">
                            <button onClick={() => setGifOpen(v => !v)} className="ss4-icon-btn h-8 w-8" title="GIF"><Film className="h-4 w-4" /></button>
                            {gifOpen && <GifPicker onPick={sendGif} onClose={() => setGifOpen(false)} />}
                          </div>
                          <div ref={emojiRef} className="relative">
                            <button onClick={() => setEmojiOpen(v => !v)} className="ss4-icon-btn h-8 w-8" title="Emoji"><Smile className="h-4 w-4" /></button>
                            {emojiOpen && (
                              <div className="absolute bottom-full left-0 mb-2 z-50">
                                <EmojiPicker onEmojiClick={(d: EmojiClickData) => { setInput(prev => prev + d.emoji); setEmojiOpen(false); }} theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT} width={300} height={380} searchDisabled={false} skinTonesDisabled lazyLoadEmojis />
                              </div>
                            )}
                          </div>
                          <div ref={createMenuRef} className="relative">
                            <button onClick={() => setCreateMenuOpen(v => !v)} className="ss4-icon-btn h-8 w-8" title="Poll or event"><Plus className="h-4 w-4" /></button>
                            {createMenuOpen && (
                              <div className="absolute bottom-full left-0 mb-2 z-50 rounded-xl overflow-hidden py-1" style={{ width: 160, background: 'var(--bg-elevated)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)' }}>
                                <button onClick={() => { setCreateMenuOpen(false); setPollOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><BarChart3 className="h-3.5 w-3.5" /> Create Poll</button>
                                <button onClick={() => { setCreateMenuOpen(false); setEventOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--bg-hover)" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><CalendarPlus className="h-3.5 w-3.5" /> Create Event</button>
                              </div>
                            )}
                          </div>
                          <div ref={autrixRef} className="relative">
                            <button onClick={() => setAutrixOpen(v => !v)} className="ss4-ai-btn h-8 px-2.5 flex items-center gap-1.5" title="Suprah Autrix">
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
                        </div>
                        <button onClick={handleSend} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="ss4-send-btn h-8 w-8 flex items-center justify-center shrink-0">
                          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadNotice && (
                    <p className="px-1" style={{ fontSize: 11, color: uploadNotice.kind === 'error' ? 'var(--danger)' : uploadNotice.kind === 'success' ? 'var(--positive)' : 'var(--text-tertiary)' }}>{uploadNotice.text}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Details / Info full-takeover panel */}
          {showInfo && activeId && activeConv && (() => {
            const cName = getConvName(activeConv, uid);
            const cAvatar = getConvAvatar(activeConv, uid);
            const mediaMsgs = activeMsgs.filter(m => m.attachments.some(a => a.mimeType.startsWith('image/') || isVideoAttachment(a)));
            const fileMsgs = activeMsgs.filter(m => m.attachments.some(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/') && !isVideoAttachment(a)));
            const pinnedMsgs = activeMsgs.filter(m => pinnedMsgIds.has(m._id));
            return (
              <div className="absolute inset-0 z-30 flex flex-col" style={{ background: 'var(--bg-elevated)' }}>
                <div className="ss4-chat-header shrink-0 flex items-center gap-2.5 px-4 py-3">
                  <button onClick={() => setShowInfo(false)} className="ss4-icon-btn h-8 w-8"><ChevronLeft className="h-4 w-4" /></button>
                  <p className="ss4-display font-bold flex-1" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Details</p>
                  <button onClick={() => setShowInfo(false)} className="ss4-icon-btn h-8 w-8"><X className="h-4 w-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto ss4-scroll">
                  {/* Header card */}
                  <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4">
                    <div className="relative">
                      <div className={cn('h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden', activeConv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(cName))}>
                        {activeConv.type === 'group' ? <GroupAvatarFace src={cAvatar} name={cName} size={28} /> : cAvatar ? <img src={resolveImageUrl(cAvatar)} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold" style={{ fontSize: 26 }}>{ini(cName)}</span>}
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
                        <input autoFocus value={gcNameInput} onChange={e => setGcNameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { renameChannel(gcNameInput); setEditingGcName(false); } }} className="flex-1 h-8 rounded-lg px-3 text-sm ss4-search-input text-center" />
                        <button onClick={() => { renameChannel(gcNameInput); setEditingGcName(false); }} className="ss4-send-btn h-8 w-8 flex items-center justify-center"><CheckIcon className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="ss4-display font-bold text-center" style={{ fontSize: 18, color: 'var(--text-primary)' }}>{cName}</p>
                        {activeConv.type === 'group' && isAdmin && <button onClick={() => { setGcNameInput(cName); setEditingGcName(true); }} className="ss4-icon-btn h-6 w-6"><Pencil className="h-3 w-3" /></button>}
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

                  {/* Tabs */}
                  <div className="px-4">
                    <div className="ss4-tab-bar flex gap-1">
                      {(['members', 'media', 'files', 'pinned'] as const).map(t => (
                        <button key={t} onClick={() => setInfoTab(t)} className={cn('flex-1 h-7 ss4-tab capitalize', t === infoTab && 'ss4-tab-active')}>{t}</button>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    {infoTab === 'members' && (
                      <div className="space-y-0.5">
                        {activeConv.members.map(m => {
                          const isOnline = presence[m._id] === 'online';
                          const memberIsAdmin = (activeConv.admins || []).map(String).includes(m._id);
                          return (
                            <div key={m._id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-(--bg-hover)">
                              <button onClick={e => setMemberCard({ member: m, pos: { x: e.clientX, y: e.clientY } })} className="relative shrink-0">
                                <div className={cn('h-9 w-9 rounded-full flex items-center justify-center overflow-hidden', getAvaColor(m.fullName))}>
                                  {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold" style={{ fontSize: 12 }}>{ini(m.fullName)}</span>}
                                </div>
                                {isOnline && <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />}
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
                      mediaMsgs.length === 0
                        ? <p className="text-center py-8" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No media yet</p>
                        : <div className="grid grid-cols-3 gap-1.5">
                            {mediaMsgs.flatMap(m => m.attachments.filter(a => a.mimeType.startsWith('image/') || isVideoAttachment(a)).map((a, i) => {
                              const isVid = isVideoAttachment(a);
                              return (
                                <button key={`${m._id}-${i}`} onClick={() => setLightbox({ src: a.url, type: isVid ? 'video' : 'image', name: a.originalName })} className="aspect-square rounded-lg overflow-hidden relative" style={{ background: 'var(--bg-hover)' }}>
                                  {isVid ? <><video src={a.url} className="w-full h-full object-cover" muted /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="h-5 w-5" style={{ color: '#fff' }} /></div></> : <img src={a.thumbnailUrl || a.url} alt={a.originalName} className="w-full h-full object-cover" />}
                                </button>
                              );
                            }))}
                          </div>
                    )}

                    {infoTab === 'files' && (
                      fileMsgs.length === 0
                        ? <p className="text-center py-8" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No files yet</p>
                        : <div className="space-y-1.5">
                            {fileMsgs.flatMap(m => m.attachments.filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/') && !isVideoAttachment(a)).map((a, i) => (
                              <a key={`${m._id}-${i}`} href={a.url} download={a.originalName} className="flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline ss4-file-other">
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}><FileText className="h-4 w-4" style={{ color: 'var(--accent)' }} /></div>
                                <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.originalName}</p><p className="ss4-mono mt-0.5" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtSize(a.size)}</p></div>
                                <Download className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                              </a>
                            )))}
                          </div>
                    )}

                    {infoTab === 'pinned' && (
                      pinnedMsgs.length === 0
                        ? <p className="text-center py-8" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No pinned messages</p>
                        : <div className="space-y-2">
                            {pinnedMsgs.map(m => (
                              <button key={m._id} onClick={() => { setShowInfo(false); setTimeout(() => document.getElementById(`ss4-msg-${m._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200); }} className="w-full text-left rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                                <p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{m.sender.fullName}</p>
                                <p className="truncate mt-0.5" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.content || '📎 Attachment'}</p>
                              </button>
                            ))}
                          </div>
                    )}
                  </div>

                  {/* Danger zone */}
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

      {/* ── Modals ── */}
      {showModal.open && (
        <NewConvModal users={allUsers.filter(u => u._id !== uid)} defaultTab={showModal.tab} onClose={() => setShowModal({ open: false, tab: 'dm' })} onStartDM={handleDM} onCreateGroup={handleGroup} />
      )}

      {/* Incoming call + in-call experience (replaces the old VideoCallModal) */}
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
          email={(me as any)?.email}
          avatarUrl={me?.avatar}
          onClose={handleLeaveCall}
        />
      )}

      {manageOpen && activeConv && (
        <ManageMembersModal users={allUsers} existingIds={activeConv.members.map(m => m._id)} onClose={() => setManageOpen(false)} onAdd={addMembers} />
      )}
      {themeOpen && activeConv && (
        <ThemeModal current={activeConv.theme} onClose={() => setThemeOpen(false)} onApply={applyTheme} />
      )}
      {pollOpen && <PollModal onClose={() => setPollOpen(false)} onCreate={createPoll} />}
      {eventOpen && <EventModal onClose={() => setEventOpen(false)} onCreate={createEvent} />}
      {activeUsersOpen && (
        <ActiveUsersModal users={allUsers} presence={presence} uid={uid} onClose={() => setActiveUsersOpen(false)} />
      )}
      {summarizeOpen && activeId && (
        <SummarizeModal token={token} conversationId={activeId} onClose={() => setSummarizeOpen(false)} />
      )}

      {/* Member mini-card */}
      {memberCard && (() => {
        const m = memberCard.member;
        const isOnline = presence[m._id] === 'online';
        return (
          <div className="ss4-overlay fixed inset-0 z-100 flex items-center justify-center p-4" onClick={() => setMemberCard(null)}>
            <div id="ss4-member-card" className="ss4-modal w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4">
                <div className="relative">
                  <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden', getAvaColor(m.fullName))}>
                    {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold" style={{ fontSize: 22 }}>{ini(m.fullName)}</span>}
                  </div>
                  {isOnline && <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full" />}
                </div>
                <div className="text-center">
                  <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{m.fullName}</p>
                  <p style={{ fontSize: 11, color: isOnline ? 'var(--positive)' : 'var(--text-tertiary)' }}>{isOnline ? '● Active now' : 'Offline'}</p>
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

      {/* Mobile long-press bottom sheet */}
      {convMobileSheet && (() => {
        const sheetConv = convos.find(c => c._id === convMobileSheet);
        if (!sheetConv) return null;
        const pinned = isPinnedConv(sheetConv);
        const archived = isArchivedConv(sheetConv);
        const cName = getConvName(sheetConv, uid);
        const sheetActions: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }[] = [
          { icon: pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />, label: pinned ? 'Unpin' : 'Pin', onClick: () => { togglePinConv(sheetConv); setConvMobileSheet(null); } },
          { icon: archived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />, label: archived ? 'Unarchive' : 'Archive', onClick: () => { toggleArchiveConv(sheetConv); setConvMobileSheet(null); } },
          { icon: <Phone className="h-5 w-5" />, label: 'Call', onClick: () => { handleStartCall(sheetConv); setActiveId(sheetConv._id); setConvMobileSheet(null); } },
          { icon: <Trash2 className="h-5 w-5" />, label: 'Delete conversation', danger: true, onClick: () => { setConvMobileSheet(null); setDeleteConfirmConv(sheetConv); } },
        ];
        return (
          <div className="ss4-overlay fixed inset-0 z-[200] flex items-end" onClick={() => setConvMobileSheet(null)}>
            <div className="w-full rounded-t-2xl pb-safe" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface-2,#1c1d20)', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-2,rgba(255,255,255,0.15))' }} />
              </div>
              <p className="text-center font-semibold px-4 pt-1 pb-3 truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{cName}</p>
              <div style={{ height: 1, background: 'var(--border-2,rgba(255,255,255,0.1))', margin: '0 16px 4px' }} />
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

      {/* Delete conversation confirmation */}
      {deleteConfirmConv && (
        <div className="ss4-overlay fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={() => setDeleteConfirmConv(null)}>
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
  );
}