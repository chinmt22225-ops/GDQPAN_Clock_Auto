// Performance/stability/UX assessment of the official APK on GDQPAN_QA only.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),puppeteer=require('puppeteer-core');
const adbPath='D:/GDQPAN/android-build-tools/android-sdk/platform-tools/adb.exe',app='vn.gdqpan.app.mobile';
const version=process.env.GDQ_QA_VERSION||'1.4.0';
const label=process.env.GDQ_QA_LABEL||version;
const out=path.resolve(__dirname,'../qa/performance-'+label);fs.mkdirSync(out,{recursive:true});
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024,windowsHide:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results={version,startedAt:new Date().toISOString(),environment:{},startup:[],profiles:[],memory:[],checks:[],errors:[],findings:[],soak:{}};
let account,browser,page,port,token,temp,lastLog,nativeBounds;
async function tapNative(selector,edge=false){const hit=await page.$eval(selector,(e,edge)=>{const r=e.getBoundingClientRect();return {x:edge?r.x+3:r.x+r.width/2,y:r.y+r.height/2,scale:devicePixelRatio};},edge);assert(nativeBounds);adb('shell','input','tap',String(Math.round(nativeBounds.left+hit.x*hit.scale)),String(Math.round(nativeBounds.top+hit.y*hit.scale)));}
const check=(name,passed,details)=>{results.checks.push({name,passed,details});if(!passed)results.findings.push({name,details});console.log(passed?'PASS':'FINDING',name,JSON.stringify(details??''));};
async function attach(attempt=0){
  try{
  if(browser)await browser.disconnect();browser=null;
  let pid;for(let i=0;i<40;i++){try{pid=adb('shell','pidof',app).trim();if(pid)break;}catch{}await wait(250);}assert(pid,'APK main process exists');adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  for(let i=0;i<25;i++){try{browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});break;}catch{await wait(200);}}
  assert(browser);page=(await browser.pages()).find(p=>p.url().includes('localhost'));assert(page);
  page.on('pageerror',error=>results.errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.waitForFunction(()=>window.GdqMobile?.libraryReady&&window.GdqFixedMusic?.ready,{timeout:60000});
  let focused=false;for(let i=0;i<40;i++){if(/mCurrentFocus=.*vn\.gdqpan\.app\.mobile\/vn\.gdqpan\.app\.MainActivity/.test(adb('shell','dumpsys','window'))){focused=true;break;}await wait(250);}assert(focused,'MainActivity owns Android input focus');
  adb('shell','rm','-f','/sdcard/gdqpan-qa-ui.xml');adb('shell','uiautomator','dump','/sdcard/gdqpan-qa-ui.xml');const xml=adb('shell','cat','/sdcard/gdqpan-qa-ui.xml');const bounds=xml.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(bounds,'Native WebView bounds available');nativeBounds={left:Number(bounds[1]),top:Number(bounds[2])};
  }catch(error){if(attempt>=2)throw error;console.log('REATTACH after transient automation failure:',error.message);await wait(1000);return attach(attempt+1);}
}
async function login(){
  await page.waitForFunction(()=>document.getElementById('account-form')&&!document.getElementById('account-form').inert,{timeout:30000});
  await page.evaluate(port=>{document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='performance-qa@example.test';document.getElementById('account-password').value='Performance-QA-only-123';document.getElementById('account-form').requestSubmit();},port);
  await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});
}
function screenshot(name){fs.writeFileSync(path.join(out,name+'.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{timeout:20000,maxBuffer:16*1024*1024,windowsHide:true}));}
async function memory(stage){
  const pid=adb('shell','pidof',app).trim(),raw=adb('shell','dumpsys','meminfo',pid);fs.writeFileSync(path.join(out,stage+'-meminfo.txt'),raw);
  const cdp=await page.createCDPSession();await cdp.send('Performance.enable');await cdp.send('HeapProfiler.collectGarbage');const metrics=await cdp.send('Performance.getMetrics'),dom=await cdp.send('Memory.getDOMCounters');await cdp.detach();
  const values=Object.fromEntries(metrics.metrics.map(m=>[m.name,m.value]));
  const sample={stage,time:new Date().toISOString(),mainPssKB:Number(raw.match(/TOTAL PSS:\s*(\d+)/)?.[1]??raw.match(/^\s*TOTAL\s+(\d+)/m)?.[1]),jsHeapBytes:values.JSHeapUsedSize??null,dom};results.memory.push(sample);console.log('MEMORY',JSON.stringify(sample));return sample;
}
async function publish(schedules,autoPlay=false){
  const base='http://127.0.0.1:'+port,headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
  const current=await fetch(base+'/api/shared',{headers}).then(r=>r.json());
  const response=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({revision:current.revision,schedules,settings:{autoPlay,volume:.2,region:'bac_nu'},savedText:'Nội dung kiểm thử giả lập',customActions:[],disabledActions:[],files:[]})});assert(response.ok);
}
async function inspect(){return page.evaluate(()=>{
  const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&getComputedStyle(e).visibility!=='hidden';
  const nav=[...document.querySelectorAll('.mobile-nav button')].map(e=>({name:e.textContent.trim(),height:e.getBoundingClientRect().height}));
  const small=[...document.querySelectorAll('button,input,select,textarea')].filter(visible).filter(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().bottom<=innerHeight&&(e.closest('label')||e).getBoundingClientRect().height<44).map(e=>({id:e.id,text:e.textContent.trim().slice(0,50),height:e.getBoundingClientRect().height}));
  return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,nav,small};
});}
async function instrumentation(){await page.evaluate(()=>{
  window.__qaPerf={clicks:[],longTasks:[],frames:[],running:true};let last;
  const frame=t=>{if(last)window.__qaPerf.frames.push(t-last);last=t;if(window.__qaPerf.running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  document.addEventListener('click',e=>{if(!e.target.closest('.mobile-nav button'))return;const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__qaPerf.clicks.push(performance.now()-start)));},true);
  if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>window.__qaPerf.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:false});
});}
async function navigate(pageName){await tapNative('.mobile-nav [data-page="'+pageName+'"]');await page.waitForFunction(p=>GdqMobile.getPage()===p,{},pageName);}
(async()=>{
  assert(adb('emu','avd','name').includes('GDQPAN_QA'));assert.equal(adb('shell','getprop','sys.boot_completed').trim(),'1');
  adb('shell','am','force-stop',app);adb('shell','input','keyevent','224');adb('shell','wm','dismiss-keyguard');adb('shell','wm','size','reset');adb('shell','wm','density','reset');adb('shell','settings','put','system','font_scale','1.0');
  results.environment={avd:'GDQPAN_QA',model:adb('shell','getprop','ro.product.model').trim(),android:adb('shell','getprop','ro.build.version.release').trim(),api:adb('shell','getprop','ro.build.version.sdk').trim(),ramKB:adb('shell','cat','/proc/meminfo').match(/MemTotal:\s*(\d+)/)?.[1],gpu:adb('shell','dumpsys','SurfaceFlinger').split('\n').find(line=>line.startsWith('GLES:'))?.trim(),size:adb('shell','wm','size').trim(),density:adb('shell','wm','density').trim()};
  adb('shell','cmd','alarm','set-timezone','Asia/Bangkok');adb('logcat','-c');
  console.log('Installing official '+version+' APK on disposable emulator…');const ascii='D:/GDQPAN/android-build-tools/performance-'+version+'.apk';fs.copyFileSync(path.resolve(__dirname,'../GDQPAN-'+version+'.apk'),ascii);assert(adb('install','-r',ascii).includes('Success'));
  for(const permission of ['POST_NOTIFICATIONS','RECORD_AUDIO'])adb('shell','pm','grant',app,'android.permission.'+permission);
  for(const permission of ['SCHEDULE_EXACT_ALARM','USE_FULL_SCREEN_INTENT'])adb('shell','appops','set',app,permission,'allow');
  const {createApplication}=await import('../../server/src/server.js');temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-perf-'));
  account=createApplication({local:true,data:temp,origins:'https://localhost'});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));port=account.server.address().port;adb('reverse','tcp:'+port,'tcp:'+port);
  await account.createAdmin('performance-qa@example.test','Performance-QA-only-123');const auth=await fetch('http://127.0.0.1:'+port+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'performance-qa@example.test',password:'Performance-QA-only-123'})}).then(r=>r.json());token=auth.token;
  const baseline=Array.from({length:50},(_,i)=>({id:'qa-load-'+i,time:String(Math.floor(i/4)).padStart(2,'0')+':'+String((i%4)*15).padStart(2,'0'),days:[0,1,2,3,4,5,6],action:'Báo thức',on:true,text:''}));await publish(baseline);
  let persistedToken;for(let i=0;i<Number(process.env.GDQ_QA_STARTUP_RUNS||5);i++){
    if(i>0){persistedToken=await page.evaluate(()=>JSON.parse(localStorage.getItem('gdqpan_session')).token);if(i===1)await page.evaluate(()=>{const cached=JSON.parse(localStorage.getItem('gdqpan_session'));cached.token='qa-stale-web-token';localStorage.setItem('gdqpan_session',JSON.stringify(cached));});}
    adb('shell','am','force-stop',app);const started=Date.now(),native=adb('shell','am','start','-W','-n',app+'/vn.gdqpan.app.MainActivity');await attach();const readyMs=Date.now()-started;
    if(i===0)await login();else await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});
    if(i>0)check('Cold start '+(i+1)+' retains session',await page.evaluate(token=>JSON.parse(localStorage.getItem('gdqpan_session')).token===token,persistedToken));
    results.startup.push({run:i+1,nativeTotalMs:native.match(/TotalTime:\s*(\d+)/)?.[1] ? Number(native.match(/TotalTime:\s*(\d+)/)[1]) : null,nativeLaunchOutput:native,navigation:await page.evaluate(()=>performance.getEntriesByType('navigation')[0].toJSON()),uiReadyIncludingAutomationMs:readyMs,accountReadyIncludingAutomationMs:Date.now()-started});console.log('STARTUP',JSON.stringify(results.startup.at(-1)));
  }
  adb('shell','dumpsys','gfxinfo',app,'reset');await instrumentation();
  for(const profile of [{name:'small',size:'720x1280',density:'320'},{name:'large',size:'824x1830',density:'320'}]){
    adb('shell','am','force-stop',app);adb('shell','wm','size',profile.size);adb('shell','wm','density',profile.density);adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await attach();await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});await instrumentation();
    const checks=[];
    for(const destination of ['home','daily','audio','schedule','more']){await navigate(destination);await wait(100);const layout=await inspect();checks.push({page:destination,...layout});check(profile.name+' '+destination+' no horizontal overflow',layout.scrollWidth<=layout.width+1,layout.small);screenshot(profile.name+'-'+destination);}
    await page.evaluate(()=>GdqMobile.switchPage('audio'));const begin=Date.now();await page.evaluate(()=>openModalSheet('music','Tất cả nhạc'));await page.waitForFunction(()=>document.querySelectorAll('#modal-song-list .sheet-action-item').length===95);const modalOpenMs=Date.now()-begin;
    await page.$eval('#modal-song-list .sheet-action-item:last-child',e=>e.scrollIntoView({block:'center'}));const modal=await page.evaluate(()=>{const button=document.querySelector('#modal-song-list .sheet-action-item:last-child button'),r=button.getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,lastPlayHit:button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});check(profile.name+' library last row accessible',modal.lastPlayHit,modal);screenshot(profile.name+'-library');adb('shell','input','keyevent','4');await page.waitForFunction(()=>!document.getElementById('modal-overlay').classList.contains('active'));
    for(let i=0;i<30;i++)await navigate(['home','daily','audio','schedule','more'][i%5]);results.profiles.push({...profile,checks,modalOpenIncludingAutomationMs:modalOpenMs});
  }
  await page.evaluate(()=>GdqMobile.switchPage('audio'));check('Music category touch target at least 48px',await page.$eval('#mobile-music-category',e=>e.getBoundingClientRect().height>=48));
  await page.evaluate(()=>GdqMobile.switchPage('schedule'));const beforeSelection=await page.$eval('.mobile-schedule-select',e=>e.checked);const label=await page.$eval('.mobile-schedule-hit',e=>e.getBoundingClientRect().toJSON());await tapNative('.mobile-schedule-hit',true);check('Schedule label edge toggles selection',await page.$eval('.mobile-schedule-select',e=>e.checked)!==beforeSelection,{width:label.width,height:label.height});
  // A native Android keyboard, opened by a real touch in the custom-link screen.
  await page.evaluate(()=>GdqMobile.switchPage('custom'));await tapNative('#mobile-link-url');await wait(700);screenshot('keyboard-custom-link');check('Keyboard keeps link field in viewport',await page.$eval('#mobile-link-url',e=>e.getBoundingClientRect().bottom<=innerHeight));adb('shell','input','keyevent','4');
  adb('shell','settings','put','system','accelerometer_rotation','0');adb('shell','settings','put','system','user_rotation','1');await wait(800);await page.evaluate(()=>GdqMobile.switchPage('home'));check('Landscape no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));screenshot('landscape-home');adb('shell','settings','put','system','user_rotation','0');await wait(800);
  // Exercise recording on the emulator microphone; this does not assess real microphone quality.
  await page.evaluate(()=>{GdqMobile.switchPage('studio');switchNoticeTab('record');});await page.$eval('#btn-record-toggle',e=>e.scrollIntoView({block:'center'}));await page.evaluate(()=>{window.__qaMeterTicks=0;const original=VoiceRecorder.start;VoiceRecorder.start=(timer,meter,options)=>original(timer,pct=>{__qaMeterTicks++;meter?.(pct);},options);});
  await tapNative('#btn-record-toggle');
  let recording;try{await page.waitForFunction(()=>VoiceRecorder.isRecording(),{timeout:12000});await wait(3000);await tapNative('#btn-record-toggle');await page.waitForFunction(()=>!VoiceRecorder.isRecording()&&!!VoiceRecorder.getBlob(),{timeout:12000});recording=await page.evaluate(async()=>{const blob=VoiceRecorder.getBlob(),start=performance.now(),merged=await AudioEngine.mergeAudioTracks({bodySources:[blob,blob],pauseGap:.2});return {meterTicks:__qaMeterTicks,bytes:blob.size,mergedBytes:merged.blob.size,mergedSeconds:merged.duration,mergeMs:performance.now()-start};});check('Native WebView recording and WAV merge',recording.bytes>100&&recording.mergedBytes>1000&&recording.meterTicks>1,recording);}catch(error){check('Native WebView recording and WAV merge',false,error.message);screenshot('record-failure');console.log('RECORD DIAGNOSTIC',await page.evaluate(()=>document.body.innerText.slice(-2500)));}
  results.recording=recording;await page.evaluate(()=>GdqMobile.switchPage('home',false));await memory('baseline');
  // Five minutes of repeated navigation, music start/pause/resume/stop and library dialogs.
  const soakStart=Date.now(),end=soakStart+5*60*1000;let cycles=0;
  while(Date.now()<end){
    for(const destination of ['home','daily','audio','schedule','more'])await navigate(destination);
    await page.evaluate(()=>{const song=GdqMusicCatalog.songs[0];AudioEngine.playAudioUrl(song.url,song.name,{trackId:song.id,isMusicTrack:true});});await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='playing',{timeout:15000});await wait(300);await page.evaluate(()=>AudioEngine.pause());await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='paused');await page.evaluate(()=>AudioEngine.resume());await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='playing');await page.evaluate(()=>handleStopAll());
    await page.evaluate(()=>GdqFixedMusic.open('Biển đảo'));await page.waitForFunction(()=>document.querySelectorAll('#modal-song-list .sheet-action-item').length===10);await page.evaluate(()=>closeModal());cycles++;
    if(cycles%4===0)await memory('soak-'+cycles);if(cycles%2===0)console.log('SOAK',cycles,'cycles',Math.round((Date.now()-soakStart)/1000),'seconds');await wait(10000);
  }
  results.soak={seconds:(Date.now()-soakStart)/1000,cycles,navigationTaps:cycles*5,musicCycles:cycles};await memory('after-soak');
  results.gfxinfoSoak=adb('shell','dumpsys','gfxinfo',app);fs.writeFileSync(path.join(out,'gfxinfo-soak.txt'),results.gfxinfoSoak);
  results.frames=await page.evaluate(()=>{__qaPerf.running=false;return __qaPerf;});
  // Test temporary server unavailability (not just browser offline emulation).
  await new Promise(r=>account.server.close(r));const failed=await page.evaluate(()=>GdqAccount.authorize());check('Unavailable server blocks new playback',failed===false&&await page.evaluate(()=>GdqAccount.blocked));screenshot('server-unavailable');await new Promise(r=>account.server.listen(port,'127.0.0.1',r));const recovered=Date.now();await page.evaluate(()=>GdqAccount.refresh());await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:30000});results.serverRecoveryMs=Date.now()-recovered;check('Server recovery restores session',true,results.serverRecoveryMs);
  // Increased OS font scale: restart so Android applies the configuration to the WebView.
  adb('shell','settings','put','system','font_scale','1.3');adb('shell','am','force-stop',app);adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await attach();await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});await page.evaluate(()=>GdqMobile.switchPage('home',false));screenshot('font-130-home');check('OS font scale 1.3 no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  adb('shell','settings','put','system','font_scale','1.0');adb('shell','am','force-stop',app);adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await attach();await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});
  // Publish an authorized QA alarm, then verify real native foreground playback when locked.
  const alarm=await page.evaluate(()=>{const next=new Date();next.setSeconds(0,0);next.setMinutes(next.getMinutes()+1);if(next-Date.now()<20000)next.setMinutes(next.getMinutes()+1);return {id:'qa-performance-alarm',time:String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0'),days:[next.getDay()],action:'Báo thức',text:'',on:true,target:next.getTime()};});await publish([alarm],true);await page.evaluate(()=>GdqAccount.refresh());await wait(700);check('Shared autoplay remains enabled after volume refresh',await page.evaluate(()=>StorageManager.getSettings().autoPlay===true));const permissions=await page.evaluate(()=>GdqMobile.syncAlarms());check('Native alarm remains armed after shared refresh',permissions.count===1,permissions);results.alarm={...alarm,permissions};
  adb('shell','input','keyevent','3');adb('shell','input','keyevent','223');console.log('ALARM waiting until',alarm.time);
  const deadline=alarm.target+20000;let playing=false;
  while(Date.now()<deadline){const services=adb('shell','dumpsys','activity','services',app);if(services.includes('AlarmPlaybackService')&&services.includes('isForeground=true')){playing=true;break;}await wait(1500);}
  await wait(1500);check('Locked-screen alarm foreground service',playing);if(playing){screenshot('locked-alarm');let audio,audioStarted=false;const audioDeadline=Date.now()+12000;while(Date.now()<audioDeadline){audio=adb('shell','dumpsys','audio');if(/state:started[\s\S]{0,300}USAGE_ALARM/.test(audio)){audioStarted=true;break;}await wait(300);}fs.writeFileSync(path.join(out,'alarm-audio.txt'),audio);check('Real Android alarm audio player started',audioStarted);await page.evaluate(()=>Capacitor.registerPlugin('GdqAlarm').stop());await page.waitForFunction(async()=>!(await Capacitor.registerPlugin('GdqAlarm').status()).playing,{timeout:5000});check('Stop ends native alarm',true);}
  await publish(baseline,false);adb('shell','input','keyevent','224');adb('shell','input','keyevent','82');adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await wait(500);await page.evaluate(()=>GdqAccount.refresh());
  const logcat=adb('logcat','-d').replace(/"(token|password)"\s*:\s*"[^"]*"/gi,'"$1":"[redacted]"').replace(/Bearer [a-f0-9]{64}/gi,'Bearer [redacted]');fs.writeFileSync(path.join(out,'logcat.txt'),logcat);const crash=logcat.split('\n').filter(line=>/FATAL EXCEPTION|ANR in vn.gdqpan|Fatal signal|has died/.test(line)&&/gdqpan|chromium|WebView/.test(line));results.crashCandidates=crash;check('No captured JS errors',results.errors.length===0,results.errors);check('No fatal app/renderer crash or ANR',crash.filter(line=>!/has died/.test(line)).length===0,crash);
  results.gfxinfo=adb('shell','dumpsys','gfxinfo',app);fs.writeFileSync(path.join(out,'gfxinfo.txt'),results.gfxinfo);results.endedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('ASSESSMENT COMPLETE',JSON.stringify({startup:results.startup,soak:results.soak,findings:results.findings,memory:results.memory}));
})().catch(error=>{results.errors.push(error.message);results.fatal=error.stack;console.error(error);try{screenshot('failure');}catch{}}).finally(async()=>{
  if(results.fatal||results.findings.length)process.exitCode=1;
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));try{adb('shell','wm','size','reset');adb('shell','wm','density','reset');adb('shell','settings','put','system','font_scale','1.0');adb('shell','settings','put','system','user_rotation','0');}catch{}
  if(page)try{await page.evaluate(()=>Capacitor.registerPlugin('GdqAccount').configure({token:''}));}catch{}
  if(browser)await browser.disconnect();if(account){if(account.server.listening)await new Promise(r=>account.server.close(r));account.close();}if(temp){assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
});
