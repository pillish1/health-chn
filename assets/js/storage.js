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

  /* ---------- 体重记录 ---------- */
  function getWeights() {
    var w = getJSON('weights', []);
    w.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return w;
  }
  function addWeight(date, weight) {
    var w = getWeights();
    var idx = w.findIndex(function (x) { return x.date === date; });
    if (idx >= 0) w[idx] = { date: date, weight: round1(weight) };
    else w.push({ date: date, weight: round1(weight) });
    setJSON('weights', w);
    cloudSave();
    return w;
  }
  function removeWeight(date) {
    var w = getWeights().filter(function (x) { return x.date !== date; });
    setJSON('weights', w);
    return w;
  }
  function latestWeight() {
    var w = getWeights();
    return w.length ? w[w.length - 1] : null;
  }

  /* ---------- 用户文章（健康知识可更新） ---------- */
  function getUserArticles() { return getJSON('articles', []); }
  function saveUserArticle(a) {
    var list = getUserArticles();
    if (a.id) {
      var i = list.findIndex(function (x) { return x.id === a.id; });
      if (i >= 0) list[i] = a; else list.push(a);
    } else {
      a.id = uid();
      list.push(a);
    }
    setJSON('articles', list);
    cloudSave();
    return a;
  }
  function removeUserArticle(id) {
    setJSON('articles', getUserArticles().filter(function (x) { return x.id !== id; }));
  }
  /* ---------- 自定义运动计划 ---------- */
  function getMyPlans() { return getJSON('myplans', []); }
  function saveMyPlan(p) {
    var list = getMyPlans();
    if (p.id) {
      var i = list.findIndex(function (x) { return x.id === p.id; });
      if (i >= 0) list[i] = p; else list.push(p);
    } else {
      p.id = 'custom-' + uid();
      list.push(p);
    }
    setJSON('myplans', list);
    cloudSave();
    return p;
  }
  function removeMyPlan(id) {
    setJSON('myplans', getMyPlans().filter(function (x) { return x.id !== id; }));
  }
  /* 管理密码（默认，可在管理面板修改） */
  function getAdminPass() { return getJSON('adminpass', 'health2026'); }
  function setAdminPass(p) { setJSON('adminpass', p); }

  /* ---------- 运动打卡 ---------- */
  function getCheckins() { return getJSON('checkins', {}); }
  function getCheckin(date) { return getCheckins()[date] || null; }
  function setCheckin(date, data) {
    var c = getCheckins();
    c[date] = data;
    setJSON('checkins', c);
    cloudSave();
  }
  function removeCheckin(date) {
    var c = getCheckins();
    delete c[date];
    setJSON('checkins', c);
  }
  /* 连续打卡天数（截至 date，往前数连续有打卡记录的天数） */
  function checkinStreak(dateStr) {
    var c = getCheckins();
    var streak = 0;
    var d = dateStr || today();
    while (c[d]) { streak++; d = addDays(d, -1); }
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
  /* 今日是否有训练 */
  function todayWorkoutDone(date) {
    return getWorkouts(date || today()).length > 0;
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
  function removeFav(name) {
    var f = getFavs().filter(function (x) { return x !== name; });
    setJSON('favs', f);
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
  function updateMeal(date, id, patch) {
    var m = getMeals(date).map(function (x) {
      if (x.id !== id) return x;
      var n = {};
      for (var k in x) n[k] = x[k];
      for (var k2 in patch) n[k2] = patch[k2];
      return n;
    });
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

  /* ---------- 饮水 ---------- */
  function getWater(date) { return getJSON('water:' + date, 0); }
  function setWater(date, ml) { setJSON('water:' + date, Math.max(0, Number(ml) || 0)); cloudSave(); }
  function getWaterGoal() {
    var v = Number(getJSON('watergoal', 2000));
    return v >= 500 && v <= 6000 ? v : 2000;
  }
  function getWeightGoal() { return getJSON('weightgoal', 0); }
  function setWeightGoal(kg) { setJSON('weightgoal', Math.max(30, Math.min(200, Number(kg) || 0))); }
  function setWaterGoal(ml) {
    var v = Math.max(500, Math.min(6000, Number(ml) || 2000));
    setJSON('watergoal', v);
    return v;
  }

  /* ---------- 主题 ---------- */
  function getTheme() { return getJSON('theme', 'light'); }
  function setTheme(t) { setJSON('theme', t); }

  /* ---------- 计算引擎 ---------- */
  function calcBMI(height, weight) {
    if (!height || !weight || height <= 0 || weight <= 0) return null;
    var h = height / 100;
    return weight / (h * h);
  }
  function bmiLevel(bmi) {
    if (bmi < 18.5) return { key: 'thin', name: '偏瘦', tip: '建议增加营养摄入，配合力量训练增肌', color: 'blue' };
    if (bmi < 24) return { key: 'normal', name: '正常', tip: '非常棒！继续保持健康的生活方式', color: 'green' };
    if (bmi < 28) return { key: 'over', name: '超重', tip: '建议控制饮食热量，增加有氧运动', color: 'orange' };
    return { key: 'obese', name: '肥胖', tip: '建议咨询专业营养师或医生，科学减重', color: 'red' };
  }
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
  /* 理想体重（Devine 公式近似） */
  function idealWeight(height, gender) {
    var base = 50 + 0.9 * (height - 152.4);
    return gender === 'female' ? base - 4.5 : base;
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

  /* ---------- 云同步（登录状态下实时保存） ---------- */
  var cloudQueue = 0;
  function isCloudLogged() {
    try { return localStorage.getItem('ydjk:cloud-logged') === '1' && window.YD_CLOUD && window.YD_CLOUD.isLoggedIn(); } catch (e) { return false; }
  }
  /* 收集当前本地全部数据 */
  function collectAllData() {
    return {
      profile: getProfile(),
      weights: getWeights(),
      checkins: getCheckins(),
      favs: getFavs(),
      mealsAll: (function () {
        var m = {};
        for (var i = 0; i < LS.length; i++) {
          var k = LS.key(i);
          if (k.indexOf(NS + 'meals:') === 0) m[k.replace(NS + 'meals:', '')] = JSON.parse(LS.getItem(k) || '[]');
        }
        return m;
      })(),
      waterAll: (function () {
        var w = {};
        for (var i = 0; i < LS.length; i++) {
          var k = LS.key(i);
          if (k.indexOf(NS + 'water:') === 0) w[k.replace(NS + 'water:', '')] = Number(LS.getItem(k)) || 0;
        }
        return w;
      })(),
      myPlans: getMyPlans(),
      userArticles: getUserArticles(),
      weightGoal: getWeightGoal(),
      waterGoal: getWaterGoal()
    };
  }
  /* 云端保存（防抖：500ms 内多次修改合并为一次） */
  function cloudSave() {
    if (!isCloudLogged()) return;
    cloudQueue++;
    clearTimeout(window._cloudTimer);
    window._cloudTimer = setTimeout(function () {
      cloudQueue = 0;
      var payload = { data_json: JSON.stringify(collectAllData()), updated_at: new Date().toISOString() };
      window.YD_CLOUD.saveUserData(payload).catch(function () {});
    }, 500);
  }
  /* 从云端拉取并合并到本地 */
  async function cloudPull() {
    if (!isCloudLogged()) return false;
    try {
      var doc = await window.YD_CLOUD.loadUserData();
      if (!doc || !doc.data_json) return false;
      var cloud = JSON.parse(doc.data_json);
      var merged = false;
      if (cloud.profile && !getProfile()) { saveProfile(cloud.profile); merged = true; }
      if (cloud.weights && cloud.weights.length) { setJSON('weights', cloud.weights); merged = true; }
      if (cloud.checkins) { Object.keys(cloud.checkins).forEach(function (d) { setCheckin(d, cloud.checkins[d]); }); merged = true; }
      if (cloud.favs && cloud.favs.length) { setJSON('favs', cloud.favs); merged = true; }
      if (cloud.mealsAll) { Object.keys(cloud.mealsAll).forEach(function (d) { setJSON('meals:' + d, cloud.mealsAll[d]); }); merged = true; }
      if (cloud.waterAll) { Object.keys(cloud.waterAll).forEach(function (d) { setJSON('water:' + d, cloud.waterAll[d]); }); merged = true; }
      if (cloud.myPlans && cloud.myPlans.length) { setJSON('myplans', cloud.myPlans); merged = true; }
      if (cloud.userArticles && cloud.userArticles.length) { setJSON('articles', cloud.userArticles); merged = true; }
      if (cloud.weightGoal) setWeightGoal(cloud.weightGoal);
      if (cloud.waterGoal) setWaterGoal(cloud.waterGoal);
      return merged;
    } catch (e) { return false; }
  }

  window.YDJK = {
    today: today, fmtDate: fmtDate, fmtDateCN: fmtDateCN, addDays: addDays,
    weekStart: weekStart, weekDates: weekDates, monthDates: monthDates,
    getProfile: getProfile, saveProfile: saveProfile, isOnboarded: isOnboarded,
    getWeights: getWeights, addWeight: addWeight, removeWeight: removeWeight, latestWeight: latestWeight,
    getCheckins: getCheckins, getCheckin: getCheckin, setCheckin: setCheckin,
    removeCheckin: removeCheckin, checkinStreak: checkinStreak,
    getWorkouts: getWorkouts, getAllWorkouts: getAllWorkouts, addWorkout: addWorkout, removeWorkout: removeWorkout, updateWorkout: updateWorkout, todayWorkoutDone: todayWorkoutDone,
    getMeals: getMeals, addMeal: addMeal, updateMeal: updateMeal, removeMeal: removeMeal, mealSummary: mealSummary,
    getFavs: getFavs, isFav: isFav, toggleFav: toggleFav, removeFav: removeFav,
    getUserArticles: getUserArticles, saveUserArticle: saveUserArticle, removeUserArticle: removeUserArticle,
    getAdminPass: getAdminPass, setAdminPass: setAdminPass,
    getMyPlans: getMyPlans, saveMyPlan: saveMyPlan, removeMyPlan: removeMyPlan,
    cloudSave: cloudSave, cloudPull: cloudPull, isCloudLogged: isCloudLogged,
    getWater: getWater, setWater: setWater, getWaterGoal: getWaterGoal, setWaterGoal: setWaterGoal,
    getWeightGoal: getWeightGoal, setWeightGoal: setWeightGoal,
  collectAllData: collectAllData,
    getTheme: getTheme, setTheme: setTheme,
    calcBMI: calcBMI, bmiLevel: bmiLevel, calcBMR: calcBMR, calcTDEE: calcTDEE,
    goalCalories: goalCalories, idealWeight: idealWeight, macros: macros
  };
})();