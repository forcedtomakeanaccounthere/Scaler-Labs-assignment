import { envConfig } from "./config";

const API_BASE = envConfig.apiUrl;

function networkErrorMessage(): string {
  return `Cannot reach the API at ${API_BASE}. Make sure the backend is running and NEXT_PUBLIC_API_URL is set correctly.`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("redactiq_token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    if (err instanceof TypeError) throw new Error(networkErrorMessage());
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  let data: any;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { error: text || `Request failed (${res.status})` };
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

// ── Guest usage tracking (3 free uses) ───────────────────────────────────
const FREE_LIMIT = 3;
const GUEST_KEY = "redactiq_guest_uses";

export function getGuestUses(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(GUEST_KEY) || "0", 10);
}

export function incrementGuestUses(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_KEY, String(getGuestUses() + 1));
}

export function canUseAsGuest(): boolean {
  return getGuestUses() < FREE_LIMIT;
}

export function remainingGuestUses(): number {
  return Math.max(0, FREE_LIMIT - getGuestUses());
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface Entity {
  _id: string;
  type: string;
  textHash: string;
  start?: number;
  end?: number;
  confidence: number;
  source: "REGEX" | "NER" | "OCR" | "MANUAL";
  action: "MASK" | "PSEUDONYMIZE" | "GENERALIZE" | "KEEP" | "PENDING_REVIEW";
  reviewerAction?: "ACCEPTED" | "REJECTED" | null;
  imageId?: string;
}

export interface EvalMetrics {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
}

export interface Job {
  _id: string;
  status: "pending" | "processing" | "awaiting_review" | "completed" | "failed";
  originalFilename: string;
  hasOutput: boolean;
  defaultAction: "MASK" | "PSEUDONYMIZE" | "GENERALIZE";
  policy?: Record<string, string>;
  entities?: Entity[];
  currentStep?: string;
  evaluation?: {
    overall: EvalMetrics;
    byType: Array<{
      entityType: string;
      tp: number;
      fp: number;
      fn: number;
      precision: number;
      recall: number;
      f1: number;
    }>;
    imageMetrics: {
      totalImages: number;
      imagesWithPii: number;
      regionsRedacted: number;
    };
  };
  processingStartedAt?: string;
  processingCompletedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEvent {
  step: string;
  label: string;
  percent: number;
  detail?: string;
}

// ── Auth / Profile API ──────────────────────────────────────────────────────

export interface ProfileResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    googleId?: string;
    role?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export async function fetchProfile(): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/api/auth/me");
}

// ── Jobs API ──────────────────────────────────────────────────────────────

export async function uploadDocx(
  file: File,
  policy: Record<string, string> = {},
  defaultAction = "PSEUDONYMIZE",
  isGuest = false
): Promise<{ job: Job }> {
  const form = new FormData();
  form.append("file", file);
  form.append("policy", JSON.stringify(policy));
  form.append("defaultAction", defaultAction);
  if (isGuest) form.append("guest", "true");

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/jobs`, {
      method: "POST",
      headers,
      body: form,
    });
  } catch (err) {
    if (err instanceof TypeError) throw new Error(networkErrorMessage());
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  let data: any;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { error: text || `Upload failed (${res.status})` };
  }
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

/** Upload multiple files for batch processing (max 5) */
export async function uploadBatch(
  files: File[],
  policy: Record<string, string> = {},
  defaultAction = "PSEUDONYMIZE"
): Promise<{ jobs: Job[] }> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  form.append("policy", JSON.stringify(policy));
  form.append("defaultAction", defaultAction);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/jobs/batch`, {
      method: "POST",
      headers,
      body: form,
    });
  } catch (err) {
    if (err instanceof TypeError) throw new Error(networkErrorMessage());
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  let data: any;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { error: text || `Batch upload failed (${res.status})` };
  }
  if (!res.ok) throw new Error(data.error || "Batch upload failed");
  return data;
}

export async function listJobs(
  page = 1,
  limit = 10
): Promise<{
  jobs: Job[];
  pagination: { page: number; total: number; pages: number };
}> {
  return apiFetch(`/api/jobs?page=${page}&limit=${limit}`);
}

export async function getJob(id: string): Promise<{ job: Job }> {
  return apiFetch(`/api/jobs/${id}`);
}

export async function getJobReport(id: string): Promise<any> {
  return apiFetch(`/api/jobs/${id}/report`);
}

export async function submitReview(
  id: string,
  decisions: Array<{ entityId: string; action: "ACCEPTED" | "REJECTED" }>
): Promise<{ job: Job }> {
  return apiFetch(`/api/jobs/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decisions }),
  });
}

export function getDownloadUrl(id: string): string {
  const token = getToken();
  return `${API_BASE}/api/jobs/${id}/download?token=${token || ""}`;
}

/**
 * Subscribe to live progress events for a job via SSE.
 * Calls `onEvent` on each progress update.
 * Returns a cleanup function.
 */
export function subscribeToProgress(
  jobId: string,
  onEvent: (ev: ProgressEvent) => void,
  onDone: () => void,
  onError?: (err: Error) => void
): () => void {
  const token = getToken();
  const url = `${API_BASE}/api/jobs/${jobId}/progress?token=${token || ""}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as ProgressEvent;
      onEvent(data);
      if (data.percent >= 100) {
        es.close();
        onDone();
      }
    } catch {
      // ignore parse errors
    }
  };

  es.addEventListener("done", () => {
    es.close();
    onDone();
  });

  es.onerror = () => {
    es.close();
    onError?.(new Error("Progress stream closed"));
    onDone();
  };

  return () => es.close();
}
