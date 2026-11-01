import {normalizeState,emptyState} from './engine.js';

// No account, remote API, analytics, or automatic cloud sync: every browser origin stores its own data.
const DB='muscle-atlas-pro',OBJECT='appdata',KEY='state';
const FALLBACK='muscle-atlas-pro-v2-fallback',OLD='muscle-atlas-2026-v1';
let db=null,mode='indexeddb';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(OBJECT))r.result.createObjectStore(OBJECT)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('IndexedDBを開けません'));r.onblocked=()=>reject(new Error('保存領域が他のタブで使用されています'))});}
function get(){return new Promise((resolve,reject)=>{const tx=db.transaction(OBJECT,'readonly');const r=tx.objectStore(OBJECT).get(KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('読み込みに失敗'))});}
function set(data){return new Promise((resolve,reject)=>{const tx=db.transaction(OBJECT,'readwrite');tx.objectStore(OBJECT).put(data,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('書き込み失敗'));tx.onabort=()=>reject(tx.error||new Error('書き込み中断'))});}
function readLocal(key){try{const value=localStorage.getItem(key);return value?JSON.parse(value):null}catch{return null}}
function removeLocal(key){try{localStorage.removeItem(key)}catch{}}
export async function loadStore(){
 let state;
 try{db=await openDB();mode='indexeddb';state=await get()}
 catch(e){db=null;mode='localStorage (fallback)';state=readLocal(FALLBACK)}
 if(!state){
  // When IndexedDB becomes available again, restore previous per-device fallback data before legacy data.
  const legacy=readLocal(FALLBACK)||readLocal(OLD);
  try{state=legacy&&Array.isArray(legacy.logs)?normalizeState(legacy):emptyState()}
  catch{state=emptyState()}
  await saveStore(state);
 }
 return {state:normalizeState(state),mode};
}
export async function saveStore(input){
 const state=normalizeState(input);state.updatedAt=new Date().toISOString();
 if(mode==='indexeddb'&&db){await set(state);removeLocal(FALLBACK)}
 else{localStorage.setItem(FALLBACK,JSON.stringify(state))}
 return state;
}
export const storageMode=()=>mode;
export async function clearStore(){
 const state=emptyState();await saveStore(state);
 // Clear both historical stores: otherwise a later fallback could resurrect erased personal data.
 removeLocal(OLD);removeLocal(FALLBACK);
 return state;
}
