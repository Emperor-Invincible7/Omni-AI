'use client';

import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useSessionStore } from '@/lib/session-context';
import { requestFocusInput } from '@/lib/focus-bus';

interface Props {
  /** Called once a fresh session id is available. */
  onCreated?: (sessionId: string) => void;
}

export default function NewChatButton({ onCreated }: Props) {
  const { newSession } = useSessionStore();

  const onClick = useCallback(async () => {
    const id = await newSession();
    onCreated?.(id);
    window.setTimeout(() => requestFocusInput(), 0);
  }, [newSession, onCreated]);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 h-7 px-3 border border-white bg-white text-black font-mono text-[10px] tracking-[0.18em] uppercase hover:bg-[#EDEDED] transition-colors"
      title="Start a fresh chat session"
    >
      <Plus size={12} />
      NEW_CHAT
    </button>
  );
}