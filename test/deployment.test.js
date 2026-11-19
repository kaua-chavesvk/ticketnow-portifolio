import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import events from '../api/events.js';

test('serverless entry serves demo catalog and rejects unrelated paths/methods', async t => {
  const server = createServer(events);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/events?keyword=musica&category=Music`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, 'demo'); assert.equal(data.events.length, 1);
  assert.equal((await fetch(`${base}/api/events`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/server.js`)).status, 404);
});

test('deployment output includes only browser assets and never backend/configuration', async () => {
  const root = new URL('../', import.meta.url);
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = new URL('dist/', root);
  const files = (await readdir(output, { recursive: true })).map(path => path.replaceAll('\\', '/')).filter(path => path !== 'public').sort();
  assert.deepEqual(files, ['index.html', 'public/app.js', 'public/model.js', 'public/styles.css']);
  for (const file of files) assert.doesNotMatch(await readFile(new URL(file.replaceAll('\\', '/'), output), 'utf8'), /TICKETMASTER_API_KEY|process\.env|apikey=/);
});
