(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  var currentCat = 'all';
  var currentKcal = 'all';
  var currentFood = null;
  var FOOD_CATS = ['all', 'fav', '主食', '肉蛋', '蔬菜', '水果', '坚果', '饮品', '零食', '快餐'];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- 今日摄入摘要 ---------- */
  function renderSummary() {
    var today = YDJK.today();
    var s = YDJK.mealSummary(today);
    var p = YDJK.getProfile();
    var goalCal = 2000;
    if (p) {
      var bmr = YDJK.calcBMR(p);
      var tdee = YDJK.calcTDEE(bmr, p.activity);
      goalCal = YDJK.goalCalories(tdee, p.goal);
    }
    var ring = document.getElementById('calRing');
    YDJK_CHARTS.donutChart(ring, {
      value: s.kcal, max: goalCal, unit: ' kcal', label: '目标 ' + Math.round(goalCal), color: s.kcal > goalCal ? '#ef4444' : undefined, size: 150
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
      }).join('') +
      '<div class="small muted mt-2">💡 数值为每 100g 可食部的常见估算值，实际以包装标签为准。</div>';
  }

  /* ---------- 本周摄入概览 ---------- */
  function renderWeekOverview() {
    var el = document.getElementById('weekOverview');
    if (!el) return;
    var week = YDJK.weekDates(YDJK.today());
    var total = 0, days = 0;
    week.forEach(function (d) {
      var m = YDJK.mealSummary(d);
      if (m.kcal > 0) { total += m.kcal; days++; }
    });
    var p = YDJK.getProfile();
    var goal = 2000;
    if (p) { var bmr = YDJK.calcBMR(p); goal = YDJK.goalCalories(YDJK.calcTDEE(bmr, p.activity), p.goal); }
    var avg = days ? Math.round(total / days) : 0;
    var pct = goal ? Math.round(avg / goal * 100) : 0;
    el.innerHTML = '<div class="card" style="padding:14px 18px">' +
      '<div class="flex-between flex-wrap" style="gap:8px">' +
      '<div><b class="small">📊 本周摄入</b><div class="small muted">记录 ' + days + ' 天 · 日均 ' + avg + ' kcal</div></div>' +
      '<div style="min-width:120px"><div class="progress" style="height:8px"><div class="progress-bar" style="width:' + Math.min(100, pct) + '%' + (pct > 100 ? ';background:linear-gradient(90deg,#f87171,#ef4444)' : '') + '"></div></div>' +
      '<div class="small muted mt-1" style="text-align:right">目标 ' + Math.round(goal) + ' kcal · ' + pct + '%</div></div></div></div>';
  }
  function renderRecent() {
    var el = document.getElementById('recentFoods');
    if (!el) return;
    var recent = [];
    try { recent = JSON.parse(localStorage.getItem('ydjk:recent-foods') || '[]'); } catch (e) {}
    if (!recent.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="small muted mb-1">🕐 最近使用</div>' +
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
    var q = document.getElementById('foodSearch').value.trim().toLowerCase();
    var sort = document.getElementById('sortSel').value;
    var list = DATA.FOODS.filter(function (f) {
      if (currentCat === 'fav') { if (!YDJK.isFav(f.name)) return false; }
      else if (currentCat !== 'all' && f.cat !== currentCat) return false;
      if (currentKcal === 'low' && f.kcal >= 100) return false;
      if (currentKcal === 'mid' && (f.kcal < 100 || f.kcal > 300)) return false;
      if (currentKcal === 'high' && f.kcal <= 300) return false;
      if (q && f.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (sort === 'kcal-asc') list.sort(function (a, b) { return a.kcal - b.kcal; });
    else if (sort === 'kcal-desc') list.sort(function (a, b) { return b.kcal - a.kcal; });
    else if (sort === 'protein-desc') list.sort(function (a, b) { return b.protein - a.protein; });
    var grid = document.getElementById('foodGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="e-icon">🥗</div><div class="e-title">没有找到该食物</div><div class="e-desc">换个关键词试试</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (f) {
      var faved = YDJK.isFav(f.name);
      return '<div class="card card-hover food-card">' +
        '<div class="f-head"><div><div class="f-name">' + esc(f.name) + '</div><div class="f-cat">' + f.cat + '</div></div>' +
        '<div class="flex gap-sm" style="gap:10px;align-items:center"><button class="fav-btn js-fav' + (faved ? ' faved' : '') + '" data-name="' + esc(f.name) + '" title="' + (faved ? '取消收藏' : '收藏') + '" aria-label="收藏 ' + esc(f.name) + '">' + (faved ? '♥' : '♡') + '</button>' +
        '<div class="f-kcal">' + f.kcal + '<small style="font-weight:600"> kcal/100g</small></div></div></div>' +
        '<div class="f-macro"><span class="macro-chip">蛋白 ' + f.protein + 'g</span><span class="macro-chip">碳水 ' + f.carbs + 'g</span><span class="macro-chip">脂肪 ' + f.fat + 'g</span></div>' +
        '<button class="btn btn-primary btn-sm btn-block f-action js-meal" data-name="' + esc(f.name) + '" data-kcal="' + f.kcal + '" data-p="' + f.protein + '" data-c="' + f.carbs + '" data-f="' + f.fat + '">🍽️ 记一餐</button></div>';
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
    document.getElementById('mealModalTitle').textContent = '🍽️ ' + f.name;
    var typeGroup = document.getElementById('mealTypeGroup');
    typeGroup.innerHTML = DATA.MEAL_TYPES.map(function (t, i) {
      return '<div class="radio-pill"><input type="radio" name="mealType" id="mt-' + t.id + '" value="' + t.id + '"' + (i === 0 ? ' checked' : '') + '><label for="mt-' + t.id + '">' + t.emoji + ' ' + t.label + '</label></div>';
    }).join('');
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
      fat: Math.round(currentFood.f * ratio * 10) / 10,
      photo: window._mealPhotoData ? window._mealPhotoData() : null
    };
    YDJK.addMeal(YDJK.today(), meal);
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
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderSummary();
    renderWeekOverview();
    renderRecent();
    renderCats();
    renderFoods();
    document.getElementById('foodSearch').addEventListener('input', renderFoods);
    document.getElementById('sortSel').addEventListener('change', renderFoods);
    document.getElementById('kcalRange').addEventListener('change', function () {
      currentKcal = document.getElementById('kcalRange').value;
      renderFoods();
    });
    document.getElementById('mealGram').addEventListener('input', updateMealCalc);

    // 拍照记餐（存本地缩略图）
    var photoInput = document.getElementById('mealPhotoInput');
    var photoData = null;
    var btnPhoto = document.getElementById('btnPhoto');
    if (btnPhoto) btnPhoto.addEventListener('click', function () { photoInput.click(); });
    if (photoInput) photoInput.addEventListener('change', function () {
      var file = photoInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { YDJK_UI.toast('图片需小于 2MB', 'err'); return; }
      var reader = new FileReader();
      reader.onload = function () {
        photoData = reader.result;
        var pImg = document.getElementById('mealPhotoImg'); if (pImg) pImg.src = photoData;
        var pPrev = document.getElementById('mealPhotoPreview'); if (pPrev) pPrev.style.display = 'block';
        YDJK_UI.toast('📷 照片已添加');
      };
      reader.readAsDataURL(file);
      photoInput.value = '';
    });
    // 保存时附带照片
    window._mealPhotoData = function () { return photoData; };
    window.onDataChanged = function () { renderSummary(); renderWeekOverview(); };
    document.getElementById('mealSave').addEventListener('click', saveMeal);
  });
})();
