// DNA EXERCISE: user-entered report labels only; do not infer training loads or medical risks.
export const DNA_GENES=Object.freeze({
 ACTN3:{rs:'rs1815739',allowed:['R/R','R/X','X/X'],description:'α-アクチニン3に関係する多型'},
 ACE:{rs:'rs4646994',allowed:['I/I','I/D','D/D'],description:'ACEの挿入/欠失（I/D）多型'},
 PPARGC1A:{rs:'rs8192678',allowed:['G/G','G/S','S/S'],description:'Gly482SerのG/S表記（検査会社の表示）'}
});
export const emptyDNAMarkers=()=>({ACTN3:'',ACE:'',PPARGC1A:''});
function normalizedLabel(input){return String(input??'').normalize('NFKC').toUpperCase().trim().replace(/[\s／]/g,'/').replace(/\/+/g,'/');}
export function normalizeDNAMarkers(value){
 const source=value&&typeof value==='object'?value:{};
 return Object.fromEntries(Object.entries(DNA_GENES).map(([name,meta])=>{
   const val=normalizedLabel(source[name]);
   return [name,meta.allowed.includes(val)?val:''];
 }));
}
// Only extract explicit statement of genotype, e.g. "■ACTN3はR/R型です".
// Never read a result *option table* containing every possible allele as a result.
export function parseExerciseReport(text){
 const content=String(text??'').normalize('NFKC').replace(/\u200b/g,'');
 if(content.length>6000000)throw Error('入力文書が大きすぎます');
 const parsed=emptyDNAMarkers();
 const warnings=[];
 for(const [name,meta] of Object.entries(DNA_GENES)){
   const gene=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   // EBS form: "ACTN3はR/R型です"; also "ACE: I/I型", "PPARGC1A = G/S".
   const pattern=new RegExp('(?:^|[^A-Z0-9])'+gene+'\\s*(?:は|：|:|=|結果[：:]?)\\s*([RIDGXS]\\s*[/／]\\s*[RIDGXS])\\s*(?:型|type|です|[。.]|$)','gim');
   const candidates=[...content.matchAll(pattern)].map(x=>normalizedLabel(x[1])).filter(x=>meta.allowed.includes(x));
   const distinct=[...new Set(candidates)];
   if(distinct.length===1)parsed[name]=distinct[0];
   else if(distinct.length>1)warnings.push(`${name}は複数の型が見つかりました。原本で確認してください。`);
 }
 return {markers:parsed,matched:Object.values(parsed).filter(Boolean).length,warnings};
}
// Legacy marker presence scan supports local CSV/TSV text. Presence is not genotype.
export function scanDNA(text){
 const content=String(text??'');
 if(content.length>6000000)throw Error('ファイルが大きすぎます');
 const found=Object.entries(DNA_GENES).filter(([,meta])=>new RegExp('\\b'+meta.rs+'\\b','i').test(content));
 const report=parseExerciseReport(content);
 const message=found.length?`参考マーカー ${found.map(([name,meta])=>name+' '+meta.rs).join('、')} を確認しました。遺伝子型は自動変更せず、負荷や回復日数の自動変更は行いません。`:report.matched?`${report.matched}遺伝子の明示的な検査結果文を確認しました。自動変更は行いません。`:'対応マーカー・明示的な結果文は見つかりませんでした。形式を確認してください。';
 return {matchedMarkers:found.map(x=>x[0]),count:found.length,message,report};
}
