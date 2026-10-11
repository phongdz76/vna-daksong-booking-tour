import sampleArticles from "./sampleArticles.json";
import type { ArticleContent } from "../context/NotificationContext";
import { previewImages } from "./preview";
import type { ArticleSummary } from "../types/api";

const galleryPool = [
  { url: previewImages.culture, alt: "Bản sắc văn hóa dân tộc truyền thống Đắk Song" },
  { url: previewImages.waterfall, alt: "Thác nước hoang sơ giữa rừng nguyên sinh Đắk Song" },
  { url: previewImages.forest, alt: "Rừng thông xanh ngát cao nguyên Đắk Nông" },
  { url: previewImages.windHills, alt: "Cánh đồng quạt gió Đắk Song dưới nắng chiều" },
  { url: previewImages.camping, alt: "Điểm cắm trại đêm ngắm sao trên đồi thông" },
];

export const previewArticles: (ArticleContent & Pick<ArticleSummary, "category">)[] = sampleArticles.map((article, index) => ({
  ...article,
  category: article.category as ArticleSummary["category"],
  _id: index === 0 ? "preview-notification-article" : `preview-article-${article.slug}`,
  images: [
    galleryPool[index % galleryPool.length],
    galleryPool[(index + 1) % galleryPool.length],
    galleryPool[(index + 2) % galleryPool.length],
    galleryPool[(index + 3) % galleryPool.length],
  ],
}));

export const previewArticle = previewArticles[0];
