/* ============================================================
   悦动健康 · 数据层 storage.js
   健康档案 / 体重记录 / 运动打卡 / 饮食记录 / 饮水 / 计算引擎
   ============================================================ */
(function () {
  'use strict';

  var NS = 'ydjk:';
  var LS = window.localStorage;

  /* ---------- 基础工具 ---------- */
  function today() {
    var d = new Date();
    return fmtDate(d);
  }
  function fmtDate(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function fmtDateCN(d) {
    return d.replace(/-/g, '/');
  }
  function addDays(dateStr, n) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return fmtDate(d);
  }
  function weekStart(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var day = d.getDay(); // 0=Sun
    var offset = (day + 6) % 7; // 周一为起点
    d.setDate(d.getDate() - offset);
    return fmtDate(d);
  }
  function weekDates(dateStr) {
    var start = weekStart(dateStr);
    var arr = [];
    for (var i = 0; i < 7; i++) arr.push(addDays(start, i));
    return arr;
  }
  function monthDates(year, month) { // month: 1-12
    var days = new Date(year, month, 0).getDate();
    var arr = [];
    for (var d = 1; d <= days; d++) {
      arr.push(year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    }
    return arr;
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function getJSON(key, fallback) {
    try {
      var v = LS.getItem(NS + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function setJSON(key, val) {
    LS.setItem(NS + key, JSON.stringify(val));
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  /* ---------- 健康档案 ---------- */
  function getProfile() {
    return getJSON('profile', null);
  }
  function saveProfile(p) {
    setJSON('profile', p);
    setJSON('onboarded', true);
    cloudSave();
  }
  function isOnboarded() { return getJSON('onboarded', false) === true; }

  /* ---------- 运动打卡 ---------- */
  function getCheckins() { return getJSON('checkins', {}); }
  function setCheckin(date, data) {
    var c = getCheckins();
    c[date] = data;
    setJSON('checkins', c);
    cloudSave();
  }
  /* 连续打卡天数（截至 date，往前数连续有打卡记录的天数） */
  function checkinStreak(dateStr) {
    var c = getCheckins();
    var streak = 0;
    var d = dateStr || today();
    // 连续天数：打卡记录 或 训练记录 均可计入
    while (c[d] || getWorkouts(d).length > 0) { streak++; d = addDays(d, -1); }
    return streak;
  }

  /* ---------- 训练记录（卡片式） ---------- */
  function getWorkouts(date) { return getJSON('workouts:' + date, []); }
  function getAllWorkouts() {
    var w = {};
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i);
      if (k.indexOf(NS + 'workouts:') === 0) w[k.replace(NS + 'workouts:', '')] = JSON.parse(LS.getItem(k) || '[]');
    }
    return w;
  }
  function addWorkout(date, workout) {
    var list = getWorkouts(date);
    if (!workout.id) workout.id = uid();
    workout.date = date;
    list.push(workout);
    setJSON('workouts:' + date, list);
    cloudSave();
    return workout;
  }
  function removeWorkout(date, id) {
    var list = getWorkouts(date).filter(function (w) { return w.id !== id; });
    setJSON('workouts:' + date, list);
    cloudSave();
  }
  function updateWorkout(date, workout) {
    var list = getWorkouts(date).map(function (w) { return w.id === workout.id ? workout : w; });
    setJSON('workouts:' + date, list);
    cloudSave();
  }

  /* ---------- 我的套餐 ---------- */
  function getMealTemplates() { return getJSON('meal-templates', []); }
  function saveMealTemplate(tpl) {
    var list = getMealTemplates().filter(function (t) { return t.id !== tpl.id; });
    list.push(tpl);
    setJSON('meal-templates', list);
    cloudSave();
  }
  function removeMealTemplate(id) {
    setJSON('meal-templates', getMealTemplates().filter(function (t) { return t.id !== id; }));
    cloudSave();
  }

  /* ---------- 食物收藏 ---------- */
  function getFavs() { return getJSON('favs', []); }
  function isFav(name) { return getFavs().indexOf(name) !== -1; }
  function toggleFav(name) {
    var f = getFavs();
    var i = f.indexOf(name);
    if (i >= 0) f.splice(i, 1); else f.push(name);
    setJSON('favs', f);
    cloudSave();
    return i < 0; // true=已收藏
  }

  /* ---------- 饮食记录 ---------- */
  function getMeals(date) { return getJSON('meals:' + date, []); }
  function addMeal(date, meal) {
    var m = getMeals(date);
    m.push({ id: uid(), type: meal.type, name: meal.name, kcal: Number(meal.kcal) || 0, protein: Number(meal.protein) || 0, carbs: Number(meal.carbs) || 0, fat: Number(meal.fat) || 0, ts: Date.now() });
    setJSON('meals:' + date, m);
    cloudSave();
    return m;
  }
  function removeMeal(date, id) {
    var m = getMeals(date).filter(function (x) { return x.id !== id; });
    setJSON('meals:' + date, m);
    return m;
  }
  function mealSummary(date) {
    var m = getMeals(date);
    var s = { count: m.length, kcal: 0, protein: 0, carbs: 0, fat: 0 };
    m.forEach(function (x) {
      s.kcal += x.kcal; s.protein += x.protein; s.carbs += x.carbs; s.fat += x.fat;
    });
    s.kcal = Math.round(s.kcal);
    s.protein = round1(s.protein); s.carbs = round1(s.carbs); s.fat = round1(s.fat);
    return s;
  }

  /* ---------- 主题 ---------- */
  function setTheme(t) { setJSON('theme', t); }

  /* ---------- 计算引擎 ---------- */
  /* Mifflin-St Jeor 基础代谢 */
  function calcBMR(profile) {
    var base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
    return profile.gender === 'female' ? base - 161 : base + 5;
  }
  /* 每日总消耗 TDEE */
  function calcTDEE(bmr, activityLevel) {
    var factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 };
    return bmr * (factors[activityLevel] || 1.375);
  }
  /* 目标热量：减脂 -500，保持 0，增肌 +300 */
  function goalCalories(tdee, goal) {
    if (goal === 'cut') return tdee - 500;
    if (goal === 'bulk') return tdee + 300;
    return tdee;
  }
  /* 营养素配比（克）：碳4 蛋4 脂9 */
  function macros(cal, goal) {
    var ratios;
    if (goal === 'cut') ratios = { protein: 0.35, fat: 0.25, carbs: 0.4 };
    else if (goal === 'bulk') ratios = { protein: 0.3, fat: 0.2, carbs: 0.5 };
    else ratios = { protein: 0.3, fat: 0.25, carbs: 0.45 };
    return {
      protein: Math.round(cal * ratios.protein / 4),
      fat: Math.round(cal * ratios.fat / 9),
      carbs: Math.round(cal * ratios.carbs / 4)
    };
  }

  /* ---------- 数据备份（彻底本地化：无云端同步） ---------- */
  function cloudSave() { /* 本地模式：无需云端同步 */ }
  /* 收集当前本地全部数据（用于导出备份） */
  function collectAllData() {
    return {
      profile: getProfile(),
      checkins: getCheckins(),
      workouts: getAllWorkouts(),
      favs: getFavs(),
      mealsAll: (function () {
        var m = {};
        for (var i = 0; i < LS.length; i++) {
          var k = LS.key(i);
          if (k.indexOf(NS + 'meals:') === 0) m[k.replace(NS + 'meals:', '')] = JSON.parse(LS.getItem(k) || '[]');
        }
        return m;
      })(),
      mealTemplates: getMealTemplates()
    };
  }

  /* ---------- 智能建议（规则版，纯本地） ---------- */
  /* 接口：getSmartTips(dateStr) → [{type, icon, iconName, text}]，warn 优先，最多 3 条
     type: warn(提醒) / info(提示) / good(鼓励)；iconName 走 icons.js SVG，icon 为 emoji 兕底 */
  function getSmartTips(dateStr) {
    var date = dateStr || today();
    var tips = [];
    var p = getProfile();
    if (!p) {
      tips.push({ type: 'info', iconName: 'clipboard', icon: '📋', text: '建立健康档案后，这里会给你个性化的每日建议' });
      return tips;
    }
    var goalCal = Math.round(goalCalories(calcTDEE(calcBMR(p), p.activity), p.goal));
    var meal = mealSummary(date);
    var wk = getWorkouts(date);
    var streak = checkinStreak(date);
    var mm = macros(goalCal, p.goal);

    /* 饮食 */
    if (meal.count === 0) {
      tips.push({ type: 'warn', iconName: 'food', icon: '🍽️', text: '今天还没记录饮食，从记一餐开始吧' });
    } else {
      if (meal.kcal < goalCal * 0.5) {
        tips.push({ type: 'warn', iconName: 'food', icon: '🍽️', text: '今日摄入偏低（' + meal.kcal + '/' + goalCal + ' kcal），记得补充优质蛋白' });
      } else if (meal.kcal > goalCal * 1.2) {
        tips.push({ type: 'warn', iconName: 'flame', icon: '🔥', text: '今日摄入略高（' + meal.kcal + '/' + goalCal + ' kcal），可增加运动消耗' });
      }
      if (meal.protein >= mm.protein) {
        tips.push({ type: 'good', iconName: 'check', icon: '✅', text: '蛋白质已达标（' + Math.round(meal.protein) + '/' + mm.protein + 'g），营养很到位' });
      }
    }

    /* 运动 */
    if (!wk.length) {
      tips.push({ type: 'info', iconName: 'run', icon: '🏃', text: '今天还没运动，来 30 分钟快走或一组训练吧' });
      /* 连续未运动：仅对历史上有过运动记录的用户提示，避免新用户第一天被吓到 */
      var allWk = getAllWorkouts();
      var hasHistory = Object.keys(allWk).some(function (d) { return allWk[d].length > 0; });
      if (hasHistory) {
        var idle = 0;
        for (var i = 1; i <= 4; i++) {
          if (getWorkouts(addDays(date, -i)).length > 0) break;
          idle++;
        }
        if (idle >= 3) {
          tips.push({ type: 'warn', iconName: 'run', icon: '🏃', text: '你已经连续 ' + (idle + 1) + ' 天没有运动记录了，动一动找回状态' });
        }
      }
    }

    /* 连续打卡鼓励 */
    if (streak >= 30) tips.push({ type: 'good', iconName: 'flame', icon: '🔥', text: '连续坚持 ' + streak + ' 天，太强了！' });
    else if (streak >= 7) tips.push({ type: 'good', iconName: 'flame', icon: '🔥', text: '已连续坚持 ' + streak + ' 天，习惯正在养成' });
    else if (streak >= 3) tips.push({ type: 'good', iconName: 'flame', icon: '🔥', text: '连续 ' + streak + ' 天打卡，继续保持' });

    /* 深夜进食提醒（ts 为记录时间） */
    if (meal.count > 0 && getMeals(date).some(function (m) { var h = m.ts ? new Date(m.ts).getHours() : -1; return h >= 22 || h <= 4; })) {
      tips.push({ type: 'info', iconName: 'moon', icon: '🌙', text: '有深夜进食记录，尽量早点吃更健康' });
    }

    /* 记录完整 */
    if (meal.count > 0 && wk.length > 0) {
      tips.push({ type: 'good', iconName: 'check', icon: '✅', text: '饮食和运动都记录了，今天很完整！' });
    }

    /* 兜底 */
    if (!tips.length) {
      tips.push({ type: 'good', iconName: 'check', icon: '✅', text: '今日各项指标都不错，继续保持！' });
    }

    tips.sort(function (a, b) { return (a.type === 'warn' ? 0 : 1) - (b.type === 'warn' ? 0 : 1); });
    return tips.slice(0, 3);
  }

  window.YDJK = {
    today: today, fmtDateCN: fmtDateCN, addDays: addDays,
    weekDates: weekDates, monthDates: monthDates,
    getProfile: getProfile, saveProfile: saveProfile, isOnboarded: isOnboarded,
    getCheckins: getCheckins, setCheckin: setCheckin, checkinStreak: checkinStreak,
    getWorkouts: getWorkouts, getAllWorkouts: getAllWorkouts, addWorkout: addWorkout, removeWorkout: removeWorkout, updateWorkout: updateWorkout,
    getMeals: getMeals, addMeal: addMeal, removeMeal: removeMeal, mealSummary: mealSummary,
    isFav: isFav, toggleFav: toggleFav,
    getMealTemplates: getMealTemplates, saveMealTemplate: saveMealTemplate, removeMealTemplate: removeMealTemplate,
    cloudSave: cloudSave,
    getSmartTips: getSmartTips,
    collectAllData: collectAllData,
    setTheme: setTheme,
    calcBMR: calcBMR, calcTDEE: calcTDEE,
    goalCalories: goalCalories, macros: macros
  };
})();