/* 悦动健康 · 我的 v3 */
(function () {
  'use strict';
  var Y=window.YDJK;

  function template(){
    return ''+
      '<div class="yk-page-title">我的</div><p class="yk-page-desc">管理和保护你的数据</p>'+
      '<div class="yk-card" style="cursor:pointer" onclick="YK.openProfile()"><div class="yk-flex" style="gap:14px">'+
        '<div style="width:52px;height:52px;border-radius:16px;background:var(--grad-blue);display:grid;place-items:center;font-size:1.4rem;color:#fff;box-shadow:var(--shadow-blue);flex:none">👤</div>'+
        '<div style="flex:1"><div id="pName" style="font-size:.95rem;font-weight:800">未建档</div><div id="pDetail" class="yk-text-xs yk-text-muted" style="margin-top:2px">点击建立</div></div><span style="color:var(--text-3)">›</span>'+
      '</div></div>'+
      '<div class="yk-card"><div class="yk-grid-3">'+
        '<div class="yk-stat-box" onclick="YK.navigate(\'stats\')"><b id="ps">0</b><small>连续</small></div>'+
        '<div class="yk-stat-box" onclick="YK.navigate(\'stats\')"><b id="pm">0</b><small>餐数</small></div>'+
        '<div class="yk-stat-box" onclick="YK.navigate(\'stats\')"><b id="pt">0</b><small>训练</small></div>'+
      '</div></div>'+
      '<div class="yk-card" style="padding:6px 14px">'+
        '<div class="yk-list-item" onclick="YK.navigate(\'stats\')"><span class="yk-list-icon blue">📊</span><div class="yk-list-main"><div class="yk-list-title">统计分析</div><div class="yk-list-sub">趋势图表与成就</div></div><span class="yk-list-arrow">›</span></div>'+
        '<div class="yk-list-item" onclick="YK.navigate(\'about\')"><span class="yk-list-icon purple">ℹ️</span><div class="yk-list-main"><div class="yk-list-title">关于</div><div class="yk-list-sub">版本与隐私</div></div><span class="yk-list-arrow">›</span></div>'+
        '<div class="yk-list-item" onclick="exportData()"><span class="yk-list-icon orange">💾</span><div class="yk-list-main"><div class="yk-list-title">导出备份</div><div class="yk-list-sub">安全保存数据</div></div><span class="yk-list-arrow">›</span></div>'+
        '<div class="yk-list-item" onclick="document.getElementById(\'imp\').click()"><span class="yk-list-icon green">📥</span><div class="yk-list-main"><div class="yk-list-title">导入备份</div><div class="yk-list-sub">恢复历史</div></div><span class="yk-list-arrow">›</span></div>'+
        '<input type="file" id="imp" accept=".json,application/json" style="display:none">'+
        '<div id="bs" class="yk-text-xs yk-text-muted" style="padding:6px 4px 0"></div>'+
      '</div>'+
      '<div class="yk-card" id="remind" style="display:none;background:linear-gradient(135deg,#FFF7ED,#FFEFD9);border-color:#FFD9A8;padding:14px"><div style="font-size:.85rem;font-weight:800;color:#C25410">💾 备份提醒</div><div class="yk-text-xs" style="color:#8B4A10;margin-top:4px">建议定期导出备份</div></div>' +
      '<div class="yk-card" id="backupGuard">' +
        '<div class="yk-card-title">🛡️ 数据保护</div>' +
        '<div class="yk-text-xs yk-text-2" style="line-height:1.7;margin-bottom:10px">App 正在自动保护你的数据，无需手动操作。即使重装或清缓存，也能从历史快照恢复。</div>' +
        '<div class="yk-flex-between yk-mb-1"><span class="yk-text-xs yk-text-muted">自动保存</span><span class="yk-badge green" id="bgStatus">✅ 已开启</span></div>' +
        '<div class="yk-flex-between yk-mb-1"><span class="yk-text-xs yk-text-muted">最近快照</span><span class="yk-text-xs" id="bgLast">--</span></div>' +
        '<button class="yk-btn yk-btn-outline yk-btn-sm" id="bgRestore" style="margin-top:10px;width:100%">恢复最近备份</button>' +
      '</div>';

  }

  function mounted(){
    bind();
    render();
    // 备份管家
    if (window.YDB && YDB.getSnapshots) {
      YDB.getSnapshots().then(function(list){
        var lastEl = document.getElementById('bgLast');
        if (lastEl && list && list.length > 0) {
          var d = new Date(list[0].ts);
          lastEl.textContent = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + (String(d.getMinutes()).padStart(2,'0'));
        }
      });
    }
    var restoreBtn = document.getElementById('bgRestore');
    if (restoreBtn) restoreBtn.onclick = function(){ restoreBackup(); };
  }

  function restoreBackup(){
    if (!window.YDB || !YDB.getSnapshots) { YK.toast('备份服务不可用','err'); return; }
    YDB.getSnapshots().then(function(list){
      if (!list || list.length === 0) { YK.toast('暂无历史备份','err'); return; }
      YK.openModal(
        '<div class="yk-modal-title">🛡️ 恢复备份</div>' +
        '<div class="yk-modal-subtitle">从以下历史快照恢复数据（将覆盖当前数据）</div>' +
        '<div id="snapList">' + list.slice(0,5).map(function(s,i){
          var d = new Date(s.ts);
          var label = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
          return '<button class="yk-btn yk-btn-ghost yk-btn-sm" style="width:100%;margin-bottom:6px;justify-content:space-between" data-ts="'+s.ts+'"><span>📅 '+label+'</span><span>›</span></button>';
        }).join('') +
        '<div class="yk-modal-actions"><button class="yk-btn yk-btn-ghost" id="snapNo">取消</button></div></div>'
      );
      var mask = document.querySelector('.yk-modal-mask.show');
      if (!mask) return;
      mask.querySelector('#snapNo').onclick = function(){ YK.closeModal(mask); };
      mask.querySelectorAll('[data-ts]').forEach(function(btn){
        btn.onclick = function(){
          var ts = Number(btn.dataset.ts);
          YK.closeModal(mask);
          YDB.restoreFromSnapshot(ts).then(function(ok){
            if (ok) { YK.toast('✅ 已恢复备份'); render(); setTimeout(function(){ if(window.YK3_VIEWS){Object.keys(window.YK3_VIEWS).forEach(function(k){try{window.YK3_VIEWS[k].refresh&&window.YK3_VIEWS[k].refresh();}catch(e){}});}},200); }
            else { YK.toast('恢复失败','err'); }
          });
        };
      });
    });
  }
  function bind(){
    var imp=document.getElementById('imp');
    if(imp)imp.addEventListener('change',function(){
      var f=imp.files[0];if(!f)return;
      var r=new FileReader();
      r.onload=function(){try{var d=JSON.parse(r.result);if(typeof d!=='object')throw 0;importData(d);document.getElementById('bs').textContent='✅ 导入完成';render();}catch(e){document.getElementById('bs').textContent='❌ 格式错误';}};
      r.readAsText(f);imp.value='';
    });
  }

  function render(){
    var p=Y.getProfile();
    var n=document.getElementById('pName'),dt=document.getElementById('pDetail');
    if(p){if(n)n.textContent=(p.gender==='female'?'👩 ':'👨 ')+p.age+'岁·'+p.weight+'kg';if(dt)dt.textContent='身高'+p.height+'cm·'+(p.goal==='cut'?'减脂':p.goal==='bulk'?'增肌':'保持');}
    var ps=document.getElementById('ps');if(ps)ps.textContent=Y.checkinStreak();
    var pm=document.getElementById('pm');if(pm){var t=0;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('ydjk:meals:')===0){try{t+=JSON.parse(localStorage.getItem(k)||'[]').length;}catch(e){}}}pm.textContent=t;}
    var pt=document.getElementById('pt');if(pt){var d=Y.today(),week=Y.weekDates(d),cnt=0;week.forEach(function(x){if(Y.getWorkouts(x).length)cnt++;});pt.textContent=cnt;}
    var remind=document.getElementById('remind');
    if(remind&&Y.shouldRemindBackup&&Y.shouldRemindBackup())remind.style.display='';
  }

  function exportData(){
    try{
      var d=Y.collectAllData();
      var blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='悦动健康备份-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},300);
      if(Y.markBackupDone)Y.markBackupDone();YK.toast('📤 已导出');
      var r=document.getElementById('remind');if(r)r.style.display='none';
    }catch(e){YK.toast('导出失败','err');}
  }
  window.exportData=exportData;

  function importData(d){
    if(d.profile)Y.saveProfile(d.profile);
    if(d.workouts)Object.keys(d.workouts).forEach(function(x){try{localStorage.setItem('ydjk:workouts:'+x,JSON.stringify(d.workouts[x]||[]));}catch(e){}});
    if(d.mealsAll)Object.keys(d.mealsAll).forEach(function(x){try{localStorage.setItem('ydjk:meals:'+x,JSON.stringify(d.mealsAll[x]||[]));}catch(e){}});
    if(d.checkins){try{localStorage.setItem('ydjk:checkins',JSON.stringify(d.checkins));}catch(e){}}
    if(d.weights){try{localStorage.setItem('ydjk:weights',JSON.stringify(d.weights));}catch(e){}}
    if(d.achievements){try{localStorage.setItem('ydjk:achievements',JSON.stringify(d.achievements));}catch(e){}}
    if(d.favs){try{localStorage.setItem('ydjk:favs',JSON.stringify(d.favs));}catch(e){}}
    if(d.mealTemplates&&Y.saveMealTemplate)(d.mealTemplates||[]).forEach(function(t){try{Y.saveMealTemplate(t);}catch(e){}});
    // 导入后刷新所有视图
    setTimeout(function(){
      var views=window.YK3_VIEWS||{};
      Object.keys(views).forEach(function(k){try{if(views[k].refresh)views[k].refresh();}catch(e){}});
    }, 100);
  }

  function refresh(){render();}
  window.YK3_VIEWS=window.YK3_VIEWS||{};
  window.YK3_VIEWS.profile={template:template,mounted:mounted,refresh:refresh};
})();
