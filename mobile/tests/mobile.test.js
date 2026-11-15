const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const puppeteer=require('puppeteer-core');
const os=require('node:os');
let accountApp,accountTemp;
const root=path.resolve(__dirname,'../www');
const output=path.resolve(__dirname,process.env.GDQ_QA_OUTPUT||'../qa');fs.mkdirSync(output,{recursive:true});
const executable=process.env.CHROME_BIN || ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4'};
  if(!fs.existsSync(file)){if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port;
  const {createApplication}=await import('../../server/src/server.js');accountTemp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-mobile-regression-'));
  accountApp=createApplication({local:true,data:accountTemp,origins:url});await new Promise(r=>accountApp.server.listen(0,'127.0.0.1',r));const accountUrl='http://127.0.0.1:'+accountApp.server.address().port;
  await accountApp.createAdmin('regression-admin@example.test','Regression-only-password-123');
  const login=await fetch(accountUrl+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'regression-admin@example.test',password:'Regression-only-password-123'})}).then(r=>r.json());
  await fetch(accountUrl+'/api/shared',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+login.token},body:JSON.stringify({revision:0,schedules:[{id:'baseline',time:'09:00',days:[0,1,2,3,4,5,6],action:'Báo thức',on:true,text:''}],settings:{autoPlay:true,volume:.3,region:'bac_nu'},savedText:'',customActions:[],disabledActions:[],files:[]})});
  const browser=await puppeteer.launch({executablePath:executable,headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  const results=[];let lastPage;
  try{
    for(const [width,height] of [[360,640],[412,915],[820,1180]]){
      const current=await fetch(accountUrl+'/api/shared',{headers:{Authorization:'Bearer '+login.token}}).then(r=>r.json());current.schedules=[{id:'baseline',time:'09:00',days:[0,1,2,3,4,5,6],action:'Báo thức',on:true,text:''}];
      await fetch(accountUrl+'/api/shared',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+login.token},body:JSON.stringify(current)});
      const context=await browser.createBrowserContext();
      await context.overridePermissions(url,['microphone']);
      const page=await context.newPage();lastPage=page;await page.setViewport({width,height,isMobile:true,hasTouch:true});
      // Center controls before pointer input so the fixed bottom navigation cannot intercept them.
      const pointerClick=page.click.bind(page);
      page.click=async(selector,...args)=>{
        await page.$eval(selector,e=>e.scrollIntoView({block:'center',inline:'nearest'}));
        await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        return pointerClick(selector,...args);
      };
      const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url()));page.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url());});
      await page.setRequestInterception(true);
      page.on('request',request=>{
        if(request.url().endsWith('/assets/server-config.js'))return request.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'});
        if(process.env.GDQ_UI_BASELINE==='1'&&request.url().endsWith('/mobile-reference.css'))return request.respond({contentType:'text/css',body:''});
        return request.continue();
      });
      await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.GdqMobile?.libraryReady);await new Promise(r=>setTimeout(r,1500));
      await page.evaluate(({accountUrl})=>{document.getElementById('account-server').value=accountUrl;document.getElementById('account-email').value='regression-admin@example.test';document.getElementById('account-password').value='Regression-only-password-123';document.getElementById('account-form').requestSubmit();},{accountUrl});await page.waitForFunction(()=>GdqAccount.blocked===false);
      assert.equal(await page.$$eval('.mobile-nav button',e=>e.length),5);
      assert.equal(await page.$eval('#mobile-next-time',e=>e.textContent.trim()!=='—'),true);
      assert(await page.evaluate(()=>typeof VoiceRecorder!=='undefined'&&typeof AudioEngine?.mergeAudioTracks==='function'&&typeof TTSEngine!=='undefined'));
      for(const tab of ['home','daily','audio','schedule','more']){
        await page.tap(`.mobile-nav [data-page="${tab}"]`);await page.waitForFunction(t=>window.GdqMobile.getPage()===t,{},tab);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Horizontal overflow at '+width+' / '+tab);
        assert.equal(await page.$$eval('.mobile-nav button',els=>els.every(e=>e.getBoundingClientRect().height>=48)),true);
        await page.screenshot({path:path.join(output,`${width}-${tab}.png`),fullPage:true});
      }
      await page.evaluate(()=>GdqMobile.switchPage('home'));
      await page.click('[data-destination="studio"]');
      assert.equal(await page.evaluate(()=>GdqMobile.getPage()),'studio');
      assert(await page.$eval('[data-mobile-page="studio"]',e=>e.getBoundingClientRect().height>0));
      assert(await page.$eval('#panel-music-section',e=>e.getBoundingClientRect().height===0),'Studio is separate from music');
      await page.screenshot({path:path.join(output,`${width}-studio.png`),fullPage:true});
      await page.evaluate(()=>GdqMobile.switchPage('audio'));
      assert(await page.$eval('[data-mobile-page="studio"]',e=>e.getBoundingClientRect().height===0),'Music does not contain the studio');
      await page.select('#mobile-music-category','Nhạc tháng 10');
      await page.waitForFunction(()=>document.getElementById('music-track-list-desktop').textContent.includes('Nhạc tháng 10'));
      await page.evaluate(()=>openModalSheet('music','Nhạc tháng 10'));
      await page.waitForSelector('#modal-song-list');
      assert.equal(await page.$$('#song-category-select').then(e=>e.length),0,'Published library has no upload/category editing controls');
      await page.evaluate(()=>closeModal());
      for(const subpage of ['studio','custom','vtv']){
        await page.evaluate(p=>GdqMobile.switchPage(p),subpage);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow on '+subpage);
      }
      await page.evaluate(()=>GdqMobile.switchPage('custom'));
      await page.type('#mobile-link-url','https://www.youtube.com/watch?v=test');
      await page.click('#mobile-link-form button');
      assert(await page.$eval('#mobile-link-status',e=>e.textContent.includes('video YouTube cụ thể')));
      const youtubeRoute=await page.evaluate(async()=>{
        const native=Capacitor.isNativePlatform,register=Capacitor.registerPlugin;let opened;
        try {
          Capacitor.isNativePlatform=()=>true;
          Capacitor.registerPlugin=name=>name==='GdqAlarm'?{closeVtv:async()=>{},openVtv:async args=>{opened=args.url;}}:register(name);
          document.getElementById('mobile-link-url').value='https://youtu.be/dQw4w9WgXcQ?t=30';
          await document.getElementById('mobile-link-form').onsubmit({preventDefault(){}});
          return opened;
        }finally{Capacitor.isNativePlatform=native;Capacitor.registerPlugin=register;}
      });
      assert.equal(youtubeRoute,'https://www.youtube.com/watch?v=dQw4w9WgXcQ','YouTube links route to native video viewer after authorization');
      if(width===360){
        await page.$eval('#mobile-link-url',(e,url)=>e.value=url,url+'/Sound/'+encodeURIComponent('báo thức.mp3'));
        await page.click('#mobile-link-form button');
        await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='playing');
        await page.evaluate(()=>handleStopAll());
        assert.equal(await page.evaluate(()=>AudioEngine.getCurrentPlaybackState()),'stopped');
      }
      await page.tap('.mobile-nav [data-page="schedule"]');
      const count=await page.evaluate(()=>StorageManager.getSchedules().length);
      assert.equal(await page.$eval('#mobile-schedule-form',e=>e.open),false);
      await page.click('#mobile-schedule-add');
      await page.waitForFunction(()=>document.getElementById('mobile-schedule-form').open);
      await page.screenshot({path:path.join(output,`${width}-schedule-form.png`)});
      await page.$$eval('.mobile-days input',els=>els.forEach(e=>e.checked=e.value==='1'||e.value==='5'));
      await page.$eval('#sch-time-input',e=>{e.value='23:58';e.dispatchEvent(new Event('change',{bubbles:true}));});
      await page.select('#sch-action-select','Báo thức');await page.$eval('#btn-add-schedule',e=>e.scrollIntoView({block:'center'}));await page.click('#btn-add-schedule');
      await page.waitForFunction(n=>StorageManager.getSchedules().length===n+1,{},count);
      assert.deepEqual(await page.evaluate(()=>StorageManager.getSchedules().find(s=>s.time==='23:58').days),[1,5]);
      page.once('dialog',d=>d.accept());await page.evaluate(()=>GdqAccount.publish());
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!!window.GdqMobile);
      await page.waitForFunction(()=>GdqAccount.blocked===false);
      assert.equal(await page.evaluate(()=>StorageManager.getSchedules().length),count+1,'Schedule persists after reload');
      await page.tap('.mobile-nav [data-page="schedule"]');
      await page.click('.mobile-schedule-row:first-child .mobile-schedule-toggle');
      await page.waitForFunction(()=>document.querySelector('.mobile-schedule-toggle').getAttribute('aria-checked')==='false');
      await page.click('.mobile-schedule-row:first-child .mobile-schedule-toggle');
      await page.click('#sch-select-all');
      assert(await page.$$eval('.mobile-schedule-select',els=>els.every(e=>e.checked)),'Select-all preserves bulk selection');
      await page.click('#sch-select-all');
      await page.$eval('.mobile-schedule-row:last-child .mobile-schedule-edit',e=>e.scrollIntoView({block:'center'}));await page.click('.mobile-schedule-row:last-child .mobile-schedule-edit');
      await page.$$eval('.mobile-days input',els=>els.forEach(e=>e.checked=e.value==='2'));
      await page.$eval('#sch-time-input',e=>e.value='23:40');await page.$eval('#btn-add-schedule',e=>e.scrollIntoView({block:'center'}));await page.click('#btn-add-schedule');
      await page.waitForFunction(()=>StorageManager.getSchedules().some(s=>s.time==='23:40'));
      await page.waitForFunction(()=>!document.getElementById('mobile-schedule-form').open);
      await new Promise(r=>setTimeout(r,150));
      assert.deepEqual(await page.evaluate(()=>StorageManager.getSchedules().find(s=>s.time==='23:40').days),[2]);
      await page.$eval('.mobile-schedule-row:last-child .mobile-schedule-edit',e=>e.scrollIntoView({block:'center'}));await page.click('.mobile-schedule-row:last-child .mobile-schedule-edit');
      await page.waitForFunction(()=>document.getElementById('mobile-schedule-form').open&&!document.getElementById('mobile-schedule-delete').hidden);
      page.once('dialog',d=>d.accept());await page.click('#mobile-schedule-delete');
      await page.waitForFunction(n=>StorageManager.getSchedules().length===n,{},count);
      await page.tap('.mobile-nav [data-page="more"]');
      const logs=await page.evaluate(()=>StorageManager.getLogs().length);
      page.once('dialog',d=>d.dismiss());await page.click('.footerbar .emergency');
      assert.equal(await page.evaluate(()=>StorageManager.getLogs().length),logs);
      const audio=await page.evaluate(async()=>{const r=await fetch('Sound/'+encodeURIComponent('báo thức.mp3'));const ctx=new AudioContext();const buffer=await ctx.decodeAudioData(await r.arrayBuffer());const result={duration:buffer.duration,channels:buffer.numberOfChannels};await ctx.close();return result;});
      assert(audio.duration>0&&audio.channels>0);
      if(width===360){
        await page.evaluate(()=>GdqMobile.switchPage('studio'));
        await page.evaluate(()=>{
          document.getElementById('tts-input-desktop').value='Nội dung đang có';
          window.SpeechRecognition=class {start(){setTimeout(()=>{this.onresult?.({results:[[{transcript:'Bản chép lời thử'}]]});this.onend?.();},10);}abort(){this.onend?.();}};
        });
        await page.$eval('#mobile-speech-start',e=>e.scrollIntoView({block:'center'}));await page.click('#mobile-speech-start');
        await page.waitForFunction(()=>document.getElementById('mobile-speech-review').open);
        assert.equal(await page.$eval('#tts-input-desktop',e=>e.value),'Nội dung đang có','Recognition cannot replace draft before review');
        await page.$eval('#mobile-speech-text',e=>e.value='Bản chép lời đã sửa');await page.click('#mobile-speech-insert');
        assert.equal(await page.$eval('#tts-input-desktop',e=>e.value),'Nội dung đang có\nBản chép lời đã sửa','Edited transcript appends to existing draft');
        await page.click('#mobile-speech-start');await page.waitForFunction(()=>document.getElementById('mobile-speech-review').open);await page.click('#mobile-speech-cancel');
        assert.equal(await page.$eval('#tts-input-desktop',e=>e.value),'Nội dung đang có\nBản chép lời đã sửa','Cancelling preserves draft');
        console.log('PASS voice transcript review, edit, append and cancel (recognizer stub; no accuracy claim)');
        await page.$eval('[data-tab="record"]',e=>e.scrollIntoView({block:'center'}));await page.click('[data-tab="record"]');
        await page.$eval('#btn-record-toggle',e=>e.scrollIntoView({block:'center'}));await page.click('#btn-record-toggle');
        await page.waitForFunction(()=>VoiceRecorder.isRecording());await new Promise(r=>setTimeout(r,1200));
        await page.click('#btn-record-toggle');await page.waitForFunction(()=>!VoiceRecorder.isRecording()&&!!VoiceRecorder.getBlob());
        const recording=await page.evaluate(()=>({size:VoiceRecorder.getBlob().size,play:!document.getElementById('btn-play-recorded').disabled}));
        assert(recording.size>100&&recording.play,'Real recording through fake microphone input');
        const merged=await page.evaluate(async()=>{
          const result=await AudioEngine.mergeAudioTracks({introSource:null,bodySources:[VoiceRecorder.getBlob(),VoiceRecorder.getBlob()],pauseGap:0.2});
          return {size:result.blob.size,type:result.blob.type,duration:result.duration};
        });
        assert(merged.size>1000&&merged.duration>1&&merged.type.includes('wav'),'Real recording decoded and exported as merged WAV');
        console.log('PASS microphone recording and two-part WAV mixing',JSON.stringify(merged));
      }
      assert.deepEqual(errors,[],'No runtime/console errors: '+errors.join('\n'));
      results.push({width,height,scheduleCRUD:true,emergencyCancel:true,audioDuration:audio.duration,errors});
      console.log('PASS',width+'x'+height,'navigation, no overflow, schedule persistence, emergency cancellation, real audio decoding');
      await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
  }catch(e){console.error(e);if(lastPage&&!lastPage.isClosed()){await lastPage.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.log(await lastPage.evaluate(()=>({page:GdqMobile.getPage(),dialog:document.getElementById('mobile-schedule-form').open,title:document.getElementById('mobile-schedule-form-title').textContent})))}throw e;}finally{await browser.close();server.closeAllConnections();server.close();accountApp.server.closeAllConnections();await new Promise(r=>accountApp.server.close(r));accountApp.close();fs.rmSync(accountTemp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
