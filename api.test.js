const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('./index');
let server, url;
before(async () => {
  process.env.API_TOKEN = 'test-only-token';
  server = await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', err => err ? reject(err) : resolve(s)); });
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => server && new Promise(resolve => server.close(resolve)));
test('rejects missing, invalid and malformed credentials without leaking them', async () => {
  for (const authorization of ['', 'Bearer wrong', 'Basic test-only-token', 'Bearer test-only-token extra']) {
    const res = await fetch(`${url}/orders/ORD-1001`, { headers: { authorization } });
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), { api_error: 'Unauthorized' });
  }
});
test('returns all five scenarios and authenticated 404s', async () => {
  const headers = { authorization: 'Bearer test-only-token' };
  const expected = ['shipped', 'delivered', 'processing', 'delivered', 'pending'];
  for (let n = 1; n <= 5; n++) {
    const res = await fetch(`${url}/orders/ORD-100${n}`, { headers });
    assert.equal(res.status, 200);
    const order = await res.json();
    assert.equal(order.order_status, expected[n - 1]);
    assert.equal(order.api_error, null);
    if (n === 1) assert.equal(order.actual_delivery_date, null);
    if (n === 4) assert.ok(order.order_items.some(item => item.fulfilled_quantity < item.quantity));
    if (n === 3 || n === 5) assert.equal(order.carrier_tracking.tracking_number, null);
  }
  for (const id of ['ORD-9999', 'constructor', '__proto__']) {
    const res = await fetch(`${url}/orders/${id}`, { headers });
    assert.equal(res.status, 404);
  }
});
test('fails closed without configured token', async () => {
  delete process.env.API_TOKEN;
  try { assert.equal((await fetch(`${url}/orders/ORD-1001`)).status, 503); }
  finally { process.env.API_TOKEN = 'test-only-token'; }
});
