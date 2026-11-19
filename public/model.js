export const categories = Object.freeze({ Music: 'Música', Sports: 'Esportes', 'Arts & Theatre': 'Teatro', Family: 'Família' });
export const MAX_QUANTITY = 10;
export const money = (cents, currency = 'BRL') => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
export const normalizeText = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const text = (value, max = 200) => typeof value === 'string' ? value.slice(0, max) : '';

export function safeURL(value, kind) {
  try {
    const url = new URL(value);
    const allowed = kind === 'image' ? /^s[1-4]\.ticketm\.net$/ : /(^|\.)ticketmaster\.(com|com\.br|co\.uk|ca|de|fr|ie|es|nl|com\.au)$/;
    return url.protocol === 'https:' && !url.username && !url.password && allowed.test(url.hostname) && !url.port ? url.href : null;
  } catch { return null; }
}

export function normalizeEvent(event) {
  if (!event || typeof event !== 'object' || !text(event.id, 100) || !text(event.name)) return null;
  const range = event.priceRanges?.[0];
  const priceCents = typeof range?.min === 'number' && Number.isFinite(range.min) && range.min >= 0 && range.min <= 1000000 && range.currency === 'BRL' ? Math.round(range.min * 100) : null;
  const date = text(event.dates?.start?.localDate, 10);
  const image = Array.isArray(event.images) ? event.images.find(item => safeURL(item?.url, 'image') && item.width >= 500) : null;
  return { id: text(event.id, 100), name: text(event.name), genre: text(event.classifications?.[0]?.segment?.name, 50), date: /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null, venue: text(event._embedded?.venues?.[0]?.name) || 'Local a confirmar', priceCents, image: safeURL(image?.url, 'image'), url: safeURL(event.url, 'event'), demo: false };
}

export function getDemoEvents() {
  return [
    ['demo-1', 'Festival de música — Exemplo', 'Music', '2027-07-17', 'Palco demonstrativo, Fortaleza', 12000],
    ['demo-2', 'Final de futebol — Exemplo', 'Sports', '2027-08-10', 'Arena demonstrativa, São Paulo', 8000],
    ['demo-3', 'Uma noite no teatro — Exemplo', 'Arts & Theatre', '2027-09-22', 'Teatro demonstrativo, Rio de Janeiro', 9500],
    ['demo-4', 'Espetáculo para a família — Exemplo', 'Family', '2027-10-03', 'Centro cultural demonstrativo, Recife', 6000],
    ['demo-5', 'Encontro de jazz — Exemplo', 'Music', '2027-11-15', 'Palco demonstrativo, Fortaleza', 0],
    ['demo-6', 'Corrida de rua — Exemplo', 'Sports', '2027-12-07', 'Circuito demonstrativo, Salvador', 4500],
  ].map(([id, name, genre, date, venue, priceCents]) => ({ id, name, genre, date, venue, priceCents, image: null, url: null, demo: true }));
}

export function filterEvents(events, keyword = '', genre = '') {
  const query = normalizeText(keyword.trim());
  return events.filter(event => (!genre || event.genre === genre) && (!query || normalizeText(`${event.name} ${event.venue}`).includes(query)));
}

export function changeQuantity(cart, event, delta) {
  if (!event || !Number.isSafeInteger(event.priceCents) || event.priceCents < 0 || ![1, -1].includes(delta)) return cart;
  const existing = cart.find(item => item.id === event.id);
  const quantity = Math.max(0, Math.min(MAX_QUANTITY, (existing?.quantity || 0) + delta));
  if (!existing && !quantity) return cart;
  if (!existing) return [...cart, { ...event, quantity }];
  return cart.map(item => item.id === event.id ? { ...item, quantity } : item).filter(item => item.quantity > 0);
}
export const cartTotal = cart => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
