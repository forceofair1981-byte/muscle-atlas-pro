/**
 * Daily conversation starters for accumulated training tonnage.
 * Masses are NOT proof of strength, body mass measurements, or official film weights unless
 * explicitly designated 'screen-setting'. Dinosaur/ancient animal weights are approximate,
 * often disputed reconstructions; fictional speculative comparisons are for fun only.
 * The creature for a calendar date is deterministic and stable across reloads/devices.
 */
const d=(id,name,kg,emoji='🦕',quality='概算・復元推定',work='')=>({id,name,kg,emoji,category:'dinosaur',quality,work,unit:'頭'});
const p=(id,name,kg,emoji='🦣')=>({id,name,kg,emoji,category:'prehistoric',quality:'概算・復元推定',work:'',unit:'頭'});
const k=(id,name,kg,work,quality='フィクション用の仮定値',emoji='🦖')=>({id,name,kg,emoji,category:'kaiju',quality,work,unit:'体'});
export const MASS_REFERENCES=Object.freeze([
 // Dinosaurs: selected benchmark values, NOT measured weights of identified individuals.
 d('trex','ティラノサウルス',7000,'🦖','博物館掲載の推定値'),
 d('triceratops','トリケラトプス',10000,'🦕','博物館掲載の推定値'),
 d('stegosaurus','ステゴサウルス',5000),
 d('brachiosaurus','ブラキオサウルス',46900,'🦕','博物館掲載の推定値'),
 d('argentinosaurus','アルゼンチノサウルス',80000),
 d('spinosaurus','スピノサウルス',7400,'🦖'),
 d('giganotosaurus','ギガノトサウルス',8500,'🦖'),
 d('ankylosaurus','アンキロサウルス',8000),
 d('velociraptor','ヴェロキラプトル',15,'🦖'),
 d('deinonychus','デイノニクス',80,'🦖'),
 d('iguanodon','イグアノドン',3500),
 d('parasaurolophus','パラサウロロフス',2600),
 d('allosaurus','アロサウルス',2000,'🦖'),
 d('diplodocus','ディプロドクス',15000),
 d('apatosaurus','アパトサウルス',30000),
 d('patagotitan','パタゴティタン',57000),
 d('dreadnoughtus','ドレッドノータス',35000),
 d('carnotaurus','カルノタウルス',1500,'🦖'),
 d('styracosaurus','スティラコサウルス',3000),
 d('pachycephalosaurus','パキケファロサウルス',450),
 // Extinct prehistoric non-dinosaurs, including ancient marine reptiles and arthropods.
 p('mammoth','ケナガマンモス',6000),
 p('mastodon','マストドン',4500),
 p('woolly-rhino','ケナガサイ',2300,'🦏'),
 p('megalodon','メガロドン',45000,'🦈'),
 p('dunkleosteus','ダンクルオステウス',1100,'🐟'),
 p('megatherium','メガテリウム',3500),
 p('glyptodon','グリプトドン',1000),
 p('titanoboa','ティタノボア',1100,'🐍'),
 p('deinosuchus','デイノスクス',6000,'🐊'),
 p('sarcosuchus','サルコスクス',4000,'🐊'),
 p('basilosaurus','バシロサウルス',15000,'🐋'),
 p('livyatan','リヴィアタン',40000,'🐋'),
 p('quetzalcoatlus','ケツァルコアトルス',220),
 p('pteranodon','プテラノドン',30),
 p('arthropleura','アースロプレウラ',50,'🪲'),
 // Film creatures: only '作品設定参考値' is used only where a published film setting was checked.
 k('godzilla-1954','ゴジラ（初代）',20000000,'ゴジラ（1954）','作品設定参考値（バンダイ掲載）'),
 k('shin-godzilla','シン・ゴジラ',92000000,'シン・ゴジラ','作品資料の参考値・要照合'),
 k('godzilla-earth','ゴジラ・アース',120000000,'GODZILLA 怪獣惑星／星を喰う者','フィクション用の仮定値'),
 k('mechagodzilla','メカゴジラ（平成版）',150000000,'ゴジラvsメカゴジラ','作品資料の参考値・要照合','🤖'),
 k('king-ghidorah','キングギドラ（昭和版）',30000000,'三大怪獣 地球最大の決戦','作品資料の参考値・要照合','🐉'),
 k('mothra','モスラ（平成版）',20000000,'ゴジラvsモスラ','作品資料の参考値・要照合','🦋'),
 k('rodan','ラドン（平成版）',16000000,'ゴジラvsメカゴジラ','作品資料の参考値・要照合'),
 k('biollante','ビオランテ（植獣形態）',200000000,'ゴジラvsビオランテ','作品資料の参考値・要照合','🌿'),
 k('gamera','ガメラ',80000000,'ガメラ 大怪獣空中決戦','フィクション用の仮定値','🐢'),
 k('king-kong','キングコング',90000000,'ゴジラvsコング','フィクション用の仮定値','🦍'),
 k('clover','クローバー（怪物）',7000000,'クローバーフィールド／HAKAISHA','フィクション用の仮定値'),
 k('knifehead','ナイフヘッド',2700000,'パシフィック・リム','フィクション用の仮定値'),
 k('slattern','スラターン',6750000,'パシフィック・リム','フィクション用の仮定値'),
 k('gorgo','ゴルゴ',35000000,'怪獣ゴルゴ','フィクション用の仮定値'),
 k('rhedosaurus','リドサウルス',10000000,'原子怪獣現わる','フィクション用の仮定値')
].map(Object.freeze));
export const CATEGORY_NAMES=Object.freeze({dinosaur:'恐竜',prehistoric:'古代生物',kaiju:'映画の怪獣'});

const ymd=/^\d{4}-\d{2}-\d{2}$/;
export function utcDayNumber(date){
 if(typeof date!=='string'||!ymd.test(date))return null;
 const [y,m,d]=date.split('-').map(Number);
 if(y<1||y>9999)return null;
 const v=new Date(Date.UTC(2000,m-1,d));v.setUTCFullYear(y);
 return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d?Math.trunc(v.getTime()/86400000):null;
}
function seedHash(n){let x=(n^0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;return (x^(x>>>16))>>>0;}
export function pickDailyCreature(date){
 const number=utcDayNumber(date);if(number===null)return null;
 let index=seedHash(number)%MASS_REFERENCES.length;
 const prevRaw=seedHash(number-1)%MASS_REFERENCES.length;
 const prePrevRaw=seedHash(number-2)%MASS_REFERENCES.length;
 const prevSelected=prevRaw===prePrevRaw?(prevRaw+1)%MASS_REFERENCES.length:prevRaw;
 if(index===prevSelected)index=(index+1)%MASS_REFERENCES.length;
 return MASS_REFERENCES[index];
}
export function massAnalogies(totalKg,date){
 const kg=Number(totalKg),ref=pickDailyCreature(date);
 if(!ref||!Number.isFinite(kg)||kg<0)return [];
 return [{...ref,count:kg/ref.kg,percent:kg/ref.kg*100,date}];
}
export function formatCount(n){
 if(!Number.isFinite(n)||n<0)return '—';
 if(n===0)return '0';
 if(n<.0001)return '0.0001未満';
 const digits=n<.01?4:n<.1?3:n<10?2:1;
 return new Intl.NumberFormat('ja-JP',{maximumFractionDigits:digits}).format(n);
}
export const MASS_NOTE='毎日1種類を日付から擬似ランダム選出し、同じ日は同じ対象を表示します。実在する絶滅動物の体重は研究による概算値で幅があります。映画の怪獣は一部が作品資料に基づく参考値で、それ以外は比較を楽しむためだけの仮定値です。数値の出典区分も併記します。累計挙上重量は重量×回数×セット数で、一度に持ち上げた重量ではありません。自重・未入力重量は含まず、ダンベル左右やマシンの実効負荷は自動補正しません。';
