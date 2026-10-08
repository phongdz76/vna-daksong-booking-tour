import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const base = process.env.UI_BASE_URL || "http://localhost:5173";
const profile = fileURLToPath(
  new URL(`../.browser-cache/notifications-${Date.now()}/`, import.meta.url),
);
const output = new URL("../test-results/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = spawn(
  process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--disable-extensions",
    "--disable-gpu",
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const checks = [];
const errors = [];
let socket;
let command;
let launchError;
browser.on("error", (error) => {
  launchError = error;
});
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
}
try {
  let port;
  for (let retry = 0; retry < 80; retry++) {
    if (launchError) throw launchError;
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
  assert.ok(port, "Chrome debugging port unavailable");
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
      errors.push(event.params.exceptionDetails.text);
  };
  const evaluate = async (expression) => {
    const result = await command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result.value;
  };
  async function waitFor(expression) {
    for (let retry = 0; retry < 80; retry++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(100);
    }
    throw new Error(`UI timeout: ${expression}`);
  }
  await command("Page.enable");
  await command("Runtime.enable");
  for (const width of [360, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await command("Page.navigate", { url: base + "/?preview=1" });
    await waitFor("document.querySelector('.notification-count')");
    await evaluate("document.querySelector('.notification-bell').click()");
    await waitFor(
      "document.querySelector('.notification-dialog[open]') && document.querySelectorAll('.notification-item').length === 3",
    );
    check(
      `Notifications ${width}px fill the entire app screen`,
      await evaluate(
        "(() => { const r = document.querySelector('.notification-dialog').getBoundingClientRect(); return Math.abs(r.top) < 1 && Math.abs(r.bottom - innerHeight) < 1 && Math.abs(r.width - innerWidth) < 1; })()",
      ),
    );
    check(
      `Notifications ${width}px have no horizontal overflow`,
      await evaluate(
        "document.querySelector('.notification-dialog').scrollWidth <= innerWidth",
      ),
    );
    check(
      `Notifications ${width}px list fills remaining screen height`,
      await evaluate(
        "Math.abs(document.querySelector('.notification-list').getBoundingClientRect().bottom - innerHeight) < 1",
      ),
    );
    if (width === 390) {
      await evaluate("document.fonts.ready");
      const shot = await command("Page.captureScreenshot", { format: "png" });
      await writeFile(
        new URL("notifications-full-390.png", output),
        Buffer.from(shot.data, "base64"),
      );
    }
    await evaluate(
      "[...document.querySelectorAll('.notification-tabs button')].find(b => b.textContent === 'Thanh toán').click()",
    );
    await waitFor(
      "document.querySelectorAll('.notification-item').length === 1",
    );
    check(
      `Payment filter ${width}px shows payment events`,
      await evaluate(
        "document.querySelector('.notification-item h3').textContent.includes('Thanh toán')",
      ),
    );
    await evaluate(
      "document.querySelector('.notification-toolbar button').click()",
    );
    await waitFor("!document.querySelector('.notification-count')");
    check(
      `Read all ${width}px removes the unread badge`,
      await evaluate("!document.querySelector('.notification-unread-dot')"),
    );
    await evaluate(
      "document.querySelector('.notification-panel-heading button').click()",
    );
    check(
      `Back ${width}px closes notifications`,
      await evaluate("!document.querySelector('.notification-dialog').open"),
    );
    await evaluate(
      "document.querySelector('.notification-bell').click(); [...document.querySelectorAll('.notification-tabs button')].find(b => b.textContent === 'Bài viết').click()",
    );
    await waitFor("document.querySelector('.notification-type-icon.article')");
    await evaluate("document.querySelector('.notification-item').click()");
    await waitFor("document.querySelector('.article-body')");
    check(
      `Article notification ${width}px opens the article`,
      await evaluate(
        "location.pathname.startsWith('/articles/') && !document.querySelector('.notification-dialog[open]')",
      ),
    );
  }
  check(
    "Notification UI has no uncaught browser exceptions",
    errors.length === 0,
  );
  await writeFile(
    new URL("notifications-ui-results.json", output),
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
  );
  console.log(`${checks.length} notification UI checks passed.`);
} finally {
  if (command && socket?.readyState === WebSocket.OPEN)
    await command("Browser.close").catch(() => {});
  socket?.close();
  browser.kill();
}
