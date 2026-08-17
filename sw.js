/* ============================================================
   悦动健康 · Service Worker v3（离线缓存 + 自动更新）
   ============================================================ */
var CACHE = 'yuedong-health-v44';
var ASSETS = [
  './',
  './index.html',
  './bmi.html',
  './calorie.html',
  './plans.html',
  './foods.html',
  './tracker.html',
  './articles.html',
  './discover.html',
  './about.html',
  './login.html',
  './profile.html',
  './admin.html',
  './publish.html',
  './404.html',
  './manifest.json',
  './assets/css/style.css?v=44',
  './assets/js/storage.js?v=44',
  './assets/js/data.js?v=44',
  './assets/js/charts.js?v=44',
  './assets/js/app.js?v=44',
  './assets/js/supabase-config.js?v=44',
  './assets/js/pages/home.js?v=44',
  './assets/js/pages/bmi.js?v=44',
  './assets/js/pages/calorie.js?v=44',
  './assets/js/pages/plans.js?v=44',
  './assets/js/pages/foods.js?v=44',
  './assets/js/pages/tracker.js?v=44',
  './assets/js/pages/articles.js?v=44',
  './assets/js/pages/login.js?v=44',
  './assets/js/pages/profile.js?v=44',
  './assets/js/pages/admin.js?v=44',
  './assets/js/pages/data-manage.js?v=44',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
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
      return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
    })
  );
});
