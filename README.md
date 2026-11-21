# Momo

An interactive AI workspace built on **Next.js 16**, **React 19**, **OpenUI**, and **D3 + Motion** that streams structured, context-aware Generative UI directly inside **Chat**, **Explore**, and **Pinboard** views.

## Core Capabilities

- **Three Synchronized Workspaces**
  - **Chat**: Streaming conversational thread with live inline Generative UI blocks, collapsible reasoning telemetry, verified circular citations, handwritten math rendering, and browser-cached session persistence (`localStorage`).
  - **Explore**: Horizontal magazine-style editorial spread canvas with adaptive photo/specimen covers, interactive place & media modals, and contextual follow-up branches.
  - **Pinboard**: Spatial pan/zoom canvas and grid board with custom pointer drag-and-drop, vinyl corner stickers, and per-role board archival.

- **Dual Generative UI Architecture**
  - **Mistline + OpenUI Runtime (`64` components)**: Editorial and specialist components (`VisualDossier`, `BentoGrid`, `CatalogShelf`, `AnnotatedSheet`, `RegionalShowcase`, `Versus`, `Cards`, `TransitRouteCard`, `RecipeScalerCard`, `MoodboardMosaic`, `ConceptFlashcards`, `CodeDiffPatch`, `InteractiveMapBlock`) backed by strict prompt schemas, permissive runtime parsing, 5-pass `propRepair`, and `contentContracts`.
  - **Intelligence UI Suite (`169` components + `24` D3/Motion charts)**: Analytical, evidence, investigation, visual-reasoning (`@xyflow/react` + `elkjs`), and interactive panels supporting four visual variants (`default`, `editorial`, `split`, `minimal`) in Porcelain Light and Obsidian Dark themes.

- **Grounded Search & Verified Media Pipeline**
  - Hybrid server web search (TinyFish + Exa + Firecrawl fallback) and multi-provider image search (Wikimedia, Wikipedia, Openverse, Web) with Gemini vision reranking (`visionRerank.ts`), SSRF-hardened image proxying, and a client-side verified URL pool.

- **18 Role Personas & Role Gate**
  - Automatic domain routing (`decideRoleTurn`) shared between client and server (HTTP 409 pre-flight handoff gate), per-role palette tokens, and session continuity ledgers.

- **GenUI Studio (`/playground`)**
  - Live interactive workbench to inspect all Intelligence UI and Classic Mistline components across `ready`, `loading`, `streaming`, `empty`, and `error` states, 4-up variant comparisons, and DialKit live controls.

## Tech Stack

- **Framework**: Next.js 16.4 (App Router), React 19, TypeScript 5.8
- **Styling & Motion**: Tailwind CSS v4, Motion (`motion/react`), Porcelain Light / Obsidian Dark CSS token system
- **DataViz & Graphs**: D3 (`d3`), XYFlow (`@xyflow/react`), ELK.js (`elkjs`), Leaflet (`leaflet`), Mermaid (`mermaid`)
- **Generative UI & Validation**: `@openuidev/react-lang`, Zod v4

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and fill in your API keys:
   ```bash
   cp .env.example .env.local
   ```

3. Start the dev server (runs on `http://127.0.0.1:4173`):
   ```bash
   npm run dev
   ```

4. Open the app at `http://127.0.0.1:4173` or inspect all GenUI components at `http://127.0.0.1:4173/playground`.

## Verification

```bash
npm run typecheck
npm run build
```

## Deploying to Vercel

1. Import this repository in Vercel (Next.js preset is detected automatically).
2. Add the environment variables from `.env.example` under **Project -> Settings -> Environment Variables**:
   - `GEMINI_API_KEY` (required)
   - `GEMINI_API_KEYS` (optional, comma-separated pool for key rotation)
   - `MOMO_MODEL` (optional default model)
   - `TINYFISH_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY` (for live web & image grounding)
3. Serverless streaming routes (`/api/brain`, `/api/image`, `/api/explore-detail`) are configured with `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and `maxDuration = 60`.
