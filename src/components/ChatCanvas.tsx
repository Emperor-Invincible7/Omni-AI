'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Cpu, FileText, Zap } from 'lucide-react';
import OmniLogo from './OmniLogo';
import DotMatrix from './DotMatrix';
import MarkdownView from './MarkdownView';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS } from '@/lib/providers';
import { sendChat, describeError } from '@/lib/api-router';
import { onPrompt } from '@/lib/prompt-bus';
import { useSessionStore, type UiMessage } from '@/lib/session-context';
import ClientOnly from './ClientOnly';
import clsx from 'clsx';

const quickActions = [
  { id: 'qa1', label: 'SUMMARIZE', icon: FileText, prompt: 'Summarize the key takeaways from a recent article I have in mind.' },
  { id: 'qa2', label: 'RESEARCH',  icon: Sparkles, prompt: 'Research the latest developments in agentic LLM workflows and report concise findings.' },
  { id: 'qa3', label: 'CODE',      icon: Cpu, prompt: 'Help me write TypeScript. Suggest three idiomatic patterns for a particular problem I will describe.' },
  { id: 'qa4', label: 'BRAINSTORM',icon: Zap, prompt: 'Brainstorm a creative product name and tagline for an industrial AI workspace.' },
];

export default function ChatCanvas() {
  const { messages, activeSessionId, persistTurn } = useSessionStore();
  const { activeProvider, activeModel, credentials, reportError } = useProviders();
  const provider = PROVIDERS[activeProvider];
  const model = provider.models.find((m) => m.id === activeModel) ?? provider.models[0];

  const [isStreaming, setIsStreaming] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const startLatency = useRef<number>(0);

  // Token estimate from canvas messages (mutable local view).
  useEffect(() => {
    const totalChars = messages.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
    setTokensUsed(Math.round(totalChars / 4));
  }, [messages]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const onSend = useCallback(
    async (text: string, attachmentSummary?: string, webSearch?: boolean) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // Compose the user message that hits the wire.
      // If we have a file, the AI sees the data context inline so it can
      // ground its answer without us needing a file upload endpoint.
      let composedForAi = trimmed;
      if (attachmentSummary) {
        composedForAi = `${trimmed}\n\n${attachmentSummary}`;
      }
      if (webSearch) {
        composedForAi = `${composedForAi}\n\n[WEB_SEARCH_ENABLED · GROUND_ANSWER_IN_LIVE_RESULTS]`;
      }

      setIsStreaming(true);
      startLatency.current = Date.now();

      const res = await sendChat({
        provider: activeProvider,
        model: activeModel,
        messages: [{ role: 'user', content: composedForAi }],
        credentials: {
          anthropic: credentials.anthropic,
          groq: credentials.groq,
          cerebras: credentials.cerebras,
          gemini: credentials.gemini,
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
        return;
      }

      // Persist the turn via session-context (in-memory).
      persistTurn({
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
      credentials.gemini,
      credentials.customBaseUrl,
      credentials.customKey,
      credentials.customModel,
      provider.label,
      model.label,
      reportError,
      persistTurn,
    ],
  );

  // Subscribe to prompts from the InputBar.
  useEffect(() => onPrompt((e) => void onSend(e.text, e.attachment?.summary, e.webSearch)), [onSend]);

  const onQuickAction = useCallback(
    (label: string, prompt: string) => void onSend(prompt),
    [onSend],
  );

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="chat-canvas">
      {/* Scrollable message stream — centered, max 800px */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-4 py-10">
          {messages.length === 0 && !isStreaming ? (
            <WelcomeScreen onQuick={(label) => {
              const qa = quickActions.find((q) => q.label === label);
              if (qa) onQuickAction(label, qa.prompt);
            }} />
          ) : (
            <div className="space-y-6">
              {messages.map((m, idx) => (
                <MessageCell key={m.id} msg={m} index={idx} />
              ))}
              {isStreaming && <StreamingIndicator />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Welcome / Empty state ---------- */

function WelcomeScreen({ onQuick }: { onQuick: (label: string) => void }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center text-center pt-8">
        <ClientOnly
          fallback={
            <div className="w-16 h-16 flex items-center justify-center">
              <OmniLogo size={48} className="text-white" />
            </div>
          }
        >
          <AnimatedLogo />
        </ClientOnly>

        <h1 className="text-[44px] font-bold tracking-[-0.02em] leading-none mt-6">
          OMNI-AI
        </h1>
        <p
          className="font-mono text-[11px] tracking-[0.2em] uppercase mt-3"
          style={{ color: 'var(--text-mute)' }}
        >
          v1.0 · RUNTIME :: ONLINE
        </p>
        <p
          className="text-[14px] leading-relaxed mt-5 max-w-md"
          style={{ color: 'var(--text-dim)' }}
        >
          An industrial monochrome AI workspace. Crisp answers. Sharp charts. Stateless sessions.
        </p>
      </div>

      <div>
        <div
          className="flex items-center justify-between mb-3 font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--text-mute)' }}
        >
          <span>QUICK_PROMPTS</span>
          <span>{quickActions.length} AVAILABLE</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                onClick={() => onQuick(q.label)}
                className="flex items-start gap-3 p-4 border text-left transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg-elev-1)',
                  color: 'var(--text-dim)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elev-2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elev-1)';
                }}
              >
                <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <div>
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase">{q.label}</div>
                  <div className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--text-mute)' }}>
                    {q.prompt}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnimatedLogo() {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <OmniLogo size={48} className="text-[var(--text)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <DotMatrix pattern={[1, 1, 1, 0, 1, 'blink', 0, 0, 0, 1, 0, 1, 1, 0, 1, 1]} size={3} />
      </div>
    </div>
  );
}

/* ---------- Message rendering ---------- */

function MessageCell({ msg, index }: { msg: UiMessage; index: number }) {
  const isUser = msg.role === 'user';
  const time = useMemo(() => {
    const d = new Date(msg.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [msg.timestamp]);

  return (
    <article
      className={clsx('flex gap-3 items-start border p-4')}
      style={{ borderColor: 'var(--border-soft)' }}
    >
      {isUser ? (
        <div
          className="font-mono text-[10px] tracking-[0.2em] uppercase mt-0.5 flex-shrink-0"
          style={{ color: 'var(--text-mute)' }}
        >
          YOU · {String(Math.floor(index / 2) + 1).padStart(2, '0')}
        </div>
      ) : (
        <OmniLogo size={16} className="text-[var(--text)] mt-1 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div
          className="flex items-center gap-2 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-mute)' }}
        >
          <span style={{ color: 'var(--text)' }}>{isUser ? 'YOU' : 'OMNI-AI'}</span>
          {!isUser && msg.model && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--text-dim)' }}>{msg.model}</span>
            </>
          )}
          {!isUser && msg.latencyMs != null && (
            <>
              <span>·</span>
              <span className="tabular-nums" style={{ color: 'var(--text-dim)' }}>
                {msg.latencyMs}ms
              </span>
            </>
          )}
          {!isUser && msg.tokens != null && (
            <>
              <span>·</span>
              <span className="tabular-nums" style={{ color: 'var(--text-dim)' }}>
                {msg.tokens} TOK
              </span>
            </>
          )}
        </div>

        {isUser ? (
          <div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
            {msg.content}
          </div>
        ) : (
          <MarkdownView content={msg.content} />
        )}

        <div
          className="flex items-center gap-2 mt-3 font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-mute)' }}
        >
          <ClientOnly fallback={<span>··:··</span>}>
            <span>{time}</span>
          </ClientOnly>
        </div>
      </div>
    </article>
  );
}

function StreamingIndicator() {
  return (
    <div className="flex gap-3 items-start border p-4" style={{ borderColor: 'var(--border-soft)' }}>
      <OmniLogo size={16} className="mt-1 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--text)' }}>
          <span>OMNI-AI</span>
          <span style={{ color: 'var(--text-mute)' }}>·</span>
          <span style={{ color: 'var(--accent)' }}>STREAMING</span>
        </div>
        <DotMatrix pattern={[1, 0, 0, 1, 0, 1, 'blink', 0, 1, 0, 0, 1, 0, 1, 0, 1]} />
      </div>
    </div>
  );
}