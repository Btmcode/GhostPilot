import { chromium } from 'playwright';
import http from 'http';
const EXT='/home/user/ghostpilot/extension-chromium';
const site = http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end('<h1>facebook test</h1>');});
await new Promise(r=>site.listen('8899','127.0.0.1',r));
const ctx = await chromium.launchPersistentContext('/tmp/e2e/p181',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];

console.log('═══ 1) HESAP SAYFASI ARTIK ENGELLEMİYOR ═══');
const t = await sw.evaluate(async ()=>{
  // hassas sayfa kontrolü
  const sensitive = isSensitiveSettingsUrl('https://github.com/settings/profile#x');
  const problem = tabProblem({url:'https://github.com/settings/profile#x', status:'complete'});
  return {sensitive, problem};
});
console.log('  isSensitiveSettingsUrl:', t.sensitive);
console.log('  tabProblem (engel mi?):', t.problem === '' ? '✅ boş — ENGELLEMİYOR' : '❌ '+t.problem.slice(0,60));

console.log('\n═══ 2) GÖREV ADRESİ → YENİ SEKME ═══');
await sw.evaluate(async()=>{
  await chrome.storage.local.set({activeProvider:'custom',aiBaseUrl:'http://127.0.0.1:9999/v1',aiApiKey:'k',aiModel:'m',
    taskMode:'reuse_tab', maxAgentSteps:1, inputEngine:'synthetic', confirmBeforeStart:false,
    keyStore:{custom:{apiKey:'k',baseUrl:'http://127.0.0.1:9999/v1',model:'m'}}});
});
// panel sekmesini aktif yap (kullanılamaz hedef)
const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${id}/panel.html`);
await panel.waitForTimeout(800);
await panel.bringToFront();
const before = (await ctx.pages()).length;
await sw.evaluate(async()=>{
  runAutonomousTask('facebook.com hesabımı aç', null, {taskMode:'reuse_tab'}).catch(()=>{});
});
await new Promise(r=>setTimeout(r,3500));
const after = await ctx.pages();
const newUrls = after.map(p=>p.url()).filter(u=>u.includes('facebook')||u.includes('8899'));
console.log('  sekme sayısı:', before, '→', after.length);
console.log('  yeni açılan:', newUrls.join(', ') || '(yok)');
console.log('  ' + (after.length > before || newUrls.length ? '✅ görev adresi için sekme açıldı' : '⚠ sekme açılmadı'));

console.log('\n═══ 3) YILDIZ BUTONU ═══');
await panel.reload(); await panel.waitForTimeout(1200);
const star = await panel.evaluate(()=>{
  const b = document.querySelector('#btnStar');
  const gh = document.querySelector('#aboutCard .ref[title*="deposu"], #aboutCard .ref[data-url*="GhostPilot"]');
  return {
    var: !!b,
    href: b?.getAttribute('href'),
    dataUrl: b?.dataset.url,
    text: b?.textContent?.replace(/\s+/g,' ').trim(),
    ghIcon: gh?.dataset.url
  };
});
console.log('  yıldız butonu:', star.var?'✅ var':'❌ yok');
console.log('  hedef:', star.dataUrl);
console.log('  metin:', star.text);
console.log('  GitHub ikonu:', star.ghIcon);
const ok = star.dataUrl === 'https://github.com/Btmcode/GhostPilot' && star.ghIcon === 'https://github.com/Btmcode/GhostPilot';
console.log('  ' + (ok ? '✅ her ikisi de REPOYA gidiyor' : '❌ hâlâ profile gidiyor'));
await panel.screenshot({path:'/tmp/e2e/star181.png'});
await ctx.close(); site.close();
