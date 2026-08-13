"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/lib/config";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/providers/AuthProvider";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { user, logout, loading, refreshUser } = useAuth();

  useEffect(() => {
    if (loading) return;
    refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      console.log("✓ Navbar: User loaded:", { name: user.name, email: user.email, avatar: user.avatar?.slice(0, 60) });
    }
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push("/");
  };

  const handleRemoveImage = () => {
    if (!user) return;
    const updatedUser = { ...user, avatar: "" };
    localStorage.setItem("redactiq_user", JSON.stringify(updatedUser));
    // Trigger storage event for AuthProvider
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
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? "py-3 bg-[var(--bg-glass)] backdrop-blur-[24px] saturate-150 border-[var(--border)] shadow-[var(--shadow-sm)]"
            : "py-5 bg-transparent border-transparent"
        }`}
      >
        <nav className="container flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt={siteConfig.name}
              width={48}
              height={48}
              className="object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-[17px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {siteConfig.name}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div
            className="hidden md:flex items-center gap-1 px-4 py-1.5 rounded-full"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}
          >
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Redaction Modes", href: "#adaptive" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[13px] font-medium px-4 py-1.5 rounded-full transition-all duration-150"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
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
                      className="w-9 h-9 rounded-full object-cover border"
                      style={{ borderColor: "var(--border-strong)", boxShadow: "0 0 12px rgba(0,122,255,0.25)" }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center border text-[14px] font-bold"
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
              <>
                <Link
                  href="/auth?tab=login"
                  className="text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-150 shadow-sm"
                  style={{ color: "var(--text-primary)", background: "var(--bg-glass)", border: "1px solid var(--border)", backdropFilter: "blur(12px)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-glass)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  Sign in
                </Link>
                <Link href="/redact" className="btn-primary text-[13px] !py-2 !px-5">
                  Try free
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              className="w-9 h-9 rounded-full flex flex-col items-center justify-center gap-[4px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className="w-4 h-[1.5px] transition-all duration-300" style={{ background: "var(--text-primary)", transform: menuOpen ? "rotate(45deg) translateY(5.5px)" : "none" }} />
              <span className="w-4 h-[1.5px] transition-all duration-300" style={{ background: "var(--text-primary)", opacity: menuOpen ? 0 : 1 }} />
              <span className="w-4 h-[1.5px] transition-all duration-300" style={{ background: "var(--text-primary)", transform: menuOpen ? "rotate(-45deg) translateY(-5.5px)" : "none" }} />
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-6 pb-4 pt-2 border-t space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-glass)", backdropFilter: "blur(24px)" }}>
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Redaction Modes", href: "#adaptive" },
            ].map((item) => (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="block py-2 text-[14px]" style={{ color: "var(--text-secondary)" }}>
                {item.label}
              </a>
            ))}
            <div className="pt-2 flex gap-2">
              {user ? (
                <>
                  <Link href="/redact" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 justify-center text-[13px] !py-2">Redact</Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="btn-ghost flex-1 text-[13px] !py-2">Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/auth?tab=login" onClick={() => setMenuOpen(false)} className="btn-ghost flex-1 justify-center text-[13px] !py-2">Sign in</Link>
                  <Link href="/redact" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 justify-center text-[13px] !py-2">Try free</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

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
    </>
  );
}
