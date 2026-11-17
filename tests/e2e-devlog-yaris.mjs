import { chromium } from 'playwright';
const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/p180b',{headless:false,
  args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
// aynı anda 6 kayıt (yarış testi)
await sw.evaluate(async()=>{
  await saveConfig({gp_devlog: []});
  pushLog('error','Hata: Cannot access a chrome-extension:// URL of different extension');
  pushLog('warn','Masaüstü köprüsü token tanımlı değil');
  pushLog('error','429 kota aşıldı — sağlayıcı değiştirildi');
  pushLog('error','Misyon adımı doğrulanamadı');
  pushLog('warn','Sekme otomasyona kapalı');
  pushLog('error','Başka bir hata');
});
await new Promise(r=>setTimeout(r,1500));
const saved = await sw.evaluate(async()=>{
  const c = await getConfig();
  return (c.gp_devlog||[]).map(x=>x.cat);
});
console.log('kaydedilen kategoriler:', saved.join(', '));
console.log('kayıt sayısı:', saved.length, saved.length===6?'✅ hiç kaybolmadı':'❌ kayıp var');

const p = await ctx.newPage();
await p.goto(`chrome-extension://${id}/panel.html`);
await p.waitForTimeout(1200);
await p.evaluate(()=>document.querySelector('#tabDevlogBtn').click());
await p.waitForTimeout(800);
const r = await p.evaluate(()=>({
  lines: document.querySelectorAll('#devlogBox .log-line').length,
  badge: document.querySelector('#devlogCount')?.textContent
}));
console.log('DevLog satırı:', r.lines, '| sekme rozeti:', r.badge);
await p.evaluate(()=>document.querySelector('[data-cat="eklenti"]').click());
await p.waitForTimeout(500);
const e = await p.evaluate(()=>document.querySelectorAll('#devlogBox .log-line').length);
console.log('"eklenti" filtresi:', e, e>0?'✅':'❌');
await p.screenshot({path:'/tmp/e2e/devlog180.png'});
await ctx.close();
