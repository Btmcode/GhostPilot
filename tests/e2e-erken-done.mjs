import { chromium } from 'playwright';
import http from 'http';
const EXT='/home/user/ghostpilot/extension-chromium';

// LLM: ilk çağrıda (planlama sonrası) hemen "done" diyor — erken done senaryosu
let callN = 0;
const llm = http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  callN++;
  let c;
  if (b.includes('proje yöneticisisin')) {
    c = JSON.stringify({title:"GitHub profili düzenle",metric:"bio güncellendi",
      steps:[{id:1,title:"Bio alanını doldur",detail:"Profil bio alanına profesyonel metin yaz",done:"bio güncellendi"}]});
  } else if (callN <= 2) {
    // İlk ajan çağrısı: hiçbir şey yapmadan done (kötü davranış)
    c = JSON.stringify({thought:"Sayfa zaten açık",action:"done",summary:"Hedef URL zaten açık, profil sayfasındayız."});
  } else {
    // Sonraki: gerçekten bir şey yap
    c = JSON.stringify({thought:"Bio alanına yazıyorum",action:"click",refId:1});
  }
  r.writeHead(200,{'Content-Type':'application/json'});
  r.end(JSON.stringify({id:"x",object:"chat.completion",model:"t",choices:[{index:0,message:{role:"assistant",content:c},finish_reason:"stop"}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));
});});
await new Promise(r=>llm.listen('8900','127.0.0.1',r));
const site = http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end('<h1>profil</h1><input id="b"><button>Kaydet</button>');});
await new Promise(r=>site.listen('8899','127.0.0.1',r));

const ctx = await chromium.launchPersistentContext('/tmp/e2e/p182',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
await sw.evaluate(async()=>{
  await chrome.storage.local.set({activeProvider:'custom',aiBaseUrl:'http://127.0.0.1:8900/v1',aiApiKey:'k',aiModel:'m',
    taskMode:'reuse_tab',maxAgentSteps:3,inputEngine:'synthetic',confirmBeforeStart:false,accessMode:'open',showGhostCursor:false,
    keyStore:{custom:{apiKey:'k',baseUrl:'http://127.0.0.1:8900/v1',model:'m'}}});
});
const site1 = await ctx.newPage(); await site1.goto('http://127.0.0.1:8899/');
await site1.waitForTimeout(800);

console.log('═══ 1) ERKEN DONE REDDEDİLİYOR MU? ═══');
const r1 = await sw.evaluate(async()=>{
  const before = agentState.logs.length;
  try {
    await runAutonomousTask('profilimi incele profesyonel şekilde düzenle', null, {taskMode:'reuse_tab'});
  } catch(e){ return {err:e.message}; }
  await new Promise(r=>setTimeout(r,500));
  const logs = agentState.logs.slice(before).map(l=>l.message);
  return {logs, rejected: logs.some(l=>/hiçbir işlem yapmadan "done" dedi/.test(l)), hist:(agentState.journal?.history||[]).length};
});
console.log('  reddedildi mi:', r1.rejected ? '✅ evet' : '❌ hayır — ajan hemen bitti');
console.log('  olay:', (r1.logs||[]).filter(l=>/redded|kabul|Tamamlandı/i.test(l)).slice(0,3).join(' | ').slice(0,160));

console.log('\n═══ 2) MİSYON TAMAMLANDI TEK KEZ Mİ? ═══');
const r2 = await sw.evaluate(async()=>{
  await missionClear();
  missionDoneLogged = {};
  const m = await missionStart('test misyon', {taskMode:'reuse_tab', autoContinue:true});
  await new Promise(r=>setTimeout(r,4000));
  // eşzamanlı 5 çağrı (asıl hata buydu)
  const before = agentState.logs.length;
  await Promise.all([1,2,3,4,5].map(()=>missionRunNext().catch(()=>{})));
  await new Promise(r=>setTimeout(r,600));
  const logs = agentState.logs.slice(before).map(l=>l.message);
  const doneCount = logs.filter(l=>/Misyon tamamlandı/i.test(l)).length;
  const mm = await missionLoad();
  return {doneCount, status: mm?.status, busy: missionBusy};
});
console.log('  5 eşzamanlı çağrı → "tamamlandı" log sayısı:', r2.doneCount, r2.doneCount<=1?'✅':'❌ hâlâ tekrarlıyor');
console.log('  misyon durumu:', r2.status, '| kilit serbest:', r2.busy===false?'✅':'❌');

console.log('\n═══ 3) ALARM TEMİZLENİYOR MU? ═══');
const r3 = await sw.evaluate(async()=>{
  const m = await missionLoad();
  if (m) { m.status='done'; await missionSave(m); }
  const a = await chrome.alarms.get('gp_mission_tick');
  return {alarmVar: !!a};
});
console.log('  misyon done iken alarm:', r3.alarmVar ? '❌ hâlâ var' : '✅ yok');
await ctx.close(); llm.close(); site.close();
