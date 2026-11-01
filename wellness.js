/** Offline-only food and cardiovascular logging helpers. No external requests. */
const foodClean = value=>String(value??'').normalize('NFKC').trim();
const foodNum = v=>Number(v);
const r1=v=>Math.round(v*10)/10;
// Indicative values per 100g of edible food. They are reference approximations, not product-label data.
export const FOOD_REFERENCE=[
 {name:'ご飯（炊飯後）',aliases:['白米','ご飯','ごはん','炊いた米'],kcal:156,p:2.5,f:0.3,c:37.1},
 {name:'鶏むね肉（皮なし）',aliases:['鶏むね肉','鶏胸肉','とりむね肉'],kcal:105,p:23.3,f:1.9,c:0},
 {name:'卵（全卵）',aliases:['卵','たまご','全卵'],kcal:142,p:12.2,f:10.2,c:0.4},
 {name:'バナナ',aliases:['バナナ'],kcal:93,p:1.1,f:0.2,c:22.5},
 {name:'ブロッコリー',aliases:['ブロッコリー'],kcal:37,p:5.4,f:0.6,c:6.6},
 {name:'オートミール',aliases:['オートミール'],kcal:350,p:13.7,f:5.7,c:69.1},
 {name:'牛乳',aliases:['牛乳'],kcal:61,p:3.3,f:3.8,c:4.8},
 {name:'木綿豆腐',aliases:['木綿豆腐'],kcal:73,p:7.0,f:4.9,c:1.5}
];
function explicit(line){
 const text=foodClean(line);
 const match=(patterns)=>{for(const re of patterns){const m=text.match(re);if(m)return foodNum(m[1]);}return null;};
 const kcal=match([/(?:エネルギー|熱量|カロリー)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*kcal/i,/(\d+(?:\.\d+)?)\s*kcal/i]);
 const protein=match([/(?:たんぱく質|タンパク質|蛋白質|protein|P)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*g/i]);
 const fat=match([/(?:脂質|fat|F)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*g/i]);
 const carbs=match([/(?:炭水化物|糖質|carbs?|C)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*g/i]);
 return {kcal,protein,fat,carbs};
}
export function parseLabel(text){
 const s=foodClean(text).replace(/[\n\r]+/g,' '),mac=explicit(s);
 const found=Object.values(mac).filter(v=>v!==null).length;
 return {...mac,found,complete:found===4,warning:found===0?'栄養成分表の数値を抽出できませんでした。入力内容を確認してください。':found<4?'栄養成分の一部が不明です。パッケージから確認してください。':'ラベル値を抽出しました。保存前に内容と1食の分量を確認してください。'};
}
export function parseFoodLines(text,mode='ingredients'){
 const lines=foodClean(text).split(/[\r\n]+/).map(v=>v.replace(/^[\s・•\-*]+/,'').trim()).filter(Boolean);
 const items=[];
 for(const line of lines){
  const given=explicit(line);
  const food=FOOD_REFERENCE.find(f=>f.aliases.some(a=>line.includes(a)));
  const match=line.match(/(\d+(?:\.\d+)?)\s*g(?:\b|$)/i);
  const grams=match?foodNum(match[1]):null;
  let nutrients=null,estimate=false,source='unknown';
  if(given.kcal!==null || given.protein!==null || given.fat!==null || given.carbs!==null){nutrients=given;source='label';}
  else if(mode==='ingredients' && food && grams!==null && grams>0){const q=grams/100;nutrients={kcal:r1(food.kcal*q),protein:r1(food.p*q),fat:r1(food.f*q),carbs:r1(food.c*q)};source='reference';estimate=true;}
  items.push({label:line,recognized:!!nutrients,food:food?.name||null,grams,estimate,source,nutrients});
 }
 const allKnown=items.length>0&&items.every(x=>x.recognized&&x.nutrients.kcal!==null);
 const totals={};for(const key of ['kcal','protein','fat','carbs']){totals[key]=items.length&&items.every(x=>x.nutrients?.[key]!==null&&x.nutrients?.[key]!==undefined)?r1(items.reduce((sum,x)=>sum+x.nutrients[key],0)):null;}
 return {mode,items,allKnown,totals,unknown:items.filter(x=>!x.recognized).map(x=>x.label),estimated:items.some(x=>x.estimate)};
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
