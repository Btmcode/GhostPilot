import { chromium } from 'playwright';
import http from 'http';
const server = http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(`<!doctype html><html><body>
<form>
  <input id="kadi" name="username" placeholder="Kullanıcı adı">
  <input id="sifre" name="password" type="password" placeholder="Şifre">
  <input id="kart" name="cardnumber" placeholder="Kart numarası">
  <input id="cvv" name="cvv" placeholder="CVV">
  <input id="eposta" name="email" placeholder="E-posta">
  <input id="tc" name="tckn" placeholder="TCKN">
  <input id="otp" name="otp" placeholder="Doğrulama kodu">
</form>
<button id="btn">Tıkla</button></body></html>`);});
await new Promise(r=>server.listen(8899,'127.0.0.1',r));

const EXT='/home/user/ghostpilot/extension-chromium';
const ctx = await chromium.launchPersistentContext('/tmp/e2e/profile3',{headless:false,args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`,'--no-sandbox']});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
const extId = sw.url().split('/')[2];

const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8899/');
await page.waitForTimeout(1500);
// GİZLİ VERİLERİ doldur
await page.fill('#kadi','ahmet_yilmaz');
await page.fill('#sifre','GIZLI_SIFRE_123');
await page.fill('#kart','4111111111111111');
await page.fill('#cvv','999');
await page.fill('#eposta','ahmet@ornek.com');
await page.fill('#tc','12345678901');
await page.fill('#otp','654321');
await page.waitForTimeout(500);

// content script'i background üzerinden çağır (izole dünya)
const pid = await page.evaluate(()=>1);
// tabId'yi bul
const tabs = await sw.evaluate(()=>chrome.tabs.query({}));
const tab = tabs.find(t=>t.url && t.url.includes('8899'));
console.log('Tab ID:', tab?.id);

const snap = await sw.evaluate(async (tabId) => {
  return await chrome.tabs.sendMessage(tabId, { __target: 'ghostpilot_content', type: 'SNAPSHOT', maxItems: 100 });
}, tab.id);

const s = JSON.stringify(snap);
console.log('\n── SNAPSHOT (ilk 900 karakter) ──');
console.log(s.slice(0, 900));

console.log('\n══ GİZLİ VERİ SIZINTI TESTİ ══');
let fail = 0;
const check = (label, secret) => {
  const leaked = s.includes(secret);
  console.log(`  ${leaked ? '❌ SIZDI' : '✅ gizli'} — ${label}`);
  if (leaked) fail++;
};
check('Şifre (GIZLI_SIFRE_123)', 'GIZLI_SIFRE_123');
check('Kart no (4111111111111111)', '4111111111111111');
check('CVV (999)', '"999"');
check('TCKN (12345678901)', '12345678901');
check('OTP (654321)', '654321');
console.log(`\n  ℹ️  Kullanıcı adı okunmalı (hassas değil): ${s.includes('ahmet') ? '✅ okundu' : '⚠️ okunmadı'}`);
console.log(`  ℹ️  sensitive işareti: ${s.includes('sensitive') ? '✅ var' : '❌ yok'}`);
console.log(`  Toplam: ${fail === 0 ? '✅ HİÇ SIZINTI YOK' : fail + ' SIZINTI'}`);

// manipülasyon testi: ajan şifre alanına yazabilir mi?
await ctx.close(); server.close();
process.exitCode = fail ? 1 : 0;
