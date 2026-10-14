// Checks a running self-hosting image (CI's image job in test.yml): node tools/check-image.mjs <url> <password>
// The game and its hashed bundles are served with the right types and cache headers, and a save goes through
// nginx to the save server and back.
const [base = 'http://localhost:8080', pw = ''] = process.argv.slice(2);
const fail = m => { console.error('FAIL: ' + m); process.exit(1); };
const want = (c, m) => c || fail(m);
for (let i = 0; ; i++) { // wait for the container to come up
  try { if ((await fetch(base + '/api/health')).ok) break; } catch {}
  if (i > 60) fail('no answer from ' + base); await new Promise(r => setTimeout(r, 1000));
}
const h = await (await fetch(base + '/api/health')).json();
want(h.ok && h.auth === !!pw, 'health ' + JSON.stringify(h));
let r = await fetch(base + '/');
const html = await r.text();
want(r.ok && /text\/html/.test(r.headers.get('content-type')) && r.headers.get('cache-control') === 'no-cache', 'index.html headers');
const js = /src="\.?\/?(assets\/[^"]+\.js)"/.exec(html)?.[1]; want(js, 'no bundle named in index.html');
r = await fetch(base + '/' + js);
want(r.ok && /javascript/.test(r.headers.get('content-type')) && /immutable/.test(r.headers.get('cache-control')), js + ' headers');
want((await fetch(base + '/api/saves/ci')).status === 401 || !pw, 'saves open without the password');
const auth = { Authorization: 'Bearer ' + pw }, body = JSON.stringify({ v: 4, x: 'a'.repeat(2e6) });
r = await fetch(base + '/api/saves/ci/w1', { method: 'PUT', headers: auth, body });
want(r.ok, 'PUT ' + r.status);
r = await fetch(base + '/api/saves/ci/w1', { headers: auth });
want(r.ok && (await r.text()) === body, 'save read back');
want((await (await fetch(base + '/api/saves/ci', { headers: auth })).json())[0]?.world === 'w1', 'save listed');
console.log('image OK: game, cache headers and saves');
