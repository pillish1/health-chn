/* ============================================================
   悦动健康 · 本地持久化数据层 v1
   IndexedDB 自动存储 + 历史快照 + localStorage 迁移
   用户完全无感，自动保护数据
   ============================================================ */
(function () {
  'use strict';

  var DB_NAME = 'yuedong-health-db';
  var DB_VERSION = 1;
  var STORE_MAIN = 'main';
  var STORE_SNAPSHOTS = 'snapshots';
  var db = null;

  /* ---------- 打开 IndexedDB ---------- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (db) { resolve(db); return; }
      if (!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_MAIN)) {
          d.createObjectStore(STORE_MAIN, { keyPath: 'key' });
        }
        if (!d.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          d.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'ts' });
        }
      };
      req.onsuccess = function (e) {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  /* ---------- 通用写 ---------- */
  function idbSet(key, value) {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(STORE_MAIN, 'readwrite');
        tx.objectStore(STORE_MAIN).put({ key: key, value: value, ts: Date.now() });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ---------- 通用读 ---------- */
  function idbGet(key) {
    return openDB().then(function (d) {
      return new Promise(function (resolve) {
        var tx = d.transaction(STORE_MAIN, 'readonly');
        var req = tx.objectStore(STORE_MAIN).get(key);
        req.onsuccess = function () { resolve(req.result ? req.result.value : null); };
        req.onerror = function () { resolve(null); };
      });
    });
  }

  /* ---------- 获取所有主数据 ---------- */
  function idbGetAll() {
    return openDB().then(function (d) {
      return new Promise(function (resolve) {
        var tx = d.transaction(STORE_MAIN, 'readonly');
        var req = tx.objectStore(STORE_MAIN).getAll();
        req.onsuccess = function () {
          var map = {};
          (req.result || []).forEach(function (item) {
            map[item.key] = item.value;
          });
          resolve(map);
        };
        req.onerror = function () { resolve({}); };
      });
    });
  }

  /* ---------- 保存快照 ---------- */
  function saveSnapshot() {
    var all = collectAllFromLS();
    if (!all || Object.keys(all).length === 0) return Promise.resolve();
    return openDB().then(function (d) {
      return new Promise(function (resolve) {
        var tx = d.transaction(STORE_SNAPSHOTS, 'readwrite');
        tx.objectStore(STORE_SNAPSHOTS).add({ ts: Date.now(), data: all });
        // 只保留最近 10 个快照
        var countReq = tx.objectStore(STORE_SNAPSHOTS).count();
        tx.oncomplete = function () {
          // 删除多余快照
          trimSnapshots();
          resolve();
        };
      });
    });
  }

  /* 删除多余快照（保留最近 10 个） */
  function trimSnapshots() {
    openDB().then(function (d) {
      var tx = d.transaction(STORE_SNAPSHOTS, 'readwrite');
      var store = tx.objectStore(STORE_SNAPSHOTS);
      var all = store.getAll();
      all.onsuccess = function () {
        var list = (all.result || []).sort(function (a, b) { return b.ts - a.ts; });
        while (list.length > 10) {
          var old = list.pop();
          store.delete(old.ts);
        }
      };
    });
  }

  /* ---------- 从 localStorage 收集全部数据 ---------- */
  function collectAllFromLS() {
    try {
      var Y = window.YDJK;
      if (Y && Y.collectAllData) {
        return Y.collectAllData();
      }
      // 兜底：手动收集
      var data = {};
      try { data.profile = JSON.parse(localStorage.getItem('ydjk:profile')); } catch(e) {}
      try { data.weights = JSON.parse(localStorage.getItem('ydjk:weights')); } catch(e) {}
      try { data.checkins = JSON.parse(localStorage.getItem('ydjk:checkins')); } catch(e) {}
      try { data.favs = JSON.parse(localStorage.getItem('ydjk:favs')); } catch(e) {}
      try { data.mealTemplates = JSON.parse(localStorage.getItem('ydjk:meal-templates')); } catch(e) {}
      data.workouts = {};
      data.mealsAll = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf('ydjk:workouts:') === 0) {
          try { data.workouts[k.replace('ydjk:workouts:', '')] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
        }
        if (k.indexOf('ydjk:meals:') === 0) {
          try { data.mealsAll[k.replace('ydjk:meals:', '')] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
        }
      }
      return data;
    } catch(e) { return null; }
  }

  /* ---------- 从快照恢复 ---------- */
  function restoreFromSnapshot(ts) {
    return openDB().then(function (d) {
      return new Promise(function (resolve) {
        var tx = d.transaction(STORE_SNAPSHOTS, 'readonly');
        var req = tx.objectStore(STORE_SNAPSHOTS).get(ts);
        req.onsuccess = function () {
          var snap = req.result;
          if (snap) {
            restoreDataToLS(snap.data);
            resolve(true);
          } else { resolve(false); }
        };
        req.onerror = function () { resolve(false); };
      });
    });
  }

  /* ---------- 获取快照列表 ---------- */
  function getSnapshots() {
    return openDB().then(function (d) {
      return new Promise(function (resolve) {
        var tx = d.transaction(STORE_SNAPSHOTS, 'readonly');
        var req = tx.objectStore(STORE_SNAPSHOTS).getAll();
        req.onsuccess = function () {
          var list = (req.result || []).sort(function (a, b) { return b.ts - a.ts; });
          resolve(list.map(function (s) { return { ts: s.ts, data: s.data }; }));
        };
        req.onerror = function () { resolve([]); };
      });
    });
  }

  /* ---------- 把数据恢复到 localStorage（兼容现有系统） ---------- */
  function restoreDataToLS(data) {
    try {
      if (!data) return;
      if (data.profile) { try { localStorage.setItem('ydjk:profile', JSON.stringify(data.profile)); } catch(e) {} }
      if (data.weights) { try { localStorage.setItem('ydjk:weights', JSON.stringify(data.weights)); } catch(e) {} }
      if (data.checkins) { try { localStorage.setItem('ydjk:checkins', JSON.stringify(data.checkins)); } catch(e) {} }
      if (data.favs) { try { localStorage.setItem('ydjk:favs', JSON.stringify(data.favs)); } catch(e) {} }
      if (data.mealTemplates) { try { localStorage.setItem('ydjk:meal-templates', JSON.stringify(data.mealTemplates)); } catch(e) {} }
      if (data.workouts) {
        Object.keys(data.workouts).forEach(function (k) {
          try { localStorage.setItem('ydjk:workouts:' + k, JSON.stringify(data.workouts[k])); } catch(e) {}
        });
      }
      if (data.mealsAll) {
        Object.keys(data.mealsAll).forEach(function (k) {
          try { localStorage.setItem('ydjk:meals:' + k, JSON.stringify(data.mealsAll[k])); } catch(e) {}
        });
      }
    } catch(e) {}
  }

  /* ---------- 自动备份：定时保存快照 ---------- */
  var lastSnapshotKey = 'ydjk:last-snapshot';
  var lastSnapshotTime = null;
  try { lastSnapshotTime = localStorage.getItem(lastSnapshotKey); } catch(e) {}

  function maybeAutoSnapshot() {
    // 距上次快照至少 1 小时才再存（避免过于频繁）
    var now = Date.now();
    var gap = lastSnapshotTime ? (now - Number(lastSnapshotTime)) : (24*60*60*1000);
    if (gap < 60*60*1000) return; // 1小时内不重复
    saveSnapshot().then(function () {
      try { localStorage.setItem(lastSnapshotKey, String(now)); } catch(e) {}
    });
  }

  /* ---------- 静默自动导出（每 7 天一次） ---------- */
  var autoExportKey = 'ydjk:last-auto-export';
  function maybeAutoExport() {
    if (window.Capacitor) return; // App(WebView) 里无法可靠触发下载，IndexedDB 快照已承担备份
    var last = null;
    try { last = Number(localStorage.getItem(autoExportKey)); } catch(e) {}
    var now = Date.now();
    if (last && (now - last) < 7*24*60*60*1000) return; // 7天内不重复
    try {
      var data = collectAllFromLS();
      if (!data || Object.keys(data).length === 0) return;
      // 判断是否真正有用户数据（建档或有记录），避免首次空数据触发
      var hasRealData = (data.profile && data.profile.weight) ||
        (data.mealsAll && Object.keys(data.mealsAll).length > 0) ||
        (data.workouts && Object.keys(data.workouts).length > 0);
      if (!hasRealData) return;
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '悦动健康自动备份-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
      try { localStorage.setItem(autoExportKey, String(now)); } catch(e) {}
    } catch(e) {}
  }

  /* ---------- 初始化 ---------- */
  function init() {
    // 1. 打开 IndexedDB
    openDB().then(function () {
      // 2. 自动迁移 localStorage 数据到 IndexedDB
      var all = collectAllFromLS();
      if (all && Object.keys(all).length > 0) {
        // 把主数据写入 IndexedDB
        idbSet('main-data', all).then(function () {
          // 3. 保存首次快照
          saveSnapshot();
        });
      }
      // 4. 定时快照（防抖，仅当数据有变化时触发）
      setInterval(maybeAutoSnapshot, 30*60*1000); // 每30分钟检查一次
      // 5. 每7天自动导出一次
      setTimeout(maybeAutoExport, 5000); // 5秒后首次尝试
      setInterval(maybeAutoExport, 24*60*60*1000); // 每天检查
    }).catch(function () {
      // IndexedDB 不可用则静默降级到 localStorage（不影响使用）
      if (window.console) console.warn('IndexedDB unavailable, using localStorage only');
    });
  }

  /* ---------- 暴露 API ---------- */
  window.YDB = {
    init: init,
    saveSnapshot: saveSnapshot,
    getSnapshots: getSnapshots,
    restoreFromSnapshot: restoreFromSnapshot,
    maybeAutoSnapshot: maybeAutoSnapshot,
    maybeAutoExport: maybeAutoExport
  };
})();
