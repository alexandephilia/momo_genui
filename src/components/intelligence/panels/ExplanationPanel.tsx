"use client";

/**
 * ExplanationPanel — Structured explanation (Momo uncontained + 4 variants)
 */

import { useContext, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { ChevronDown, ChevronUp, FileText, ListOrdered, BookOpen, CheckSquare } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { Collapse } from "../shared/StateMotion";

interface EvidenceItem {
  label: string;
  url?: string;
}

interface ExplanationData {
  title?: string;
  summary: string;
  steps?: string[];
  evidence?: EvidenceItem[];
  conclusion?: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="intel-explanation__section">
      <motion.button className="intel-explanation__section-header" whileHover={MH.chip} whileTap={MH.tap} transition={MH.spring} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="intel-explanation__section-left">
          {icon}
          <span>{title}</span>
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </motion.button>
      <Collapse open={open}>
        <div className="intel-explanation__section-body">{children}</div>
      </Collapse>
    </div>
  );
}

export default function ExplanationPanel({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as ExplanationData;

  if (state === "loading") {
    return (
      <div className="intel-explanation intel-explanation--skeleton" data-variant={resolvedVariant} role="status" aria-label="Loading explanation">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div className="intel-skeleton-line" style={{ width: "35%", height: 14 }} />
            <div className="intel-skeleton-line" style={{ width: "90%", height: 12, marginTop: 6 }} />
            <div className="intel-skeleton-line" style={{ width: "75%", height: 12, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-explanation intel-explanation--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load explanation</span>
      </div>
    );
  }

  if (state === "empty" || !d.summary) {
    return (
      <div className="intel-explanation intel-explanation--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No explanation available</span>
      </div>
    );
  }

  return (
    <div className="intel-explanation" data-variant={resolvedVariant} role="article" aria-label={d.title || "Explanation"}>
      {d.title && <h3 className="intel-explanation__title">{d.title}</h3>}

      <CollapsibleSection title="Summary" icon={<FileText size={14} />} defaultOpen>
        <p className="intel-explanation__text">{d.summary}</p>
      </CollapsibleSection>

      {d.steps && d.steps.length > 0 && (
        <CollapsibleSection title="Reasoning Steps" icon={<ListOrdered size={14} />} defaultOpen>
          <ol className="intel-explanation__steps">
            {d.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {d.evidence && d.evidence.length > 0 && (
        <CollapsibleSection title="Evidence" icon={<BookOpen size={14} />} defaultOpen={false}>
          <ul className="intel-explanation__evidence">
            {d.evidence.map((e, i) => (
              <li key={i}>
                {e.url && /^https?:\/\//i.test(e.url) ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="intel-explanation__link">
                    {e.label}
                  </a>
                ) : (
                  <span>{e.label}</span>
                )}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {d.conclusion && (
        <CollapsibleSection title="Conclusion" icon={<CheckSquare size={14} />} defaultOpen>
          <p className="intel-explanation__text">{d.conclusion}</p>
        </CollapsibleSection>
      )}
    </div>
  );
}
