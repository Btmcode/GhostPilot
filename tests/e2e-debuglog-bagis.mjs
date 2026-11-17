import { chromium } from 'playwright';
const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/p172',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
await sw.evaluate(async()=>{ pushLog('info','test satırı 1'); pushLog('warn','test satırı 2'); pushLog('error','test satırı 3'); });
const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${id}/panel.html`);
await panel.waitForTimeout(1300);

console.log('═══ 1) BAĞIŞ KARTI ═══');
const d0 = await panel.evaluate(()=>({
  on: document.querySelector('#donateToast')?.classList.contains('on'),
  display: getComputedStyle(document.querySelector('#donateToast')).display,
  title: document.querySelector('.dt-title')?.textContent,
  timer: !!document.querySelector('.dt-timer')
}));
console.log('  açılışta:', d0.on?'✅ görünür':'❌ gizli', '| display:', d0.display);
console.log('  başlık:', d0.title, '| süre çizgisi:', d0.timer?'✅':'❌');
await panel.screenshot({path:'/tmp/e2e/donate-toast.png'});
console.log('  10 sn bekleniyor…');
await panel.waitForTimeout(11000);
const d1 = await panel.evaluate(()=>document.querySelector('#donateToast')?.classList.contains('on'));
console.log('  10 sn sonra:', d1?'❌ hâlâ görünür':'✅ otomatik kapandı');

await panel.evaluate(()=>{ chrome.storage.local.set({panelDonate:{}}); });
await panel.reload(); await panel.waitForTimeout(1100);
const again = await panel.evaluate(()=>document.querySelector('#donateToast')?.classList.contains('on'));
console.log('  yeniden açılış:', again?'✅ yine gösterildi':'❌ gösterilmedi');
await panel.evaluate(()=>document.querySelector('#dtMute')?.click());
await panel.waitForTimeout(500);
await panel.reload(); await panel.waitForTimeout(1300);
const muted = await panel.evaluate(()=>document.querySelector('#donateToast')?.classList.contains('on'));
console.log('  "bir daha gösterme" sonrası:', muted?'❌ hâlâ var':'✅ gösterilmiyor');

console.log('\n═══ 2) DEBUG LOG + KOPYALA ═══');
const lu = await panel.evaluate(()=>({
  title: [...document.querySelectorAll('.card-head h3')].map(x=>x.textContent).find(t=>/log/i.test(t)),
  copy: !!document.querySelector('#btnCopyLog'), clear: !!document.querySelector('#btnClearLog'),
  lines: document.querySelectorAll('#logBox .log-line').length
}));
console.log('  başlık:', lu.title, '| kopyala:', lu.copy?'✅':'❌', '| temizle:', lu.clear?'✅':'❌', '| satır:', lu.lines);
await panel.context().grantPermissions(['clipboard-read','clipboard-write']);
await panel.evaluate(()=>document.querySelector('#btnCopyLog')?.click());
await panel.waitForTimeout(700);
const clip = await panel.evaluate(()=>navigator.clipboard.readText());
console.log('  panoya kopyalanan:', clip.split('\n').length, 'satır');
console.log('  içerik:', JSON.stringify(clip.slice(0,120)));
await panel.screenshot({path:'/tmp/e2e/debuglog.png'});
await panel.evaluate(()=>document.querySelector('#btnClearLog')?.click());
await panel.waitForTimeout(800);
const uiLines = await panel.evaluate(()=>document.querySelectorAll('#logBox .log-line').length);
const swLogs = await sw.evaluate(()=>agentState.logs.length);
console.log('  temizle → UI:', uiLines, '| arka plan:', swLogs, (uiLines===0&&swLogs===0)?'✅':'❌');

console.log('\n═══ 3) MİSYON METNİ ═══');
const mt = await panel.evaluate(()=>({
  hint: document.querySelector('#missionCard .hint')?.textContent,
  micro: document.querySelector('#missionSetup .micro')?.textContent?.trim()
}));
console.log('  açıklama:', mt.hint);
console.log('  alt not :', mt.micro);
await ctx.close();
