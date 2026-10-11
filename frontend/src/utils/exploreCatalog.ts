import type { Destination } from "../types/api";

// Verified duplicates created by the map/portal imports. Keep their real IDs and
// detail URLs; avoid merging unrelated places merely because names are similar.
const destinationAliases: Record<string, string> = {
  "vna-map-di-tich-doi-dao-trung": "dao-trung",
  "vna-portal-587659dc-bcaf-495a-a427-97df4f538252": "dao-trung",
  "vna-map-dien-gio-dak-song": "dien-gio",
  "doi-dien-gio-dak-song": "dien-gio",
  "vna-map-thien-vien-truc-lam-dao-nguyen": "dao-nguyen",
  "thien-vien-truc-lam-dao-nguyen": "dao-nguyen",
  "vna-map-thac-luu-ly": "luu-ly",
  "thac-luu-ly": "luu-ly",
};

export function uniqueDestinations(destinations: Destination[]): Destination[] {
  const entries = new Map<string, Destination>();
  for (const destination of destinations) {
    const key = destinationAliases[destination.slug || ""] || destination._id;
    const current = entries.get(key);
    if (!current || (!current.coordinates && destination.coordinates)) {
      entries.set(key, destination);
    }
  }
  return [...entries.values()];
}

export function catalogPage<T>(items: T[], requestedPage: number, limit = 8) {
  const pages = Math.ceil(items.length / limit);
  const page = Math.min(Math.max(1, requestedPage), Math.max(1, pages));
  return { data: items.slice((page - 1) * limit, page * limit), page, pages, total: items.length };
}
