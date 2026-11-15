// Benign, local-only release review. Uses GDQPAN_QA and a disposable account server.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),puppeteer=require('puppeteer-core');
const version=process.env.GDQ_QA_VERSION||'1.4.0',app='vn.gdqpan.app.mobile',adbPath='D:/GDQPAN/android-build-tools/android-sdk/platform-tools/adb.exe';
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:120000,windowsHide:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),out=path.resolve(__dirname,'../qa/release-audit-'+version+(process.env.GDQ_QA_LABEL?'-'+process.env.GDQ_QA_LABEL:''));fs.mkdirSync(out,{recursive:true});
const result={version,startedAt:new Date().toISOString(),findings:[],checks:[],errors:[]};let account,temp,browser,page,port,token;
(async()=>{try{
  assert(adb('emu','avd','name').includes('GDQPAN_QA'));assert(adb('shell','dumpsys','package',app).includes('versionName='+version));
  adb('shell','pm','grant',app,'android.permission.RECORD_AUDIO');
  const {createApplication}=await import('../../server/src/server.js');temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-android-audit-'));account=createApplication({local:true,data:temp,origins:'https://localhost'});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));port=account.server.address().port;
  adb('reverse','tcp:'+port,'tcp:'+port);await account.createAdmin('release-audit@example.test','Release-audit-QA-only-123');const auth=await fetch('http://127.0.0.1:'+port+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'release-audit@example.test',password:'Release-audit-QA-only-123'})}).then(r=>r.json());token=auth.token;
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},base='http://127.0.0.1:'+port;
  async function publish(changes){const current=await fetch(base+'/api/shared',{headers}).then(r=>r.json());const r=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...current,...changes})});assert(r.ok);}
  await publish({settings:{autoPlay:false,volume:.2,region:'bac_nu'}});
  adb('shell','am','force-stop',app);adb('shell','input','keyevent','224');adb('shell','wm','dismiss-keyguard');adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');
  let pid;for(let i=0;i<40;i++){try{pid=adb('shell','pidof',app).trim();if(pid)break;}catch{}await wait(250);}assert(pid);adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  for(let i=0;i<40;i++){try{browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});break;}catch{await wait(250);}}assert(browser);
  page=(await browser.pages()).find(p=>p.url().includes('localhost'));assert(page);page.on('pageerror',e=>result.errors.push(e.message));
  if(process.env.GDQ_QA_LOCAL_CONFIG==='1'){
    await page.setRequestInterception(true);
    page.on('request',request=>request.url().endsWith('/assets/server-config.js')?request.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'}):request.continue());
    await page.reload({waitUntil:'load'});
  }
  await page.waitForFunction(()=>window.GdqMobile?.libraryReady&&document.getElementById('account-form')&&!document.getElementById('account-form').inert,{timeout:60000});
  if(version.includes('demo')){result.defaultServer=await page.$eval('#account-server',el=>el.value);assert.equal(result.defaultServer,'https://hethongtruyenthongso-demo.onrender.com');}
  await page.evaluate(port=>{window.confirm=()=>true;document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='release-audit@example.test';document.getElementById('account-password').value='Release-audit-QA-only-123';document.getElementById('account-form').requestSubmit();},port);
  await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:45000});await wait(700);
  if(process.env.GDQ_QA_MONTHLY==='1'){
    const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../qa/music-catalog-build.json'),'utf8'));
    await page.evaluate(()=>GdqMobile.switchPage('audio'));
    const songs=await page.evaluate(()=>StorageManager.getAllSongs());
    assert.equal(songs.length,catalog.songs.length+2);assert.equal(new Set(songs.map(s=>s.id)).size,songs.length);
    result.monthlyMusic={total:songs.length,months:[]};
    const categories=await page.$$eval('#mobile-music-category option',els=>els.map(el=>el.value));
    for(let month=1;month<=12;month++){
      const category='Nhạc tháng '+month,expected=catalog.songs.filter(s=>s.category===category);assert(categories.includes(category));assert(expected.length);
      await page.select('#mobile-music-category',category);await page.evaluate(c=>GdqFixedMusic.open(c),category);
      await page.waitForFunction(n=>document.querySelectorAll('#modal-song-list .sheet-action-item').length===n,{},expected.length);
      await page.evaluate(song=>{void AudioEngine.playAudioUrl(song.url,song.name,{trackId:song.id,isMusicTrack:true});},expected[0]);
      await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='playing',{timeout:15000});
      await page.evaluate(()=>handleStopAll(true));result.monthlyMusic.months.push({month,tracks:expected.length,playback:true});
      if(month===12)await page.screenshot({path:path.join(out,'monthly-music.png')});
      await page.evaluate(()=>closeModal());console.log('PASS native month',month);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.evaluate(()=>openModalSheet('settings'));await page.waitForSelector('#modal-content #account-bar',{visible:true});
  result.accountSettings=await page.evaluate(()=>{const p=document.getElementById('account-bar'),r=p.getBoundingClientRect();return {mounted:!!p.closest('#modal-content')&&!p.hidden,withinViewport:r.left>=0&&r.right<=innerWidth,studioRemoved:!document.getElementById('account-upload-studio')&&!document.getElementById('gdq-studio-library')};});
  assert(Object.values(result.accountSettings).every(Boolean));await page.screenshot({path:path.join(out,'account-settings.png')});
  await page.evaluate(()=>document.getElementById('account-open').click());await page.waitForSelector('#account-overlay.visible');
  await page.evaluate(()=>GdqAccount.refresh());
  await page.evaluate(()=>closeModal());await page.waitForFunction(()=>document.getElementById('account-bar')?.closest('#account-parking'));
  await page.evaluate(()=>openModalSheet('settings'));await page.waitForSelector('#modal-content #account-bar',{visible:true});await page.evaluate(()=>closeModal());
  const schedules=[{id:'qa-review-schedule',time:'23:58',days:[0,1,2,3,4,5,6],action:'Báo thức',on:true,text:''}];const expected={autoPlay:true,volume:.35,region:'nam_nam'};
  await publish({schedules,settings:expected});await page.evaluate(()=>GdqAccount.refresh());await wait(900);
  result.settings=await page.evaluate(async()=>({actual:StorageManager.getSettings(),checkbox:document.getElementById('mobile-auto-play').checked,native:await GdqMobile.syncAlarms()}));result.settings.expected=expected;
  if(result.settings.actual.autoPlay!==true||result.settings.actual.region!==expected.region)result.findings.push({severity:'high',name:'Shared settings overwritten after delayed volume save',nativeAlarmCount:result.settings.native?.count});
  result.recorder=await page.evaluate(async()=>{try{await VoiceRecorder.start();const started=VoiceRecorder.isRecording();await new Promise(r=>setTimeout(r,500));const blob=await VoiceRecorder.stop();return {started,bytes:blob?.size};}catch(e){return {started:false,error:e.message,name:e.name};}});
  if(!result.recorder.started)result.findings.push({severity:'high',name:'Microphone recorder cannot start despite granted RECORD_AUDIO',details:result.recorder.error});
  await publish({schedules:schedules.map(s=>({...s,text:'<img src="qa-missing-image" onerror="window.__gdqScheduleInjected=true">'}))});await page.evaluate(()=>GdqAccount.refresh());await wait(300);
  result.scheduleContentInjection=await page.evaluate(()=>!!window.__gdqScheduleInjected);
  if(result.scheduleContentInjection)result.findings.push({severity:'high',name:'Shared schedule text executes JavaScript',condition:'Authenticated QA admin; harmless boolean marker only'});
  const harmlessName=`<img src="qa-missing-image" onerror="window.__gdqReview={injected:true,sessionPresent:!!localStorage.getItem('gdqpan_session'),nativeBridge:!!window.Capacitor}">`;
  await publish({customActions:[{name:harmlessName,group:'chao',icon:'⭐'}]});await page.evaluate(()=>GdqAccount.refresh());await wait(400);result.sharedContentInjection=await page.evaluate(()=>window.__gdqReview||{injected:false});
  if(result.sharedContentInjection.injected)result.findings.push({severity:'high',name:'Shared action name executes JavaScript',condition:'Authenticated QA admin supplied shared data; only boolean markers; session presence checked, no token values retained/exported and no native command'});
  await page.evaluate(()=>openModalSheet('action_sound',StorageManager.getCustomActions()[0].name));await wait(300);result.actionModalInjection=await page.evaluate(()=>!!window.__gdqReview?.injected);await page.evaluate(()=>closeModal());
  if(result.actionModalInjection&&!result.sharedContentInjection.injected)result.findings.push({severity:'high',name:'Shared action name executes JavaScript when sound modal opens',condition:'Authenticated QA admin; session presence checked, no token values exported/native command'});
  await publish({settings:{autoPlay:false,volume:.2,region:'bac_nu'},schedules:[],customActions:[]});await page.evaluate(()=>GdqAccount.refresh());
  result.endedAt=new Date().toISOString();console.log(JSON.stringify(result,null,2));
}catch(e){result.fatal=e.stack;console.error(e.message);process.exitCode=1;}finally{
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));if(browser)await browser.disconnect();if(account){await new Promise(r=>account.server.close(r));account.close();}if(port)adb('reverse','--remove','tcp:'+port);if(temp){assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
}})();
