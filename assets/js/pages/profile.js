/* 我的页逻辑（本地化：个人形象 + 数据备份，无账号体系） */
(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function setStatus(msg, ok) {
    var el = document.getElementById('backupStatus');
    if (el) { el.textContent = msg || ''; el.style.color = ok ? 'var(--primary)' : 'var(--danger)'; }
  }

  /* 本地头像/昵称 */
  function renderLocal() {
    var box = document.getElementById('avatarPreview');
    var nick = document.getElementById('nicknameInput');
    try {
      var avatar = localStorage.getItem('ydjk:avatar') || '';
      if (avatar && box) box.innerHTML = '<img src="' + esc(avatar) + '" style="width:100%;height:100%;object-fit:cover">';
      else if (box) box.textContent = '悦';
      if (nick) nick.value = localStorage.getItem('ydjk:nickname') || '';
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    var panel = document.getElementById('profilePanel');
    if (panel) panel.style.display = 'block';
    renderLocal();

    /* 头像上传（本地 base64 存储） */
    var avatarInput = document.getElementById('avatarInput');
    var uploadBtn = document.getElementById('btnUploadAvatar');
    if (avatarInput && uploadBtn) {
      uploadBtn.addEventListener('click', function () { avatarInput.click(); });
      avatarInput.addEventListener('change', function () {
        var file = avatarInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { window.YDJK_UI.toast('图片不能超过 2MB', 'err'); return; }
        if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { window.YDJK_UI.toast('仅支持 JPG/PNG/WebP', 'err'); return; }
        var reader = new FileReader();
        reader.onload = function () {
          try { localStorage.setItem('ydjk:avatar', reader.result); } catch (e) { window.YDJK_UI.toast('图片过大，存储失败', 'err'); return; }
          renderLocal();
          window.YDJK_UI.toast('✅ 头像已更新（仅存本机）');
        };
        reader.readAsDataURL(file);
        avatarInput.value = '';
      });
    }

    /* 保存昵称（本地） */
    var saveBtn = document.getElementById('btnSaveProfile');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var nick = document.getElementById('nicknameInput');
      try { localStorage.setItem('ydjk:nickname', (nick && nick.value.trim()) || ''); } catch (e) {}
      window.YDJK_UI.toast('✅ 资料已保存（仅存本机）');
    });

    /* 导出备份（JSON 文件） */
    var exportBtn = document.getElementById('btnExportData');
    if (exportBtn) exportBtn.addEventListener('click', function () {
      var data = window.YDJK ? window.YDJK.collectAllData() : {};
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '悦动健康备份-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
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
      if (data.weights && Y && Y.removeWeight) { data.weights.forEach(function (w) { Y.addWeight(w.date, w.weight); }); }
      if (data.checkins && Y && Y.setCheckin) {
        Object.keys(data.checkins).forEach(function (d) { Y.setCheckin(d, data.checkins[d]); });
      }
      if (data.workouts && Y && Y.addWorkout) {
        Object.keys(data.workouts).forEach(function (d) {
          (data.workouts[d] || []).forEach(function (w) { Y.addWorkout(d, w); });
        });
      }
      if (data.mealsAll && Y && Y.addMeal) {
        Object.keys(data.mealsAll).forEach(function (d) {
          (data.mealsAll[d] || []).forEach(function (m) { Y.addMeal(d, m); });
        });
      }
      if (data.favs) { try { localStorage.setItem('ydjk:favs', JSON.stringify(data.favs)); } catch (e) {} }
      if (typeof window.onDataChanged === 'function') {
        try { window.onDataChanged(); } catch (e) {}
      }
    } catch (e) {
      setStatus('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
      return;
    }
  }
})();