"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";
import ThemeToggle from "@/components/ui/ThemeToggle";
import UploadPanel from "@/components/dashboard/UploadPanel";
import JobList from "@/components/dashboard/JobList";
import JobDetail from "@/components/dashboard/JobDetail";
import { listJobs, type Job } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "jobs">("upload");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("redactiq_token");
    const stored = localStorage.getItem("redactiq_user");
    if (!token || !stored) {
      router.push("/auth?tab=login");
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      router.push("/auth?tab=login");
    }
  }, [router]);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await listJobs(1, 20);
      setJobs(data.jobs);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    // Poll for job status updates every 4s
    const interval = setInterval(fetchJobs, 4000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleLogout = () => {
    localStorage.removeItem("redactiq_token");
    localStorage.removeItem("redactiq_user");
    router.push("/");
  };

  const handleJobCreated = (job: Job) => {
    setJobs((prev) => [job, ...prev]);
    setSelectedJobId(job._id);
    setActiveTab("jobs");
  };

  if (!user) return null;

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* ── Top Nav ───────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b px-6 py-3 flex items-center justify-between"
        style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px)",
          borderColor: "var(--border)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo.png" alt={siteConfig.name} width={36} height={36} className="object-contain" />
          <span className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {siteConfig.name}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <span className="text-[13px] font-medium hidden sm:block" style={{ color: "var(--text-primary)" }}>
              {user.name.split(" ")[0]}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[13px] px-3 py-1.5 rounded-xl border transition-colors duration-150"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border)", background: "var(--bg-elevated)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Left sidebar / tabs on mobile */}
        <aside
          className="lg:w-[360px] xl:w-[420px] flex-shrink-0 border-r flex flex-col"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          {/* Tab bar */}
          <div
            className="flex border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {(["upload", "jobs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3.5 text-[13px] font-semibold capitalize transition-all duration-200 relative"
                style={{ color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)" }}
              >
                {tab === "upload" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Jobs {jobs.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] mono" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{jobs.length}</span>}
                  </span>
                )}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "upload" ? (
              <UploadPanel onJobCreated={handleJobCreated} />
            ) : (
              <JobList
                jobs={jobs}
                loading={loading}
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
              />
            )}
          </div>
        </aside>

        {/* Right: Job detail / results */}
        <div className="flex-1 overflow-y-auto">
          <JobDetail
            jobId={selectedJobId}
            jobs={jobs}
            onRefresh={fetchJobs}
          />
        </div>
      </main>
    </div>
  );
}
