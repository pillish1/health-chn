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
    { id: 'cardio', label: '🏃 有氧' }
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

  /* ---------- 添加训练 ---------- */
  function renderMuscleOptions() {
    var wrap = document.getElementById('wkMuscleGroup');
    wrap.innerHTML = MUSCLES.map(function (m) {
      return '<div class="radio-pill"><input type="radio" name="wkMuscle" id="wm-' + m.id + '" value="' + m.id + '"' + (m.id === selectedMuscle ? ' checked' : '') + '><label for="wm-' + m.id + '">' + m.label + '</label></div>';
    }).join('');
    wrap.querySelectorAll('input[name=wkMuscle]').forEach(function (r) {
      r.addEventListener('change', function () { selectedMuscle = r.value; });
    });
  }

  function saveWorkout() {
    var date = document.getElementById('wkDate').value || YDJK.today();
    var action = document.getElementById('wkAction').value.trim();
    var sets = Number(document.getElementById('wkSets').value) || 0;
    var reps = Number(document.getElementById('wkReps').value) || 0;
    var weight = Number(document.getElementById('wkWeight').value) || 0;
    var minutes = Number(document.getElementById('wkMinutes').value) || 0;
    if (!action) { window.YDJK_UI.toast('请填写训练动作，如：卧推', 'err'); return; }
    if (sets <= 0) { window.YDJK_UI.toast('请填写组数', 'err'); return; }
    YDJK.addWorkout(date, {
      muscle: selectedMuscle,
      action: action,
      sets: sets,
      reps: reps,
      weight: weight > 0 ? weight : null,
      minutes: minutes > 0 ? minutes : null
    });
    window.YDJK_UI.closeModal('addWorkoutModal');
    window.YDJK_UI.toast('✅ 已记录训练');
    // 清空表单
    document.getElementById('wkAction').value = '';
    document.getElementById('wkSets').value = '';
    document.getElementById('wkReps').value = '';
    document.getElementById('wkWeight').value = '';
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

  /* ---------- 动作参考库 ---------- */
  var currentMuscle = 'all';
  var currentActionQ = '';
  function renderMuscleTabs() {
    var wrap = document.getElementById('muscleTabs');
    var muscles = [{ id: 'all', label: '全部' }].concat(DATA.MUSCLES);
    wrap.innerHTML = muscles.map(function (m) {
      return '<button class="tab-btn' + (m.id === currentMuscle ? ' active' : '') + '" data-m="' + m.id + '">' + m.emoji + ' ' + m.label + '</button>';
    }).join('');
    wrap.querySelectorAll('.tab-btn').forEach(function (b) {
      b.addEventListener('click', function () { currentMuscle = b.dataset.m; renderMuscleTabs(); renderActions(); });
    });
  }
  function renderActions() {
    var grid = document.getElementById('actionGrid');
    var q = currentActionQ.toLowerCase();
    var list = DATA.ACTIONS.filter(function (a) {
      if (currentMuscle !== 'all' && a.muscle !== currentMuscle) return false;
      if (q && a.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="e-icon">🔍</div><div class="e-title">没有找到该动作</div><div class="e-desc">换个关键词试试</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (a) {
      return '<div class="card card-hover js-action" data-id="' + a.id + '" style="cursor:pointer;padding:16px">' +
        '<div class="flex-between"><b class="small">' + esc(a.name) + '</b><span class="tag green">' + esc(a.level) + '</span></div>' +
        '<div class="small muted mt-1">' + esc(a.sets) + ' · ' + esc(a.muscle) + '</div></div>';
    }).join('');
    grid.querySelectorAll('.js-action').forEach(function (card) {
      card.addEventListener('click', function () {
        var a = DATA.ACTIONS.find(function (x) { return x.id === card.dataset.id; });
        if (a) openAction(a);
      });
    });
  }
  function openAction(a) {
    var t = document.getElementById('amTitle');
    if (t) t.textContent = a.emoji + ' ' + a.name;
    var meta = document.getElementById('amMeta');
    if (meta) meta.textContent = (a.muscle || '') + ' · ' + a.level + ' · ' + a.sets;
    var desc = document.getElementById('amDesc');
    if (desc) desc.textContent = a.desc;
    window.YDJK_UI.openModal('actionModal');
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var dEl = document.getElementById('exerciseDate');
    if (dEl) dEl.textContent = YDJK.fmtDateCN(YDJK.today());
    var addBtn = document.getElementById('btnAddWorkout');
    if (addBtn) addBtn.addEventListener('click', function () {
      document.getElementById('wkDate').value = YDJK.today();
      renderMuscleOptions();
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
    renderMuscleTabs();
    renderActions();
    var as = document.getElementById('actionSearch');
    if (as) as.addEventListener('input', function () { currentActionQ = this.value.trim(); renderActions(); });
  });
})();