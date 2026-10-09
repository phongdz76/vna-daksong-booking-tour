import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "../types/admin";
import { api, errorMessage, SESSION_KEY, setToken } from "../utils/adminApi";

interface AdminAuthContextType {
  user: User | null;
  checking: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
}
const AuthContext = createContext<AdminAuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const logout = useCallback(() => {
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setError("");
    setChecking(false);
  }, []);
  useEffect(() => {
    window.addEventListener("admin-session-expired", logout);
    return () => window.removeEventListener("admin-session-expired", logout);
  }, [logout]);
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    const controller = new AbortController();
    if (!stored) {
      setChecking(false);
      return;
    }
    setToken(stored);
    setChecking(true);
    setError("");
    api
      .get<{ user: User }>("/auth/me", { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.data.user.role !== "admin") {
          logout();
          setError("Tài khoản này không có quyền quản trị.");
        } else setUser(response.data.user);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [logout, revision]);
  async function login(email: string, password: string) {
    const { data } = await api.post<{ user: User; token: string }>(
      "/auth/admin/login",
      { email: email.trim().toLowerCase(), password },
    );
    if (data.user.role !== "admin")
      throw new Error("Tài khoản này không có quyền quản trị.");
    sessionStorage.setItem(SESSION_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setError("");
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        checking,
        error,
        login,
        logout,
        retry: () => setRevision((n) => n + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
