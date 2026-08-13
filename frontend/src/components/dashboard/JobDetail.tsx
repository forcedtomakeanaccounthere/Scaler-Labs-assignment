"use client";

import { useState, useEffect } from "react";
import { getJob, getJobReport, submitReview, getDownloadUrl, type Job, type Entity } from "@/lib/api";

const ACTION_COLOR: Record<string, string> = {
  MASK: "#FF453A",
  PSEUDONYMIZE: "#A78BFA",
  GENERALIZE: "#FF9F0A",
  KEEP: "#30D158",
  PENDING_REVIEW: "#007AFF",
};

const SOURCE_COLOR: Record<string, string> = {
  REGEX: "#30D158",
  NER: "#007AFF",
  OCR: "#FF9F0A",
  MANUAL: "#A78BFA",
};

interface Props {
  jobId: string | null;
  jobs: Job[];
  onRefresh: () => void;
}

export default function JobDetail({ jobId, jobs, onRefresh }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [reportTab, setReportTab] = useState<"entities" | "metrics" | "audit">("entities");
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, "ACCEPTED" | "REJECTED">>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    const found = jobs.find((j) => j._id === jobId);
    if (found) setJob(found);

    // Also fetch fresh from API
    getJob(jobId).then((r) => setJob(r.job)).catch(() => {});
  }, [jobId, jobs]);

  const handleReviewSubmit = async () => {
    if (!job) return;
    setSubmittingReview(true);
    try {
      const decisions = Object.entries(reviewDecisions).map(([entityId, action]) => ({
        entityId,
        action,
      }));
      await submitReview(job._id, decisions);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!jobId || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 space-y-4">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div>
          <div className="text-[16px] font-semibold" style={{ color: "var(--text-secondary)" }}>Select a job to view details</div>
          <div className="text-[13px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Upload a .docx or pick from your job history
          </div>
        </div>
      </div>
    );
  }

  const entities = job.entities || [];
  const pendingReview = entities.filter((e) => e.action === "PENDING_REVIEW");
  const redactedEntities = entities.filter((e) => e.action !== "KEEP" && e.action !== "PENDING_REVIEW");

  return (
    <div className="p-5 sm:p-8 space-y-6">
      {/* ── Job Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-[20px] font-bold" style={{ color: "var(--text-primary)" }}>
              {job.originalFilename}
            </h1>
            <StatusBadge status={job.status} />
          </div>
          <div className="text-[12px] mono" style={{ color: "var(--text-tertiary)" }}>
            Created {new Date(job.createdAt).toLocaleString()} · Job ID: {job._id.slice(-8)}
          </div>
        </div>

        {/* Download button */}
        {job.status === "completed" && job.hasOutput && (
          <a
            href={`/api/jobs/${job._id}/download`}
            download
            onClick={(e) => {
              e.preventDefault();
              window.open(getDownloadUrl(job._id), "_blank");
            }}
            className="btn-primary text-[13px] !py-2.5 !px-5 flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Redacted .docx
          </a>
        )}
      </div>

      {/* ── Processing indicator ─────────────────────────────────── */}
      {(job.status === "processing" || job.status === "pending") && (
        <div
          className="rounded-2xl p-5 border flex items-center gap-4"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="w-8 h-8 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: "rgba(0,122,255,0.2)", borderTopColor: "#007AFF" }} />
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {job.status === "processing" ? "Processing your document..." : "Queued for processing..."}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Running regex + NER detection and OCR image pipeline
            </div>
          </div>
        </div>
      )}

      {/* ── Evaluation Summary ────────────────────────────────────── */}
      {job.status === "completed" && job.evaluation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Precision", value: job.evaluation.overall.precision, color: "#007AFF" },
            { label: "Recall", value: job.evaluation.overall.recall, color: "#30D158" },
            { label: "F1 Score", value: job.evaluation.overall.f1, color: "#A78BFA" },
            { label: "Entities Found", value: null, raw: entities.length.toString(), color: "#FF9F0A" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-2xl p-4 border text-center"
              style={{ background: "var(--bg-surface)", borderColor: `${m.color}25` }}
            >
              <div className="text-[22px] font-bold mono" style={{ color: m.color }}>
                {m.raw ?? `${((m.value ?? 0) * 100).toFixed(1)}%`}
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Human Review Panel ────────────────────────────────────── */}
      {job.status === "awaiting_review" && pendingReview.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(167,139,250,0.3)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "rgba(167,139,250,0.08)", borderBottom: "1px solid rgba(167,139,250,0.2)" }}>
            <div>
              <div className="text-[14px] font-bold" style={{ color: "#A78BFA" }}>Human Review Required</div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {pendingReview.length} low-confidence entities need your decision
              </div>
            </div>
            <button
              onClick={handleReviewSubmit}
              disabled={submittingReview}
              className="btn-primary text-[13px] !py-2 !px-4"
              style={{ background: "#A78BFA" }}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
            {pendingReview.map((entity) => (
              <EntityReviewRow
                key={entity._id}
                entity={entity}
                decision={reviewDecisions[entity._id] || null}
                onDecide={(action) =>
                  setReviewDecisions((prev) => ({ ...prev, [entity._id]: action }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Entity/Metrics/Audit Tabs ─────────────────────────────── */}
      {entities.length > 0 && (
        <div>
          <div className="flex gap-1 mb-4 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            {(["entities", "metrics", "audit"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setReportTab(tab)}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold capitalize transition-all duration-200"
                style={{
                  background: reportTab === tab ? "var(--bg-surface)" : "transparent",
                  color: reportTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: reportTab === tab ? "var(--shadow-xs)" : "none",
                }}
              >
                {tab === "entities" ? `Entities (${entities.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {reportTab === "entities" && (
            <EntitiesTable entities={entities} />
          )}

          {reportTab === "metrics" && job.evaluation && (
            <MetricsView evaluation={job.evaluation} />
          )}

          {reportTab === "audit" && (
            <AuditView job={job} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; label: string; bg: string }> = {
    pending:         { color: "#FF9F0A", label: "Pending",      bg: "rgba(255,159,10,0.12)" },
    processing:      { color: "#007AFF", label: "Processing",   bg: "rgba(0,122,255,0.12)" },
    awaiting_review: { color: "#A78BFA", label: "Needs Review", bg: "rgba(167,139,250,0.12)" },
    completed:       { color: "#30D158", label: "Completed",    bg: "rgba(48,209,88,0.12)" },
    failed:          { color: "#FF453A", label: "Failed",       bg: "rgba(255,69,58,0.12)" },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className="text-[11px] font-bold mono px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

function EntityReviewRow({ entity, decision, onDecide }: { entity: Entity; decision: "ACCEPTED" | "REJECTED" | null; onDecide: (a: "ACCEPTED" | "REJECTED") => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)", color: "#007AFF" }}>
          {entity.type}
        </span>
        <span className="text-[12px] mono truncate" style={{ color: "var(--text-secondary)" }}>
          [{entity.type}] · {(entity.confidence * 100).toFixed(0)}% conf
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onDecide("ACCEPTED")}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors duration-150"
          style={{
            background: decision === "ACCEPTED" ? "rgba(48,209,88,0.15)" : "var(--bg-elevated)",
            color: decision === "ACCEPTED" ? "#30D158" : "var(--text-tertiary)",
            border: `1px solid ${decision === "ACCEPTED" ? "rgba(48,209,88,0.3)" : "var(--border)"}`,
          }}
        >
          Accept
        </button>
        <button
          onClick={() => onDecide("REJECTED")}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors duration-150"
          style={{
            background: decision === "REJECTED" ? "rgba(255,69,58,0.15)" : "var(--bg-elevated)",
            color: decision === "REJECTED" ? "#FF453A" : "var(--text-tertiary)",
            border: `1px solid ${decision === "REJECTED" ? "rgba(255,69,58,0.3)" : "var(--border)"}`,
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function EntitiesTable({ entities }: { entities: Entity[] }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
      <div className="grid grid-cols-4 gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest mono" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}>
        <span>Type</span>
        <span>Confidence</span>
        <span>Source</span>
        <span>Action</span>
      </div>
      <div className="divide-y" style={{ divideColor: "var(--border)" } as any}>
        {entities.map((e) => (
          <div key={e._id} className="grid grid-cols-4 gap-2 px-4 py-3 text-[12px] items-center">
            <span className="font-bold mono" style={{ color: "var(--text-primary)" }}>{e.type}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)", maxWidth: "60px" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round(e.confidence * 100)}%`, background: e.confidence >= 0.9 ? "#30D158" : e.confidence >= 0.7 ? "#FF9F0A" : "#FF453A" }} />
              </div>
              <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>{(e.confidence * 100).toFixed(0)}%</span>
            </div>
            <span className="text-[10px] font-bold mono px-2 py-0.5 rounded-full w-fit" style={{ background: `${SOURCE_COLOR[e.source] || "#888"}15`, color: SOURCE_COLOR[e.source] || "#888" }}>
              {e.source}
            </span>
            <span className="text-[10px] font-bold mono px-2 py-0.5 rounded-full w-fit" style={{ background: `${ACTION_COLOR[e.action] || "#888"}15`, color: ACTION_COLOR[e.action] || "#888" }}>
              {e.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsView({ evaluation }: { evaluation: NonNullable<Job["evaluation"]> }) {
  return (
    <div className="space-y-4">
      {evaluation.byType.length > 0 && (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-5 gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest mono" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}>
            <span className="col-span-2">Entity Type</span>
            <span>Precision</span>
            <span>Recall</span>
            <span>F1</span>
          </div>
          {evaluation.byType.map((row) => (
            <div key={row.entityType} className="grid grid-cols-5 gap-2 px-4 py-3 text-[12px] border-t" style={{ borderColor: "var(--border)" }}>
              <span className="col-span-2 font-bold mono" style={{ color: "var(--text-primary)" }}>{row.entityType}</span>
              <span className="mono" style={{ color: "#007AFF" }}>{(row.precision * 100).toFixed(1)}%</span>
              <span className="mono" style={{ color: "#30D158" }}>{(row.recall * 100).toFixed(1)}%</span>
              <span className="mono" style={{ color: "#A78BFA" }}>{(row.f1 * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Images", value: evaluation.imageMetrics.totalImages },
          { label: "Images w/ PII", value: evaluation.imageMetrics.imagesWithPii },
          { label: "Regions Redacted", value: evaluation.imageMetrics.regionsRedacted },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border text-center" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <div className="text-[22px] font-bold mono" style={{ color: "#FF453A" }}>{m.value}</div>
            <div className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditView({ job }: { job: Job }) {
  const auditLog = (job as any).auditLog || [];
  return (
    <div className="space-y-2">
      {auditLog.length === 0 ? (
        <div className="text-center py-8 text-[13px]" style={{ color: "var(--text-tertiary)" }}>No audit log entries</div>
      ) : (
        auditLog.map((entry: any, i: number) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl border"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#30D158" }} />
              <div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{entry.action}</div>
                {entry.detail && (
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{entry.detail}</div>
                )}
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
