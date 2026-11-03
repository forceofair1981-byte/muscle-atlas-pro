import {stimulus,filterPeriod,recoveryForecast,localToday,setsOf} from './engine.js';
import {names,E} from './catalog.js';
import {recommendForMuscle} from './recommend.js';
import {hiddenByExclusions,baseOf} from './detail.js';

// Candidate muscles cover distinct movement patterns. This is a scheduling heuristic,
// not medical clearance and not a prediction of exact recovery duration.
export const TRAINABLE_GROUPS={
 '胸':['chest_up','chest'], '肩':['delt_front','delt_side','delt_rear'],
 '背中':['lats','traps_mid','traps_lower'],
 '腕':['biceps','brachialis','triceps','forearm_front','forearm_back'],
 '体幹':['abs_upper','abs_lower','obliques','erectors'],
 '脚・臀':['quads','hamstrings','glutes','glute_med','adductors','gastrocnemius','soleus','tibialis']
};
export const CANDIDATES=[
 {id:'lats',pattern:'pull',priority:1.2},{id:'quads',pattern:'legs',priority:1.2},
 {id:'hamstrings',pattern:'legs',priority:1.05},{id:'glutes',pattern:'legs',priority:1.05},
 {id:'chest',pattern:'push',priority:1.15},{id:'chest_up',pattern:'push',priority:0.9},
 {id:'delt_side',pattern:'shoulders',priority:1.1},{id:'delt_rear',pattern:'pull',priority:1.1},
 {id:'biceps',pattern:'arms',priority:.7},{id:'triceps',pattern:'arms',priority:.7},
 {id:'abs_upper',pattern:'core',priority:.75},{id:'obliques',pattern:'core',priority:.7},
 {id:'glute_med',pattern:'legs',priority:.7},{id:'gastrocnemius',pattern:'calves',priority:.65},
 {id:'erectors',pattern:'pull',priority:.75}
];
export const dayAfter=iso=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(Date.parse(iso+'T12:00:00Z')))throw Error('基準日を確認してください');
 const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
};
function safeExercises(id,recovery,excluded,goal,maxPerTarget=3){
 const advice=recommendForMuscle(id,recovery.items[id],goal,8);const options=advice?.items||[];
 return options.filter(item=>{
  const e=E.find(x=>x.n===item.name);
  if(!e)return false; // Only suggest workouts that are actually loggable with the exercise dictionary.
  return [...new Set([...e.p,...e.s])].every(m=>!hiddenByExclusions(m,excluded)&&recovery.items[m]?.state!=='warning');
 }).slice(0,maxPerTarget);
}
export function planTomorrow({logs=[],profile={},excluded=[],asOf=localToday(),maxTargets=2,maxPerTarget=3,maxTotalExercises=Infinity,extraRestDays=0}={}){
 const tomorrow=dayAfter(asOf);
 const fortnight=filterPeriod(logs,14,asOf);
 const totals=stimulus(fortnight);
 const recovery=recoveryForecast(logs,tomorrow,profile,extraRestDays);
 const trainingDays=new Set(fortnight.filter(x=>setsOf(x)>0).map(x=>x.date)).size;
 const sessionCount=fortnight.length;
 const excludedUnique=[...new Set((excluded||[]).filter(id=>id in names || id.includes('_')))];
 const pool=[];
 for(const c of CANDIDATES){
  const id=c.id;
  if(hiddenByExclusions(id,excludedUnique))continue;
  const readiness=recovery.items[id];
  if(readiness?.state!=='ready')continue;
  const exercises=safeExercises(id,recovery,excludedUnique,profile.goal,maxPerTarget);
  if(!exercises.length)continue;
  const volume=Number(totals[id])||0;
  const frequency=new Set(fortnight.filter(l=>(l.exercises||[]).some(e=>e.primary?.includes(id)||e.secondary?.includes(id))).map(l=>l.date)).size;
  // Estimate a 7-day equivalent for explaining why a group was selected.
  const weeklyEquivalent=volume/2;
  // Under-trained recorded groups are ranked higher, but absence could mean planned rest or missing logging.
  const score=(Math.max(0,10-weeklyEquivalent)*1.25 + Math.max(0,3-frequency)*1.3)*c.priority;
  pool.push({...c,name:names[id],score,volume14:volume,weeklyEquivalent,frequency14:frequency,recovery:readiness,exercises});
 }
 pool.sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
 const selected=[],usedPatterns=new Set(),usedNames=new Set();let remaining=maxTotalExercises;
 for(const item of pool){
  if(selected.length>=maxTargets||remaining<=0)break;
  if(usedPatterns.has(item.pattern))continue;
  const ids=item.exercises.flatMap(x=>{const e=E.find(y=>y.n===x.name);return e?[...e.p,...e.s]:[]});
  // Avoid doubling up heavily on auxiliary muscles across suggested target areas.
  if(selected.length && ids.some(id=>selected[0].exerciseMuscles.includes(id)&&['delt_front','triceps','erectors'].includes(id)))continue;
  const uniqueExercises=item.exercises.filter(x=>!usedNames.has(x.name)).slice(0,remaining);
  if(!uniqueExercises.length)continue;
  for(const ex of uniqueExercises)usedNames.add(ex.name);remaining-=uniqueExercises.length;
  selected.push({...item,exercises:uniqueExercises,exerciseMuscles:[...new Set(ids)]});usedPatterns.add(item.pattern);
 }
 const note=trainingDays<3?'過去14日間の記録は少なめです。未記録の運動は反映されず、提案は仮のメニューです。':`過去14日間の筋トレ記録 ${trainingDays} 日分を参考にしています。`;
 const reason=selected.length?'回復が青（記録上）で、最近の部位別刺激量が比較的少ない候補から選びました。':'候補がありません。除外設定や回復状態を確認し、休息または軽い活動をご検討ください。';
 return {asOf,tomorrow,periodDays:14,sessionCount,trainingDays,totalSets:fortnight.reduce((v,l)=>v+setsOf(l),0),excluded:excludedUnique,selected: selected.map(({exerciseMuscles,...item})=>item),eligible:pool.length,note,reason,restSuggested:!selected.length};
}

// Plan for the selected calendar day using the preceding 14 complete days.
export const dayBefore=iso=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(Date.parse(iso+'T12:00:00Z')))throw Error('日付を確認してください');const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)};
export function planToday({logs=[],profile={},excluded=[],asOf=localToday(),maxExercises=5,extraRestDays=0}={}){
 const end=dayBefore(asOf);
 const prepared=planTomorrow({logs,profile,excluded,asOf:end,maxTargets:2,maxPerTarget:3,maxTotalExercises:Math.min(5,Math.max(1,maxExercises)),extraRestDays});
 // Records already made today should also affect readiness. Never prescribe an already trained muscle.
 const todayRecovery=recoveryForecast(logs,asOf,profile,extraRestDays);
 const eligible=prepared.selected.map(item=>({...item,exercises:item.exercises.filter(e=>{const def=E.find(x=>x.n===e.name);return def&&[...def.p,...def.s].every(id=>todayRecovery.items[id]?.state==='ready'&&!hiddenByExclusions(id,excluded));})})).filter(x=>x.exercises.length);
 const selected=[];let remaining=Math.min(5,Math.max(1,maxExercises));
 for(const item of eligible){if(remaining<=0)break;const exercises=item.exercises.slice(0,remaining);selected.push({...item,exercises});remaining-=exercises.length;}
 return {...prepared,asOf,today:asOf,selected,restSuggested:!selected.length,note:prepared.note,reason:selected.length?'前日までの14日間の記録と当日の回復状態で、実施候補を2部位・合計最大5種目まで表示します。':'回復推定・除外設定により本日の安全側の提案候補がありません。休養を検討してください。'};
}
