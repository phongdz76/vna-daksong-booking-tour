import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { sendZaloPayRequest } from '../controllers/paymentController.js';

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
