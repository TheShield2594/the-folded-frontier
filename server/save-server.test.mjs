// Tests for the save server (save-server.mjs): node --test server/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeServer } from './save-server.mjs';

let srv, base, data;
const call = (p, o = {}) => fetch(base + p, { ...o, headers: { Authorization: 'Bearer pw', ...o.headers } });

before(async () => {
  data = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-saves-'));
  srv = makeServer({ data, password: 'pw', maxMB: 1 });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  base = 'http://127.0.0.1:' + srv.address().port;
});
after(async () => { await new Promise(ok => srv.close(ok)); await fs.rm(data, { recursive: true, force: true }); });

test('health needs no password', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, auth: true, version: 1 });
});

test('the password is checked', async () => {
  assert.equal((await fetch(base + '/api/saves/ann')).status, 401);
  assert.equal((await call('/api/saves/ann', { headers: { Authorization: 'Bearer nope' } })).status, 401);
  assert.equal((await call('/api/saves/ann')).status, 200);
});

test('save, list, load, conflict and delete', async () => {
  assert.deepEqual(await (await call('/api/saves/ann')).json(), []);
  let r = await call('/api/saves/ann/w1', { method: 'PUT', body: JSON.stringify({ v: 4, a: 1 }) });
  assert.equal(r.status, 201);
  const { rev } = await r.json();
  r = await call('/api/saves/ann/w1');
  assert.equal(r.headers.get('etag'), '"' + rev + '"');
  assert.deepEqual(await r.json(), { v: 4, a: 1 });
  const list = await (await call('/api/saves/ann')).json();
  assert.equal(list.length, 1); assert.equal(list[0].world, 'w1'); assert.equal(list[0].rev, rev);
  // a write from the rev it read goes through; a second one from the same old rev is refused
  // (a weak ETag, as nginx's gzip sends it back, counts the same)
  r = await call('/api/saves/ann/w1', { method: 'PUT', headers: { 'If-Match': 'W/"' + rev + '"' }, body: '{"v":4,"a":2}' });
  assert.equal(r.status, 200);
  const rev2 = (await r.json()).rev;
  assert.notEqual(rev2, rev);
  r = await call('/api/saves/ann/w1', { method: 'PUT', headers: { 'If-Match': '"' + rev + '"' }, body: '{"v":4,"a":3}' });
  assert.equal(r.status, 409); assert.equal((await r.json()).rev, rev2);
  assert.deepEqual(await (await call('/api/saves/ann/w1')).json(), { v: 4, a: 2 });
  // other players don't see it
  assert.deepEqual(await (await call('/api/saves/bob')).json(), []);
  assert.equal((await call('/api/saves/ann/w1', { method: 'DELETE' })).status, 200);
  assert.equal((await call('/api/saves/ann/w1')).status, 404);
  assert.equal((await fs.readdir(path.join(data, 'trash'))).length, 1);
});

test('bad input is refused', async () => {
  assert.equal((await call('/api/saves/ann/w2', { method: 'PUT', body: 'not json' })).status, 400);
  assert.equal((await call('/api/saves/ann/w2', { method: 'PUT', body: '"' + 'x'.repeat(1100000) + '"' })).status, 413);
  assert.equal((await call('/api/saves/a..b/w')).status, 400);
  assert.equal((await call('/api/saves/ann/w%2Fx')).status, 400);
  assert.equal((await call('/api/saves/' + 'a'.repeat(65))).status, 400);
  assert.equal((await call('/api/saves/ann/w2', { method: 'POST', body: '{}' })).status, 405);
  assert.equal((await call('/api/nope')).status, 404);
  assert.equal((await call('/api/saves/ann/w2')).status, 404);
});
