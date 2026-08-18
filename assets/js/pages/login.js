/* 登录/注册页逻辑 v3：仅手机号验证码（未注册手机号自动注册） */
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
  function derivePwd(phone) { return 'yd' + phone.slice(-6) + '#p'; }

  /* 发送验证码：调试模式本地生成并显示；真实短信接入点在此替换为 API 调用 */
  function sendSmsCode(phone) {
    var code = String(Math.floor(100000 + Math.random() * 900000));
    try { localStorage.setItem('ydjk:sms-code', JSON.stringify({ phone: phone, code: code, ts: Date.now() })); } catch (e) {}
    // 调试模式：验证码直接显示（上线接入短信服务后删除此行）
    setMsg('📱 调试模式，验证码：' + code + '（正式上线后将以短信发送）', true);
    return code;
  }
  function verifySmsCode(phone, input) {
    try {
      var rec = JSON.parse(localStorage.getItem('ydjk:sms-code') || 'null');
      if (!rec || rec.phone !== phone) return { ok: false, msg: '请先获取验证码' };
      if (Date.now() - rec.ts > 10 * 60 * 1000) return { ok: false, msg: '验证码已过期，请重新获取' };
      if (rec.code !== input) return { ok: false, msg: '验证码错误' };
      localStorage.removeItem('ydjk:sms-code');
      return { ok: true };
    } catch (e) { return { ok: false, msg: '验证码校验失败' }; }
  }

  /* 手机号登录（验证码校验通过后，用映射邮箱登录/注册） */
  async function phoneLogin(phone, code) {
    var v = verifySmsCode(phone, code);
    if (!v.ok) { setMsg('❌ ' + v.msg); return; }
    var email = phoneToEmail(phone);
    var pwd = derivePwd(phone);
    var cloud = window.YD_CLOUD;
    // 先尝试登录
    var r = await cloud.login(email, pwd);
    if (!r.ok) {
      // 未注册 → 自动注册（mailer_autoconfirm=true 无需验证邮箱）
      var reg = await cloud.register(email, pwd);
      if (!reg.ok) { setMsg('❌ 账号创建失败：' + ((reg.data && (reg.data.msg || reg.data.error_description)) || '请重试')); return; }
      r = await cloud.login(email, pwd);
    }
    if (r.ok && r.data && r.data.access_token) {
      // 记录手机号关联
      try { localStorage.setItem('ydjk:phone', phone); } catch (e) {}
      await afterLogin(r.data.user, phone);
    } else {
      setMsg('❌ 登录失败，请重试');
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

    /* 获取验证码 */
    var sendBtn = document.getElementById('sendCode');
    var countdown = null;
    sendBtn.addEventListener('click', function () {
      var phone = document.getElementById('authPhone').value.trim();
      if (!validPhone(phone)) { setMsg('❌ 请输入正确的 11 位手机号'); return; }
      sendSmsCode(phone);
      var sec = 60;
      sendBtn.disabled = true;
      sendBtn.textContent = sec + 's 后重发';
      countdown = setInterval(function () {
        sec--;
        if (sec <= 0) {
          clearInterval(countdown);
          sendBtn.disabled = false;
          sendBtn.textContent = '获取验证码';
        } else {
          sendBtn.textContent = sec + 's 后重发';
        }
      }, 1000);
    });

    /* 手机号登录提交 */
    document.getElementById('authSubmit').addEventListener('click', async function () {
      var phone = document.getElementById('authPhone').value.trim();
      var code = document.getElementById('authCode').value.trim();
      if (!validPhone(phone)) { setMsg('❌ 请输入正确的 11 位手机号'); return; }
      if (!/^\d{6}$/.test(code)) { setMsg('❌ 请输入 6 位验证码'); return; }
      await phoneLogin(phone, code);
    });
  });
})();