import { useCallback, useEffect, useRef, useState } from "react";
import { usePreview } from "../context/PreviewContext";
import { api, errorMessage } from "../utils/api";

// Read-only requests share the same loading/error/retry behavior. Mutations stay in page handlers.
export default function useApi<T>(path: string | null, previewData?: T) {
  const { isPreview } = usePreview();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [refreshError, setRefreshError] = useState("");
  const refresher = useRef<() => Promise<T | null>>(async () => null);
  const refresh = useCallback(() => refresher.current(), []);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setRefreshError("");
    refresher.current = async () => null;
    if (isPreview) {
      setData(previewData ?? null);
      if (!previewData) setError("Không tìm thấy nội dung trong bản xem mẫu.");
      setLoading(false);
      return;
    }
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let pending: Promise<T | null> | null = null;
    function read(initial = false): Promise<T | null> {
      if (pending) return pending;
      pending = api
        .get<T>(path!, { signal: controller.signal })
        .then((response) => {
          if (controller.signal.aborted) return null;
          setData(response.data);
          setRefreshError("");
          return response.data;
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            if (initial) setError(errorMessage(error));
            else setRefreshError(errorMessage(error));
          }
          return null;
        })
        .finally(() => {
          pending = null;
          if (initial && !controller.signal.aborted) setLoading(false);
        });
      return pending;
    }
    refresher.current = () => read();
    void read(true);
    return () => controller.abort();
  }, [path, isPreview, revision, previewData]);
  return {
    data,
    loading,
    error,
    retry,
    refresh,
    refreshError,
  };
}
