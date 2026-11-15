// Targeted regression for shared settings, real volume touches and locked-screen alarms.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),puppeteer=require('puppeteer-core');
const version=process.env.GDQ_QA_VERSION||'1.4.1',app='vn.gdqpan.app.mobile';
const adbPath='D:/GDQPAN/android-build-tools/android-sdk/platform-tools/adb.exe';
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:120000,windowsHide:true,maxBuffer:16*1024*1024});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),out=path.resolve(__dirname,'../qa/alarm-settings-'+version);
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
  const ascii='D:/GDQPAN/android-build-tools/alarm-settings-'+version+'.apk';fs.copyFileSync(path.resolve(__dirname,'../GDQPAN-'+version+'.apk'),ascii);assert(adb('install','-r',ascii).includes('Success'));
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
  page.on('dialog',d=>d.accept());page.on('pageerror',e=>results.errors.push(e.message));
  await page.waitForFunction(()=>window.GdqMobile?.libraryReady&&document.getElementById('account-form')&&!document.getElementById('account-form').inert,{timeout:60000});
  await page.evaluate(port=>{document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='alarm-qa@example.test';document.getElementById('account-password').value='Alarm-QA-only-123';document.getElementById('account-form').requestSubmit();},port);
  await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});
  const alarm=await page.evaluate(()=>{const next=new Date();next.setSeconds(0,0);next.setMinutes(next.getMinutes()+1);if(next-Date.now()<40000)next.setMinutes(next.getMinutes()+1);return {id:'qa-final-lock-alarm',time:String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0'),days:[next.getDay()],action:'Báo thức',text:'',on:true,target:next.getTime()};});
  await publish([alarm],{autoPlay:true,volume:.35,region:'nam_nam'});await refresh();
  let settings=await page.evaluate(()=>StorageManager.getSettings());
  check('Delayed volume refresh preserves shared autoplay and voice',settings.autoPlay===true&&settings.region==='nam_nam'&&settings.volume===.35,settings);
  check('Autoplay checkbox follows shared settings',await page.$eval('#mobile-auto-play',e=>e.checked));
  const slider=await page.$eval('#volume-desktop',e=>e.getBoundingClientRect().toJSON());await page.touchscreen.tap(slider.x+slider.width*.75,slider.y+slider.height/2);await wait(700);
  settings=await page.evaluate(()=>StorageManager.getSettings());
  check('Real volume touch persists without resetting other settings',settings.volume!==.35&&settings.autoPlay===true&&settings.region==='nam_nam',settings);
  await page.evaluate(()=>GdqAccount.publish());const permissions=await page.evaluate(()=>GdqMobile.syncAlarms());
  check('One native alarm remains armed after volume save',permissions.count===1&&permissions.exact&&permissions.fullScreen&&permissions.notifications,permissions);
  results.alarm={...alarm,permissions};adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');console.log('Waiting for locked alarm',alarm.time);
  let foreground=false;while(Date.now()<alarm.target+20000){const services=adb('shell','dumpsys','activity','services',app);if(services.includes('AlarmPlaybackService')&&services.includes('isForeground=true')){foreground=true;fs.writeFileSync(path.join(out,'service.txt'),services);break;}await wait(500);}
  check('Locked-screen alarm starts foreground playback',foreground);await wait(500);
  let audio,audioStarted=false;const audioDeadline=Date.now()+12000;
  while(Date.now()<audioDeadline){audio=adb('shell','dumpsys','audio');if(/state:started[\s\S]{0,300}USAGE_ALARM/.test(audio)){audioStarted=true;break;}await wait(300);}
  fs.writeFileSync(path.join(out,'audio.txt'),audio);
  check('Android audio player started with alarm usage',audioStarted);
  fs.writeFileSync(path.join(out,'locked-alarm.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true,maxBuffer:16*1024*1024}));
  await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').stop());await page.waitForFunction(async()=>!(await Capacitor.registerPlugin('GdqAlarm').status()).playing,{timeout:5000});check('Stop ends native playback',true);
  adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');
  await publish([alarm],{autoPlay:false,volume:.15,region:'trung_nu'});await refresh();settings=await page.evaluate(()=>StorageManager.getSettings());
  check('Shared disable and new voice survive deferred volume refresh',settings.autoPlay===false&&settings.region==='trung_nu'&&settings.volume===.15,settings);
  check('Autoplay off removes native alarm',(await page.evaluate(()=>GdqMobile.syncAlarms())).count===0);
  check('No JavaScript errors',results.errors.length===0,results.errors);results.endedAt=new Date().toISOString();
})().catch(e=>{results.fatal=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
  const log=adb('logcat','-d').replace(/"(token|password)"\s*:\s*"[^"]*"/gi,'"$1":"[redacted]"').replace(/Bearer [a-f0-9]{64}/gi,'Bearer [redacted]');fs.writeFileSync(path.join(out,'logcat.txt'),log);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  try{if(page)await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').stop());}catch{}
  if(browser)await browser.disconnect();if(account){await new Promise(r=>account.server.close(r));account.close();}if(port)adb('reverse','--remove','tcp:'+port);
  if(temp){assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
});
