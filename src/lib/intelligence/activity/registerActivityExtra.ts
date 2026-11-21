/**
 * Categories 01 (Remaining 9 Activity) & 04 (Remaining 18 Evidence) Components
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import {
  EvidenceMatrix,
  EvidenceCollection,
  SourcePreview,
  SourceComparison,
  SourceTimeline,
  SourceReliability,
  Citation,
  ReferenceList,
  QuoteExtraction,
  FactCheckPanel,
  DocumentViewer,
  DocumentDiff,
  ArticleReader,
  ResearchBrief,
  NewsFeed,
  ClaimEvidenceMap,
  EvidenceTimeline,
  SourceInspector,
} from "@/components/intelligence/activity/EvidenceCatalogSuite";

export function registerActivityAndEvidenceExtra(): void {
  /* ═══ Category 04 — 18 Evidence Components (activity removed) ═══ */

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "evidence_matrix",
      category: "evidence",
      description: "Interactive matrix mapping claims against source assessments (supports/contradicts/neutral).",
      dataSchema: `{ title?: string; sources: string[]; claims: { claim: string; assessments: { stance: "supports"|"contradicts"|"neutral"; note?: string }[] }[] }`,
      complexity: "high",
      requiresSources: true,
      distinguishesInference: true,
      promptSummary: "Claim-by-source triangulation matrix.",
      promptWhen: "Cross-checking factual claims across multiple retrieved sources.",
    }),
    component: EvidenceMatrix,
    sampleData: {
      title: "Architecture Claims Verification",
      sources: ["React Docs", "Vercel Bench", "Field Audit"],
      claims: [
        {
          claim: "RSC lowers client JS bundle size",
          assessments: [
            { stance: "supports", note: "Server components excluded from client bundle" },
            { stance: "supports", note: "Observed 38% JS payload drop" },
            { stance: "neutral", note: "Depends on client island boundaries" },
          ],
        },
        {
          claim: "Zero server compute cost increase",
          assessments: [
            { stance: "neutral", note: "Requires Node/Edge SSR runtime" },
            { stance: "contradicts", note: "CPU time rises ~22% under dynamic routes" },
            { stance: "contradicts", note: "Needs caching to break even" },
          ],
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "evidence_collection",
      category: "evidence",
      description: "Stance-filterable collection of extracted supporting, contradicting, and contextual evidence.",
      dataSchema: `{ title?: string; items: { title: string; stance: "supporting"|"contradicting"|"contextual"; excerpt: string; source?: string }[] }`,
      requiresSources: true,
      promptSummary: "Filterable evidence snippets organized by stance.",
      promptWhen: "Presenting curated supporting and counter evidence.",
    }),
    component: EvidenceCollection,
    sampleData: {
      title: "Collected Performance Evidence",
      items: [
        { title: "History compression benchmark", stance: "supporting", excerpt: "Stripping UI JSON blocks reduced context by 78% per session.", source: "Internal Trace #44" },
        { title: "Cold edge boot overhead", stance: "contradicting", excerpt: "Large graph bundles increase initial route parse time by 90ms.", source: "Lighthouse Mobile" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "source_preview",
      category: "evidence",
      description: "Clean summary preview card of a single retrieved document or webpage.",
      dataSchema: `{ title: string; domain?: string; url?: string; reliability?: string; summary: string; highlights?: string[] }`,
      requiresSources: true,
      promptSummary: "Focused preview card of a source document.",
      promptWhen: "Previewing a primary reference alongside extracted highlights.",
    }),
    component: SourcePreview,
    sampleData: {
      title: "XYFlow Custom Nodes & Handles Guide",
      domain: "reactflow.dev",
      url: "https://reactflow.dev/learn/customization/custom-nodes",
      reliability: "High",
      summary: "Official documentation detailing custom React node registration, Handle positioning, and edge routing.",
      highlights: ["Custom nodes require explicit <Handle /> components", "Memoize nodeTypes outside render loops"],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "source_comparison",
      category: "evidence",
      description: "Compares how multiple sources report on the same event or technical benchmark.",
      dataSchema: `{ title?: string; sources: { title: string; domain: string; date?: string; reliability: string; stance: string }[] }`,
      requiresSources: true,
      promptSummary: "Side-by-side comparison of source reliability and framing.",
      promptWhen: "Comparing primary vs secondary reporting.",
    }),
    component: SourceComparison,
    sampleData: {
      title: "Cross-Source Benchmark Framing",
      sources: [
        { title: "Official Release Notes", domain: "nextjs.org", date: "Nov 2024", reliability: "high", stance: "Emphasizes Turbopack dev HMR speedups." },
        { title: "Independent Migration Report", domain: "engineering.blog", date: "Nov 2024", reliability: "medium", stance: "Notes memory overhead on very large monorepos." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "source_timeline",
      category: "evidence",
      description: "Orders retrieved documents and publications chronologically.",
      dataSchema: `{ title?: string; sources: { title: string; date: string; domain?: string; summary: string }[] }`,
      requiresSources: true,
      promptSummary: "Chronological timeline of published sources.",
      promptWhen: "Tracing how reporting, RFCs, or research evolved over time.",
    }),
    component: SourceTimeline,
    sampleData: {
      title: "RFC & Spec Evolution",
      sources: [
        { title: "RFC Draft: Streaming GenUI Blocks", date: "2024-04", domain: "github.com", summary: "Introduced fenced JSON UI spec." },
        { title: "Intelligence Catalog v1.0", date: "2024-11", domain: "momo.internal", summary: "Expanded vocabulary to 10 intelligence families." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "source_reliability",
      category: "evidence",
      description: "Evaluates trustworthiness scores (0-100) and provenance notes per source.",
      dataSchema: `{ title?: string; sources: { domain: string; score: number; rationale: string }[] }`,
      requiresSources: true,
      distinguishesInference: true,
      promptSummary: "Reliability rubric scoring retrieved sources.",
      promptWhen: "Surfacing source authority, peer-review status, or bias warnings.",
    }),
    component: SourceReliability,
    sampleData: {
      title: "Source Quality Audit",
      sources: [
        { domain: "postgresql.org/docs", score: 96, rationale: "Primary engine documentation, version-exact lock behavior." },
        { domain: "medium.com/random-post", score: 42, rationale: "Unverified anecdote without reproducible dataset." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "citation",
      category: "evidence",
      description: "Formal copyable citation block with optional extracted verbatim quote.",
      dataSchema: `{ label?: string; index?: number; title: string; authors?: string; year?: string; publisher?: string; url?: string; quote?: string }`,
      complexity: "low",
      requiresSources: true,
      promptSummary: "Individual attribution card with copy button.",
      promptWhen: "Highlighting an exact primary citation and quote.",
    }),
    component: Citation,
    sampleData: {
      label: "Primary Citation",
      index: 1,
      title: "ELK.js — Eclipse Layout Kernel for JavaScript",
      authors: "Eclipse Foundation",
      year: "2024",
      publisher: "eclipse.org/elk",
      url: "https://eclipse.dev/elk/",
      quote: "Layered algorithms minimize edge crossings cleanly for directed system topologies.",
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "reference_list",
      category: "evidence",
      description: "Numbered bibliography list of verifiable references.",
      dataSchema: `{ title?: string; references: { title: string; authors?: string; year?: string; domain?: string; url: string }[] }`,
      complexity: "low",
      requiresSources: true,
      promptSummary: "Structured bibliography linking out to cited sources.",
      promptWhen: "Closing a research response with numbered clickable references.",
    }),
    component: ReferenceList,
    sampleData: {
      title: "Cited References",
      references: [
        { title: "React Flow (XYFlow) Documentation", authors: "webkid GmbH", year: "2025", domain: "reactflow.dev", url: "https://reactflow.dev" },
        { title: "DialKit Live Controls", authors: "Josh Puckett", year: "2025", domain: "dialkit.dev", url: "https://dialkit.dev" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "quote_extraction",
      category: "evidence",
      description: "Curated verbatim quotes attributed to speakers or primary texts.",
      dataSchema: `{ title?: string; quotes: { text: string; speaker?: string; relevance?: string }[] }`,
      complexity: "low",
      requiresSources: true,
      promptSummary: "Extracted verbatim quotations with attribution.",
      promptWhen: "Preserving exact primary wording rather than paraphrasing.",
    }),
    component: QuoteExtraction,
    sampleData: {
      title: "Key Extracted Quotes",
      quotes: [
        { text: "Studio configurations must be separate from component implementation and canonical application data.", speaker: "Momo Architecture Contract", relevance: "Design Principle" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "fact_check_panel",
      category: "evidence",
      description: "Verdict-badged verification panel testing factual assertions.",
      dataSchema: `{ title?: string; checks: { claim: string; verdict: "verified"|"disputed"|"false"|"unverified"; explanation: string }[] }`,
      requiresSources: true,
      distinguishesInference: true,
      promptSummary: "Fact-check cards grading claims against observed evidence.",
      promptWhen: "Verifying rumors, user premises, or technical claims.",
    }),
    component: FactCheckPanel,
    sampleData: {
      title: "Fact Verification",
      checks: [
        { claim: "DialKit supports nested folders, color pickers, and selects", verdict: "verified", explanation: "Confirmed in dialkit@2.2.1 type definitions." },
        { claim: "Mermaid supports dragging individual diagram nodes natively", verdict: "false", explanation: "Mermaid renders static SVG; interactive dragging requires XYFlow." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "document_viewer",
      category: "evidence",
      description: "Searchable multi-section document reader for specifications and reports.",
      dataSchema: `{ title: string; metadataLine?: string; sections: { heading: string; content: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Structured multi-section document inspector with search.",
      promptWhen: "Allowing users to read long specs, RFCs, or logs in-place.",
    }),
    component: DocumentViewer,
    sampleData: {
      title: "Component Contract Specification v1.0",
      metadataLine: "Revised Nov 2026 • 13 Required Fields",
      sections: [
        { heading: "1. Identity & Schema", content: "Every component defines a stable snake_case component_id, typed data_schema, and presentation props_schema." },
        { heading: "2. State Completeness", content: "Components must handle loading, streaming, ready, empty, and error states without throwing." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "document_diff",
      category: "evidence",
      description: "Split or unified diff viewer comparing two versions of text or configuration.",
      dataSchema: `{ title?: string; leftLabel?: string; rightLabel?: string; hunks: { section: string; before: string; after: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Side-by-side / unified text diff comparison.",
      promptWhen: "Comparing policy revisions, prompt updates, or schema diffs.",
    }),
    component: DocumentDiff,
    sampleData: {
      title: "API Budget Policy Diff",
      leftLabel: "v1.0",
      rightLabel: "v1.1",
      hunks: [
        { section: "max_tokens", before: "doUpstreamFetch(8192) // truncated rich UI blocks", after: "doUpstreamFetch(16384) // supports complex multi-panel responses" },
        { section: "diagram_engine", before: "Mermaid SVG static fallback only", after: "XYFlow + ELK.js primary with automatic Mermaid converter" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "article_reader",
      category: "evidence",
      description: "Clean editorial reader for extracted long-form web articles.",
      dataSchema: `{ title: string; author?: string; readTime?: string; date?: string; lead?: string; paragraphs: string[] }`,
      promptSummary: "Typography-focused article reading pane.",
      promptWhen: "Presenting scraped or synthesized long-form article text cleanly.",
    }),
    component: ArticleReader,
    sampleData: {
      title: "Why Interactive Graphs Beat Static Diagrams in AI UI",
      author: "Momo Engineering",
      readTime: "3 min read",
      date: "Nov 2026",
      lead: "Static SVG charts leave users staring at tiny labels. Live node canvases let users pan, zoom, and inspect metadata on demand.",
      paragraphs: [
        "When an AI outputs a 15-node service architecture inside a narrow chat column, fixed SVGs compress text into illegibility.",
        "Pairing ELK.js automated routing with XYFlow gives deterministic clean layout on initial stream plus full spatial exploration.",
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "research_brief",
      category: "evidence",
      description: "Executive research brief pairing core research question, findings, and open questions.",
      dataSchema: `{ title?: string; confidence?: string; question: string; findings: string[]; keyQuestions?: string[] }`,
      requiresSources: true,
      promptSummary: "Concise structured research synthesis brief.",
      promptWhen: "Delivering concise intelligence briefings with explicit open questions.",
    }),
    component: ResearchBrief,
    sampleData: {
      title: "Research Brief: Streaming OpenUI DSL",
      confidence: "High Confidence",
      question: "Can compact component syntax reduce stream truncation without sacrificing flexibility?",
      findings: ["Compact notation reduces output token spend ~38%", "Strict component registry guarantees valid client fallback"],
      keyQuestions: ["Should chat continue dual-supporting JSON blocks for backward compatibility?"],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "news_feed",
      category: "evidence",
      description: "Curated feed of recent news stories with publication outlet and timestamps.",
      dataSchema: `{ title?: string; articles: { headline: string; outlet: string; publishedAt: string; summary: string; url?: string }[] }`,
      requiresSources: true,
      promptSummary: "Chronological news coverage cards.",
      promptWhen: "Reporting current events, announcements, or market developments.",
    }),
    component: NewsFeed,
    sampleData: {
      title: "Relevant Coverage",
      articles: [
        { headline: "XYFlow v13 Ships Performance Improvements for Large Graphs", outlet: "React Status", publishedAt: "2 days ago", summary: "Reduced re-renders during smoothstep edge dragging.", url: "https://reactflow.dev" },
        { headline: "ELK.js WebWorker Bundling Patterns", outlet: "Frontend Weekly", publishedAt: "1 week ago", summary: "Best practices for running hierarchical layout cleanly in Next.js.", url: "https://eclipse.dev/elk/" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "claim_evidence_map",
      category: "evidence",
      description: "Interactive XYFlow graph linking assertions, corroborating artifacts, and counter-claims.",
      dataSchema: `{ title?: string; nodes: { id: string; label: string; type?: string; detail?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
      phase: "P3",
      complexity: "high",
      requiresSources: true,
      distinguishesInference: true,
      promptSummary: "Graph visualization mapping claims to underlying primary evidence.",
      promptWhen: "Showing multi-hop provenance between complex claims and citations.",
    }),
    component: ClaimEvidenceMap,
    sampleData: {
      title: "Claim-Evidence Provenance Map",
      nodes: [
        { id: "c1", label: "Claim: History compression cut tokens 78%", type: "conclusion", status: "success" },
        { id: "e1", label: "Evidence: serializeMessageForHistory benchmark", type: "evidence" },
        { id: "e2", label: "Evidence: API route 1200-char guard", type: "evidence" },
      ],
      edges: [
        { id: "k1", source: "e1", target: "c1", label: "measures" },
        { id: "k2", source: "e2", target: "c1", label: "enforces" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "evidence_timeline",
      category: "evidence",
      description: "Evidence artifacts sequenced chronologically with evidentiary weight indicator.",
      dataSchema: `{ title?: string; events: { title: string; timestamp: string; description: string; source?: string; weight?: "high"|"medium"|"low" }[] }`,
      requiresSources: true,
      promptSummary: "Timeline of forensic or empirical evidence artifacts.",
      promptWhen: "Reconstructing an evidentiary chronology.",
    }),
    component: EvidenceTimeline,
    sampleData: {
      title: "Incident Evidence Chronology",
      events: [
        { title: "Deploy v2.14 merged", timestamp: "14:28 UTC", description: "Added ALTER TABLE migration script.", source: "GitHub PR #901", weight: "high" },
        { title: "Lock queue > 40", timestamp: "14:32 UTC", description: "pg_stat_activity logged AccessExclusiveLock stalls.", source: "RDS Metrics", weight: "high" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "source_inspector",
      category: "evidence",
      description: "Tabbed deep source metadata & excerpt inspector.",
      dataSchema: `{ title?: string; sources: { title: string; domain: string; url: string; author?: string; date?: string; reliability?: string; fullExcerpt: string }[] }`,
      phase: "P3",
      complexity: "high",
      requiresSources: true,
      promptSummary: "Inspect source provenance, author, date, and full quoted passage.",
      promptWhen: "Reviewing raw source excerpts alongside credibility metadata.",
    }),
    component: SourceInspector,
    sampleData: {
      title: "Source Inspector",
      sources: [
        { title: "OpenStreetMap Nominatim Usage Policy", domain: "operations.osmfoundation.org", url: "https://operations.osmfoundation.org/policies/nominatim/", author: "OSM Foundation", date: "2024", reliability: "high", fullExcerpt: "Geocoding requests should cache results and include a valid User-Agent header." },
        { title: "PostgreSQL Explicit Locking", domain: "postgresql.org", url: "https://www.postgresql.org/docs/current/explicit-locking.html", author: "PG Global Dev", date: "2024", reliability: "high", fullExcerpt: "ACCESS EXCLUSIVE conflicts with locks of all modes and blocks concurrent SELECTs." },
      ],
    },
  });
}
