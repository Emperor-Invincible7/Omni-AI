# OMNI-AI

Industrial monochrome AI workspace. Crisp. Direct. Stateless.

## Stack

- **Next.js 14** App Router · React 18 · TypeScript strict
- **Tailwind CSS** with monochrome palette + Nothing Orange (`#FF4500`) accent in light mode
- **Recharts** for interactive charts (`json:chart` fences)
- **PapaParse** for client-side CSV parsing
- **lucide-react** for icons
- **No database** — fully stateless, deploys to Vercel with zero provisioning

## Features

- **ChatGPT / Gemini layout** — collapsible sidebar, top header bar, centered canvas (max 800px), bottom input
- **Dual theme** — Dark (pure black, monochrome) and Light (white + Nothing Orange accents). Persisted to localStorage.
- **Hydration-safe** — `ClientOnly` wrapper for dynamic content (session IDs, timestamps, theme). Zero `Text content did not match` warnings.
- **Multi-provider** — Anthropic, Groq, Cerebras, Ollama (local), Gemini. Switch from the top header.
- **File attach** — Paperclip button accepts `.csv .json .txt .md`. Parsed client-side via `papaparse`/`JSON.parse`, summarized into a `[DATA CONTEXT]` block sent with the prompt.
- **Web search toggle** — Globe button injects a `[WEB_SEARCH_ENABLED]` directive.
- **Interactive charts** — LLM emits ` ```json:chart ` fences → `ChartRenderer` renders Recharts Line/Bar/Area.
- **Token counter** — Live estimate shown in top header badge.
- **Stateless sessions** — Refresh the browser → sessions wipe. Click `[+ NEW CHAT]` → mint fresh random session ID, auto-focus input.
- **OMNI-AI system prompt** — Crisp terminal tone, enforces chart format and structured output.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (147 kB page, 234 kB First Load JS)
npm run start        # serve production build
npm run smoke        # hit /api/chat for sanity
```

## API

`POST /api/chat`

```json
{
  "provider": "groq" | "anthropic" | "cerebras" | "ollama" | "gemini",
  "model": "<model-id>",
  "messages": [{ "role": "user", "content": "..." }],
  "credentials": {
    "anthropic": "sk-ant-…",
    "groq": "gsk_…",
    "cerebras": "csk-…",
    "gemini": "AIzaSy…",
    "customBaseUrl": "http://localhost:11434/v1",
    "customKey": "…",
    "customModel": "llama3.2"
  }
}
```

Returns a normalized envelope:

```json
{ "ok": true, "data": { "content": "...", "provider": "...", "model": "...", "usage": {...} } }
// or
{ "ok": false, "error": { "code": "missing_credentials|invalid_credentials|rate_limited|upstream_error|unsupported_provider|network", "message": "...", "status": 400, "retryable": false } }
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout — sets data-theme="dark" for SSR
│   ├── page.tsx                # Shell: Sidebar + Main(TopHeader, Canvas, InputBar)
│   ├── globals.css             # Dual-theme CSS variables
│   └── api/chat/route.ts       # Stateless inference boundary
├── components/
│   ├── Sidebar.tsx             # [+] NEW CHAT, session list, Settings + User
│   ├── TopHeader.tsx           # Sidebar toggle, logo, model switcher, tokens, theme toggle
│   ├── ChatCanvas.tsx          # 800px max-width messages + welcome screen
│   ├── InputBar.tsx            # Attach, web search, send (with spinner)
│   ├── MarkdownView.tsx        # Custom markdown → React, with json:chart fences
│   ├── ChartRenderer.tsx       # Recharts wrapper, mono theme
│   ├── SettingsModal.tsx       # Provider keys + Ollama base URL
│   ├── ErrorToast.tsx          # Auto-dismiss provider error notifications
│   ├── ClientOnly.tsx          # Hydration-safe dynamic content wrapper
│   ├── OmniLogo.tsx            # 8x8 dot-matrix O mark
│   └── DotMatrix.tsx           # 4x4 dot grid primitive
└── lib/
    ├── theme-context.tsx       # Dark/light mode + localStorage persistence
    ├── session-context.tsx     # In-memory session state (stateless)
    ├── provider-context.tsx    # Provider credentials + active model
    ├── providers.ts            # Anthropic / Groq / Cerebras / Ollama / Gemini configs
    ├── api-router.ts           # Frontend fetch wrapper + error mapping
    ├── file-parser.ts          # PapaParse CSV / JSON.parse client-side parser
    ├── system-prompt.ts        # OMNI-AI system prompt (terminal tone)
    ├── prompt-bus.ts           # Cross-component prompt events
    └── focus-bus.ts            # Cross-component input focus events
```

## Design tokens

| Token | Dark | Light |
|---|---|---|
| Background | `#000000` | `#FFFFFF` |
| Surface | `#0A0A0A` | `#F4F4F5` |
| Border | `rgba(255,255,255,0.15)` | `rgba(0,0,0,0.15)` |
| Text | `#FFFFFF` | `#000000` |
| Accent | `#FFFFFF` | `#FF4500` (Nothing Orange) |
| Radius | `0` | `0` |

All radii are 0px. All borders are 1px sharp. Monospaced JetBrains Mono for all metadata, token counts, and code blocks.