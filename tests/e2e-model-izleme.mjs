import { chromium } from 'playwright';
import http from 'http';

const seen = [];
const llm = http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  const m = b.match(/"model"\s*:\s*"([^"]+)"/);
  if (m) seen.push(m[1]);
  const c = b.includes('proje yöneticisisin')
    ? JSON.stringify({title:"Profil",metric:"profil",steps:[{id:1,title:"Bio yaz",detail:"bio alanı",done:"bio"}]})
    : JSON.stringify({thought:"ok",action:"done",summary:"bitti"});
  r.writeHead(200,{'Content-Type':'application/json'});
  r.end(JSON.stringify({id:"x",object:"chat.completion",model:"t",choices:[{index:0,message:{role:"assistant",content:c},finish_reason:"stop"}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));
});});
await new Promise(r=>llm.listen(8900,'127.0.0.1',r));

const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/p170',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];

await sw.evaluate(async()=>{await chrome.storage.local.set({activeProvider:'custom',aiBaseUrl:'http://127.0.0.1:8900/v1',aiApiKey:'k',aiModel:'model-A',
  maxAgentSteps:1,inputEngine:'synthetic',taskMode:'reuse_tab',confirmBeforeStart:false,accessMode:'open',showGhostCursor:true,
  keyStore:{custom:{apiKey:'k',baseUrl:'http://127.0.0.1:8900/v1',model:'model-A'}}});});

const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${id}/panel.html`);
await panel.waitForTimeout(1200);

console.log('═══ 1) MODEL SEÇİMİ ═══');
const m0 = await panel.evaluate(()=>new Promise(r=>chrome.runtime.sendMessage({type:'GET_MODEL'},x=>r(x))));
console.log('  başlangıç modeli:', m0.result?.model);

// model değiştir
const set = await panel.evaluate(()=>new Promise(r=>chrome.runtime.sendMessage(
  {type:'SET_MODEL',provider:'custom',model:'model-B'},x=>r(x))));
console.log('  SET_MODEL →', set.ok ? '✅ '+set.result.model : '❌ '+set.error);

const m1 = await panel.evaluate(()=>new Promise(r=>chrome.runtime.sendMessage({type:'GET_MODEL'},x=>r(x))));
console.log('  sonra model:', m1.result?.model, m1.result?.model==='model-B' ? '✅ değişti' : '❌ değişmedi');

// kalıcılık: storage'da mı?
const stored = await sw.evaluate(async()=>{const c=await chrome.storage.local.get(null);return {aiModel:c.aiModel, ks:c.keyStore?.custom?.model};});
console.log('  storage → aiModel:', stored.aiModel, '| keyStore:', stored.ks,
  (stored.aiModel==='model-B'&&stored.ks==='model-B') ? '✅ kalıcı' : '❌ kalıcı değil');

// gerçek LLM isteğinde hangi model kullanılıyor?
seen.length=0;
await panel.evaluate(()=>new Promise(r=>chrome.runtime.sendMessage({type:'TEST_AI_CONNECTION'},x=>r(x))));
await new Promise(r=>setTimeout(r,1500));
console.log('  LLM isteğinde kullanılan model:', seen.join(', '), seen.includes('model-B')?'✅':'❌');

console.log('\n═══ 2) PROFESYONEL ARAYÜZ ═══');
const ui = await panel.evaluate(()=>({
  livebar: !!document.querySelector('#livebar'),
  liveCss: getComputedStyle(document.querySelector('#livebar')).borderLeftColor,
  badge: !!document.querySelector('#modelActiveBadge'),
  badgeText: document.querySelector('#modelActiveBadge')?.textContent,
  scrollbar: !!document.head.querySelector('style'),
  radius: getComputedStyle(document.documentElement).getPropertyValue('--r-md').trim()
}));
console.log('  canlı izleme şeridi:', ui.livebar?'✅ var':'❌ yok');
console.log('  model rozeti:', ui.badge?`✅ "${ui.badgeText}"`:'❌ yok');
console.log('  tasarım tokenları --r-md:', ui.radius||'(yok)');

console.log('\n═══ 3) CANLI FARE İZLEME ═══');
const site = http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
r.end('<h1>Test</h1><button id="b" style="padding:20px 40px">Kaydet</button>');});
await new Promise(r=>site.listen(8899,'127.0.0.1',r));
const pg = await ctx.newPage(); await pg.goto('http://127.0.0.1:8899/');
await pg.waitForTimeout(900);

// ajan tıklama simülasyonu: cursor_preview + click
const ov = await sw.evaluate(async()=>{
  const tabs = await chrome.tabs.query({});
  const t = tabs.find(x=>x.url&&x.url.includes('8899'));
  const snap = await chrome.tabs.sendMessage(t.id,{__target:'ghostpilot_content',type:'SNAPSHOT',maxItems:50});
  const btn = (snap.snapshot.elements||[]).find(e=>e.label&&/kaydet/i.test(e.label));
  const r1 = await chrome.tabs.sendMessage(t.id,{__target:'ghostpilot_content',type:'SYNTHETIC_ACTION',
    payload:{action:'cursor_preview', refId:btn?.id, pulse:true, label:'HEDEF', overlay:true, busy:true}});
  return {btn:btn?.label, preview:r1};
});
await pg.waitForTimeout(400);
console.log('  hedef öğe:', ov.btn||'(bulunamadı)', '| preview:', JSON.stringify(ov.preview).slice(0,80));

// overlay DOM'da var mı + hedef halkası görünür mü?
const vis = await pg.evaluate(()=>{
  const host = document.getElementById('__gp_shadow_host__');
  if (!host) return {host:false};
  const sr = host.shadowRoot; // closed → null
  return {host:true, closed: sr===null};
});
console.log('  overlay host:', vis.host?'✅ DOM\'da':'❌ yok');
// görsel kanıt: ekran görüntüsü
await pg.screenshot({path:'/tmp/e2e/live-cursor.png'});
console.log('  📸 ekran görüntüsü: live-cursor.png');

await ctx.close(); llm.close(); site.close();
