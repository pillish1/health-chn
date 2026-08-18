/* ============================================================
   悦动健康 · 图表库 charts.js（纯 SVG，零依赖）
   折线图 / 环形进度图 / 日历热力图
   ============================================================ */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var donutGradSeq = 0;

  function el(name, attrs) {
    var n = document.createElementNS(SVG_NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---------- 折线图 ---------- */
  /* opts: { labels:[], values:[], color, unit, height, fill } */
  function lineChart(container, opts) {
    container.innerHTML = '';
    var labels = opts.labels || [];
    var values = opts.values || [];
    if (values.length === 0) { container.innerHTML = '<div class="empty" style="padding:24px"><div class="e-icon">📈</div><div class="e-title">暂无数据</div><div class="e-desc">记录一些数据后这里会生成趋势图</div></div>'; return; }
    var W = 720, H = opts.height || 260;
    var padL = 44, padR = 16, padT = 20, padB = 34;
    var minV = Math.min.apply(null, values);
    var maxV = Math.max.apply(null, values);
    if (minV === maxV) { minV -= 1; maxV += 1; }
    var span = maxV - minV;
    minV = minV - span * 0.15; maxV = maxV + span * 0.15;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    function x(i) { return values.length === 1 ? padL + plotW / 2 : padL + plotW * i / (values.length - 1); }
    function y(v) { return padT + plotH * (1 - (v - minV) / (maxV - minV)); }

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', preserveAspectRatio: 'xMidYMid meet' });
    // 网格 + Y 轴刻度
    var steps = 4;
    for (var s = 0; s <= steps; s++) {
      var gy = padT + plotH * s / steps;
      var val = maxV - (maxV - minV) * s / steps;
      svg.appendChild(el('line', { x1: padL, y1: gy, x2: W - padR, y2: gy, class: 'grid-line' }));
      var t = el('text', { x: padL - 8, y: gy + 4, class: 'axis-label', 'text-anchor': 'end' });
      t.textContent = Math.round(val);
      svg.appendChild(t);
    }
    // 面积渐变
    var defs = el('defs', {});
    var grad = el('linearGradient', { id: 'areaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': opts.color || '#2563eb', 'stop-opacity': '0.28' }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': opts.color || '#2563eb', 'stop-opacity': '0.02' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    // 目标线
    if (opts.target !== undefined && opts.target !== null) {
      var ty = y(Number(opts.target));
      var tc = opts.targetColor || '#f59e0b';
      svg.appendChild(el('line', { x1: padL, y1: ty, x2: W - padR, y2: ty, stroke: tc, 'stroke-width': '2', 'stroke-dasharray': '7 5', 'stroke-opacity': '.75' }));
      var tl = el('text', { x: W - padR, y: ty - 7, class: 'axis-label', 'text-anchor': 'end', style: 'fill:' + tc + ';font-weight:700' });
      tl.textContent = '目标 ' + opts.target + (opts.unit || '');
      svg.appendChild(tl);
    }
    // 面积路径
    if (values.length > 1) {
      var area = 'M' + x(0) + ' ' + y(values[0]);
      for (var i = 1; i < values.length; i++) area += ' L' + x(i) + ' ' + y(values[i]);
      area += ' L' + x(values.length - 1) + ' ' + (padT + plotH) + ' L' + x(0) + ' ' + (padT + plotH) + ' Z';
      svg.appendChild(el('path', { d: area, fill: 'url(#areaGrad)', stroke: 'none' }));
    }
    // 折线
    var line = 'M' + x(0) + ' ' + y(values[0]);
    for (var j = 1; j < values.length; j++) line += ' L' + x(j) + ' ' + y(values[j]);
    svg.appendChild(el('path', { d: line, fill: 'none', stroke: opts.color || '#2563eb', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // 数据点 + 提示
    for (var p = 0; p < values.length; p++) {
      var cx = x(p), cy = y(values[p]);
      var dot = el('circle', { cx: cx, cy: cy, r: 4.5, fill: '#fff', stroke: opts.color || '#2563eb', 'stroke-width': '2.5' });
      var tip = el('title', {});
      tip.textContent = labels[p] + '：' + values[p] + (opts.unit || '');
      dot.appendChild(tip);
      svg.appendChild(dot);
      // X 轴标签（隔点显示）
      if (labels.length <= 10 || p % Math.ceil(labels.length / 10) === 0 || p === values.length - 1) {
        var lx = el('text', { x: cx, y: H - 12, class: 'axis-label', 'text-anchor': 'middle' });
        lx.textContent = labels[p];
        svg.appendChild(lx);
      }
    }
    container.appendChild(svg);
  }

  /* ---------- 环形进度图 ---------- */
  /* opts: { value, max, color, label, unit, size, thickness } */
  function donutChart(container, opts) {
    container.innerHTML = '';
    var size = opts.size || 150;
    var thick = opts.thickness || 14;
    var r = (size - thick) / 2;
    var c = size / 2;
    var ratio = Math.min(1, (opts.max > 0 ? opts.value / opts.max : 0));
    var circ = 2 * Math.PI * r;
    donutGradSeq++;
    var svg = el('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'chart', style: 'max-width:' + size + 'px;margin:0 auto' });
    svg.appendChild(el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': thick }));
    // 渐变描边（未指定 color 时用品牌渐变）
    var strokeColor = opts.color || 'url(#donutGrad' + donutGradSeq + ')';
    if (!opts.color) {
      var defs = el('defs', {});
      var lg = el('linearGradient', { id: 'donutGrad' + donutGradSeq, x1: '0', y1: '0', x2: '1', y2: '1' });
      lg.appendChild(el('stop', { offset: '0%', 'stop-color': '#3b82f6' }));
      lg.appendChild(el('stop', { offset: '55%', 'stop-color': '#06b6d4' }));
      lg.appendChild(el('stop', { offset: '100%', 'stop-color': '#8b5cf6' }));
      defs.appendChild(lg);
      svg.appendChild(defs);
    }
    var arc = el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: strokeColor, 'stroke-width': thick, 'stroke-linecap': 'round', 'stroke-dasharray': circ, 'stroke-dashoffset': circ * (1 - ratio), transform: 'rotate(-90 ' + c + ' ' + c + ')', style: 'transition: stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' });
    svg.appendChild(arc);
    var isEmpty = !opts.value || opts.value <= 0;
    var txt = el('text', { x: c, y: c - 2, 'text-anchor': 'middle', style: 'font-size:' + (size * (isEmpty ? 0.19 : 0.24)) + 'px;font-weight:' + (isEmpty ? 600 : 800) + ';fill:' + (isEmpty ? 'var(--muted)' : 'var(--text)') });
    txt.textContent = (opts.decimals ? Number(opts.value).toFixed(opts.decimals) : Math.round(opts.value)) + (opts.unit || '');
    var sub = el('text', { x: c, y: c + size * 0.14, 'text-anchor': 'middle', style: 'font-size:' + (size * 0.09) + 'px;fill:var(--muted);font-weight:600' });
    sub.textContent = opts.label || '';
    svg.appendChild(txt);
    svg.appendChild(sub);
    container.appendChild(svg);
  }

  /* ---------- 日历热力图 ---------- */
  /* data: { '2026-08-14': 3 } 级别 0-4 */
  function calendarHeatmap(container, year, month, data, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var days = window.YDJK.monthDates(year, month);
    var first = new Date(year, month - 1, 1).getDay(); // 0=Sun
    var wrap = document.createElement('div');
    wrap.className = 'cal-grid';
    var dows = ['日', '一', '二', '三', '四', '五', '六'];
    dows.forEach(function (d) {
      var h = document.createElement('div');
      h.className = 'cal-dow';
      h.textContent = d;
      wrap.appendChild(h);
    });
    for (var i = 0; i < first; i++) {
      var blank = document.createElement('div');
      blank.style.aspectRatio = '1';
      wrap.appendChild(blank);
    }
    var todayStr = window.YDJK.today();
    days.forEach(function (ds) {
      var cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.setAttribute('data-date', ds);
      var dayNum = Number(ds.slice(8));
      var lv = data[ds] || 0;
      cell.classList.add('lv' + lv);
      if (ds === todayStr) cell.classList.add('today');
      if (ds > todayStr) cell.classList.add('future');
      if (ds === (opts.selected || '')) cell.classList.add('selected');
      var dEl = document.createElement('span');
      dEl.className = 'd';
      dEl.textContent = dayNum;
      cell.appendChild(dEl);
      cell.title = ds + '：' + (lv > 0 ? '已训练（' + lv + ' 项）' : '未训练');
      wrap.appendChild(cell);
    });
    container.appendChild(wrap);
  }

  window.YDJK_CHARTS = {
    lineChart: lineChart,
    donutChart: donutChart,
    calendarHeatmap: calendarHeatmap
  };
})();