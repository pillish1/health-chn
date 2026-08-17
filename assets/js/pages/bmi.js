(function () {
  'use strict';
  var YDJK = window.YDJK;
  var heightI = document.getElementById('height');
  var weightI = document.getElementById('weight');
  var hVal = document.getElementById('heightVal');
  var wVal = document.getElementById('weightVal');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function calc() {
    var h = Number(heightI.value);
    var w = Number(weightI.value);
    hVal.textContent = h;
    wVal.textContent = w;
    var gender = document.querySelector('input[name=gender]:checked').value;
    var bmi = YDJK.calcBMI(h, w);
    if (!bmi) return;
    var level = YDJK.bmiLevel(bmi);
    document.getElementById('bmiValue').textContent = bmi.toFixed(1);
    var chip = document.getElementById('bmiLevel');
    chip.innerHTML = '<span class="tag ' + level.color + '">' + level.name + '</span>';
    document.getElementById('bmiTip').textContent = level.tip;
    // 理想体重
    var low = 18.5 * Math.pow(h / 100, 2);
    var high = 24 * Math.pow(h / 100, 2);
    var ideal = YDJK.idealWeight(h, gender);
    document.getElementById('idealLow').textContent = low.toFixed(1) + ' kg';
    document.getElementById('idealHigh').textContent = high.toFixed(1) + ' kg';
    document.getElementById('idealMid').textContent = ideal.toFixed(1) + ' kg';
    // 标尺指示（BMI 12-32 映射到 0-100%）
    var marker = document.getElementById('bmiMarker');
    if (marker) marker.style.left = Math.min(100, Math.max(0, (bmi - 12) / 20 * 100)) + '%';
    // 健康评估
    var adv = document.getElementById('bmiAdvice');
    if (adv) {
      var advice = {
        thin: '💡 <b>增重建议</b>：增加 300-500 kcal 热量摄入，以优质蛋白和复合碳水为主，配合力量训练增肌。',
        normal: '💡 <b>保持建议</b>：维持当前饮食与运动习惯，每周 150 分钟中等强度运动，均衡营养。',
        over: '💡 <b>减重建议</b>：制造 300-500 kcal 热量缺口，增加有氧运动，每周减 0.3-0.5kg 为宜。',
        obese: '💡 <b>科学减重</b>：建议咨询专业营养师制定计划，从控制精制碳水和增加日常活动量开始。'
      }[level.key] || '';
      adv.innerHTML = advice;
    }
  }

  // 同步体重到档案
  var syncWrap = document.getElementById('syncWeightWrap');
  var syncBtn = document.getElementById('syncWeightBtn');
  function refreshSyncBtn() {
    if (syncWrap && YDJK.getProfile()) {
      syncWrap.style.display = 'block';
      if (syncBtn) syncBtn.textContent = '📝 将档案体重更新为 ' + weightI.value + ' kg';
    }
  }
  if (syncBtn) syncBtn.addEventListener('click', function () {
    var p = YDJK.getProfile();
    if (!p) { YDJK_UI.toast('请先建立健康档案', 'err'); return; }
    p.weight = Number(weightI.value);
    YDJK.saveProfile(p);
    YDJK_UI.toast('✅ 档案体重已更新为 ' + p.weight + ' kg');
  });
  heightI.addEventListener('input', function () { calc(); refreshSyncBtn(); });
  weightI.addEventListener('input', function () { calc(); refreshSyncBtn(); });
  weightI.addEventListener('input', calc);
  document.querySelectorAll('input[name=gender]').forEach(function (r) { r.addEventListener('change', calc); });
  // 预填档案
  var p = YDJK.getProfile();
  if (p) {
    heightI.value = p.height; weightI.value = p.weight;
    var g = document.getElementById(p.gender === 'female' ? 'bmi-female' : 'bmi-male');
    if (g) { g.checked = true; }
  }
  calc();
  refreshSyncBtn();
})();
