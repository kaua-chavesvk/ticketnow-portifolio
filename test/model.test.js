import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent, safeURL, getDemoEvents, filterEvents, changeQuantity, cartTotal } from '../public/model.js';

test('URL allowlist rejects script, credentials and deceptive hostnames', () => {
  for (const url of ['javascript:alert(1)', 'http://ticketmaster.com/a', 'https://ticketmaster.com.evil.test/', 'https://user:pass@ticketmaster.com/', 'https://ticketmaster.com:8080/', '//ticketmaster.com']) assert.equal(safeURL(url, 'event'), null);
  assert.equal(safeURL('https://www.ticketmaster.com/event/123', 'event'), 'https://www.ticketmaster.com/event/123');
  assert.equal(safeURL('https://evil.test/pixel.jpg', 'image'), null);
});
test('prices remain unknown without BRL data; zero is preserved', () => {
  const base = { id: '1', name: '<img src=x onerror=alert(1)>' };
  assert.equal(normalizeEvent(base).priceCents, null);
  assert.equal(normalizeEvent({ ...base, priceRanges: [{ min: 20, currency: 'USD' }] }).priceCents, null);
  assert.equal(normalizeEvent({ ...base, priceRanges: [{ min: 0, currency: 'BRL' }] }).priceCents, 0);
  assert.equal(normalizeEvent({ ...base, priceRanges: [{ min: 19.99, currency: 'BRL' }] }).priceCents, 1999);
  assert.equal(normalizeEvent(base).name, base.name);
  assert.equal(normalizeEvent(null), null);
});
test('demo search combines category and accent-insensitive query; no matches stay empty', () => {
  const events = getDemoEvents();
  assert.equal(filterEvents(events, 'musica', 'Music').length, 1);
  assert.equal(filterEvents(events, 'fortaleza', 'Music').length, 2);
  assert.equal(filterEvents(events, 'fortaleza', 'Sports').length, 0);
  assert.equal(filterEvents(events, 'not-found').length, 0);
});
test('cart uses integer cents, stable IDs, upper bound and removes zero quantity', () => {
  const event = getDemoEvents()[0]; let cart = [];
  for (let i = 0; i < 20; i++) cart = changeQuantity(cart, event, 1);
  assert.equal(cart.length, 1); assert.equal(cart[0].quantity, 10); assert.equal(cartTotal(cart), 120000);
  for (let i = 0; i < 10; i++) cart = changeQuantity(cart, event, -1);
  assert.deepEqual(cart, []);
  assert.deepEqual(changeQuantity(cart, { ...event, priceCents: null }, 1), []);
  assert.equal(cartTotal(changeQuantity([], getDemoEvents()[4], 1)), 0);
});
