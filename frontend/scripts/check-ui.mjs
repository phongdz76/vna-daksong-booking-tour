import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Real Chrome. Every API write is intercepted; no application database writes.
const base = process.env.UI_BASE_URL || "http://localhost:5173";
const chromePath =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
assert.ok(
  existsSync(chromePath),
  "Set CHROME_PATH to a locally installed Chrome browser.",
);
const profile = fileURLToPath(
  new URL(`../.browser-cache/check-${Date.now()}/`, import.meta.url),
);
const output = new URL("../test-results/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = spawn(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-gpu",
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let browserError;
browser.on("error", (error) => {
  browserError = error;
});
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const checks = [];
const exceptions = [];
const writes = [];
let mockMode = false;
let socket;
let command;
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
}
try {
  let port;
  for (let retry = 0; retry < 80; retry++) {
    if (browserError) throw browserError;
    try {
      port = Number(
        (await readFile(`${profile}/DevToolsActivePort`, "utf8")).split(
          "\n",
        )[0],
      );
    } catch {}
    if (port) break;
    await delay(150);
  }
  assert.ok(port, "Chrome did not expose its local debugging port.");
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
    })
  ).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 12000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  socket.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.id) {
      const request = pending.get(event.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(event.id);
      if (event.error) request.reject(new Error(JSON.stringify(event.error)));
      else request.resolve(event.result);
    }
    if (event.method === "Runtime.exceptionThrown")
      exceptions.push(
        event.params.exceptionDetails.text +
          " " +
          (event.params.exceptionDetails.exception?.description || ""),
      );
    if (event.method === "Network.requestWillBeSent") {
      const request = event.params.request;
      if (
        request.url.includes("/api/") &&
        !["GET", "OPTIONS"].includes(request.method)
      )
        writes.push({
          method: request.method,
          url: request.url,
          intercepted: mockMode,
        });
    }
  };
  const evaluate = async (expression) => {
    const value = await command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (value.exceptionDetails)
      throw new Error(
        value.exceptionDetails.exception?.description ||
          value.exceptionDetails.text,
      );
    return value.result.value;
  };
  async function waitFor(expression) {
    for (let retry = 0; retry < 80; retry++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(150);
    }
    throw new Error(`UI timeout: ${expression}`);
  }
  async function visit(path, ready) {
    await command("Page.navigate", { url: base + path });
    await waitFor(ready);
    await delay(100);
  }
  async function screenshot(name) {
    await evaluate("document.querySelector('.page-content').scrollTop = 0");
    await evaluate("document.fonts.ready");
    const result = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(new URL(name, output), Buffer.from(result.data, "base64"));
  }
  async function fullScreenshot(name) {
    const height = await evaluate(
      "Math.ceil(document.querySelector('.page').scrollHeight + (document.querySelector('.preview-banner')?.offsetHeight || 0) + (document.querySelector('.bottom-nav')?.offsetHeight || 0))",
    );
    await command("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await screenshot(name);
    await command("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
  }
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await visit(
      "/?preview=1",
      "document.querySelectorAll('.tour-card').length === 4",
    );
    check(
      `Home ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    await waitFor(
      "[...document.querySelectorAll('img')].every(img => img.complete)",
    );
    check(
      `Home ${width}px: images loaded`,
      await evaluate(
        "[...document.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0)",
      ),
    );
    if (width === 390) {
      await screenshot("home-390.png");
      await fullScreenshot("home-full-390.png");
    }
    await visit(
      "/tours/preview-trekking?preview=1",
      "document.querySelector('.itinerary li') && document.querySelector('.detail-action a')",
    );
    check(
      `Detail ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    check(
      `Detail ${width}px: tabs hidden`,
      await evaluate("!document.querySelector('.bottom-nav')"),
    );
    if (width === 390) {
      await screenshot("tour-detail-390.png");
      await fullScreenshot("tour-detail-full-390.png");
    }
    await evaluate("document.querySelector('.detail-action a').click()");
    await waitFor(
      "document.querySelectorAll('.departure-option').length === 3",
    );
    await evaluate(
      "document.querySelector('[aria-label=\"Tăng người lớn\"]').click(); document.querySelector('[aria-label=\"Tăng trẻ em\"]').click()",
    );
    await evaluate("document.querySelector('.action-bar button').click()");
    await waitFor("document.querySelector('.contact-fields input[name=name]')");
    check(
      `Review ${width}px: server-style quote for 2 adults + 1 child`,
      await evaluate(
        "document.querySelector('.price-total dd').textContent.replace(/\\D/g, '') === '3240000'",
      ),
    );
    check(
      `Review ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    check(
      `Review ${width}px: consent required`,
      await evaluate("document.querySelector('.action-bar button').disabled"),
    );
    check(
      `Review ${width}px: no premature paid/confirmed promise`,
      await evaluate(
        "document.querySelector('.payment-info').textContent.includes('Bản xem mẫu')",
      ),
    );
    if (width === 390) {
      await screenshot("booking-review-390.png");
      await fullScreenshot("booking-review-full-390.png");
    }
    await evaluate(`(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      for (const [name, value] of [['name', 'Khách xem giao diện'], ['phone', '0900000000']]) {
        const input = document.querySelector('input[name=' + name + ']');
        setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await evaluate("document.querySelector('.agreement input').click()");
    await evaluate(
      "document.querySelector('.action-bar button').click(); document.querySelector('.action-bar button')?.click()",
    );
    await waitFor("document.querySelector('.success-card')");
    check(
      `Preview booking ${width}px: pending + unpaid`,
      await evaluate(
        "document.querySelector('.success-card').textContent.includes('Chờ VNA xác nhận') && document.querySelector('.success-card').textContent.includes('Chưa thanh toán')",
      ),
    );
    await evaluate("document.querySelector('.success-body a').click()");
    await waitFor("document.querySelector('.booking-detail-status')");
    await evaluate("document.querySelector('.booking-cancel-button').click()");
    await evaluate(
      `(() => { const input = document.querySelector('.cancel-form textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Thử giao diện hủy'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
    );
    await evaluate(
      "document.querySelector('.cancel-form .button-danger').click()",
    );
    await waitFor(
      "document.querySelector('.booking-detail-status .cancelled')",
    );
    check(`Preview cancellation ${width}px: state updates`, true);
    await visit(
      "/my-bookings/preview-order?preview=1",
      "document.querySelector('.booking-ticket')",
    );
    check(
      `Booking detail ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    check(
      `Booking detail ${width}px: trip and payment states are separate`,
      await evaluate(
        "document.querySelector('.booking-status-main h1').textContent === 'Chờ xác nhận chuyến' && document.querySelector('.booking-payment-state strong').textContent === 'Chưa thanh toán'",
      ),
    );
    check(
      `Booking detail ${width}px: progress, ticket and cost breakdown`,
      await evaluate(
        "document.querySelectorAll('.booking-progress li').length === 4 && document.querySelector('.booking-code-square svg[aria-label]').getAttribute('aria-label').includes('minh họa') && document.querySelector('.booking-cost-total > strong').textContent.replace(/\\D/g,'') === '3750000' && !document.querySelector('.bottom-nav')",
      ),
    );
    if (width === 390) {
      await screenshot("booking-detail-390.png");
      await fullScreenshot("booking-detail-full-390.png");
    }
  }
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await visit(
      "/explore?preview=1",
      "document.querySelectorAll('.explore-destination-card').length === 6",
    );
    check(
      `Explore ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    check(
      `Explore ${width}px: equal two-column cards and portrait photos`,
      await evaluate(`(() => {
      const cards = [...document.querySelectorAll('.explore-destination-card')];
      const first = cards[0].getBoundingClientRect(), second = cards[1].getBoundingClientRect();
      const photo = cards[0].querySelector('.explore-destination-image').getBoundingClientRect();
      return Math.abs(first.top - second.top) < 1 && Math.abs(first.width - second.width) < 1 && Math.abs(photo.height / photo.width - 1.25) < .01 && cards[0].querySelector('h3').getBoundingClientRect().top >= photo.bottom;
    })()`),
    );
    check(
      `Explore ${width}px: title, two sections and actual preview count`,
      await evaluate(
        "document.querySelector('.explore-subnav h1').textContent === 'Khám Phá Đắk Song' && document.querySelectorAll('.explore-segments button').length === 2 && document.querySelector('.explore-chip').textContent.includes('(6)') && document.querySelectorAll('.explore-guide-card').length === 2",
      ),
    );
    if (width === 390) {
      await screenshot("explore-390.png");
      await fullScreenshot("explore-full-390.png");
    }
  }
  await evaluate("document.querySelector('.explore-save').click()");
  await waitFor("document.querySelector('.explore-save[aria-pressed=true]')");
  await visit(
    "/explore?preview=1",
    "document.querySelector('.explore-save[aria-pressed=true]')",
  );
  check(
    "Destination bookmark survives reload and does not open destination",
    await evaluate(
      "location.pathname === '/explore' && document.querySelector('.explore-save').getAttribute('aria-pressed') === 'true'",
    ),
  );
  await evaluate(
    "document.querySelector('.explore-filters button:nth-child(2)').click()",
  );
  await waitFor(
    "document.querySelectorAll('.explore-destination-card').length === 2",
  );
  check(
    "Explore theme filter selects cloud valley and pine hill",
    await evaluate(
      "document.querySelector('.explore-destination-grid').textContent.includes('Thung lũng mây ngàn') && document.querySelector('.explore-destination-grid').textContent.includes('Đồi thông Bonsai')",
    ),
  );
  await evaluate(
    "document.querySelector('.explore-segments button:nth-child(2)').click()",
  );
  await waitFor(
    "document.querySelector('.explore-segments button:nth-child(2)').getAttribute('aria-pressed') === 'true'",
  );
  await delay(500);
  check(
    "Guides tab scrolls to readable guide section below sticky controls",
    await evaluate(
      "document.querySelector('#explore-guides').getBoundingClientRect().top >= document.querySelector('.explore-subnav').getBoundingClientRect().bottom - 1 && document.querySelector('#explore-guides').getBoundingClientRect().top < innerHeight",
    ),
  );
  await evaluate(
    "document.querySelector('.explore-guide-footer button').click()",
  );
  check(
    "Read more expands actual guide content",
    await evaluate(
      "document.querySelector('.explore-guide-footer button').getAttribute('aria-expanded') === 'true' && document.querySelector('.explore-guide-body > p').classList.contains('expanded')",
    ),
  );
  await visit(
    "/explore?preview=1",
    "document.querySelectorAll('.explore-destination-card').length === 6",
  );
  await evaluate(
    "document.querySelector('.explore-destination-card a').click()",
  );
  await waitFor("document.querySelector('.detail-title')");
  check(
    "Explore card opens the matching destination detail",
    await evaluate(
      "document.querySelector('.detail-title').textContent === 'Cánh đồng quạt gió'",
    ),
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  for (const [path, ready] of [
    [
      "/explore?preview=1",
      "document.querySelectorAll('.explore-destination-card').length === 6",
    ],
    [
      "/destinations/preview-forest?preview=1",
      "document.querySelector('.detail-title')",
    ],
    [
      "/tours?preview=1",
      "document.querySelectorAll('.tour-card').length === 4",
    ],
    ["/login?preview=1", "document.querySelector('.login-content')"],
    ["/account?preview=1", "document.querySelector('.profile-card')"],
    ["/my-bookings?preview=1", "document.querySelector('.empty-state')"],
  ]) {
    await visit(path, ready);
    check(
      `Page renders: ${path}`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    if (path.startsWith("/login")) {
      check(
        "Login has VNA branding and browser development action",
        await evaluate(
          "document.querySelector('.login-brand img').naturalWidth > 0 && document.querySelector('.zalo-login-button').textContent.includes('Đăng nhập thử nghiệm')",
        ),
      );
      await fullScreenshot("login-full-390.png");
      await evaluate("document.querySelector('.zalo-login-button').click()");
      await waitFor("document.querySelector('[role=alert]')");
      check(
        "Browser preview does not fake Zalo login",
        await evaluate(
          "document.querySelector('[role=alert]').textContent.includes('Bản xem mẫu')",
        ),
      );
      await evaluate("document.querySelector('.login-guest').click()");
      await waitFor("document.querySelector('.stitch-home')");
      check("Login permits guest browsing", true);
    }
  }
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await visit(
      "/account?preview=1",
      "document.querySelector('.account-trip-card') && document.querySelector('.account-avatar img')?.complete",
    );
    check(
      `Account ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    check(
      `Account ${width}px: five tabs and active account`,
      await evaluate(
        "document.querySelectorAll('.bottom-nav a').length === 5 && document.querySelector('.bottom-nav [aria-current=page]').textContent.includes('Tài khoản')",
      ),
    );
    check(
      `Account ${width}px: profile, stats, trip and three menu groups`,
      await evaluate(
        "document.querySelector('.account-profile h1').textContent.includes('Nguyễn Văn An') && document.querySelectorAll('.account-stat').length === 3 && document.querySelectorAll('.account-group').length === 3",
      ),
    );
    if (width === 390) {
      await screenshot("account-390.png");
      await fullScreenshot("account-full-390.png");
    }
  }
  await evaluate("document.querySelector('.account-stat.clay').click()");
  await waitFor("document.querySelector('.account-dialog[open] .tour-card')");
  check(
    "Account saved tours opens a readable dialog",
    await evaluate(
      "document.querySelectorAll('.account-dialog .tour-card').length === 4",
    ),
  );
  await evaluate(
    "document.querySelector('.account-dialog-header button').click()",
  );
  await waitFor("!document.querySelector('.account-dialog[open]')");
  await evaluate(
    "document.querySelector('.account-menu-row[aria-pressed]').click()",
  );
  check(
    "Account preview notification switch is local",
    await evaluate(
      "document.querySelector('.account-menu-row[aria-pressed]').getAttribute('aria-pressed') === 'false' && !document.querySelector('.account-switch.checked')",
    ),
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await visit(
    "/tours?preview=1",
    "document.querySelectorAll('.tour-card').length === 4",
  );
  await evaluate(
    "[...document.querySelectorAll('.chip')].find(b => b.textContent === 'Văn hóa').click()",
  );
  await waitFor("document.querySelectorAll('.tour-card').length === 1");
  check(
    "Theme filter changes results",
    await evaluate(
      "document.querySelector('.tour-card').textContent.includes('văn hóa')",
    ),
  );
  check("Preview never writes to backend", writes.length === 0);
  // Public live data check, GET only. No mock login and no booking writes to the user's database.
  const live = await fetch("http://localhost:8000/api/tours?limit=1", {
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => response.json())
    .catch(() => null);
  let liveApiTested = false;
  if (live?.data?.length) {
    await visit("/tours", "document.querySelector('.tour-card')");
    check(
      "Live tour list reads actual backend data",
      await evaluate(
        `document.querySelector('.page').textContent.includes(${JSON.stringify(live.data[0].name)})`,
      ),
    );
    await visit(
      `/tours/${live.data[0]._id}`,
      "document.querySelector('.itinerary')",
    );
    check(
      "Live tour detail reads actual backend data",
      await evaluate(
        `document.querySelector('h1').textContent === ${JSON.stringify(live.data[0].name)}`,
      ),
    );
    const liveReviews = await fetch(
      `http://localhost:8000/api/tours/${live.data[0]._id}/reviews`,
    ).then((response) => response.json());
    assert.ok(liveReviews.summary, "Live review API must return statistics");
    await waitFor(
      "document.querySelector('.review-summary-score > span:last-child')",
    );
    check(
      "Live review statistics match actual backend data",
      await evaluate(
        `document.querySelector('.review-summary-score > span:last-child').textContent === '${liveReviews.summary.reviewCount} đánh giá'`,
      ),
    );
    liveApiTested = true;
    const destinations = await fetch(
      "http://localhost:8000/api/destinations?limit=8&page=1",
    ).then((response) => response.json());
    if (destinations.data?.length) {
      await visit(
        "/explore",
        "document.querySelector('.explore-destination-card')",
      );
      check(
        "Live explore uses API destination names and count",
        await evaluate(
          `document.querySelectorAll('.explore-destination-card').length === ${destinations.data.length} && document.querySelector('.explore-destination-card h3').textContent === ${JSON.stringify(destinations.data[0].name)} && document.querySelector('.explore-chip').textContent.includes('(${destinations.pagination.total})')`,
        ),
      );
      check(
        "Live explore does not invent distances, weather or hot badges",
        await evaluate(
          "!document.querySelector('.explore-weather') && !document.querySelector('.explore-featured') && !document.querySelector('.explore-destination-body p').textContent.includes('Cách trung tâm')",
        ),
      );
      await screenshot("explore-api-390.png");
      await visit(
        "/explore?tab=guides",
        "document.querySelector('.explore-destination-card')",
      );
      await delay(500);
      check(
        "Live guides show published visit notes or a clear empty state",
        await evaluate(
          "Boolean(document.querySelector('#explore-guides .explore-guide-card') || document.querySelector('#explore-guides .empty-state'))",
        ),
      );
    }
  }
  // Intercept every API request before testing writes: these responses never reach MongoDB.
  mockMode = true;
  const tour = {
    _id: "111111111111111111111111",
    name: "Tour kiểm tra giao diện",
    durationHours: 8,
    themes: ["nature"],
    images: [],
    summary: "Dữ liệu kiểm tra",
    description: "Dữ liệu kiểm tra",
    meetingPoint: "Điểm hẹn kiểm tra",
    itinerary: [{ title: "Khởi hành", description: "Lịch trình kiểm tra" }],
    includes: [],
    excludes: [],
    childPolicy: "Giá trẻ em theo chuyến",
    cancellationPolicy: "Điều kiện kiểm tra",
  };
  const departure = {
    _id: "222222222222222222222222",
    tourId: tour._id,
    departureAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    bookingDeadline: new Date(Date.now() + 86400000 * 6).toISOString(),
    adultPrice: 100000,
    childPrice: 70000,
    maxGuestsPerBooking: 12,
    status: "open",
  };
  const user = {
    _id: "333333333333333333333333",
    name: "Khách kiểm tra",
    role: "user",
    membershipTier: "Bạc",
    loyaltyPoints: 0,
    savedTours: [],
  };
  let failureMode = "conflict";
  let quoteVersion = 0;
  let latestQuote;
  let createdBooking;
  let listFails = false;
  const bookingRequests = [];
  let mockLoginBody;
  const detailBookingId = "888888888888888888888888";
  let detailBooking = {
    _id: detailBookingId,
    code: "VNA-DETAIL-TEST",
    tourId: tour._id,
    departureId: departure._id,
    adults: 2,
    children: 1,
    status: "pending_confirmation",
    paymentStatus: "unpaid",
    paymentMethod: "zalopay",
    contact: { name: user.name, phone: "0900000000" },
    note: "",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    history: [
      {
        status: "pending_confirmation",
        at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    snapshot: {
      tourName: tour.name,
      departureAt: departure.departureAt,
      meetingPoint: tour.meetingPoint,
      adultPrice: 1500000,
      childPrice: 750000,
      subTotal: 3750000,
      discountAmount: 0,
      appliedCoupon: null,
      total: 3750000,
      cancellationPolicy: tour.cancellationPolicy,
    },
  };
  let detailFails = false;
  let paymentRequests = 0;
  const syncBookingId = "999999999999999999999999";
  let syncBooking = {
    ...detailBooking,
    _id: syncBookingId,
    code: "VNA-ZALOPAY-TEST",
    adults: 1,
    children: 0,
    snapshot: {
      ...detailBooking.snapshot,
      adultPrice: 350000,
      childPrice: 0,
      subTotal: 350000,
      total: 350000,
    },
  };
  let showSyncBooking = false;
  let syncProviderMode = "pending";
  let syncQueries = 0;
  let syncReads = 0;
  const syncAppTransId = "261008_verified_test_transaction";
  const reviewBookingId = "666666666666666666666666";
  const reviewRequests = [];
  let currentReview = null;
  let reviewFails = false;
  const reviewSummary = () => ({
    averageRating: currentReview?.rating ?? null,
    reviewCount: currentReview ? 1 : 0,
    distribution: Object.fromEntries(
      [1, 2, 3, 4, 5].map((star) => [
        star,
        currentReview?.rating === star ? 1 : 0,
      ]),
    ),
  });
  const list = (data) => ({
    data,
    pagination: { page: 1, limit: 12, pages: 1, total: data.length },
  });
  socket.addEventListener("message", async (message) => {
    const event = JSON.parse(message.data);
    if (event.method !== "Fetch.requestPaused") return;
    const { requestId, request } = event.params;
    const path = new URL(request.url).pathname;
    const body = request.postData ? JSON.parse(request.postData) : {};
    let status = 200;
    let response = { message: "Unknown mocked route" };
    if (request.method === "OPTIONS") response = {};
    else if (path === "/api/auth/mock") {
      mockLoginBody = body;
      response = { user, token: "ui-intercepted-session-only" };
    } else if (path === "/api/auth/me") response = { user };
    else if (path === "/api/tours") {
      status = listFails ? 500 : 200;
      response = listFails ? { message: "Lỗi đọc API kiểm tra" } : list([tour]);
    } else if (path === "/api/tours/saved") response = { data: [tour] };
    else if (path === `/api/tours/${tour._id}`) response = tour;
    else if (path === `/api/tours/${tour._id}/departures`)
      response = list([departure]);
    else if (path === `/api/tours/${tour._id}/reviews/eligibility`)
      response = {
        eligibleBookings: currentReview
          ? []
          : [
              {
                _id: reviewBookingId,
                code: "VNA-COMPLETED-TEST",
                departureAt: new Date(Date.now() - 86400000 * 7).toISOString(),
              },
            ],
        myReviews: currentReview
          ? [{ ...currentReview, bookingId: reviewBookingId }]
          : [],
      };
    else if (path === `/api/tours/${tour._id}/reviews`) {
      if (request.method === "POST") {
        reviewRequests.push({ method: request.method, body });
        currentReview = {
          _id: "777777777777777777777777",
          rating: body.rating,
          comment: body.comment,
          author: { name: user.name, avatar: "" },
          verifiedBooking: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        status = 201;
        response = { data: { ...currentReview, bookingId: reviewBookingId } };
      } else {
        status = reviewFails ? 500 : 200;
        response = reviewFails
          ? { message: "Không tải được đánh giá kiểm tra" }
          : {
              ...list(currentReview ? [currentReview] : []),
              summary: reviewSummary(),
            };
      }
    } else if (path === "/api/reviews/777777777777777777777777") {
      reviewRequests.push({ method: request.method, body });
      if (request.method === "PATCH") {
        currentReview = {
          ...currentReview,
          ...body,
          updatedAt: new Date().toISOString(),
        };
        response = { data: { ...currentReview, bookingId: reviewBookingId } };
      } else if (request.method === "DELETE") {
        currentReview = null;
        response = { message: "Đã xóa đánh giá." };
      }
    } else if (path === `/api/bookings/${reviewBookingId}`)
      response = {
        data: {
          _id: reviewBookingId,
          code: "VNA-COMPLETED-TEST",
          tourId: tour._id,
          departureId: departure._id,
          adults: 1,
          children: 0,
          contact: { name: user.name, phone: "0900000000" },
          status: "completed",
          paymentStatus: "unpaid",
          paymentMethod: "cash_on_arrival",
          snapshot: {
            tourName: tour.name,
            departureAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            meetingPoint: tour.meetingPoint,
            total: 100000,
            cancellationPolicy: tour.cancellationPolicy,
          },
        },
      };
    else if (path === `/api/bookings/${syncBookingId}`) {
      syncReads++;
      response = {
        data: syncBooking,
        payments: [
          {
            appTransId: syncAppTransId,
            status:
              syncBooking.paymentStatus === "paid" ? "success" : "pending",
          },
        ],
      };
    } else if (path === `/api/payments/zalopay/${syncAppTransId}/query`) {
      syncQueries++;
      if (syncProviderMode === "error") {
        status = 502;
        response = {
          message: "Chưa xác định được kết quả ZaloPay. Vui lòng kiểm tra lại.",
        };
      } else {
        if (syncProviderMode === "success")
          syncBooking = { ...syncBooking, paymentStatus: "paid" };
        response = {
          appTransId: syncAppTransId,
          status: syncProviderMode === "pending" ? "pending" : "success",
          return_code: syncProviderMode === "pending" ? 3 : 1,
        };
      }
    } else if (path === `/api/bookings/${detailBookingId}`) {
      status = detailFails ? 404 : 200;
      response = detailFails
        ? { message: "Không tìm thấy đơn kiểm tra" }
        : { data: detailBooking };
    } else if (path === "/api/payments/zalopay/create") {
      paymentRequests++;
      status = 503;
      response = { message: "ZaloPay tạm thời chưa sẵn sàng" };
    } else if (path === "/api/bookings/mine") {
      if (showSyncBooking) response = list([syncBooking]);
      else {
        const completedQuery =
          new URL(request.url).searchParams.get("status") === "completed";
        const accountBooking = {
          _id: "555555555555555555555555",
          code: "VNA-ACCOUNT-TEST",
          tourId: tour._id,
          departureId: departure._id,
          adults: 1,
          children: 0,
          contact: { name: user.name, phone: "0900000000" },
          status: completedQuery ? "completed" : "confirmed",
          paymentStatus: "unpaid",
          snapshot: {
            tourName: tour.name,
            departureAt: departure.departureAt,
            meetingPoint: tour.meetingPoint,
          },
        };
        response = {
          data: [accountBooking],
          pagination: {
            page: 1,
            limit: completedQuery ? 1 : 100,
            pages: completedQuery ? 2 : 1,
            total: completedQuery ? 2 : 1,
          },
        };
      }
    } else if (path === "/api/bookings/quote") {
      quoteVersion++;
      const adultPrice = quoteVersion === 1 ? 100000 : 120000;
      latestQuote = {
        ...body,
        tourName: tour.name,
        meetingPoint: tour.meetingPoint,
        durationHours: 8,
        childPolicy: tour.childPolicy,
        cancellationPolicy: tour.cancellationPolicy,
        departureAt: departure.departureAt,
        adultPrice,
        childPrice: departure.childPrice,
        subTotal:
          body.adults * adultPrice + body.children * departure.childPrice,
        discountAmount: 0,
        appliedCoupon: null,
        quoteToken: `mock-quote-${quoteVersion}`,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        message: "Báo giá kiểm tra",
      };
      latestQuote.total = latestQuote.subTotal;
      response = latestQuote;
    } else if (path === "/api/bookings" && request.method === "POST") {
      bookingRequests.push({
        key:
          request.headers["Idempotency-Key"] ||
          request.headers["idempotency-key"],
        body,
      });
      if (failureMode === "conflict") {
        status = 409;
        response = { message: "Giá đã thay đổi. Kiểm tra báo giá mới." };
      } else if (failureMode === "network") {
        await command("Fetch.failRequest", {
          requestId,
          errorReason: "ConnectionClosed",
        });
        return;
      } else {
        createdBooking = {
          _id: "444444444444444444444444",
          code: "VNA-UI-TEST",
          tourId: tour._id,
          departureId: departure._id,
          adults: latestQuote.adults,
          children: latestQuote.children,
          contact: body.contact,
          note: body.note,
          snapshot: latestQuote,
          status: "pending_confirmation",
          paymentStatus: "unpaid",
          paymentMethod: "cash_on_arrival",
        };
        response = { data: createdBooking, replayed: true };
      }
    } else if (path.startsWith("/api/bookings/"))
      response = { data: createdBooking };
    await command("Fetch.fulfillRequest", {
      requestId,
      responseCode: status,
      responseHeaders: [
        { name: "Content-Type", value: "application/json" },
        { name: "Access-Control-Allow-Origin", value: base },
        {
          name: "Access-Control-Allow-Methods",
          value: "GET,POST,PATCH,DELETE,OPTIONS",
        },
        {
          name: "Access-Control-Allow-Headers",
          value: "authorization,content-type,idempotency-key",
        },
      ],
      body: Buffer.from(JSON.stringify(response)).toString("base64"),
    }).catch((error) => {
      if (!error.message.includes("Invalid InterceptionId")) throw error;
    });
  });
  await command("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }],
  });
  await evaluate("sessionStorage.removeItem('vna-customer-session')");
  await visit(
    "/login?returnTo=%2Faccount",
    "document.querySelector('#login-phone')",
  );
  await screenshot("login-390.png");
  await fullScreenshot("login-dev-full-390.png");
  await evaluate(`(() => {
    const input = document.querySelector('#login-phone');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '0900000000');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await evaluate("document.querySelector('.zalo-login-button').click()");
  await waitFor(
    "document.querySelector('.profile-card')?.textContent.includes('Khách kiểm tra')",
  );
  check(
    "Development login calls mock API with entered name and phone",
    mockLoginBody?.phone === "0900000000" &&
      mockLoginBody?.name === "Khách thử nghiệm",
  );
  check(
    "Development login restores requested page and authenticated account",
    await evaluate(
      "location.pathname === '/account' && sessionStorage.getItem('vna-customer-session') === 'ui-intercepted-session-only'",
    ),
  );
  await waitFor(
    "document.querySelector('.account-stat strong')?.textContent === '3' && document.querySelector('.account-trip-card')",
  );
  check(
    "Account uses API totals and saved tours instead of preview statistics",
    await evaluate(
      "[...document.querySelectorAll('.account-stat strong')].map(el => el.textContent).join(',') === '3,1,—'",
    ),
  );
  check(
    "Account does not claim Zalo verification for browser login",
    await evaluate(
      "document.querySelector('.account-session-label').textContent.includes('Phiên thử nghiệm') && !document.querySelector('.account-session-label').textContent.includes('Verified')",
    ),
  );
  await screenshot("account-api-390.png");
  await evaluate("document.querySelector('.account-logout').click()");
  await waitFor("document.querySelector('#login-phone')");
  check(
    "Account logout clears browser session and returns to login",
    await evaluate(
      "!sessionStorage.getItem('vna-customer-session') && location.pathname === '/login'",
    ),
  );
  await command("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "sessionStorage.setItem('vna-customer-session', 'ui-intercepted-session-only');",
  });
  await visit(
    `/my-bookings/${detailBookingId}?paymentStatus=paid`,
    "document.querySelector('.booking-pay-button')",
  );
  check(
    "Booking detail never trusts payment status in URL",
    await evaluate(
      "document.querySelector('.booking-payment-state strong').textContent === 'Chưa thanh toán'",
    ),
  );
  await evaluate(
    "document.querySelector('.booking-pay-button').click(); document.querySelector('.booking-pay-button').click()",
  );
  await waitFor(
    "document.querySelector('.booking-detail-actions .form-error')",
  );
  check(
    "ZaloPay retry prevents duplicate clicks and shows actual API error",
    paymentRequests === 1 &&
      (await evaluate(
        "document.querySelector('.form-error').textContent.includes('ZaloPay tạm thời chưa sẵn sàng') && document.querySelector('.booking-payment-state strong').textContent === 'Chưa thanh toán'",
      )),
  );
  detailBooking.paymentStatus = "paid";
  await evaluate("document.querySelector('.booking-refresh').click()");
  await waitFor("document.querySelector('.booking-payment-state.paid')");
  check(
    "Payment refresh shows paid while trip is still waiting",
    await evaluate(
      "document.querySelector('.booking-payment-state strong').textContent === 'Thanh toán thành công' && document.querySelector('.booking-status-main h1').textContent === 'Chờ xác nhận chuyến' && !document.querySelector('.booking-pay-button')",
    ),
  );
  check(
    "Paid pending booking explains that no second payment is needed",
    await evaluate(
      "document.querySelector('.booking-payment-state p').textContent.includes('không cần thanh toán lại')",
    ),
  );
  check(
    "Booking detail renders snapshot costs without invented extra fees",
    await evaluate(
      "[...document.querySelectorAll('.booking-cost-lines dd')].map(e=>e.textContent.replace(/\\D/g,'')).join(',') === '3000000,750000' && document.querySelector('.booking-cost-total > strong').textContent.replace(/\\D/g,'') === '3750000'",
    ),
  );
  check(
    "API booking displays its reference code instead of a fake check-in QR",
    await evaluate(
      "!document.querySelector('.booking-code-square.is-illustration') && document.querySelector('.booking-code-square strong').textContent === 'VNA-DETAIL-TEST'",
    ),
  );
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    check(
      `Paid booking detail ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    if (width === 390) {
      await screenshot("booking-detail-paid-390.png");
      await fullScreenshot("booking-detail-paid-full-390.png");
    }
  }
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await evaluate("document.querySelector('.booking-cancel-button').click()");
  check(
    "Paid booking cancellation explains refund separately",
    await evaluate(
      "document.querySelector('.cancel-form p').textContent.includes('không hoàn ngay')",
    ),
  );
  await evaluate(
    "document.querySelector('.cancel-actions .button-outline').click()",
  );
  for (const [status, paid, title, paymentTitle] of [
    ["confirmed", "unpaid", "Chuyến đi đã xác nhận", "Chưa thanh toán"],
    ["confirmed", "paid", "Chuyến đi đã xác nhận", "Thanh toán thành công"],
    ["completed", "paid", "Chuyến đi đã hoàn thành", "Thanh toán thành công"],
    [
      "cancelled",
      "refund_pending",
      "Đơn đặt tour đã hủy",
      "Đang chờ hoàn tiền",
    ],
    ["cancelled", "refunded", "Đơn đặt tour đã hủy", "Đã hoàn tiền"],
    ["rejected", "unpaid", "VNA chưa thể nhận đơn", "Chưa thanh toán"],
  ]) {
    detailBooking = { ...detailBooking, status, paymentStatus: paid };
    await visit(
      `/my-bookings/${detailBookingId}`,
      "document.querySelector('.booking-ticket')",
    );
    check(
      `Booking detail separates ${status} and ${paid}`,
      await evaluate(
        `document.querySelector('.booking-status-main h1').textContent === ${JSON.stringify(title)} && document.querySelector('.booking-payment-state strong').textContent === ${JSON.stringify(paymentTitle)}`,
      ),
    );
    if (["cancelled", "rejected", "completed"].includes(status))
      check(
        `Closed booking ${status}/${paid}: no payment or cancellation actions`,
        await evaluate(
          "!document.querySelector('.booking-pay-button') && !document.querySelector('.booking-cancel-button')",
        ),
      );
    if (status === "cancelled" || status === "rejected")
      check(
        `Closed booking ${status}/${paid}: timeline stops at actual outcome`,
        await evaluate(
          "document.querySelector('.booking-progress li:last-child').classList.contains('closed') && !document.querySelector('.booking-progress .upcoming')",
        ),
      );
  }
  detailFails = true;
  await visit(
    `/my-bookings/${detailBookingId}`,
    "document.querySelector('.empty-state[role=alert]')",
  );
  check(
    "Missing booking shows error without preview ticket or payment claims",
    await evaluate(
      "!document.querySelector('.booking-ticket') && !document.querySelector('.booking-payment-state')",
    ),
  );
  detailFails = false;
  showSyncBooking = true;
  await visit(
    "/my-bookings?paymentStatus=paid&app_trans_id=forged",
    "document.querySelector('.booking-payment-label.unpaid')",
  );
  await evaluate(
    "void (window.__paymentCard = document.querySelector('.booking-card'))",
  );
  const initialSyncQueries = syncQueries;
  syncProviderMode = "success";
  await waitFor("document.querySelector('.booking-payment-label.paid')");
  check(
    "ZaloPay verification automatically changes booking list row to paid",
    syncQueries > initialSyncQueries &&
      (await evaluate(
        "document.querySelector('.booking-card-footer .booking-payment-label').textContent === 'Đã thanh toán' && document.querySelector('.booking-card-footer strong').textContent.replace(/\\D/g,'') === '350000'",
      )),
  );
  check(
    "Paid list row does not change trip confirmation",
    await evaluate(
      "document.querySelector('.booking-card .status-badge').textContent === 'Chờ VNA xác nhận'",
    ),
  );
  check(
    "Payment update preserves the existing card without a page reload",
    await evaluate(
      "window.__paymentCard === document.querySelector('.booking-card') && window.__paymentCard.isConnected",
    ),
  );
  await screenshot("booking-payment-paid-390.png");

  syncBooking = { ...syncBooking, paymentStatus: "unpaid" };
  syncProviderMode = "uncommitted";
  const readsBefore = syncReads;
  await visit(
    `/my-bookings/${syncBookingId}?paymentStatus=paid&app_trans_id=forged`,
    "document.querySelector('.booking-payment-state.unpaid')",
  );
  for (let i = 0; i < 80 && syncReads < readsBefore + 3; i++) await delay(100);
  check(
    "Provider response alone cannot mark paid before backend saves booking",
    syncReads >= readsBefore + 3 &&
      (await evaluate(
        "document.querySelector('.booking-payment-state strong').textContent === 'Chưa thanh toán'",
      )),
  );
  syncProviderMode = "success";
  await evaluate("window.dispatchEvent(new Event('focus'))");
  await waitFor("document.querySelector('.booking-payment-state.paid')");
  check(
    "Returning from payment checks server transaction and refreshes detail",
    await evaluate(
      "document.querySelector('.booking-payment-state strong').textContent === 'Thanh toán thành công' && !document.querySelector('.booking-pay-button')",
    ),
  );

  syncBooking = { ...syncBooking, paymentStatus: "unpaid" };
  syncProviderMode = "error";
  await visit(
    `/booking/success/${syncBookingId}`,
    "document.querySelector('.form-error')",
  );
  check(
    "Unverified ZaloPay result stays unpaid and shows retry information",
    await evaluate(
      "document.querySelector('.booking-payment-label.unpaid').textContent === 'Chưa thanh toán' && document.querySelector('.form-error').textContent.includes('Chưa xác định') && !document.querySelector('h1').textContent.includes('Thanh toán thành công')",
    ),
  );
  syncProviderMode = "success";
  await evaluate(
    "[...document.querySelectorAll('button')].find(button => button.textContent === 'Kiểm tra lại thanh toán').click()",
  );
  await waitFor(
    "document.querySelector('h1').textContent === 'Thanh toán thành công!'",
  );
  check(
    "Payment return page becomes successful only after verified saved state",
    await evaluate(
      "document.querySelector('.booking-payment-label.paid').textContent === 'Đã thanh toán' && !document.querySelector('.form-error')",
    ),
  );
  const queriesAfterPaid = syncQueries;
  await evaluate(
    "window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus'))",
  );
  await delay(150);
  check(
    "ZaloPay polling stops after payment is recorded",
    syncQueries === queriesAfterPaid,
  );
  showSyncBooking = false;
  await visit(
    `/my-bookings/${reviewBookingId}`,
    "document.querySelector('.booking-review-invitation a')",
  );
  check(
    "Completed booking links to review for the correct tour and booking",
    await evaluate(
      `document.querySelector('.booking-review-invitation a').getAttribute('href') === '/tours/${tour._id}?reviewBookingId=${reviewBookingId}'`,
    ),
  );
  await evaluate(
    "document.querySelector('.booking-review-invitation a').click()",
  );
  await waitFor(
    "document.querySelector('.review-form textarea') && document.querySelector('.review-empty')",
  );
  check(
    "Review link scrolls to review section",
    await evaluate(
      "document.querySelector('.page-content').scrollTop > 0 && document.querySelector('#tour-reviews h2').getBoundingClientRect().top >= document.querySelector('.app-header').getBoundingClientRect().bottom",
    ),
  );
  check(
    "No reviews: no fabricated stars or count",
    await evaluate(
      "document.querySelector('.review-summary-link').textContent.includes('Chưa có đánh giá') && document.querySelector('.review-summary-score > span:last-child').textContent === '0 đánh giá'",
    ),
  );
  check(
    "Review requires a nonblank comment and a completed booking",
    await evaluate(
      `document.querySelector('.review-form button[type=submit]').disabled && document.querySelector('select[name=reviewBookingId]').value === '${reviewBookingId}'`,
    ),
  );
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    check(
      `Review form ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    if (width === 390) {
      await evaluate(
        "document.querySelector('#tour-reviews').scrollIntoView({block:'start'})",
      );
      const capture = await command("Page.captureScreenshot", {
        format: "png",
      });
      await writeFile(
        new URL("tour-review-form-390.png", output),
        Buffer.from(capture.data, "base64"),
      );
    }
  }
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await evaluate(
    "document.querySelector('.review-rating-picker [aria-label=\"4 sao\"]').click()",
  );
  await evaluate(
    `(() => { const input = document.querySelector('#review-comment'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Chuyến đi tốt. <b>Nhận xét của tôi</b>'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await evaluate(
    "document.querySelector('.review-form button[type=submit]').click(); document.querySelector('.review-form button[type=submit]')?.click()",
  );
  await waitFor(
    "document.querySelector('.my-review') && document.querySelector('.review-summary-link strong')?.textContent === '4.0'",
  );
  check(
    "Review double click sends one POST with verified booking ID",
    reviewRequests.length === 1 &&
      reviewRequests[0].body.bookingId === reviewBookingId &&
      reviewRequests[0].body.rating === 4 &&
      !("userId" in reviewRequests[0].body),
  );
  check(
    "Posted review updates public stars/count and private edit actions",
    await evaluate(
      "document.querySelector('.review-summary-score > span:last-child').textContent === '1 đánh giá' && document.querySelectorAll('.review-owner-actions button').length === 2 && !document.querySelector('.review-form')",
    ),
  );
  check(
    "Review comment renders as plain text",
    await evaluate(
      "document.querySelector('.review-card > p').textContent.includes('<b>Nhận xét của tôi</b>') && !document.querySelector('.review-card > p b')",
    ),
  );
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    check(
      `Reviews ${width}px: no horizontal overflow`,
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    if (width === 390) {
      await evaluate(
        "document.querySelector('#tour-reviews').scrollIntoView({block:'start'})",
      );
      const capture = await command("Page.captureScreenshot", {
        format: "png",
      });
      await writeFile(
        new URL("tour-reviews-390.png", output),
        Buffer.from(capture.data, "base64"),
      );
    }
  }
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await evaluate(
    "document.querySelector('.review-owner-actions button').click()",
  );
  await waitFor("document.querySelector('.review-form')");
  check(
    "Edit review preloads existing stars and comment",
    await evaluate(
      "document.querySelector('.review-rating-picker [aria-checked=true]').getAttribute('aria-label') === '4 sao' && document.querySelector('#review-comment').value.includes('Chuyến đi tốt')",
    ),
  );
  await evaluate(
    "document.querySelector('.review-rating-picker [aria-label=\"2 sao\"]').click()",
  );
  await evaluate(
    `(() => { const input = document.querySelector('#review-comment'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Đã cập nhật nhận xét'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await evaluate(
    "document.querySelector('.review-form button[type=submit]').click()",
  );
  await waitFor(
    "document.querySelector('.review-summary-link strong')?.textContent === '2.0' && !document.querySelector('.review-form')",
  );
  check(
    "Editing uses PATCH and recalculates average without increasing count",
    reviewRequests.length === 2 &&
      reviewRequests[1].method === "PATCH" &&
      (await evaluate(
        "document.querySelector('.review-summary-score > span:last-child').textContent === '1 đánh giá' && document.querySelector('.review-card > p').textContent === 'Đã cập nhật nhận xét'",
      )),
  );
  await evaluate(
    "document.querySelector('.review-owner-actions .danger').click()",
  );
  await waitFor("document.querySelector('.delete-review-confirm')");
  check(
    "Deleting asks for confirmation before API call",
    reviewRequests.length === 2,
  );
  await evaluate(
    "document.querySelector('.delete-review-confirm .button-danger').click()",
  );
  await waitFor(
    "document.querySelector('.review-empty') && document.querySelector('.review-form')",
  );
  check(
    "Deleting uses DELETE and restores eligibility and empty statistics",
    reviewRequests.length === 3 &&
      reviewRequests[2].method === "DELETE" &&
      (await evaluate(
        "document.querySelector('.review-summary-link').textContent.includes('Chưa có đánh giá')",
      )),
  );
  reviewFails = true;
  await visit(
    `/tours/${tour._id}`,
    "document.querySelector('#tour-reviews .empty-state[role=alert]')",
  );
  check(
    "Review API error is distinct from no reviews",
    await evaluate(
      "!document.querySelector('.review-empty') && document.querySelector('#tour-reviews').textContent.includes('Không tải được đánh giá kiểm tra')",
    ),
  );
  reviewFails = false;
  await evaluate(
    "document.querySelector('#tour-reviews .empty-state[role=alert] button').click()",
  );
  await waitFor("document.querySelector('.review-empty')");
  check("Review API failure can retry successfully", true);
  await visit(
    `/booking/${tour._id}/select`,
    "document.querySelector('.departure-option')",
  );
  await evaluate("document.querySelector('.action-bar button').click()");
  await waitFor("document.querySelector('.contact-fields')");
  await evaluate(
    `(() => { const input = document.querySelector('input[name=name]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Khách kiểm tra'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await evaluate(
    `(() => { const input = document.querySelector('input[name=phone]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '0900000000'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await evaluate("document.querySelector('.agreement input').click()");
  await evaluate("document.querySelector('.action-bar button').click()");
  await waitFor(
    "[...document.querySelectorAll('.form-error')].some(el => el.textContent.includes('Kiểm tra lại giá'))",
  );
  check(
    "Quote changed: blocks submitting stale price",
    await evaluate("document.querySelector('.action-bar button').disabled"),
  );
  await evaluate("document.querySelector('.form-error .text-link').click()");
  await waitFor(
    "document.querySelector('.price-total dd').textContent.replace(/\\D/g, '') === '120000'",
  );
  check(
    "New quote is displayed before consent",
    await evaluate(
      "!document.querySelector('.agreement input').checked && document.querySelector('.action-bar button').disabled",
    ),
  );
  failureMode = "network";
  await evaluate("document.querySelector('.agreement input').click()");
  await evaluate("document.querySelector('.action-bar button').click()");
  await waitFor(
    "document.querySelector('.action-bar button').textContent.includes('Thử gửi lại')",
  );
  check(
    "Lost connection locks exact booking payload",
    await evaluate("document.querySelector('.contact-fields').disabled"),
  );
  failureMode = "success";
  await evaluate(
    "document.querySelector('.action-bar button').click(); document.querySelector('.action-bar button')?.click()",
  );
  await waitFor("document.querySelector('.success-card')");
  check(
    "Double click creates only one retry request",
    bookingRequests.length === 3,
  );
  check(
    "Retry preserves Idempotency-Key",
    bookingRequests[1].key && bookingRequests[1].key === bookingRequests[2].key,
  );
  check(
    "Retry preserves exact request payload",
    JSON.stringify(bookingRequests[1].body) ===
      JSON.stringify(bookingRequests[2].body),
  );
  check(
    "Actual API response determines pending/unpaid UI",
    await evaluate(
      "document.querySelector('.success-card').textContent.includes('Chờ VNA xác nhận') && document.querySelector('.success-card').textContent.includes('Chưa thanh toán')",
    ),
  );
  listFails = true;
  await visit(
    "/tours",
    "document.querySelector('.empty-state [role=alert]') || document.querySelector('.empty-state[role=alert]')",
  );
  check(
    "API failure shows error instead of sample tours",
    await evaluate(
      "!document.querySelector('.tour-card') && !document.querySelector('.preview-banner')",
    ),
  );
  check(
    "All write tests intercepted; no real database writes",
    writes.every((request) => request.intercepted),
  );
  check("No uncaught browser exceptions", exceptions.length === 0);
  await writeFile(
    new URL("ui-results.json", output),
    JSON.stringify(
      {
        passed: checks.length,
        checks,
        exceptions,
        apiWrites: writes,
        liveApiTested,
        realZaloSdkTested: false,
        realPaymentTested: false,
      },
      null,
      2,
    ),
  );
  console.log(
    `${checks.length} checks passed. Screenshots: frontend/test-results/`,
  );
} catch (error) {
  await writeFile(
    new URL("ui-results.json", output),
    JSON.stringify(
      {
        passed: checks.length,
        checks,
        error: error.message,
        exceptions,
        apiWrites: writes,
      },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  if (command) await command("Browser.close").catch(() => {});
  socket?.close();
  browser.kill();
}
