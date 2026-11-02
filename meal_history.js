// Offline-only read/modify helpers. No network calls or persistent storage in this module.
const TYPES=new Set(['breakfast','lunch','dinner','snack']);
export function filterMeals(meals,{query='',type='all',period='all',today='',from='',to=''}={}){
 const needle=String(query).normalize('NFKC').toLocaleLowerCase('ja').trim();
 let cutoff='';
 if(period!=='all'&&Number.isInteger(Number(period))&&Number(period)>0&&today){
  const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-(Number(period)-1));cutoff=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 }
 return [...meals].filter(m=>(!cutoff||m.date>=cutoff)&&(!from||m.date>=from)&&(!to||m.date<=to)&&(type==='all'||TYPES.has(type)&&m.mealType===type)&&(!needle||[m.name,m.rawText,m.notes,...(m.foodItems||[]).map(x=>x.label)].some(x=>String(x||'').normalize('NFKC').toLocaleLowerCase('ja').includes(needle)))).sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
export function groupMeals(meals){
 const map=new Map();
 for(const m of meals){let g=map.get(m.date);if(!g){g={date:m.date,entries:[],kcal:0,protein:0,fat:0,carbs:0,macroComplete:true};map.set(m.date,g)}g.entries.push(m);g.kcal+=Number(m.kcal)||0;for(const key of ['protein','fat','carbs']){if(m[key]==null)g.macroComplete=false;else g[key]+=Number(m[key])||0}}
 return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function updateMealById(meals,updated){const idx=meals.findIndex(m=>m.id===updated.id);if(idx<0)throw Error('編集対象の食事が見つかりません。');return meals.map((m,i)=>i===idx?updated:m)}
