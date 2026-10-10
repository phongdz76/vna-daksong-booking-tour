// Run backend/npm run test:locations:ui. Only the location feature is exercised.
// Browser API calls go to that run's isolated test database, never the live backend.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const apiBase = process.env.LOCATION_API_URL;
const token = process.env.LOCATION_ADMIN_TOKEN;
const tourId = process.env.LOCATION_TOUR_ID;
const firstId = process.env.LOCATION_FIRST_ID;
const secondId = process.env.LOCATION_SECOND_ID;
assert.ok(apiBase && token && tourId, 'Use the backend test:locations:ui script with its isolated database.');
const base = process.env.UI_BASE_URL || 'http://localhost:5173';
const output = new URL('../test-results/locations/', import.meta.url);
const profile = fileURLToPath(new URL(`../.browser-cache/locations-${Date.now()}/`, import.meta.url));
await mkdir(output, { recursive: true });
const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--disable-gpu', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], exceptions = [], writes = [];
let socket, command, browserError;
browser.on('error', error => { browserError = error; });
const check = (name, value) => { assert.ok(value, name); checks.push(name); console.log('PASS UI ' + name); };
try {
  let port;
  for (let retry = 0; retry < 80; retry++) {
    if (browserError) throw browserError;
    try { port = Number((await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]); } catch {}
    if (port) break; await delay(150);
  }
  assert.ok(port, 'Chrome debugging port unavailable.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = message => {
    const event = JSON.parse(message.data);
    if (event.id) {
      const task = pending.get(event.id); if (!task) return;
      clearTimeout(task.timer); pending.delete(event.id);
      event.error ? task.reject(new Error(JSON.stringify(event.error))) : task.resolve(event.result);
    }
    if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
    if (event.method === 'Fetch.requestPaused') {
      const { requestId, request } = event.params;
      void (async () => {
        // Background map tiles are a deterministic test image, not live requests.
        if (new URL(request.url).hostname === 'tile.openstreetmap.org') {
          await command('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/png' }],
            body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==' }); return;
        }
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/api/, '') + url.search;
        const headers = {};
        for (const [key, value] of Object.entries(request.headers)) if (['authorization', 'content-type'].includes(key.toLowerCase())) headers[key] = value;
        const response = await fetch(apiBase + path, { method: request.method, headers,
          body: request.postData, signal: AbortSignal.timeout(15000) });
        const content = await response.text();
        if (!['GET', 'OPTIONS'].includes(request.method)) writes.push({ method: request.method, path, body: request.postData ? JSON.parse(request.postData) : {}, status: response.status });
        await command('Fetch.fulfillRequest', { requestId, responseCode: response.status,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
            { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' }],
          body: Buffer.from(content).toString('base64') });
      })().catch(error => {
        if (error.message.includes('Invalid InterceptionId')) return;
        exceptions.push(error.message); void command('Fetch.failRequest', { requestId, errorReason: 'Failed' }).catch(() => {});
      });
    }
  };
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let retry = 0; retry < 120; retry++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); }
    throw new Error('UI timeout: ' + expression);
  };
  const visit = async (path, ready) => { await command('Page.navigate', { url: base + path }); await waitFor(ready); };
  const fill = async (name, value) => evaluate(`(() => {
    const element = document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(name))} + ']');
    if (!element) throw Error('Missing field: ' + ${JSON.stringify(name)});
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  })()`);
  const click = async name => evaluate(`(() => {
    const element = [...document.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === ${JSON.stringify(name)} || item.innerText.trim() === ${JSON.stringify(name)});
    if (!element) throw Error('Missing button: ' + ${JSON.stringify(name)}); element.click();
  })()`);
  const selectPlace = async name => evaluate(`document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify('Chọn ' + name))} + ']').click()`);
  const snapshot = async name => {
    await evaluate('document.fonts.ready');
    const capture = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL(name + '.png', output), Buffer.from(capture.data, 'base64'));
  };
  await command('Page.enable'); await command('Runtime.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*', requestStage: 'Request' }, { urlPattern: '*://tile.openstreetmap.org/*', requestStage: 'Request' }] });
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await visit('/admin/login', "document.querySelector('[aria-label=Email]')");
  await evaluate(`sessionStorage.setItem('vna-admin-session', ${JSON.stringify(token)})`);
  await visit('/admin/destinations/new', "document.querySelector('[aria-label=\"Vĩ độ\"]')");
  await fill('Tên nội dung', 'Điểm demo bản đồ mới'); await fill('Tóm tắt', 'Địa điểm demo cho kiểm thử bản đồ.');
  await fill('Mô tả chi tiết', 'Địa điểm chỉ tồn tại trong database test riêng.');
  await fill('Nhóm địa điểm', 'nature'); await fill('Phạm vi địa điểm', 'daksong'); await fill('Xã/khu vực', 'Khu demo mới');
  await fill('Vĩ độ', '12.35'); await click('Lưu điểm đến');
  await waitFor("document.querySelector('[role=alert]')?.innerText.includes('Nhập đủ vĩ độ')");
  check('partial coordinates block saving', writes.filter(item => item.path === '/destinations').length === 0);
  await fill('Kinh độ', '107.75'); await fill('Trạng thái xuất bản', 'published');
  await click('Thêm nguồn tham khảo'); await fill('Tên nguồn 1', 'Nguồn demo'); await fill('Ngày kiểm tra nguồn 1', '2026-10-11'); await fill('Liên kết nguồn 1', 'https://example.com/location-demo');
  await click('Lưu điểm đến'); await waitFor("!document.querySelector('dialog[open]')");
  const created = writes.find(item => item.path === '/destinations' && item.status === 201);
  check('new destination persists classification, scope and coordinates', created?.body.placeGroup === 'nature' && created.body.areaScope === 'daksong' && created.body.coordinates.latitude === 12.35);
  await visit('/admin/destinations/' + process.env.LOCATION_LEGACY_ID + '/edit', "document.querySelector('dialog[open] textarea')");
  check('legacy destination edit form does not add location fields', await evaluate("!document.querySelector('[aria-label=\"Vĩ độ\"]')"));
  await visit('/admin/tours/' + tourId + '/edit', "document.querySelector('[aria-label=\"Chọn điểm tập trung\"]') && document.querySelector('.destination-picker-options label')");
  check('picker separates Dak Song, nearby and unclassified records', await evaluate("document.querySelector('.destination-picker-options').innerText.includes('Trong Đắk Song') && document.querySelector('.destination-picker-options').innerText.includes('Khu vực lân cận') && document.querySelector('.destination-picker-options').innerText.includes('Chưa phân khu vực')"));
  await fill('Khu vực điểm đến', 'daksong'); await fill('Nhóm điểm đến', 'nature'); await fill('Tìm điểm đến để liên kết', 'Khu demo mới');
  check('search matches locality and combines scope/group filters', await evaluate("document.querySelectorAll('.destination-picker-options label').length === 1 && document.querySelector('.destination-picker-options').innerText.includes('Điểm demo bản đồ mới')"));
  await selectPlace('Điểm demo bản đồ mới'); await fill('Khu vực điểm đến', ''); await fill('Nhóm điểm đến', ''); await fill('Tìm điểm đến để liên kết', '');
  await fill('Điểm đến của điểm dừng 1', firstId); await click('Bỏ Demo new-pickup');
  check('removing a selected place clears its itinerary reference', await evaluate("document.querySelector('[aria-label=\"Điểm đến của điểm dừng 1\"]').value === ''"));
  await selectPlace('Demo new-pickup');
  await click('Đưa Điểm demo bản đồ mới lên'); await click('Đưa Điểm demo bản đồ mới lên');
  await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.selected-destination-list li')];
    const from = rows.find(row => row.innerText.includes('Demo new-pickup'));
    const to = rows.find(row => row.innerText.includes('Điểm demo bản đồ mới'));
    const transfer = new DataTransfer();
    from.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
    to.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
    from.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: transfer }));
  })()`);
  const selectedNames = await evaluate("[...document.querySelectorAll('.selected-destination-list .selected-destination-name b')].map(item => item.innerText)");
  check('drag and keyboard buttons reorder stops while keeping the meeting point first', selectedNames[0] === 'Demo new-stop' && selectedNames.indexOf('Demo new-pickup') < selectedNames.indexOf('Điểm demo bản đồ mới'));
  await fill('Chọn điểm tập trung', firstId);
  check('selecting a meeting place updates text and anchors it first', await evaluate("document.querySelector('[aria-label=\"Điểm tập trung\"]').value.includes('Demo new-pickup') && document.querySelector('.selected-destination-name b').innerText === 'Demo new-pickup'"));
  await evaluate("document.querySelector('.destination-picker-field').scrollIntoView({block:'center'})"); await snapshot('admin-selected-desktop');
  await command('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 1, mobile: true });
  await snapshot('admin-selected-mobile');
  check('location selection fits mobile width', await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"));
  await click('Lưu tour'); await waitFor("!document.querySelector('dialog[open]')");
  const saved = writes.findLast(item => item.path === '/tours/' + tourId && item.method === 'PATCH');
  check('tour persists ordered selections and chosen meeting ID', saved?.status === 200 && saved.body.destinationIds[0] === firstId && saved.body.meetingDestinationId === firstId);
  await visit('/tours/' + tourId, "document.querySelectorAll('.tour-place-marker').length === 3");
  await evaluate("document.querySelector('.tour-location').scrollIntoView({block:'start'})"); await delay(150);
  const publicNames = await evaluate("[...document.querySelectorAll('.tour-map-places strong')].map(item => item.innerText)");
  check('user map receives the saved order and excludes draft destination details', publicNames[0] === 'Demo new-pickup' && !publicNames.includes('Demo draft-stop') && publicNames.includes('Điểm demo bản đồ mới'));
  check('unmapped old place stays in the list and receives no fabricated pin', publicNames.includes('Demo legacy-location') && await evaluate("document.querySelector('.tour-map-places').innerText.includes('Chưa xác định vị trí bản đồ')"));
  const href = await evaluate("document.querySelector('.tour-directions-link').href");
  const query = new URL(href).searchParams;
  check('customer Google Maps route includes real persisted coordinates', query.get('origin') === '12.2,107.6' && (query.get('waypoints') || '').includes('12.3,107.7') && query.get('destination') === '12.35,107.75');
  await evaluate("document.querySelector('.tour-place-marker').click()");
  await waitFor("document.querySelector('.leaflet-popup-content')?.innerText.includes('Demo new-pickup')");
  check('map marker opens the matching destination information', await evaluate("document.querySelector('.leaflet-popup-content a').href.includes('12.2')"));
  await snapshot('user-map-mobile');
  check('user map fits mobile viewport', await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"));
  check('UI never writes to a legacy destination', writes.every(item => !item.path.startsWith('/destinations/' + process.env.LOCATION_LEGACY_ID)));
  check('location flow has no browser exceptions', exceptions.length === 0);
  await writeFile(new URL('results.json', output), JSON.stringify({ checks, exceptions, writes }, null, 2));
  console.log(checks.length + ' focused location UI checks passed.');
} catch (error) {
  if (command) { const capture = await command('Page.captureScreenshot', { format: 'png' }).catch(() => null); if (capture) await writeFile(new URL('failure.png', output), Buffer.from(capture.data, 'base64')); }
  await writeFile(new URL('results.json', output), JSON.stringify({ checks, exceptions, writes, error: error.message }, null, 2));
  console.error(error.message); process.exitCode = 1;
} finally {
  if (command) await command('Browser.close').catch(() => {});
  socket?.close(); browser.kill();
}
