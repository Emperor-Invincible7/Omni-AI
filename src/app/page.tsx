'use client';

import { UIProvider } from '@/lib/ui-context';
import { ProviderContextProvider } from '@/lib/provider-context';
import { SessionProvider } from '@/lib/session-context';
import ChatCanvas from '@/components/ChatCanvas';
import InputBar from '@/components/InputBar';
import SettingsModal from '@/components/SettingsModal';
import ErrorToast from '@/components/ErrorToast';
import Dock from '@/components/Dock';

export default function Home() {
  return (
    <ProviderContextProvider>
      <UIProvider>
        <SessionProvider>
          <div
            className="h-screen w-screen grid bg-black text-white"
            style={{ gridTemplateRows: 'auto 1fr auto auto' }}
          >
            <Dock position="top" />
            <main className="min-h-0 min-w-0 relative border-t border-[#1F1F1F]">
              <ChatCanvas />
            </main>
            <InputBar />
            <Dock position="bottom" />
          </div>

          <SettingsModal />
          <ErrorToast />
        </SessionProvider>
      </UIProvider>
    </ProviderContextProvider>
  );
}