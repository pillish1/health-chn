/* 悦动健康 · 饮食 v3.2（完整重写版） */
(function () {
  'use strict';
  var Y = window.YDJK;
  var cur = null, preset = null, DATA = null;

  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  // 根据当前时间返回默认餐次
  function getDefaultMealType() {
    var h = new Date().getHours();
    if (h >= 5 && h < 10) return 'breakfast';
    if (h >= 10 && h < 15) return 'lunch';
    if (h >= 15 && h < 21) return 'dinner';
    return 'snack';
  }

  function template(){
    if(!cur) cur = Y?Y.today():'';
    return ''+
      '<div class="yk-page-title">饮食记录</div><p class="yk-page-desc">按时段记录，掌控每一餐</p>'+
      '<div class="yk-card" style="padding:10px;display:flex;align-items:center;gap:6px">'+
        '<button class="yk-btn yk-btn-ghost yk-btn-sm" id="dPrev">‹</button>'+
        '<div id="dLabel" style="flex:1;text-align:center;font-weight:800;font-size:.9rem;cursor:pointer"><span id="dText">今天</span><br><span id="dFull" class="yk-text-xs yk-text-muted"></span></div>'+
        '<button class="yk-btn yk-btn-ghost yk-btn-sm" id="dNext">›</button>'+
        '<button class="yk-btn yk-btn-outline yk-btn-sm" id="dToday">今天</button>'+
      '</div>'+
      '<div class="yk-card">'+
        '<div class="yk-flex-between yk-mb-2"><span class="yk-card-title" style="margin:0">摄入</span><span class="yk-badge blue" id="kcalBadge">0 kcal</span></div>'+
        '<div class="yk-flex" style="gap:12px"><div id="kcalRing" class="yk-ring"></div><div style="flex:1"><div id="macroBox"></div><div id="remain" class="yk-text-xs yk-text-muted" style="margin-top:6px"></div></div></div>'+
      '</div>'+
      '<div class="yk-grid-3 yk-mb-2">'+
        '<button class="yk-btn yk-btn-ghost yk-btn-sm" id="bPick">＋ 记一餐</button>'+
        '<button class="yk-btn yk-btn-ghost yk-btn-sm" id="bManual">✏️ 手动</button>'+
        '<button class="yk-btn yk-btn-ghost yk-btn-sm" id="bTpl">💾 套餐</button>'+
      '</div>'+
      '<div id="tplBox"></div>'+
      '<div id="recentBox"></div>'+
      '<div class="yk-card"><div class="yk-card-title">今日饮食</div><div id="mealList"></div></div>';
  }

  function mounted(){
    DATA = window.YDJK_DATA;
    bind();
    render();
  }

  function bind(){
    var b;
    if(b=document.getElementById('dPrev')) b.onclick=function(){set(Y.addDays(cur,-1));};
    if(b=document.getElementById('dNext')) b.onclick=function(){var d=Y.addDays(cur,1); if(d<=Y.today()) set(d);};
    if(b=document.getElementById('dToday')) b.onclick=function(){set(Y.today());};
    if(b=document.getElementById('bPick')) b.onclick=function(){preset=null;openPicker();};
    if(b=document.getElementById('bManual')) b.onclick=openManual;
    if(b=document.getElementById('bTpl')) b.onclick=saveTpl;
  }

  function set(d){cur=d;render();}

  function render(){
    if(!Y || !cur) return;
    var today=Y.today();
    var t=document.getElementById('dText');
    if(t) t.textContent = cur===today?'今天':cur===Y.addDays(today,-1)?'昨天':(Number(cur.slice(5,7)))+'月'+(Number(cur.slice(8,10)))+'日';
    var f=document.getElementById('dFull'); if(f) f.textContent=cur;

    // 摘要
    var s=Y.mealSummary(cur);
    var p=Y.getProfile(), goal=2000;
    if(p){var bmr=Y.calcBMR(p);goal=Math.round(Y.goalCalories(Y.calcTDEE(bmr,p.activity),p.goal));}
    var kb=document.getElementById('kcalBadge'); if(kb) kb.textContent=Math.round(s.kcal)+' kcal';
    var rm=document.getElementById('remain'); if(rm){var diff=Math.round(goal-s.kcal);rm.textContent=diff>=0?'还可摄入 '+diff+' kcal':'已超 '+(-diff)+' kcal';}
    if(window.YDJK_CHARTS){
      var ring=document.getElementById('kcalRing');
      if(ring) YDJK_CHARTS.donutChart(ring,{value:s.kcal,max:goal,unit:'',label:'',size:88,decimals:0,color:s.kcal>goal?'#FF5D5D':undefined});
    }
    var mb=document.getElementById('macroBox');
    if(mb){
      var mm=p?Y.macros(goal,p.goal):{protein:60,carbs:250,fat:60};
      var items=[{n:'蛋白',v:s.protein,t:mm.protein,c:'#2E7CF6'},{n:'碳水',v:s.carbs,t:mm.carbs,c:'#FFA62B'},{n:'脂肪',v:s.fat,t:mm.fat,c:'#FF5D5D'}];
      mb.innerHTML=items.map(function(it){
        var pct=Math.min(100, Math.round(it.v/(it.t||1)*100));
        return '<div class="yk-macro-bar"><small>'+it.n+' <b>'+it.v+'/'+it.t+'g</b></small><b>'+pct+'%</b><div class="yk-macro-track"><span style="width:'+pct+'%;background:'+it.c+'"></span></div></div>';
      }).join('');
    }

    // 饮食列表
    renderMeals();

    renderTpls();
    renderRecent();
  }

  function renderMeals(){
    var list=document.getElementById('mealList');
    var meals=Y.getMeals(cur);
    if(!meals.length){
      list.innerHTML='<div class="yk-empty" style="padding:20px"><div class="yk-empty-icon">🍽️</div><div class="yk-empty-title">还没有记录</div><div class="yk-empty-desc">点「记一餐」开始</div></div>';
      return;
    }
    var types=[{id:'breakfast',label:'🌅 早餐'},{id:'lunch',label:'🍱 午餐'},{id:'dinner',label:'🌙 晚餐'},{id:'snack',label:'🍎 加餐'}];
    list.innerHTML=types.map(function(tp){
      var items=meals.filter(function(m){return m.type===tp.id;});
      if(!items.length) return '';
      return '<div class="yk-meal-group"><div class="yk-meal-group-label">'+tp.label+'</div>'+items.map(function(m){
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px dashed var(--line)"><div><b style="font-size:.85rem">'+esc(m.name)+'</b><span class="yk-text-xs yk-text-muted" style="margin-left:6px">'+m.kcal+' kcal'+(m.protein?' · P'+m.protein+'g':'')+'</span></div><button class="js-del" data-id="'+m.id+'" style="border:none;background:none;color:var(--text-3);font-size:.85rem;padding:4px">✕</button></div>';
      }).join('')+'</div>';
    }).join('');
    list.querySelectorAll('.js-del').forEach(function(b){
      b.onclick=function(){ Y.removeMeal(cur,b.dataset.id); render(); };
    });
  }

  function renderTpls(){
    var el=document.getElementById('tplBox'); if(!el) return;
    var tpls=Y.getMealTemplates();
    if(!tpls.length){el.innerHTML='';return;}
    el.innerHTML='<div class="yk-flex" style="flex-wrap:wrap;gap:6px;margin-bottom:10px"><span class="yk-text-xs yk-text-muted" style="font-weight:700">📦 套餐：</span>'+tpls.map(function(t){
      var kcal=t.items.reduce(function(s,it){return s+it.kcal;},0);
      return '<button class="js-tpl" data-id="'+t.id+'" style="border:none;background:var(--bg-blue-soft);color:var(--blue);padding:6px 14px;border-radius:99px;font-size:.72rem;font-weight:700;cursor:pointer">'+esc(t.name)+' · '+kcal+'</button>';
    }).join('')+'</div>';
    el.querySelectorAll('.js-tpl').forEach(function(b){
      b.onclick=function(){
        var tpl=Y.getMealTemplates().filter(function(t){return t.id===b.dataset.id;})[0];
        if(!tpl) return;
        var type=preset||getDefaultMealType();
        tpl.items.forEach(function(it){Y.addMeal(cur,{type:type,name:it.name,kcal:it.kcal,protein:it.protein,carbs:it.carbs,fat:it.fat});});
        YK.toast('✅ 已套用：'+tpl.name);preset=null;render();
      };
    });
  }

  function renderRecent(){
    var el=document.getElementById('recentBox'); if(!el) return;
    var recent=[];
    try{recent=JSON.parse(localStorage.getItem('ydjk:recent-foods')||'[]');}catch(e){}
    if(!recent.length){el.innerHTML='';return;}
    el.innerHTML='<div class="yk-card" style="padding:12px 14px"><div class="yk-text-xs yk-text-muted" style="font-weight:700;margin-bottom:6px">🕐 最近使用</div><div class="yk-flex" style="flex-wrap:wrap;gap:6px">'+recent.slice(0,6).map(function(r){
      return '<button class="js-recent" data-n="'+esc(r.name)+'" data-k="'+r.kcal+'" data-p="'+(r.p||0)+'" data-c="'+(r.c||0)+'" data-f="'+(r.f||0)+'" style="border:none;background:var(--bg-soft);color:var(--text-2);padding:6px 12px;border-radius:99px;font-size:.72rem;font-weight:700;cursor:pointer">'+esc(r.name)+'</button>';
    }).join('')+'</div></div>';
    el.querySelectorAll('.js-recent').forEach(function(b){
      b.onclick=function(){
        openMeal({name:b.dataset.n,kcal:+b.dataset.k,p:+b.dataset.p,c:+b.dataset.c,f:+b.dataset.f});
        preset=null;
      };
    });
  }

  function saveTpl(){
    var meals=Y.getMeals(cur);
    if(!meals.length){YK.toast('今天还没有记录','err');return;}
    YK.openModal('<div class="yk-modal-title">💾 存为套餐</div><div class="yk-modal-subtitle">将今天 '+meals.length+' 条保存为套餐</div><div class="yk-field"><input class="yk-input" id="tplName" placeholder="套餐名"></div><div class="yk-modal-actions"><button class="yk-btn yk-btn-ghost" id="tplNo">取消</button><button class="yk-btn yk-btn-primary" id="tplYes">保存</button></div>');
    var mask=document.querySelector('.yk-modal-mask.show'); if(!mask) return;
    var inp=mask.querySelector('#tplName'); setTimeout(function(){inp.focus();},100);
    mask.querySelector('#tplNo').onclick=function(){YK.closeModal(mask);};
    mask.querySelector('#tplYes').onclick=function(){
      var name=inp.value.trim(); if(!name){YK.toast('请输入名字','err');return;}
      Y.saveMealTemplate({id:'tpl-'+Date.now(),name:name,items:meals.map(function(m){return{name:m.name,kcal:m.kcal,protein:m.protein,carbs:m.carbs,fat:m.fat};})});
      YK.closeModal(mask);YK.toast('✅ 已保存');render();
    };
  }

  function openManual(){
    var types={breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'};
    var manualType=getDefaultMealType();
    YK.openModal('<div class="yk-modal-title">✏️ 手动添加</div>'+
      '<div class="yk-field"><div class="yk-flex yk-gap-sm" id="mTypes">'+['breakfast','lunch','dinner','snack'].map(function(t){var active=t===manualType?' active':'';return '<button class="yk-type-btn'+active+'" data-t="'+t+'">'+types[t]+'</button>';}).join('')+'</div></div>'+
      '<div class="yk-field"><label>食物</label><input class="yk-input" id="mName" placeholder="如：一碗面条"></div>'+
      '<div class="yk-field"><label>热量 (kcal)</label><input class="yk-input" type="number" id="mKcal" placeholder="0"></div>'+
      '<div class="yk-modal-actions"><button class="yk-btn yk-btn-ghost" id="mManualNo">取消</button><button class="yk-btn yk-btn-primary" id="mManualYes">保存</button></div>');
    var mask=document.querySelector('.yk-modal-mask.show'); if(!mask) return;
    mask.querySelectorAll('#mTypes .yk-type-btn').forEach(function(b){b.onclick=function(){manualType=b.dataset.t;mask.querySelectorAll('#mTypes .yk-type-btn').forEach(function(x){x.classList.remove('active');});b.classList.add('active');};});
    mask.querySelector('#mManualNo').onclick=function(){YK.closeModal(mask);};
    mask.querySelector('#mManualYes').onclick=function(){
      var name=mask.querySelector('#mName').value.trim();
      var kcal=Number(mask.querySelector('#mKcal').value)||0;
      if(!name||kcal<=0){YK.toast('请填写名称和热量','err');return;}
      Y.addMeal(cur,{type:manualType,name:name,kcal:kcal,protein:0,carbs:0,fat:0});
      var typeNames={breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'};
      YK.closeModal(mask);YK.toast('✅ 已记录到'+(typeNames[manualType]||''));render();
    };
  }

  function openPicker(){
    if(!DATA||!DATA.FOODS){YK.toast('食物库错误','err');return;}
    YK.openModal('<div class="yk-modal-title">🍽️ 记一餐</div><div class="yk-field" style="margin-bottom:8px"><input class="yk-input" id="search" placeholder="搜索食物…"></div><div id="cats" class="yk-flex" style="flex-wrap:wrap;gap:6px;margin-bottom:8px"></div><div id="foods" style="max-height:50vh;overflow-y:auto"></div><div class="yk-modal-actions"><button class="yk-btn yk-btn-ghost" id="closeF">取消</button></div>');
    var mask=document.querySelector('.yk-modal-mask.show'); if(!mask) return;
    var cats=['全部','主食','肉蛋','蔬菜','水果','饮品','零食']; var cc='全部';
    var cw=mask.querySelector('#cats'), fw=mask.querySelector('#foods'), sw=mask.querySelector('#search');
    var showCount=50;
    function draw(){
      var q=(sw.value||'').trim().toLowerCase();
      var all=DATA.FOODS.filter(function(f){if(cc!=='全部'&&f.cat!==cc)return false;if(!q)return true;return f.name.toLowerCase().indexOf(q)>=0;});
      var items=all.slice(0,showCount);
      fw.innerHTML=items.map(function(f){return '<div class="yk-food" data-d="'+esc(f.name)+'|'+f.kcal+'|'+f.protein+'|'+f.carbs+'|'+f.fat+'"><div><b style="font-size:.85rem">'+esc(f.name)+'</b><div class="yk-text-xs yk-text-muted">P'+f.protein+' · C'+f.carbs+' · F'+f.fat+'g</div></div><span style="font-weight:800;color:var(--blue);font-size:.78rem">'+f.kcal+'</span></div>';}).join('')||'<div class="yk-text-center yk-text-muted" style="padding:20px">未找到</div>';
      if(all.length>showCount){fw.innerHTML+='<button class="yk-cat-btn" id="more" style="display:block;margin:10px auto">显示更多 ('+(all.length-showCount)+')</button>';var more=fw.querySelector('#more');if(more)more.onclick=function(){showCount+=50;draw();};}
      fw.querySelectorAll('.yk-food').forEach(function(c){c.onclick=function(){var d=c.dataset.d.split('|');openMeal({name:d[0],kcal:+d[1],p:+d[2],c:+d[3],f:+d[4]});YK.closeModal(mask);};});
    }
    cw.innerHTML=cats.map(function(c){return '<button class="yk-cat-btn'+(c===cc?' active':'')+'" data-c="'+c+'">'+c+'</button>';}).join('');
    cw.querySelectorAll('.yk-cat-btn').forEach(function(b){b.onclick=function(){cc=b.dataset.c;showCount=50;cw.querySelectorAll('.yk-cat-btn').forEach(function(x){x.classList.remove('active');});b.classList.add('active');draw();};});
    sw.addEventListener('input',function(){showCount=50;draw();});
    mask.querySelector('#closeF').onclick=function(){YK.closeModal(mask);};
    draw();setTimeout(function(){sw.focus();},100);
  }

  function openMeal(f){
    var types={breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'};
    var defType=preset||getDefaultMealType();
    YK.openModal('<div class="yk-modal-title">🍽️ '+esc(f.name)+'</div><div class="yk-field"><div class="yk-flex yk-gap-sm" id="types">'+['breakfast','lunch','dinner','snack'].map(function(t){var active=t===defType?' active':'';return '<button class="yk-type-btn'+active+'" data-t="'+t+'">'+types[t]+'</button>';}).join('')+'</div></div><div class="yk-field"><div class="yk-flex yk-gap"><input type="range" id="gram" min="10" max="500" value="100" step="10" style="flex:1"><span id="gramVal" style="min-width:48px;text-align:center;font-weight:800;font-size:.8rem;background:var(--bg-blue-soft);color:var(--blue);padding:5px 8px;border-radius:8px">100g</span></div></div><div id="calc" class="yk-text-sm yk-text-2" style="margin-bottom:6px"></div><div class="yk-modal-actions"><button class="yk-btn yk-btn-ghost" id="mMealNo">取消</button><button class="yk-btn yk-btn-primary" id="mMealYes">保存</button></div>');
    var mask=document.querySelector('.yk-modal-mask.show'); if(!mask) return;
    var type=defType;
    var g=mask.querySelector('#gram'), gv=mask.querySelector('#gramVal'), calc=mask.querySelector('#calc');
    function upd(){var val=Number(g.value);gv.textContent=val+'g';var r=val/100;calc.innerHTML='本次：<b style="color:var(--blue)">'+Math.round(f.kcal*r)+' kcal</b> · 蛋白 '+(f.p*r).toFixed(1)+'g';}
    g.addEventListener('input',upd);
    mask.querySelectorAll('#types .yk-type-btn').forEach(function(b){b.onclick=function(){type=b.dataset.t;mask.querySelectorAll('#types .yk-type-btn').forEach(function(x){x.classList.remove('active');});b.classList.add('active');};});
    mask.querySelector('#mMealNo').onclick=function(){YK.closeModal(mask);};
    mask.querySelector('#mMealYes').onclick=function(){
      var val=Number(g.value),r=val/100;
      Y.addMeal(cur,{type:type,name:f.name,kcal:Math.round(f.kcal*r),protein:Math.round(f.p*r*10)/10,carbs:Math.round(f.c*r*10)/10,fat:Math.round(f.f*r*10)/10});
      YK.closeModal(mask);YK.toast('✅ 已记录：'+f.name);preset=null;render();
    };
    upd();
  }

  function quickAdd(){
    if(!DATA) DATA=window.YDJK_DATA;
    openPicker();
  }

  function refresh(){render();}

  window.YK3_VIEWS=window.YK3_VIEWS||{};
  window.YK3_VIEWS.foods={template:template,mounted:mounted,refresh:refresh,quickAdd:quickAdd};
})();
