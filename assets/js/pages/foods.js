(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  var currentCat = 'all';
  var currentKcal = 'all';
  var currentFood = null;
  var currentDate = YDJK.today(); // 当前查看/记录的日期（支持历史补记）
  var FOOD_CATS = ['all', 'fav', '主食', '肉蛋', '蔬菜', '水果', '坚果', '饮品', '零食', '快餐', '家常菜'];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- 搜索增强：拼音 / 别名 / 匹配评分 ---------- */
  /* 拼音转换：优先用 py-map.js 的查表（YDJK_PY），兜底降级为字符过滤 */
  function py(str) {
    // 优先完整拼音（py-foods.js 全拼索引），其次首字母（py-map.js），最后字符过滤
    if (window.YDJK_FOOD_PY && window.YDJK_FOOD_PY[str]) return window.YDJK_FOOD_PY[str];
    if (window.YDJK_PY) return window.YDJK_PY(str);
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  /* 匹配评分：0=精确 1=前缀 2=包含 3=拼音精确 4=拼音前缀 5=拼音包含/别名；-1=不匹配 */
  function foodMatchScore(f, q) {
    var names = [f.name.toLowerCase()].concat((f.alias || []).map(function (a) { return String(a).toLowerCase(); }));
    var i;
    for (i = 0; i < names.length; i++) { if (names[i] === q) return 0; }
    for (i = 0; i < names.length; i++) { if (names[i].indexOf(q) === 0) return 1; }
    for (i = 0; i < names.length; i++) { if (names[i].indexOf(q) > -1) return 2; }
    if (/^[a-z0-9]+$/.test(q)) {
      var pn = py(f.name);
      var pi = (window.YDJK_PY ? window.YDJK_PY(f.name) : pn).toLowerCase();
      if (pn === q || (pi && pi === q)) return 3;
      if (pn.indexOf(q) === 0 || (pi && pi.indexOf(q) === 0)) return 4;
      if (pn.indexOf(q) > -1 || (pi && pi.indexOf(q) > -1)) return 5;
      for (i = 0; i < (f.alias || []).length; i++) {
        var an = py(f.alias[i]);
        var ai = (window.YDJK_PY ? window.YDJK_PY(f.alias[i]) : an).toLowerCase();
        if (an.indexOf(q) > -1 || (ai && ai.indexOf(q) > -1)) return 5;
      }
    }
    return -1;
  }

  /* ---------- 日期导航（查看/补记任意一天） ---------- */
  function fmtCN(d) {
    var today = YDJK.today();
    if (d === today) return '今天';
    if (d === YDJK.addDays(today, -1)) return '昨天';
    var p = String(d).split('-');
    return (p[1] ? Number(p[1]) : 0) + '月' + (p[2] ? Number(p[2]) : 0) + '日';
  }
  function renderDateNav() {
    var cn = document.getElementById('dateTextCN');
    var dt = document.getElementById('dateText');
    var it = document.getElementById('intakeTitle');
    var di = document.getElementById('dateInput');
    if (cn) cn.textContent = fmtCN(currentDate);
    if (dt) dt.textContent = currentDate;
    if (it) it.textContent = (currentDate === YDJK.today()) ? '今日摄入' : fmtCN(currentDate) + '摄入';
    if (di) di.value = currentDate;
    var nxt = document.getElementById('dateNext');
    if (nxt) nxt.disabled = currentDate >= YDJK.today();
    var emptyT = document.getElementById('mealEmptyTitle');
    var emptyD = document.getElementById('mealEmptyDesc');
    if (emptyT) emptyT.textContent = (currentDate === YDJK.today()) ? '今天还没有饮食记录' : fmtCN(currentDate) + '还没有饮食记录';
    if (emptyD) emptyD.textContent = (currentDate === YDJK.today()) ? '点「记一餐」，搜索食物记下今天吃的' : '点「记一餐」，补记这一天的饮食';
  }
  function setCurrentDate(d) {
    currentDate = d;
    renderDateNav();
    renderSummary();
    renderMealList();
    
  }

  /* ---------- 我的套餐 ---------- */
  function renderMealTpls() {
    var wrap = document.getElementById('mealTpls');
    if (!wrap) return;
    var tpls = YDJK.getMealTemplates();
    if (!tpls.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<div class="small muted mb-1" style="font-weight:700">📦 我的套餐（一键记一餐）</div>' +
      '<div class="recent-list">' + tpls.map(function (t) {
        var kcal = t.items.reduce(function (s, it) { return s + it.kcal; }, 0);
        return '<span class="tpl-chip" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:99px;background:var(--primary-soft);color:var(--primary);font-size:.8rem;font-weight:700;cursor:pointer;margin:0 6px 6px 0">' + esc(t.name) + ' · ' + kcal + ' kcal' +
          '<button class="js-del-tpl" data-id="' + t.id + '" style="border:none;background:none;color:var(--muted);font-size:.85rem;cursor:pointer;padding:0 2px" title="删除">✕</button></span>';
      }).join('') + '</div>';
    wrap.querySelectorAll('.tpl-chip').forEach(function (chip, i) {
      chip.addEventListener('click', function (ev) {
        if (ev.target.classList.contains('js-del-tpl')) return;
        applyTemplate(tpls[i]);
      });
    });
    wrap.querySelectorAll('.js-del-tpl').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        YDJK.removeMealTemplate(btn.dataset.id);
        renderMealTpls();
        window.YDJK_UI.toast('套餐已删除');
      });
    });
  }
  window._renderMealTpls = function () { renderMealTpls(); };
  function applyTemplate(tpl) {
    // 选餐次（默认当前预设或早餐）
    var type = presetMealType || 'breakfast';
    window.YDJK_UI.confirmDialog({
      title: '套用套餐「' + tpl.name + '」',
      message: '将 ' + tpl.items.length + ' 道食物记入' + (currentDate === YDJK.today() ? '今天' : fmtCN(currentDate)) + '的' + (type === 'breakfast' ? '早餐' : type === 'lunch' ? '午餐' : type === 'dinner' ? '晚餐' : '加餐') + '？',
      okText: '确认套用', cancelText: '取消'
    }).then(function (ok) {
      if (!ok) return;
      tpl.items.forEach(function (it) {
        YDJK.addMeal(currentDate, {
          type: type, name: it.name, kcal: it.kcal,
          protein: it.protein, carbs: it.carbs, fat: it.fat
        });
      });
      window.YDJK_UI.toast('✅ 已套用套餐：' + tpl.name);
      renderMealList();
      renderSummary();
      window.YDJK_UI.closeModal('foodPickerModal');
    });
  }

  /* 复制昨天的饮食到今天 */
  function copyYesterday() {
    var yesterday = YDJK.addDays(currentDate, -1);
    var meals = YDJK.getMeals(yesterday);
    if (!meals.length) { window.YDJK_UI.toast('昨天没有饮食记录', 'err'); return; }
    meals.forEach(function (m) {
      YDJK.addMeal(currentDate, { type: m.type, name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });
    });
    window.YDJK_UI.toast('✅ 已复制昨天的 ' + meals.length + ' 条记录');
    renderMealList();
    renderSummary();
  }

  /* ---------- 今日摄入摘要 ---------- */
  function renderSummary() {
    var today = currentDate;
    var s = YDJK.mealSummary(today);
    var p = YDJK.getProfile();
    var goalCal = 2000;
    if (p) {
      var bmr = YDJK.calcBMR(p);
      var tdee = YDJK.calcTDEE(bmr, p.activity);
      goalCal = YDJK.goalCalories(tdee, p.goal);
    }
    var numEl = document.getElementById('intakeKcalNum');
    if (numEl) numEl.textContent = Math.round(s.kcal);
    var goalEl = document.getElementById('intakeGoalNum');
    if (goalEl) goalEl.textContent = Math.round(goalCal);
    var remainEl = document.getElementById('intakeRemain');
    if (remainEl) {
      var remain = Math.round(goalCal - s.kcal);
      remainEl.textContent = remain >= 0 ? '还可摄入 ' + remain + ' kcal' : '已超目标 ' + (-remain) + ' kcal';
      remainEl.style.color = remain >= 0 ? '' : 'var(--danger)';
    }
    var ring = document.getElementById('calRing');
    YDJK_CHARTS.donutChart(ring, {
      value: s.kcal, max: goalCal, unit: '', label: Math.round(s.kcal), size: 150, decimals: 0,
      color: s.kcal > goalCal ? '#ef4444' : undefined
    });
    var macros = [
      { name: '蛋白质', v: s.protein, color: '#38bdf8' },
      { name: '碳水化合物', v: s.carbs, color: '#f59e0b' },
      { name: '脂肪', v: s.fat, color: '#ef4444' }
    ];
    var targets = p ? YDJK.macros(goalCal, p.goal) : { protein: 60, carbs: 250, fat: 60 };
    document.getElementById('macroBar').innerHTML =
      '<div class="small muted mb-1">已摄入 <b style="color:var(--text)">' + s.kcal + ' kcal</b> / 目标 ' + Math.round(goalCal) + ' kcal · 共 ' + s.count + ' 条记录</div>' +
      macros.map(function (mm) {
        var t = targets[mm.name === '蛋白质' ? 'protein' : mm.name === '碳水化合物' ? 'carbs' : 'fat'];
        var pct = Math.min(100, Math.round(mm.v / t * 100));
        return '<div class="mb-2"><div class="flex-between small" style="margin-bottom:6px"><span><b>' + mm.name + '</b> <span class="muted">' + mm.v + ' / ' + t + ' g</span></span><b>' + pct + '%</b></div>' +
          '<div class="progress"><div class="progress-bar" style="width:' + pct + '%;background:' + mm.color + '"></div></div></div>';
      }).join('');
    var tipEl = document.getElementById('intakeTip');
    if (tipEl) tipEl.innerHTML = '数值为每 100g 可食部的常见估算值，实际以包装标签为准';
  }

  function renderRecent() {
    var el = document.getElementById('recentFoods');
    if (!el) return;
    var recent = [];
    try { recent = JSON.parse(localStorage.getItem('ydjk:recent-foods') || '[]'); } catch (e) {}
    if (!recent.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="small muted mb-1">' + (window.YDJK_ICON ? window.YDJK_ICON('clock') : '🕐') + ' 最近使用</div>' +
      '<div class="recent-list">' + recent.map(function (r) {
        return '<button class="recent-chip" data-name="' + esc(r.name) + '" data-kcal="' + r.kcal + '" data-p="' + r.protein + '" data-c="' + r.carbs + '" data-f="' + r.fat + '">' + esc(r.name) + '</button>';
      }).join('') + '</div>';
    el.querySelectorAll('.recent-chip').forEach(function (btn) {
      btn.addEventListener('click', function () { openMealModal(btn.dataset); });
    });
  }
  function renderCats() {
    var tabs = document.getElementById('catTabs');
    tabs.innerHTML = FOOD_CATS.map(function (c) {
      var label = c === 'all' ? '✨ 全部' : c === 'fav' ? '⭐ 我的收藏' : c;
      return '<button class="tab-btn' + (c === 'all' ? ' active' : '') + '" data-cat="' + c + '">' + label + '</button>';
    }).join('');
    tabs.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentCat = btn.dataset.cat;
        renderFoods();
      });
    });
  }

  /* ---------- 食物网格 ---------- */
  function renderFoods() {
    var searchEl = document.getElementById('foodSearch');
    if (!searchEl) return;
    var q = searchEl.value.trim().toLowerCase();
    var sort = 'default';
    var sortEl = document.getElementById('sortSel');
    if (sortEl) sort = sortEl.value;
    /* 过滤 + 匹配评分：有关键词时按匹配度过滤，无关键词时全量 */
    var scored = [];
    DATA.FOODS.forEach(function (f) {
      if (currentCat === 'fav') { if (!YDJK.isFav(f.name)) return; }
      else if (currentCat !== 'all' && f.cat !== currentCat) return;
      if (currentKcal === 'low' && f.kcal >= 100) return;
      if (currentKcal === 'mid' && (f.kcal < 100 || f.kcal > 300)) return;
      if (currentKcal === 'high' && f.kcal <= 300) return;
      var s = q ? foodMatchScore(f, q) : 0;
      if (s < 0) return;
      f._score = s;
      scored.push(f);
    });
    var list = scored;
    /* 排序：有关键词 → 匹配度优先（同分按热量）；无关键词 → 按选择器 */
    if (q) list.sort(function (a, b) { return a._score - b._score || a.name.length - b.name.length || a.kcal - b.kcal; });
    else if (sort === 'kcal-asc') list.sort(function (a, b) { return a.kcal - b.kcal; });
    else if (sort === 'kcal-desc') list.sort(function (a, b) { return b.kcal - a.kcal; });
    else if (sort === 'protein-desc') list.sort(function (a, b) { return b.protein - a.protein; });
    var grid = document.getElementById('foodGrid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="e-icon">' + (window.YDJK_ICON ? window.YDJK_ICON('meal') : '🥗') + '</div><div class="e-title">没有找到该食物</div><div class="e-desc">换个关键词试试</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (f) {
      var faved = YDJK.isFav(f.name);
      return '<div class="card card-hover food-card" data-name="' + esc(f.name) + '" data-kcal="' + f.kcal + '" data-p="' + f.protein + '" data-c="' + f.carbs + '" data-f="' + f.fat + '">' +
        '<div class="f-head"><div><div class="f-name">' + esc(f.name) + '</div><div class="f-cat">' + f.cat + '</div></div>' +
        '<div class="flex gap-sm" style="gap:10px;align-items:center"><button class="fav-btn js-fav' + (faved ? ' faved' : '') + '" data-name="' + esc(f.name) + '" title="' + (faved ? '取消收藏' : '收藏') + '" aria-label="收藏 ' + esc(f.name) + '">' + (faved ? '♥' : '♡') + '</button>' +
        '<div class="f-kcal">' + f.kcal + '<small style="font-weight:600"> kcal/100g</small></div></div></div>' +
        '<div class="f-macro"><span class="macro-chip">蛋白 ' + f.protein + 'g</span><span class="macro-chip">碳水 ' + f.carbs + 'g</span><span class="macro-chip">脂肪 ' + f.fat + 'g</span></div>' +
        '<button class="btn btn-primary btn-sm btn-block f-action js-meal" data-name="' + esc(f.name) + '" data-kcal="' + f.kcal + '" data-p="' + f.protein + '" data-c="' + f.carbs + '" data-f="' + f.fat + '">' + (window.YDJK_ICON ? window.YDJK_ICON('food') : '🍽️') + ' 记一餐</button></div>';
    }).join('');
    grid.querySelectorAll('.js-meal').forEach(function (btn) {
      btn.addEventListener('click', function () { openMealModal(btn.dataset); });
    });
    grid.querySelectorAll('.js-fav').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.dataset.name;
        var added = YDJK.toggleFav(name);
        if (added) {
          btn.classList.add('faved');
          btn.textContent = '♥';
          btn.title = '取消收藏';
          YDJK_UI.toast('⭐ 已收藏：' + name);
        } else {
          btn.classList.remove('faved');
          btn.textContent = '♡';
          btn.title = '收藏';
          YDJK_UI.toast('已取消收藏', 'err');
          if (currentCat === 'fav') renderFoods();
        }
      });
    });
  }

  /* ---------- 记餐弹窗 ---------- */
  function openMealModal(f) {
    currentFood = f;
    document.getElementById('mealModalTitle').innerHTML = (window.YDJK_ICON ? window.YDJK_ICON('food') : '🍽️') + ' ' + esc(f.name);
    var typeGroup = document.getElementById('mealTypeGroup');
    typeGroup.innerHTML = DATA.MEAL_TYPES.map(function (t, i) {
      return '<div class="radio-pill"><input type="radio" name="mealType" id="mt-' + t.id + '" value="' + t.id + '"' + (i === 0 ? ' checked' : '') + '><label for="mt-' + t.id + '">' + t.emoji + ' ' + t.label + '</label></div>';
    }).join('');
    // 补记预设餐次
    if (presetMealType) {
      var pr = document.getElementById('mt-' + presetMealType);
      if (pr) pr.checked = true;
      presetMealType = null;
    }
    var gram = document.getElementById('mealGram');
    gram.value = 100;
    updateMealCalc();
    var quick = document.getElementById('quickGramBtns');
    if (quick) {
      quick.innerHTML = [50, 100, 150, 200, 300, 500].map(function (g) {
        return '<button class="btn btn-ghost btn-sm" data-g="' + g + '">' + g + 'g</button>';
      }).join('');
      quick.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          document.getElementById('mealGram').value = b.dataset.g;
          updateMealCalc();
        });
      });
    }
    YDJK_UI.openModal('mealModal');
  }

  function updateMealCalc() {
    if (!currentFood) return;
    var gram = Number(document.getElementById('mealGram').value);
    document.getElementById('mealGramVal').textContent = gram + ' g';
    var ratio = gram / 100;
    var kcal = Math.round(currentFood.kcal * ratio);
    var p = (currentFood.p * ratio).toFixed(1);
    var c = (currentFood.c * ratio).toFixed(1);
    var f = (currentFood.f * ratio).toFixed(1);
    document.getElementById('mealCalc').innerHTML = '本次摄入：<b>' + kcal + ' kcal</b> · 蛋白 ' + p + 'g · 碳水 ' + c + 'g · 脂肪 ' + f + 'g';
  }

  function saveMeal() {
    if (!currentFood) return;
    var gram = Number(document.getElementById('mealGram').value);
    var type = document.querySelector('input[name=mealType]:checked').value;
    var ratio = gram / 100;
    var meal = {
      type: type, name: currentFood.name,
      kcal: Math.round(currentFood.kcal * ratio),
      protein: Math.round(currentFood.p * ratio * 10) / 10,
      carbs: Math.round(currentFood.c * ratio * 10) / 10,
      fat: Math.round(currentFood.f * ratio * 10) / 10
    };
    YDJK.addMeal(currentDate, meal);
    // 记录最近使用
    var recent = [];
    try { recent = JSON.parse(localStorage.getItem('ydjk:recent-foods') || '[]'); } catch (e) {}
    recent = recent.filter(function (r) { return r.name !== meal.name; });
    recent.unshift({ name: meal.name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
    if (recent.length > 8) recent.pop();
    try { localStorage.setItem('ydjk:recent-foods', JSON.stringify(recent)); } catch (e) {}
    YDJK_UI.closeModal('mealModal');
    YDJK_UI.toast('✅ 已记录：' + meal.name + '（' + meal.kcal + ' kcal）');
    renderSummary();
    renderMealList();
    
  }
  function safe(fn) {
    try { fn(); } catch (e) { if (window.console) console.error('[foods]', e); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 分步初始化：任一步出错都不影响其它功能绑定
    safe(renderDateNav);
    safe(renderSummary);
    
    safe(renderRecent);
    safe(renderMealTpls);
    // 复制昨天按钮（今天且昨天有记录时显示）
    safe(function () {
      var copyBtn = document.getElementById('btnCopyYesterday');
      if (!copyBtn) return;
      function refreshCopy() {
        var yesterday = YDJK.addDays(currentDate, -1);
        var show = currentDate === YDJK.today() && YDJK.getMeals(currentDate).length === 0 && YDJK.getMeals(yesterday).length > 0;
        copyBtn.style.display = show ? '' : 'none';
      }
      copyBtn.addEventListener('click', copyYesterday);
      window._refreshCopyYesterday = refreshCopy;
      refreshCopy();
    });
    // 存为套餐（记餐弹窗里）
    safe(function () {
      var btn = document.getElementById('btnSaveTpl');
      if (btn) btn.addEventListener('click', function () {
        if (!currentFood) { window.YDJK_UI.toast('请先选择食物', 'err'); return; }
        var gram = Number(document.getElementById('mealGram').value) || 100;
        var ratio = gram / 100;
        // 自定义命名弹窗（与设计语言统一）
        if (window.YDJK_UI && window.YDJK_UI.promptDialog) {
          window.YDJK_UI.promptDialog({ title: '存为套餐', message: '给这个套餐起个名字，之后一键套用', placeholder: currentFood.name, okText: '保存' }).then(function (name) {
            var finalName = String(name || '').trim() || currentFood.name;
            var tpl = {
              id: 'tpl-' + Date.now(),
              name: finalName,
              items: [{
                name: currentFood.name, kcal: Math.round(currentFood.kcal * ratio),
                protein: Math.round(currentFood.p * ratio * 10) / 10,
                carbs: Math.round(currentFood.c * ratio * 10) / 10,
                fat: Math.round(currentFood.f * ratio * 10) / 10
              }]
            };
            YDJK.saveMealTemplate(tpl);
            renderMealTpls();
            window.YDJK_UI.toast('✅ 已存为套餐「' + finalName + '」');
          });
        } else {
          var tpl2 = { id: 'tpl-' + Date.now(), name: currentFood.name, items: [{ name: currentFood.name, kcal: Math.round(currentFood.kcal * ratio), protein: Math.round(currentFood.p * ratio * 10) / 10, carbs: Math.round(currentFood.c * ratio * 10) / 10, fat: Math.round(currentFood.f * ratio * 10) / 10 }] };
          YDJK.saveMealTemplate(tpl2);
          renderMealTpls();
          window.YDJK_UI.toast('✅ 已存为套餐「' + currentFood.name + '」');
        }
      });
    });
    safe(renderCats);
    safe(renderFoods);

    // 食物网格：整卡可点 = 记一餐（薄荷健康式），事件委托不随重渲染丢失
    var grid = document.getElementById('foodGrid');
    if (grid) grid.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.food-card') : null;
      if (!card) return;
      if (e.target.closest('.js-fav') || e.target.closest('.js-meal')) return;
      openMealModal(card.dataset);
    });

    safe(function () {
      var s = document.getElementById('foodSearch');
      var searchTimer = null;
      if (s) s.addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(renderFoods, 180); });
    });
    /* 热量筛选胶囊组 */
    safe(function () {
      var pills = document.querySelectorAll('#kcalPills .kcal-pill');
      pills.forEach(function (p) {
        p.addEventListener('click', function () {
          pills.forEach(function (x) { x.classList.remove('active'); });
          p.classList.add('active');
          currentKcal = p.dataset.kcal;
          renderFoods();
        });
      });
    });
    /* 排序按钮 + 弹出菜单 */
    safe(function () {
      var btn = document.getElementById('sortBtn');
      var menu = document.getElementById('sortMenu');
      if (!btn || !menu) return;
      var cur = 'default';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      menu.querySelectorAll('.sort-opt').forEach(function (o) {
        o.addEventListener('click', function () {
          cur = o.dataset.sort;
          menu.querySelectorAll('.sort-opt').forEach(function (x) { x.classList.remove('active'); });
          o.classList.add('active');
          btn.innerHTML = '<i class="ic" data-icon="sort"></i>' + o.textContent.trim() + '<span class="sort-arrow">▾</span>';
          menu.classList.remove('open');
          var sel = document.getElementById('sortSel');
          if (sel) sel.value = cur;
          renderFoods();
        });
      });
      document.addEventListener('click', function () { menu.classList.remove('open'); });
    });
    safe(function () {
      var g = document.getElementById('mealGram');
      if (g) g.addEventListener('input', updateMealCalc);
    });

    window.onDataChanged = function () { renderSummary();  renderMealList(); };
    safe(function () {
      var ms = document.getElementById('mealSave');
      if (ms) ms.addEventListener('click', saveMeal);
    });

    // 今日饮食记录列表
    safe(renderMealList);
    safe(function () {
      var b = document.getElementById('btnManualMeal');
      if (b) b.addEventListener('click', function () {
        var mt = document.getElementById('manualType');
        if (mt) mt.innerHTML = DATA.MEAL_TYPES.map(function (t) {
          return '<option value="' + t.id + '">' + t.emoji + ' ' + t.label + '</option>';
        }).join('');
        ['manualName', 'manualKcal', 'manualP', 'manualC', 'manualF'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
        window.YDJK_UI.openModal('manualMealModal');
      });
    });
    safe(function () {
      var a = document.getElementById('manualAdd');
      if (a) a.addEventListener('click', function () {
        var nameEl = document.getElementById('manualName');
        var kcalEl = document.getElementById('manualKcal');
        var name = nameEl ? nameEl.value.trim() : '';
        var kcal = Number(kcalEl ? kcalEl.value : 0) || 0;
        if (!name || kcal <= 0) { window.YDJK_UI.toast('请填写食物名称和热量', 'err'); return; }
        var typeEl = document.getElementById('manualType');
        var pEl = document.getElementById('manualP'), cEl = document.getElementById('manualC'), fEl = document.getElementById('manualF');
        YDJK.addMeal(currentDate, {
          type: typeEl ? typeEl.value : 'breakfast',
          name: name, kcal: kcal,
          protein: Number(pEl ? pEl.value : 0) || 0,
          carbs: Number(cEl ? cEl.value : 0) || 0,
          fat: Number(fEl ? fEl.value : 0) || 0
        });
        window.YDJK_UI.closeModal('manualMealModal');
        window.YDJK_UI.toast('✅ 已记录');
        renderMealList();
        renderSummary();
        
      });
    });

    /* 日期导航事件 */
    safe(function () {
      var prev = document.getElementById('datePrev');
      var next = document.getElementById('dateNext');
      var todayBtn = document.getElementById('dateToday');
      var label = document.getElementById('dateLabel');
      var input = document.getElementById('dateInput');
      if (prev) prev.addEventListener('click', function () { setCurrentDate(YDJK.addDays(currentDate, -1)); });
      if (next) next.addEventListener('click', function () {
        var d = YDJK.addDays(currentDate, 1);
        if (d <= YDJK.today()) setCurrentDate(d);
      });
      if (todayBtn) todayBtn.addEventListener('click', function () { setCurrentDate(YDJK.today()); });
      if (label && input) label.addEventListener('click', function () {
        try { if (input.showPicker) input.showPicker(); } catch (e) {}
        input.click();
      });
      if (input) input.addEventListener('change', function () {
        if (input.value && input.value <= YDJK.today()) setCurrentDate(input.value);
        else if (input.value > YDJK.today()) window.YDJK_UI.toast('不能查看未来的日期', 'err');
      });
    });
  });

  /* 当日饮食记录列表（所选日期吃了什么） */
  /* ---------- 当日饮食记录（按时段分组，薄荷健康式） ---------- */
  var presetMealType = null; // 补记时预设的餐次
  function renderMealList() {
    var list = document.getElementById('mealList');
    if (!list) return;
    var meals = YDJK.getMeals(currentDate);
    var empty = document.getElementById('mealEmpty');
    var total = document.getElementById('mealTotal');
    if (empty) empty.classList.add('hidden');
    var grand = 0;
    var html = DATA.MEAL_TYPES.map(function (t) {
      var items = meals.filter(function (m) { return m.type === t.id; });
      var sum = 0;
      var itemsHtml = items.map(function (m) {
        sum += m.kcal; grand += m.kcal;
        return '<div class="meal-item">' +
          '<div class="meal-item-main"><b>' + esc(m.name) + '</b>' +
          '<span class="small muted">' + m.kcal + ' kcal' + (m.protein ? ' · 蛋白' + m.protein + 'g' : '') + '</span></div>' +
          '<div class="meal-item-actions"><button class="btn btn-ghost btn-xs js-del-meal" data-id="' + m.id + '" title="删除">✕</button></div></div>';
      }).join('');
      if (!itemsHtml) itemsHtml = '<div class="meal-empty-row">还没有记录' + t.label + '</div>';
      return '<div class="meal-group">' +
        '<div class="meal-group-head"><span>' + t.emoji + ' ' + t.label + '</span>' +
        '<div style="display:flex;align-items:center;gap:8px"><b class="small">' + sum + ' kcal</b>' +
        '<button class="btn btn-ghost btn-xs js-add-meal" data-type="' + t.id + '" type="button">＋ 补记</button></div></div>' +
        itemsHtml + '</div>';
    }).join('');
    list.innerHTML = html;
    if (window._refreshCopyYesterday) { try { window._refreshCopyYesterday(); } catch (e) {} }
    // 补记 → 打开搜索弹窗（预设餐次）
    list.querySelectorAll('.js-add-meal').forEach(function (btn) {
      btn.addEventListener('click', function () {
        presetMealType = btn.dataset.type;
        window.YDJK_UI.openModal('foodPickerModal');
        setTimeout(function () { var i = document.getElementById('foodSearch'); if (i) i.focus(); }, 100);
      });
    });
    // 删除
    list.querySelectorAll('.js-del-meal').forEach(function (btn) {
      btn.addEventListener('click', function () {
        YDJK.removeMeal(currentDate, btn.dataset.id);
        renderMealList();
        renderSummary();
        window.YDJK_UI.toast('已删除该记录');
      });
    });
    if (total) {
      total.style.display = 'block';
      total.textContent = (currentDate === YDJK.today() ? '今日' : fmtCN(currentDate)) + '共 ' + meals.length + ' 餐 · ' + Math.round(grand) + ' kcal';
    }
  }
})();
