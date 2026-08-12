'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Cpu, FileText, Zap } from 'lucide-react';
import StatusBar from './StatusBar';
import DotMatrix from './DotMatrix';
import OmniLogo from './OmniLogo';
import MarkdownView from './MarkdownView';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS } from '@/lib/providers';
import { sendChat, describeError } from '@/lib/api-router';
import { onPrompt } from '@/lib/prompt-bus';
import { useSessionStore } from '@/lib/session-context';
import clsx from 'clsx';

const quickActions = [
  { id: 'qa1', label: 'SUMMARIZE', icon: FileText },
  { id: 'qa2', label: 'RESEARCH',  icon: Sparkles },
  { id: 'qa3', label: 'CODE',      icon: Cpu },
  { id: 'qa4', label: 'BRAINSTORM',icon: Zap },
];

export default function ChatCanvas() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { activeProvider, activeModel, credentials, reportError } = useProviders();
  const provider = PROVIDERS[activeProvider];
  const model = provider.models.find((m) => m.id === activeModel) ?? provider.models[0];

  const session = useSessionStore();
  const { activeSessionId, messages: persistedMessages, persistTurn } = session;

  // Whenever the active session changes, sync the canvas's local view to
  // the DB-backed messages. This makes "open session" / "new chat" reflect
  // in the canvas without remounting the whole component.
  useEffect(() => {
    setMessages(
      persistedMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: (m.metrics?.model as string) ?? undefined,
        latencyMs: (m.metrics?.latencyMs as number) ?? undefined,
        tokens: (m.metrics?.total_tokens as number) ?? undefined,
      })),
    );
  }, [activeSessionId, persistedMessages]);

  // Stable session id for the status bar — keyed by activeSessionId so it
  // updates as the user switches sessions.
  const sessionId = useMemo(() => {
    if (activeSessionId) return activeSessionId.slice(-6).toUpperCase();
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }, [activeSessionId]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // Token estimate from canvas messages (mutable local view).
  useEffect(() => {
    const totalChars = messages.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
    setTokensUsed(Math.round(totalChars / 4));
  }, [messages]);

  const startLatency = useRef<number>(0);

  const onSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: UiMessage = {
        id: `local-${Date.now()}-u`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      startLatency.current = Date.now();

      const res = await sendChat({
        provider: activeProvider,
        model: activeModel,
        messages: [{ role: 'user', content: trimmed }],
        sessionId: activeSessionId ?? undefined,
        credentials: {
          anthropic: credentials.anthropic,
          groq: credentials.groq,
          cerebras: credentials.cerebras,
          customBaseUrl: credentials.customBaseUrl,
          customKey: credentials.customKey,
          customModel: credentials.customModel,
        },
      });

      const latencyMs = Date.now() - startLatency.current;
      setIsStreaming(false);

      if (!res.ok) {
        const friendly = describeError(res.error, provider.label);
        reportError({
          severity: friendly.severity,
          title: friendly.title,
          message: friendly.body,
          failedProvider: activeProvider,
        });
        // remove the optimistic user message on failure so the UI is clean
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      const assistantMsg: UiMessage = {
        id: `local-${Date.now()}-a`,
        role: 'assistant',
        content: res.data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: model.label,
        latencyMs,
        tokens: res.data.usage?.total_tokens,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-save to DB.
      void persistTurn({
        userContent: trimmed,
        assistantContent: res.data.content,
        metrics: {
          model: model.label,
          provider: activeProvider,
          latencyMs,
          tokens: res.data.usage?.total_tokens,
        },
      });
    },
    [
      isStreaming,
      activeProvider,
      activeModel,
      credentials.anthropic,
      credentials.groq,
      credentials.cerebras,
      credentials.customBaseUrl,
      credentials.customKey,
      credentials.customModel,
      provider.label,
      model.label,
      reportError,
      persistTurn,
      activeSessionId,
    ],
  );

  // Subscribe to prompts from the InputBar.
  useEffect(() => onPrompt((e) => void onSend(e.text)), [onSend]);

  const onQuickAction = useCallback(
    (label: string) => void onSend(`Help me ${label.toLowerCase()}.`),
    [onSend],
  );

  return (
    <div className="flex flex-col h-full bg-black" data-testid="chat-canvas">
      <StatusBar
        tokensUsed={tokensUsed}
        tokensMax={200_000}
        modelLabel={model.label}
        providerLabel={provider.label}
        isStreaming={isStreaming}
        sessionId={sessionId}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Welcome block */}
          <div className="border border-white/20 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <OmniLogo size={28} className="text-white" />
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#A3A3A3]">
                OMNI-AI · RUNTIME :: v0.2
              </div>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight leading-tight text-white">
              How can I help you think today?
            </h1>
            <p className="text-[#A3A3A3] text-[13px] mt-2 max-w-md leading-relaxed">
              Attach documents, search knowledge, or run a model. Sessions persist to the local database.
            </p>

            <div className="flex flex-wrap gap-2 mt-5">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => onQuickAction(a.label)}
                    className="flex items-center gap-2 h-8 px-3 border border-white/20 hover:border-white font-mono text-[10px] tracking-[0.14em] uppercase text-[#A3A3A3] hover:text-white transition-colors"
                  >
                    <Icon size={12} />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="border border-white/20 p-6 font-mono text-[11px] tracking-[0.14em] uppercase text-[#525252]">
                EMPTY_SESSION · TYPE_PROMPT_TO_BEGIN
              </div>
            )}
            {messages.map((msg, idx) => (
              <MessageCell key={msg.id} msg={msg} index={idx} />
            ))}

            {isStreaming && (
              <div className="flex gap-3 items-start border border-white/20 p-4">
                <OmniLogo size={16} className="text-white mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white">
                      OMNI-AI
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#737373]">
                      · STREAMING
                    </span>
                  </div>
                  <DotMatrix
                    pattern={[1, 0, 0, 1, 0, 1, 'blink', 0, 1, 0, 0, 1, 0, 1, 0, 1]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface UiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  latencyMs?: number;
  tokens?: number;
}

function MessageCell({ msg, index }: { msg: UiMessage; index: number }) {
  const isUser = msg.role === 'user';
  return (
    <div
      className={clsx(
        'border p-4 flex gap-3 items-start',
        isUser ? 'border-white/20' : 'border-white/20',
      )}
    >
      {isUser ? (
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#737373] mt-0.5 flex-shrink-0">
          YOU · {String(index + 1).padStart(2, '0')}
        </div>
      ) : (
        <OmniLogo size={16} className="text-white mt-1 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase">
            <span className="text-white">OMNI-AI</span>
            <span className="text-[#525252]">·</span>
            <span className="text-[#A3A3A3]">{msg.model ?? '—'}</span>
            {msg.latencyMs != null && (
              <>
                <span className="text-[#525252]">·</span>
                <span className="text-[#A3A3A3] tabular-nums">{msg.latencyMs}ms</span>
              </>
            )}
            {msg.tokens != null && (
              <>
                <span className="text-[#525252]">·</span>
                <span className="text-[#A3A3A3] tabular-nums">{msg.tokens} TOK</span>
              </>
            )}
          </div>
        )}

        {isUser ? (
          <div className="text-[14px] leading-relaxed whitespace-pre-wrap text-white">{msg.content}</div>
        ) : (
          <MarkdownView content={msg.content} />
        )}

        <div className="flex items-center gap-2 mt-3 font-mono text-[9px] tracking-[0.2em] uppercase text-[#525252]">
          <span>{msg.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
