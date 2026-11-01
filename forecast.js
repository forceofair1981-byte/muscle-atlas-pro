/** Muscle Atlas Pro 2.4 – conditional scenarios, NOT medical or individual predictions.
 * Training is repeated at the RECORDED weekly frequency and effort, not every day.
 * Body weight uses a simplified iterative energy-balance model; it is NOT the NIDDK model.
 * The 7,700 kcal/kg factor is an illustrative approximation, not a biological constant.
 * Strength uses measured e1RM history where enough dates exist, otherwise stays flat.
 */
import {energy, bestE1RM, restingMetabolicRate, localToday} from './engine.js';
export const FORECAST_DAYS=[7,14,30];
export const forecastDefault=()=>({dailyIntake:'',strengthMode:'trend',strengthMonthlyPct:0,exercise:''});
export function normalizeForecastSettings(p={}){
 const intake=p.dailyIntake===''||p.dailyIntake==null?'':Number(p.dailyIntake);
 if(intake!==''&&(!Number.isFinite(intake)||intake<1000||intake>6000))throw Error('仮定する1日の摂取量は1,000〜6,000kcalにしてください。');
 const mode=['trend','flat','manual'].includes(p.strengthMode)?p.strengthMode:'trend';
 const pct=Number(p.strengthMonthlyPct??0);
 if(!Number.isFinite(pct)||pct < -5||pct > 5)throw Error('1RM変化率は30日あたり−5〜＋5%で指定してください。');
 return {dailyIntake:intake,strengthMode:mode,strengthMonthlyPct:pct,exercise:String(p.exercise||'').slice(0,180)};
}
const round=(v,d=1)=>Math.round(v*10**d)/10**d;
const addDays=(date,d)=>{const x=new Date(date+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+d);return x.toISOString().slice(0,10)};
const elapsed=(a,b)=>(Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000;
function strengthModel(logs,selected,plan,asOf){
 const eligible=[...new Set(logs.flatMap(l=>(l.exercises||[]).map(e=>e.name)))].filter(n=>logs.some(l=>bestE1RM(l,n)!==null));
 const chosen=eligible.includes(selected)?selected:eligible[0]||'';
 if(!chosen)return {name:'',base:null,trend:null,mode:'missing',history:0};
 const byDay=new Map();
 for(const l of logs){if(l.date>asOf)continue;const value=bestE1RM(l,chosen);if(value!=null)byDay.set(l.date,Math.max(byDay.get(l.date)||0,value));}
 const history=[...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]));if(!history.length)return {name:chosen,base:null,trend:null,mode:'missing',history:0};
 const base=history.at(-1)[1];let pct=0,mode='flat',duration=0;
 if(plan.strengthMode==='manual'){pct=plan.strengthMonthlyPct;mode='manual'}
 else if(plan.strengthMode==='trend'&&history.length>=3){
   const recent=history.slice(-8),start=recent[0],end=recent.at(-1);
   duration=elapsed(end[0],start[0]);
   if(duration>=14&&start[1]>0){pct=Math.max(-3,Math.min(3,(end[1]/start[1]-1)*100*30/duration));mode='observed';}
 }
 return {name:chosen,base,trend:pct,mode,history:history.length,duration};
}
/** Returns null fields when required profile/intake/body-fat observations are unavailable.
 * As-of is local civil date. Include only logged workouts on or before as-of.
 */
export function forecastScenario(state,options={},asOf=localToday()){
 const plan=normalizeForecastSettings({...forecastDefault(),...(state.forecastPlan||{}),...options});
 const workoutLogs=(state.logs||[]).filter(l=>l.date<=asOf);
 const recentStart=addDays(asOf,-6),recent=workoutLogs.filter(l=>l.date>=recentStart);
 const validEnergy=recent.map(energy);
 const averageNet=validEnergy.reduce((sum,e)=>sum+(e.net??0),0)/7;
 const unknownEnergy=validEnergy.some(e=>e.partial||e.net===null);
 const p=state.profile||{};
 const initialWeight=Number(p.weight);
 const bmr=restingMetabolicRate(p);
 const validWeight=Number.isFinite(initialWeight)&&initialWeight>=25&&initialWeight<=350;
 const validBodyFat=p.fat!==''&&p.fat!=null&&Number.isFinite(Number(p.fat))&&Number(p.fat)>=1&&Number(p.fat)<=70;
 const bf=validBodyFat?Number(p.fat):null;
 const caloriePlan=state.caloriePlan||{};
 const activity=[1.2,1.35,1.5,1.7].includes(Number(caloriePlan.activityFactor))?Number(caloriePlan.activityFactor):1.2;
 const canWeight=bmr!==null&&validWeight&&plan.dailyIntake!=='';
 const baseline=bmr===null?null:bmr*activity;
 const maintenance=baseline===null?null:baseline+averageNet;
 const st=strengthModel(workoutLogs,plan.exercise,plan,asOf);
 let weight=initialWeight;
 const output=[];
 for(let day=1;day<=30;day++){
  if(canWeight){
    // Crude daily update: adapt the estimated baseline and exercise expenditure as modeled weight changes.
    const dayBMR=bmr+10*(weight-initialWeight);
    const dayOut=dayBMR*activity+averageNet*weight/initialWeight;
    const net=plan.dailyIntake-dayOut;
    weight+=Math.max(-.15,Math.min(.15,net/7700));
  }
  if(FORECAST_DAYS.includes(day)){
   const variationKg=.6+.035*day; // illustrative range covers normal short-term fluctuations; NOT calibrated probability.
   const dw=canWeight?weight-initialWeight:null;
   const bfPoint=canWeight&&bf!==null?round((initialWeight*bf/100+dw*(dw<0?.75:.5))/weight*100,1):null;
   const bfUncertainty=.9+.025*day;
   const gain=st.base!==null?st.base*(1+(st.trend||0)/100*day/30):null;
   const rmSpread=st.base===null?null:st.base*(.045+.001*day);
   output.push({days:day,date:addDays(asOf,day),weight:canWeight?round(weight,1):null,
     weightRange:canWeight?[round(Math.max(0,weight-variationKg),1),round(weight+variationKg,1)]:null,
     bodyFat:bfPoint,
     bodyFatRange:bfPoint!==null?[round(Math.max(0,bfPoint-bfUncertainty),1),round(Math.min(70,bfPoint+bfUncertainty),1)]:null,
     e1rm:gain===null?null:round(gain,1),
     e1rmRange:gain===null?null:[round(Math.max(0,gain-rmSpread),1),round(gain+rmSpread,1)]});
  }
 }
 const notes=[];
 if(!validWeight||bmr===null)notes.push('体重・身長・19〜78歳の年齢・性別をプロフィールに設定すると、体重予測を利用できます。');
 if(plan.dailyIntake==='')notes.push('食事摂取量が未設定です。体重と体脂肪率の予測は保留しています。');
 if(bf===null)notes.push('体脂肪率の実測記録がないため、体脂肪率の予測は表示しません。');
 if(!recent.length)notes.push('直近7日に筋トレ履歴がありません。運動の追加消費は0として試算しています。');
 else if(recent.length<=2)notes.push('直近7日の記録数が少ないため、週当たりの運動量は仮の継続条件です。記録が増えるほどシナリオを見直してください。');
 if(unknownEnergy)notes.push('一部の運動消費が未計算のため、トレーニング消費は過小評価される可能性があります。');
 if(st.base===null)notes.push('1〜10回の重量記録がないため、1RM予測は表示しません。');
 else if(st.mode==='flat')notes.push('1RMの経時データが不足するため、同強度継続＝横ばいの仮定で表示しています（成長率は推定不可）。');
 else if(st.mode==='observed')notes.push('1RMは複数日の推定1RMから30日換算の増減傾向を算出（±3%に制限）。未来を保証しません。');
 else notes.push('1RMはユーザーが指定した30日あたりの仮定変化率で試算しています。');
 notes.push('数値の上下幅は実測データから推定した95%信頼区間ではありません。水分・摂取量誤差・筋疲労などを考慮するための参考幅です。');
 return {asOf,plan,profile:{weight:validWeight?initialWeight:null,bodyFat:bf,bmr},averageNet:round(averageNet,0),sessionsInWeek:recent.length,baseline:baseline===null?null:round(baseline,0),maintenance:maintenance===null?null:round(maintenance,0),strength:st,results:output,notes,model:'conditional-scenario-v1'};
}
