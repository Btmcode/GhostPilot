import { chromium } from 'playwright';
import http from 'http';

// ---- 1) TEST SAYFASI ----
const server = http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Ajan Testi</title></head><body>
  <h1 id="baslik">Sayaç: <span id="sayac">0</span></h1>
  <button id="arttir" onclick="const s=document.getElementById('sayac');s.textContent=(+s.textContent+1);document.getElementById('sonuc').textContent='BASARILI: '+s.textContent">Arttır</button>
  <div id="sonuc">bekliyor</div>
  </body></html>`);});
await new Promise(r=>server.listen(8899,'127.0.0.1',r));

// ---- 2) SAHTE LLM SUNUCUSU (OpenAI uyumlu) ----
let calls = 0;
const llm = http.createServer((req,res)=>{
  let body='';
  req.on('data',c=>body+=c);
  req.on('end',()=>{
    calls++;
    const prompt = body;
    let decision;
    if (calls === 1) {
      // İlk adım: butona tıkla
      const m = prompt.match(/"id":(\d+),"tag":"button"/) || prompt.match(/"id":(\d+)[^}]*button/);
      const refId = m ? Number(m[1]) : 1;
      decision = { thought:"Arttır düğmesine tıklıyorum", action:"click", refId };
    } else {
      decision = { thought:"Sayaç arttı, görev tamam", action:"done", summary:"Sayfadaki Arttır düğmesine tıklandı ve sayaç 1 oldu." };
    }
    const out = { id:"x", object:"chat.completion", model:"test",
      choices:[{ index:0, message:{ role:"assistant", content: JSON.stringify(decision) }, finish_reason:"stop" }],
      usage:{ prompt_tokens:10, completion_tokens:10, total_tokens:20 } };
    res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
    res.end(JSON.stringify(out));
    console.log(`  [LLM] çağrı #${calls} → ${decision.action}${decision.refId?' ref='+decision.refId:''}`);
  });
});
await new Promise(r=>llm.listen(8900,'127.0.0.1',r));

// ---- 3) TARAYICI ----
const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/profile4',{
  headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
sw.on('console', m => console.log('  [SW]', m.type(), m.text().slice(0,300)));
const extId = sw.url().split('/')[2];
console.log('Eklenti:', extId);

// ---- 4) LLM ayarını enjekte et ----
await sw.evaluate(async () => {
  const cfg = {
    activeProvider:'custom',
    aiProvider:'custom',
    aiBaseUrl:'http://127.0.0.1:8900/v1',
    aiApiKey:'test-key-123',
    aiModel:'test-model',
    aiUseVision:false,
    maxAgentSteps:5,
    inputEngine:'synthetic',
    taskMode:'reuse_tab',
    confirmBeforeStart:false,
    accessMode:'open',
    showGhostCursor:false,
    keyStore:{ custom:{ apiKey:'test-key-123', baseUrl:'http://127.0.0.1:8900/v1', model:'test-model' } }
  };
  await chrome.storage.local.set(cfg);
});
console.log('✓ LLM ayarı: custom → http://127.0.0.1:8900/v1');

// ---- 5) Hedef sayfayı aç ----
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8899/');
await page.waitForTimeout(1200);
const tabId = await sw.evaluate(async () => {
  const tabs = await chrome.tabs.query({});
  return tabs.find(t=>t.url&&t.url.includes('8899'))?.id;
});
console.log('Hedef sekme:', tabId);

// ---- 6) AJANI BAŞLAT ----
console.log('\n═══ GERÇEK AJAN DÖNGÜSÜ ═══');
// panel açıp oradan gönder (sendMessage service worker'a kendine gitmez)
const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${extId}/panel.html`);
await panel.waitForTimeout(800);
const start = await panel.evaluate(async (tabId) => {
  return await new Promise(r => chrome.runtime.sendMessage({ type:'START_AGENT', goal:'Arttır düğmesine tıkla ve sayacı arttır', tabId, confirmed:true }, resp => r(chrome.runtime.lastError ? {ok:false, error:chrome.runtime.lastError.message} : resp)));
}, tabId);
console.log('START_AGENT →', JSON.stringify(start).slice(0,150));

// ---- 7) Sonucu bekle ----
for (let i=0;i<30;i++){
  await page.waitForTimeout(1000);
  const st = await sw.evaluate(async ()=>(await chrome.storage.local.get('agentMemory')));
  const sonuc = await page.textContent('#sonuc');
  const sayac = await page.textContent('#sayac');
  const panelLogs = await panel.evaluate(()=>{
    const b=document.querySelector('#logBox');
    return b ? b.innerText.replace(/\n/g,' | ').slice(0,400) : 'yok';
  });
  if (i%2===0) console.log(`  ${i+1}s · sayaç=${sayac} · sonuç="${sonuc}"\n       günlük: ${panelLogs}`);
  if (sonuc.includes('BASARILI')) break;
}

// ---- 8) Doğrulama ----
const finalSonuc = await page.textContent('#sonuc');
const finalSayac = await page.textContent('#sayac');
console.log('\n═══ SONUÇ ═══');
console.log(`  Sayaç: ${finalSayac}`);
console.log(`  Sonuç metni: "${finalSonuc}"`);
console.log(`  LLM çağrı sayısı: ${calls}`);
const clicked = finalSonuc.includes('BASARILI');
console.log(`  ${clicked?'✅':'❌'} Ajan gerçekten tıkladı ve sayfa değişti`);

const mem = await sw.evaluate(async ()=>(await chrome.storage.local.get('gp_journal')).gp_journal);
console.log(`  ${mem?'✅':'❌'} Görev hafızası diske kaydedildi`);
if (mem) console.log('  hafıza:', JSON.stringify(mem).slice(0,220));

const st = await sw.evaluate(async ()=> {
  const r = await chrome.storage.local.get(null);
  return Object.keys(r);
});
console.log('  agentState:', JSON.stringify(st).slice(0,600));
const logs = await panel.evaluate(()=>document.querySelector('#logBox')?.children.length || 0);
console.log(`  Panel günlük satırı: ${logs}`);

await page.screenshot({path:'/tmp/e2e/agent-result.png'});
await ctx.close(); server.close(); llm.close();
process.exitCode = clicked ? 0 : 1;
