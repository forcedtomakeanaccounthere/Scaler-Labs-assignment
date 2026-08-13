"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  uploadDocx,
  subscribeToProgress,
  getJob,
  getDownloadUrl,
  incrementGuestUses,
  type Job,
  type ProgressEvent,
} from "@/lib/api";
import type { UserProfile } from "@/providers/AuthProvider";
import RedactResults from "./RedactResults";
import PolicyConfig from "./PolicyConfig";

interface Props {
  user: UserProfile | null;
  guestUsesLeft: number;
  onGuestUse: () => void;
}

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

const PIPELINE_STEPS: Array<{ key: string; label: string }> = [
  { key: "extract",       label: "Extracting document content" },
  { key: "detect_text",   label: "Detecting text PII (regex + NER)" },
  { key: "detect_images", label: "Processing images (OCR + masking)" },
  { key: "pseudonymize",  label: "Applying pseudonymization" },
  { key: "redact",        label: "Writing redacted document" },
  { key: "evaluate",      label: "Computing evaluation metrics" },
  { key: "done",          label: "Complete" },
];

export default function SingleRedact({ user, guestUsesLeft, onGuestUse }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [policy, setPolicy] = useState<Record<string, string>>({});
  const [defaultAction, setDefaultAction] = useState<"MASK" | "PSEUDONYMIZE" | "GENERALIZE">("MASK");
  const [showPolicy, setShowPolicy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => () => { unsubRef.current?.(); }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.toLowerCase().endsWith(".docx")) { setFile(f); setError(""); }
    else setError("Only .docx files are accepted");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.name.toLowerCase().endsWith(".docx")) { setFile(f); setError(""); }
    else if (f) setError("Only .docx files are accepted");
  };

  const reset = () => {
    unsubRef.current?.();
    setFile(null); setStage("idle"); setError(""); setJob(null);
    setProgress(null); setCompletedSteps(new Set());
  };

  const handleSubmit = async () => {
    if (!file) return;

    // Guest gate
    if (!user && guestUsesLeft <= 0) return;

    setStage("uploading");
    setError("");
    setProgress({ step: "upload", label: "Uploading file…", percent: 3 });
    setCompletedSteps(new Set());

    try {
      const result = await uploadDocx(file, policy, defaultAction, !user);
      if (!user) { incrementGuestUses(); onGuestUse(); }

      const createdJob = result.job;
      setJob(createdJob);
      setStage("processing");

      // Subscribe to SSE progress
      unsubRef.current = subscribeToProgress(
        createdJob._id,
        (ev) => {
          setProgress(ev);
          if (ev.step !== "error") {
            setCompletedSteps((prev) => {
              const next = new Set(prev);
              const idx = PIPELINE_STEPS.findIndex((s) => s.key === ev.step);
              for (let i = 0; i < idx; i++) next.add(PIPELINE_STEPS[i].key);
              return next;
            });
          }
        },
        async () => {
          // SSE stream closed — poll once to get final state
          try {
            const { job: finalJob } = await getJob(createdJob._id);
            setJob(finalJob);
            setStage(finalJob.status === "completed" ? "done" : finalJob.status === "failed" ? "error" : "done");
            if (finalJob.status === "failed") setError(finalJob.errorMessage || "Processing failed");
          } catch {
            setStage("done");
          }
        },
        () => {
          // SSE error — poll as fallback
          pollForCompletion(createdJob._id);
        }
      );
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setStage("error");
    }
  };

  const pollForCompletion = async (jobId: string) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts++ > 30) { setStage("error"); setError("Timed out waiting for results"); return; }
      try {
        const { job: j } = await getJob(jobId);
        setJob(j);
        if (j.status === "completed") { setStage("done"); return; }
        if (j.status === "failed") { setStage("error"); setError(j.errorMessage || "Failed"); return; }
        setTimeout(poll, 2000);
      } catch { setTimeout(poll, 3000); }
    };
    poll();
  };

  const isGuest = !user;
  const blockedGuest = isGuest && guestUsesLeft <= 0;
  const currentStepIndex = progress
    ? PIPELINE_STEPS.findIndex((s) => s.key === progress.step)
    : -1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
      {/* ── LEFT: Upload + Progress ─────────────────────────────────── */}
      <div className="space-y-5">
        {/* Guest gate banner */}
        {blockedGuest && (
          <div
            className="rounded-2xl p-5 border flex items-start gap-4"
            style={{ background: "rgba(255,69,58,0.06)", borderColor: "rgba(255,69,58,0.3)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,69,58,0.12)", color: "#FF453A" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-bold" style={{ color: "#FF453A" }}>Free limit reached</div>
              <div className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                You've used all 3 free redactions. Sign in to continue with unlimited access.
              </div>
              <Link href="/auth?tab=login" className="btn-primary text-[13px] !py-2 !px-5 mt-3 inline-flex">
                Sign in — it's free
              </Link>
            </div>
          </div>
        )}

        {/* Drop zone */}
        {stage === "idle" || stage === "error" ? (
          <div
            onClick={() => !blockedGuest && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); !blockedGuest && setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className="rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center"
            style={{
              minHeight: "260px",
              padding: "40px 32px",
              borderColor: blockedGuest ? "var(--border)" : dragOver ? "var(--accent)" : file ? "rgba(48,209,88,0.5)" : "var(--border)",
              background: blockedGuest ? "var(--bg-elevated)" : dragOver ? "var(--accent-subtle)" : file ? "rgba(48,209,88,0.04)" : "var(--bg-surface)",
              cursor: blockedGuest ? "not-allowed" : "pointer",
              opacity: blockedGuest ? 0.5 : 1,
            }}
          >
            <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileChange} className="hidden" disabled={blockedGuest} />

            {file ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(48,209,88,0.12)", border: "1px solid rgba(48,209,88,0.25)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>{file.name}</div>
                  <div className="text-[13px] mt-1 mono" style={{ color: "var(--text-tertiary)" }}>
                    {(file.size / 1024).toFixed(1)} KB · .docx · Click to change
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: "var(--accent-subtle)", border: "1px solid rgba(0,122,255,0.2)" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>Drop your .docx here</div>
                  <div className="text-[13px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>
                    or <span style={{ color: "var(--accent)" }}>browse files</span> · max 50 MB
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-[11px] mono">
                  {["Names", "Aadhaar", "PAN", "Emails", "Phones", "Addresses", "Images"].map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)", border: "1px solid var(--border)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Error message */}
        {error && (
          <div className="rounded-xl p-4 text-[13px] border flex items-start gap-3" style={{ background: "rgba(255,69,58,0.08)", borderColor: "rgba(255,69,58,0.25)", color: "#FF453A" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Action row */}
        {(stage === "idle" || stage === "error") && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!file || blockedGuest}
              className="btn-primary !py-3 !px-7 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Redact Document
            </button>
            <button
              onClick={() => setShowPolicy(!showPolicy)}
              className="btn-ghost !py-3 !px-5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 2v2M12 20v2"/>
              </svg>
              {showPolicy ? "Hide" : "Configure"} Policy
            </button>
            {file && (
              <button onClick={reset} className="text-[13px] px-4 py-2.5 rounded-xl border transition-colors" style={{ color: "var(--text-tertiary)", borderColor: "var(--border)" }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Policy config panel */}
        {showPolicy && (stage === "idle" || stage === "error") && (
          <PolicyConfig
            defaultAction={defaultAction}
            onDefaultChange={setDefaultAction}
            policy={policy}
            onPolicyChange={setPolicy}
          />
        )}

        {/* Progress panel */}
        {(stage === "uploading" || stage === "processing") && (
          <ProgressPanel
            progress={progress}
            completedSteps={completedSteps}
            currentStepIndex={currentStepIndex}
            filename={file?.name || ""}
          />
        )}

        {/* Done result */}
        {stage === "done" && job && (
          <div className="space-y-5">
            <CompletedHeader job={job} onReset={reset} />
            <RedactResults job={job} />
          </div>
        )}
      </div>

      {/* ── RIGHT: Info panel ──────────────────────────────────────── */}
      <div className="space-y-4">
        <InfoPanel isGuest={isGuest} guestUsesLeft={guestUsesLeft} />
      </div>
    </div>
  );
}

/* ── Progress Panel ─────────────────────────────────────────────────────── */
function ProgressPanel({
  progress,
  completedSteps,
  currentStepIndex,
  filename,
}: {
  progress: ProgressEvent | null;
  completedSteps: Set<string>;
  currentStepIndex: number;
  filename: string;
}) {
  const pct = progress?.percent ?? 3;

  return (
    <div
      className="rounded-3xl border overflow-hidden"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center gap-3 border-b"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
      >
        <div className="w-8 h-8 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: "rgba(0,122,255,0.2)", borderTopColor: "#007AFF" }} />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {progress?.label || "Starting…"}
          </div>
          <div className="text-[11px] mono mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{filename}</div>
        </div>
        <span className="text-[14px] font-bold mono flex-shrink-0" style={{ color: "var(--accent)" }}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-4">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #007AFF, #5BA4FF)",
              boxShadow: "0 0 12px rgba(0,122,255,0.5)",
            }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="p-5 space-y-1.5">
        {PIPELINE_STEPS.filter((s) => s.key !== "done").map((s, i) => {
          const isDone = completedSteps.has(s.key);
          const isCurrent = PIPELINE_STEPS.findIndex((x) => x.key === progress?.step) === i;
          const isPending = !isDone && !isCurrent;

          return (
            <div key={s.key} className="flex items-center gap-3 py-1">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#30D158" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(0,122,255,0.2)", borderTopColor: "#007AFF" }} />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "var(--border)" }} />
                )}
              </div>
              <span
                className="text-[13px]"
                style={{
                  color: isDone ? "var(--text-secondary)" : isCurrent ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: isCurrent ? 600 : 400,
                  textDecoration: isDone ? "line-through" : "none",
                  textDecorationColor: "var(--text-tertiary)",
                }}
              >
                {s.label}
              </span>
              {isCurrent && progress?.detail && (
                <span className="text-[10px] mono ml-auto flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                  {progress.detail}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Completed Header ───────────────────────────────────────────────────── */
function CompletedHeader({ job, onReset }: { job: Job; onReset: () => void }) {
  const entityCount = job.entities?.length ?? 0;
  const redacted = job.entities?.filter((e) => e.action !== "KEEP").length ?? 0;

  return (
    <div
      className="rounded-3xl border overflow-hidden"
      style={{ background: "var(--bg-surface)", borderColor: "rgba(48,209,88,0.25)" }}
    >
      <div
        className="px-6 py-4 flex flex-wrap items-center gap-4 border-b"
        style={{ background: "rgba(48,209,88,0.05)", borderColor: "rgba(48,209,88,0.15)" }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.3)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold" style={{ color: "#30D158" }}>Redaction complete</div>
            <div className="text-[12px] mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {redacted} of {entityCount} entities redacted
              {job.processingCompletedAt && ` · ${new Date(job.processingCompletedAt).toLocaleTimeString()}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.hasOutput && (
            <a
              href={getDownloadUrl(job._id)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-[13px] !py-2 !px-5 flex-shrink-0"
              style={{ background: "#30D158", boxShadow: "0 4px 16px rgba(48,209,88,0.35)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Redacted .docx
            </a>
          )}
          <button
            onClick={onReset}
            className="btn-ghost text-[13px] !py-2 !px-4"
          >
            Redact another
          </button>
        </div>
      </div>

      {/* Quick metrics */}
      {job.evaluation && (
        <div className="grid grid-cols-3 divide-x" style={{ divideColor: "var(--border)" } as React.CSSProperties}>
          {[
            { label: "Precision", value: job.evaluation.overall.precision, color: "#007AFF" },
            { label: "Recall",    value: job.evaluation.overall.recall,    color: "#30D158" },
            { label: "F1 Score",  value: job.evaluation.overall.f1,        color: "#A78BFA" },
          ].map((m) => (
            <div key={m.label} className="py-4 text-center" style={{ borderColor: "var(--border)" }}>
              <div className="text-[20px] font-bold mono" style={{ color: m.color }}>
                {(m.value * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Info Panel ─────────────────────────────────────────────────────────── */
function InfoPanel({ isGuest, guestUsesLeft }: { isGuest: boolean; guestUsesLeft: number }) {
  return (
    <>
      {/* PII types detected */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="text-[11px] font-bold uppercase tracking-widest mono mb-3" style={{ color: "var(--text-tertiary)" }}>
          What gets detected
        </div>
        <div className="space-y-2">
          {[
            { type: "PERSON",       desc: "Full names, prefixed names",   color: "#FF9F0A", icon: "👤" },
            { type: "AADHAAR",      desc: "12-digit Aadhaar numbers",     color: "#FF453A", icon: "🪪" },
            { type: "PAN",          desc: "PAN card numbers",             color: "#FF453A", icon: "🗂" },
            { type: "EMAIL",        desc: "Email addresses",              color: "#007AFF", icon: "✉️" },
            { type: "PHONE",        desc: "Indian & intl. phone numbers", color: "#30D158", icon: "📞" },
            { type: "CREDIT_CARD",  desc: "Luhn-validated card numbers",  color: "#A78BFA", icon: "💳" },
            { type: "ADDRESS",      desc: "Physical addresses",           color: "#38BDF8", icon: "📍" },
            { type: "DOB",          desc: "Dates of birth",               color: "#FF9F0A", icon: "📅" },
            { type: "IMAGE_PII",    desc: "Faces, QR codes, ID scans",   color: "#FF453A", icon: "🖼" },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-2.5 py-1">
              <span className="text-[14px] flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold mono" style={{ color: item.color }}>{item.type}</span>
                <span className="text-[11px] ml-2" style={{ color: "var(--text-tertiary)" }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <div className="text-[11px] font-bold uppercase tracking-widest mono mb-3" style={{ color: "var(--text-tertiary)" }}>
          Pipeline
        </div>
        <div className="space-y-2.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {[
            "Regex patterns with Luhn validation for structured PII",
            "spaCy / Presidio NER for names, addresses, organisations",
            "Tesseract / EasyOCR on every embedded image (z-order independent)",
            "Consistent pseudonymization map — same value → same fake value",
            "Opaque black masking for images (no reversible blur)",
            "Full Precision / Recall / F1 evaluation report per entity type",
          ].map((pt, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--accent)" }} />
              {pt}
            </div>
          ))}
        </div>
      </div>

      {/* Sign-in nudge for guests */}
      {isGuest && (
        <div
          className="rounded-2xl p-5 border"
          style={{ background: "var(--accent-subtle)", borderColor: "rgba(0,122,255,0.25)" }}
        >
          <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--accent)" }}>
            {guestUsesLeft > 0
              ? `${guestUsesLeft} free redaction${guestUsesLeft !== 1 ? "s" : ""} remaining`
              : "Upgrade for unlimited access"}
          </div>
          <div className="text-[12px] mb-3" style={{ color: "var(--text-secondary)" }}>
            Sign in for unlimited redactions, batch processing, and full audit history.
          </div>
          <Link href="/auth?tab=signup" className="btn-primary text-[12px] !py-2 !px-4 inline-flex">
            Create free account
          </Link>
        </div>
      )}
    </>
  );
}
