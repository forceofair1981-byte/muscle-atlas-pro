import {localizedExerciseAliases,exerciseLabel} from './i18n.js';
import {E,names} from './catalog.js';

export const EXERCISE_GROUPS=[
 {id:'all',label:'全種目'},
 {id:'chest',label:'胸'},
 {id:'shoulders',label:'肩・僧帽筋'},
 {id:'back',label:'背中'},
 {id:'legs',label:'脚・臀部'},
 {id:'arms',label:'腕・前腕'},
 {id:'core',label:'体幹'}
];
const groupMuscles={
 chest:new Set(['chest_up','chest','serratus']),
 shoulders:new Set(['delt_front','delt_side','delt_rear','traps_upper']),
 back:new Set(['lats','traps_mid','traps_lower','erectors']),
 legs:new Set(['quads','adductors','glute_med','glutes','hamstrings','hip_flexor','gastrocnemius','soleus','tibialis']),
 arms:new Set(['biceps','brachialis','triceps','forearm_front','forearm_back']),
 core:new Set(['abs_upper','abs_lower','obliques','hip_flexor'])
};
export const exerciseSearchNormalize=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\s　]+/g,'').trim();
const index=E.map((exercise,i)=>({
 i,
 exercise,
 aliases:localizedExerciseAliases(exercise).map(exerciseSearchNormalize),
 haystack:exerciseSearchNormalize([...localizedExerciseAliases(exercise),...exercise.p.map(id=>names[id]),...exercise.s.map(id=>names[id])].join(' '))
}));
export function searchExerciseDictionary(query='',group='all'){
 const q=exerciseSearchNormalize(query);
 const allowed=groupMuscles[group];
 return index.filter(row=>(!q||row.haystack.includes(q))&&(!allowed||row.exercise.p.some(id=>allowed.has(id))))
  .sort((a,b)=>score(a,q)-score(b,q)||a.i-b.i);
}
function score(row,q){if(!q)return 0;if(row.aliases[0]===q)return 0;if(row.aliases.includes(q))return 1;if(row.aliases.some(a=>a.startsWith(q)))return 2;return 3;}
export const exerciseDictionaryCount=E.length;
