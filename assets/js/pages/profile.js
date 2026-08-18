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

    // 健康目标加载与保存
    var gwInp = document.getElementById('goalWeightInput');
    var gwaInp = document.getElementById('goalWaterInput');
    if (gwInp && gwaInp) {
      gwInp.value = YDJK.getWeightGoal() || '';
      gwaInp.value = YDJK.getWaterGoal() || 2000;
      document.getElementById('btnSaveGoals').addEventListener('click', function () {
        var w = Number(gwInp.value);
        var wt = Number(gwaInp.value);
        if (w > 0 && (w < 30 || w > 300)) { window.YDJK_UI.toast('目标体重请在 30-300 kg 之间', 'err'); return; }
        if (wt < 500 || wt > 6000) { window.YDJK_UI.toast('饮水目标请在 500-6000 ml 之间', 'err'); return; }
        if (w > 0) YDJK.setWeightGoal(w);
        YDJK.setWaterGoal(wt);
        var st = document.getElementById('goalStatus');
        st.textContent = '✅ 已保存：目标体重 ' + (w || '未设') + ' kg · 饮水 ' + wt + ' ml';
        setTimeout(function () { st.textContent = ''; }, 3000);
        window.YDJK_UI.toast('✅ 目标已更新');
      });
    }

    // 提醒时段加载与保存
    var wsInp = document.getElementById('rmWaterStart');
    var weInp = document.getElementById('rmWaterEnd');
    var wiInp = document.getElementById('rmWaterInterval');
    var chInp = document.getElementById('rmCheckinHour');
    if (wsInp) {
      var rc = window.YDJK_UI.getReminderCfg();
      wsInp.value = rc.waterStart != null ? rc.waterStart : 9;
      weInp.value = rc.waterEnd != null ? rc.waterEnd : 21;
      wiInp.value = rc.waterInterval || 2;
      chInp.value = rc.checkinHour != null ? rc.checkinHour : 20;
      document.getElementById('btnSaveTimes').addEventListener('click', function () {
        var s = Number(wsInp.value), e = Number(weInp.value);
        if (s < 0 || s > 23 || e < 0 || e > 23) { window.YDJK_UI.toast('时段请输入 0-23 小时', 'err'); return; }
        if (e <= s) { window.YDJK_UI.toast('结束时间需晚于开始时间', 'err'); return; }
        var c = Number(chInp.value);
        if (c < 0 || c > 23) { window.YDJK_UI.toast('打卡时间请输入 0-23 小时', 'err'); return; }
        window.YDJK_UI.setReminderCfg({
          enabled: document.getElementById('rmEnable').checked,
          water: document.getElementById('rmWater').checked,
          checkin: document.getElementById('rmCheckin').checked,
          meal: document.getElementById('rmMeal').checked,
          waterStart: s, waterEnd: e,
          waterInterval: Number(wiInp.value) || 2,
          checkinHour: c
        });
        window.YDJK_UI.toast('✅ 提醒时段已更新');
      });
    }

    // 主题选择
    var themeSel = document.getElementById('themeSelect');
    if (themeSel) {
      var curTheme = localStorage.getItem('ydjk:theme') || 'auto';
      themeSel.value = curTheme === 'dark' || curTheme === 'light' ? curTheme : 'auto';
      themeSel.addEventListener('change', function () {
        var v = themeSel.value;
        if (v === 'auto') {
          localStorage.removeItem('ydjk:theme');
          var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
          window.YDJK.setTheme(prefersDark ? 'dark' : 'light');
        } else {
          localStorage.setItem('ydjk:theme', v);
          document.documentElement.setAttribute('data-theme', v);
          window.YDJK.setTheme(v);
        }
        window.YDJK_UI.toast('✅ 主题已切换');
      });
    }

    // 导出数据（JSON 下载）
    document.getElementById('btnExportData').addEventListener('click', function () {
      var all = YDJK.collectAllData ? YDJK.collectAllData() : null;
      var data = {
        exportedAt: new Date().toISOString(),
        app: '悦动健康',
        version: 'v55',
        data: all || {
          profile: YDJK.getProfile(),
          weights: YDJK.getWeights(),
          checkins: YDJK.getCheckins(),
          myPlans: YDJK.getMyPlans(),
          userArticles: YDJK.getUserArticles(),
          weightGoal: YDJK.getWeightGoal(),
          waterGoal: YDJK.getWaterGoal()
        }
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '悦动健康-数据备份-' + YDJK.today() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      window.YDJK_UI.toast('📤 数据已导出');
    });

    // 同步状态显示
    var lastSync = localStorage.getItem('ydjk:last-sync');
    var syncSt = document.getElementById('syncStatus');
    if (syncSt && lastSync) syncSt.textContent = '上次同步：' + new Date(Number(lastSync)).toLocaleString('zh-CN');

    // 立即同步
    document.getElementById('btnSyncNow').addEventListener('click', async function () {
      var st = document.getElementById('syncStatus');
      st.textContent = '同步中…';
      var ok = await window.YDJK.cloudPull();
      window.YDJK.cloudSave();
      localStorage.setItem('ydjk:last-sync', String(Date.now()));
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