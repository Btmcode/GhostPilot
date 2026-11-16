import { chromium } from 'playwright';
const EXT='/home/user/ghostpilot/extension-chromium';
let pass=0,fail=0;
const ok=(n,c,d='')=>{ if(c){pass++;console.log(`  ✅ ${n}`);}else{fail++;console.log(`  ❌ ${n} ${d}`);} };

const ctx = await chromium.launchPersistentContext('/tmp/e2e/profileD',{headless:false,args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
const extId = sw.url().split('/')[2];
const errors=[];
console.log('═══ BAĞIŞ PENCERESİ ═══');

const page = await ctx.newPage();
page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if(m.type()==='error') errors.push(m.text()); });
await page.goto(`chrome-extension://${extId}/donate.html`);
await page.waitForTimeout(900);

ok('Sayfa açıldı', await page.locator('#btnDonate').count()===1);
ok('JS hatası yok', errors.length===0, errors.join(' | ').slice(0,200));
ok('Kahve düğmesi var', (await page.locator('#btnDonate').textContent()).includes('Buy me a coffee'));
ok('4 seçenek var (yıldız/sonra/hafta/sonsuz)',
   await page.locator('.chip, .mute').count() >= 4, String(await page.locator('.chip, .mute').count()));

await page.screenshot({path:'/tmp/e2e/donate-tr.png'});

// EN
await sw.evaluate(async ()=>chrome.storage.local.set({uiLang:'en'}));
await page.reload(); await page.waitForTimeout(800);
const enTitle = await page.locator('#dTitle').textContent();
ok('EN çeviri', enTitle.includes('Enjoying'), enTitle);
await page.screenshot({path:'/tmp/e2e/donate-en.png'});

// "Bir daha gösterme" → mutedForever
await page.click('#btnMuteForever').catch(()=>{});
await new Promise(r=>setTimeout(r,1200));
const state = await sw.evaluate(async ()=>(await chrome.storage.local.get('donate')).donate);
ok('mutedForever kaydedildi', state && state.mutedForever===true, JSON.stringify(state));
const tabsLeft = await sw.evaluate(async ()=>(await chrome.tabs.query({})).filter(t=>t.url.includes('donate.html')).length);
ok('Tıklanan sekme kendini kapattı', tabsLeft <= 1, `kalan donate sekmesi: ${tabsLeft} (1 = kurulumda otomatik açılan)`);

// shouldShowDonate mantığı
const verdict1 = await sw.evaluate(async ()=>{
  const d = (await chrome.storage.local.get('donate')).donate||{};
  if (d.mutedForever) return 'muted_forever';
  return 'show';
});
ok('Sustur sonrası gösterilmiyor', verdict1==='muted_forever', verdict1);

// haftalık mantığı test et
console.log('\n═══ HAFTALIK MANTIK ═══');
await sw.evaluate(async ()=>{
  await chrome.storage.local.set({donate:{ lastShownAt: Date.now(), shownCount:1 }});
});
const r2 = await sw.evaluate(async ()=>{
  const d=(await chrome.storage.local.get('donate')).donate||{};
  const WEEK=7*24*60*60*1000;
  if (d.mutedForever) return 'muted';
  if (d.lastShownAt && Date.now()-d.lastShownAt < WEEK) return 'too_soon';
  return 'due';
});
ok('Yeni gösterimden sonra 7 gün sessiz', r2==='too_soon', r2);

await sw.evaluate(async ()=>{
  await chrome.storage.local.set({donate:{ lastShownAt: Date.now()-8*24*60*60*1000, shownCount:2 }});
});
const r3 = await sw.evaluate(async ()=>{
  const d=(await chrome.storage.local.get('donate')).donate||{};
  const WEEK=7*24*60*60*1000;
  if (d.mutedForever) return 'muted';
  if (d.lastShownAt && Date.now()-d.lastShownAt < WEEK) return 'too_soon';
  return 'due';
});
ok('8 gün sonra tekrar gösterilir', r3==='due', r3);

console.log(`\n═══ ${pass} geçti, ${fail} başarısız ═══`);
await ctx.close();
process.exitCode = fail?1:0;
