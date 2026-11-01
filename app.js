import {E,names} from './catalog.js';
import {anatomySVG} from './anatomy.js';
import {loadStore,saveStore,clearStore,storageMode} from './db.js';
import {GOALS,parseTraining,normalizeState,emptyState,validateProfile,safeText,localToday,uid,setsOf,tonnage,bestE1RM,energy,summary,filterPeriod,feedback,mergeMissingDays,exerciseCatalog,restingMetabolicRate,validateCaloriePlan,normalizeMeal,dayCalorieBalance,recoveryForecast} from './engine.js';
const $=id=>document.getElementById(id),val=id=>$(id)?.value;
let state=emptyState(),period=1,selectedMuscle=null,selectedRecoveryMuscle=null,pending=null,editingId=null,ignoreUnmatched=new Set(),activeRoute='dashboard',noticeTimer=null;
const number=x=>Number(x)||0;
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),3300)}
const dateText=s=>s?.replaceAll('-','/');
const compact=n=>Math.round(n).toLocaleString('ja-JP');
function route(name){if(!['dashboard','record','history','progress','nutrition','settings'].includes(name))return;activeRoute=name;for(const el of document.querySelectorAll('.page'))el.classList.toggle('active',el.id==='page-'+name);for(const el of document.querySelectorAll('[data-route]'))el.classList.toggle('active',el.dataset.route===name);$('page-title').textContent={dashboard:'ダッシュボード',record:'トレーニング記録',history:'トレーニング履歴',progress:'成長・分析',nutrition:'カロリー管理',settings:'設定・データ'}[name];if(name==='dashboard')renderDashboard();if(name==='history')renderHistory();if(name==='progress')renderProgress();if(name==='nutrition')renderNutrition();if(name==='settings')renderSettings();window.scrollTo({top:0,behavior:'instant'});}
function save(){return saveStore(state).then(v=>{state=v;$('storage-status').textContent=storageMode()==='indexeddb'?'● IndexedDB・端末内保存':'● 代替保存（端末内）';return v}).catch(e=>{toast('保存失敗：'+e.message);throw e});}
function viewLogs(){return filterPeriod(state.logs,period)}
function renderDashboard(){const logs=viewLogs(),v=summary(logs),p=state.profile;
 $('m-sessions').textContent=v.sessions;$('m-sets').textContent=compact(v.sets);$('m-tonnage').textContent=compact(v.tonnage);$('m-energy').textContent=v.totalEnergy===null?'—':compact(v.totalEnergy)+(v.partial?'*':'');
 $('profile-summary').textContent=(p.weight||'—')+' kg · '+(p.height||'—')+' cm · '+(p.sex==='male'?'男性':p.sex==='female'?'女性':'中立')+' · '+(GOALS[p.goal]||'未設定');
 const model=p.display==='auto'?(p.sex==='none'?'neutral':p.sex):p.display;
 $('svg-front').innerHTML=anatomySVG('front',model,v.muscles,selectedMuscle);$('svg-back').innerHTML=anatomySVG('back',model,v.muscles,selectedMuscle);
 const order=Object.entries(v.muscles).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);$('muscle-ranking').innerHTML=order.length?order.slice(0,8).map(([k,v])=>`<div class="barline"><span>${safeText(names[k])}</span><span class="bar-bg"><span class="bar-inner" style="display:block;width:${Math.min(100,v/Math.max(order[0][1],1)*100).toFixed(0)}%"></span></span><b>${v.toFixed(1)}</b></div>`).join('')+'<p class="fine">直接1.0、補助0.5のセット相当値。部位間で重複します。</p>':'<div class="empty">トレーニングを追加すると部位別の分布が表示されます。</div>';
 renderDashboardEnergy();renderRecovery();
 $('feedback').innerHTML=feedback(logs,p.goal).map(t=>`<p>${safeText(t)}</p>`).join('');showMuscle(logs,v.muscles);}
function showMuscle(logs,totals){const id=selectedMuscle;if(!id){$('muscle-detail').innerHTML='<strong>部位を選択してください</strong><small>刺激セット相当と元の種目を表示します。</small>';return}
 const rows=logs.flatMap(l=>(l.exercises||[]).filter(e=>e.primary.includes(id)||e.secondary.includes(id)).map(e=>({date:l.date,name:e.displayName||e.name,sets:e.groups.reduce((v,g)=>v+g.sets,0),ratio:e.primary.includes(id)?1:.5})));$('muscle-detail').innerHTML=`<strong>${safeText(names[id])}：${number(totals[id]).toFixed(1)} セット相当</strong><small>${rows.length?rows.map(x=>`${safeText(x.date)} ${safeText(x.name)}：${x.sets}セット × ${x.ratio}`).join('<br>'):'該当記録はありません'}</small>`;}
const recoveryPalette={ready:'#419de5',caution:'#f1c24d',warning:'#f06473'};
function renderRecovery(){
 const asOf=val('recovery-date')||localToday();
 const f=recoveryForecast(state.logs,asOf,state.profile),p=state.profile;
 const model=p.display==='auto'?(p.sex==='none'?'neutral':p.sex):p.display;
 const colors={},titles={};
 for(const [id,x] of Object.entries(f.items)){
  colors[id]=recoveryPalette[x.state];
  titles[id]=`${x.name}：${x.statusLabel}、残り休養目安 ${x.remainingDays}日${x.hasRecord?'':'（記録なし）'}`;
 }
 for(const side of ['front','back'])$("recovery-"+side).innerHTML=anatomySVG(side,model,{},selectedRecoveryMuscle,{colors,titles});
 $('recovery-summary').innerHTML=[['warning','警告'],['caution','注意'],['ready','記録上は可']].map(([status,label])=>`<div class="recovery-stat"><small>${label}</small><strong style="color:${recoveryPalette[status]}">${f.counts[status]}<small>部位</small></strong></div>`).join('');
 const active=Object.values(f.items).filter(x=>x.hasRecord).sort((a,b)=>b.remainingDays-a.remainingDays||b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name));
 $('recovery-list').innerHTML=active.length?active.map(x=>`<div class="recovery-entry" data-state="${x.state}"><span>${safeText(x.name)}<small>最終記録 ${safeText(x.lastDate)} ／ ${x.lastExposure}セット相当</small></span><b>${x.remainingDays?`残り約${x.remainingDays}日`:'記録上は可'}</b></div>`).join(''):'<div class="empty">この判定日までに部位別の筋トレ記録がありません。青は十分に回復した証拠ではありません。</div>';
 const x=selectedRecoveryMuscle?f.items[selectedRecoveryMuscle]:null;
 $('recovery-detail').innerHTML=x?`<strong>${safeText(x.name)}：${x.statusLabel}</strong><small>${x.hasRecord?`最終トレーニング ${x.lastDate}／${x.lastExposure}セット相当。推定休養日数 ${x.restDays}日、判定日時点で残り約${x.remainingDays}日。`:'この部位の履歴なし。青色は回復完了の保証ではありません。'}</small>`:'<strong>筋肉をタップ</strong><small>最後のトレーニングと休養目安を表示します。</small>';
}
function resetForm(){editingId=null;pending=null;ignoreUnmatched.clear();$('log-date').value=localToday();$('log-minutes').value='';$('log-rest').value='';$('log-intensity').value='moderate';$('log-text').value='';$('log-notes').value='';$('preview-count').textContent='未解析';$('preview-summary').textContent='入力後「入力を解析する」を押してください。';for(const id of ['preview-exercises','preview-cardio','preview-unmatched','review-alerts'])$(id).innerHTML='';$('save-session').disabled=true;$('cancel-edit').hidden=true;$('duplicate-choice').hidden=true;$('duplicate-mode').value='';}
function analyze(){pending=parseTraining(val('log-text'));
 if(!val('log-minutes')&&pending.meta.minutes!==null)$('log-minutes').value=pending.meta.minutes;
 if(!val('log-rest')&&pending.meta.restMinutes!==null)$('log-rest').value=pending.meta.restMinutes;
 ignoreUnmatched.clear();$('duplicate-choice').hidden=true;$('duplicate-mode').value='';renderPreview();}
function renderPreview(){if(!pending)return;const sets=pending.exercises.reduce((v,e)=>v+e.groups.reduce((x,g)=>x+g.sets,0),0);$('preview-count').textContent=pending.exercises.length+'種目 / '+sets+'セット';$('preview-summary').innerHTML=`<strong>${pending.exercises.length}種目 · ${sets}セット · 有酸素${pending.cardio.length}件</strong><br><small>体重${state.profile.weight||'未入力'}kg・筋トレ${val('log-minutes')||'未入力'}分</small>`;
 $('review-alerts').innerHTML=pending.warnings.map(w=>`<div class="warning">${safeText(w)}</div>`).join('');
 $('preview-exercises').innerHTML=pending.exercises.map((e,i)=>`<div class="review-item"><div class="review-head"><strong>${safeText(e.displayName||e.name)}</strong><button type="button" data-remove-ex="${i}" aria-label="この種目を削除">種目削除 ×</button></div>${e.groups.map((g,j)=>`<div class="set-row"><label>重量 kg<input type="number" min="0" max="2000" step="0.5" inputmode="decimal" data-ex="${i}" data-group="${j}" data-field="weight" value="${g.weight===null?'':g.weight}"></label><label>回数<input type="number" min="1" max="200" inputmode="numeric" data-ex="${i}" data-group="${j}" data-field="reps" value="${g.reps}"></label><label>セット<input type="number" min="1" max="50" inputmode="numeric" data-ex="${i}" data-group="${j}" data-field="sets" value="${g.sets}"></label><label>RIR<input type="number" min="0" max="20" inputmode="numeric" data-ex="${i}" data-group="${j}" data-field="rir" placeholder="任意" value="${g.rir??''}"></label><button type="button" data-remove-group="${i}:${j}" aria-label="セット組を削除">×</button></div>`).join('')}<button class="small-add" type="button" data-add-group="${i}">＋ セットを追加</button></div>`).join('');
 $('preview-cardio').innerHTML=pending.cardio.length?'<h3 style="font-size:14px;margin-top:18px">有酸素運動</h3>'+pending.cardio.map(c=>`<div class="info"><strong>${safeText(c.name)}</strong> · ${c.minutes===null?'時間不明':Number(c.minutes.toFixed(1))+'分'}${c.distanceKm!==null?' · '+c.distanceKm+'km':''}${c.speedKmh?' · '+c.speedKmh+'km/h':''}${c.grade!==null?' · 傾斜'+c.grade+(c.gradeUnit==='degrees'?'度':'%'):''}${c.needsReview?' · カロリー未計上':''}</div>`).join(''):'';
 $('preview-unmatched').innerHTML=pending.unmatched.length?'<div class="warning">未認識行は、アプリが黙って捨てないよう確認が必要です。元の文章を修正して再解析するか、明示的に除外してください。</div>'+pending.unmatched.map((u,i)=>`<div class="unmatched-row"><strong>${safeText(u.raw)}</strong><small>${safeText(u.reason)}</small><label><input type="checkbox" data-ignore="${i}" ${ignoreUnmatched.has(i)?'checked':''}> この行を集計から除外して保存する</label></div>`).join(''):'';
 $('save-session').disabled=!pending.exercises.length&&!pending.cardio.length;}
function validatePending(){if(!pending||!pending.exercises.length&&!pending.cardio.length)throw Error('解析済みの種目がありません');const bad=pending.unmatched.filter((_,i)=>!ignoreUnmatched.has(i));if(bad.length)throw Error('未認識の行を確認してください。無視する場合はチェックを入れてください。');for(const e of pending.exercises){if(!e.groups.length)throw Error('セットがない種目があります');for(const g of e.groups){if(!Number.isFinite(g.sets)||g.sets<1||g.sets>50||!Number.isInteger(g.sets)||!Number.isFinite(g.reps)||g.reps<1||g.reps>200||!Number.isInteger(g.reps)||g.weight!==null&&(!Number.isFinite(g.weight)||g.weight<0||g.weight>2000)||g.rir!==null&&(!Number.isInteger(g.rir)||g.rir<0||g.rir>20))throw Error('重量・回数・セット数を確認してください。');}}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(val('log-date')))throw Error('日付を入力してください');if(val('log-minutes')!==''&&(!Number.isFinite(Number(val('log-minutes')))||Number(val('log-minutes'))<0||Number(val('log-minutes'))>600))throw Error('筋トレ時間を確認してください');if(val('log-rest')!==''&&(+val('log-rest')<0||+val('log-rest')>30))throw Error('休憩時間を確認してください');}
async function commit(){try{validatePending();const day=val('log-date');const similar=state.logs.filter(l=>l.date===day&&l.id!==editingId);let mode='append';if(similar.length){$('duplicate-choice').hidden=false;mode=val('duplicate-mode');if(!['replace','append'].includes(mode)){toast('同じ日付の保存方法を選んでください');$('duplicate-choice').scrollIntoView({block:'nearest'});return;}}
 const item={id:editingId||uid(),date:day,minutes:val('log-minutes')===''?null:Number(val('log-minutes')),restMinutes:val('log-rest')===''?null:Number(val('log-rest')),intensity:val('log-intensity'),raw:val('log-text'),notes:val('log-notes'),weightSnapshot:state.profile.weight?Number(state.profile.weight):null,exercises:structuredClone(pending.exercises),cardio:structuredClone(pending.cardio),createdAt:state.logs.find(l=>l.id===editingId)?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 if(mode==='append'&&state.logs.some(l=>l.id!==editingId&&l.date===day&&l.raw.trim()===item.raw.trim()))throw Error('同日・同内容の重複が見つかりました。');
 if(mode==='replace'&&similar.length&&!confirm('同じ日付の既存記録をすべて置換します。よろしいですか？'))return;
 const next=state.logs.filter(l=>l.id!==editingId&&!(mode==='replace'&&l.date===day));next.push(item);state.logs=next;await save();toast('記録を保存しました');resetForm();route('dashboard');}catch(e){toast(e.message)}}
function editLog(id){const l=state.logs.find(x=>x.id===id);if(!l)return;resetForm();editingId=id;$('log-date').value=l.date;$('log-minutes').value=l.minutes??'';$('log-rest').value=l.restMinutes??'';$('log-intensity').value=l.intensity;$('log-text').value=l.raw;$('log-notes').value=l.notes||'';$('cancel-edit').hidden=false;route('record');analyze(); // preserve previously edited group values if source raw was unchanged
 if(l.exercises?.length&&l.raw.trim()===val('log-text').trim()){pending.exercises=structuredClone(l.exercises);pending.cardio=structuredClone(l.cardio);pending.unmatched=[];pending.warnings=[];renderPreview()}
 toast('編集中：'+dateText(l.date));}
async function deleteLog(id){const l=state.logs.find(x=>x.id===id);if(!l)return;if(!confirm(`${dateText(l.date)}の記録を削除しますか？\nこの操作は取り消せません。`))return;state.logs=state.logs.filter(x=>x.id!==id);await save();renderHistory();toast('記録を削除しました');}
function renderHistory(){const q=val('history-query')?.trim().toLowerCase()||'',logs=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).filter(l=>!q||l.date.includes(q)||(l.exercises||[]).some(e=>(e.name+' '+e.displayName).toLowerCase().includes(q)));
 $('history-count').textContent=logs.length+' 件';$('history-list').innerHTML=logs.length?logs.map(l=>{const kcal=energy(l);return `<article class="history-entry"><div class="history-top"><div><time>${safeText(dateText(l.date))}</time><h3>${safeText((l.exercises||[]).slice(0,2).map(x=>x.name).join(' · ')||'有酸素運動')}${l.exercises.length>2?' ほか':''}</h3></div><span class="count-chip">${setsOf(l)} SETS</span></div><div class="history-chips"><span>挙上重量 ${compact(tonnage(l))}kg</span><span>筋トレ ${l.minutes??'—'}分</span><span>有酸素 ${(l.cardio||[]).reduce((x,c)=>x+(c.minutes||0),0)}分</span><span>消費 ${kcal.gross??'—'}kcal${kcal.partial?' *':''}</span></div><details><summary>内容を表示</summary><pre>${safeText(l.raw)}</pre></details><div class="history-actions"><button class="btn ghost" data-edit="${safeText(l.id)}">編集する</button><button class="btn danger" data-delete="${safeText(l.id)}">削除</button></div></article>`}).join(''):'<div class="empty">条件に合う記録はありません。<br>「トレーニング記録」から追加できます。</div>'}
function svgChart(points,{suffix='',color='#5ee1bd',bar=false}={}){if(!points.length)return '<div class="empty">記録を追加するとグラフが表示されます。</div>';
 const max=Math.max(1,...points.map(x=>x.value||0)),w=460,h=195,left=26,top=18,inner=w-44,bottom=h-35;const y=v=>bottom-(v/max)*(bottom-top),x=i=>left+(points.length===1?inner/2:i*inner/(points.length-1));let content='';for(let i=0;i<=3;i++){const yy=y(max*i/3);content+=`<line class="gridline" x1="${left}" y1="${yy}" x2="${w-16}" y2="${yy}"/><text class="axis-text" x="2" y="${yy-3}">${Math.round(max*i/3)}</text>`}
 if(bar){const bw=Math.max(10,Math.min(38,inner/points.length*.6));content+=points.map((v,i)=>`<rect x="${x(i)-bw/2}" y="${y(v.value)}" width="${bw}" height="${bottom-y(v.value)}" fill="${color}" rx="4"/>`).join('')}
 else {content+=`<polyline class="path" points="${points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')}" stroke="${color}"/>`+points.map((p,i)=>`<circle class="marker" cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${safeText(p.label)} ${p.value}${suffix}</title></circle>`).join('')}
 const indices=points.length<=4?points.map((_,i)=>i):[0,Math.floor((points.length-1)/2),points.length-1];content+=indices.map(i=>`<text class="axis-text" x="${x(i)}" y="${h-9}" text-anchor="middle">${safeText(points[i].label.slice(5))}</text>`).join('');return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${safeText(points.map(p=>p.label+': '+p.value+suffix).join('、'))}">${content}</svg>`;}
function renderProgress(){const logs=[...state.logs].sort((a,b)=>a.date.localeCompare(b.date));$('tonnage-chart').innerHTML=svgChart(logs.slice(-20).map(l=>({label:l.date,value:tonnage(l)})),{suffix:'kg',bar:true});const ex=[...new Set(logs.flatMap(l=>l.exercises.map(e=>e.name)))];const chooser=$('e1rm-exercise'),old=chooser.value;chooser.innerHTML=ex.map(x=>`<option value="${safeText(x)}">${safeText(x)}</option>`).join('');const eligible=ex.find(name=>logs.some(l=>bestE1RM(l,name)!==null));chooser.value=ex.includes(old)&&logs.some(l=>bestE1RM(l,old)!==null)?old:(eligible||ex[0]||'');const name=chooser.value;const strength=logs.map(l=>({label:l.date,value:bestE1RM(l,name)})).filter(x=>x.value!==null);$('e1rm-chart').innerHTML=svgChart(strength.slice(-20),{suffix:'kg'});const weights=state.weights||[];$('weight-chart').innerHTML=svgChart(weights.slice(-20).map(w=>({label:w.date||localToday(),value:Number(w.weight)||0})),{suffix:'kg'});
 const week={};for(const l of logs){const d=new Date(l.date+'T12:00:00'),monday=new Date(d);monday.setDate(d.getDate()-(d.getDay()+6)%7);const k=localToday(monday);week[k]=(week[k]||0)+setsOf(l)}$('weekly-chart').innerHTML=svgChart(Object.entries(week).slice(-16).map(([label,value])=>({label,value})),{suffix:'set',bar:true});}
function energyFormat(n){return n===null?'—':Math.round(n).toLocaleString('ja-JP')}
function renderDashboardEnergy(){
 const d=dayCalorieBalance(state,localToday()),el=$('dashboard-energy-summary');
 if(d.bmr===null){el.textContent='身長・体重・年齢・性別を設定すると、基礎代謝と食事目標を推定できます。';return;}
 el.innerHTML=`推定基礎代謝 <b>${energyFormat(d.bmr)}kcal</b> / 日 · 食事目標 <b>${energyFormat(d.target)}kcal</b> · 摂取 ${d.hasMeals?'<b>'+energyFormat(d.intake)+'kcal</b>（記録分）':'未記録'}<p class="fine">今日の筋トレによる追加消費は ${energyFormat(d.exerciseAddition)}kcal（調整後）。安静時消費の二重計上を防いだ参考推定値です。</p>`;
}
const mealLabels={breakfast:'朝食',lunch:'昼食',dinner:'夕食',snack:'間食'};
function renderNutrition(){
 const dt=val('nutrition-date')||localToday(),d=dayCalorieBalance(state,dt);
 for(const [id,v] of [['nutr-bmr',d.bmr],['nutr-baseline',d.baseline],['nutr-extra',d.bmr===null?null:d.exerciseAddition],['nutr-target',d.target],['nutr-intake',d.hasMeals?d.intake:null],['nutr-remaining',d.remaining]])$(id).textContent=energyFormat(v);
 $('nutr-progress').style.width=d.target>0&&d.hasMeals?Math.min(100,d.intake/d.target*100).toFixed(1)+'%':'0%';
 const notices=[];
 if(d.bmr===null)notices.push('基礎代謝の計算には19〜78歳の年齢・身長・体重と男性／女性の式の選択が必要です。性別未回答時は計算しません。');
 else notices.push(`計算内訳：RMR ${energyFormat(d.bmr)} × 活動係数 ${d.plan.activityFactor} ＋ 運動の安静時超過分 ${energyFormat(d.netEx)} × 反映率 ${Math.round(d.plan.exerciseCredit*100)}% ＋ 目標調整 ${d.plan.goalAdjustment>0?'+':''}${d.plan.goalAdjustment}kcal。`);
 if(!d.hasMeals)notices.push('食事未記録：摂取量と残りカロリーを表示しません。');
 else notices.push('残りは「記録済みの食事」に対する数値です。食事の入力漏れがある場合は実際の収支ではありません。');
 if(d.partial)notices.push('未確定の運動記録があり、運動による消費量の一部が計算に含まれていません。');
 if(d.target!==null&&d.target<d.bmr)notices.push('食事目標が推定基礎代謝を下回ります。目標の強度と栄養状態を再確認してください。');
 notices.push('運動消費・RMR・日常活動の係数は個人差のある推定値です。体重推移などを確認しながら調整してください。');
 $('nutr-caveat').textContent=notices.join(' ');
 const meals=state.meals.filter(m=>m.date===dt);
 $('meal-count').textContent=meals.length+'件';
 $('meal-list').innerHTML=meals.length?meals.map(m=>`<div class="meal-item"><div><strong>${safeText(m.name)}</strong><small>${mealLabels[m.mealType]||'食事'}${m.protein!==null?' · P '+m.protein+'g':''}${m.fat!==null?' · F '+m.fat+'g':''}${m.carbs!==null?' · C '+m.carbs+'g':''}</small></div><div class="meal-right"><b>${energyFormat(m.kcal)} kcal</b><button class="btn danger" data-delete-meal="${safeText(m.id)}" aria-label="食事記録を削除">削除</button></div></div>`).join(''):'<div class="empty">この日の食事はまだ登録されていません。</div>';
}
async function saveCaloriePlan(){
 try{
  const plan=validateCaloriePlan({activityFactor:val('cal-activity'),exerciseCredit:val('cal-credit'),goalAdjustment:val('cal-adjust')});
  const old=state.caloriePlan;state.caloriePlan=plan;
  try{await save()}catch(e){state.caloriePlan=old;throw e}
  renderNutrition();renderDashboardEnergy();toast('カロリー目標を保存しました');
 }catch(e){toast(e.message)}
}
async function saveMeal(){
 try{
  const dt=val('nutrition-date')||localToday(),name=val('meal-name'),kcal=val('meal-kcal');
  if(kcal==='')throw Error('カロリーを入力してください。');
  const m=normalizeMeal({id:uid(),date:dt,name,kcal,mealType:val('meal-type'),protein:val('meal-protein'),fat:val('meal-fat'),carbs:val('meal-carbs')});
  if(state.meals.some(x=>x.date===m.date&&x.name===m.name&&x.kcal===m.kcal)){
   if(!confirm('同じ日に同じ食事名・カロリーの記録があります。別の食事として追加しますか？'))return;
  }
  state.meals.push(m);
  try{await save()}catch(e){state.meals=state.meals.filter(x=>x.id!==m.id);throw e}
  for(const id of ['meal-name','meal-kcal','meal-protein','meal-fat','meal-carbs'])$(id).value='';
  renderNutrition();renderDashboardEnergy();toast('食事を端末に保存しました');
 }catch(e){toast('食事を保存できません：'+e.message)}
}
async function deleteMeal(id){
 const m=state.meals.find(x=>x.id===id);if(!m||!confirm(`「${m.name}」を削除しますか？`))return;
 const old=[...state.meals];state.meals=state.meals.filter(x=>x.id!==id);
 try{await save()}catch(e){state.meals=old;throw e}
 renderNutrition();renderDashboardEnergy();toast('食事記録を削除しました');
}
function renderSettings(){for(const k of ['height','weight','age','sex','fat','muscle','goal','level','display'])$('p-'+k).value=state.profile[k]??'';$('storage-message').textContent='保存方式：'+storageMode()+'。トレーニング・食事は端末ごとに保存。バックアップは暗号化されません。';}
async function saveProfile(){const p={};for(const k of ['height','weight','age','sex','fat','muscle','goal','level','display'])p[k]=val('p-'+k);try{validateProfile(p);if(Number(state.profile.weight)!==Number(p.weight)){state.weights=state.weights||[];const d=localToday();const record={date:d,weight:Number(p.weight),savedAt:new Date().toISOString()};state.weights=state.weights.filter(x=>x.date!==d).concat(record);}state.profile=p;await save();renderDashboard();if(activeRoute==='nutrition')renderNutrition();toast('プロフィールを保存しました');}catch(e){toast(e.message)}}
function download(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function exportJSON(){download('MuscleAtlasPro_Backup_'+localToday()+'.json',JSON.stringify({...state,exportedAt:new Date().toISOString(),app:'MuscleAtlasPro'},null,2),'application/json');toast('JSONバックアップを作成しました');}
function exportCSV(){const rows=[['date','exercise','equipment','weight_kg','reps','sets','rir','strength_minutes','rest_minutes','session_id']];for(const l of [...state.logs].sort((a,b)=>a.date.localeCompare(b.date))){for(const e of l.exercises)for(const g of e.groups)rows.push([l.date,e.name,e.equipment||'',g.weight??'',g.reps,g.sets,g.rir??'',l.minutes??'',l.restMinutes??'',l.id]);}const csv='\uFEFF'+rows.map(row=>row.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');download('MuscleAtlasPro_Sets_'+localToday()+'.csv',csv,'text/csv;charset=utf-8');toast('CSVを作成しました')}
function exportMealsCSV(){
 const fields=['date','meal_type','meal_name','calories_kcal','protein_g','fat_g','carbs_g','meal_id'];
 const rows=[fields];for(const m of [...state.meals].sort((a,b)=>a.date.localeCompare(b.date))){rows.push([m.date,m.mealType,m.name,m.kcal,m.protein??'',m.fat??'',m.carbs??'',m.id])}
 const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 download('MuscleAtlasPro_Meals_'+localToday()+'.csv',csv,'text/csv;charset=utf-8');toast('食事CSVを書き出しました');
}
async function importJSON(file){
 if(!file)return;
 try{
  if(file.size>15*1024*1024)throw Error('ファイルサイズが15MBを超えています');
  const raw=JSON.parse(await file.text()),data=normalizeState(raw);
  const mode=val('import-mode');
  if(mode==='merge'){
   const merged=mergeMissingDays(state,data);
   if(!confirm(`${data.logs.length}件を読み込みました。\n新規追加：${merged.added}件／登録済み日付のためスキップ：${merged.skipped}件。\nこの端末の既存記録は保持します。続行しますか？`))return;
   const oldState=state;try{state=merged.state;await save()}catch(e){state=oldState;throw e}
   toast(`${merged.added}件追加、${merged.skipped}件スキップしました`);
  }else if(mode==='replace'){
   if(!confirm(`${data.logs.length}件で全記録・プロフィールを上書きします。\n現在のデータは失われます。バックアップは保存しましたか？`))return;
   const oldState=state;try{state=data;await save()}catch(e){state=oldState;throw e}
   toast(`${data.logs.length}件を復元しました`);
  }else throw Error('取り込み方法を選択してください');
  pending=null;renderSettings();$('cal-activity').value=state.caloriePlan.activityFactor;$('cal-credit').value=state.caloriePlan.exerciseCredit;$('cal-adjust').value=state.caloriePlan.goalAdjustment;renderDashboard();renderHistory();renderProgress();renderNutrition();
 }catch(e){toast('復元に失敗：'+e.message)}finally{$('import-json').value=''}
}
async function clearAll(){if(!confirm('すべての筋トレ履歴・身体プロフィールを削除します。続けますか？'))return;const word=prompt('完全削除するには「削除」と入力してください');if(word!=='削除')return;state=await clearStore();resetForm();renderSettings();$('cal-activity').value=state.caloriePlan.activityFactor;$('cal-credit').value=state.caloriePlan.exerciseCredit;$('cal-adjust').value=state.caloriePlan.goalAdjustment;renderDashboard();renderNutrition();toast('端末内のデータを削除しました');}
function bind(){document.querySelectorAll('[data-route]').forEach(x=>x.addEventListener('click',()=>route(x.dataset.route)));document.querySelectorAll('[data-days]').forEach(x=>x.addEventListener('click',()=>{period=Number(x.dataset.days);selectedMuscle=null;document.querySelectorAll('[data-days]').forEach(y=>y.classList.toggle('active',x===y));renderDashboard()}));
 $('recovery-date').addEventListener('change',renderRecovery);
 $('recovery-side').addEventListener('change',()=>{const v=val('recovery-side');$('recovery-body-grid').className='body-grid'+(v==='both'?'':' single '+v)});
 for(const id of ['recovery-front','recovery-back']){
  $(id).addEventListener('click',e=>{const node=e.target.closest('[data-muscle]');if(!node)return;selectedRecoveryMuscle=node.dataset.muscle;renderRecovery()});
  $(id).addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-muscle]')){e.preventDefault();selectedRecoveryMuscle=e.target.dataset.muscle;renderRecovery()}});
 }
 $('map-side').addEventListener('change',()=>{const v=val('map-side');$('body-grid').className='body-grid'+(v==='both'?'':' single '+v)});
 for(const id of ['svg-front','svg-back'])$(id).addEventListener('click',e=>{const node=e.target.closest('[data-muscle]');if(!node)return;selectedMuscle=node.dataset.muscle;renderDashboard()});
 for(const id of ['svg-front','svg-back'])$(id).addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-muscle]')){e.preventDefault();selectedMuscle=e.target.dataset.muscle;renderDashboard()}});
 $('insert-example').addEventListener('click',()=>{$('log-text').value='ベンチプレス 60kg10rep1set 80kg8rep1set 90kg6rep2set 80kg8rep\nケーブルクランチ 70kg50rep1set30rep1set\nトレーニング時間90分\nセット間2分\nトレッドミル 15%傾斜2.0km (6.0km/h)';toast('入力例をセットしました')});
 $('analyze-btn').addEventListener('click',analyze);$('save-session').addEventListener('click',commit);$('cancel-edit').addEventListener('click',()=>{resetForm();toast('編集を中止しました')});
 $('preview-exercises').addEventListener('input',e=>{const t=e.target;if(!t.dataset.field||!pending)return;const g=pending.exercises[Number(t.dataset.ex)]?.groups[Number(t.dataset.group)];if(!g)return;g[t.dataset.field]=t.value===''&&(t.dataset.field==='weight'||t.dataset.field==='rir')?null:Number(t.value);});
 $('preview-exercises').addEventListener('click',e=>{let t=e.target;if(!pending)return;if(t.dataset.removeEx!==undefined){pending.exercises.splice(Number(t.dataset.removeEx),1);renderPreview()}else if(t.dataset.removeGroup!==undefined){const [i,j]=t.dataset.removeGroup.split(':').map(Number);pending.exercises[i].groups.splice(j,1);renderPreview()}else if(t.dataset.addGroup!==undefined){const e=pending.exercises[Number(t.dataset.addGroup)],last=e.groups[e.groups.length-1]||{weight:null,reps:10,sets:1,rir:null};e.groups.push({...last,sets:1});renderPreview()}});
 $('preview-unmatched').addEventListener('change',e=>{if(e.target.dataset.ignore===undefined)return;const id=Number(e.target.dataset.ignore);if(e.target.checked)ignoreUnmatched.add(id);else ignoreUnmatched.delete(id)});
 $('history-query').addEventListener('input',renderHistory);$('history-list').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.edit)editLog(t.dataset.edit);else if(t.dataset.delete)deleteLog(t.dataset.delete)});
 $('e1rm-exercise').addEventListener('change',renderProgress);$('save-profile').addEventListener('click',saveProfile);$('export-json').addEventListener('click',exportJSON);$('export-csv').addEventListener('click',exportCSV);$('export-meals-csv').addEventListener('click',exportMealsCSV);$('import-json').addEventListener('change',e=>importJSON(e.target.files[0]));$('clear-data').addEventListener('click',clearAll);
 $('nutrition-date').addEventListener('change',renderNutrition);$('save-calorie-plan').addEventListener('click',saveCaloriePlan);$('save-meal').addEventListener('click',saveMeal);$('meal-list').addEventListener('click',e=>{const btn=e.target.closest('[data-delete-meal]');if(btn)deleteMeal(btn.dataset.deleteMeal)});
}
async function init(){try{({state}=await loadStore());$('recovery-date').value=localToday();$('storage-status').textContent=storageMode()==='indexeddb'?'● 端末内保存（外部同期なし）':'● 端末内代替保存（外部同期なし）';bind();resetForm();renderDashboard();$('nutrition-date').value=localToday();$('cal-activity').value=state.caloriePlan.activityFactor;$('cal-credit').value=state.caloriePlan.exerciseCredit;$('cal-adjust').value=state.caloriePlan.goalAdjustment;if(state.logs.length)toast(`${state.logs.length}件の記録を読み込みました`);if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(e){$('storage-status').textContent='保存エラー';toast('起動できません：'+e.message);console.error(e)}}
init();
