// Integration checks run ONLY against the disposable GDQPAN_QA emulator.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const puppeteer=require('puppeteer-core');
const tools='D:/GDQPAN/android-build-tools',adbPath=tools+'/android-sdk/platform-tools/adb.exe';
const app='vn.gdqpan.app.mobile',out=path.resolve(__dirname,'../qa');fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:60000,windowsHide:true});
(async()=>{
  assert.equal(adb('shell','getprop','sys.boot_completed').trim(),'1');
  const updating=adb('shell','pm','list','packages',app).includes('package:'+app);
  if(updating)adb('shell','run-as',app,'touch','files/qa-update-marker');
  fs.copyFileSync(path.resolve(__dirname,'../GDQPAN-1.2.1.apk'),tools+'/GDQPAN-1.2.1.apk');
  console.log('Installing original APK and separate GDQPAN 1.2 APK on QA emulator…');
  console.log(adb('install','-r','D:/GDQPAN/GDQPAN.apk').trim());
  console.log(adb('install','-r',tools+'/GDQPAN-1.2.1.apk').trim());
  if(updating)assert(adb('shell','run-as',app,'ls','files').includes('qa-update-marker'),'Updating preserves private app files');
  const installed=adb('shell','pm','list','packages','vn.gdqpan').split(/\r?\n/).map(s=>s.trim());
  assert(installed.includes('package:vn.gdqpan.app')&&installed.includes('package:'+app),'Both apps are installed independently: '+installed.join(', '));
  adb('shell','pm','grant',app,'android.permission.POST_NOTIFICATIONS');
  adb('shell','pm','grant',app,'android.permission.RECORD_AUDIO');
  adb('shell','appops','set',app,'SCHEDULE_EXACT_ALARM','allow');
  adb('shell','appops','set',app,'USE_FULL_SCREEN_INTENT','allow');
  adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');
  adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await wait(5000);
  const pid=adb('shell','pidof',app).trim();assert(pid);
  adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});
  try{
    const pages=await browser.pages(),page=pages.find(p=>p.url().includes('localhost'));assert(page,'App WebView is available');
    await page.waitForFunction(()=>!!window.GdqMobile,{timeout:30000});
    const runtime=await page.evaluate(()=>({platform:Capacitor.getPlatform(),alarm:Capacitor.isPluginAvailable('GdqAlarm'),tts:Capacitor.isPluginAvailable('TextToSpeech'),speech:Capacitor.isPluginAvailable('GdqSpeech'),viewport:innerWidth}));
    assert.equal(runtime.platform,'android');assert(runtime.alarm&&runtime.tts&&runtime.speech);
    await page.evaluate(()=>{window.qaSpeech=null;Capacitor.registerPlugin('GdqSpeech').recognize().then(r=>window.qaSpeech=r).catch(e=>window.qaSpeech={unavailable:e.message});});
    await wait(2000);
    const speechActivity=adb('shell','dumpsys','activity','activities');
    if(!await page.evaluate(()=>!!window.qaSpeech))adb('shell','input','keyevent','4');
    await page.waitForFunction(()=>!!window.qaSpeech,{timeout:15000});
    const speech=await page.evaluate(()=>window.qaSpeech);assert(speech.cancelled||speech.unavailable||typeof speech.text==='string');
    fs.writeFileSync(path.join(out,'android-speech.json'),JSON.stringify({result:speech,activity:speechActivity.match(/topResumedActivity[^\n]*/)?.[0]},null,2));
    console.log('Native speech recognizer launch/cancel or unsupported-device handling:',JSON.stringify(speech));
    console.log('Native bridge confirmed',JSON.stringify(runtime));
    // Capture the native surface; CDP screenshot can destabilize the emulator renderer.
    fs.writeFileSync(path.join(out,'android-home.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{timeout:10000,windowsHide:true}));
    // Exercise native export to public Downloads.
    const saved=await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').saveDownload({name:'GDQPAN-QA.json',mime:'application/json',data:btoa('{"qa":true}')}));
    assert(saved.location.includes('GDQPAN-QA.json'));
    assert(adb('shell','ls','/sdcard/Download').includes('GDQPAN-QA.json'));
    const schedule=await page.evaluate(async()=>{
      const now=new Date(),next=new Date(now);next.setSeconds(0,0);next.setMinutes(next.getMinutes()+1);
      if(next-now<15000)next.setMinutes(next.getMinutes()+1);
      const time=String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0');
      StorageManager.saveSettings({...StorageManager.getSettings(),autoPlay:true,volume:0.3});
      StorageManager.saveSchedules([{id:'qa-screen-off',time,days:[next.getDay()],on:true,action:'Báo thức',text:''}]);
      const synced=await window.GdqMobile.syncAlarms();
      const state=await Capacitor.registerPlugin('GdqAlarm').status();
      return {time,delay:next-now,exact:state.exact,target:next.getTime(),count:synced?.count,fullScreen:synced?.fullScreen,notifications:synced?.notifications};
    });
    assert(schedule.exact,'Exact alarm permission is granted');
    assert(schedule.fullScreen&&schedule.notifications,'Full-screen alarm and notifications are allowed');
    assert.equal(schedule.count,1,'Exactly one native QA alarm registered');
    const pending=adb('shell','dumpsys','alarm');fs.writeFileSync(path.join(out,'android-alarm-pending.txt'),pending);assert(pending.includes(app)&&pending.includes('vn.gdqpan.ALARM'),'AlarmManager contains scheduled alarm');
    adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');await wait(2000);
    const power=adb('shell','dumpsys','power');fs.writeFileSync(path.join(out,'android-screen-off.txt'),power);
    assert(/mWakefulness=Asleep|mInteractive=false/.test(power),'Screen is asleep');
    console.log('Screen locked; native alarm due at',schedule.time,'in',Math.round(schedule.delay/1000),'seconds');
    let services='',started=false;
    const deadline=Date.now()+schedule.delay+20000;
    while(Date.now()<deadline){services=adb('shell','dumpsys','activity','services',app);if(services.includes('AlarmPlaybackService')&&services.includes('isForeground=true')){started=true;break;}await wait(1000);}
    assert(started,'Alarm service starts in foreground while WebView is backgrounded and screen is off');
    fs.writeFileSync(path.join(out,'android-alarm-service.txt'),services);
    await wait(3000);
    const audio=adb('shell','dumpsys','audio');fs.writeFileSync(path.join(out,'android-alarm-audio.txt'),audio);
    assert(/state:started.*usage=USAGE_ALARM|state:started[\s\S]{0,300}USAGE_ALARM/.test(audio),'Android audio player is started with alarm usage');
    const nativeLogs=adb('shell','run-as',app,'cat','shared_prefs/gdqpan-native-alarms.xml');fs.writeFileSync(path.join(out,'android-native-state.xml'),nativeLogs);
    // UI polling may already have drained native log entries into the desktop log store.
    assert(!nativeLogs.includes('Lỗi âm thanh')&&!nativeLogs.includes('Không thể mở âm thanh'),'No native file playback error');
    const activity=adb('shell','dumpsys','activity','activities');fs.writeFileSync(path.join(out,'android-alarm-activity.txt'),activity);
    assert(/mResumedActivity[^\n]*AlarmActivity|topResumedActivity[^\n]*AlarmActivity/.test(activity),'Full-screen alarm is the resumed activity');
    fs.writeFileSync(path.join(out,'android-alarm-screen.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{timeout:10000,windowsHide:true}));
    adb('shell','uiautomator','dump','/sdcard/gdqpan-alarm-ui.xml');const ui=adb('shell','cat','/sdcard/gdqpan-alarm-ui.xml');
    const stopNode=ui.match(/<node[^>]*text="DỪNG BÁO THỨC"[^>]*>/);assert(stopNode,'Native Stop button is visible');
    const bounds=stopNode[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(bounds);
    adb('shell','input','tap',String(Math.round((+bounds[1]+ +bounds[3])/2)),String(Math.round((+bounds[2]+ +bounds[4])/2)));await wait(1000);
    const stopped=await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').status());assert(!stopped.playing,'Alarm screen Stop ends native playback');
    console.log('PASS screen-off alarm opens AlarmActivity, starts real Android alarm audio and Stop ends playback');
    adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await wait(2000);
    await page.evaluate(async()=>{StorageManager.saveSchedules([]);await window.GdqMobile.syncAlarms();});
    fs.writeFileSync(path.join(out,'android-results.json'),JSON.stringify({android:adb('shell','getprop','ro.build.version.release').trim(),sideBySide:true,updatePreservesFiles:updating,runtime,speech,exportDownload:true,schedule,screenOff:true,fullScreenActivity:true,nativeForegroundPlayback:true,alarmAudioStarted:true,stop:true},null,2));
    console.log('PASS native export, independent install, screen-off alarm and Stop');
  }finally{browser.disconnect();}
})().catch(e=>{console.error(e);try{fs.writeFileSync(path.join(out,'android-error-logcat.txt'),adb('logcat','-d','-t','600'));}catch{}process.exitCode=1;});
