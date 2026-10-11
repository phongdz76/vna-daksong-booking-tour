import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type RefreshHandler = () => Promise<unknown>;
const PageRefreshContext = createContext<{
  register: (handler: RefreshHandler) => () => void;
  refresh: () => Promise<void>;
} | null>(null);

export default function PageRefreshProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Set<RefreshHandler>());
  const pending = useRef<Promise<void> | null>(null);
  const register = useCallback((handler: RefreshHandler) => {
    handlers.current.add(handler);
    return () => { handlers.current.delete(handler); };
  }, []);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    pending.current = Promise.allSettled([...handlers.current].map((handler) =>
      Promise.resolve().then(handler),
    )).then((results) => {
      if (results.some((result) => result.status === "rejected")) {
        throw new Error("Chưa cập nhật được đầy đủ nội dung. Kéo xuống để thử lại.");
      }
    }).finally(() => { pending.current = null; });
    return pending.current;
  }, []);
  const value = useMemo(() => ({ register, refresh }), [register, refresh]);
  return <PageRefreshContext.Provider value={value}>{children}</PageRefreshContext.Provider>;
}

export function usePageRefresh() { return useContext(PageRefreshContext); }

export function usePageRefreshHandler(handler: RefreshHandler, enabled = true) {
  const register = usePageRefresh()?.register;
  useEffect(() => {
    if (enabled && register) return register(handler);
  }, [register, handler, enabled]);
}
