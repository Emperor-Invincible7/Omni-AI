'use client';

import { useState } from 'react';
import { ThemeProvider } from '@/lib/theme-context';
import { UIProvider } from '@/lib/ui-context';
import { ProviderContextProvider } from '@/lib/provider-context';
import { SessionProvider } from '@/lib/session-context';
import ChatCanvas from '@/components/ChatCanvas';
import InputBar from '@/components/InputBar';
import SettingsModal from '@/components/SettingsModal';
import ErrorToast from '@/components/ErrorToast';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tokensUsed] = useState(0); // ChatCanvas writes tokens via window store, TopHeader reads via prop-less default.
  return (
    <ThemeProvider>
      <ProviderContextProvider>
        <UIProvider>
          <SessionProvider>
            <div
              className="h-screen w-screen flex"
              style={{ background: 'var(--bg)', color: 'var(--text)' }}
              data-testid="omni-shell"
            >
              {sidebarOpen && (
                <div className="flex-shrink-0 w-[260px]">
                  <Sidebar />
                </div>
              )}

              <main className="flex-1 min-w-0 flex flex-col">
                <TopHeader
                  onToggleSidebar={() => setSidebarOpen((v) => !v)}
                  sidebarOpen={sidebarOpen}
                  tokensUsed={tokensUsed}
                  tokensMax={200_000}
                />
                <div className="flex-1 min-h-0">
                  <ChatCanvas />
                </div>
                <InputBar />
              </main>
            </div>

            <SettingsModal />
            <ErrorToast />
          </SessionProvider>
        </UIProvider>
      </ProviderContextProvider>
    </ThemeProvider>
  );
}