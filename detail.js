import {names as BASE_NAMES} from './catalog.js';
// These are visualization subdivisions, NOT independent observations of activation.
// Shares only apportion a parent's recorded exposure; they must never be added on top of it.
export const SPLITS={
 chest:[['chest_mid','大胸筋中部',.58,{x:0,y:0,w:300,h:169}],['chest_lower','大胸筋下部',.42,{x:0,y:169,w:300,h:460}]],
 biceps:[['biceps_long','上腕二頭筋長頭（模式図）',.5,{x:0,y:0,w:74,h:615}],['biceps_short','上腕二頭筋短頭（模式図）',.5,{x:74,y:0,w:226,h:615}]],
 forearm_front:[['forearm_flex_radial','前腕橈側屈筋群',.5,{x:0,y:0,w:61,h:615}],['forearm_flex_ulnar','前腕尺側屈筋群',.5,{x:61,y:0,w:239,h:615}]],
 quads:[['quad_lateral','外側広筋',.34,{x:0,y:0,w:121,h:615}],['quad_rectus','大腿直筋（前面）',.33,{x:121,y:0,w:17,h:615}],['quad_medial','内側広筋',.33,{x:138,y:0,w:162,h:615}]],
 adductors:[['adductor_upper','内転筋群・上部',.5,{x:0,y:0,w:300,h:390}],['adductor_lower','内転筋群・下部',.5,{x:0,y:390,w:300,h:225}]],
 triceps:[['triceps_lateral','上腕三頭筋外側頭（模式図）',.5,{x:0,y:0,w:73,h:615}],['triceps_long','上腕三頭筋長頭（模式図）',.5,{x:73,y:0,w:227,h:615}]],
 forearm_back:[['forearm_ext_radial','前腕橈側伸筋群',.5,{x:0,y:0,w:60,h:615}],['forearm_ext_ulnar','前腕尺側伸筋群',.5,{x:60,y:0,w:240,h:615}]],
 lats:[['lats_upper','広背筋上部（模式図）',.5,{x:0,y:0,w:300,h:232}],['lats_lower','広背筋下部（模式図）',.5,{x:0,y:232,w:300,h:383}]],
 glutes:[['glute_upper','大臀筋上部（模式図）',.5,{x:0,y:0,w:300,h:352}],['glute_lower','大臀筋下部（模式図）',.5,{x:0,y:352,w:300,h:263}]],
 hamstrings:[['ham_lateral','大腿二頭筋（外側）',.5,{x:0,y:0,w:130,h:615}],['ham_medial','半腱様筋・半膜様筋（内側）',.5,{x:130,y:0,w:170,h:615}]],
 gastrocnemius:[['gast_lateral','腓腹筋外側頭',.5,{x:0,y:0,w:125,h:615}],['gast_medial','腓腹筋内側頭',.5,{x:125,y:0,w:175,h:615}]],
};
export const DETAIL_IDS=Object.fromEntries(Object.entries(SPLITS).flatMap(([base,items])=>items.map(([id,name,share,rect])=>[id,{id,name,base,share,rect}])));
export const displayNames={...BASE_NAMES,...Object.fromEntries(Object.values(DETAIL_IDS).map(x=>[x.id,x.name]))};
export const baseOf=id=>DETAIL_IDS[id]?.base||id;
export const partNames=id=>SPLITS[id]?.map(x=>x[0])||[id];
export const displayValue=(id,totals={})=>{
 const entry=DETAIL_IDS[id];return entry?(Number(totals[entry.base])||0)*entry.share:(Number(totals[id])||0);
};
export const visibleRegionCount=Object.keys(BASE_NAMES).length+Object.values(SPLITS).reduce((v,x)=>v+x.length-1,0);
export const visualParts=(base,path)=>SPLITS[base]?.map(([id,,share,rect])=>({id,base,path,share,rect}))||[{id:base,base,path,share:1,rect:null}];
export function hiddenByExclusions(id,excluded=[]){
 const current=new Set(excluded);
 return current.has(id)||current.has(baseOf(id))||partNames(id).some(x=>current.has(x));
}

export const SELECTABLE_IDS=[...Object.keys(BASE_NAMES).filter(id=>!SPLITS[id]),...Object.keys(DETAIL_IDS)];
