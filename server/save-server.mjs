// Save server for the self-hosting image (issue #54; the game's side of it is issue #57). Plain Node, no dependencies.
// nginx serves the game and passes /api/ here. Saves are files under FF_DATA (a volume in docker-compose.yml):
//   <FF_DATA>/saves/<player>/<world>.json
// Env: FF_PORT (8787), FF_HOST (127.0.0.1), FF_DATA (/data), FF_PASSWORD (instance password; empty leaves the API
// open, fine on a private network only), FF_MAX_MB (largest save accepted, 16).
// API (JSON; with FF_PASSWORD set every call but /api/health needs "Authorization: Bearer <password>"):
//   GET    /api/health                  {ok, auth, version}
//   GET    /api/saves/<player>          [{world, size, rev, mtime}]
//   GET    /api/saves/<player>/<world>  the save as stored; ETag is its rev
//   PUT    /api/saves/<player>/<world>  stores the body (any JSON); If-Match: <rev> refuses with 409 if it changed
//   DELETE /api/saves/<player>/<world>  removes it (moved to <FF_DATA>/trash/, never deleted outright)
// Names are 1-64 of A-Z a-z 0-9 _ -. Writes go to a temp file that is synced and renamed over the old one, so a crash
// or power cut mid-write never leaves half a save.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const VERSION = 1;
const NAME = /^[A-Za-z0-9_-]{1,64}$/;

export function makeServer(o = {}) {
  const data = path.resolve(o.data ?? process.env.FF_DATA ?? '/data');
  const pass = o.password ?? process.env.FF_PASSWORD ?? '';
  const maxB = (o.maxMB ?? (+process.env.FF_MAX_MB || 16)) * 1048576;
  const saves = path.join(data, 'saves'), trash = path.join(data, 'trash');
  const passH = crypto.createHash('sha256').update(pass).digest();
  const authed = req => {
    if (!pass) return true;
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    return !!m && crypto.timingSafeEqual(crypto.createHash('sha256').update(m[1]).digest(), passH);
  };
  const rev = st => st.size.toString(36) + '-' + st.mtimeNs.toString(36);
  const send = (res, code, body, h = {}) => {
    const s = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h });
    res.end(s);
  };
  // past maxB the rest is drained and dropped, so the 413 still reaches the client
  const readBody = req => new Promise((ok, no) => {
    const big = () => Object.assign(new Error('save too large'), { code: 413 });
    if (+req.headers['content-length'] > maxB) { req.resume(); return no(big()); }
    let n = 0; const parts = [];
    req.on('data', c => { n += c.length; if (n <= maxB) parts.push(c); });
    req.on('end', () => n > maxB ? no(big()) : ok(Buffer.concat(parts))); req.on('error', no);
  });
  const stat = f => fs.stat(f, { bigint: true }).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
  // one write at a time per save, so If-Match checks and renames can't interleave
  const locks = new Map();
  const locked = (k, fn) => { const p = (locks.get(k) || Promise.resolve()).then(fn, fn); const t = p.catch(() => {}); locks.set(k, t); t.then(() => { if (locks.get(k) === t) locks.delete(k); }); return p; };

  async function handle(req, res) {
    const u = new URL(req.url, 'http://x'), seg = u.pathname.split('/').filter(Boolean);
    if (seg[0] !== 'api') return send(res, 404, { error: 'not found' });
    if (seg[1] === 'health' && seg.length === 2 && (req.method === 'GET' || req.method === 'HEAD')) return send(res, 200, { ok: true, auth: !!pass, version: VERSION });
    if (seg[1] !== 'saves' || seg.length < 3 || seg.length > 4) return send(res, 404, { error: 'not found' });
    if (!authed(req)) return send(res, 401, { error: 'password needed' }, { 'WWW-Authenticate': 'Bearer' });
    const [player, world] = [seg[2], seg[3]];
    if (!NAME.test(player) || (world !== undefined && !NAME.test(world))) return send(res, 400, { error: 'bad name' });
    const dir = path.join(saves, player);
    if (world === undefined) {
      if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' }, { Allow: 'GET' });
      const names = await fs.readdir(dir).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
      const list = [];
      for (const f of names) {
        if (!f.endsWith('.json') || !NAME.test(f.slice(0, -5))) continue;
        const st = await stat(path.join(dir, f)); if (st) list.push({ world: f.slice(0, -5), size: Number(st.size), rev: rev(st), mtime: st.mtime.toISOString() });
      }
      return send(res, 200, list.sort((a, b) => b.mtime.localeCompare(a.mtime)));
    }
    const file = path.join(dir, world + '.json');
    if (req.method === 'GET') {
      const st = await stat(file); if (!st) return send(res, 404, { error: 'no such save' });
      const buf = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ETag: '"' + rev(st) + '"' });
      return res.end(buf);
    }
    if (req.method === 'PUT') {
      const buf = await readBody(req);
      try { JSON.parse(buf.toString('utf8')); } catch { return send(res, 400, { error: 'body is not JSON' }); }
      return locked(file, async () => {
        const st = await stat(file), want = (req.headers['if-match'] || '').replace(/^W\//, '').replace(/"/g, ''); // gzip makes nginx weaken ETags
        if (want && want !== '*' && (!st || rev(st) !== want)) return send(res, 409, { error: 'save changed elsewhere', rev: st ? rev(st) : null });
        await fs.mkdir(dir, { recursive: true });
        const tmp = file + '.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
        // synced before and after the rename, so a power cut leaves the old save or the whole new one
        try {
          const fh = await fs.open(tmp, 'w');
          try { await fh.writeFile(buf); await fh.sync(); } finally { await fh.close(); }
          await fs.rename(tmp, file);
          const dh = await fs.open(dir, 'r');
          try { await dh.sync(); } finally { await dh.close(); }
        } catch (e) { await fs.rm(tmp, { force: true }).catch(() => {}); throw e; }
        const n = await stat(file);
        return send(res, st ? 200 : 201, { ok: true, rev: rev(n) }, { ETag: '"' + rev(n) + '"' });
      });
    }
    if (req.method === 'DELETE') {
      return locked(file, async () => {
        if (!await stat(file)) return send(res, 404, { error: 'no such save' });
        await fs.mkdir(trash, { recursive: true });
        await fs.rename(file, path.join(trash, player + '.' + world + '.' + Date.now() + '.json'));
        return send(res, 200, { ok: true });
      });
    }
    return send(res, 405, { error: 'method not allowed' }, { Allow: 'GET, PUT, DELETE' });
  }

  return http.createServer((req, res) => handle(req, res).catch(e => {
    if (e.code !== 413) console.error('save server:', e);
    if (!res.headersSent) send(res, e.code === 413 ? 413 : 500, { error: e.code === 413 ? 'save too large' : 'server error' }, e.code === 413 ? { Connection: 'close' } : {});
    else res.destroy();
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = +process.env.FF_PORT || 8787, host = process.env.FF_HOST || '127.0.0.1';
  const srv = makeServer();
  srv.listen(port, host, () => console.log(`save server on ${host}:${port}, saves in ${path.resolve(process.env.FF_DATA || '/data')}` + (process.env.FF_PASSWORD ? '' : ' (no FF_PASSWORD: the API is open to anyone who can reach it)')));
  for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => srv.close(() => process.exit(0)));
}
