/* 运动计划页 v2：内置计划 + 卡片式自定义计划构建器 */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var currentPlan = null;

  /* ---------- 统一取计划（内置 + 自定义） ---------- */
  function getPlan(id) {
    var p = DATA.PLANS.find(function (x) { return x.id === id; });
    if (!p) p = YDJK.getMyPlans().find(function (x) { return x.id === id; });
    return p;
  }

  /* ---------- 计划 tabs ---------- */
  function renderPlanTabs() {
    var tabs = document.getElementById('planTabs');
    var p = YDJK.getProfile();
    var prefer = p ? p.goal : 'keep';
    tabs.innerHTML = DATA.PLANS.map(function (pl) {
      return '<button class="tab-btn' + (pl.id === prefer ? ' active' : '') + '" data-plan="' + pl.id + '">' + pl.emoji + ' ' + pl.name + '</button>';
    }).join('') + '<button class="tab-btn" data-plan="__my__">🛠️ 我的计划</button>';
    tabs.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (btn.dataset.plan === '__my__') renderMyPlans();
        else renderPlan(btn.dataset.plan);
      });
    });
    renderPlan(prefer);
  }

  /* ---------- 计划详情（含打卡） ---------- */
  function renderPlan(id) {
    currentPlan = id;
    var pl = getPlan(id);
    if (!pl) return;
    var today = YDJK.today();
    var week = YDJK.weekDates(today);
    var doneCount = week.filter(function (d) { var c = YDJK.getCheckin(d); return c && c.plan === id; }).length;
    var isCustom = !!pl.isCustom;

    var html = '<div class="card mb-3">' +
      '<div class="flex-between flex-wrap">' +
      '<div class="flex gap-md" style="gap:16px;align-items:center">' +
      '<div id="planProgress" style="width:76px;height:76px;flex:none"></div>' +
      '<div><div class="card-title" style="margin:0">' + pl.emoji + ' ' + esc(pl.name) + (isCustom ? ' <span class="tag purple">自定义</span>' : '') + '</div>' +
      '<div class="card-sub mt-1">' + esc(pl.desc) + '</div></div></div>' +
      '<div class="flex gap-sm flex-wrap">' +
      '<span class="tag ' + (pl.color || 'gray') + '">' + (pl.level || '自定义') + '</span>' +
      '<span class="tag gray">' + (pl.weekly || '自定义') + '</span>' +
      '<span class="tag green">本周完成 ' + doneCount + '/7</span>' +
      (isCustom ? '<button class="btn btn-ghost btn-sm" id="editMyPlanBtn">✏️ 编辑</button>' : '') +
      '</div></div>' +
      '<div class="progress mt-2"><div class="progress-bar" style="width:' + (doneCount / 7 * 100) + '%"></div></div></div>';

    html += '<div class="grid grid-2">' + pl.days.map(function (d, idx) {
      var date = week[idx];
      var c = YDJK.getCheckin(date);
      var done = !!(c && c.plan === id);
      var isToday = date === today;
      var empty = !d.items || d.items.length === 0;
      return '<div class="plan-day' + (done ? ' done' : '') + '" data-date="' + date + '" data-plan="' + id + '" style="' + (isToday ? 'border:2px solid var(--primary)' : '') + '">' +
        '<div class="pd-head">' +
        '<div class="pd-day">' + d.day + (isToday ? ' <span class="tag green">今天</span>' : '') + '</div>' +
        (empty ? '<span class="tag gray">休息日</span>' : '<button class="btn ' + (done ? 'btn-ghost' : 'btn-primary') + ' btn-sm day-check">' + (done ? '✅ 已打卡' : '✓ 完成打卡') + '</button>') +
        '</div>' +
        '<div class="pd-meta">' + esc(d.focus || '') + '</div>' +
        (empty ? '<div class="small muted mt-1">🛌 今天休息，让身体好好恢复</div>' :
          '<div class="pd-list mt-1">' + d.items.map(function (it) {
            return '<div class="pd-item"><span>' + esc(it[0]) + '</span><b>' + esc(it[1]) + '</b></div>';
          }).join('') + '</div>') + '</div>';
    }).join('') + '</div>';

    // 周完成率环
    var progEl = document.getElementById('planProgress');
    if (progEl && window.YDJK_CHARTS) {
      YDJK_CHARTS.donutChart(progEl, { value: doneCount, max: 7, unit: '/7', label: '本周', size: 76, thickness: 10 });
    }
    var content = document.getElementById('planContent');
    content.innerHTML = html;
    content.querySelectorAll('.day-check').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.classList.add('btn-pop');
        setTimeout(function () { btn.classList.remove('btn-pop'); }, 400);
        var dayEl = btn.closest('.plan-day');
        toggleDay(dayEl.dataset.date, dayEl.dataset.plan);
      });
    });
    var eb = document.getElementById('editMyPlanBtn');
    if (eb) eb.addEventListener('click', function () { openBuilder(id); });
  }

  function toggleDay(date, planId) {
    var c = YDJK.getCheckin(date);
    if (c && c.plan === planId) {
      delete c.plan;
      if ((!c.types || c.types.length === 0) && !c.minutes) YDJK.removeCheckin(date);
      else YDJK.setCheckin(date, c);
      YDJK_UI.toast('已取消打卡', 'err');
    } else {
      var base = c || { types: [], minutes: 0 };
      base.plan = planId;
      base.date = date;
      YDJK.setCheckin(date, base);
      YDJK_UI.toast('🎉 打卡成功，继续保持！');
      YDJK_UI.checkMilestone(date);
    }
    renderPlan(planId);
  }

  /* ---------- 我的计划列表 ---------- */
  function renderMyPlans() {
    var list = YDJK.getMyPlans();
    var html = '<div class="card mb-3" style="border:2px dashed var(--border);text-align:center;cursor:pointer" id="newPlanCard">' +
      '<div style="font-size:2rem">🧩</div><div style="font-weight:800;margin-top:6px">新建你的专属计划</div>' +
      '<div class="small muted mt-1">从动作库挑动作卡片，拼出独属于你的周计划</div>' +
      '<button class="btn btn-primary btn-sm mt-2">＋ 开始构建</button></div>';
    if (list.length) {
      html += '<div class="grid grid-2">' + list.map(function (pl) {
        var doneCount = YDJK.weekDates(YDJK.today()).filter(function (d) { var c = YDJK.getCheckin(d); return c && c.plan === pl.id; }).length;
        return '<div class="card card-hover">' +
          '<div class="flex-between"><div class="card-title" style="margin:0">' + pl.emoji + ' ' + esc(pl.name) + '</div><span class="tag purple">自定义</span></div>' +
          '<div class="card-sub mt-1">' + esc(pl.desc) + '</div>' +
          '<div class="flex gap-sm mt-2 flex-wrap">' +
          '<span class="tag gray">本周完成 ' + doneCount + '/7</span></div>' +
          '<div class="flex gap-sm mt-2">' +
          '<button class="btn btn-primary btn-sm js-view-plan" data-id="' + pl.id + '" style="flex:1">查看</button>' +
          '<button class="btn btn-ghost btn-sm js-edit-plan" data-id="' + pl.id + '">✏️</button>' +
          '<button class="btn btn-danger btn-sm js-del-plan" data-id="' + pl.id + '">🗑️</button></div></div>';
      }).join('') + '</div>';
    } else {
      html += '<div class="empty"><div class="e-icon">🧩</div><div class="e-title">还没有自定义计划</div><div class="e-desc">点上方卡片，从动作库挑选动作，拼出你的专属周计划</div></div>';
    }
    document.getElementById('planContent').innerHTML = html;
    var nc = document.getElementById('newPlanCard');
    if (nc) nc.addEventListener('click', function () { openBuilder(null); });
    document.querySelectorAll('.js-view-plan').forEach(function (b) {
      b.addEventListener('click', function () { renderPlan(b.dataset.id); });
    });
    document.querySelectorAll('.js-edit-plan').forEach(function (b) {
      b.addEventListener('click', function () { openBuilder(b.dataset.id); });
    });
    document.querySelectorAll('.js-del-plan').forEach(function (b) {
      b.addEventListener('click', function () {
        YDJK_UI.confirmDialog({
          title: '删除该计划？',
          message: '删除后无法恢复，已产生的打卡记录会保留。',
          okText: '删除计划', cancelText: '取消', danger: true, icon: '🗑️'
        }).then(function (ok) {
          if (!ok) return;
          YDJK.removeMyPlan(b.dataset.id);
          renderMyPlans();
          YDJK_UI.toast('🗑️ 计划已删除', 'err');
        });
      });
    });
  }

  /* ---------- 构建器 ---------- */
  var DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var bd = { day: 0, editId: null, name: '', goal: 'keep', desc: '', days: [], muscle: 'all', query: '' };

  function openBuilder(editId) {
    bd.editId = editId || null;
    bd.days = [];
    for (var i = 0; i < 7; i++) bd.days.push({ day: DAY_NAMES[i], focus: '', items: [] });
    if (editId) {
      var pl = getPlan(editId);
      if (pl) {
        bd.name = pl.name; bd.goal = pl.goal || 'keep'; bd.desc = pl.desc || '';
        pl.days.forEach(function (d, i) {
          bd.days[i] = { day: DAY_NAMES[i], focus: d.focus || '', items: (d.items || []).map(function (it) { return [it[0], it[1]]; }) };
        });
      }
    } else {
      bd.name = ''; bd.desc = '';
    }
    document.getElementById('pbName').value = bd.name;
    document.getElementById('pbGoal').value = bd.goal;
    document.getElementById('pbDesc').value = bd.desc;
    bd.day = 0;
    renderDayTabs();
    renderDayContent();
    renderMuscleFilter();
    renderActionList();
    YDJK_UI.openModal('planBuilderModal');
  }

  function renderDayTabs() {
    var tabs = document.getElementById('pbDayTabs');
    tabs.innerHTML = DAY_NAMES.map(function (d, i) {
      var has = bd.days[i] && bd.days[i].items && bd.days[i].items.length;
      return '<button class="tab-btn' + (i === bd.day ? ' active' : '') + '" data-day="' + i + '">' + d + (has ? ' ✓' : '') + '</button>';
    }).join('');
    tabs.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        bd.day = Number(btn.dataset.day);
        renderDayTabs();
        renderDayContent();
      });
    });
  }

  function renderDayContent() {
    var wrap = document.getElementById('pbDayContent');
    var items = bd.days[bd.day].items;
    var html = '<div class="flex-between" style="margin-bottom:10px;gap:10px;flex-wrap:wrap"><b class="small">' + DAY_NAMES[bd.day] + ' 训练内容</b>' +
      '<input class="input js-focus" value="' + esc(bd.days[bd.day].focus || '') + '" placeholder="训练重点（可选，如：胸部+有氧）" style="width:230px;padding:5px 10px">' +
      '<span class="small muted">' + (items.length ? items.length + ' 个动作' : '空（可当休息日）') + '</span></div>';
    if (!items.length) {
      html += '<div class="small muted" style="padding:10px 0">从下方动作库点击「＋」添加动作卡片</div>';
    } else {
      html += items.map(function (it, i) {
        return '<div class="plan-day" style="margin-bottom:8px">' +
          '<div class="flex-between gap-sm">' +
          '<b class="small">' + esc(it[0]) + '</b>' +
          '<div class="flex gap-sm" style="gap:8px">' +
          '<input class="input js-sets" data-i="' + i + '" value="' + esc(it[1]) + '" style="width:76px;padding:4px 8px;text-align:center" title="组数" aria-label="组数">' +
          '<button class="btn btn-danger btn-sm js-rm-a" data-i="' + i + '">✕</button></div></div></div>';
      }).join('');
    }
    wrap.innerHTML = html;
    var focusInp = wrap.querySelector('.js-focus');
    if (focusInp) focusInp.addEventListener('change', function () { bd.days[bd.day].focus = focusInp.value.trim(); });
    wrap.querySelectorAll('.js-sets').forEach(function (inp) {
      inp.addEventListener('change', function () {
        bd.days[bd.day].items[Number(inp.dataset.i)][1] = inp.value.trim() || '3×10';
      });
    });
    wrap.querySelectorAll('.js-rm-a').forEach(function (btn) {
      btn.addEventListener('click', function () {
        bd.days[bd.day].items.splice(Number(btn.dataset.i), 1);
        renderDayTabs();
        renderDayContent();
      });
    });
  }

  function renderMuscleFilter() {
    var wrap = document.getElementById('pbMuscles');
    var items = [{ id: 'all', label: '全部' }].concat(DATA.MUSCLES);
    wrap.innerHTML = items.map(function (m) {
      return '<button class="btn ' + (bd.muscle === m.id ? 'btn-primary' : 'btn-ghost') + ' btn-sm js-pb-muscle" data-muscle="' + m.id + '">' + m.emoji + ' ' + m.label + '</button>';
    }).join('');
    wrap.querySelectorAll('.js-pb-muscle').forEach(function (b) {
      b.addEventListener('click', function () {
        bd.muscle = b.dataset.muscle;
        renderMuscleFilter();
        renderActionList();
      });
    });
  }

  function renderActionList() {
    var q = bd.query.toLowerCase();
    var list = DATA.ACTIONS.filter(function (a) {
      if (bd.muscle !== 'all' && a.muscle !== bd.muscle) return false;
      if (q && a.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var wrap = document.getElementById('pbActionList');
    if (!list.length) { wrap.innerHTML = '<div class="small muted">没有匹配的动作</div>'; return; }
    wrap.innerHTML = list.map(function (a) {
      var m = DATA.MUSCLES.find(function (x) { return x.id === a.muscle; });
      return '<div class="list-row">' +
        '<div class="lr-main"><div><div class="lr-title">' + esc(a.name) + '</div><div class="lr-sub">' + (m ? m.emoji + ' ' + m.label : '') + ' · ' + esc(a.sets) + '</div></div></div>' +
        '<button class="btn btn-primary btn-sm js-add-a" data-name="' + esc(a.name) + '" data-sets="' + esc(a.sets) + '" title="' + esc(a.desc) + '">＋ 添加</button></div>';
    }).join('');
    wrap.querySelectorAll('.js-add-a').forEach(function (b) {
      b.addEventListener('click', function () {
        bd.days[bd.day].items.push([b.dataset.name, b.dataset.sets]);
        renderDayTabs();
        renderDayContent();
        YDJK_UI.toast('已添加：' + b.dataset.name);
      });
    });
  }

  function savePlan() {
    var name = document.getElementById('pbName').value.trim();
    if (!name) { YDJK_UI.toast('请填写计划名称', 'err'); return; }
    var hasContent = bd.days.some(function (d) { return d.items && d.items.length > 0; });
    if (!hasContent) { YDJK_UI.toast('请至少给一天添加一个动作', 'err'); return; }
    var goal = document.getElementById('pbGoal').value;
    var desc = document.getElementById('pbDesc').value.trim() || '我的专属训练计划';
    var gObj = DATA.GOALS.find(function (x) { return x.id === goal; });
    var plan = {
      id: bd.editId || undefined,
      name: name,
      goal: goal,
      desc: desc,
      emoji: '🧩',
      color: 'purple',
      level: '自定义',
      weekly: hasContent + ' 练 ' + (7 - hasContent) + ' 休',
      isCustom: true,
      days: bd.days
    };
    YDJK.saveMyPlan(plan);
    YDJK_UI.closeModal('planBuilderModal');
    YDJK_UI.toast('✅ 计划「' + name + '」已保存');
    var tabs = document.getElementById('planTabs');
    tabs.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var myTab = tabs.querySelector('[data-plan="__my__"]');
    if (myTab) myTab.classList.add('active');
    renderMyPlans();
  }

  /* ---------- 动作库（保留原模块） ---------- */
  var currentMuscle = 'all';
  function renderMuscleTabs() {
    var tabs = document.getElementById('muscleTabs');
    var items = [{ id: 'all', label: '全部', emoji: '✨' }].concat(DATA.MUSCLES);
    tabs.innerHTML = items.map(function (m) {
      return '<button class="tab-btn' + (m.id === 'all' ? ' active' : '') + '" data-muscle="' + m.id + '">' + m.emoji + ' ' + m.label + '</button>';
    }).join('');
    tabs.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentMuscle = btn.dataset.muscle;
        renderActions();
      });
    });
  }

  function renderActions() {
    var q = document.getElementById('actionSearch').value.trim().toLowerCase();
    var list = DATA.ACTIONS.filter(function (a) {
      if (currentMuscle !== 'all' && a.muscle !== currentMuscle) return false;
      if (q && a.name.toLowerCase().indexOf(q) === -1 && a.desc.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var grid = document.getElementById('actionGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="e-icon">🔍</div><div class="e-title">没有找到匹配的动作</div><div class="e-desc">换个关键词试试</div></div>';
      return;
    }
    grid.innerHTML = list.map(function (a) {
      var m = DATA.MUSCLES.find(function (x) { return x.id === a.muscle; });
      var lvColor = a.level === '进阶' ? 'red' : a.level === '中级' ? 'orange' : 'green';
      return '<div class="card card-hover food-card">' +
        '<div class="f-head"><div><div class="f-name">' + esc(a.name) + '</div><div class="f-cat">' + (m ? m.emoji + ' ' + m.label : '') + '</div></div>' +
        '<span class="tag ' + lvColor + '">' + a.level + '</span></div>' +
        '<div class="small text-2">' + esc(a.desc) + '</div>' +
        '<div class="f-action flex-between"><span class="tag gray">组数 ' + esc(a.sets) + '</span><button class="btn btn-outline btn-sm js-add-action" data-name="' + esc(a.name) + '">今日训练 +</button></div></div>';
    }).join('');
    grid.querySelectorAll('.js-add-action').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var today = YDJK.today();
        var c = YDJK.getCheckin(today) || { types: [], minutes: 0, date: today };
        if (!c.types) c.types = [];
        if (c.types.indexOf(btn.dataset.name) === -1) c.types.push(btn.dataset.name);
        YDJK.setCheckin(today, c);
        YDJK_UI.toast('已加入今日训练：' + btn.dataset.name);
      });
    });
  }

  /* ---------- 我的计划醒目横幅 ---------- */
  function renderMyPlanBanner() {
    var banner = document.getElementById('myPlanBanner');
    if (!banner) return;
    var cnt = YDJK.getMyPlans().length;
    var countEl = document.getElementById('myPlanCount');
    if (countEl) countEl.textContent = cnt ? '📚 已有 ' + cnt + ' 个自定义计划 · 点击继续构建' : '✨ 还没有自定义计划，点这里 60 秒搞定';
    banner.onclick = function () { openBuilder(null); };
    banner.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBuilder(null); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderMyPlanBanner();
    renderPlanTabs();
    renderMuscleTabs();
    renderActions();
    var search = document.getElementById('actionSearch');
    if (search) search.addEventListener('input', renderActions);
    // 构建器绑定
    var pbSearch = document.getElementById('pbSearch');
    if (pbSearch) pbSearch.addEventListener('input', function () { bd.query = pbSearch.value.trim(); renderActionList(); });
    var pbSave = document.getElementById('pbSave');
    if (pbSave) pbSave.addEventListener('click', savePlan);
    window.onDataChanged = function () {
      if (currentPlan) renderPlan(currentPlan);
      else renderMyPlans();
    };
  });
})();
