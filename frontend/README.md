# GenX Streaming Live RAG — Web Control Room & Observability Console

The frontend control room for GenX Streaming Live RAG is a real-time, event-driven web application built with Next.js 16, TypeScript, Tailwind CSS, and Zustand. It provides interactive transcript streaming, automated factual grounding verification, and developer telemetry logging.

---

## Key Features

- **Streaming Transcript Ingestion**: Send audio transcript chunks continuously over WebSockets or HTTP fallback.
- **Adaptive LLM Controller**: Real-time intent classification (`RETRIEVE`, `WAIT`, `NO_RETRIEVE`) with confidence metrics.
- **Factual Grounding & Entailment**: Automated validation of synthesized responses against retrieved corpus chunks.
- **Dual Operational Modes**:
  - **User Verification View**: Consolidated stream of controller status, grounding scores, conflict alerts, and document citations.
  - **Developer Observability Console**: Deep telemetry event timelines, raw JSON response payloads, LLM stage token counters, and system capability metrics.
- **Real-Time WebSocket Transport**: Automatic reconnection, heartbeats, and status indicators.

---

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **HTTP/WS Client**: Native Fetch & WebSocket API

---

## Project Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── icon.png
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── icon.png
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── conversation/   # Transcript input & conversation panel
│   │   ├── developer/      # Raw payload viewer & capability matrix
│   │   ├── layout/         # Header, AppShell & connection badges
│   │   ├── rag/            # Controller card, grounding & retrieval panels
│   │   ├── telemetry/      # Event timelines & LLM token counters
│   │   ├── ui/             # Error boundaries & UI primitives
│   │   └── user/           # User verification stream
│   ├── hooks/              # Custom WebSocket & health hooks
│   ├── lib/                # API client, WebSocket & helper utilities
│   ├── stores/             # Zustand session state store
│   └── types/              # TypeScript API & session interfaces
```

---

## Development & Build Commands

### Start Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Run Production Server
```bash
npm start
```
