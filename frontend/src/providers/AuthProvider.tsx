"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const readFromStorage = useCallback(() => {
    try {
      const t = localStorage.getItem("redactiq_token");
      const u = localStorage.getItem("redactiq_user");
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    readFromStorage();

    // Re-sync when another tab changes localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === "redactiq_token" || e.key === "redactiq_user") {
        readFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);

    // Re-sync when window gets focus (handles same-tab redirects)
    const onFocus = () => readFromStorage();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [readFromStorage]);

  const login = useCallback((t: string, u: UserProfile) => {
    localStorage.setItem("redactiq_token", t);
    localStorage.setItem("redactiq_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("redactiq_token");
    localStorage.removeItem("redactiq_user");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    readFromStorage();
  }, [readFromStorage]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
