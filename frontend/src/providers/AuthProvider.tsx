"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { fetchProfile } from "@/lib/api";

export interface UserProfile {
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

function isFallbackUser(u: UserProfile | null): boolean {
  if (!u) return false;
  if (u.email === "google_user@gmail.com") return true;
  if (u.googleId && String(u.googleId).startsWith("google_fallback")) return true;
  if (u.name === "Google Authorized User") return true;
  return false;
}

function userEquality(a: UserProfile | null, b: UserProfile | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a._id === b._id &&
    a.email === b.email &&
    a.name === b.name &&
    a.googleId === b.googleId &&
    a.avatar === b.avatar &&
    a.role === b.role
  );
}

const STORAGE_KEY_TOKEN = "redactiq_token";
const STORAGE_KEY_USER = "redactiq_user";
let lastWrittenToken: string | null | undefined;
let lastWrittenUser: string | null | undefined;

function writeToken(value: string | null) {
  lastWrittenToken = value;
  if (value == null) localStorage.removeItem(STORAGE_KEY_TOKEN);
  else localStorage.setItem(STORAGE_KEY_TOKEN, value);
}

function writeUser(value: UserProfile | null) {
  const serialized = value == null ? null : JSON.stringify(value);
  lastWrittenUser = serialized;
  if (serialized == null) localStorage.removeItem(STORAGE_KEY_USER);
  else localStorage.setItem(STORAGE_KEY_USER, serialized);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const syncInFlightRef = useRef(false);
  const lastSyncAtRef = useRef<number>(0);

  const readFromStorage = useCallback(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY_TOKEN);
      const u = localStorage.getItem(STORAGE_KEY_USER);
      if (t && u) {
        const parsedUser = JSON.parse(u) as UserProfile;
        return { token: t, user: parsedUser };
      }
      return { token: null, user: null };
    } catch (e) {
      console.error("AuthProvider: Failed to read from storage:", e);
      return { token: null, user: null };
    }
  }, []);

  const syncFromBackend = useCallback(async (currentToken: string, opts?: { force?: boolean; minIntervalMs?: number }): Promise<UserProfile | null> => {
    const now = Date.now();
    const minIntervalMs = opts?.minIntervalMs ?? 1000;
    if (!opts?.force && syncInFlightRef.current) {
      return null;
    }
    if (!opts?.force && now - lastSyncAtRef.current < minIntervalMs) {
      return null;
    }
    syncInFlightRef.current = true;
    lastSyncAtRef.current = now;
    try {
      const res = await fetchProfile();
      if (res?.user) {
        const freshUser: UserProfile = {
          _id: res.user._id,
          name: res.user.name,
          email: res.user.email,
          avatar: res.user.avatar,
          googleId: res.user.googleId,
          role: res.user.role,
          createdAt: res.user.createdAt,
          updatedAt: res.user.updatedAt,
        };
        writeUser(freshUser);
        return freshUser;
      }
      return null;
    } catch (err) {
      console.warn("⚠ AuthProvider: Could not fetch profile from backend:", err);
      return null;
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { token: t, user: u } = readFromStorage();
      setToken(t);
      setUser(u);

      if (!t) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const fresh = await syncFromBackend(t, { force: true, minIntervalMs: 0 });
        if (cancelled) return;
        if (fresh) {
          if (isFallbackUser(fresh)) {
            writeToken(null);
            writeUser(null);
            setToken(null);
            setUser(null);
          } else if (!userEquality(u, fresh)) {
            setUser(fresh);
            setToken(t);
          }
        } else if (isFallbackUser(u)) {
          writeToken(null);
          writeUser(null);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.warn("⚠ AuthProvider: initial sync failed:", err);
        if (!cancelled && isFallbackUser(u)) {
          writeToken(null);
          writeUser(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY_TOKEN && e.key !== STORAGE_KEY_USER) return;
      if (e.key === STORAGE_KEY_TOKEN && e.newValue === lastWrittenToken) return;
      if (e.key === STORAGE_KEY_USER && e.newValue === lastWrittenUser) return;
      const { token: t, user: u } = readFromStorage();
      setToken((prev) => (prev === t ? prev : t));
      setUser((prev) => (userEquality(prev, u) ? prev : u));
    };
    window.addEventListener("storage", onStorage);

    const onFocus = async () => {
      const { token: t, user: u } = readFromStorage();
      setToken((prev) => (prev === t ? prev : t));
      if (t && isFallbackUser(u)) {
        const fresh = await syncFromBackend(t, { force: true, minIntervalMs: 2000 });
        if (fresh && !userEquality(u, fresh)) {
          if (isFallbackUser(fresh)) {
            writeToken(null);
            writeUser(null);
            setToken(null);
            setUser(null);
          } else {
            setUser((prev) => (userEquality(prev, fresh) ? prev : fresh));
          }
        }
      } else {
        setUser((prev) => (userEquality(prev, u) ? prev : u));
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [readFromStorage, syncFromBackend]);

  const login = useCallback((t: string, u: UserProfile) => {
    writeToken(t);
    writeUser(u);
    setToken(t);
    setUser((prev) => (userEquality(prev, u) ? prev : u));
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    writeUser(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { token: t } = readFromStorage();
    if (!t) return;
    const fresh = await syncFromBackend(t, { force: true, minIntervalMs: 500 });
    if (!fresh) return;
    if (isFallbackUser(fresh)) {
      writeToken(null);
      writeUser(null);
      setToken(null);
      setUser(null);
      return;
    }
    setToken(t);
    setUser((prev) => (userEquality(prev, fresh) ? prev : fresh));
  }, [readFromStorage, syncFromBackend]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
