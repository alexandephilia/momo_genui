import { inferContextualIcon } from "@/components/genui/MistlineIcons";
import { parseMixedStreamToMistlineBlocks } from "@/lib/openui/streamParser";
import type { ChatMessage } from "@/types/momo";

export interface ExploreBranchSuggestion {
  kicker: string;
  icon: string;
  label: string;
  prompt: string;
  target: "explore" | "chat";
}

export function shortenTopicLabel(raw: string, maxLen = 40): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const wordSafe =
    lastSpace >= Math.floor(maxLen * 0.55)
      ? sliced.slice(0, lastSpace)
      : sliced;
  return `${wordSafe.replace(/[,.;:!?-]+$/, "").trimEnd()}…`;
}

function extractTurnEntityTitles(botMsg: ChatMessage | null): string[] {
  if (!botMsg?.text) return [];
  const parsed = parseMixedStreamToMistlineBlocks(botMsg.text, {
    final: !botMsg.streaming,
  });
  const titles: string[] = [];
  const push = (val: unknown) => {
    if (typeof val !== "string") return;
    const t = val.replace(/\s+/g, " ").trim();
    if (!t || t.length < 2 || t.length > 64) return;
    if (/^(kriteria|parameter|aspek|metrik|fitur|opsi|pilihan utama)$/i.test(t))
      return;
    if (!titles.some((x) => x.toLowerCase() === t.toLowerCase())) {
      titles.push(t);
    }
  };
  for (const b of parsed) {
    if (b.kind !== "ui") continue;
    const p = b.props ?? {};
    if (b.name === "Cards" && Array.isArray(p.items)) {
      for (const it of p.items) {
        if (it && typeof it === "object") {
          push((it as Record<string, unknown>).title);
        }
      }
    } else if (b.name === "Versus") {
      if (p.a && typeof p.a === "object") {
        const aRec = p.a as Record<string, unknown>;
        push(aRec.label ?? aRec.title);
      }
      if (p.b && typeof p.b === "object") {
        const bRec = p.b as Record<string, unknown>;
        push(bRec.label ?? bRec.title);
      }
    } else if (
      (b.name === "ComparisonTable" || b.name === "comparison_table") &&
      Array.isArray(p.entities)
    ) {
      for (const ent of p.entities) {
        if (typeof ent === "string") push(ent);
        else if (ent && typeof ent === "object") {
          push((ent as Record<string, unknown>).name);
        }
      }
    } else if (b.name === "Plan" && Array.isArray(p.days)) {
      for (const d of p.days) {
        if (d && typeof d === "object") {
          push((d as Record<string, unknown>).title);
        }
      }
    } else if (b.name === "VisualDossier") {
      push(p.subject ?? p.title);
    } else if (b.name === "Headline") {
      push(p.title);
    }
  }
  return titles;
}

function inferExploreBranchKicker(text: string, idx: number): string {
  const t = text.toLowerCase();
  if (/\b(banding|vs|versus|komparasi|beda|pilih)\b/.test(t))
    return "Adu Skenario";
  if (
    /\b(rute|akses|lokasi|gate|venue|peta|stasiun|mrt|shuttle|parkir|tempat)\b/.test(
      t,
    )
  )
    return "Peta & Akses";
  if (/\b(harga|biaya|tarif|budget|ongkos|murah|simulasi|estimasi)\b/.test(t))
    return "Estimasi & Biaya";
  if (
    /\b(jam|jadwal|tanggal|rundown|setlist|urutan|tahap|langkah|timeline)\b/.test(
      t,
    )
  )
    return "Urutan & Jadwal";
  if (/\b(syarat|dokumen|aturan|ketentuan|risiko|aman|tips|cek)\b/.test(t))
    return "Panduan & Risiko";
  const cycle = [
    "Cabang Visual",
    "Sudut Baru",
    "Uji Skenario",
    "Detail Konteks",
    "Langkah Lanjut",
  ];
  return cycle[idx % cycle.length];
}

/**
 * Builds consistent, non-duplicate Explore End-Cap follow-up rows (guaranteed >= 5 items)
 * with domain-inferred icons, semantic kickers, and target surface badges.
 */
export function buildContextualExploreBranches(
  turn: { userText: string; botMsg: ChatMessage | null } | null,
): ExploreBranchSuggestion[] {
  if (!turn) return [];
  const fullTopic = turn.userText.replace(/\s+/g, " ").trim();
  const shortTopic = shortenTopicLabel(fullTopic, 36);

  const aiFollowups: string[] = [];
  if (turn.botMsg?.text) {
    const parsed = parseMixedStreamToMistlineBlocks(turn.botMsg.text, {
      final: !turn.botMsg.streaming,
    });
    for (const b of parsed) {
      if (b.kind === "ui" && b.name === "Followups" && Array.isArray(b.props?.items)) {
        for (const rawItem of b.props.items) {
          if (typeof rawItem === "string" && rawItem.trim()) {
            aiFollowups.push(rawItem.replace(/\s+/g, " ").trim());
          }
        }
      }
    }
  }

  const entities = extractTurnEntityTitles(turn.botMsg);
  const usedIcons = new Set<string>();
  const seenLabels = new Set<string>();
  const exploreCards: ExploreBranchSuggestion[] = [];

  const pushUniqueBranch = (cand: {
    kicker: string;
    label: string;
    prompt: string;
    target: "explore" | "chat";
    explicitIcon?: string;
  }) => {
    const norm = cand.label.trim().toLowerCase();
    if (!norm || seenLabels.has(norm)) return;
    seenLabels.add(norm);
    const icon = inferContextualIcon(
      `${cand.kicker} ${cand.label} ${cand.prompt}`,
      cand.explicitIcon,
      exploreCards.length,
      usedIcons,
    );
    exploreCards.push({
      kicker: cand.kicker,
      icon,
      label: cand.label,
      prompt: cand.prompt,
      target: cand.target,
    });
  };

  for (let i = 0; i < aiFollowups.length; i++) {
    if (exploreCards.length >= 5) break;
    const f = aiFollowups[i];
    pushUniqueBranch({
      kicker: inferExploreBranchKicker(f, i),
      label: shortenTopicLabel(f, 72),
      prompt: f,
      target: "explore",
    });
  }

  const fallbackPool: Array<{
    kicker: string;
    label: string;
    prompt: string;
    explicitIcon?: string;
  }> = [];

  if (entities.length >= 2) {
    fallbackPool.push({
      kicker: "Adu Skenario",
      label: `Bandingkan ${shortenTopicLabel(entities[0], 24)} vs ${shortenTopicLabel(entities[1], 24)}`,
      prompt: `Susun perbandingan visual berdampingan antara "${entities[0]}" dan "${entities[1]}" terkait "${fullTopic}", lengkap dengan konsekuensi praktisnya.`,
      explicitIcon: "compare",
    });
  } else if (entities.length === 1) {
    fallbackPool.push({
      kicker: "Kupas Fokus",
      label: `Bedah visual mendalam “${shortenTopicLabel(entities[0], 38)}”`,
      prompt: `Perdalam eksplorasi visual khusus pada "${entities[0]}" dalam konteks "${fullTopic}", termasuk detail komponen, kelebihan, dan risikonya.`,
      explicitIcon: "compass",
    });
  }

  fallbackPool.push(
    {
      kicker: "Urutan & Risiko",
      label: `Peta tahapan eksekusi & titik rawan “${shortTopic}”`,
      prompt: `Petakan tahapan implementasi atau urutan langkah konkret beserta titik kegagalan utama untuk "${fullTopic}" dalam spread visual.`,
      explicitIcon: "route",
    },
    {
      kicker: "Matriks Keputusan",
      label: `Kriteria pilih & checklist praktis “${shortTopic}”`,
      prompt: `Susun matriks kriteria keputusan dan checklist praktis untuk memilih pendekatan paling tepat terkait "${fullTopic}".`,
      explicitIcon: "check",
    },
    {
      kicker: "Estimasi & Skala",
      label: `Rincian angka kunci, biaya, atau kapasitas “${shortTopic}”`,
      prompt: `Jabarkan metrik kuantitatif, estimasi biaya/waktu, dan simulasi parameter penting untuk "${fullTopic}".`,
      explicitIcon: "coins",
    },
    {
      kicker: "Alternatif Kontras",
      label: `Opsi strategi alternatif di luar jalur umum`,
      prompt: `Tampilkan alternatif pendekatan yang jarang terpikirkan untuk "${fullTopic}" dan bandingkan komprominya secara visual.`,
      explicitIcon: "sparkles",
    },
  );

  // Ensure at least 4 Explore branches before appending the Chat deep-dive branch (minimum 5 total)
  for (const fb of fallbackPool) {
    if (exploreCards.length >= 4) break;
    pushUniqueBranch({
      ...fb,
      target: "explore",
    });
  }

  pushUniqueBranch({
    kicker: "Bedah di Chat",
    label: `Diskusi teknis & langkah detail “${shortTopic}”`,
    prompt: `Bedah secara mendalam hasil eksplorasi soal "${fullTopic}"${entities.length > 0 ? ` (khususnya ${entities.slice(0, 2).join(" & ")})` : ""}: jelaskan mekanisme inti, batasan nyata, dan rekomendasi eksekusi langsung.`,
    target: "chat",
    explicitIcon: "book",
  });

  // Final safety top-up so total branches is strictly >= 5
  for (const fb of fallbackPool) {
    if (exploreCards.length >= 5) break;
    pushUniqueBranch({
      ...fb,
      target: "explore",
    });
  }

  return exploreCards.slice(0, 6);
}
