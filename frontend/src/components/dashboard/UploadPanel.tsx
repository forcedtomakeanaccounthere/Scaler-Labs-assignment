"use client";

import { useState, useRef, useCallback } from "react";
import { uploadDocx, type Job } from "@/lib/api";

const ENTITY_TYPES = [
  "PERSON", "EMAIL", "PHONE_IN", "AADHAAR", "PAN",
  "CREDIT_CARD", "DOB", "ADDRESS", "ORG", "PASSPORT",
];

const ACTION_OPTIONS = [
  { value: "MASK", label: "Opaque Mask", desc: "Black rectangle — maximum security" },
  { value: "PSEUDONYMIZE", label: "Pseudonymize", desc: "Consistent fake replacement" },
  { value: "GENERALIZE", label: "Generalize", desc: "Replace with category label" },
];

interface Props {
  onJobCreated: (job: Job) => void;
}

export default function UploadPanel({ onJobCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultAction, setDefaultAction] = useState<"MASK" | "PSEUDONYMIZE" | "GENERALIZE">("MASK");
  const [policy, setPolicy] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".docx")) {
      setFile(dropped);
      setError("");
    } else {
      setError("Only .docx files are supported");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.name.endsWith(".docx")) {
      setFile(f);
      setError("");
    } else if (f) {
      setError("Only .docx files are supported");
    }
  };

  const handleSubmit = async () => {
    if (!file) { setError("Please select a .docx file"); return; }
    setUploading(true);
    setError("");
    try {
      const result = await uploadDocx(file, policy, defaultAction);
      onJobCreated(result.job);
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setPolicyAction = (type: string, action: string) => {
    setPolicy((prev) => {
      if (!action || action === defaultAction) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: action };
    });
  };

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
        style={{
          borderColor: dragOver ? "var(--accent)" : file ? "rgba(48,209,88,0.5)" : "var(--border)",
          background: dragOver ? "var(--accent-subtle)" : file ? "rgba(48,209,88,0.04)" : "var(--bg-elevated)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto" style={{ background: "rgba(48,209,88,0.15)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{file.name}</div>
            <div className="text-[11px] mono" style={{ color: "var(--text-tertiary)" }}>
              {(file.size / 1024).toFixed(1)} KB · Click to change
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto" style={{ background: "var(--accent-subtle)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>Drop your .docx here</div>
              <div className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>or click to browse · max 50 MB</div>
            </div>
          </div>
        )}
      </div>

      {/* Default action */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest mono mb-2.5" style={{ color: "var(--text-tertiary)" }}>
          Default Redaction Action
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ACTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDefaultAction(opt.value as any)}
              className="p-2.5 rounded-xl border text-left transition-all duration-150"
              style={{
                borderColor: defaultAction === opt.value ? "var(--accent)" : "var(--border)",
                background: defaultAction === opt.value ? "var(--accent-subtle)" : "var(--bg-base)",
              }}
            >
              <div className="text-[11px] font-semibold" style={{ color: defaultAction === opt.value ? "var(--accent)" : "var(--text-primary)" }}>
                {opt.label}
              </div>
              <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-tertiary)" }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Per-type policy overrides */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest mono mb-2.5" style={{ color: "var(--text-tertiary)" }}>
          Per-Type Overrides <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          {ENTITY_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
              <span className="text-[11px] font-bold mono" style={{ color: "var(--text-secondary)" }}>{type}</span>
              <select
                value={policy[type] || ""}
                onChange={(e) => setPolicyAction(type, e.target.value)}
                className="text-[11px] rounded-lg px-2 py-1 outline-none border"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border)",
                  fontSize: "11px",
                }}
              >
                <option value="">— default —</option>
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl text-[13px]" style={{ background: "rgba(255,59,48,0.12)", color: "#FF453A", border: "1px solid rgba(255,59,48,0.25)" }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="btn-primary w-full justify-center !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
            Uploading...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Start Redaction
          </span>
        )}
      </button>
    </div>
  );
}
