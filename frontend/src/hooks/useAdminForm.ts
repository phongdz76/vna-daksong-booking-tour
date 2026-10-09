import { useEffect, useState } from "react";

export default function useAdminForm(onClose: () => void) {
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (error)
      Array.from(document.querySelectorAll("dialog[open] .notice.error"))
        .at(-1)
        ?.scrollIntoView({ block: "center" });
  }, [error]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  const close = () => {
    if (!busy && (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?")))
      onClose();
  };
  return {
    busy,
    setBusy,
    error,
    setError,
    dirty,
    touch: () => setDirty(true),
    close,
  };
}
