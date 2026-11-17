import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';
import path from 'path';

const EXT = '/home/user/ghostpilot/extension-chromium';
let pass = 0, fail = 0;
const ok = (n, c, d='') => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${d}`); } };

// ---- yerel test sitesi (form + şifre + buton) ----
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>GhostPilot Test</title></head><body>
  <h1 id="baslik">Test Sayfası</h1>
  <form>
    <input id="kadi" name="username" placeholder="Kullanıcı adı">
    <input id="sifre" name="password" type="password" placeholder="Şifre">
    <input id="kart" name="cardnumber" placeholder="Kart numarası">
    <input id="cvv" name="cvv" placeholder="CVV">
    <input id="eposta" name="email" placeholder="E-posta">
  </form>
  <button id="btn" onclick="document.getElementById('sonuc').textContent='TIKLANDI'">Tıkla</button>
  <div id="sonuc">bekliyor</div>
  </body></html>`);
});
await new Promise(r => server.listen(8899, '127.0.0.1', r));

const ctx = await chromium.launchPersistentContext('/tmp/e2e/profile', {
  headless: false,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox']
});

try {
  // ---- 1) eklenti yüklendi mi ----
  console.log('\n═══ 1. EKLENTİ YÜKLEME ═══');
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const extId = sw.url().split('/')[2];
  ok('Service worker çalışıyor', !!sw);
  ok('Eklenti kimliği alındı', /^[a-p]{32}$/.test(extId), extId);

  // ---- 2) manifest / sürüm ----
  const ver = await sw.evaluate(() => chrome.runtime.getManifest().version);
  // Sürümü elle güncellemeyin — manifest.json'dan okuyun
  const manVer = JSON.parse(fs.readFileSync('/home/user/ghostpilot/extension-chromium/manifest.json','utf8')).version;
  ok(`Sürüm ${ver}`, ver === manVer, `panel=${ver} manifest=${manVer}`);

  // ---- 3) panel açılışı + console hatası ----
  console.log('\n═══ 2. PANEL ARAYÜZÜ ═══');
  const panel = await ctx.newPage();
  const errors = [];
  panel.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  panel.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await panel.goto(`chrome-extension://${extId}/panel.html`);
  await panel.waitForTimeout(1500);
  ok('Panel açıldı', await panel.locator('#aboutCard').count() > 0);
  ok('JS hatası yok', errors.length === 0, errors.join(' | ').slice(0, 300));
  ok('Sağlayıcı kartları var', await panel.locator('.pcard').count() >= 6);

  // ---- 4) i18n TR → EN → TR ----
  console.log('\n═══ 3. ÇOKLU DİL ═══');
  const trTab = await panel.locator('.tab[data-tab="ai"]').textContent();
  await panel.click('#btnLangQuick');
  await panel.waitForTimeout(700);
  const enTab = await panel.locator('.tab[data-tab="ai"]').textContent();
  const enHtmlLang = await panel.evaluate(() => document.documentElement.lang);
  ok('TR → EN çeviri', trTab.includes('Yapay Zekâ') && enTab.trim() === '🤖 AI', `${trTab} → ${enTab}`);
  ok('<html lang="en">', enHtmlLang === 'en', enHtmlLang);
  const enBtn = await panel.locator('#btnStartAgent').textContent();
  ok('Düğme çevrildi', enBtn.includes('Start Task'), enBtn);
  await panel.click('#btnLangQuick');
  await panel.waitForTimeout(700);
  const backTab = await panel.locator('.tab[data-tab="ai"]').textContent();
  ok('EN → TR geri dönüş', backTab.includes('Yapay Zekâ'), backTab);

  // kalıcılık: storage
  const savedLang = await sw.evaluate(async () => (await chrome.storage.local.get('uiLang')).uiLang);
  ok('Dil kalıcı saklandı', savedLang === 'tr', savedLang);

  // ---- 5) Referans kartları ----
  console.log('\n═══ 4. REFERANS KARTLARI ═══');
  const refs = await panel.locator('#aboutCard .ref').count();
  ok('4 referans kartı (GitHub/Web/Blog/Coffee)', refs === 4, String(refs));
  // GitHub ikonu artık REPOYA gitmeli (kullanıcı profiline değil) — yıldız verilebilsin
  const gh = await panel.locator('.ref[data-url="https://github.com/Btmcode/GhostPilot"]').count();
  const bmc = await panel.locator('.ref[data-url*="buymeacoffee"]').count();
  const star = await panel.locator('#btnStar[data-url="https://github.com/Btmcode/GhostPilot"]').count();
  ok('GitHub ikonu repoya gidiyor', gh === 1, String(gh));
  ok('Coffee kartı', bmc === 1);
  ok('Yıldız butonu repoya gidiyor', star === 1, String(star));

  // ---- 6) content script: hassas alan koruması ----
  console.log('\n═══ 5. HASSAS ALAN KORUMASI (canlı sayfa) ═══');
  const site = await ctx.newPage();
  await site.goto('http://127.0.0.1:8899/');
  await site.fill('#kadi', 'ahmet');
  await site.fill('#sifre', 'GIZLI_SIFRE_123');
  await site.fill('#kart', '4111111111111111');
  await site.fill('#cvv', '999');
  await site.fill('#eposta', 'a@b.com');
  await site.waitForTimeout(1200);
  const snapMsg = await sw.evaluate(async (u) => {
    const tabs = await chrome.tabs.query({});
    const t = tabs.find(x => x.url && x.url.includes(u));
    if (!t) return null;
    return await chrome.tabs.sendMessage(t.id, { __target:'ghostpilot_content', type:'SNAPSHOT', maxItems:100 });
  }, '8899');
  ok('Content script yüklü (mesaj yanıtı)', !!snapMsg && snapMsg.ok === true);
  const snap = snapMsg ? JSON.stringify(snapMsg) : null;
  if (snap) {
    const s = snap;
    ok('Şifre değeri snapshot\'ta YOK', !s.includes('GIZLI_SIFRE_123'));
    ok('Kart değeri snapshot\'ta YOK', !s.includes('4111111111111111'));
    ok('CVV değeri snapshot\'ta YOK', !s.includes('"999"'));
    ok('Hassas alan işaretlenmiş', s.includes('sensitive'));
    // GİZLİLİK TASARIMI: snapshot alan DEĞERLERİNİ hiç göndermez, yalnızca
    // etiket/konum gönderir. Bu yüzden normal alan değerinin de sızmaması gerekir.
    ok('Normal alan değeri de sızmıyor (yalnız etiket gönderilir)',
       !s.includes('ahmet') && !s.includes('a@b.com'),
       'snapshot değer taşımıyor — gizlilik tasarımı');
  } else {
    console.log('  ℹ️  snapshot fonksiyonu globalde yok — mesaj yoluyla test edilecek');
  }

  // ---- 7) background: mesaj kanalı ----
  console.log('\n═══ 6. BACKGROUND MESAJ KANALI ═══');
  const pong = await panel.evaluate(() => new Promise(r =>
    chrome.runtime.sendMessage({ type: 'PING' }, resp => r(chrome.runtime.lastError ? 'ERR:' + chrome.runtime.lastError.message : resp))
  ));
  ok('PING yanıtı', pong !== undefined && pong !== null, JSON.stringify(pong).slice(0, 120));

  // ---- 8) günlük maskeleme ----
  console.log('\n═══ 7. GÜNLÜK MASKELEME ═══');
  const redacted = await sw.evaluate(async () => {
    const logs = await chrome.storage.local.get('logs');
    return JSON.stringify(logs);
  });
  ok('storage\'da ham anahtar yok', !/sk-[A-Za-z0-9]{20,}/.test(redacted));

  // ---- 9) misyon motoru (storage şeması) ----
  console.log('\n═══ 8. MİSYON MOTORU ═══');
  const missionApi = await sw.evaluate(async () => {
    try {
      const r = await chrome.storage.local.get('gp_mission');
      return { ok: true, has: 'gp_mission' in r };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  ok('Misyon depolama erişilebilir', missionApi.ok);

  // ---- 10) panic / acil durdurma düğmesi ----
  console.log('\n═══ 9. ACİL DURDURMA ═══');
  await panel.click('.tab[data-tab="ai"]');
  await panel.locator('#btnPanic').click();
  await panel.waitForTimeout(600);
  ok('Panic tıklandı, hata yok', errors.length === 0, errors.slice(0,2).join(' | '));

  // ---- 11) ekran görüntüsü ----
  await panel.screenshot({ path: '/tmp/e2e/panel-tr.png', fullPage: false });
  await panel.waitForTimeout(600);
  await panel.screenshot({ path: '/tmp/e2e/panel-en.png', fullPage: false });

  console.log('\n═══ SONUÇ ═══');
  console.log(`${pass} geçti, ${fail} başarısız`);
  if (errors.length) console.log('Konsol hataları:', errors.slice(0, 5));
  process.exitCode = fail ? 1 : 0;
} catch (e) {
  console.error('\n💥 TEST ÇÖKTÜ:', e.message);
  process.exitCode = 1;
} finally {
  await ctx.close();
  server.close();
}
