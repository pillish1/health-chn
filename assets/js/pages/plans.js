/* 运动记录页：自由记录今日运动 + 基于数据的建议（非强制计划） */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 运动类型（供自由选择） */
  var WORKOUT_TYPES = [
    { id: 'strength', label: '💪 力量训练' },
    { id: 'cardio', label: '🏃 有氧跑步' },
    { id: 'walk', label: '🚶 快走散步' },
    { id: 'yoga', label: '🧘 拉伸瑜伽' },
    { id: 'ball', label: '⚽ 球类运动' },
    { id: 'swim', label: '🏊 游泳' },
    { id: 'cycle', label: '🚴 骑行' },
    { id: 'other', label: '✨ 其他运动' }
  ];

  var today = YDJK.today();
  var selectedTypes = [];

  /* ---------- 今日运动记录 ---------- */
  function loadToday() {
    var c = YDJK.getCheckin(today);
    if (!c) { selectedTypes = []; return; }
    selectedTypes = (c.types || []).slice();
    var note = document.getElementById('workoutNote');
    if (note && c.note) note.value = c.note;
    var minutes = document.getElementById('workoutMinutes');
    if (minutes && c.minutes) { minutes.value = c.minutes; updateMinVal(); }
  }

  function renderTypes() {
    var wrap = document.getElementById('workoutTypes');
    wrap.innerHTML = WORKOUT_TYPES.map(function (t) {
      var on = selectedTypes.indexOf(t.id) !== -1;
      return '<button class="btn ' + (on ? 'btn-primary' : 'btn-ghost') + ' btn-sm js-wt" data-id="' + t.id + '" style="margin-bottom:4px">' + t.label + '</button>';
    }).join('');
    wrap.querySelectorAll('.js-wt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        var idx = selectedTypes.indexOf(id);
        if (idx >= 0) selectedTypes.splice(idx, 1);
        else selectedTypes.push(id);
        renderTypes();
      });
    });
  }

  function updateMinVal() {
    var v = document.getElementById('workoutMinutes');
    var l = document.getElementById('workoutMinutesVal');
    if (v && l) l.textContent = v.value + ' 分钟';
  }

  function saveWorkout() {
    var minutes = Number(document.getElementById('workoutMinutes').value) || 0;
    var note = document.getElementById('workoutNote').value.trim();
    if (!selectedTypes.length && minutes === 0 && !note) {
      window.YDJK_UI.toast('请选择运动类型或填写时长', 'err');
      return;
    }
    var c = YDJK.getCheckin(today) || { types: [], minutes: 0, date: today };
    c.types = selectedTypes.slice();
    c.minutes = minutes;
    c.date = today;
    if (note) c.note = note; else delete c.note;
    if (!c.types.length && c.minutes === 0 && !note) YDJK.removeCheckin(today);
    else YDJK.setCheckin(today, c);
    window.YDJK_UI.toast('✅ 已记录今日运动');
    renderWeekStats();
    renderSuggest();
  }

  function clearWorkout() {
    YDJK.removeCheckin(today);
    selectedTypes = [];
    document.getElementById('workoutNote').value = '';
    document.getElementById('workoutMinutes').value = '30';
    updateMinVal();
    renderTypes();
    window.YDJK_UI.toast('已清空今日运动记录');
    renderWeekStats();
    renderSuggest();
  }

  /* ---------- 本周运动概览 ---------- */
  function renderWeekStats() {
    var week = YDJK.weekDates(today);
    var days = 0, minutes = 0;
    week.forEach(function (d) {
      var c = YDJK.getCheckin(d);
      if (c && ((c.types && c.types.length) || (c.minutes && c.minutes > 0))) {
        days++;
        minutes += (c.minutes || 0);
      }
    });
    document.getElementById('wsDays').textContent = days + ' 天';
    document.getElementById('wsMinutes').textContent = minutes;
    document.getElementById('wsStreak').textContent = YDJK.checkinStreak() + ' 天';
    document.getElementById('weekWorkoutDetail').textContent =
      days ? '本周运动 ' + days + ' 天，累计 ' + minutes + ' 分钟，继续保持！' : '本周还没运动，从今天开始动一动吧 💪';
  }

  /* ---------- 运动建议（基于记录生成，温和非强制） ---------- */
  function renderSuggest() {
    var body = document.getElementById('suggestBody');
    if (!body) return;
    var week = YDJK.weekDates(today);
    var days = 0, minutes = 0;
    var typesSet = {};
    week.forEach(function (d) {
      var c = YDJK.getCheckin(d);
      if (c && ((c.types && c.types.length) || (c.minutes && c.minutes > 0))) {
        days++;
        minutes += (c.minutes || 0);
        (c.types || []).forEach(function (t) { typesSet[t] = (typesSet[t] || 0) + 1; });
      }
    });
    var todayC = YDJK.getCheckin(today);
    var sug = [];
    if (!todayC || !((todayC.types && todayC.types.length) || todayC.minutes)) {
      sug.push('今天还没记录运动，动一动会更有精神 ☀️');
    } else {
      sug.push('👍 今天记录了运动，做得不错！');
    }
    if (days === 0) {
      sug.push('建议从每周 2-3 次、每次 30 分钟开始，循序渐进');
    } else if (days < 3) {
      sug.push('这周运动 ' + days + ' 次，如果时间允许，可以试着每周达到 3 次以上');
    } else if (days >= 5) {
      sug.push('本周运动很规律，注意适当休息，避免过度疲劳 😴');
    } else {
      sug.push('每周 ' + days + ' 次运动节奏很好，保持这个习惯！');
    }
    if (minutes < 150 && days > 0) {
      sug.push('每周 150 分钟中等强度运动对健康很有帮助，还差一点就到啦');
    }
    // 多样性建议
    var types = Object.keys(typesSet);
    if (types.length === 1 && days >= 2) {
      sug.push('可以试试不同类型的运动（力量+有氧结合），锻炼更全面');
    }
    body.innerHTML = sug.map(function (s) { return '<p style="margin:0 0 6px">· ' + esc(s) + '</p>'; }).join('');
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
    document.getElementById('amTitle').textContent = a.emoji + ' ' + a.name;
    document.getElementById('amMeta').textContent = (a.muscle || '') + ' · ' + a.level + ' · ' + a.sets;
    document.getElementById('amDesc').textContent = a.desc;
    window.YDJK_UI.openModal('actionModal');
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var dEl = document.getElementById('exerciseDate');
    if (dEl) dEl.textContent = YDJK.fmtDateCN(today);
    renderTypes();
    loadToday();
    renderWeekStats();
    renderSuggest();
    document.getElementById('saveWorkout').addEventListener('click', saveWorkout);
    document.getElementById('clearWorkout').addEventListener('click', clearWorkout);
    var min = document.getElementById('workoutMinutes');
    min.addEventListener('input', updateMinVal);
    // 动作库
    renderMuscleTabs();
    renderActions();
    document.getElementById('actionSearch').addEventListener('input', function () {
      currentActionQ = this.value.trim();
      renderActions();
    });
  });
})();