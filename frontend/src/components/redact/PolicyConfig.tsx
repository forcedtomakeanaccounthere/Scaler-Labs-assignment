"use client";

const ENTITY_TYPES = [
  "PERSON", "EMAIL", "PHONE_IN", "PHONE_INTL",
  "AADHAAR", "PAN", "CREDIT_CARD", "DOB",
  "ADDRESS", "ORG", "PASSPORT", "IP_V4",
];

const ACTIONS = [
  { value: "MASK",          label: "Mask",          desc: "Opaque black rectangle",        color: "#FF453A" },
  { value: "PSEUDONYMIZE",  label: "Pseudonymize",  desc: "Consistent fake replacement",   color: "#A78BFA" },
  { value: "GENERALIZE",    label: "Generalize",    desc: "Replace with category label",   color: "#FF9F0A" },
];

interface Props {
  defaultAction: "MASK" | "PSEUDONYMIZE" | "GENERALIZE";
  onDefaultChange: (a: "MASK" | "PSEUDONYMIZE" | "GENERALIZE") => void;
  policy: Record<string, string>;
  onPolicyChange: (p: Record<string, string>) => void;
}

export default function PolicyConfig({ defaultAction, onDefaultChange, policy, onPolicyChange }: Props) {
  const setTypeAction = (type: string, action: string) => {
    const next = { ...policy };
    if (!action) delete next[type];
    else next[type] = action;
    onPolicyChange(next);
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <div
        className="px-5 py-3.5 border-b"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
      >
        <div className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Redaction Policy</div>
        <div className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          Configure default action and per-entity overrides
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Default action */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mono mb-2.5" style={{ color: "var(--text-tertiary)" }}>
            Default action for all types
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => onDefaultChange(a.value as any)}
                className="p-3 rounded-xl border text-left transition-all duration-150"
                style={{
                  borderColor: defaultAction === a.value ? a.color : "var(--border)",
                  background: defaultAction === a.value ? `${a.color}10` : "var(--bg-base)",
                }}
              >
                <div className="text-[12px] font-bold" style={{ color: defaultAction === a.value ? a.color : "var(--text-primary)" }}>
                  {a.label}
                </div>
                <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-tertiary)" }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Per-type overrides */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mono mb-2.5" style={{ color: "var(--text-tertiary)" }}>
            Per-type overrides <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(leave blank to use default)</span>
          </div>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
            {ENTITY_TYPES.map((type) => {
              const val = policy[type] || "";
              const activeAction = ACTIONS.find((a) => a.value === val);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border"
                  style={{
                    background: val ? `${activeAction?.color || "#888"}08` : "var(--bg-base)",
                    borderColor: val ? `${activeAction?.color || "#888"}30` : "var(--border)",
                  }}
                >
                  <span
                    className="text-[11px] font-bold mono"
                    style={{ color: val ? activeAction?.color : "var(--text-secondary)" }}
                  >
                    {type}
                  </span>
                  <select
                    value={val}
                    onChange={(e) => setTypeAction(type, e.target.value)}
                    className="text-[11px] rounded-lg px-2 py-1 outline-none border"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <option value="">— default —</option>
                    {ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
