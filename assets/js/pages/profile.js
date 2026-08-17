/* 个人资料页逻辑 */
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
    document.getElementById('pEmail').textContent = user.email || '-';
    var created = user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-';
    var last = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '-';
    document.getElementById('pCreated').textContent = created;
    document.getElementById('pLastSignIn').textContent = last;
    // 加载资料（昵称/头像）
    loadUserProfile();
  }

  /* 默认头像：邮箱首字母 */
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
      if (p) {
        if (p.nickname) document.getElementById('nicknameInput').value = p.nickname;
        renderAvatar(p.avatar_url, cloud.currentUser().email);
      } else {
        renderAvatar(null, cloud.currentUser().email);
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!cloud || !cloud.isLoggedIn()) {
      document.getElementById('profileGate').style.display = 'block';
      document.getElementById('profilePanel').style.display = 'none';
      return;
    }
    document.getElementById('profileGate').style.display = 'none';
    document.getElementById('profilePanel').style.display = 'block';
    renderUser();

    // 头像上传（转 Base64 存数据库）
    var avatarInput = document.getElementById('avatarInput');
    document.getElementById('btnUploadAvatar').addEventListener('click', function () { avatarInput.click(); });
    avatarInput.addEventListener('change', function () {
      var file = avatarInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { window.YDJK_UI.toast('图片不能超过 2MB', 'err'); return; }
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { window.YDJK_UI.toast('请上传图片文件', 'err'); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        renderAvatar(dataUrl, cloud.currentUser().email);
        // 保存头像
        cloud.saveProfile({ avatar_url: dataUrl }).then(function (r) {
          if (r.ok) window.YDJK_UI.toast('✅ 头像已更新');
          else window.YDJK_UI.toast('❌ 头像保存失败', 'err');
        });
      };
      reader.readAsDataURL(file);
      avatarInput.value = '';
    });

    // 保存昵称
    document.getElementById('btnSaveProfile').addEventListener('click', async function () {
      var nick = document.getElementById('nicknameInput').value.trim();
      if (!nick) { window.YDJK_UI.toast('请输入昵称', 'err'); return; }
      var r = await cloud.saveProfile({ nickname: nick });
      if (r.ok) {
        window.YDJK_UI.toast('✅ 昵称已更新');
        localStorage.setItem('ydjk:nickname', nick);
      } else {
        window.YDJK_UI.toast('❌ 保存失败', 'err');
      }
    });

    // 提醒设置
    var cfg = window.YDJK_UI.getReminderCfg();
    document.getElementById('rmEnable').checked = cfg.enabled;
    document.getElementById('rmWater').checked = cfg.water !== false;
    document.getElementById('rmCheckin').checked = cfg.checkin !== false;
    document.getElementById('rmMeal').checked = !!cfg.meal;
    function saveCfg() {
      window.YDJK_UI.setReminderCfg({
        enabled: document.getElementById('rmEnable').checked,
        water: document.getElementById('rmWater').checked,
        checkin: document.getElementById('rmCheckin').checked,
        meal: document.getElementById('rmMeal').checked
      });
    }
    ['rmEnable', 'rmWater', 'rmCheckin', 'rmMeal'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', saveCfg);
    });
    document.getElementById('btnEnableNotif').addEventListener('click', function () {
      window.YDJK_UI.requestNotifPermission();
    });

    // 修改密码
    document.getElementById('changePw').addEventListener('click', async function () {
      var p1 = document.getElementById('np1').value;
      var p2 = document.getElementById('np2').value;
      if (!p1 || p1.length < 6) { window.YDJK_UI.toast('密码至少 6 位', 'err'); return; }
      if (p1 !== p2) { window.YDJK_UI.toast('两次密码不一致', 'err'); return; }
      var r = await api('/auth/v1/user', { method: 'PUT', body: { password: p1 } });
      if (r.ok) {
        window.YDJK_UI.toast('✅ 密码已更新');
        document.getElementById('np1').value = '';
        document.getElementById('np2').value = '';
      } else {
        window.YDJK_UI.toast('❌ 修改失败：' + ((r.data && r.data.msg) || '请重试'), 'err');
      }
    });

    // 立即同步
    document.getElementById('btnSyncNow').addEventListener('click', async function () {
      var st = document.getElementById('syncStatus');
      st.textContent = '同步中…';
      var ok = await window.YDJK.cloudPull();
      window.YDJK.cloudSave();
      st.textContent = ok ? '✅ 已从云端拉取最新数据' : '✅ 已推送本地数据到云端';
    });

    // 退出登录
    document.getElementById('btnLogout').addEventListener('click', function () {
      window.YDJK_UI.confirmDialog({ title: '退出登录？', message: '本地数据会保留，下次登录自动同步。', okText: '退出', danger: true, icon: '👋' }).then(function (ok) {
        if (!ok) return;
        cloud.logout();
        localStorage.removeItem('ydjk:cloud-logged');
        window.YDJK_UI.toast('已退出登录');
        setTimeout(function () { location.href = 'index.html'; }, 600);
      });
    });
  });
})();
