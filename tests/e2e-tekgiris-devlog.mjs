import { chromium } from 'playwright';
import http from 'http';
const EXT='/home/user/ghostpilot/extension-chromium';
const site = http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end('<h1>test</h1>');});
await new Promise(r=>site.listen('8899','127.0.0.1',r));
const llm = http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  const c = b.includes('proje yöneticisisin')
    ? JSON.stringify({title:"Test misyonu",metric:"bitti",steps:[{id:1,title:"Adım 1",detail:"x",done:"y"},{id:2,title:"Adım 2",detail:"x",done:"y"}]})
    : JSON.stringify({thought:"ok",action:"done",summary:"bitti"});
  r.writeHead(200,{'Content-Type':'application/json'});
  r.end(JSON.stringify({id:"x",object:"chat.completion",model:"t",choices:[{index:0,message:{role:"assistant",content:c},finish_reason:"stop"}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));
});});
await new Promise(r=>llm.listen('8900','127.0.0.1',r));
const ctx = await chromium.launchPersistentContext('/tmp/e2e/p180',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
const p = await ctx.newPage();
await p.goto(`chrome-extension://${id}/panel.html`);
await p.waitForTimeout(1300);

console.log('═══ 1) TEK GİRİŞ NOKTASI ═══');
const giris = await p.evaluate(()=>({
  h2s: [...document.querySelectorAll('#tab-work h2, #tab-work .card-title h2')].map(x=>x.textContent.trim()),
  runmode: [...document.querySelectorAll('#runModeSelector .runmode-btn')].map(b=>b.dataset.run),
  missionCardVar: !!document.querySelector('#missionCard'),
  missionBoard: !!document.querySelector('#missionBoard'),
  startBtn: !!document.querySelector('#btnStartAgent'),
  missionBtn: !!document.querySelector('#btnMissionStart'),
  missionBtnVisible: document.querySelector('#btnMissionStart') ? getComputedStyle(document.querySelector('#btnMissionStart')).display : null
}));
console.log('  "Ne yapmasını" kartı:', giris.h2s);
console.log('  çalışma biçimi seçenekleri:', giris.runmode);
console.log('  eski misyon kartı:', giris.missionCardVar?'❌ hâlâ var':'✅ kaldırıldı');
console.log('  tek başlat butonu (tek görev):', giris.startBtn?'✅':'❌', '| misyon butonu gizli:', giris.missionBtnVisible==='none'?'✅':'❌');

// misyon moduna geç
await p.evaluate(()=>document.querySelector('[data-run="mission"]').click());
await p.waitForTimeout(400);
const m2 = await p.evaluate(()=>({
  start: getComputedStyle(document.querySelector('#btnStartAgent')).display,
  mission: getComputedStyle(document.querySelector('#btnMissionStart')).display,
  opts: getComputedStyle(document.querySelector('#missionOpts')).display
}));
console.log('  misyon seçilince → tek buton:', m2.start, '| misyon butonu:', m2.mission, '| seçenekler:', m2.opts);

console.log('\n═══ 2) SEKME MODU KALICI ═══');
const tm0 = await p.evaluate(()=>new Promise(r=>chrome.storage.local.get(['taskMode'],x=>r(x.taskMode))));
console.log('  kayıtlı başlangıç modu:', tm0);
await p.evaluate(()=>document.querySelector('[data-mode="reuse_tab"]').click());
await p.waitForTimeout(400);
const tm1 = await p.evaluate(()=>new Promise(r=>chrome.storage.local.get(['taskMode'],x=>r(x.taskMode))));
console.log('  "Mevcut sekme" seçildi → storage:', tm1, tm1==='reuse_tab'?'✅':'❌');

console.log('\n═══ 3) MİSYON taskMode AKTARIMI ═══');
await sw.evaluate(async()=>{
  await chrome.storage.local.set({activeProvider:'custom',aiBaseUrl:'http://127.0.0.1:8900/v1',aiApiKey:'k',aiModel:'m',
    keyStore:{custom:{apiKey:'k',baseUrl:'http://127.0.0.1:8900/v1',model:'m'}}});
});
const ms = await sw.evaluate(async ()=> {
  const m = await missionStart('test hedef', {taskMode:'reuse_tab', autoContinue:false});
  return {taskMode: m.taskMode, steps: m.steps.length};
});
console.log('  misyon.taskMode:', ms.taskMode, ms.taskMode==='reuse_tab'?'✅':'❌');

console.log('\n═══ 4) ADIM SINIRI (sonsuz döngü) ═══');
const loop = await sw.evaluate(async ()=>{
  const m = await missionLoad();
  if (!m) return 'misyon yok';
  m.steps.forEach(s=>{s.status='failed';});
  m.steps.push({id:99,title:'sonsuz test',detail:'',done:'',status:'todo',attempts:3,notes:[]});
  await missionSave(m);
  const t0=Date.now();
  for(let i=0;i<5;i++){ try{ await missionRunNext(); }catch(e){} }
  const m2 = await missionLoad();
  const s99 = m2.steps.find(x=>x.id===99);
  return {deneme:s99?.attempts, durum:s99?.status, misyonDurum:m2.status};
});
console.log('  5 çağrı sonrası adım denemesi:', loop.deneme, '| durum:', loop.durum, '| misyon:', loop.misyonDurum);
console.log('  ' + (loop.deneme<=4 && loop.durum!=='todo' ? '✅ sınır çalışıyor' : '❌ sınırsız'));

console.log('\n═══ 5) DEVLOG SEKMESİ ═══');
// hata üret
await sw.evaluate(async()=>{
  pushLog('error','Hata: Cannot access a chrome-extension:// URL of different extension');
  pushLog('warn','Masaüstü köprüsü token tanımlı değil');
  pushLog('error','429 kota aşıldı — sağlayıcı değiştirildi');
});
await p.evaluate(()=>document.querySelector('#tabDevlogBtn').click());
await p.waitForTimeout(900);
const dl = await p.evaluate(()=>({
  tab: !!document.querySelector('#tab-devlog'),
  active: document.querySelector('#tab-devlog')?.classList.contains('active'),
  lines: document.querySelectorAll('#devlogBox .log-line').length,
  cats: [...document.querySelectorAll('#devlogBox .dl-cat')].map(x=>x.textContent),
  badge: document.querySelector('#devlogCount')?.textContent,
  stats: [...document.querySelectorAll('.dl-stat b')].map(x=>x.textContent)
}));
console.log('  DevLog sekmesi:', dl.tab?'✅':'❌', '| aktif:', dl.active?'✅':'❌');
console.log('  kayıt:', dl.lines, '| kategoriler:', [...new Set(dl.cats)].join(', '));
console.log('  sekme rozeti:', dl.badge, '| özet:', dl.stats.join(' / '));
await p.screenshot({path:'/tmp/e2e/devlog180.png'});

// filtre
await p.evaluate(()=>document.querySelector('[data-cat="eklenti"]').click());
await p.waitForTimeout(400);
const f1 = await p.evaluate(()=>document.querySelectorAll('#devlogBox .log-line').length);
console.log('  "eklenti" filtresi:', f1, 'kayıt', f1>0?'✅':'❌');

// kalıcılık
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelector('#tabDevlogBtn').click());
await p.waitForTimeout(900);
const persist = await p.evaluate(()=>document.querySelectorAll('#devlogBox .log-line').length);
console.log('  sayfa yenilendikten sonra:', persist, persist>0?'✅ kalıcı':'❌ kayboldu');
await ctx.close(); site.close(); llm.close();
