(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var today = YDJK.today();
  var viewDate = today; // 当前查看日期（默认今天，可切换历史）

  function goalCal() {
    var p = YDJK.getProfile();
    if (!p) return 2000;
    return YDJK.goalCalories(YDJK.calcTDEE(YDJK.calcBMR(p), p.activity), p.goal);
  }

  /* ---------- 日期导航 ---------- */
  function renderDateNav() {
    var inp = document.getElementById('viewDate');
    if (inp) inp.value = viewDate;
    var hint = document.getElementById('viewDateHint');
    if (hint) {
      hint.textContent = viewDate === today ? '' : '⏳ 正在查看 ' + YDJK.fmtDateCN(viewDate) + '（非今天）的数据，记录会写入该日期';
    }
    var isToday = viewDate === today;
    var lbls = document.querySelectorAll('.js-view-label');
    lbls.forEach(function (l) {
      l.textContent = isToday ? '今日' : viewDate.slice(5).replace('-', '/');
    });
  }

  /* ---------- 顶部统计 ---------- */
  function renderStats() {
    var s = YDJK.mealSummary(viewDate);
    var g = goalCal();
    var water = YDJK.getWater(viewDate);
    var c = YDJK.getCheckin(viewDate);
    var minutes = c ? (c.minutes || 0) : 0;
    var streak = YDJK.checkinStreak(viewDate);
    document.getElementById('stKcal').textContent = s.kcal + ' / ' + Math.round(g);
    document.getElementById('stWater').textContent = water + ' / ' + YDJK.getWaterGoal() + ' ml';
    document.getElementById('stMin').textContent = minutes + ' 分钟';
    document.getElementById('stStreak').textContent = streak + ' 天';
    renderWater();
  }

  /* ---------- 体重（含目标线） ---------- */
  function renderWeight() {
    var ws = YDJK.getWeights();
    var last30 = ws.slice(-30);
    var target = YDJK.getWeightGoal();
    var chart = document.getElementById('weightChart');
    YDJK_CHARTS.lineChart(chart, {
      labels: last30.map(function (w) { return w.date.slice(5); }),
      values: last30.map(function (w) { return w.weight; }),
      unit: ' kg', color: '#2563eb',
      target: target || undefined
    });
    var delta = document.getElementById('weightDelta');
    if (ws.length >= 2) {
      var first = ws[0].weight, last = ws[ws.length - 1].weight;
      var d = last - first;
      delta.textContent = '累计 ' + (d >= 0 ? '+' : '') + d.toFixed(1) + ' kg';
    } else {
      delta.textContent = '';
    }
    // 目标输入与提示
    var gi = document.getElementById('weightGoalInput');
    if (gi && document.activeElement !== gi) gi.value = target || '';
    var hint = document.getElementById('weightGoalHint');
    if (hint) {
      if (target && ws.length) {
        var cur = ws[ws.length - 1].weight;
        var diff = cur - target;
        hint.textContent = '当前 ' + cur + ' kg · ' + (diff > 0 ? '还差 ' + diff.toFixed(1) + ' kg' : diff < 0 ? '已低于目标 ' + Math.abs(diff).toFixed(1) + ' kg' : '🎯 已达目标！');
      } else if (target) {
        hint.textContent = '目标 ' + target + ' kg · 记录体重后显示差距';
      } else {
        hint.textContent = '设置一个目标体重，趋势图上会显示参考线';
      }
    }
    var list = document.getElementById('weightList');
    if (!ws.length) {
      list.innerHTML = '<div class="muted small">暂无记录，输入体重后点「记录」</div>';
      return;
    }
    var recent = ws.slice(-6).reverse();
    list.innerHTML = recent.map(function (w) {
      return '<div class="list-row"><div class="lr-main"><span class="small">' + esc(w.date) + '</span></div><div class="lr-side"><b>' + w.weight + ' kg</b> <button class="btn btn-ghost btn-sm js-del-w" data-date="' + w.date + '" style="margin-left:8px">✕</button></div></div>';
    }).join('') + (ws.length > 6 ? '<div class="small muted mt-1">…共 ' + ws.length + ' 条记录</div>' : '');
    list.querySelectorAll('.js-del-w').forEach(function (b) {
      b.addEventListener('click', function () {
        YDJK.removeWeight(b.dataset.date);
        renderWeight(); renderStats();
        YDJK_UI.toast('已删除该体重记录');
      });
    });
  }

  /* ---------- 运动打卡 ---------- */
  var ALL_ACTIONS = [
    { id: 'strength', label: '💪 力量训练' },
    { id: 'cardio', label: '🏃 有氧运动' },
    { id: 'yoga', label: '🧘 拉伸瑜伽' },
    { id: 'ball', label: '⚽ 球类运动' },
    { id: 'other', label: '✨ 其他运动' }
  ];

  function renderCheckin() {
    var c = YDJK.getCheckin(viewDate) || { types: [], minutes: 0 };
    var chips = ALL_ACTIONS.map(function (a) {
      var on = (c.types || []).indexOf(a.id) !== -1;
      return '<button class="btn ' + (on ? 'btn-primary' : 'btn-ghost') + ' btn-sm js-type" data-type="' + a.id + '">' + a.label + '</button>';
    }).join('');
    var planName = '';
    if (c.plan) {
      var pl = DATA.PLANS.find(function (x) { return x.id === c.plan; });
      if (!pl) pl = YDJK.getMyPlans().find(function (x) { return x.id === c.plan; });
      if (pl) planName = pl.emoji + ' ' + pl.name;
    }
    var extra = (c.types || []).filter(function (t) { return !ALL_ACTIONS.some(function (a) { return a.id === t; }); });
    var extras = extra.map(function (t) { return '<span class="tag green">' + esc(t) + '</span>'; }).join(' ');

    document.getElementById('todayCheckin').innerHTML =
      '<div class="flex gap-sm flex-wrap">' + chips + '</div>' +
      (planName || extras ? '<div class="mt-2 flex gap-sm flex-wrap">' + (planName ? '<span class="tag blue">📋 ' + planName + '</span>' : '') + extras + '</div>' : '') +
      '<div class="field mt-2" style="margin-bottom:0"><label class="small js-view-label">今日</label>运动时长（分钟）' +
      '<div class="range-wrap"><input type="range" id="minRange" min="0" max="180" value="' + (c.minutes || 0) + '" step="5">' +
      '<span class="range-val" id="minVal">' + (c.minutes || 0) + ' 分钟</span></div></div>';

    document.querySelectorAll('.js-type').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var c2 = YDJK.getCheckin(viewDate) || { types: [], minutes: 0 };
        var id = btn.dataset.type;
        if (!c2.types) c2.types = [];
        var idx = c2.types.indexOf(id);
        if (idx >= 0) c2.types.splice(idx, 1); else c2.types.push(id);
        c2.date = viewDate;
        if (c2.types.length === 0 && !c2.plan && (!c2.minutes || c2.minutes === 0)) YDJK.removeCheckin(viewDate);
        else YDJK.setCheckin(viewDate, c2);
        btn.classList.add('btn-pop');
        setTimeout(function () { btn.classList.remove('btn-pop'); }, 400);
        renderCheckin(); renderStats(); renderCalendar(); renderWeekSummary();
        YDJK_UI.checkMilestone(viewDate);
      });
    });
    var range = document.getElementById('minRange');
    if (range) {
      var val = document.getElementById('minVal');
      range.addEventListener('input', function () { val.textContent = range.value + ' 分钟'; });
      range.addEventListener('change', function () {
        var c3 = YDJK.getCheckin(viewDate) || { types: [], minutes: 0, date: viewDate };
        c3.minutes = Number(range.value);
        c3.date = viewDate;
        if (c3.minutes === 0 && (!c3.types || c3.types.length === 0) && !c3.plan) YDJK.removeCheckin(viewDate);
        else YDJK.setCheckin(viewDate, c3);
        renderStats(); renderCalendar(); renderWeekSummary();
        YDJK_UI.checkMilestone(viewDate);
      });
    }
  }

  /* ---------- 打卡日历 ---------- */
  var calYear = null, calMonth = null;
  function renderCalendar() {
    var now = new Date();
    if (calYear === null) { calYear = now.getFullYear(); calMonth = now.getMonth() + 1; }
    var y = calYear, m = calMonth;
    document.getElementById('monthLabel').textContent = y + ' 年 ' + m + ' 月';
    var all = YDJK.getCheckins();
    var data = {};
    Object.keys(all).forEach(function (d) {
      if (d.indexOf(String(y) + '-' + String(m).padStart(2, '0')) !== 0) return;
      var c = all[d];
      var lv = 0;
      if (c.types && c.types.length) lv += Math.min(2, c.types.length);
      if (c.plan) lv += 1;
      if (c.minutes && c.minutes > 0) lv += 1;
      data[d] = Math.min(4, lv);
    });
    YDJK_CHARTS.calendarHeatmap(document.getElementById('calHeatmap'), y, m, data);
  }

  /* ---------- 饮食记录 ---------- */
  function renderMeals() {
    var meals = YDJK.getMeals(viewDate);
    var s = YDJK.mealSummary(viewDate);
    var empty = document.getElementById('mealEmpty');
    var list = document.getElementById('mealList');
    if (!meals.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = DATA.MEAL_TYPES.map(function (t) {
        var items = meals.filter(function (x) { return x.type === t.id; });
        if (!items.length) return '';
        return '<div class="mb-2"><div class="small muted" style="margin-bottom:6px">' + t.emoji + ' ' + t.label + '</div>' +
          items.map(function (x) {
            return '<div class="list-row"><div class="lr-main" style="display:flex;align-items:center;gap:10px">' +
              (x.photo ? '<img src="' + x.photo + '" style="width:38px;height:38px;border-radius:10px;object-fit:cover;flex:none" alt="">' : '') +
              '<div style="min-width:0"><b class="small">' + esc(x.name) + '</b><span class="lr-sub">' + x.kcal + ' kcal · P' + x.protein + ' C' + x.carbs + ' F' + x.fat + '</span></div></div>' +
              '<div class="lr-side flex gap-sm" style="gap:6px">' +
              '<button class="btn btn-ghost btn-sm js-edit-meal" data-id="' + x.id + '" title="编辑">✏️</button>' +
              '<button class="btn btn-ghost btn-sm js-del-meal" data-id="' + x.id + '" title="删除">✕</button></div></div>';
          }).join('') + '</div>';
      }).join('');
      list.querySelectorAll('.js-del-meal').forEach(function (b) {
        b.addEventListener('click', function () {
          YDJK.removeMeal(viewDate, b.dataset.id);
          renderMeals(); renderStats(); renderWeekSummary();
          YDJK_UI.toast('已删除该记录', 'err');
        });
      });
      list.querySelectorAll('.js-edit-meal').forEach(function (b) {
        b.addEventListener('click', function () { openMealEdit(b.dataset.id); });
      });
    }
    var total = document.getElementById('mealTotal');
    total.innerHTML = '<span class="js-view-label">今日</span>合计：<b>' + s.kcal + ' kcal</b> · 蛋白 ' + s.protein + 'g · 碳水 ' + s.carbs + 'g · 脂肪 ' + s.fat + 'g';
  }

  /* ---------- 饮水 ---------- */
  function renderWater() {
    var goal = YDJK.getWaterGoal();
    var w = YDJK.getWater(viewDate);
    var pct = Math.min(100, Math.round(w / goal * 100));
    document.getElementById('waterNow').textContent = w + ' / ' + goal + ' ml';
    document.getElementById('waterBar').style.width = pct + '%';
    var gi = document.getElementById('waterGoalInput');
    if (gi && document.activeElement !== gi) gi.value = goal;
  }

  /* ---------- 分享我的健康 ---------- */
  function shareHealth() {
    var days = activeCheckinDays();
    var totalMin = 0;
    var all = YDJK.getCheckins();
    days.forEach(function (d) { totalMin += (all[d].minutes || 0); });
    var mealCount = totalMealCount();
    var ws = YDJK.getWeights();
    var streak = maxStreak(days);
    var p = YDJK.getProfile();
    var nick = '';
    try { nick = localStorage.getItem('ydjk:nickname') || ''; } catch (e) {}
    var name = nick || (p ? (p.gender === 'male' ? '这位' : '这位') : '我');
    // 体重变化
    var weightChange = '';
    if (ws.length >= 2) {
      var first = ws[0].weight, last = ws[ws.length - 1].weight;
      var diff = last - first;
      weightChange = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg';
    }
    var shareText = '🏃 悦动健康 · ' + name + '的健康报告\n' +
      '━━━━━━━━━━━━━━━\n' +
      '📅 累计打卡：' + days.length + ' 天\n' +
      '⏱️ 累计运动：' + totalMin + ' 分钟\n' +
      '🍽️ 累计饮食记录：' + mealCount + ' 餐\n' +
      '🔥 最长连续：' + streak + ' 天\n' +
      (weightChange ? '⚖️ 体重变化：' + weightChange + '\n' : '') +
      '━━━━━━━━━━━━━━━\n' +
      '数据存于本地/云端，隐私安全\n' +
      'https://pillish1.github.io/health-chn/';
    // 复制到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(function () {
        YDJK_UI.toast('✅ 健康报告已复制，去粘贴分享吧！');
      }).catch(function () { fallbackCopy(shareText); });
    } else {
      fallbackCopy(shareText);
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); YDJK_UI.toast('✅ 已复制，去粘贴分享吧！'); } catch (e) { YDJK_UI.toast('复制失败，请手动截图', 'err'); }
    ta.remove();
  }

  /* ---------- 数据工具 ---------- */
  function activeCheckinDays() {
    var all = YDJK.getCheckins();
    return Object.keys(all).filter(function (d) {
      var c = all[d];
      return c && ((c.types && c.types.length) || c.plan || (c.minutes && c.minutes > 0));
    }).sort();
  }
  function totalMealCount() {
    var n = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('ydjk:meals:') === 0) {
        try { n += (JSON.parse(localStorage.getItem(k)) || []).length; } catch (e) {}
      }
    }
    return n;
  }
  function maxStreak(days) {
    if (!days.length) return 0;
    var best = 1, cur = 1;
    for (var i = 1; i < days.length; i++) {
      if (YDJK.addDays(days[i - 1], 1) === days[i]) cur++;
      else cur = 1;
      if (cur > best) best = cur;
    }
    return best;
  }

  /* ---------- 累计数据 ---------- */
  function renderTotals() {
    var el = document.getElementById('totalSummary');
    if (!el) return;
    var days = activeCheckinDays();
    var totalMin = 0;
    var all = YDJK.getCheckins();
    days.forEach(function (d) { totalMin += (all[d].minutes || 0); });
    var mealCount = totalMealCount();
    var ws = YDJK.getWeights();
    var streak = maxStreak(days);
    el.innerHTML =
      '<div class="stat-card green"><div class="s-icon">📅</div><div class="s-value">' + days.length + '<small> 天</small></div><div class="s-label">累计打卡</div></div>' +
      '<div class="stat-card blue"><div class="s-icon">⏱️</div><div class="s-value">' + totalMin + '<small> 分钟</small></div><div class="s-label">累计运动</div></div>' +
      '<div class="stat-card orange"><div class="s-icon">🍽️</div><div class="s-value">' + mealCount + '<small> 餐</small></div><div class="s-label">累计饮食记录</div></div>' +
      '<div class="stat-card purple"><div class="s-icon">🔥</div><div class="s-value">' + streak + '<small> 天</small></div><div class="s-label">最长连续</div></div>';
  }

  /* ---------- 成就墙 ---------- */
  function renderAchievements() {
    var grid = document.getElementById('achievementGrid');
    var countEl = document.getElementById('achCount');
    if (!grid) return;
    var days = activeCheckinDays();
    var totalMin = 0;
    var all = YDJK.getCheckins();
    days.forEach(function (d) { totalMin += (all[d].minutes || 0); });
    var mealCount = totalMealCount();
    var ws = YDJK.getWeights();
    var streak = maxStreak(days);
    var defs = [
      { icon: '✅', name: '初次打卡', got: days.length >= 1, desc: '完成第一次运动打卡' },
      { icon: '🔥', name: '连续 3 天', got: streak >= 3, desc: '连续打卡 3 天' },
      { icon: '🌟', name: '连续 7 天', got: streak >= 7, desc: '连续打卡 7 天' },
      { icon: '🏆', name: '连续 14 天', got: streak >= 14, desc: '连续打卡 14 天' },
      { icon: '💎', name: '连续 30 天', got: streak >= 30, desc: '连续打卡 30 天' },
      { icon: '🎖️', name: '打卡 10 次', got: days.length >= 10, desc: '累计打卡 10 次' },
      { icon: '🥇', name: '打卡 50 次', got: days.length >= 50, desc: '累计打卡 50 次' },
      { icon: '⏱️', name: '运动 500 分钟', got: totalMin >= 500, desc: '累计运动 500 分钟' },
      { icon: '⚡', name: '运动 2000 分钟', got: totalMin >= 2000, desc: '累计运动 2000 分钟' },
      { icon: '⚖️', name: '首次称重', got: ws.length >= 1, desc: '记录第一次体重' },
      { icon: '📏', name: '称重 10 次', got: ws.length >= 10, desc: '累计记录体重 10 次' },
      { icon: '🍽️', name: '首次记餐', got: mealCount >= 1, desc: '记录第一餐' },
      { icon: '🥗', name: '记餐 50 次', got: mealCount >= 50, desc: '累计记录 50 餐' }
    ];
    var gotCount = defs.filter(function (d) { return d.got; }).length;
    grid.innerHTML = defs.map(function (a) {
      return '<div class="ach-item' + (a.got ? ' got' : '') + '" title="' + a.desc + '">' +
        '<span class="ach-icon">' + (a.got ? a.icon : '🔒') + '</span>' +
        '<span class="ach-name">' + a.name + '</span></div>';
    }).join('');
    if (countEl) countEl.textContent = gotCount + ' / ' + defs.length + ' 已解锁';
  }

  /* (placeholder) */
  function renderWeekSummary() {
    var week = YDJK.weekDates(today);
    var checkinDays = 0, totalMin = 0, totalKcal = 0;
    week.forEach(function (d) {
      var c = YDJK.getCheckin(d);
      if (c && ((c.types && c.types.length) || c.plan || (c.minutes && c.minutes > 0))) checkinDays++;
      if (c) totalMin += (c.minutes || 0);
      totalKcal += YDJK.mealSummary(d).kcal;
    });
    var ws = YDJK.getWeights();
    var weekW = ws.filter(function (w) { return w.date >= week[0] && w.date <= week[6]; });
    var delta = null;
    if (weekW.length >= 2) delta = weekW[weekW.length - 1].weight - weekW[0].weight;
    var avg = Math.round(totalKcal / 7);
    var el = document.getElementById('weekSummary');
    if (!el) return;
    el.innerHTML =
      '<div class="stat-card green"><div class="s-icon">📅</div><div class="s-value">' + checkinDays + '<small>/7 天</small></div><div class="s-label">本周打卡</div></div>' +
      '<div class="stat-card blue"><div class="s-icon">⏱️</div><div class="s-value">' + totalMin + '<small> 分钟</small></div><div class="s-label">本周运动时长</div></div>' +
      '<div class="stat-card orange"><div class="s-icon">🍽️</div><div class="s-value">' + avg + '<small> kcal</small></div><div class="s-label">日均摄入</div></div>' +
      '<div class="stat-card purple"><div class="s-icon">⚖️</div><div class="s-value">' + (delta === null ? '--' : (delta > 0 ? '+' : '') + delta.toFixed(1)) + '<small> kg</small></div><div class="s-label">本周体重变化</div></div>';
  }

  /* ---------- 饮食记录编辑 ---------- */
  var editMealId = null;
  function openMealEdit(id) {
    var m = YDJK.getMeals(viewDate).find(function (x) { return x.id === id; });
    if (!m) return;
    editMealId = id;
    document.getElementById('me-name').value = m.name;
    document.getElementById('me-kcal').value = m.kcal;
    document.getElementById('me-protein').value = m.protein;
    document.getElementById('me-carbs').value = m.carbs;
    document.getElementById('me-fat').value = m.fat;
    YDJK_UI.openModal('mealEditModal');
  }
  function saveMealEdit() {
    var name = document.getElementById('me-name').value.trim();
    if (!name) { YDJK_UI.toast('请填写食物名称', 'err'); return; }
    YDJK.updateMeal(viewDate, editMealId, {
      name: name,
      kcal: Number(document.getElementById('me-kcal').value) || 0,
      protein: Number(document.getElementById('me-protein').value) || 0,
      carbs: Number(document.getElementById('me-carbs').value) || 0,
      fat: Number(document.getElementById('me-fat').value) || 0
    });
    YDJK_UI.closeModal('mealEditModal');
    renderMeals(); renderStats(); renderWeekSummary();
    YDJK_UI.toast('✅ 记录已更新');
  }

  function renderCloudBadge() {
    var el = document.getElementById('cloudBadge');
    if (!el) return;
    var on = window.YDJK && window.YDJK.isCloudLogged && window.YDJK.isCloudLogged();
    el.innerHTML = on
      ? '<span class="tag green">☁️ 云端同步中</span>'
      : '<span class="tag gray">📴 本地模式</span>';
  }

  /* 追踪页分区切换（移动端） */
  function initTrackerTabs() {
    var tabs = document.getElementById('trackerTabs');
    if (!tabs) return;
    var secMap = { weight: '⚖️ 体重记录', workout: '🏃 今日运动打卡', diet: '🍽️ 今日饮食', water: '💧 饮水打卡' };
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card')).filter(function (c) {
      var t = (c.querySelector('.card-title') || {}).textContent || '';
      return Object.keys(secMap).some(function (k) { return t.indexOf(secMap[k].slice(2)) >= 0; });
    });
    function apply(sec) {
      if (sec === 'all') { cards.forEach(function (c) { c.style.display = ''; }); return; }
      var target = secMap[sec] ? secMap[sec].slice(2) : '';
      cards.forEach(function (c) {
        var t = (c.querySelector('.card-title') || {}).textContent || '';
        c.style.display = t.indexOf(target) >= 0 ? '' : 'none';
      });
    }
    tabs.querySelectorAll('.tracker-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.tracker-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        apply(btn.dataset.sec);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTrackerTabs();
    renderCloudBadge();
    var shareBtn = document.getElementById('btnShare');
    if (shareBtn) shareBtn.addEventListener('click', shareHealth);
    var meSave = document.getElementById('me-save');
    if (meSave) meSave.addEventListener('click', saveMealEdit);
    if (!YDJK.isOnboarded()) {
      var na = document.getElementById('noProfileAlert');
      if (na) na.classList.remove('hidden');
      var opb = document.getElementById('openProfileBtn');
      if (opb) opb.addEventListener('click', function () { window.YDJK_UI.openProfileEditor(); });
    }
    renderDateNav();
    renderStats();
    renderWeight();
    renderCheckin();
    renderCalendar();
    renderMeals();
    renderWater();
    renderWeekSummary();
    renderTotals();
    renderAchievements();

    // 日期导航
    var vd = document.getElementById('viewDate');
    if (vd) {
      vd.addEventListener('change', function () {
        viewDate = vd.value || today;
        renderDateNav();
        renderStats();
        renderCheckin();
        renderMeals();
        renderWater();
      });
    }
    var vt = document.getElementById('viewTodayBtn');
    if (vt) vt.addEventListener('click', function () {
      viewDate = today;
      renderDateNav();
      renderStats();
      renderCheckin();
      renderMeals();
      renderWater();
    });

    // 体重
    document.getElementById('weightAdd').addEventListener('click', function () {
      var v = Number(document.getElementById('weightInput').value);
      if (!v || v < 20 || v > 300) { YDJK_UI.toast('请输入有效体重 (20-300 kg)', 'err'); return; }
      var date = document.getElementById('weightDate').value || today;
      YDJK.addWeight(date, v);
      document.getElementById('weightInput').value = '';
      renderWeight(); renderStats(); renderWeekSummary();
      YDJK_UI.toast('✅ 已记录体重 ' + v + ' kg' + (date === today ? '' : '（' + date + '）'));
    });
    document.getElementById('weightInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('weightAdd').click();
    });
    var wgSave = document.getElementById('weightGoalSave');
    if (wgSave) wgSave.addEventListener('click', function () {
      var v = Number(document.getElementById('weightGoalInput').value);
      if (!v || v < 30 || v > 200) { YDJK_UI.toast('请输入有效目标体重 (30-200 kg)', 'err'); return; }
      YDJK.setWeightGoal(v);
      renderWeight();
      YDJK_UI.toast('✅ 目标体重已设为 ' + v + ' kg');
    });
    var wgInp = document.getElementById('weightGoalInput');
    if (wgInp) wgInp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && wgSave) wgSave.click(); });

    // 手动加餐
    document.getElementById('manualType').innerHTML = DATA.MEAL_TYPES.map(function (t) {
      return '<option value="' + t.id + '">' + t.emoji + ' ' + t.label + '</option>';
    }).join('');
    document.getElementById('manualAdd').addEventListener('click', function () {
      var name = document.getElementById('manualName').value.trim();
      var kcal = Number(document.getElementById('manualKcal').value) || 0;
      if (!name || kcal <= 0) { YDJK_UI.toast('请填写食物名称和热量', 'err'); return; }
      YDJK.addMeal(viewDate, {
        type: document.getElementById('manualType').value, name: name, kcal: kcal,
        protein: Number(document.getElementById('manualP').value) || 0,
        carbs: Number(document.getElementById('manualC').value) || 0,
        fat: Number(document.getElementById('manualF').value) || 0
      });
      document.getElementById('manualName').value = '';
      document.getElementById('manualKcal').value = '';
      document.getElementById('manualP').value = '';
      document.getElementById('manualC').value = '';
      document.getElementById('manualF').value = '';
      renderMeals(); renderStats(); renderWeekSummary();
      YDJK_UI.toast('✅ 已记录：' + name);
    });

    // 跨标签页数据变更 → 刷新
    window.onDataChanged = function () {
      renderStats(); renderWeight(); renderCheckin(); renderCalendar(); renderMeals(); renderWater(); renderWeekSummary(); renderTotals(); renderAchievements(); renderDateNav(); renderCloudBadge();
    };

    // 档案保存后刷新
    window.onProfileSaved = function () {
      var na = document.getElementById('noProfileAlert');
      if (na) na.classList.add('hidden');
      renderStats();
    };

    // 热力图月份导航
    document.getElementById('calPrev').addEventListener('click', function () {
      calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; }
      renderCalendar();
    });
    document.getElementById('calNext').addEventListener('click', function () {
      calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; }
      renderCalendar();
    });

    // 饮水
    document.querySelectorAll('.water-add').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = YDJK.getWater(viewDate) + Number(b.dataset.ml);
        YDJK.setWater(viewDate, w);
        renderWater(); renderStats(); renderWeekSummary();
      });
    });
    document.getElementById('waterReset').addEventListener('click', function () {
      YDJK.setWater(viewDate, 0);
      renderWater(); renderStats();
      YDJK_UI.toast('饮水记录已清零');
    });
    var wgi = document.getElementById('waterGoalInput');
    if (wgi) {
      wgi.addEventListener('change', function () {
        var v = Number(wgi.value);
        if (!v || v < 500 || v > 6000) {
          YDJK_UI.toast('目标需在 500-6000 ml 之间', 'err');
          wgi.value = YDJK.getWaterGoal();
          return;
        }
        YDJK.setWaterGoal(v);
        renderWater(); renderStats();
        YDJK_UI.toast('✅ 饮水目标已更新为 ' + v + ' ml');
      });
    }
  });
})();
