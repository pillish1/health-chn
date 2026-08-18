/* 登录/注册页逻辑 v4：仅手机号 + 密码（未注册手机号自动创建账号） */
(function () {
  'use strict';
  var YDJK = window.YDJK;

  function setMsg(text, ok) {
    var el = document.getElementById('authMsg');
    if (el) { el.textContent = text || ''; el.style.color = ok ? 'var(--primary)' : 'var(--danger)'; }
  }

  /* ---------- 手机号工具 ---------- */
  function validPhone(p) { return /^1[3-9]\d{9}$/.test(p); }
  function phoneToEmail(phone) { return 'u' + phone + '@ydjk.phone'; }

  /* 手机号登录/注册：
     先尝试登录 → 失败则自动注册（新手机号）→ 再登录 */
  async function phoneAuth(phone, pwd) {
    var email = phoneToEmail(phone);
    var cloud = window.YD_CLOUD;
    var r = await cloud.login(email, pwd);
    if (r.ok && r.data && r.data.access_token) {
      try { localStorage.setItem('ydjk:phone', phone); } catch (e) {}
      await afterLogin(r.data.user, phone);
      return;
    }
    // 登录失败 → 尝试自动注册（未注册手机号）
    var reg = await cloud.register(email, pwd);
    if (reg.ok) {
      var r2 = await cloud.login(email, pwd);
      if (r2.ok && r2.data && r2.data.access_token) {
        try { localStorage.setItem('ydjk:phone', phone); } catch (e) {}
        await afterLogin(r2.data.user, phone);
        return;
      }
      setMsg('❌ 注册成功但登录失败，请重试');
      return;
    }
    // 注册失败：判断是已注册（密码错）还是其他错误
    var msg = (reg.data && (reg.data.msg || reg.data.error_description)) || '操作失败';
    if (/already|registered|exists|duplicate|已注册/i.test(msg)) {
      setMsg('❌ 该手机号已注册，密码不正确');
    } else {
      setMsg('❌ ' + msg);
    }
  }

  /* 登录成功后：把本地数据合并到云端 */
  async function afterLogin(user, phone) {
    setMsg('✅ 登录成功，正在同步数据…');
    try {
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
      if (phone) local.phone = phone;
      // 云端已有数据则合并（云端优先，避免覆盖）
      if (cloudDoc && cloudDoc.data_json) {
        try { local = mergeCloud(JSON.parse(cloudDoc.data_json), local); } catch (e) {}
      }
      var payload = { data_json: JSON.stringify(local), updated_at: new Date().toISOString() };
      var r = await window.YD_CLOUD.saveUserData(payload);
      if (r.ok) setMsg('✅ 数据已同步到云端');
      else setMsg('⚠️ 登录成功，但数据同步失败，稍后自动重试', true);
      localStorage.setItem('ydjk:cloud-logged', '1');
      var hasProfile = YDJK.getProfile();
      var back = '';
      try { var rp = new URLSearchParams(location.search).get('back'); if (rp && rp.indexOf('http') !== 0) back = rp; } catch (e) {}
      var target;
      if (!hasProfile) target = 'index.html?setup=1';
      else if (back) target = back;
      else target = 'index.html';
      setTimeout(function () { location.href = target; }, 900);
    } catch (e) {
      setMsg('⚠️ 登录成功，数据同步异常');
      localStorage.setItem('ydjk:cloud-logged', '1');
      var hasP = YDJK.getProfile();
      var back = '';
      try { var rp = new URLSearchParams(location.search).get('back'); if (rp && rp.indexOf('http') !== 0) back = rp; } catch (e) {}
      setTimeout(function () { location.href = hasP ? (back || 'index.html') : 'index.html?setup=1'; }, 1200);
    }
  }

  /* 云端与本地合并（简单策略：以数据多的为准，按字段合并） */
  function mergeCloud(cloud, local) {
    var merged = local;
    if (cloud.profile && !local.profile) merged.profile = cloud.profile;
    if (cloud.weights && cloud.weights.length >= (local.weights || []).length) merged.weights = cloud.weights;
    if (cloud.checkins) { var c = Object.assign({}, cloud.checkins, local.checkins || {}); merged.checkins = c; }
    if (cloud.favs && cloud.favs.length) merged.favs = cloud.favs;
    if (cloud.mealsAll) { var mm = Object.assign({}, cloud.mealsAll, local.mealsAll || {}); merged.mealsAll = mm; }
    if (cloud.waterAll) { var ww = Object.assign({}, cloud.waterAll, local.waterAll || {}); merged.waterAll = ww; }
    if (cloud.myPlans && cloud.myPlans.length) merged.myPlans = cloud.myPlans;
    if (cloud.userArticles && cloud.userArticles.length) merged.userArticles = cloud.userArticles;
    if (cloud.weightGoal) merged.weightGoal = cloud.weightGoal;
    if (cloud.waterGoal) merged.waterGoal = cloud.waterGoal;
    return merged;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.YD_CLOUD && window.YD_CLOUD.isLoggedIn()) {
      location.href = 'index.html';
      return;
    }

    /* 显示/隐藏密码 */
    var pwdToggle = document.getElementById('pwdToggle');
    if (pwdToggle) pwdToggle.addEventListener('click', function () {
      var pwdInput = document.getElementById('authPwd');
      var show = pwdInput.type === 'password';
      pwdInput.type = show ? 'text' : 'password';
      var txt = document.getElementById('pwdToggleTxt');
      if (txt) txt.textContent = show ? '隐藏' : '显示';
    });

    /* 忘记密码（测试阶段说明） */
    var forgotBtn = document.getElementById('forgotPw');
    if (forgotBtn) forgotBtn.addEventListener('click', function () {
      var phone = document.getElementById('authPhone').value.trim();
      var msg = '当前为测试版，暂未接入短信验证码找回密码。<br>你可以用一个新的手机号注册新账号，本地数据登录后会自动同步到新账号（正式版将支持找回）。';
      if (!validPhone(phone)) msg = '请先输入你的手机号（仅用于记录），然后按提示操作。<br>' + msg;
      window.YDJK_UI.confirmDialog({
        title: '忘记密码',
        message: msg,
        okText: '知道了',
        cancelText: '关闭'
      });
    });

    /* 手机号 + 密码 登录/注册 */
    document.getElementById('authSubmit').addEventListener('click', async function () {
      var phone = document.getElementById('authPhone').value.trim();
      var pwd = document.getElementById('authPwd').value;
      if (!validPhone(phone)) { setMsg('❌ 请输入正确的 11 位手机号'); return; }
      if (pwd.length < 6) { setMsg('❌ 密码至少 6 位'); return; }
      var submit = document.getElementById('authSubmit');
      submit.disabled = true;
      submit.textContent = '登录中…';
      try {
        await phoneAuth(phone, pwd);
      } catch (e) {
        setMsg('❌ 网络异常，请重试');
      }
      submit.disabled = false;
      submit.textContent = '登录 / 注册';
    });
  });
})();