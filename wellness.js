/** Privacy-preserving offline food parsing. All estimates are explicit and editable. */
import {FOOD_CATALOG} from './food_catalog.js';
const foodClean=v=>String(v??'').normalize('NFKC').trim();
const foodNum=v=>Number(v);
const r1=v=>Math.round((v+Number.EPSILON)*10)/10;
export const FOOD_REFERENCE=FOOD_CATALOG;
const MACRO_KEYS=['kcal','protein','fat','carbs'];
const EMPTY=()=>({kcal:null,protein:null,fat:null,carbs:null});
function pickNutrient(text,word){
  const labels={
    kcal:[String.raw`(?:エネルギー|熱量|カロリー|energy)\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:kcal|キロカロリー)?`,String.raw`([0-9]+(?:\.[0-9]+)?)\s*kcal`],
    protein:[String.raw`(?:たんぱく質|タンパク質|蛋白質|protein)\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*g?`,String.raw`(?:^|[\s,、(])P\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*g(?:$|[\s,、)])`],
    fat:[String.raw`(?:脂質|脂肪|fat)\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*g?`,String.raw`(?:^|[\s,、(])F\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*g(?:$|[\s,、)])`],
    carbs:[String.raw`(?:炭水化物|carbohydrates?|carbs?)\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*g?`,String.raw`(?:^|[\s,、(])C\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*g(?:$|[\s,、)])`]
  };
  for(const pattern of labels[word]){const m=text.match(new RegExp(pattern,'i'));if(m)return foodNum(m[1]);}
  return null;
}
function explicit(s){const text=foodClean(s);return Object.fromEntries(MACRO_KEYS.map(k=>[k,pickNutrient(text,k)]));}
const servingBasis=(s)=>{
 const t=foodClean(s);
 if(/(?:100\s*g|100\s*グラム)\s*(?:あたり|当たり|につき|毎)/i.test(t))return {type:'per100g',label:'100g当たり'};
 if(/100\s*(?:ml|mL|cc)\s*(?:あたり|当たり|につき|毎)/i.test(t))return {type:'per100ml',label:'100mL当たり'};
 if(/(?:1|一)\s*(?:袋|個|本|包装|パック|食|枚)\s*(?:あたり|当たり|につき|毎)/.test(t))return {type:'perunit',label:'1単位当たり'};
 if(/(?:1食分|1回分|1食|1回)\s*(?:あたり|当たり|につき|毎)/.test(t))return {type:'perunit',label:'1食当たり'};
 return {type:'unknown',label:'表示単位を確認'};
};
function consumption(s){const t=foodClean(s);
 // Phrases such as 内容量 300g are NOT interpreted as consumed amount.
 let g=t.match(/(?:摂取量|食べた量|実食量|使用量|飲んだ量)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*(g|ml|cc)/i);
 if(g)return {value:Number(g[1]),unit:/^(g)$/i.test(g[2])?'g':'ml',explicit:true};
 let units=t.match(/(?:摂取数|食べた数|飲んだ数)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/);
 if(units)return {value:Number(units[1]),unit:'unit',explicit:true};
 return null;
}
export function parseLabel(text,{amount=null,unit=null}={}){
 const s=foodClean(text).replace(/[\r\n]+/g,' '),mac=explicit(s),basis=servingBasis(s);
 const found=MACRO_KEYS.filter(k=>mac[k]!==null).length;
 const eaten=amount!==null&&amount!==''&&Number.isFinite(Number(amount))&&Number(amount)>0
  ?{value:Number(amount),unit:unit||'g',explicit:true}:consumption(s);
 let factor=1,needsPortion=false;
 if(basis.type==='per100g'||basis.type==='per100ml'){
   if(!eaten||!(eaten.value>0)||eaten.unit!==(basis.type==='per100g'?'g':'ml'))needsPortion=true;
   else factor=eaten.value/100;
 }else if(basis.type==='perunit'&&eaten?.unit==='unit')factor=eaten.value;
 else if(basis.type==='perunit'&&eaten&&eaten.unit!=='unit')needsPortion=true;
 else if(basis.type==='unknown'&&eaten?.value&&eaten.value!==1)needsPortion=true;
 let values=needsPortion?EMPTY():Object.fromEntries(MACRO_KEYS.map(k=>[k,mac[k]===null?null:r1(mac[k]*factor)]));
 const warnings=[];
 if(!found)warnings.push('栄養成分を認識できませんでした。');
 if(needsPortion)warnings.push(`「${basis.label}」の栄養表示です。食べた量を入力してから確定してください。`);
 if(basis.type==='perunit'&&found&&!eaten)warnings.push('1単位分として仮計算しています。2個・半分などの場合は摂取数を指定してください。');
 if(basis.type==='unknown'&&found)warnings.push('表示単位が不明です。1食・1包装・100g当たりのいずれか確認してください。');
 if(found<4&&found)warnings.push('PFCの一部が未記載です。糖質のみの表示を炭水化物として代用しません。');
 if(!warnings.length)warnings.push('抽出した数値と実際の摂取量を保存前に確認してください。');
 return {...values,found,complete:found===4&&!needsPortion,raw:mac,basis:basis.type,basisLabel:basis.label,consumed:eaten,factor:needsPortion?null:factor,needsPortion,warning:warnings.join(' '),warnings};
}
const aliasEntries=FOOD_CATALOG.flatMap(item=>[item.name,...item.aliases].map(a=>({item,alias:foodClean(a).toLowerCase()}))).sort((a,b)=>b.alias.length-a.alias.length);
function cleanFoodName(line){return foodClean(line).toLowerCase().replace(/^(?:[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|cc|l|個|枚|本|杯|袋|パック|丁)\s*(?:の)?\s*)/,'').trim();}
function findFood(line){const name=cleanFoodName(line);
 for(const a of aliasEntries){
  if(!name.startsWith(a.alias))continue;
  const rest=name.slice(a.alias.length);
  if(rest && !/^[\s\d\-.、(（・:：%]|^(?:皮なし|皮つき|皮付き|生|茹で|ゆで|焼き|加熱|半分|大さじ|小さじ|ひとつ|二つ)/.test(rest))continue;
  if(a.item.excludes?.some(x=>name.includes(x.toLowerCase())))continue;
  if(['raw','dry'].includes(a.item.state)&&/(?:茹で|ゆで|加熱後|調理後|蒸し|水戻し|焼き)/.test(name))continue;
  if(a.item.state==='cooked'&&/(?:生の|生肉|生魚|加熱前|乾燥|乾麺)/.test(name))continue;
  return a.item;
 }
 return null;
}
function quantify(line,food){
 const s=foodClean(line);
 const m=s.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|g|ml|mL|cc|リットル|L)(?![a-z])/i);
 if(m){let v=Number(m[1]);let unit=m[2].toLowerCase();if(unit==='kg'||unit==='l'||unit==='リットル')v*=1000;
  if(unit==='ml'||unit==='cc'||unit==='l'||unit==='リットル'){if(food.density==null&&!/^(?:牛乳|豆乳|水|ヨーグルト)/.test(food.name))return {grams:null,reason:'体積を重量に換算できません。gで入力してください。'};v*=food.density??1;}
  return {grams:v,amount:Number(m[1]),unit:m[2],estimatedUnit:false};
 }
 const fraction=s.match(/(?:([0-9]+)\s*\/\s*([0-9]+)\s*(個|本|枚|杯|丁|パック|袋|切)|半分\s*(?:の)?\s*(個|本|枚|杯|丁|パック|袋|切)?)/);
 if(fraction){const unit=fraction[3]||fraction[4]||'個',n=fraction[1]?Number(fraction[1])/Number(fraction[2]):0.5,per=food.piece?.[unit];if(!per||!Number.isFinite(n)||n<=0)return {grams:null,reason:'半量の基準重量が不明です。gで入力してください。'};return {grams:n*per,amount:n,unit,estimatedUnit:true};}
 const q=s.match(/([0-9]+(?:\.[0-9]+)?)\s*(個|本|枚|杯|丁|パック|袋|切)/);
 if(q){const per=food.piece?.[q[2]];if(!per)return {grams:null,reason:`「${q[2]}」の重量が不明です。gで入力してください。`};return {grams:Number(q[1])*per,amount:Number(q[1]),unit:q[2],estimatedUnit:true};}
 const spoon=s.match(/(大さじ|小さじ)\s*([0-9]+(?:\.[0-9]+)?)/);
 if(spoon&&food.spoon){return {grams:Number(spoon[2])*(spoon[1]==='大さじ'?12:4),amount:Number(spoon[2]),unit:spoon[1],estimatedUnit:true};}
 return {grams:null,reason:'数量が不明です。「200g」「2個」などを指定してください。'};
}
function splitFoodLines(text,mode){
 const raw=foodClean(text).split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean);
 let lines=[];
 if(mode==='product'){
  // Pasted nutrition panels are one *product*, not five separate food entries.
  // Explicit bullets still delimit multiple products, even when each has an inline PFC label.
  let current='';
  const follow=/^(?:栄養成分表示|栄養成分|栄養情報|[（(]?(?:100\s*(?:g|ml)|1\s*(?:袋|包装|本|個|食分))\s*(?:あたり|当たり)|エネルギー|熱量|カロリー|たんぱく質|タンパク質|蛋白質|脂質|炭水化物|糖質|食物繊維|食塩相当量|内容量|正味|摂取量|食べた量|(?:P|F|C)\s*[:：=]?\s*\d)/i;
  for(const line of raw){
   const bullet=/^[・•\-*]/.test(line);
   const cleaned=line.replace(/^[\s・•\-*]+/,'').trim();
   if(!cleaned)continue;
   if(bullet){if(current)lines.push(current);current=cleaned;continue;}
   if(current&&follow.test(cleaned)){current+=' '+cleaned;continue;}
   if(current)lines.push(current);
   current=cleaned;
  }
  if(current)lines.push(current);
 }else{
  for(const l of raw){
   if(mode==='ingredients'&&/[、，;；]/.test(l)&&!/(kcal|たんぱく|蛋白質|炭水化物|脂質|P\s*[0-9]+|F\s*[0-9]+)/i.test(l))lines.push(...l.split(/[、，;；]/).filter(Boolean));
   else lines.push(l);
  }
 }
 return lines.map(x=>x.replace(/^[\s・•\-*]+/,'').trim()).filter(Boolean);
}
export function calculateFoodTotals(items){const active=items.filter(x=>!x.excluded);
 const totals=Object.fromEntries(MACRO_KEYS.map(k=>[k,active.length&&active.every(x=>x.nutrients?.[k]!==null&&x.nutrients?.[k]!==undefined)?r1(active.reduce((sum,x)=>sum+Number(x.nutrients[k]),0)):null]));
 return {totals,allKnown:active.length>0&&active.every(x=>x.nutrients?.kcal!==null&&x.nutrients?.kcal!==undefined),unknown:active.filter(x=>x.nutrients?.kcal==null).map(x=>x.label),estimated:active.some(x=>x.estimate),count:active.length};
}
export function parseFoodLines(text,mode='ingredients'){
 const lines=splitFoodLines(text,mode),items=[];
 for(const line of lines){
  let nutrients=null,estimate=false,source='unknown',foodName=null,grams=null,confidence='要確認',reason='',warnings=[];
  const given=explicit(line),hasExplicit=MACRO_KEYS.some(k=>given[k]!==null);
  if(hasExplicit){
   const basis=servingBasis(line);let eaten=consumption(line);
   if(!eaten&&(basis.type==='per100g'||basis.type==='per100ml')){
     const preNutrition=line.split(/(?:エネルギー|熱量|カロリー|kcal|(?:^|\s)[PFC]\s*\d)/i)[0];
     const units=[...preNutrition.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml|cc)(?![a-z])/gi)].filter(x=>!/(?:当たり|あたり|につき)/.test(line.slice(x.index+x[0].length,x.index+x[0].length+5)));
     const weight=units.find(x=>Number(x[1])!==100&&!/(?:内容量|正味|容量|総重量|商品重量|1袋|1包装)\s*[:：]?\s*$/.test(line.slice(Math.max(0,x.index-10),x.index)));
     if(weight)eaten={value:Number(weight[1]),unit:weight[2]==='g'?'g':'ml'};
   }
   const l=parseLabel(line,eaten?{amount:eaten.value,unit:eaten.unit}:{});nutrients=Object.fromEntries(MACRO_KEYS.map(k=>[k,l[k]]));source='label';confidence=l.needsPortion||l.basis==='unknown'?'要確認':'高';reason=l.needsPortion?'表示単位の分量不足':l.basis==='unknown'?'ラベルの単位を確認':'';warnings=l.warnings;
  }else if(mode!=='product'){
   const found=findFood(line);
   if(found){foodName=found.name;const q=quantify(line,found);grams=q.grams;
    if(grams!==null&&grams>0&&grams<=10000&&!found.requiresLabel){const mul=grams/100;nutrients={kcal:r1(found.kcal*mul),protein:r1(found.p*mul),fat:r1(found.f*mul),carbs:r1(found.c*mul)};source='reference';estimate=true;confidence=q.estimatedUnit||found.uncertain?'参考':'中';if(q.estimatedUnit)warnings.push(`「${q.unit}」を約${grams}gとして換算。サイズによって異なります。`);if(found.uncertain)warnings.push('食品の種類・調理法によって栄養値が変動します。');if(found.referenceStatus==='approximate-unverified')warnings.push('拡張辞書の参考値です。公的成分表と個別照合済みの数値ではありません。');}
    else{reason=found.requiresLabel?'商品・料理・調理法により栄養値が変動します。商品ラベルまたは材料・分量を入力してください。':q.reason||'重量が不正です。';}
   }else reason='食品を識別できません。食材名を修正するか、栄養表示を入力してください。';
  }else reason='市販品は栄養成分（kcalとPFC）を入力してください。';
  items.push({label:line,recognized:nutrients?.kcal!==null&&nutrients?.kcal!==undefined,food:foodName,grams,estimate,source,confidence,reason,warnings,nutrients,excluded:false});
 }
 const sum=calculateFoodTotals(items);
 return {mode,items,...sum};
}

export function dailyPFC(meals=[],date='',target={protein:30,fat:25,carbs:45}){
 const rows=meals.filter(x=>x.date===date);const incomplete=rows.filter(x=>['protein','fat','carbs'].some(k=>x[k]===null||x[k]===undefined));
 const known=rows.filter(x=>!incomplete.includes(x));
 const totals={protein:r1(known.reduce((s,x)=>s+foodNum(x.protein),0)),fat:r1(known.reduce((s,x)=>s+foodNum(x.fat),0)),carbs:r1(known.reduce((s,x)=>s+foodNum(x.carbs),0))};
 const kcal={protein:totals.protein*4,fat:totals.fat*9,carbs:totals.carbs*4};
 const total=Object.values(kcal).reduce((s,x)=>s+x,0);
 const ratios=Object.fromEntries(Object.entries(kcal).map(([k,v])=>[k,total?Math.round(v/total*1000)/10:0]));
 return {count:rows.length,complete:rows.length>0&&incomplete.length===0,knownCount:known.length,missingCount:incomplete.length,totals,kcal,macroKcal:Math.round(total),ratios,target};
}
export function validatePFCGoal(x){const v={};for(const key of ['protein','fat','carbs']){v[key]=Number(x[key]);if(!Number.isInteger(v[key])||v[key]<5||v[key]>80)throw Error('PFC比率はそれぞれ5〜80%で指定してください');}if(v.protein+v.fat+v.carbs!==100)throw Error('PFC比率の合計は100%にしてください');return v;}
export function parseBPText(raw){
 const s=foodClean(raw).replace(/\s+/g,' ');
 const pick=patterns=>{for(const re of patterns){const m=s.match(re);if(m)return foodNum(m[1]);}return null};
 let systolic=pick([/(?:最高血圧|収縮期|最高|SYS|SYSTOLIC)\s*[:：=]?\s*(\d{2,3})/i]);
 let diastolic=pick([/(?:最低血圧|拡張期|最低|DIA|DIASTOLIC)\s*[:：=]?\s*(\d{2,3})/i]);
 const pulse=pick([/(?:脈拍数?|心拍数?|PUL|PULSE|HEART\s*RATE|HR)\s*[:：=]?\s*(\d{2,3})/i]);
 const pair=s.match(/\b(\d{2,3})\s*[/／]\s*(\d{2,3})\b/);
 if(pair){systolic??=foodNum(pair[1]);diastolic??=foodNum(pair[2]);}
 return {systolic,diastolic,pulse,recognized:[systolic,diastolic,pulse].filter(x=>x!==null).length};
}
export function normalizeVital(x){
 const date=String(x?.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00')))throw Error('測定日が不正です');
 const time=String(x?.time||'').trim();if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('測定時刻が不正です');
 const n=(v,min,max,name)=>{if(v===null||v===undefined||v==='')return null;let x=Number(v);if(!Number.isInteger(x)||x<min||x>max)throw Error(name+'の入力値を確認してください');return x};
 const systolic=n(x.systolic,60,260,'最高血圧'),diastolic=n(x.diastolic,30,180,'最低血圧'),pulse=n(x.pulse,30,240,'心拍数');
 if(systolic!==null&&diastolic!==null&&systolic<=diastolic)throw Error('最高血圧は最低血圧より高くしてください');
 if(systolic===null&&diastolic===null&&pulse===null)throw Error('測定値を1つ以上入力してください');
 return {id:String(x.id||'').slice(0,120)||'vital-'+Date.now()+'-'+Math.random().toString(36).slice(2),date,time,systolic,diastolic,pulse,context:['rest','postworkout','other'].includes(x.context)?x.context:'rest',notes:String(x.notes||'').slice(0,500),source:['manual','photo-reviewed'].includes(x.source)?x.source:'manual',createdAt:x.createdAt||new Date().toISOString()};
}
