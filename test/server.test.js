import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

async function running(t, options = {}) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
test('serves allowlisted assets, security headers and no private/server files', async t => {
  const base = await running(t);
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const html = await response.text();
  assert.doesNotMatch(html, /onclick=|onerror=|form-card|form-cpf|API_KEY/);
  for (const path of ['/.env', '/server.js', '/.git/config', '/package.json', '/public/../server.js']) assert.equal((await fetch(base + path)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
});
test('demo API applies search/filter; invalid and duplicate params are rejected', async t => {
  const base = await running(t);
  const result = await (await fetch(`${base}/api/events?keyword=musica&category=Music`)).json();
  assert.equal(result.mode, 'demo'); assert.equal(result.events.length, 1);
  assert.equal((await (await fetch(`${base}/api/events?keyword=zzzz`)).json()).events.length, 0);
  for (const query of ['page=-1', 'page=50', 'category=oops', 'keyword=' + 'a'.repeat(101), 'page=1&page=2', 'url=https://evil.test', 'keyword=%00']) assert.equal((await fetch(`${base}/api/events?${query}`)).status, 400);
});
test('rate limit ignores spoofed proxy headers and returns retry guidance', async t => {
  const base = await running(t, { perClientLimit: 1 });
  assert.equal((await fetch(`${base}/api/events`)).status, 200);
  const response = await fetch(`${base}/api/events`, { headers: { 'X-Forwarded-For': '8.8.8.8' } });
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
});
test('live API keeps key server-side, normalizes data, caches and preserves empty results', async t => {
  let calls = 0;
  const base = await running(t, { apiKey: 'test-secret', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url.origin, 'https://app.ticketmaster.com'); assert.equal(url.searchParams.get('apikey'), 'test-secret');
    assert.equal(options.redirect, 'error');
    return Response.json({ page: { totalPages: 2 }, _embedded: { events: [{ id: '1', name: 'Live', url: 'javascript:alert(1)', priceRanges: [{ min: 0, currency: 'BRL' }] }] } });
  } });
  const response = await fetch(`${base}/api/events`); const body = await response.text();
  assert.doesNotMatch(body, /test-secret|javascript:/);
  const data = JSON.parse(body); assert.equal(data.mode, 'live'); assert.equal(data.events[0].priceCents, 0); assert.equal(data.hasMore, true);
  await fetch(`${base}/api/events`); assert.equal(calls, 1);
  const empty = await running(t, { apiKey: 'test-secret', fetchImpl: async () => Response.json({ page: { totalPages: 0 } }) });
  assert.deepEqual((await (await fetch(`${empty}/api/events`)).json()).events, []);
});
test('provider errors and malformed/oversized payloads do not leak secrets', async t => {
  for (const fetchImpl of [async () => { throw new Error('test-secret'); }, async () => new Response('test-secret', { status: 401 }), async () => Response.json({ unexpected: 'test-secret' }), async () => new Response('a'.repeat(2000001))]) {
    const base = await running(t, { apiKey: 'test-secret', fetchImpl });
    const response = await fetch(`${base}/api/events`);
    assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /test-secret/);
  }
});
test('concurrent identical searches coalesce to one upstream request', async t => {
  let calls = 0;
  const base = await running(t, { apiKey: 'test', fetchImpl: async () => {
    calls++; await new Promise(resolve => setTimeout(resolve, 30)); return Response.json({ page: { totalPages: 0 } });
  } });
  const responses = await Promise.all([fetch(`${base}/api/events`), fetch(`${base}/api/events`)]);
  assert.equal(calls, 1); responses.forEach(response => assert.equal(response.status, 200));
});
