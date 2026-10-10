import test from "node:test";
import assert from "node:assert/strict";
import { fetchPortalContent, imageUrl, isPortalDuplicate, mapPortalPost, readPortalHtml } from "../utils/portalContent.js";

const destinationCategory = "83c4f32f-c243-4d1a-af65-2a9ec57c2fed";
const guideCategory = "aeb51ba4-6ea1-4c57-8967-754a39a2224f";
const tourCategory = "61a4741b-5ec9-4149-8fc9-7eda16f523aa";
const id = number => `00000000-0000-0000-0000-${String(number).padStart(12, "0")}`;
const post = number => ({ id: id(number), isPublished: true, name: "Bài Đắk Song", quote: "Mô tả &amp; nguồn", content: '<p>Nội dung &lt;an toàn&gt;</p><p>Đoạn hai.</p>', image: "360/photo.jpg", slug: `bai-viet-${id(number)}`, publishDate: "2023-03-06T00:00:00Z" });

test("HTML source keeps paragraphs and entities, discards executable elements and unsafe image URLs", () => {
  const result = readPortalHtml('<p>Đắk&nbsp;Song &amp; rừng</p><script>alert(1)</script><style>body{display:none}</style><iframe>secret</iframe><p>Hai<br>Ba</p><img src="javascript:alert(1)"><img src="https://example.com/forest.jpg" alt="Rừng">');
  assert.equal(result.text, "Đắk Song & rừng\n\nHai\nBa");
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].url, "https://example.com/forest.jpg");
});

test("Article provenance, publication date and stable source identity survive import", () => {
  const mapped = mapPortalPost(post(1), { resource: "articles", category: "food" }, new Date("2026-10-10T00:00:00Z"));
  assert.equal(mapped.value.slug, `vna-portal-${id(1)}`);
  assert.equal(mapped.value.summary, "Mô tả & nguồn");
  assert.equal(mapped.value.publishedAt.toISOString(), "2023-03-06T00:00:00.000Z");
  assert.equal(mapped.value.sources[0].url, `https://dulichdaksong.vnasw.vn/tin-tuc-su-kien/bai-viet-${id(1)}`);
  assert.equal(mapped.value.images[0].url, "https://core-360.vnaapi.com/aws/360/photo.jpg");
});

test("A fragmented image credit is repaired without merging article paragraphs", () => {
  const result = readPortalHtml("<p>Đoạn một.</p><p>Đoạn hai.</p><p>Ản</p><p>h:</p><p>Interne</p><p>t</p>");
  assert.equal(result.text, "Đoạn một.\n\nĐoạn hai.\n\nẢnh: Internet");
});

test("Destinations never invent location, price or departure details", () => {
  const mapped = mapPortalPost(post(1), { resource: "destinations", category: "nature" });
  assert.equal(mapped.value.address, "");
  assert.equal(mapped.value.description, "Nội dung <an toàn>\n\nĐoạn hai.");
  assert.equal(mapped.value.adultPrice, undefined);
  assert.equal(mapped.value.departureAt, undefined);
});

test("Unpublished or empty source posts cannot become visible app content", () => {
  const target = { resource: "articles", category: "food" };
  assert.throws(() => mapPortalPost({ ...post(1), isPublished: false }, target));
  assert.throws(() => mapPortalPost({ ...post(1), content: "<script>hidden()</script>" }, target));
});

test("Historic and recreational places go to destinations while food stays an article", async () => {
  const categories = [
    { id: "69cadefa-e2a4-4675-8747-56e7d6196de7", name: "Di tích - lịch sử", slug: "history" },
    { id: "d457372f-2f54-45bb-a7af-a25ac8ba5013", name: "Địa điểm giải trí", slug: "recreation" },
    { id: guideCategory, name: "Ẩm thực", slug: "food" },
  ];
  const fetchImpl = async (url, options) => {
    let data;
    if (url.includes("/category/all/")) data = categories;
    else if (url.endsWith("/find")) {
      const category = JSON.parse(options.body).categorySlugOrId;
      data = { total: 1, items: [post(category === "history" ? 1 : category === "recreation" ? 2 : 3)] };
    } else data = post(Number(url.slice(-12)));
    return new Response(JSON.stringify({ success: true, data }));
  };
  const result = await fetchPortalContent({ fetchImpl });
  assert.deepEqual(result.entries.map(entry => [entry.resource, entry.value.category]), [
    ["destinations", "history"], ["destinations", "culture"], ["articles", "food"],
  ]);
});

test("Historic source headline for the monastery resolves to its existing place name", () => {
  const mapped = mapPortalPost({ ...post(1), id: "97fbb176-cbc4-4a30-a43c-5d3095e26909", name: "Lắng lòng tại Thiền Viện Trúc Lâm Đạo Nguyên ở Đắk Nông" }, { resource: "destinations", category: "history" });
  assert.equal(mapped.value.name, "Thiền viện Trúc Lâm Đạo Nguyên");
  assert.equal(mapped.value.category, "culture");
  assert.equal(isPortalDuplicate("destinations", mapped.value, [{ name: "Thiền viện Trúc Lâm Đạo Nguyên", slug: "thien-vien" }]), true);
});

test("Image transport rejects credentials, insecure and executable protocols", () => {
  for (const value of ["http://example.com/a.jpg", "https://user:password@example.com/a.jpg", "data:image/png;base64,a", "javascript:alert(1)"]) assert.equal(imageUrl(value), null);
});

test("Source imports keep existing edited places and do not duplicate a headline subtitle", () => {
  const value = { slug: "vna-portal-unique", name: "Thác Lưu Ly - 'cô gái đẹp' giữa rừng", sources: [{ url: "https://example.com/source" }] };
  const existing = [{ name: "Thác Lưu Ly", slug: "thac-luu-ly", description: "Nội dung đã sửa" }];
  assert.equal(isPortalDuplicate("destinations", value, existing), true);
  assert.equal(isPortalDuplicate("destinations", { ...value, name: "Thác khác" }, existing), false);
  assert.equal(existing[0].description, "Nội dung đã sửa");
  assert.equal(isPortalDuplicate("articles", { ...value, title: "Bài mới", name: undefined }, [{ title: "Bài khác", sources: value.sources }]), true);
});

test("Source pagination is complete and duplicate posts are deduplicated; tour data stays separate", async () => {
  const categories = [{ id: guideCategory, slug: "food", name: "Ẩm thực", children: [] }, { id: tourCategory, slug: "tours", name: "Tour du lịch", children: [] }];
  const requests = [];
  const response = data => new Response(JSON.stringify({ success: true, data }));
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.headers["X-Department-Code"], "DAKNONG-2-29");
    if (url.includes("/category/all/")) return response(categories);
    if (url.endsWith("/find")) {
      const body = JSON.parse(options.body);
      if (body.categorySlugOrId === "tours") return response({ total: 1, items: [post(22)] });
      return response({ total: 21, items: body.pageNumber === 0 ? Array.from({ length: 20 }, (_, i) => post(i + 1)) : [post(20), post(21)] });
    }
    const number = Number(url.slice(-12));
    return response({ ...post(number), categoryId: number === 22 ? tourCategory : guideCategory });
  };
  const result = await fetchPortalContent({ fetchImpl });
  assert.equal(result.entries.length, 21);
  assert.equal(result.separateTours.length, 1);
  assert.equal(result.entries.some(entry => entry.sourceId === id(22)), false);
  assert.equal(requests.filter(request => request.options.method === "POST").length, 3);
});

test("A tour cross-listed under a guide category is still excluded from app collections", async () => {
  const fetchImpl = async url => new Response(JSON.stringify({ success: true, data: url.includes("/category/all/")
    ? [{ id: guideCategory, name: "Ẩm thực", slug: "food", children: [] }]
    : url.endsWith("/find") ? { total: 1, items: [post(1)] }
      : { ...post(1), categoryId: tourCategory } }));
  const result = await fetchPortalContent({ fetchImpl });
  assert.equal(result.entries.length, 0);
  assert.equal(result.separateTours.length, 1);
});

test("Provider refusal stops import planning; no fallback or synthesized articles", async () => {
  await assert.rejects(fetchPortalContent({ fetchImpl: async () => new Response("Forbidden", { status: 403 }) }), /HTTP 403/);
});

test("Mismatched detail identity is rejected before producing an import batch", async () => {
  const fetchImpl = async url => new Response(JSON.stringify({ success: true, data: url.includes("/category/all/")
    ? [{ id: destinationCategory, name: "Danh lam", slug: "nature", children: [] }]
    : url.endsWith("/find") ? { total: 1, items: [post(1)] } : post(2) }));
  await assert.rejects(fetchPortalContent({ fetchImpl }), /ID chi tiết/);
});
