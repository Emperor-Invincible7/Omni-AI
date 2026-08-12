'use client';

import { useUI } from '@/lib/ui-context';
import { useProviders } from '@/lib/provider-context';
import OmniLogo from './OmniLogo';
import {
  MessageSquare,
  Folder,
  Settings,
  Layers,
} from 'lucide-react';
import ModelSwitcher from './ModelSwitcher';
import NewChatButton from './NewChatButton';
import SessionList from './SessionList';
import clsx from 'clsx';

interface DockProps {
  position: 'top' | 'bottom';
  onNewChat?: (id: string) => void;
}

const TOP_NAV = [
  { id: 'chat',    label: 'CHAT',    icon: MessageSquare },
  { id: 'library', label: 'LIBRARY', icon: Folder },
  { id: 'agents',  label: 'AGENTS',  icon: Layers },
  { id: 'settings',label: 'CONFIG',  icon: Settings },
] as const;

export default function Dock({ position, onNewChat }: DockProps) {
  const { activeNav, setActiveNav, togglePanel } = useUI();
  const { activeProvider, activeModel, openSettings } = useProviders();

  if (position === 'top') {
    return (
      <header
        className="flex items-stretch border-b border-white/20 bg-black"
        role="banner"
      >
        {/* Brand block */}
        <div className="flex items-center gap-3 px-5 py-3 border-r border-white/20 min-w-[260px]">
          <OmniLogo size={20} className="text-white" />
          <div className="leading-none">
            <div className="text-[15px] font-bold tracking-[0.18em] uppercase">Omni-AI</div>
            <div className="font-mono text-[10px] text-[#A3A3A3] tracking-[0.18em] mt-1">
              v0.2 · RUNTIME
            </div>
          </div>
        </div>

        {/* Primary nav cells */}
        <nav className="flex items-stretch flex-1" aria-label="Primary">
          {TOP_NAV.map((n, i) => {
            const Icon = n.icon;
            const active = activeNav === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setActiveNav(n.id)}
                className={clsx(
                  'px-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase border-r border-white/20 transition-colors',
                  active
                    ? 'bg-white text-black'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#0A0A0A]',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={13} />
                <span>{n.label}</span>
                <span className="font-mono text-[9px] opacity-60 ml-1">
                  0{i + 1}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right cluster: NEW CHAT + history + model + settings */}
        <div className="flex items-stretch border-l border-white/20">
          <div className="px-3 py-2 flex items-center border-r border-white/20">
            <NewChatButton onCreated={onNewChat} />
          </div>
          <div className="px-3 py-2 flex items-center border-r border-white/20">
            <SessionList />
          </div>
          <div className="px-3 flex items-center border-r border-white/20">
            <ModelSwitcher />
          </div>
          <button
            onClick={() => openSettings()}
            className="px-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[#A3A3A3] hover:text-white border-r border-white/20"
            aria-label="Provider settings"
            title="Provider settings"
          >
            <Settings size={13} />
            <span>KEYS</span>
          </button>
          <button
            onClick={togglePanel}
            className="px-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[#A3A3A3] hover:text-white"
            title="Toggle operations panel"
          >
            <Layers size={13} />
            <span>PANEL</span>
          </button>
        </div>
      </header>
    );
  }

  // Bottom dock: thin status row
  return (
    <footer
      className="flex items-center justify-between border-t border-white/20 bg-black px-4 h-8 font-mono text-[10px] tracking-[0.18em] uppercase text-[#A3A3A3]"
      role="contentinfo"
    >
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-white animate-dot-pulse" />
          SESSION_LIVE
        </span>
        <span className="text-[#525252]">·</span>
        <span>PROVIDER :: {activeProvider.toUpperCase()}</span>
        <span className="text-[#525252]">·</span>
        <span>MODEL :: {activeModel.toUpperCase()}</span>
      </div>

      <div className="flex items-center gap-5">
        <span>CTX 23.6%</span>
        <span className="text-[#525252]">·</span>
        <span>47,231 / 200K</span>
        <span className="text-[#525252]">·</span>
        <span className="text-white">● READY</span>
      </div>
    </footer>
  );
}