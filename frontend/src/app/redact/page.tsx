"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/providers/AuthProvider";
import SingleRedact from "@/components/redact/SingleRedact";
import BatchRedact from "@/components/redact/BatchRedact";
import { remainingGuestUses } from "@/lib/api";

type Tab = "single" | "batch";

export default function RedactPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("single");
  const [guestUsesLeft, setGuestUsesLeft] = useState(3);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGuestUsesLeft(remainingGuestUses());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshGuestCount = () => setGuestUsesLeft(remainingGuestUses());

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push("/");
  };

  const handleRemoveImage = () => {
    if (!user) return;
    const updatedUser = { ...user, avatar: "" };
    localStorage.setItem("redactiq_user", JSON.stringify(updatedUser));
    window.dispatchEvent(new StorageEvent("storage", { key: "redactiq_user", newValue: JSON.stringify(updatedUser) }));
    setDropdownOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const updatedUser = { ...user, avatar: base64Url };
      localStorage.setItem("redactiq_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new StorageEvent("storage", { key: "redactiq_user", newValue: JSON.stringify(updatedUser) }));
      setUploadModalOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImageUrl || !user) return;
    const updatedUser = { ...user, avatar: customImageUrl };
    localStorage.setItem("redactiq_user", JSON.stringify(updatedUser));
    window.dispatchEvent(new StorageEvent("storage", { key: "redactiq_user", newValue: JSON.stringify(updatedUser) }));
    setUploadModalOpen(false);
    setCustomImageUrl("");
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b px-5 sm:px-8 py-3 flex items-center justify-between gap-4"
        style={{ background: "var(--bg-glass)", backdropFilter: "blur(24px)", borderColor: "var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <Image src="/logo.png" alt={siteConfig.name} width={34} height={34} className="object-contain" />
          <span className="text-[16px] font-bold tracking-tight hidden sm:block" style={{ color: "var(--text-primary)" }}>
            {siteConfig.name}
          </span>
        </Link>

        {/* Guest usage indicator */}
        {!user && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium"
            style={{
              background: guestUsesLeft > 0 ? "rgba(48,209,88,0.08)" : "rgba(255,69,58,0.08)",
              borderColor: guestUsesLeft > 0 ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.3)",
              color: guestUsesLeft > 0 ? "#30D158" : "#FF453A",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: guestUsesLeft > 0 ? "#30D158" : "#FF453A" }}
            />
            {guestUsesLeft > 0
              ? `${guestUsesLeft} free redaction${guestUsesLeft !== 1 ? "s" : ""} left`
              : "Free limit reached"}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full transition-transform duration-150 hover:scale-105 focus:outline-none"
                aria-label="User profile menu"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border"
                    style={{ borderColor: "var(--border-strong)", boxShadow: "0 0 12px rgba(0,122,255,0.25)" }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border"
                    style={{ background: "var(--accent-subtle)", borderColor: "var(--border-strong)", color: "var(--accent)" }}
                  >
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl p-2 border shadow-2xl z-50"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)", backdropFilter: "blur(24px)" }}
                >
                  <div className="px-3 py-2.5 border-b mb-1" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{user.name}</div>
                    <div className="text-[12px] truncate mt-0.5 mono" style={{ color: "var(--text-tertiary)" }}>{user.email}</div>
                  </div>

                  <Link
                    href="/redact"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150"
                    style={{ color: "var(--accent)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Redact a Document
                  </Link>

                  <button
                    onClick={() => { setDropdownOpen(false); setUploadModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150 text-left"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {user.avatar ? "Change profile picture" : "Upload profile picture"}
                  </button>

                  {user.avatar && (
                    <button
                      onClick={handleRemoveImage}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150 text-left"
                      style={{ color: "#FF453A" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,59,48,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Remove profile image
                    </button>
                  )}

                  <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150 text-left"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth?tab=login" className="btn-primary text-[13px] !py-2 !px-4">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="container pt-10 pb-6">
        <div className="max-w-2xl">
          <span className="badge mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse" style={{ boxShadow: "0 0 6px rgba(0,122,255,0.8)" }} />
            PII Redaction Tool
          </span>
          <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight mt-3" style={{ color: "var(--text-primary)" }}>
            Redact sensitive data from your documents
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            Upload a <strong style={{ color: "var(--text-primary)" }}>.docx</strong> file. Our pipeline detects names, IDs, emails, phones, and image-embedded PII — then delivers a clean redacted copy with a full audit report.
          </p>
        </div>
      </div>

      {/* ── Tab Switch: Single / Batch ────────────────────────────────── */}
      <div className="container pb-2">
        <div
          className="inline-flex rounded-xl p-1 gap-1"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {(["single", "batch"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "batch" && !user) {
                  router.push("/auth?tab=login");
                  return;
                }
                setTab(t);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200"
              style={{
                background: tab === t ? "var(--bg-surface)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: tab === t ? "var(--shadow-xs)" : "none",
              }}
            >
              {t === "single" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Single File
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
                  </svg>
                  Batch
                  {!user && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,159,10,0.15)", color: "#FF9F0A" }}>
                      Login required
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="container flex-1 pb-16 pt-4">
        {tab === "single" ? (
          <SingleRedact
            user={user}
            guestUsesLeft={guestUsesLeft}
            onGuestUse={refreshGuestCount}
          />
        ) : (
          <BatchRedact user={user} />
        )}
      </div>

      {/* Profile Image Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 border shadow-2xl"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold">Update Profile Picture</h3>
              <button onClick={() => setUploadModalOpen(false)} className="p-1 rounded-lg" style={{ color: "var(--text-tertiary)" }}>✕</button>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-150"
                style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Click to upload image</div>
                <div className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>PNG, JPG, WEBP up to 5MB</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-[11px] mono" style={{ color: "var(--text-tertiary)" }}>OR PASTE URL</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] outline-none border"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <button type="submit" className="btn-primary text-[13px] px-4 py-2.5">Save</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
