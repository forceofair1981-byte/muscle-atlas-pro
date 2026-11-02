/* Muscle Atlas Pro v3.6.3 — avoid ever returning HTML for JavaScript or CSS requests. */
const CACHE='muscle-atlas-pro-v3-6-3';
const PREFIX='muscle-atlas-pro-';
const ASSETS=['./','./index.html','./styles.css','./boot.js','./dna.js','./personal_food.js','./app.js','./engine.js','./evaluation.js','./forecast.js','./wellness.js','./food_catalog.js','./food_extra.js','./presets.js','./recommend.js','./catalog.js','./anatomy.js','./detail.js','./tomorrow.js','./meal_history.js','./db.js','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-512.png','./privacy.html'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Do not reject the entire installation because one optional icon or page is missing.
  await Promise.allSettled(ASSETS.map(async path=>{
    try{const req=new Request(new URL(path,self.registration.scope),{cache:'reload'});
      const res=await fetch(req);if(res.ok)await cache.put(req,res);
    }catch(_error){}
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      // Bypass stale HTTP caches for core files after deploying a new version.
      const response=await fetch(req,{cache:'no-store'});
      // Misconfigured static hosting may send index.html as a 200 response for missing JS.
      const kind=url.pathname.toLowerCase(),mime=(response.headers.get('content-type')||'').toLowerCase();
      if((kind.endsWith('.js')||kind.endsWith('.css'))&&mime.includes('text/html')){
        return new Response('アプリのJavaScript/CSSの代わりにHTMLが返されました。全ファイルが公開されているか確認してください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
      }
      if(response.ok){cache.put(req,response.clone()).catch(()=>{});return response;}
      // Never replace a 404 for JS with index.html; a typed failure helps diagnosis.
      return response;
    }catch(error){
      const cached=await cache.match(req,{ignoreSearch:true});
      if(cached){
        const mime=(cached.headers.get('content-type')||'').toLowerCase();
        if(!((url.pathname.endsWith('.js')||url.pathname.endsWith('.css'))&&mime.includes('text/html')))return cached;
      }
      if(req.mode==='navigate'){
        const html=await cache.match(new URL('./index.html',self.registration.scope));
        if(html)return html;
        return new Response('<!doctype html><meta charset="utf-8"><title>オフライン</title><h1>オフラインで起動できません</h1><p>通信が回復したら再読み込みしてください。保存済みのデータは消さないでください。</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
      // Explicit 503 for missing modules: never serve HTML to JS/CSS.
      return new Response('オフラインのためこのファイルを読み込めません。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
    }
  })());
});
