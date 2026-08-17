/* 健康报告页：周报/月报 */
(function () {
  'use strict';
  var YDJK = window.YDJK;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var range = 'week';

  /* 计算报告数据 */
  function calcReport() {
    var today = YDJK.today();
    var days = [];
    if (range === 'week') days = YDJK.weekDates(today);
    else {
      var d = new Date();
      days = YDJK.monthDates(d.getFullYear(), d.getMonth() + 1);
    }
    var checkinDays = 0, totalMin = 0, totalKcal = 0, totalMeals = 0;
    var daily = [];
    days.forEach(function (day) {
      var c = YDJK.getCheckin(day);
      var active = c && ((c.types && c.types.length) || c.plan || (c.minutes && c.minutes > 0));
      if (active) checkinDays++;
      if (c) totalMin += (c.minutes || 0);
      var m = YDJK.mealSummary(day);
      totalKcal += m.kcal;
      totalMeals += m.count;
      daily.push({ date: day, kcal: m.kcal, min: c ? (c.minutes || 0) : 0, active: !!active });
    });
    var avgKcal = days.length ? Math.round(totalKcal / days.length) : 0;
    var water = 0;
    for (var i = 0; i < days.length; i++) water += YDJK.getWater(days[i]);
    return { days: days, checkinDays: checkinDays, totalMin: totalMin, totalKcal: totalKcal, totalMeals: totalMeals, avgKcal: avgKcal, water: water, daily: daily };
  }

  function render() {
    var r = calcReport();
    var el = document.getElementById('reportContent');
    var label = range === 'week' ? '本周' : '本月';
    var activeRate = r.days.length ? Math.round(r.checkinDays / r.days.length * 100) : 0;
    var avgMin = r.checkinDays ? Math.round(r.totalMin / r.checkinDays) : 0;

    var html = '<div class="stat-grid">' +
      '<div class="stat-card green"><div class="s-icon">📅</div><div class="s-value">' + r.checkinDays + '/' + r.days.length + '</div><div class="s-label">打卡天数</div></div>' +
      '<div class="stat-card blue"><div class="s-icon">⏱️</div><div class="s-value">' + r.totalMin + '<small> 分</small></div><div class="s-label">总运动时长</div></div>' +
      '<div class="stat-card orange"><div class="s-icon">🍽️</div><div class="s-value">' + r.totalMeals + '<small> 餐</small></div><div class="s-label">总饮食记录</div></div>' +
      '<div class="stat-card purple"><div class="s-icon">🔥</div><div class="s-value">' + activeRate + '<small>%</small></div><div class="s-label">打卡率</div></div>' +
      '</div>';

    // 每日摄入折线
    html += '<div class="card mt-3"><div class="card-title">🍽️ 每日摄入（' + label + '）</div>' +
      '<div id="reportChart"></div></div>';

    // 平均数据
    html += '<div class="card mt-3"><div class="card-title">📊 ' + label + '平均数据</div>' +
      '<div class="list-row"><div class="lr-main"><b class="small">日均摄入</b></div><div class="lr-side"><b>' + r.avgKcal + ' kcal</b></div></div>' +
      '<div class="list-row"><div class="lr-main"><b class="small">平均每次运动</b></div><div class="lr-side"><b>' + avgMin + ' 分钟</b></div></div>' +
      '<div class="list-row"><div class="lr-main"><b class="small">总饮水量</b></div><div class="lr-side"><b>' + r.water + ' ml</b></div></div>' +
      '</div>';

    // 点评
    var comment = '';
    if (activeRate >= 80) comment = '🏆 太棒了！坚持得很好，继续保持这个节奏！';
    else if (activeRate >= 50) comment = '👍 表现不错！还有提升空间，加油！';
    else if (activeRate >= 30) comment = '💪 开始就是胜利！试着每天运动 20 分钟吧';
    else comment = '🌱 这周有些松懈，从今天开始，先完成一次打卡！';
    html += '<div class="alert info mt-3"><span>💬</span><span>' + comment + '</span></div>';

    el.innerHTML = html;

    // 图表
    var labels = r.daily.map(function (d) { return d.date.slice(5); });
    var values = r.daily.map(function (d) { return d.kcal; });
    YDJK_CHARTS.lineChart(document.getElementById('reportChart'), { labels: labels, values: values, unit: ' kcal', color: '#f59e0b' });

    // 三餐分布（近 7 天）
    var mealDist = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    var recent7 = YDJK.weekDates(YDJK.today());
    recent7.forEach(function (d) {
      YDJK.getMeals(d).forEach(function (m) {
        if (mealDist[m.type] !== undefined) mealDist[m.type] += m.kcal;
      });
    });
    var distTotal = mealDist.breakfast + mealDist.lunch + mealDist.dinner + mealDist.snack;
    if (distTotal > 0) {
      var distHtml = '<div class="card mt-3"><div class="card-title">🍽️ 近 7 天三餐热量分布</div>';
      [['breakfast', '🌅 早餐'], ['lunch', '🍱 午餐'], ['dinner', '🌙 晚餐'], ['snack', '🍎 加餐']].forEach(function (pair) {
        var k = pair[0], label = pair[1];
        var pct = Math.round(mealDist[k] / distTotal * 100);
        distHtml += '<div class="mb-2"><div class="flex-between small" style="margin-bottom:6px"><span>' + label + '</span><b>' + mealDist[k] + ' kcal (' + pct + '%)</b></div>' +
          '<div class="progress"><div class="progress-bar" style="width:' + pct + '%"></div></div></div>';
      });
      distHtml += '</div>';
      el.innerHTML += distHtml;
    }
  }

  function exportText() {
    var r = calcReport();
    var label = range === 'week' ? '本周' : '本月';
    var rate = r.days.length ? Math.round(r.checkinDays / r.days.length * 100) : 0;
    var text = '📈 悦动健康 · ' + label + '健康报告\n' +
      '━━━━━━━━━━━━━━━\n' +
      '📅 打卡：' + r.checkinDays + '/' + r.days.length + ' 天（' + rate + '%）\n' +
      '⏱️ 运动：' + r.totalMin + ' 分钟\n' +
      '🍽️ 记录：' + r.totalMeals + ' 餐\n' +
      '🔥 日均摄入：' + r.avgKcal + ' kcal\n' +
      '━━━━━━━━━━━━━━━\n' +
      '和我一起管理健康吧！\nhttps://pillish1.github.io/health-chn/';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { YDJK_UI.toast('✅ 报告已复制，去分享吧！'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); YDJK_UI.toast('✅ 报告已复制'); } catch (e) {}
      ta.remove();
    }
  }
  function exportJson() {
    var data = { exportedAt: new Date().toISOString(), app: 'yuedong-health' };
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('ydjk:') === 0) keys.push(k);
    }
    data.data = {};
    keys.forEach(function (k) { data.data[k] = localStorage.getItem(k); });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'yuedong-data-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); URL.revokeObjectURL(url);
    YDJK_UI.toast('✅ 数据已导出');
  }

  function drawShareCard() {
    var r = calcReport();
    var label = range === 'week' ? '本周' : '本月';
    var rate = r.days.length ? Math.round(r.checkinDays / r.days.length * 100) : 0;
    var W = 600, H = 800;
    var c = document.getElementById('shareCanvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    // 背景渐变
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2563eb'); g.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 装饰圆
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath(); ctx.arc(W - 60, 60, 120, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(50, H - 50, 90, 0, Math.PI * 2); ctx.fill();
    // Logo
    ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏃 悦动健康', W / 2, 90);
    ctx.font = '22px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(label + '健康报告', W / 2, 130);
    // 大数字
    ctx.font = 'bold 72px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(rate + '%', W / 2, 260);
    ctx.font = '20px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText('打卡率', W / 2, 295);
    // 数据卡
    var data = [
      { label: '打卡天数', value: r.checkinDays + '/' + r.days.length },
      { label: '运动时长', value: r.totalMin + ' 分钟' },
      { label: '饮食记录', value: r.totalMeals + ' 餐' },
      { label: '日均摄入', value: r.avgKcal + ' kcal' }
    ];
    var y = 360;
    data.forEach(function (d) {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath(); ctx.roundRect(50, y, W - 100, 70, 16); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '18px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(d.label, 80, y + 32);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(d.value, W - 80, y + 32);
      y += 90;
    });
    // 底部
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('和我一起管理健康吧！', W / 2, H - 50);
    ctx.fillText('https://pillish1.github.io/health-chn/', W / 2, H - 20);
    document.getElementById('shareCardWrap').style.display = 'block';
  }
  function saveShareImage() {
    var c = document.getElementById('shareCanvas');
    var a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'yuedong-report.png';
    a.click();
    YDJK_UI.toast('✅ 分享图已保存');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var si = document.getElementById('btnShareImage');
    if (si) si.addEventListener('click', drawShareCard);
    var sv = document.getElementById('btnSaveImage');
    if (sv) sv.addEventListener('click', saveShareImage);
    var eb = document.getElementById('btnExportReport');
    if (eb) eb.addEventListener('click', exportText);
    var ej = document.getElementById('btnExportJson');
    if (ej) ej.addEventListener('click', exportJson);
    render();
    var tabs = document.getElementById('reportTabs');
    tabs.querySelectorAll('.report-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.report-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        range = btn.dataset.range;
        render();
      });
    });
  });
})();
