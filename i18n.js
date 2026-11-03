/* Muscle Atlas Pro: offline UI localization; user-generated data never sent to translators. */
import {L10N} from './i18n-data.js';
import {E,names} from './catalog.js';
import {displayNames} from './detail.js';
export const LANGUAGES=Object.freeze({ja:'日本語',en:'English',fr:'Français',it:'Italiano',es:'Español',de:'Deutsch'});
export const BROWSER_LOCALES=Object.freeze({ja:'ja-JP',en:'en-US',fr:'fr-FR',it:'it-IT',es:'es-ES',de:'de-DE'});
let language='ja';
let observer=null;
const originalText=new WeakMap(),renderedText=new WeakMap(),originalAttrs=new WeakMap();
const languageCallbacks=new Set();
export const getLanguage=()=>language;
export const getNumberLocale=()=>BROWSER_LOCALES[language];
export const validLanguage=x=>Object.hasOwn(LANGUAGES,x)?x:'ja';
export const onLanguageChange=fn=>{languageCallbacks.add(fn);return()=>languageCallbacks.delete(fn);};
const NUM=/\d[\d,.]*\s*/;

const muscleMap={
'大胸筋上部':['Upper chest','Haut des pectoraux','Pettorale superiore','Pectoral superior','Obere Brust'],
'大胸筋':['Pectorals','Pectoraux','Pettorali','Pectorales','Brustmuskeln'],
'大胸筋中部':['Middle chest','Milieu des pectoraux','Pettorale centrale','Pectoral medio','Mittlere Brust'],
'大胸筋下部':['Lower chest','Bas des pectoraux','Pettorale inferiore','Pectoral inferior','Untere Brust'],
'前鋸筋':['Serratus anterior','Dentelé antérieur','Dentato anteriore','Serrato anterior','Vorderer Sägemuskel'],
'三角筋前部':['Front deltoid','Deltoïde antérieur','Deltoide anteriore','Deltoides anterior','Vordere Schulter'],
'三角筋中部':['Side deltoid','Deltoïde latéral','Deltoide laterale','Deltoides lateral','Seitliche Schulter'],
'三角筋後部':['Rear deltoid','Deltoïde postérieur','Deltoide posteriore','Deltoides posterior','Hintere Schulter'],
'上腕二頭筋':['Biceps','Biceps','Bicipiti','Bíceps','Bizeps'],
'上腕筋':['Brachialis','Brachial antérieur','Brachiale','Braquial','Armbeuger'],
'上腕三頭筋':['Triceps','Triceps','Tricipiti','Tríceps','Trizeps'],
'前腕屈筋群':['Forearm flexors','Fléchisseurs avant-bras','Flessori avambraccio','Flexores antebrazo','Unterarmbeuger'],
'前腕伸筋群':['Forearm extensors','Extenseurs avant-bras','Estensori avambraccio','Extensores antebrazo','Unterarmstrecker'],
'腹直筋上部':['Upper abdominals','Abdominaux supérieurs','Addominali superiori','Abdominales superiores','Obere Bauchmuskeln'],
'腹直筋下部':['Lower abdominals','Abdominaux inférieurs','Addominali inferiori','Abdominales inferiores','Untere Bauchmuskeln'],
'外腹斜筋':['External obliques','Obliques externes','Obliqui esterni','Oblicuos externos','Äußere schräge Bauchmuskeln'],
'腸腰筋':['Hip flexors','Fléchisseurs de hanche','Flessori anca','Flexores cadera','Hüftbeuger'],
'大腿四頭筋':['Quadriceps','Quadriceps','Quadricipiti','Cuádriceps','Quadrizeps'],
'内転筋群':['Adductors','Adducteurs','Adduttori','Aductores','Adduktoren'],
'前脛骨筋':['Tibialis anterior','Tibial antérieur','Tibiale anteriore','Tibial anterior','Vorderer Schienbeinmuskel'],
'僧帽筋上部':['Upper trapezius','Trapèze supérieur','Trapezio superiore','Trapecio superior','Oberer Trapezmuskel'],
'僧帽筋中部':['Middle trapezius','Trapèze moyen','Trapezio medio','Trapecio medio','Mittlerer Trapezmuskel'],
'僧帽筋下部':['Lower trapezius','Trapèze inférieur','Trapezio inferiore','Trapecio inferior','Unterer Trapezmuskel'],
'広背筋':['Latissimus dorsi','Grand dorsal','Gran dorsale','Dorsal ancho','Breiter Rückenmuskel'],
'脊柱起立筋':['Spinal erectors','Érecteurs du rachis','Erettori spinali','Erectores espinales','Rückenstrecker'],
'中臀筋':['Gluteus medius','Moyen fessier','Gluteo medio','Glúteo medio','Mittlerer Gesäßmuskel'],
'大臀筋':['Gluteus maximus','Grand fessier','Grande gluteo','Glúteo mayor','Großer Gesäßmuskel'],
'ハムストリングス':['Hamstrings','Ischio-jambiers','Ischiocrurali','Isquiotibiales','Beinbeuger'],
'腓腹筋':['Gastrocnemius','Gastrocnémien','Gastrocnemio','Gastrocnemio','Zwillingswadenmuskel'],
'ヒラメ筋':['Soleus','Soléaire','Soleo','Sóleo','Schollenmuskel'],
'上腕二頭筋長頭（模式図）':['Biceps long head (schematic)','Biceps chef long (schéma)','Bicipite capo lungo (schema)','Bíceps cabeza larga (esquema)','Bizeps langer Kopf (Schema)'],
'上腕二頭筋短頭（模式図）':['Biceps short head (schematic)','Biceps chef court (schéma)','Bicipite capo breve (schema)','Bíceps cabeza corta (esquema)','Bizeps kurzer Kopf (Schema)'],
'前腕橈側屈筋群':['Radial forearm flexors','Fléchisseurs radiaux','Flessori radiali','Flexores radiales','Radiale Unterarmbeuger'],
'前腕尺側屈筋群':['Ulnar forearm flexors','Fléchisseurs ulnaires','Flessori ulnari','Flexores cubitales','Ulnare Unterarmbeuger'],
'外側広筋':['Vastus lateralis','Vaste latéral','Vasto laterale','Vasto lateral','Äußerer breiter Muskel'],
'大腿直筋（前面）':['Rectus femoris (front)','Droit fémoral (avant)','Retto femorale (davanti)','Recto femoral (frontal)','Gerader Oberschenkelmuskel'],
'内側広筋':['Vastus medialis','Vaste médial','Vasto mediale','Vasto medial','Innerer breiter Muskel'],
'内転筋群・上部':['Upper adductors','Adducteurs supérieurs','Adduttori superiori','Aductores superiores','Obere Adduktoren'],
'内転筋群・下部':['Lower adductors','Adducteurs inférieurs','Adduttori inferiori','Aductores inferiores','Untere Adduktoren'],
'上腕三頭筋外側頭（模式図）':['Triceps lateral head (schematic)','Triceps chef latéral (schéma)','Tricipite capo laterale (schema)','Tríceps cabeza lateral (esquema)','Trizeps seitlicher Kopf (Schema)'],
'上腕三頭筋長頭（模式図）':['Triceps long head (schematic)','Triceps chef long (schéma)','Tricipite capo lungo (schema)','Tríceps cabeza larga (esquema)','Trizeps langer Kopf (Schema)'],
'前腕橈側伸筋群':['Radial forearm extensors','Extenseurs radiaux','Estensori radiali','Extensores radiales','Radiale Unterarmstrecker'],
'前腕尺側伸筋群':['Ulnar forearm extensors','Extenseurs ulnaires','Estensori ulnari','Extensores cubitales','Ulnare Unterarmstrecker'],
'広背筋上部（模式図）':['Upper lats (schematic)','Grand dorsal haut (schéma)','Gran dorsale superiore (schema)','Dorsal superior (esquema)','Oberer Latissimus (Schema)'],
'広背筋下部（模式図）':['Lower lats (schematic)','Grand dorsal bas (schéma)','Gran dorsale inferiore (schema)','Dorsal inferior (esquema)','Unterer Latissimus (Schema)'],
'大臀筋上部（模式図）':['Upper glutes (schematic)','Grand fessier haut (schéma)','Glutei superiori (schema)','Glúteos superiores (esquema)','Oberes Gesäß (Schema)'],
'大臀筋下部（模式図）':['Lower glutes (schematic)','Grand fessier bas (schéma)','Glutei inferiori (schema)','Glúteos inferiores (esquema)','Unteres Gesäß (Schema)'],
'大腿二頭筋（外側）':['Biceps femoris (lateral)','Biceps fémoral (latéral)','Bicipite femorale (laterale)','Bíceps femoral (lateral)','Beinbizeps (seitlich)'],
'半腱様筋・半膜様筋（内側）':['Semitendinosus / semimembranosus','Semi-tendineux / semi-membraneux','Semitendinoso / semimembranoso','Semitendinoso / semimembranoso','Halbsehnen- / Plattsehnenmuskel'],
'腓腹筋外側頭':['Lateral calf head','Gastrocnémien latéral','Gastrocnemio laterale','Gastrocnemio lateral','Äußerer Wadenkopf'],
'腓腹筋内側頭':['Medial calf head','Gastrocnémien médial','Gastrocnemio mediale','Gastrocnemio medial','Innerer Wadenkopf']
};
for(const [ja,trans] of Object.entries(muscleMap)){
 L10N[ja]={en:trans[0],fr:trans[1],it:trans[2],es:trans[3],de:trans[4]};
}

const exerciseEnglish=new Map();
for(const exercise of E){
 const name=exercise.a.find(a=>/^[\x20-\x7e]+$/.test(a)&&/[a-z]{3}/i.test(a));
 exerciseEnglish.set(exercise.n,name?name.replaceAll(/\s+/g,' ').trim():(exercise.n==='リバースグリップベンチプレス'?'Reverse grip bench press':exercise.n));
}
// Most gym movements are internationally understood under these English names;
// provide localized terms for common movements while always preserving canonical IDs.
const commonExercises={
'ベンチプレス':['Bench press','Développé couché','Panca piana','Press de banca','Bankdrücken'],
'スクワット':['Squat','Squat','Squat','Sentadilla','Kniebeuge'],
'デッドリフト':['Deadlift','Soulevé de terre','Stacco da terra','Peso muerto','Kreuzheben'],
'ショルダープレス':['Shoulder press','Développé épaules','Shoulder press','Press de hombros','Schulterdrücken'],
'リアレイズ':['Reverse fly','Oiseau','Alzate posteriori','Elevaciones posteriores','Reverse Fly'],
'シュラッグ':['Shrugs','Haussements d’épaules','Scrollate spalle','Encogimientos de hombros','Schulterheben'],
'リアデルトマシン':['Rear delt machine','Machine deltoïde postérieur','Macchina deltoidi posteriori','Máquina deltoides posterior','Reverse-Fly-Maschine'],
'ラットプルダウン':['Lat pulldown','Tirage vertical','Lat machine','Jalón al pecho','Latzug'],
'レッグプレス':['Leg press','Presse à cuisses','Pressa gambe','Prensa de piernas','Beinpresse'],
'レッグエクステンション':['Leg extension','Extension des jambes','Leg extension','Extensión de piernas','Beinstrecker'],
'アダクション':['Hip adduction','Adduction des hanches','Adduzione anca','Aducción de cadera','Adduktorenmaschine'],
'ヒップアブダクション':['Hip abduction','Abduction des hanches','Abduzione anca','Abducción de cadera','Abduktorenmaschine'],
'ケーブルクランチ':['Cable crunch','Crunch à la poulie','Crunch al cavo','Crunch en polea','Kabelcrunch'],
'ロシアンツイスト':['Russian twist','Rotation russe','Russian twist','Giro ruso','Russian Twist'],
'ペックフライ':['Pec fly','Pec deck','Pec deck','Aperturas en máquina','Butterfly'],
'ダンベルプレス':['Dumbbell press','Développé haltères','Distensioni con manubri','Press con mancuernas','Kurzhanteldrücken']
};
for(const [ja,t] of Object.entries(commonExercises))L10N[ja]={en:t[0],fr:t[1],it:t[2],es:t[3],de:t[4]};
for(const [ja,en] of exerciseEnglish){if(!L10N[ja])L10N[ja]={en,fr:en,it:en,es:en,de:en};}

// Dynamic counting and status patterns; these translations preserve numeric values.
const patterns=[
 [/^(\d+)件\s*\/\s*(\d+)日$/,{en:'$1 entries / $2 days',fr:'$1 entrées / $2 jours',it:'$1 voci / $2 giorni',es:'$1 registros / $2 días',de:'$1 Einträge / $2 Tage'}],
 [/^(\d+)件$/,{en:'$1 entries',fr:'$1 entrées',it:'$1 voci',es:'$1 registros',de:'$1 Einträge'}],
 [/^(\d+)品目$/,{en:'$1 foods',fr:'$1 aliments',it:'$1 alimenti',es:'$1 alimentos',de:'$1 Lebensmittel'}],
 [/^(\d+)種目$/,{en:'$1 exercises',fr:'$1 exercices',it:'$1 esercizi',es:'$1 ejercicios',de:'$1 Übungen'}],
 [/^(\d+)部位を除外$/,{en:'$1 excluded muscles',fr:'$1 muscles exclus',it:'$1 muscoli esclusi',es:'$1 músculos excluidos',de:'$1 ausgeschlossene Muskeln'}],
 [/^(\d+)セット$/,{en:'$1 sets',fr:'$1 séries',it:'$1 serie',es:'$1 series',de:'$1 Sätze'}],
 [/^(\d+)日$/,{en:'$1 days',fr:'$1 jours',it:'$1 giorni',es:'$1 días',de:'$1 Tage'}],
 [/^(\d+)種目\s*\/\s*(\d+)セット$/,{en:'$1 exercises / $2 sets',fr:'$1 exercices / $2 séries',it:'$1 esercizi / $2 serie',es:'$1 ejercicios / $2 series',de:'$1 Übungen / $2 Sätze'}],
 [/^(\d+)部位を候補から除外しました$/,{en:'Excluded $1 muscle groups from suggestions',fr:'$1 groupes musculaires exclus',it:'Esclusi $1 gruppi muscolari',es:'Excluidos $1 grupos musculares',de:'$1 Muskelgruppen ausgeschlossen'}],
 [/^(\d+)種目が一致しています。(\d+)件を表示$/,{en:'$1 exercises match; showing $2',fr:'$1 exercices trouvés ; $2 affichés',it:'$1 esercizi trovati; ne mostro $2',es:'$1 ejercicios encontrados; se muestran $2',de:'$1 passende Übungen; $2 angezeigt'}],
 [/^(\d+)件の記録を読み込みました$/,{en:'Loaded $1 workouts',fr:'$1 entraînements chargés',it:'Caricati $1 allenamenti',es:'Cargados $1 entrenamientos',de:'$1 Trainingseinträge geladen'}],
 [/^さらに表示（残り(\d+)件）$/,{en:'Show more ($1 remaining)',fr:'Voir plus ($1 restants)',it:'Mostra altri ($1 rimasti)',es:'Mostrar más ($1 restantes)',de:'Mehr anzeigen ($1 übrig)'}],
 [/^(\d+)件のトレーニング$/,{en:'$1 workout(s)',fr:'$1 entraînement(s)',it:'$1 allenamento/i',es:'$1 entrenamiento(s)',de:'$1 Trainingseinheit(en)'}],
 [/^(\d+)品目が一致.*$/,{en:'$1 matching foods',fr:'$1 aliments trouvés',it:'$1 alimenti trovati',es:'$1 alimentos encontrados',de:'$1 passende Lebensmittel'}],
 [/^(\d+)セット\s*·\s*総挙上重量\s*([\d,.\s\u00a0\u202f]+)kg$/,{en:'$1 sets · lifted $2 kg',fr:'$1 séries · soulevé $2 kg',it:'$1 serie · sollevati $2 kg',es:'$1 series · levantados $2 kg',de:'$1 Sätze · bewegt $2 kg'}],
 [/^(\d+)種目\s*·\s*(\d+)セット\s*·\s*([\d,.\s\u00a0\u202f]+)kg$/,{en:'$1 exercises · $2 sets · $3 kg',fr:'$1 exercices · $2 séries · $3 kg',it:'$1 esercizi · $2 serie · $3 kg',es:'$1 ejercicios · $2 series · $3 kg',de:'$1 Übungen · $2 Sätze · $3 kg'}],
 [/^最終記録\s*(\d{4}[-/]\d\d[-/]\d\d)\s*／\s*([\d,.\s\u00a0\u202f]+)セット相当$/,{en:'Last workout $1 · $2 set equivalents',fr:'Dernière séance $1 · $2 équivalents séries',it:'Ultimo allenamento $1 · $2 equivalenti serie',es:'Última sesión $1 · $2 equivalentes series',de:'Letztes Training $1 · $2 Satzäquivalente'}],
 [/^残り約(\d+)日$/,{en:'About $1 days remaining',fr:'Env. $1 jours restants',it:'Circa $1 giorni rimanenti',es:'Unos $1 días restantes',de:'Noch ca. $1 Tage'}],
 [/^([\d,.\s\u00a0\u202f]+)\s*セット相当$/,{en:'$1 set equivalents',fr:'$1 équivalents de séries',it:'$1 equivalenti serie',es:'$1 equivalentes series',de:'$1 Satzäquivalente'}],
 [/^([\d,.\s\u00a0\u202f]+)\s*kg\s*・\s*([\d,.\s\u00a0\u202f]+)\s*cm\s*・\s*(男性|女性|中立)\s*・\s*(.*)$/,{en:'$1 kg · $2 cm · $3 · $4',fr:'$1 kg · $2 cm · $3 · $4',it:'$1 kg · $2 cm · $3 · $4',es:'$1 kg · $2 cm · $3 · $4',de:'$1 kg · $2 cm · $3 · $4'}]
];

// Structured status templates: only translate recognized UI sentences, never arbitrary notes.
const dynamicPatterns=[
 [/^(\d+)\/(\d+)部位・(\d+)\/(\d+)種目$/,
  [' $1/$2 muscle groups · $3/$4 exercises',' $1/$2 groupes musculaires · $3/$4 exercices',' $1/$2 gruppi muscolari · $3/$4 esercizi',' $1/$2 grupos musculares · $3/$4 ejercicios',' $1/$2 Muskelgruppen · $3/$4 Übungen']],
 [/^(\d+)\s*·\s*青／記録上は可$/,
  ['$1 · Blue / ready per log','$1 · Bleu / prêt selon journal','$1 · Blu / pronto da registro','$1 · Azul / apto según registro','$1 · Blau / laut Protokoll bereit']],
 [/^過去14日：刺激\s*([\d.,]+)セット相当・記録\s*(\d+)日$/,
  ['Last 14 days: $1 equivalent sets · $2 recorded days','14 derniers jours : $1 séries équiv. · $2 jours','Ultimi 14 giorni: $1 serie equivalenti · $2 giorni','Últimos 14 días: $1 series equivalentes · $2 días','Letzte 14 Tage: $1 Satzäquivalente · $2 Tage']],
 [/^(.+?)\s*·\s*(\d+)〜(\d+)回×まず(\d+)セット・RIR\s*(\d+)目標$/,
  ['$1 · $2–$3 reps × $4 sets initially · target RIR $5','$1 · $2–$3 rép. × $4 séries initiales · RIR $5','$1 · $2–$3 rip. × $4 serie iniziali · RIR $5','$1 · $2–$3 reps × $4 series iniciales · RIR $5','$1 · $2–$3 Wdh. × zunächst $4 Sätze · RIR $5']],
 [/^\/\s*100\s*·\s*独自の点検指標$/,
  ['/ 100 · internal record score','/ 100 · indice interne','/ 100 · indice interno','/ 100 · índice interno','/ 100 · interner Prüfwert']],
 [/^(\d+)\s*(セッション|種目|実セット)$/,
  ['$1 $2','$1 $2','$1 $2','$1 $2','$1 $2']],
 [/^(\d+)種目・(\d+)セットの筋力トレーニングを記録しました。$/,
  ['Logged $1 strength exercises and $2 sets.','$1 exercices de musculation et $2 séries enregistrés.','Registrati $1 esercizi di forza e $2 serie.','Registrados $1 ejercicios de fuerza y $2 series.','$1 Kraftübungen mit $2 Sätzen erfasst.']],
 [/^有酸素運動(\d+)件も記録されています。$/,
  ['Also logged $1 cardio activities.','$1 activités cardio enregistrées aussi.','Registrate anche $1 attività cardio.','También se registraron $1 actividades cardiovasculares.','Außerdem $1 Ausdauereinheiten erfasst.']],
 [/^(.+?)に約([\d.,]+)セット相当の刺激が集中しています。$/,
  ['About $2 equivalent sets focused on $1.','Environ $2 équivalents de séries sur $1.','Circa $2 serie equivalenti concentrate su $1.','Aproximadamente $2 series equivalentes en $1.','Etwa $2 Satzäquivalente konzentrieren sich auf $1.']],
 [/^(.+?)の直近7日間は約([\d.,]+)セット相当です。$/,
  ['$1: about $2 equivalent sets in 7 days.','$1 : env. $2 séries équivalentes en 7 jours.','$1: circa $2 serie equivalenti in 7 giorni.','$1: unas $2 series equivalentes en 7 días.','$1: ca. $2 Satzäquivalente in 7 Tagen.']],
 [/^(.+?)は前日も刺激されています（前日([\d.,]+)、当日([\d.,]+)セット相当）。$/,
  ['$1 was also trained yesterday ($2 yesterday, $3 today equivalent sets).','$1 sollicité aussi hier ($2 hier, $3 aujourd’hui en séries équiv.).','$1 allenato anche ieri ($2 ieri, $3 oggi in serie equivalenti).','$1 también se trabajó ayer ($2 ayer, $3 hoy series equivalentes).','$1 wurde auch gestern trainiert ($2 gestern, $3 heute Satzäquivalente).']],
 [/^(.+?)は2日前にも負荷があります。$/,
  ['$1 was also trained 2 days ago.','$1 sollicité il y a 2 jours.','$1 allenato anche 2 giorni fa.','$1 también se entrenó hace 2 días.','$1 wurde bereits vor 2 Tagen belastet.']],
 [/^(\d+)\.\s+(.+)$/,
  ['$1. $2','$1. $2','$1. $2','$1. $2','$1. $2']],
 [/^日別評価\s*(\d+)\/100\s*·\s*(.+?)（(.+?)）$/,
  ['Daily review $1/100 · $2 ($3)','Bilan du jour $1/100 · $2 ($3)','Valutazione $1/100 · $2 ($3)','Evaluación diaria $1/100 · $2 ($3)','Tagesbewertung $1/100 · $2 ($3)']],
 [/^挙上重量\s*([\d,.\s\u00a0\u202f]+)kg$/,
  ['Volume lifted $1 kg','Volume soulevé $1 kg','Volume sollevato $1 kg','Volumen levantado $1 kg','Bewegtes Gewicht $1 kg']],
 [/^筋トレ\s*(\d+)分$/,
  ['Strength training $1 min','Musculation $1 min','Allenamento forza $1 min','Fuerza $1 min','Krafttraining $1 Min.']],
 [/^有酸素\s*(\d+)分$/,
  ['Cardio $1 min','Cardio $1 min','Cardio $1 min','Cardio $1 min','Ausdauer $1 Min.']],
 [/^消費\s*([\d,.\s\u00a0\u202f]+)kcal$/,
  ['Burned $1 kcal','Dépense $1 kcal','Consumo $1 kcal','Gasto $1 kcal','Verbrauch $1 kcal']],
 [/^(\d+)日後$/,
  ['After $1 days','Dans $1 jours','Tra $1 giorni','En $1 días','In $1 Tagen']],
 [/^参考幅\s*([\d,.\s\u00a0\u202f]+)〜([\d,.\s\u00a0\u202f]+)$/,
  ['Illustrative range $1–$2','Intervalle indicatif $1–$2','Intervallo indicativo $1–$2','Rango orientativo $1–$2','Beispielspanne $1–$2']],
 [/^目標\s*([\d.]+)%$/,
  ['Target $1%','Objectif $1 %','Obiettivo $1%','Objetivo $1%','Ziel $1 %']],
 [/^端末内の食品辞書\s*(\d+)品目から検索できます。$/,
  ['Search $1 foods in the offline dictionary.','Recherchez parmi $1 aliments du dictionnaire local.','Cerca tra $1 alimenti del dizionario locale.','Busca entre $1 alimentos del diccionario local.','$1 Lebensmittel im lokalen Verzeichnis suchen.']],
 [/^保存方式：(.+?)。トレーニング・食事は端末ごとに保存。バックアップは暗号化されません。$/,
  ['Storage: $1. Workouts and meals are saved on this device. Backups are not encrypted.','Stockage : $1. Séances et repas restent sur cet appareil. Sauvegardes non chiffrées.','Archiviazione: $1. Allenamenti e pasti sul dispositivo. Backup non crittografati.','Almacenamiento: $1. Entrenamientos y comidas en este dispositivo. Copias sin cifrar.','Speicherung: $1. Training und Mahlzeiten bleiben auf diesem Gerät. Backups sind unverschlüsselt.']],
 [/^記録上の評価\s*([\d,.\s\u00a0\u202f]+)\/100$/,
  ['Logged review $1/100','Évaluation $1/100','Valutazione $1/100','Evaluación $1/100','Bewertung $1/100']],
];
const dynLanguages=['en','fr','it','es','de'];
function dynamicMatch(trim,lang){
 const index=dynLanguages.indexOf(lang);if(index<0)return null;
 for(const [rx,t] of dynamicPatterns){
  const m=trim.match(rx);if(!m)continue;
  return t[index].trimStart().replace(/\$(\d+)/g,(_,n)=>{
   const v=m[Number(n)]??'';
   if(v.includes(' · '))return v.split(' · ').map(s=>L10N[s]?.[lang]??s).join(' · ');
   return L10N[v]?.[lang]??v;
  });
 }
 return null;
}
function compoundText(trim,lang){
 if(trim.startsWith('• ')){
  const res=L10N[trim.slice(2)]?.[lang];if(res)return '• '+res;
 }
 // Evaluation/suggestion descriptions join known sentences; translate each independently.
 const pieces=trim.split(/(?<=。)\s+/u);
 if(pieces.length>1){
  const out=pieces.map(x=>L10N[x]?.[lang]??dynamicMatch(x,lang)??x);
  if(out.some((x,i)=>x!==pieces[i]))return out.join(' ');
 }
 return null;
}
function localPiece(s){const item=L10N[s];return item?.[language]??s;}
function substitute(template,input,match){return template.replace(/\$(\d+)/g,(_,n)=>{
 const val=match[Number(n)]??'';return L10N[val]?.[language]??val;
});}
function translateSpecial(trim,lang){
 const prefix=trim.match(/^主な部位：(.*)$/);
 if(prefix){const term={en:'Main muscles: ',fr:'Muscles principaux : ',it:'Muscoli principali: ',es:'Músculos principales: ',de:'Hauptmuskeln: '}[lang]||'';
  return term+prefix[1].split(/\s*[·・]\s*/).map(x=>L10N[x]?.[lang]||x).join(' · ');}
 // Text summaries combine user-entered target values and generated status.
 const sexnote='性別が未選択のため、表示した基礎代謝と日常活動込みの数値は男女の式による参考範囲です。プロフィールで式を選択すると単一の推定値になります。';
 if(trim.startsWith(sexnote)){
  let remaining=trim.slice(sexnote.length).trim();
  const prefix=L10N[sexnote]?.[lang]||sexnote;
  remaining=remaining.replace(/計算内訳：RMR\s*([^×]+)×\s*活動係数\s*([\d,.\s\u00a0\u202f]+)\s*＋\s*運動の安静時超過分\s*([\d,.\s\u00a0\u202f]+)\s*×\s*反映率\s*([\d,.\s\u00a0\u202f]+)%\s*＋\s*目標調整\s*([^。]+)。/,
  (_,rmr,activity,burn,rate,goal)=>{
   const templates={en:`Breakdown: RMR ${rmr.trim()} × activity ${activity} + extra workout ${burn} × ${rate}% credit + goal adjustment ${goal}.`,fr:`Détail : RMR ${rmr.trim()} × activité ${activity} + exercice extra ${burn} × ${rate} % + objectif ${goal}.`,it:`Calcolo: RMR ${rmr.trim()} × attività ${activity} + extra allenamento ${burn} × ${rate}% + obiettivo ${goal}.`,es:`Cálculo: RMR ${rmr.trim()} × actividad ${activity} + ejercicio extra ${burn} × ${rate}% + objetivo ${goal}.`,de:`Berechnung: RMR ${rmr.trim()} × Aktivität ${activity} + Trainingsmehrverbrauch ${burn} × ${rate} % + Zielanpassung ${goal}.`};return templates[lang];});
  for(const src of ['食事未記録：摂取量と残りカロリーを表示しません。','運動消費・RMR・日常活動の係数は個人差のある推定値です。体重推移などを確認しながら調整してください。'])remaining=remaining.replace(src,L10N[src]?.[lang]||src);
  return prefix+' '+remaining;
 }
 const rirNote=trim.match(/^選択した日の前日まで14日分の記録と当日の記録上の回復状態を参照します。おすすめは2部位・合計最大5種目、RIR (\d+)を目標に本人の体調で調整してください。未記録の運動・睡眠・痛みを判断できません。遺伝情報からの数値推定は行いません。$/);
 if(rirNote){const template=L10N['選択した日の前日まで14日分の記録と当日の記録上の回復状態を参照します。おすすめは2部位・合計最大5種目、RIR 2を目標に本人の体調で調整してください。未記録の運動・睡眠・痛みを判断できません。遺伝情報からの数値推定は行いません。']?.[lang];
   if(template)return template.replace(/RIR\s*2\b/,'RIR '+rirNote[1]);}
 const summary=trim.match(/^過去7日：(\d+)セッション。運動による平均追加消費 ≈ ([\d,.\s\u00a0\u202f]+)kcal\/日（推定）。(.+?)\s*選択種目の直近推定1RM ([\d,.\s\u00a0\u202f]+)kg。$/);
 if(summary){
  const [,sessions,cal,rest,rm]=summary;
  const templates={en:`Last 7 days: ${sessions} sessions. Estimated added exercise burn ≈ ${cal} kcal/day. ${L10N[rest]?.en||rest} Latest estimated 1RM: ${rm} kg.`,fr:`7 derniers jours : ${sessions} séances. Dépense sportive supplémentaire ≈ ${cal} kcal/j. ${L10N[rest]?.fr||rest} Dernier 1RM estimé : ${rm} kg.`,it:`Ultimi 7 giorni: ${sessions} sessioni. Consumo sportivo extra ≈ ${cal} kcal/giorno. ${L10N[rest]?.it||rest} Ultimo 1RM stimato: ${rm} kg.`,es:`Últimos 7 días: ${sessions} sesiones. Gasto extra de ejercicio ≈ ${cal} kcal/día. ${L10N[rest]?.es||rest} Último 1RM estimado: ${rm} kg.`,de:`Letzte 7 Tage: ${sessions} Einheiten. Zusätzlicher Trainingsverbrauch ≈ ${cal} kcal/Tag. ${L10N[rest]?.de||rest} Letzter geschätzter 1RM: ${rm} kg.`};return templates[lang];
 }
 return null;
}
export function translate(text,overrideLang=null){
 const lang=overrideLang||language;
 const original=String(text??'');if(lang==='ja'||!original.trim())return original;
 const trim=original.trim();const special=translateSpecial(trim,lang);if(special!==null)return original.replace(trim,special);const direct=L10N[trim]?.[lang];
 if(direct!==undefined)return original.slice(0,original.indexOf(trim))+direct+original.slice(original.indexOf(trim)+trim.length);
 for(const [regex,trans] of patterns){const m=trim.match(regex);if(m){const template=trans[lang];if(template)return original.slice(0,original.indexOf(trim))+template.replace(/\$(\d+)/g,(_,n)=>L10N[m[Number(n)]]?.[lang]??m[Number(n)]??'')+original.slice(original.indexOf(trim)+trim.length)}}
 const matched=dynamicMatch(trim,lang)??compoundText(trim,lang);if(matched!==null)return original.replace(trim,matched);
 // Conservative fallback: never perform arbitrary substring replacements in user-entered content.
 return original;
}

const ATTRS=['placeholder','aria-label','title','alt'];
function isProtected(node){return node.parentElement?.closest('script,style,textarea,pre,code,[contenteditable="true"],[data-no-translate]')!==null;}
function applyText(node){
 if(node.nodeType!==Node.TEXT_NODE||isProtected(node))return;
 const seen=renderedText.get(node),current=node.nodeValue;
 if(seen===undefined||current!==seen){originalText.set(node,current);}
 const original=originalText.get(node)||'';
 const next=translate(original);
 renderedText.set(node,next);
 if(next!==current)node.nodeValue=next;
}
function applyAttrs(element){
 if(element.nodeType!==Node.ELEMENT_NODE)return;
 if(element.matches('input,textarea,[contenteditable]')){
  // Translate only placeholders, never actual values entered by the user.
 }
 if(element.closest('[data-no-translate]'))return;
 let saved=originalAttrs.get(element);
 if(!saved){saved={};originalAttrs.set(element,saved)}
 for(const key of ATTRS){
  if(!element.hasAttribute(key))continue;
  const val=element.getAttribute(key);
  const entry=saved[key];
  if(!entry||entry.last!==val)saved[key]={source:val,last:val};
  const next=translate(saved[key].source);
  saved[key].last=next;
  if(next!==val)element.setAttribute(key,next);
 }
}
function applyNode(node){
 if(node.nodeType===Node.TEXT_NODE){applyText(node);return;}
 if(node.nodeType!==Node.ELEMENT_NODE)return;
 applyAttrs(node);
 for(const child of node.childNodes)applyNode(child);
}
export function translatePage(){
 applyNode(document.documentElement);
 document.documentElement.lang=language;
 document.documentElement.dataset.uiLanguage=language;
 if(document.title){
  // document.title is translated as a normal text node of <title>.
 }
}
export function setLanguage(lang){
 language=validLanguage(lang);
 translatePage();
 for(const cb of languageCallbacks){try{cb(language)}catch(error){console.warn('Language callback failed',error)}}
}
export function startTranslation(){
 if(observer)return;
 observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData'){applyText(record.target);continue;}
   if(record.type==='attributes'){applyAttrs(record.target);continue;}
   for(const node of record.addedNodes)applyNode(node);
  }
 });
 observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 translatePage();
}
export function formatNumber(v){return Number(v).toLocaleString(BROWSER_LOCALES[language])}
export function formatDate(iso){
 if(!iso)return'';
 const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return String(iso);
 if(language==='ja')return m[1]+'/'+m[2]+'/'+m[3];
 const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],12));
 return new Intl.DateTimeFormat(BROWSER_LOCALES[language],{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).format(d);
}
export function localizedExerciseAliases(exercise){
 const translated=L10N[exercise.n]||{};
 return [...new Set([exercise.n,...exercise.a,...Object.values(translated)].filter(x=>typeof x==='string'&&x.trim()))];
}
export function exerciseLabel(canonical){if(language==='ja')return canonical;return L10N[canonical]?.[language]||exerciseEnglish.get(canonical)||canonical}
export function muscleLabel(id){if(language==='ja')return displayNames[id]||names[id]||id;const ja=displayNames[id]||names[id]||id;return L10N[ja]?.[language]||ja}
// Source always expects canonical exercise names or aliases; never localize IDs in the database.
export function insertionName(exercise){if(language==='ja')return exercise.n;return exerciseEnglish.get(exercise.n)||exercise.n;}
export function deletionPhrase(){return {ja:'削除',en:'DELETE',fr:'SUPPRIMER',it:'ELIMINA',es:'ELIMINAR',de:'LÖSCHEN'}[language];}
