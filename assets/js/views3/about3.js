/* 悦动健康 · 关于 v3 */
(function () {
  'use strict';
  function template(){
    return ''+
      '<div class="yk-page-title">关于</div><p class="yk-page-desc">悦动健康 · 你的健康助手</p>'+
      '<div class="yk-card" style="text-align:center;padding:32px 20px">'+
        '<img src="icons/icon-192.png" alt="悦动健康" style="width:80px;height:80px;border-radius:22px;box-shadow:0 12px 32px rgba(46,124,246,.3);margin-bottom:14px">'+
        '<div style="font-size:1.2rem;font-weight:900">悦动健康</div>'+
        '<div class="yk-text-xs yk-text-muted" style="margin-top:4px">' + (window.YK_APP_VERSION || 'v1.30') + ' · 纯本地 · 无广告</div>'+
        '<div class="yk-text-xs yk-text-muted" style="margin-top:12px;line-height:1.8">科学饮食 + 运动记录<br>数据仅保存在你的手机</div>'+
      '</div>'+
      '<div class="yk-card"><div class="yk-card-title">✨ 核心功能</div><div class="yk-text-sm yk-text-2" style="line-height:2.1">🍽️ 480+ 食物库<br>🏋️ 156 个动作库<br>⚖️ 体重追踪<br>📊 统计与成就<br>💾 数据备份<br>📶 完全离线</div></div>'+
      '<div class="yk-card"><div class="yk-card-title">🔒 隐私</div><div class="yk-text-sm yk-text-2" style="line-height:1.7">所有数据仅保存在本机，不上传服务器，无追踪脚本。</div></div>'+
      '<div class="yk-card"><div class="yk-card-title">⚠️ 免责</div><div class="yk-text-sm yk-text-2" style="line-height:1.7">健康数据仅供参考，不构成医疗建议。</div></div>';
  }
  function mounted(){}
  function refresh(){}
  window.YK3_VIEWS=window.YK3_VIEWS||{};
  window.YK3_VIEWS.about={template:template,mounted:mounted,refresh:refresh};
})();
