/* ============================================================
   悦动健康 · 图标库 icons.js
   独立设计的线性 SVG 图标集（贴合健康主题，可着色/动画）
   用法：<i class="ic" data-icon="home"></i>，页面加载时自动替换为 SVG
   ============================================================ */
(function () {
  'use strict';
  var A = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"';

  var ICONS = {
    /* 底部导航 */
    home: '<svg viewBox="0 0 24 24" ' + A + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    food: '<svg viewBox="0 0 24 24" ' + A + '><path d="M3 12.5h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9z"/><path d="M8.5 3v4M12 2.5v5M15.5 3v4"/></svg>',
    workout: '<svg viewBox="0 0 24 24" ' + A + '><path d="M6.2 8.5v7M17.8 8.5v7M3 10.5v3M21 10.5v3M6.2 12h11.6"/></svg>',
    user: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="12" cy="8" r="4"/><path d="M4 21c0-3.8 3.6-6.2 8-6.2s8 2.4 8 6.2"/></svg>',

    /* 通用 UI */
    search: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    sort: '<svg viewBox="0 0 24 24" ' + A + '><path d="M4 6.5h9M4 12h6M4 17.5h3"/><path d="m15 8.5 4-4 4 4M19 4.5v12"/></svg>',
    moon: '<svg viewBox="0 0 24 24" ' + A + '><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" ' + A + '><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
    plus: '<svg viewBox="0 0 24 24" ' + A + '><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" ' + A + '><path d="m5 12.5 5 5L20 7"/></svg>',
    'check-circle': '<svg viewBox="0 0 24 24" ' + A + '><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>',
    close: '<svg viewBox="0 0 24 24" ' + A + '><path d="M6 6l12 12M18 6 6 18"/></svg>',
    'arrow-right': '<svg viewBox="0 0 24 24" ' + A + '><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" ' + A + '><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    alert: '<svg viewBox="0 0 24 24" ' + A + '><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.8v.2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" ' + A + '><path d="M4 7h16M9 7V4h6v3"/><path d="M6.5 7l1 13h9l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24" ' + A + '><path d="M17 3.5a2.8 2.8 0 1 1 4 4L7.5 21 2 22.5 3.5 17z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" ' + A + '><path d="M4 8.5h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
    photo: '<svg viewBox="0 0 24 24" ' + A + '><rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15.5-5-5L5 21.5"/></svg>',
    save: '<svg viewBox="0 0 24 24" ' + A + '><path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
    mail: '<svg viewBox="0 0 24 24" ' + A + '><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7.5 9 6 9-6"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" ' + A + '><path d="M7.5 18a4.5 4.5 0 0 1-.4-8.98 6 6 0 0 1 11.6 1.3A3.7 3.7 0 0 1 17.8 18z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" ' + A + '><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 3.5v5h-5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" ' + A + '><path d="M12 15V4m0 0 4 4m-4-4-4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
    logout: '<svg viewBox="0 0 24 24" ' + A + '><path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
    lock: '<svg viewBox="0 0 24 24" ' + A + '><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" ' + A + '><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" ' + A + '><path d="M3 7.5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',

    /* 健康主题 */
    flame: '<svg viewBox="0 0 24 24" ' + A + '><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    run: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="13.5" cy="4.5" r="2"/><path d="M10.5 9.5 13 12l2.2 3.8M15.2 12l3.3-1.6"/><path d="m11 21 2-4.2 2.5 1"/></svg>',
    stats: '<svg viewBox="0 0 24 24" ' + A + '><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    tip: '<svg viewBox="0 0 24 24" ' + A + '><path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.4 10.9c.8.5 1.6 1.2 1.7 2.1h3.4c.1-.9.9-1.6 1.7-2.1A6 6 0 0 0 12 3z"/></svg>',
    meal: '<svg viewBox="0 0 24 24" ' + A + '><path d="M5 21c0-8.5 5-15 14-15 0 8.5-5 15-14 15z"/><path d="M5 21c2-5.5 5.5-9.5 10.5-12.5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" ' + A + '><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" ' + A + '><path d="M6.5 8.5v7M17.5 8.5v7M3.5 10.5v3M20.5 10.5v3M6.5 12h11"/></svg>',
    target: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
    heart: '<svg viewBox="0 0 24 24" ' + A + '><path d="M12 21s-7.5-4.5-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3C21 5 23 8.5 21 12c-2 4.5-9.5 9-9.5 9z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" ' + A + '><path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5"/><path d="M10 21h4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    sun: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" ' + A + '><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    grid: '<svg viewBox="0 0 24 24" ' + A + '><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" ' + A + '><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0M9 9h6M9 13h6M9 17h3"/></svg>',
    info: '<svg viewBox="0 0 24 24" ' + A + '><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.5"/></svg>',
    wave: '<svg viewBox="0 0 24 24" ' + A + '><path d="M5 11.5a2 2 0 0 1 4 0V7a1.8 1.8 0 0 1 3.6 0v4M12.6 11v-2.5a1.8 1.8 0 0 1 3.6 0V13M16.2 13v-1a1.8 1.8 0 0 1 3.6 0v4a5 5 0 0 1-5 5h-2.6c-1.5 0-2.9-.6-4-1.6L5 16.4"/></svg>'
  };

  window.YDJK_ICONS = ICONS;
  window.YDJK_ICON = function (name) { return ICONS[name] || ''; };

  // 同步替换页面中所有 [data-icon] 占位为 SVG（脚本位于 body 尾部，DOM 已可用）
  document.querySelectorAll('[data-icon]').forEach(function (el) {
    var name = el.getAttribute('data-icon');
    if (ICONS[name]) {
      el.innerHTML = ICONS[name];
      el.removeAttribute('data-icon');
      el.setAttribute('aria-hidden', 'true');
    }
  });
})();