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

const FRONT_LABELS={balanced:'フロントリラックス風',chest:'モストマスキュラー風',shoulders:'フロントダブルバイセプス風',back:'フロントラットスプレッド風',legs:'アブドミナル＆サイ風',arms:'フロントダブルバイセプス風',core:'アブドミナル＆サイ風'};
const BACK_LABELS={balanced:'リアリラックス風',chest:'リアラットスプレッド風',shoulders:'リアダブルバイセプス風',back:'リアラットスプレッド風',legs:'リアレッグ／カーフ強調風',arms:'リアダブルバイセプス風',core:'リアリラックス風'};

function silhouette(variant,back,pose='balanced'){
 const female=variant==='female',neutral=variant==='neutral',shoulder=female?82:neutral?76:68,hip=female?100:neutral?108:110;
 const legShift=(pose==='legs'||pose==='core')?6:0;
 const poseAccent=back
  ? pose==='back'?`<path class="sil-pose" d="M76 132 Q97 108 120 110 M224 132 Q203 108 180 110"/>`
    : (pose==='shoulders'||pose==='arms')?`<path class="sil-pose" d="M81 134 Q64 107 59 91 M219 134 Q236 107 241 91"/>`
    : pose==='legs'?`<path class="sil-pose" d="M121 373 Q112 430 108 486 M179 373 Q188 430 192 486"/>`:''
  : pose==='chest'?`<path class="sil-pose" d="M106 153 Q150 173 194 153"/>`
    : (pose==='shoulders'||pose==='arms')?`<path class="sil-pose" d="M83 136 Q65 104 58 88 M217 136 Q235 104 242 88"/>`
    : pose==='legs'||pose==='core'?`<path class="sil-pose" d="M126 189 Q149 205 172 189 M118 345 Q149 338 180 345"/>`:'';
 return `<g class="body-base"><ellipse class="sil" cx="150" cy="50" rx="29" ry="36"/><path class="sil" d="M 137 83 L 136 99 Q ${shoulder+33} 100 ${shoulder} 118 Q 56 131 56 163 L 47 235 L 37 319 Q 41 344 56 342 L 68 269 L 82 202 L 100 201 L 105 307 Q ${hip-5} 336 ${hip-legShift} 366 L ${107-legShift} 455 L ${111-legShift} 529 L ${115-legShift} 571 Q ${113-legShift} 582 100 592 Q 104 604 138 601 L 148 565 L 149 465 L 151 465 L 152 565 L 162 601 Q 196 604 200 592 Q ${187+legShift} 582 ${185+legShift} 571 L ${189+legShift} 529 L ${193+legShift} 455 L ${300-hip+legShift} 366 Q ${305-hip} 336 195 307 L 200 201 L 218 202 L 232 269 L 244 342 Q 259 344 263 319 L 253 235 L 244 163 Q 244 131 ${300-shoulder} 118 Q ${267-shoulder} 100 164 99 L 163 83 Z"/>${female?`<path class="sil-detail" d="M109 171 Q130 194 150 178 Q170 194 191 171 M109 300 Q118 318 103 348 M191 300 Q182 318 197 348"/>`:''}${back?'':`<path class="sil-detail" d="M151 117 L151 174"/>`}${poseAccent}</g>`;
}
export function heatColor(value, scale=1){const n=value/scale;if(!n)return '#263b52';if(n<2)return '#419de5';if(n<5)return '#50bba5';if(n<9)return '#f1b65a';return '#ef6477'}

function normalizePose(side,pose){
 const p=['balanced','chest','shoulders','back','legs','arms','core'].includes(pose)?pose:'balanced';
 if(side==='back'&&p==='core')return 'balanced';
 return p;
}
function labelForPose(side,pose){return (side==='front'?FRONT_LABELS:BACK_LABELS)[normalizePose(side,pose)]||''}
function poseTransform(base,side,pose,mirror){
 const p=normalizePose(side,pose);let dx=0,dy=0;
 if(side==='front'){
  if(['shoulders','arms'].includes(p)){
   if(['delt_front','delt_side','biceps','brachialis'].includes(base)){dx=-8;dy=-20}
   if(['forearm_front'].includes(base)){dx=-12;dy=-32}
   if(['triceps'].includes(base)){dx=-8;dy=-16}
  }
  if(p==='chest'){
   if(['delt_front','delt_side','biceps','brachialis'].includes(base)){dx=6;dy=3}
   if(['forearm_front','triceps'].includes(base)){dx=10;dy=9}
   if(['chest','chest_up','serratus'].includes(base)){dy=-1}
  }
  if(p==='back'){
   if(['delt_side','biceps','brachialis'].includes(base)){dx=-5;dy=-8}
   if(['forearm_front','triceps'].includes(base)){dx=-8;dy=-10}
   if(['serratus'].includes(base)){dx=-2;dy=-4}
  }
  if(['legs','core'].includes(p)){
   if(['quads','adductors','tibialis'].includes(base)){dx=-4;dy=0}
   if(['hip_flexor','abs_upper','abs_lower','obliques'].includes(base)){dy=-2}
  }
 }
 if(side==='back'){
  if(['shoulders','arms'].includes(p)){
   if(['delt_rear','delt_side','triceps'].includes(base)){dx=-8;dy=-19}
   if(['forearm_back'].includes(base)){dx=-12;dy=-30}
   if(['traps_upper','traps_mid'].includes(base)){dy=-6}
  }
  if(['chest','back'].includes(p)){
   if(['lats'].includes(base)){dx=-6;dy=-4}
   if(['delt_rear','delt_side','triceps'].includes(base)){dx=-5;dy=-10}
   if(['forearm_back'].includes(base)){dx=-7;dy=-13}
  }
  if(p==='legs'){
   if(['hamstrings','gastrocnemius','soleus'].includes(base)){dx=-4;dy=1}
   if(['glutes','glute_med'].includes(base)){dx=-2;dy=0}
  }
 }
 if(mirror===-1)dx*=-1;
 return dx||dy?`translate(${dx} ${dy})`:'';
}

export function anatomySVG(side,variant,totals={},selected='',options={}){
 const front=side==='front',parts=front?FRONT:BACK,pose=normalizePose(side,options.pose||'balanced');
 const segments=parts.flatMap(([base,path])=>visualParts(base,path));
 const prefix=(options.prefix||'map')+'-'+(front?'f':'b');
 const masks=segments.filter(x=>x.rect).map(x=>`<clipPath id="${prefix}-${x.id}"><rect x="${x.rect.x}" y="${x.rect.y}" width="${x.rect.w}" height="${x.rect.h}"/></clipPath>`).join('');
 const shapes=segments.map(({id,base,path,rect})=>[1,-1].map(m=>{
  const amount=displayValue(id,totals),color=options.colors?.[id]||options.colors?.[base]||heatColor(totals[base]||0);
  const title=options.titles?.[id]||options.titles?.[base]||`${displayNames[id]}：${amount.toFixed(1)}セット相当（推定割当）`;
  const transforms=[m===1?'':'translate(300 0) scale(-1 1)',poseTransform(base,front?'front':'back',pose,m)].filter(Boolean).join(' ');
  return `<g transform="${transforms}"><path role="button" tabindex="0" aria-label="${displayNames[id]}" class="muscle ${selected===id?'selected':''}" data-muscle="${id}" d="${path}" ${rect?`clip-path="url(#${prefix}-${id})"`:''} fill="${color}"><title>${title}</title></path></g>`;
 }).join('')).join('');
 const caption=labelForPose(front?'front':'back',pose);
 return `<svg viewBox="0 0 300 615" class="muscle-svg" role="group" aria-label="${variant==='female'?'女性':variant==='male'?'男性':'中立'}モデルの${front?'前面':'後面'}筋肉マップ"><defs>${masks}</defs>${silhouette(variant,!front,pose)}${shapes}<path class="sil-detail" d="M141 20 Q150 11 160 20 M135 82 L142 95 M165 82 L158 95" /><text x="150" y="605" text-anchor="middle" font-size="9" fill="#adc8de">${caption}</text></svg>`;
}
