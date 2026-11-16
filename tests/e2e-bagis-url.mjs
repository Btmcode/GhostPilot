import { chromium } from 'playwright';
const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/pD',{headless:false,args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];

// Bağış penceresi
const d = await ctx.newPage();
await d.goto(`chrome-extension://${id}/donate.html`);
await d.waitForTimeout(1200);
const donateUrl = await d.evaluate(()=>typeof DONATE!=='undefined'?DONATE.url:'?');
const price = await d.evaluate(()=>document.querySelector('#dPrice')?.textContent);
console.log('donate.html  →', donateUrl, '| etiket:', price);

// Panel butonları
const p = await ctx.newPage();
await p.goto(`chrome-extension://${id}/panel.html`);
await p.waitForTimeout(1200);
const btn = await p.evaluate(()=>document.querySelector('#btnSupport')?.textContent?.trim());
const ref = await p.evaluate(()=>document.querySelector('.ref-coffee')?.dataset.url);
console.log('panel #btnSupport →', btn);
console.log('panel .ref-coffee →', ref);

// tıklama davranışı: yeni sekme açılıyor mu?
const [popup] = await Promise.all([
  ctx.waitForEvent('page',{timeout:5000}).catch(()=>null),
  p.evaluate(()=>document.querySelector('.ref-coffee').click())
]);
await new Promise(r=>setTimeout(r,1500));
const opened = popup ? popup.url() : (await ctx.pages()).map(x=>x.url()).find(u=>u.includes('buymeacoffee'));
console.log('tıklama sonrası açılan →', opened?.slice(0,60) || '(yakalanamadı)');

const ok = donateUrl==='https://buymeacoffee.com/btmcode' && /btmcode/.test(btn||'') && /btmcode/.test(ref||'') && /btmcode/.test(opened||'');
console.log('\n' + (ok ? '✅ TÜM BAĞIŞ BAĞLANTILARI btmcode' : '❌ TUTARSIZLIK'));
await ctx.close();
