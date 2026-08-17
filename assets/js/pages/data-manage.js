/* 关于页：数据备份 / 恢复 / 清空（v2 使用自定义确认框） */
(function () {
  'use strict';
  var YDJK = window.YDJK;
  var PREFIX = 'ydjk:';

  function countRecords() {
    var n = 0;
    for (var i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).indexOf(PREFIX) === 0) n++;
    }
    return n;
  }
  function refreshCount() {
    var el = document.getElementById('dataCount');
    if (el) el.textContent = countRecords();
  }

  document.addEventListener('DOMContentLoaded', function () {
    refreshCount();

    document.getElementById('btnExport').addEventListener('click', function () {
      var pack = { app: 'yuedong-health', version: 1, exportedAt: new Date().toISOString(), data: {} };
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(PREFIX) === 0) pack.data[k] = localStorage.getItem(k);
      }
      var blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var d = new Date();
      var name = 'yuedong-backup-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      var n = Object.keys(pack.data).length;
      YDJK_UI.toast(n ? '✅ 已导出 ' + n + ' 条记录，请妥善保存文件' : '⚠️ 暂无数据可导出', n ? 'ok' : 'err');
    });

    var fileInput = document.getElementById('importFile');
    document.getElementById('btnImport').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var pack = JSON.parse(reader.result);
          if (!pack || pack.app !== 'yuedong-health' || !pack.data) throw new Error('bad format');
          var n = 0;
          Object.keys(pack.data).forEach(function (k) {
            if (k.indexOf(PREFIX) === 0) { localStorage.setItem(k, pack.data[k]); n++; }
          });
          fileInput.value = '';
          refreshCount();
          YDJK_UI.toast('✅ 已导入 ' + n + ' 条记录');
          if (window.onProfileSaved) window.onProfileSaved();
        } catch (e) {
          YDJK_UI.toast('❌ 备份文件格式不正确', 'err');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('btnClear').addEventListener('click', function () {
      var n = countRecords();
      if (!n) { YDJK_UI.toast('当前没有数据可清空', 'err'); return; }
      YDJK_UI.confirmDialog({
        title: '清空全部数据？',
        message: '将删除全部 ' + n + ' 条本地记录，此操作不可恢复。建议先导出备份。',
        okText: '清空数据', cancelText: '再想想', danger: true, icon: '🗑️'
      }).then(function (ok) {
        if (!ok) return;
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k.indexOf(PREFIX) === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
        refreshCount();
        YDJK_UI.toast('🗑️ 已清空全部数据');
        setTimeout(function () { location.reload(); }, 600);
      });
    });
  });
})();
