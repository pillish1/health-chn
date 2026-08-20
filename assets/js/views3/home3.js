/* 悦动健康 · 首页 v3 */
(function () {
  'use strict';
  var Y = window.YDJK;

  function esc(s) { return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function template() {
    return '' +
      '<div id="ykProfileGuide" class="yk-profile-guide" style="display:none;margin-bottom:12px" onclick="YK.openProfile()">' +
        '<div style="font-size:.85rem;font-weight:800;color:#1E5FA8">👋 你好！先建立健康档案</div>' +
        '<div style="font-size:.72rem;color:#7A9CC2;margin-top:2px">设置后热量目标更准确</div>' +
        '<div style="margin-top:8px"><span style="background:#2E7CF6;color:#fff;padding:5px 14px;border-radius:99px;font-size:.75rem;font-weight:700">立即开始</span></div>' +
      '</div>' +
      '<div class="yk-hello">' +
        '<div><div class="yk-hello-title" id="ykHi">你好</div><div class="yk-hello-date" id="ykDate"></div></div>' +
        '<div class="yk-streak" id="ykStreak">🔥 0</div>' +
      '</div>' +

      '<div class="yk-energy-card">' +
        '<div class="yk-energy-top"><span class="yk-energy-label">今日摄入</span><span class="yk-energy-kcal"><span class="yk-num-grad" id="ykIntake">0</span><small>/ <span id="ykGoal">2000</span> kcal</small></span></div>' +
        '<div class="yk-energy-body">' +
          '<div id="ykRing" class="yk-ring"></div>' +
          '<div class="yk-energy-info">' +
            '<div class="yk-energy-row"><span class="yk-dot blue"></span><span>消耗</span><b id="ykBurn">0</b><small class="yk-text-xs yk-text-muted">kcal</small></div>' +
            '<div class="yk-energy-row"><span class="yk-dot green"></span><span>净摄入</span><b id="ykNet">0</b></div>' +
            '<div class="yk-energy-row"><span class="yk-dot orange"></span><span>蛋白质</span><b id="ykProtein">0</b><small class="yk-text-xs yk-text-muted">g</small></div>' +
          '</div>' +
        '</div>' +
        '<div class="yk-energy-macros" id="ykMacros"></div>' +
        '<div class="yk-energy-actions">' +
          '<button class="yk-btn yk-btn-primary" style="flex:1;border-radius:16px" onclick="goFoodsQuick()">🍽️ 记一餐</button>' +
          '<button class="yk-btn yk-btn-outline" style="flex:1;border-radius:16px" onclick="YK.navigate(\'plans\')">🏃 记运动</button>' +
        '</div>' +
      '</div>' +

      '<div class="yk-card" style="padding:14px 16px">' +
        '<div class="yk-flex-between yk-mb-2"><span class="yk-card-title" style="margin:0">✅ 今日待办</span><span id="ykTodoState" class="yk-text-xs yk-text-muted"></span></div>' +
        '<div class="yk-todo-row" onclick="YK.navigate(\'foods\')"><span class="yk-todo-check" id="ykCkMeal">&nbsp;</span><div><b>记录饮食</b><small id="ykTodoMeal">今天还没记录</small></div></div>' +
        '<div class="yk-todo-row" onclick="YK.navigate(\'plans\')"><span class="yk-todo-check" id="ykCkWk">&nbsp;</span><div><b>记录运动</b><small id="ykTodoWk">今天还没记录</small></div></div>' +
      '</div>' +

      '<div class="yk-card">' +
        '<div class="yk-card-title">📅 本周回顾</div>' +
        '<div id="ykWeek" class="yk-week-dots"></div>' +
      '</div>' +

      '<div class="yk-card">' +
        '<div class="yk-card-title">💡 今日建议</div>' +
        '<div id="ykTips" class="yk-tips"><span class="yk-text-xs yk-text-muted">记录数据后生成建议</span></div>' +
      '</div>';
  }

  function mounted() {
    render();
    window.onDataChanged = function(){ render(); };
    // 新用户引导：未建档时自动弹出建档
    setTimeout(function () {
      if (Y && !Y.getProfile()) {
        // 显示提示而非强制弹窗，避免打扰
        YK.toast('👋 建议先建立健康档案，获得个性化目标');
        setTimeout(function () { YK.openProfile(); }, 800);
      }
    }, 1200);
  }

  function render() {
    if (!Y) return;
    var today = Y.today();
    var dateEl = document.getElementById('ykDate');
    if (dateEl) dateEl.textContent = Y.fmtDateCN(today);
    var hi = document.getElementById('ykHi');
    if (hi) hi.textContent = hourGreeting();
    // 未建档时显示引导条
    var guide = document.getElementById('ykProfileGuide');
    if (guide) guide.style.display = Y.getProfile() ? 'none' : '';

    var p = Y.getProfile();
    var weight = p ? p.weight : 60;
    var bmr = Math.round(Y.calcBMR({gender:(p&&p.gender)||'male',age:(p&&p.age)||28,height:(p&&p.height)||170,weight:weight}));
    var goal = 2000;
    if (p) { var tdee=Y.calcTDEE(bmr,p.activity); goal=Math.round(Y.goalCalories(tdee,p.goal)); }

    var meal = Y.mealSummary(today);
    var intake = Math.round(meal.kcal);
    var wks = Y.getWorkouts(today);
    var burn = 0;
    wks.forEach(function(w){ var met=Number(w.met)||5; var mins=w.sets?w.sets*3:20; burn+=Math.round(met*3.5*weight/200*mins); });
    var totalBurn = bmr + Math.round(bmr*1.2) + burn;
    var net = intake - totalBurn;
    var streak = Y.checkinStreak();

    var iEl = document.getElementById('ykIntake'); if (iEl) iEl.textContent = intake;
      if (iEl && intake === 0) iEl.style.opacity = 0.35;

    var gEl = document.getElementById('ykGoal'); if (gEl) gEl.textContent = Math.round(goal);
    var bEl = document.getElementById('ykBurn'); if (bEl) bEl.textContent = totalBurn;
    var nEl = document.getElementById('ykNet'); if (nEl) { nEl.textContent = net; nEl.style.color = net>0?'#FF5D5D':net<0?'#18C29C':''; }
    var pEl = document.getElementById('ykProtein'); if (pEl) pEl.textContent = Math.round(meal.protein);
    var sEl = document.getElementById('ykStreak'); if (sEl) sEl.textContent = '🔥 ' + streak;

    if (window.YDJK_CHARTS) {
      var ring = document.getElementById('ykRing');
      if (ring) YDJK_CHARTS.donutChart(ring, { value:intake, max:Math.round(goal), unit:'', label:'', size:104, decimals:0, color: intake>goal?'#FF5D5D':undefined });
    }

    var macros = document.getElementById('ykMacros');
    if (macros) {
      var mm = p ? Y.macros(goal,p.goal) : {protein:60,carbs:250,fat:60};
      // 增肌用户提高蛋白质目标（1.6g/kg）
      if (p && p.goal === 'bulk') mm.protein = Math.round(p.weight * 1.6);
      var items = [{n:'蛋白质',v:meal.protein,t:mm.protein,c:'#2E7CF6'},{n:'碳水',v:meal.carbs,t:mm.carbs,c:'#FFA62B'},{n:'脂肪',v:meal.fat,t:mm.fat,c:'#FF5D5D'}];
      macros.innerHTML = items.map(function(it){
        var pct = Math.min(100, Math.round(it.v/it.t*100));
        return '<div class="yk-macro-bar"><small>'+it.n+' <b>'+it.v+'/'+it.t+'g</b></small><b>'+pct+'%</b><div class="yk-macro-track"><span style="width:'+pct+'%;background:'+it.c+'"></span></div></div>';
      }).join('');
    }

    /* 待办 */
    var mealDone = meal.count>0, wkDone = wks.length>0;
    var c1 = document.getElementById('ykCkMeal');
    if (c1) { c1.textContent = mealDone?'✓':''; c1.style.background = mealDone?'#18C29C':'transparent'; c1.style.borderColor = mealDone?'#18C29C':'var(--text-3)'; }
    var c2 = document.getElementById('ykCkWk');
    if (c2) { c2.textContent = wkDone?'✓':''; c2.style.background = wkDone?'#18C29C':'transparent'; c2.style.borderColor = wkDone?'#18C29C':'var(--text-3)'; }
    var m1 = document.getElementById('ykTodoMeal'); if (m1) m1.textContent = mealDone?'已记录 '+meal.count+' 条':'今天还没记录';
    var m2 = document.getElementById('ykTodoWk'); if (m2) m2.textContent = wkDone?'已记录 '+wks.length+' 项':'今天还没记录';
    var ts = document.getElementById('ykTodoState'); if (ts) ts.textContent = mealDone&&wkDone?'全部完成！':'';
      var ts2 = document.getElementById('ykTodoState'); if (ts2 && !mealDone && !wkDone) ts2.textContent = '开始记录吧';

    var r1 = document.getElementsByClassName('yk-todo-row'); if (r1[0]) r1[0].style.background = mealDone?'rgba(24,194,156,.06)':''; if (r1[1]) r1[1].style.background = wkDone?'rgba(24,194,156,.06)':'';

    /* 周 */
    var weekEl = document.getElementById('ykWeek');
    if (weekEl) {
      var week = Y.weekDates(today);
      weekEl.innerHTML = week.map(function(d){
        var m = Y.getMeals(d).length>0;
        var w = Y.getWorkouts(d).length>0;
        var cls = m&&w?'both':m?'meal':w?'wk':'';
        var bg = cls==='meal'?'#2E7CF6':cls==='wk'?'#18C29C':cls==='both'?'linear-gradient(135deg,#2E7CF6 50%,#18C29C 50%)':'var(--bg-soft)';
        return '<div class="yk-day"><i style="background:'+bg+'"></i><span>'+d.slice(5).replace('-','/')+'</span></div>';
      }).join('');
    }

    /* 建议 */
    var tipsEl = document.getElementById('ykTips');
    if (tipsEl) {
      var tips = null;
      try { tips = Y.getSmartTips(today); } catch(e) {}
      if (tips && tips.length) {
        tipsEl.innerHTML = tips.slice(0,3).map(function(t){
          return '<div class="yk-tip"><span class="yk-tip-icon">'+(t.icon||'💡')+'</span><span>'+t.text+'</span></div>';
        }).join('');
      }
    }
  }

  function hourGreeting() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 12) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';

  // 快速记一餐：跳转到饮食页并自动打开食物选择
  window.goFoodsQuick = function () {
    YK.navigate('foods');
    setTimeout(function () {
      var v = window.YK3_VIEWS && window.YK3_VIEWS.foods;
      if (v && v.quickAdd) v.quickAdd();
      else if (v && v.mounted) v.mounted();
    }, 200);
  };

  }

  function refresh() { render(); }

  window.YK3_VIEWS = window.YK3_VIEWS || {};
  window.YK3_VIEWS.home = { template:template, mounted:mounted, refresh:refresh };
})();
