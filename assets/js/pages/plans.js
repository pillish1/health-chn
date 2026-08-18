/* 运动记录页：训练卡片式记录（练什么部位/动作/几组几次）+ 建议 */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var MUSCLES = [
    { id: 'chest', label: '🏋️ 胸' },
    { id: 'back', label: '🧗 背' },
    { id: 'legs', label: '🦵 腿' },
    { id: 'shoulder', label: '🏔️ 肩' },
    { id: 'arms', label: '💪 手臂' },
    { id: 'core', label: '🎯 核心' },
    { id: 'cardio', label: '🏃 有氧' },
    { id: 'yoga', label: '🧘 瑜伽拉伸' }
  ];
  var selectedMuscle = 'chest';

  /* ---------- 训练记录列表 ---------- */
  function renderWorkoutList() {
    var list = document.getElementById('workoutList');
    var empty = document.getElementById('workoutEmpty');
    if (!list) return;
    var all = YDJK.getAllWorkouts();
    // 按日期倒序
    var dates = Object.keys(all).filter(function (d) { return all[d].length > 0; }).sort().reverse();
    if (!dates.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = dates.map(function (date) {
      var workouts = all[date];
      var totalMin = 0;
      var items = workouts.map(function (w) {
        totalMin += Number(w.minutes) || 0;
        var muscleName = '';
        var mu = MUSCLES.find(function (m) { return m.id === w.muscle; });
        if (mu) muscleName = mu.label;
        var setsReps = (w.sets ? w.sets + ' 组 × ' + (w.reps || '') + ' 次' : '');
        var weight = w.weight ? ' · ' + w.weight + 'kg' : '';
        var min = w.minutes ? ' · ⏱ ' + w.minutes + ' 分钟' : '';
        return '<div class="wk-item">' +
          '<div class="wk-item-head"><b>' + esc(w.action || '训练') + '</b>' +
          '<button class="btn btn-ghost btn-xs js-del-wk" data-date="' + date + '" data-id="' + w.id + '">✕</button></div>' +
          (muscleName ? '<div class="wk-item-meta">' + muscleName + '</div>' : '') +
          (setsReps || weight || min ? '<div class="wk-item-meta">' + [setsReps, weight.replace(' · ', ''), min.replace(' · ', '')].filter(Boolean).join(' · ') + '</div>' : '') +
          '</div>';
      }).join('');
      var header = '<div class="wk-day">' +
        '<b>' + esc(date) + '</b>' +
        '<span class="small muted">' + workouts.length + ' 项' + (totalMin ? ' · ' + totalMin + ' 分钟' : '') + '</span></div>';
      return '<div class="wk-card">' + header + items + '</div>';
    }).join('');
    list.querySelectorAll('.js-del-wk').forEach(function (btn) {
      btn.addEventListener('click', function () {
        YDJK.removeWorkout(btn.dataset.date, btn.dataset.id);
        renderWorkoutList();
        renderWeekStats();
        renderSuggest();
        window.YDJK_UI.toast('已删除该训练');
      });
    });
  }

  /* ---------- 添加训练（点选动作） ---------- */
  var selectedActions = {}; // {actionId: {sets, reps, weight}}
  var wkCurrentMuscle = 'chest';
  function renderMuscleOptions() {
    var wrap = document.getElementById('wkMuscleGroup');
    if (!wrap) return;
    wrap.innerHTML = MUSCLES.map(function (m) {
      return '<button type="button" class="wk-chip' + (m.id === wkCurrentMuscle ? ' active"' : '"') + ' data-m="' + m.id + '">' + m.label + '</button>';
    }).join('');
    wrap.querySelectorAll('.wk-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        wkCurrentMuscle = b.dataset.m;
        renderMuscleOptions();
        renderActionGrid();
      });
    });
  }
  /* 动作收藏（本地存储） */
  function getFavActions() {
    try { return JSON.parse(localStorage.getItem('ydjk:fav-actions') || '[]'); } catch (e) { return []; }
  }
  function toggleFavAction(id) {
    var favs = getFavActions();
    var idx = favs.indexOf(id);
    if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
    try { localStorage.setItem('ydjk:fav-actions', JSON.stringify(favs)); } catch (e) {}
    return favs.indexOf(id) >= 0;
  }
  /* 渲染当前部位的动作卡片（点选 + 收藏） */
  function renderActionGrid() {
    var grid = document.getElementById('wkActionGrid');
    if (!grid) return;
    var favs = getFavActions();
    var actions = DATA.ACTIONS.filter(function (a) { return a.muscle === wkCurrentMuscle; });
    if (!actions.length) {
      actions = [{ id: 'custom', name: '自定义', sets: '自由' }];
    }
    // 收藏的置顶
    actions.sort(function (a, b) {
      var fa = favs.indexOf(a.id) >= 0 ? 0 : 1;
      var fb = favs.indexOf(b.id) >= 0 ? 0 : 1;
      return fa - fb;
    });
    grid.innerHTML = actions.map(function (a) {
      var on = !!selectedActions[a.id];
      var faved = favs.indexOf(a.id) >= 0;
      return '<div class="wk-action-card' + (on ? ' selected"' : '"') + ' data-id="' + a.id + '">' +
        '<div class="wk-action-head"><b>' + esc(a.name) + '</b>' +
        '<button class="wk-fav' + (faved ? ' faved"' : '"') + ' data-id="' + a.id + '" title="' + (faved ? '取消收藏' : '收藏') + '">' + (faved ? '★' : '☆') + '</button></div>' +
        '<span>' + esc(a.sets || '') + '</span>' +
        (on ? '<div class="wk-sets-input">' +
          '<input type="number" class="input wk-sets" data-id="' + a.id + '" value="' + (selectedActions[a.id].sets || 3) + '" min="1" placeholder="组"><span>组×</span>' +
          '<input type="number" class="input wk-reps" data-id="' + a.id + '" value="' + (selectedActions[a.id].reps || 10) + '" min="1" placeholder="次"><span>次</span>' +
          '<input type="number" class="input wk-weight" data-id="' + a.id + '" value="' + (selectedActions[a.id].weight || '') + '" placeholder="kg">' +
          '</div>' : '') +
        '</div>';
    }).join('');
    // 收藏切换
    grid.querySelectorAll('.wk-fav').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavAction(btn.dataset.id);
        renderActionGrid();
      });
    });
    // 点选/取消
    grid.querySelectorAll('.wk-action-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.classList.contains('wk-sets') || e.target.classList.contains('wk-reps') || e.target.classList.contains('wk-weight') || e.target.classList.contains('wk-fav')) return;
        var id = card.dataset.id;
        if (selectedActions[id]) delete selectedActions[id];
        else selectedActions[id] = { sets: 3, reps: 10, weight: '' };
        renderActionGrid();
      });
    });
    // 组次输入
    grid.querySelectorAll('.wk-sets,.wk-reps,.wk-weight').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var id = inp.dataset.id;
        if (!selectedActions[id]) selectedActions[id] = {};
        if (inp.classList.contains('wk-sets')) selectedActions[id].sets = Number(inp.value) || 3;
        if (inp.classList.contains('wk-reps')) selectedActions[id].reps = Number(inp.value) || 10;
        if (inp.classList.contains('wk-weight')) selectedActions[id].weight = inp.value;
      });
    });
  }
  function saveWorkout() {
    var date = document.getElementById('wkDate').value || YDJK.today();
    var minutes = Number(document.getElementById('wkMinutes').value) || 0;
    var ids = Object.keys(selectedActions);
    if (!ids.length) { window.YDJK_UI.toast('请至少点选一个动作', 'err'); return; }
    ids.forEach(function (id) {
      var a = DATA.ACTIONS.find(function (x) { return x.id === id; });
      var s = selectedActions[id];
      YDJK.addWorkout(date, {
        muscle: wkCurrentMuscle,
        action: a ? a.name : '训练',
        sets: s.sets || 3,
        reps: s.reps || 10,
        weight: s.weight ? Number(s.weight) : null,
        minutes: minutes > 0 ? minutes : null
      });
    });
    window.YDJK_UI.closeModal('addWorkoutModal');
    window.YDJK_UI.toast('✅ 已记录 ' + ids.length + ' 个动作');
    selectedActions = {};
    document.getElementById('wkMinutes').value = '';
    renderWorkoutList();
    renderWeekStats();
    renderSuggest();
  }
  /* ---------- 本周运动概览 ---------- */
  function renderWeekStats() {
    var week = YDJK.weekDates(YDJK.today());
    var days = 0, minutes = 0;
    week.forEach(function (d) {
      var ws = YDJK.getWorkouts(d);
      if (ws.length) { days++; ws.forEach(function (w) { minutes += Number(w.minutes) || 0; }); }
    });
    var de = document.getElementById('wsDays');
    if (de) de.textContent = days + ' 天';
    var me = document.getElementById('wsMinutes');
    if (me) me.textContent = minutes;
    var se = document.getElementById('wsStreak');
    if (se) se.textContent = YDJK.checkinStreak() + ' 天';
    var det = document.getElementById('weekWorkoutDetail');
    if (det) det.textContent = days ? '本周训练 ' + days + ' 天' + (minutes ? '，累计 ' + minutes + ' 分钟' : '') + '，继续保持！' : '本周还没训练，从今天开始吧 💪';
  }

  /* ---------- 运动建议（基于记录） ---------- */
  function renderSuggest() {
    var body = document.getElementById('suggestBody');
    if (!body) return;
    var week = YDJK.weekDates(YDJK.today());
    var days = 0, minutes = 0;
    var muscleSet = {};
    week.forEach(function (d) {
      YDJK.getWorkouts(d).forEach(function (w) {
        days++;
        minutes += Number(w.minutes) || 0;
        if (w.muscle) muscleSet[w.muscle] = (muscleSet[w.muscle] || 0) + 1;
      });
    });
    var todayW = YDJK.getWorkouts(YDJK.today());
    var sug = [];
    if (!todayW.length) {
      sug.push('今天还没记录训练，动一动会更有精神 ☀️');
    } else {
      sug.push('👍 今天记录了 ' + todayW.length + ' 项训练，做得不错！');
    }
    if (days === 0) sug.push('建议从每周 2-3 次训练开始，循序渐进');
    else if (days < 3) sug.push('这周训练 ' + days + ' 次，如果可以，试着每周达到 3 次以上');
    else if (days >= 5) sug.push('本周训练很规律，注意适当休息，避免过度疲劳 😴');
    else sug.push('每周 ' + days + ' 次训练节奏很好，保持这个习惯！');
    // 部位多样性建议
    var muscles = Object.keys(muscleSet);
    if (muscles.length === 1 && days >= 2) {
      sug.push('这周都在练同一部位，可以试试搭配其他部位（胸背腿结合）更全面');
    }
    body.innerHTML = sug.map(function (s) { return '<p style="margin:0 0 6px">· ' + esc(s) + '</p>'; }).join('');
  }

  /* ---------- 运动日历 ---------- */
  var calYear = null, calMonth = null;
  function renderCalendar() {
    var now = new Date();
    if (calYear === null) { calYear = now.getFullYear(); calMonth = now.getMonth() + 1; }
    var y = calYear, m = calMonth;
    var ml = document.getElementById('monthLabel');
    if (ml) ml.textContent = y + ' 年 ' + m + ' 月';
    var all = YDJK.getAllWorkouts();
    var data = {};
    Object.keys(all).forEach(function (d) {
      if (d.indexOf(String(y) + '-' + String(m).padStart(2, '0')) !== 0) return;
      var lv = Math.min(4, all[d].length);
      data[d] = lv;
    });
    var hm = document.getElementById('calHeatmap');
    if (hm) YDJK_CHARTS.calendarHeatmap(hm, y, m, data);
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var dEl = document.getElementById('exerciseDate');
    if (dEl) dEl.textContent = YDJK.fmtDateCN(YDJK.today());
    var addBtn = document.getElementById('btnAddWorkout');
    if (addBtn) addBtn.addEventListener('click', function () {
      document.getElementById('wkDate').value = YDJK.today();
      document.getElementById('wkMinutes').value = '';
      selectedActions = {};
      wkCurrentMuscle = 'chest';
      renderMuscleOptions();
      renderActionGrid();
      window.YDJK_UI.openModal('addWorkoutModal');
    });
    var saveBtn = document.getElementById('btnSaveWorkout');
    if (saveBtn) saveBtn.addEventListener('click', saveWorkout);
    renderWorkoutList();
    renderWeekStats();
    renderSuggest();
    // 日历
    renderCalendar();
    var calP = document.getElementById('calPrev');
    var calN = document.getElementById('calNext');
    if (calP) calP.addEventListener('click', function () { calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; } renderCalendar(); });
    if (calN) calN.addEventListener('click', function () { calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; } renderCalendar(); });
    // 动作库

  });
})();