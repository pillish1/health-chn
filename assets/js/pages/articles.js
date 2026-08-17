/* 健康知识页 v3：智能知识库（今日推荐+分类+排序+阅读量） */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isNew(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    return (Date.now() - d.getTime()) < 7 * 24 * 3600 * 1000;
  }

  function getViews(id) { try { return Number(localStorage.getItem('ydjk:views:' + id)) || 0; } catch (e) { return 0; } }
  function addView(id) { try { localStorage.setItem('ydjk:views:' + id, String(getViews(id) + 1)); } catch (e) {} }

  var cloudArticles = [];
  var currentCat = 'all';
  var currentSort = 'smart';
  var searchQuery = '';

  function allArticles() {
    var builtin = DATA.ARTICLES.map(function (a) { a._user = false; return a; });
    var user = YDJK.getUserArticles().map(function (a) { a._user = true; return a; });
    return builtin.concat(user, cloudArticles);
  }

  var CATS = ['all', '训练基础', '营养饮食', '恢复管理', '健康科普', '健身问答'];

  function renderCats() {
    var tabs = document.getElementById('articleCats');
    if (!tabs) return;
    tabs.innerHTML = CATS.map(function (c) {
      var count = c === 'all' ? allArticles().length : allArticles().filter(function (a) { return a.cat === c; }).length;
      return '<button class="tab-btn' + (c === currentCat ? ' active' : '') + '" data-cat="' + c + '">' +
        (c === 'all' ? '✨ 全部' : c) + ' <span class="cat-count">' + count + '</span></button>';
    }).join('');
    tabs.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { currentCat = btn.dataset.cat; renderCats(); render(); });
    });
  }

  function getList() {
    var list = allArticles();
    if (currentCat !== 'all') list = list.filter(function (a) { return a.cat === currentCat; });
    if (searchQuery) {
      list = list.filter(function (a) {
        return (a.title || '').toLowerCase().indexOf(searchQuery) !== -1 ||
          (a.excerpt || '').toLowerCase().indexOf(searchQuery) !== -1 ||
          (a.body || '').toLowerCase().indexOf(searchQuery) !== -1;
      });
    }
    if (currentSort === 'new') {
      list.sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
    } else if (currentSort === 'hot') {
      list.sort(function (a, b) { return getViews(b.id) - getViews(a.id); });
    } else {
      list.sort(function (a, b) {
        var sa = (getViews(a.id) * 3) + daysSince(a.date);
        var sb = (getViews(b.id) * 3) + daysSince(b.date);
        return sb - sa;
      });
    }
    return list;
  }
  function daysSince(d) { if (!d) return 0; var t = new Date(d + 'T00:00:00'); if (isNaN(t.getTime())) return 0; return Math.floor((Date.now() - t.getTime()) / 86400000); }

  function catColor(c) { return { '训练基础': '#3b82f6', '营养饮食': '#f59e0b', '恢复管理': '#10b981', '健康科普': '#8b5cf6', '健身问答': '#ec4899' }[c] || '#3b82f6'; }

  function render() {
    var list = getList();
    var recBox = document.getElementById('todayPick');
    if (recBox) {
      if (currentCat === 'all' && !searchQuery && list.length) {
        var hot = list.slice().sort(function (a, b) { return getViews(b.id) - getViews(a.id); });
        var pick = hot[0] || list[0];
        var color = catColor(pick.cat);
        recBox.innerHTML = '<div class="today-pick">' +
          '<div class="tp-badge" style="background:' + color + '">🌟 今日推荐</div>' +
          '<a class="tp-title" href="#article-' + pick.id + '">' + esc(pick.title) + '</a>' +
          '<p class="tp-excerpt">' + esc(pick.excerpt) + '</p>' +
          '<div class="tp-meta"><span class="tag" style="background:' + color + '22;color:' + color + '">' + esc(pick.cat) + '</span>' +
          '<span class="muted small">⏱ ' + pick.readTime + ' 分钟</span>' +
          (getViews(pick.id) > 0 ? '<span class="muted small">👁 ' + getViews(pick.id) + '</span>' : '') +
          '<span class="tp-go" style="color:' + color + '">阅读全文 →</span></div></div>';
      } else recBox.innerHTML = '';
    }
    var cards = document.getElementById('articleCards');
    if (!list.length) {
      cards.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="e-icon">📖</div><div class="e-title">没有找到文章</div><div class="e-desc">换个分类或关键词试试</div></div>';
    } else {
      cards.innerHTML = list.map(function (a) {
        var color = catColor(a.cat);
        return '<a href="#article-' + a.id + '" class="card card-hover article-card reveal">' +
          '<div class="a-top" style="background:linear-gradient(120deg,' + color + '18,' + color + '08)">' +
          '<span class="tag" style="background:' + color + ';color:#fff">' + esc(a.cat || '健康') + '</span>' +
          (isNew(a.date) ? '<span class="tag red">NEW</span>' : '') +
          (a._cloud ? '<span class="tag purple" style="font-size:.68rem">云端</span>' : '') +
          '</div><div class="a-body">' +
          '<div class="a-title">' + esc(a.title) + '</div>' +
          '<div class="a-excerpt">' + esc(a.excerpt) + '</div></div>' +
          '<div class="a-foot"><span class="muted small">📅 ' + esc(a.date || '') + '</span>' +
          '<span class="muted small">⏱ ' + a.readTime + ' 分钟</span>' +
          (getViews(a.id) > 0 ? '<span class="muted small">👁 ' + getViews(a.id) + '</span>' : '') +
          '</div></a>';
      }).join('');
    }
    var bodies = document.getElementById('articleBodies');
    bodies.innerHTML = list.map(function (a) {
      addView(a.id);
      return '<article class="card mb-3 article-body" id="article-' + a.id + '">' +
        '<div class="a-meta"><span class="tag blue">' + esc(a.cat) + '</span>' +
        (isNew(a.date) ? '<span class="tag red">NEW</span>' : '') +
        '<span>' + a.date + '</span><span>⏱ ' + a.readTime + ' 分钟阅读</span></div>' +
        '<h2 style="margin:6px 0 4px">' + esc(a.title) + '</h2>' +
        '<div class="muted small mb-3">' + esc(a.excerpt) + '</div>' +
        a.body + '</article>';
    }).join('');
  }

  async function loadCloudArticles() {
    try {
      if (window.YD_CLOUD) {
        var arts = await window.YD_CLOUD.loadArticles();
        if (arts && arts.length) {
          cloudArticles = arts.map(function (a) {
            return { id: 'db-' + a.id, title: a.title || '', cat: a.cat || '健康科普', date: a.date || '', readTime: a.read_time || 5, excerpt: a.excerpt || '', body: a.body || '', _user: true, _cloud: true };
          });
          renderCats(); render();
        }
      }
    } catch (e) {}
  }

  async function checkAdmin() {
    try {
      if (window.YD_CLOUD && window.YD_CLOUD.isLoggedIn()) {
        var isAdmin = await window.YD_CLOUD.isAdmin();
        var btn = document.getElementById('publishBtn');
        if (btn) btn.style.display = isAdmin ? 'inline-flex' : 'none';
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderCats();
    render();
    loadCloudArticles();
    checkAdmin();
    var sortSel = document.getElementById('articleSort');
    if (sortSel) sortSel.addEventListener('change', function () { currentSort = sortSel.value; render(); });
    var aSearch = document.getElementById('articleSearch');
    if (aSearch) aSearch.addEventListener('input', function () { searchQuery = aSearch.value.trim().toLowerCase(); render(); });
    var mgrBtn = document.getElementById('manageArticlesBtn');
    if (mgrBtn) mgrBtn.addEventListener('click', openAdmin);
  });

  var editingId = null;
  function openAdmin() {
    YDJK_UI.promptDialog({ title: '管理员验证', message: '输入管理密码进入（默认 health2026）', placeholder: '请输入管理密码', okText: '进入管理', type: 'password' }).then(function (pass) {
      if (pass === null || pass === '') return;
      if (pass !== YDJK.getAdminPass()) { YDJK_UI.toast('❌ 密码错误', 'err'); return; }
      renderAdminList(); resetAdminForm();
      document.getElementById('adminModalTitle').textContent = '✍️ 新建文章';
      document.getElementById('adminSave').textContent = '发布文章';
      YDJK_UI.openModal('adminModal');
    });
  }
  function renderAdminList() {
    var list = YDJK.getUserArticles();
    var wrap = document.getElementById('adminList');
    wrap.innerHTML = list.length ? list.map(function (a) {
      return '<div class="list-row"><div class="lr-main"><div><div class="lr-title">' + esc(a.title) + '</div><div class="lr-sub">' + esc(a.cat) + ' · ' + a.date + '</div></div></div>' +
        '<div class="lr-side flex gap-sm" style="gap:6px">' +
        '<button class="btn btn-ghost btn-sm js-edit-a" data-id="' + a.id + '">编辑</button>' +
        '<button class="btn btn-danger btn-sm js-del-a" data-id="' + a.id + '">删除</button></div></div>';
    }).join('') : '<div class="muted small text-center" style="padding:12px">还没有自建文章</div>';
    wrap.querySelectorAll('.js-edit-a').forEach(function (b) { b.addEventListener('click', function () { editArticle(b.dataset.id); }); });
    wrap.querySelectorAll('.js-del-a').forEach(function (b) {
      b.addEventListener('click', function () {
        YDJK_UI.confirmDialog({ title: '删除这篇文章？', message: '删除后无法恢复。', okText: '删除文章', cancelText: '取消', danger: true, icon: '🗑️' }).then(function (ok) {
          if (!ok) return;
          YDJK.removeUserArticle(b.dataset.id);
          renderAdminList(); render();
          YDJK_UI.toast('🗑️ 文章已删除');
        });
      });
    });
  }
  function resetAdminForm() {
    editingId = null;
    document.getElementById('aTitle').value = '';
    document.getElementById('aCat').value = '训练基础';
    document.getElementById('aDate').value = YDJK.today();
    document.getElementById('aRead').value = 5;
    document.getElementById('aExcerpt').value = '';
    document.getElementById('aBody').value = '';
  }
  function editArticle(id) {
    var a = YDJK.getUserArticles().find(function (x) { return x.id === id; });
    if (!a) return;
    editingId = id;
    document.getElementById('aTitle').value = a.title;
    document.getElementById('aCat').value = a.cat;
    document.getElementById('aDate').value = a.date;
    document.getElementById('aRead').value = a.readTime;
    document.getElementById('aExcerpt').value = a.excerpt;
    document.getElementById('aBody').value = a.body;
    document.getElementById('adminModalTitle').textContent = '✏️ 编辑文章';
    document.getElementById('adminSave').textContent = '保存修改';
  }
  function saveArticle() {
    var title = document.getElementById('aTitle').value.trim();
    var body = document.getElementById('aBody').value.trim();
    if (!title || !body) { YDJK_UI.toast('请填写标题和正文', 'err'); return; }
    var a = {
      id: editingId || undefined,
      title: title,
      cat: document.getElementById('aCat').value,
      date: document.getElementById('aDate').value || YDJK.today(),
      readTime: Number(document.getElementById('aRead').value) || 5,
      excerpt: document.getElementById('aExcerpt').value.trim() || title,
      body: body.split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('')
    };
    YDJK.saveUserArticle(a);
    render(); renderAdminList(); resetAdminForm();
    document.getElementById('adminModalTitle').textContent = '✍️ 新建文章';
    document.getElementById('adminSave').textContent = '发布文章';
    YDJK_UI.toast('✅ 文章已' + (editingId ? '更新' : '发布'));
  }
})();