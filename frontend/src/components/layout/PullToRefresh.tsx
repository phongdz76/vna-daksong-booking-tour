import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { usePageRefresh } from "../../context/PageRefreshContext";

const threshold = 64;

export default function PullToRefresh({ content, enabled, pageKey }: {
  content: RefObject<HTMLDivElement>;
  enabled: boolean;
  pageKey: string;
}) {
  const refresh = usePageRefresh()!.refresh;
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    setDistance(0);
    setRefreshing(false);
    setMessage("");
    const scroller = content.current;
    if (!scroller || !enabled) return;
    let start: { x: number; y: number } | null = null;
    let pulled = 0;
    let alive = true;
    let messageTimer: ReturnType<typeof setTimeout> | undefined;

    function cancel() {
      start = null;
      pulled = 0;
      setDistance(0);
    }
    function touchStart(event: TouchEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (busy.current || event.touches.length !== 1 || scroller!.scrollTop > 0 ||
          document.querySelector("dialog[open]") ||
          target?.closest("input, textarea, select, [contenteditable], [data-no-pull-refresh]")) {
        start = null;
        return;
      }
      setMessage("");
      clearTimeout(messageTimer);
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    function touchMove(event: TouchEvent) {
      if (!start) return;
      if (event.touches.length !== 1 || scroller!.scrollTop > 0) { cancel(); return; }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (!pulled && (dy < -8 || (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)))) {
        cancel();
        return;
      }
      if (dy < 12 && !pulled) return;
      if (event.cancelable) event.preventDefault();
      pulled = Math.min(100, Math.max(0, dy * 0.5));
      setDistance(pulled);
    }
    async function touchEnd() {
      const shouldRefresh = pulled >= threshold;
      cancel();
      if (!shouldRefresh || busy.current) return;
      busy.current = true;
      setRefreshing(true);
      try {
        await refresh();
        if (alive) setMessage("Đã cập nhật");
      } catch (error) {
        if (alive) setMessage(error instanceof Error ? error.message : "Chưa cập nhật được. Kéo xuống để thử lại.");
      } finally {
        busy.current = false;
        if (alive) {
          setRefreshing(false);
          messageTimer = setTimeout(() => setMessage(""), 3500);
        }
      }
    }
    scroller.addEventListener("touchstart", touchStart, { passive: true });
    scroller.addEventListener("touchmove", touchMove, { passive: false });
    scroller.addEventListener("touchend", touchEnd);
    scroller.addEventListener("touchcancel", cancel);
    return () => {
      alive = false;
      clearTimeout(messageTimer);
      scroller.removeEventListener("touchstart", touchStart);
      scroller.removeEventListener("touchmove", touchMove);
      scroller.removeEventListener("touchend", touchEnd);
      scroller.removeEventListener("touchcancel", cancel);
    };
  }, [content, enabled, pageKey, refresh]);

  const visible = enabled && (distance > 0 || refreshing || Boolean(message));
  return (
    <div className={`pull-refresh-indicator ${visible ? "visible" : ""}`}
      role="status" aria-live="polite" aria-atomic="true"
      style={{ "--pull-distance": `${Math.min(distance, 64)}px` } as CSSProperties}>
      {visible && <>
        {refreshing ? <span className="pull-refresh-spinner" aria-hidden="true" /> :
          <span className="pull-refresh-arrow" aria-hidden="true" style={{ transform: distance >= threshold ? "rotate(180deg)" : undefined }}>↓</span>}
        <span>{refreshing ? "Đang cập nhật…" : message || (distance >= threshold ? "Thả tay để cập nhật" : "Kéo xuống để cập nhật")}</span>
      </>}
    </div>
  );
}
