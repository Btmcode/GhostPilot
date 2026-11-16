import { chromium } from 'playwright';
import http from 'http';

// sahte LLM: plan + adım yanıtları
let calls = 0;
const llm = http.createServer((req,res)=>{
  let body=''; req.on('data',c=>body+=c); req.on('end',()=>{
    calls++;
    let content;
    if (body.includes('kıdemli bir proje yöneticisisin')) {
      // PLAN isteği
      content = JSON.stringify({
        title:"GitHub profili düzenle",
        metric:"Profil alanları dolduruldu",
        steps:[
          {id:1,title:"Profile git",detail:"github.com/settings/profile aç",done:"profil"},
          {id:2,title:"Bio yaz",detail:"Biyografi alanını doldur",done:"bio"}
        ]
      });
    } else {
      // AJAN adımı
      content = JSON.stringify({ thought:"Sayfa hazır", action:"done", summary:"Adım tamamlandı." });
    }
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({id:"x",object:"chat.completion",model:"t",
      choices:[{index:0,message:{role:"assistant",content},finish_reason:"stop"}],
      usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));
  });
});
await new Promise(r=>llm.listen(8900,'127.0.0.1',r));

// basit test sitesi
const site = http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end('<html><body><h1>Test</h1><p>profil bio</p></body></html>');});
await new Promise(r=>site.listen(8899,'127.0.0.1',r));

const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/profileM',{headless:false,args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
const extId = sw.url().split('/')[2];

await sw.evaluate(async ()=>{
  await chrome.storage.local.set({
    activeProvider:'custom', aiProvider:'custom',
    aiBaseUrl:'http://127.0.0.1:8900/v1', aiApiKey:'k', aiModel:'m',
    aiUseVision:false, maxAgentSteps:3, inputEngine:'synthetic',
    taskMode:'reuse_tab', confirmBeforeStart:false, accessMode:'open', showGhostCursor:false,
    keyStore:{custom:{apiKey:'k',baseUrl:'http://127.0.0.1:8900/v1',model:'m'}}
  });
});

const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8899/');
await page.waitForTimeout(1000);

const panel = await ctx.newPage();
const errors=[];
panel.on('pageerror', e=>errors.push(e.message));
await panel.goto(`chrome-extension://${extId}/panel.html`);
await panel.waitForTimeout(1200);

console.log('═══ MİSYON TESTİ ═══');
// 1) MISSION_START
const start = await panel.evaluate(async () => new Promise(r=>
  chrome.runtime.sendMessage({type:'MISSION_START', objective:'GitHub profilimi düzenle', opts:{autoContinue:false}}, x=>r(chrome.runtime.lastError?{ok:false,error:chrome.runtime.lastError.message}:x))));
console.log('MISSION_START →', start.ok ? `✅ ok (${start.mission?.steps?.length} adım)` : `❌ ${start.error}`);

// 2) 3 saniye sonra MISSION_GET — "Misyon yok" hatası olmamalı
await new Promise(r=>setTimeout(r,3000));
const get = await panel.evaluate(async () => new Promise(r=>
  chrome.runtime.sendMessage({type:'MISSION_GET'}, x=>r(chrome.runtime.lastError?{ok:false,error:chrome.runtime.lastError.message}:x))));
console.log('MISSION_GET  →', get.ok ? `✅ ok — başlık: "${get.mission?.title}", durum: ${get.mission?.status}` : `❌ ${get.error}`);

// 3) günlükte "Misyon yok" var mı?
const logText = await panel.evaluate(()=>document.querySelector('#logBox')?.innerText || '');
const hasError = /Misyon yok/i.test(logText);
console.log(hasError ? '❌ GÜNLÜKTE "Misyon yok" HATASI VAR' : '✅ Günlükte "Misyon yok" hatası YOK');
console.log('\n── Panel günlüğü ──');
console.log(logText.split('\n').slice(0,10).join('\n'));

// 4) github.com/settings uyarısı
const warn = await sw.evaluate(async ()=>{
  const tabs = await chrome.tabs.query({});
  return 'kontrol';
});
console.log('\n═══ SONUÇ ═══');
console.log(start.ok && get.ok && !hasError ? '✅ MİSYON AKIŞI ÇALIŞIYOR' : '❌ SORUN VAR');
await ctx.close(); llm.close(); site.close();
