import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Chrome exercises the real UI. All API requests are intercepted before network access.
const productionSmoke = process.argv.includes("--production-smoke");
const base = process.env.UI_BASE_URL || (productionSmoke ? "http://localhost:4173" : "http://localhost:5173");
const output = new URL(productionSmoke ? "../test-results/admin/production/" : "../test-results/admin/", import.meta.url);
const profile = fileURLToPath(new URL(`../.browser-cache/admin-${Date.now()}/`, import.meta.url));
await mkdir(output, { recursive: true });
const browser = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--disable-extensions", "--disable-gpu", "about:blank"], { windowsHide: true, stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], exceptions = [], requests = [], writes = [], unexpected = [];
let socket, command, browserError;
browser.on("error", e => { browserError = e; });
const id = n => String(n).padStart(24, "0");
const now = Date.now();
const future = hours => new Date(now + hours * 3600000).toISOString();
const admin = { _id: id(1), name: "Nguyễn Minh Anh", email: "admin@example.test", role: "admin" };
const imagePath = productionSmoke ? `/assets/${(await readdir(new URL('../dist/assets/', import.meta.url))).find(file => /^forest-.*\.jpg$/.test(file))}` : "/src/assets/stitch/forest.jpg";
const image = { url: `${base}${imagePath}`, alt: "Rừng Đắk Song", credit: "Ảnh kiểm thử" };
const source = { title: "Nguồn kiểm thử", url: "https://example.test/dak-song", checkedAt: future(-24) };
let destinations = ["Rừng thông Đắk Song", "Thác Lưu Ly", "Không gian văn hóa địa phương"].map((name, i) => ({ _id: id(10 + i), name, slug: `diem-den-${i}`, summary: "Khám phá thiên nhiên và văn hóa Đắk Song.", description: "Thông tin chi tiết cần được kiểm tra trước khi xuất bản.", category: i === 2 ? "culture" : "nature", address: "Đắk Song, Đắk Nông", visitNotes: "Giữ gìn vệ sinh và tôn trọng cảnh quan.", status: i === 2 ? "draft" : "published", images: [image], sources: [source], createdAt: future(-48), updatedAt: future(-24) }));
let tours = ["Một ngày giữa rừng thông Đắk Song", "Khám phá thác Lưu Ly", "Hành trình văn hóa bản địa"].map((name, i) => ({ _id: id(20 + i), name, slug: `hanh-trinh-${i}`, summary: "Trải nghiệm thiên nhiên và văn hóa địa phương.", description: "Lịch trình đầy đủ được tải từ trang chi tiết.", durationHours: 8, themes: [i === 2 ? "culture" : "nature"], destinationIds: [destinations[i]._id], itinerary: [{ title: "Khám phá điểm đến", description: "Đi cùng hướng dẫn viên địa phương.", destinationId: destinations[i]._id }], meetingPoint: "Văn phòng VNA Đắk Song", includes: ["Hướng dẫn viên", "Bữa trưa"], excludes: ["Chi phí cá nhân"], childPolicy: "Trẻ em đi cùng người giám hộ.", cancellationPolicy: "Liên hệ VNA để trao đổi về yêu cầu hủy.", images: [image], status: i === 2 ? "draft" : "published", soldCount: [38, 24, 0][i], priceFrom: i === 2 ? null : 650000 + i * 100000, averageRating: i === 2 ? null : 4.5, reviewCount: i === 2 ? 0 : 2, createdAt: future(-72), updatedAt: future(-24) }));
let articles = ["Kinh nghiệm khám phá Đắk Song", "Hương vị cao nguyên"].map((title, i) => ({ _id: id(30 + i), title, slug: `cam-nang-${i}`, summary: "Gợi ý cho chuyến đi khám phá cao nguyên.", content: "Nội dung bài viết đầy đủ từ trang chi tiết.\nĐây là đoạn văn thứ hai.", category: i ? "food" : "travel_tips", destinationIds: [destinations[0]._id], images: [image], sources: [source], status: "published", publishedAt: future(-48), updatedAt: future(-24) }));
let departures = [0, 1, 2].map((i) => ({ _id: id(40 + i), tourId: tours[i]._id, departureAt: future(i === 2 ? -24 : 168 + i * 24), bookingDeadline: future(i === 2 ? -48 : 144 + i * 24), adultPrice: 650000 + i * 100000, childPrice: i === 1 ? null : 350000, maxGuestsPerBooking: 20, status: i === 1 ? "closed" : "open" }));
let bookings = ["pending_confirmation", "confirmed", "cancelled", "completed"].map((status, i) => ({ _id: id(50 + i), code: `VNA-TEST00${i + 1}`, userId: id(2), tourId: tours[i % 2]._id, departureId: departures[i % 2]._id, adults: 2, children: 1, contact: { name: ["Trần Hoài An", "Nguyễn Thanh Hà", "Lê Minh Khôi", "Phạm Thảo Vy"][i], phone: "0900000000" }, note: "Khách cần hỗ trợ điểm đón.", snapshot: { tourName: tours[i % 2].name, departureAt: i === 3 ? future(-48) : departures[i % 2].departureAt, durationHours: 8, meetingPoint: "Văn phòng VNA Đắk Song", adultPrice: 650000, childPrice: 350000, subTotal: 1650000, discountAmount: 50000, appliedCoupon: "DAKSONG", total: 1600000, childPolicy: "Trẻ em đi cùng người giám hộ.", cancellationPolicy: "Liên hệ VNA trước khi hủy." }, status, paymentStatus: i === 2 ? "refund_pending" : i === 3 ? "paid" : "unpaid", paymentMethod: i === 2 ? "zalopay" : "cash_on_arrival", history: [{ status: "pending_confirmation", actorId: id(2), at: future(-24), reason: "" }, ...(i ? [{ status, actorId: admin._id, at: future(-12), reason: i === 2 ? "Khách thay đổi kế hoạch." : "" }] : [])], createdAt: future(-24) }));
let coupons = [0, 1, 2].map(i => ({ _id: id(60 + i), code: ["DAKSONG", "HIGHLAND", "VNA2026"][i], description: "Ưu đãi cho hành trình khám phá Đắk Song", discountType: i === 1 ? "fixed" : "percentage", discountValue: i === 1 ? 100000 : 10, maxDiscount: i === 1 ? null : 150000, minOrderValue: 500000, validFrom: future(-48), validUntil: future(i === 2 ? -12 : 720), usageLimit: i === 1 ? null : 100, usedCount: i * 15, isActive: i !== 1 }));
let reviews = [{ _id: id(70), rating: 5, comment: "Hành trình được chuẩn bị chu đáo.", author: { name: "Trần Hoài An", avatar: "" }, createdAt: future(-24) }];
let payment = { _id: id(80), appTransId: "261009_VNATEST", amount: 1600000, status: "refund_pending", refundState: "none", createdAt: future(-24), paidAt: future(-23) };
let failList = false, expire = false, denyRole = false;
let customerFlow = false, offerMode = "normal";
let refundQueryMode = "success";
const customerOffers = [
  { code: "VNA-AUTO123456", description: "Ưu đãi chuyến đi", discountType: "percentage", discountValue: 10, maxDiscount: 150000, minOrderValue: 500000, validUntil: future(720) },
  { code: "VNA-MINIMUM", description: "Ưu đãi cho nhóm", discountType: "fixed", discountValue: 100000, maxDiscount: null, minOrderValue: 1000000, validUntil: future(720) },
];
function list(rows, url) {
  let result = [...rows]; const p = url.searchParams;
  for (const key of ["status", "tourId", "departureId", "category", "code"]) if (p.get(key)) result = result.filter(r => r[key] === p.get(key));
  if (p.get("destinationId")) result = result.filter(r => r.destinationIds?.includes(p.get("destinationId")));
  if (p.get("theme")) result = result.filter(r => r.themes?.includes(p.get("theme")));
  if (p.has("isActive")) result = result.filter(r => r.isActive === (p.get("isActive") === "true"));
  if (p.get("q")) result = result.filter(r => `${r.name || r.title} ${r.summary}`.toLowerCase().includes(p.get("q").toLowerCase()));
  if (p.get("sort") === "most_bought") result.sort((a, b) => b.soldCount - a.soldCount);
  const page = Number(p.get("page")) || 1, limit = Number(p.get("limit")) || 10;
  return { data: result.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: result.length, pages: Math.ceil(result.length / limit) } };
}
function respond(request) {
  const url = new URL(request.url), path = url.pathname.replace(/^\/api/, ""), method = request.method;
  requests.push({ method, path, search: url.search });
  const body = request.postData ? JSON.parse(request.postData) : {};
  if (!["GET", "OPTIONS"].includes(method)) writes.push({ method, path, body });
  if (method === "OPTIONS") return [204, {}];
  if (customerFlow) {
    if (path === "/notifications") return [200, { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, unreadCount: 0 }];
    if (path === "/coupons/available") return offerMode === "error" ? [503, { message: "Chưa tải được ưu đãi." }] : [200, list(offerMode === "empty" ? [] : customerOffers, url)];
    if (path === `/tours/${tours[0]._id}/departures`) return [200, list([departures[0]], url)];
    if (path === `/tours/${tours[0]._id}`) return [200, tours[0]];
    if (path === "/bookings/quote") {
      const subTotal = body.adults * departures[0].adultPrice + body.children * departures[0].childPrice;
      return [200, { ...bookings[0].snapshot, departureId: departures[0]._id, adults: body.adults, children: body.children, subTotal, discountAmount: body.couponCode ? 65000 : 0, appliedCoupon: body.couponCode || null, total: subTotal - (body.couponCode ? 65000 : 0), quoteToken: "fixture-quote", expiresAt: future(1) }];
    }
    unexpected.push(`${method} ${path}`); return [404, {}];
  }
  if (path === "/auth/admin/login") return body.password === "test-password" ? [200, { user: admin, token: "fixture-admin-token" }] : [401, { message: "Thông tin đăng nhập không đúng." }];
  if (expire) return [401, { message: "Phiên đã hết hạn." }];
  if (path === "/auth/me") return [200, { user: denyRole ? { ...admin, role: "user" } : admin }];
  assert.ok(request.headers.Authorization === "Bearer fixture-admin-token", `Missing admin authentication on ${path}`);
  if (path === "/bookings/dashboard-data") return [200, { bookings: Object.fromEntries(["pending_confirmation", "confirmed", "completed", "cancelled", "rejected"].map(s => [s, bookings.filter(b => b.status === s).length])), tours: tours.filter(t => t.status === "published").length, destinations: destinations.filter(d => d.status === "published").length, openDepartures: 1, totalRevenue: bookings.filter(b => ["confirmed", "completed"].includes(b.status)).reduce((n, b) => n + b.snapshot.total, 0) }];
  const resources = { tours, destinations, articles, departures, bookings, coupons };
  if (/^\/tours\/[^/]+\/reviews$/.test(path)) return [200, { ...list(reviews, url), summary: { averageRating: reviews.length ? 5 : null, reviewCount: reviews.length, distribution: { 5: reviews.length } } }];
  if (path.startsWith("/reviews/") && method === "DELETE") { reviews = reviews.filter(r => r._id !== path.split("/")[2]); return [200, { message: "Đã xóa." }]; }
  if (/^\/payments\/zalopay\/.+/.test(path)) {
    if (path.endsWith("/refund")) { payment = { ...payment, refundState: "pending", refundRequestId: "fixture-refund" }; return [202, { status: "refund_pending" }]; }
    if (path.endsWith("/refund/query")) {
      if (refundQueryMode === "unavailable") return [502, { code: "REFUND_QUERY_UNVERIFIED", message: "Dịch vụ kiểm tra hoàn tiền ZaloPay đang lỗi (HTTP 503). Chưa xác minh được kết quả; hãy kiểm tra lại sau." }];
      if (refundQueryMode === "failed") {
        payment = { ...payment, refundState: "failed" };
        return [200, { status: "refund_pending", refundState: "failed", message: "ZaloPay xác nhận hoàn tiền không thành công." }];
      }
      payment = { ...payment, status: "refunded", refundState: "success", refundedAt: new Date().toISOString() }; bookings[2].paymentStatus = "refunded";
    }
    return [200, { appTransId: payment.appTransId, status: payment.status }];
  }
  const [, resource, itemId, action] = path.split("/"); const rows = resources[resource];
  if (rows) {
    if (!itemId && method === "GET") {
      if (failList && resource === "tours") return [503, { message: "Tạm thời không khả dụng." }];
      const result = list(rows, url);
      if (["tours", "destinations"].includes(resource)) result.data = result.data.map(({ description, ...rest }) => rest);
      if (resource === "articles") result.data = result.data.map(({ content, ...rest }) => rest);
      return [200, result];
    }
    const index = rows.findIndex(r => r._id === itemId), item = rows[index];
    if (!itemId && method === "POST") { const created = { ...body, ...(resource === "coupons" ? { code: body.code || "VNA-GENERATED1" } : {}), _id: id(100 + writes.length), soldCount: 0, usedCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; rows.push(created); return [201, resource === "coupons" ? { data: created } : created]; }
    if (!item) return [404, { message: "Không tìm thấy." }];
    if (method === "GET") { if (resource === "coupons") { unexpected.push(`${method} ${path}`); return [404, {}]; } return [200, resource === "bookings" ? { data: item, payments: itemId === bookings[2]._id ? [payment] : [] } : item]; }
    if (method === "PATCH" || method === "PUT") {
      if (resource === "bookings" && action === "status") { item.history.push({ status: body.status, actorId: admin._id, at: new Date().toISOString(), reason: body.reason || "" }); }
      Object.assign(item, body); return [200, resource === "coupons" ? { data: item } : item];
    }
    if (method === "DELETE") { if (["tours", "destinations", "articles"].includes(resource)) item.status = "archived"; else rows.splice(index, 1); return [200, { message: "Đã cập nhật." }]; }
  }
  unexpected.push(`${method} ${path}`); return [404, {}];
}
function check(name, condition) { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); }
try {
  let port;
  for (let retry = 0; retry < 80; retry++) { if (browserError) throw browserError; try { port = Number((await readFile(`${profile}/DevToolsActivePort`, "utf8")).split("\n")[0]); } catch {} if (port) break; await delay(150); }
  assert.ok(port, "Chrome did not expose its debugging port.");
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0; const pending = new Map();
  command = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++sequence; const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 15000); pending.set(requestId, { resolve, reject, timer }); socket.send(JSON.stringify({ id: requestId, method, params })); });
  socket.onmessage = message => {
    const event = JSON.parse(message.data);
    if (event.id) { const task = pending.get(event.id); if (!task) return; clearTimeout(task.timer); pending.delete(event.id); event.error ? task.reject(new Error(JSON.stringify(event.error))) : task.resolve(event.result); }
    if (event.method === "Runtime.exceptionThrown") exceptions.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
    if (event.method === "Fetch.requestPaused") {
      const { requestId, request } = event.params;
      Promise.resolve().then(() => respond(request)).then(([status, body]) => command("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: "*" }, { name: "Access-Control-Allow-Headers", value: "*" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,PUT,DELETE,OPTIONS" }], body: Buffer.from(JSON.stringify(body)).toString("base64") })).catch(error => { if (error.message.includes("Invalid InterceptionId")) return; exceptions.push(error.message); command("Fetch.failRequest", { requestId, errorReason: "Failed" }).catch(() => {}); });
    }
  };
  const evaluate = async expression => { const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const waitFor = async expression => { for (let retry = 0; retry < 100; retry++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error(`UI timeout: ${expression}`); };
  const text = () => evaluate("document.body.innerText");
  const visit = async (path, ready) => { await command("Page.navigate", { url: base + path }); await waitFor(ready); await delay(150); };
  const fill = async (name, value) => evaluate(`(() => { const el = document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(name))} + ']'); if (!el) throw Error('Missing field: ' + ${JSON.stringify(name)}); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
  const click = async (name, scope = "document") => evaluate(`(() => { const el = [...${scope}.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === ${JSON.stringify(name)} || b.innerText.trim() === ${JSON.stringify(name)}); if (!el) throw Error('Missing button: ' + ${JSON.stringify(name)}); el.click(); })()`);
  const ready = heading => `document.querySelector('h1')?.innerText === ${JSON.stringify(heading)} && !document.querySelector('.main-content .loading')`;
  const screenshot = async name => { await evaluate("document.fonts.ready"); const result = await command("Page.captureScreenshot", { format: "png" }); await writeFile(new URL(`${name}.png`, output), Buffer.from(result.data, "base64")); };
  const noOverflow = async () => evaluate("document.documentElement.scrollWidth <= innerWidth + 1");
  const noRawStatus = async () => !/pending_confirmation|refund_pending|cash_on_arrival|travel_tips|\bpublished\b|\barchived\b|\/api\/|payload|usedCount|maxGuestsPerBooking/.test(await text());
  await command("Page.enable"); await command("Runtime.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*://*/api/*", requestStage: "Request" }] });
  await command("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false });
  await visit("/admin/bookings?status=confirmed", "document.querySelector('h2')?.innerText === 'Đăng nhập quản trị'");
  check("Protected admin routes require login", (await evaluate("location.pathname")) === "/admin/login");
  await screenshot("login-desktop"); await fill("Email", "admin@example.test"); await fill("Mật khẩu", "wrong-password"); await click("Đăng nhập");
  await waitFor("document.querySelector('[role=alert]')"); check("Invalid login stays on login page with a friendly error", (await text()).includes("Thông tin đăng nhập không đúng"));
  await fill("Mật khẩu", "test-password"); await click("Đăng nhập"); await waitFor(ready("Quản lý đơn đặt tour"));
  check("Login restores the requested filter and stores a separate admin session", (await evaluate("location.search")) === "?status=confirmed" && (await evaluate("sessionStorage.getItem('vna-admin-session')")) === "fixture-admin-token" && !(await evaluate("sessionStorage.getItem('vna-customer-session')")));
  check("Booking filters are sent to the server", requests.some(r => r.path === "/bookings" && r.search.includes("status=confirmed")));
  await visit("/admin", ready("Tổng quan quản trị")); await screenshot("dashboard-desktop");
  check("Dashboard uses actual fixture order totals with accurate wording", (await text()).includes("3.200.000") && (await text()).toLocaleLowerCase("vi").includes("giá trị đơn xác nhận / hoàn thành"));
  check("Dashboard does not expose backend enums", await noRawStatus()); check("Desktop dashboard fits viewport", await noOverflow());
  if (productionSmoke) {
    check("Built deep links load the shared root assets", await evaluate("document.querySelector('base')?.getAttribute('href') === '/' && [...document.scripts].some(script => script.src.includes('/assets/'))"));
  } else {
  await visit("/admin/bookings", ready("Quản lý đơn đặt tour")); await screenshot("bookings-desktop");
  await fill("Mã đơn chính xác", bookings[0].code.toLowerCase()); await click("Tra cứu"); await waitFor("document.querySelectorAll('tbody tr').length === 1");
  check("Exact booking code search normalizes to uppercase", requests.some(r => r.path === "/bookings" && r.search.includes("code=VNA-TEST001")));
  await visit(`/admin/bookings/${bookings[0]._id}`, "document.querySelector('.detail-title h2')?.innerText === 'VNA-TEST001'"); await screenshot("booking-detail-desktop");
  await click("Xác nhận đơn"); await waitFor("document.querySelector('dialog[open]')"); await click("Xác nhận đơn", "document.querySelector('dialog[open]')");
  await waitFor("document.querySelector('.detail-title')?.innerText.includes('Đã xác nhận')");
  check("Confirm booking sends PATCH status to the existing endpoint", writes.some(w => w.path === `/bookings/${bookings[0]._id}/status` && w.method === "PATCH" && w.body.status === "confirmed"));
  check("Future trips cannot be marked completed", await evaluate("[...document.querySelectorAll('button')].find(b => b.innerText === 'Hoàn thành chuyến')?.disabled"));
  await click("Hủy đơn"); await fill("Lý do xử lý", "Khách muốn dời lịch trình."); await click("Hủy đơn", "document.querySelector('dialog[open]')"); await waitFor("document.querySelector('.detail-title')?.innerText.includes('Đã hủy')");
  check("Cancellation sends the entered reason", writes.some(w => w.body.status === "cancelled" && w.body.reason === "Khách muốn dời lịch trình."));
  await visit(`/admin/bookings/${bookings[2]._id}`, "document.querySelector('.payment-card')"); await click("Yêu cầu hoàn tiền"); await click("Gửi yêu cầu hoàn tiền", "document.querySelector('dialog[open]')"); await waitFor("document.querySelector('.payment-card')?.innerText.includes('chờ xác minh kết quả')");
  check("Accepted refund remains pending until queried", payment.status === "refund_pending" && !(await evaluate("document.querySelector('.payment-card').innerText")).includes("Hoàn tiền thành công"));
  refundQueryMode = "unavailable"; await click("Kiểm tra hoàn tiền"); await waitFor("document.querySelector('.payment-card')?.innerText.includes('HTTP 503')");
  check("Refund provider outage is visible and does not offer a duplicate refund", await evaluate("document.querySelector('.payment-card').innerText.includes('Chưa xác minh được kết quả') && ![...document.querySelectorAll('.payment-card button')].some(b => b.innerText === 'Yêu cầu hoàn tiền')"));
  await screenshot("refund-provider-unavailable");
  refundQueryMode = "failed"; await click("Kiểm tra hoàn tiền"); await waitFor("[...document.querySelectorAll('.payment-card button')].some(b => b.innerText === 'Yêu cầu hoàn tiền')");
  check("Confirmed refund failure refreshes the card and allows an explicit retry", payment.refundState === "failed" && (await text()).includes("Yêu cầu hoàn tiền không thành công"));
  await click("Yêu cầu hoàn tiền"); await click("Gửi yêu cầu hoàn tiền", "document.querySelector('dialog[open]')"); await waitFor("document.querySelector('.payment-card')?.innerText.includes('chờ xác minh kết quả')");
  refundQueryMode = "success";
  await click("Kiểm tra hoàn tiền"); await waitFor("document.querySelector('.payment-card')?.innerText.includes('Hoàn tiền thành công')"); check("Refund query confirms the result", writes.some(w => w.path.endsWith("/refund/query")));
  for (const [path, heading] of [["tours", "Quản lý tour"], ["departures", "Chuyến khởi hành"], ["destinations", "Điểm đến"], ["articles", "Cẩm nang & bài viết"], ["coupons", "Mã giảm giá"]]) {
    await visit(`/admin/${path}`, ready(heading)); await screenshot(`${path}-desktop`); check(`${path} renders translated labels without overflow`, await noRawStatus() && await noOverflow());
  }
  await visit(`/admin/tours/${tours[0]._id}/edit`, "document.querySelector('dialog textarea[aria-label=\"Mô tả chi tiết\"]')");
  check("Editing a tour fetches full detail instead of the list projection", (await evaluate("document.querySelector('[aria-label=\"Mô tả chi tiết\"]').value")).includes("đầy đủ"));
  await fill("Tên nội dung", "Tour rừng thông đã chỉnh sửa"); await screenshot("tour-form-desktop"); await click("Lưu tour"); await waitFor("!document.querySelector('dialog[open]')");
  check("Tour update preserves itinerary and posts only editable fields", writes.some(w => w.path === `/tours/${tours[0]._id}` && w.method === "PATCH" && w.body.name === "Tour rừng thông đã chỉnh sửa" && w.body.itinerary.length === 1 && !Object.hasOwn(w.body, "soldCount")));
  await click("★4.5 · 2 đánh giá").catch(async () => { await evaluate("document.querySelector('.rating-link').click()"); }); await waitFor("document.querySelector('.review-card')"); await click("Xóa đánh giá"); await click("Xóa đánh giá", "[...document.querySelectorAll('dialog[open]')].at(-1)"); await waitFor("document.querySelector('.empty h3')?.innerText === 'Chưa có đánh giá'");
  check("Admin can remove a review without editing customer text", writes.some(w => w.method === "DELETE" && w.path === `/reviews/${id(70)}`));
  await visit("/admin/destinations/new", "document.querySelector('dialog[open]')");
  await fill("Tên nội dung", "Điểm đến kiểm thử"); await fill("Tóm tắt", "Tóm tắt điểm đến."); await fill("Mô tả chi tiết", "Nội dung điểm đến."); await fill("Trạng thái xuất bản", "published"); await click("Lưu điểm đến"); await waitFor("document.querySelector('dialog [role=alert]')");
  check("Publishing CMS content requires a checked source", (await text()).includes("ít nhất một nguồn tham khảo"));
  await fill("Trạng thái xuất bản", "draft"); await click("Lưu điểm đến"); await waitFor("!document.querySelector('dialog[open]')");
  check("Destination create maps the Vietnamese form to the API schema", writes.some(w => w.method === "POST" && w.path === "/destinations" && w.body.name === "Điểm đến kiểm thử" && w.body.status === "draft"));
  await visit(`/admin/articles/${articles[0]._id}/edit`, "document.querySelector('[aria-label=\"Nội dung bài viết\"]')");
  check("Article editing loads full plain text content", (await evaluate("document.querySelector('[aria-label=\"Nội dung bài viết\"]').value")).includes("đoạn văn thứ hai"));
  await fill("Nội dung bài viết", "Bài viết đã cập nhật.\nNguồn thông tin được kiểm tra."); await click("Lưu bài viết"); await waitFor("!document.querySelector('dialog[open]')");
  check("Article update converts the source date and preserves destinations", writes.some(w => w.path === `/articles/${articles[0]._id}` && w.body.sources?.[0]?.checkedAt.endsWith("Z") && w.body.destinationIds?.length === 1));
  await visit("/admin/departures", ready("Chuyến khởi hành"));
  check("Departure guest limit is presented per booking, without fictitious capacity", (await text()).includes("20 khách / đơn") && !(await text()).includes("chỗ còn"));
  await click("Tạo chuyến khởi hành"); await fill("Tour của chuyến", tours[0]._id); await fill("Khởi hành", "2027-04-10T08:00"); await fill("Hạn nhận đặt", "2027-04-11T08:00"); await fill("Giá người lớn (đồng)", "700000"); await click("Lưu chuyến khởi hành"); await waitFor("document.querySelector('dialog [role=alert]')");
  check("Departure deadline must precede departure", (await text()).includes("Hạn nhận đặt phải trước"));
  await fill("Hạn nhận đặt", "2027-04-09T18:00"); await click("Lưu chuyến khởi hành"); await waitFor("!document.querySelector('dialog[open]')");
  check("Departure input uses Vietnam time and null for unavailable child pricing", writes.some(w => w.path === "/departures" && w.method === "POST" && w.body.departureAt === "2027-04-10T01:00:00.000Z" && w.body.childPrice === null && w.body.maxGuestsPerBooking === 20));
  await visit("/admin/coupons", ready("Mã giảm giá")); await click("Sửa mã DAKSONG"); await waitFor("document.querySelector('dialog[open]')");
  check("Existing coupon codes are immutable", await evaluate("document.querySelector('[aria-label=\"Mã giảm giá\"]').readOnly"));
  await fill("Mức giảm (%)", "15"); await click("Lưu mã giảm giá"); await waitFor("!document.querySelector('dialog[open]')");
  check("Coupon updates use PUT and omit immutable code", writes.some(w => w.path === `/coupons/${coupons[0]._id}` && w.method === "PUT" && w.body.discountValue === 15 && !Object.hasOwn(w.body, "code")));
  await click("Tạo mã giảm giá");
  check("New coupon form explains automatic code generation without a manual code field", await evaluate("!document.querySelector('dialog [aria-label=\"Mã giảm giá\"]')") && (await text()).includes("Mã ưu đãi được tạo tự động"));
  await screenshot("coupon-create-automatic");
  await fill("Mức giảm (%)", "12"); await fill("Hết hạn", "2027-04-10T23:59"); await fill("Giới hạn lượt sử dụng", "0"); await click("Lưu mã giảm giá"); await waitFor("!document.querySelector('dialog[open]')");
  check("Admin creates a coupon without sending code and displays the returned code", writes.some(w => w.path === "/coupons" && w.method === "POST" && !Object.hasOwn(w.body, "code")) && (await text()).includes("VNA-GENERATED1"));
  check("Zero coupon usage limit is retained instead of unlimited", writes.some(w => w.path === "/coupons" && w.method === "POST" && w.body.usageLimit === 0));
  await click("Tắt mã DAKSONG"); await click("Tắt mã", "document.querySelector('dialog[open]')"); await waitFor("!document.querySelector('dialog[open]')"); check("Coupon activation uses the existing update endpoint", writes.some(w => w.method === "PUT" && w.path === `/coupons/${coupons[0]._id}` && w.body.isActive === false));
  failList = true; await visit("/admin/tours", "document.querySelector('.query-error')"); check("API failure has a retry state and no fabricated fallback data", (await text()).includes("Thử lại") && !(await text()).includes(tours[0].name));
  failList = false; await click("Thử lại"); await waitFor("document.querySelector('tbody tr')"); check("Retry recovers the content list", (await text()).includes(tours[0].name));
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  for (const [path, heading] of [["", "Tổng quan quản trị"], ["bookings", "Quản lý đơn đặt tour"], ["tours", "Quản lý tour"], ["departures", "Chuyến khởi hành"], ["destinations", "Điểm đến"], ["articles", "Cẩm nang & bài viết"], ["coupons", "Mã giảm giá"]]) { await visit(`/admin/${path}`, ready(heading)); check(`${path || "dashboard"} mobile keeps scrolling inside tables`, await noOverflow()); await screenshot(`${path || "dashboard"}-mobile`); }
  await click("Mở menu"); check("Mobile sidebar opens on demand", await evaluate("document.querySelector('.sidebar').classList.contains('is-open')")); await click("Đóng menu");
  await visit(`/admin/bookings/${bookings[1]._id}`, "document.querySelector('.detail-title h2')?.innerText === 'VNA-TEST002'"); await screenshot("booking-detail-mobile"); check("Selected booking detail fits mobile width", await noOverflow());
  expire = true; await evaluate("window.dispatchEvent(new Event('admin-data-changed'))"); await waitFor("location.pathname === '/admin/login'"); check("Expired session returns to login and clears only admin credentials", !(await evaluate("sessionStorage.getItem('vna-admin-session')")));
  expire = false; denyRole = true; await evaluate("sessionStorage.setItem('vna-admin-session', 'fixture-admin-token')"); await visit("/admin", "location.pathname === '/admin/login'"); check("Restored non-admin roles cannot access the portal", !(await evaluate("sessionStorage.getItem('vna-admin-session')")));
  // Exercise the customer entry with the actual preview route and prove styles stay isolated.
  await visit("/?preview=1", "document.querySelector('.app-container.preview-mode')"); await screenshot("customer-regression-mobile");
  check("Customer Mini App still uses its existing layout and navigation", await evaluate("Boolean(document.querySelector('.bottom-nav')) && !document.querySelector('.vna-admin') && !document.documentElement.dataset.vnaAdmin"));
  const customerStyles = await evaluate("JSON.stringify([getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).fontSize, getComputedStyle(document.querySelector('.app-container')).width, getComputedStyle(document.querySelector('.bottom-nav')).backgroundColor])");
  await evaluate("import('/src/styles/admin.css')");
  check("Admin CSS remains isolated when loaded alongside Mini App CSS", customerStyles === await evaluate("JSON.stringify([getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).fontSize, getComputedStyle(document.querySelector('.app-container')).width, getComputedStyle(document.querySelector('.bottom-nav')).backgroundColor])"));
  customerFlow = true;
  await evaluate("sessionStorage.removeItem('vna-customer-session')");
  const bookingPath = `/booking/${tours[0]._id}/select`;
  const couponReady = "document.querySelectorAll('[name=booking-coupon]').length === 2";
  await visit(bookingPath, couponReady);
  check("Customer chooses available offers without typing a code", await evaluate("!document.querySelector('#coupon') && !document.querySelector('[name=booking-coupon]').disabled && document.querySelector('[value=\"VNA-MINIMUM\"]').disabled"));
  await evaluate("document.querySelector('[value=\"VNA-AUTO123456\"]').click()"); await waitFor("document.querySelector('.coupon-picker-selection')");
  await evaluate("document.querySelector('.coupon-picker').scrollIntoView({ block: 'center' })");
  await screenshot("customer-coupon-picker-mobile");
  check("Coupon picker fits the customer mobile viewport", await noOverflow());
  await click("Bỏ chọn"); await waitFor("!document.querySelector('.coupon-picker-selection')");
  check("Customer can remove a selected offer", await evaluate("![...document.querySelectorAll('[name=booking-coupon]')].some(input => input.checked)"));
  await click("Tăng người lớn"); await waitFor("!document.querySelector('[value=\"VNA-MINIMUM\"]').disabled");
  await evaluate("document.querySelector('[value=\"VNA-MINIMUM\"]').click()");
  await click("Giảm người lớn"); await waitFor("!document.querySelector('.coupon-picker-selection')");
  check("Reducing party size clears an offer below its minimum spend", (await text()).includes("Đã bỏ ưu đãi"));
  await evaluate("document.querySelector('[value=\"VNA-AUTO123456\"]').click()"); await click("Kiểm tra yêu cầu"); await waitFor("location.pathname.endsWith('/review')");
  await evaluate("document.querySelector('details').open = true");
  check("Selected offer is sent to the backend quote API and its discount appears in review", writes.some(w => w.path === "/bookings/quote" && w.body.couponCode === "VNA-AUTO123456") && (await text()).includes("VNA-AUTO123456") && (await text()).includes("65.000"));
  offerMode = "error"; await visit(bookingPath, "document.querySelector('.coupon-picker [role=alert]')");
  check("Offer loading failure leaves booking available with a retry", await evaluate("!document.querySelector('.action-bar button').disabled"));
  offerMode = "normal"; await click("Tải lại ưu đãi"); await waitFor(couponReady);
  offerMode = "empty"; await visit(bookingPath, "document.querySelector('.coupon-picker')?.innerText.includes('Hiện chưa có ưu đãi')");
  check("No available offers leaves booking available", await evaluate("!document.querySelector('.action-bar button').disabled && !document.querySelector('[name=booking-coupon]')"));
  }
  check("No unexpected API routes were called", unexpected.length === 0); check("No uncaught browser exceptions", exceptions.length === 0);
  await writeFile(new URL("results.json", output), JSON.stringify({ passed: checks.length, checks, exceptions, requests, writes }, null, 2));
  console.log(`${checks.length} admin UI checks passed. Screenshots: frontend/test-results/admin/`);
} catch (error) {
  if (command) { const capture = await command("Page.captureScreenshot", { format: "png" }).catch(() => null); if (capture) await writeFile(new URL("failure.png", output), Buffer.from(capture.data, "base64")); }
  await writeFile(new URL("results.json", output), JSON.stringify({ passed: checks.length, checks, error: error.message, exceptions, requests, writes }, null, 2));
  console.error(error); process.exitCode = 1;
} finally { if (command) await command("Browser.close").catch(() => {}); socket?.close(); browser.kill(); }
