import {LANGUAGES,setLanguage,startTranslation,translate,formatDate,formatNumber,exerciseLabel,muscleLabel,insertionName,deletionPhrase,getLanguage,getNumberLocale} from './i18n.js';
import {evaluateTrainingDay,LEVELS} from './evaluation.js';
import {findPersonalFood,savePersonalFood,mergePersonalFoods,personalFoodsBackup,readPersonalFoodsBackup} from './personal_food.js';
import {FOOD_REFERENCE,parseFoodLines,parseLabel,calculateFoodTotals,dailyPFC,validatePFCGoal,parseBPText,normalizeVital} from './wellness.js';
import {E,names} from './catalog.js';
import {EXERCISE_GROUPS,searchExerciseDictionary,exerciseDictionaryCount} from './exercise_search.js';
import {PFC_PRESETS,pfcForPreset,matchPfcPreset,pfcGramTargets} from './presets.js';
import {recommendForMuscle} from './recommend.js';
import {anatomySVG} from './anatomy.js';
import {displayNames,DETAIL_IDS,baseOf,displayValue,visibleRegionCount,SELECTABLE_IDS} from './detail.js';
import {planToday,TRAINABLE_GROUPS} from './tomorrow.js';
import {forecastScenario,normalizeForecastSettings} from './forecast.js';
import {scanDNA,normalizeDNAMarkers,parseExerciseReport,DNA_GENES} from './dna.js';
import {loadStore,saveStore,clearStore,storageMode} from './db.js';
import {filterMeals,groupMeals,updateMealById} from './meal_history.js';
import {GOALS,parseTraining,normalizeState,emptyState,validateProfile,safeText,localToday,uid,setsOf,tonnage,bestE1RM,energy,summary,filterPeriod,feedback,mergeMissingDays,exerciseCatalog,restingMetabolicRate,validateCaloriePlan,normalizeMeal,dayCalorieBalance,recoveryForecast,exportBackupObject,normalizeTrainingPrefs} from './engine.js';
const $=id=>document.getElementById(id),val=id=>$(id)?.value;
let state=emptyState(),period=1,selectedMuscle=null,selectedRecoveryMuscle=null,pending=null,editingId=null,ignoreUnmatched=new Set(),activeRoute='dashboard',noticeTimer=null;
const number=x=>Number(x)||0;
const askConfirm=text=>window.confirm(translate(text));
const askPrompt=text=>window.prompt(translate(text));
const EXCLUSIONS_VIEW_KEY='muscle-atlas-ui-exclusions-expanded-v1';
function setExclusionsExpanded(expanded){
 const panel=$('exclusion-body'),button=$('exclusion-toggle');
 if(!panel||!button)return;
 panel.hidden=!expanded;
 button.setAttribute('aria-expanded',String(Boolean(expanded)));
 button.textContent=expanded?'折りたたむ ▴':'展開する ▾';
 try{localStorage.setItem(EXCLUSIONS_VIEW_KEY,expanded?'1':'0')}catch(_e){/* Safari private-storage mode; the controls still work */}
}
function initExclusionsFold(){
 let previous='0';try{previous=localStorage.getItem(EXCLUSIONS_VIEW_KEY)||'0'}catch(_e){}
 setExclusionsExpanded(previous==='1');
}

function toast(t){const el=$('toast');el.textContent=translate(t);el.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),3300)}
const dateText=s=>formatDate(s);
const compact=n=>Math.round(n).toLocaleString(getNumberLocale());
const POSE_GROUPS={
 chest:['chest_up','chest','serratus'],
 shoulders:['delt_front','delt_side','delt_rear','traps_upper'],
 back:['lats','traps_mid','traps_lower','erectors','traps_upper'],
 legs:['quads','adductors','glutes','glute_med','hamstrings','gastrocnemius','soleus','tibialis'],
 arms:['biceps','brachialis','triceps','forearm_front','forearm_back'],
 core:['abs_upper','abs_lower','obliques','hip_flexor']
};
function musclePoseCategory(id){
 const base=baseOf(id);
 if(POSE_GROUPS.chest.includes(base))return 'chest';
 if(POSE_GROUPS.shoulders.includes(base))return 'shoulders';
 if(POSE_GROUPS.back.includes(base))return 'back';
 if(POSE_GROUPS.legs.includes(base))return 'legs';
 if(POSE_GROUPS.arms.includes(base))return 'arms';
 if(POSE_GROUPS.core.includes(base))return 'core';
 return 'balanced';
}
function dominantPoseFromTotals(totals={},selectedId=''){
 if(selectedId)return musclePoseCategory(selectedId);
 const scores=Object.fromEntries(Object.entries(POSE_GROUPS).map(([k,ids])=>[k,ids.reduce((sum,id)=>sum+(Number(totals[id])||0),0)]));
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
 return ranked[0]&&ranked[0][1]>0?ranked[0][0]:'balanced';
}
function route(name){if(!['dashboard','record','history','progress','nutrition','vitals','settings'].includes(name))return;activeRoute=name;for(const el of document.querySelectorAll('.page'))el.classList.toggle('active',el.id==='page-'+name);for(const el of document.querySelectorAll('[data-route]'))el.classList.toggle('active',el.dataset.route===name);$('page-title').textContent={dashboard:'ダッシュボード',record:'トレーニング記録',history:'トレーニング履歴',progress:'成長・分析',nutrition:'カロリー管理',vitals:'血圧・心拍数',settings:'設定・データ'}[name];if(name==='dashboard')renderDashboard();if(name==='history')renderHistory();if(name==='progress')renderProgress();if(name==='nutrition')renderNutrition();if(name==='vitals')renderVitals();if(name==='settings')renderSettings();window.scrollTo({top:0,behavior:'instant'});}
function save(){return saveStore(state).then(v=>{state=v;$('storage-status').textContent=storageMode()==='indexeddb'?'● IndexedDB・端末内保存':'● 代替保存（端末内）';return v}).catch(e=>{toast('保存失敗：'+e.message);throw e});}
function viewLogs(){return filterPeriod(state.logs,period)}
function renderDashboard(){const logs=viewLogs(),v=summary(logs),p=state.profile;
 $('m-sessions').textContent=v.sessions;$('m-sets').textContent=compact(v.sets);$('m-tonnage').textContent=compact(v.tonnage);$('m-energy').textContent=v.totalEnergy===null?'—':compact(v.totalEnergy)+(v.partial?'*':'');
 $('profile-summary').textContent=(p.weight||'—')+' kg · '+(p.height||'—')+' cm · '+translate(p.sex==='male'?'男性':p.sex==='female'?'女性':'中立')+' · '+translate(GOALS[p.goal]||'未設定');
 const model=p.display==='auto'?(p.sex==='none'?'neutral':p.sex):p.display;
 const recent=filterPeriod(state.logs,14),latestDay=recent.map(x=>x.date).sort().at(-1);
 const poseSource=Object.values(v.muscles).some(x=>Number(x)>0)?v.muscles:(latestDay?summary(recent.filter(l=>l.date===latestDay)).muscles:{});
 const dashboardPose='balanced';
 $('svg-front').innerHTML=anatomySVG('front',model,v.muscles,selectedMuscle,{prefix:'heat',pose:dashboardPose});$('svg-back').innerHTML=anatomySVG('back',model,v.muscles,selectedMuscle,{prefix:'heat',pose:dashboardPose});$('detail-muscle-select').value=selectedMuscle||'';
 const order=Object.entries(v.muscles).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);$('muscle-ranking').innerHTML=order.length?order.slice(0,8).map(([k,v])=>`<div class="barline"><span>${safeText(muscleLabel(k))}</span><span class="bar-bg"><span class="bar-inner" style="display:block;width:${Math.min(100,v/Math.max(order[0][1],1)*100).toFixed(0)}%"></span></span><b>${v.toFixed(1)}</b></div>`).join('')+'<p class="fine">直接1.0、補助0.5のセット相当値。部位間で重複します。</p>':'<div class="empty">トレーニングを追加すると部位別の分布が表示されます。</div>';
 renderDashboardEnergy();renderDailyEvaluation();renderRecovery();renderTomorrow();
 $('feedback').innerHTML=feedback(logs,p.goal).map(t=>`<p>${safeText(t)}</p>`).join('');showMuscle(logs,v.muscles);renderSuggestions('activity-suggestions',selectedMuscle,localToday());}
function renderDailyEvaluation(){
 const el=$('evaluation-day'),dates=[...new Set(state.logs.map(x=>x.date))].sort((a,b)=>b.localeCompare(a));
 const chosen=dates.includes(el.value)?el.value:(dates[0]||'');
 el.innerHTML=dates.length?dates.map(d=>`<option value="${safeText(d)}">${safeText(dateText(d))}</option>`).join(''):'<option value="">記録なし</option>';
 el.value=chosen;
 const result=chosen?evaluateTrainingDay(state.logs,chosen,state.evaluationLevel,state.profile.goal):null;
 const panel=$('evaluation-content');
 if(!result){panel.innerHTML='<div class="empty">記録がありません。運動した日のデータを追加してください。</div>';return;}
 const observations=result.factors.length?result.factors.map(x=>`<li data-severity="${x.severity}"><strong>${safeText(x.category)}：</strong>${safeText(x.detail)}<small>${safeText(x.advice)}</small></li>`).join(''):'<li>数値上の大きな調整候補はありません。フォーム、体調、次回の成果も確認しましょう。</li>';
 panel.innerHTML=`<div class="evaluation-top"><div class="evaluation-score"><strong>${result.score}</strong><small>/ 100 · 独自の点検指標</small></div><div><span class="evaluation-level-chip">${result.levelLabel} モード</span><h4>${safeText(result.label)}</h4><p>${safeText(result.tone)}</p></div></div><div class="evaluation-summary"><span>${result.sessions} セッション</span><span>${result.exercises} 種目</span><span>${result.sets} 実セット</span></div><p class="fine">${result.positives.map(safeText).join(' ')}</p><ul class="evaluation-issues">${observations}</ul><p class="fine">${safeText(result.modeExplanation)}</p>`;
}
function showMuscle(logs,totals){
 const id=selectedMuscle;if(!id){$('muscle-detail').innerHTML='<strong>部位を選択してください</strong><small>刺激セット相当と元の種目を表示します。</small>';return}
 const base=baseOf(id),share=DETAIL_IDS[id]?.share||1;
 const rows=logs.flatMap(l=>(l.exercises||[]).filter(e=>e.primary.includes(base)||e.secondary.includes(base)).map(e=>({date:l.date,name:e.displayName||e.name,sets:e.groups.reduce((v,g)=>v+g.sets,0),ratio:(e.primary.includes(base)?1:.5)*share})));
 const caveat=DETAIL_IDS[id]?'<br>※ この細分値は親筋群の記録を便宜的に分配した推定値です。各筋頭への実刺激を計測したものではありません。':'';
 $('muscle-detail').innerHTML=`<strong>${safeText(muscleLabel(id))}：${displayValue(id,totals).toFixed(1)} セット相当</strong><small>${rows.length?rows.map(x=>`${safeText(x.date)} ${safeText(x.name)}：${x.sets}セット × ${x.ratio.toFixed(2)}`).join('<br>'):'該当記録はありません'}${caveat}</small>`;
}
function renderSuggestions(targetId,muscleId,asOf){
 const el=$(targetId);if(!muscleId){el.innerHTML='<div class="suggestion-empty">筋肉をタップすると、おすすめの種目と回復状況を表示します。</div>';el.removeAttribute('data-state');return;}
 const canonical=baseOf(muscleId),recovery=recoveryForecast(state.logs,asOf,state.profile,state.trainingPrefs?.extraRestDays||0).items[canonical];
 const model=recommendForMuscle(canonical,recovery,state.profile.goal);
 if(!model){el.textContent='選択した筋肉は登録されていません';return;}
 el.dataset.state=model.status;
 const badge=model.status==='warning'?'赤：警告':model.status==='caution'?'黄：注意':'青：記録上は可';
 el.innerHTML=`<div class="suggestion-head"><h4>${safeText(muscleLabel(muscleId)||model.name)} の種目候補</h4><span class="suggestion-tag">${badge}</span></div><p class="suggestion-desc">${safeText(model.headline)}。${safeText(model.guidance)}</p><div class="suggestion-items">${model.items.map((x,i)=>`<div class="suggestion-item"><strong>${i+1}. ${safeText(x.name)}</strong><small>${safeText(x.level)} · ${safeText(x.note)}</small></div>`).join('')}</div><p class="suggestion-prescription">${model.canTrainNormally?'目安：':'回復後の候補：'}${safeText(model.prescription)}</p><p class="fine">種目は例示です。関節痛・強い筋肉痛・体調不良がある日は無理をせず、専門家の助言を優先してください。青色も医学的な運動許可ではありません。</p>`;
}
const recoveryPalette={ready:'#419de5',caution:'#f1c24d',warning:'#f06473'};
function renderRecovery(){
 const asOf=val('recovery-date')||localToday();
 const f=recoveryForecast(state.logs,asOf,state.profile,state.trainingPrefs?.extraRestDays||0),p=state.profile;
 const model=p.display==='auto'?(p.sex==='none'?'neutral':p.sex):p.display;
 const colors={},titles={},recoveryPoseTotals={};
 for(const [id,x] of Object.entries(f.items)){
  colors[id]=recoveryPalette[x.state];
  titles[id]=`${x.name}：${x.statusLabel}、残り休養目安 ${x.remainingDays}日${x.hasRecord?'':'（記録なし）'}`;
  recoveryPoseTotals[id]=x.lastExposure||0;
 }
 const recoveryPose='balanced';
 for(const side of ['front','back'])$("recovery-"+side).innerHTML=anatomySVG(side,model,{},selectedRecoveryMuscle,{colors,titles,prefix:'recovery',pose:recoveryPose});
 $('recovery-summary').innerHTML=[['warning','警告'],['caution','注意'],['ready','記録上は可']].map(([status,label])=>`<div class="recovery-stat"><small>${label}</small><strong style="color:${recoveryPalette[status]}">${f.counts[status]}<small>部位</small></strong></div>`).join('');
 const active=Object.values(f.items).filter(x=>x.hasRecord).sort((a,b)=>b.remainingDays-a.remainingDays||b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name));
 $('recovery-list').innerHTML=active.length?active.map(x=>`<div class="recovery-entry" data-state="${x.state}"><span>${safeText(x.name)}<small>最終記録 ${safeText(x.lastDate)} ／ ${x.lastExposure}セット相当</small></span><b>${x.remainingDays?`残り約${x.remainingDays}日`:'記録上は可'}</b></div>`).join(''):'<div class="empty">この判定日までに部位別の筋トレ記録がありません。青は十分に回復した証拠ではありません。</div>';
 $('recovery-detail-muscle-select').value=selectedRecoveryMuscle||'';const x=selectedRecoveryMuscle?f.items[baseOf(selectedRecoveryMuscle)]:null;
 $('recovery-detail').innerHTML=x?`<strong>${safeText(displayNames[selectedRecoveryMuscle]||x.name)}：${x.statusLabel}</strong><small>${x.hasRecord?`最終トレーニング ${x.lastDate}／${x.lastExposure}セット相当。推定休養日数 ${x.restDays}日、判定日時点で残り約${x.remainingDays}日。`:'この部位の履歴なし。青色は回復完了の保証ではありません。'}</small>`:'<strong>筋肉をタップ</strong><small>最後のトレーニングと休養目安を表示します。</small>';
 renderSuggestions('recovery-suggestions',selectedRecoveryMuscle,asOf);
}
function renderTomorrow(){
 const field=$('tomorrow-base-date');if(!field)return;
 const asOf=field.value||localToday();let result;
 try{result=planToday({logs:state.logs,profile:state.profile,excluded:state.excludedMuscles||[],asOf,maxExercises:5,extraRestDays:state.trainingPrefs?.extraRestDays||0});}
 catch(e){$('tomorrow-plan').textContent='基準日を確認してください：'+e.message;return;}
 $('tomorrow-target-date').textContent=result.today.replaceAll('-','/');
 const rir=state.trainingPrefs?.targetRir||2;
 const cards=result.selected.map((x,i)=>{
  const exercises=x.exercises.map((e,j)=>`<li><b>${safeText(exerciseLabel(e.name))}</b><small>${safeText(e.note)} · ${safeText(state.profile.goal==='strength'?'3〜6回':'8〜15回')}×まず2セット・RIR ${rir}目標</small></li>`).join('');
  return `<div class="tomorrow-card"><div class="tomorrow-card-head"><span class="suggestion-tag">${i+1} · 青／記録上は可</span><h4>${safeText(x.name)}</h4></div><p>過去14日：刺激 ${x.volume14.toFixed(1)}セット相当・記録 ${x.frequency14}日</p><ul>${exercises}</ul></div>`;
 }).join('');
 const exerciseCount=result.selected.reduce((total,x)=>total+x.exercises.length,0);
 $('tomorrow-plan').innerHTML=`<div class="tomorrow-metrics"><span>過去14日 <b>${result.trainingDays}日</b></span><span>実施 <b>${result.totalSets}セット</b></span><span>今日の候補 <b>${result.selected.length}/2部位・${exerciseCount}/5種目</b></span></div><p class="fine">${safeText(result.note)} ${safeText(result.reason)}</p>${result.restSuggested?'<div class="warning-inline">今日は休養、または軽い活動を優先してください。疼痛・強い疲労がある場合は記録の色に関わらず調整してください。</div>':`<div class="tomorrow-cards">${cards}</div>`}<p class="fine">選択した日の前日まで14日分の記録と当日の記録上の回復状態を参照します。おすすめは2部位・合計最大5種目、RIR ${rir}を目標に本人の体調で調整してください。未記録の運動・睡眠・痛みを判断できません。遺伝情報からの数値推定は行いません。</p>`;
}
function renderExclusions(){
 const list=new Set(state.excludedMuscles||[]);
 $('exclusion-count').textContent=`${list.size}部位を除外`;
 $('exclusion-list').innerHTML=Object.entries(TRAINABLE_GROUPS).map(([group,ids])=>`<fieldset class="exclude-group"><legend>${safeText(group)}</legend><div class="exclude-options">${ids.map(id=>`<label class="exclude-option"><input type="checkbox" data-exclude="${id}" ${list.has(id)?'checked':''}><span>${safeText(names[id])}</span></label>`).join('')}
 ${ids.flatMap(id=>Object.values(DETAIL_IDS).filter(x=>x.base===id)).map(x=>`<label class="exclude-option sub"><input type="checkbox" data-exclude="${x.id}" ${list.has(x.id)?'checked':''}><span>${safeText(x.name)}</span></label>`).join('')}</div></fieldset>`).join('');
}
async function saveExclusions(){
 const old=[...(state.excludedMuscles||[])];
 state.excludedMuscles=[...$('exclusion-list').querySelectorAll('input[data-exclude]:checked')].map(x=>x.dataset.exclude);
 try{await save();renderExclusions();renderTomorrow();toast(`${state.excludedMuscles.length}部位を候補から除外しました`)}
 catch(e){state.excludedMuscles=old;toast('保存に失敗しました：'+e.message)}
}
let exerciseSearchLimit=18;
function renderExerciseLookup(){
 const found=searchExerciseDictionary(val('exercise-catalog-search'),val('exercise-catalog-group')||'all');
 const listing=$('exercise-catalog-results');
 $('exercise-catalog-count').textContent=`${exerciseDictionaryCount}種目`;
 $('exercise-catalog-status').textContent=found.length?`${found.length}種目が一致しています。${Math.min(exerciseSearchLimit,found.length)}件を表示`:'条件に一致する種目はありません。別の名前や部位をお試しください。';
 listing.innerHTML=found.slice(0,exerciseSearchLimit).map(({i,exercise})=>`<div class="exercise-lookup-item"><div><strong>${safeText(exerciseLabel(exercise.n))}</strong><small>主な部位：${safeText(exercise.p.map(id=>muscleLabel(id)).join(' · '))}</small></div><button type="button" class="btn ghost compact" data-add-exercise="${i}" aria-label="${safeText(exercise.n)}を記録欄に追加">入力欄に追加</button></div>`).join('')+
 (found.length>exerciseSearchLimit?`<button type="button" class="btn secondary compact exercise-more" data-exercise-more="true">さらに表示（残り${found.length-exerciseSearchLimit}件）</button>`:'');
}
function invalidateTrainingAnalysis(){
 if(!pending)return;
 pending=null;ignoreUnmatched.clear();
 $('preview-count').textContent='再解析が必要';$('preview-summary').textContent='入力内容が変更されました。「入力を解析する」を押してから保存してください。';
 for(const id of ['preview-exercises','preview-cardio','preview-unmatched','review-alerts'])$(id).innerHTML='';
 $('save-session').disabled=true;
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
 if(mode==='replace'&&similar.length&&!askConfirm('同じ日付の既存記録をすべて置換します。よろしいですか？'))return;
 const next=state.logs.filter(l=>l.id!==editingId&&!(mode==='replace'&&l.date===day));next.push(item);state.logs=next;await save();toast('記録を保存しました');resetForm();route('dashboard');}catch(e){toast(e.message)}}
function editLog(id){const l=state.logs.find(x=>x.id===id);if(!l)return;resetForm();editingId=id;$('log-date').value=l.date;$('log-minutes').value=l.minutes??'';$('log-rest').value=l.restMinutes??'';$('log-intensity').value=l.intensity;$('log-text').value=l.raw;$('log-notes').value=l.notes||'';$('cancel-edit').hidden=false;route('record');analyze(); // preserve previously edited group values if source raw was unchanged
 if(l.exercises?.length&&l.raw.trim()===val('log-text').trim()){pending.exercises=structuredClone(l.exercises);pending.cardio=structuredClone(l.cardio);pending.unmatched=[];pending.warnings=[];renderPreview()}
 toast('編集中：'+dateText(l.date));}
async function deleteLog(id){const l=state.logs.find(x=>x.id===id);if(!l)return;if(!askConfirm(`${dateText(l.date)}の記録を削除しますか？\nこの操作は取り消せません。`))return;state.logs=state.logs.filter(x=>x.id!==id);await save();renderHistory();toast('記録を削除しました');}
function renderHistory(){
 const q=(val('history-query')||'').trim().toLowerCase();
 const list=$('history-list');
 const openDays=new Set([...list.querySelectorAll('details.training-day[open]')].map(el=>el.dataset.day));
 const openSessions=new Set([...list.querySelectorAll('details.training-session[open]')].map(el=>el.dataset.session));
 const logs=[...state.logs]
  .sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''))
  .filter(l=>!q||l.date.includes(q)||(l.exercises||[]).some(e=>(String(e.name||'')+' '+String(e.displayName||'')).toLowerCase().includes(q)));
 const groups=new Map();
 for(const log of logs){if(!groups.has(log.date))groups.set(log.date,[]);groups.get(log.date).push(log)}
 $('history-count').textContent=`${logs.length}件 / ${groups.size}日`;
 $('history-expand-all').disabled=logs.length===0;
 $('history-collapse-all').disabled=logs.length===0;
 list.innerHTML=logs.length?[...groups].map(([date,sessions])=>{
  const daySets=sessions.reduce((total,log)=>total+setsOf(log),0);
  const dayTonnage=sessions.reduce((total,log)=>total+tonnage(log),0);
  const open=q||openDays.has(date)?' open':'';
  return `<details class="training-day" data-day="${safeText(date)}"${open}>
   <summary class="training-day-summary"><span class="training-day-label"><strong>${safeText(dateText(date))}</strong><small>${sessions.length}件のトレーニング</small></span><span class="training-day-stats">${daySets}セット · 総挙上重量 ${compact(dayTonnage)}kg</span><span class="fold-chevron" aria-hidden="true"></span></summary>
   <div class="training-day-body">${sessions.map((l,i)=>{
    const kcal=energy(l),ev=evaluateTrainingDay(state.logs,l.date,state.evaluationLevel,state.profile.goal);
    const name=(l.exercises||[]).slice(0,2).map(x=>x.name).join(' · ')||(l.cardio||[]).map(x=>x.name).slice(0,2).join(' · ')||'有酸素運動';
    const other=(l.exercises||[]).length>2?' ほか':'';
    const sessionOpen=q||openSessions.has(l.id)?' open':'';
    return `<details class="training-session" data-session="${safeText(l.id)}"${sessionOpen}>
     <summary class="training-session-summary"><span class="training-session-label"><strong>${i+1}. ${safeText(name)}${other}</strong><small>${(l.exercises||[]).length}種目 · ${setsOf(l)}セット · ${compact(tonnage(l))}kg</small></span><span class="fold-chevron" aria-hidden="true"></span></summary>
     <div class="training-session-body"><div class="history-chips"><span>日別評価 ${ev?ev.score+'/100 · '+safeText(ev.label):'—'}（${safeText(LEVELS[state.evaluationLevel]||'普通')}）</span><span>挙上重量 ${compact(tonnage(l))}kg</span><span>筋トレ ${l.minutes??'—'}分</span><span>有酸素 ${(l.cardio||[]).reduce((x,c)=>x+(c.minutes||0),0)}分</span><span>消費 ${kcal.gross??'—'}kcal${kcal.partial?' *':''}</span></div>
      <details class="training-original"><summary>入力したトレーニング内容を表示</summary><pre>${safeText(l.raw||'')}</pre></details>
      ${l.notes?`<p class="fine">メモ：${safeText(l.notes)}</p>`:''}
      <div class="history-actions"><button class="btn ghost" data-edit="${safeText(l.id)}" type="button">編集する</button><button class="btn danger" data-delete="${safeText(l.id)}" type="button">削除</button></div></div>
     </details>`;
   }).join('')}</div>
  </details>`;
 }).join(''):'<div class="empty">条件に合う記録はありません。<br>「トレーニング記録」から追加できます。</div>';
}
function setHistoryExpanded(expand){
 for(const details of $('history-list').querySelectorAll('details.training-day,details.training-session'))details.open=Boolean(expand);
}
function svgChart(points,{suffix='',color='#5ee1bd',bar=false}={}){if(!points.length)return '<div class="empty">記録を追加するとグラフが表示されます。</div>';
 const max=Math.max(1,...points.map(x=>x.value||0)),w=460,h=195,left=26,top=18,inner=w-44,bottom=h-35;const y=v=>bottom-(v/max)*(bottom-top),x=i=>left+(points.length===1?inner/2:i*inner/(points.length-1));let content='';for(let i=0;i<=3;i++){const yy=y(max*i/3);content+=`<line class="gridline" x1="${left}" y1="${yy}" x2="${w-16}" y2="${yy}"/><text class="axis-text" x="2" y="${yy-3}">${Math.round(max*i/3)}</text>`}
 if(bar){const bw=Math.max(10,Math.min(38,inner/points.length*.6));content+=points.map((v,i)=>`<rect x="${x(i)-bw/2}" y="${y(v.value)}" width="${bw}" height="${bottom-y(v.value)}" fill="${color}" rx="4"/>`).join('')}
 else {content+=`<polyline class="path" points="${points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')}" stroke="${color}"/>`+points.map((p,i)=>`<circle class="marker" cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${safeText(p.label)} ${p.value}${suffix}</title></circle>`).join('')}
 const indices=points.length<=4?points.map((_,i)=>i):[0,Math.floor((points.length-1)/2),points.length-1];content+=indices.map(i=>`<text class="axis-text" x="${x(i)}" y="${h-9}" text-anchor="middle">${safeText(points[i].label.slice(5))}</text>`).join('');return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${safeText(points.map(p=>p.label+': '+p.value+suffix).join('、'))}">${content}</svg>`;}
function renderProgress(){const logs=[...state.logs].sort((a,b)=>a.date.localeCompare(b.date));$('tonnage-chart').innerHTML=svgChart(logs.slice(-20).map(l=>({label:l.date,value:tonnage(l)})),{suffix:'kg',bar:true});const ex=[...new Set(logs.flatMap(l=>l.exercises.map(e=>e.name)))];const chooser=$('e1rm-exercise'),old=chooser.value;chooser.innerHTML=ex.map(x=>`<option value="${safeText(x)}">${safeText(x)}</option>`).join('');const eligible=ex.find(name=>logs.some(l=>bestE1RM(l,name)!==null));chooser.value=ex.includes(old)&&logs.some(l=>bestE1RM(l,old)!==null)?old:(eligible||ex[0]||'');const name=chooser.value;const strength=logs.map(l=>({label:l.date,value:bestE1RM(l,name)})).filter(x=>x.value!==null);$('e1rm-chart').innerHTML=svgChart(strength.slice(-20),{suffix:'kg'});const weights=state.weights||[];$('weight-chart').innerHTML=svgChart(weights.slice(-20).map(w=>({label:w.date||localToday(),value:Number(w.weight)||0})),{suffix:'kg'});
 const week={};for(const l of logs){const d=new Date(l.date+'T12:00:00'),monday=new Date(d);monday.setDate(d.getDate()-(d.getDay()+6)%7);const k=localToday(monday);week[k]=(week[k]||0)+setsOf(l)}$('weekly-chart').innerHTML=svgChart(Object.entries(week).slice(-16).map(([label,value])=>({label,value})),{suffix:'set',bar:true});renderForecast();}
function setForecastControls(){
 const plan=state.forecastPlan||{};
 $('forecast-intake').value=plan.dailyIntake===''||plan.dailyIntake==null?'':plan.dailyIntake;
 $('forecast-mode').value=plan.strengthMode||'trend';
 $('forecast-rate').value=plan.strengthMonthlyPct??0;
 $('forecast-exercise').dataset.saved=plan.exercise||'';
}
function getForecastControls(){return normalizeForecastSettings({dailyIntake:val('forecast-intake'),strengthMode:val('forecast-mode'),strengthMonthlyPct:val('forecast-rate'),exercise:val('forecast-exercise')})}
function renderForecast(){
 const el=$('forecast-exercise');if(!el)return;
 const namesForStrength=[...new Set(state.logs.flatMap(l=>l.exercises.map(ex=>ex.name)))].filter(name=>state.logs.some(l=>bestE1RM(l,name)!==null));
 const current=el.value||el.dataset.saved||state.forecastPlan?.exercise||'';
 el.innerHTML=namesForStrength.length?namesForStrength.map(x=>`<option value="${safeText(x)}">${safeText(x)}</option>`).join(''):'<option value="">種目の重量記録なし</option>';
 el.value=namesForStrength.includes(current)?current:namesForStrength[0]||'';
 $('forecast-rate-label').hidden=val('forecast-mode')!=='manual';
 let forecast;
 try{forecast=forecastScenario(state,getForecastControls());}
 catch(e){$('forecast-context').textContent='入力値を確認してください：'+e.message;return;}
 const f=forecast,fmt=(v,d=1)=>v===null?'—':Number(v).toFixed(d);
 $('forecast-context').textContent=`過去7日：${f.sessionsInWeek}セッション。運動による平均追加消費 ≈ ${f.averageNet}kcal/日（推定）。${f.maintenance!==null?'推定維持量 ≈ '+f.maintenance+'kcal/日。':'基礎代謝の推定にはプロフィールの性別が必要です。'} ${f.strength.base!==null?'選択種目の直近推定1RM '+f.strength.base+'kg。':'1RM記録がありません。'}`;
 $('forecast-rows').innerHTML=f.results.map(v=>`<tr><th scope="row">${v.days}日後<small>${safeText(v.date)}</small></th><td>${fmt(v.weight)}${v.weightRange?`<small>参考幅 ${fmt(v.weightRange[0])}〜${fmt(v.weightRange[1])}</small>`:''}</td><td>${fmt(v.bodyFat)}${v.bodyFatRange?`<small>参考幅 ${fmt(v.bodyFatRange[0])}〜${fmt(v.bodyFatRange[1])}</small>`:''}</td><td>${fmt(v.e1rm)}${v.e1rmRange?`<small>参考幅 ${fmt(v.e1rmRange[0])}〜${fmt(v.e1rmRange[1])}</small>`:''}</td></tr>`).join('');
 $('forecast-weight-chart').innerHTML=svgChart((f.profile.weight!==null?[{label:f.asOf,value:f.profile.weight}]:[]).concat(f.results.filter(x=>x.weight!==null).map(x=>({label:x.date,value:x.weight}))),{suffix:'kg'});
 $('forecast-rm-chart').innerHTML=svgChart((f.strength.base!==null?[{label:f.asOf,value:f.strength.base}]:[]).concat(f.results.filter(x=>x.e1rm!==null).map(x=>({label:x.date,value:x.e1rm}))),{suffix:'kg'});
 $('forecast-notes').innerHTML=f.notes.map(n=>`<p>• ${safeText(n)}</p>`).join('');
}
async function saveForecastPlan(){
 try{state.forecastPlan=getForecastControls();await save();renderForecast();toast('未来予測の条件をこの端末に保存しました');}
 catch(e){toast(e.message)}
}
function energyFormat(n){return n===null?'—':typeof n==='string'?n:Math.round(n).toLocaleString('ja-JP')}
function renderDashboardEnergy(){
 const d=dayCalorieBalance(state,localToday()),el=$('dashboard-energy-summary');
 const exerciseText=d.hasExerciseRecords?(d.knownExerciseSessions?`${energyFormat(d.netEx)}kcal（推定追加消費）`:'未算出（運動時間・体重を確認）'):'今日の運動記録なし';
 if(d.bmr===null){
  el.innerHTML=`<strong>運動記録：</strong>${exerciseText}<p class="fine">推定基礎代謝と食事目標の表示には、プロフィールの身長・体重・年齢・性別を設定してください。運動消費は別途集計されています。</p>`;return;
 }
 el.innerHTML=`推定基礎代謝 <b>${energyFormat(d.bmr)}kcal</b> / 日 · 食事目標 <b>${energyFormat(d.target)}kcal</b> · 摂取 ${d.hasMeals?'<b>'+energyFormat(d.intake)+'kcal</b>（記録分）':'未記録'}<p class="fine">今日の運動による推定追加消費は ${exerciseText}、摂取目標に反映する量は ${energyFormat(d.exerciseAddition)}kcal（${Math.round(d.plan.exerciseCredit*100)}%）。</p>`;
}
const historicalValue=(value,range)=>value===null&&range?`${energyFormat(range[0])}〜${energyFormat(range[1])}`:energyFormat(value);
const mealLabels={breakfast:'朝食',lunch:'昼食',dinner:'夕食',snack:'間食'};
let editingMealId=null;
function renderNutrition(){
 const dt=val('nutrition-date')||localToday(),d=dayCalorieBalance(state,dt);
 const exerciseKnown=d.knownExerciseSessions>0,exerciseText=exerciseKnown?d.netEx:(d.hasExerciseRecords?null:0);
 const creditedText=exerciseKnown?d.exerciseAddition:(d.hasExerciseRecords?null:0);
 const sexQuick=$('nutr-quick-sex');if(sexQuick)sexQuick.value=state.profile.sex||'none';
 for(const [id,v] of [['nutr-bmr',historicalValue(d.bmr,d.rmrRange)],['nutr-baseline',historicalValue(d.baseline,d.baselineRange)],['nutr-extra',exerciseText],['nutr-credited',creditedText],['nutr-target',d.target],['nutr-intake',d.hasMeals?d.intake:null],['nutr-remaining',d.remaining]])$(id).textContent=energyFormat(v);
 const dateOptions=[...new Set(state.logs.map(x=>x.date))].sort((a,b)=>b.localeCompare(a));
 const nav=$('nutrition-workout-day');if(nav){nav.innerHTML='<option value="">記録日を選択</option>'+dateOptions.map(x=>`<option value="${safeText(x)}">${safeText(dateText(x))}</option>`).join('');nav.value=dateOptions.includes(dt)?dt:'';}
 const breakdown=$('nutr-exercise-breakdown');
 if(d.hasExerciseRecords){
  breakdown.innerHTML=`<div><small>選択日の筋トレ（推定追加消費）</small><strong>${exerciseKnown?energyFormat(d.strengthNet):'—'} kcal</strong></div><div><small>選択日の有酸素（推定追加消費）</small><strong>${exerciseKnown?energyFormat(d.cardioNet):'—'} kcal</strong></div><div><small>運動総消費（安静時分を含む）</small><strong>${exerciseKnown?energyFormat(d.grossEx):'—'} kcal</strong></div><p class="fine">実際の運動追加消費は推定${energyFormat(exerciseText)}kcal（100％）。食事目標にはその${Math.round(d.plan.exerciseCredit*100)}％、${energyFormat(creditedText)}kcalを反映。筋トレと有酸素の追加消費は安静時相当を除外しており、二重計上を避けています。</p>`;
 }else breakdown.innerHTML='<p class="fine">選択日にトレーニング記録はありません。上の「トレーニング記録がある日へ移動」で記録日を選択できます。</p>';
 $('nutr-progress').style.width=d.target>0&&d.hasMeals?Math.min(100,d.intake/d.target*100).toFixed(1)+'%':'0%';
 const notices=[];
 if(d.rmrRange){notices.push('性別が未選択のため、表示した基礎代謝と日常活動込みの数値は男女の式による参考範囲です。プロフィールで式を選択すると単一の推定値になります。');}
 if(d.bodyProfileSource==='current-profile-fallback'&&dt<localToday())notices.push('過去の年齢・身長・性別の履歴がありません。現在のプロフィールを暫定使用しています。過去時点の数値と異なる可能性があります。');
 if(d.weightSource==='workout-weight')notices.push('選択日の基礎代謝にはトレーニング記録の体重（'+d.profileUsed.weight+'kg）を使っています。');
 else if(d.weightSource==='weight-record')notices.push('選択日の基礎代謝には過去の体重記録（'+d.profileUsed.weight+'kg）を使っています。');
 if(d.bmr===null&&!d.rmrRange)notices.push('基礎代謝の推定には19〜78歳の年齢・身長・体重が必要です。基礎代謝未確定でも運動消費は独立して表示します。');
 else notices.push(`計算内訳：RMR ${energyFormat(d.bmr)} × 活動係数 ${d.plan.activityFactor} ＋ 運動の安静時超過分 ${energyFormat(d.netEx)} × 反映率 ${Math.round(d.plan.exerciseCredit*100)}% ＋ 目標調整 ${d.plan.goalAdjustment>0?'+':''}${d.plan.goalAdjustment}kcal。`);
 if(!d.hasMeals)notices.push('食事未記録：摂取量と残りカロリーを表示しません。');
 else notices.push('残りは「記録済みの食事」に対する数値です。食事の入力漏れがある場合は実際の収支ではありません。');
 if(d.partial)notices.push('未確定の運動記録があり、運動による消費量の一部が計算に含まれていません。');
 if(d.target!==null&&d.target<d.bmr)notices.push('食事目標が推定基礎代謝を下回ります。目標の強度と栄養状態を再確認してください。');
 notices.push('運動消費・RMR・日常活動の係数は個人差のある推定値です。体重推移などを確認しながら調整してください。');
 $('nutr-caveat').textContent=notices.join(' ');
 const meals=state.meals.filter(m=>m.date===dt);
 $('meal-count').textContent=meals.length+'件';$('daily-meal-date-label').textContent=dateText(dt);
 renderDailyPFC(dt);
 $('meal-list').innerHTML=meals.length?meals.map(m=>`<div class="meal-item"><div><strong data-no-translate>${safeText(m.name)}</strong><small>${mealLabels[m.mealType]||'食事'}${m.protein!==null?' · P '+m.protein+'g':''}${m.fat!==null?' · F '+m.fat+'g':''}${m.carbs!==null?' · C '+m.carbs+'g':''}</small></div><div class="meal-right"><b>${energyFormat(m.kcal)} kcal</b><button class="btn secondary compact" data-edit-meal="${safeText(m.id)}" aria-label="食事記録を編集">編集</button><button class="btn danger" data-delete-meal="${safeText(m.id)}" aria-label="食事記録を削除">削除</button></div></div>`).join(''):'<div class="empty">この日の食事はまだ登録されていません。</div>';
 renderMealHistory();
 renderPersonalFoods();
}

function renderMealHistory(){
 const els=['meal-history-query','meal-history-period','meal-history-type','meal-history-from','meal-history-to'];if(els.some(id=>!$(id)))return;
 const found=filterMeals(state.meals,{query:val('meal-history-query'),period:val('meal-history-period'),type:val('meal-history-type'),from:val('meal-history-from'),to:val('meal-history-to'),today:localToday()});
 const days=groupMeals(found);$('meal-history-count').textContent=`${found.length}件 / ${days.length}日`;
 $('meal-history-summary').innerHTML=found.length?`<span>検索結果の合計 <b>${compact(found.reduce((a,m)=>a+m.kcal,0))} kcal</b></span><span>食事 ${found.length}件</span><span>日数 ${days.length}日</span>`:'<span>指定した条件の記録はありません。</span>';
 const previousOpen=new Set([...$('meal-history-list').querySelectorAll('details.meal-history-day[open]')].map(x=>x.dataset.mealDay));
 const isFiltering=Boolean((val('meal-history-query')||'').trim());
 $('meal-history-list').innerHTML=days.map(day=>`<details class="meal-history-day" data-meal-day="${safeText(day.date)}" ${(isFiltering||previousOpen.has(day.date))?'open':''}><summary class="meal-history-day-header"><strong>${safeText(dateText(day.date))}</strong><span>${day.entries.length}件 · ${compact(day.kcal)} kcal${day.macroComplete?` · P ${day.protein.toFixed(1)}g F ${day.fat.toFixed(1)}g C ${day.carbs.toFixed(1)}g`:' · PFC一部未入力'}</span><span class="fold-chevron" aria-hidden="true"></span></summary><div class="meal-history-day-body"><div class="meal-history-day-actions"><button type="button" class="btn ghost compact" data-meal-go-date="${safeText(day.date)}">この日の収支</button></div>${day.entries.map(m=>`<div class="meal-history-entry"><div class="meal-history-entry-head"><div><strong data-no-translate>${safeText(m.name)}</strong><small>${mealLabels[m.mealType]} · ${energyFormat(m.kcal)} kcal${m.manualOverride?' · 手動合計':''}</small></div><button type="button" class="btn secondary compact" data-edit-meal="${safeText(m.id)}">編集</button></div><details><summary>材料・栄養の記録を開く</summary><div class="meal-history-detail"><p>たんぱく質 ${m.protein??'未入力'}g ／ 脂質 ${m.fat??'未入力'}g ／ 炭水化物 ${m.carbs??'未入力'}g</p>${m.rawText?`<p class="meal-raw" data-no-translate>${safeText(m.rawText)}</p>`:''}${m.foodItems?.length?`<ul>${m.foodItems.map(i=>`<li><span data-no-translate>${safeText(i.label)}</span>${i.excluded?'（除外）':''} · ${i.nutrients?.kcal??'未計上'} kcal / P ${i.nutrients?.protein??'—'}g F ${i.nutrients?.fat??'—'}g C ${i.nutrients?.carbs??'—'}g</li>`).join('')}</ul>`:'<p>食品別明細のない手入力記録です。</p>'}${m.notes?`<p>メモ：<span data-no-translate>${safeText(m.notes)}</span></p>`:''}</div></details></div>`).join('')}</div></details>`).join('')||'<div class="empty">過去の食事記録はありません。期間・食事区分を変更して確認できます。</div>';
}
function closeMealEditor(){editingMealId=null;$('meal-edit-panel').hidden=true}
function startMealEdit(id){
 const m=state.meals.find(x=>x.id===id);if(!m)return toast('対象の食事が見つかりません');
 editingMealId=id;$('meal-edit-panel').hidden=false;
 const fields={date:m.date,type:m.mealType,name:m.name,kcal:m.kcal,protein:m.protein,fat:m.fat,carbs:m.carbs,raw:m.rawText,notes:m.notes};
 for(const [key,v] of Object.entries(fields))$('meal-edit-'+key).value=v??'';
 $('meal-edit-message').textContent=`${dateText(m.date)}の「${m.name}」を編集中。変更は保存するまで反映されません。`;
 $('meal-edit-items').innerHTML=m.foodItems?.length?`<h4>保存済み食品別明細（${m.foodItems.length}品）</h4>${m.foodItems.map((item,i)=>`<div class="meal-edit-item"><label>食品名<input data-edit-item="${i}" data-edit-key="label" type="text" maxlength="300" value="${safeText(item.label)}"></label><div class="meal-edit-item-grid">${[['kcal','kcal'],['protein','P (g)'],['fat','F (g)'],['carbs','C (g)']].map(([k,t])=>`<label>${t}<input data-edit-item="${i}" data-edit-key="${k}" type="number" min="0" max="15000" step="0.1" value="${item.nutrients?.[k]??''}"></label>`).join('')}</div><label class="meal-edit-exclude"><input data-edit-item="${i}" data-edit-key="excluded" type="checkbox" ${item.excluded?'checked':''}>計上から除外</label></div>`).join('')}`:'<div class="info">この食事は合計値のみの記録です。食事名・原文・カロリー・PFCを編集できます。</div>';
 $('meal-edit-recalc').hidden=!m.foodItems?.length;
 $('meal-edit-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function collectEditedFoodItems(m){
 const items=structuredClone(m.foodItems||[]);
 if(!items.length)return items;
 for(const element of $('meal-edit-items').querySelectorAll('[data-edit-item]')){
  const i=Number(element.dataset.editItem),key=element.dataset.editKey,item=items[i];if(!item)throw Error('食品明細を確認してください');
  if(key==='label'){item.label=element.value.trim();if(!item.label)throw Error('食品名を空欄にできません');}
  else if(key==='excluded')item.excluded=element.checked;
  else {const text=element.value.trim();if(text!==''&&(!Number.isFinite(Number(text))||Number(text)<0||Number(text)>15000))throw Error('食品の栄養値が不正です');item.nutrients[key]=text===''?null:Number(text);}
 }
 return items;
}
function recalculateMealEditor(){
 if(!editingMealId)return;
 try{const m=state.meals.find(x=>x.id===editingMealId),items=collectEditedFoodItems(m),sum=calculateFoodTotals(items);
  if(!sum.count||!sum.allKnown)throw Error('カロリー未確認の食品があります。各食品の数値を入力してください。');
  for(const key of ['kcal','protein','fat','carbs'])$('meal-edit-'+key).value=sum.totals[key]??'';
  $('meal-edit-message').textContent='食品別明細を合計欄へ反映しました。内容を確認して保存してください。';
 }catch(e){toast('再計算できません：'+e.message)}
}
async function saveMealEdit(){
 if(!editingMealId)return;
 try{
  const original=state.meals.find(x=>x.id===editingMealId);if(!original)throw Error('記録が見つかりません');
  const foodItems=collectEditedFoodItems(original),fields={date:val('meal-edit-date'),mealType:val('meal-edit-type'),name:val('meal-edit-name'),rawText:val('meal-edit-raw'),notes:val('meal-edit-notes'),kcal:val('meal-edit-kcal'),protein:val('meal-edit-protein'),fat:val('meal-edit-fat'),carbs:val('meal-edit-carbs')};
  if(fields.kcal==='')throw Error('カロリーを入力してください');
  const update=normalizeMeal({...original,...fields,foodItems,id:original.id,createdAt:original.createdAt,updatedAt:new Date().toISOString()});
  if(foodItems.length&&original.rawText!==update.rawText&&!askConfirm('箇条書きの元データを変更しました。保存済みの食品別明細は自動で再解析されません。食品別の栄養値も確認しましたか？'))return;
  const sum=calculateFoodTotals(foodItems);
  const differs=sum.count&&Object.entries(sum.totals).some(([k,v])=>v!==null&&update[k]!==null&&Math.abs(Number(v)-Number(update[k]))>(k==='kcal'?1:0.11));
  if(differs&&!askConfirm('食品別明細の合計と入力した合計値が異なります。入力した合計を優先して保存しますか？'))return;
  update.manualOverride=!!differs;
  const before=state.meals;state.meals=updateMealById(state.meals,update);
  try{await save()}catch(e){state.meals=before;throw e}
  const moved=original.date!==update.date;closeMealEditor();
  if(moved)$('nutrition-date').value=update.date;
  renderNutrition();renderDashboardEnergy();toast('食事の修正を保存し、日別PFC・収支を更新しました');
 }catch(e){toast('食事を更新できません：'+e.message)}
}
async function saveCaloriePlan(){
 try{
  const plan=validateCaloriePlan({activityFactor:val('cal-activity'),exerciseCredit:val('cal-credit'),goalAdjustment:val('cal-adjust')});
  const old=state.caloriePlan;state.caloriePlan=plan;
  try{await save()}catch(e){state.caloriePlan=old;throw e}
  renderNutrition();renderDashboardEnergy();toast('カロリー目標を保存しました');
 }catch(e){toast(e.message)}
}
// Personal food dictionary: one exact user-entered serving, not nutrient values per 100g.
function mealFormValues(){return {name:val('meal-name'),kcal:val('meal-kcal'),protein:val('meal-protein'),fat:val('meal-fat'),carbs:val('meal-carbs'),mealType:val('meal-type')};}
function fillPersonalFood(food){
 if(!food)return;
 $('meal-name').value=food.name;
 for(const field of ['kcal','protein','fat','carbs'])$('meal-'+field).value=food[field]===null?'':String(food[field]);
 $('meal-type').value=food.mealType;
 $('meal-reuse-info').textContent=`「${food.name}」の前回の1食分を読み込みました。PFC・カロリーを修正してから保存できます。`;
}
function lookupPersonalFoodOnName(){
 const found=findPersonalFood(state.personalFoods||[],val('meal-name'));
 if(found)fillPersonalFood(found);
 else $('meal-reuse-info').textContent='新しい食事名です。カロリー・PFCを入力すると次回から再利用できます。';
}
function renderPersonalFoods(){
 const result=$('personal-food-results');if(!result)return;
 const all=state.personalFoods||[],q=(val('personal-food-search')||'').normalize('NFKC').toLocaleLowerCase().trim();
 const found=all.filter(f=>!q||f.name.normalize('NFKC').toLocaleLowerCase().includes(q)).slice(0,150);
 $('personal-food-count').textContent=all.length+'品目';
 // Updates are grouped by Japan-local calendar date; this is not a meal consumption date.
 const dateOf=f=>{try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(f.updatedAt))}catch{return String(f.updatedAt||'').slice(0,10)||'日付不明'}};
 const groups=new Map();for(const food of found){const key=dateOf(food);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(food)}
 const previousOpen=new Set([...result.querySelectorAll('details.personal-food-day[open]')].map(x=>x.dataset.foodDay));
 result.innerHTML=found.length?[...groups].sort(([a],[b])=>b.localeCompare(a)).map(([date,foods])=>`<details class="personal-food-day" data-food-day="${safeText(date)}" ${(q||previousOpen.has(date))?'open':''}><summary class="personal-food-day-summary"><strong>${safeText(dateText(date))} 更新</strong><span>${foods.length}品目</span><span class="fold-chevron" aria-hidden="true"></span></summary><div class="personal-food-day-body">${foods.map(f=>`<div class="personal-food-row"><div><strong data-no-translate>${safeText(f.name)}</strong><small>${f.kcal} kcal · P ${f.protein===null?'未入力':f.protein+'g'} / F ${f.fat===null?'未入力':f.fat+'g'} / C ${f.carbs===null?'未入力':f.carbs+'g'}</small></div><div class="personal-food-actions"><button class="btn secondary compact" type="button" data-use-personal-food="${safeText(f.name)}">呼び出す</button><button class="btn danger compact" type="button" data-delete-personal-food="${safeText(f.name)}">削除</button></div></div>`).join('')}</div></details>`).join(''):'<div class="empty">まだ登録した食事がありません。食事名とカロリー・PFCを入力して保存してください。</div>';
}

async function savePersonalFoodOnly(){
 const previous=state.personalFoods||[];
 try{
  state.personalFoods=savePersonalFood(previous,mealFormValues());await save();renderPersonalFoods();
  $('meal-reuse-info').textContent='辞書の値を更新しました。過去の食事記録は変更していません。';toast('マイ食事辞書を保存しました');
 }catch(e){state.personalFoods=previous;toast('辞書を保存できません：'+e.message)}
}
async function deletePersonalFood(name){
 const item=findPersonalFood(state.personalFoods||[],name);if(!item||!askConfirm(`「${item.name}」をマイ食事辞書から削除しますか？ 過去の食事記録は残ります。`))return;
 const before=state.personalFoods;state.personalFoods=before.filter(x=>x!==item);
 try{await save();renderPersonalFoods();toast('辞書から削除しました。過去の食事記録は残っています');}catch(e){state.personalFoods=before;toast('削除できません：'+e.message)}
}
function exportPersonalFoods(){download('MuscleAtlasPro_MyFoodDictionary_'+localToday()+'.json',JSON.stringify(personalFoodsBackup(state.personalFoods),null,2),'application/json');toast('マイ食事辞書のJSONを作成しました');}
async function importPersonalFoods(file){
 if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('辞書JSONは5MB以下にしてください。');
  const entries=readPersonalFoodsBackup(JSON.parse(await file.text())),merge=mergePersonalFoods(state.personalFoods,entries);
  if(!askConfirm(`食事辞書を${entries.length}品目読み込みました。追加${merge.added}品、既存のためスキップ${merge.skipped}品。同名の既存の値は変更しません。取り込みますか？`))return;
  const before=state.personalFoods;state.personalFoods=merge.foods;
  try{await save()}catch(error){state.personalFoods=before;throw error}
  renderPersonalFoods();toast(`食事辞書 ${merge.added}品を追加しました`);
 }catch(e){toast('食事辞書を取り込めません：'+e.message)}finally{$('import-personal-foods').value=''}
}
async function saveMeal(){
 try{
  const dt=val('nutrition-date')||localToday(),name=val('meal-name'),kcal=val('meal-kcal');
  if(kcal==='')throw Error('カロリーを入力してください。');
  const m=normalizeMeal({id:uid(),date:dt,name,kcal,mealType:val('meal-type'),protein:val('meal-protein'),fat:val('meal-fat'),carbs:val('meal-carbs')});
  if(state.meals.some(x=>x.date===m.date&&x.name===m.name&&x.kcal===m.kcal)){
   if(!askConfirm('同じ日に同じ食事名・カロリーの記録があります。別の食事として追加しますか？'))return;
  }
  const previousFoods=state.personalFoods||[];
  state.meals.push(m);state.personalFoods=savePersonalFood(previousFoods,m);
  try{await save()}catch(e){state.meals=state.meals.filter(x=>x.id!==m.id);state.personalFoods=previousFoods;throw e}
  for(const id of ['meal-name','meal-kcal','meal-protein','meal-fat','meal-carbs'])$(id).value='';
  $('meal-reuse-info').textContent=`「${m.name}」を食事記録とマイ食事辞書に保存しました。`;
  renderNutrition();renderDashboardEnergy();toast('食事記録とマイ食事辞書を保存しました');
 }catch(e){toast('食事を保存できません：'+e.message)}
}
async function deleteMeal(id){
 const m=state.meals.find(x=>x.id===id);if(!m||!askConfirm(`「${m.name}」を削除しますか？`))return;
 const old=[...state.meals];state.meals=state.meals.filter(x=>x.id!==id);
 try{await save()}catch(e){state.meals=old;throw e}
 if(editingMealId===id)closeMealEditor();renderNutrition();renderDashboardEnergy();toast('食事記録を削除しました');
}
const REST_ADJUST_WORDS={
 ja:{unit:'日',saved:'保存済み',pending:'未保存（保存ボタンを押してください）',saving:'保存中…',failed:'保存できませんでした'},
 en:{unit:'days',saved:'Saved',pending:'Not saved (tap Save)',saving:'Saving…',failed:'Could not save'},
 fr:{unit:'jours',saved:'Enregistré',pending:'Non enregistré (appuyez sur Enregistrer)',saving:'Enregistrement…',failed:'Échec de l’enregistrement'},
 it:{unit:'giorni',saved:'Salvato',pending:'Non salvato (premi Salva)',saving:'Salvataggio…',failed:'Impossibile salvare'},
 es:{unit:'días',saved:'Guardado',pending:'Sin guardar (pulsa Guardar)',saving:'Guardando…',failed:'No se pudo guardar'},
 de:{unit:'Tage',saved:'Gespeichert',pending:'Nicht gespeichert (Speichern drücken)',saving:'Wird gespeichert…',failed:'Speichern fehlgeschlagen'}
};
function restDaysText(days){const n=Number(days);return (n>0?'+':n<0?'−':'')+Math.abs(n)+' '+(REST_ADJUST_WORDS[getLanguage()]||REST_ADJUST_WORDS.ja).unit;}
function renderRestStepper(status='saved'){
 const n=Number($('train-extra-rest').value)||0,dict=REST_ADJUST_WORDS[getLanguage()]||REST_ADJUST_WORDS.ja;
 $('rest-offset-value').textContent=restDaysText(n);
 $('rest-offset-value').dataset.days=String(n);
 $('rest-stepper-status').textContent=dict[status]+'：'+restDaysText(n);
 $('rest-minus').disabled=n<=-3||status==='saving';$('rest-plus').disabled=n>=3||status==='saving';$('rest-reset').disabled=n===0||status==='saving';
 $('rest-stepper').dataset.status=status;
}
async function adjustRestDays(delta){
 if($('rest-stepper').dataset.status==='saving')return;
 const select=$('train-extra-rest'),before=Number(select.value)||0,next=Math.max(-3,Math.min(3,delta===null?0:before+delta));
 if(next===before)return;
 select.value=String(next);
 await saveTrainingPrefs();
}
function renderSettings(){$('app-language').value=state.uiLanguage||'ja';for(const k of ['height','weight','age','sex','fat','muscle','goal','level','display'])$('p-'+k).value=state.profile[k]??'';$('evaluation-level').value=state.evaluationLevel||'normal';$('train-target-rir').value=String(state.trainingPrefs?.targetRir||2);$('train-extra-rest').value=String(state.trainingPrefs?.extraRestDays??0);renderRestStepper('saved');renderExclusions();renderDNASettings();$('storage-message').textContent='保存方式：'+storageMode()+'。トレーニング・食事は端末ごとに保存。バックアップは暗号化されません。';}
async function saveProfile(){const p={};for(const k of ['height','weight','age','sex','fat','muscle','goal','level','display'])p[k]=val('p-'+k);try{validateProfile(p);if(Number(state.profile.weight)!==Number(p.weight)){state.weights=state.weights||[];const d=localToday();const record={date:d,weight:Number(p.weight),savedAt:new Date().toISOString()};state.weights=state.weights.filter(x=>x.date!==d).concat(record);}state.profile=p;state.profileHistory=state.profileHistory||[];
 const effectiveDate=localToday();state.profileHistory=state.profileHistory.filter(x=>x.date!==effectiveDate).concat({date:effectiveDate,profile:{...p}});
 await save();renderDashboard();if(activeRoute==='nutrition')renderNutrition();toast('プロフィールを保存しました');}catch(e){toast(e.message)}}
function download(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function exportJSON(){download('MuscleAtlasPro_Backup_'+localToday()+'.json',JSON.stringify(exportBackupObject(state,$('export-include-dna').checked),null,2),'application/json');toast($('export-include-dna').checked?'DNA遺伝子型を含むJSONを作成しました':'DNA遺伝子型を含まないJSONを作成しました');}
async function saveTrainingPrefs(){
 const prior=state.trainingPrefs;
 const pendingPrefs=normalizeTrainingPrefs({targetRir:val('train-target-rir'),extraRestDays:val('train-extra-rest')});
 if($('rest-stepper').dataset.status==='saving')return;
 renderRestStepper('saving');
 $('save-training-preferences').disabled=true;
 try{
  state.trainingPrefs=pendingPrefs;
  await save();
  renderDashboard();renderRecovery();renderTomorrow();
  renderRestStepper('saved');
  toast('負荷と回復の設定を保存しました');
 }catch(e){
  state.trainingPrefs=prior;
  $('train-extra-rest').value=String(prior?.extraRestDays??0);
  renderRestStepper('failed');
  toast('設定を保存できません：'+e.message);
 }finally{$('save-training-preferences').disabled=false;}
}
function renderDNASettings(){
 const markers=normalizeDNAMarkers(state.dnaMarkers);
 for(const gene of Object.keys(DNA_GENES))$('dna-'+gene).value=markers[gene];
 const count=Object.values(markers).filter(Boolean).length;
 $('dna-saved-status').textContent=count?`この端末に保存：${Object.entries(markers).filter(([,value])=>value).map(([gene,value])=>gene+' '+value).join(' / ')}（${count}/3件）`:'この端末にDNA遺伝子型の保存はありません。';
}
async function saveDNAMarkers(){
 const previous=state.dnaMarkers;
 const selected=normalizeDNAMarkers(Object.fromEntries(Object.keys(DNA_GENES).map(gene=>[gene,val('dna-'+gene)])));
 state.dnaMarkers=selected;
 try{await save();renderDNASettings();toast('DNA遺伝子型をこの端末に保存しました');}
 catch(e){state.dnaMarkers=previous;toast('DNA情報を保存できません：'+e.message)}
}
async function clearDNAMarkers(){
 if(!askConfirm('この端末のDNA遺伝子型3項目を削除しますか？（トレーニング記録は保持します）'))return;
 const previous=state.dnaMarkers;state.dnaMarkers=normalizeDNAMarkers({});
 try{await save();renderDNASettings();$('dna-report-text').value='';toast('DNA遺伝子型を削除しました');}
 catch(e){state.dnaMarkers=previous;toast('削除に失敗しました：'+e.message)}
}
function parseDNAReportText(){
 try{
  const report=parseExerciseReport(val('dna-report-text'));
  for(const [gene,geno] of Object.entries(report.markers))if(geno)$('dna-'+gene).value=geno;
  const detail=report.warnings.length?' '+report.warnings.join(' '):'';
  $('dna-saved-status').textContent=`文章から${report.matched}/3件を選択欄に反映（まだ保存していません）。内容を照合して「保存」を押してください。${detail}`;
  $('dna-report-text').value=''; // Do not retain names, addresses or examination numbers from pasted reports.
 }catch(e){$('dna-saved-status').textContent='解析できません：'+e.message;}
}
async function loadDNAFile(file){
 if(!file)return;
 const out=$('dna-result');
 try{
  if(file.size>5*1024*1024)throw Error('DNAテキストは5MB以内にしてください。大規模データはこの画面で扱いません');
  const result=scanDNA(await file.text());
  out.textContent=result.message;
 }catch(e){out.textContent='読み取り失敗：'+e.message;}
 finally{$('dna-file').value='';}
}
async function saveEvaluationLevel(){const v=val('evaluation-level');if(!LEVELS[v])return toast('評価基準を確認してください');const before=state.evaluationLevel;state.evaluationLevel=v;try{await save();renderDailyEvaluation();if(activeRoute==='history')renderHistory();toast('評価基準を '+LEVELS[v]+' に変更しました');}catch(e){state.evaluationLevel=before;toast('保存できませんでした')}}
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
   if(!askConfirm(`${data.logs.length}件を読み込みました。\n新規追加：${merged.added}件／登録済み日付のためスキップ：${merged.skipped}件。\nこの端末の既存記録は保持します。続行しますか？`))return;
   const oldState=state;try{state=merged.state;await save()}catch(e){state=oldState;throw e}
   toast(`${merged.added}件追加、${merged.skipped}件スキップしました`);
  }else if(mode==='replace'){
   if(!askConfirm(`${data.logs.length}件で全記録・プロフィールを上書きします。\n現在のデータは失われます。バックアップは保存しましたか？`))return;
   const oldState=state;try{state=data;await save()}catch(e){state=oldState;throw e}
   toast(`${data.logs.length}件を復元しました`);
  }else throw Error('取り込み方法を選択してください');
  closeMealEditor();pending=null;renderSettings();setForecastControls();$('cal-activity').value=state.caloriePlan.activityFactor;$('cal-credit').value=state.caloriePlan.exerciseCredit;$('cal-adjust').value=state.caloriePlan.goalAdjustment;renderDashboard();renderHistory();renderProgress();renderNutrition();renderVitals();
 }catch(e){toast('復元に失敗：'+e.message)}finally{$('import-json').value=''}
}
async function clearAll(){if(!askConfirm('すべての筋トレ履歴・身体プロフィールを削除します。続けますか？'))return;const word=askPrompt('完全削除するには「削除」と入力してください');if(word!==deletionPhrase())return;state=await clearStore();setLanguage('ja');try{localStorage.setItem('muscle-atlas-ui-language','ja')}catch{}closeMealEditor();resetForm();renderSettings();setForecastControls();$('cal-activity').value=state.caloriePlan.activityFactor;$('cal-credit').value=state.caloriePlan.exerciseCredit;$('cal-adjust').value=state.caloriePlan.goalAdjustment;renderDashboard();renderNutrition();renderVitals();toast('端末内のデータを削除しました');}

// v2.5 – daily macronutrients, ingredients, packages and cardiovascular log.
let lastParsedFood=null;
const previewPhotoURL={food:null,vital:null};
const eatSource={ingredients:'材料',dish:'完成品',product:'市販品'};
function renderDailyPFC(date){
 const result=dailyPFC(state.meals,date,state.pfcGoal||{protein:30,fat:25,carbs:45});
 const colors={protein:'#5eaaf0',fat:'#f4be67',carbs:'#5bd4ac'};
 const labels={protein:'P たんぱく質',fat:'F 脂質',carbs:'C 炭水化物'};
 const p=result.ratios.protein,f=result.ratios.fat,c=result.ratios.carbs;
 $('pfc-donut').style.background=result.knownCount?`conic-gradient(${colors.protein} 0 ${p}%,${colors.fat} ${p}% ${p+f}%,${colors.carbs} ${p+f}% 100%)`:'conic-gradient(#233e56 0% 100%)';
 $('pfc-total').textContent=result.knownCount?result.macroKcal.toLocaleString('ja-JP'):'—';
 $('pfc-status').textContent=result.complete?'PFC記録済':result.knownCount?'一部のみ集計':'PFC未入力';
 $('pfc-rows').innerHTML=Object.keys(labels).map(key=>`<div class="pfc-row"><div class="split"><strong style="color:${colors[key]}">${labels[key]}</strong><span>${result.knownCount?result.totals[key].toFixed(1)+' g / '+result.ratios[key].toFixed(1)+' %':'—'}</span></div><div class="pfc-rail"><span style="width:${result.knownCount?result.ratios[key]:0}%;background:${colors[key]}"></span></div><small>目標 ${result.target[key]}%</small></div>`).join('');
 $('pfc-missing').textContent=!result.count?'この日の食事がまだ登録されていません。':result.missingCount?`PFC未入力の食事が${result.missingCount}件あります。上の割合はPFCが揃った${result.knownCount}件だけの部分集計で、1日全体の割合ではありません。`:`${result.count}件のPFC入力を集計しました。商品ラベルのkcal合計とPFC換算エネルギーは異なる場合があります。`;
 const preset=state.pfcPreset||matchPfcPreset(state.pfcGoal)||'custom';const select=$('pfc-preset');
 let custom=select.querySelector('[value="custom"]');
 if(preset==='custom'&&!custom){custom=document.createElement('option');custom.value='custom';custom.textContent='手動設定（以前の設定）';select.appendChild(custom)}
 if(preset!=='custom'&&custom)custom.remove();
 select.value=preset;
 $('pfc-preset-help').textContent=preset==='custom'?'以前の手動設定比率を保持しています。4つの目的を選ぶと変更されます。':'選択した目標の比率が保存されています。数値欄から手動調整もできます。';
 const dailyTarget=dayCalorieBalance(state,date).target;
 const grams=pfcGramTargets(dailyTarget,result.target);
 $('pfc-target-grams').textContent=grams?`今日の推定摂取目標 ${Math.round(dailyTarget)}kcal に対する目安：P ${grams.protein}g / F ${grams.fat}g / C ${grams.carbs}g`:'プロフィールに年齢・身長・体重・性別を入力すると、摂取目標kcalからPFC目標gも計算できます。';
 for(const [key,input] of [['protein','pfc-target-p'],['fat','pfc-target-f'],['carbs','pfc-target-c']]){if(document.activeElement!==$(input))$(input).value=result.target[key]}
}
async function savePFCGoal(){try{const v=validatePFCGoal({protein:val('pfc-target-p'),fat:val('pfc-target-f'),carbs:val('pfc-target-c')});const old=state.pfcGoal,oldPreset=state.pfcPreset;state.pfcGoal=v;state.pfcPreset=matchPfcPreset(v)||'custom';try{await save()}catch(e){state.pfcGoal=old;state.pfcPreset=oldPreset;throw e}renderNutrition();toast('PFCの目標割合を保存しました')}catch(e){toast(e.message)}}
async function choosePFCPreset(){const key=val('pfc-preset');if(!(key in PFC_PRESETS))return;
 const old=state.pfcGoal,oldPreset=state.pfcPreset;state.pfcGoal=pfcForPreset(key);state.pfcPreset=key;
 try{await save();renderNutrition();toast(`${PFC_PRESETS[key].label}のPFC目標を保存しました`)}catch(e){state.pfcGoal=old;state.pfcPreset=oldPreset;renderNutrition();toast('PFCの保存に失敗しました：'+e.message)}
}
let lastParsedRaw='';
function renderFoodCatalogSearch(){
 const term=(val('food-catalog-search')||'').normalize('NFKC').toLowerCase().trim();
 const result=$('food-catalog-results');if(!result)return;
 if(!term){result.textContent=`端末内の食品辞書 ${FOOD_REFERENCE.length}品目から検索できます。`;return}
 const found=FOOD_REFERENCE.filter(f=>[f.name,...f.aliases].some(a=>a.normalize('NFKC').toLowerCase().includes(term))).slice(0,18);
 result.innerHTML=found.length?found.map(f=>`<button type="button" class="food-search-pick" data-pick-food="${safeText(f.name)}"><strong data-no-translate>${safeText(f.name)}</strong><small>${f.requiresLabel?'栄養表示・レシピ要確認':f.referenceStatus==='approximate-unverified'?'参考値・要確認':'参考値'} · ${safeText(f.group||'食品')}</small></button>`).join(''):'候補がありません。栄養成分表示を使って登録できます。';
}
function getFoodResult(){return parseFoodLines(val('food-lines'),val('food-mode'));}
const formatFoodNum=v=>v===null||v===undefined?'':String(v);
function refreshFoodReview(){
 if(!lastParsedFood)return;
 const sum=calculateFoodTotals(lastParsedFood.items);
 Object.assign(lastParsedFood,sum);
 for(const [key,id] of [['kcal','food-kcal'],['protein','food-protein'],['fat','food-fat'],['carbs','food-carbs']])$(id).value=formatFoodNum(sum.totals[key]);
 const active=lastParsedFood.items.filter(x=>!x.excluded);
 $('food-review-totals').textContent=`集計 ${active.length}品：${sum.totals.kcal===null?'未確定':sum.totals.kcal+'kcal'} / P ${formatFoodNum(sum.totals.protein)||'未確定'}g / F ${formatFoodNum(sum.totals.fat)||'未確定'}g / C ${formatFoodNum(sum.totals.carbs)||'未確定'}g`;
 $('food-review-warning').textContent=sum.unknown.length?`${sum.unknown.length}品のカロリー未確定。数値を入力するか、その品だけ明示的に除外してください。`:
  (active.length?'すべての行のカロリーを計上できます。PFCが空欄の場合は部分集計になります。':'計上対象の食品がありません。');
}
function renderFoodReview(){
 const v=lastParsedFood;
 const lines=v.items.map((item,i)=>{
 const badge=item.source==='reference'?'参考値':item.source==='label'?'ラベル入力':'未認識';
 const conf=item.confidence==='要確認'?'low':item.confidence==='参考'?'warn':'';
 const warn=[item.reason,...(item.warnings||[])].filter(Boolean).join(' ');
 return `<div class="food-review-item"><div class="food-review-head"><div><strong>${safeText(item.label)}</strong><small>${safeText(item.food||badge)}${item.grams?` · 約${item.grams}g`:''}</small></div><span class="food-confidence ${conf}">${safeText(item.confidence)} / ${badge}</span></div><div class="food-review-grid">${[['kcal','kcal'],['protein','P g'],['fat','F g'],['carbs','C g']].map(([k,l])=>`<label>${l}<input type="number" min="0" max="15000" step="0.1" data-food-idx="${i}" data-food-key="${k}" value="${formatFoodNum(item.nutrients?.[k])}" placeholder="未確認" ${item.excluded?'disabled':''}></label>`).join('')}</div><label class="food-exclude"><input type="checkbox" data-food-exclude="${i}" ${item.excluded?'checked':''}>この行を計上対象から除外する</label>${warn?`<p class="food-review-note">${safeText(warn)}</p>`:''}</div>`;
 }).join('');
 $('food-preview').innerHTML=`<p class="food-review-help">1品ずつ数値を確認・修正してください。「?」の食品は不明です。包装表示の100g当たりは食べた量への換算が必要です。調理前と調理後の重量にも注意してください。</p>${lines||'<p>入力がありません。</p>'}<div id="food-review-totals" class="food-totals"></div><p id="food-review-warning" class="food-review-note" role="status"></p>`;
 refreshFoodReview();
}
function analyzeFood(){lastParsedFood=getFoodResult();lastParsedRaw=val('food-lines').trim();renderFoodReview();return lastParsedFood;}
function editFoodRow(e){
 if(!lastParsedFood)return;
 const el=e.target;
 if(el.dataset.foodExclude!==undefined){const idx=Number(el.dataset.foodExclude);const item=lastParsedFood.items[idx];if(!item)return;item.excluded=!!el.checked;
  for(const inp of $('food-preview').querySelectorAll(`[data-food-idx="${idx}"]`))inp.disabled=item.excluded;
 }else if(el.dataset.foodIdx!==undefined){const idx=Number(el.dataset.foodIdx),key=el.dataset.foodKey,item=lastParsedFood.items[idx];
  if(!item||!['kcal','protein','fat','carbs'].includes(key))return;
  const value=el.value.trim();if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>15000)){el.setCustomValidity('0以上の有効な数値を入力してください');el.reportValidity();return;}el.setCustomValidity('');
  item.nutrients??={kcal:null,protein:null,fat:null,carbs:null};item.nutrients[key]=value===''?null:Number(value);
  item.recognized=item.nutrients.kcal!==null;
  item.source='manual';item.confidence='手動確認';
 }else return;
 refreshFoodReview();
}
async function saveFood(){
 try{
  const raw=val('food-lines').trim(),name=val('food-name').trim()||raw.split(/\n/)[0]?.replace(/^[・•\-*\s]+/,'').slice(0,180);
  if(!raw)throw Error('箇条書きで食品を入力してください。');
  if(!lastParsedFood||lastParsedRaw!==raw)throw Error('入力が変わりました。「内容を解析」を押してから保存してください。');
  const sum=calculateFoodTotals(lastParsedFood.items);
  if(!sum.count)throw Error('記録する食品がありません。');
  if(!sum.allKnown)throw Error('未認識の食品があります。行ごとに栄養値を修正するか、除外してください。');
  const keys=['kcal','protein','fat','carbs'];
  if(keys.some(k=>{let text=val('food-'+k).trim(),expected=sum.totals[k];return text!==formatFoodNum(expected)}))throw Error('合計が個別明細と異なります。各行の数値を修正してください。');
  const row=normalizeMeal({id:uid(),date:val('nutrition-date')||localToday(),mealType:val('food-meal-type'),name,kcal:sum.totals.kcal,protein:sum.totals.protein,fat:sum.totals.fat,carbs:sum.totals.carbs,rawText:raw,inputMode:val('food-mode'),estimated:sum.estimated,foodItems:lastParsedFood.items,foodParserVersion:2});
  const old=state.meals,oldPersonal=state.personalFoods||[];
  state.meals=[...state.meals,row];
  if(lastParsedFood.items.some(x=>!x.excluded&&x.source==='manual'))state.personalFoods=savePersonalFood(oldPersonal,row);
  try{await save()}catch(e){state.meals=old;state.personalFoods=oldPersonal;throw e}
  $('food-lines').value='';$('food-name').value='';for(const id of ['food-kcal','food-protein','food-fat','food-carbs'])$(id).value='';lastParsedFood=null;lastParsedRaw='';$('food-preview').textContent='保存しました。次の食事・間食を続けて入力できます。';renderNutrition();renderDashboardEnergy();toast('食事を追加しました。品目別の確認値も端末内に保存しました。');
 }catch(e){toast(e.message)}
}
function choosePhoto(e,kind){const file=e.target.files?.[0];const target=kind==='food'?'food-photo-preview':'vital-photo-preview';if(previewPhotoURL[kind])URL.revokeObjectURL(previewPhotoURL[kind]);previewPhotoURL[kind]=null;if(!file)return;if(!file.type.startsWith('image/')){toast('画像ファイルを指定してください');return}if(file.size>12*1024*1024){toast('12MB以下の画像にしてください');return}previewPhotoURL[kind]=URL.createObjectURL(file);const image=document.createElement('img');image.src=previewPhotoURL[kind];image.alt='選択した写真の端末内プレビュー';$(target).replaceChildren(image);$(kind==='food'?'food-photo-status':'vital-photo-status').textContent='写真を選択しました。写真はアプリの保存データに含みません。OCRに対応しない端末は写真の文字をコピーして入力してください。'}
async function tryPhotoOCR(kind){const pick=kind==='food'?'food-photo':'vital-photo',target=kind==='food'?'food-label-text':'vital-photo-text',status=kind==='food'?'food-photo-status':'vital-photo-status';if(!$(pick).files?.[0])return toast('写真を先に選択してください');if(typeof window.TextDetector!=='function'){$(status).textContent='このブラウザでは端末内OCRが利用できません。iPhoneの「写真」で画像を開き、「テキスト認識表示」でコピーして下の欄へ貼り付けてください。写真は送信しません。';return}
 try{const img=new Image();img.src=previewPhotoURL[kind];await img.decode();const results=await new window.TextDetector().detect(img);$(target).value=results.map(x=>x.rawValue).join('\n');$(status).textContent='端末内で文字を抽出しました。保存前に数値を照合してください。';}catch(e){$(status).textContent='文字認識に失敗しました。写真アプリの「テキスト認識表示」でコピーしてください。';}
}
function applyFoodLabel(){
 const text=val('food-label-text').trim();if(!text)return toast('栄養成分表示の文字を入力してください。');
 const amt=val('food-label-amount'),unit=val('food-label-unit');
 const result=parseLabel(text,amt===''?{}:{amount:Number(amt),unit});
 const status=$('food-photo-status');status.textContent=result.warning;
 if(result.needsPortion||!result.found)return;
 $('food-mode').value='product';
 const raw='商品ラベル: '+text.replace(/[\r\n]+/g,' ').slice(0,3900);
 $('food-lines').value=raw;
 lastParsedFood={mode:'product',items:[{label:raw,recognized:result.kcal!==null,source:'label',food:null,grams:result.consumed?.unit==='g'?result.consumed.value:null,estimate:false,confidence:result.basis==='unknown'?'要確認':'高',reason:result.basis==='unknown'?'表示が何当たりの数値か確認してください。':'',warnings:result.warnings,nutrients:Object.fromEntries(['kcal','protein','fat','carbs'].map(k=>[k,result[k]])),excluded:false}],unknown:[],estimated:false};
 lastParsedRaw=raw;renderFoodReview();
}
function applyVitalText(){const result=parseBPText(val('vital-photo-text'));for(const [k,id] of [['systolic','vital-sys'],['diastolic','vital-dia'],['pulse','vital-pulse']])if(result[k]!==null)$(id).value=result[k];$('vital-photo-status').textContent=`${result.recognized}項目を抽出しました。必ず測定器の数字と照合してから保存してください。`;}
function renderVitals(){const sorted=[...(state.vitals||[])].sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));$('vital-count').textContent=sorted.length+'件';
 const recent=sorted.slice(-20),bp=recent.filter(x=>x.systolic!==null&&x.diastolic!==null),pulse=recent.filter(x=>x.pulse!==null);
 $('vital-bp-chart').innerHTML=bp.length?`<span class="fine">最高血圧</span>${svgChart(bp.map(x=>({label:x.date,value:x.systolic})),{suffix:'mmHg'})}<span class="fine">最低血圧</span>${svgChart(bp.map(x=>({label:x.date,value:x.diastolic})),{suffix:'mmHg',color:'#f3c76e'})}`:'<div class="empty">血圧の記録がありません</div>';
 $('vital-pulse-chart').innerHTML=pulse.length?svgChart(pulse.map(x=>({label:x.date,value:x.pulse})),{suffix:'bpm'}):'<div class="empty">心拍数の記録がありません</div>';
 $('vital-list').innerHTML=sorted.length?sorted.slice().reverse().map(x=>`<div class="meal-item"><div><strong>${safeText(x.date)} ${safeText(x.time)} · ${x.context==='rest'?'安静時':x.context==='postworkout'?'運動後':'その他'}</strong><small>血圧 ${x.systolic??'—'} / ${x.diastolic??'—'} mmHg · 心拍 ${x.pulse??'—'} bpm ${x.notes?' · <span data-no-translate>'+safeText(x.notes)+'</span>':''}</small></div><button class="btn danger" data-delete-vital="${safeText(x.id)}">削除</button></div>`).join(''):'<div class="empty">まだ測定値がありません。</div>';
}
async function saveVital(){try{const o=normalizeVital({id:uid(),date:val('vital-date'),time:val('vital-time'),systolic:val('vital-sys'),diastolic:val('vital-dia'),pulse:val('vital-pulse'),context:val('vital-context'),notes:val('vital-notes'),source:val('vital-photo-text').trim()?'photo-reviewed':'manual'});const old=state.vitals;state.vitals=[...state.vitals,o];try{await save()}catch(e){state.vitals=old;throw e}renderVitals();toast('測定値を端末に保存しました');
 if(o.systolic!==null&&o.diastolic!==null&&(o.systolic>180||o.diastolic>120))toast('著しく高い値です。安静後に再測定し、医療機関へ相談してください。症状を伴う場合は救急対応が必要です。');
 }catch(e){toast('保存できません：'+e.message)}}
async function deleteVital(id){const v=state.vitals.find(x=>x.id===id);if(!v||!askConfirm('この測定記録を削除しますか？'))return;const old=state.vitals;state.vitals=state.vitals.filter(x=>x.id!==id);try{await save()}catch(e){state.vitals=old;throw e}renderVitals();toast('削除しました')}
function exportVitalsCSV(){const rows=[['date','time','systolic_mmHg','diastolic_mmHg','pulse_bpm','condition','source','notes']];for(const v of state.vitals)rows.push([v.date,v.time,v.systolic??'',v.diastolic??'',v.pulse??'',v.context,v.source,v.notes]);const csv='\uFEFF'+rows.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');download('MuscleAtlasPro_Vitals_'+localToday()+'.csv',csv,'text/csv;charset=utf-8');toast('血圧・心拍数CSVを作成しました')}
async function chooseLanguage(){
 const next=$('app-language').value,previous=state.uiLanguage||'ja';
 if(!Object.hasOwn(LANGUAGES,next)){toast('Unsupported language');return;}
 state.uiLanguage=next;setLanguage(next);
 // Refresh content generated with dates/numbers and exercise names; no stored records change.
 if(activeRoute==='dashboard')renderDashboard();
 else if(activeRoute==='history')renderHistory();
 else if(activeRoute==='record'){renderExerciseLookup();if(pending)renderPreview();}
 else if(activeRoute==='progress')renderProgress();
 else if(activeRoute==='nutrition')renderNutrition();
 else if(activeRoute==='vitals')renderVitals();
 else if(activeRoute==='settings')renderSettings();
 try{await save();try{localStorage.setItem('muscle-atlas-ui-language',next)}catch{}setLanguage(next);toast('Language saved');}
 catch(error){state.uiLanguage=previous;setLanguage(previous);$('app-language').value=previous;toast('Language could not be saved: '+error.message);}
}
function bind(){$('app-language').addEventListener('change',chooseLanguage);for(const selectId of ['detail-muscle-select','recovery-detail-muscle-select']){const input=$(selectId);input.innerHTML='<option value="">部位名を選ぶ</option>'+SELECTABLE_IDS.map(id=>`<option value="${id}">${safeText(muscleLabel(id))}</option>`).join('')} $('detail-muscle-select').addEventListener('change',e=>{selectedMuscle=e.target.value||null;renderDashboard()});$('recovery-detail-muscle-select').addEventListener('change',e=>{selectedRecoveryMuscle=e.target.value||null;renderRecovery()});document.querySelectorAll('[data-route]').forEach(x=>x.addEventListener('click',()=>route(x.dataset.route)));document.querySelectorAll('[data-days]').forEach(x=>x.addEventListener('click',()=>{period=Number(x.dataset.days);selectedMuscle=null;document.querySelectorAll('[data-days]').forEach(y=>y.classList.toggle('active',x===y));renderDashboard()}));
 $('exclusion-toggle').addEventListener('click',()=>setExclusionsExpanded($('exclusion-toggle').getAttribute('aria-expanded')!=='true'));
  document.querySelector('[data-open-exclusions]')?.addEventListener('click',()=>setExclusionsExpanded(true));
  $('exclusion-list').addEventListener('change',()=>{const n=$('exclusion-list').querySelectorAll('input[data-exclude]:checked').length;$('exclusion-count').textContent=`${n}部位を選択（未保存）`;});
  $('tomorrow-base-date').addEventListener('change',renderTomorrow);$('save-excluded-muscles').addEventListener('click',saveExclusions);$('recovery-date').addEventListener('change',renderRecovery);$('evaluation-day').addEventListener('change',renderDailyEvaluation);$('save-evaluation-level').addEventListener('click',saveEvaluationLevel);$('save-training-preferences').addEventListener('click',saveTrainingPrefs);
 $('train-extra-rest').addEventListener('change',()=>renderRestStepper('pending'));
 $('rest-minus').addEventListener('click',()=>adjustRestDays(-1));
 $('rest-plus').addEventListener('click',()=>adjustRestDays(1));
 $('rest-reset').addEventListener('click',()=>adjustRestDays(null));$('dna-file').addEventListener('change',e=>loadDNAFile(e.target.files[0]));$('dna-save').addEventListener('click',saveDNAMarkers);$('dna-clear').addEventListener('click',clearDNAMarkers);$('dna-parse-report').addEventListener('click',parseDNAReportText);
 $('recovery-side').addEventListener('change',()=>{const v=val('recovery-side');$('recovery-body-grid').className='body-grid'+(v==='both'?'':' single '+v)});
 for(const id of ['recovery-front','recovery-back']){
  $(id).addEventListener('click',e=>{const node=e.target.closest('[data-muscle]');if(!node)return;selectedRecoveryMuscle=node.dataset.muscle;renderRecovery()});
  $(id).addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-muscle]')){e.preventDefault();selectedRecoveryMuscle=e.target.dataset.muscle;renderRecovery()}});
 }
 
 $('map-side').addEventListener('change',()=>{const v=val('map-side');$('body-grid').className='body-grid'+(v==='both'?'':' single '+v)});
 for(const id of ['svg-front','svg-back'])$(id).addEventListener('click',e=>{const node=e.target.closest('[data-muscle]');if(!node)return;selectedMuscle=node.dataset.muscle;renderDashboard()});
 for(const id of ['svg-front','svg-back'])$(id).addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-muscle]')){e.preventDefault();selectedMuscle=e.target.dataset.muscle;renderDashboard()}});
 $('exercise-catalog-group').innerHTML=EXERCISE_GROUPS.map(group=>`<option value="${group.id}">${safeText(group.label)}</option>`).join('');
 $('exercise-catalog-search').addEventListener('input',()=>{exerciseSearchLimit=18;renderExerciseLookup()});
 $('exercise-catalog-group').addEventListener('change',()=>{exerciseSearchLimit=18;renderExerciseLookup()});
 $('exercise-catalog-results').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.exerciseMore){exerciseSearchLimit+=18;renderExerciseLookup();return;}
  if(button.dataset.addExercise===undefined)return;
  const exercise=E[Number(button.dataset.addExercise)];if(!exercise)return;
  const input=$('log-text');input.value+=(input.value.trim()&&!input.value.endsWith('\n')?'\n':'')+insertionName(exercise)+' ';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.focus();input.setSelectionRange(input.value.length,input.value.length);
  toast('種目名を追加しました。重量・回数・セット数を追記して解析してください。');
 });
 $('log-text').addEventListener('input',invalidateTrainingAnalysis);
 renderExerciseLookup();
 $('insert-example').addEventListener('click',()=>{invalidateTrainingAnalysis();$('log-text').value='ベンチプレス 60k10r1s 80k8r1s 90k6r2s 80k8r\nケーブルクランチ 70kg50rep1set30rep1set\nトレーニング時間90分\nセット間2分\nトレッドミル 15%傾斜2.0km (6.0km/h)';toast('入力例をセットしました')});
 $('analyze-btn').addEventListener('click',analyze);$('save-session').addEventListener('click',commit);$('cancel-edit').addEventListener('click',()=>{resetForm();toast('編集を中止しました')});
 $('preview-exercises').addEventListener('input',e=>{const t=e.target;if(!t.dataset.field||!pending)return;const g=pending.exercises[Number(t.dataset.ex)]?.groups[Number(t.dataset.group)];if(!g)return;g[t.dataset.field]=t.value===''&&(t.dataset.field==='weight'||t.dataset.field==='rir')?null:Number(t.value);});
 $('preview-exercises').addEventListener('click',e=>{let t=e.target;if(!pending)return;if(t.dataset.removeEx!==undefined){pending.exercises.splice(Number(t.dataset.removeEx),1);renderPreview()}else if(t.dataset.removeGroup!==undefined){const [i,j]=t.dataset.removeGroup.split(':').map(Number);pending.exercises[i].groups.splice(j,1);renderPreview()}else if(t.dataset.addGroup!==undefined){const e=pending.exercises[Number(t.dataset.addGroup)],last=e.groups[e.groups.length-1]||{weight:null,reps:10,sets:1,rir:null};e.groups.push({...last,sets:1});renderPreview()}});
 $('preview-unmatched').addEventListener('change',e=>{if(e.target.dataset.ignore===undefined)return;const id=Number(e.target.dataset.ignore);if(e.target.checked)ignoreUnmatched.add(id);else ignoreUnmatched.delete(id)});
 $('history-query').addEventListener('input',renderHistory);$('history-expand-all').addEventListener('click',()=>setHistoryExpanded(true));$('history-collapse-all').addEventListener('click',()=>setHistoryExpanded(false));$('history-list').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.edit)editLog(t.dataset.edit);else if(t.dataset.delete)deleteLog(t.dataset.delete)});
 $('e1rm-exercise').addEventListener('change',renderProgress);$('forecast-calc').addEventListener('click',renderForecast);$('forecast-mode').addEventListener('change',renderForecast);$('forecast-exercise').addEventListener('change',renderForecast);$('forecast-save').addEventListener('click',saveForecastPlan);$('save-profile').addEventListener('click',saveProfile);$('export-json').addEventListener('click',exportJSON);$('export-csv').addEventListener('click',exportCSV);$('export-meals-csv').addEventListener('click',exportMealsCSV);$('import-json').addEventListener('change',e=>importJSON(e.target.files[0]));$('clear-data').addEventListener('click',clearAll);
 $('food-catalog-search').addEventListener('input',renderFoodCatalogSearch);
 $('food-catalog-results').addEventListener('click',e=>{const btn=e.target.closest('[data-pick-food]');if(!btn)return;const name=btn.dataset.pickFood;const inp=$('food-lines');inp.value+=(inp.value.trim()?'\n':'')+'・'+name+' 100g';lastParsedFood=null;lastParsedRaw='';$('food-preview').textContent='食品を追加しました。分量を修正し、解析を実行してください。';inp.focus()});
 $('personal-food-search').addEventListener('input',renderPersonalFoods);
 $('personal-food-results').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.usePersonalFood){const food=findPersonalFood(state.personalFoods||[],button.dataset.usePersonalFood);if(food){fillPersonalFood(food);$('meal-name').focus();$('meal-name').scrollIntoView({behavior:'smooth',block:'center'})}}
  else if(button.dataset.deletePersonalFood)deletePersonalFood(button.dataset.deletePersonalFood);
 });
 $('meal-name').addEventListener('change',lookupPersonalFoodOnName);
 $('meal-name').addEventListener('blur',lookupPersonalFoodOnName);
 $('save-personal-food').addEventListener('click',savePersonalFoodOnly);
 $('export-personal-foods').addEventListener('click',exportPersonalFoods);
 $('import-personal-foods').addEventListener('change',e=>importPersonalFoods(e.target.files?.[0]));
 renderFoodCatalogSearch();
 $('food-mode').addEventListener('change',()=>{lastParsedFood=null;lastParsedRaw='';$('food-preview').textContent='形式を変更しました。解析を実行してください。'});
 $('food-analyze').addEventListener('click',analyzeFood);$('food-preview').addEventListener('input',editFoodRow);$('food-preview').addEventListener('change',editFoodRow);$('food-save').addEventListener('click',saveFood);$('food-photo').addEventListener('change',e=>choosePhoto(e,'food'));$('food-photo-read').addEventListener('click',()=>tryPhotoOCR('food'));$('food-label-analyze').addEventListener('click',applyFoodLabel);$('save-pfc-target').addEventListener('click',savePFCGoal);$('pfc-preset').addEventListener('change',choosePFCPreset);
 $('vital-date').value=localToday();$('vital-time').value=new Date().toTimeString().slice(0,5);$('save-vital').addEventListener('click',saveVital);$('vital-photo').addEventListener('change',e=>choosePhoto(e,'vital'));$('vital-photo-read').addEventListener('click',()=>tryPhotoOCR('vital'));$('vital-text-apply').addEventListener('click',applyVitalText);$('vital-list').addEventListener('click',e=>{const t=e.target.closest('[data-delete-vital]');if(t)deleteVital(t.dataset.deleteVital)});$('export-vitals-csv').addEventListener('click',exportVitalsCSV);
 for(const id of ['meal-history-query','meal-history-period','meal-history-type','meal-history-from','meal-history-to'])$(id).addEventListener(id==='meal-history-query'?'input':'change',renderMealHistory);
 $('meal-history-list').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;if(btn.dataset.editMeal)startMealEdit(btn.dataset.editMeal);else if(btn.dataset.mealGoDate){$('nutrition-date').value=btn.dataset.mealGoDate;renderNutrition();$('daily-meals-fold').open=true;$('page-nutrition').scrollIntoView({behavior:'smooth',block:'start'})}});
 $('meal-edit-cancel').addEventListener('click',closeMealEditor);$('meal-edit-recalc').addEventListener('click',recalculateMealEditor);$('meal-edit-save').addEventListener('click',saveMealEdit);
 $('nutr-quick-sex').addEventListener('change',async e=>{
  const choice=e.target.value;if(!['male','female','none'].includes(choice))return;
  const previous={...state.profile};state.profile.sex=choice;
  const previousHistory=structuredClone(state.profileHistory||[]);
  state.profileHistory=(state.profileHistory||[]).filter(x=>x.date!==localToday()).concat({date:localToday(),profile:{...state.profile}});
  try{await save();renderNutrition();renderDashboard();toast('基礎代謝の計算設定を保存しました');}
  catch(error){state.profile=previous;state.profileHistory=previousHistory;renderNutrition();toast('保存できません：'+error.message)}
 });
 $('nutrition-date').addEventListener('change',renderNutrition);$('nutrition-workout-day').addEventListener('change',e=>{if(e.target.value){$('nutrition-date').value=e.target.value;renderNutrition()}});$('nutrition-today').addEventListener('click',()=>{$('nutrition-date').value=localToday();renderNutrition()});$('save-calorie-plan').addEventListener('click',saveCaloriePlan);$('save-meal').addEventListener('click',saveMeal);$('meal-list').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;if(btn.dataset.editMeal)startMealEdit(btn.dataset.editMeal);else if(btn.dataset.deleteMeal)deleteMeal(btn.dataset.deleteMeal)});
}
async function init(){try{({state}=await loadStore());setLanguage(state.uiLanguage||'ja');try{localStorage.setItem('muscle-atlas-ui-language',state.uiLanguage||'ja')}catch{}startTranslation();$('recovery-date').value=localToday();$('tomorrow-base-date').value=localToday();$('storage-status').textContent=storageMode()==='indexeddb'?'● 端末内保存（外部同期なし）':'● 端末内代替保存（外部同期なし）';bind();initExclusionsFold();resetForm();setForecastControls();renderDashboard();$('nutrition-date').value=localToday();$('cal-activity').value=state.caloriePlan.activityFactor;$('cal-credit').value=state.caloriePlan.exerciseCredit;$('cal-adjust').value=state.caloriePlan.goalAdjustment;if(state.logs.length)toast(`${state.logs.length}件の記録を読み込みました`);window.MA_BOOT_OK?.();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(e){$('storage-status').textContent='保存エラー';toast('起動できません：'+e.message);window.MA_BOOT_FAIL?.(e);console.error(e)}}
init();
