import { createHandler } from '../server.js';

// One handler per warm instance preserves local cache/coalescing across requests.
// This endpoint has no listener: Vercel supplies the Node request/response pair.
const handle = createHandler();
export default function events(req, res) {
  if (new URL(req.url, 'https://localhost').pathname !== '/api/events') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'Recurso não encontrado.' }));
  }
  return handle(req, res);
}
