import {localizedExerciseAliases} from './i18n.js';
import {normalizeVital,validatePFCGoal} from './wellness.js';
import {pfcForPreset,matchPfcPreset} from './presets.js';
import {E, names} from './catalog.js';
import {DETAIL_IDS} from './detail.js';
import {normalizeDNAMarkers,emptyDNAMarkers} from './dna.js';
import {normalizePersonalFoods,mergePersonalFoods} from './personal_food.js';

export const VERSION=15;
export const GOALS={balanced:'筋肥大＋減量',hypertrophy:'筋肥大',strength:'筋力向上',fatloss:'減量',proportion:'プロポーション改善（体型改善）'};
export const defaultProfile=()=>({age:'30',height:'165',weight:'60',fat:'',muscle:'',sex:'none',display:'auto',goal:'balanced',level:'advanced'});
export const defaultCaloriePlan=()=>({activityFactor:1.2,goalAdjustment:-250,exerciseCredit:0.5});
export const EVALUATION_LEVELS={gentle:'優しい',normal:'普通',strict:'厳しい'};
export const defaultForecastPlan=()=>({dailyIntake:'',strengthMode:'trend',strengthMonthlyPct:0,exercise:''});
export const normalizeTrainingPrefs=v=>({targetRir:[1,2,3,4,5].includes(Number(v?.targetRir))?Number(v.targetRir):2,extraRestDays:[-3,-2,-1,0,1,2,3].includes(Number(v?.extraRestDays))?Number(v.extraRestDays):0});
export const exportBackupObject=(state,includeDNAMarkers=false)=>{const {dnaMarkers:storedMarkers,...safeState}=state;return {...safeState,...(includeDNAMarkers?{dnaMarkers:normalizeDNAMarkers(storedMarkers)}:{}),profileSnapshot:{heightCm:Number(state.profile.height),weightKg:Number(state.profile.weight),ageYears:state.profile.age===''?null:Number(state.profile.age)},exportedAt:new Date().toISOString(),app:'MuscleAtlasPro'};};
export const emptyState=()=>({schemaVersion:VERSION,profile:defaultProfile(),profileHistory:[],logs:[],weights:[],meals:[],personalFoods:[],caloriePlan:defaultCaloriePlan(),forecastPlan:defaultForecastPlan(),evaluationLevel:'normal',trainingPrefs:{targetRir:2,extraRestDays:0},dnaMarkers:emptyDNAMarkers(),excludedMuscles:[],vitals:[],pfcGoal:pfcForPreset('balanced'),pfcPreset:'balanced',uiLanguage:'ja',updatedAt:new Date().toISOString()});
const alias=E.flatMap(e=>localizedExerciseAliases(e).map(a=>({e,a:a.normalize('NFKC').toLowerCase()}))).sort((a,b)=>b.a.length-a.a.length);
// Keep the one-letter suffixes strict: 'k' must not match 'km' or 'kcal',
// 'r' must not match 'rir', and 's' must not match arbitrary English words.
const WEIGHT_UNIT=String.raw`(?:kg|キロ|k(?![a-z]))`;
const REP_UNIT=String.raw`(?:repeticiones|répétitions|rép|ripetizioni|rip|wdh\.?|reps?|r(?![a-z])|回(?:数)?)`;
const SET_UNIT=String.raw`(?:séries?|series?|sätze|satz|sets?|s(?![a-z])|セット)`;
const WEIGHT_RE=new RegExp(String.raw`(\d+(?:\.\d+)?)\s*${WEIGHT_UNIT}`,'gi');
const REP_SET_RE=new RegExp(String.raw`(\d+)\s*${REP_UNIT}(?:\s*[x×*]?\s*(\d+)\s*${SET_UNIT})?`,'gi');
const NEXT_UNIT_RE=new RegExp(String.raw`\d+(?:\.\d+)?\s*(?:${WEIGHT_UNIT}|${REP_UNIT}|${SET_UNIT}|km|分|傾斜|度|%)`,'i');
const cardioCatalog=[{name:'トレッドミル',alias:['トレッドミル','treadmill','tapis roulant','cinta de correr','cinta de correr','laufband'],met:null},{name:'エアロバイク',alias:['エアロバイク','stationary bike','フィットネスバイク','vélo stationnaire','cyclette','bicicleta estática','fahrradergometer'],met:5.8},{name:'ウォーキング',alias:['ウォーキング','walking','早歩き','marche','camminata','caminata','gehen'],met:3.5},{name:'ランニング',alias:['ランニング','running','ジョギング','course à pied','corsa','correr','laufen'],met:7},{name:'ローイングマシン',alias:['ローイングマシン'],met:5.0},{name:'有酸素運動',alias:['有酸素運動','cardio'],met:5.0}];
export const exerciseCatalog=E.map(x=>({name:x.n,primary:x.p,secondary:x.s}));
export const safeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const localToday=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const uid=()=>globalThis.crypto?.randomUUID?.() || 'ma-'+Date.now()+'-'+Math.random().toString(36).slice(2,12);
const n=x=>Number(x);
const clean=s=>String(s||'').normalize('NFKC').toLowerCase();
const round=(v,k=1)=>Math.round(v*k)/k;
export const parseTraining=(text)=>{
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const chunks=[],meta={minutes:null,restMinutes:null},warnings=[];
 for(let i=0;i<lines.length;i++){
  const raw=lines[i],norm=clean(raw);
  if(/^(?:\d{1,4}\s*[年/.\-]\s*)?\d{1,2}\s*[月/.\-]\s*\d{1,2}日?\s*の?\s*(?:トレーニング|筋トレ|胸|肩|脚|背中)/.test(norm)||/^\d{1,2}\/\d{1,2}のトレーニング/.test(norm))continue;
  const time=norm.match(/^(?:筋トレ|トレーニング|ウエイト|ウェイト)(?:の)?(?:所要)?時間\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(時間|分)/);
  if(time){meta.minutes=round(Number(time[1])*(time[2]==='時間'?60:1),10);continue}
  const rest=norm.match(/^(?:セット間(?:休憩)?|インターバル)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(時間|分|秒)/);
  if(rest){meta.restMinutes=round(Number(rest[1])*(rest[2]==='時間'?60:rest[2]==='秒'?1/60:1),100);continue}
  const exerciseMatch=alias.find(x=>norm.includes(x.a));
  const cardioMatch=exerciseMatch?null:cardioCatalog.find(c=>c.alias.some(a=>norm.includes(a)));
  const match=exerciseMatch||cardioMatch;
  const nxt=lines[i+1]||'';
  if(match&&/^\d+(?:\.\d+)?/.test(clean(nxt))&&NEXT_UNIT_RE.test(clean(nxt))){chunks.push(raw+' '+nxt);i++}else chunks.push(raw);
 }
 const exercises=[],cardio=[],unmatched=[];
 for(const raw of chunks){
  const line=clean(raw).replace(/^[・•*\-]+\s*/,'').replace(/^\d+[.、)]\s*/,'');
  const exAlias=alias.find(x=>line.includes(x.a));
  const ca=exAlias?null:cardioCatalog.find(c=>c.alias.some(a=>line.includes(a)));
  if(ca){
   const mt=line.match(/(\d+(?:\.\d+)?)\s*分/),ht=line.match(/(\d+(?:\.\d+)?)\s*時間/),km=line.match(/(\d+(?:\.\d+)?)\s*km(?!\s*\/\s*h)/i),speed=line.match(/(\d+(?:\.\d+)?)\s*km\s*\/\s*h/i),incl=line.match(/(\d+(?:\.\d+)?)\s*(%|度)\s*(?:傾斜)?/);
   let minutes=mt?n(mt[1]):ht?60*n(ht[1]):null;
   const distanceKm=km?n(km[1]):null,speedKmh=speed?n(speed[1]):null,grade=incl?n(incl[1]):null,gradeUnit=incl?(incl[2]==='度'?'degrees':'percent'):null;
   if(minutes===null&&distanceKm!==null&&speedKmh>0)minutes=round(distanceKm/speedKmh*60,10);
   let met=ca.met;
   if(ca.name==='トレッドミル'&&speedKmh>0&&gradeUnit!=='degrees'){
    const v=speedKmh*1000/60;
    met=round((.1*v+1.8*v*(gradeUnit==='percent'?grade/100:0)+3.5)/3.5,10000);
   }
   const needsReview=!(minutes>0)||!(met>0)||gradeUnit==='degrees'||(ca.name==='トレッドミル'&&speedKmh===null);
   if(minutes===null&&distanceKm===null){unmatched.push({raw,reason:'有酸素の時間または距離が必要です'});continue}
   if(needsReview)warnings.push(`「${ca.name}」は時間・速度・勾配の単位を確認してください。未確定分は消費量に含めません。`);
   cardio.push({id:uid(),name:ca.name,minutes:minutes??null,speedKmh,distanceKm,grade,gradeUnit,met:needsReview?null:met,needsReview,raw});continue;
  }
  const e=exAlias?.e||alias.find(x=>line.includes(x.a))?.e;
  if(!e){unmatched.push({raw,reason:'種目名を識別できません'});continue}
  const wt=[...line.matchAll(WEIGHT_RE)];
  const portions=wt.length?wt.map((w,i)=>({weight:n(w[1]),text:line.slice(w.index+w[0].length,i+1<wt.length?wt[i+1].index:line.length)})):[{weight:null,text:line}];
  const groups=[];
  for(const part of portions){
   let matched=false;
   for(const v of part.text.matchAll(REP_SET_RE)){
    groups.push({weight:part.weight,reps:n(v[1]),sets:v[2]?n(v[2]):1,impliedSet:!v[2],rir:null});matched=true;
   }
   if(!matched){const z=part.text.match(/(\d+)\s*[x×*]\s*(\d+)\s*(?:sets?|セット)?/i);if(z)groups.push({weight:part.weight,reps:n(z[1]),sets:n(z[2]),impliedSet:false,rir:null})}
  }
  if(!groups.length||groups.some(g=>g.reps<1||g.reps>200||g.sets<1||g.sets>50||g.weight!==null&&(g.weight<0||g.weight>2000))){unmatched.push({raw,reason:'セット形式または値が不正です'});continue}
  const equipment=/ダンベル|dumbbell|db\s/.test(line)?'dumbbell':/バーベル|barbell/.test(line)?'barbell':null;
  const rir=(line.match(/rir\s*[:：]?\s*(\d+)/)||[])[1];
  if(rir!==undefined)groups.forEach(g=>g.rir=n(rir));
  const displayName=raw.normalize('NFKC').replace(new RegExp(String.raw`\s*\d+(?:\.\d+)?\s*(?:${WEIGHT_UNIT}|${REP_UNIT}).*$`,'i'),'').trim();
  exercises.push({id:uid(),name:e.n,displayName,primary:[...e.p],secondary:[...e.s],equipment,groups,raw});
 }
 if(!exercises.length&&!cardio.length)warnings.push('認識できる記録がありません。');
 if(unmatched.length)warnings.push(`未認識の行が${unmatched.length}件あります。内容を修正するか、明示的に除外してください。`);
 return {exercises,cardio,meta,unmatched,warnings};
};

export const normalizeSession=(s)=>{
 const date=/^\d{4}-\d{2}-\d{2}$/.test(s?.date||'')?s.date:localToday();
 const ex=(s?.exercises||[]).map(e=>{
  const match=E.find(c=>c.n===e.name),groups=(e.groups||e.workSets||[{weight:e.weight,reps:e.reps,sets:e.sets}]).map(g=>({weight:g.weight==null?null:n(g.weight),reps:n(g.reps),sets:n(g.sets),rir:g.rir==null?null:n(g.rir),impliedSet:!!g.impliedSet}));
  return {id:e.id||uid(),name:e.name||'未登録種目',displayName:e.displayName||e.name||'未登録種目',primary:[...(match?.p||e.primary||[])].filter(x=>x in names),secondary:[...(match?.s||e.secondary||[])].filter(x=>x in names),equipment:e.equipment||null,groups,raw:e.raw||''};
 }).filter(e=>e.groups.length&&e.groups.every(g=>g.sets>=1&&g.reps>=1&&g.sets<=50&&g.reps<=200&&(g.weight===null||g.weight>=0&&g.weight<=2000)));
 const cardio=(s?.cardio||[]).map(c=>({...c,id:c.id||uid(),minutes:c.minutes==null?null:n(c.minutes),met:c.met==null?null:n(c.met)})).filter(c=>c.minutes===null||c.minutes>0&&c.minutes<1440);
 return {id:String(s?.id||uid()),date,minutes:s?.minutes==null?null:n(s.minutes),restMinutes:s?.restMinutes==null?null:n(s.restMinutes),intensity:['moderate','light','vigorous'].includes(s?.intensity)?s.intensity:'moderate',weightSnapshot:s?.weightSnapshot==null?null:n(s.weightSnapshot),raw:String(s?.raw||''),exercises:ex,cardio,notes:String(s?.notes||'').slice(0,3000),createdAt:s?.createdAt||new Date().toISOString(),updatedAt:s?.updatedAt||new Date().toISOString()};
};
export const normalizeState=(data)=>{
 if(!data||typeof data!=='object'||!Array.isArray(data.logs)||typeof data.profile!=='object'||!data.profile)throw Error('バックアップの形式が正しくありません。');
 if(data.logs.length>20000)throw Error('記録件数が多すぎます。');
 const logs=data.logs.map(normalizeSession), ids=new Set();for(const l of logs){if(ids.has(l.id))l.id=uid();ids.add(l.id)}
 const meals=Array.isArray(data.meals)?data.meals.slice(-30000).map(normalizeMeal):[];
 const vitals=Array.isArray(data.vitals)?data.vitals.slice(-30000).map(normalizeVital):[];
 const vitalIds=new Set();for(const v of vitals){if(vitalIds.has(v.id))v.id=uid();vitalIds.add(v.id)}
 let pfcGoal;try{pfcGoal=validatePFCGoal(data.pfcGoal||pfcForPreset('balanced'))}catch{pfcGoal=pfcForPreset('balanced')}
 const matchedPreset=matchPfcPreset(pfcGoal);
 const pfcPreset=data.pfcPreset ? (matchedPreset===data.pfcPreset?matchedPreset:'custom') : (data.pfcGoal?'custom':matchedPreset||'custom');
 const mealIds=new Set();for(const meal of meals){if(mealIds.has(meal.id))meal.id=uid();mealIds.add(meal.id)}
 const plan=validateCaloriePlan({...defaultCaloriePlan(),...(data.caloriePlan||{})});
 const fp=data.forecastPlan||{}, rawIntake=fp.dailyIntake, rawRate=Number(fp.strengthMonthlyPct);
 const forecastPlan={dailyIntake:rawIntake===''||rawIntake==null?'':Number.isFinite(Number(rawIntake))&&Number(rawIntake)>=1000&&Number(rawIntake)<=6000?Number(rawIntake):'',
 strengthMode:['trend','flat','manual'].includes(fp.strengthMode)?fp.strengthMode:'trend',strengthMonthlyPct:Number.isFinite(rawRate)&&rawRate>=-5&&rawRate<=5?rawRate:0,exercise:String(fp.exercise||'').slice(0,180)};
 return {schemaVersion:VERSION,profile:{...defaultProfile(),...Object.fromEntries(Object.entries(data.profile).filter(([k])=>k in defaultProfile()))},profileHistory:Array.isArray(data.profileHistory)?data.profileHistory.filter(h=>h&&/^\d{4}-\d{2}-\d{2}$/.test(h.date)&&h.profile&&typeof h.profile==='object').slice(-30000).map(h=>({date:h.date,profile:{...defaultProfile(),...Object.fromEntries(Object.entries(h.profile).filter(([k])=>k in defaultProfile()))}})):[],logs,weights:Array.isArray(data.weights)?data.weights.slice(-30000):[],meals,personalFoods:normalizePersonalFoods(data.personalFoods),vitals,pfcGoal,pfcPreset,uiLanguage:['ja','en','fr','it','es','de'].includes(data.uiLanguage)?data.uiLanguage:'ja',caloriePlan:plan,forecastPlan,evaluationLevel:Object.hasOwn(EVALUATION_LEVELS,data.evaluationLevel)?data.evaluationLevel:'normal',trainingPrefs:normalizeTrainingPrefs(data.trainingPrefs),dnaMarkers:normalizeDNAMarkers(data.dnaMarkers),excludedMuscles:Array.isArray(data.excludedMuscles)?[...new Set(data.excludedMuscles.filter(id=>typeof id==='string'&&(id in names||id in DETAIL_IDS)))].slice(0,100):[],updatedAt:new Date().toISOString()};
};
/** Merge backups from prior builds without repeating any date already recorded on this device.
 * Existing profile and records take priority; preserve multi-session days from incoming when the date is new.
 */
export function mergeMissingDays(current,incoming){
 const base=normalizeState(current),addition=normalizeState(incoming);
 const existingDates=new Set(base.logs.map(l=>l.date));
 const fresh=addition.logs.filter(l=>!existingDates.has(l.date));
 const existingIds=new Set(base.logs.map(l=>l.id));
 for(const l of fresh){if(existingIds.has(l.id))l.id=uid();existingIds.add(l.id)}
 const profileIsSet=Number(base.profile.weight)>0&&Number(base.profile.height)>0;
 const weightKeys=new Set(base.weights.map(w=>w.date));
 const mealKeys=new Set(base.meals.map(m=>m.id));
 const freshMeals=addition.meals.filter(m=>!mealKeys.has(m.id));
 const dictMerge=mergePersonalFoods(base.personalFoods,addition.personalFoods);
 const vitalKeys=new Set(base.vitals.map(v=>v.id));const freshVitals=addition.vitals.filter(v=>!vitalKeys.has(v.id));
 return {state:normalizeState({...base,logs:[...base.logs,...fresh],profile:profileIsSet?base.profile:addition.profile,weights:[...base.weights,...addition.weights.filter(w=>!weightKeys.has(w.date))],profileHistory:[...base.profileHistory,...addition.profileHistory.filter(h=>!base.profileHistory.some(x=>x.date===h.date))],meals:[...base.meals,...freshMeals],personalFoods:dictMerge.foods,vitals:[...base.vitals,...freshVitals],pfcGoal:base.pfcGoal,pfcPreset:base.pfcPreset,uiLanguage:base.uiLanguage,caloriePlan:base.caloriePlan,evaluationLevel:base.evaluationLevel,trainingPrefs:base.trainingPrefs,dnaMarkers:Object.values(base.dnaMarkers).some(Boolean)?base.dnaMarkers:addition.dnaMarkers}),added:fresh.length,skipped: addition.logs.length-fresh.length,mealsAdded:freshMeals.length,personalFoodsAdded:dictMerge.added,vitalsAdded:freshVitals.length};
}
export function validateProfile(p){const h=Number(p.height),w=Number(p.weight),age=Number(p.age);if(!Number.isFinite(h)||h<90||h>240)throw Error('身長は90〜240cmで入力してください');if(!Number.isFinite(w)||w<25||w>350)throw Error('体重は25〜350kgで入力してください');if(p.age!==''&&(!Number.isInteger(age)||age<1||age>120))throw Error('年齢を確認してください');if(p.fat!==''&&(n(p.fat)<1||n(p.fat)>70))throw Error('体脂肪率を確認してください');return true;}
export function setsOf(log){return (log?.exercises||[]).reduce((a,e)=>a+(e.groups||[]).reduce((n,g)=>n+nSafe(g.sets),0),0)}
const nSafe=x=>Number.isFinite(Number(x))?Number(x):0;
export function tonnage(log){return round((log?.exercises||[]).reduce((a,e)=>a+(e.groups||[]).reduce((v,g)=>v+(nSafe(g.weight)*nSafe(g.reps)*nSafe(g.sets)),0),0));}
export function bestE1RM(log,exerciseName){const vals=(log?.exercises||[]).filter(e=>!exerciseName||e.name===exerciseName).flatMap(e=>e.groups||[]).filter(g=>g.weight>0&&g.reps>0&&g.reps<=10).map(g=>g.weight*(1+g.reps/30));return vals.length?round(Math.max(...vals),10):null;}
export function stimulus(logs){const result={};for(const l of logs){for(const ex of l.exercises||[]){const sets=ex.groups?.reduce((v,g)=>v+nSafe(g.sets),0)||0;for(const id of ex.primary||[])result[id]=(result[id]||0)+sets;for(const id of ex.secondary||[])result[id]=(result[id]||0)+sets*.5;}}return result;}
// Gross and net estimates follow 1 MET = 3.5 ml O2/kg/min; 1L O2 ~ 5kcal.
export function energy(log){
 const wt=Number(log.weightSnapshot),strength=Number(log.minutes)||0;
 const out={gross:null,net:null,low:null,high:null,strengthGross:null,strengthNet:null,cardioGross:null,cardioNet:null,partial:false,assumptions:[]};
 if(!(wt>0))return out;
 let total=0,net=0,lo=0,hi=0,known=false,sgross=0,snet=0,cgross=0,cnet=0;
 if(strength>0){
  const met={light:3,moderate:3.5,vigorous:6}[log.intensity]||3.5;
  const m=1.05*wt*strength/60;
  sgross=m*met;snet=m*(met-1);total+=sgross;net+=snet;lo+=m*3.5;hi+=m*6;known=true;
  out.assumptions.push('筋トレの強度による概算（休憩込み）');
 }else if((log.exercises||[]).length){out.partial=true;out.assumptions.push('筋トレ時間未入力のため筋トレ消費を計上できません');}
 for(const c of log.cardio||[]){
  if(!(c.minutes>0)||!(c.met>0)){out.partial=true;continue}
  const m=1.05*wt*c.minutes/60;
  const g=m*c.met,n=m*(c.met-1);
  total+=g;net+=n;lo+=g;hi+=g;cgross+=g;cnet+=n;known=true;
  if(c.name==='トレッドミル')out.assumptions.push('トレッドミルはACSM歩行式の近似。手すり使用などは未補正');
 }
 if(known){
  out.gross=Math.round(total);out.net=Math.round(net);out.low=Math.round(lo);out.high=Math.round(hi);
  out.strengthGross=Math.round(sgross);out.strengthNet=Math.round(snet);
  out.cardioGross=Math.round(cgross);out.cardioNet=Math.round(cnet);
 }
 return out;
}
export function summary(logs){const all=(logs||[]),totals=stimulus(all),kcal=all.map(energy);return {sessions:all.length,sets:all.reduce((v,l)=>v+setsOf(l),0),tonnage:all.reduce((v,l)=>v+tonnage(l),0),totalEnergy:kcal.some(x=>x.gross!==null)?kcal.reduce((v,x)=>v+(x.gross||0),0):null,partial:kcal.some(x=>x.partial),muscles:totals};}
export function filterPeriod(logs,days,asOf=localToday()){const to=new Date(asOf+'T12:00:00'),from=new Date(to);from.setDate(from.getDate()-days+1);const start=localToday(from);return logs.filter(l=>l.date>=start&&l.date<=asOf);}
export function feedback(logs,goal='balanced'){const v=summary(logs),rank=Object.entries(v.muscles).sort((a,b)=>b[1]-a[1]);const notes=[];
 if(!logs.length)return ['記録を追加すると、筋肉への推定刺激と週間トレンドが表示されます。'];
 if(rank.length)notes.push(`直近の最多刺激部位は${names[rank[0][0]]}（${round(rank[0][1],10)}セット相当）です。`);
 const shoulder=Number(v.muscles.delt_front)||0,triceps=Number(v.muscles.triceps)||0;
 if(shoulder>=15&&triceps>=9)notes.push('プレス系の累積負荷が高めです。肩・肘の違和感、RIR、パフォーマンスの低下がないか確認してください。');
 if(goal==='proportion'){
  // Appearance goals are evaluated only as training coverage, never as guaranteed body-shape outcomes.
  const targets=[['chest','胸'],['lats','背中'],['delt_side','肩中部'],['delt_rear','肩後部'],['quads','脚前部'],['hamstrings','脚後部'],['glutes','臀部']];
  const missing=targets.filter(([key])=>!v.muscles[key]).map(([,name])=>name);
  notes.push(missing.length?`体型改善の観点では部位の偏りも確認しましょう。この表示期間に記録のない部位：${missing.join('・')}。予定している分割法も考慮してください。`:'体型改善目標：主要部位に記録があります。セット数・姿勢・体重等の推移を継続して確認してください。');
  notes.push('ヒートマップは筋肉への推定刺激で、見た目の変化や体脂肪分布は評価できません。');
 }
 const major=['chest','lats','quads','hamstrings','glutes'];const absent=major.filter(x=>!v.muscles[x]);if(absent.length)notes.push('この期間に記録のない大筋群があります。予定した分割法と休養日を含めて確認してください。');
 if(v.partial)notes.push('一部有酸素運動は速度または時間が不明なため、カロリーに含まれていません。');
 notes.push('セット相当数は種目辞書からのモデル推定であり、筋活動や成長を実測した値ではありません。');return notes;
}

// ENERGY CONTROL v2.2: all estimates are informational, never measured metabolic expenditure.
// Mifflin-St Jeor RMR for adults; sex unspecified does not imply a default coefficient.
export function restingMetabolicRate(profile){
 const w=Number(profile?.weight),h=Number(profile?.height),a=Number(profile?.age);
 if(!(w>0&&h>0&&Number.isInteger(a)&&a>=19&&a<=78))return null;
 if(!['male','female'].includes(profile?.sex))return null;
 return Math.round(10*w+6.25*h-5*a+(profile.sex==='male'?5:-161));
}
export function validateCaloriePlan(p){
 const activityFactor=Number(p.activityFactor),goalAdjustment=Number(p.goalAdjustment),exerciseCredit=Number(p.exerciseCredit);
 if(![1.2,1.35,1.5,1.7].includes(activityFactor))throw Error('日常活動係数の選択が正しくありません。');
 if(!Number.isFinite(goalAdjustment)||goalAdjustment< -500||goalAdjustment>500)throw Error('目標調整量は−500〜＋500kcalにしてください。');
 if(![0,0.5,1].includes(exerciseCredit))throw Error('運動消費の反映率を選択してください。');
 return {activityFactor,goalAdjustment,exerciseCredit};
}
export function normalizeMeal(m){
 if(!m||typeof m!=='object')throw Error('食事記録が不正です。');
 const date=String(m.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00')))throw Error('食事記録の日付が不正です。');
 const name=String(m.name||'').trim().slice(0,180);
 const kcal=Number(m.kcal);
 if(!name||!Number.isFinite(kcal)||kcal<0||kcal>15000)throw Error('食事名・カロリーを確認してください。');
 const macros={};for(const key of ['protein','fat','carbs']){
  const v=m[key]==null||m[key]===''?null:Number(m[key]);
  if(v!==null&&(!Number.isFinite(v)||v<0||v>1000))throw Error('三大栄養素の値を確認してください。');
  macros[key]=v;
 }
 const mealType=['breakfast','lunch','dinner','snack'].includes(m.mealType)?m.mealType:'snack';
 return {id:String(m.id||uid()).slice(0,120),date,name,kcal:Math.round(kcal),...macros,mealType,notes:String(m.notes||'').slice(0,500),inputMode:['ingredients','dish','product','manual'].includes(m.inputMode)?m.inputMode:'manual',estimated:!!m.estimated,rawText:String(m.rawText||'').slice(0,4000),foodItems:Array.isArray(m.foodItems)?m.foodItems.slice(0,120).map(x=>({label:String(x.label||'').slice(0,300),food:x.food||null,grams:x.grams==null?null:Number(x.grams),source:['reference','label','manual','unknown'].includes(x.source)?x.source:'unknown',excluded:!!x.excluded,confidence:String(x.confidence||'').slice(0,30),nutrients:Object.fromEntries(['kcal','protein','fat','carbs'].map(k=>[k,x.nutrients?.[k]==null?null:Number(x.nutrients[k])]))})):[],foodParserVersion:Number(m.foodParserVersion)||null,manualOverride:!!m.manualOverride,createdAt:m.createdAt||new Date().toISOString(),updatedAt:m.updatedAt||null};
}
/** Date-sensitive input for historical RMR. Do not apply today's weight to an old workout
 * when a historical weight is available; do not invent a sex or historical age/height.
 * History recorded from v3.3 is preferred when an as-of record exists. */
export function historicalProfileForDate(state,date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z')))throw Error('日付が正しくありません');
 const current=state.profile||defaultProfile(), today=localToday();
 const history=(state.profileHistory||[]).filter(h=>h.date<=date).sort((a,b)=>b.date.localeCompare(a.date));
 const base=history.length?history[0].profile:current;
 const profile={...base};
 // A demographic setting previously left unselected can be completed later, without changing historical weight.
 if(profile.sex==='none' && ['male','female'].includes(current.sex))profile.sex=current.sex;
 const candidates=[];
 for(const x of state.weights||[])if(x.date<=date&&Number(x.weight)>0)candidates.push({date:x.date,weight:Number(x.weight),source:'weight-record',priority:2});
 for(const x of state.logs||[])if(x.date<=date&&Number(x.weightSnapshot)>0)candidates.push({date:x.date,weight:Number(x.weightSnapshot),source:'workout-weight',priority:1});
 candidates.sort((a,b)=>b.date.localeCompare(a.date)||b.priority-a.priority);
 let weightSource='current-profile';
 if(date<today&&candidates.length){
  // A dated profile with a more recent explicit weight supersedes earlier workout snapshots.
  if(history.length && history[0].date>=candidates[0].date && Number(profile.weight)>0){weightSource='dated-profile';}
  else {profile.weight=String(candidates[0].weight);weightSource=candidates[0].source;}
 }
 if(date>=today){profile.weight=current.weight;weightSource='current-profile';}
 const bodyProfileSource=history.length?'dated-profile':'current-profile-fallback';
 return {profile,weightSource,bodyProfileSource,referenceDate:history[0]?.date||null};
}
export function dayCalorieBalance(state,date){
 const historical=historicalProfileForDate(state,date);
 const bmr=restingMetabolicRate(historical.profile);
 const rmrMale=restingMetabolicRate({...historical.profile,sex:'male'});
 const rmrFemale=restingMetabolicRate({...historical.profile,sex:'female'});
 const rmrRange=bmr===null&&rmrMale!==null&&rmrFemale!==null?[Math.min(rmrMale,rmrFemale),Math.max(rmrMale,rmrFemale)]:null;
 const plan=validateCaloriePlan({...defaultCaloriePlan(),...(state.caloriePlan||{})});
 const sessions=(state.logs||[]).filter(l=>l.date===date);
 const spent=sessions.map(energy);
 // Sessions with unknown duration/weight remain flagged as partial; never silently counted as 0 kcal.
 const knownSessions=spent.filter(x=>x.net!==null);
 const netEx=spent.reduce((sum,x)=>sum+(x.net??0),0);
 const grossEx=spent.reduce((sum,x)=>sum+(x.gross??0),0);
 const strengthNet=spent.reduce((sum,x)=>sum+(x.strengthNet??0),0);
 const cardioNet=spent.reduce((sum,x)=>sum+(x.cardioNet??0),0);
 const strengthGross=spent.reduce((sum,x)=>sum+(x.strengthGross??0),0);
 const cardioGross=spent.reduce((sum,x)=>sum+(x.cardioGross??0),0);
 const anyUnknown=spent.some(x=>x.partial||(x.net===null));
 const consumed=(state.meals||[]).filter(m=>m.date===date);
 const intake=consumed.reduce((sum,m)=>sum+m.kcal,0);
 const macros=Object.fromEntries(['protein','fat','carbs'].map(key=>[key,consumed.some(m=>m[key]!==null)?Math.round(consumed.reduce((sum,m)=>sum+(m[key]||0),0)*10)/10:null]));
 const baseline=bmr===null?null:Math.round(bmr*plan.activityFactor);
 const baselineRange=rmrRange?rmrRange.map(v=>Math.round(v*plan.activityFactor)):null;
 // Always compute exercise independently of BMR. Missing sex must not hide logged exercise calories.
 // The food target credits only a configurable share of NET kcal to reduce false precision.
 const exerciseAddition=Math.round(netEx*plan.exerciseCredit);
 const maintenance=baseline===null?null:baseline+exerciseAddition;
 const target=maintenance===null?null:maintenance+plan.goalAdjustment;
 return {bmr,baseline,rmrRange,baselineRange,profileUsed:historical.profile,weightSource:historical.weightSource,bodyProfileSource:historical.bodyProfileSource,netEx,grossEx,strengthNet,cardioNet,strengthGross,cardioGross,
  hasExerciseRecords:sessions.length>0,knownExerciseSessions:knownSessions.length,exerciseSessions:sessions.length,
  exerciseAddition,maintenance,target,intake,hasMeals:consumed.length>0,mealCount:consumed.length,
  remaining:target===null||!consumed.length?null:target-intake,macros,plan,partial:anyUnknown};
}

/** RECOVERY READINESS ESTIMATE (not a physiological measurement)
 * Muscle-specific calendar-day screening based on per-day exposure, direct vs indirect sets,
 * intensity, and set RIR where available. No fixed waiting period establishes clinical readiness.
 * Model version recovery-cal-days-v1; see documentation for assumptions.
 */
export const recoveryModelVersion='recovery-cal-days-v1';
export function estimateRestDays(effectiveSets,{nearFailure=false,vigorous=false,level='intermediate'}={}){
 if(!(Number(effectiveSets)>0))return 0;
 let days= effectiveSets<=2?1:effectiveSets<=5?2:effectiveSets<=9?3:4;
 if(nearFailure)days+=1;
 if(vigorous&&effectiveSets>2)days+=1;
 if(level==='beginner'&&effectiveSets>3)days+=1;
 return Math.min(5,days);
}
const diffCalendarDays=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
export function recoveryForecast(logs,asOf=localToday(),profile={},extraRestDays=0){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(Date.parse(asOf+'T12:00:00Z')))throw Error('回復表示日が正しくありません');
 const grouped=new Map();
 for(const log of (logs||[])){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(log.date||'')||log.date>asOf)continue;
  if(diffCalendarDays(asOf,log.date)>15)continue;
  let day=grouped.get(log.date);if(!day){day=new Map();grouped.set(log.date,day)}
  for(const ex of log.exercises||[]){
   const sets=(ex.groups||[]).reduce((sum,g)=>sum+(Number(g.sets)||0),0);
   if(!(sets>0))continue;
   const nearFailure=(ex.groups||[]).some(g=>g.rir!==null&&g.rir!==undefined&&Number(g.rir)<=1);
   const p=new Set(ex.primary||[]),secondary=new Set(ex.secondary||[]);
   for(const id of p){if(!(id in names))continue;const info=day.get(id)||{sets:0,nearFailure:false,vigorous:false};info.sets+=sets;info.nearFailure ||=nearFailure;info.vigorous ||=log.intensity==='vigorous';day.set(id,info)}
   for(const id of secondary){if(!(id in names)||p.has(id))continue;const info=day.get(id)||{sets:0,nearFailure:false,vigorous:false};info.sets+=sets*.5;info.nearFailure ||=nearFailure;info.vigorous ||=log.intensity==='vigorous';day.set(id,info)}
  }
 }
 const items={};
 for(const id of Object.keys(names)){
  const exposures=[...grouped.entries()].filter(([,parts])=>parts.has(id)).map(([date,parts])=>{
   const data=parts.get(id),baseDays=estimateRestDays(data.sets,{nearFailure:data.nearFailure,vigorous:data.vigorous,level:profile.level});
   // User adjustment is a subjective estimate, not a physiological clearance.
   // Keep at least one estimated calendar day for any recorded exposure.
   const requiredDays=Math.max(1,baseDays+([-3,-2,-1,0,1,2,3].includes(Number(extraRestDays))?Number(extraRestDays):0));
   const elapsedDays=diffCalendarDays(asOf,date);
   return {date,effectiveSets:Math.round(data.sets*10)/10,requiredDays,elapsedDays,remainingDays:Math.max(0,requiredDays-elapsedDays)};
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const remainingDays=Math.max(0,...exposures.map(x=>x.remainingDays));
  const last=exposures[0]||null;
  const state=remainingDays>=2?'warning':remainingDays===1?'caution':'ready';
  const statusLabel=state==='warning'?'トレーニング警告':state==='caution'?'トレーニング注意':'トレーニング可';
  // A blue state means no estimated residual load *in recorded sessions*, not medical clearance.
  items[id]={id,name:names[id],state,statusLabel,remainingDays,lastDate:last?.date||null,lastExposure:last?.effectiveSets||0,restDays:last?.requiredDays||0,hasRecord:!!last};
 }
 const counts={ready:0,caution:0,warning:0};Object.values(items).forEach(x=>counts[x.state]++);
 return {asOf,modelVersion:recoveryModelVersion,items,counts,observedTrainingDays:grouped.size};
}
