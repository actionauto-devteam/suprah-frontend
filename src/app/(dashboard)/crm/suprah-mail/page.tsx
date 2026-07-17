'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Check as CheckIcon, Inbox, LogOut, Mail, MessageSquare, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useMailRealtime } from '@/hooks/useMailRealtime';

import { ensureMailStyles } from '@/components/suprah-mail/theme';
import { ConnectGmailScreen } from '@/components/suprah-mail/Shared';
import { InboxTab } from '@/components/suprah-mail/InboxTab';
import { ConversationTab } from '@/components/suprah-mail/ConversationTab';
import { getErrorMessage, getJwtType } from '@/components/suprah-mail/utils';
import type { ConvPushPayload, MailStatus } from '@/components/suprah-mail/types';

/* ────────────────────────────────────────────────────────────────────────────
   Suprah Mail — Inbox (Gmail mirror) + Conversation (email-powered chat).
   Visual language mirrors Suprah Space's ss4 system with an "sm5" scope so
   the page is self-contained regardless of visit order.
──────────────────────────────────────────────────────────────────────────── */

ensureMailStyles();

/* ── Loading splash ────────────────────────────────────────────────────── */

function LoadingSplash({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <div className="sm5 flex items-center justify-center h-full w-full" data-theme={theme} style={{ minHeight: 320 }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(140deg,#16a34a,#34c97d)', boxShadow: '0 4px 16px rgba(52,201,125,0.25)' }}
        >
          <Mail className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="sm5-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
            Suprah <span style={{ color: 'var(--accent)' }}>Mail</span>
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Every Email. Every Conversation. One Hub.</p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="sm5-dot h-1.5 w-1.5 rounded-full inline-block"
                style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function SuprahMailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { getToken: getMainToken } = useAuth();
  const getMainTokenRef = React.useRef(getMainToken);
  getMainTokenRef.current = getMainToken;

  const [token, setToken] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'inbox' | 'conversation'>('inbox');
  const [status, setStatus] = React.useState<MailStatus | null>(null);
  const [connecting, setConnecting] = React.useState(false);

  // Cross-tab realtime plumbing.
  const [inboxRefreshSignal, setInboxRefreshSignal] = React.useState(0);
  const [convPush, setConvPush] = React.useState<ConvPushPayload | null>(null);
  const [convUnreadBump, setConvUnreadBump] = React.useState(0);

  /* ── CRM token bootstrap (same flow as Suprah Space) ── */
  React.useEffect(() => {
    (async () => {
      let t = localStorage.getItem('crm_token');
      if (t && getJwtType(t) !== 'crm') { localStorage.removeItem('crm_token'); t = null; }
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
      if (!t) { router.replace('/crm'); return; }
      setToken(t);
      try {
        const r = await apiClient.get('/api/mail/status', { headers: { Authorization: `Bearer ${t}` } });
        setStatus(r.data?.data);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('crm_token');
          router.replace('/crm');
          return;
        }
        setStatus({ connected: false, gmailAddress: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  /* ── OAuth redirect outcome (?mail=connected|denied|error) ── */
  const mailParam = searchParams.get('mail');
  React.useEffect(() => {
    if (!mailParam) return;
    if (mailParam === 'connected') toast.success('Gmail connected — syncing your inbox now');
    else if (mailParam === 'denied') toast.error('Google access was denied. Connect Gmail to use Suprah Mail.');
    else toast.error('Gmail connection failed. Please try again.');
    router.replace('/crm/suprah-mail', { scroll: false });
    if (mailParam === 'connected' && token) {
      apiClient.get('/api/mail/status', { headers: { Authorization: `Bearer ${token}` } })
        .then((r: any) => setStatus(r.data?.data))
        .catch(() => { });
    }
  }, [mailParam, token, router]);

  /* ── Realtime ── */
  const { connected: socketConnected } = useMailRealtime(token || null, {
    onInboxUpdate: () => setInboxRefreshSignal((n) => n + 1),
    onConversationMessage: (p) => {
      setConvPush({ conversationId: p.conversationId, message: p.message });
      if (p.message?.direction === 'inbound') setConvUnreadBump((n) => n + 1);
    },
  });

  // Inbox safety-net polling when the socket is down.
  React.useEffect(() => {
    if (socketConnected || !status?.connected) return;
    const t = setInterval(() => setInboxRefreshSignal((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [socketConnected, status?.connected]);

  /* ── Connect / disconnect ── */

  const handleConnect = async () => {
    if (!token) return;
    setConnecting(true);
    try {
      const r = await apiClient.get('/api/mail/connect', { headers: { Authorization: `Bearer ${token}` } });
      const url = r.data?.data?.url;
      if (url) window.location.href = url;
      else throw new Error('No authorization URL returned');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not start the Gmail connection.'));
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    try {
      await apiClient.post('/api/mail/disconnect', {}, { headers: { Authorization: `Bearer ${token}` } });
      setStatus({ connected: false, gmailAddress: null });
      toast.success('Gmail disconnected');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not disconnect.'));
    }
  };

  if (loading) return <LoadingSplash theme={theme} />;

  const tabButtons = (fluid: boolean) => (
    <div className={cn('sm5-tab-bar gap-1', fluid ? 'flex w-full' : 'inline-flex')}>
      <button
        onClick={() => setTab('inbox')}
        className={cn('sm5-tab h-8 px-4 flex items-center justify-center gap-2', fluid && 'flex-1', tab === 'inbox' && 'sm5-tab-active')}
        style={{ fontSize: 12 }}
      >
        <Inbox className="h-3.5 w-3.5" /> Inbox
      </button>
      <button
        onClick={() => { setTab('conversation'); setConvUnreadBump(0); }}
        className={cn('sm5-tab h-8 px-4 flex items-center justify-center gap-2 relative', fluid && 'flex-1', tab === 'conversation' && 'sm5-tab-active')}
        style={{ fontSize: 12 }}
      >
        <MessageSquare className="h-3.5 w-3.5" /> Chat
        {tab !== 'conversation' && convUnreadBump > 0 && (
          <span
            className="rounded-full text-white font-bold"
            style={{ fontSize: 9, minWidth: 15, height: 15, lineHeight: '15px', padding: '0 3px', background: 'var(--accent)' }}
          >
            {convUnreadBump > 9 ? '9+' : convUnreadBump}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <div className="sm5 relative flex h-full min-h-0 w-full flex-col overflow-hidden" data-theme={theme} style={{ minHeight: '100%' }}>
      {/* Header — one row; everything stays in normal flow so nothing can overlap */}
      <header className="sm5-topbar shrink-0 z-30">
        <div className="flex items-center gap-3 px-3 sm:px-4" style={{ height: 56 }}>
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div
              className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(140deg,#16a34a,#34c97d)', boxShadow: '0 0 0 1px rgba(52,201,125,0.3), 0 4px 16px rgba(52,201,125,0.25)' }}
            >
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <p className="sm5-display font-bold whitespace-nowrap" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  Suprah <span style={{ color: 'var(--accent)' }}>Mail</span>
                </p>
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: socketConnected ? 'var(--accent)' : 'var(--text-disabled)', boxShadow: socketConnected ? '0 0 6px rgba(52,201,125,0.7)' : 'none' }}
                />
                {socketConnected && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>Live</span>
                )}
              </div>
              <p className="leading-none mt-1 font-medium truncate hidden md:block" style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
                Every Email. Every Conversation. One Hub.
              </p>
            </div>
          </div>

          {/* Tabs — inline in the same row from sm up */}
          {status?.connected && <div className="hidden sm:block shrink-0 ml-2">{tabButtons(false)}</div>}

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {status?.connected && (
              <>
                <div
                  className="hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-lg"
                  style={{ background: 'var(--accent-muted)', border: '1px solid rgba(52,201,125,0.2)' }}
                  title={status.lastSyncError ? `Last sync issue: ${status.lastSyncError}` : 'Gmail connected'}
                >
                  {status.lastSyncError
                    ? <AlertCircle className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
                    : <CheckIcon className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />}
                  <span className="font-semibold truncate" style={{ fontSize: 11, color: 'var(--accent-text)', maxWidth: 180 }}>
                    {status.gmailAddress}
                  </span>
                </div>
                <button onClick={handleDisconnect} className="sm5-icon-btn h-8 w-8" title="Disconnect Gmail">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="sm5-icon-btn h-8 w-8"
              style={{ border: '1px solid var(--border-2)' }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Tabs — full-width segmented row on mobile only, still in normal flow */}
        {status?.connected && (
          <div className="sm:hidden px-3 pb-2.5">{tabButtons(true)}</div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
        {!status?.connected && <ConnectGmailScreen connecting={connecting} onConnect={handleConnect} />}
        {status?.connected && tab === 'inbox' && (
          <InboxTab
            token={token}
            theme={theme}
            refreshSignal={inboxRefreshSignal}
            onGlobalRefreshHandled={() => { }}
          />
        )}
        {status?.connected && tab === 'conversation' && (
          <ConversationTab
            token={token}
            convPush={convPush}
            onConvPushHandled={() => setConvPush(null)}
          />
        )}
      </div>
    </div>
  );
}