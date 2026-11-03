/* Muscle Atlas Pro startup safety net: never erase user data during cache recovery. */
(function(){
  'use strict';
  var ready=false, timer=null;
  function el(id){return document.getElementById(id);}
  function show(message){
    if(ready)return;
    var panel=el('startup-notice'),msg=el('startup-message'),title=el('startup-title'),help=el('startup-help'),reload=el('startup-reload');
    if(!panel)return;
    panel.hidden=false;
    title.textContent='アプリを起動できませんでした';
    msg.textContent=message||'アプリの読み込みに失敗しました。';
    help.hidden=false;reload.hidden=false;var repair=el('startup-repair');if(repair)repair.hidden=false;
    panel.setAttribute('role','alert');
  }
  window.MA_BOOT_OK=function(){ready=true;if(timer)clearTimeout(timer);var panel=el('startup-notice');if(panel)panel.hidden=true;};
  window.MA_BOOT_FAIL=function(err){show('起動時エラー：'+String(err&&err.message||err||'不明なエラー'));};
  window.addEventListener('error',function(event){
    if(ready)return;
    if(event.target&&event.target!==window&&event.target.tagName==='SCRIPT'){
      show('JavaScriptの読み込みに失敗しました。古いキャッシュや配布ファイルの不足が考えられます。');
    }else if(event.error){show('アプリの実行中にエラーが発生しました：'+String(event.error.message||event.error));}
  },true);
  window.addEventListener('unhandledrejection',function(event){if(!ready)show('起動処理に失敗しました：'+String(event.reason&&event.reason.message||event.reason||'不明'));});
  var reload=el('startup-reload');if(reload)reload.addEventListener('click',function(){location.reload();});
  var repair=el('startup-repair');
  if(repair)repair.addEventListener('click',async function(){
    repair.disabled=true;
    var msg=el('startup-message');if(msg)msg.textContent='古いアプリキャッシュを修復しています（記録データは変更しません）…';
    try{
      if('serviceWorker' in navigator){
        var reg=await navigator.serviceWorker.getRegistration();
        if(reg)await reg.unregister();
      }
      if('caches' in window){
        var keys=await caches.keys();
        await Promise.all(keys.filter(function(key){return key.indexOf('muscle-atlas-pro-')===0;}).map(function(key){return caches.delete(key);}));
      }
      // A query parameter bypasses cached navigation without changing the origin of IndexedDB data.
      var url=new URL(location.href);url.searchParams.set('app-repair','3.6.5');
      location.replace(url.href);
    }catch(err){
      repair.disabled=false;
      if(msg)msg.textContent='キャッシュの修復に失敗しました：'+String(err&&err.message||err)+ '。Safariで再読み込みしてください。';
    }
  });
  timer=setTimeout(function(){if(!ready)show('アプリの読み込みが完了しません。最新版の全ファイルが公開されているか、キャッシュの状態を確認してください。');},7000);
  // A browser can keep old service workers alive after site updates. Request an update, without touching IndexedDB.
  if('serviceWorker' in navigator&&location.protocol==='https:'){
    navigator.serviceWorker.getRegistration().then(function(reg){if(reg)reg.update().catch(function(){});}).catch(function(){});
  }
})();
