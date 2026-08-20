/* 悦动健康 · 统计分析页 */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;
  var currentRange = 'week';

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 获取当前统计范围的天数 */
  function rangeDays() {
    if (currentRange === 'week') return 7;
    if (currentRange === 'month') return 30;
    return 3650;
  }

  /* 计算当前范围内所有记录 */
  function collectRangeData() {
    var days = rangeDays();
    var today = YDJK.today();
    var start = YDJK.addDays(today, -(days - 1));
    var dates = [];
    var d = start;
    for (var i = 0; i < days; i++) {
      dates.push(d);
      d = YDJK.addDays(d, 1);
    }
    var mealDays = 0, mealCount = 0, totalKcal = 0, totalProtein = 0;
    var trainDays = 0, trainCount = 0, totalBurn = 0;
    var weightStart = null, weightNow = null;
    var p = YDJK.getProfile();
    var kg = (p && p.weight) || 60;

    var dailyIntake = [];
    var dailyBurn = [];
    var dailyProtein = [];
    var dailyLabels = [];

    dates.forEach(function (date) {
      var meals = YDJK.getMeals(date);
      var workouts = YDJK.getWorkouts(date);
      var m = YDJK.mealSummary(date);
      if (meals.length > 0) { mealDays++; mealCount += meals.length; totalKcal += m.kcal; totalProtein += m.protein; }
      var dayBurn = 0;
      workouts.forEach(function (w) {
        var met = Number(w.met) || 5;
        var mins = (Number(w.minutes) || 0) > 0 ? Number(w.minutes) : (w.sets ? w.sets * 3 : 20);
        dayBurn += Math.round(met * 3.5 * kg / 200 * mins);
      });
      if (workouts.length > 0) { trainDays++; trainCount += workouts.length; totalBurn += dayBurn; }

      // 图表数据
      dailyLabels.push(date.slice(5)); // MM-DD
      dailyIntake.push(Math.round(m.kcal));
      dailyBurn.push(Math.round(dayBurn));
      dailyProtein.push(Math.round(m.protein * 10) / 10);
    });

    // 体重
    var weights = YDJK.getWeights();
    var wDates = Object.keys(weights).sort();
    var rangeWeights = wDates.filter(function (wd) { return wd >= start && wd <= today; });
    if (rangeWeights.length > 0) {
      weightStart = weights[rangeWeights[0]].w;
      weightNow = weights[rangeWeights[rangeWeights.length - 1]].w;
    }

    return {
      dates: dates,
      dailyLabels: dailyLabels,
      dailyIntake: dailyIntake,
      dailyBurn: dailyBurn,
      dailyProtein: dailyProtein,
      mealDays: mealDays, mealCount: mealCount, totalKcal: totalKcal,
      trainDays: trainDays, trainCount: trainCount, totalBurn: totalBurn,
      weightStart: weightStart, weightNow: weightNow
    };
  }

  /* 渲染统计概览 */
  function renderStatsGrid(data) {
    document.getElementById('statMealDays').textContent = data.mealDays;
    document.getElementById('statMealCount').textContent = data.mealCount;
    document.getElementById('statTrainDays').textContent = data.trainDays;
    document.getElementById('statTrainCount').textContent = data.trainCount;
    document.getElementById('statTotalKcal').textContent = Math.round(data.totalKcal);
    document.getElementById('statTotalBurn').textContent = Math.round(data.totalBurn);
    document.getElementById('statWeightStart').textContent = data.weightStart ? data.weightStart + 'kg' : '--';
    document.getElementById('statWeightNow').textContent = data.weightNow ? data.weightNow + 'kg' : '--';
  }

  /* 渲染图表 */
  function renderCharts(data) {
    // 体重变化
    var wt = window.YDJK_CHARTS;
    if (wt) {
      var weights = YDJK.getWeights();
      var wDates = Object.keys(weights).sort();
      var rangeW = wDates.filter(function (d) { return d >= data.dates[0] && d <= data.dates[data.dates.length - 1]; });
      if (rangeW.length > 0) {
        var wLabels = rangeW.map(function (d) { return d.slice(5); });
        var wValues = rangeW.map(function (d) { return weights[d].w; });
        wt.lineChart(document.getElementById('weightChart'), {
          labels: wLabels, values: wValues, color: '#0ea5e9', unit: 'kg', height: 200
        });
        var first = wValues[0], last = wValues[wValues.length - 1];
        var diff = last - first;
        var info = document.getElementById('weightInfo');
        info.textContent = '期间体重变化：' + (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg' +
          (diff < 0 ? ' 🎉 减重成功！' : diff > 0 ? ' ⚠️ 体重上升' : ' 📊 体重稳定');
        info.style.color = diff < 0 ? '#10b981' : diff > 0 ? 'var(--danger)' : 'var(--muted)';
      } else {
        document.getElementById('weightChart').innerHTML = '<div class="empty" style="padding:24px"><div class="e-icon">⚖️</div><div class="e-title">暂无体重记录</div><div class="e-desc">点右上角「记录体重」开始追踪变化</div></div>';
        document.getElementById('weightInfo').textContent = '';
      }

      // 摄入趋势
      var p = YDJK.getProfile();
      var goalCal = 2000;
      if (p) {
        var bmr = YDJK.calcBMR(p);
        var tdee = YDJK.calcTDEE(bmr, p.activity);
        goalCal = Math.round(YDJK.goalCalories(tdee, p.goal));
      }
      wt.lineChart(document.getElementById('intakeChart'), {
        labels: data.dailyLabels, values: data.dailyIntake, color: '#3b82f6', unit: ' kcal', target: goalCal, height: 200
      });

      // 训练消耗
      wt.lineChart(document.getElementById('burnChart'), {
        labels: data.dailyLabels, values: data.dailyBurn, color: '#10b981', unit: ' kcal', height: 200
      });

      // 蛋白质
      var proteinTarget = Math.round((p ? p.weight : 60) * 1.2);
      wt.lineChart(document.getElementById('proteinChart'), {
        labels: data.dailyLabels, values: data.dailyProtein, color: '#f59e0b', unit: 'g', target: proteinTarget, height: 200
      });
    }
  }

  /* 渲染成就徽章 */
  function renderBadges() {
    var defs = YDJK.getAchievementDefs();
    var unlocked = YDJK.getAchievements();
    var grid = document.getElementById('badgeGrid');
    grid.innerHTML = defs.map(function (b) {
      var isUnlocked = !!unlocked[b.id];
      return '<div class="badge-item' + (isUnlocked ? ' unlocked' : ' locked') + '">' +
        '<div class="badge-icon">' + b.icon + '</div>' +
        '<div class="badge-name">' + esc(b.name) + '</div>' +
        '<div class="badge-desc">' + esc(b.desc) + '</div>' +
        (isUnlocked ? '<div class="badge-check">✓ 已获得</div>' : '<div class="badge-check locked">未解锁</div>') +
        '</div>';
    }).join('');
  }

  /* 渲染训练部位分布 */
  function renderMuscleDist() {
    var days = rangeDays();
    var today = YDJK.today();
    var start = YDJK.addDays(today, -(days - 1));
    var allW = YDJK.getAllWorkouts();
    var muscleCount = {};
    var d = start;
    for (var i = 0; i < days; i++) {
      (allW[d] || []).forEach(function (w) {
        if (w.muscle) muscleCount[w.muscle] = (muscleCount[w.muscle] || 0) + 1;
      });
      d = YDJK.addDays(d, 1);
    }
    var names = { chest: '胸', back: '背', legs: '腿', shoulder: '肩', arms: '手臂', core: '核心', cardio: '有氧', yoga: '瑜伽' };
    var total = Object.keys(muscleCount).reduce(function (s, k) { return s + muscleCount[k]; }, 0);
    var el = document.getElementById('muscleDist');
    if (total === 0) {
      el.innerHTML = '<div class="empty" style="padding:20px"><div class="e-title">暂无训练数据</div></div>';
      return;
    }
    el.innerHTML = Object.keys(muscleCount).map(function (m) {
      var pct = Math.round(muscleCount[m] / total * 100);
      return '<div class="muscle-bar-row"><span class="muscle-name">' + (names[m] || m) + '</span>' +
        '<div class="muscle-bar-bg"><div class="muscle-bar" style="width:' + pct + '%"></div></div>' +
        '<span class="muscle-pct">' + pct + '%</span></div>';
    }).join('');
  }

  /* 初始化 */
  document.addEventListener('DOMContentLoaded', function () {
    // 保存档案时自动解锁成就
    try { var newly = YDJK.checkAchievements(); } catch (e) {}

    // 范围切换
    document.querySelectorAll('.range-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.range-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentRange = btn.dataset.range;
        refresh();
      });
    });

    // 添加体重
    var wBtn = document.getElementById('btnAddWeight');
    if (wBtn) wBtn.addEventListener('click', function () {
      document.getElementById('weightDate').value = YDJK.today();
      document.getElementById('weightInput').value = '';
      document.getElementById('weightNote').value = '';
      window.YDJK_UI.openModal('weightModal');
    });

    var saveW = document.getElementById('btnSaveWeight');
    if (saveW) saveW.addEventListener('click', function () {
      var date = document.getElementById('weightDate').value || YDJK.today();
      var val = Number(document.getElementById('weightInput').value);
      if (!val || val < 20 || val > 300) { window.YDJK_UI.toast('请输入有效体重 (20-300kg)', 'err'); return; }
      var note = document.getElementById('weightNote').value.trim();
      YDJK.addWeight(date, val, note);
      window.YDJK_UI.closeModal('weightModal');
      window.YDJK_UI.toast('✅ 体重已记录');
      refresh();
    });

    // 成就解锁提示
    try {
      var newly = YDJK.checkAchievements();
      if (newly && newly.length > 0) {
        var defs = YDJK.getAchievementDefs();
        var names = defs.filter(function (d) { return newly.indexOf(d.id) >= 0; }).map(function (d) { return d.icon + ' ' + d.name; });
        if (names.length > 0) window.YDJK_UI.toast('🏆 获得成就：' + names.join('、'));
      }
    } catch (e) {}

    refresh();
  });

  function refresh() {
    var data = collectRangeData();
    renderStatsGrid(data);
    renderCharts(data);
    renderBadges();
    renderMuscleDist();
  }

  window.onDataChanged = function () {
    var data = collectRangeData();
    renderStatsGrid(data);
    renderCharts(data);
    renderBadges();
    renderMuscleDist();
  };
})();
