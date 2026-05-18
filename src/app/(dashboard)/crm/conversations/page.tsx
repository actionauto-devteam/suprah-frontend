'use client';

import * as React from 'react';
import { MessageSquare, Mail, Radio } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { injectSS4Styles } from '@/lib/ss4-styles';
import { cn } from '@/lib/utils';
import { LeadsTab } from '@/components/LeadsTab';
import SupraSpacePage from '../supra-space/page';

injectSS4Styles();

type ActiveTab = 'leads' | 'team';

export default function CommsPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('leads');

  return (
    <div className={cn('ss4 flex flex-col h-full overflow-hidden')} data-theme={theme}>

      {/* ── Top tab bar ── */}
      <header className="ss4-topbar shrink-0 z-40" style={{ height: 48 }}>
        <div className="flex items-center justify-between h-full px-4 gap-4">

          {/* Left: logo + title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-7 w-7 ss4-logo-mark flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5" style={{ color: '#fff' }} />
            </div>
            <div>
              <p className="ss4-display font-bold leading-none" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                Supra Space
              </p>
              <p className="leading-none mt-0.5 font-medium" style={{ fontSize: 8, letterSpacing: '0.18em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Team &amp; Leads
              </p>
            </div>
          </div>

          {/* Center: tab switcher */}
          <div className="ss4-tab-bar flex gap-0.5 shrink-0">
            <button
              onClick={() => setActiveTab('leads')}
              className={cn('ss4-tab flex items-center gap-1.5 px-4 py-1.5', activeTab === 'leads' && 'ss4-tab-active')}
            >
              <Mail className="h-3 w-3" />
              Lead Inbox
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={cn('ss4-tab flex items-center gap-1.5 px-4 py-1.5', activeTab === 'team' && 'ss4-tab-active')}
            >
              <Radio className="h-3 w-3" />
              Supra Space
            </button>
          </div>

          {/* Spacer so tab bar stays centered */}
          <div className="w-7 shrink-0" />
        </div>
      </header>

      {/* ── Content area — both mounted to preserve socket state ── */}
      <div className="flex-1 overflow-hidden relative">
        <div className={cn('absolute inset-0', activeTab === 'leads' ? 'flex flex-col' : 'hidden')}>
          <LeadsTab />
        </div>
        <div className={cn('absolute inset-0', activeTab === 'team' ? 'flex flex-col' : 'hidden')}>
          <SupraSpacePage embedded />
        </div>
      </div>
    </div>
  );
}
