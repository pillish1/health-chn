/* 首页 v3：今日仪表盘（对标主流健康 App） */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderDashboard() {
    var today = YDJK.today();
    var dateEl = document.getElementById('dashDate');
    if (dateEl) dateEl.textContent = YDJK.fmtDateCN(today);

    var p = YDJK.getProfile();
    var weight = p ? p.weight : 0;
    var lw = YDJK.latestWeight();
    if (lw) weight = lw.weight;

    /* 三环数据 */
    var goalCal = 2000;
    if (p) {
      var bmr = YDJK.calcBMR({ gender: p.gender, age: p.age, height: p.height, weight: weight });
      var tdee = YDJK.calcTDEE(bmr, p.activity);
      goalCal = YDJK.goalCalories(tdee, p.goal);
    }
    var meal = YDJK.mealSummary(today);
    var todayWorkouts = YDJK.getWorkouts(today);
    var workoutCount = todayWorkouts.length;
    var minutes = 0;
    todayWorkouts.forEach(function (w) { minutes += Number(w.minutes) || 0; });
    var workoutDone = workoutCount > 0;
    var streak = YDJK.checkinStreak();

    /* 渲染双环（摄入蓝、运动绿） */
    YDJK_CHARTS.donutChart(document.getElementById('ringMeal'), {
      value: Math.round(meal.kcal), max: Math.round(goalCal), unit: ' kcal', label: '摄入', size: 118, decimals: 0,
      color: meal.kcal > goalCal ? '#ef4444' : '#2563eb'
    });
    YDJK_CHARTS.donutChart(document.getElementById('ringWorkout'), {
      value: workoutDone ? Math.max(workoutCount, minutes / 30) : 0, max: 5, unit: '', label: workoutDone ? workoutCount + ' 项训练' : '运动', size: 118, decimals: 0,
      color: '#10b981'
    });

    /* 数据速览 */
    var sc = document.getElementById('statStreak');
    if (sc) sc.textContent = streak;
    // 每日目标（个性化：建档后显示热量+营养素）
    var dgEl = document.getElementById('dailyGoal');
    if (dgEl) {
      if (p) {
        var m = YDJK.macros(goalCal, p.goal);
        dgEl.style.display = 'block';
        dgEl.innerHTML = '<div class="dg-title">' + (window.YDJK_ICON ? window.YDJK_ICON('target') : '🎯') + ' 你的每日目标</div>' +
          '<div class="dg-items">' +
          '<div class="dg-item"><b>' + Math.round(goalCal) + '</b><span>热量 kcal</span></div>' +
          '<div class="dg-item"><b>' + Math.round(m.protein) + 'g</b><span>蛋白质</span></div>' +
          '<div class="dg-item"><b>' + Math.round(m.carbs) + 'g</b><span>碳水</span></div>' +
          '<div class="dg-item"><b>' + Math.round(m.fat) + 'g</b><span>脂肪</span></div>' +
          '</div>';
      } else {
        dgEl.style.display = 'none';
      }
    }
    // 无档案时优先显示建档引导
    var hasProfile = !!p;
    if (!hasProfile) {
      var tipBody2 = document.getElementById('dashTipBody');
      if (tipBody2) {
        tipBody2.innerHTML = '<a href="index.html?setup=1" style="color:var(--primary);font-weight:700">先建立健康档案，让记录更有意义 →</a>';
      }
    } else {
    // 今日建议（基于数据动态生成）
    var tipBody = document.getElementById('dashTipBody');
    if (tipBody) {
      var tips = [];
      if (meal.count === 0) tips.push('还没有记录饮食，点「记一餐」开始 🍽️');
      else if (meal.kcal < goalCal * 0.5) tips.push('今日摄入偏低，记得补充优质蛋白 🥚');
      else if (meal.kcal > goalCal * 1.2) tips.push('今日摄入略高，可适当增加运动消耗 🏃');
      if (!workoutDone) tips.push('今天还没运动，来 30 分钟动一动吧 💪');
      if (!tips.length) tips.push('今日各项指标都很棒，继续保持！🌟');
      tipBody.textContent = tips[0];
    }
    }

  }

  /* 体重趋势迷你图 */
  function renderTasks() {
    var el = document.getElementById('todayTasks');
    if (!el) return;
    var today = YDJK.today();
    var meal = YDJK.mealSummary(today);
    var todayWk = YDJK.getWorkouts(today);
    var workoutDone = todayWk.length > 0;
    var p = YDJK.getProfile();
    var goalCal = 2000;
    if (p) { var bmr = YDJK.calcBMR(p); var tdee = YDJK.calcTDEE(bmr, p.activity); goalCal = YDJK.goalCalories(tdee, p.goal); }
    var tasks = [
      { icon: (window.YDJK_ICON ? window.YDJK_ICON('food') : '🍽️'), label: '记录饮食', done: meal.count > 0, sub: meal.kcal + ' / ' + Math.round(goalCal) + ' kcal', href: 'foods.html', action: null },
      { icon: (window.YDJK_ICON ? window.YDJK_ICON('run') : '🏃'), label: '记录运动', done: workoutDone, sub: workoutDone ? todayWk.length + ' 项训练' : '记录今天的训练', href: 'plans.html', action: workoutDone ? null : 'quickCheckin' }
    ];
    el.innerHTML = '<div class="task-list">' + tasks.map(function (t) {
      var actionHtml = t.action ? '<button class="btn btn-primary btn-xs js-task-action" data-action="' + t.action + '" style="margin-left:8px">' + (t.action === 'quickWater' ? '+250ml' : '打卡') + '</button>' : '';
      return '<div class="task-item' + (t.done ? ' done' : '') + '" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:8px;text-decoration:none;color:var(--text)">' +
        '<span class="task-ico">' + t.icon + '</span>' +
        '<div class="task-main" style="flex:1"><b>' + t.label + '</b><span class="task-sub" style="display:block;font-size:.78rem;color:var(--muted)">' + t.sub + '</span></div>' +
        (t.done ? '<span style="color:var(--success,#10b981);font-weight:800">✓</span>' : (t.href ? '<button class="btn btn-ghost btn-xs js-task-go" data-href="' + t.href + '" style="color:var(--primary)">去记录</button>' : '')) +
        actionHtml + '</div>';
    }).join('') + '</div>';
    // 绑定快捷操作
    el.querySelectorAll('.js-task-action').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var act = b.dataset.action;
        if (act === 'quickCheckin') {
          location.href = 'plans.html';
        }
      });
    });
    el.querySelectorAll('.js-task-go').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        location.href = b.dataset.href;
      });
    });
  }

  /* 本周达成率（App 化数据卡片） */
  function renderWeekRate() {
    var el = document.getElementById('weekRate');
    if (!el) return;
    var today = YDJK.today();
    var week = YDJK.weekDates(today);
    var doneDays = 0;
    week.forEach(function (d) {
      if (YDJK.getWorkouts(d).length > 0) doneDays++;
    });
    var total = week.length;
    var pct = Math.round(doneDays / total * 100);
    var barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    el.innerHTML =
      '<div class="card" style="padding:16px 18px">' +
      '<div class="flex-between" style="margin-bottom:8px">' +
      '<span class="card-title" style="margin:0">' + (window.YDJK_ICON ? window.YDJK_ICON('stats') : '📊') + ' 本周训练</span>' +
      '<span class="small"><b style="color:' + barColor + '">' + doneDays + '/' + total + '</b> 天</span></div>' +
      '<div class="week-bar" style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">' +
      '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:99px;transition:width .6s ease"></div></div>' +
      '<div class="small muted mt-2">' +
      (pct === 0 ? '本周还没训练，现在开始吧 💪' : pct >= 80 ? '本周状态很棒，继续保持！🌟' : pct >= 50 ? '过半了，再坚持一下！' : '本周训练偏少，加油！') +
      '</div></div>';
  }


  /* 新用户引导：无任何数据时显示欢迎卡 */
  function applyGuestMode() {
    var hasData = false;
    try {
      hasData = !!YDJK.getProfile() ||
        Object.keys(YDJK.getCheckins() || {}).length > 0 ||
        Object.keys(YDJK.getAllWorkouts() || {}).length > 0 ||
        (function () { for (var i = 0; i < localStorage.length; i++) { if ((localStorage.key(i) || '').indexOf('ydjk:meals:') === 0) return true; } return false; })();
    } catch (e) {}
    var isGuest = !hasData;
    if (isGuest) {
      var wm = document.getElementById('welcomeMini');
      if (wm && !wm.innerHTML.trim()) {
        wm.innerHTML = '<div class="welcome-card"><div class="wc-top"><span class="wc-emoji">' + (window.YDJK_ICON ? window.YDJK_ICON('wave') : '👋') + '</span><div><b>欢迎使用悦动健康</b><p>三步开始，先了解自己，再科学记录</p></div></div>' +
          '<div class="wc-steps">' +
          '<div class="wc-step"><span class="wc-n">1</span><div><b>建立健康档案</b><p>填写性别年龄身高体重，帮你算好每日目标</p></div></div>' +
          '<div class="wc-step"><span class="wc-n">2</span><div><b>记录饮食</b><p>点下方「饮食」，搜索食物记下每餐</p></div></div>' +
          '<div class="wc-step"><span class="wc-n">3</span><div><b>记录运动</b><p>点下方「运动」，记录今天的锻炼</p></div></div>' +
          '</div>' +
          '<div class="wc-actions"><button class="btn btn-primary btn-sm" onclick="location.href=\'index.html?setup=1\'">' + (window.YDJK_ICON ? window.YDJK_ICON('clipboard') : '📋') + ' 先建立档案</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="location.href=\'foods.html\'">' + (window.YDJK_ICON ? window.YDJK_ICON('food') : '🍽️') + ' 直接记饮食</button></div></div>';
      }
    }
    return isGuest;
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyGuestMode();
    renderDashboard();
    renderTasks();
    renderWeekRate();
    // 登录后引导建档
    if (location.search.indexOf('setup=1') >= 0 && !YDJK.getProfile() && window.YDJK_UI) {
      setTimeout(function () { window.YDJK_UI.openProfileEditor(); }, 600);
    }
  });

  window.onProfileSaved = function () { renderDashboard(); renderTasks(); renderWeekRate(); };
  window.onDataChanged = function () { renderDashboard(); renderTasks(); renderWeekRate(); };
})();
