import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../types/api";
import { api, setApiToken } from "../utils/api";
import { readSession, storeSession } from "../utils/zalo";
import { usePreview } from "./PreviewContext";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { isPreview } = usePreview();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = readSession();
    if (!token || isPreview) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setApiToken(token);
    api
      .get<{ user: User }>("/auth/me", { signal: controller.signal })
      .then((response) => setUser(response.data.user))
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.response?.status === 401 || error.response?.status === 403)
          storeSession(null);
        setApiToken(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isPreview]);

  function login(token: string, userData: User) {
    setApiToken(token);
    storeSession(token);
    setUser(userData);
  }
  function logout() {
    setApiToken(null);
    storeSession(null);
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
