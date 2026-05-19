'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Users, MessageSquare, Send, Paperclip,
  X, ChevronLeft, MoreVertical, Download, FileText,
  Loader2, CheckCheck, Hash, Reply, Trash2,
  ArrowLeft, Radio, Bot, Video, Phone, PhoneOff,
  Mic, MicOff, VideoOff, Sun, Moon, Sparkles,
  Bell, Smile, Pin, Info, ImageIcon,
  Pencil, Check as CheckIcon,
} from 'lucide-react';
import EmojiPicker, { Theme as EmojiTheme, EmojiClickData } from 'emoji-picker-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { useSupraSpaceSocket, SSConversation, SSMessage } from '@/hooks/useSupraSpaceSocket';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { JitsiMeet } from './JitsiMeet';

const SS4_MAX_UPLOAD_FILES = 5;
const SS4_MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const SS4_MAX_VIDEO_UPLOAD_SIZE_BYTES = 40 * 1024 * 1024;
const SS4_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.mpeg', '.mpg', '.ogv',
]);

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
    /* ── Token System ──────────────────────────────────── */
    .ss4[data-theme="dark"] {
      --bg-base:       #0e0f11;
      --bg-elevated:   #141618;
      --bg-overlay:    #1a1d21;
      --bg-hover:      rgba(255,255,255,0.04);
      --bg-active:     rgba(255,255,255,0.07);
      --bg-subtle:     rgba(255,255,255,0.03);

      --surface-1:     #1e2126;
      --surface-2:     #252a31;
      --surface-3:     #2d3340;

      --border-1:      rgba(255,255,255,0.06);
      --border-2:      rgba(255,255,255,0.10);
      --border-3:      rgba(255,255,255,0.14);

      --accent:        #5b7cf6;
      --accent-muted:  rgba(91,124,246,0.15);
      --accent-hover:  #6b8cf8;
      --accent-text:   #a5b8ff;

      --positive:      #34c97d;
      --positive-muted:rgba(52,201,125,0.12);
      --warning:       #f0a855;
      --danger:        #f05c5c;
      --danger-muted:  rgba(240,92,92,0.12);

      --text-primary:  rgba(255,255,255,0.92);
      --text-secondary:rgba(255,255,255,0.52);
      --text-tertiary: rgba(255,255,255,0.28);
      --text-disabled: rgba(255,255,255,0.16);

      --bubble-own-bg: linear-gradient(145deg, #4a6cf0, #5b7cf6);
      --bubble-own-shadow: 0 4px 20px rgba(91,124,246,0.25);
      --bubble-other-bg: var(--surface-2);
      --bubble-other-border: var(--border-2);

      --sidebar-bg:    #111316;
      --sidebar-border:rgba(255,255,255,0.055);

      --input-bg:      var(--surface-1);
      --input-border:  var(--border-2);
      --input-focus:   rgba(91,124,246,0.35);

      --scrollbar:     rgba(255,255,255,0.07);
      --shadow-sm:     0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
      --shadow-md:     0 4px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3);
      --shadow-lg:     0 20px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4);
    }

    .ss4[data-theme="light"] {
      --bg-base:       #f4f5f7;
      --bg-elevated:   #ffffff;
      --bg-overlay:    #f9fafb;
      --bg-hover:      rgba(0,0,0,0.03);
      --bg-active:     rgba(91,124,246,0.08);
      --bg-subtle:     rgba(0,0,0,0.02);

      --surface-1:     #ffffff;
      --surface-2:     #f4f5f7;
      --surface-3:     #eaecf0;

      --border-1:      rgba(0,0,0,0.06);
      --border-2:      rgba(0,0,0,0.09);
      --border-3:      rgba(0,0,0,0.14);

      --accent:        #4a6cf0;
      --accent-muted:  rgba(74,108,240,0.1);
      --accent-hover:  #3a5ce0;
      --accent-text:   #4a6cf0;

      --positive:      #22b060;
      --positive-muted:rgba(34,176,96,0.1);
      --warning:       #e0922a;
      --danger:        #dc3545;
      --danger-muted:  rgba(220,53,69,0.08);

      --text-primary:  rgba(0,0,0,0.87);
      --text-secondary:rgba(0,0,0,0.50);
      --text-tertiary: rgba(0,0,0,0.32);
      --text-disabled: rgba(0,0,0,0.20);

      --bubble-own-bg: linear-gradient(145deg, #4a6cf0, #5b7cf6);
      --bubble-own-shadow: 0 3px 14px rgba(74,108,240,0.22);
      --bubble-other-bg: #ffffff;
      --bubble-other-border: rgba(0,0,0,0.09);

      --sidebar-bg:    #ffffff;
      --sidebar-border:rgba(0,0,0,0.08);

      --input-bg:      #ffffff;
      --input-border:  rgba(0,0,0,0.1);
      --input-focus:   rgba(74,108,240,0.3);

      --scrollbar:     rgba(0,0,0,0.1);
      --shadow-sm:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
      --shadow-md:     0 4px 16px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06);
      --shadow-lg:     0 20px 60px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1);
    }

    /* ── Base ──────────────────────────────────────────── */
    .ss4 {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .ss4-display { font-family: 'Cabinet Grotesk', sans-serif; }
    .ss4-mono { font-family: 'Geist Mono', monospace; }

    /* ── Topbar ────────────────────────────────────────── */
    .ss4-topbar {
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-1);
    }

    /* ── Sidebar ───────────────────────────────────────── */
    .ss4-sidebar {
      background: var(--sidebar-bg);
      border-right: 1px solid var(--sidebar-border);
    }

    /* ── Conversation Items ─────────────────────────────── */
    .ss4-conv {
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      position: relative;
    }
    .ss4-conv:hover {
      background: var(--bg-hover);
    }
    .ss4-conv-active {
      background: rgba(91,124,246,0.18) !important;
    }
    .ss4-conv-name { color: var(--text-primary); }
    .ss4-conv-preview { color: var(--text-secondary); }
    .ss4-conv-active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 60%;
      width: 3px;
      background: var(--accent);
      border-radius: 0 3px 3px 0;
    }

    /* ── Search Input ───────────────────────────────────── */
    .ss4-search-input {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      color: var(--text-primary);
      border-radius: 8px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ss4-search-input::placeholder { color: var(--text-tertiary); }
    .ss4-search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--input-focus);
    }
    .ss4-search-icon { color: var(--text-tertiary); }

    /* ── Chat Header ────────────────────────────────────── */
    .ss4-chat-header {
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-1);
    }

    /* ── Message Bubbles ────────────────────────────────── */
    .ss4-bubble-own {
      background: var(--bubble-own-bg);
      box-shadow: var(--bubble-own-shadow);
      color: #fff;
      border-radius: 18px 18px 4px 18px;
    }
    .ss4-bubble-other {
      background: var(--bubble-other-bg);
      border: 1px solid var(--bubble-other-border);
      color: var(--text-primary);
      border-radius: 18px 18px 18px 4px;
      box-shadow: var(--shadow-sm);
    }
    .ss4-msg-column {
      width: fit-content;
      max-width: min(68%, 42rem);
    }
    .ss4-msg-bubble {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }
    .ss4-attachment-item {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    .ss4-attachment-media {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      object-fit: cover;
    }
    .ss4-attachment-video {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
    }

    /* ── Input area ─────────────────────────────────────── */
    .ss4-input-wrap {
      background: var(--input-bg);
      border: 1.5px solid var(--input-border);
      border-radius: 14px;
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .ss4-input-wrap:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--input-focus);
    }

    /* ── Send Button ────────────────────────────────────── */
    .ss4-send-btn {
      background: var(--accent);
      color: #fff;
      border-radius: 10px;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px rgba(91,124,246,0.3);
    }
    .ss4-send-btn:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(91,124,246,0.4);
    }
    .ss4-send-btn:disabled {
      background: var(--surface-2);
      box-shadow: none;
      cursor: not-allowed;
    }

    /* ── Icon Buttons ───────────────────────────────────── */
    .ss4-icon-btn {
      border-radius: 8px;
      color: var(--text-tertiary);
      transition: all 0.15s ease;
      display: flex; align-items: center; justify-content: center;
    }
    .ss4-icon-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    /* ── Pill Buttons ───────────────────────────────────── */
    .ss4-pill-btn {
      border-radius: 8px;
      border: 1px solid var(--border-2);
      background: var(--bg-hover);
      color: var(--text-secondary);
      transition: all 0.15s ease;
    }
    .ss4-pill-btn:hover {
      background: var(--bg-active);
      border-color: var(--border-3);
      color: var(--text-primary);
    }

    /* ── Video Button ───────────────────────────────────── */
    .ss4-video-btn {
      background: rgba(91,124,246,0.1);
      border: 1px solid rgba(91,124,246,0.2);
      color: var(--accent-text);
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .ss4-video-btn:hover {
      background: rgba(91,124,246,0.18);
      border-color: rgba(91,124,246,0.35);
    }

    /* ── AI Button ──────────────────────────────────────── */
    .ss4-ai-btn {
      background: linear-gradient(135deg, rgba(120,80,220,0.12), rgba(91,124,246,0.08));
      border: 1px solid rgba(150,100,240,0.2);
      color: #b49dff;
      border-radius: 8px;
      transition: all 0.15s ease;
      position: relative;
      overflow: hidden;
    }
    .ss4-ai-btn:hover {
      border-color: rgba(150,100,240,0.4);
      box-shadow: 0 0 16px rgba(120,80,220,0.15);
    }
    @keyframes ss4-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .ss4-ai-text {
      background: linear-gradient(90deg, #b49dff 0%, #a5b8ff 40%, #c4a0ff 70%, #b49dff 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: ss4-shimmer 3s linear infinite;
    }

    /* ── Reply Bar ──────────────────────────────────────── */
    .ss4-reply-bar {
      background: var(--accent-muted);
      border: 1px solid rgba(91,124,246,0.2);
      border-left: 3px solid var(--accent);
      border-radius: 10px;
    }

    /* ── Modals / Overlays ──────────────────────────────── */
    .ss4-overlay {
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .ss4-modal {
      background: var(--bg-elevated);
      border: 1px solid var(--border-2);
      border-radius: 16px;
      box-shadow: var(--shadow-lg);
    }

    /* ── Avatar styles ──────────────────────────────────── */
    .ss4-ava-accent {
      background: linear-gradient(140deg, #3a5ce0, #5b7cf6);
    }
    .ss4-ava-purple {
      background: linear-gradient(140deg, #7038c0, #9b6fd6);
    }
    .ss4-ava-teal {
      background: linear-gradient(140deg, #0e7c6a, #22b060);
    }

    /* ── Online Dot ─────────────────────────────────────── */
    .ss4-online-dot {
      background: var(--positive);
      box-shadow: 0 0 0 2px var(--sidebar-bg), 0 0 6px rgba(52,201,125,0.6);
    }

    /* ── Typing Indicator ───────────────────────────────── */
    @keyframes ss4-dot-bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-4px); opacity: 1; }
    }
    .ss4-typing-dot {
      animation: ss4-dot-bounce 1.4s ease-in-out infinite;
    }

    /* ── Status badge ───────────────────────────────────── */
    .ss4-status-live {
      background: rgba(91,124,246,0.12);
      border: 1px solid rgba(91,124,246,0.2);
      color: var(--accent-text);
    }
    .ss4-status-offline {
      background: var(--bg-subtle);
      border: 1px solid var(--border-1);
      color: var(--text-tertiary);
    }

    /* ── Hover actions ──────────────────────────────────── */
    .ss4-msg-actions {
      background: var(--bg-elevated);
      border: 1px solid var(--border-2);
      border-radius: 10px;
      box-shadow: var(--shadow-md);
    }

    /* ── Section label ──────────────────────────────────── */
    .ss4-section-label {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-1);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-secondary);
      font-weight: 700;
    }

    /* ── Scrollbar ──────────────────────────────────────── */
    .ss4-scroll::-webkit-scrollbar { width: 4px; }
    .ss4-scroll::-webkit-scrollbar-track { background: transparent; }
    .ss4-scroll::-webkit-scrollbar-thumb {
      background: var(--scrollbar);
      border-radius: 4px;
    }

    /* ── Date separator ─────────────────────────────────── */
    .ss4-date-line {
      height: 1px;
      background: var(--border-1);
    }
    .ss4-date-chip {
      background: var(--surface-2);
      border: 1px solid var(--border-1);
      border-radius: 20px;
      color: var(--text-tertiary);
      font-size: 11px;
      padding: 3px 12px;
      white-space: nowrap;
    }

    /* ── Video Call ─────────────────────────────────────── */
    .ss4-vcall-modal {
      background: #0d1117;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
    }
    .ss4-vcall-screen {
      background: radial-gradient(ellipse at 50% 30%, #141e3a 0%, #0a0d14 100%);
      border-radius: 0;
      position: relative;
      overflow: hidden;
    }
    .ss4-vcall-screen::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 20%, rgba(91,124,246,0.06) 0%, transparent 60%);
      pointer-events: none;
    }
    .ss4-vcall-ctrl {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    .ss4-vcall-ctrl:hover {
      background: rgba(255,255,255,0.14);
    }
    .ss4-vcall-end {
      background: linear-gradient(145deg, #d93025, #e53e35);
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(217,48,37,0.4);
      transition: all 0.2s ease;
    }
    .ss4-vcall-end:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 28px rgba(217,48,37,0.5);
    }
    @keyframes ss4-call-ring {
      0%, 100% { box-shadow: 0 0 0 0 rgba(91,124,246,0.4); }
      50% { box-shadow: 0 0 0 12px rgba(91,124,246,0); }
    }
    .ss4-calling-ring {
      animation: ss4-call-ring 2s ease-in-out infinite;
    }

    /* ── Tab Switcher ───────────────────────────────────── */
    .ss4-tab-bar {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 3px;
    }
    .ss4-tab {
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      transition: all 0.15s ease;
      color: rgba(255,255,255,0.4);
    }
    .ss4-tab-active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 2px 8px rgba(91,124,246,0.35);
    }

    /* ── Logo Mark ──────────────────────────────────────── */
    .ss4-logo-mark {
      background: linear-gradient(140deg, #3a5ce0, #5b7cf6);
      box-shadow: 0 0 0 1px rgba(91,124,246,0.3), 0 4px 16px rgba(91,124,246,0.2);
      border-radius: 10px;
    }

    /* ── New Message FAB ────────────────────────────────── */
    .ss4-new-btn {
      background: rgba(91,124,246,0.15);
      border: 1px solid rgba(91,124,246,0.25);
      border-radius: 8px;
      color: var(--accent-text);
      transition: all 0.15s ease;
    }
    .ss4-new-btn:hover {
      background: rgba(91,124,246,0.25);
    }

    /* ── Theme Toggle ───────────────────────────────────── */
    .ss4-theme-btn {
      background: var(--bg-hover);
      border: 1px solid var(--border-2);
      border-radius: 8px;
      color: var(--text-tertiary);
      transition: all 0.15s ease;
    }
    .ss4-theme-btn:hover {
      color: var(--text-primary);
      border-color: var(--border-3);
    }

    /* ── File attachment ────────────────────────────────── */
    .ss4-file-own {
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
    }
    .ss4-file-other {
      background: var(--surface-2);
      border: 1px solid var(--border-1);
      border-radius: 10px;
    }

    /* ── Unread badge ───────────────────────────────────── */
    .ss4-badge {
      background: var(--accent);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      border-radius: 10px;
      min-width: 16px;
      height: 16px;
      line-height: 16px;
      padding: 0 4px;
      text-align: center;
    }

    /* ── Message load animation ─────────────────────────── */
    @keyframes ss4-fade-up {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ss4-msg-enter {
      animation: ss4-fade-up 0.2s ease forwards;
    }

    /* ── Empty state icon ───────────────────────────────── */
    .ss4-empty-icon {
      background: var(--accent-muted);
      border: 1px dashed rgba(91,124,246,0.25);
      border-radius: 16px;
    }

    /* ── Divider ────────────────────────────────────────── */
    .ss4-divider { height: 1px; background: var(--border-1); }
  `;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ini = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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

// Renders message text with **bold** markdown support and preserved newlines
function renderMessageContent(content: string): React.ReactNode[] {
  return content.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}
function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
const isVideoFileLike = (file: Pick<File, 'name' | 'type'>) => {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    : '';
  return file.type.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(extension);
};
const isVideoAttachment = (attachment: SSMessage['attachments'][number]) => {
  const extension = attachment.originalName.includes('.')
    ? attachment.originalName.slice(attachment.originalName.lastIndexOf('.')).toLowerCase()
    : '';
  return attachment.mimeType.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(extension);
};
const getConvName = (c: SSConversation, uid: string) =>
  c.type === 'group' ? (c.name || 'Group') : (c.members.find(m => m._id !== uid)?.fullName || 'Unknown');
const getConvAvatar = (c: SSConversation, uid: string) =>
  c.type === 'group' ? c.avatar : c.members.find(m => m._id !== uid)?.avatar;

// Deterministic avatar color per name
const avaColors = ['ss4-ava-accent', 'ss4-ava-purple', 'ss4-ava-teal'];
const getAvaColor = (name: string) => avaColors[name.charCodeAt(0) % avaColors.length];

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

// ─── Message Bubble ───────────────────────────────────────────────────────────
function Bubble({ message, isOwn, showAvatar, onReply, onDelete, onPin, isPinned, onOpenMedia, disableActions }: {
  message: SSMessage; isOwn: boolean; showAvatar: boolean;
  onReply: (m: SSMessage) => void; onDelete: (id: string) => void;
  onPin?: (id: string) => void; isPinned?: boolean;
  onOpenMedia?: (v: { src: string; type: 'image' | 'video'; name: string }) => void;
  disableActions?: boolean;
}) {
  const [hov, setHov] = React.useState(false);

  if (message.isDeleted) {
    return (
      <div className={cn('flex gap-2.5 px-5', isOwn && 'flex-row-reverse')}>
        <div className="w-8 shrink-0" />
        <p className="text-xs italic py-1" style={{ color: 'var(--text-disabled)' }}>
          This message was deleted
        </p>
      </div>
    );
  }

  const aColor = getAvaColor(message.sender.fullName);

  return (
    <div
      className={cn('flex gap-2.5 px-5 relative ss4-msg-enter', isOwn && 'flex-row-reverse')}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div className={cn(
          'h-8 w-8 rounded-full shrink-0 mt-0.5 flex items-center justify-center overflow-hidden',
          aColor
        )}>
          {message.sender.avatar
            ? <img src={message.sender.avatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(message.sender.fullName)}</span>}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={cn('ss4-msg-column flex flex-col gap-1', isOwn && 'items-end')}>
        {/* Sender name */}
        {showAvatar && !isOwn && (
          <span className="px-1 font-semibold" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {message.sender.fullName}
          </span>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div
            className="rounded-xl px-3 py-2 mb-1 max-w-full ss4-reply-bar"
          >
            <p className="font-semibold truncate" style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--accent-text)' }}>
              {message.replyTo.sender?.fullName}
            </p>
            <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {message.replyTo.content || '📎 Attachment'}
            </p>
          </div>
        )}

        {/* Text bubble — only rendered when there is text content */}
        {message.content ? (
          <div className={cn(
            'ss4-msg-bubble px-4 py-2.5 text-sm leading-relaxed wrap-break-word',
            isOwn ? 'ss4-bubble-own' : 'ss4-bubble-other'
          )}>
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {renderMessageContent(message.content)}
            </p>
          </div>
        ) : null}

        {/* Attachments — rendered below the bubble, not inside it */}
        {message.attachments.length > 0 && (
          <div className={cn('flex flex-col gap-1.5', message.content ? 'mt-1' : '')}>
            {/* Images — click opens inline lightbox */}
            {message.attachments.filter(a => a.mimeType.startsWith('image/')).map((att, i) => (
              <button key={`img-${i}`} onClick={() => onOpenMedia?.({ src: att.url, type: 'image', name: att.originalName })}
                className="block text-left rounded-xl overflow-hidden cursor-zoom-in" style={{ maxWidth: 260 }}>
                <img src={att.thumbnailUrl || att.url} alt={att.originalName}
                  className="rounded-xl object-cover hover:opacity-90 transition-opacity"
                  style={{ maxHeight: 200, maxWidth: 260, display: 'block' }} />
              </button>
            ))}
            {/* Videos — inline player */}
            {message.attachments.filter(isVideoAttachment).map((att, i) => (
              <div key={`video-${i}`} className="rounded-xl overflow-hidden" style={{ maxWidth: 280 }}>
                <video controls preload="metadata" className="block w-full rounded-xl" style={{ maxHeight: 220 }}>
                  <source src={att.url} type={att.mimeType || 'video/mp4'} />
                </video>
              </div>
            ))}
            {/* Files */}
            {message.attachments.filter(a => !a.mimeType.startsWith('image/') && !isVideoAttachment(a)).map((att, i) => (
              <a key={`file-${i}`} href={att.url} download={att.originalName}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80 no-underline', isOwn ? 'ss4-file-own' : 'ss4-file-other')}
                style={{ maxWidth: 280 }}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--accent-muted)' }}>
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

        {/* Meta row */}
        <div className={cn('flex items-center gap-1.5 px-1', isOwn && 'flex-row-reverse')}>
          <span className="ss4-mono tabular-nums" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {fmtTime(message.createdAt)}
          </span>
          {isOwn && (
            message.readBy.length > 1
              ? <CheckCheck className="h-3 w-3" style={{ color: 'var(--positive)' }} />
              : <CheckIcon className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hov && !disableActions && (
        <div className={cn(
          'ss4-msg-actions absolute top-0 flex items-center gap-0.5 px-1 py-1 z-10',
          isOwn ? 'right-16' : 'left-16'
        )}>
          <button onClick={() => onReply(message)} className="ss4-icon-btn p-1.5" title="Reply">
            <Reply className="h-3.5 w-3.5" />
          </button>
          {onPin && (
            <button
              onClick={() => onPin(message._id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: isPinned ? 'var(--accent)' : 'var(--text-tertiary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = isPinned ? 'var(--accent)' : 'var(--text-tertiary)'; }}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => onDelete(message._id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-muted)'; e.currentTarget.style.color = 'var(--danger)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Video Call Modal ─────────────────────────────────────────────────────────
function VideoCallModal({
  conv,
  uid,
  onClose,
  allUsers,
  token
}: {
  conv: SSConversation;
  uid: string;
  onClose: () => void;
  allUsers: CrmUser[];
  token: string;
}) {
  const [showJitsi, setShowJitsi] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(true);
  const [jitsiToken, setJitsiToken] = React.useState<string | null>(null);

  const name = getConvName(conv, uid);
  const currentUser = React.useMemo(() => {
    return allUsers.find(u => u._id === uid) || { fullName: 'User' };
  }, [uid, allUsers]);

  // Generate a unique, consistent room name based on conversation ID
  const roomName = React.useMemo(() => {
    return `supraspace-${conv._id}`;
  }, [conv._id]);

  // Fetch Jitsi token from backend
  React.useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await apiClient.post(
          `/api/supraspace/conversations/${conv._id}/video-token`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const tokenData = res.data?.data?.token;
        if (tokenData) {
          setJitsiToken(tokenData);
        }
      } catch (err) {
        console.error('[VideoCall] Failed to fetch Jitsi token:', err);
        // Continue without token - works with public Jitsi instances
      }
    };

    if (token && conv._id) {
      fetchToken();
    }
  }, [token, conv._id]);

  React.useEffect(() => {
    // Show Jitsi after connection delay
    const timer = setTimeout(() => {
      setIsConnecting(false);
      setShowJitsi(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // If Jitsi is loaded, render it
  if (showJitsi) {
    return (
      <JitsiMeet
        roomName={roomName}
        displayName={currentUser.fullName}
        onClose={onClose}
        onError={(error) => {
          console.error('[Jitsi] Error:', error);
          onClose();
        }}
      />
    );
  }

  // Show connecting screen
  const avatar = getConvAvatar(conv, uid);

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4 ss4-vcall-modal w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <Video className="h-4 w-4" style={{ color: 'var(--accent-text)' }} />
            <span className="font-semibold" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Video Call</span>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Connecting screen */}
        <div className="ss4-vcall-screen flex flex-col items-center justify-center" style={{ height: 260 }}>
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className={cn(
              'h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden ss4-calling-ring',
              getAvaColor(name)
            )}>
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : conv.type === 'group'
                  ? <Hash className="h-7 w-7 text-white opacity-70" />
                  : <span className="text-white font-bold" style={{ fontSize: 24 }}>{ini(name)}</span>}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="ss4-display font-bold" style={{ fontSize: 17, color: '#fff' }}>{name}</p>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Connecting</span>
                {[0, 1, 2].map(i => (
                  <span key={i} className="ss4-typing-dot h-1 w-1 rounded-full inline-block"
                    style={{ background: 'rgba(255,255,255,0.4)', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pb-4 pt-2 text-center">
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
            Powered by Jitsi Meet
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── New Conversation Modal ───────────────────────────────────────────────────
interface CrmUser { _id: string; fullName: string; username: string; avatar?: string; role: string }

function NewConvModal({ users, onClose, onStartDM, onCreateGroup, defaultTab = 'dm' }: {
  users: CrmUser[]; onClose: () => void;
  onStartDM: (id: string) => void;
  onCreateGroup: (name: string, ids: string[]) => void;
  defaultTab?: 'dm' | 'group';
}) {
  const [tab, setTab] = React.useState<'dm' | 'group'>(defaultTab);
  const [q, setQ] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [sel, setSel] = React.useState<string[]>([]);

  const list = users.filter(u =>
    u.fullName.toLowerCase().includes(q.toLowerCase()) ||
    u.username.toLowerCase().includes(q.toLowerCase())
  );
  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="ss4-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-sm overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <h2 className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
            New Conversation
          </h2>
          <button onClick={onClose} className="ss4-icon-btn h-7 w-7">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-4 pt-4 pb-3">
          <div className="ss4-tab-bar flex gap-1">
            {(['dm', 'group'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex-1 h-7 ss4-tab', t === tab && 'ss4-tab-active')}>
                {t === 'dm' ? 'Direct Message' : 'New Group'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {tab === 'group' && (
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full h-9 rounded-lg px-3 text-sm ss4-search-input"
              style={{ fontFamily: 'Geist, sans-serif' }}
            />
          )}
          <div className="relative">
            <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search people..."
              className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input"
              style={{ fontFamily: 'Geist, sans-serif' }}
            />
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto ss4-scroll -mx-1 px-1">
            {list.map(u => {
              const active = sel.includes(u._id);
              return (
                <button key={u._id}
                  onClick={() => tab === 'dm' ? onStartDM(u._id) : toggle(u._id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                    active ? 'bg-(--accent-muted) border border-[rgba(91,124,246,0.2)]' : 'hover:bg-(--bg-hover)'
                  )}
                >
                  <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden', getAvaColor(u.fullName))}>
                    {u.avatar
                      ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(u.fullName)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.fullName}</p>
                    <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username} · {u.role}</p>
                  </div>
                  {tab === 'group' && active && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                      <CheckIcon className="h-3 w-3" style={{ color: '#fff' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {tab === 'group' && sel.length > 0 && (
            <button
              onClick={() => groupName.trim() && onCreateGroup(groupName, sel)}
              disabled={!groupName.trim()}
              className="w-full h-9 rounded-lg ss4-send-btn font-semibold flex items-center justify-center gap-2"
              style={{ fontSize: 13, opacity: !groupName.trim() ? 0.4 : 1 }}
            >
              <Users className="h-3.5 w-3.5" />
              Create Group · {sel.length} {sel.length === 1 ? 'member' : 'members'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// ─── Inline Lightbox Modal ────────────────────────────────────────────────────
function LightboxModal({ src, type, name, onClose }: { src: string; type: 'image' | 'video'; name: string; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="ss4-overlay fixed inset-0 z-200 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-3 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full px-1">
          <p className="font-medium truncate" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{name}</p>
          <div className="flex items-center gap-2">
            <a href={src} download={name} className="ss4-pill-btn flex items-center gap-1.5 px-3 h-7 no-underline" style={{ fontSize: 11 }}>
              <Download className="h-3 w-3" /> Download
            </a>
            <button onClick={onClose} className="ss4-icon-btn h-8 w-8" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <X className="h-4 w-4" style={{ color: '#fff' }} />
            </button>
          </div>
        </div>
        {type === 'image'
          ? <img src={src} alt={name} className="rounded-xl max-h-[80vh] max-w-full object-contain" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />
          : <video src={src} controls autoPlay className="rounded-xl max-h-[80vh] max-w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />}
      </div>
    </div>
  );
}

// ─── File Attachment Preview (pending files) ──────────────────────────────────
function FilePreviewItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/');
  const isVid = file.type.startsWith('video/') || SS4_VIDEO_EXTENSIONS.has(file.name.slice(file.name.lastIndexOf('.')).toLowerCase());
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isImg || isVid) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImg, isVid]);
  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden shrink-0" style={{ width: 80, background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
      {preview && isImg
        ? <img src={preview} alt={file.name} className="w-full object-cover" style={{ height: 60 }} />
        : preview && isVid
          ? <video src={preview} className="w-full object-cover" style={{ height: 60 }} muted />
          : <div className="flex items-center justify-center" style={{ height: 60, background: 'var(--accent-muted)' }}>
            <FileText className="h-6 w-6" style={{ color: 'var(--accent)' }} />
          </div>}
      <div className="px-1.5 py-1">
        <p className="truncate" style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>{file.name}</p>
        <p className="ss4-mono" style={{ fontSize: 8, color: 'var(--text-disabled)' }}>{fmtSize(file.size)}</p>
      </div>
      <button onClick={onRemove} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.6)' }}>
        <X className="h-2.5 w-2.5" style={{ color: '#fff' }} />
      </button>
    </div>
  );
}

export default function SupraSpacePage({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const uploadNoticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [token, setToken] = React.useState('');
  const [uid, setUid] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const [convos, setConvos] = React.useState<SSConversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [sideOpen, setSideOpen] = React.useState(true);

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
  const [videoCallConv, setVideoCallConv] = React.useState<SSConversation | null>(null);

  const [supraLeoOpen, setSupraLeoOpen] = React.useState(false);
  const [supraLeoLoading, setSupraLeoLoading] = React.useState(false);
  const supraLeoRef = React.useRef<HTMLDivElement>(null);

  // Info panel + emoji + pinned messages
  const [showInfo, setShowInfo] = React.useState(false);
  const [infoTab, setInfoTab] = React.useState<'members' | 'media' | 'files' | 'pinned'>('members');
  const [pinnedMsgIds, setPinnedMsgIds] = React.useState<Set<string>>(new Set());
  const [editingGcName, setEditingGcName] = React.useState(false);
  const [gcNameInput, setGcNameInput] = React.useState('');
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const emojiRef = React.useRef<HTMLDivElement>(null);
  // Lightbox
  const [lightbox, setLightbox] = React.useState<{ src: string; type: 'image' | 'video'; name: string } | null>(null);
  // Pin notification
  const [pinBanner, setPinBanner] = React.useState<string | null>(null);
  const pinBannerTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // System events (pin, channel updates shown in chat stream)
  const [systemEvents, setSystemEvents] = React.useState<Array<{ id: string; convId: string; text: string; ts: string }>>([]);
  // Member profile mini-card
  const [memberCard, setMemberCard] = React.useState<{ member: SSConversation['members'][number]; pos: { x: number; y: number } } | null>(null);
  // Channel avatar upload ref
  const avatarFileRef = React.useRef<HTMLInputElement>(null);

  const endRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const typingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConv = convos.find(c => c._id === activeId);
  const activeMsgs = activeId ? (msgs[activeId] || []) : [];

  const { socket, isConnected, presence, typing, joinConversation, leaveConversation, sendTypingStart, sendTypingStop, markRead } = useSupraSpaceSocket(token || null);

  React.useEffect(() => {
    const t = localStorage.getItem('crm_token');
    if (!t) { router.replace('/crm'); return; }
    setToken(t);
    const init = async () => {
      try {
        const [me, cv, us] = await Promise.all([
          apiClient.get('/api/crm/me', { headers: { Authorization: `Bearer ${t}` } }),
          apiClient.get('/api/supraspace/conversations', { headers: { Authorization: `Bearer ${t}` } }),
          apiClient.get('/api/supraspace/users', { headers: { Authorization: `Bearer ${t}` } }),
        ]);
        setUid((me.data?.data || me.data)._id);
        const fetchedConvos: SSConversation[] = cv.data?.data || [];
        const fetchedUsers: CrmUser[] = us.data?.data || [];
        setConvos(fetchedConvos);
        setAllUsers(fetchedUsers);

        // Cache the "Online Team Report" group ID so DayPulse can post there
        const reportGroup = fetchedConvos.find(c => c.type === 'group' && c.name === 'Online Team Report');
        if (reportGroup) localStorage.setItem('dp_groupchat_id', reportGroup._id);
      } catch { router.replace('/crm'); }
      finally { setLoading(false); }
    };
    init();
  }, [router]);

  React.useEffect(() => {
    return () => {
      if (uploadNoticeTimerRef.current) clearTimeout(uploadNoticeTimerRef.current);
    };
  }, []);

  // Auto-open DM when arriving from CRM profile "Message" button (?userId=xxx)
  const autoOpenHandledRef = React.useRef(false);
  React.useEffect(() => {
    if (loading || !token || autoOpenHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    if (!targetUserId) return;
    autoOpenHandledRef.current = true;
    apiClient
      .post(
        '/api/supraspace/conversations/direct',
        { targetUserId },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((r) => {
        const c = r.data?.data;
        if (!c) return;
        setConvos((p) => (p.find((x) => x._id === c._id) ? p : [c, ...p]));
        setActiveId(c._id);
        setSideOpen(false);
        // Remove ?userId from URL without a full reload
        const url = new URL(window.location.href);
        url.searchParams.delete('userId');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(() => { });
  }, [loading, token]);

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
    setConvos(p => p.map(c => c._id === conversationId
      ? { ...c, lastMessage: message, lastMessageAt: message.createdAt } : c
    ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  React.useEffect(() => {
    if (!socket) return;
    const onMsg = ({ conversationId, message }: { conversationId: string; message: SSMessage }) => {
      appendMessageLocal(conversationId, message);
    };
    const onDel = ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      setMsgs(p => ({ ...p, [conversationId]: (p[conversationId] || []).map(m => m._id === messageId ? { ...m, isDeleted: true, content: '', attachments: [] } : m) }));
    };
    const onNew = (c: SSConversation) => setConvos(p => [c, ...p.filter(x => x._id !== c._id)]);
    socket.on('message:new', onMsg);
    socket.on('message:deleted', onDel);
    socket.on('conversation:new', onNew);
    return () => { socket.off('message:new', onMsg); socket.off('message:deleted', onDel); socket.off('conversation:new', onNew); };
  }, [socket, appendMessageLocal]);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMsgs.length]);

  // Fetch messages and mark read when conversation changes
  React.useEffect(() => {
    if (!activeId || !token) return;
    if (!msgs[activeId]) {
      setLoadingMsgs(true);
      apiClient.get(`/api/supraspace/conversations/${activeId}/messages`, { headers: { Authorization: `Bearer ${token}` }, params: { limit: 40 } })
        .then(r => {
          const d = r.data?.data || [];
          setMsgs(p => ({ ...p, [activeId]: d }));
          setHasMore(p => ({ ...p, [activeId]: d.length === 40 }));
        }).finally(() => setLoadingMsgs(false));
    }
    markRead(activeId);
  }, [activeId, token]); // eslint-disable-line

  // Join/leave conversation socket room — re-runs on activeId change AND on reconnect
  // so we always re-join after a socket disconnect/reconnect cycle.
  React.useEffect(() => {
    if (!activeId || !isConnected) return;
    joinConversation(activeId);
    return () => leaveConversation(activeId);
  }, [activeId, isConnected, joinConversation, leaveConversation]);

  React.useEffect(() => {
    setPendingFiles([]);
    setUploadNotice(null);
  }, [activeId]);

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

        const uploadResponse = await apiClient.post(
          `/api/supraspace/conversations/${conversationId}/upload`,
          fd,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        const uploadedMessage = uploadResponse.data?.data as SSMessage | undefined;
        if (uploadedMessage) appendMessageLocal(conversationId, uploadedMessage);

        setPendingFiles([]);
        setInput('');
        setReplyTo(null);
        showUploadNotice('success', pendingFiles.length === 1 ? 'Attachment sent.' : `${pendingFiles.length} attachments sent.`);
      } else {
        setInput('');
        setReplyTo(null);
        const sendResponse = await apiClient.post(
          `/api/supraspace/conversations/${conversationId}/messages`,
          { content, replyTo: replyMessageId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const sentMessage = sendResponse.data?.data as SSMessage | undefined;
        if (sentMessage) appendMessageLocal(conversationId, sentMessage);
      }
    } catch (error: unknown) {
      if (hasPendingFiles) {
        const message = getErrorMessage(error, 'Failed to send attachment. Please try again.');
        showUploadNotice('error', message);
      } else {
        setInput(content);
      }
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    if (!activeId) {
      showUploadNotice('error', 'Select a conversation before attaching files.');
      return;
    }

    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    const totalFiles = pendingFiles.length + selectedFiles.length;
    if (totalFiles > SS4_MAX_UPLOAD_FILES) {
      showUploadNotice('error', `You can attach up to ${SS4_MAX_UPLOAD_FILES} files.`);
      return;
    }

    for (const file of selectedFiles) {
      if (file.size === 0) {
        showUploadNotice('error', `${file.name} is empty and cannot be sent.`);
        return;
      }

      const videoFile = isVideoFileLike(file);
      const maxBytes = videoFile ? SS4_MAX_VIDEO_UPLOAD_SIZE_BYTES : SS4_MAX_UPLOAD_SIZE_BYTES;
      if (file.size > maxBytes) {
        showUploadNotice('error', `${file.name} exceeds ${videoFile ? '40 MB (video limit)' : '25 MB'}.`);
        return;
      }
    }

    setPendingFiles(prev => [...prev, ...selectedFiles]);
    showUploadNotice('info', selectedFiles.length === 1
      ? `${selectedFiles[0].name} attached. Press Send to deliver.`
      : `${selectedFiles.length} files attached. Press Send to deliver.`);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!activeId) return;
    sendTypingStart(activeId);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => sendTypingStop(activeId!), 2000);
  };

  const handleDelete = async (msgId: string) => {
    if (!activeId) return;
    setMsgs(p => ({ ...p, [activeId]: (p[activeId] || []).map(m => m._id === msgId ? { ...m, isDeleted: true, content: '', attachments: [] } : m) }));
    try {
      await apiClient.delete(`/api/supraspace/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      setMsgs(p => ({ ...p, [activeId]: (p[activeId] || []).map(m => m._id === msgId ? { ...m, isDeleted: false } : m) }));
    }
  };

  // Close Supra Leo popover on outside click
  React.useEffect(() => {
    if (!supraLeoOpen) return;
    const handler = (e: MouseEvent) => {
      if (supraLeoRef.current && !supraLeoRef.current.contains(e.target as Node)) {
        setSupraLeoOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [supraLeoOpen]);

  React.useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiOpen]);

  React.useEffect(() => {
    if (!memberCard) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('ss4-member-card');
      if (el && !el.contains(e.target as Node)) setMemberCard(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [memberCard]);

  const addSystemEvent = React.useCallback((convId: string, text: string) => {
    setSystemEvents(prev => [...prev, { id: `sys-${Date.now()}-${Math.random()}`, convId, text, ts: new Date().toISOString() }]);
  }, []);

  const handlePinToggle = (msgId: string) => {
    if (!activeId) return;
    const wasPin = pinnedMsgIds.has(msgId);
    const msg = activeMsgs.find(m => m._id === msgId);
    const previewText = msg?.content ? `"${msg.content.slice(0, 40)}${msg.content.length > 40 ? '…' : ''}"` : 'an attachment';
    const text = wasPin ? 'Unpinned a message' : `Pinned ${previewText}`;
    setPinnedMsgIds(prev => {
      const next = new Set(prev);
      wasPin ? next.delete(msgId) : next.add(msgId);
      return next;
    });
    setPinBanner(wasPin ? 'Message unpinned' : `📌 Pinned ${previewText}`);
    addSystemEvent(activeId, text);
    if (pinBannerTimer.current) clearTimeout(pinBannerTimer.current);
    pinBannerTimer.current = setTimeout(() => setPinBanner(null), 4000);
  };

  const handleSupraLeoAction = async (action: 'improve' | 'draft' | 'formal' | 'casual') => {
    setSupraLeoOpen(false);
    setSupraLeoLoading(true);

    const recentContext = activeMsgs.slice(-10).map(m => `${m.sender?.fullName || 'User'}: ${m.content || '(attachment)'}`).join('\n');
    const conversationName = activeConv?.name || 'this conversation';

    const prompts: Record<string, string> = {
      improve: input.trim()
        ? `Improve this draft message for clarity and professionalism. Return only the improved message text, no explanation:\n\n"${input.trim()}"`
        : 'No draft provided.',
      draft: `You are helping compose a team message in Supra Space for conversation "${conversationName}". Based on the recent conversation context below, draft a brief, professional reply that would be appropriate to send next. Return only the message text, no explanation.\n\nRecent messages:\n${recentContext || '(no messages yet)'}`,
      formal: input.trim()
        ? `Rewrite this message in a more formal, professional tone. Return only the rewritten message text, no explanation:\n\n"${input.trim()}"`
        : 'No draft provided.',
      casual: input.trim()
        ? `Rewrite this message in a friendly, casual tone suitable for internal team chat. Return only the rewritten message text, no explanation:\n\n"${input.trim()}"`
        : 'No draft provided.',
    };

    const prompt = prompts[action];
    if (prompt === 'No draft provided.') {
      setSupraLeoLoading(false);
      return;
    }

    try {
      const res = await apiClient.post(
        '/api/supraleo/chat',
        { message: prompt, module: 'supraspace' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const reply: string = res.data?.data?.message || '';
      if (reply.trim()) setInput(reply.trim());
    } catch {
      // silent fail — button just returns to idle
    } finally {
      setSupraLeoLoading(false);
    }
  };

  const handleDM = async (targetId: string) => {
    setShowModal({ open: false, tab: 'dm' });
    try {
      const r = await apiClient.post('/api/supraspace/conversations/direct', { targetUserId: targetId }, { headers: { Authorization: `Bearer ${token}` } });
      const c = r.data?.data;
      setConvos(p => p.find(x => x._id === c._id) ? p : [c, ...p]);
      setActiveId(c._id);
      setSideOpen(false);
    } catch { }
  };

  const handleGroup = async (name: string, ids: string[]) => {
    setShowModal({ open: false, tab: 'dm' });
    try {
      const r = await apiClient.post('/api/supraspace/conversations/group', { name, memberIds: ids }, { headers: { Authorization: `Bearer ${token}` } });
      setConvos(p => [r.data?.data, ...p]);
      setActiveId(r.data?.data._id);
      setSideOpen(false);
    } catch { }
  };

  const loadMore = async () => {
    if (!activeId || !hasMore[activeId] || loadingMsgs) return;
    setLoadingMsgs(true);
    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${activeId}/messages`, { headers: { Authorization: `Bearer ${token}` }, params: { before: activeMsgs[0]?.createdAt, limit: 40 } });
      const d = r.data?.data || [];
      setMsgs(p => ({ ...p, [activeId]: [...d, ...(p[activeId] || [])] }));
      setHasMore(p => ({ ...p, [activeId]: d.length === 40 }));
    } catch { } finally { setLoadingMsgs(false); }
  };

  const typers = activeId ? (typing[activeId] || []).filter(t => t.userId !== uid) : [];

  // Deduplicate "Online Team Report" groups (keep earliest _id), then pin it first
  const dedupedConvos = React.useMemo(() => {
    const seen = new Set<string>();
    const deduped: SSConversation[] = [];
    let reportGroup: SSConversation | null = null;
    for (const c of convos) {
      if (c.type === 'group' && c.name === 'Online Team Report') {
        if (!reportGroup) reportGroup = c; // keep first encountered
        continue;
      }
      if (!seen.has(c._id)) { seen.add(c._id); deduped.push(c); }
    }
    return reportGroup ? [reportGroup, ...deduped] : deduped;
  }, [convos]);

  const filtered = dedupedConvos.filter(c => getConvName(c, uid).toLowerCase().includes(q.toLowerCase()));

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={cn('ss4 flex items-center justify-center h-full min-h-screen')} data-theme={theme}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 ss4-logo-mark flex items-center justify-center">
          <Radio className="h-6 w-6" style={{ color: '#fff' }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Supra Space</p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="ss4-typing-dot h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('ss4 flex flex-col h-full overflow-hidden')} data-theme={theme}>

      {/* ── Topbar ── */}
      <header className="ss4-topbar shrink-0 z-40" style={{ minHeight: 52 }}>
        <div className="flex items-center justify-between h-full px-3 sm:px-4 py-2.5">
          {/* Left */}
          <div className="flex items-center gap-3">
            {!embedded && (
              <>
                <button onClick={() => router.push('/crm/dashboard')} className="ss4-icon-btn h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="h-5 w-px" style={{ background: 'var(--border-2)' }} />
              </>
            )}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 ss4-logo-mark flex items-center justify-center shrink-0">
                <Radio className="h-3.5 w-3.5" style={{ color: '#fff' }} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <p className="ss4-display font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    Supra Space
                  </p>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isConnected ? '' : '')} style={{ background: isConnected ? 'var(--positive)' : 'var(--text-disabled)', boxShadow: isConnected ? '0 0 6px rgba(52,201,125,0.7)' : 'none' }} />
                  {isConnected && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--positive)', letterSpacing: '0.06em' }}>Live</span>}
                </div>
                <p className="leading-none mt-0.5 font-medium" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Team Messaging
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="ss4-theme-btn h-8 w-8 flex items-center justify-center" title="Toggle theme">
              {theme === 'dark'
                ? <Sun className="h-3.5 w-3.5" />
                : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Notifications */}
            <button className="ss4-icon-btn h-8 w-8" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Active Users Bar ── */}
      {(() => {
        const onlineUsers = allUsers.filter(u => u._id !== uid && presence[u._id] === 'online');
        if (!isConnected || onlineUsers.length === 0) return null;
        return (
          <div className="hidden lg:flex shrink-0 items-center gap-3 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ borderBottom: '1px solid var(--border-1)', background: 'var(--bg-subtle)', minHeight: 40 }}>
            <span className="ss4-section-label shrink-0" style={{ fontSize: 9 }}>Active</span>
            {onlineUsers.map(user => {
              const existing = convos.find(c => c.type === 'direct' && c.members.some(m => m._id === user._id));
              return (
                <button
                  key={user._id}
                  onClick={() => { if (existing) { setActiveId(existing._id); setSideOpen(false); } else handleDM(user._id); }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all shrink-0"
                  style={{ fontSize: 11 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  title={`Message ${user.fullName}`}
                >
                  <div className="relative">
                    <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden', getAvaColor(user.fullName))} style={{ fontSize: 8 }}>
                      {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : ini(user.fullName)}
                    </div>
                    <span className="ss4-online-dot absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full" />
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{user.fullName.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Sidebar ── */}
        <aside
          className={cn(
            'ss4-sidebar flex flex-col transition-transform duration-300 ease-in-out overflow-hidden',
            // Mobile/tablet: full-screen absolute, slides when chat opens
            'absolute inset-0 z-20',
            // Desktop: static side panel always visible
            'lg:relative lg:inset-auto lg:z-auto lg:w-72 lg:shrink-0 lg:translate-x-0',
            activeId ? '-translate-x-full' : 'translate-x-0'
          )}
        >
          {/* ── Mobile header: title + buttons + avatar strip + search ── */}
          <div className="lg:hidden shrink-0">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <p className="ss4-display font-bold truncate" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Supra Space</p>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: isConnected ? '#34c97d' : 'var(--text-disabled)', boxShadow: isConnected ? '0 0 5px rgba(52,201,125,0.7)' : 'none' }} />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setShowModal({ open: true, tab: 'dm' })} className="ss4-new-btn h-8 px-3 flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600 }}>
                  <Plus className="h-3.5 w-3.5" /> Message
                </button>
                <button onClick={() => setShowModal({ open: true, tab: 'group' })} className="ss4-pill-btn h-8 w-8 flex items-center justify-center" title="New channel">
                  <Hash className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Avatar strip (online first, then rest) */}
            <div className="px-4 pb-3">
              <div className="flex gap-3 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ minHeight: 70 }}>
                {[...allUsers.filter(u => u._id !== uid && presence[u._id] === 'online'), ...allUsers.filter(u => u._id !== uid && presence[u._id] !== 'online')].map(user => {
                  const isOn = presence[user._id] === 'online';
                  return (
                    <button key={user._id}
                      onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMemberCard({ member: { _id: user._id, fullName: user.fullName, username: user.username, avatar: user.avatar, role: user.role }, pos: { x: Math.min(r.left, window.innerWidth - 210), y: r.bottom + 8 } }); }}
                      className="flex flex-col items-center gap-1 shrink-0 transition-opacity hover:opacity-80">
                      <div className="relative">
                        <div className={cn('h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden', getAvaColor(user.fullName))} style={{ fontSize: 13 }}>
                          {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : ini(user.fullName)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full flex items-center justify-center" style={{ background: 'var(--sidebar-bg)', boxShadow: '0 0 0 1.5px var(--sidebar-bg)' }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: isOn ? '#34c97d' : 'var(--text-disabled)' }} />
                        </span>
                      </div>
                      <span className="max-w-[40px] truncate text-center" style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 500 }}>{user.fullName.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="px-3 pb-2" style={{ borderBottom: '1px solid var(--border-1)' }}>
              <div className="relative">
                <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search conversations…" className="w-full h-9 rounded-lg pl-9 pr-3 text-sm ss4-search-input" style={{ fontFamily: 'Geist, sans-serif' }} />
              </div>
            </div>
          </div>

          {/* ── Desktop header ── */}
          <div className="hidden lg:block px-4 pt-5 pb-3 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="ss4-section-label">Messages</span>
              <button onClick={() => setShowModal({ open: true, tab: 'dm' })}
                className="ss4-new-btn h-7 px-2.5 flex items-center gap-1.5"
                title="New conversation">
                <Plus className="h-3 w-3" style={{ color: 'var(--accent-text)' }} />
                <span className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>New</span>
              </button>
            </div>
            <div className="relative">
              <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-9 rounded-lg pl-9 pr-3 text-xs ss4-search-input"
                style={{ fontFamily: 'Geist, sans-serif' }}
              />
            </div>
          </div>

          <div className="hidden lg:block mx-4 ss4-divider" />

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto ss4-scroll pb-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 px-3">
                <div className="h-10 w-10 rounded-xl ss4-empty-icon flex items-center justify-center">
                  <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No conversations yet</p>
              </div>
            ) : (['direct', 'group'] as const).map(sectionType => {
              const sectionConvos = filtered.filter(c => c.type === sectionType);
              if (sectionConvos.length === 0) return null;
              const onlineDmCount = sectionType === 'direct'
                ? sectionConvos.filter(c => { const o = c.members.find(m => m._id !== uid); return o && presence[o._id] === 'online'; }).length
                : 0;
              return (
                <div key={sectionType}>
                  {/* Section header */}
                  <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
                    <span className="ss4-section-label">{sectionType === 'direct' ? 'Direct Messages' : 'Channels'}</span>
                    {sectionType === 'direct' && onlineDmCount > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--positive)', letterSpacing: '0.05em' }}>
                        ● {onlineDmCount} online
                      </span>
                    )}
                    {sectionType === 'group' && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)' }}>
                        {sectionConvos.length} channels
                      </span>
                    )}
                  </div>

                  <div className="px-2 space-y-0.5">
                    {sectionConvos.map(conv => {
                      const isAct = conv._id === activeId;
                      const other = conv.members.find(m => m._id !== uid);
                      const online = other ? presence[other._id] === 'online' : false;
                      const cName = getConvName(conv, uid);
                      const cAvatar = getConvAvatar(conv, uid);
                      const isUnread = !isAct && conv.lastMessage && uid && !conv.lastMessage.readBy?.includes(uid) && conv.lastMessage.sender._id !== uid;
                      const lastPreview = conv.lastMessage?.isDeleted
                        ? 'Message deleted'
                        : conv.lastMessage?.content || (conv.lastMessage?.attachments?.length ? '📎 Attachment' : 'No messages yet');
                      const senderPrefix = sectionType === 'group' && conv.lastMessage && conv.lastMessage.sender._id !== uid
                        ? `${conv.lastMessage.sender.fullName.split(' ')[0]}: `
                        : '';

                      return (
                        <div
                          key={conv._id}
                          className={cn('ss4-conv group flex items-center gap-2.5 px-3 py-2', isAct && 'ss4-conv-active')}
                          onClick={() => { setActiveId(conv._id); setSideOpen(false); }}
                        >
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div className={cn('h-8 w-8 rounded-full flex items-center justify-center overflow-hidden', sectionType === 'group' ? 'ss4-ava-purple' : getAvaColor(cName))}>
                              {cAvatar
                                ? <img src={cAvatar} alt="" className="w-full h-full object-cover" />
                                : sectionType === 'group'
                                  ? <Hash className="h-3.5 w-3.5 text-white opacity-70" />
                                  : <span className="text-white font-semibold" style={{ fontSize: 10 }}>{ini(cName)}</span>}
                            </div>
                            {sectionType === 'direct' && online
                              ? <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />
                              : isUnread
                                ? <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--sidebar-bg)' }} />
                                : null}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className={cn('ss4-conv-name font-semibold truncate', isUnread && 'font-bold')} style={{ fontSize: 12.5 }}>
                                {cName}
                              </p>
                              <span className="shrink-0" style={{ fontSize: 9.5, color: 'var(--text-disabled)' }}>
                                {fmtRelative(conv.lastMessageAt || conv.lastMessage?.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5 gap-1">
                              <p className="ss4-conv-preview truncate flex-1" style={{ fontSize: 11, fontWeight: isUnread ? 500 : 400 }}>
                                {senderPrefix}{lastPreview}
                              </p>
                              {sectionType === 'direct' && !online && (
                                <span style={{ fontSize: 9, color: 'var(--text-disabled)', flexShrink: 0 }}>Offline</span>
                              )}
                              {sectionType === 'group' && (
                                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                                  {conv.members.length} members
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Call on hover */}
                          <button
                            onClick={e => { e.stopPropagation(); setVideoCallConv(conv); }}
                            className={cn('shrink-0 h-6 w-6 rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(91,124,246,0.15)]', isAct ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                            style={{ color: 'var(--text-tertiary)' }}
                            title="Call"
                          >
                            <Phone className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Chat / Welcome area ── */}
        <main className={cn(
          'flex flex-col min-h-0 overflow-hidden',
          // Mobile: full-screen absolute, slides in when chat opens
          'absolute inset-0 z-10 transition-transform duration-300 ease-in-out',
          // Desktop: flex-1 always visible
          'lg:relative lg:inset-auto lg:z-auto lg:flex-1 lg:translate-x-0',
          !activeId ? 'translate-x-full' : 'translate-x-0'
        )}>
          <div className="flex-1 flex min-h-0 flex-col overflow-hidden min-w-0" style={{ background: 'var(--bg-base)' }}>

            {/* Welcome / empty state — desktop only; mobile uses sidebar as home screen */}
            {!activeId && (() => {
              const onlineMembers = allUsers.filter(u => u._id !== uid && presence[u._id] === 'online');
              const allTeam = allUsers.filter(u => u._id !== uid);
              const dmConvos = convos.filter(c => c.type === 'direct');
              const groupConvos = convos.filter(c => c.type === 'group');
              const recentConvos = convos.filter(c => c.lastMessage).sort((a, b) => new Date(b.lastMessageAt || b.lastMessage!.createdAt).getTime() - new Date(a.lastMessageAt || a.lastMessage!.createdAt).getTime()).slice(0, 5);

              const ConvRow = ({ conv }: { conv: SSConversation }) => {
                const cName = getConvName(conv, uid);
                const cAvatar = getConvAvatar(conv, uid);
                const other = conv.members.find(m => m._id !== uid);
                const isOnline = conv.type === 'direct' && other ? presence[other._id] === 'online' : false;
                const isUnread = !!(conv.lastMessage && uid && !conv.lastMessage.readBy?.includes(uid) && conv.lastMessage.sender._id !== uid);
                const senderPfx = conv.type === 'group' && conv.lastMessage && conv.lastMessage.sender._id !== uid
                  ? `${conv.lastMessage.sender.fullName.split(' ')[0]}: ` : '';
                return (
                  <button onClick={() => { setActiveId(conv._id); setSideOpen(false); }}
                    className="ss4-conv w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                    <div className="relative shrink-0">
                      <div className={cn('h-9 w-9 rounded-full flex items-center justify-center overflow-hidden', conv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(cName))}>
                        {cAvatar ? <img src={cAvatar} alt="" className="w-full h-full object-cover" />
                          : conv.type === 'group' ? <Hash className="h-4 w-4 text-white opacity-70" />
                            : <span className="text-white font-semibold" style={{ fontSize: 12 }}>{ini(cName)}</span>}
                      </div>
                      {isOnline && <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />}
                      {!isOnline && isUnread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--bg-base)' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn('ss4-conv-name font-semibold truncate', isUnread && 'font-bold')} style={{ fontSize: 13 }}>{cName}</p>
                        <span style={{ fontSize: 9.5, color: 'var(--text-disabled)', flexShrink: 0 }}>{fmtRelative(conv.lastMessageAt || conv.lastMessage?.createdAt)}</span>
                      </div>
                      <p className="ss4-conv-preview truncate" style={{ fontSize: 11 }}>
                        {conv.lastMessage?.isDeleted ? 'Message deleted' : senderPfx + (conv.lastMessage?.content || (conv.lastMessage?.attachments?.length ? '📎 Attachment' : 'No messages yet'))}
                      </p>
                    </div>
                  </button>
                );
              };

              return (
                <div className="hidden lg:flex flex-1 overflow-y-auto ss4-scroll flex-col">

                  {/* ── Active team members avatars strip ── */}
                  <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Supra Space</p>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setShowModal({ open: true, tab: 'dm' })}
                          className="ss4-new-btn flex items-center gap-1.5 px-2.5 h-7" style={{ fontSize: 11, fontWeight: 600 }}>
                          <Plus className="h-3 w-3" /> Message
                        </button>
                        <button onClick={() => setShowModal({ open: true, tab: 'group' })}
                          className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-7" style={{ fontSize: 11, fontWeight: 600 }}>
                          <Hash className="h-3 w-3" /> Channel
                        </button>
                      </div>
                    </div>

                    {/* Avatar bubbles: online first, then rest — confirm before opening DM */}
                    <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ minHeight: 68 }}>
                      {[...onlineMembers, ...allTeam.filter(u => !onlineMembers.find(o => o._id === u._id))].map(user => {
                        const isOn = presence[user._id] === 'online';
                        return (
                          <button key={user._id}
                            onClick={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMemberCard({ member: { _id: user._id, fullName: user.fullName, username: user.username, avatar: user.avatar, role: user.role }, pos: { x: rect.left, y: rect.bottom + 8 } });
                            }}
                            className="flex flex-col items-center gap-1.5 shrink-0 min-w-0 transition-opacity hover:opacity-80">
                            <div className="relative">
                              <div className={cn('h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden shadow-sm', getAvaColor(user.fullName))} style={{ fontSize: 13 }}>
                                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : ini(user.fullName)}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-base)', boxShadow: '0 0 0 1.5px var(--bg-base)' }}>
                                <span className="h-2 w-2 rounded-full" style={{ background: isOn ? '#34c97d' : 'var(--text-disabled)' }} />
                              </span>
                            </div>
                            <span className="truncate w-12 text-center" style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>{user.fullName.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent */}
                  {recentConvos.length > 0 && (
                    <div className="pt-3 pb-1">
                      <div className="flex items-center justify-between px-4 mb-1.5">
                        <span className="ss4-section-label">Recent</span>
                      </div>
                      <div>
                        {recentConvos.map(conv => <ConvRow key={conv._id} conv={conv} />)}
                      </div>
                    </div>
                  )}

                  {/* Direct Messages */}
                  {dmConvos.length > 0 && (
                    <div className="pt-3 pb-1" style={{ borderTop: '1px solid var(--border-1)' }}>
                      <div className="flex items-center justify-between px-4 mb-1.5">
                        <span className="ss4-section-label">Direct Messages</span>
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}>{dmConvos.length}</span>
                      </div>
                      <div>
                        {dmConvos.map(conv => <ConvRow key={conv._id} conv={conv} />)}
                      </div>
                    </div>
                  )}

                  {/* Channels */}
                  {groupConvos.length > 0 && (
                    <div className="pt-3 pb-6" style={{ borderTop: '1px solid var(--border-1)' }}>
                      <div className="flex items-center justify-between px-4 mb-1.5">
                        <span className="ss4-section-label">Channels</span>
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}>{groupConvos.length}</span>
                      </div>
                      <div>
                        {groupConvos.map(conv => <ConvRow key={conv._id} conv={conv} />)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeId && activeConv && (
              <>
                {/* Chat header */}
                <div className="ss4-chat-header shrink-0 flex items-center gap-2.5 px-3 sm:px-4 py-3">
                  <button className="lg:hidden ss4-icon-btn h-8 w-8" onClick={() => { setActiveId(null); setShowInfo(false); setSideOpen(true); }} title="Back">
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <div className={cn('h-9 w-9 rounded-full flex items-center justify-center overflow-hidden', activeConv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(getConvName(activeConv, uid)))}>
                      {getConvAvatar(activeConv, uid)
                        ? <img src={getConvAvatar(activeConv, uid)} alt="" className="w-full h-full object-cover" />
                        : activeConv.type === 'group'
                          ? <Hash className="h-3.5 w-3.5 text-white opacity-70" />
                          : <span className="text-white font-semibold" style={{ fontSize: 11 }}>{ini(getConvName(activeConv, uid))}</span>}
                    </div>
                    {activeConv.type === 'direct' && (() => {
                      const o = activeConv.members.find(m => m._id !== uid);
                      return o && presence[o._id] === 'online'
                        ? <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ boxShadow: '0 0 0 2px var(--bg-elevated)' }} />
                        : null;
                    })()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="ss4-display font-bold leading-none truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                      {getConvName(activeConv, uid)}
                    </p>
                    <p className="mt-1 leading-none" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {activeConv.type === 'group'
                        ? `${activeConv.members.length} members`
                        : (() => {
                          const o = activeConv.members.find(m => m._id !== uid);
                          if (!o) return '';
                          return presence[o._id] === 'online'
                            ? <span style={{ color: 'var(--positive)' }}>● Active now</span>
                            : 'Offline';
                        })()}
                    </p>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1">
                    {pinnedMsgIds.size > 0 && (
                      <button
                        onClick={() => { setShowInfo(true); setInfoTab('pinned'); }}
                        className="flex items-center gap-1 px-2 h-7 rounded-lg transition-all"
                        style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid rgba(91,124,246,0.2)' }}
                        title="View pinned messages"
                      >
                        <Pin className="h-3 w-3" />
                        {pinnedMsgIds.size} pinned
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ss4-video-btn h-8 px-3 flex items-center gap-1.5" title="Start a call">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="font-semibold hidden sm:inline" style={{ fontSize: 11 }}>Call</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-2)' }}>
                        <DropdownMenuItem
                          className="gap-2 rounded-lg cursor-pointer text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                          onClick={() => setVideoCallConv(activeConv)}
                        >
                          <Video className="h-3.5 w-3.5" /> Video Call
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 rounded-lg cursor-pointer text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                          onClick={() => setVideoCallConv(activeConv)}
                        >
                          <Phone className="h-3.5 w-3.5" /> Voice Call
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      onClick={() => setShowInfo(v => !v)}
                      className={cn('ss4-icon-btn h-8 w-8', showInfo && 'ss4-video-btn')}
                      title="Conversation info"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Pin notification banner */}
                {pinBanner && (
                  <div className="shrink-0 mx-4 mb-1 px-3 py-2 rounded-xl flex items-center gap-2"
                    style={{ background: 'var(--accent-muted)', border: '1px solid rgba(91,124,246,0.25)', fontSize: 12, color: 'var(--accent-text)' }}>
                    <Pin className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{pinBanner}</span>
                    <button onClick={() => setPinBanner(null)} className="ss4-icon-btn h-5 w-5 shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-1.5 ss4-scroll">
                  {hasMore[activeId] && (
                    <div className="flex justify-center pb-3">
                      <button
                        onClick={loadMore}
                        className="font-medium transition-all px-4 py-1.5 rounded-full"
                        style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-hover)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-text)'; e.currentTarget.style.background = 'var(--accent-muted)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      >
                        {loadingMsgs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '↑ Load earlier messages'}
                      </button>
                    </div>
                  )}

                  {loadingMsgs && activeMsgs.length === 0 && (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}

                  {(() => {
                    const sysForConv = systemEvents.filter(e => e.convId === activeId);
                    type Item = { kind: 'msg'; data: SSMessage } | { kind: 'sys'; id: string; text: string; ts: string };
                    const items: Item[] = [
                      ...activeMsgs.map(m => ({ kind: 'msg' as const, data: m })),
                      ...sysForConv.map(e => ({ kind: 'sys' as const, id: e.id, text: e.text, ts: e.ts })),
                    ].sort((a, b) => new Date(a.kind === 'msg' ? a.data.createdAt : a.ts).getTime() - new Date(b.kind === 'msg' ? b.data.createdAt : b.ts).getTime());

                    return items.map((item, i) => {
                      if (item.kind === 'sys') {
                        return (
                          <div key={item.id} className="flex items-center justify-center py-1 px-6">
                            <span className="px-3 py-1 rounded-full text-center" style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-1)' }}>
                              {item.text}
                            </span>
                          </div>
                        );
                      }
                      const msg = item.data;
                      const prevItem = items[i - 1];
                      const prevMsg = prevItem?.kind === 'msg' ? prevItem.data : null;
                      const showDate = !prevMsg || fmtDate(msg.createdAt) !== fmtDate(prevMsg.createdAt);
                      const showAvatar = !prevMsg || prevMsg.sender._id !== msg.sender._id || showDate;
                      return (
                        <React.Fragment key={msg._id}>
                          {showDate && <DateSep date={msg.createdAt} />}
                          <div id={`ss4-msg-${msg._id}`}>
                            <Bubble message={msg} isOwn={msg.sender._id === uid} showAvatar={showAvatar} onReply={setReplyTo} onDelete={handleDelete} onPin={handlePinToggle} isPinned={pinnedMsgIds.has(msg._id)} onOpenMedia={setLightbox} />
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}

                  {/* Typing indicator */}
                  {typers.length > 0 && (
                    <div className="flex gap-2.5 px-5 py-1">
                      <div className="w-8" />
                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bubble-other-bg)', border: '1px solid var(--bubble-other-border)' }}>
                        <span className="italic" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {typers.map(t => t.fullName).join(', ')} {typers.length === 1 ? 'is' : 'are'} typing
                        </span>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="ss4-typing-dot h-1.5 w-1.5 rounded-full"
                              style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>

                {/* ── Input area ── */}
                <div className="shrink-0 px-3 sm:px-4 pb-2 pt-2 space-y-1.5 ss4-input-safe">
                  {/* Reply bar */}
                  {replyTo && (
                    <div className="ss4-reply-bar flex items-center gap-2 px-3 py-2.5">
                      <Reply className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>
                          {replyTo.sender.fullName}
                        </p>
                        <p className="truncate mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {replyTo.content || '📎 Attachment'}
                        </p>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="ss4-icon-btn p-1 h-6 w-6">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {pendingFiles.length > 0 && (
                    <div className="ss4-reply-bar flex flex-col gap-2 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold" style={{ fontSize: 11, color: 'var(--accent-text)' }}>
                          {pendingFiles.length} attachment{pendingFiles.length === 1 ? '' : 's'} ready
                        </p>
                        <button type="button" onClick={() => setPendingFiles([])} className="ss4-icon-btn h-6 px-2" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          Clear all
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                        {pendingFiles.map((file, index) => (
                          <FilePreviewItem key={`${file.name}-${file.size}-${index}`} file={file} onRemove={() => removePendingFile(index)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input wrapper */}
                  {activeConv?.name === 'Online Team Report' ? (
                    <div className="ss4-input-wrap flex items-center justify-center gap-2 px-4 py-3" style={{ minHeight: 56 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                        Read-only · DayPulse reports are posted here automatically
                      </span>
                    </div>
                  ) : (
                    <div className="ss4-input-wrap flex flex-col">
                      <div className="flex items-end gap-2 px-3.5 pt-3 pb-2">
                        <textarea
                          value={input}
                          onChange={handleTyping}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                          }}
                          placeholder="Message..."
                          rows={1}
                          className="flex-1 resize-none bg-transparent text-sm focus:outline-none max-h-36 min-h-7 py-0.5"
                          style={{ fontFamily: 'Geist, sans-serif', lineHeight: '1.55', color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
                        />
                      </div>

                      {/* Toolbar */}
                      <div className="flex items-center justify-between px-3 pb-2.5 pt-1.5" style={{ borderTop: '1px solid var(--border-1)' }}>
                        <div className="flex items-center gap-1">
                          {/* Attach */}
                          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || sending} className="ss4-icon-btn h-7 w-7" title="Attach files">
                            {uploading
                              ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
                              : <Paperclip className="h-4 w-4" />}
                          </button>
                          <input
                            id="ss4-file-upload"
                            ref={fileRef}
                            type="file"
                            multiple
                            accept="*/*"
                            className="sr-only"
                            onChange={e => {
                              const selected = e.target.files;
                              void handleUpload(selected);
                              e.currentTarget.value = '';
                            }}
                          />

                          {/* Emoji */}
                          <div className="relative" ref={emojiRef}>
                            <button
                              type="button"
                              onClick={() => setEmojiOpen(v => !v)}
                              className="ss4-icon-btn h-7 w-7"
                              title="Emoji"
                            >
                              <Smile className="h-4 w-4" />
                            </button>
                            {emojiOpen && (
                              <div className="absolute bottom-full left-0 mb-2 z-50" style={{ boxShadow: 'var(--shadow-lg)' }}>
                                <EmojiPicker
                                  theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                  onEmojiClick={(data: EmojiClickData) => { setInput(prev => prev + data.emoji); setEmojiOpen(false); }}
                                  height={380}
                                  width={320}
                                  searchPlaceholder="Search emoji..."
                                  lazyLoadEmojis
                                />
                              </div>
                            )}
                          </div>

                          {/* Supra Leo AI */}
                          <div className="relative" ref={supraLeoRef}>
                            <button
                              onClick={() => !supraLeoLoading && setSupraLeoOpen(v => !v)}
                              disabled={supraLeoLoading}
                              className="ss4-ai-btn h-7 px-2.5 flex items-center gap-1.5"
                              title="Supra Leo AI"
                            >
                              {supraLeoLoading
                                ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: '#b49dff' }} />
                                : <Sparkles className="h-3 w-3" style={{ color: '#b49dff' }} />}
                              <span className="ss4-ai-text font-semibold" style={{ fontSize: 11 }}>Supra Leo</span>
                            </button>

                            {supraLeoOpen && (
                              <div
                                className="absolute bottom-full left-0 mb-2 z-50 rounded-xl overflow-hidden shadow-lg"
                                style={{
                                  background: 'var(--surface-2)',
                                  border: '1px solid var(--border-2)',
                                  minWidth: 190,
                                  boxShadow: 'var(--shadow-md)',
                                }}
                              >
                                <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-1)' }}>
                                  <p className="font-semibold" style={{ fontSize: 10, color: '#b49dff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Supra Leo AI
                                  </p>
                                </div>
                                <div className="py-1">
                                  {input.trim() ? (
                                    <>
                                      <button
                                        onClick={() => handleSupraLeoAction('improve')}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-(--bg-hover)"
                                        style={{ fontSize: 12, color: 'var(--text-primary)' }}
                                      >
                                        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: '#b49dff' }} />
                                        Improve draft
                                      </button>
                                      <button
                                        onClick={() => handleSupraLeoAction('formal')}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-(--bg-hover)"
                                        style={{ fontSize: 12, color: 'var(--text-primary)' }}
                                      >
                                        <Bot className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                                        Make formal
                                      </button>
                                      <button
                                        onClick={() => handleSupraLeoAction('casual')}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-(--bg-hover)"
                                        style={{ fontSize: 12, color: 'var(--text-primary)' }}
                                      >
                                        <Bot className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                                        Make casual
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleSupraLeoAction('draft')}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-(--bg-hover)"
                                      style={{ fontSize: 12, color: 'var(--text-primary)' }}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: '#b49dff' }} />
                                      Draft a reply
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {uploadNotice && (
                            <span
                              className="max-w-50 truncate ss4-mono"
                              style={{
                                fontSize: 10,
                                color: uploadNotice.kind === 'error'
                                  ? 'var(--danger)'
                                  : uploadNotice.kind === 'success'
                                    ? 'var(--positive)'
                                    : 'var(--text-tertiary)',
                              }}
                            >
                              {uploadNotice.text}
                            </span>
                          )}
                          <span className="ss4-mono" style={{ fontSize: 10, color: 'var(--text-disabled)' }}>⏎ Send</span>
                          <button onClick={handleSend} disabled={(!input.trim() && pendingFiles.length === 0) || sending || uploading} className="ss4-send-btn h-7 w-7 flex items-center justify-center">
                            {(sending || uploading)
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#fff' }} />
                              : <Send className="h-3.5 w-3.5" style={{ color: '#fff', opacity: (input.trim() || pendingFiles.length > 0) ? 1 : 0.5 }} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>{/* end inner chat column */}

          {/* ── Info Panel ── */}
          {showInfo && activeId && activeConv && (() => {
            const mediaAttachments = activeMsgs.flatMap(m => m.attachments.filter(a => a.mimeType.startsWith('image/')));
            const fileAttachments = activeMsgs.flatMap(m => m.attachments.filter(a => !a.mimeType.startsWith('image/')));
            const pinnedMessages = activeMsgs.filter(m => pinnedMsgIds.has(m._id));
            const convName = gcNameInput || getConvName(activeConv, uid);
            const otherMember = activeConv.type === 'direct' ? activeConv.members.find(m => m._id !== uid) : null;
            const isOtherOnline = otherMember ? presence[otherMember._id] === 'online' : false;
            return (
              <div className="ss4-sidebar flex flex-col overflow-hidden absolute inset-0 z-30 lg:relative lg:inset-auto lg:z-auto lg:shrink-0 lg:w-72" style={{ borderLeft: '1px solid var(--sidebar-border)' }}>

                {/* ── Profile hero ── */}
                <div className="shrink-0 flex flex-col items-center gap-2 px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-1)' }}>
                  <div className="flex items-center justify-between w-full mb-1">
                    <button onClick={() => setShowInfo(false)} className="lg:hidden ss4-icon-btn h-7 w-7 flex items-center gap-1" style={{ fontSize: 12 }}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 lg:flex-none" />
                    <button onClick={() => setShowInfo(false)} className="ss4-icon-btn h-6 w-6"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="relative group/ava">
                    <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg', activeConv.type === 'group' ? 'ss4-ava-purple' : getAvaColor(convName))}>
                      {getConvAvatar(activeConv, uid)
                        ? <img src={getConvAvatar(activeConv, uid)} alt="" className="w-full h-full object-cover" />
                        : activeConv.type === 'group' ? <Hash className="h-7 w-7 text-white opacity-80" />
                          : <span className="text-white font-bold" style={{ fontSize: 22 }}>{ini(convName)}</span>}
                    </div>
                    {activeConv.type === 'group' && (
                      <>
                        <button onClick={() => avatarFileRef.current?.click()}
                          className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover/ava:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.5)' }} title="Change photo">
                          <ImageIcon className="h-5 w-5 text-white" />
                        </button>
                        <input ref={avatarFileRef} type="file" accept="image/*" className="sr-only"
                          onChange={e => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const rawUrl = URL.createObjectURL(file);
                            const img = new window.Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              canvas.width = 400; canvas.height = 400;
                              const ctx = canvas.getContext('2d');
                              if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 400, 400); ctx.drawImage(img, 0, 0, 400, 400); }
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                              URL.revokeObjectURL(rawUrl);
                              setConvos(prev => prev.map(c => c._id === activeConv._id ? { ...c, avatar: dataUrl } : c));
                              addSystemEvent(activeConv._id, '📷 Channel photo updated');
                              canvas.toBlob(blob => {
                                if (!blob) return;
                                const fd = new FormData(); fd.append('avatar', blob, 'avatar.jpg');
                                apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, fd, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                              }, 'image/jpeg', 0.9);
                            };
                            img.src = rawUrl;
                            e.target.value = '';
                          }}
                        />
                      </>
                    )}
                  </div>

                  {editingGcName ? (
                    <div className="flex items-center gap-1.5 w-full mt-1">
                      <input value={gcNameInput} onChange={e => setGcNameInput(e.target.value)} autoFocus
                        className="ss4-search-input flex-1 px-2 py-1 text-center" style={{ fontSize: 14, fontWeight: 700 }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (gcNameInput.trim() && activeConv) {
                              setConvos(prev => prev.map(c => c._id === activeConv._id ? { ...c, name: gcNameInput.trim() } : c));
                              addSystemEvent(activeConv._id, `✏️ Channel renamed to "${gcNameInput.trim()}"`);
                              try { apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, { name: gcNameInput.trim() }, { headers: { Authorization: `Bearer ${token}` } }); } catch { /* ignore */ }
                            }
                            setEditingGcName(false);
                          }
                          if (e.key === 'Escape') { setGcNameInput(''); setEditingGcName(false); }
                        }} />
                      <button onClick={() => {
                        if (gcNameInput.trim() && activeConv) {
                          setConvos(prev => prev.map(c => c._id === activeConv._id ? { ...c, name: gcNameInput.trim() } : c));
                          addSystemEvent(activeConv._id, `✏️ Channel renamed to "${gcNameInput.trim()}"`);
                          try { apiClient.patch(`/api/supraspace/conversations/${activeConv._id}`, { name: gcNameInput.trim() }, { headers: { Authorization: `Bearer ${token}` } }); } catch { /* ignore */ }
                        }
                        setEditingGcName(false);
                      }} className="ss4-send-btn h-7 w-7 flex items-center justify-center shrink-0">
                        <CheckIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="ss4-display font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>{convName}</p>
                      {activeConv.type === 'group' && (
                        <button onClick={() => { setGcNameInput(gcNameInput || getConvName(activeConv, uid)); setEditingGcName(true); }} className="ss4-icon-btn h-5 w-5">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: activeConv.type === 'direct' && isOtherOnline ? 'var(--positive)' : 'var(--text-tertiary)' }}>
                    {activeConv.type === 'group' ? `${activeConv.members.length} members` : isOtherOnline ? '● Active now' : 'Offline'}
                  </p>
                </div>

                {/* ── Tabs ── */}
                <div className="shrink-0 flex" style={{ borderBottom: '1px solid var(--border-1)' }}>
                  {(['members', 'media', 'files', 'pinned'] as const).map(tab => (
                    <button key={tab} onClick={() => setInfoTab(tab)}
                      className="flex-1 py-2.5 font-semibold transition-all capitalize relative"
                      style={{ fontSize: 10.5, color: infoTab === tab ? 'var(--accent)' : 'var(--text-tertiary)', borderBottom: infoTab === tab ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1 }}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'pinned' && pinnedMessages.length > 0 && <span className="ml-1 ss4-badge inline-flex items-center" style={{ borderRadius: 8, verticalAlign: 'middle' }}>{pinnedMessages.length}</span>}
                    </button>
                  ))}
                </div>

                {/* ── Tab content ── */}
                <div className="flex-1 overflow-y-auto ss4-scroll">

                  {/* Members */}
                  {infoTab === 'members' && (
                    <div className="py-2">
                      {activeConv.members.map(member => {
                        const isOnline = presence[member._id] === 'online';
                        const isMe = member._id === uid;
                        return (
                          <button key={member._id}
                            onClick={e => { if (isMe) return; setMemberCard({ member, pos: { x: e.clientX, y: e.clientY } }); }}
                            className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors', !isMe && 'cursor-pointer')}
                            style={{ cursor: isMe ? 'default' : 'pointer' }}
                            onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                            <div className="relative shrink-0">
                              <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden', getAvaColor(member.fullName))} style={{ fontSize: 12 }}>
                                {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : ini(member.fullName)}
                              </div>
                              {isOnline && <span className="ss4-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                {member.fullName}{isMe && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 11 }}> (you)</span>}
                              </p>
                              <p style={{ fontSize: 10, color: isOnline ? 'var(--positive)' : 'var(--text-tertiary)' }}>
                                {isOnline ? '● Active now' : member.role || 'Offline'}
                              </p>
                            </div>
                            {activeConv.admins?.includes(member._id) && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid rgba(91,124,246,0.2)', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Admin</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Media */}
                  {infoTab === 'media' && (
                    <div className="p-3">
                      {mediaAttachments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <ImageIcon className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
                          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No photos or videos</p>
                          <p style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center' }}>Images and videos sent in this conversation will appear here</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          {mediaAttachments.map((att, i) => {
                            const isVid = isVideoAttachment(att);
                            return (
                              <button key={i} onClick={() => setLightbox({ src: att.url, type: isVid ? 'video' : 'image', name: att.originalName })}
                                className="relative aspect-square rounded-xl overflow-hidden cursor-zoom-in group" style={{ background: 'var(--bg-hover)' }}>
                                {isVid
                                  ? <video src={att.url} className="w-full h-full object-cover" muted />
                                  : <img src={att.thumbnailUrl || att.url} alt={att.originalName} className="w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                  {isVid && <div className="h-7 w-7 rounded-full bg-black/50 flex items-center justify-center"><Video className="h-3.5 w-3.5 text-white" /></div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Files */}
                  {infoTab === 'files' && (
                    <div className="py-2">
                      {fileAttachments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <FileText className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
                          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No files shared</p>
                          <p style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center' }}>Files and documents sent here will appear in this tab</p>
                        </div>
                      ) : (
                        fileAttachments.map((att, i) => (
                          <a key={i} href={att.url} download={att.originalName}
                            className="flex items-center gap-3 px-4 py-3 no-underline transition-colors"
                            style={{ borderBottom: '1px solid var(--border-1)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(91,124,246,0.2)' }}>
                              <FileText className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{att.originalName}</p>
                              <p className="ss4-mono mt-0.5" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtSize(att.size)}</p>
                            </div>
                            <Download className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                          </a>
                        ))
                      )}
                    </div>
                  )}

                  {/* Pinned */}
                  {infoTab === 'pinned' && (
                    <div className="py-2">
                      {pinnedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <Pin className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
                          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No pinned messages</p>
                          <p style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center' }}>Hover any message and click 📌 to pin it here</p>
                        </div>
                      ) : (
                        pinnedMessages.map(msg => (
                          <button key={msg._id}
                            onClick={() => {
                              setShowInfo(false);
                              setTimeout(() => {
                                document.getElementById(`ss4-msg-${msg._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 150);
                            }}
                            className="w-full text-left px-4 py-3 transition-colors"
                            style={{ borderBottom: '1px solid var(--border-1)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-white font-semibold shrink-0', getAvaColor(msg.sender.fullName))} style={{ fontSize: 8 }}>
                                  {ini(msg.sender.fullName)}
                                </div>
                                <span className="font-semibold truncate" style={{ fontSize: 11, color: 'var(--accent-text)' }}>{msg.sender.fullName}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="ss4-mono" style={{ fontSize: 9, color: 'var(--text-disabled)' }}>{fmtTime(msg.createdAt)}</span>
                                <button onClick={e => { e.stopPropagation(); handlePinToggle(msg._id); }} className="ss4-icon-btn h-5 w-5" title="Unpin">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="leading-relaxed line-clamp-3" style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.content || (msg.attachments?.length ? '📎 Attachment' : '')}
                            </p>
                            <p className="mt-1.5" style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>Click to jump →</p>
                          </button>
                        ))
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
        <NewConvModal users={allUsers} defaultTab={showModal.tab} onClose={() => setShowModal({ open: false, tab: 'dm' })} onStartDM={handleDM} onCreateGroup={handleGroup} />
      )}
      {videoCallConv && (
        <VideoCallModal
          conv={videoCallConv}
          uid={uid}
          allUsers={allUsers}
          token={token}
          onClose={() => setVideoCallConv(null)}
        />
      )}

      {/* ── Member profile mini-card ── */}
      {memberCard && (() => {
        const { member, pos } = memberCard;
        const isOnline = presence[member._id] === 'online';
        const existing = convos.find(c => c.type === 'direct' && c.members.some(m => m._id === member._id));
        const cardX = Math.min(pos.x, window.innerWidth - 220);
        const cardY = Math.min(pos.y, window.innerHeight - 200);
        return (
          <div id="ss4-member-card" className="fixed z-150 rounded-2xl overflow-hidden" style={{ left: cardX, top: cardY, width: 200, background: 'var(--bg-elevated)', border: '1px solid var(--border-2)', boxShadow: 'var(--shadow-lg)' }}>
            {/* Banner */}
            <div className={cn('h-14 w-full', getAvaColor(member.fullName))} style={{ background: 'linear-gradient(135deg, rgba(91,124,246,0.6), rgba(120,80,220,0.4))' }} />
            {/* Avatar */}
            <div className="relative px-4 -mt-6 pb-3">
              <div className={cn('h-12 w-12 rounded-full border-4 flex items-center justify-center overflow-hidden text-white font-bold', getAvaColor(member.fullName))} style={{ borderColor: 'var(--bg-elevated)', fontSize: 14 }}>
                {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : ini(member.fullName)}
              </div>
              {isOnline && <span className="absolute top-4 left-10 h-3 w-3 rounded-full ss4-online-dot border-2" style={{ borderColor: 'var(--bg-elevated)' }} />}
              <div className="mt-2">
                <p className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{member.fullName}</p>
                <p style={{ fontSize: 10, color: isOnline ? 'var(--positive)' : 'var(--text-tertiary)', marginTop: 2 }}>
                  {isOnline ? '● Active now' : 'Offline'} {member.role ? `· ${member.role}` : ''}
                </p>
              </div>
              <button
                onClick={() => { setMemberCard(null); if (existing) { setActiveId(existing._id); setShowInfo(false); } else handleDM(member._id); }}
                className="ss4-send-btn w-full mt-3 h-8 flex items-center justify-center gap-1.5 font-semibold"
                style={{ fontSize: 12 }}>
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Lightbox ── */}
      {lightbox && <LightboxModal src={lightbox.src} type={lightbox.type} name={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  );
}