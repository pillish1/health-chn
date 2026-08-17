/* 健康知识页 v4：左列表+右边栏+弹窗阅读（主流内容产品风格） */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function isNew(d) { if (!d) return false; var t = new Date(d + 'T00:00:00'); if (isNaN(t.getTime())) return false; return (Date.now() - t.getTime()) < 7 * 86400000; }
  function getViews(id) { try { return Number(localStorage.getItem('ydjk:views:' + id)) || 0; } catch (e) { return 0; } }
  function addView(id) { try { localStorage.setItem('ydjk:views:' + id, String(getViews(id) + 1)); } catch (e) {} }
  function catColor(c) { return { '训练基础': '#3b82f6', '营养饮食': '#f59e0b', '恢复管理': '#10b981', '健康科普': '#8b5cf6', '健身问答': '#ec4899' }[c] || '#3b82f6'; }

  var cloudArticles = [];
  var currentCat = 'all';
  var currentSort = 'smart';
  var searchQuery = '';

  function allArticles() {
    var b = DATA.ARTICLES.map(function (a) { a._user = false; return a; });
    var u = YDJK.getUserArticles().map(function (a) { a._user = true; return a; });
    return b.concat(u, cloudArticles);
  }
  function getList() {
    var list = allArticles();
    if (currentCat !== 'all') list = list.filter(function (a) { return a.cat === currentCat; });
    if (searchQuery) list = list.filter(function (a) {
      return (a.title || '').toLowerCase().indexOf(searchQuery) !== -1 || (a.excerpt || '').toLowerCase().indexOf(searchQuery) !== -1 || (a.body || '').toLowerCase().indexOf(searchQuery) !== -1;
    });
    if (currentSort === 'new') list.sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
    else if (currentSort === 'hot') list.sort(function (a, b) { return getViews(b.id) - getViews(a.id); });
    else list.sort(function (a, b) { return (getViews(b.id) * 3 + daysSince(b.date)) - (getViews(a.id) * 3 + daysSince(a.date)); });
    return list;
  }
  function daysSince(d) { if (!d) return 0; var t = new Date(d + 'T00:00:00'); if (isNaN(t.getTime())) return 0; return Math.floor((Date.now() - t.getTime()) / 86400000); }

  /* 列表渲染（左侧） */
  function renderList() {
    var list = getList();
    var el = document.getElementById('articleList');
    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="e-icon">📖</div><div class="e-title">没有找到文章</div><div class="e-desc">换个分类或关键词试试</div></div>';
      return;
    }
    el.innerHTML = list.map(function (a) {
      var color = catColor(a.cat);
      return '<article class="kb-item" data-id="' + a.id + '">' +
        '<div class="kb-item-color" style="background:' + color + '"></div>' +
        '<div class="kb-item-main">' +
        '<div class="kb-item-tags">' +
        '<span class="tag" style="background:' + color + '18;color:' + color + '">' + esc(a.cat || '健康') + '</span>' +
        (isNew(a.date) ? '<span class="tag red">NEW</span>' : '') +
        (a._cloud ? '<span class="tag gray" style="font-size:.66rem">云端</span>' : '') +
        '</div>' +
        '<h3 class="kb-item-title">' + esc(a.title) + '</h3>' +
        '<p class="kb-item-excerpt">' + esc(a.excerpt) + '</p>' +
        '<div class="kb-item-meta">' +
        '<span>📅 ' + esc(a.date || '') + '</span>' +
        '<span>⏱ ' + a.readTime + ' 分钟</span>' +
        (getViews(a.id) > 0 ? '<span>👁 ' + getViews(a.id) + '</span>' : '') +
        '</div></div></article>';
    }).join('');
    el.querySelectorAll('.kb-item').forEach(function (item) {
      item.addEventListener('click', function () { openRead(item.dataset.id); });
    });
  }

  /* 弹窗阅读 */
  function openRead(id) {
    var a = getList().find(function (x) { return x.id === id; });
    if (!a) return;
    addView(id);
    var color = catColor(a.cat);
    document.getElementById('readContent').innerHTML =
      '<div class="read-head">' +
      '<div class="read-tags"><span class="tag" style="background:' + color + ';color:#fff">' + esc(a.cat) + '</span>' +
      (isNew(a.date) ? '<span class="tag red">NEW</span>' : '') + '</div>' +
      '<h1 class="read-title">' + esc(a.title) + '</h1>' +
      '<div class="read-meta"><span>📅 ' + esc(a.date || '') + '</span><span>⏱ ' + a.readTime + ' 分钟</span><span>👁 ' + getViews(id) + ' 阅读</span></div>' +
      '<div class="read-excerpt">' + esc(a.excerpt) + '</div></div>' +
      '<div class="read-body">' + (a.body || '') + '</div>' +
      '<div class="read-foot">— 内容来自悦动健康，仅供参考，不构成医疗建议 —</div>';
    YDJK_UI.openModal('readModal');
    renderList(); renderSide();
  }

  /* 边栏渲染 */
  function renderSide() {
    var list = getList();
    // 今日推荐
    var pickEl = document.getElementById('sidePick');
    if (pickEl) {
      var pick = list.length ? list.slice().sort(function (a, b) { return getViews(b.id) - getViews(a.id); })[0] : null;
      if (pick) {
        var color = catColor(pick.cat);
        pickEl.innerHTML = '<div class="side-pick" data-id="' + pick.id + '">' +
          '<div class="side-pick-cat" style="color:' + color + '">' + esc(pick.cat) + '</div>' +
          '<div class="side-pick-title">' + esc(pick.title) + '</div>' +
          '<div class="side-pick-go" style="color:' + color + '">立即阅读 →</div></div>';
        pickEl.querySelector('.side-pick').addEventListener('click', function () { openRead(pick.id); });
      }
    }
    // 热门排行
    var hotEl = document.getElementById('sideHot');
    if (hotEl) {
      var hot = list.slice().sort(function (a, b) { return getViews(b.id) - getViews(a.id); }).slice(0, 5);
      hotEl.innerHTML = hot.map(function (a, i) {
        return '<div class="side-hot-item" data-id="' + a.id + '"><span class="side-hot-num">' + (i + 1) + '</span>' +
          '<div class="side-hot-title">' + esc(a.title) + '</div></div>';
      }).join('') || '<div class="muted small">暂无数据</div>';
      hotEl.querySelectorAll('.side-hot-item').forEach(function (item) {
        item.addEventListener('click', function () { openRead(item.dataset.id); });
      });
    }
    // 分类
    var catEl = document.getElementById('sideCats');
    if (catEl) {
      var cats = ['all', '训练基础', '营养饮食', '恢复管理', '健康科普', '健身问答'];
      catEl.innerHTML = cats.map(function (c) {
        var count = c === 'all' ? allArticles().length : allArticles().filter(function (a) { return a.cat === c; }).length;
        return '<div class="side-cat' + (c === currentCat ? ' active' : '') + '" data-cat="' + c + '">' +
          '<span>' + (c === 'all' ? '✨ 全部' : c) + '</span><span class="side-cat-count">' + count + '</span></div>';
      }).join('');
      catEl.querySelectorAll('.side-cat').forEach(function (item) {
        item.addEventListener('click', function () { currentCat = item.dataset.cat; renderSide(); renderList(); });
      });
    }
  }

  /* 排序 */
  function initSort() {
    var wrap = document.getElementById('kbSort');
    if (!wrap) return;
    wrap.querySelectorAll('.kb-sort-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        wrap.querySelectorAll('.kb-sort-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        currentSort = b.dataset.sort;
        renderList();
      });
    });
  }

  async function loadCloud() {
    try {
      if (window.YD_CLOUD) {
        var arts = await window.YD_CLOUD.loadArticles();
        if (arts && arts.length) {
          cloudArticles = arts.map(function (a) { return { id: 'db-' + a.id, title: a.title || '', cat: a.cat || '健康科普', date: a.date || '', readTime: a.read_time || 5, excerpt: a.excerpt || '', body: a.body || '', _user: true, _cloud: true }; });
          renderList(); renderSide();
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
    renderList();
    renderSide();
    initSort();
    loadCloud();
    checkAdmin();
    var aSearch = document.getElementById('articleSearch');
    if (aSearch) aSearch.addEventListener('input', function () { searchQuery = aSearch.value.trim().toLowerCase(); renderList(); });
    var mgrBtn = document.getElementById('manageArticlesBtn');
    if (mgrBtn) mgrBtn.addEventListener('click', function () { YDJK_UI.toast('云端文章已自动管理', 'info'); });
  });
})();