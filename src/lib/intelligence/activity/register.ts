/**
 * Activity / Evidence / Monitoring — Component Registration
 *
 * Registers all 8 activity-category components into the Intelligence UI
 * registry with full 13-point specs and realistic sample data.
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import AlertFeed from "@/components/intelligence/activity/AlertFeed";
import SourceCard from "@/components/intelligence/activity/SourceCard";
import SourceList from "@/components/intelligence/activity/SourceList";
import SearchResults from "@/components/intelligence/activity/SearchResults";

export function registerActivityComponents(): void {
  /* ─── 1. AlertFeed ─── */
  registerIntelComponent({
    spec: {
      componentId: "alert_feed",
      category: "investigation",
      description:
        "Vertical alert list grouped by severity (critical, warning, info, success) with dismiss buttons.",
      dataSchema: `{ alerts: Array<{ id: string; severity: "critical"|"warning"|"info"|"success"; title: string; description?: string; timestamp?: string }> }`,
      propsSchema: `IntelBaseProps`,
      interactions: { clickable: true, filterable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No alerts' with check icon",
      errorState: "Shows error icon with failure message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: {
        role: "log",
        keyboardNav: true,
        ariaLabel: "Alert feed",
        reducedMotion: false,
        highContrast: true,
      },
      sourceContract: {
        supportsCitations: false,
        requiresSources: false,
        distinguishesInference: false,
      },
      renderReadiness: ["alerts array populated"],
      phase: "P1",
      complexity: "medium",
      promptSummary:
        "Severity-grouped alert feed with dismiss functionality",
      promptWhen:
        "Show when there are alerts, notifications, or warnings to display to the user, grouped by severity",
      implemented: true,
    },
    component: AlertFeed,
    sampleData: {
      alerts: [
        { id: "a1", severity: "critical", title: "API rate limit exceeded", description: "The OpenAI API has returned 429 errors for the last 3 requests.", timestamp: "2 min ago" },
        { id: "a2", severity: "warning", title: "Memory usage high", description: "Current session is using 85% of available context window.", timestamp: "5 min ago" },
        { id: "a3", severity: "info", title: "New model available", description: "GPT-4o-mini is now available for faster responses.", timestamp: "1 hour ago" },
        { id: "a4", severity: "success", title: "Deployment complete", description: "Production build deployed successfully.", timestamp: "3 hours ago" },
      ],
    },
  });

  /* ─── 6. SourceCard ─── */
  registerIntelComponent({
    spec: {
      componentId: "source_card",
      category: "evidence",
      description:
        "Single source reference card with title link, domain badge, snippet, published date, reliability badge, and copy citation button.",
      dataSchema: `{ source: IntelSource; snippet?: string }`,
      propsSchema: `IntelBaseProps`,
      interactions: { clickable: true, hoverable: true, exportable: true },
      loadingState: "skeleton",
      emptyState: "Returns null when no source data",
      errorState: "Shows 'Source unavailable' message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: {
        role: "article",
        keyboardNav: true,
        ariaLabel: "Source reference card",
        reducedMotion: false,
        highContrast: false,
      },
      sourceContract: {
        supportsCitations: true,
        requiresSources: true,
        distinguishesInference: false,
      },
      renderReadiness: ["source object present with title and url"],
      phase: "P1",
      complexity: "low",
      promptSummary:
        "Individual source card with citation copy, reliability badge, and navigation",
      promptWhen:
        "Show when a single source needs to be displayed with full detail including snippet, reliability, and citation",
      implemented: true,
    },
    component: SourceCard,
    sampleData: {
      source: {
        title: "Understanding React Server Components",
        url: "https://react.dev/blog/2023/03/22/react-labs",
        domain: "react.dev",
        reliability: "high",
        publishedDate: "Mar 22, 2023",
        description: "React Server Components let you write UI that can be rendered and cached on the server.",
      },
      snippet:
        "Server Components run only on the server. They have zero bundle-size impact and can directly access backend resources like databases and file systems.",
    },
  });

  /* ─── 7. SourceList ─── */
  registerIntelComponent({
    spec: {
      componentId: "source_list",
      category: "evidence",
      description:
        "List of SourceCard components with sort (relevance/date), filter by reliability, and group-by-domain toggle.",
      dataSchema: `{ sources: Array<{ source: IntelSource; snippet?: string }> }`,
      propsSchema: `IntelBaseProps`,
      interactions: {
        clickable: true,
        filterable: true,
        sortable: true,
        toggleable: true,
      },
      loadingState: "skeleton",
      emptyState: "Shows 'No sources available' text",
      errorState: "Shows error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: {
        role: "list",
        keyboardNav: true,
        ariaLabel: "Source reference list",
        reducedMotion: false,
        highContrast: false,
      },
      sourceContract: {
        supportsCitations: true,
        requiresSources: true,
        distinguishesInference: false,
      },
      renderReadiness: ["sources array populated with at least one entry"],
      phase: "P1",
      complexity: "medium",
      dependsOn: ["source_card"],
      promptSummary:
        "Sortable, filterable list of source cards with domain grouping",
      promptWhen:
        "Show when multiple sources need to be presented with sorting, filtering, and grouping controls",
      implemented: true,
    },
    component: SourceList,
    sampleData: {
      sources: [
        {
          source: { title: "React Documentation", url: "https://react.dev/reference", domain: "react.dev", reliability: "high", publishedDate: "2024-01-15" },
          snippet: "Official React reference documentation covering hooks, components, and APIs.",
        },
        {
          source: { title: "Next.js App Router", url: "https://nextjs.org/docs/app", domain: "nextjs.org", reliability: "high", publishedDate: "2024-02-20" },
          snippet: "The App Router uses React Server Components and supports layouts, loading states, and error handling.",
        },
        {
          source: { title: "CSS-Tricks: Flexbox Guide", url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/", domain: "css-tricks.com", reliability: "medium", publishedDate: "2023-06-10" },
          snippet: "A complete guide to CSS flexbox layout with visual examples and browser support details.",
        },
        {
          source: { title: "JavaScript Performance Tips", url: "https://blog.example.com/js-perf", domain: "blog.example.com", reliability: "low", publishedDate: "2023-11-05" },
          snippet: "Common JavaScript performance pitfalls and how to avoid them in production applications.",
        },
      ],
    },
  });

  /* ─── 8. SearchResults ─── */
  registerIntelComponent({
    spec: {
      componentId: "search_results",
      category: "evidence",
      description:
        "Query display header with result list (title link, snippet, URL, date), result count, and 'Load more' button.",
      dataSchema: `{ query: string; results: Array<{ id: string; title: string; url: string; snippet: string; date?: string }>; totalCount?: number; hasMore?: boolean }`,
      propsSchema: `IntelBaseProps`,
      interactions: { clickable: true, hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No results' message with query text",
      errorState: "Shows 'Search failed' message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: {
        role: "region",
        keyboardNav: true,
        ariaLabel: "Search results",
        reducedMotion: false,
        highContrast: false,
      },
      sourceContract: {
        supportsCitations: true,
        requiresSources: false,
        distinguishesInference: false,
      },
      renderReadiness: ["query string present", "results array populated"],
      phase: "P1",
      complexity: "medium",
      promptSummary:
        "Search results display with query header, result list, and load-more pagination",
      promptWhen:
        "Show when displaying web search or knowledge base search results to the user",
      implemented: true,
    },
    component: SearchResults,
    sampleData: {
      query: "React Server Components best practices",
      totalCount: 42,
      hasMore: true,
      results: [
        {
          id: "r1",
          title: "Understanding React Server Components",
          url: "https://react.dev/blog/server-components",
          snippet:
            "React Server Components let you render components on the server, reducing client-side JavaScript and improving performance.",
          date: "Jan 15, 2024",
        },
        {
          id: "r2",
          title: "Best Practices for RSC in Next.js",
          url: "https://nextjs.org/docs/app/building-your-application",
          snippet:
            "Learn how to effectively use React Server Components within the Next.js App Router for optimal performance.",
          date: "Feb 20, 2024",
        },
        {
          id: "r3",
          title: "Server Components: A Deep Dive",
          url: "https://blog.example.com/rsc-deep-dive",
          snippet:
            "An in-depth exploration of the React Server Components architecture, data fetching patterns, and common pitfalls.",
          date: "Mar 10, 2024",
        },
      ],
    },
  });
}
