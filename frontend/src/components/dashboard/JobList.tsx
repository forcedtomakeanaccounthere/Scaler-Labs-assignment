"use client";

import { type Job } from "@/lib/api";

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  pending:          { color: "#FF9F0A", label: "Pending",          bg: "rgba(255,159,10,0.12)" },
  processing:       { color: "#007AFF", label: "Processing",       bg: "rgba(0,122,255,0.12)" },
  awaiting_review:  { color: "#A78BFA", label: "Needs Review",     bg: "rgba(167,139,250,0.12)" },
  completed:        { color: "#30D158", label: "Completed",        bg: "rgba(48,209,88,0.12)" },
  failed:           { color: "#FF453A", label: "Failed",           bg: "rgba(255,69,58,0.12)" },
};

interface Props {
  jobs: Job[];
  loading: boolean;
  selectedJobId: string | null;
  onSelect: (id: string) => void;
}

export default function JobList({ jobs, loading, selectedJobId, onSelect }: Props) {
  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--bg-elevated)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>No jobs yet</div>
        <div className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Upload a .docx to get started</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
        const isSelected = selectedJobId === job._id;
        const entityCount = job.entities?.length ?? 0;

        return (
          <button
            key={job._id}
            onClick={() => onSelect(job._id)}
            className="w-full text-left p-3.5 rounded-2xl border transition-all duration-150"
            style={{
              background: isSelected ? "var(--accent-subtle)" : "var(--bg-base)",
              borderColor: isSelected ? "rgba(0,122,255,0.35)" : "var(--border)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              {/* File icon + name */}
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {job.originalFilename}
                  </div>
                  <div className="text-[11px] mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {new Date(job.createdAt).toLocaleDateString()} · {new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <span
                className="text-[10px] font-bold mono px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
              >
                {cfg.label}
              </span>
            </div>

            {/* Progress / entity count */}
            {(job.status === "processing" || job.status === "pending") && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: job.status === "processing" ? "60%" : "15%",
                      background: "var(--accent)",
                      transition: "width 1s ease",
                    }}
                  />
                </div>
                <span className="text-[10px] mono" style={{ color: "var(--text-tertiary)" }}>
                  {job.status === "processing" ? "Analyzing..." : "Queued"}
                </span>
              </div>
            )}

            {job.status === "completed" && (
              <div className="mt-2 flex items-center gap-3 text-[11px] mono">
                <span style={{ color: "#30D158" }}>{entityCount} PII found</span>
                {job.evaluation?.overall?.f1 !== undefined && (
                  <span style={{ color: "var(--text-tertiary)" }}>
                    F1: {(job.evaluation.overall.f1 * 100).toFixed(1)}%
                  </span>
                )}
                {job.hasOutput && (
                  <span style={{ color: "var(--accent)" }}>↓ Ready</span>
                )}
              </div>
            )}

            {job.status === "awaiting_review" && (
              <div className="mt-2 text-[11px] mono" style={{ color: "#A78BFA" }}>
                {job.entities?.filter((e) => e.action === "PENDING_REVIEW").length ?? 0} entities need review
              </div>
            )}

            {job.status === "failed" && (
              <div className="mt-2 text-[11px] truncate" style={{ color: "#FF453A" }}>
                {job.errorMessage || "Processing failed"}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
