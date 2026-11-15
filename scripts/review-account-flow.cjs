/* Real browser + disposable backend/mailbox. No real email or user data. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const puppeteer=require('../mobile/node_modules/puppeteer-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/account-simplified-2026-10-15');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const {createApplication}=await import(pathToFileURL(path.join(root,'server/src/server.js')));
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'gdq-account-flow-'));
 let browser,app,webServer;const report={pages:[],started:new Date().toISOString()};
 try{
  webServer=http.createServer((req,res)=>{
   const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://qa').pathname));
   if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(filename).pipe(res);
  });await new Promise(r=>webServer.listen(0,'127.0.0.1',r));const web='http://127.0.0.1:'+webServer.address().port;
  let api;
  const password='QA-software-password-123';
  const call=async(route,body,token,method='POST')=>{const r=await fetch(api+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert(r.ok,JSON.stringify(v));return v;};

  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  for(const [name,url,width,height]of [['windows','HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html',1366,900],['android','mobile/www/index.html',390,844],['tablet','mobile/www/index.html',1024,768],['prototype','mobile-prototype.html',390,844]]){
   if(app){await new Promise(r=>app.server.close(r));app.close();}
   app=createApplication({data:path.join(data,name),local:true,origins:web});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));api='http://127.0.0.1:'+app.server.address().port;
   await app.createAdmin('qa-admin@example.test',password);const admin=await call('/auth/login',{email:'qa-admin@example.test',password});
   const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.setViewport({width,height});await page.setBypassServiceWorker(true);
   await page.evaluateOnNewDocument(api=>{localStorage.setItem('gdqpan_server',api);if(!sessionStorage.getItem('qa-initialized')){localStorage.removeItem('gdqpan_session');sessionStorage.setItem('qa-initialized','1');}},api);
   // The demo migration is tested elsewhere. This fixture retains a QA server as legacy HTTPS-like config.
   await page.setRequestInterception(true);let loginRequests=0;
   page.on('request',r=>{if(r.url().endsWith('/assets/server-config.js'))r.respond({status:200,contentType:'text/javascript',body:'window.GdqServerConfig={url:'+JSON.stringify(api)+',demo:false};'});else{if(r.url()===api+'/api/auth/login')loginRequests++;r.continue();}});
   await page.goto(web+'/'+url);await page.waitForSelector('#account-form');
   const result={name,checks:[],errors};report.pages.push(result);
   const check=(label,value)=>{assert(value,name+': '+label);result.checks.push(label);console.log(name+': '+label);};
   const visible=selector=>page.$eval(selector,e=>!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0);
   check('initial gate and hidden server',await page.evaluate(()=>GdqAccount.blocked&&document.getElementById('account-server').type==='hidden'&&document.getElementById('account-overlay').classList.contains('visible')));
   check('no bypass or logout in auth',await page.evaluate(()=>![...document.querySelectorAll('#account-overlay button')].some(e=>/Trở lại ứng dụng|Đăng xuất/.test(e.textContent))));
   check('forgot visible; resend hidden',await visible('#account-forgot')&&!await visible('#account-resend'));
   await page.screenshot({path:path.join(out,name+'-login.png'),fullPage:true});
   await page.click('#account-switch');check('register confirmation',await visible('#account-password-confirm'));
   await page.screenshot({path:path.join(out,name+'-register.png'),fullPage:true});
   const email='gdq-qa-'+name+'@gmail.com';
   await page.type('#account-email',email);await page.type('#account-password',password);await page.type('#account-password-confirm','Mismatch-password-123');
   await page.click('#account-register');await page.waitForFunction(()=>document.getElementById('account-status').textContent.includes('chưa khớp'));
   check('mismatch sends no registration',!app.db.prepare('SELECT id FROM users WHERE email=?').get(email));
   await page.$eval('#account-password-confirm',(e,p)=>e.value=p,password);await page.click('#account-register');
   await page.waitForFunction(()=>document.getElementById('account-form').dataset.mode==='waiting');
   check('register stays gated in waiting',await page.evaluate(()=>GdqAccount.blocked&&document.getElementById('account-overlay').classList.contains('visible')));
   await page.screenshot({path:path.join(out,name+'-waiting.png'),fullPage:true});
   const mails=app.inbox.length;await page.click('#account-resend');await page.waitForFunction(()=>!document.getElementById('account-form').hasAttribute('aria-busy'));
   check('waiting resend sends QA mail',app.inbox.length===mails+1);
   await page.click('#account-back-login');
   const submit=async(p=password)=>{await page.$eval('#account-password',(e,v)=>e.value=v,p);await page.focus('#account-password');await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.getElementById('account-form').hasAttribute('aria-busy'));};
   await submit('Wrong-software-password');check('wrong credentials remain gated',await page.$eval('#account-status',e=>e.textContent.includes('không đúng')));
   await submit();check('unverified shows resend',await visible('#account-resend'));
   const link=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('verify');await call('/auth/verify',{token:link});
   await submit();check('pending approval no resend',await page.$eval('#account-status',e=>e.textContent.includes('chờ admin duyệt'))&&!await visible('#account-resend'));
   const id=app.db.prepare('SELECT id FROM users WHERE email=?').get(email).id;
   await call('/admin/users/'+id,{approval:'approved'},admin.token,'PATCH');
   const beforeForgot=app.inbox.length;await page.click('#account-forgot');await page.waitForFunction(()=>!document.getElementById('account-form').hasAttribute('aria-busy'));check('forgot calls existing API',app.inbox.length===beforeForgot+1);
   // Hold the actual response to prove a second submit cannot race the first.
   let release,received;const held=new Promise(r=>received=r);const intercept=async r=>{
    if(r.url()===api+'/api/auth/login'&&r.method()==='POST'){
     const response=await fetch(r.url(),{method:'POST',headers:{'Content-Type':'application/json'},body:r.postData()});const body=await response.text();
     release=()=>r.respond({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':web},body});received();
    }
   };
   // Swap the normal handler while the login is in flight.
   page.removeAllListeners('request');page.on('request',r=>{if(r.url()===api+'/api/auth/login'&&r.method()==='POST'){loginRequests++;intercept(r).catch(e=>errors.push(e.message));}else if(r.url().endsWith('/assets/server-config.js'))r.respond({status:200,contentType:'text/javascript',body:'window.GdqServerConfig={url:'+JSON.stringify(api)+',demo:false};'});else r.continue();});
   await page.$eval('#account-password',(e,p)=>e.value=p,password);const count=loginRequests;await page.click('#account-login');await Promise.race([held,new Promise((_,reject)=>setTimeout(()=>reject(Error("No login request received")),10000))]);
   check('loading exact wording',await page.$eval('#account-status',e=>e.textContent==='Đang kết nối máy chủ, vui lòng chờ…'));
   await page.evaluate(()=>document.getElementById('account-form').requestSubmit());check('duplicate submit blocked',loginRequests===count+1);
   await release();await page.waitForFunction(()=>!GdqAccount.blocked);
   check('approved login opens app',!await visible('#account-overlay'));
   page.removeAllListeners('request');page.on('request',r=>r.url().endsWith('/assets/server-config.js')?r.respond({status:200,contentType:'text/javascript',body:'window.GdqServerConfig={url:'+JSON.stringify(api)+',demo:false};'}):r.continue());
   await page.reload();await page.waitForFunction(()=>window.GdqAccount&&!GdqAccount.blocked);check('valid session restored',!await visible('#account-overlay'));
   if(name==='prototype')await page.evaluate(()=>switchTab('caidat'));else await page.evaluate(()=>openModalSheet('settings'));
   await page.waitForSelector('#account-bar #account-logout',{visible:true});check('logout inside Settings',true);
   check('background defaults ON',await page.$eval('#account-background',e=>e.checked));
   await page.click('#account-background');await page.waitForFunction(()=>localStorage.getItem('gdqpan_background_enabled')==='false');
   const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
   await page.waitForFunction(()=>document.hidden&&!GdqRuntime.allowed());
   check('background OFF blocks hidden app playback',!await page.evaluate(()=>GdqAccount.authorize()));
   await page.bringToFront();await page.waitForFunction(()=>!document.hidden&&GdqRuntime.allowed());check('foreground restores permission',true);
   await page.click('#account-background');await page.waitForFunction(()=>GdqRuntime.backgroundEnabled);
   await other.bringToFront();await page.waitForFunction(()=>document.hidden);
   check('background ON keeps permission when hidden',await page.evaluate(()=>GdqRuntime.allowed()));
   await page.bringToFront();await other.close();
   await page.screenshot({path:path.join(out,name+'-settings.png'),fullPage:true});
   page.removeAllListeners('dialog');page.on('dialog',d=>d.dismiss());await page.click('#account-logout');check('cancel logout preserves session',await page.evaluate(()=>!!localStorage.getItem('gdqpan_session')&&!GdqAccount.blocked));page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());
   await page.click('#account-logout');await page.waitForFunction(()=>!localStorage.getItem('gdqpan_session')&&GdqAccount.blocked);
   check('logout disables runtime even with background ON',await page.evaluate(()=>!GdqRuntime.allowed()));
   check('logout returns login and clears token',await visible('#account-overlay')&&await page.$eval('#account-form',e=>e.dataset.mode==='login'));
   await page.$eval('#account-email',(e,v)=>e.value=v,email);await page.setOfflineMode(true);await submit();check('offline login stays blocked with Vietnamese error',await page.$eval('#account-status',e=>e.textContent.includes('Không kết nối được máy chủ'))&&await page.evaluate(()=>GdqAccount.blocked));await page.setOfflineMode(false);
   await page.setViewport({width:320,height:360});check('short narrow viewport has no horizontal overflow',await page.$eval('#account-overlay',e=>e.scrollWidth<=e.clientWidth));
   check('no JavaScript exceptions',errors.length===0);await context.close();
  }
 }catch(e){report.fatal=e.stack;process.exitCode=1;}
 finally{report.ended=new Date().toISOString();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();if(webServer)await new Promise(r=>webServer.close(r));if(app){await new Promise(r=>app.server.close(r));app.close();}fs.rmSync(data,{recursive:true,force:true});}
})();

