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
  }

  document.addEventListener('DOMContentLoaded', function () {
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
