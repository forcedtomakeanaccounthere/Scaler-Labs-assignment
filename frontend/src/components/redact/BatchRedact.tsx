"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { uploadBatch, getJob, getDownloadUrl, subscribeToProgress, type Job, type ProgressEvent } from "@/lib/api";
import type { UserProfile } from "@/providers/AuthProvider";
import PolicyConfig from "./PolicyConfig";
import RedactResults from "./RedactResults";

interface BatchJobState {
  file: File;
  job: Job | null;
  stage: "pending" | "uploading" | "processing" | "done" | "failed";
  progress: ProgressEvent | null;
  error: string;
}

const MAX_FILES = 5;

interface Props {
  user: UserProfile | null;
}

export default function BatchRedact({ user }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [batchJobs, setBatchJobs] = useState<BatchJobState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [policy, setPolicy] = useState<Record<string, string>>({});
  const [defaultAction, setDefaultAction] = useState<"MASK" | "PSEUDONYMIZE" | "GENERALIZE">("MASK");
  const [showPolicy, setShowPolicy] = useState(false);
  const [expandedJobIdx, setExpandedJobIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => () => { unsubsRef.current.forEach((fn) => fn()); }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => f.name.toLowerCase().endsWith(".docx"));
    if (arr.length === 0) { setError("Only .docx files accepted"); return; }
    setFiles((prev) => {
      const combined = [...prev, ...arr].slice(0, MAX_FILES);
      return combined;
    });
    setError("");
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const startBatch = async () => {
    if (files.length === 0 || isUploading) return;
    setIsUploading(true);
    setError("");

    // Init state for each file
    setBatchJobs(files.map((f) => ({ file: f, job: null, stage: "uploading", progress: null, error: "" })));

    try {
      const result = await uploadBatch(files, policy, defaultAction);
      const createdJobs = result.jobs;

      // Match returned jobs to files by order
      setBatchJobs(
        files.map((f, i) => ({
          file: f,
          job: createdJobs[i] || null,
          stage: "processing" as const,
          progress: { step: "queued", label: "Queued…", percent: 2 },
          error: "",
        }))
      );

      // Subscribe to SSE for each job
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = createdJobs.map((createdJob, i) => {
        return subscribeToProgress(
          createdJob._id,
          (ev) => {
            setBatchJobs((prev) => {
              const next = [...prev];
              next[i] = { ...next[i], progress: ev };
              return next;
            });
          },
          async () => {
            // Done — fetch final state
            try {
              const { job: finalJob } = await getJob(createdJob._id);
              setBatchJobs((prev) => {
                const next = [...prev];
                next[i] = {
                  ...next[i],
                  job: finalJob,
                  stage: finalJob.status === "completed" ? "done" : "failed",
                  progress: { step: "done", label: "Completed", percent: 100 },
                  error: finalJob.status === "failed" ? (finalJob.errorMessage || "Failed") : "",
                };
                return next;
              });
            } catch {
              setBatchJobs((prev) => {
                const next = [...prev]; next[i] = { ...next[i], stage: "done" }; return next;
              });
            }
          }
        );
      });
    } catch (err: any) {
      setError(err.message || "Batch upload failed");
      setBatchJobs([]);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    unsubsRef.current.forEach((fn) => fn());
    setFiles([]); setBatchJobs([]); setError(""); setExpandedJobIdx(null);
  };

  const allDone = batchJobs.length > 0 && batchJobs.every((j) => j.stage === "done" || j.stage === "failed");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-4 border"
        style={{ background: "rgba(0,122,255,0.05)", borderColor: "rgba(0,122,255,0.2)" }}
      >
        <div className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
          Batch mode — process up to {MAX_FILES} documents at once
        </div>
        <div className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>
          All files are queued in BullMQ and processed in parallel. You'll see live progress for each file.
        </div>
      </div>

      {/* Drop zone (only when no jobs running) */}
      {batchJobs.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className="rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 p-8"
          style={{
            borderColor: dragOver ? "var(--accent)" : files.length > 0 ? "rgba(48,209,88,0.5)" : "var(--border)",
            background: dragOver ? "var(--accent-subtle)" : "var(--bg-surface)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            multiple
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--accent-subtle)", border: "1px solid rgba(0,122,255,0.2)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75">
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
              </svg>
            </div>
            <div>
              <div className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>
                Drop up to {MAX_FILES} .docx files
              </div>
              <div className="text-[13px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                or <span style={{ color: "var(--accent)" }}>browse</span> — {files.length}/{MAX_FILES} selected
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File queue list */}
      {files.length > 0 && batchJobs.length === 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{files.length} file{files.length !== 1 ? "s" : ""} queued</span>
            {files.length < MAX_FILES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[12px] px-3 py-1 rounded-lg border transition-colors"
                style={{ color: "var(--accent)", borderColor: "rgba(0,122,255,0.25)", background: "var(--accent-subtle)" }}
              >
                + Add more
              </button>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-elevated)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.name}</div>
                  <div className="text-[11px] mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{(f.size / 1024).toFixed(1)} KB</div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,69,58,0.1)"; e.currentTarget.style.color = "#FF453A"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy config */}
      {batchJobs.length === 0 && files.length > 0 && (
        <>
          <button
            onClick={() => setShowPolicy(!showPolicy)}
            className="btn-ghost !py-2.5 !px-5 text-[13px]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 2v2M12 20v2"/>
            </svg>
            {showPolicy ? "Hide" : "Configure"} Policy
          </button>
          {showPolicy && (
            <PolicyConfig
              defaultAction={defaultAction}
              onDefaultChange={setDefaultAction}
              policy={policy}
              onPolicyChange={setPolicy}
            />
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 text-[13px] border" style={{ background: "rgba(255,69,58,0.08)", borderColor: "rgba(255,69,58,0.25)", color: "#FF453A" }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      {batchJobs.length === 0 && (
        <div className="flex gap-3">
          <button
            onClick={startBatch}
            disabled={files.length === 0 || isUploading}
            className="btn-primary !py-3 !px-7 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                Starting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Process {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Batch job cards */}
      {batchJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {batchJobs.filter((j) => j.stage === "done").length}/{batchJobs.length} completed
            </div>
            {allDone && (
              <button onClick={reset} className="btn-ghost text-[13px] !py-2 !px-4">
                New batch
              </button>
            )}
          </div>

          {batchJobs.map((bj, i) => (
            <BatchJobCard
              key={i}
              bj={bj}
              index={i}
              expanded={expandedJobIdx === i}
              onToggle={() => setExpandedJobIdx(expandedJobIdx === i ? null : i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Batch Job Card ──────────────────────────────────────────────────────── */
function BatchJobCard({
  bj, index, expanded, onToggle,
}: {
  bj: BatchJobState;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pct = bj.progress?.percent ?? 0;
  const stageColor = bj.stage === "done" ? "#30D158" : bj.stage === "failed" ? "#FF453A" : "#007AFF";
  const stageLabel = bj.stage === "done" ? "Done" : bj.stage === "failed" ? "Failed" : bj.stage === "processing" ? "Processing" : "Uploading";
  const entityCount = bj.job?.entities?.length ?? 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: bj.stage === "done" ? "rgba(48,209,88,0.25)" : bj.stage === "failed" ? "rgba(255,69,58,0.25)" : "var(--border)" }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        style={{ background: "var(--bg-surface)" }}
        onClick={() => bj.stage === "done" && onToggle()}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${stageColor}15` }}
        >
          {bj.stage === "done" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stageColor} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : bj.stage === "failed" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stageColor} strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${stageColor}30`, borderTopColor: stageColor }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {bj.file.name}
          </div>
          <div className="text-[11px] mt-0.5 mono" style={{ color: "var(--text-tertiary)" }}>
            {bj.stage === "done"
              ? `${entityCount} entities redacted`
              : bj.stage === "failed"
              ? bj.error
              : bj.progress?.label || "Waiting…"}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold mono px-2 py-0.5 rounded-full" style={{ background: `${stageColor}15`, color: stageColor }}>
            {stageLabel}
          </span>
          {bj.stage === "done" && bj.job?.hasOutput && (
            <a
              href={getDownloadUrl(bj.job._id)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors"
              style={{ color: "#30D158", borderColor: "rgba(48,209,88,0.3)", background: "rgba(48,209,88,0.08)" }}
            >
              Download
            </a>
          )}
          {bj.stage === "done" && (
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"
              style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(bj.stage === "processing" || bj.stage === "uploading") && (
        <div className="px-4 pb-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #007AFF, #5BA4FF)",
                boxShadow: "0 0 8px rgba(0,122,255,0.4)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] mono" style={{ color: "var(--text-tertiary)" }}>{bj.progress?.label || "Processing…"}</span>
            <span className="text-[10px] mono" style={{ color: "var(--accent)" }}>{pct}%</span>
          </div>
        </div>
      )}

      {/* Expanded results */}
      {expanded && bj.stage === "done" && bj.job && (
        <div className="border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
          <RedactResults job={bj.job} />
        </div>
      )}
    </div>
  );
}
