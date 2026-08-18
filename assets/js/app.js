/* ============================================================
   悦动健康 · 通用 UI app.js
   主题切换 / 导航 / Toast / Modal / 档案引导 / 动效
   ============================================================ */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  /* ---------- 主题 ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
    // 仅显式选择时写入存储（auto 模式不落盘）
    if (t === 'dark' || t === 'light') {
      if (window.YDJK) YDJK.setTheme(t);
    }
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('ydjk:theme'); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var t = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
    if (btn) btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(cur);
    });
  }

  /* ---------- 导航高亮 + 移动端菜单 ---------- */
  function initNav() {
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path) a.classList.add('active');
    });
    var toggle = document.getElementById('navToggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () { links.classList.toggle('open'); });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') links.classList.remove('open');
      });
    }
  }

  /* ---------- 自定义确认框（替代原生 confirm） ---------- */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'modal-overlay';
      ov.style.display = 'flex';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      var iconWrap = opts.danger ? '<span class="m-icon red">⚠️</span>' : (opts.icon ? '<span class="m-icon">' + opts.icon + '</span>' : '<span class="m-icon">❓</span>');
      ov.innerHTML = '<div class="modal confirm-modal">' +
        '<div class="modal-header">' + iconWrap +
        '<div><div class="modal-title">' + (opts.title || '确认操作') + '</div>' +
        (opts.message ? '<div class="modal-sub">' + opts.message + '</div>' : '') + '</div></div>' +
        '<div class="modal-actions">' +
        '<button class="btn btn-ghost js-confirm-cancel">' + (opts.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + ' js-confirm-ok">' + (opts.okText || '确认') + '</button>' +
        '</div></div>';
      document.body.appendChild(ov);
      document.body.classList.add('modal-open');
      function done(val) {
        ov.remove();
        if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open');
        resolve(val);
      }
      ov.addEventListener('click', function (e) { if (e.target === ov) done(false); });
      ov.querySelector('.js-confirm-cancel').addEventListener('click', function () { done(false); });
      ov.querySelector('.js-confirm-ok').addEventListener('click', function () { done(true); });
      function escHandler(e) {
        if (e.key === 'Escape') { done(false); }
      }
      document.addEventListener('keydown', escHandler);
      setTimeout(function () { var b = ov.querySelector('.js-confirm-ok'); if (b) b.focus(); }, 60);
      // 确保 done 后移除监听（done 里已处理）
      var _origDone = done;
      function doneWrap(val) { document.removeEventListener('keydown', escHandler); _origDone(val); }
      done = doneWrap;
    });
  }

  /* ---------- 自定义输入弹窗（替代原生 prompt） ---------- */
  function promptDialog(opts) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'modal-overlay';
      ov.style.display = 'flex';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = '<div class="modal confirm-modal">' +
        '<div class="modal-header"><span class="m-icon">🔑</span>' +
        '<div><div class="modal-title">' + (opts.title || '请输入') + '</div>' +
        (opts.message ? '<div class="modal-sub">' + opts.message + '</div>' : '') + '</div></div>' +
        '<input class="input" type="' + (opts.type || 'text') + '" id="promptInput" placeholder="' + (opts.placeholder || '') + '" style="margin-bottom:6px" autocomplete="off">' +
        '<div class="modal-actions">' +
        '<button class="btn btn-ghost js-confirm-cancel">' + (opts.cancelText || '取消') + '</button>' +
        '<button class="btn btn-primary js-confirm-ok">' + (opts.okText || '确定') + '</button>' +
        '</div></div>';
      document.body.appendChild(ov);
      document.body.classList.add('modal-open');
      var input = ov.querySelector('#promptInput');
      function finish(val) {
        ov.remove();
        document.removeEventListener('keydown', handler);
        if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open');
        resolve(val);
      }
      function handler(e) {
        if (e.key === 'Escape') finish(null);
        if (e.key === 'Enter') finish(input.value);
      }
      document.addEventListener('keydown', handler);
      ov.addEventListener('click', function (e) { if (e.target === ov) finish(null); });
      ov.querySelector('.js-confirm-cancel').addEventListener('click', function () { finish(null); });
      ov.querySelector('.js-confirm-ok').addEventListener('click', function () { finish(input.value); });
      setTimeout(function () { input.focus(); }, 60);
    });
  }

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    // 最多同时显示 3 条
    while (wrap.children.length >= 3) wrap.firstChild.remove();
    var t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    t.title = '点击关闭';
    t.style.cursor = 'pointer';
    t.addEventListener('click', function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .25s';
      setTimeout(function () { t.remove(); }, 260);
    });
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(function () { t.remove(); }, 320);
    }, 3200);
  }

  /* ---------- Modal ---------- */
  function openModal(id) {
    var m = document.getElementById(id);
    if (m) {
      m.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (m) {
      m.classList.remove('show');
      if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open');
    }
  }
  function closeOverlay(ov) {
    if (ov) ov.classList.remove('show');
    // 用户主动关闭建档弹窗时记录（避免每次进入都自动弹出）
    if (ov && ov.id === 'onboardModal' && !YDJK.isOnboarded()) {
      try { localStorage.setItem('ydjk:onboard-dismissed', '1'); } catch (e) {}
    }
    // 统一清理滚动锁定：没有其他打开中的弹窗时恢复页面滚动
    if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open');
  }
  function initModals() {
    // 事件委托：点击遮罩空白处关闭（对静态与动态弹窗都生效）
    document.addEventListener('click', function (e) {
      var ov = e.target;
      if (ov && ov.classList && ov.classList.contains('modal-overlay') && ov.classList.contains('show')) {
        closeOverlay(ov);
      }
    });
    // 为静态弹窗统一注入右上角 ✕ 关闭按钮
    document.querySelectorAll('.modal-overlay').forEach(function (ov) {
      var box = ov.querySelector('.modal');
      if (box && !box.querySelector('.modal-close')) {
        var x = document.createElement('button');
        x.className = 'modal-close';
        x.setAttribute('aria-label', '关闭');
        x.innerHTML = '✕';
        x.onclick = function () { closeOverlay(ov); };
        box.appendChild(x);
      }
    });
    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeOverlay(btn.closest('.modal-overlay'));
      });
    });
    document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-open-modal'));
      });
    });
    // ESC 键关闭所有打开中的弹窗
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(function (ov) {
          closeOverlay(ov);
        });
      }
    });
  }

  /* ---------- 档案引导（未建档时弹窗） ---------- */
  function buildProfileForm(profile) {
    var p = profile || {};
    var goals = DATA.GOALS.map(function (g) {
      var checked = (p.goal || 'keep') === g.id ? ' checked' : '';
      return '<div class="radio-pill"><input type="radio" name="goal" id="goal-' + g.id + '" value="' + g.id + '"' + checked + '><label for="goal-' + g.id + '"><span class="emoji">' + g.emoji + '</span>' + g.label + '</label></div>';
    }).join('');
    var levels = DATA.ACTIVITY_LEVELS.map(function (l) {
      var sel = (p.activity || 'moderate') === l.id ? ' selected' : '';
      return '<option value="' + l.id + '"' + sel + '>' + l.label + '（' + l.factor + '）</option>';
    }).join('');
    var male = p.gender !== 'female';
    return '<div class="form-section">👤 基本信息</div><div class="field"><label>性别</label><div class="radio-group">' +
      '<div class="radio-pill"><input type="radio" name="gender" id="g-male" value="male"' + (male ? ' checked' : '') + '><label for="g-male"><span class="emoji">👨</span>男</label></div>' +
      '<div class="radio-pill"><input type="radio" name="gender" id="g-female" value="female"' + (!male ? ' checked' : '') + '><label for="g-female"><span class="emoji">👩</span>女</label></div></div></div>' +
      '<div class="grid grid-2" style="gap:14px"><div class="field"><label>年龄</label><input class="input" type="number" id="pf-age" min="10" max="100" value="' + (p.age || 25) + '"></div>' +
      '<div class="field"><label>身高 (cm)</label><input class="input" type="number" id="pf-height" min="80" max="250" value="' + (p.height || 170) + '"></div></div>' +
      '<div class="field"><label>当前体重 (kg)</label><input class="input" type="number" id="pf-weight" min="20" max="300" step="0.1" value="' + (p.weight || 60) + '"></div>' +
      '<div class="form-section">🎯 健康目标</div><div class="field"><label>你的目标</label><div class="radio-group">' + goals + '</div></div>' +
      '<div class="field"><label>日常活动水平</label><select class="input" id="pf-activity">' + levels + '</select></div>';
  }

  /* 打开档案编辑器（新建/编辑共用，根据是否已有档案自适应） */
  function openProfileEditor() {
    var modal = document.getElementById('onboardModal');
    if (!modal) { toast('建档入口仅在首页和健康追踪页可用', 'err'); return; }
    var existing = YDJK.getProfile();
    var formWrap = document.getElementById('onboardForm');
    formWrap.innerHTML = buildProfileForm(existing);
    bindProfileForm(formWrap);
    var title = modal.querySelector('.modal-title');
    if (title) title.textContent = existing ? '✏️ 编辑健康档案' : '👋 欢迎来到悦动健康';
    var sub = modal.querySelector('.modal-sub');
    if (sub) sub.textContent = existing ? '修改信息后，全站的健康计算与推荐会同步更新' : '先花 30 秒建立你的健康档案，之后所有计算与推荐将为你量身定制';
    var btn = modal.querySelector('button[type=submit]');
    if (btn) btn.textContent = existing ? '保存修改 →' : '保存档案，开始使用 →';
    openModal('onboardModal');
  }

  /* 档案表单提交（内联 onclick 调用，绝对可靠） */
  function submitProfileForm() {
    var form = document.getElementById('onboardForm');
    if (!form) return;
    var age = Number(document.getElementById('pf-age').value);
    var height = Number(document.getElementById('pf-height').value);
    var weight = Number(document.getElementById('pf-weight').value);
    if (!age || !height || !weight || height < 80 || weight < 20) {
      toast('请填写有效的身高体重', 'err');
      return;
    }
    var gender = form.querySelector('input[name=gender]:checked').value;
    var goal = form.querySelector('input[name=goal]:checked').value;
    var activity = document.getElementById('pf-activity').value;
    var existing = YDJK.getProfile();
    var isEdit = !!existing;
    var profile = {
      gender: gender, age: age, height: height, weight: weight,
      goal: goal, activity: activity,
      createdAt: (existing && existing.createdAt) || new Date().toISOString()
    };
    YDJK.saveProfile(profile);
    var today = YDJK.today();
    var hasToday = YDJK.getWeights().some(function (w) { return w.date === today; });
    if (!hasToday) YDJK.addWeight(today, weight);
    closeModal('onboardModal');
    toast(isEdit ? '✅ 健康档案已更新' : '✅ 健康档案已建立');
    if (typeof window.onProfileSaved === 'function') window.onProfileSaved(profile);
    if (!isEdit && window.location.pathname.split('/').pop() === 'index.html') {
      setTimeout(function () { location.href = 'tracker.html'; }, 800);
    }
  }

  /* 绑定档案表单提交 */
  function bindProfileForm(form) {
    form.onsubmit = function (e) {
      e.preventDefault();
      submitProfileForm();
    };
  }

  function initOnboarding(force) {
    // 全新用户引导：无档案无数据且未跳过 → 跳欢迎页
    if (force !== true) {
      var hasAnyData = false;
      try {
        hasAnyData = !!window.YDJK.getProfile() || window.YDJK.getWeights().length > 0 || Object.keys(window.YDJK.getCheckins() || {}).length > 0;
        for (var i = 0; i < localStorage.length; i++) { if ((localStorage.key(i) || '').indexOf('ydjk:meals:') === 0) { hasAnyData = true; break; } }
      } catch (e) {}
      var page = location.pathname.split('/').pop() || 'index.html';
      var hasSetup = location.search.indexOf('setup=1') >= 0;
      var skipped = false;
      try { skipped = localStorage.getItem('ydjk:onboard-dismissed') === '1'; } catch (e) {}
      if (!hasAnyData && !skipped && !hasSetup && page !== 'welcome.html' && page !== 'login.html') {
        location.href = 'welcome.html';
        return;
      }
    }

    var modal = document.getElementById('onboardModal');
    if (!modal) return;
    // 自动弹出仅首次访问；主动打开（force）不受限
    var skipped = false;
    try { skipped = localStorage.getItem('ydjk:onboard-dismissed') === '1'; } catch (e) {}
    var need = force === true || (!YDJK.isOnboarded() && !skipped);
    if (!need) return;
    var formWrap = document.getElementById('onboardForm');
    if (formWrap && !formWrap.dataset.built) {
      formWrap.innerHTML = buildProfileForm();
      formWrap.dataset.built = '1';
    }
    var form = document.getElementById('onboardForm');
    if (form) {
      bindProfileForm(form);
    }
    setTimeout(function () { openModal('onboardModal'); }, force ? 0 : 500);
  }

  /* ---------- 移动端搜索入口 ---------- */
  function initMSearch() {
    var s = document.querySelector('.m-search');
    if (!s) return;
    s.addEventListener('click', function () {
      // 打开全局搜索
      var ov = document.getElementById('searchModal');
      if (ov) {
        openModal('searchModal');
        setTimeout(function () { var i = document.getElementById('searchInput'); if (i) i.focus(); }, 80);
      } else {
        // 没有搜索面板则跳发现页
        location.href = 'discover.html';
      }
    });
  }

  /* ---------- 通知与提醒（PWA/App 双端） ---------- */
  var notifTimer = null;
  var lastFired = {};
  function capNotifPlugin() {
    try {
      var cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      return cap || null;
    } catch (e) { return null; }
  }
  function notifSupported() {
    if (capNotifPlugin()) return true;
    return 'Notification' in window;
  }
  function initNotifications() {
    if (!notifSupported()) return;
    if (capNotifPlugin()) { scheduleReminders(); return; }
    if (Notification.permission === 'granted') scheduleReminders();
  }
  function requestNotifPermission() {
    if (!notifSupported()) { YDJK_UI.toast('当前环境不支持通知', 'err'); return false; }
    var cap = capNotifPlugin();
    if (cap) {
      cap.requestPermissions().then(function (res) {
        if (res && (res.display === 'granted' || res.display === true)) {
          YDJK_UI.toast('✅ 通知已开启，记得设置提醒');
          scheduleReminders();
        } else {
          YDJK_UI.toast('❌ 通知被拒绝，可在系统设置中开启', 'err');
        }
      }).catch(function () {
        YDJK_UI.toast('✅ 通知已开启');
        scheduleReminders();
      });
      return true;
    }
    if (Notification.permission === 'granted') { YDJK_UI.toast('✅ 通知已开启'); return true; }
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') {
        YDJK_UI.toast('✅ 通知已开启，记得设置提醒');
        scheduleReminders();
      } else {
        YDJK_UI.toast('❌ 通知被拒绝，可在浏览器设置中开启', 'err');
      }
    });
    return true;
  }
  function fireNotif(title, body, key) {
    if (!notifSupported()) return;
    var nowTs = Date.now();
    if (key && lastFired[key] && nowTs - lastFired[key] < 30 * 60 * 1000) return;
    if (key) lastFired[key] = nowTs;
    var cap = capNotifPlugin();
    if (cap) {
      try {
        cap.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 100000),
            title: title,
            body: body,
            smallIcon: 'ic_stat_icon',
            iconColor: '#3b82f6'
          }]
        });
        return;
      } catch (e) {}
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      var n = new Notification(title, { body: body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (e) {}
  }
  /* 定时提醒（喝水/打卡/用餐）——基于可配置时段
     App（Capacitor）：原生排程，系统级触发（后台/锁屏也能提醒）
     Web（PWA）：轮询兜底 */
  function scheduleReminders() {
    if (notifTimer) { clearInterval(notifTimer); notifTimer = null; }
    var cfg = getReminderCfg();
    if (!cfg.enabled) return;
    var cap = capNotifPlugin();
    // App：取消旧排程，计算未来 48 小时内的提醒时间点，一次性排程
    if (cap) {
      try {
        cap.cancel({ notifications: [{ id: 9001 }, { id: 9002 }, { id: 9003 }] });
        var scheduleList = buildScheduleList(cfg);
        if (scheduleList.length) {
          cap.schedule({ notifications: scheduleList });
        }
        return; // App 端依赖原生排程，无需轮询
      } catch (e) {}
    }
    // Web：每 30 秒轮询（PWA 前台运行）
    notifTimer = setInterval(function () {
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var t = h * 60 + m;
      if (cfg.water) {
        var ws = (typeof cfg.waterStart === 'number' ? cfg.waterStart : 9) * 60;
        var we = (typeof cfg.waterEnd === 'number' ? cfg.waterEnd : 21) * 60;
        var wInt = (typeof cfg.waterInterval === 'number' && cfg.waterInterval > 0 ? cfg.waterInterval : 2) * 60;
        if (t >= ws && t <= we && (t - ws) % wInt === 0) {
          var today = YDJK.today();
          var water = YDJK.getWater(today);
          var goal = YDJK.getWaterGoal();
          if (water < goal) fireNotif('💧 该喝水啦', '今日饮水 ' + water + '/' + goal + ' ml，记得补水', 'water');
        }
      }
      if (cfg.checkin) {
        var ch = typeof cfg.checkinHour === 'number' ? cfg.checkinHour : 20;
        if (h === ch && m === 0) {
          var c = YDJK.getCheckin(YDJK.today());
          var done = c && ((c.types && c.types.length) || c.plan || (c.minutes && c.minutes > 0));
          if (!done) fireNotif('🏃 今天还没运动', '来 30 分钟运动，完成今天的打卡吧', 'checkin');
        }
      }
      if (cfg.meal) {
        var mealTimes = { 7: '早餐', 12: '午餐', 18: '晚餐' };
        if (mealTimes[h] && m === 0) fireNotif('🍽️ ' + mealTimes[h] + '时间', '记得记录今天的' + mealTimes[h] + '，营养均衡很重要', 'meal-' + h);
      }
    }, 30000);
  }
  /* 构建未来 48 小时的原生提醒排程列表 */
  function buildScheduleList(cfg) {
    var list = [];
    var start = new Date();
    var end = new Date(start.getTime() + 48 * 3600 * 1000);
    var ts = start.getTime();
    var step = 30 * 60 * 1000;
    var idBase = 9100;
    for (var t = ts; t <= end.getTime(); t += step) {
      var d = new Date(t);
      var h = d.getHours();
      var m = d.getMinutes();
      var min = h * 60 + m;
      var at = null;
      var title = '';
      var body = '';
      if (cfg.water) {
        var ws = (typeof cfg.waterStart === 'number' ? cfg.waterStart : 9);
        var we = (typeof cfg.waterEnd === 'number' ? cfg.waterEnd : 21);
        var wInt = (typeof cfg.waterInterval === 'number' && cfg.waterInterval > 0 ? cfg.waterInterval : 2);
        if (m === 0 && min >= ws * 60 && min <= we * 60 && (min - ws * 60) % (wInt * 60) === 0) {
          at = t; title = '💧 该喝水啦'; body = '起来喝杯水，保持水分充足';
        }
      }
      if (!at && cfg.checkin && h === (typeof cfg.checkinHour === 'number' ? cfg.checkinHour : 20) && m === 0) {
        at = t; title = '🏃 今天还没运动'; body = '来 30 分钟运动，完成今天的打卡吧';
      }
      if (!at && cfg.meal) {
        var mealTimes = { 7: ['🍽️ 早餐时间', '记得记录今天的早餐'], 12: ['🍽️ 午餐时间', '记得记录今天的午餐'], 18: ['🍽️ 晚餐时间', '记得记录今天的晚餐'] };
        if (mealTimes[h] && m === 0) { at = t; title = mealTimes[h][0]; body = mealTimes[h][1]; }
      }
      if (at) {
        list.push({ id: idBase + (at / step), title: title, body: body, schedule: { at: new Date(at) }, smallIcon: 'ic_stat_icon', iconColor: '#3b82f6' });
      }
    }
    return list;
  }
  function getReminderCfg() {
    try { return JSON.parse(localStorage.getItem('ydjk:reminders') || '{"enabled":false,"water":true,"checkin":true,"meal":false,"waterStart":9,"waterEnd":21,"waterInterval":2,"checkinHour":20}'); }
    catch (e) { return { enabled: false, water: true, checkin: true, meal: false, waterStart: 9, waterEnd: 21, waterInterval: 2, checkinHour: 20 }; }
  }
  function setReminderCfg(cfg) {
    try { localStorage.setItem('ydjk:reminders', JSON.stringify(cfg)); } catch (e) {}
    scheduleReminders();
  }
  /* ---------- 底部 Tab 导航 ---------- */
  function initTabBar() {
    var path = location.pathname.split('/').pop() || 'index.html';
    var map = { 'index.html': 'home', 'discover.html': 'discover', 'tracker.html': 'tracker', 'profile.html': 'profile' };
    var active = map[path];
    document.querySelectorAll('.tab-item').forEach(function (t) {
      if (t.dataset.tab === active) t.classList.add('active');
    });
    var plus = document.getElementById('tabPlusBtn');
    if (plus) plus.addEventListener('click', function () { openModal('quickModal'); });
    // 锚点滚动（tracker#workout / #weight）
    if (path === 'tracker.html' && location.hash) {
      var target = location.hash.slice(1);
      setTimeout(function () {
        var el = target === 'workout' ? document.querySelector('.card .card-title') : null;
        if (target === 'workout' && document.getElementById('todayCheckin')) {
          document.getElementById('todayCheckin').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (target === 'weight' && document.getElementById('weightInput')) {
          document.getElementById('weightInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }

  /* 移动端顶部头像按钮（mProfileBtn） */
  function updateMobileProfileBtn(avatarUrl, display, logged) {
    var mp = document.getElementById('mProfileBtn');
    if (!mp) return;
    if (logged && avatarUrl) {
      mp.innerHTML = '<img src="' + avatarUrl + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block">';
      mp.style.padding = '0';
      mp.style.width = '36px';
      mp.style.height = '36px';
      mp.style.display = 'grid';
      mp.style.placeItems = 'center';
    } else if (logged) {
      mp.innerHTML = '<span style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;display:grid;place-items:center;font-size:.9rem;font-weight:800">' + ((display || '?').charAt(0) || '?').toUpperCase() + '</span>';
      mp.style.padding = '0';
      mp.style.width = '36px';
      mp.style.height = '36px';
      mp.style.display = 'grid';
      mp.style.placeItems = 'center';
    } else {
      mp.innerHTML = '👤';
      mp.style.padding = '';
      mp.style.width = '';
      mp.style.height = '';
      mp.style.display = '';
    }
    mp.title = logged ? (display + ' · 我的') : '登录 / 注册';
    mp.onclick = function () { location.href = logged ? 'profile.html' : 'login.html'; };
  }

  /* ---------- 登录状态导航 ---------- */
  function initAuthNav() {
    var actions = document.querySelector('.nav-actions');
    if (!actions || actions.querySelector('.js-auth-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'icon-btn js-auth-btn';
    btn.title = '登录';
    btn.setAttribute('aria-label', '登录');
    actions.insertBefore(btn, actions.firstChild);
    function render() {
      var cloud = window.YD_CLOUD;
      if (cloud && cloud.isLoggedIn()) {
        var user = cloud.currentUser();
        var email = (user && user.email) || '用户';
        var nick = '';
        try { nick = localStorage.getItem('ydjk:nickname') || ''; } catch (e) {}
        var avatarUrl = '';
        try { avatarUrl = localStorage.getItem('ydjk:avatar') || ''; } catch (e) {}
        function updateBtn() {
          var display = nick || (email || '用').split('@')[0];
          if (avatarUrl) {
            btn.innerHTML = '<img src="' + avatarUrl + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block">';
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.width = '40px';
            btn.style.height = '40px';
          } else {
            btn.innerHTML = '<span style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;display:grid;place-items:center;font-size:.95rem;font-weight:800">' + (display.charAt(0) || '?').toUpperCase() + '</span>';
            btn.style.padding = '0';
            btn.style.border = 'none';
          }
          btn.title = display + '（' + email + '）· 点击管理账号';
        }
        updateBtn();
        updateMobileProfileBtn(avatarUrl, nick || (email || '用').split('@')[0], true);
        // 从云端加载昵称/头像
        if (cloud.loadProfile) {
          cloud.loadProfile().then(function (p) {
            if (p) {
              if (p.nickname) { try { localStorage.setItem('ydjk:nickname', p.nickname); } catch (e) {} nick = p.nickname; }
              if (p.avatar_url) { try { localStorage.setItem('ydjk:avatar', p.avatar_url); } catch (e) {} avatarUrl = p.avatar_url; }
              updateBtn();
            }
          }).catch(function () {});
        }
        btn.onclick = function () { location.href = 'profile.html'; };
      } else {
        btn.innerHTML = '👤';
        btn.title = '登录 / 注册';
        btn.onclick = function () { location.href = 'login.html'; };
        updateMobileProfileBtn('', '', false);
      }
    }
    render();
    // 登录状态变化时刷新（登录页跳转回来）
    window.addEventListener('storage', function (e) {
      if (e.key === 'ydjk:session' || e.key === 'ydjk:cloud-logged') render();
    });
  }

  /* ---------- PWA 安装引导 ---------- */
  var deferredInstallPrompt = null;
  function initInstallPrompt() {
    if (typeof window.addEventListener !== 'function') return;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      // 已被关闭过则不再提示
      var dismissed = false;
      try { dismissed = localStorage.getItem('ydjk:install-dismissed') === '1'; } catch (err) {}
      if (dismissed) return;
      var bar = document.createElement('div');
      bar.className = 'install-bar';
      bar.innerHTML = '<span class="ib-icon">📲</span><span class="ib-text"><b>把悦动健康添加到主屏幕</b><br><small>像 App 一样使用，离线也能看</small></span>' +
        '<button class="btn btn-primary btn-sm ib-install">安装</button>' +
        '<button class="btn btn-ghost btn-sm ib-close" aria-label="关闭">✕</button>';
      document.body.appendChild(bar);
      bar.querySelector('.ib-install').onclick = function () {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.then(function () {
            bar.remove();
            try { localStorage.setItem('ydjk:install-dismissed', '1'); } catch (err) {}
          });
        }
      };
      bar.querySelector('.ib-close').onclick = function () {
        bar.remove();
        try { localStorage.setItem('ydjk:install-dismissed', '1'); } catch (err) {}
      };
      // 8 秒后自动隐藏
      setTimeout(function () {
        if (bar.parentNode) { bar.remove(); try { localStorage.setItem('ydjk:install-dismissed', '1'); } catch (err) {} }
      }, 8000);
    });
  }

  /* ---------- 全站搜索 ---------- */
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function doSearch() {
    var inp = document.getElementById('searchInput');
    var box = document.getElementById('searchResults');
    if (!inp || !box) return;
    var q = inp.value.trim().toLowerCase();
    if (!q) {
      box.innerHTML = '<div class="empty"><div class="e-icon">🔍</div><div class="e-title">输入关键词开始搜索</div><div class="e-desc">支持食物热量、训练动作、健康文章</div></div>';
      return;
    }
    var D = window.YDJK_DATA;
    if (!D) { box.innerHTML = '<div class="empty"><div class="e-title">数据未就绪</div></div>'; return; }
    var foods = D.FOODS.filter(function (f) { return f.name.toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    var acts = D.ACTIONS.filter(function (a) { return a.name.toLowerCase().indexOf(q) !== -1 || a.desc.toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    var arts = D.ARTICLES.filter(function (a) { return (a.title + a.excerpt).toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    var html = '';
    if (foods.length) html += '<div class="search-group"><b class="search-group-title">🥗 食物</b>' + foods.map(function (f) {
      return '<a class="list-row" href="foods.html"><div class="lr-main"><b class="small">' + escHtml(f.name) + '</b><span class="lr-sub">' + f.cat + ' · ' + f.kcal + ' kcal/100g</span></div><span class="tag gray">去查看 →</span></a>';
    }).join('') + '</div>';
    if (acts.length) html += '<div class="search-group"><b class="search-group-title">🏋️ 动作</b>' + acts.map(function (a) {
      return '<a class="list-row" href="plans.html"><div class="lr-main"><b class="small">' + escHtml(a.name) + '</b><span class="lr-sub">' + escHtml(a.sets) + '</span></div><span class="tag gray">去查看 →</span></a>';
    }).join('') + '</div>';
    if (arts.length) html += '<div class="search-group"><b class="search-group-title">📖 文章</b>' + arts.map(function (a) {
      return '<a class="list-row" href="articles.html#article-' + a.id + '"><div class="lr-main"><b class="small">' + escHtml(a.title) + '</b></div><span class="tag gray">去阅读 →</span></a>';
    }).join('') + '</div>';
    if (!html) html = '<div class="empty"><div class="e-icon">🤔</div><div class="e-title">没有找到「' + escHtml(q) + '」</div><div class="e-desc">换个关键词试试</div></div>';
    box.innerHTML = html;
  }
  function initSearch() {
    var actions = document.querySelector('.nav-actions');
    if (!actions || document.getElementById('globalSearchBtn')) return;
    // 注入搜索按钮（导航最左）
    var btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.id = 'globalSearchBtn';
    btn.innerHTML = '🔍';
    btn.title = '全站搜索（Ctrl+K）';
    btn.setAttribute('aria-label', '全站搜索');
    actions.insertBefore(btn, actions.firstChild);
    // 注入搜索面板
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'searchModal';
    ov.innerHTML = '<div class="modal" style="max-width:640px;padding:24px">' +
      '<div class="modal-header"><span class="m-icon purple">🔍</span><div><div class="modal-title">全站搜索</div><div class="modal-sub">搜索食物、训练动作、健康知识 · Ctrl+K 快速唤起</div></div></div>' +
      '<div class="search-box" style="margin:0 0 14px"><span class="s-ico">🔍</span><input class="input" id="searchInput" placeholder="输入关键词，如：鸡胸肉、深蹲、热身…"></div>' +
      '<div id="searchResults" style="max-height:44vh;overflow-y:auto"></div></div>';
    document.body.appendChild(ov);
    // ✕ 关闭按钮（动态弹窗手动注入）
    var box = ov.querySelector('.modal');
    var x = document.createElement('button');
    x.className = 'modal-close';
    x.setAttribute('aria-label', '关闭');
    x.innerHTML = '✕';
    x.onclick = function () { closeOverlay(ov); };
    box.appendChild(x);
    // 打开逻辑
    function openSearch() {
      openModal('searchModal');
      setTimeout(function () { var i = document.getElementById('searchInput'); if (i) i.focus(); }, 80);
    }
    btn.onclick = openSearch;
    document.getElementById('searchInput').addEventListener('input', doSearch);
    // Ctrl+K 快捷
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
    // 初始空状态
    var box0 = document.getElementById('searchResults');
    if (box0) box0.innerHTML = '<div class="empty"><div class="e-icon">🔍</div><div class="e-title">输入关键词开始搜索</div><div class="e-desc">支持食物热量、训练动作、健康文章</div></div>';
  }

  /* ---------- 导航滚动阴影 ---------- */
  function initNavScroll() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle('scrolled', (window.scrollY || 0) > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 今日智能提示 ---------- */
  function buildHealthTips() {
    var tips = [];
    var p = YDJK.getProfile();
    if (!p) {
      tips.push({ type: 'info', icon: '👋', text: '建立健康档案后，这里会给你个性化的每日建议' });
      return tips;
    }
    var today = YDJK.today();
    var meal = YDJK.mealSummary(today);
    var c = YDJK.getCheckin(today);
    var water = YDJK.getWater(today);
    var goal = YDJK.getWaterGoal();
    var streak = YDJK.checkinStreak(today);
    var bmr = YDJK.calcBMR(p);
    var tdee = YDJK.calcTDEE(bmr, p.activity);
    var goalCal = Math.round(YDJK.goalCalories(tdee, p.goal));

    // 运动
    var workoutDone = c && ((c.types && c.types.length) || c.plan || (c.minutes && c.minutes > 0));
    if (!workoutDone) tips.push({ type: 'warn', icon: '🏃', text: '今天还没运动，来 30 分钟快走或一组训练吧' });
    else if (c.minutes && c.minutes < 20) tips.push({ type: 'info', icon: '⏱️', text: '今天运动 ' + c.minutes + ' 分钟，再坚持一会儿效果更好' });

    // 饮食
    var diff = meal.kcal - goalCal;
    if (meal.kcal > 0 && diff > 150) tips.push({ type: 'warn', icon: '🍽️', text: '今日摄入已超目标 ' + Math.round(diff) + ' kcal，晚餐清淡些' });
    else if (meal.kcal > 0 && diff < -400) tips.push({ type: 'info', icon: '🥗', text: '今日摄入偏少，注意保证蛋白质和营养' });

    // 饮水
    var wdiff = goal - water;
    if (wdiff > 500) tips.push({ type: 'info', icon: '💧', text: '饮水还差 ' + wdiff + ' ml 达标，记得多喝水' });

    // 打卡
    if (streak >= 3) tips.push({ type: 'ok', icon: '🔥', text: '已连续打卡 ' + streak + ' 天，习惯正在养成！' });
    else if (streak === 1) tips.push({ type: 'ok', icon: '🌟', text: '今天开始打卡，好的开始是成功的一半！' });

    // 体重目标
    var wg = YDJK.getWeightGoal();
    var lw = YDJK.latestWeight();
    if (wg && lw) {
      var d = lw.weight - wg;
      if (d > 0.5) tips.push({ type: 'info', icon: '⚖️', text: '距目标体重还差 ' + d.toFixed(1) + ' kg，坚持计划' });
      else if (d < -0.5) tips.push({ type: 'ok', icon: '🎯', text: '体重已低于目标，太棒了！' });
    }
    if (!tips.length) tips.push({ type: 'ok', icon: '✨', text: '今日各项指标都不错，继续保持！' });
    return tips;
  }
  function renderHealthTip(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var tips = buildHealthTips();
    if (!tips.length) { el.innerHTML = ''; return; }
    var t = tips[Math.floor(Math.random() * tips.length)];
    var cls = t.type === 'warn' ? 'warn' : t.type === 'ok' ? 'success' : 'info';
    el.innerHTML = '<div class="alert ' + cls + '"><span>' + t.icon + '</span><span style="flex:1">' + t.text + '</span><button class="btn btn-ghost btn-sm js-tip-close" aria-label="关闭提示">✕</button></div>';
    var close = el.querySelector('.js-tip-close');
    if (close) close.addEventListener('click', function () { el.innerHTML = ''; });
  }

  /* ---------- 连续打卡里程碑 ---------- */
  function checkMilestone(dateStr) {
    var streak = YDJK.checkinStreak(dateStr || YDJK.today());
    var milestones = [3, 7, 14, 30, 60, 100];
    for (var i = 0; i < milestones.length; i++) {
      if (streak === milestones[i]) {
        var key = 'ydjk:ms:' + milestones[i];
        var last = null;
        try { last = localStorage.getItem(key); } catch (e) {}
        var todayKey = YDJK.today();
        if (last !== todayKey) {
          try { localStorage.setItem(key, todayKey); } catch (e) {}
          var msgs = {
            3: '🎉 连续打卡 3 天，习惯正在养成！',
            7: '🏆 连续打卡 7 天，完成第一周挑战！',
            14: '🔥 连续打卡 14 天，两周不松懈！',
            30: '🌟 连续打卡 30 天，你已经是运动达人了！',
            60: '💎 连续打卡 60 天，自律改变人生！',
            100: '👑 连续打卡 100 天，健康生活的王者！'
          };
          toast(msgs[milestones[i]] || '🎉 连续打卡 ' + milestones[i] + ' 天！');
        }
      }
    }
  }

  /* ---------- 滚动显现 ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (it) { it.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    items.forEach(function (it) { io.observe(it); });
  }

  /* ---------- 页脚年份 ---------- */
  function initFooter() {
    var y = document.querySelectorAll('.js-year');
    var year = new Date().getFullYear();
    y.forEach(function (n) { n.textContent = year; });
  }

  /* ---------- Service Worker 更新提示 ---------- */
  function initSWUpdate() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'SW_UPDATED') {
        toast('🔄 检测到新版本，正在为你刷新…');
        setTimeout(function () { location.reload(); }, 1800);
      }
      if (e.data && e.data.type === 'SW_CLEANED') {
        toast('🧹 旧缓存已清理，正在刷新…');
        setTimeout(function () { location.reload(); }, 1500);
      }
    });
  }

  /* ---------- 跨标签页实时同步 ---------- */
  function initCrossTab() {
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('ydjk:') === 0) {
        // 其他标签页修改了数据 → 通知当前页刷新
        if (typeof window.onDataChanged === 'function') {
          try { window.onDataChanged(); } catch (err) {}
        }
      }
    });
  }

  /* ---------- 页面加载指示 ---------- */
  function initPageLoader() {
    var loader = document.getElementById('pageLoader');
    if (loader) {
      // 页面内容渲染完成后淡出
      setTimeout(function () {
        loader.style.opacity = '0';
        setTimeout(function () { loader.remove(); }, 300);
      }, 200);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initPageLoader();
    initSWUpdate();
    initCrossTab();
    initInstallPrompt();
    initAuthNav();
    initTabBar();
    initMSearch();
    initNotifications();
    // 已登录时自动拉取云端最新数据
    if (window.YDJK && window.YDJK.isCloudLogged && window.YDJK.isCloudLogged()) {
      window.YDJK.cloudPull().then(function (merged) {
        // 缓存云端数据供首页统计
        if (window.YD_CLOUD) {
          window.YD_CLOUD.loadUserData().then(function (doc) {
            if (doc && doc.data_json) {
              try { window.YD_CLOUD_LAST_DATA = JSON.parse(doc.data_json); } catch (e) {}
            }
          }).catch(function () {});
        }
        if (merged && typeof window.onDataChanged === 'function') {
          try { window.onDataChanged(); } catch (e) {}
        }
      }).catch(function () {});
    }
    initTheme();
    initNav();
    initNavScroll();
    initModals();
    initSearch();
    renderHealthTip('healthTip');
    initReveal();
    initFooter();
    // 非追踪页也允许主动打开引导
    if (window.location.pathname.split('/').pop() !== 'tracker.html') {
      initOnboarding(false);
    }
  });

  window.YDJK_UI = {
    toast: toast, openModal: openModal, closeModal: closeModal, confirmDialog: confirmDialog, promptDialog: promptDialog,
    buildHealthTips: buildHealthTips, renderHealthTip: renderHealthTip,
    requestNotifPermission: requestNotifPermission, getReminderCfg: getReminderCfg, setReminderCfg: setReminderCfg, initNotifications: initNotifications,
    initOnboarding: initOnboarding, openProfileEditor: openProfileEditor, submitProfileForm: submitProfileForm, applyTheme: applyTheme,
    checkMilestone: checkMilestone
  };
})();