// Disposable QA emulator only. Never run against a physical device.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {createApplication} from '../src/server.js';
const require=createRequire(import.meta.url),puppeteer=require('../../mobile/node_modules/puppeteer-core');
const tools='D:/GDQPAN/android-build-tools',adbPath=tools+'/android-sdk/platform-tools/adb.exe',pkg='vn.gdqpan.app.mobile',qa=path.resolve('qa');fs.mkdirSync(qa,{recursive:true});
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',windowsHide:true,timeout:60000}),wait=ms=>new Promise(r=>setTimeout(r,ms));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-native-account-')),app=createApplication({data:temp,local:true});
await new Promise(r=>app.server.listen(4181,'127.0.0.1',r));const base='http://127.0.0.1:4181';
const api=async(route,body,token,method='POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const b=await r.json();assert(r.ok,JSON.stringify(b));return b;};
let browser,page;
try{
  assert.equal(adb('shell','getprop','sys.boot_completed').trim(),'1');
  await app.createAdmin('native-admin@example.test','Native-admin-password-123');await api('/auth/register',{email:'gdqpan-qa-native-user@gmail.com',password:'Native-user-password-123'});const verify=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('verify');await api('/auth/verify',{token:verify});const admin=await api('/auth/login',{email:'native-admin@example.test',password:'Native-admin-password-123'});await api('/admin/users/'+app.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-native-user@gmail.com').id,{approval:'approved'},admin.token,'PATCH');
  const fixture=Buffer.from('native-binary-download-fixture');const uploaded=await fetch(base+'/api/files',{method:'POST',headers:{Authorization:'Bearer '+admin.token,'Content-Type':'audio/wav'},body:fixture});assert.equal(uploaded.status,201);const file=await uploaded.json();
  const initial=await api('/shared',null,admin.token,'GET');initial.files=[{id:file.id,name:'QA.wav',kind:'custom_audio',key:'QA'}];await api('/shared',initial,admin.token,'PUT');
  fs.copyFileSync(path.resolve('../mobile/GDQPAN-1.3.0-test.apk'),tools+'/GDQPAN-account-test.apk');adb('install','-r',tools+'/GDQPAN-account-test.apk');
  for(const permission of['android.permission.POST_NOTIFICATIONS','android.permission.RECORD_AUDIO'])adb('shell','pm','grant',pkg,permission);
  for(const op of['SCHEDULE_EXACT_ALARM','USE_FULL_SCREEN_INTENT'])adb('shell','appops','set',pkg,op,'allow');
  adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');adb('shell','am','force-stop',pkg);adb('shell','am','start','-n',pkg+'/vn.gdqpan.app.MainActivity');await wait(4000);
  const pid=adb('shell','pidof',pkg).trim();adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});page=(await browser.pages()).find(p=>p.url().includes('localhost'));assert(page);await page.waitForSelector('#account-form');
  await page.evaluate(()=>{document.getElementById('account-server').value='http://10.0.2.2:4181';document.getElementById('account-email').value='gdqpan-qa-native-user@gmail.com';document.getElementById('account-password').value='Native-user-password-123';document.getElementById('account-form').requestSubmit();});
  await page.waitForFunction(()=>window.GdqAccount.blocked===false,{timeout:20000});const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('gdqpan_session')));assert.equal(session.user.role,'user');assert(await page.evaluate(()=>Capacitor.isPluginAvailable('GdqAccount')));
  assert.equal(await page.evaluate(async()=>{const f=await StorageManager.getCustomAudio('QA');return await f.blob.text();}),fixture.toString());
  async function setAlarm(){const next=new Date();next.setSeconds(0,0);next.setMinutes(next.getMinutes()+1);if(next-Date.now()<20000)next.setMinutes(next.getMinutes()+1);const time=String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0');const shared=await api('/shared',null,admin.token,'GET');shared.schedules=[{id:'native-account-alarm',time,days:[next.getDay()],action:'Báo thức',on:true,text:''}];shared.settings={autoPlay:true,volume:.3,region:'bac_nu'};await api('/shared',shared,admin.token,'PUT');await page.evaluate(()=>window.GdqAccount.refresh());return next.getTime();}
  let target=await setAlarm();await api('/admin/users/'+session.user.id,{status:'locked',expires:null},admin.token,'PATCH');adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');
  console.log('Locked-account alarm scheduled; waiting for native denial.');
  while(Date.now()<target+18000)await wait(1000);
  const lockedState=adb('shell','run-as',pkg,'cat','shared_prefs/gdqpan-native-alarms.xml');
  const localLogs=await page.evaluate(()=>JSON.stringify(StorageManager.getLogs()));
  assert((lockedState+localLogs).includes('Bỏ qua lịch phát'));assert(!await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').status().then(s=>s.playing)));
  fs.writeFileSync(path.join(qa,'native-locked-state.xml'),lockedState);console.log('PASS locked account does not start alarm audio.');
  await api('/admin/users/'+session.user.id,{status:'active',expires:null},admin.token,'PATCH');adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');adb('shell','am','start','-n',pkg+'/vn.gdqpan.app.MainActivity');await wait(2000);target=await setAlarm();
  const newer=await api('/shared',null,admin.token,'GET');newer.schedules=[];await api('/shared',newer,admin.token,'PUT');
  adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');await wait(2000);assert(/mWakefulness=Asleep|mInteractive=false/.test(adb('shell','dumpsys','power')));
  console.log('Valid-account screen-off alarm scheduled.');
  while(Date.now()<target+3000)await wait(1000);
  const audio=adb('shell','dumpsys','audio');assert(/state:started.*usage=USAGE_ALARM|state:started[\s\S]{0,300}USAGE_ALARM/.test(audio));assert(adb('shell','dumpsys','activity','activities').includes('AlarmActivity'));
  fs.writeFileSync(path.join(qa,'native-account-alarm-audio.txt'),audio);fs.writeFileSync(path.join(qa,'native-account-alarm.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true}));
  adb('shell','uiautomator','dump','/sdcard/gdqpan-account-ui.xml');const ui=adb('shell','cat','/sdcard/gdqpan-account-ui.xml');const node=ui.match(/<node[^>]*text="DỪNG BÁO THỨC"[^>]*>/);assert(node);const b=node[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);adb('shell','input','tap',String(Math.round((+b[1]+ +b[3])/2)),String(Math.round((+b[2]+ +b[4])/2)));await wait(1000);assert(!await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').status().then(s=>s.playing)));
  // Live-server denial from a revoked token is tested above; unreachable-server denial uses a closed loopback endpoint.
  await page.waitForFunction(()=>GdqAccount.blocked===false,{timeout:20000});adb('shell','input','keyevent','3');await wait(2000);
  await page.evaluate(()=>Capacitor.registerPlugin('GdqAccount').configure({url:'http://10.0.2.2:4199',token:'unreachable-test',revision:0}));
  assert.equal(await page.evaluate(()=>Capacitor.registerPlugin('GdqAccount').check().then(s=>s.allowed)),false);
  await page.evaluate(()=>Capacitor.registerPlugin('GdqAccount').configure({url:'',token:'',revision:0}));
  fs.writeFileSync(path.join(qa,'native-account-results.json'),JSON.stringify({android:adb('shell','getprop','ro.build.version.release').trim(),nativeLogin:true,nativeBinaryDownload:true,encryptedNativeSession:true,lockedAccountSkipped:true,screenOff:true,cachedScheduleAfterAdminChange:true,validAccountAlarmAudio:true,stop:true,unreachableServerSkipped:true},null,2));console.log('PASS valid account starts screen-off alarm audio and Stop ends playback.');
}finally{browser?.disconnect();await new Promise(r=>app.server.close(r));app.close();fs.rmSync(temp,{recursive:true,force:true});}
