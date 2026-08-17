/* ============================================================
   悦动健康 · Service Worker 清理器
   一次性运行：清空所有旧缓存 → 自我注销 → 页面恢复直连（永远最新）
   ============================================================ */
var CACHE = 'yuedong-health-v17';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () {
      // 清理完成后注销自己
      return self.registration.unregister();
    }).then(function () {
      return self.clients.matchAll().then(function (clients) {
        clients.forEach(function (c) { c.postMessage({ type: 'SW_CLEANED' }); });
      });
    })
  );
});

// 不拦截任何请求，页面直连服务器
self.addEventListener('fetch', function () {});
