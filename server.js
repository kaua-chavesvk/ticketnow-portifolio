import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { categories, normalizeEvent, getDemoEvents, filterEvents } from './public/model.js';

const ROOT = new URL('./', import.meta.url);
const files = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/public/styles.css', ['public/styles.css', 'text/css; charset=utf-8']], ['/public/app.js', ['public/app.js', 'text/javascript; charset=utf-8']], ['/public/model.js', ['public/model.js', 'text/javascript; charset=utf-8']]]);
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://s1.ticketm.net https://s2.ticketm.net https://s3.ticketm.net https://s4.ticketm.net; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'";
export function createHandler({ apiKey = process.env.TICKETMASTER_API_KEY || '', fetchImpl = fetch, now = Date.now, perClientLimit = 30, globalLimit = 200 } = {}) {
  const cache = new Map(), clients = new Map(), pending = new Map();
  let globalWindow = { at: now(), count: 0 };
  function send(req, res, status, body, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': CSP, 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
    res.end(req.method === 'HEAD' ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return send(req, res, 405, { error: 'Método não permitido.' }); }
      if (url.pathname !== '/api/events') {
        const file = files.get(url.pathname);
        if (!file) return send(req, res, 404, { error: 'Recurso não encontrado.' });
        return send(req, res, 200, await readFile(new URL(file[0], ROOT)), file[1]);
      }
      // Socket address is intentional: untrusted X-Forwarded-For never bypasses limits.
      const time = now();
      for (const [key, value] of clients) if (time - value.at >= 60000) clients.delete(key);
      const address = req.socket.remoteAddress;
      let client = clients.get(address);
      if (!client) {
        if (clients.size >= 10000) return send(req, res, 503, { error: 'Servidor ocupado.' });
        client = { at: time, count: 0 }; clients.set(address, client);
      }
      if (time - globalWindow.at >= 60000) globalWindow = { at: time, count: 0 };
      if (++client.count > perClientLimit || ++globalWindow.count > globalLimit) { res.setHeader('Retry-After', '60'); return send(req, res, 429, { error: 'Muitas buscas. Aguarde um minuto.' }); }
      const params = url.searchParams;
      const keyword = (params.get('keyword') || '').trim();
      const category = params.get('category') || '';
      const pageText = params.get('page') || '0';
      if ([...params.keys()].some(key => !['keyword', 'category', 'page'].includes(key) || params.getAll(key).length !== 1) || keyword.length > 100 || /[\u0000-\u001f\u007f]/.test(keyword) || (category && !Object.hasOwn(categories, category)) || !/^\d{1,2}$/.test(pageText) || Number(pageText) > 49) return send(req, res, 400, { error: 'Parâmetros de busca inválidos.' });
      const page = Number(pageText);
      if (!apiKey) return send(req, res, 200, { mode: 'demo', events: page ? [] : filterEvents(getDemoEvents(), keyword, category), hasMore: false });
      const key = JSON.stringify([keyword, category, page]);
      for (const [cacheKey, entry] of cache) if (time >= entry.expires) cache.delete(cacheKey);
      if (cache.has(key)) return send(req, res, 200, cache.get(key).data);
      if (!pending.has(key)) {
        if (pending.size >= 4) return send(req, res, 503, { error: 'Catálogo ocupado. Tente novamente.' });
        const request = (async () => {
          // Fixed origin/path prevents this endpoint becoming an arbitrary proxy (SSRF).
          const upstream = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
          upstream.search = new URLSearchParams({ apikey: apiKey, size: '20', sort: 'date,asc', countryCode: 'BR', page: String(page), ...(keyword ? { keyword } : {}), ...(category ? { classificationName: category } : {}) }).toString();
          const response = await fetchImpl(upstream, { signal: AbortSignal.timeout(7000), redirect: 'error', headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error('upstream-status');
          // Bound upstream memory use, including chunked responses.
          if (!response.body) throw new Error('empty-response');
          let size = 0; const chunks = [];
          for await (const chunk of response.body) {
            size += chunk.length;
            if (size > 2000000) throw new Error('upstream-too-large');
            chunks.push(Buffer.from(chunk));
          }
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!Number.isSafeInteger(data.page?.totalPages) || data.page.totalPages < 0 || (data._embedded !== undefined && !Array.isArray(data._embedded?.events))) throw new Error('invalid-upstream');
          const result = { mode: 'live', events: (data._embedded?.events || []).slice(0, 20).map(normalizeEvent).filter(Boolean), hasMore: page < 49 && page + 1 < data.page.totalPages };
          if (cache.size >= 100) cache.delete(cache.keys().next().value);
          cache.set(key, { data: result, expires: now() + 60000 });
          return result;
        })();
        pending.set(key, request);
        request.finally(() => pending.delete(key)).catch(() => {});
      }
      return send(req, res, 200, await pending.get(key));
    } catch {
      // Never expose upstream URLs, keys or provider error bodies to clients/logs.
      return send(req, res, 502, { error: 'Catálogo temporariamente indisponível.' });
    }
  };
}

export function createApp(options) {
  const server = createServer(createHandler(options));
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000; server.maxRequestsPerSocket = 100;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida');
  createApp().listen(port, process.env.HOST || '127.0.0.1', () => console.log(`TicketNow em http://localhost:${port}`));
}
