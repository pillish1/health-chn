/* 健康知识页 v2：内置文章 + 用户文章（可管理更新）+ NEW 标记 */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* 7 天内 → 新 */
  function isNew(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    return (Date.now() - d.getTime()) < 7 * 24 * 3600 * 1000;
  }
  function allArticles() {
    var builtin = DATA.ARTICLES.map(function (a) { a._user = false; return a; });
    var user = YDJK.getUserArticles().map(function (a) { a._user = true; return a; });
    return builtin.concat(user, cloudArticles).sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
  }

  var searchQuery = '';
  function render() {
    var list = allArticles();
    if (searchQuery) {
      list = list.filter(function (a) {
        return (a.title || '').toLowerCase().indexOf(searchQuery) !== -1 ||
          (a.excerpt || '').toLowerCase().indexOf(searchQuery) !== -1 ||
          (a.body || '').toLowerCase().indexOf(searchQuery) !== -1;
      });
    }
    var cards = document.getElementById('articleCards');
    cards.innerHTML = list.map(function (a) {
      return '<a href="#article-' + a.id + '" class="card card-hover article-card reveal">' +
        '<div class="a-meta"><span class="tag ' + (a._user ? 'purple' : 'blue') + '">' + esc(a.cat) + (a._user ? ' · 自建' : '') + '</span>' +
        (isNew(a.date) ? '<span class="tag red">NEW</span>' : '') +
        '<span>' + a.date + '</span><span>⏱ ' + a.readTime + ' 分钟</span></div>' +
        '<div class="a-title">' + esc(a.title) + '</div>' +
        '<div class="a-excerpt">' + esc(a.excerpt) + '</div></a>';
    }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="e-icon">📖</div><div class="e-title">暂无文章</div><div class="e-desc">点击右上角「管理文章」发布第一篇</div></div>';

    var bodies = document.getElementById('articleBodies');
    bodies.innerHTML = list.map(function (a) {
      return '<article class="card mb-3 article-body" id="article-' + a.id + '">' +
        '<div class="a-meta"><span class="tag ' + (a._user ? 'purple' : 'blue') + '">' + esc(a.cat) + '</span>' +
        (isNew(a.date) ? '<span class="tag red">NEW</span>' : '') +
        '<span>' + a.date + '</span><span>⏱ ' + a.readTime + ' 分钟阅读</span></div>' +
        '<h2 style="margin:6px 0 4px">' + esc(a.title) + '</h2>' +
        '<div class="muted small mb-3">' + esc(a.excerpt) + '</div>' +
        a.body + '</article>';
    }).join('');
  }

  /* ---------- 管理面板 ---------- */
  var editingId = null;
  function openAdmin() {
    YDJK_UI.promptDialog({
      title: '管理员验证',
      message: '输入管理密码进入（默认 health2026，可在面板中修改）',
      placeholder: '请输入管理密码', okText: '进入管理', type: 'password'
    }).then(function (pass) {
      if (pass === null || pass === '') return;
      if (pass !== YDJK.getAdminPass()) {
        YDJK_UI.toast('❌ 密码错误', 'err');
        return;
      }
      renderAdminList();
      resetAdminForm();
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
    }).join('') : '<div class="muted small text-center" style="padding:12px">还没有自建文章，点击「新建文章」发布第一篇</div>';
    wrap.querySelectorAll('.js-edit-a').forEach(function (b) {
      b.addEventListener('click', function () { editArticle(b.dataset.id); });
    });
    wrap.querySelectorAll('.js-del-a').forEach(function (b) {
      b.addEventListener('click', function () {
        YDJK_UI.confirmDialog({
          title: '删除这篇文章？',
          message: '删除后无法恢复。',
          okText: '删除文章', cancelText: '取消', danger: true, icon: '🗑️'
        }).then(function (ok) {
          if (!ok) return;
          YDJK.removeUserArticle(b.dataset.id);
          renderAdminList();
          render();
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
    var cat = document.getElementById('aCat').value;
    var a = {
      id: editingId || undefined,
      title: title,
      cat: cat,
      date: document.getElementById('aDate').value || YDJK.today(),
      readTime: Number(document.getElementById('aRead').value) || 5,
      excerpt: document.getElementById('aExcerpt').value.trim() || title,
      body: body.split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('')
    };
    YDJK.saveUserArticle(a);
    render();
    renderAdminList();
    resetAdminForm();
    document.getElementById('adminModalTitle').textContent = '✍️ 新建文章';
    document.getElementById('adminSave').textContent = '发布文章';
    YDJK_UI.toast('✅ 文章已' + (editingId ? '更新' : '发布') + '，板块已实时刷新');
  }

  /* 从数据库加载文章（动态内容） */
  var cloudArticles = [];
  async function loadCloudArticles() {
    try {
      if (window.YD_CLOUD) {
        var arts = await window.YD_CLOUD.loadArticles();
        if (arts && arts.length) {
          cloudArticles = arts.map(function (a) {
            return { id: 'db-' + a.id, title: a.title || '', cat: a.cat || '健康科普', date: a.date || '', readTime: a.read_time || 5, excerpt: a.excerpt || '', body: a.body || '', _user: true, _cloud: true };
          });
          render();
        }
      }
    } catch (e) {}
  }

  /* 管理员检测：显示发布按钮 */
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
    render();
    loadCloudArticles();
    checkAdmin();
    var aSearch = document.getElementById('articleSearch');
    if (aSearch) aSearch.addEventListener('input', function () {
      searchQuery = aSearch.value.trim().toLowerCase();
      render();
    });
    var mgrBtn = document.getElementById('manageArticlesBtn');
    if (mgrBtn) mgrBtn.addEventListener('click', openAdmin);
    var saveBtn = document.getElementById('adminSave');
    if (saveBtn) saveBtn.addEventListener('click', saveArticle);
    var passBtn = document.getElementById('changePassBtn');
    if (passBtn) passBtn.addEventListener('click', function () {
      YDJK_UI.promptDialog({
        title: '修改管理密码',
        message: '新密码至少 6 位',
        placeholder: '请输入新密码', okText: '保存', type: 'password'
      }).then(function (np) {
        if (!np) return;
        if (np.length < 6) { YDJK_UI.toast('密码需至少 6 位', 'err'); return; }
        YDJK.setAdminPass(np);
        YDJK_UI.toast('✅ 管理密码已更新');
      });
    });
  });
})();
