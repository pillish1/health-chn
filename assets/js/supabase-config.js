/* ============================================================
   悦动健康 · Supabase 云接入配置
   ============================================================ */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://vnbldfsbvvvpomndaihl.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuYmxkZnNidnZ2cG9tbmRhaWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjQwNjQsImV4cCI6MjEwMjU0MDA2NH0.D4LxKPfANTZUTlpucgKAz3_l4E0rgnAqSIGo7q78NnQ';
  window.YD_CLOUD = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    // Supabase REST 通用请求（无 SDK 依赖，轻量）
    async request(path, opts) {
      var options = opts || {};
      var headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      };
      // 附加用户 token（登录后）
      var session = window.YD_CLOUD.getSession();
      if (session && session.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
      if (options.headers) Object.assign(headers, options.headers);
      var res = await fetch(SUPABASE_URL + path, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      var text = await res.text();
      var data = text ? JSON.parse(text) : null;
      return { ok: res.ok, status: res.status, data: data };
    },
    // 会话存储（localStorage）
    getSession() {
      try {
        var s = localStorage.getItem('ydjk:session');
        return s ? JSON.parse(s) : null;
      } catch (e) { return null; }
    },
    setSession(s) {
      try {
        if (s) localStorage.setItem('ydjk:session', JSON.stringify(s));
        else localStorage.removeItem('ydjk:session');
      } catch (e) {}
    },
    // 注册（email + password）
    async register(email, password) {
      return this.request('/auth/v1/signup', { method: 'POST', body: { email: email, password: password } });
    },
    // 登录
    async login(email, password) {
      var r = await this.request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } });
      if (r.ok && r.data) {
        this.setSession({ access_token: r.data.access_token, refresh_token: r.data.refresh_token, user: r.data.user, expires_at: Date.now() + (r.data.expires_in || 3600) * 1000 });
      }
      return r;
    },
    // 登出
    logout() {
      this.setSession(null);
    },
    // 当前是否已登录
    isLoggedIn() {
      var s = this.getSession();
      return !!(s && s.access_token && s.expires_at > Date.now());
    },
    // 获取当前用户
    currentUser() {
      var s = this.getSession();
      return s && s.user ? s.user : null;
    },
    // 读取用户数据文档（按用户隔离），并缓存到全局
    async loadUserData() {
      var r = await this.request('/rest/v1/user_data?select=*&user_id=eq.' + (this.currentUser() ? this.currentUser().id : 'none'), { headers: { Prefer: 'return=representation' } });
      if (r.ok && r.data && r.data.length) return r.data[0];
      return null;
    },
    // 读取文章列表（公开可读）
    async loadArticles() {
      var r = await this.request('/rest/v1/articles?select=*&published=eq.true&order=date.desc', {});
      return r.ok ? r.data : [];
    },
    // 保存文章（需管理员权限）
    async saveArticle(article) {
      var r = await this.request('/rest/v1/articles', { method: 'POST', headers: { Prefer: 'return=representation' }, body: article });
      return r;
    },
    // 删除文章（需管理员权限）
    async deleteArticle(id) {
      return this.request('/rest/v1/articles?id=eq.' + id, { method: 'DELETE' });
    },
    // 当前用户是否管理员
    async isAdmin() {
      var user = this.currentUser();
      if (!user) return false;
      var r = await this.request('/rest/v1/admins?select=user_id&user_id=eq.' + user.id, {});
      return r.ok && r.data && r.data.length > 0;
    },
    // 保存/更新用户数据
    async saveUserData(payload) {
      var uid = this.currentUser() ? this.currentUser().id : null;
      if (!uid) return { ok: false };
      var existing = await this.loadUserData();
      if (existing) {
        return this.request('/rest/v1/user_data?user_id=eq.' + uid, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: payload });
      }
      return this.request('/rest/v1/user_data', { method: 'POST', headers: { Prefer: 'return=representation' }, body: Object.assign({ user_id: uid }, payload) });
    }
  };
})();
