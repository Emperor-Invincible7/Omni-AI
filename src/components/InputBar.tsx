'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Paperclip, Search, Send, AlertCircle } from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS } from '@/lib/providers';
import { emitPrompt } from '@/lib/prompt-bus';
import { onFocusRequest } from '@/lib/focus-bus';

export default function InputBar() {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const { activeProvider, isActiveReady } = useProviders();

  const provider = PROVIDERS[activeProvider];
  const requiresSetup = !isActiveReady;

  // Auto-grow textarea up to ~6 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  // External focus requests (e.g. [+ NEW CHAT]).
  useEffect(() => {
    return onFocusRequest(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    });
  }, []);

  const send = () => {
    const text = value.trim();
    if (!text || sending) return;
    emitPrompt(text);
    setSending(true);
    setValue('');
    window.setTimeout(() => setSending(false), 1200);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-[#1F1F1F] bg-black">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {requiresSetup && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 border border-white font-mono text-[10px] tracking-[0.14em] uppercase text-white">
            <AlertCircle size={12} />
            <span>
              {provider.label.toUpperCase()} :: NOT_CONFIGURED · ADD_KEY_IN_SETTINGS
            </span>
          </div>
        )}

        <div className="input-shell">
          <button type="button" className="nx-icon-btn" title="Attach file" aria-label="Attach file">
            <Paperclip size={14} />
          </button>

          <button
            type="button"
            className="nx-icon-btn"
            title="Search knowledge base"
            aria-label="Search knowledge base"
          >
            <Search size={14} />
          </button>

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder="> ASK OMNI-AI"
            className="font-mono placeholder:text-[#525252] placeholder:tracking-[0.14em] placeholder:uppercase"
            disabled={sending}
            spellCheck={false}
            aria-label="Message"
          />

          <button
            onClick={send}
            disabled={sending || !value.trim()}
            className={sendBtnCls(sending, value)}
            title="Send message"
            aria-label="Send message"
          >
            {sending ? (
              <span className="font-mono text-[10px] tracking-[0.14em]">···</span>
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 font-mono text-[9px] tracking-[0.2em] uppercase text-[#525252]">
          <span>ENTER :: SEND · SHIFT+ENTER :: NEWLINE</span>
          <span>{value.length} CHARS</span>
        </div>
      </div>
    </div>
  );
}

function sendBtnCls(sending: boolean, value: string) {
  const empty = !value.trim();
  return [
    'h-7 px-3 flex items-center justify-center border font-mono text-[10px] tracking-[0.14em] uppercase',
    sending || empty
      ? 'border-[#1F1F1F] text-[#525252] cursor-not-allowed'
      : 'border-white text-black bg-white hover:bg-[#EDEDED]',
  ].join(' ');
}
