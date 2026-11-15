// Real upgrade on GDQPAN_QA only; temporary local account data, never production credentials.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),puppeteer=require('puppeteer-core');
const toolRoot='D:/GDQPAN/android-build-tools',adbPath=toolRoot+'/android-sdk/platform-tools/adb.exe',app='vn.gdqpan.app.mobile';
const out=path.resolve(__dirname,'../../qa/ui-20261019/native-upgrade');fs.mkdirSync(out,{recursive:true});
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:180000,windowsHide:true,maxBuffer:8*1024*1024});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),results={checks:[],errors:[]};
let account,temp,browser,page,port;
const check=(name,value,details)=>{results.checks.push({name,passed:!!value,details});assert(value,name);console.log('PASS',name);};
async function attach(){
  adb('shell','am','force-stop',app);adb('shell','input','keyevent','224');adb('shell','wm','dismiss-keyguard');adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');
  let pid;for(let i=0;i<50;i++){try{pid=adb('shell','pidof',app).trim();if(pid)break;}catch{}await wait(300);}assert(pid);
  adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  for(let i=0;i<50;i++){try{browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});break;}catch{}await wait(300);}assert(browser);
  page=(await browser.pages()).find(p=>p.url().includes('localhost'));assert(page);
  await page.setRequestInterception(true);page.on('request',req=>req.url().endsWith('/assets/server-config.js')?req.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'}):req.continue());
  page.on('pageerror',e=>results.errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.GdqMobile?.libraryReady&&!document.getElementById('account-form').inert,{timeout:60000});
}
async function login(){
  if(await page.evaluate(()=>GdqAccount.blocked)){
    await page.evaluate(port=>{document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='ui-upgrade@example.test';document.getElementById('account-password').value='UI-upgrade-QA-only-123';document.getElementById('account-form').requestSubmit();},port);
  }
  await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:60000});
}
(async()=>{
  check('Dedicated QA emulator',adb('emu','avd','name').includes('GDQPAN_QA'));
  check('Original 1.4.6 installed before upgrade',adb('shell','dumpsys','package',app).includes('versionName=1.4.6'));
  const {createApplication}=await import('../../server/src/server.js');temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-ui-upgrade-'));
  account=createApplication({local:true,data:temp,origins:'https://localhost'});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));port=account.server.address().port;
  adb('reverse','tcp:'+port,'tcp:'+port);await account.createAdmin('ui-upgrade@example.test','UI-upgrade-QA-only-123');
  for(const name of ['POST_NOTIFICATIONS','RECORD_AUDIO'])adb('shell','pm','grant',app,'android.permission.'+name);
  for(const name of ['SCHEDULE_EXACT_ALARM','USE_FULL_SCREEN_INTENT'])adb('shell','appops','set',app,name,'allow');
  await attach();await login();
  await page.evaluate(async()=>{
    StorageManager.saveSchedules([{id:'ui-upgrade-preserve',time:'23:57',days:[1,3,5],action:'Báo thức',on:true}]);
    StorageManager.saveSettings({...StorageManager.getSettings(),autoPlay:false,volume:.45,region:'bac_nu'});
    await StorageManager.saveCustomAudio('ui-upgrade-audio',new File(['UI-upgrade-audio-sentinel'],'ui-upgrade.wav',{type:'audio/wav'}));
    localStorage.setItem('ui-upgrade-sentinel','preserved-from-1.4.6');await GdqAccount.publish();
  });
  adb('shell','run-as',app,'touch','files/ui-upgrade-marker');
  check('Baseline data created',await page.evaluate(()=>StorageManager.getSchedules().some(s=>s.id==='ui-upgrade-preserve')));
  await browser.disconnect();browser=null;
  console.log('BASELINE READY; waiting for verified final APK gate');
  const gate=path.join(out,'install-ready.json'),deadline=Date.now()+15*60*1000;
  while(!fs.existsSync(gate)){assert(Date.now()<deadline,'APK gate timeout');await wait(1000);}
  const release=JSON.parse(fs.readFileSync(gate,'utf8'));
  check('APK checksum matches verified build',require('node:crypto').createHash('sha256').update(fs.readFileSync(release.path)).digest('hex')===release.sha256);
  check('Install over 1.4.6 succeeds',adb('install','-r',release.path).includes('Success'));
  check('Version is 1.4.7 / code 14',/versionCode=14\b/.test(adb('shell','dumpsys','package',app))&&adb('shell','dumpsys','package',app).includes('versionName=1.4.7'));
  check('Native private files preserved',adb('shell','run-as',app,'ls','files').includes('ui-upgrade-marker'));
  await attach();await login();
  const preserved=await page.evaluate(async()=>({marker:localStorage.getItem('ui-upgrade-sentinel'),schedule:StorageManager.getSchedules().find(s=>s.id==='ui-upgrade-preserve'),volume:StorageManager.getSettings().volume,audio:await (await StorageManager.getCustomAudio('ui-upgrade-audio'))?.blob.text()}));
  check('Local storage retained',preserved.marker==='preserved-from-1.4.6');
  check('Schedule and weekdays retained',preserved.schedule?.time==='23:57'&&JSON.stringify(preserved.schedule.days)==='[1,3,5]');
  check('Volume retained',preserved.volume===.45);
  check('IndexedDB custom audio retained',preserved.audio==='UI-upgrade-audio-sentinel');
  check('New stylesheet loaded',await page.evaluate(()=>!!document.querySelector('link[href="mobile-reference.css"]')&&getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-height').trim()==='76px'));
  for(const name of ['home','daily','audio','schedule','more','studio','custom','vtv']){
    await page.evaluate(name=>GdqMobile.switchPage(name),name);
    check('Native navigation '+name,await page.evaluate(name=>GdqMobile.getPage()===name&&document.documentElement.scrollWidth<=innerWidth+1,name));
  }
  await page.evaluate(()=>GdqMobile.switchPage('home'));await wait(1200);
  fs.writeFileSync(path.join(out,'home-native.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true,maxBuffer:12*1024*1024}));
  check('Clock running',await page.$eval('#clock-desktop',e=>/^\d{2}:\d{2}:\d{2}$/.test(e.textContent)&&e.textContent!=='00:00:00'));
  check('No JavaScript errors',results.errors.length===0,results.errors);
})().catch(e=>{console.error(e);results.fatal=e.stack;process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.disconnect();if(account){account.server.closeAllConnections();await new Promise(r=>account.server.close(r));account.close();}if(port)adb('reverse','--remove','tcp:'+port);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  if(temp){assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
});
