// These five Nâm Nung photos are also published with valid HTTPS at:
// https://wetrek.vn/bai-viet-thanh-vien/khu-bao-ton-thien-nhien-nam-nung-diem-cam-trai-ly-tuong-cho-dan-ua-mao-hiem.htm
// Original credit: NB / Sài Gòn Tiếp Thị. Only replace the verified image paths.
const namNungImages: Record<string, string> = {
  "/wp-content/uploads/2020/04/image001.jpg": "Nam-nhung-wetrek-1.jpg",
  "/wp-content/uploads/2020/04/image003.jpg": "Nam-nhung-wetrek-2.jpg",
  "/wp-content/uploads/2020/04/image005.jpg": "Nam-nhung-wetrek-3.jpg",
  "/wp-content/uploads/2020/04/image007.jpg": "Nam-nhung-wetrek-4.jpg",
  "/wp-content/uploads/2020/04/image009.jpg": "Nam-nhung-wetrek-5.jpg",
};

const namNungCaptions: Record<string, string> = {
  "https://wetrek.vn/pic/Service/images/Nam-nhung-wetrek-1.jpg": "Rừng Nâm Nung nhìn từ trên cao.",
  "https://wetrek.vn/pic/Service/images/Nam-nhung-wetrek-2.jpg": "Cầu treo trên đường khám phá rừng Nâm Nung.",
  "https://wetrek.vn/pic/Service/images/Nam-nhung-wetrek-3.jpg": "Cắm trại trên bãi đá cạnh thác Gấu.",
  "https://wetrek.vn/pic/Service/images/Nam-nhung-wetrek-4.jpg": "Dòng suối Đắk P’Rí giữa rừng xanh.",
  "https://wetrek.vn/pic/Service/images/Nam-nhung-wetrek-5.jpg": "Thác Bảy Tầng trong khu bảo tồn Nâm Nung.",
};

export function imageCaption(src: string): string | undefined {
  return namNungCaptions[resolveImageUrl(src) || ""];
}

export function resolveImageUrl(src?: string): string | undefined {
  if (!src) return src;
  try {
    const url = new URL(src);
    if (["cdn.sgtiepthi.vn", "www.sgtiepthi.vn", "sgtiepthi.vn"].includes(url.hostname)) {
      const replacement = namNungImages[url.pathname];
      if (replacement) return `https://wetrek.vn/pic/Service/images/${replacement}`;
    }
  } catch {
    // Local asset paths already work in both Vite and Zalo builds.
  }
  return src;
}
