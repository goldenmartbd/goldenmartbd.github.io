/* সার্ভিস ওয়ার্কার: নেটওয়ার্ক আগে, না পেলে সেভ করা কপি। API ও ফন্ট কখনো সেভ হয় না। */
var V = 'gm-v4';
var CORE = ['./', 'index.html', 'admin.html', 'theme.css', 'store.css', 'admin.css', 'config.js', 'core.js', 'api.js', 'store.js', 'admin.js', 'pwa.js', 'version.js', 'logo.png', 'icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(r).then(function (m) { return m || (r.mode === 'navigate' ? caches.match('index.html') : undefined); });
  }));
});
