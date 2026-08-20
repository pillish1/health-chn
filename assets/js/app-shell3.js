/* ============================================================
   悦动健康 · App 引擎 v3（单一主题）
   ============================================================ */
(function () {
  'use strict';

  var ROUTES = ['home','foods','plans','stats','profile','about'];
  var currentRoute = null;

  window.YK_APP_VERSION = 'v1.30';

  function getHashRoute() {
    var h = location.hash.replace(/^#\//,'').split('?')[0];
    return ROUTES.indexOf(h) >= 0 ? h : null;
  }

  function navigate(route) {
    if (ROUTES.indexOf(route) >= 0) location.hash = '#/' + route;
  }

  function renderRoute() {
    var route = getHashRoute() || 'home';
    if (route === currentRoute) {
      var v = window.YK3_VIEWS && window.YK3_VIEWS[route];
      if (v && v.refresh) { try { v.refresh(); } catch(e){} }
      return;
    }
    currentRoute = route;

    // Tab 高亮
    document.querySelectorAll('.yk-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.route === route);
    });

    var vp = document.getElementById('yk-viewport');
    if (!vp) return;
    var view = window.YK3_VIEWS && window.YK3_VIEWS[route];
    if (!view) {
      vp.innerHTML = '<div class="yk-empty"><div class="yk-empty-icon">🚧</div><div class="yk-empty-title">页面开发中</div></div>';
      return;
    }

    var el = document.createElement('div');
    el.className = 'yk-view active';
    el.innerHTML = typeof view.template === 'function' ? view.template() : '';
    vp.innerHTML = '';
    vp.appendChild(el);

    injectIcons(el);

    if (typeof view.mounted === 'function') {
      setTimeout(function () { try { view.mounted(el); } catch(e) { console.error('Mounted err:', e); } }, 20);
    }
    vp.scrollTop = 0;
  }

  function injectIcons(root) {
    if (!root || !window.YDJK_ICON) return;
    root.querySelectorAll('i[data-icon]').forEach(function (el) {
      var n = el.getAttribute('data-icon');
      if (n) { el.innerHTML = window.YDJK_ICON(n); el.removeAttribute('data-icon'); }
    });
  }

  /* Toast */
  function showToast(msg, type) {
    var wrap = document.querySelector('.yk-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'yk-toast-wrap';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'yk-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(function () { t.remove(); }, 320);
    }, 2500);
  }

  /* Modal */
  function openModal(html) {
    var mask = document.createElement('div');
    mask.className = 'yk-modal-mask show';
    mask.innerHTML = '<div class="yk-modal">' + html + '</div>';
    document.body.appendChild(mask);
    // 通过 CSS animation 实现入场动画（无需过渡时序）
    var modal = mask.querySelector('.yk-modal');
    if (modal) modal.style.animation = 'ykModalUp .35s var(--ease) both';
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(mask); });
    return mask;
  }

  function closeModal(mask) {
    mask.classList.remove('show');
    setTimeout(function () { if (mask.parentNode) mask.parentNode.removeChild(mask); }, 320);
  }

  /* 初始化 */
  function init() {
    setTimeout(function () {
      var loader = document.getElementById('yk-loader');
      if (loader) loader.classList.add('hidden');
    }, 550);
      // 初始化本地持久化（IndexedDB + 自动快照 + 自动导出）
      try { if (window.YDB && YDB.init) YDB.init(); } catch(e) {}


    renderRoute();
    window.addEventListener('hashchange', renderRoute);

    // 成就
    try {
      if (window.YDJK && YDJK.checkAchievements) {
        var newly = YDJK.checkAchievements();
        if (newly.length > 0) {
          var defs = YDJK.getAchievementDefs();
          var names = defs.filter(function (d) { return newly.indexOf(d.id) >= 0; }).map(function (d) { return d.icon + ' ' + d.name; });
          if (names.length) setTimeout(function () {
            // 分段显示成就
            for (var i = 0; i < names.length; i++) {
              (function (name) { setTimeout(function () { showToast('🏆 ' + name); }, 1500 + i * 900); })(names[i]);
            }
          }, 1500);
        }
      }
    } catch(e) {}
    // 存储错误监听（无条件注册）
    window.addEventListener('ydjk:storage-error', function () {
      showToast('⚠️ 存储空间不足，可能未保存', 'err');
    });
  }

  // 延迟初始化，确保所有视图脚本已加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 100); });
  } else {
    setTimeout(init, 100);
  }


  /* 建档弹窗 */
  function openProfileEditor() {
    var Y = window.YDJK;
    if (!Y) return;
    var hasProfile = !!Y.getProfile();
    var p = Y.getProfile() || {};
    var html =
      '<div class="yk-modal-title">' + (hasProfile ? '编辑健康档案' : '建立健康档案') + '</div>' +
      '<div class="yk-modal-subtitle">设置后将个性化你的每日热量目标</div>' +
      '<div class="yk-field"><label>性别</label><div class="yk-flex yk-gap" id="pfGender">' +
        '<button class="yk-type-btn' + (p.gender !== 'female' ? ' active' : '') + '" data-g="male">👨 男</button>' +
        '<button class="yk-type-btn' + (p.gender === 'female' ? ' active' : '') + '" data-g="female">👩 女</button>' +
      '</div></div>' +
      '<div class="yk-grid-2">' +
        '<div class="yk-field"><label>年龄</label><input class="yk-input" type="number" id="pfAge" value="' + (p.age || '') + '" placeholder="如 25"></div>' +
        '<div class="yk-field"><label>身高 (cm)</label><input class="yk-input" type="number" id="pfHeight" value="' + (p.height || '') + '" placeholder="如 170"></div>' +
      '</div>' +
      '<div class="yk-field"><label>体重 (kg)</label><input class="yk-input" type="number" id="pfWeight" value="' + (p.weight || '') + '" placeholder="如 60" step="0.1"></div>' +
      '<div class="yk-field"><label>目标</label><div class="yk-flex yk-gap" id="pfGoal">' +
        '<button class="yk-type-btn' + ((p.goal || 'keep') === 'cut' ? ' active' : '') + '" data-g="cut">🔥 减脂</button>' +
        '<button class="yk-type-btn' + ((p.goal || 'keep') === 'keep' ? ' active' : '') + '" data-g="keep">🌿 保持</button>' +
        '<button class="yk-type-btn' + ((p.goal || 'keep') === 'bulk' ? ' active' : '') + '" data-g="bulk">💪 增肌</button>' +
      '</div></div>' +
      '<div class="yk-field"><label>日常活动水平</label><div id="pfActivity" style="display:flex;flex-direction:column;gap:6px">' +
        '<button class="yk-type-btn yk-activity' + ((p.activity || 'moderate') === 'sedentary' ? ' active' : '') + '" data-a="sedentary">🪑 久坐少动 · 办公室</button>' +
        '<button class="yk-type-btn yk-activity' + ((p.activity || 'moderate') === 'light' ? ' active' : '') + '" data-a="light">🚶 轻度 · 每周1-3次</button>' +
        '<button class="yk-type-btn yk-activity' + ((p.activity || 'moderate') === 'moderate' ? ' active' : '') + '" data-a="moderate">🏃 中度 · 每周3-5次</button>' +
        '<button class="yk-type-btn yk-activity' + ((p.activity || 'moderate') === 'active' ? ' active' : '') + '" data-a="active">💪 高度 · 每周6-7次</button>' +
        '<button class="yk-type-btn yk-activity' + ((p.activity || 'moderate') === 'very' ? ' active' : '') + '" data-a="very">⚡ 极高 · 体力劳动</button>' +
      '</div></div>' +
      '<div class="yk-modal-actions">' +
        '<button class="yk-btn yk-btn-ghost" id="pfNo">取消</button>' +
        '<button class="yk-btn yk-btn-primary" id="pfYes">保存</button>' +
      '</div>';

    var mask = openModal(html);
    var gender = p.gender || 'male';
    var goal = p.goal || 'keep';
    var activity = p.activity || 'moderate';

    mask.querySelectorAll('#pfGender .yk-type-btn').forEach(function (b) {
      b.onclick = function () {
        gender = b.dataset.g;
        mask.querySelectorAll('#pfGender .yk-type-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
    });
    mask.querySelectorAll('#pfGoal .yk-type-btn').forEach(function (b) {
      b.onclick = function () {
        goal = b.dataset.g;
        mask.querySelectorAll('#pfGoal .yk-type-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
    });
    mask.querySelectorAll('#pfActivity .yk-type-btn').forEach(function (b) {
      b.onclick = function () {
        activity = b.dataset.a;
        mask.querySelectorAll('#pfActivity .yk-type-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
    });
    mask.querySelector('#pfNo').onclick = function () { closeModal(mask); };
    mask.querySelector('#pfYes').onclick = function () {
      var age = Number(mask.querySelector('#pfAge').value);
      var height = Number(mask.querySelector('#pfHeight').value);
      var weight = Number(mask.querySelector('#pfWeight').value);
      if (!age || age < 10 || age > 100) { YK.toast('请输入有效年龄', 'err'); return; }
      if (!height || height < 80 || height > 250) { YK.toast('请输入有效身高', 'err'); return; }
      if (!weight || weight < 20 || weight > 300) { YK.toast('请输入有效体重', 'err'); return; }
      Y.saveProfile({
        gender: gender, age: age, height: height, weight: weight,
        goal: goal, activity: activity,
        createdAt: (p && p.createdAt) || new Date().toISOString()
      });
      closeModal(mask);
      YK.toast('✅ 健康档案已保存');
      // 刷新所有已加载视图
      var vp = document.getElementById('yk-viewport');
      if (vp) {
        var activeView = vp.querySelector('.yk-view.active');
        if (activeView) {
          var route = activeView.getAttribute('data-route') || currentRoute;
          var v = window.YK3_VIEWS && window.YK3_VIEWS[route];
          if (v && v.refresh) v.refresh();
        }
      }
      // 如果当前在首页，强制重新渲染
      if (currentRoute === 'home' && window.YK3_VIEWS && window.YK3_VIEWS.home) {
        window.YK3_VIEWS.home.refresh();
      }
    };
  }

  /*

  // 注意：下面的 } 是多余的闭合，但作为代码符不至于影响

  */
  /* 继续注释 */
  /* 这里开始注释覆盖多余的 } */

  if (false) {



  }

  /* 全局 API */
  window.YK = {
    navigate: navigate,
    toast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    openProfile: openProfileEditor,
    getRoute: function () { return currentRoute; }
  };

  /* 兼容旧 UI */
  window.YDJK_UI = {
    toast: showToast,
    openModal: function () {},
    closeModal: function () {},
    confirmDialog: function (opts) {
      return new Promise(function (resolve) {
        var mask = openModal(
          '<div class="yk-modal-title">' + (opts.title || '确认') + '</div>' +
          (opts.message ? '<div class="yk-modal-subtitle">' + opts.message + '</div>' : '') +
          '<div class="yk-modal-actions">' +
          '<button class="yk-btn yk-btn-ghost" id="yk-cf-no">' + (opts.cancelText || '取消') + '</button>' +
          '<button class="yk-btn yk-btn-primary" id="yk-cf-yes">' + (opts.okText || '确认') + '</button>' +
          '</div>'
        );
        mask.querySelector('#yk-cf-no').addEventListener('click', function () { closeModal(mask); resolve(false); });
        mask.querySelector('#yk-cf-yes').addEventListener('click', function () { closeModal(mask); resolve(true); });
      });
    },
    promptDialog: function (opts) {
      return new Promise(function (resolve) {
        var mask = openModal(
          '<div class="yk-modal-title">' + (opts.title || '请输入') + '</div>' +
          (opts.message ? '<div class="yk-modal-subtitle">' + opts.message + '</div>' : '') +
          '<div class="yk-field"><input class="yk-input" id="yk-pr-input" placeholder="' + (opts.placeholder || '') + '"></div>' +
          '<div class="yk-modal-actions">' +
          '<button class="yk-btn yk-btn-ghost" id="yk-pr-no">' + (opts.cancelText || '取消') + '</button>' +
          '<button class="yk-btn yk-btn-primary" id="yk-pr-yes">' + (opts.okText || '确定') + '</button>' +
          '</div>'
        );
        var input = mask.querySelector('#yk-pr-input');
        setTimeout(function () { input.focus(); }, 100);
        mask.querySelector('#yk-pr-no').addEventListener('click', function () { closeModal(mask); resolve(null); });
        mask.querySelector('#yk-pr-yes').addEventListener('click', function () { closeModal(mask); resolve(input.value || null); });
      });
    }
  };
})();
