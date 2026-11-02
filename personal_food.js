/* Personal food dictionary. A record represents one saved serving, never per-100g. */
const MEAL_TYPES=new Set(['breakfast','lunch','dinner','snack']);
export const foodKey=name=>String(name||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const optional=v=>v==null||v===''?null:Number(v);
const validStamp=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))?s:new Date().toISOString();
export function normalizePersonalFood(row){
 if(!row||typeof row!=='object')throw Error('辞書項目の形式が不正です。');
 const name=String(row.name||'').trim().replace(/\s+/g,' ').slice(0,180);
 const kcal=row.kcal==null||row.kcal===''?NaN:Number(row.kcal);
 if(!name||name.length>180||!Number.isFinite(kcal)||kcal<0||kcal>15000)throw Error('食品名またはkcalの値を確認してください。');
 const macros={};
 for(const k of ['protein','fat','carbs']){
  const value=optional(row[k]);if(value!==null&&(!Number.isFinite(value)||value<0||value>1000))throw Error('PFCの値を確認してください。');
  macros[k]=value;
 }
 return {name,kcal:Math.round(kcal),...macros,mealType:MEAL_TYPES.has(row.mealType)?row.mealType:'snack',createdAt:validStamp(row.createdAt),updatedAt:validStamp(row.updatedAt)};
}
export function normalizePersonalFoods(rows){
 if(!Array.isArray(rows))return [];
 if(rows.length>10000)throw Error('食事辞書は10,000件までです。');
 const result=new Map();
 for(const raw of rows){
  try{const food=normalizePersonalFood(raw),key=foodKey(food.name);
   const former=result.get(key);
   if(!former||food.updatedAt>=former.updatedAt)result.set(key,food);
  }catch{ /* Ignore a malformed individual entry while retaining valid backed-up foods. */ }
 }
 return [...result.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,10000);
}
export function findPersonalFood(rows,name){const key=foodKey(name);return key?rows.find(f=>foodKey(f.name)===key)||null:null;}
export function savePersonalFood(rows,raw){
 const data=normalizePersonalFood({...raw,updatedAt:new Date().toISOString()});
 const prior=findPersonalFood(rows,data.name);
 return normalizePersonalFoods([...rows.filter(x=>foodKey(x.name)!==foodKey(data.name)),{...data,createdAt:prior?.createdAt||data.createdAt}]);
}
export function mergePersonalFoods(current,incoming){
 const existing=normalizePersonalFoods(current),keys=new Set(existing.map(x=>foodKey(x.name)));
 const additions=normalizePersonalFoods(incoming).filter(x=>!keys.has(foodKey(x.name)));
 return {foods:normalizePersonalFoods([...existing,...additions]),added:additions.length,skipped:normalizePersonalFoods(incoming).length-additions.length};
}
export const personalFoodsBackup=foods=>({app:'MuscleAtlasPro',type:'personal-food-dictionary',formatVersion:1,servingBasis:'per-entry',exportedAt:new Date().toISOString(),personalFoods:normalizePersonalFoods(foods)});
export function readPersonalFoodsBackup(obj){
 if(!obj||obj.type!=='personal-food-dictionary'||!Array.isArray(obj.personalFoods))throw Error('個人用食事辞書のJSONを指定してください。');
 if(obj.personalFoods.length>10000)throw Error('食事辞書は10,000件までです。');
 return normalizePersonalFoods(obj.personalFoods);
}
