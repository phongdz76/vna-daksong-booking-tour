import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import Icon from "../components/admin/Icon";

const ToastContext = createContext<(text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      <div className="toast-region" aria-live="polite">
        {message && (
          <div className="toast">
            <Icon name="check" />
            <span>{message}</span>
            <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
