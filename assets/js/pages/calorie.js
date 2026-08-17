(function () {
  'use strict';
  var YDJK = window.YDJK;
  var DATA = window.YDJK_DATA;

  // 活动水平选项
  var act = document.getElementById('activity');
  act.innerHTML = DATA.ACTIVITY_LEVELS.map(function (l) {
    return '<option value="' + l.id + '">' + l.label + '（系数 ' + l.factor + '）</option>';
  }).join('');
  function showActivityHint() {
    var l = DATA.ACTIVITY_LEVELS.find(function (x) { return x.id === act.value; });
    document.getElementById('activityHint').textContent = l ? l.desc : '';
  }
  act.addEventListener('change', showActivityHint);
  showActivityHint();

  // 目标单选
  var goalGroup = document.getElementById('goalGroup');
  goalGroup.innerHTML = DATA.GOALS.map(function (g, i) {
    return '<div class="radio-pill"><input type="radio" name="goal" id="cal-goal-' + g.id + '" value="' + g.id + '"' + (i === 1 ? ' checked' : '') + '><label for="cal-goal-' + g.id + '"><span class="emoji">' + g.emoji + '</span>' + g.label + '</label></div>';
  }).join('');

  // 预填档案
  var p = YDJK.getProfile();
  if (p) {
    document.getElementById('gender').value = p.gender;
    document.getElementById('age').value = p.age;
    document.getElementById('height').value = p.height;
    document.getElementById('weight').value = p.weight;
    document.getElementById('activity').value = p.activity;
    var g = document.getElementById('cal-goal-' + p.goal);
    if (g) g.checked = true;
  }

  function calc() {
    var profile = {
      gender: document.getElementById('gender').value,
      age: Number(document.getElementById('age').value) || 25,
      height: Number(document.getElementById('height').value) || 170,
      weight: Number(document.getElementById('weight').value) || 65
    };
    var activity = document.getElementById('activity').value;
    var goal = goalGroup.querySelector('input:checked').value;
    var bmr = YDJK.calcBMR(profile);
    var tdee = YDJK.calcTDEE(bmr, activity);
    var cal = YDJK.goalCalories(tdee, goal);
    var m = YDJK.macros(cal, goal);
    var gObj = DATA.GOALS.find(function (x) { return x.id === goal; });

    document.getElementById('bmrVal').textContent = Math.round(bmr) + ' kcal';
    document.getElementById('tdeeVal').textContent = Math.round(tdee) + ' kcal';
    document.getElementById('goalVal').textContent = Math.round(cal) + ' kcal';
    document.getElementById('goalLabel').textContent = gObj.emoji + ' 目标热量（' + gObj.label + '）';

    var deficit = tdee - cal;
    var weekBar = document.getElementById('weekBar');
    weekBar.classList.remove('orange', 'red');
    var weekText = document.getElementById('weekText');
    if (deficit > 0) {
      document.getElementById('weekBar').style.width = Math.min(100, deficit / 1000 * 100) + '%';
      weekText.textContent = '每天约 ' + Math.round(deficit) + ' kcal 热量缺口，一周累计约 ' + Math.round(deficit * 7 / 7700 * 10) / 10 + ' kg 脂肪（按 7700 kcal/kg 估算）';
    } else if (deficit < 0) {
      document.getElementById('weekBar').style.width = Math.min(100, -deficit / 1000 * 100) + '%';
      document.getElementById('weekBar').classList.add('orange');
      weekText.textContent = '每天约 ' + Math.round(-deficit) + ' kcal 热量盈余，配合力量训练用于增肌（肌肉增长受训练与基因影响）';
    } else {
      document.getElementById('weekBar').style.width = '0%';
      weekText.textContent = '保持体重：每日热量摄入 ≈ 总消耗即可';
    }

    var macros = [
      { name: '蛋白质', gram: m.protein, kcal: Math.round(m.protein * 4), color: '#38bdf8', pct: goal === 'cut' ? 35 : goal === 'bulk' ? 30 : 30 },
      { name: '碳水化合物', gram: m.carbs, kcal: Math.round(m.carbs * 4), color: '#f59e0b', pct: goal === 'cut' ? 40 : goal === 'bulk' ? 50 : 45 },
      { name: '脂肪', gram: m.fat, kcal: Math.round(m.fat * 9), color: '#ef4444', pct: goal === 'cut' ? 25 : goal === 'bulk' ? 20 : 25 }
    ];
    document.getElementById('macroList').innerHTML = macros.map(function (mm) {
      return '<div class="mb-2">' +
        '<div class="flex-between small" style="margin-bottom:6px"><span><b>' + mm.name + '</b> <span class="muted">' + mm.kcal + ' kcal · ' + mm.pct + '%</span></span><b>' + mm.gram + ' g</b></div>' +
        '<div class="progress"><div class="progress-bar" style="width:' + mm.pct + '%;background:' + mm.color + '"></div></div></div>';
    }).join('');
  }

  var applyBtn = document.getElementById('applyGoalBtn');
  if (applyBtn) applyBtn.addEventListener('click', function () {
    var p = YDJK.getProfile();
    if (!p) { YDJK_UI.toast('请先建立健康档案', 'err'); return; }
    var goal = goalGroup.querySelector('input:checked').value;
    var weight = Number(document.getElementById('weight').value);
    var gObj2 = DATA.GOALS.find(function (x) { return x.id === goal; });
    p.goal = goal;
    p.weight = weight;
    YDJK.saveProfile(p);
    YDJK_UI.toast('✅ 已应用到档案：目标「' + gObj2.label + '」· 体重 ' + weight + ' kg');
  });

  ['gender', 'age', 'height', 'weight', 'activity'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', calc);
    document.getElementById(id).addEventListener('change', calc);
  });
  goalGroup.addEventListener('change', calc);
  calc();
})();
