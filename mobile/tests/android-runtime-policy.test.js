// Targeted regression for shared settings, real volume touches and locked-screen alarms.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),puppeteer=require('puppeteer-core');
const version=process.env.GDQ_QA_VERSION||'1.4.6',app='vn.gdqpan.app.mobile';
const adbPath='D:/GDQPAN/android-build-tools/android-sdk/platform-tools/adb.exe';
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:120000,windowsHide:true,maxBuffer:16*1024*1024});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),out=path.resolve(__dirname,'../qa/runtime-policy-'+version);
fs.mkdirSync(out,{recursive:true});
const results={version,checks:[],errors:[],startedAt:new Date().toISOString()};
const check=(name,value,details)=>{results.checks.push({name,passed:!!value,details});console.log(value?'PASS':'FAIL',name,JSON.stringify(details??''));assert(value,name);};
let account,temp,browser,page,port,token;
async function publish(schedules,settings){
  const base='http://127.0.0.1:'+port,headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const data=await fetch(base+'/api/shared',{headers}).then(r=>r.json());
  const response=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...data,schedules,settings})});assert(response.ok);
}
async function refresh(){await page.evaluate(()=>GdqAccount.refresh());await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'));await wait(700);}
(async()=>{
  assert(adb('emu','avd','name').includes('GDQPAN_QA'));
  if(process.env.GDQ_QA_SKIP_INSTALL==='1')assert(adb('shell','dumpsys','package',app).includes('versionName='+version));
  else {const ascii='D:/GDQPAN/android-build-tools/alarm-settings-'+version+'.apk';fs.copyFileSync(path.resolve(__dirname,'../GDQPAN-'+version+'.apk'),ascii);assert(adb('install','-r',ascii).includes('Success'));}
  for(const name of ['POST_NOTIFICATIONS','RECORD_AUDIO'])adb('shell','pm','grant',app,'android.permission.'+name);
  for(const name of ['SCHEDULE_EXACT_ALARM','USE_FULL_SCREEN_INTENT'])adb('shell','appops','set',app,name,'allow');
  adb('shell','cmd','alarm','set-timezone','Asia/Bangkok');adb('logcat','-c');
  const {createApplication}=await import('../../server/src/server.js');temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-alarm-settings-'));
  account=createApplication({local:true,data:temp,origins:'https://localhost'});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));port=account.server.address().port;
  adb('reverse','tcp:'+port,'tcp:'+port);await account.createAdmin('alarm-qa@example.test','Alarm-QA-only-123');
  const auth=await fetch('http://127.0.0.1:'+port+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'alarm-qa@example.test',password:'Alarm-QA-only-123'})}).then(r=>r.json());token=auth.token;
  await publish([],{autoPlay:false,volume:.2,region:'bac_nu'});
  adb('shell','am','force-stop',app);adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');
  let pid;for(let i=0;i<40;i++){try{pid=adb('shell','pidof',app).trim();if(pid)break;}catch{}await wait(250);}assert(pid);
  adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  for(let i=0;i<40;i++){try{browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});break;}catch{await wait(250);}}assert(browser);
  page=(await browser.pages()).find(p=>p.url().includes('localhost'));assert(page);
  // Keep this disposable-server test independent of the public demo endpoint on reload/resume.
  await page.setRequestInterception(true);
  page.on('request',request=>request.url().endsWith('/assets/server-config.js')?request.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'}):request.continue());
  page.on('dialog',d=>d.accept());page.on('pageerror',e=>results.errors.push(e.message));
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.GdqMobile?.libraryReady&&document.getElementById('account-form')&&!document.getElementById('account-form').inert,{timeout:60000});
  await page.evaluate(port=>{document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='alarm-qa@example.test';document.getElementById('account-password').value='Alarm-QA-only-123';document.getElementById('account-form').requestSubmit();},port);
  await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});
  const prefs=()=>adb('shell','run-as',app,'cat','shared_prefs/gdqpan-runtime.xml');
  const pending=()=>adb('shell','dumpsys','alarm');
  const service=()=>adb('shell','dumpsys','activity','services',app);
  const nextAlarm=()=>page.evaluate(()=>{const next=new Date();next.setSeconds(0,0);next.setMinutes(next.getMinutes()+1);if(next-Date.now()<20000)next.setMinutes(next.getMinutes()+1);return {id:'qa-runtime-policy',time:String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0'),days:[next.getDay()],action:'Báo thức',text:'',on:true,target:next.getTime()};});
  const foreground=()=>{adb('shell','input','keyevent','224');adb('shell','wm','dismiss-keyguard');adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');};
  const toggle=async value=>{await page.evaluate(()=>openModalSheet('settings'));await page.waitForSelector('#account-background',{visible:true});if(await page.$eval('#account-background',e=>e.checked)!==value)await page.click('#account-background');await page.waitForFunction(v=>GdqRuntime.backgroundEnabled===v,{},value);await page.evaluate(()=>closeModal());await wait(500);};
  check('Native account authenticated',prefs().includes('name="authenticated" value="true"'));
  let alarm=await nextAlarm();await publish([alarm],{autoPlay:true,volume:.35,region:'nam_nam'});await refresh();
  check('Native alarm armed',(await page.evaluate(()=>GdqMobile.syncAlarms())).count===1);
  await toggle(false);check('Background OFF saved natively',prefs().includes('name="background" value="false"'));
  adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');await wait(1500);
  check('Background OFF stops foreground service',!service().includes('isForeground=true'));
  console.log('Waiting past disabled alarm',alarm.time);
  while(Date.now()<alarm.target+5000){checkNoForeground();await wait(500);}
  function checkNoForeground(){assert(!service().includes('isForeground=true'),'Disabled alarm unexpectedly started');}
  check('Locked-screen alarm suppressed when background OFF',true);
  fs.writeFileSync(path.join(out,'background-off-alarm-manager.txt'),pending());
  foreground();await page.waitForFunction(()=>!document.hidden&&!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible')&&GdqRuntime.allowed());await wait(400);
  check('Returning foreground restores runtime permission',await page.evaluate(()=>GdqRuntime.allowed()));
  await toggle(true);alarm=await nextAlarm();await publish([alarm],{autoPlay:true,volume:.35,region:'nam_nam'});await refresh();
  check('Background ON saved natively',prefs().includes('name="background" value="true"'));
  adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');console.log('Waiting for enabled alarm',alarm.time);
  let playing=false;while(Date.now()<alarm.target+15000){if(service().includes('isForeground=true')){playing=true;break;}await wait(500);}
  check('Background ON starts locked-screen alarm',playing);
  let actualAudio=false;for(let i=0;i<30;i++){if(/state:started[\s\S]{0,300}USAGE_ALARM/.test(adb('shell','dumpsys','audio'))){actualAudio=true;break;}await wait(300);}
  check('Native alarm audio actually starts',actualAudio);
  foreground();await page.waitForFunction(()=>!document.hidden&&!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:20000});await page.evaluate(()=>openModalSheet('settings'));await page.waitForSelector('#account-logout',{visible:true});
  check('Version hidden in Settings',await page.$eval('#modal-title',e=>!/v?\d+\.\d+/.test(e.textContent)));
  await page.click('#account-logout');await page.waitForFunction(()=>!localStorage.getItem('gdqpan_session')&&GdqAccount.blocked);
  for(let i=0;i<30&&service().includes('isForeground=true');i++)await wait(200);
  check('Logout stops active native service',!service().includes('isForeground=true'));
  check('Logout deactivates native runtime',prefs().includes('name="authenticated" value="false"'));
  check('Logout removes encrypted token',await page.evaluate(async()=>!(await Capacitor.registerPlugin('GdqAccount').restore()).token));
  check('Logout keeps login screen',await page.$eval('#account-overlay',e=>e.classList.contains('visible')));
  fs.writeFileSync(path.join(out,'logout-alarm-manager.txt'),pending());
  fs.writeFileSync(path.join(out,'logout.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true,maxBuffer:16*1024*1024}));
  check('No JavaScript errors',results.errors.length===0,results.errors);results.endedAt=new Date().toISOString();
})().catch(e=>{results.fatal=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
  const log=adb('logcat','-d').replace(/"(token|password)"\s*:\s*"[^"]*"/gi,'"$1":"[redacted]"').replace(/Bearer [a-f0-9]{64}/gi,'Bearer [redacted]');fs.writeFileSync(path.join(out,'logcat.txt'),log);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  try{if(page)await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').stop());}catch{}
  if(browser)await browser.disconnect();if(account){await new Promise(r=>account.server.close(r));account.close();}if(port)adb('reverse','--remove','tcp:'+port);
  if(temp){assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
});
