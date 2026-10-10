import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { allPages, api, errorMessage } from "../utils/adminApi";

export function useQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const retry = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    window.addEventListener("admin-data-changed", retry);
    return () => window.removeEventListener("admin-data-changed", retry);
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setLoading(Boolean(path));
    if (path)
      api
        .get<T>(path, { signal: controller.signal })
        .then((response) => {
          if (!controller.signal.aborted) {
            setData(response.data);
            setUpdatedAt(new Date().toISOString());
          }
        })
        .catch((error) => {
          if (!axios.isCancel(error) && !controller.signal.aborted)
            setError(errorMessage(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    return () => controller.abort();
  }, [path, revision]);
  return { data, loading, error, retry, updatedAt };
}

export function useOptions<T>(path: string | null) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("admin-data-changed", refresh);
    return () => window.removeEventListener("admin-data-changed", refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setData([]);
    setError("");
    setLoading(Boolean(path));
    if (path)
      allPages<T>(path, controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setData(rows);
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(errorMessage(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    return () => controller.abort();
  }, [path, revision]);
  return { data, loading, error };
}

export function useFilters(defaultLimit = 10) {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) || "";
  const integer = (key: string, fallback: number, max: number) =>
    Math.min(max, Math.max(1, Number.parseInt(get(key), 10) || fallback));
  const page = integer("page", 1, 10000);
  const limit = integer("limit", defaultLimit, 100);
  const update = (values: Record<string, string | number>, keepPage = false) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!keepPage) next.delete("page");
      Object.entries(values).forEach(([key, value]) => {
        if (value === "") next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  return { get, page, limit, update, reset: () => setParams({}) };
}
