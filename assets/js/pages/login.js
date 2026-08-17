/* 登录/注册页逻辑 */
(function () {
  'use strict';
  var YDJK = window.YDJK;

  var mode = 'login'; // login | register

  function setMsg(text, ok) {
    var el = document.getElementById('authMsg');
    if (el) { el.textContent = text || ''; el.style.color = ok ? 'var(--primary)' : 'var(--danger)'; }
  }
  function switchMode() {
    mode = mode === 'login' ? 'register' : 'login';
    document.getElementById('authTitle').textContent = mode === 'login' ? '欢迎回来' : '创建账号';
    document.getElementById('authSub').textContent = mode === 'login' ? '登录后，你的健康数据将云端同步，多设备随时查看' : '注册只需 30 秒，你的数据将安全存储在云端';
    document.getElementById('authSubmit').textContent = mode === 'login' ? '登 录' : '注 册';
    document.getElementById('authToggle').textContent = mode === 'login' ? '立即注册 →' : '← 返回登录';
    document.getElementById('authPassword').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    setMsg('');
  }

  /* 登录成功后：把本地数据合并到云端 */
  async function afterLogin(user) {
    setMsg('✅ 登录成功，正在同步数据…');
    try {
      // 收集本地数据（档案/体重/打卡/饮食/计划/文章）
      var cloudDoc = await window.YD_CLOUD.loadUserData();
      var local = {
        profile: YDJK.getProfile() || null,
        weights: YDJK.getWeights() || [],
        checkins: YDJK.getCheckins() || {},
        favs: (function(){ try { return JSON.parse(localStorage.getItem('ydjk:favs') || '[]'); } catch(e){ return []; } })(),
        mealsAll: (function(){
          var m = {};
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k.indexOf('ydjk:meals:') === 0) m[k.replace('ydjk:meals:','')] = JSON.parse(localStorage.getItem(k) || '[]');
          }
          return m;
        })(),
        waterAll: (function(){
          var w = {};
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k.indexOf('ydjk:water:') === 0) w[k.replace('ydjk:water:','')] = Number(localStorage.getItem(k)) || 0;
          }
          return w;
        })(),
        myPlans: YDJK.getMyPlans() || [],
        userArticles: YDJK.getUserArticles() || [],
        weightGoal: YDJK.getWeightGoal() || 0,
        waterGoal: YDJK.getWaterGoal() || 2000
      };
      // 云端已有数据则合并（云端优先，避免覆盖）
      if (cloudDoc && cloudDoc.data_json) {
        var cloudData = JSON.parse(cloudDoc.data_json);
        local = mergeCloud(cloudData, local);
      }
      // 上传合并后数据
      var payload = { data_json: JSON.stringify(local), updated_at: new Date().toISOString() };
      var r = await window.YD_CLOUD.saveUserData(payload);
      if (r.ok) setMsg('✅ 数据已同步到云端');
      else setMsg('⚠️ 登录成功，但数据同步失败，稍后自动重试', true);
      // 标记已登录
      localStorage.setItem('ydjk:cloud-logged', '1');
      // 未建档 → 引导建档；已建档 → 追踪页
      var hasProfile = YDJK.getProfile();
      setTimeout(function () { location.href = hasProfile ? 'tracker.html' : 'index.html?setup=1'; }, 900);
    } catch (e) {
      setMsg('⚠️ 登录成功，数据同步异常：' + e.message);
      localStorage.setItem('ydjk:cloud-logged', '1');
      setTimeout(function () { location.href = 'tracker.html'; }, 1200);
    }
  }

  /* 云端与本地合并（简单策略：以数据多的为准，按字段合并） */
  function mergeCloud(cloud, local) {
    var merged = local;
    if (cloud.profile && !local.profile) merged.profile = cloud.profile;
    if (cloud.weights && cloud.weights.length >= (local.weights || []).length) merged.weights = cloud.weights;
    if (cloud.checkins) {
      var c = Object.assign({}, cloud.checkins, local.checkins || {});
      merged.checkins = c;
    }
    if (cloud.favs && cloud.favs.length) merged.favs = cloud.favs;
    if (cloud.mealsAll) {
      var mm = Object.assign({}, cloud.mealsAll, local.mealsAll || {});
      merged.mealsAll = mm;
    }
    if (cloud.waterAll) {
      var ww = Object.assign({}, cloud.waterAll, local.waterAll || {});
      merged.waterAll = ww;
    }
    if (cloud.myPlans && cloud.myPlans.length) merged.myPlans = cloud.myPlans;
    if (cloud.userArticles && cloud.userArticles.length) merged.userArticles = cloud.userArticles;
    if (cloud.weightGoal) merged.weightGoal = cloud.weightGoal;
    if (cloud.waterGoal) merged.waterGoal = cloud.waterGoal;
    return merged;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 已登录则直接跳转
    if (window.YD_CLOUD && window.YD_CLOUD.isLoggedIn()) {
      location.href = 'tracker.html';
      return;
    }
    var toggle = document.getElementById('authToggle');
    if (toggle) toggle.addEventListener('click', switchMode);

    // 忘记密码（发送重置邮件）
    var forgotBtn = document.getElementById('forgotPw');
    var forgotRow = document.getElementById('forgotRow');
    if (forgotBtn) forgotBtn.addEventListener('click', async function () {
      var email = document.getElementById('authEmail').value.trim();
      if (!email) { setMsg('请输入邮箱后点击忘记密码'); return; }
      forgotBtn.disabled = true;
      forgotBtn.textContent = '发送中…';
      var cloud = window.YD_CLOUD;
      var r = await cloud.request('/auth/v1/recover', { method: 'POST', body: { email: email } });
      forgotBtn.disabled = false;
      forgotBtn.textContent = '忘记密码？';
      if (r.ok) {
        setMsg('✅ 重置邮件已发送，请查收（含垃圾箱）');
        if (forgotRow) forgotRow.innerHTML = '<span class="muted small">已发送到 ' + email + '，按邮件指引重置</span>';
      } else {
        setMsg('❌ 发送失败：' + ((r.data && r.data.msg) || '邮箱可能未注册'));
      }
    });

    var submit = document.getElementById('authSubmit');
    submit.addEventListener('click', doAuth);
    document.getElementById('authPassword').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doAuth();
    });

    async function doAuth() {
      var email = document.getElementById('authEmail').value.trim();
      var password = document.getElementById('authPassword').value;
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setMsg('请输入有效邮箱'); return; }
      if (password.length < 6) { setMsg('密码至少 6 位'); return; }
      submit.disabled = true;
      submit.textContent = mode === 'login' ? '登录中…' : '注册中…';
      try {
        if (mode === 'login') {
          var r = await window.YD_CLOUD.login(email, password);
          if (r.ok && r.data && r.data.access_token) {
            await afterLogin(r.data.user);
          } else {
            submit.disabled = false;
            submit.textContent = '登 录';
            var msg = (r.data && r.data.msg) || (r.data && r.data.error_description) || '登录失败';
            if (String(msg).indexOf('invalid') >= 0) msg = '邮箱或密码错误';
            setMsg('❌ ' + msg);
          }
        } else {
          var rr = await window.YD_CLOUD.register(email, password);
          if (rr.ok) {
            // 注册成功 → 自动登录
            var lr = await window.YD_CLOUD.login(email, password);
            if (lr.ok) await afterLogin(lr.data.user);
            else { setMsg('✅ 注册成功，请直接登录'); mode = 'login'; switchMode(); }
          } else {
            submit.disabled = false;
            submit.textContent = '注 册';
            var m2 = (rr.data && rr.data.msg) || '注册失败';
            if (String(m2).indexOf('already') >= 0) m2 = '该邮箱已注册，请直接登录';
            setMsg('❌ ' + m2);
          }
        }
      } catch (e) {
        submit.disabled = false;
        submit.textContent = mode === 'login' ? '登 录' : '注 册';
        setMsg('❌ 网络错误：' + e.message);
      }
    }
  });
})();
