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
  var currentEditWk = null; // 正在编辑的训练 {date, id}
  var currentDate = YDJK.today(); // 当前选中日期（日历点击驱动）

  function fmtCN(d) {
    var today = YDJK.today();
    if (d === today) return '今天';
    if (d === YDJK.addDays(today, -1)) return '昨天';
    var p = String(d).split('-');
    return (p[1] ? Number(p[1]) : 0) + '月' + (p[2] ? Number(p[2]) : 0) + '日';
  }
  /* ---------- 运动消耗估算（MET 法） ---------- */
  var MET_MUSCLE = { chest: 5, back: 5, legs: 6, shoulder: 4.5, arms: 4.5, core: 4.5, cardio: 7, yoga: 3 };
  var MET_CARDIO = { 跑步: 8, 快走: 4.3, 慢跑: 7, 游泳: 7, 骑车: 6, 跳绳: 10, 椭圆机: 6, '开合跳': 8, 'HIIT': 8, 爬楼梯: 7, '波比跳': 9, 登山跑: 8 };
  function metFor(w) {
    if (w.met) return Number(w.met);
    var a = DATA.ACTIONS.filter(function (x) { return x.name === w.action; })[0];
    if (a && MET_CARDIO[a.name]) return MET_CARDIO[a.name];
    if (a && a.muscle === 'cardio') return 7;
    if (a && MET_MUSCLE[a.muscle]) return MET_MUSCLE[a.muscle];
    return 5;
  }
  function estMinutes(w) {
    if (w.minutes && Number(w.minutes) > 0) return Number(w.minutes);
    if (w.sets) return w.sets * 3; // 每组约 3 分钟（动作+组间休息）
    return 20; // 未填时长默认 20 分钟
  }
  function workoutKcal(w) {
    var p = YDJK.getProfile();
    var kg = (p && p.weight) || 60;
    return Math.round(metFor(w) * 3.5 * kg / 200 * estMinutes(w));
  }

  /* ---------- 训练记录（选中日期） ---------- */
  function renderWorkoutList() {
    var list = document.getElementById('workoutList');
    var empty = document.getElementById('workoutEmpty');
    if (!list) return;
    var workouts = YDJK.getWorkouts(currentDate);
    if (!workouts.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      var ttl = document.getElementById('wkTotal');
      if (ttl) ttl.style.display = 'none';
      var et = document.getElementById('wkEmptyTitle');
      if (et) et.textContent = (currentDate === YDJK.today()) ? '今天还没有训练记录' : fmtCN(currentDate) + '还没有训练记录';
      return;
    }
    if (empty) empty.classList.add('hidden');
    var totalKcal = 0;
    var items = workouts.map(function (w) {
      var kcal = workoutKcal(w);
      totalKcal += kcal;
      var muscleName = '';
      var mu = MUSCLES.filter(function (m) { return m.id === w.muscle; })[0];
      if (mu) muscleName = mu.label.replace(/^[^\u4e00-\u9fa5]*/, '');
      var setsReps = (w.sets ? w.sets + ' 组 × ' + (w.reps || '') + ' 次' : '');
      var weight = w.weight ? ' · ' + w.weight + 'kg' : '';
      var min = (w.minutes ? ' · ' + w.minutes + ' 分钟' : ' · 约 ' + estMinutes(w) + ' 分钟');
      return '<div class="wk-item">' +
        '<div class="wk-item-head"><b>' + esc(w.action || '训练') + '</b>' +
        '<div class="wk-item-actions"><button class="btn btn-ghost btn-xs js-edit-wk" data-date="' + currentDate + '" data-id="' + w.id + '" title="编辑">✎</button>' +
        '<button class="btn btn-ghost btn-xs js-del-wk" data-date="' + currentDate + '" data-id="' + w.id + '">✕</button></div></div>' +
        (muscleName ? '<div class="wk-item-meta">' + muscleName + '</div>' : '') +
        '<div class="wk-item-meta">' + [setsReps, weight.replace(' · ', ''), min.replace(' · ', '')].filter(Boolean).join(' · ') + ' · 🔥 约 ' + kcal + ' kcal</div>' +
        '</div>';
    }).join('');
    list.innerHTML = items;
    var ttl = document.getElementById('wkTotal');
    if (ttl) {
      ttl.style.display = 'block';
      ttl.textContent = '共 ' + workouts.length + ' 项 · 消耗约 ' + totalKcal + ' kcal' + (currentDate === YDJK.today() ? '（今天）' : '');
    }
    // 列表标题
    var dl = document.getElementById('wkDateLabel');
    if (dl) dl.textContent = (currentDate === YDJK.today() ? '今天的训练' : fmtCN(currentDate) + '的训练');
    // 编辑/删除事件
    list.querySelectorAll('.js-del-wk').forEach(function (btn) {
      btn.addEventListener('click', function () {
        YDJK.removeWorkout(currentDate, btn.dataset.id);
        renderWorkoutList();
        renderSuggest();
        renderCalendar();
        window.YDJK_UI.toast('已删除该训练');
      });
    });
    list.querySelectorAll('.js-edit-wk').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var list2 = YDJK.getWorkouts(currentDate);
        var w = list2.filter(function (x) { return x.id === btn.dataset.id; })[0];
        if (!w) return;
        currentEditWk = { date: currentDate, id: btn.dataset.id };
        var mu = MUSCLES.filter(function (m) { return m.id === w.muscle; })[0];
        var sub = document.getElementById('ewSub');
        if (sub) sub.textContent = esc(w.action || '训练') + (mu ? ' · ' + mu.label.replace(/^[^\u4e00-\u9fa5]*/, '') : '');
        document.getElementById('ewSets').value = w.sets || 3;
        document.getElementById('ewReps').value = w.reps || 10;
        document.getElementById('ewWeight').value = w.weight || '';
        window.YDJK_UI.openModal('editWorkoutModal');
      });
    });
  }

  /* 选中日期（日历点击驱动） */
  function setWorkoutDate(d) {
    currentDate = d;
    renderWorkoutList();
    renderCalendar();
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
        var faved = toggleFavAction(btn.dataset.id);
        renderActionGrid();
        renderFavList();
        var a = DATA.ACTIONS.find(function (x) { return x.id === btn.dataset.id; });
        window.YDJK_UI.toast(faved ? ('⭐ 已收藏「' + (a ? a.name : '') + '」，可在上方「我的收藏」快速添加') : '已取消收藏', faved ? 'ok' : 'err');
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
        renderSelected();
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
        renderSelected();
      });
    });
  }
  /* 收藏夹：展示所有收藏的动作（跨部位） */
  function renderFavList() {
    var wrap = document.getElementById('wkFavList');
    var field = document.getElementById('wkFavField');
    if (!wrap) return;
    var favs = getFavActions();
    if (!favs.length) {
      if (field) field.style.display = 'none';
      wrap.innerHTML = '';
      return;
    }
    if (field) field.style.display = '';
    // 找收藏的动作（含自定义收藏的名字）
    var items = favs.map(function (id) {
      var a = DATA.ACTIONS.find(function (x) { return x.id === id; });
      if (!a) return null;
      var mu = MUSCLES.find(function (m) { return m.id === a.muscle; });
      return { id: a.id, name: a.name, muscle: mu ? mu.label : '' };
    }).filter(Boolean);
    if (!items.length) {
      if (field) field.style.display = 'none';
      wrap.innerHTML = '';
      return;
    }
    wrap.innerHTML = items.map(function (it) {
      var on = !!selectedActions[it.id];
      return '<button type="button" class="wk-fav-chip' + (on ? ' selected"' : '"') + ' data-id="' + it.id + '">' + esc(it.name) + (it.muscle ? ' <small>' + esc(it.muscle) + '</small>' : '') + '</button>';
    }).join('');
    wrap.querySelectorAll('.wk-fav-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        if (selectedActions[id]) delete selectedActions[id];
        else selectedActions[id] = { sets: 3, reps: 10, weight: '' };
        renderFavList();
        renderActionGrid();
        renderSelected();
      });
    });
  }
  /* 已选动作汇总（含预计消耗，记录前即可看到） */
  function renderSelected() {
    var wrap = document.getElementById('wkSelected');
    if (!wrap) return;
    var ids = Object.keys(selectedActions);
    if (!ids.length) { wrap.innerHTML = ''; return; }
    var p = YDJK.getProfile();
    var kg = (p && p.weight) || 60;
    var total = 0;
    var html = ids.map(function (id) {
      var a = DATA.ACTIONS.find(function (x) { return x.id === id; });
      var s = selectedActions[id];
      var name = a ? a.name : id;
      var sets = s.sets || 3;
      var mins = sets * 3; // 每组约 3 分钟
      var met = 5;
      if (a) {
        if (MET_CARDIO[a.name]) met = MET_CARDIO[a.name];
        else if (a.muscle === 'cardio') met = 7;
        else if (MET_MUSCLE[a.muscle]) met = MET_MUSCLE[a.muscle];
      }
      var kcal = Math.round(met * 3.5 * kg / 200 * mins);
      total += kcal;
      return '<div class="wk-sel-item">' +
        '<span><b>' + esc(name) + '</b> <small>' + sets + '×' + (s.reps || 10) + (s.weight ? ' · ' + s.weight + 'kg' : '') + '</small></span>' +
        '<span class="wk-sel-kcal">约 ' + kcal + ' kcal</span></div>';
    }).join('');
    var estMin = ids.reduce(function (s, id) {
      var s2 = selectedActions[id];
      return s + ((s2 && s2.sets) ? Number(s2.sets) * 3 : 9);
    }, 0);
    wrap.innerHTML = html + '<div class="wk-sel-total">共 ' + ids.length + ' 项 · 约 <b>' + estMin + ' 分钟</b> · 预计消耗 <b>约 ' + total + ' kcal</b></div>';
  }
  function saveWorkout() {
    var date = document.getElementById('wkDate').value || currentDate;
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
        minutes: null, /* 时长由组数自动推导（每组约3分钟） */
        met: a ? metFor({ muscle: a.muscle, action: a.name }) : null
      });
    });
    window.YDJK_UI.closeModal('addWorkoutModal');
    window.YDJK_UI.toast('✅ 已记录 ' + ids.length + ' 个动作');
    selectedActions = {};
    currentDate = date;
    renderWorkoutList();
    renderSuggest();
    renderCalendar();
  }
  /* ---------- 本周运动概览 ---------- */
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
    if (hm) {
      YDJK_CHARTS.calendarHeatmap(hm, y, m, data, { selected: currentDate });
      // 点日期 → 查看/记录那天
      hm.querySelectorAll('.cal-cell').forEach(function (cell) {
        cell.addEventListener('click', function () {
          var d = cell.getAttribute('data-date');
          if (!d || d > YDJK.today()) return;
          setWorkoutDate(d);
        });
      });
    }
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var todayBtn = document.getElementById('wkTodayBtn');
    if (todayBtn) todayBtn.addEventListener('click', function () { setWorkoutDate(YDJK.today()); });
    var addBtn = document.getElementById('btnAddWorkout');
    if (addBtn) addBtn.addEventListener('click', function () {
      document.getElementById('wkDate').value = currentDate;
      selectedActions = {};
      wkCurrentMuscle = 'chest';
      renderMuscleOptions();
      renderActionGrid();
      renderFavList();
      window.YDJK_UI.openModal('addWorkoutModal');
    });
    var saveBtn = document.getElementById('btnSaveWorkout');
    if (saveBtn) saveBtn.addEventListener('click', saveWorkout);
    var saveEditBtn = document.getElementById('btnSaveEditWk');
    if (saveEditBtn) saveEditBtn.addEventListener('click', function () {
      if (!currentEditWk) return;
      var list2 = YDJK.getWorkouts(currentEditWk.date);
      var w = list2.filter(function (x) { return x.id === currentEditWk.id; })[0];
      if (!w) return;
      w.sets = Number(document.getElementById('ewSets').value) || 3;
      w.reps = Number(document.getElementById('ewReps').value) || 10;
      w.weight = Number(document.getElementById('ewWeight').value) || null;
      YDJK.updateWorkout(currentEditWk.date, w);
      currentEditWk = null;
      window.YDJK_UI.closeModal('editWorkoutModal');
      window.YDJK_UI.toast('✅ 训练已更新');
      renderWorkoutList();
      renderSuggest();
      renderCalendar();
    });
    renderWorkoutList();
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
