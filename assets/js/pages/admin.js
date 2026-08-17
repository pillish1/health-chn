/* 管理后台逻辑 */
(function () {
  'use strict';

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function api(path, opts, token) {
    var cloud = window.YD_CLOUD;
    var headers = { apikey: cloud.anonKey, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (opts && opts.headers) Object.assign(headers, opts.headers);
    var res = await fetch(cloud.url + path, { method: (opts && opts.method) || 'GET', headers: headers, body: opts && opts.body ? JSON.stringify(opts.body) : undefined });
    var text = await res.text();
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
  }

  function loadAllUsers() {
    var cloud = window.YD_CLOUD;
    var session = cloud.getSession();
    return api('/rest/v1/user_data?select=*&order=updated_at.desc', null, session.access_token);
  }
  function loadAllArticles() {
    var cloud = window.YD_CLOUD;
    var session = cloud.getSession();
    return api('/rest/v1/articles?select=*&order=created_at.desc', null, session.access_token);
  }
  function loadUserEmails() {
    // 无法从 anon 读 auth.users，用注册信息近似（user_id 显示）
    return Promise.resolve([]);
  }

  function renderUsers(users) {
    var rows = document.getElementById('userRows');
    if (!users.length) {
      rows.innerHTML = '<tr><td colspan="6" class="text-center muted" style="padding:24px">暂无用户数据</td></tr>';
      return;
    }
    rows.innerHTML = users.map(function (u) {
      var d = {};
      try { d = u.data_json ? JSON.parse(u.data_json) : {}; } catch (e) {}
      var profile = d.profile || {};
      var weights = (d.weights || []).length;
      var checkinDays = d.checkins ? Object.keys(d.checkins).length : 0;
      var meals = 0;
      if (d.mealsAll) Object.keys(d.mealsAll).forEach(function (k) { meals += (d.mealsAll[k] || []).length; });
      var profileText = profile.gender ? (profile.gender === 'male' ? '👨' : '👩') + ' ' + (profile.age || '?') + '岁 ' + (profile.height || '?') + 'cm ' + (profile.weight || '?') + 'kg' : '未建档';
      return '<tr>' +
        '<td><b class="small">' + esc(u.user_id || '').slice(0, 8) + '…</b><br><span class="muted" style="font-size:.72rem">' + esc((u.updated_at || '').slice(0, 10)) + '</span></td>' +
        '<td class="small">' + profileText + '</td>' +
        '<td class="text-center">' + weights + '</td>' +
        '<td class="text-center">' + checkinDays + '</td>' +
        '<td class="text-center">' + meals + '</td>' +
        '<td class="small">' + esc((u.updated_at || '').replace('T', ' ').slice(0, 16)) + '</td></tr>';
    }).join('');
  }

  function renderArticles(arts) {
    var el = document.getElementById('articleList');
    if (!arts.length) {
      el.innerHTML = '<div class="empty"><div class="e-icon">📝</div><div class="e-title">还没有云端文章</div><div class="e-desc">点上方按钮发布第一篇</div></div>';
      return;
    }
    el.innerHTML = arts.map(function (a) {
      return '<div class="list-row"><div class="lr-main"><div><div class="lr-title small">' + esc(a.title) + '</div><div class="lr-sub">' + esc(a.cat) + ' · ' + esc(a.date || '') + '</div></div></div>' +
        '<div class="lr-side flex gap-sm" style="gap:8px">' +
        '<button class="btn btn-danger btn-sm js-del-art" data-id="' + a.id + '">删除</button></div></div>';
    }).join('');
    el.querySelectorAll('.js-del-art').forEach(function (b) {
      b.addEventListener('click', function () {
        YDJK_UI.confirmDialog({ title: '删除文章？', message: '删除后无法恢复。', okText: '删除', danger: true, icon: '🗑️' }).then(function (ok) {
          if (!ok) return;
          window.YD_CLOUD.deleteArticle(b.dataset.id).then(function () {
            YDJK_UI.toast('✅ 已删除');
            init();
          });
        });
      });
    });
  }

  function renderStats(users, arts) {
    var totalUsers = users.length;
    var totalCheckins = 0, totalMeals = 0, totalWeights = 0;
    var activeToday = 0, activeWeek = 0;
    var now = Date.now();
    var weekAgo = now - 7 * 86400000;
    var dayAgo = now - 86400000;
    users.forEach(function (u) {
      var d = {};
      try { d = u.data_json ? JSON.parse(u.data_json) : {}; } catch (e) {}
      if (d.checkins) totalCheckins += Object.keys(d.checkins).length;
      totalWeights += (d.weights || []).length;
      if (d.mealsAll) Object.keys(d.mealsAll).forEach(function (k) { totalMeals += (d.mealsAll[k] || []).length; });
      var ut = u.updated_at ? new Date(u.updated_at).getTime() : 0;
      if (ut >= weekAgo) activeWeek++;
      if (ut >= dayAgo) activeToday++;
    });
    document.getElementById('sysStats').innerHTML =
      '<div class="stat-card green"><div class="s-icon">👥</div><div class="s-value">' + totalUsers + '</div><div class="s-label">用户数</div></div>' +
      '<div class="stat-card blue"><div class="s-icon">📅</div><div class="s-value">' + totalCheckins + '</div><div class="s-label">总打卡次数</div></div>' +
      '<div class="stat-card orange"><div class="s-icon">🍽️</div><div class="s-value">' + totalMeals + '</div><div class="s-label">总饮食记录</div></div>' +
      '<div class="stat-card purple"><div class="s-icon">🔥</div><div class="s-value">' + activeWeek + '<small>/' + totalUsers + '</small></div><div class="s-label">7 日活跃</div></div>' +
      '<div class="stat-card red"><div class="s-icon">⚡</div><div class="s-value">' + activeToday + '</div><div class="s-label">今日活跃</div></div>' +
      '<div class="stat-card green"><div class="s-icon">📝</div><div class="s-value">' + arts.length + '</div><div class="s-label">云端文章</div></div>';
  }

  async function init() {
    var gate = document.getElementById('adminGate');
    var panel = document.getElementById('adminPanel');
    var cloud = window.YD_CLOUD;
    if (!cloud || !cloud.isLoggedIn()) {
      gate.style.display = 'block';
      panel.style.display = 'none';
      return;
    }
    var isAdmin = await cloud.isAdmin().catch(function () { return false; });
    if (!isAdmin) {
      document.getElementById('gateMsg').textContent = '当前账号无管理员权限';
      gate.style.display = 'block';
      panel.style.display = 'none';
      return;
    }
    gate.style.display = 'none';
    panel.style.display = 'block';
    var [usersRes, artsRes] = await Promise.all([loadAllUsers(), loadAllArticles()]);
    var users = usersRes.ok ? usersRes.data : [];
    var arts = artsRes.ok ? artsRes.data : [];
    renderStats(users, arts);
    renderUsers(users);
    renderArticles(arts);
  }

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });
})();
