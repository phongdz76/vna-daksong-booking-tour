import type { Destination } from "../types/api";
import { previewDestinations } from "./preview";
import { previewArticles } from "./previewArticles";

// Public destination text is shared with the API; these IDs belong only to the preview.
export const previewExploreDestinations: (Destination & {
  distanceKm?: number;
  group: string;
  featured?: boolean;
})[] = [
  { destination: previewDestinations[2], id: "preview-explore-wind", group: "wind-coffee", featured: true },
  { destination: previewDestinations[0], id: "preview-explore-clouds", group: "clouds-pine" },
  { destination: previewDestinations[3], id: "preview-explore-pine", group: "clouds-pine" },
  { destination: previewDestinations[1], id: "preview-explore-waterfall", group: "" },
  { destination: previewDestinations[4], id: "preview-explore-farm", group: "" },
  { destination: previewDestinations[5], id: "preview-explore-flagpole", group: "" },
].map(({ destination, id, group, featured }) => ({ ...destination, _id: id, group, featured }));

export interface ExploreGuide {
  id: string;
  title: string;
  image?: string;
  category: string;
  description: string;
  readingMinutes?: number;
  href: string;
}

export const previewExploreGuides: ExploreGuide[] = previewArticles.map(article => ({
  id: article._id,
  title: article.title,
  image: article.images[0]?.url,
  category: "Văn hóa",
  readingMinutes: Math.max(1, Math.ceil(article.content.split(/\s+/).length / 200)),
  description: article.summary,
  href: "/articles/" + article._id,
}));
