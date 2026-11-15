// Real in-place installation on the dedicated QA emulator, using a disposable server.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process'), puppeteer = require('puppeteer-core');
const {inspectArchive} = require('../verify-apk.cjs');
const toolRoot = 'D:/GDQPAN/android-build-tools', app = 'vn.gdqpan.app.mobile';
const adbPath = toolRoot + '/android-sdk/platform-tools/adb.exe';
const adb = (...args) => execFileSync(adbPath, ['-s', 'emulator-5554', ...args], {encoding: 'utf8', timeout: 240000, windowsHide: true, maxBuffer: 8 * 1024 * 1024});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const fromVersion=process.env.GDQ_UPGRADE_FROM||'1.4.7',targetVersion=process.env.GDQ_UPGRADE_TO||'1.4.8',targetCode=Number(process.env.GDQ_UPGRADE_CODE||15);
const out = path.resolve(__dirname, process.env.GDQ_UPGRADE_OUTPUT||'../../qa/install-20261020'); fs.mkdirSync(out, {recursive: true});
const results = {checks: [], errors: [], startedAt: new Date().toISOString()};
let account, temp, browser, page, port;
function check(name, value, details) { results.checks.push({name, passed: !!value, details}); assert(value, name); console.log('PASS', name); }
async function attach() {
  adb('shell', 'am', 'force-stop', app); adb('shell', 'input', 'keyevent', '224'); adb('shell', 'wm', 'dismiss-keyguard');
  adb('shell', 'am', 'start', '-n', app + '/vn.gdqpan.app.MainActivity');
  let pid;
  for (let i = 0; i < 50; i++) { try { pid = adb('shell', 'pidof', app).trim(); if (pid) break; } catch {} await wait(300); }
  assert(pid); adb('forward', 'tcp:9223', 'localabstract:webview_devtools_remote_' + pid);
  for (let i = 0; i < 50; i++) { try { browser = await puppeteer.connect({browserURL: 'http://127.0.0.1:9223', defaultViewport: null}); break; } catch {} await wait(300); }
  assert(browser); page = (await browser.pages()).find(p => p.url().includes('localhost')); assert(page);
  await page.setRequestInterception(true);
  page.on('request', req => req.url().endsWith('/assets/server-config.js') ? req.respond({contentType: 'application/javascript', body: 'window.GdqServerConfig={url:"",demo:false};'}) : req.continue());
  page.on('pageerror', error => results.errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.reload({waitUntil: 'load'});
  await page.waitForFunction(() => window.GdqMobile?.libraryReady && !document.getElementById('account-form').inert, {timeout: 60000});
  if (await page.evaluate(() => GdqAccount.blocked)) {
    await page.evaluate(port => {
      document.getElementById('account-server').value = 'http://127.0.0.1:' + port;
      document.getElementById('account-email').value = 'apk-install@example.test';
      document.getElementById('account-password').value = 'APK-install-QA-only-123';
      document.getElementById('account-form').requestSubmit();
    }, port);
  }
  await page.waitForFunction(() => !GdqAccount.blocked && !document.getElementById('account-overlay').classList.contains('visible'), {timeout: 60000});
}
(async () => {
  check('Dedicated QA emulator', adb('emu', 'avd', 'name').includes('GDQPAN_QA'));
  results.androidVersion = adb('shell', 'getprop', 'ro.build.version.release').trim();
  check('Original '+fromVersion+' installed', adb('shell', 'dumpsys', 'package', app).includes('versionName='+fromVersion));
  const apk = path.resolve(__dirname, '../GDQPAN-'+targetVersion+'.apk');
  const verified = JSON.parse(fs.readFileSync(apk + '.verification.json', 'utf8'));
  check('Final release checksum and size match', !!inspectArchive(apk, verified));
  check('Certificate is preserved', verified.certificateSha256 === verified.referenceCertificateSha256);
  check('Both v1 and v2 signatures verified', verified.signatures.v1 && verified.signatures.v2);
  const {createApplication} = await import('../../server/src/server.js');
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gdqpan-apk-upgrade-'));
  account = createApplication({local: true, data: temp, origins: 'https://localhost'});
  await new Promise(resolve => account.server.listen(0, '127.0.0.1', resolve)); port = account.server.address().port;
  adb('reverse', 'tcp:' + port, 'tcp:' + port); await account.createAdmin('apk-install@example.test', 'APK-install-QA-only-123');
  await attach();
  await page.evaluate(async fromVersion => {
    StorageManager.saveSchedules([{id: 'apk-upgrade-preserve', time: '23:56', days: [2, 4, 6], action: 'Báo thức', on: false}]);
    StorageManager.saveSettings({...StorageManager.getSettings(), autoPlay: false, volume: .43, region: 'bac_nu'});
    await StorageManager.saveCustomAudio('apk-upgrade-audio', new File(['apk-upgrade-audio-sentinel'], 'apk-upgrade.wav', {type: 'audio/wav'}));
    localStorage.setItem('apk-upgrade-marker', 'preserved-from-'+fromVersion); await GdqAccount.publish();
  },fromVersion);
  adb('shell', 'run-as', app, 'touch', 'files/apk-upgrade-marker');
  await browser.disconnect(); browser = null;
  const staged = toolRoot + '/install-audit-20261020/GDQPAN-'+targetVersion+'.apk'; fs.copyFileSync(apk, staged); inspectArchive(staged, verified);
  console.log('Installing complete verified APK over '+fromVersion+'...');
  const install = adb('install', '-r', staged).trim(); results.installOutput = install;
  check('In-place APK installation succeeds', install.includes('Success'));
  const installed = adb('shell', 'dumpsys', 'package', app);
  check('Installed '+targetVersion+' / code '+targetCode, installed.includes('versionName='+targetVersion) && new RegExp('versionCode='+targetCode+'\\b').test(installed));
  check('Private app file preserved', adb('shell', 'run-as', app, 'ls', 'files').includes('apk-upgrade-marker'));
  await attach();
  const data = await page.evaluate(async () => ({marker: localStorage.getItem('apk-upgrade-marker'), schedule: StorageManager.getSchedules().find(s => s.id === 'apk-upgrade-preserve'), volume: StorageManager.getSettings().volume, audio: await (await StorageManager.getCustomAudio('apk-upgrade-audio'))?.blob.text(), songs: (await StorageManager.getAllSongs()).length}));
  check('Local storage preserved', data.marker === 'preserved-from-'+fromVersion);
  check('Schedule, weekdays and disabled state preserved', data.schedule?.time === '23:56' && JSON.stringify(data.schedule.days) === '[2,4,6]' && data.schedule.on === false);
  check('Volume preserved', data.volume === .43);
  check('IndexedDB audio preserved', data.audio === 'apk-upgrade-audio-sentinel');
  check('All 174 library tracks available', data.songs === 174);
  if(process.env.GDQ_BANNER_QA==='1'){
    results.banner=await page.evaluate(()=>{
      const logo=document.querySelector('.mobile-brand-logo').getBoundingClientRect(),brand=document.querySelector('.mobile-brand').getBoundingClientRect();
      const frame=document.querySelector('.mobile-system-banner').getBoundingClientRect(),title=document.querySelector('.mobile-system-banner h1').getBoundingClientRect();
      return {universityRemoved:!document.querySelector('.mobile-header .mobile-university'),largerLogo:logo.width>=64,logoCentered:Math.abs((brand.left+brand.right-logo.left-logo.right)/2)<1,titleAtTop:title.top-frame.top<frame.height*.2,photoLoaded:document.querySelector('.mobile-campus-photo')?.naturalWidth>0};
    });
    check('Updated banner visible in installed APK',Object.values(results.banner).every(Boolean),results.banner);
  }
  if(process.env.GDQ_SLOGAN_QA==='1'){
    results.slogan=await page.evaluate(()=>{
      const element=document.querySelector('.mobile-slogan'),style=getComputedStyle(element),bounds=element.getBoundingClientRect();
      return {text:element.textContent.replace(/\s+/g,' ').trim().normalize('NFC'),fontFamily:style.fontFamily,fontStyle:style.fontStyle,phrasesFit:[...element.children].every(span=>{const r=span.getBoundingClientRect();return r.height<=parseFloat(getComputedStyle(span).lineHeight)+1&&r.left>=bounds.left-1&&r.right<=bounds.right+1;})};
    });
    check('Vietnamese slogan is intact and legible',results.slogan.text==='Đoàn kết - Kỷ cương - Chất lượng - Tiên phong'&&results.slogan.fontStyle==='normal'&&results.slogan.phrasesFit,results.slogan);
  }
  for (const name of ['home', 'daily', 'audio', 'schedule', 'more', 'studio', 'custom', 'vtv']) {
    await page.evaluate(name => GdqMobile.switchPage(name), name);
    check('Navigation ' + name, await page.evaluate(name => GdqMobile.getPage() === name && document.documentElement.scrollWidth <= innerWidth + 1, name));
  }
  await page.evaluate(() => GdqMobile.switchPage('home')); await wait(1200);
  check('Clock running', await page.$eval('#clock-desktop', element => /^\d{2}:\d{2}:\d{2}$/.test(element.textContent) && element.textContent !== '00:00:00'));
  check('Native bridge available', await page.evaluate(() => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('GdqAlarm')));
  check('No JavaScript errors', results.errors.length === 0, results.errors);
  if(process.env.GDQ_PLAYER_QA==='1'){
    results.player=await require('./player-checks.cjs').exercisePlayer(page,{out:path.join(out,'player'),capture:async file=>fs.writeFileSync(file,execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true,maxBuffer:12*1024*1024}))});
    check('Audio player works in installed APK',results.player.checks.every(check=>check.passed));
  }
  fs.writeFileSync(path.join(out, 'home-'+targetVersion+'.png'), execFileSync(adbPath, ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p'], {windowsHide: true, maxBuffer: 12 * 1024 * 1024}));
})().catch(error => { results.fatal = error.stack; console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.disconnect();
  if (account) { account.server.closeAllConnections(); await new Promise(resolve => account.server.close(resolve)); account.close(); }
  if (port) adb('reverse', '--remove', 'tcp:' + port);
  if (temp) { assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep)); fs.rmSync(temp, {recursive: true, force: true}); }
  results.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(out, 'native-upgrade.json'), JSON.stringify(results, null, 2));
});
