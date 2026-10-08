import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { usePreview } from "./PreviewContext";
import { api, errorMessage } from "../utils/api";
import type { ListResponse, ImageAsset } from "../types/api";

export interface AppNotification {
  id: string;
  type: "article" | "trip" | "payment";
  title: string;
  message: string;
  createdAt: string;
  href: string;
  readAt: string | null;
}
export interface NotificationResponse extends ListResponse<AppNotification> {
  unreadCount: number;
}
export interface ArticleContent {
  _id: string;
  title: string;
  summary: string;
  content: string;
  images: ImageAsset[];
  publishedAt?: string;
  createdAt?: string;
}

const previewArticle: ArticleContent = {
  _id: "preview-notification-article",
  title: "Chuẩn bị cho hành trình khám phá Đắk Song",
  summary: "Một vài lưu ý trước khi lên đường.",
  images: [],
  content:
    "Kiểm tra lịch khởi hành và điểm tập trung trong chi tiết đơn. Chuẩn bị nước uống, giày phù hợp và đồ dùng cá nhân. Liên hệ đơn vị tổ chức nếu bạn cần hỗ trợ. Đây là bài viết minh họa trong bản xem mẫu.",
};
export { previewArticle };
const sampleNotifications: AppNotification[] = [
  {
    id: "preview-payment",
    type: "payment",
    title: "Thanh toán thành công",
    message: "Thông báo minh họa: hệ thống đã ghi nhận tiền cho đơn mẫu.",
    href: "/my-bookings/preview-order",
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  {
    id: "preview-trip",
    type: "trip",
    title: "Chuyến đi đã được xác nhận",
    message:
      "Thông báo minh họa: xem lịch khởi hành và điểm tập trung của chuyến đi.",
    href: "/my-bookings/preview-order",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readAt: null,
  },
  {
    id: "preview-article",
    type: "article",
    title: "Bài viết mới: " + previewArticle.title,
    message: previewArticle.summary,
    href: "/articles/" + previewArticle._id,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    readAt: null,
  },
];

interface NotificationContextType {
  data: NotificationResponse | null;
  loading: boolean;
  error: string;
  type: string;
  setType: (value: string) => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadMore: () => void;
  canLoadMore: boolean;
}
const NotificationContext = createContext<NotificationContextType | null>(null);
export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("NotificationProvider is required.");
  return value;
}

export default function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isPreview } = usePreview();
  const [type, setFilter] = useState("all");
  const [limit, setLimit] = useState(20);
  const [samples, setSamples] = useState(sampleNotifications);
  const [result, setResult] = useState<{
    scope: string;
    data: NotificationResponse;
  } | null>(null);
  const [error, setError] = useState("");
  const scope = `${user?._id || "guest"}:${type}:${limit}`;
  const refresher = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refresher.current(), []);

  useEffect(() => {
    setError("");
    refresher.current = async () => {};
    if (isPreview || authLoading) return;
    const controller = new AbortController();
    let pending: Promise<void> | null = null;
    function read(): Promise<void> {
      if (pending) return pending;
      pending = api
        .get<NotificationResponse>(
          `/notifications?type=${type}&limit=${limit}`,
          { signal: controller.signal },
        )
        .then((response) => {
          if (!controller.signal.aborted) {
            setResult({ scope, data: response.data });
            setError("");
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(errorMessage(error));
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    }
    refresher.current = read;
    void read();
    const resume = () => {
      if (document.visibilityState !== "hidden") void read();
    };
    const timer = window.setInterval(resume, 30000);
    window.addEventListener("focus", resume);
    window.addEventListener("vna-booking-updated", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("vna-booking-updated", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [scope, type, limit, authLoading, isPreview]);

  const filteredSamples = samples.filter(
    (item) => type === "all" || item.type === type,
  );
  const data = isPreview
    ? {
        data: filteredSamples,
        unreadCount: samples.filter((item) => !item.readAt).length,
        pagination: { page: 1, limit, total: filteredSamples.length, pages: 1 },
      }
    : !authLoading && result?.scope === scope
      ? result.data
      : null;

  async function markRead(id: string) {
    if (isPreview) {
      setSamples((items) =>
        items.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      return;
    }
    if (!user) return;
    try {
      await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  async function markAllRead() {
    if (isPreview) {
      setSamples((items) =>
        items.map((item) => ({ ...item, readAt: new Date().toISOString() })),
      );
      return;
    }
    if (!user) return;
    try {
      await api.patch("/notifications/read-all");
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <NotificationContext.Provider
      value={{
        data,
        loading: authLoading || (!data && !error),
        error,
        type,
        setType: (value) => {
          setFilter(value);
          setLimit(20);
        },
        refresh,
        markRead,
        markAllRead,
        loadMore: () => setLimit((value) => Math.min(value + 20, 100)),
        canLoadMore: Boolean(
          data && data.data.length < data.pagination.total && limit < 100,
        ),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
