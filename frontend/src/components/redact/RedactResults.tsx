"use client";

import { useState } from "react";
import type { Job } from "@/lib/api";

type RTab = "entities" | "metrics" | "audit";

const ACTION_COLOR: Record<string, string> = {
  MASK:           "#FF453A",
  PSEUDONYMIZE:   "#A78BFA",
  GENERALIZE:     "#FF9F0A",
  KEEP:           "#30D158",
  PENDING_REVIEW: "#007AFF",
};

const SOURCE_COLOR: Record<string, string> = {
  REGEX:  "#30D158",
  NER:    "#007AFF",
  OCR:    "#FF9F0A",
  MANUAL: "#A78BFA",
};

export default function RedactResults({ job }: { job: Job }) {
  const [tab, setTab] = useState<RTab>("entities");
  const entities = job.entities || [];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["entities", "metrics", "audit"] as RTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-[12px] font-semibold capitalize transition-all duration-200 relative"
            style={{ color: tab === t ? "var(--accent)" : "var(--text-tertiary)" }}
          >
            {t === "entities"
              ? `Entities (${entities.length})`
              : t === "metrics"
              ? "Evaluation"
              : "Audit Log"}
            {tab === t && (
              <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === "entities" && <EntitiesTab entities={entities} />}
        {tab === "metrics" && <MetricsTab evaluation={job.evaluation} />}
        {tab === "audit" && <AuditTab job={job} />}
      </div>
    </div>
  );
}

function EntitiesTab({ entities }: { entities: NonNullable<Job["entities"]> }) {
  const [filter, setFilter] = useState<string>("all");
  const types = Array.from(new Set(entities.map((e) => e.type)));
  const filtered = filter === "all" ? entities : entities.filter((e) => e.type === filter);

  if (entities.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>No PII entities detected</div>
        <div className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>The document may not contain recognisable PII</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className="px-2.5 py-1 rounded-full text-[10px] font-bold mono transition-colors"
          style={{
            background: filter === "all" ? "var(--accent)" : "var(--bg-elevated)",
            color: filter === "all" ? "#fff" : "var(--text-tertiary)",
            border: `1px solid ${filter === "all" ? "transparent" : "var(--border)"}`,
          }}
        >
          ALL ({entities.length})
        </button>
        {types.map((type) => {
          const count = entities.filter((e) => e.type === type).length;
          const color = ACTION_COLOR[entities.find((e) => e.type === type)?.action || ""] || "#888";
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold mono transition-colors"
              style={{
                background: filter === type ? `${color}20` : "var(--bg-elevated)",
                color: filter === type ? color : "var(--text-tertiary)",
                border: `1px solid ${filter === type ? `${color}40` : "var(--border)"}`,
              }}
            >
              {type} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        <div
          className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest mono"
          style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}
        >
          <span className="col-span-1">Type</span>
          <span className="col-span-1">Confidence</span>
          <span className="col-span-1">Source</span>
          <span className="col-span-1">Action</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map((e, i) => (
            <div
              key={e._id || i}
              className="grid grid-cols-4 gap-2 px-4 py-3 text-[12px] items-center border-t"
              style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--bg-base)" : "transparent" }}
            >
              <span className="font-bold mono col-span-1 truncate" style={{ color: "var(--text-primary)", fontSize: "11px" }}>
                {e.type}
              </span>
              <div className="flex items-center gap-1.5 col-span-1">
                <div className="w-12 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: "var(--bg-elevated)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(e.confidence * 100)}%`,
                      background: e.confidence >= 0.9 ? "#30D158" : e.confidence >= 0.7 ? "#FF9F0A" : "#FF453A",
                    }}
                  />
                </div>
                <span className="text-[10px] mono" style={{ color: "var(--text-tertiary)" }}>{(e.confidence * 100).toFixed(0)}%</span>
              </div>
              <span
                className="text-[9px] font-bold mono px-1.5 py-0.5 rounded col-span-1 w-fit"
                style={{ background: `${SOURCE_COLOR[e.source] || "#888"}15`, color: SOURCE_COLOR[e.source] || "#888" }}
              >
                {e.source}
              </span>
              <span
                className="text-[9px] font-bold mono px-1.5 py-0.5 rounded col-span-1 w-fit"
                style={{ background: `${ACTION_COLOR[e.action] || "#888"}15`, color: ACTION_COLOR[e.action] || "#888" }}
              >
                {e.action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricsTab({ evaluation }: { evaluation: Job["evaluation"] }) {
  if (!evaluation) {
    return <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>No evaluation data</div>;
  }

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Precision", value: evaluation.overall.precision, color: "#007AFF" },
          { label: "Recall",    value: evaluation.overall.recall,    color: "#30D158" },
          { label: "F1 Score",  value: evaluation.overall.f1,        color: "#A78BFA" },
          { label: "Accuracy",  value: evaluation.overall.accuracy,  color: "#FF9F0A" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl p-3 border text-center" style={{ background: "var(--bg-base)", borderColor: `${m.color}25` }}>
            <div className="text-[20px] font-bold mono" style={{ color: m.color }}>{(m.value * 100).toFixed(1)}%</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Per-type */}
      {evaluation.byType.length > 0 && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest mono" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}>
            <span className="col-span-2">Entity Type</span>
            <span>Precision</span>
            <span>Recall</span>
            <span>F1</span>
          </div>
          {evaluation.byType.map((row) => (
            <div key={row.entityType} className="grid grid-cols-5 gap-2 px-4 py-3 text-[12px] border-t" style={{ borderColor: "var(--border)" }}>
              <span className="col-span-2 font-bold mono" style={{ color: "var(--text-primary)", fontSize: "11px" }}>{row.entityType}</span>
              <span className="mono" style={{ color: "#007AFF" }}>{(row.precision * 100).toFixed(1)}%</span>
              <span className="mono" style={{ color: "#30D158" }}>{(row.recall * 100).toFixed(1)}%</span>
              <span className="mono" style={{ color: "#A78BFA" }}>{(row.f1 * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Image metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Images",      value: evaluation.imageMetrics.totalImages },
          { label: "Images with PII",   value: evaluation.imageMetrics.imagesWithPii },
          { label: "Regions Redacted",  value: evaluation.imageMetrics.regionsRedacted },
        ].map((m) => (
          <div key={m.label} className="rounded-xl p-3 border text-center" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
            <div className="text-[20px] font-bold mono" style={{ color: "#FF453A" }}>{m.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ job }: { job: Job }) {
  const logs = (job as any).auditLog || [];
  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto">
      {logs.length === 0 ? (
        <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>No audit entries</div>
      ) : (
        logs.map((entry: any, i: number) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl border"
            style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#30D158" }} />
              <div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{entry.action}</div>
                {entry.detail && <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{entry.detail}</div>}
              </div>
            </div>
            <span className="text-[10px] mono flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
              {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ""}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
