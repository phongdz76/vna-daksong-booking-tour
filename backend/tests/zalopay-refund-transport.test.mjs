import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { sendZaloPayRequest } from '../controllers/paymentController.js';
import { paymentReturnUrl, paymentCallbackUrl, validCheckoutUrl } from '../utils/zalopayUrls.js';

test('payment return URLs are absolute, preserve the frontend base path and reject placeholder hosts', t => {
  const originalClient = process.env.CLIENT_URL, originalCallback = process.env.ZALOPAY_CALLBACK_URL;
  t.after(() => {
    if (originalClient === undefined) delete process.env.CLIENT_URL; else process.env.CLIENT_URL = originalClient;
    if (originalCallback === undefined) delete process.env.ZALOPAY_CALLBACK_URL; else process.env.ZALOPAY_CALLBACK_URL = originalCallback;
  });
  process.env.CLIENT_URL = 'http://localhost:5173';
  assert.equal(paymentReturnUrl('booking1'), 'http://localhost:5173/booking/success/booking1');
  process.env.CLIENT_URL = 'https://example.com/client/';
  assert.equal(paymentReturnUrl('booking1'), 'https://example.com/client/booking/success/booking1');
  for (const value of ['', 'payment-complete', '//payment-complete', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/?token=private']) {
    process.env.CLIENT_URL = value;
    assert.throws(() => paymentReturnUrl('booking1'), /PAYMENT_URL_NOT_CONFIGURED/);
  }
  process.env.ZALOPAY_CALLBACK_URL = 'https://api.example.com/api/payments/zalopay/webhook';
  assert.equal(paymentCallbackUrl(), process.env.ZALOPAY_CALLBACK_URL);
  process.env.ZALOPAY_CALLBACK_URL = 'http://localhost:8000/api/payments/zalopay/webhook';
  assert.throws(paymentCallbackUrl, /PAYMENT_URL_NOT_CONFIGURED/);
  for (const value of ['payment-complete', 'javascript:alert(1)', 'http://example.com', null]) assert.equal(validCheckoutUrl(value), false);
});

test('create and query requests use UTF-8 form POST bodies including the full redirect and callback', async () => {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    requests.push({url: req.url, method: req.method, type: req.headers['content-type'], body: Buffer.concat(chunks).toString('utf8')});
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({return_code:1}));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const create = {app_id:2553, amount:150000, embed_data:JSON.stringify({redirecturl:'http://localhost:5173/booking/success/abc'}), callback_url:'https://api.example.com/api/payments/zalopay/webhook', description:'Thanh toán đơn Đắk Song & khách hàng'};
    await sendZaloPayRequest(base + '/create', create);
    await sendZaloPayRequest(base + '/query', {app_id:2553, app_trans_id:'261019_test', mac:'signed-test-value'});
    assert.equal(requests.length,2);
    assert.deepEqual(Object.fromEntries(new URLSearchParams(requests[0].body)), Object.fromEntries(Object.entries(create).map(([key,value])=>[key,String(value)])));
    for (const request of requests) { assert.equal(request.method,'POST'); assert.equal(new URL(request.url,base).search,''); assert.match(request.type,/application\/x-www-form-urlencoded/); }
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('refund APIs receive signed UTF-8 form data in the POST body', async () => {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ url: req.url, method: req.method, type: req.headers['content-type'], body: Buffer.concat(chunks).toString('utf8') });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ return_code: 3, refund_id: '900000001' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const key = 'test-key';
    const timestamp = 1791633600000;
    const refund = { app_id: '2553', m_refund_id: '261010_2553_abcdef', zp_trans_id: '261009000000089', amount: 150000, description: 'Hoàn tiền đơn VNA & khách hàng + ghi chú', timestamp };
    refund.mac = createHmac('sha256', key).update([refund.app_id, refund.zp_trans_id, refund.amount, refund.description, timestamp].join('|')).digest('hex');
    assert.equal((await sendZaloPayRequest(base + '/v2/refund', refund, true)).return_code, 3);
    const query = { app_id: refund.app_id, m_refund_id: refund.m_refund_id, timestamp };
    query.mac = createHmac('sha256', key).update([query.app_id, query.m_refund_id, timestamp].join('|')).digest('hex');
    assert.equal((await sendZaloPayRequest(base + '/v2/query_refund', query, true)).return_code, 3);
    assert.equal(requests.length, 2);
    for (const [index, payload] of [refund, query].entries()) {
      const request = requests[index];
      assert.equal(request.method, 'POST');
      assert.ok(request.type.startsWith('application/x-www-form-urlencoded'));
      assert.equal(new URL(request.url, base).search, '');
      assert.deepEqual(Object.fromEntries(new URLSearchParams(request.body)), Object.fromEntries(Object.entries(payload).map(([name, value]) => [name, String(value)])));
    }
    const decoded = Object.fromEntries(new URLSearchParams(requests[0].body));
    assert.equal(decoded.mac, createHmac('sha256', key).update([decoded.app_id, decoded.zp_trans_id, decoded.amount, decoded.description, decoded.timestamp].join('|')).digest('hex'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('provider refusal is returned; invalid responses and HTTP failures remain unknown', async () => {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/refused') res.end(JSON.stringify({ return_code: 2, sub_return_code: -401 }));
    else if (req.url === '/invalid') res.end(JSON.stringify({ return_code: 0 }));
    else { res.statusCode = 503; res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await sendZaloPayRequest(base + '/refused', { amount: 150000 }, true)).sub_return_code, -401);
    for (const path of ['/invalid', '/unavailable']) {
      await assert.rejects(sendZaloPayRequest(base + path, {}, true), { message: 'PAYMENT_RESULT_UNKNOWN' });
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
