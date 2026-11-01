/** Daily workout review: transparent coaching heuristics, NOT a clinical readiness model.
 * Based on recorded sets, distribution, RIR completeness and 48h overlap. Do not
 * assign physiological risk or guarantee progress. Strictness changes only coaching tone
 * and rubric penalties; it does not rewrite session data or recovery map states.
 */
import {stimulus,setsOf} from './engine.js';
import {names} from './catalog.js';
export const LEVELS={gentle:'優しい',normal:'普通',strict:'厳しい'};
const MULTIPLIER={gentle:.7,normal:1,strict:1.3};
const after=(date,delta)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+delta);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const round=x=>Math.round(x*10)/10;
export function evaluateTrainingDay(allLogs,date,level='normal',goal='balanced'){
 if(!LEVELS[level])level='normal';
 const day=(allLogs||[]).filter(l=>l.date===date);
 if(!day.length)return null;
 const todaySets=day.reduce((sum,l)=>sum+setsOf(l),0),exercises=day.flatMap(l=>l.exercises||[]);
 const cardio=day.flatMap(l=>l.cardio||[]), current=stimulus(day);
 const week=(allLogs||[]).filter(l=>l.date>=after(date,-6)&&l.date<=date);
 const weekly=stimulus(week),prev1=stimulus((allLogs||[]).filter(l=>l.date===after(date,-1)));
 const prev2=stimulus((allLogs||[]).filter(l=>l.date===after(date,-2)));
 const rr=exercises.flatMap(e=>e.groups||[]).filter(g=>Number.isFinite(Number(g.sets))&&g.sets>0);
 const rirKnown=rr.reduce((a,g)=>a+(g.rir!=null?g.sets:0),0);
 const totalGroups=rr.reduce((a,g)=>a+g.sets,0);
 const factors=[],positives=[];
 const note=(id,category,severity,points,detail,advice)=>factors.push({id,category,severity,points,detail,advice});
 if(todaySets){positives.push(`${exercises.length}種目・${todaySets}セットの筋力トレーニングを記録しました。`);}
 else if(cardio.length)positives.push('有酸素運動の記録を確認しました。筋力の評価は筋トレ実施日と分けて扱います。');
 if(cardio.length)positives.push(`有酸素運動${cardio.length}件も記録されています。`);
 const sorted=Object.entries(current).sort((a,b)=>b[1]-a[1]);
 const top=sorted[0];
 if(todaySets&&top&&top[1]>=9){note('single-muscle','部位別負荷',top[1]>=14?'high':'caution',top[1]>=14?12:6,
  `${names[top[0]]||top[0]}に約${round(top[1])}セット相当の刺激が集中しています。`,`同じ部位を鍛える種目の重なりを見直し、必要なら翌回に分散しましょう。`);}
 const weekPeak=Object.entries(weekly).filter(([id,x])=>x>=18&&(!top||id!==top[0])).sort((a,b)=>b[1]-a[1])[0];
 if(weekPeak)note('weekly-load','週間負荷',weekPeak[1]>=25?'high':'caution',weekPeak[1]>=25?10:5,`${names[weekPeak[0]]||weekPeak[0]}の直近7日間は約${round(weekPeak[1])}セット相当です。`,`週間の頻度、回復感、パフォーマンスの変化を確認しましょう。`);
 const overlaps=Object.entries(current).filter(([id,n])=>n>=2&&(prev1[id]||0)>=2).sort((a,b)=>Math.min(b[1],prev1[b[0]])-Math.min(a[1],prev1[a[0]]));
 if(overlaps.length){const [id,v]=overlaps[0],prev=prev1[id];const elevated=v>=4&&prev>=4;
  note('consecutive-overlap','連日刺激',elevated?'high':'caution',elevated?13:8,
   `${names[id]||id}は前日も刺激されています（前日${round(prev)}、当日${round(v)}セット相当）。`,`痛み、RIR、筋力低下を確認し、同じ部位の高負荷連続実施は慎重に判断しましょう。`);}
 else {const two=Object.entries(current).find(([id,v])=>v>=4&&(prev2[id]||0)>=6);if(two)note('two-day-overlap','回復・頻度','info',2,`${names[two[0]]||two[0]}は2日前にも負荷があります。`,'筋肉痛・前回の運動成績を確認してください。');}
 if(todaySets){
  if(rirKnown===0)note('missing-rir','記録の充実度','info',4,'RIRが未記録のため、限界への近さは判定できません。','主なセットだけでも「あと何回できたか（RIR）」を記録すると評価が正確になります。');
  if(!day.some(l=>l.minutes>0))note('missing-time','記録の充実度','info',5,'筋トレ時間が未記録です。','運動時間（休憩を含む）も記録してください。');
  if(day.every(l=>l.restMinutes==null))note('missing-rest','記録の充実度','info',2,'セット間休憩が未記録です。','休憩時間を入力すると次回の負荷調整に役立ちます。');
  if(totalGroups&&rirKnown/totalGroups>=.7)positives.push('RIRが多くのセットに記録されており、疲労を評価しやすい状態です。');
  const nearFailure=rr.filter(g=>g.rir!==null&&g.rir<=1).reduce((s,g)=>s+g.sets,0);
  if(totalGroups>=6&&nearFailure/totalGroups>.65)note('failure-density','追い込み度','caution',6,'RIR 0〜1のセットが全体の約3分の2以上です。','限界付近のセットが多い日は、翌日の疲労やフォームの乱れを確認しましょう。');
 }
 const missingCardio=cardio.filter(c=>c.needsReview||!(c.minutes>0)||!(c.met>0));
 if(missingCardio.length)note('unknown-cardio','記録の充実度','info',3,'有酸素の速度・時間など一部の条件が未確定です。','計算できない消費カロリーは推定合計に含めていません。');
 // A day in a split is not penalized for missing other body parts.
 if(goal==='strength'&&todaySets>0&&rr.every(g=>g.reps>=15))note('strength-reps','目標適合','info',3,'記録された反復回数はすべて15回以上です。','最大筋力が主目標なら、重い負荷での低〜中回数セットも検討できます。');
 // Scores are deliberately bounded, heuristic and mode-dependent. Never a medical safety score.
 const deductions=factors.reduce((s,f)=>s+f.points,0);
 const score=Math.max(0,Math.min(100,Math.round(100-deductions*MULTIPLIER[level])));
 const label=score>=88?'良好':score>=72?'おおむね良好':score>=56?'調整を検討':'見直しを推奨';
 const tone={gentle:'継続できた点を重視します。次回は改善点を一つずつ取り入れましょう。',normal:'負荷と回復のバランスを確認し、次回の調整につなげましょう。',strict:'数値を細かく点検します。改善点は優先順位をつけて修正しましょう。'}[level];
 return {date,level,levelLabel:LEVELS[level],goal,score,label,sets:todaySets,sessions:day.length,exercises:exercises.length,cardio:cardio.length,stimulus:current,positives,factors,priorities:factors.filter(f=>f.severity==='high'||f.severity==='caution').slice(0,3),tone,modeExplanation:'評価点はアプリ独自の記録点検指標（0〜100）。医学的な回復・安全性判定や筋肥大効果の確率ではありません。'};
}
