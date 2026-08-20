/* 悦动健康 · 统计 v3 */
(function () {
  'use strict';
  var Y=window.YDJK, range='week';
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function template(){
    return ''+
      '<div class="yk-page-title">统计分析</div><p class="yk-page-desc">看见进步</p>'+
      '<div class="yk-segmented">'+
        '<button class="yk-seg-item'+(range==='week'?' active':'')+'" data-r="week">本周</button>'+
        '<button class="yk-seg-item'+(range==='month'?' active':'')+'" data-r="month">近30天</button>'+
        '<button class="yk-seg-item'+(range==='all'?' active':'')+'" data-r="all">全部</button>'+
      '</div>'+
      '<div class="yk-card"><div class="yk-card-title">📊 概览</div><div class="yk-grid-3">'+
        '<div class="yk-stat-box"><b id="sDays">0</b><small>饮食天数</small></div>'+
        '<div class="yk-stat-box"><b id="sMeals">0</b><small>餐数</small></div>'+
        '<div class="yk-stat-box"><b id="sTrain">0</b><small>训练天数</small></div>'+
        '<div class="yk-stat-box"><b id="sKcal">0</b><small>摄入</small></div>'+
        '<div class="yk-stat-box"><b id="sBurn">0</b><small>消耗</small></div>'+
        '<div class="yk-stat-box"><b id="sW">--</b><small>体重变化</small></div>'+
      '</div></div>'+
      '<div class="yk-card"><div class="yk-flex-between yk-mb-1"><span class="yk-card-title" style="margin:0">⚖️ 体重</span><button class="yk-btn yk-btn-outline yk-btn-sm" id="ykAddW">＋ 记录</button></div><div id="wChart"></div></div>'+
      '<div class="yk-card"><div class="yk-card-title">🍽️ 摄入</div><div id="iChart"></div></div>'+
      '<div class="yk-card"><div class="yk-card-title">🏃 消耗</div><div id="bChart"></div></div>'+
      '<div class="yk-card"><div class="yk-card-title">🏆 成就</div><div id="badges" class="yk-grid-2"></div></div>';
  }

  function mounted(root){
    root.querySelectorAll('.yk-seg-item').forEach(function(b){b.onclick=function(){range=b.dataset.r;root.querySelectorAll('.yk-seg-item').forEach(function(x){x.classList.remove('active');});b.classList.add('active');render();};});
    // 记录体重
    var addW = root.querySelector('#ykAddW');
    if (addW) addW.addEventListener('click', openWeightModal);
    render();
    try{if(Y.checkAchievements)Y.checkAchievements();}catch(e){}
  }

  function openWeightModal(){
    var mask = YK.openModal(
      '<div class="yk-modal-title">⚖️ 记录体重</div>' +
      '<div class="yk-field"><label>日期</label><input class="yk-input" type="date" id="wDate" value="'+Y.today()+'"></div>' +
      '<div class="yk-field"><label>体重 (kg)</label><input class="yk-input" type="number" id="wVal" placeholder="如 60.5" step="0.1"></div>' +
      '<div class="yk-modal-actions">' +
        '<button class="yk-btn yk-btn-ghost" id="wNo">取消</button>' +
        '<button class="yk-btn yk-btn-primary" id="wYes">保存</button>' +
      '</div>'
    );
    if (!mask) return;
    mask.querySelector('#wNo').onclick = function(){ YK.closeModal(mask); };
    mask.querySelector('#wYes').onclick = function(){
      var date = mask.querySelector('#wDate').value || Y.today();
      var val = Number(mask.querySelector('#wVal').value);
      if (!val || val < 20 || val > 300) { YK.toast('请输入有效体重', 'err'); return; }
      Y.addWeight(date, val);
      YK.closeModal(mask);
      YK.toast('✅ 体重已记录');
      render();
    };
  }

  function days(){return range==='week'?7:range==='month'?30:3650;}

  function render(){
    var n=days(),today=Y.today(),start=Y.addDays(today,-(n-1));
    var kg=(Y.getProfile()&&Y.getProfile().weight)||60;
    var mealD=0,meals=0,trainD=0,kcal=0,burn=0;
    var d=start;
    for(var i=0;i<n;i++){
      var ms=Y.getMeals(d),wks=Y.getWorkouts(d),m=Y.mealSummary(d);
      if(ms.length){mealD++;meals+=ms.length;kcal+=m.kcal;}
      var db=0;wks.forEach(function(w){var met=Number(w.met)||5,mins=w.minutes?Number(w.minutes):(w.sets?w.sets*3:20);db+=Math.round(met*3.5*kg/200*mins);});
      if(wks.length){trainD++;burn+=db;}
      d=Y.addDays(d,1);
    }
    document.getElementById('sDays').textContent=mealD;
    document.getElementById('sMeals').textContent=meals;
    document.getElementById('sTrain').textContent=trainD;
    document.getElementById('sKcal').textContent=Math.round(kcal);
    document.getElementById('sBurn').textContent=Math.round(burn);

    var w=Y.getWeights(),wds=Object.keys(w).sort().filter(function(x){return x>=start&&x<=today;});
    var wEl=document.getElementById('sW');
    if(wds.length>=2){var diff=w[wds[wds.length-1]].w-w[wds[0]].w;wEl.textContent=(diff>=0?'+':'')+diff.toFixed(1);wEl.style.color=diff<0?'#18C29C':diff>0?'#FF5D5D':'';}
    else if(wds.length===1){wEl.textContent=w[wds[0]].w;wEl.style.color='';}
    else{wEl.textContent='--';wEl.style.color='';}

    renderCharts(start,today,n);
    renderBadges();
  }

  function renderCharts(start,today,n){
    var W=window.YDJK_CHARTS;if(!W)return;
    var kg=(Y.getProfile()&&Y.getProfile().weight)||60;
    var labels=[],intake=[],burn=[],protein=[],d=start;
    for(var i=0;i<n;i++){
      labels.push(d.slice(5));
      var m=Y.mealSummary(d);intake.push(Math.round(m.kcal));protein.push(Math.round(m.protein*10)/10);
      var wks=Y.getWorkouts(d),db=0;wks.forEach(function(w){var met=Number(w.met)||5,mins=w.minutes?Number(w.minutes):(w.sets?w.sets*3:20);db+=Math.round(met*3.5*kg/200*mins);});
      burn.push(db);d=Y.addDays(d,1);
    }
    var wc=document.getElementById('wChart');var w=Y.getWeights(),wds=Object.keys(w).sort().filter(function(x){return x>=start&&x<=today;});
    if(wds.length>0)W.lineChart(wc,{labels:wds.map(function(x){return x.slice(5);}),values:wds.map(function(x){return w[x].w;}),color:'#1FB9FF',unit:'kg',height:120});
    else wc.innerHTML='<div class="yk-text-center yk-text-muted" style="padding:16px;font-size:.75rem">暂无数据</div>';

    var p=Y.getProfile(),goal=2000;
    if(p){var bmr=Y.calcBMR(p);goal=Math.round(Y.goalCalories(Y.calcTDEE(bmr,p.activity),p.goal));}
    W.lineChart(document.getElementById('iChart'),{labels:labels,values:intake,color:'#2E7CF6',unit:' kcal',target:goal,height:120});
    W.lineChart(document.getElementById('bChart'),{labels:labels,values:burn,color:'#18C29C',unit:' kcal',height:120});
  }

  function renderBadges(){
    var el=document.getElementById('badges');if(!el||!Y.getAchievementDefs)return;
    var defs=Y.getAchievementDefs(),un=Y.getAchievements();
    el.innerHTML=defs.map(function(b){var on=!!un[b.id];return '<div style="border:1px solid '+(on?'#C7E0FF':'var(--line)')+';border-radius:12px;padding:10px;text-align:center;background:'+(on?'var(--bg-blue-soft)':'#fff')+';opacity:'+(on?'1':'.5')+'"><div style="font-size:1.4rem">'+b.icon+'</div><div style="font-size:.72rem;font-weight:800;margin-top:4px">'+esc(b.name)+'</div><div style="font-size:.6rem;color:var(--text-3);margin-top:2px">'+esc(b.desc)+'</div>'+(on?'<div style="font-size:.62rem;color:var(--blue);font-weight:700;margin-top:3px">✓ 已获得</div>':'')+'</div>';}).join('');
  }

  function refresh(){render();}
  window.YK3_VIEWS=window.YK3_VIEWS||{};
  window.YK3_VIEWS.stats={template:template,mounted:mounted,refresh:refresh};
})();
