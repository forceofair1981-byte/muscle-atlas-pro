import {displayNames,visualParts,displayValue} from './detail.js';
const FRONT=[
['delt_front','M 94 111 Q 76 111 65 132 L 84 153 Q 102 149 104 127 Z'],
['delt_side','M 65 132 Q 54 145 61 170 L 80 174 L 84 153 Z'],
['chest_up','M 108 122 Q 126 114 149 128 L 147 146 Q 124 139 101 142 Z'],
['chest','M 101 144 Q 123 141 147 150 L 147 190 Q 116 196 102 177 Z'],
['serratus','M 105 185 L 119 200 L 114 242 L 100 229 Z'],
['biceps','M 69 169 Q 83 175 80 218 L 68 242 Q 55 214 61 182 Z'],
['brachialis','M 81 173 Q 93 195 82 229 L 76 239 L 77 200 Z'],
['forearm_front','M 67 241 Q 77 245 71 281 L 64 331 L 51 328 L 51 283 Z'],
['obliques','M 105 235 L 118 239 L 125 296 L 111 306 L 100 271 Z'],
['abs_upper','M 128 195 L 148 196 L 148 246 L 128 248 Z'],
['abs_lower','M 128 249 L 148 249 L 148 301 L 128 297 Z'],
['hip_flexor','M 118 302 Q 133 305 146 319 L 145 343 L 119 333 Z'],
['quads','M 114 348 Q 129 337 147 349 L 145 462 L 127 478 Q 115 449 108 412 Z'],
['adductors','M 145 351 L 151 358 L 150 432 L 143 443 Z'],
['tibialis','M 117 480 Q 128 485 136 486 L 132 560 L 118 563 L 112 533 Z']
];
const BACK=[
['traps_upper','M 145 86 L 103 116 L 131 139 L 150 120 Z'],
['traps_mid','M 103 120 L 141 147 L 139 175 L 103 159 Z'],
['traps_lower','M 109 164 L 139 177 L 147 239 L 123 212 Z'],
['delt_rear','M 102 118 Q 83 115 68 132 L 63 163 L 94 167 Z'],
['delt_side','M 68 132 Q 56 145 62 171 L 82 175 L 89 155 Z'],
['triceps','M 69 175 Q 88 172 81 227 L 70 247 L 60 220 Z'],
['forearm_back','M 67 244 Q 80 255 70 292 L 62 332 L 49 326 L 51 288 Z'],
['lats','M 106 178 L 121 202 L 137 228 L 127 284 L 106 261 Z'],
['erectors','M 140 226 L 149 227 L 149 323 L 137 302 Z'],
['glute_med','M 109 305 Q 127 302 147 325 L 129 340 L 106 331 Z'],
['glutes','M 107 334 Q 127 319 146 337 L 149 375 Q 132 390 111 374 Z'],
['hamstrings','M 114 382 Q 129 392 146 383 L 146 458 L 128 473 Q 113 447 111 417 Z'],
['gastrocnemius','M 115 474 Q 130 478 138 493 L 134 536 L 116 529 L 109 501 Z'],
['soleus','M 117 530 Q 127 537 133 538 L 130 559 L 120 569 L 114 560 Z']
];


const POSES=['auto','balanced','chest','shoulders','back','legs','arms','core'];
const POSE_LABELS={balanced:'リラックスポーズ',chest:'モストマスキュラー風',shoulders:'ダブルバイセプス風',back:'ラットスプレッド風',legs:'脚・カーフ強調ポーズ',arms:'ダブルバイセプス風',core:'アブドミナル＆サイ風'};
export const poseNames=POSE_LABELS;
export function normalizePose(pose){return POSES.includes(pose)&&pose!=='auto'?pose:'balanced'}

// Joint angles (degrees). Left-side geometry is mirrored for the right side.
// Rotations are shared between the skin outline and its muscle polygons:
// changing a pose must move the WHOLE arm, not merely distort colored patches.
const POSE_JOINTS={
 balanced:{upper:0,fore:0,leg:0},
 chest:{upper:-14,fore:-102,leg:0},
 shoulders:{upper:38,fore:-188,leg:0},
 back:{upper:25,fore:-79,leg:0},
 legs:{upper:8,fore:-15,leg:12},
 arms:{upper:38,fore:-188,leg:0},
 core:{upper:28,fore:-187,leg:7}
};
// The arm polygons in FRONT/BACK are located near 55..95 / y125..340.
const UPPER_ARM_LEFT=`M 86 118 Q 63 116 53 137 Q 48 152 53 185 L 59 236 Q 68 249 80 232 L 88 191 Q 103 152 104 135 Z`;
const FOREARM_LEFT=`M 59 230 Q 68 241 78 232 L 75 275 L 65 329 Q 63 345 49 339 Q 43 336 48 320 L 52 277 Z`;
const LEG_LEFT=`M 105 332 Q 119 329 148 335 L 147 454 L 148 554 L 145 576 Q 149 587 144 599 L 104 601 Q 96 593 105 583 L 111 564 L 109 475 L 104 386 Z`;
const TORSO=`M 134 98 L 104 106 Q 94 114 94 132 L 100 181 L 99 220 L 102 273 Q 99 301 103 329 L 107 354 Q 128 371 151 367 Q 173 371 193 354 L 197 329 Q 201 301 198 273 L 201 220 L 200 181 L 206 132 Q 206 114 196 106 L 166 98 Z`;
function armTransforms(pose,part){
 const j=POSE_JOINTS[normalizePose(pose)];
 return part==='fore'
   ? `rotate(${j.upper} 83 134) rotate(${j.fore} 68 237)`
   : `rotate(${j.upper} 83 134)`;
}
function bodyTransforms(base,pose){
 if(['delt_front','delt_side','delt_rear','biceps','brachialis','triceps'].includes(base))return armTransforms(pose,'upper');
 if(['forearm_front','forearm_back'].includes(base))return armTransforms(pose,'fore');
 if(['quads','adductors','tibialis','hamstrings','gastrocnemius','soleus'].includes(base))return `rotate(${POSE_JOINTS[normalizePose(pose)].leg} 121 345)`;
 return '';
}
function silhouette(variant,side,pose){
 const back=side==='back',female=variant==='female';
 const j=POSE_JOINTS[normalizePose(pose)];
 const mirror='translate(300 0) scale(-1 1)';
 const skin=(path,transform='')=>`<g ${transform?`transform="${transform}"`:''}><path class="sil" d="${path}"/></g>`;
 const arm=()=>`${skin(UPPER_ARM_LEFT,armTransforms(pose,'upper'))}${skin(FOREARM_LEFT,armTransforms(pose,'fore'))}`;
 const leg=()=>skin(LEG_LEFT,`rotate(${j.leg} 121 345)`);
 return `<g class="body-base" aria-hidden="true">
 ${leg()}<g transform="${mirror}">${leg()}</g>
 ${skin(TORSO)}
 <path class="sil" d="M 134 83 L 134 100 Q 149 106 166 100 L166 83 Z"/>
 <ellipse class="sil" cx="150" cy="50" rx="28" ry="36"/>
 ${arm()}<g transform="${mirror}">${arm()}</g>
 ${back?'<path class="sil-detail" d="M 150 110 L150 148 M115 195 Q150 174 185 195"/>':'<path class="sil-detail" d="M150 112 L150 173 M114 185 Q150 197 186 185"/>'}
 ${female?'<path class="sil-detail" d="M110 164 Q130 185 150 178 Q170 185 190 164"/>':''}
 </g>`;
}
export function heatColor(value,scale=1){const n=value/scale;if(!n)return '#263b52';if(n<2)return '#419de5';if(n<5)return '#50bba5';if(n<9)return '#f1b65a';return '#ef6477'}
export function anatomySVG(side,variant,totals={},selected='',options={}){
 const front=side==='front',parts=front?FRONT:BACK,pose=normalizePose(options.pose||'balanced');
 const segments=parts.flatMap(([base,path])=>visualParts(base,path));
 const prefix=(options.prefix||'map')+'-'+(front?'f':'b');
 const masks=segments.filter(x=>x.rect).map(x=>`<clipPath id="${prefix}-${x.id}"><rect x="${x.rect.x}" y="${x.rect.y}" width="${x.rect.w}" height="${x.rect.h}"/></clipPath>`).join('');
 const shapes=segments.map(({id,base,path,rect})=>[1,-1].map(m=>{
  const amount=displayValue(id,totals),color=options.colors?.[id]||options.colors?.[base]||heatColor(totals[base]||0);
  const title=options.titles?.[id]||options.titles?.[base]||`${displayNames[id]}：${amount.toFixed(1)}セット相当（推定割当）`;
  const transforms=[m===1?'':'translate(300 0) scale(-1 1)',bodyTransforms(base,pose)].filter(Boolean).join(' ');
  return `<g transform="${transforms}"><path role="button" tabindex="0" aria-label="${displayNames[id]}" class="muscle ${selected===id?'selected':''}" data-muscle="${id}" d="${path}" ${rect?`clip-path="url(#${prefix}-${id})"`:''} fill="${color}"><title>${title}</title></path></g>`;
 }).join('')).join('');
 return `<svg viewBox="-42 -10 384 636" class="muscle-svg" role="group" aria-label="${variant==='female'?'女性':variant==='male'?'男性':'中立'}モデルの${front?'前面':'後面'}筋肉マップ：${POSE_LABELS[pose]||'リラックスポーズ'}" data-pose="${pose}">
  <defs>${masks}</defs>${silhouette(variant,side,pose)}${shapes}
  <text x="150" y="616" text-anchor="middle" font-size="11" fill="#b6d4ee">${POSE_LABELS[pose]||'リラックスポーズ'}</text>
 </svg>`;
}
