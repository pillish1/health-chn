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
    if (btn) btn.innerHTML = window.YDJK_ICON ? window.YDJK_ICON(t === 'dark' ? 'sun' : 'moon') : (t === 'dark' ? '☀️' : '🌙');
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
    if (btn) btn.innerHTML = window.YDJK_ICON ? window.YDJK_ICON(t === 'dark' ? 'sun' : 'moon') : (t === 'dark' ? '☀️' : '🌙');
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
      var iconWrap = opts.danger ? ('<span class="m-icon red">' + (window.YDJK_ICON ? window.YDJK_ICON('alert') : '⚠️') + '</span>') : (opts.icon ? '<span class="m-icon">' + opts.icon + '</span>' : ('<span class="m-icon">' + (window.YDJK_ICON ? window.YDJK_ICON('info') : '❓') + '</span>'));
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
        '<div class="modal-header"><span class="m-icon">' + (window.YDJK_ICON ? window.YDJK_ICON('lock') : '🔑') + '</span>' +
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
    var ico = function (n) { return window.YDJK_ICON ? window.YDJK_ICON(n) : ''; };
    var goals = DATA.GOALS.map(function (g) {
      var checked = (p.goal || 'keep') === g.id ? ' checked' : '';
      return '<div class="radio-pill card-pill"><input type="radio" name="goal" id="goal-' + g.id + '" value="' + g.id + '"' + checked + '><label for="goal-' + g.id + '"><span class="emoji">' + g.emoji + '</span><b>' + g.label + '</b><small>' + g.desc + '</small></label></div>';
    }).join('');
    var levels = DATA.ACTIVITY_LEVELS.map(function (l) {
      var checked = (p.activity || 'moderate') === l.id ? ' checked' : '';
      return '<div class="radio-pill card-pill"><input type="radio" name="activity" id="act-' + l.id + '" value="' + l.id + '"' + checked + '><label for="act-' + l.id + '"><b>' + l.label + '</b><small>' + l.desc + '</small></label></div>';
    }).join('');
    var male = p.gender !== 'female';
    var a = p.age ? ' value="' + p.age + '"' : '';
    var h = p.height ? ' value="' + p.height + '"' : '';
    var w = p.weight ? ' value="' + p.weight + '"' : '';
    return '' +
      '<div class="form-section">' + ico('user') + ' 基本信息</div>' +
      '<div class="field"><label>性别 <span class="req"></span></label><div class="radio-group">' +
      '<div class="radio-pill"><input type="radio" name="gender" id="g-male" value="male"' + (male ? ' checked' : '') + '><label for="g-male"><span class="emoji">👨</span>男</label></div>' +
      '<div class="radio-pill"><input type="radio" name="gender" id="g-female" value="female"' + (!male ? ' checked' : '') + '><label for="g-female"><span class="emoji">👩</span>女</label></div></div></div>' +
      '<div class="field"><label>年龄 <span class="req"></span></label><div class="input-group"><input class="input" type="number" id="pf-age" min="10" max="100" placeholder="如 25"' + a + '><span class="suffix">岁</span></div><div class="hint">用于计算基础代谢</div></div>' +
      '<div class="field"><label>身高 <span class="req"></span></label><div class="input-group"><input class="input" type="number" id="pf-height" min="80" max="250" placeholder="如 170"' + h + '><span class="suffix">cm</span></div><div class="hint">与体重一起计算每日热量目标</div></div>' +
      '<div class="field"><label>体重 <span class="req"></span></label><div class="input-group"><input class="input" type="number" id="pf-weight" min="20" max="300" step="0.1" placeholder="如 60"' + w + '><span class="suffix">kg</span></div><div class="hint">每周在同一时间称最准</div></div>' +
      '<div class="form-section">' + ico('target') + ' 健康目标</div>' +
      '<div class="field"><div class="radio-group vertical">' + goals + '</div></div>' +
      '<div class="form-section">' + ico('activity') + ' 日常活动水平</div>' +
      '<div class="field"><div class="radio-group vertical">' + levels + '</div><div class="hint">选最接近你日常状态的一项，之后可随时改</div></div>';
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
    if (title) title.innerHTML = (window.YDJK_ICON ? window.YDJK_ICON(existing ? 'edit' : 'wave') : (existing ? '✏️' : '👋')) + ' ' + (existing ? '编辑健康档案' : '欢迎来到悦动健康');
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
    // 逐项校验：哪项错提示哪项
    if (!document.getElementById('pf-age').value.trim()) { toast('请填写年龄', 'err'); document.getElementById('pf-age').focus(); return; }
    if (isNaN(age) || age < 10 || age > 100) { toast('年龄需在 10-100 之间', 'err'); document.getElementById('pf-age').focus(); return; }
    if (!document.getElementById('pf-height').value.trim()) { toast('请填写身高', 'err'); document.getElementById('pf-height').focus(); return; }
    if (isNaN(height) || height < 80 || height > 250) { toast('身高需在 80-250 cm 之间', 'err'); document.getElementById('pf-height').focus(); return; }
    if (!document.getElementById('pf-weight').value.trim()) { toast('请填写体重', 'err'); document.getElementById('pf-weight').focus(); return; }
    if (isNaN(weight) || weight < 20 || weight > 300) { toast('体重需在 20-300 kg 之间', 'err'); document.getElementById('pf-weight').focus(); return; }
    var gEl = form.querySelector('input[name=gender]:checked');
    if (!gEl) { toast('请选择性别', 'err'); return; }
    var goEl = form.querySelector('input[name=goal]:checked');
    if (!goEl) { toast('请选择健康目标', 'err'); return; }
    var gender = gEl.value;
    var goal = goEl.value;
    var actEl = form.querySelector('input[name=activity]:checked');
    var activity = actEl ? actEl.value : 'moderate';
    var existing = YDJK.getProfile();
    var isEdit = !!existing;
    var profile = {
      gender: gender, age: age, height: height, weight: weight,
      goal: goal, activity: activity,
      createdAt: (existing && existing.createdAt) || new Date().toISOString()
    };
    YDJK.saveProfile(profile);
    closeModal('onboardModal');
    toast(isEdit ? '✅ 健康档案已更新' : '✅ 健康档案已建立');
    if (typeof window.onProfileSaved === 'function') window.onProfileSaved(profile);
    if (!isEdit) {
      // 新用户建档完成 → 统一回首页（能量卡/建议立即按新档案渲染）
      setTimeout(function () { location.href = 'index.html'; }, 600);
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
        hasAnyData = !!window.YDJK.getProfile() || Object.keys(window.YDJK.getCheckins() || {}).length > 0;
        for (var i = 0; i < localStorage.length; i++) { if ((localStorage.key(i) || '').indexOf('ydjk:meals:') === 0) { hasAnyData = true; break; } }
      } catch (e) {}
      var page = location.pathname.split('/').pop() || 'index.html';
      var hasSetup = location.search.indexOf('setup=1') >= 0;
      var skipped = false;
      try { skipped = localStorage.getItem('ydjk:onboard-dismissed') === '1'; } catch (e) {}
      if (!hasAnyData && !skipped && !hasSetup && page !== 'welcome.html') {
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
      if (cfg.checkin) {
        var ch = typeof cfg.checkinHour === 'number' ? cfg.checkinHour : 20;
        if (h === ch && m === 0) {
          if (YDJK.getWorkouts(YDJK.today()).length === 0) fireNotif('🏃 今天还没运动', '来 30 分钟运动，记录今天的训练吧', 'checkin');
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
      if (!at && cfg.checkin && h === (typeof cfg.checkinHour === 'number' ? cfg.checkinHour : 20) && m === 0) {
        at = t; title = '🏃 今天还没运动'; body = '来 30 分钟运动，记录今天的训练吧';
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
    try { return JSON.parse(localStorage.getItem('ydjk:reminders') || '{"enabled":false,"water":false,"checkin":true,"meal":false,"waterStart":9,"waterEnd":21,"waterInterval":2,"checkinHour":20}'); }
    catch (e) { return { enabled: false, water: false, checkin: true, meal: false, waterStart: 9, waterEnd: 21, waterInterval: 2, checkinHour: 20 }; }
  }
  function setReminderCfg(cfg) {
    try { localStorage.setItem('ydjk:reminders', JSON.stringify(cfg)); } catch (e) {}
    scheduleReminders();
  }
  /* ---------- 底部 Tab 导航 ---------- */
  function initTabBar() {
    var path = location.pathname.split('/').pop() || 'index.html';
    var map = { 'index.html': 'home', 'foods.html': 'foods', 'plans.html': 'plans', 'profile.html': 'profile' };
      var map = { 'index.html': 'home', 'foods.html': 'foods', 'plans.html': 'plans', 'stats.html': 'stats', 'profile.html': 'profile' };

    var active = map[path];
    document.querySelectorAll('.tab-item').forEach(function (t) {
      var isActive = t.dataset.tab === active;
      t.classList.toggle('active', isActive);
      if (isActive) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
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
      bar.innerHTML = '<span class="ib-icon">' + (window.YDJK_ICON ? window.YDJK_ICON('mobile') : '📲') + '</span><span class="ib-text"><b>把悦动健康添加到主屏幕</b><br><small>像 App 一样使用，离线也能看</small></span>' +
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
      tips.push({ type: 'info', icon: '👋', iconName: 'clipboard', text: '建立健康档案后，这里会给你个性化的每日建议' });
      return tips;
    }
    var today = YDJK.today();
    var meal = YDJK.mealSummary(today);
    var wk = YDJK.getWorkouts(today);
    var streak = YDJK.checkinStreak(today);
    var bmr = YDJK.calcBMR(p);
    var tdee = YDJK.calcTDEE(bmr, p.activity);
    var goalCal = Math.round(YDJK.goalCalories(tdee, p.goal));
    var weight = p.weight || 60;
    var macros = YDJK.macros(goalCal, p.goal);

    /* 运动 */
    if (!wk.length) {
      tips.push({ type: 'warn', icon: '🏃', iconName: 'run', text: '今天还没运动，来 30 分钟快走或一组训练吧' });
      // 连续 N 天没运动
      var idle = 0;
      for (var i = 1; i <= 4; i++) {
        if (YDJK.getWorkouts(YDJK.addDays(today, -i)).length > 0) break;
        idle++;
      }
      if (idle >= 2) tips.push({ type: 'info', icon: '⏳', iconName: 'clock', text: '已经 ' + idle + ' 天没运动了，来 20 分钟动一动，别让节奏断掉' });
    } else if (wk.length < 2) {
      tips.push({ type: 'info', icon: '⏱️', iconName: 'clock', text: '今天已记录 ' + wk.length + ' 项训练，再坚持一会儿效果更好' });
    }

    /* 饮食 */
    var diff = meal.kcal - goalCal;
    if (meal.kcal > 0 && diff > 150) tips.push({ type: 'warn', icon: '🍽️', iconName: 'food', text: '今日摄入已超目标 ' + Math.round(diff) + ' kcal，晚餐清淡些' });
    else if (meal.kcal > 0 && diff < -400) tips.push({ type: 'info', icon: '🥗', iconName: 'meal', text: '今日摄入偏少，注意保证蛋白质和营养' });

    /* 蛋白质（个性化目标） */
    var pTarget = Math.round(weight * 1.2);
    if (meal.count > 0 && meal.protein < pTarget * 0.8) {
      tips.push({ type: 'info', icon: '🥚', iconName: 'meal', text: '今天蛋白质 ' + Math.round(meal.protein) + 'g（目标约 ' + pTarget + 'g），加个鸡蛋或手掌大的鸡胸肉' });
    }

    /* 本周部位单一 */
    var week = YDJK.weekDates(today);
    var muscleSet = {};
    week.forEach(function (d) {
      YDJK.getWorkouts(d).forEach(function (w) { if (w.muscle) muscleSet[w.muscle] = (muscleSet[w.muscle] || 0) + 1; });
    });
    if (Object.keys(muscleSet).length === 1) {
      tips.push({ type: 'info', icon: '🏋️', iconName: 'workout', text: '这周都在练同一部位，试试搭配腿、背一起练更均衡' });
    }

    /* 记录中断鼓励 */
    var yMeals = YDJK.getMeals(YDJK.addDays(today, -1)).length;
    var yWk = YDJK.getWorkouts(YDJK.addDays(today, -1)).length;
    if (yMeals === 0 && yWk === 0 && (meal.count > 0 || wk.length > 0)) {
      tips.push({ type: 'ok', icon: '✨', iconName: 'check-circle', text: '昨天没记录，今天又开始了，坚持就是胜利！' });
    }

    /* 连续训练 */
    if (streak >= 3) tips.push({ type: 'ok', icon: '🔥', iconName: 'flame', text: '已连续记录 ' + streak + ' 天，习惯正在养成！' });
    else if (streak === 1) tips.push({ type: 'ok', icon: '🌟', iconName: 'star', text: '今天开始记录，好的开始是成功的一半！' });

    if (!tips.length) tips.push({ type: 'ok', icon: '✨', iconName: 'check-circle', text: '今日各项指标都不错，继续保持！' });
    return tips;
  }
  function renderHealthTip(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    // 规则引擎：优先使用 YDJK.getSmartTips(date)（小怀川实现，接口 [{icon,type,text}]），未就绪时用内置规则兜底
    var tips = null;
    try {
      if (window.YDJK && typeof window.YDJK.getSmartTips === 'function') {
        tips = window.YDJK.getSmartTips(window.YDJK.today());
      }
    } catch (e) { tips = null; }
    if (!tips) tips = buildHealthTips();
    if (!tips || !tips.length) { el.innerHTML = ''; return; }
    // 优先级：warn 在前；最多展示 4 条
    tips.sort(function (a, b) { return (a.type === 'warn' ? 0 : 1) - (b.type === 'warn' ? 0 : 1); });
    var shown = tips.slice(0, 4);
    el.innerHTML = '<div class="tip-list">' + shown.map(function (t) {
      var cls = t.type === 'warn' ? 'warn' : (t.type === 'good' || t.type === 'ok') ? 'ok' : 'info';
      var ico = (window.YDJK_ICON && t.iconName) ? window.YDJK_ICON(t.iconName) : ((t.icon && String(t.icon).indexOf('<') === 0) ? t.icon : (t.icon || '💡'));
      return '<div class="tip-item ' + cls + '"><span class="tip-ico">' + ico + '</span><span class="tip-txt">' + t.text + '</span></div>';
    }).join('') + '</div>';
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

    /* ---------- 成就检查（每次页面加载时自动解锁） ---------- */
    function initAchievements() {
      if (!window.YDJK || typeof window.YDJK.checkAchievements !== 'function') return;
      try {
        var newly = window.YDJK.checkAchievements();
        if (newly && newly.length > 0) {
          var defs = window.YDJK.getAchievementDefs();
          var names = defs.filter(function (d) { return newly.indexOf(d.id) >= 0; }).map(function (d) { return d.icon + ' ' + d.name; });
          if (names.length > 0) {
            setTimeout(function () { toast('🏆 获得成就：' + names.join('、')); }, 1800);
          }
        }
      } catch (e) {}
    }


  document.addEventListener('DOMContentLoaded', function () {
    initPageLoader();
    initSWUpdate();
    initCrossTab();
      initAchievements();

    initInstallPrompt();
    initTabBar();

    initNotifications();
    initTheme();
    initNav();
    initNavScroll();
    initModals();

    renderHealthTip('dashTipBody'); // 首页智能建议（多条规则版）
    initReveal();
    initFooter();
    // 所有页面都允许打开新用户引导（原 tracker 页已移除）
    initOnboarding(false);
  });

  /* 全局存储错误兜底：localStorage 满/禁用时不崩溃，提示用户 */
  if (window.addEventListener) {
    window.addEventListener('ydjk:storage-error', function () {
      try { toast('存储空间不足，记录可能未保存，请到「我的」导出备份', 'err'); } catch (e) {}
    });
  }

  window.YDJK_UI = {
    toast: toast, openModal: openModal, closeModal: closeModal, confirmDialog: confirmDialog, promptDialog: promptDialog,
    buildHealthTips: buildHealthTips, renderHealthTip: renderHealthTip,
    requestNotifPermission: requestNotifPermission, getReminderCfg: getReminderCfg, setReminderCfg: setReminderCfg, initNotifications: initNotifications,
    initOnboarding: initOnboarding, openProfileEditor: openProfileEditor, submitProfileForm: submitProfileForm, applyTheme: applyTheme
  };
})();
