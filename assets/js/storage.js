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
      })()
    };
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
    collectAllData: collectAllData,
    setTheme: setTheme,
    calcBMR: calcBMR, calcTDEE: calcTDEE,
    goalCalories: goalCalories, macros: macros
  };
})();