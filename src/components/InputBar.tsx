'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { Paperclip, Globe, Send, AlertCircle, X, Loader2 } from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS } from '@/lib/providers';
import { emitPrompt } from '@/lib/prompt-bus';
import { onFocusRequest } from '@/lib/focus-bus';
import { parseFile, humanBytes, type ParsedFile } from '@/lib/file-parser';
import { useTheme } from '@/lib/theme-context';
import clsx from 'clsx';

export default function InputBar({ isStreaming = false }: { isStreaming?: boolean }) {
  const [value, setValue] = useState('');
  const [attachment, setAttachment] = useState<ParsedFile | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { activeProvider, isActiveReady } = useProviders();
  const { theme } = useTheme();

  const provider = PROVIDERS[activeProvider];
  const requiresSetup = !isActiveReady;

  // Auto-grow textarea up to ~6 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
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

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || isStreaming) return;
    emitPrompt(text, attachment ?? undefined, webSearch || undefined);
    setValue('');
    setAttachment(null);
    setWebSearch(false);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [value, isStreaming, attachment, webSearch]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onAttachClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setParsing(true);
    try {
      const max = 8 * 1024 * 1024; // 8 MB
      if (file.size > max) {
        setParseError(`File too large (${humanBytes(file.size)}). Maximum is ${humanBytes(max)}.`);
        return;
      }
      const parsed = await parseFile(file);
      setAttachment(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const placeholder = webSearch
    ? '> ASK OMNI-AI (WEB_SEARCH_ON)'
    : '> ASK OMNI-AI';

  return (
    <div
      className="flex-shrink-0 border-t px-4 py-4"
      style={{ background: 'var(--bg)', borderColor: 'var(--border-soft)' }}
    >
      <div className="max-w-3xl mx-auto">
        {requiresSetup && (
          <div
            className="mb-2 flex items-center gap-2 px-3 py-2 border font-mono text-[10px] tracking-[0.14em] uppercase"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
              background: 'var(--bg-elev-1)',
            }}
          >
            <AlertCircle size={12} />
            <span>
              {provider.label.toUpperCase()} :: NOT_CONFIGURED · ADD_KEY_IN_SETTINGS
            </span>
          </div>
        )}

        {parseError && (
          <div
            className="mb-2 flex items-center gap-2 px-3 py-2 border font-mono text-[10px] tracking-[0.14em] uppercase"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            <AlertCircle size={12} />
            <span>{parseError}</span>
            <button
              className="ml-auto"
              onClick={() => setParseError(null)}
              aria-label="Dismiss error"
              style={{ color: 'var(--accent)' }}
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* Attachment chip */}
        {attachment && (
          <div
            className="mb-2 flex items-center gap-2 px-3 py-2 border font-mono text-[10px] tracking-[0.14em] uppercase"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-elev-1)',
              color: 'var(--text-dim)',
            }}
          >
            <Paperclip size={11} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text)' }}>{attachment.name}</span>
            <span style={{ color: 'var(--text-mute)' }}>·</span>
            <span>{humanBytes(attachment.size)}</span>
            <span style={{ color: 'var(--text-mute)' }}>·</span>
            <span style={{ color: 'var(--accent)' }}>{attachment.kind.toUpperCase()}_PARSED</span>
            <button
              onClick={() => {
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="ml-auto"
              aria-label="Remove attachment"
              style={{ color: 'var(--text-mute)' }}
            >
              <X size={11} />
            </button>
          </div>
        )}

        <div className="input-shell">
          <button
            type="button"
            onClick={onAttachClick}
            className="nx-icon-btn"
            title="Attach file"
            aria-label="Attach file"
            disabled={parsing}
          >
            {parsing ? <Loader2 size={14} className="nx-spin" /> : <Paperclip size={14} />}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.json,.txt,.md,text/plain,text/csv,application/json"
            className="hidden"
            onChange={onFileChange}
          />

          <button
            type="button"
            onClick={() => setWebSearch((v) => !v)}
            className={clsx(
              'h-7 w-7 flex items-center justify-center border transition-colors',
              webSearch
                ? 'border-nothing text-nothing'
                : 'border-transparent text-[#A3A3A3] hover:text-white',
            )}
            style={
              webSearch
                ? {
                    borderColor: 'var(--accent)',
                    color: 'var(--accent)',
                  }
                : undefined
            }
            title={webSearch ? 'Web search ON — AI will ground answers in live search' : 'Toggle web search'}
            aria-label="Toggle web search"
            aria-pressed={webSearch}
          >
            <Globe size={14} />
          </button>

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            className="placeholder:uppercase"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            disabled={isStreaming}
            spellCheck={false}
            aria-label="Message"
          />

          <button
            onClick={handleSend}
            disabled={isStreaming || !value.trim()}
            className={sendBtnCls(isStreaming, value, theme)}
            title="Send message"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 size={14} className="nx-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>

        <div
          className="flex items-center justify-between mt-2 font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-mute)' }}
        >
          <span>ENTER :: SEND · SHIFT+ENTER :: NEWLINE</span>
          <span className="tabular-nums">{value.length} CHARS</span>
        </div>
      </div>
    </div>
  );
}

function sendBtnCls(sending: boolean, value: string, theme: 'dark' | 'light') {
  const empty = !value.trim();
  return clsx(
    'h-9 px-4 flex items-center justify-center border font-mono text-[10px] tracking-[0.18em] uppercase transition-colors',
    sending
      ? 'border-[var(--border-soft)] text-[var(--text-mute)] cursor-wait'
      : empty
        ? 'border-[var(--border-soft)] text-[var(--text-mute)] cursor-not-allowed'
        : theme === 'light'
          ? 'border-black bg-black text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white'
          : 'border-white bg-white text-black hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white',
  );
}