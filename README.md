# WikiAi — Minimalist AI Assistant UI

A high-end, glassmorphism-inspired AI assistant interface built with a deep slate/obsidian palette, frosted glass panels, and refined micro-interactions.

## Two Versions Included

### 1. `index.html` — Standalone Demo (no build needed)
Open the file directly in any browser to see the full UI in action. Uses Tailwind via CDN and inline JavaScript for state.

```bash
# Just open the file
start index.html
```

### 2. Next.js + React + Tailwind Modular App
Production-ready component architecture with Framer Motion animations.

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Architecture

```
wiki-ai/
├── index.html                          # Standalone demo
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with fonts
│   │   ├── page.tsx                   # Main shell composition
│   │   └── globals.css                # Design system & tokens
│   ├── components/
│   │   ├── AuroraBackground.tsx       # Animated gradient blobs
│   │   ├── Sidebar.tsx                # Collapsible history sidebar
│   │   ├── TopBar.tsx                 # Model selector + actions
│   │   ├── ChatCanvas.tsx             # Messages + code blocks
│   │   ├── InputBar.tsx               # Floating glass input
│   │   └── OperationsPanel.tsx        # Right-side telemetry panel
│   └── lib/
│       ├── ui-context.tsx             # Global UI state (sidebar/panel)
│       └── mock-data.ts               # Realistic placeholder data
├── tailwind.config.ts                 # Custom theme + animations
├── package.json
└── README.md
```

## Design System

| Token | Value |
|-------|-------|
| Background | `#0A0D12` (obsidian) |
| Glass | `rgba(255,255,255,0.035)` with `backdrop-blur(20px)` |
| Border | `rgba(255,255,255,0.08)` |
| Accent emerald | `#34D399` |
| Accent cyan | `#22D3EE` |
| Accent indigo | `#818CF8` |
| Font | Inter (sans) · JetBrains Mono (code) |

## Features

- **Collapsible sidebar** with new chat, search, grouped history, workspace nav, and user profile
- **Animated top bar** with model selector, token usage pill, and operations panel toggle
- **Message flow** with user/assistant bubbles, syntax-highlighted code blocks, source citations, and a typing indicator
- **Floating input bar** with auto-resize textarea, attachment/voice buttons, contextual chip suggestions, and keyboard hints
- **Operations Panel** with tabs (Context / Metrics / Sources), live execution metrics, contextual window progress bar with breakdown, model parameter sliders, system prompt viewer, loaded context chips, and session tags
- **Motion** — entrance animations, hover glows, pulsing indicators, aurora background blobs, shimmer skeletons, and slide-over panel transitions

## Components

### `<Sidebar />`
Collapsible left rail with logo, new chat CTA, history search, grouped history (Today / Yesterday / Last 7 days), and user profile. Animates width with spring physics.

### `<TopBar />`
Compact header with model selector (Claude Opus 5), session status, token usage, and panel toggle.

### `<ChatCanvas />`
Scrollable message area with welcome hero, quick action chips, animated message list, code blocks with copy/download, source cards, and a live typing indicator.

### `<InputBar />`
Floating glass-pill input with auto-resize, attachment, voice, and dynamic submit button.

### `<OperationsPanel />`
Slide-over right panel with three tabs, live metrics grid, context window progress, parameter sliders, collapsible system prompt, context chips, and session tags.

### `<AuroraBackground />`
Three organic blur-blobs animating in slow infinite loops for the ambient glow.

## State Management

A single `UIContext` provides:
- `sidebarOpen` / `toggleSidebar()`
- `panelOpen` / `togglePanel()`
- `activeTab` / `setActiveTab()`

Mock data lives in `src/lib/mock-data.ts` — replace with real API calls when wiring up.

## Animations

All animation timings use cubic-bezier(0.16, 1, 0.3, 1) for a polished, spring-like feel. Keyframes include:
- `pulse-glow` for active states
- `aurora` for background blobs
- `shimmer` for skeleton loading
- `fade-up` / `slide-in-right` for entrance
- `pulse-ring` for the assistant avatar

## Customization

Colors and timings are centralized in `tailwind.config.ts` and `globals.css`. To rebrand, swap the `gradient-text` and accent tokens in both files.
