/** Opt-in PFC percentages; starting templates, not individual medical targets. */
export const PFC_PRESETS=Object.freeze({
 hypertrophy:{label:'筋肥大',protein:30,fat:25,carbs:45},
 fatloss:{label:'減量',protein:35,fat:30,carbs:35},
 balanced:{label:'筋肥大＋減量',protein:35,fat:25,carbs:40},
 maintain:{label:'現状維持',protein:25,fat:30,carbs:45}
});
export function pfcForPreset(id){
 const preset=PFC_PRESETS[id];if(!preset)throw Error('目標を選択してください');
 return {protein:preset.protein,fat:preset.fat,carbs:preset.carbs};
}
export function matchPfcPreset(target){
 if(!target)return null;
 return Object.keys(PFC_PRESETS).find(k=>['protein','fat','carbs'].every(n=>Number(target[n])===PFC_PRESETS[k][n]))||null;
}
export function pfcGramTargets(targetKcal,ratio){
 if(!(Number.isFinite(Number(targetKcal))&&Number(targetKcal)>0))return null;
 return {protein:Math.round(targetKcal*ratio.protein/100/4),fat:Math.round(targetKcal*ratio.fat/100/9),carbs:Math.round(targetKcal*ratio.carbs/100/4)};
}
