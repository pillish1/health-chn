/* ============================================================
   悦动健康 · Service Worker（离线缓存 + 自动更新）
   ============================================================ */
var CACHE = 'yuedong-health-v75';
var ASSETS = [
  './',
  './index.html',
  './foods.html',
  './plans.html',
  './profile.html',
  './login.html',
  './welcome.html',
  './about.html',
  './404.html',
  './manifest.json',
  './assets/css/style.css?v=90',
  './assets/js/supabase-config.js?v=90',
  './assets/js/storage.js?v=90',
  './assets/js/data.js?v=90',
  './assets/js/charts.js?v=90',
  './assets/js/app.js?v=90',
  './assets/js/pages/home.js?v=90',
  './assets/js/pages/foods.js?v=90',
  './assets/js/pages/plans.js?v=90',
  './assets/js/pages/login.js?v=90',
  './assets/js/pages/profile.js?v=90',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (e) {
  // 逐条预缓存：个别资源 404 不影响整体安装（避免旧版引用已删除页面导致 install 失败）
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 网络优先，失败回退缓存（保证更新可见 + 离线可用）
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});