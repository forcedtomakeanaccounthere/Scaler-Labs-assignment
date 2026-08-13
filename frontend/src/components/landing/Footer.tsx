"use client";

import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";

const footerLinks = {
  Platform: ["Upload & Redact", "Evaluation Report", "Redaction Policy", "Batch Processing"],
  Detection: ["Text PII (NER)", "Image Redaction (OCR)", "Pseudonymization", "Audit Trail"],
  Compliance: ["GDPR", "DPDPA", "KYC / AML", "Contact"],
};

export default function Footer() {
  return (
    <footer className="pt-16 pb-10" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt={siteConfig.name} width={34} height={34} className="object-contain" />
              <span className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {siteConfig.name}
              </span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[200px]" style={{ color: "var(--text-secondary)" }}>
              Enterprise PII redaction for DOCX documents. Hybrid detection + OCR image masking + audit trails.
            </p>
            <div className="badge !text-[10px]">Scaler Labs Assignment</div>
          </div>

          {Object.entries(footerLinks).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest mono mb-4" style={{ color: "var(--text-tertiary)" }}>
                {group}
              </h4>
              <ul className="space-y-2.5 text-[13px]">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="transition-colors duration-150"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]"
          style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
        >
          <div>© 2025 {siteConfig.name} · PII Redaction Platform · Scaler Labs</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
