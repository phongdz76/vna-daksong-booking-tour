import { api } from "./api";
import type { ArticleSummary, Destination, ListResponse } from "../types/api";

async function readCatalog<T>(path: string, signal: AbortSignal): Promise<ListResponse<T>> {
  const [endpoint, query] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("limit", "100");
  params.set("page", "1");
  const first = await api.get<ListResponse<T>>(`${endpoint}?${params}`, { signal });
  const items = [...first.data.data];
  // Read all server pages before filtering/deduplicating and paginating the UI.
  for (let page = 2; page <= first.data.pagination.pages; page++) {
    params.set("page", String(page));
    const response = await api.get<ListResponse<T>>(`${endpoint}?${params}`, { signal });
    items.push(...response.data.data);
  }
  return { data: items, pagination: { page: 1, limit: items.length, total: items.length, pages: items.length ? 1 : 0 } };
}

export const readDestinationCatalog = (path: string, signal: AbortSignal) => readCatalog<Destination>(path, signal);
export const readArticleCatalog = (path: string, signal: AbortSignal) => readCatalog<ArticleSummary>(path, signal);
