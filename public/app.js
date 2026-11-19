import { categories, MAX_QUANTITY, money, getDemoEvents, filterEvents, changeQuantity, cartTotal, safeURL } from './model.js';

const $ = id => document.getElementById(id);
// External content only enters text nodes; no HTML interpolation or inline handlers.
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
const dateLabel = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Data a confirmar';
let cart = [], events = [], mode = 'demo', page = 0, hasMore = false, activeRequest;
let toastTimer;
function toast(message) {
  $('toast-msg').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500);
}

function add(event) {
  const existing = cart.find(item => item.id === event.id);
  if (existing?.quantity >= MAX_QUANTITY) return toast('Limite de 10 ingressos por evento.');
  cart = changeQuantity(cart, event, 1);
  renderCart();
  toast(`${event.name} adicionado ao carrinho simulado.`);
}

function eventAction(event) {
  if (!event.demo) {
    const url = safeURL(event.url, 'event');
    if (!url) return node('span', 'sec-sub', 'Consulte o organizador');
    const link = node('a', 'btn-buy', 'Ver no fornecedor');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Ver no fornecedor: ${event.name} (nova aba)`);
    return link;
  }
  const button = node('button', 'btn-buy', '+ INGRESSO');
  button.type = 'button';
  button.setAttribute('aria-label', `+ INGRESSO: Adicionar ${event.name} ao carrinho simulado`);
  button.addEventListener('click', () => add(event));
  return button;
}

function card(event) {
  const article = node('article', 'event-card');
  const placeholder = node('div', 'event-img-placeholder', categories[event.genre] || 'Evento');
  const imageURL = safeURL(event.image, 'image');
  if (imageURL) {
    const image = node('img', 'event-img');
    image.src = imageURL; image.alt = ''; image.loading = 'lazy'; image.width = 600; image.height = 360;
    image.addEventListener('error', () => image.replaceWith(placeholder), { once: true });
    article.append(image);
  } else article.append(placeholder);
  const body = node('div', 'event-body');
  body.append(node('p', 'event-genre', `${categories[event.genre] || 'Evento'}${event.demo ? ' · EXEMPLO' : ''}`), node('h3', 'event-name', event.name));
  const meta = node('div', 'event-meta');
  meta.append(node('p', 'event-meta-item', dateLabel(event.date)), node('p', 'event-meta-item', event.venue));
  const footer = node('div', 'event-footer');
  footer.append(node('span', 'event-price', event.priceCents === null ? 'Preço a consultar' : `${event.demo ? '' : 'A partir de '}${money(event.priceCents)}`), eventAction(event));
  body.append(meta, footer); article.append(body);
  return article;
}

function renderEvents() {
  const container = $('events-container');
  if (!events.length) {
    const empty = node('div', 'empty');
    empty.append(node('h3', '', 'Nenhum evento encontrado'), node('p', '', 'Tente outro termo ou selecione outra categoria.'));
    const reset = node('button', 'cat-btn', 'Limpar filtros');
    reset.addEventListener('click', () => { $('search-form').reset(); loadEvents(); });
    empty.append(reset); container.replaceChildren(empty);
  } else {
    const grid = node('div', 'events-grid');
    grid.append(...events.map(card)); container.replaceChildren(grid);
  }
  $('events-subtitle').textContent = `${events.length} evento(s) ${mode === 'demo' ? 'de exemplo' : 'carregado(s)'}`;
  $('featured-banner').hidden = !events.length;
  const content = $('featured-content'); content.replaceChildren();
  if (events[0]) {
    const event = events[0];
    content.append(node('p', 'featured-tag', event.demo ? 'EVENTO DE EXEMPLO' : 'DESTAQUE DO CATÁLOGO'), node('h2', 'featured-title', event.name), node('p', 'featured-meta', `${dateLabel(event.date)} · ${event.venue}`), eventAction(event));
  }
}

function renderCategories() {
  const row = $('cats-row'); row.replaceChildren();
  for (const [value, label] of [['', 'Todos'], ...Object.entries(categories)]) {
    const selected = $('search-cat').value === value;
    const button = node('button', `cat-btn${selected ? ' active' : ''}`, label);
    button.type = 'button'; button.setAttribute('aria-pressed', String(selected));
    button.addEventListener('click', () => { $('search-cat').value = value; loadEvents(); });
    row.append(button);
  }
}

async function loadEvents(append = false) {
  activeRequest?.abort();
  const controller = new AbortController(); activeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 10000);
  $('events-container').setAttribute('aria-busy', 'true');
  $('events-subtitle').textContent = 'Buscando eventos...';
  $('load-more').hidden = true;
  const nextPage = append ? page + 1 : 0;
  const keyword = $('search-input').value.trim();
  const category = $('search-cat').value;
  const params = new URLSearchParams({ keyword, category, page: String(nextPage) });
  renderCategories();
  try {
    const response = await fetch(`./api/events?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error('catalog-unavailable');
    const data = await response.json();
    if (!Array.isArray(data.events) || !['demo', 'live'].includes(data.mode)) throw new Error('invalid-catalog');
    if (activeRequest !== controller) return;
    mode = data.mode; page = nextPage; hasMore = data.hasMore === true;
    events = append ? [...new Map([...events, ...data.events].map(event => [event.id, event])).values()] : data.events;
    $('catalog-notice').textContent = mode === 'demo' ? 'Modo demonstração: nomes, locais, datas e preços fictícios. Nenhum ingresso é vendido.' : 'Catálogo Ticketmaster. Preços e disponibilidade devem ser confirmados no fornecedor. O carrinho deste site é apenas demonstrativo.';
  } catch {
    if (activeRequest !== controller) return;
    if (append) {
      toast('Não foi possível carregar mais eventos. Tente novamente.');
      return;
    }
    mode = 'demo'; page = 0; hasMore = false;
    events = filterEvents(getDemoEvents(), keyword, category);
    $('catalog-notice').textContent = 'Catálogo ao vivo indisponível nesta hospedagem. Exibindo apenas exemplos fictícios; busca e filtros continuam funcionando.';
  } finally {
    clearTimeout(timeout);
    if (activeRequest === controller) {
      $('events-container').setAttribute('aria-busy', 'false');
      $('load-more').hidden = !hasMore;
    }
  }
  renderEvents();
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  $('cart-badge').textContent = count;
  $('cart-badge').classList.toggle('show', count > 0);
  $('open-cart').setAttribute('aria-label', `Abrir carrinho: ${count} ingresso(s)`);
  $('cart-footer').hidden = !count;
  $('cart-total').textContent = money(cartTotal(cart));
  const list = $('cart-items'); list.replaceChildren();
  if (!count) list.append(node('p', 'cart-empty-msg', 'Seu carrinho está vazio. Adicione ingressos de exemplo para experimentar.'));
  for (const item of cart) {
    const row = node('div', 'cart-item');
    const info = node('div', 'cart-item-info');
    info.append(node('p', 'cart-item-name', item.name), node('p', 'cart-item-date', dateLabel(item.date)), node('p', 'cart-item-price', money(item.priceCents * item.quantity)));
    const controls = node('div', 'qty-ctrl');
    for (const delta of [-1, 1]) {
      const button = node('button', 'qty-btn', delta < 0 ? '−' : '+');
      button.setAttribute('aria-label', `${delta < 0 ? 'Remover' : 'Adicionar'} um ingresso de ${item.name}`);
      button.disabled = delta === 1 && item.quantity >= MAX_QUANTITY;
      button.addEventListener('click', () => {
        cart = changeQuantity(cart, item, delta); renderCart();
        const replacement = [...list.querySelectorAll('button')].find(candidate => candidate.getAttribute('aria-label') === button.getAttribute('aria-label') && !candidate.disabled);
        (replacement || $('close-cart')).focus();
      });
      controls.append(button);
      if (delta === -1) controls.append(node('span', 'qty-n', String(item.quantity)));
    }
    row.append(info, controls); list.append(row);
  }
}

$('search-form').addEventListener('submit', event => { event.preventDefault(); loadEvents(); });
$('load-more').addEventListener('click', () => loadEvents(true));
$('open-cart').addEventListener('click', () => $('cart-dialog').showModal());
$('close-cart').addEventListener('click', () => $('cart-dialog').close());
$('simulate-order').addEventListener('click', () => {
  if (!cart.length) return;
  $('simulation-summary').textContent = `${cart.reduce((sum, item) => sum + item.quantity, 0)} ingresso(s) de exemplo. Total simulado: ${money(cartTotal(cart))}.`;
  $('cart-dialog').close(); cart = []; renderCart(); $('simulation-dialog').showModal();
});
$('close-simulation').addEventListener('click', () => $('simulation-dialog').close());
for (const id of ['cart-dialog', 'simulation-dialog']) {
  $(id).addEventListener('close', () => { document.body.classList.remove('dialog-open'); $('open-cart').focus(); });
  new MutationObserver(() => document.body.classList.toggle('dialog-open', !!document.querySelector('dialog[open]'))).observe($(id), { attributes: true, attributeFilter: ['open'] });
  $(id).addEventListener('click', event => { if (event.target === $(id)) $(id).close(); });
}
renderCart(); loadEvents();
