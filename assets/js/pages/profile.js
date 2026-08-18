/* 我的页逻辑（精简版：个人资料 + 云数据 + 退出） */
(function () {
  'use strict';
  var cloud = window.YD_CLOUD;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  async function api(path, opts) {
    var session = cloud.getSession();
    var headers = { apikey: cloud.anonKey, 'Content-Type': 'application/json' };
    if (session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    if (opts && opts.headers) Object.assign(headers, opts.headers);
    var res = await fetch(cloud.url + path, { method: (opts && opts.method) || 'GET', headers: headers, body: opts && opts.body ? JSON.stringify(opts.body) : undefined });
    var text = await res.text();
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
  }

  function renderUser() {
    var user = cloud.currentUser();
    if (!user) return;
    var e = document.getElementById('pEmail');
    if (e) e.textContent = user.email || '-';
    var created = user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-';
    var last = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '-';
    var ce = document.getElementById('pCreated');
    if (ce) ce.textContent = created;
    var le = document.getElementById('pLastSignIn');
    if (le) le.textContent = last;
    loadUserProfile();
  }

  function defaultAvatar(email) {
    return (email || '?').charAt(0).toUpperCase();
  }
  function renderAvatar(avatarUrl, email) {
    var box = document.getElementById('avatarPreview');
    if (!box) return;
    if (avatarUrl) {
      box.innerHTML = '<img src="' + esc(avatarUrl) + '" style="width:100%;height:100%;object-fit:cover">';
    } else {
      box.textContent = defaultAvatar(email);
    }
  }

  async function loadUserProfile() {
    try {
      var p = await cloud.loadProfile();
      var nick = document.getElementById('nicknameInput');
      if (nick) nick.value = (p && p.nickname) || '';
      renderAvatar(p && p.avatar_url, cloud.currentUser().email);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!cloud || !cloud.isLoggedIn()) {
      var g = document.getElementById('profileGate');
      var panel = document.getElementById('profilePanel');
      if (g) g.style.display = 'block';
      if (panel) panel.style.display = 'none';
      return;
    }
    var g = document.getElementById('profileGate');
    var panel = document.getElementById('profilePanel');
    if (g) g.style.display = 'none';
    if (panel) panel.style.display = 'block';
    renderUser();

    // 头像上传
    var avatarInput = document.getElementById('avatarInput');
    var uploadBtn = document.getElementById('btnUploadAvatar');
    if (avatarInput && uploadBtn) {
      uploadBtn.addEventListener('click', function () { avatarInput.click(); });
      avatarInput.addEventListener('change', function () {
        var file = avatarInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { window.YDJK_UI.toast('图片不能超过 2MB', 'err'); return; }
        if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { window.YDJK_UI.toast('请上传图片文件', 'err'); return; }
        var reader = new FileReader();
        reader.onload = function () {
          var dataUrl = reader.result;
          renderAvatar(dataUrl, cloud.currentUser().email);
          cloud.saveProfile({ avatar_url: dataUrl }).then(function (r) {
            if (r.ok) window.YDJK_UI.toast('✅ 头像已更新');
            else window.YDJK_UI.toast('❌ 头像保存失败', 'err');
          });
        };
        reader.readAsDataURL(file);
        avatarInput.value = '';
      });
    }

    // 保存昵称
    var saveBtn = document.getElementById('btnSaveProfile');
    if (saveBtn) saveBtn.addEventListener('click', async function () {
      var nick = document.getElementById('nicknameInput').value.trim();
      if (!nick) { window.YDJK_UI.toast('请输入昵称', 'err'); return; }
      var r = await cloud.saveProfile({ nickname: nick });
      if (r.ok) {
        window.YDJK_UI.toast('✅ 昵称已更新');
        try { localStorage.setItem('ydjk:nickname', nick); } catch (e) {}
      } else {
        window.YDJK_UI.toast('❌ 保存失败', 'err');
      }
    });

    // 立即同步
    var syncBtn = document.getElementById('btnSyncNow');
    if (syncBtn) syncBtn.addEventListener('click', async function () {
      var st = document.getElementById('syncStatus');
      if (st) st.textContent = '同步中…';
      var ok = await window.YDJK.cloudPull();
      window.YDJK.cloudSave();
      if (st) st.textContent = ok ? '✅ 已从云端拉取最新数据' : '✅ 已推送本地数据到云端';
    });

    // 导出数据
    var expBtn = document.getElementById('btnExportData');
    if (expBtn) expBtn.addEventListener('click', function () {
      var all = window.YDJK.collectAllData ? window.YDJK.collectAllData() : null;
      var data = {
        exportedAt: new Date().toISOString(),
        app: '悦动健康',
        data: all || {}
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '悦动健康-数据备份-' + window.YDJK.today() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      window.YDJK_UI.toast('📤 数据已导出');
    });

    // 退出登录
    var logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) logoutBtn.addEventListener('click', function () {
      window.YDJK_UI.confirmDialog({ title: '退出登录？', message: '本地数据会保留，下次登录自动同步。', okText: '退出', danger: true, icon: (window.YDJK_ICON ? window.YDJK_ICON('logout') : '👋') }).then(function (ok) {
        if (!ok) return;
        cloud.logout();
        try { localStorage.removeItem('ydjk:cloud-logged'); } catch (e) {}
        window.YDJK_UI.toast('已退出登录');
        setTimeout(function () { location.href = 'index.html'; }, 600);
      });
    });
  });
})();