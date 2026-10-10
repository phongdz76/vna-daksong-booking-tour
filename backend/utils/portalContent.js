import { parseDocument } from "htmlparser2";

export const PORTAL_URL = "https://dulichdaksong.vnasw.vn";
const API_URL = "https://core-360.vnaapi.com";
const DEPARTMENT = "DAKNONG-2-29";
const TOUR_CATEGORY = "61a4741b-5ec9-4149-8fc9-7eda16f523aa";
const CATEGORY_TARGETS = new Map([
  ["83c4f32f-c243-4d1a-af65-2a9ec57c2fed", { resource: "destinations", category: "nature" }],
  ["69cadefa-e2a4-4675-8747-56e7d6196de7", { resource: "destinations", category: "history" }],
  ["d457372f-2f54-45bb-a7af-a25ac8ba5013", { resource: "destinations", category: "culture" }],
  ["d20aba97-024a-4957-b9b7-b3cbc89fcd78", { resource: "articles", category: "culture" }],
  ["54e4a085-836e-4b4f-bac2-51c3cdab6e00", { resource: "articles", category: "travel_tips" }],
  ["984ec528-90d0-4294-96ab-30a64d884103", { resource: "articles", category: "culture" }],
  ["aeb51ba4-6ea1-4c57-8967-754a39a2224f", { resource: "articles", category: "food" }],
  ["1352f9ee-0a38-45d5-8e78-8a4cfa496c05", { resource: "articles", category: "food" }],
]);
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
// Place names taken from these source articles, without their editorial headlines.
const DESTINATION_NAMES = new Map([
  ["97fbb176-cbc4-4a30-a43c-5d3095e26909", { name: "Thiền viện Trúc Lâm Đạo Nguyên", category: "culture" }],
  ["587659dc-bcaf-495a-a427-97df4f538252", { name: "Di tích đồi Đạo Trung", category: "history" }],
]);
const BLOCKED_TAGS = new Set(["script", "style", "iframe", "object", "svg", "noscript"]);
const BLOCK_TAGS = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "li", "tr", "blockquote"]);

export function imageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const raw = value.trim();
    if (/^[a-z][\w+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
    const url = /^https?:\/\//i.test(raw) || raw.startsWith("//")
      ? new URL(raw, PORTAL_URL)
      : new URL(`/aws/${raw.replace(/^\/+/, "")}`, API_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.href.length > 2000) return null;
    return url.href;
  } catch { return null; }
}

export function cleanPortalText(value) {
  return String(value || "").normalize("NFC")
    .replace(/Ản\s+h:\s*Interne\s+t\b/giu, "Ảnh: Internet")
    .replace(/Ảnh:\s*Interne\s+t\b/giu, "Ảnh: Internet");
}

export function readPortalHtml(html) {
  const document = parseDocument(String(html || ""), { decodeEntities: true });
  const parts = [];
  const images = [];
  function visit(node) {
    if (BLOCKED_TAGS.has(node.name)) return;
    if (node.type === "text") { parts.push(node.data); return; }
    if (node.name === "img") {
      const url = imageUrl(node.attribs?.src);
      if (url) images.push({ url, alt: (node.attribs?.alt || "").slice(0, 300), credit: "Ảnh từ bài viết nguồn" });
      return;
    }
    if (node.name === "br") { parts.push("\n"); return; }
    const block = BLOCK_TAGS.has(node.name);
    if (block) parts.push("\n\n");
    if (node.name === "li") parts.push("• ");
    for (const child of node.children || []) visit(child);
    if (block) parts.push("\n\n");
  }
  visit(document);
  const text = parts.join("").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text: cleanPortalText(text), images };
}

export function portalSourceUrl(post) {
  return `${PORTAL_URL}/tin-tuc-su-kien/${encodeURIComponent(post.slug || post.id)}`;
}

export function mapPortalPost(post, target, checkedAt = new Date()) {
  if (!UUID.test(post.id || "") || post.isPublished !== true) throw new Error("Bài nguồn chưa xuất bản hoặc ID không hợp lệ.");
  const title = readPortalHtml(post.name).text;
  const body = readPortalHtml(post.content);
  const summary = readPortalHtml(post.quote).text || body.text.slice(0, 1000);
  if (!title || !body.text || title.length > 200 || body.text.length > (target.resource === "destinations" ? 30000 : 50000)) {
    throw new Error(`Bài nguồn thiếu nội dung hoặc vượt giới hạn: ${post.id}`);
  }
  const mainImage = imageUrl(post.image);
  const allImages = [...(mainImage ? [{ url: mainImage, alt: title, credit: "Ảnh từ bài viết nguồn" }] : []), ...body.images];
  const seen = new Set();
  const images = allImages.filter(image => !seen.has(image.url) && seen.add(image.url));
  const sources = [{ title: "Cổng Văn hóa Du lịch Đắk Song", url: portalSourceUrl(post), checkedAt }];
  const common = { slug: `vna-portal-${post.id.toLowerCase()}`, summary: summary.slice(0, 1000), images, sources, category: target.category, status: "published" };
  const publishedAt = post.publishDate && Number.isFinite(Date.parse(post.publishDate)) ? new Date(post.publishDate) : null;
  const destinationName = target.resource === "destinations" ? DESTINATION_NAMES.get(post.id) : null;
  return {
    sourceId: post.id,
    resource: target.resource,
    sourceCategory: post.categoryName || "",
    value: target.resource === "destinations"
      ? { ...common, name: destinationName?.name || title, category: destinationName?.category || common.category, description: body.text, address: "", visitNotes: "" }
      : { ...common, title, content: body.text, publishedAt },
  };
}

export function flattenCategories(categories) {
  return categories.flatMap(category => [category, ...flattenCategories(category.children || [])]);
}

export function isPortalDuplicate(resource, value, existing) {
  const normalize = text => String(text || "").normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi");
  const importedName = normalize(value.name || value.title);
  return existing.some(item => {
    if (item.slug === value.slug || item.sources?.some(source => source.url === value.sources[0].url)) return true;
    const savedName = normalize(item.name || item.title);
    if (savedName === importedName) return true;
    // Source headlines can append a subtitle to an existing place name.
    return resource === "destinations" && savedName.length >= 8 &&
      (importedName.startsWith(`${savedName} - `) || importedName.startsWith(`${savedName}: `));
  });
}

export async function fetchPortalContent({ fetchImpl = fetch, checkedAt = new Date(), onProgress = () => {} } = {}) {
  async function request(path, body) {
    const response = await fetchImpl(`${API_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "X-Department-Code": DEPARTMENT, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`API nguồn trả HTTP ${response.status} tại ${path}`);
    const result = await response.json();
    if (result.success !== true || result.data == null) throw new Error(`API nguồn trả dữ liệu không hợp lệ tại ${path}`);
    return result.data;
  }
  const tree = await request(`/category/all/${DEPARTMENT}`);
  if (!Array.isArray(tree)) throw new Error("Danh sách chuyên mục nguồn không hợp lệ.");
  const categories = flattenCategories(tree).filter(category => CATEGORY_TARGETS.has(category.id) || category.id === TOUR_CATEGORY);
  const posts = new Map();
  for (const category of categories) {
    for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
      const page = await request("/post-public/find", { categorySlugOrId: category.slug || category.id, pageNumber, pageSize: 20 });
      if (!Array.isArray(page.items) || !Number.isInteger(page.total) || page.total < 0 || page.total > 2000) throw new Error("Phân trang bài viết nguồn không hợp lệ.");
      for (const post of page.items) {
        if (!UUID.test(post.id || "")) throw new Error("ID bài viết nguồn không hợp lệ.");
        if (!posts.has(post.id)) posts.set(post.id, { post, category });
      }
      if ((pageNumber + 1) * 20 >= page.total) break;
      if (!page.items.length || pageNumber === 99) throw new Error("Không lấy được đầy đủ bài viết nguồn.");
    }
    onProgress(`Đã đọc chuyên mục: ${category.name.trim()}`);
  }
  const entries = [];
  const separateTours = [];
  for (const { post, category } of posts.values()) {
    const detail = await request(`/post-public/${encodeURIComponent(post.id)}`);
    if (detail.id !== post.id) throw new Error("ID chi tiết không trùng bài viết nguồn.");
    if (detail.isPublished !== true) continue;
    if (category.id === TOUR_CATEGORY || detail.categoryId === TOUR_CATEGORY || detail.subCategoryIds?.includes(TOUR_CATEGORY)) {
      // These tour articles are exported separately and never written to app collections.
      separateTours.push({ sourceId: detail.id, title: detail.name, summary: detail.quote, contentHtml: detail.content, image: imageUrl(detail.image), sourceUrl: portalSourceUrl(detail), publishedAt: detail.publishDate });
    } else {
      entries.push(mapPortalPost(detail, CATEGORY_TARGETS.get(category.id), checkedAt));
    }
  }
  return { source: PORTAL_URL, checkedAt: checkedAt.toISOString(), entries, separateTours };
}
