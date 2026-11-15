// Review source renderers in isolated browser contexts and a disposable account database.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require('../mobile/node_modules/puppeteer-core');
const root=path.resolve(__dirname,'..'),phase=process.env.GDQ_REVIEW_PHASE||'before';
const result={startedAt:new Date().toISOString(),phase,pages:[]};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-ui-review-'));
const staticServer=http.createServer((req,res)=>{const route=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+decodeURIComponent(route));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{let account,browser;try{
  await new Promise(r=>staticServer.listen(0,'127.0.0.1',r));const web='http://127.0.0.1:'+staticServer.address().port;
  const {createApplication}=await import('../server/src/server.js');account=createApplication({local:true,data:temp,origins:web});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));const api='http://127.0.0.1:'+account.server.address().port;
  await account.createAdmin('review@example.test','Review-password-only-123');
  const call=async(route,b,token)=>{const r=await fetch(api+'/api'+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(b)});return r.json();};
  await call('/auth/register',{email:'gdqpan-qa-reader@gmail.com',password:'Reader-password-only-123'});await call('/auth/verify',{token:new URL(account.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('verify')});
  const admin=await call('/auth/login',{email:'review@example.test',password:'Review-password-only-123'});
  await fetch(api+'/api/admin/users/'+account.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-reader@gmail.com').id,{method:'PATCH',headers:{Authorization:'Bearer '+admin.token,'Content-Type':'application/json'},body:JSON.stringify({approval:'approved'})});
  const quotedId="probe');window.__idInjected=true;//";
  const payload={revision:0,schedules:[{id:quotedId,time:'23:58',days:[0,1,2,3,4,5,6],action:'Báo thức',on:true,text:'<img src=x onerror="window.__scheduleInjected=true">'}],settings:{autoPlay:false,volume:.2,region:'bac_nu'},savedText:'',customActions:[{name:'<img src=x onerror="window.__modalInjected=true">',group:'chao',icon:'⭐'}],disabledActions:[],files:[]};
  const publish=await fetch(api+'/api/shared',{method:'PUT',headers:{Authorization:'Bearer '+admin.token,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!publish.ok)throw Error('Fixture rejected '+await publish.text());
  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  for(const [name,url,width,height] of [['desktop','/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html',1366,900],['android-web','/mobile/www/index.html',390,844]]){
    const context=await browser.createBrowserContext();await context.overridePermissions(web,['microphone']);const page=await context.newPage();await page.setBypassServiceWorker(true);await page.setViewport({width,height});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(web+url);await page.waitForSelector('#account-form');
    async function login(email,password){await page.evaluate(({api,email,password})=>{document.getElementById('account-server').value=api;document.getElementById('account-email').value=email;document.getElementById('account-password').value=password;document.getElementById('account-form').requestSubmit();},{api,email,password});await page.waitForFunction(()=>!GdqAccount.blocked,{timeout:20000});await new Promise(r=>setTimeout(r,500));}
    await login('review@example.test','Review-password-only-123');const p={name,errors};result.pages.push(p);
    p.publishVisibility=await page.$eval('#account-publish',el=>{const ancestors=[];for(let e=el;e;e=e.parentElement)ancestors.push({tag:e.tagName,id:e.id,hidden:e.hidden,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,rect:e.getBoundingClientRect().toJSON()});return ancestors;});
    p.scheduleInjected=await page.evaluate(()=>!!window.__scheduleInjected);
    p.scheduleIdHandler=await page.evaluate(id=>{const original=window.editSchedule;window.editSchedule=value=>window.__receivedId=value;document.querySelector('#schedule-tbody-desktop button.btn-blue').click();window.editSchedule=original;return {preserved:window.__receivedId===id,injected:!!window.__idInjected};},quotedId);
    p.recorder=await page.evaluate(async()=>{let ticks=0,frames=0,running=true;const frame=()=>{frames++;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);try{await VoiceRecorder.start(null,()=>ticks++);await new Promise(r=>setTimeout(r,600));const recording=VoiceRecorder.isRecording(),blob=await VoiceRecorder.stop();return {recording,bytes:blob?.size,ticks,frames};}finally{running=false;}});
    await page.evaluate(()=>openModalSheet('action_sound',StorageManager.getCustomActions()[0].name));await new Promise(r=>setTimeout(r,250));p.modalInjected=await page.evaluate(()=>!!window.__modalInjected);await page.evaluate(()=>closeModal());
    await page.evaluate(()=>showToast('<img src=x onerror="window.__toastInjected=true">'));await new Promise(r=>setTimeout(r,150));p.toastInjected=await page.evaluate(()=>!!window.__toastInjected);
    await page.evaluate(()=>{document.getElementById('tts-input-desktop').value='</textarea><img src=x onerror="window.__assignInjected=true">';openModalSheet('assign_tts');});await new Promise(r=>setTimeout(r,100));p.assignInjected=await page.evaluate(()=>!!window.__assignInjected);await page.evaluate(()=>closeModal());
    await page.evaluate(()=>document.getElementById('account-logout').click());await page.waitForFunction(()=>GdqAccount.blocked);await login('gdqpan-qa-reader@gmail.com','Reader-password-only-123');
    p.readerDisabled=await page.$eval('#tts-input-desktop',el=>el.readOnly);
    await page.evaluate(()=>document.getElementById('account-logout').click());await page.waitForFunction(()=>GdqAccount.blocked);await login('review@example.test','Review-password-only-123');
    p.adminStillReadOnly=await page.$eval('#tts-input-desktop',el=>el.readOnly);p.studioUploadRemoved=await page.evaluate(()=>!document.getElementById('account-upload-studio')&&!document.getElementById('gdq-studio-library'));
    await page.evaluate(()=>openModalSheet('settings'));await page.waitForSelector('#modal-content #account-bar',{visible:true});
    await page.evaluate(()=>{document.getElementById('toast-container')?.replaceChildren();});
    p.accountWithinViewport=await page.$eval('#account-bar',el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&el.scrollWidth<=el.clientWidth;});
    p.settingsMounted=await page.$eval('#account-bar',el=>!el.hidden&&el.getBoundingClientRect().height>0);
    await page.screenshot({path:path.join(root,'qa','account-settings-'+name+'.png'),fullPage:true});
    await page.click('#account-open');await page.waitForSelector('#account-overlay.visible');
    await page.evaluate(()=>GdqAccount.refresh());
    await page.evaluate(()=>{window.confirm=()=>false;document.getElementById('account-publish').click();});
    await page.evaluate(()=>closeModal());await page.waitForFunction(()=>document.getElementById('account-bar')?.closest('#account-parking'));
    await page.evaluate(()=>openModalSheet('settings'));await page.waitForSelector('#modal-content #account-bar');await page.evaluate(()=>closeModal());
    p.accountParked=await page.$eval('#account-bar',el=>el.hidden&&!!el.closest('#account-parking')); 
    p.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    const delayedSnapshot=await fetch(api+'/api/shared',{headers:{Authorization:'Bearer '+admin.token}}).then(r=>r.json());
    await page.evaluate(()=>{window.confirm=()=>true;});
    let releaseShared,notifyShared;const sharedPending=new Promise(r=>notifyShared=r);let hold=true;
    await page.setRequestInterception(true);page.on('request',request=>{if(hold&&request.method()==='GET'&&request.url().endsWith('/api/shared')){hold=false;releaseShared=()=>request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':web},body:JSON.stringify(delayedSnapshot)});notifyShared();}else request.continue();});
    const refreshing=page.evaluate(()=>GdqAccount.refresh().then(()=>({completed:true}),e=>({cancelled:true,error:e.message})));
    await Promise.race([sharedPending,new Promise((_,reject)=>setTimeout(()=>reject(Error('Delayed snapshot fixture did not receive GET')),10000))]);console.log('DELAYED SNAPSHOT',name);await page.evaluate(()=>document.getElementById('account-logout').click());await page.waitForFunction(()=>localStorage.getItem('gdqpan_session')===null);
    await releaseShared();p.refreshAfterLogout=await refreshing;p.loggedOutStaysBlocked=await page.evaluate(()=>GdqAccount.blocked&&localStorage.getItem('gdqpan_session')===null&&document.getElementById('account-overlay').classList.contains('visible'));
    if(['after','account-settings','banner'].includes(phase)){for(const key of ['scheduleInjected','modalInjected','toastInjected','assignInjected','adminStillReadOnly','overflow'])assert.equal(p[key],false,name+'/'+key);assert(p.studioUploadRemoved&&p.settingsMounted&&p.accountParked&&p.accountWithinViewport,name+'/account settings');assert(p.scheduleIdHandler.preserved&&!p.scheduleIdHandler.injected);assert.equal(p.readerDisabled,true);assert(p.loggedOutStaysBlocked,name+'/late refresh after logout');assert(p.recorder.recording&&p.recorder.bytes>0&&p.recorder.ticks>0,name+'/recorder');assert.deepEqual(errors,[]);}
    await page.screenshot({path:path.join(root,'qa','review-'+phase+'-'+name+'.png'),fullPage:true});await context.close();
  }
}catch(e){result.fatal=e.stack;process.exitCode=1;}finally{result.endedAt=new Date().toISOString();fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa','ui-review-'+phase+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(browser)await browser.close();await new Promise(r=>staticServer.close(r));if(account){await new Promise(r=>account.server.close(r));account.close();}fs.rmSync(temp,{recursive:true,force:true});}})();
