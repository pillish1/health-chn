/* 悦动健康 · 运动 v3（重构：修复套用计划双重记录/ReferenceError/固定60kg消耗） */
(function () {
  'use strict';
  var Y = window.YDJK, cur = null, DATA = null, cy = null, cm = null;
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var MUSCLES = [{ id: 'chest', label: '🏋️ 胸' }, { id: 'back', label: '🧗 背' }, { id: 'legs', label: '🦵 腿' }, { id: 'shoulder', label: '🏔️ 肩' }, { id: 'arms', label: '💪 手臂' }, { id: 'core', label: '🎯 核心' }, { id: 'cardio', label: '🏃 有氧' }, { id: 'yoga', label: '🧘 瑜伽' }];

  function bodyWeight() { var p = Y.getProfile(); return (p && p.weight) || 60; }
  function isCardioAction(a) { return a && (a.muscle === 'cardio' || a.name.indexOf('跑') >= 0 || a.name.indexOf('走') >= 0 || a.name.indexOf('跳') >= 0 || a.name.indexOf('游') >= 0); }

  function template() {
    if (!cur) cur = Y ? Y.today() : '';
    return '' +
      '<div class="yk-page-title">运动记录</div><p class="yk-page-desc">记录每一次训练</p>' +
      '<div class="yk-card" style="padding:14px"><div class="yk-flex-between yk-mb-2"><span class="yk-card-title" style="margin:0">📅 日历</span><div class="yk-flex yk-gap-sm"><button class="yk-btn yk-btn-ghost yk-btn-sm" id="cp">‹</button><span id="month" class="yk-text-sm" style="font-weight:700;min-width:64px;text-align:center"></span><button class="yk-btn yk-btn-ghost yk-btn-sm" id="cn">›</button></div></div><div id="cal" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px"></div></div>' +
      '<div class="yk-card" style="padding:14px"><div class="yk-flex-between yk-mb-2"><span id="dayLabel" class="yk-card-title" style="margin:0">今天的训练</span><button class="yk-btn yk-btn-primary yk-btn-sm" id="add">＋ 添加</button></div><div id="wkList"></div></div>' +
      '<div class="yk-card"><div class="yk-card-title">📋 计划</div><div id="plans"></div></div>' +
      '<div class="yk-card"><div class="yk-card-title">💡 建议</div><div id="sug" class="yk-text-sm yk-text-2" style="line-height:1.7"></div></div>';
  }

  function mounted() { DATA = window.YDJK_DATA; var n = new Date(); cy = n.getFullYear(); cm = n.getMonth() + 1; bind(); render(); }
  function bind() { var b; if (b = document.getElementById('add')) b.onclick = openAdd; if (b = document.getElementById('cp')) b.onclick = function () { cm--; if (cm < 1) { cm = 12; cy--; } renderCal(); }; if (b = document.getElementById('cn')) b.onclick = function () { cm++; if (cm > 12) { cm = 1; cy++; } renderCal(); }; }
  function render() { renderCal(); renderList(); renderPlans(); renderSug(); }

  function renderCal() {
    var m = document.getElementById('month'); if (m) m.textContent = cy + '年' + cm + '月';
    var cal = document.getElementById('cal'); if (!cal) return;
    var days = new Date(cy, cm, 0).getDate(), first = new Date(cy, cm - 1, 1).getDay(), today = Y.today();
    var html = ['日', '一', '二', '三', '四', '五', '六'].map(function (d) { return '<span style="text-align:center;font-size:.6rem;color:var(--text-3);padding:4px 0">' + d + '</span>'; }).join('');
    for (var i = 0; i < first; i++) html += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var ds = cy + '-' + String(cm).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var w = Y.getWorkouts(ds).length > 0;
      var isT = ds === today, isS = ds === cur;
      html += '<span class="day" data-d="' + ds + '" style="text-align:center;padding:7px 0;border-radius:9px;background:' + (w ? '#18C29C' : isT ? 'var(--bg-blue-soft)' : 'var(--bg-soft)') + ';color:' + (w ? '#fff' : isT ? 'var(--blue)' : 'var(--text-2)') + ';font-size:.78rem;font-weight:700;cursor:pointer;border:' + (isS ? '2px solid var(--blue)' : '1px solid transparent') + '">' + d + '</span>';
    }
    cal.innerHTML = html;
    cal.querySelectorAll('.day').forEach(function (c) { c.onclick = function () { var d = c.dataset.d; if (d > Y.today()) { YK.toast('不能选未来', 'err'); return; } cur = d; renderList(); renderCal(); }; });
  }

  function renderList() {
    var list = document.getElementById('wkList'), lbl = document.getElementById('dayLabel');
    if (lbl) lbl.textContent = cur === Y.today() ? '今天的训练' : cur + ' 训练';
    var wks = Y.getWorkouts(cur);
    if (!wks.length) { list.innerHTML = '<div class="yk-text-center yk-text-muted" style="padding:16px;font-size:.8rem">还没有训练</div>'; return; }
    var kg = bodyWeight();
    list.innerHTML = wks.map(function (w) {
      var met = Number(w.met) || 5, mins = w.minutes ? Number(w.minutes) : (w.sets ? w.sets * 3 : 20), kcal = Math.round(met * 3.5 * kg / 200 * mins);
      var det = [w.sets ? w.sets + '组' : '', w.reps ? w.reps + '次' : '', w.weight ? w.weight + 'kg' : ''].filter(Boolean).join('×');
      return '<div class="yk-flex-between" style="padding:10px 0;border-bottom:1px dashed var(--line)"><div><b style="font-size:.85rem">' + esc(w.action) + '</b><div class="yk-text-xs yk-text-muted" style="margin-top:2px">' + det + ' · 🔥' + kcal + 'kcal' + (w.distance ? ' · ' + w.distance + 'km' : '') + '</div></div><button class="js-del" data-id="' + w.id + '" style="border:none;background:none;color:var(--text-3);cursor:pointer;padding:4px">✕</button></div>';
    }).join('');
    list.querySelectorAll('.js-del').forEach(function (b) { b.onclick = function () { Y.removeWorkout(cur, b.dataset.id); render(); }; });
  }

  function renderPlans() {
    var el = document.getElementById('plans'); if (!el || !Y.getWorkoutPlans) return;
    el.innerHTML = Y.getWorkoutPlans().map(function (p) {
      return '<div class="yk-flex-between" style="padding:10px 0;border-bottom:1px dashed var(--line)"><div style="flex:1;min-width:0"><b style="font-size:.83rem">' + esc(p.name) + '</b><div class="yk-text-xs yk-text-muted">' + esc(p.desc) + '</div></div><button class="js-ap" data-i="' + p.id + '" style="border:none;background:var(--bg-blue-soft);color:var(--blue);padding:6px 14px;border-radius:99px;font-size:.72rem;font-weight:700;cursor:pointer">套用</button></div>';
    }).join('');
    el.querySelectorAll('.js-ap').forEach(function (b) {
      b.onclick = function () {
        var p = Y.getWorkoutPlans().filter(function (x) { return x.id === b.dataset.i; })[0];
        if (!p || !DATA || !DATA.ACTIONS) return;
        openAddPlan(p); // 只打开预填弹窗，用户确认后一次性保存（修复之前“立即记录+再次保存”的双重记录）
      };
    });
  }

  function renderSug() {
    var el = document.getElementById('sug'); if (!el) return;
    var wks = Y.getWorkouts(Y.today()), week = Y.weekDates(Y.today()), days = 0;
    week.forEach(function (d) { if (Y.getWorkouts(d).length) days++; });
    var t = [];
    if (!wks.length) t.push('今天还没训练 ☀️'); else t.push('👍 已记录 ' + wks.length + ' 项');
    if (days === 0) t.push('建议每周 2-3 次'); else if (days < 3) t.push('这周训练 ' + days + ' 次，可加 1 次'); else if (days >= 5) t.push('很棒，注意休息'); else t.push('每周 ' + days + ' 次很好！');
    el.innerHTML = t.map(function (x) { return '· ' + x; }).join('<br>');
  }

  /* 添加训练弹窗（openAdd 与套用计划共用，prefill 为可选预填动作） */
  function openAddModal(prefill) {
    if (!DATA || !DATA.ACTIONS) { YK.toast('动作库错误', 'err'); return; }
    var sel = {}, curM = 'chest';
    if (prefill && prefill.actions) {
      prefill.actions.forEach(function (a) {
        var f = DATA.ACTIONS.filter(function (x) { return x.name === a.action; })[0];
        if (f) {
          if (isCardioAction(f)) { sel[f.id] = { sets: 1, reps: 1, minutes: a.reps || a.sets || 30 }; } // 有氧：plan 的 reps 视为分钟
          else { sel[f.id] = { sets: a.sets || 3, reps: a.reps || 10 }; }
          if (curM === 'chest') curM = f.muscle;
        }
      });
    }
    var title = prefill ? ('🏋️ ' + prefill.name) : '🏋️ 添加训练';
    YK.openModal('<div class="yk-modal-title">' + esc(title) + '</div><div class="yk-field"><input class="yk-input" type="date" id="wkDate" value="' + cur + '"></div><div class="yk-field"><div id="ms" class="yk-flex" style="flex-wrap:wrap;gap:6px"></div></div><div class="yk-field"><div id="acs" class="yk-flex" style="flex-wrap:wrap;gap:6px;max-height:24vh;overflow-y:auto"></div></div><div id="selDetail" style="margin-bottom:8px"></div><div id="selInfo" class="yk-text-xs yk-text-muted"></div><div class="yk-modal-actions"><button class="yk-btn yk-btn-ghost" id="aNo">取消</button><button class="yk-btn yk-btn-primary" id="aYes">保存</button></div>');
    var mask = document.querySelector('.yk-modal-mask.show'); if (!mask) return;
    var ms = mask.querySelector('#ms'), acs = mask.querySelector('#acs'), info = mask.querySelector('#selInfo'), detail = mask.querySelector('#selDetail');
    function drawM() { ms.innerHTML = MUSCLES.map(function (m) { return '<button class="js-m" data-i="' + m.id + '" style="padding:7px 14px;border-radius:99px;border:1.5px solid ' + (m.id === curM ? 'var(--blue)' : 'var(--line)') + ';background:' + (m.id === curM ? 'var(--bg-blue-soft)' : '#fff') + ';color:' + (m.id === curM ? 'var(--blue)' : 'var(--text-2)') + ';font-size:.72rem;font-weight:700;cursor:pointer">' + m.label + '</button>'; }).join(''); }
    function drawA() { var a = DATA.ACTIONS.filter(function (x) { return x.muscle === curM; }); if (!a.length) a = [{ id: 'c', name: '自定义' }]; acs.innerHTML = a.map(function (x) { var on = !!sel[x.id]; return '<button class="js-a" data-i="' + x.id + '" style="padding:8px 14px;border-radius:99px;border:1.5px solid ' + (on ? 'var(--blue)' : 'var(--line)') + ';background:' + (on ? 'var(--bg-blue-soft)' : '#fff') + ';color:' + (on ? 'var(--blue)' : 'var(--text-2)') + ';font-size:.72rem;font-weight:700;cursor:pointer;margin-bottom:4px">' + esc(x.name) + '</button>'; }).join(''); }
    function drawSel() {
      var ids = Object.keys(sel);
      if (!ids.length) { info.textContent = '请选择动作'; detail.innerHTML = ''; return; }
      info.textContent = '已选 ' + ids.length + ' 项 · 可调整参数';
      detail.innerHTML = ids.map(function (id) {
        var a = DATA.ACTIONS.find(function (x) { return x.id === id; });
        var s = sel[id] || { sets: 3, reps: 10 };
        if (isCardioAction(a)) {
          return '<div class="yk-flex-between" style="padding:8px 10px;background:var(--bg-soft);border-radius:10px;margin-bottom:6px">' +
            '<span style="font-size:.78rem;font-weight:700;flex:1">' + (a ? esc(a.name) : id) + '</span>' +
            '<input type="number" class="yk-input js-minutes" data-i="' + id + '" value="' + (s.minutes || 30) + '" style="width:60px;padding:5px;font-size:.75rem;text-align:center" placeholder="分钟">' +
            '<span style="font-size:.7rem;color:var(--text-3);margin-left:2px">分钟</span></div>';
        }
        return '<div class="yk-flex-between" style="padding:8px 10px;background:var(--bg-soft);border-radius:10px;margin-bottom:6px">' +
          '<span style="font-size:.78rem;font-weight:700;flex:1">' + (a ? esc(a.name) : id) + '</span>' +
          '<input type="number" class="yk-input js-sets" data-i="' + id + '" value="' + s.sets + '" style="width:48px;padding:5px;font-size:.75rem;text-align:center" placeholder="组">' +
          '<span style="font-size:.7rem;color:var(--text-3);margin:0 2px">×</span>' +
          '<input type="number" class="yk-input js-reps" data-i="' + id + '" value="' + s.reps + '" style="width:48px;padding:5px;font-size:.75rem;text-align:center" placeholder="次"></div>';
      }).join('');
      detail.querySelectorAll('.js-sets').forEach(function (inp) { inp.onchange = function () { var i = inp.dataset.i; sel[i] = sel[i] || {}; sel[i].sets = Number(inp.value) || 3; }; });
      detail.querySelectorAll('.js-reps').forEach(function (inp) { inp.onchange = function () { var i = inp.dataset.i; sel[i] = sel[i] || {}; sel[i].reps = Number(inp.value) || 10; }; });
      detail.querySelectorAll('.js-minutes').forEach(function (inp) { inp.onchange = function () { var i = inp.dataset.i; sel[i] = sel[i] || {}; sel[i].minutes = Number(inp.value) || 30; }; });
    }
    drawM(); drawA(); drawSel();
    // 部位按钮用事件委托：drawM() 会重渲染按钮组，逐按钮绑定会在重渲染后丢失事件（点了切不走）
    ms.addEventListener('click', function (e) { var b = e.target.closest('.js-m'); if (!b) return; curM = b.dataset.i; drawM(); drawA(); });
    acs.addEventListener('click', function (e) { var b = e.target.closest('.js-a'); if (!b) return; var id = b.dataset.i; if (sel[id]) delete sel[id]; else sel[id] = { sets: 3, reps: 10 }; drawA(); drawSel(); });
    mask.querySelector('#aNo').onclick = function () { YK.closeModal(mask); };
    mask.querySelector('#aYes').onclick = function () {
      var date = mask.querySelector('#wkDate').value || cur, ids = Object.keys(sel);
      if (!ids.length) { YK.toast('请选择动作', 'err'); return; }
      ids.forEach(function (id) {
        var a = DATA.ACTIONS.find(function (x) { return x.id === id; });
        var s = sel[id] || { sets: 3, reps: 10 };
        Y.addWorkout(date, { muscle: a ? a.muscle : 'chest', action: a ? a.name : '训练', sets: isCardioAction(a) ? 1 : (s.sets || 3), reps: isCardioAction(a) ? 1 : (s.reps || 10), weight: null, minutes: isCardioAction(a) ? (s.minutes || 30) : null, met: a ? (a.muscle === 'cardio' ? 7 : 5) : 5, distance: null, pace: null });
      });
      YK.closeModal(mask); YK.toast('✅ 已记录 ' + ids.length + ' 个动作'); cur = date; render();
    };
  }
  function openAdd() { openAddModal(null); }
  function openAddPlan(plan) { openAddModal(plan); }
  function refresh() { render(); }

  window.YK3_VIEWS = window.YK3_VIEWS || {};
  window.YK3_VIEWS.plans = { template: template, mounted: mounted, refresh: refresh };
})();
