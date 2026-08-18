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
    var weight = p ? p.weight : 60;

    /* 目标热量 */
    var goalCal = 2000;
    if (p) {
      var bmr = YDJK.calcBMR({ gender: p.gender, age: p.age, height: p.height, weight: weight });
      var tdee = YDJK.calcTDEE(bmr, p.activity);
      goalCal = YDJK.goalCalories(tdee, p.goal);
    }

    /* 摄入 / 消耗 */
    var meal = YDJK.mealSummary(today);
    var intake = Math.round(meal.kcal);
    var workouts = YDJK.getWorkouts(today);
    var burn = 0;
    workouts.forEach(function (w) {
      var met = Number(w.met) || 5;
      var mins = (Number(w.minutes) || 0) > 0 ? Number(w.minutes) : (w.sets ? w.sets * 3 : 20);
      burn += Math.round(met * 3.5 * weight / 200 * mins);
    });
    var net = intake - burn;
    var streak = YDJK.checkinStreak();

    /* 摄入环 */
    YDJK_CHARTS.donutChart(document.getElementById('ringMeal'), {
      value: intake, max: Math.round(goalCal), unit: ' kcal', label: '摄入', size: 140, decimals: 0,
      color: intake > goalCal ? '#ef4444' : '#2563eb'
    });

    /* 能量信息 */
    var gEl = document.getElementById('eiGoal');
    if (gEl) gEl.textContent = Math.round(goalCal);
    var iEl = document.getElementById('eiIntake');
    if (iEl) iEl.textContent = intake;
    var bEl = document.getElementById('eiBurn');
    if (bEl) bEl.textContent = burn;
    var nEl = document.getElementById('eiNet');
    if (nEl) { nEl.textContent = net; nEl.style.color = net > 0 ? 'var(--danger)' : (net < 0 ? '#10b981' : 'var(--text)'); }
    var netTag = document.getElementById('netTag');
    if (netTag) {
      if (net < 0) { netTag.textContent = '热量缺口 🔥 减脂中'; netTag.className = 'net-tag green'; }
      else if (net > 0) { netTag.textContent = '热量盈余 · 需控制'; netTag.className = 'net-tag red'; }
      else { netTag.textContent = '收支平衡'; netTag.className = 'net-tag'; }
    }

    /* 连续天数 */
    var sc = document.getElementById('statStreak');
    if (sc) sc.textContent = streak;

    /* 三大营养素进度条 */
    var mm = p ? YDJK.macros(goalCal, p.goal) : { protein: 60, carbs: 250, fat: 60 };
    var macrosEl = document.getElementById('energyMacros');
    if (macrosEl) {
      var items = [
        { name: '蛋白质', v: Math.round(meal.protein), t: Math.round(mm.protein), color: '#38bdf8' },
        { name: '碳水', v: Math.round(meal.carbs), t: Math.round(mm.carbs), color: '#f59e0b' },
        { name: '脂肪', v: Math.round(meal.fat), t: Math.round(mm.fat), color: '#ef4444' }
      ];
      macrosEl.innerHTML = items.map(function (it) {
        var pct = Math.min(100, Math.round(it.v / it.t * 100));
        return '<div class="em-item"><div class="em-head"><span>' + it.name + ' <b>' + it.v + '/' + it.t + 'g</b></span><b>' + pct + '%</b></div>' +
          '<div class="progress" style="height:6px"><div class="progress-bar" style="width:' + pct + '%;background:' + it.color + '"></div></div></div>';
      }).join('');
    }

    /* 今日记录简览 */
    renderTodayBrief(today, meal, workouts);

    /* 一周一览 */
    renderWeekCard(today, streak);

    /* 今日建议 */
    var tipBody = document.getElementById('dashTipBody');
    if (tipBody) {
      var tips = [];
      if (!p) tips.push('<a href="index.html?setup=1" style="color:var(--primary);font-weight:700">先建立健康档案，让记录更有意义 →</a>');
      if (meal.count === 0) tips.push('还没有记录饮食，点「记一餐」开始 🍽️');
      else if (meal.kcal < goalCal * 0.5) tips.push('今日摄入偏低，记得补充优质蛋白 🥚');
      else if (meal.kcal > goalCal * 1.2) tips.push('今日摄入略高，可适当增加运动消耗 🏃');
      if (!workouts.length) tips.push('今天还没运动，来 30 分钟动一动吧 💪');
      if (!tips.length) tips.push('今日各项指标都很棒，继续保持！🌟');
      tipBody.textContent = tips[0].replace(/<[^>]+>/g, '');
      tipBody.innerHTML = tips[0];
    }
  }

  /* 今日记录简览：饮食按餐次 + 运动列表 */
  function renderTodayBrief(today, meal, workouts) {
    var el = document.getElementById('todayBrief');
    if (!el) return;
    if (meal.count === 0 && !workouts.length) { el.innerHTML = ''; return; }
    var html = '<div class="brief-grid">';
    if (meal.count > 0) {
      var meals = YDJK.getMeals(today);
      var byType = {};
      meals.forEach(function (m) { byType[m.type] = (byType[m.type] || 0) + 1; });
      var typeNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
      var typeStr = DATA.MEAL_TYPES.map(function (t) {
        if (!byType[t.id]) return '';
        var kcal = 0;
        meals.forEach(function (m) { if (m.type === t.id) kcal += m.kcal; });
        return '<span class="brief-chip blue"><b>' + typeNames[t.id] || t.label + '</b> ' + byType[t.id] + ' 条 · ' + Math.round(kcal) + ' kcal</span>';
      }).filter(Boolean).join('');
      html += '<div class="brief-card"><div class="brief-title"><i class="ic" data-icon="food"></i> 今日饮食</div>' +
        '<div class="brief-chips">' + typeStr + '</div></div>';
    }
    if (workouts.length) {
      var wkHtml = workouts.slice(0, 4).map(function (w) {
        var kcal = 0;
        var met = Number(w.met) || 5;
        var mins = (Number(w.minutes) || 0) > 0 ? Number(w.minutes) : (w.sets ? w.sets * 3 : 20);
        kcal = Math.round(met * 3.5 * ((window.YDJK.getProfile() || {}).weight || 60) / 200 * mins);
        return '<span class="brief-chip green">' + esc(w.action) + ' · ' + (w.sets ? w.sets + '×' + (w.reps || '') : '') + ' · ' + kcal + ' kcal</span>';
      }).join('');
      html += '<div class="brief-card"><div class="brief-title"><i class="ic" data-icon="run"></i> 今日运动</div>' +
        '<div class="brief-chips">' + wkHtml + '</div></div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  /* 一周一览：7 天圆点（饮食蓝/运动绿）+ 连续天数 */
  function renderWeekCard(today, streak) {
    var el = document.getElementById('weekCard');
    if (!el) return;
    var week = YDJK.weekDates(today);
    var dots = week.map(function (d) {
      var meals = YDJK.getMeals(d).length > 0;
      var wks = YDJK.getWorkouts(d).length > 0;
      var cls = meals && wks ? 'both' : meals ? 'meal' : wks ? 'workout' : '';
      var label = fmtCN(d);
      return '<div class="wd"><div class="wd-dot' + (cls ? ' ' + cls : '') + '" title="' + label + (meals ? ' · 有饮食' : '') + (wks ? ' · 有运动' : '') + '"></div><span class="wd-lbl">' + label.replace('月', '/').replace('日', '') + '</span></div>';
    }).join('');
    el.innerHTML = '<div class="card" style="padding:16px 18px">' +
      '<div class="flex-between" style="margin-bottom:12px">' +
      '<span class="card-title" style="margin:0"><i class="ic" data-icon="calendar"></i> 本周记录</span>' +
      '<span class="small muted">连续 <b style="color:var(--accent)">' + streak + '</b> 天记录</span></div>' +
      '<div class="week-dots">' + dots + '</div>' +
      '<div class="week-legend" style="margin-top:10px;display:flex;gap:14px;justify-content:center">' +
      '<span class="small muted" style="display:inline-flex;align-items:center;gap:4px"><i class="wd-dot meal" style="width:10px;height:10px;display:inline-block"></i>饮食</span>' +
      '<span class="small muted" style="display:inline-flex;align-items:center;gap:4px"><i class="wd-dot workout" style="width:10px;height:10px;display:inline-block"></i>运动</span>' +
      '<span class="small muted" style="display:inline-flex;align-items:center;gap:4px"><i class="wd-dot both" style="width:10px;height:10px;display:inline-block"></i>都有</span>' +
      '</div></div>';
  }

  function fmtCN(d) {
    var today = YDJK.today();
    if (d === today) return '今天';
    if (d === YDJK.addDays(today, -1)) return '昨天';
    var p = String(d).split('-');
    return (p[1] ? Number(p[1]) : 0) + '月' + (p[2] ? Number(p[2]) : 0) + '日';
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
    // 登录后引导建档
    if (location.search.indexOf('setup=1') >= 0 && !YDJK.getProfile() && window.YDJK_UI) {
      setTimeout(function () { window.YDJK_UI.openProfileEditor(); }, 600);
    }
  });

  window.onProfileSaved = function () { renderDashboard(); };
  window.onDataChanged = function () { renderDashboard(); };
})();