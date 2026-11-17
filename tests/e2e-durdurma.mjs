import { chromium } from 'playwright';
import http from 'http';

const site = http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
r.end('<h1>Test</h1><button id="b" style="padding:20px">Kaydet</button>');});
await new Promise(r=>site.listen(8899,'127.0.0.1',r));

const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/p171',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
const pg = await ctx.newPage(); await pg.goto('http://127.0.0.1:8899/');
await pg.waitForTimeout(900);

console.log('═══ 1) HAYALET İMLEÇ TEMİZLİĞİ ═══');
// overlay aç
await sw.evaluate(async()=>{
  const t=(await chrome.tabs.query({})).find(x=>x.url&&x.url.includes('8899'));
  await chrome.tabs.sendMessage(t.id,{__target:'ghostpilot_content',type:'SYNTHETIC_ACTION',
    payload:{action:'cursor_preview',selector:'#b',pulse:true,label:'TIK',overlay:true,busy:true}});
});
await pg.waitForTimeout(400);
const before = await pg.evaluate(()=>!!document.getElementById('__gp_shadow_host__'));
console.log('  overlay açık:', before?'✅ var':'❌ yok');

// OVERLAY_OFF
await sw.evaluate(async()=>{
  const t=(await chrome.tabs.query({})).find(x=>x.url&&x.url.includes('8899'));
  await chrome.tabs.sendMessage(t.id,{__target:'ghostpilot_content',type:'OVERLAY_OFF'});
});
await pg.waitForTimeout(300);
const after = await pg.evaluate(()=>!!document.getElementById('__gp_shadow_host__'));
console.log('  OVERLAY_OFF sonrası:', after?'❌ HÂLÂ VAR':'✅ temizlendi');

// EMERGENCY_STOP sonrası da temiz mi? (önce imleci geri aç)
await sw.evaluate(async()=>{
  const t=(await chrome.tabs.query({})).find(x=>x.url&&x.url.includes('8899'));
  await chrome.tabs.sendMessage(t.id,{__target:'ghostpilot_content',type:'SYNTHETIC_ACTION',
    payload:{action:'cursor_preview',x:100,y:100,label:'AI',overlay:true}});
});
await pg.waitForTimeout(300);
await sw.evaluate(async()=>{ await triggerEmergencyStop(); });
await pg.waitForTimeout(400);
const afterPanic = await pg.evaluate(()=>({
  host: !!document.getElementById('__gp_shadow_host__'),
  text: document.body.innerText.includes('DURDURULDU')
}));
console.log('  PANIC sonrası overlay:', afterPanic.host?'❌ var':'✅ yok',
            '| "DURDURULDU" metni:', afterPanic.text?'❌ kaldı':'✅ yok');

console.log('\n═══ 2) WEBSOCKET DÖNGÜSÜ ═══');
const ws = await sw.evaluate(async()=>{
  const c = await chrome.storage.local.get(null);
  return {daemonToken: c.daemonToken, autoConnect: c.autoConnectDaemon, url: c.daemonUrl};
});
console.log('  token:', ws.daemonToken || '(boş)');
const attempts = await sw.evaluate(()=>typeof daemonFailCount!=='undefined'?{fail:daemonFailCount, gaveUp:daemonGaveUp, auth:daemonAuthFailed}:null);
console.log('  sayaç durumu:', JSON.stringify(attempts));
await sw.evaluate(()=>connectDaemon());
await new Promise(r=>setTimeout(r,3000));
const attempts2 = await sw.evaluate(()=>typeof daemonFailCount!=='undefined'?{fail:daemonFailCount, gaveUp:daemonGaveUp, auth:daemonAuthFailed}:null);
console.log('  3sn sonra:', JSON.stringify(attempts2));
console.log('  ' + (attempts2?.gaveUp||attempts2?.auth ? '✅ tekrar deneme durdu' : '⚠ hâlâ deniyor'));

console.log('\n═══ 3) DURDUR BUTONU ═══');
const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${id}/panel.html`);
await panel.waitForTimeout(1000);
const ui = await panel.evaluate(()=>({
  stopbar: !!document.querySelector('#stopbar'),
  btn: document.querySelector('#btnStopTask')?.textContent?.trim(),
  btnVisible: (()=>{const b=document.querySelector('#stopbar');return b?getComputedStyle(b).display:null})()
}));
console.log('  stopbar:', ui.stopbar?'✅ var':'❌ yok', '| buton:', ui.btn);
await panel.screenshot({path:'/tmp/e2e/panel171.png'});

// ajan çalışıyormuş gibi göster → çubuk görünmeli
await sw.evaluate(()=>{ agentState.running=true; agentState.step=3; agentState.goal='GitHub profilini düzenle'; broadcastUiState(); });
await panel.waitForTimeout(900);
const vis = await panel.evaluate(()=>({
  display: getComputedStyle(document.querySelector('#stopbar')).display,
  info: document.querySelector('#sbInfo')?.textContent
}));
console.log('  görev varken çubuk:', vis.display, vis.display==='flex'?'✅ görünür':'❌ gizli');
console.log('  bilgi:', vis.info?.slice(0,60));
await panel.screenshot({path:'/tmp/e2e/stopbar171.png'});

await ctx.close(); site.close();
