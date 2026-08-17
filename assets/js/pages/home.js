/* 首页逻辑 v2：今日仪表盘 */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function goalLabel(id) {
    var g = DATA.GOALS.find(function (x) { return x.id === id; });
    return g ? g.label : '';
  }
  function activityLabel(id) {
    var a = DATA.ACTIVITY_LEVELS.find(function (x) { return x.id === id; });
    return a ? a.label : '';
  }

  /* ---------- 登录欢迎语（含云端累计数据） ---------- */
  function renderWelcome() {
    var cloud = window.YD_CLOUD;
    var user = cloud && cloud.isLoggedIn() ? cloud.currentUser() : null;
    var el = document.getElementById('welcomeBar');
    if (!el) return;
    if (user) {
      var name = '';
      try { name = localStorage.getItem('ydjk:nickname') || ''; } catch (e) {}
      if (!name) name = (user.email || '').split('@')[0] || '用户';
      // 从云端数据统计累计值
      var stats = '';
      if (window.YD_CLOUD_LAST_DATA) {
        var d = window.YD_CLOUD_LAST_DATA;
        var days = d.checkins ? Object.keys(d.checkins).length : 0;
        var meals = 0;
        if (d.mealsAll) Object.keys(d.mealsAll).forEach(function (k) { meals += (d.mealsAll[k] || []).length; });
        var weights = (d.weights || []).length;
        stats = '<div class="welcome-stats">' +
          '<span>📅 累计打卡 <b>' + days + '</b></span>' +
          '<span>🍽️ 累计饮食 <b>' + meals + '</b></span>' +
          '<span>⚖️ 体重记录 <b>' + weights + '</b></span></div>';
      }
      el.innerHTML = '<div class="alert success"><span>👋</span><span style="flex:1">欢迎回来，<b>' + name + '</b>！数据已云端同步 ☁️' + stats + '</span>' +
        '<div class="flex gap-sm" style="gap:8px;flex:none">' +
        '<button class="btn btn-ghost btn-sm" onclick="location.href=\'profile.html\'">👤 资料</button>' +
        '<button class="btn btn-primary btn-sm" onclick="location.href=\'tracker.html\'">去记录 →</button></div></div>';
    } else {
      el.innerHTML = '<div class="alert info"><span>👋</span><span style="flex:1">登录后数据将云端同步，多设备随时查看，还能解锁个性化统计。</span><button class="btn btn-primary btn-sm" onclick="location.href=\'login.html\'">登录 / 注册</button></div>';
    }
  }

  /* ---------- 今日仪表盘 ---------- */
  function renderDashboard() {
    var p = YDJK.getProfile();
    var dateEl = document.getElementById('heroDate');
    if (dateEl) dateEl.textContent = YDJK.fmtDateCN(YDJK.today());

    if (!p) {
      document.getElementById('heroStats').innerHTML =
        '<div class="stat-card"><div class="s-icon">⚖️</div><div class="s-value">--</div><div class="s-label">BMI</div></div>' +
        '<div class="stat-card"><div class="s-icon">🔥</div><div class="s-value">--</div><div class="s-label">基础代谢 BMR</div></div>' +
        '<div class="stat-card"><div class="s-icon">🎯</div><div class="s-value">--</div><div class="s-label">每日目标热量</div></div>' +
        '<div class="stat-card"><div class="s-icon">📅</div><div class="s-value">0<small> 天</small></div><div class="s-label">连续打卡</div></div>';
      var ring = document.getElementById('heroRing');
      if (ring) ring.innerHTML = '<div style="text-align:center;padding:24px 10px"><div style="font-size:2.2rem">📝</div><div style="font-weight:800;color:var(--text-2);margin-top:6px">建立档案后<br>这里会显示你的健康数据</div></div>';
      var meta = document.getElementById('heroProfileMeta');
      if (meta) meta.textContent = '从一份 30 秒的健康档案开始';
      var acts = document.getElementById('heroActions');
      if (acts) acts.innerHTML = '';
      var cta = document.getElementById('heroCta');
      if (cta) {
        cta.innerHTML = '<button class="btn btn-primary btn-sm" id="createProfileBtn">📝 立即建立档案</button>';
        var cb = document.getElementById('createProfileBtn');
        if (cb) cb.onclick = function () { window.YDJK_UI.openProfileEditor(); };
      }
      return;
    }

    var weight = p.weight;
    var lw = YDJK.latestWeight();
    if (lw) weight = lw.weight;

    var bmi = YDJK.calcBMI(p.height, weight);
    var level = YDJK.bmiLevel(bmi);
    var bmr = YDJK.calcBMR({ gender: p.gender, age: p.age, height: p.height, weight: weight });
    var tdee = YDJK.calcTDEE(bmr, p.activity);
    var goalCal = Math.round(YDJK.goalCalories(tdee, p.goal));
    var streak = YDJK.checkinStreak();

    var today = YDJK.today();
    var meal = YDJK.mealSummary(today);
    var checkin = YDJK.getCheckin(today);
    var minutes = checkin ? (checkin.minutes || 0) : 0;
    var planDone = !!(checkin && checkin.plan);
    var typesCount = checkin && checkin.types ? checkin.types.length : 0;
    var workoutDone = minutes > 0 || typesCount > 0 || planDone;
    var water = YDJK.getWater(today);
    var WATER_GOAL = YDJK.getWaterGoal();

    YDJK_CHARTS.donutChart(document.getElementById('heroRing'), {
      value: Math.round(bmi * 10) / 10, max: 28, unit: '', decimals: 1,
      label: 'BMI · ' + level.name, size: 148
    });
    var meta = document.getElementById('heroProfileMeta');
    meta.innerHTML = esc(p.gender === 'male' ? '👨' : '👩') + ' ' + p.age + '岁 · ' + p.height + 'cm · ' + weight + 'kg · ' + goalLabel(p.goal);

    function actRow(icon, label, sub, pct, done) {
      return '<div class="action-item' + (done ? ' done' : '') + '">' +
        '<span class="a-ico">' + icon + '</span>' +
        '<div class="a-main"><div class="a-label"><span>' + label + '</span><span>' + sub + '</span></div>' +
        '<div class="progress"><div class="progress-bar" style="width:' + Math.min(100, pct) + '%"></div></div></div></div>';
    }
    var kcalPct = goalCal ? meal.kcal / goalCal * 100 : 0;
    var waterPct = water / WATER_GOAL * 100;
    document.getElementById('heroActions').innerHTML =
      actRow('🍽️', '今日摄入', meal.kcal + ' / ' + goalCal + ' kcal', kcalPct, meal.kcal >= goalCal) +
      actRow('🏃', '今日运动', workoutDone ? (minutes ? minutes + ' 分钟' : '已打卡') : '尚未打卡', minutes ? Math.min(100, minutes / 60 * 100) : (workoutDone ? 100 : 0), workoutDone) +
      actRow('💧', '今日饮水', water + ' / 2000 ml', waterPct, water >= WATER_GOAL);

    var cta = document.getElementById('heroCta');
    cta.innerHTML = '<div class="flex gap-sm" style="justify-content:center;flex-wrap:wrap">' +
      '<a href="tracker.html" class="btn btn-primary btn-sm">去记录今天 →</a>' +
      '<button class="btn btn-ghost btn-sm" id="editProfileBtn">✏️ 编辑档案</button></div>';
    var ep = document.getElementById('editProfileBtn');
    if (ep) ep.addEventListener('click', function () { window.YDJK_UI.openProfileEditor(); });

    document.getElementById('heroStats').innerHTML =
      '<div class="stat-card green"><div class="s-icon">⚖️</div><div class="s-value">' + bmi.toFixed(1) + '</div><div class="s-label">BMI · ' + level.name + '</div></div>' +
      '<div class="stat-card orange"><div class="s-icon">🔥</div><div class="s-value">' + Math.round(bmr) + '<small> kcal</small></div><div class="s-label">基础代谢 BMR</div></div>' +
      '<div class="stat-card blue"><div class="s-icon">🎯</div><div class="s-value">' + goalCal + '<small> kcal</small></div><div class="s-label">每日目标热量</div></div>' +
      '<div class="stat-card purple"><div class="s-icon">📅</div><div class="s-value">' + streak + '<small> 天</small></div><div class="s-label">连续打卡</div></div>';
    var hint = document.getElementById('heroStatsHint');
    if (hint) hint.textContent = '💡 目标热量按「' + goalLabel(p.goal) + '」策略计算：' + Math.round(tdee) + ' kcal（TDEE）' + (p.goal === 'cut' ? ' − 500' : p.goal === 'bulk' ? ' + 300' : ' ± 0');
  }

  /* ---------- 本周计划预览 ---------- */
  function renderWeek() {
    var p = YDJK.getProfile();
    var plan = DATA.PLANS[0];
    var myPlans = YDJK.getMyPlans();
    if (myPlans.length) {
      plan = myPlans[0];
    } else if (p) {
      var found = DATA.PLANS.find(function (x) { return x.goal === p.goal; });
      if (found) plan = found;
    }
    var sub = document.getElementById('planPreviewSub');
    if (sub) sub.textContent = (myPlans && myPlans.length ? '当前展示你的自定义计划：「' + plan.name + '」' : '当前推荐：' + plan.name + '（' + plan.weekly + '）') + ' · 可在计划页切换';
    var today = YDJK.today();
    var week = YDJK.weekDates(today);
    var todayIdx = week.indexOf(today);
    var wrap = document.getElementById('weekPreview');
    wrap.innerHTML = plan.days.map(function (d, i) {
      var isToday = i === todayIdx;
      var done = false;
      var c = YDJK.getCheckin(week[i]);
      if (c && c.plan === plan.id) done = true;
      return '<div class="card card-hover" style="' + (isToday ? 'border:2px solid var(--primary)' : '') + (done ? ';background:var(--primary-soft)' : '') + '">' +
        '<div class="flex-between"><span class="tag ' + (isToday ? 'blue' : done ? 'green' : 'gray') + '">' + d.day + (isToday ? ' · 今天' : '') + (done ? ' ✓' : '') + '</span><span class="small muted">' + d.focus + '</span></div>' +
        '<div class="mt-2">' + d.items.slice(0, 4).map(function (it) {
          return '<div class="flex-between" style="padding:6px 0;border-bottom:1px dashed var(--border);font-size:.88rem"><span class="text-2">' + esc(it[0]) + '</span><b class="mono small" style="color:var(--primary-dark)">' + esc(it[1]) + '</b></div>';
        }).join('') + '</div></div>';
    }).join('');
  }

  /* ---------- 热门推荐（横滑） ---------- */
  function renderHot() {
    var wrap = document.getElementById('hotScroll');
    if (!wrap) return;
    var p = YDJK.getProfile();
    var myPlans = YDJK.getMyPlans();
    var plan = DATA.PLANS[0];
    if (myPlans.length) plan = myPlans[0];
    else if (p) { var f = DATA.PLANS.find(function (x) { return x.goal === p.goal; }); if (f) plan = f; }
    var html = '';
    // 当前计划卡
    html += '<div class="hot-card dark" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff">' +
      '<div class="hot-tag">⭐ 为你推荐</div><div class="hot-title">' + plan.emoji + ' ' + esc(plan.name) + '</div>' +
      '<div class="hot-desc">' + esc(plan.desc) + ' · ' + (plan.weekly || '') + '</div>' +
      '<a class="hot-link" href="plans.html">查看计划 →</a></div>';
    // 其余计划
    DATA.PLANS.forEach(function (pl) {
      if (pl.id === plan.id) return;
      html += '<div class="hot-card"><div class="hot-tag">' + pl.emoji + '</div><div class="hot-title">' + esc(pl.name) + '</div>' +
        '<div class="hot-desc">' + esc(pl.desc) + '</div><a class="hot-link" href="plans.html">查看计划 →</a></div>';
    });
    // 热门文章
    DATA.ARTICLES.slice(0, 2).forEach(function (a) {
      html += '<div class="hot-card dark" style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#fff"><div class="hot-tag">📖 精选</div>' +
        '<div class="hot-title">' + esc(a.title) + '</div><div class="hot-desc">' + esc(a.excerpt) + '</div>' +
        '<a class="hot-link" href="articles.html#article-' + a.id + '">去阅读 →</a></div>';
    });
    wrap.innerHTML = html;
  }

  /* ---------- 文章预览 ---------- */
  function renderArticles() {
    var wrap = document.getElementById('articlePreview');
    wrap.innerHTML = DATA.ARTICLES.slice(0, 3).map(function (a) {
      return '<a href="articles.html#article-' + a.id + '" class="card card-hover article-card">' +
        '<div class="a-meta"><span class="tag blue">' + esc(a.cat) + '</span><span>⏱ ' + a.readTime + ' 分钟</span></div>' +
        '<div class="a-title">' + esc(a.title) + '</div>' +
        '<div class="a-excerpt">' + esc(a.excerpt) + '</div></a>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderDashboard();
    renderWelcome();
    renderWeek();
    renderHot();
    renderArticles();
  });
  window.onProfileSaved = function () { renderDashboard(); renderWeek(); renderWelcome(); };
  window.onDataChanged = function () { renderDashboard(); renderWeek(); renderWelcome(); };
})();
