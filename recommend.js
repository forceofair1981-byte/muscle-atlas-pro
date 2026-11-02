import {E,names} from './catalog.js';
/** Educational exercise selection, not medical clearance or personal coaching. */
const PICKS={
 chest:['ベンチプレス','ケーブルフライ','腕立て伏せ'],chest_up:['インクラインベンチプレス','ダンベルプレス'],serratus:['腕立て伏せ'],
 delt_front:['ショルダープレス','アーノルドプレス','フロントレイズ'],delt_side:['サイドレイズ','アーノルドプレス'],delt_rear:['リアレイズ','ベントオーバーロー'],
 biceps:['アームカール','懸垂'],brachialis:['アームカール'],triceps:['トライセップス','ナローグリップベンチプレス'],
 forearm_front:['アームカール'],forearm_back:['ベントオーバーロー'],
 abs_upper:['ケーブルクランチ','クランチ','プランク'],abs_lower:['レッグレイズ','ケーブルクランチ'],obliques:['ロシアンツイスト','サイドベント','プランク'],hip_flexor:['レッグレイズ'],
 quads:['スクワット','レッグプレス','レッグエクステンション'],adductors:['アダクション','スクワット'],tibialis:['ランジ'],
 traps_upper:['シュラッグ','ショルダープレス'],traps_mid:['シーテッドロー','ベントオーバーロー'],traps_lower:['ラットプルダウン','懸垂'],
 lats:['ラットプルダウン','シーテッドロー','懸垂'],erectors:['バックエクステンション','デッドリフト'],glute_med:['ヒップアブダクション','ブルガリアンスクワット'],glutes:['ヒップスラスト','スクワット','ランジ'],
 hamstrings:['レッグカール','ルーマニアンデッドリフト','デッドリフト'],gastrocnemius:['カーフレイズ'],soleus:['カーフレイズ']
};
const EXTRA={serratus:[{name:'ウォールスライド',level:'軽負荷',note:'肩甲骨を滑らかに動かす練習'}],forearm_front:[{name:'リストカール',level:'局所',note:'手首屈筋群を狙う'}],forearm_back:[{name:'リバースリストカール',level:'局所',note:'手首伸筋群を狙う'}],hip_flexor:[{name:'マーチング',level:'軽負荷',note:'股関節屈曲をゆっくり行う'}],tibialis:[{name:'トゥレイズ',level:'局所',note:'つま先を上げて前脛骨筋を刺激'}],traps_lower:[{name:'うつ伏せYレイズ',level:'軽負荷',note:'肩甲骨の上方回旋を意識'}],soleus:[{name:'シーテッドカーフレイズ',level:'局所',note:'膝を曲げてふくらはぎ深層を刺激'}],glute_med:[{name:'クラムシェル',level:'軽負荷',note:'股関節の外転・外旋をゆっくり'}]};
const GOAL_GUIDE={hypertrophy:'6〜15回×2〜3セットを例に、フォームと週の総セット数を優先',fatloss:'8〜15回×2セットを例に、無理のない継続を重視',balanced:'8〜12回×2〜3セットを例に、徐々に負荷を調整',proportion:'8〜15回×2〜3セットを例に、部位バランスを優先',strength:'3〜6回×2〜3セットを例に、十分な休憩と技術を重視'};
const meta={
 'ベンチプレス':'胸部の複合種目。肩・肘に痛みがない範囲で', 'インクラインベンチプレス':'上部胸筋寄りのプレス','サイドレイズ':'三角筋中部を狙う単関節種目','リアレイズ':'三角筋後部を狙う','ラットプルダウン':'背中を引きつける動作','シーテッドロー':'肩甲骨と肘を後方へ','スクワット':'股関節と膝を安定させる','レッグカール':'膝屈曲でハムストリングスを狙う','ヒップスラスト':'臀部を中心に刺激','カーフレイズ':'足首をゆっくり底屈'
};
export function recommendForMuscle(id,recovery,goal='balanced',limit=3){
 if(!(id in names))return null;
 const options=(PICKS[id]||[]).map(name=>({name,level:'通常',note:meta[name]||'可動域を保ち、反動を抑えて行う',registered:E.some(e=>e.n===name)}));
 // For groups with no direct isolation in dictionary, prefer curated options first.
 const specials=EXTRA[id]||[];
 const items=[...specials,...options].filter((x,i,arr)=>arr.findIndex(y=>y.name===x.name)===i).slice(0,limit);
 const status=recovery?.state||'ready';const remainingDays=Math.max(0,Number(recovery?.remainingDays)||0);
 return {id,name:names[id],status,remainingDays,hasRecord:!!recovery?.hasRecord,
  canTrainNormally:status==='ready',
  headline:status==='warning'?'高負荷のトレーニングは延期を検討':status==='caution'?'回復状況を確認して軽めに':'記録上はトレーニング可能の目安',
  guidance:status==='warning'?`推定休養期間が約${remainingDays}日残っています。下の種目は回復後の候補です。今日は別部位や休息を検討してください。`:status==='caution'?'残り休養目安は約1日。痛み・筋力低下・睡眠不足がある場合は休養を優先してください。':'痛みがなく体調が良い場合の候補です。青色は医学的な運動許可ではありません。',
  prescription:GOAL_GUIDE[goal]||GOAL_GUIDE.balanced,items};
}
