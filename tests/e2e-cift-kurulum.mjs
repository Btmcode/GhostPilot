import { chromium } from 'playwright';
import http from 'http';
const llm = http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  const c = b.includes('proje yöneticisisin')
    ? JSON.stringify({title:"Profil",metric:"profil",steps:[{id:1,title:"Profile git",detail:"github.com/settings/profile",done:"profil"}]})
    : JSON.stringify({thought:"ok",action:"done",summary:"bitti"});
  r.writeHead(200,{'Content-Type':'application/json'});
  r.end(JSON.stringify({id:"x",object:"chat.completion",model:"t",choices:[{index:0,message:{role:"assistant",content:c},finish_reason:"stop"}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));
});});
await new Promise(r=>llm.listen(8900,'127.0.0.1',r));

const A='/home/user/ghostpilot/extension-chromium', B='/tmp/e2e/ext2';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/pV',{headless:false,
  args:[`--disable-extensions-except=${A},${B}`,`--load-extension=${A},${B}`,'--no-sandbox']});
await new Promise(r=>setTimeout(r,2500));
const sws = ctx.serviceWorkers(); const ids = sws.map(s=>s.url().split('/')[2]);
const A_sw = sws.find(s=>s.url().includes(ids[0]));

// aktif sekme = DİĞER kopyanın donate.html (kullanıcının şikayeti)
const foreign = await ctx.newPage();
await foreign.goto(`chrome-extension://${ids[1]}/donate.html`);
await foreign.bringToFront();
await new Promise(r=>setTimeout(r,800));

await A_sw.evaluate(async()=>{await chrome.storage.local.set({activeProvider:'custom',aiBaseUrl:'http://127.0.0.1:8900/v1',aiApiKey:'k',aiModel:'m',
  maxAgentSteps:2,inputEngine:'synthetic',taskMode:'reuse_tab',confirmBeforeStart:false,accessMode:'open',showGhostCursor:false,
  keyStore:{custom:{apiKey:'k',baseUrl:'http://127.0.0.1:8900/v1',model:'m'}}});});

const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${ids[0]}/panel.html`);
await panel.waitForTimeout(900);
await panel.evaluate(()=>new Promise(r=>chrome.runtime.sendMessage({type:'MISSION_START',objective:'GitHub profilimi düzenle https://github.com/settings/profile',opts:{autoContinue:false}},x=>r(x))));
await new Promise(r=>setTimeout(r,7000));

// SW'den TAM log + seçilen sekme
const st = await A_sw.evaluate(async (extIds)=>{
  const logs = (typeof agentState !== 'undefined' && agentState.logs) ? agentState.logs : [];
  const tabs = await chrome.tabs.query({});
  return {
    logSayisi: logs.length,
    tumLoglar: logs.map(l=>`[${l.level}] ${l.message}`),
    acikSekmeler: tabs.map(t=>t.url?.slice(0,58))
  };
}, ids);
console.log('log kaydı:', st.logSayisi);
console.log('\n--- TAM LOG (ilk 20) ---');
console.log(st.tumLoglar.join('\n'));
console.log('\n--- açık sekmeler ---');
console.log(st.acikSekmeler.join('\n'));
const joined = st.tumLoglar.join('\n');
console.log('\n═══ SONUÇ ═══');
console.log(/different extension/i.test(joined) ? '❌ farklı eklenti hatası VAR' : '✅ farklı eklenti hatası YOK');
console.log(/kurulu görünüyor|Çift kurulum/i.test(joined) ? '✅ çift kurulum uyarısı verildi' : '⚠ uyarı yok');
console.log(/Görev penceresi otomatik|Kullanılabilir sekme seçildi/i.test(joined) ? '✅ kurtarma çalıştı' : '⚠ kurtarma yok');
await ctx.close(); llm.close();
