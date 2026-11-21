# Momo

An interactive AI workspace built on **Next.js 16**, **React 19**, **OpenUI**, and **D3 + Motion** that streams structured, context-aware Generative UI directly inside **Chat**, **Explore**, and **Pinboard** views.

<p align="center">
  <img src="docs/screenshots/01-chat-home.jpg" alt="Momo Chat Home" width="100%" />
</p>

<p align="center">
  <em><strong>Chat Home</strong>: Interactive 3D Momo companion with glowing visor lighting, adaptive time-of-day greeting, role switcher, peaked attachment fan (Foto, Catatan, Jadwal, Berkas), and model/reasoning effort dock.</em>
</p>

---

## Workspaces: Explore & Pinboard

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/screenshots/02-explore-home.jpg" alt="Momo Explore Home" width="100%" />
      <br />
      <strong>Explore Workspace</strong>
      <br />
      Editorial research launcher with live local weather context, ambient role sketches, open topic prompt, and four starter tracks (<em>Riset</em>, <em>Rencana</em>, <em>Eksplorasi</em>, <em>Analisis</em>) that stream into horizontal magazine spreads.
    </td>
    <td width="50%" valign="top">
      <img src="docs/screenshots/03-pinboard-canvas.jpg" alt="Momo Pinboard Spatial Canvas" width="100%" />
      <br />
      <strong>Pinboard Spatial Canvas</strong>
      <br />
      Pan-and-zoom spatial board (<code>Kanvas</code> / <code>Grid</code>) organizing multi-lane session plans with verified web photography, handwritten marginalia notes, custom drag-and-drop, and tilted vinyl priority stickers.
    </td>
  </tr>
</table>

---

## Live Chat Sessions (Generative UI in Action)

<table>
  <tr>
    <td width="33.3%" valign="top">
      <img src="docs/screenshots/04-chat-chef-cards.jpg" alt="Chef Role Curated Recipe Cards" width="100%" />
      <br />
      <strong>Chef Role · Curated Visual Cards</strong>
      <br />
      Handwritten user prompt paired with live thinking telemetry (token &amp; timing reels), grounded photo search, tag filter tabs, and spec-stripped recipe cards with verified photography.
    </td>
    <td width="33.3%" valign="top">
      <img src="docs/screenshots/05-chat-dossier-catalog.jpg" alt="Visual Dossier and Catalog Shelf" width="100%" />
      <br />
      <strong>Editorial Dossier &amp; Catalog Shelf</strong>
      <br />
      Magazine-grade <code>Headline</code>, <code>VisualDossier</code> (telemetry ribbon, coordinates, verified stage photo, tilted highlight icons), and an expandable <code>CatalogShelf</code> tracklist inside a single stream.
    </td>
    <td width="33.3%" valign="top">
      <img src="docs/screenshots/06-chat-maker-intelligence.jpg" alt="Maker Role Engineering Intelligence" width="100%" />
      <br />
      <strong>Maker Role · Code Diff &amp; Root Cause</strong>
      <br />
      <code>ExecutiveSummary</code> key takeaways, interactive <code>CodeDiffPatch</code> (<code>Both / Before / After</code>), and an adaptive 2-column <code>RootCauseAnalysis</code> matrix with grounded source citations.
    </td>
  </tr>
</table>

---

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
