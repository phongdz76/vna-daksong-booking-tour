import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Browser gestures and read-only fixture responses; no requests reach the database.
const base = process.env.UI_BASE_URL || "http://localhost:5173";
const output = new URL("../test-results/", import.meta.url);
const profile = fileURLToPath(new URL(`../.browser-cache/scroll-${Date.now()}/`, import.meta.url));
await mkdir(output, { recursive: true });
const browser = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--no-first-run", "--disable-extensions", "--disable-gpu", "about:blank",
], { windowsHide: true, stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const counts = new Map();
const checks = [];
const errors = [];
let revision = 1;
let failDestination = false;
let socket, command, launchError;
browser.on("error", error => { launchError = error; });
const tourSamples = JSON.parse(await readFile(new URL("../src/data/sampleTours.json", import.meta.url), "utf8"));
const list = data => ({ data, pagination: { page: 1, limit: 8, total: data.length, pages: 1 } });
const destinationItems = () => [...Array.from({ length: 8 }, (_, index) => ({
  _id: `destination-${index}`, name: `Điểm kiểm thử ${index} · ${revision}`,
  summary: "Dữ liệu kiểm thử cuộn", category: "nature", address: "Đắk Song",
  slug: index === 0 ? "vna-map-thac-luu-ly" : index === 1 ? "vna-map-dien-gio-dak-song" : `fixture-${index}`,
  coordinates: { latitude: 12, longitude: 107 },
  images: [{ url: `${base}/src/assets/stitch/${index % 2 ? 'wind-hills' : 'forest'}.jpg`, alt: "Ảnh kiểm thử" }],
})),
  { _id: "food-place", name: "Địa điểm ẩm thực", category: "food", address: "Đắk Song", images: [] },
  { _id: "old-waterfall", slug: "thac-luu-ly", name: "Thác Lưu Ly", category: "nature", images: [] },
  { _id: "old-wind", slug: "doi-dien-gio-dak-song", name: "Đồi Điện Gió Đắk Song", category: "nature", images: [] },
];
const guideItems = Array.from({ length: 12 }, (_, index) => ({
  _id: `guide-${index}`, title: ['Kinh nghiệm khám phá Đắk Song', 'Hương vị ẩm thực địa phương', 'Tìm hiểu văn hóa Tây Nguyên'][index % 3] + ` ${index + 1}`,
  summary: 'Những thông tin hữu ích để chuẩn bị cho chuyến đi, tìm hiểu địa phương và chọn trải nghiệm phù hợp.',
  category: ['travel_tips', 'food', 'culture'][index % 3],
  images: [{ url: `${base}/src/assets/stitch/${index % 2 ? 'explore-waterfall' : 'forest'}.jpg` }],
}));
const serverPage = (items, page) => ({ data: items.slice((page - 1) * 8, page * 8), pagination: { page, limit: 8, total: items.length, pages: Math.ceil(items.length / 8) } });
const user = () => ({ _id: "scroll-user", name: `Khách kiểm thử ${revision}`, role: "user", phone: "0900000000", savedTours: [], membershipTier: "Bạc", loyaltyPoints: 0 });
function check(name, condition) { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); }

try {
  let port;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (launchError) throw launchError;
    try { port = Number((await readFile(`${profile}/DevToolsActivePort`, "utf8")).split("\n")[0]); } catch {}
    if (port) break;
    await delay(150);
  }
  assert.ok(port, "Chrome không khởi động");
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = message => {
    const event = JSON.parse(message.data);
    if (event.id) {
      const request = pending.get(event.id);
      if (!request) return;
      clearTimeout(request.timer); pending.delete(event.id);
      if (event.error) request.reject(new Error(JSON.stringify(event.error)));
      else request.resolve(event.result);
    }
    if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
    if (event.method === "Fetch.requestPaused") void (async () => {
      const { requestId, request } = event.params;
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        await command("Fetch.fulfillRequest", { requestId, responseCode: 204,
          responseHeaders: [{ name: "Access-Control-Allow-Origin", value: "*" }, { name: "Access-Control-Allow-Methods", value: "GET" }, { name: "Access-Control-Allow-Headers", value: "authorization,content-type" }] });
        return;
      }
      if (request.method !== "GET") throw new Error(`Unexpected mutation: ${request.method} ${url.pathname}`);
      const path = url.pathname.replace(/^\/api/, "");
      counts.set(path, (counts.get(path) || 0) + 1);
      let responseCode = 200, data;
      if (path === "/destinations") {
        await delay(180);
        responseCode = failDestination ? 503 : 200;
        data = failDestination ? { message: "Kết nối thử nghiệm bị lỗi" } : serverPage(destinationItems(), Number(url.searchParams.get('page')) || 1);
      } else if (path === "/articles") data = serverPage(guideItems, Number(url.searchParams.get('page')) || 1);
      else if (path === "/auth/me") data = { user: user() };
      else if (path === "/tours") data = list(tourSamples.map((tour, index) => ({ ...tour, _id: `tour-${index}`, images: [{ url: `${base}/src/assets/images/0bbfd724.png` }] })));
      else if (path === "/tours/saved") data = { data: [] };
      else if (path.startsWith("/notifications")) data = { data: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
      else data = list([]);
      await command("Fetch.fulfillRequest", { requestId, responseCode,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: "*" }],
        body: Buffer.from(JSON.stringify(data)).toString("base64") });
    })().catch(error => { if (!error.message.includes("Invalid InterceptionId")) errors.push(error.message); });
  };
  const evaluate = async expression => {
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(70); }
    throw new Error(`UI timeout: ${expression}`);
  }
  async function drag({ x = 190, y = 77, dx = 0, dy = 180 } = {}) {
    await command("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) {
      await command("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx * step / 6, y: y + dy * step / 6 }] });
      await delay(20);
    }
    await command("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  async function screenshot(name) {
    const shot = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(new URL(name, output), Buffer.from(shot.data, "base64"));
  }
  await command("Page.enable"); await command("Runtime.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await command("Page.addScriptToEvaluateOnNewDocument", { source: "sessionStorage.setItem('vna-customer-session', 'scroll-ui-fixture');" });
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await command("Page.navigate", { url: base + "/explore?category=nature" });
  await waitFor("document.querySelectorAll('.explore-destination-card').length === 8");
  await waitFor("[...document.querySelectorAll('.explore-destination-card img')].every(img => img.complete && img.naturalWidth > 0)");
  await evaluate("window.originalCard = document.querySelector('.explore-destination-card'); document.querySelector('.page-content').scrollTop = 400;");
  await evaluate("document.querySelector('.bottom-nav .active').click()");
  await waitFor("document.querySelector('.page-content').scrollTop < 1");
  check("Chạm lại tab cuộn lên đầu và giữ bộ lọc", await evaluate("location.search === '?category=nature'"));
  let before = counts.get("/destinations");
  await drag({ dy: 55 }); await delay(300);
  check("Kéo ngắn không gửi yêu cầu tải lại", counts.get("/destinations") === before);
  await drag({ dx: 120, dy: 5 }); await delay(300);
  check("Vuốt ngang không kích hoạt cập nhật", counts.get("/destinations") === before);
  await evaluate("document.querySelector('.page-content').scrollTop = 500");
  await drag({ dy: 100 }); await delay(300);
  check("Cuộn giữa trang không kích hoạt cập nhật", counts.get("/destinations") === before);
  await evaluate("document.querySelector('.page-content').scrollTo({ top: 0, behavior: 'instant' })");
  revision++;
  await drag({ y: 245 });
  await waitFor("document.querySelector('.pull-refresh-spinner')");
  await waitFor("document.querySelector('.pull-refresh-indicator').textContent.includes('Đã cập nhật')");
  check("Kéo đủ ngưỡng đọc lại đầy đủ hai trang API một lần", counts.get("/destinations") === before + 2);
  check("Kéo trên ảnh không mở nhầm link điểm đến", await evaluate("location.pathname === '/explore'"));
  check("Nội dung cập nhật tại chỗ, giữ DOM và phiên", await evaluate("window.originalCard === document.querySelector('.explore-destination-card') && document.querySelector('.explore-destination-card h3').textContent.endsWith('· 2') && sessionStorage.getItem('vna-customer-session') === 'scroll-ui-fixture' && location.search === '?category=nature'"));
  failDestination = true;
  await drag();
  await waitFor("document.querySelector('.pull-refresh-indicator').textContent.includes('Chưa cập nhật')");
  check("Lỗi cập nhật vẫn giữ nội dung cũ và báo thử lại", await evaluate("document.querySelectorAll('.explore-destination-card').length === 8 && !document.querySelector('.pull-refresh-spinner')"));
  failDestination = false;
  revision++;
  await drag();
  await waitFor("document.querySelector('.explore-destination-card h3').textContent.endsWith('· 3')");
  check("Kéo lại sau lỗi khôi phục được dữ liệu", true);
  await screenshot("scroll-explore-390.png");

  failDestination = true;
  await command("Page.navigate", { url: base + "/explore?category=food" });
  await waitFor("document.querySelector('.error-state') || document.querySelector('[role=alert]') || document.querySelector('.page-content')?.textContent.includes('Kết nối thử nghiệm bị lỗi')");
  failDestination = false;
  await evaluate("document.querySelector('.page-content').scrollTop = 0");
  await drag();
  await waitFor("document.querySelectorAll('.explore-destination-card').length === 1");
  check("Kéo cập nhật khôi phục cả lỗi tải trang ban đầu", true);

  await evaluate("document.querySelector('.explore-chip').click()");
  await waitFor("document.querySelectorAll('.explore-destination-card').length === 8");
  check("Gom điểm đến trùng xuyên trang API và đếm 9 điểm duy nhất", await evaluate("document.querySelector('.explore-chip').textContent.includes('(9)') && document.querySelector('.pagination span').textContent === '1 / 2'"));
  check("Giữ ID bản ghi có tọa độ cho link chi tiết", await evaluate("document.querySelector('.explore-destination-card a').getAttribute('href').endsWith('/destination-0')"));
  check("Chỉ hiển thị bộ lọc điểm đến có nội dung", await evaluate("!document.querySelector('.explore-filters').textContent.includes('Lịch sử')"));
  before = counts.get('/destinations');
  await evaluate("document.querySelector('.pagination button:last-child').click()");
  await waitFor("document.querySelector('.pagination span').textContent === '2 / 2'");
  check("Phân trang điểm đến sau khi gom trùng không mất bản ghi cuối", await evaluate("document.querySelectorAll('.explore-destination-card').length === 1 && document.querySelector('.explore-destination-card h3').textContent === 'Địa điểm ẩm thực'"));
  await evaluate("document.querySelector('.pagination button:first-child').click()");
  await waitFor("document.querySelectorAll('.explore-destination-card').length === 8");
  await evaluate("document.querySelector('.page-content').scrollTop = 150");
  await delay(100);
  const destinationScroll = await evaluate("document.querySelector('.page-content').scrollTop");
  await evaluate("document.querySelector('#explore-tab-guides').click()");
  await waitFor("document.querySelectorAll('.explore-guide-card').length === 8");
  check("Tab Cẩm nang chỉ hiện bài viết và bố cục một bài lớn, bảy hàng gọn", await evaluate("!document.querySelector('#explore-destinations') && document.querySelectorAll('.featured-guide').length === 1 && document.querySelectorAll('.guide-row').length === 7"));
  check("Không hiện nhóm bài viết rỗng", await evaluate("!document.querySelector('.explore-filters').textContent.includes('Câu chuyện')"));
  await screenshot("explore-guides-390.png");
  await evaluate("[...document.querySelectorAll('.explore-chip')].find(button => button.textContent === 'Ẩm thực').click()");
  await waitFor("document.querySelectorAll('.explore-guide-card').length === 4");
  check("Bộ lọc cẩm nang tách khỏi bộ lọc điểm đến", await evaluate("new URLSearchParams(location.search).get('guideCategory') === 'food' && !new URLSearchParams(location.search).get('category')"));
  await evaluate("document.querySelector('.page-content').scrollTop = 100");
  await delay(100);
  const guideScroll = await evaluate("document.querySelector('.page-content').scrollTop");
  await evaluate("document.querySelector('#explore-tab-destinations').click()");
  await waitFor("document.querySelectorAll('.explore-destination-card').length === 8");
  check("Chuyển về Điểm đến giữ vị trí cuộn", Math.abs(await evaluate("document.querySelector('.page-content').scrollTop") - destinationScroll) < 2);
  check("Đổi tab và bộ lọc không gọi lại catalog đã tải", counts.get('/destinations') === before);
  await evaluate("document.querySelector('#explore-tab-guides').click()");
  await waitFor("document.querySelectorAll('.explore-guide-card').length === 4");
  check("Quay lại Cẩm nang giữ chủ đề và vị trí cuộn", Math.abs(await evaluate("document.querySelector('.page-content').scrollTop") - guideScroll) < 2);
  await evaluate("document.querySelector('.page-content').scrollTop = 0");
  const destinationReads = counts.get('/destinations');
  const articleReads = counts.get('/articles');
  await drag();
  await waitFor("document.querySelector('.pull-refresh-indicator').textContent.includes('Đã cập nhật')");
  check("Kéo ở Cẩm nang chỉ cập nhật API bài viết", counts.get('/articles') === articleReads + 2 && counts.get('/destinations') === destinationReads);
  await evaluate("document.querySelector('#explore-tab-destinations').click()");
  await waitFor("document.querySelectorAll('.explore-destination-card').length === 8");
  await evaluate("document.querySelector('.bottom-nav .active').click()");
  await waitFor("document.querySelector('.page-content').scrollTop < 1");
  check("Hai cột điểm đến dùng ảnh đúng tỷ lệ 4:3", await evaluate("(() => { const r=document.querySelector('.explore-destination-image').getBoundingClientRect(); return Math.abs(r.width / r.height - 4/3) < 0.02; })()"));
  await screenshot("explore-destinations-390.png");

  await evaluate("[...document.querySelectorAll('.bottom-nav a')].find(a => a.textContent.includes('Tài khoản')).click()");
  await waitFor("document.querySelector('.account-profile h1').textContent.includes('Khách kiểm thử')");
  revision++;
  before = counts.get("/auth/me");
  await drag({ y: 85 });
  await waitFor("document.querySelector('.account-profile h1').textContent.includes('Khách kiểm thử 4')");
  check("Kéo trang Tài khoản cập nhật hồ sơ từ API", counts.get("/auth/me") === before + 1);

  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await command("Page.navigate", { url: base + "/explore?preview=1" });
    await waitFor("document.querySelectorAll('.explore-destination-card').length > 0");
    check(`Điểm đến ${width}px giữ hai cột và không tràn ngang`, await evaluate("document.querySelector('.app-container').scrollWidth <= innerWidth && getComputedStyle(document.querySelector('.explore-destination-grid')).gridTemplateColumns.split(' ').length === 2"));
    await evaluate("document.querySelector('#explore-tab-destinations').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
    await waitFor("document.querySelector('.featured-guide')");
    check(`Cẩm nang ${width}px không tràn ngang và hỗ trợ phím chuyển tab`, await evaluate("document.querySelector('.app-container').scrollWidth <= innerWidth && document.activeElement.id === 'explore-tab-guides' && !document.querySelector('.explore-destination-grid')"));
    await command("Page.navigate", { url: base + "/?preview=1" });
    await waitFor("document.querySelector('.home-hero') && document.querySelector('.tour-card')");
    check(`Trang chủ ${width}px không tràn ngang`, await evaluate("document.querySelector('.app-container').scrollWidth <= innerWidth"));
    if (width === 390) await screenshot("scroll-home-390.png");
    const detail = await evaluate("document.querySelector('.tour-card').getAttribute('href')");
    await evaluate("document.querySelector('.tour-card').click()");
    await waitFor("document.querySelector('.tour-detail-page') || document.querySelector('.tour-detail') || document.querySelector('.tour-gallery')");
    check(`Chi tiết tour ${width}px không tràn ngang`, await evaluate("document.querySelector('.app-container').scrollWidth <= innerWidth"));
    if (width === 390) await screenshot("scroll-tour-detail-390.png");
    const tourId = new URL(detail, base).pathname.split("/").pop();
    await evaluate(`history.pushState({}, '', '/booking/${tourId}/select?preview=1'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await waitFor("document.querySelector('.action-bar button') && !document.querySelector('.action-bar button').disabled");
    await evaluate("document.querySelector('.action-bar button').click()");
    await waitFor("location.pathname.endsWith('/review') && document.querySelector('.booking-summary')");
    check(`Kiểm tra yêu cầu ${width}px hiển thị báo giá và không tràn ngang`, await evaluate("document.querySelector('.app-container').scrollWidth <= innerWidth && document.querySelector('.booking-summary').textContent.includes('Tạm tính:')"));
    const requests = [...counts.values()].reduce((sum, value) => sum + value, 0);
    await drag({ y: 85 }); await delay(200);
    check(`Màn booking ${width}px không tự gửi hoặc tải lại khi kéo`, requests === [...counts.values()].reduce((sum, value) => sum + value, 0));
    if (width === 390) await screenshot("scroll-booking-review-390.png");
  }
  check(`Không có lỗi JavaScript: ${errors.join('; ')}`, errors.length === 0);
  await writeFile(new URL("scroll-ui-results.json", output), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(`${checks.length} kiểm tra cuộn/cập nhật đã qua.`);
} catch (error) {
  if (command && socket?.readyState === WebSocket.OPEN) {
    const state = await command("Runtime.evaluate", { expression: "({ text: document.body.innerText.slice(0, 1800), url: location.href })", returnByValue: true });
    console.error(JSON.stringify({ state: state.result.value, counts: Object.fromEntries(counts), errors }));
    const shot = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(new URL("scroll-failure.png", output), Buffer.from(shot.data, "base64"));
  }
  throw error;
} finally {
  if (command && socket?.readyState === WebSocket.OPEN) await command("Browser.close").catch(() => {});
  socket?.close(); browser.kill();
}
