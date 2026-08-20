/* 我的页逻辑（设置：健康档案 + 主题 + 数据备份，纯本地） */
(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function setStatus(msg, ok) {
    var el = document.getElementById('backupStatus');
    if (el) { el.textContent = msg || ''; el.style.color = ok ? 'var(--primary)' : 'var(--danger)'; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var panel = document.getElementById('profilePanel');
    if (panel) panel.style.display = 'block';

    /* 健康档案编辑（复用建档弹窗） */
    var editBtn = document.getElementById('btnEditProfile');
    if (editBtn) editBtn.addEventListener('click', function () {
      if (window.YDJK_UI && window.YDJK_UI.openProfileEditor) window.YDJK_UI.openProfileEditor();
      else window.YDJK_UI.toast('请先返回首页建立健康档案', 'err');
    });

    /* 主题切换（浅色/深色） */
    var themeBtn = document.getElementById('btnThemeToggle');
    var themeState = document.getElementById('themeState');
    function refreshThemeState() {
      var cur = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? '深色' : '浅色';
      if (themeState) themeState.textContent = cur;
    }
    if (themeBtn) themeBtn.addEventListener('click', function () {
      var cur = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', cur);
      try { localStorage.setItem('ydjk:theme', cur); } catch (e) {}
      refreshThemeState();
    });
    refreshThemeState();

      /* 自动备份提醒 */
      if (window.YDJK && window.YDJK.shouldRemindBackup && window.YDJK.shouldRemindBackup()) {
        window.YDJK_UI.toast('💾 距离上次备份已超过 14 天，建议导出备份保护数据', 'warn');
      }


    /* 导出备份（JSON 文件） */
    var exportBtn = document.getElementById('btnExportData');
    if (exportBtn) exportBtn.addEventListener('click', function () {
      var data = window.YDJK ? window.YDJK.collectAllData() : {};
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '悦动健康备份-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
        if (window.YDJK && window.YDJK.markBackupDone) window.YDJK.markBackupDone();

      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 300);
      window.YDJK_UI.toast('📤 备份文件已导出');
    });

    /* 导入备份 */
    var importInput = document.getElementById('importInput');
    var importBtn = document.getElementById('btnImportData');
    if (importInput && importBtn) {
      importBtn.addEventListener('click', function () { importInput.click(); });
      importInput.addEventListener('change', function () {
        var file = importInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(reader.result);
            if (!data || typeof data !== 'object') throw new Error('bad');
            importData(data);
            setStatus('✅ 导入完成，记录已恢复');
          } catch (e) {
            setStatus('❌ 备份文件格式不正确，请选择本 App 导出的 JSON');
          }
        };
        reader.readAsText(file);
        importInput.value = '';
      });
    }
  });

  /* 把备份数据合并写入本地存储 */
  function importData(data) {
    var Y = window.YDJK;
    try {
      if (data.profile && Y && Y.saveProfile) Y.saveProfile(data.profile);
      if (data.checkins && Y && Y.setCheckin) {
        Object.keys(data.checkins).forEach(function (d) { Y.setCheckin(d, data.checkins[d]); });
      }
      // 覆盖式写入（先清后写），避免导入后记录重复
      if (data.workouts) {
        Object.keys(data.workouts).forEach(function (d) {
          try { localStorage.setItem('ydjk:workouts:' + d, JSON.stringify(data.workouts[d] || [])); } catch (e) {}
        });
      }
      if (data.mealsAll) {
        Object.keys(data.mealsAll).forEach(function (d) {
          try { localStorage.setItem('ydjk:meals:' + d, JSON.stringify(data.mealsAll[d] || [])); } catch (e) {}
        });
      }
      if (data.weights) { try { localStorage.setItem('ydjk:weights', JSON.stringify(data.weights)); } catch (e) {} }
      if (data.achievements) { try { localStorage.setItem('ydjk:achievements', JSON.stringify(data.achievements)); } catch (e) {} }
      if (data.favs) { try { localStorage.setItem('ydjk:favs', JSON.stringify(data.favs)); } catch (e) {} }
      if (data.mealTemplates && Y && Y.saveMealTemplate) {
        (data.mealTemplates || []).forEach(function (t) { Y.saveMealTemplate(t); });
      }
      if (typeof window.onDataChanged === 'function') {
        try { window.onDataChanged(); } catch (e) {}
      }
    } catch (e) {
      setStatus('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
      return;
    }
  }
})();