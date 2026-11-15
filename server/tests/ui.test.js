import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createApplication} from '../src/server.js';
const require=createRequire(import.meta.url),puppeteer=require('../../mobile/node_modules/puppeteer-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),qa=path.join(root,'server/qa');fs.mkdirSync(qa,{recursive:true});
test('mobile and desktop sync the same admin dataset; user UI is read-only; online check fails closed',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-ui-'));
  const staticServer=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file;if(url.pathname.startsWith('/desktop/'))file=path.join(root,decodeURIComponent(url.pathname.slice(9)||'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));else file=path.join(root,'mobile/www',decodeURIComponent(url.pathname.slice(1)||'index.html'));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
  await new Promise(r=>staticServer.listen(0,'127.0.0.1',r));const web='http://127.0.0.1:'+staticServer.address().port;
  const app=createApplication({data:temp,local:true,origins:web});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const api='http://127.0.0.1:'+app.server.address().port;
  const post=async(route,b,token,method='POST')=>{const r=await fetch(api+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:b?JSON.stringify(b):undefined});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;};
  await app.createAdmin('review-admin@example.test','Review-admin-password-123');
  await post('/auth/register',{email:'gdqpan-qa-review-user@gmail.com',password:'Review-user-password-123'});const token=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('verify');await post('/auth/verify',{token});
  const admin=await post('/auth/login',{email:'review-admin@example.test',password:'Review-admin-password-123'});
  await post('/admin/users/'+app.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-review-user@gmail.com').id,{approval:'approved'},admin.token,'PATCH');
  await post('/shared',{revision:0,schedules:[{id:'review-schedule',time:'23:59',days:[1,2,3,4,5,6,0],action:'Báo thức',on:true,text:'Nội dung chung'}],settings:{autoPlay:true,volume:.3,region:'bac_nu'},savedText:'Thông báo chung từ admin',customActions:[],disabledActions:[],files:[]},admin.token,'PUT');
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const errors=[];
  async function pageLogin(url,email,password,width){const context=await browser.createBrowserContext(),page=await context.newPage();await page.setViewport({width,height:800});page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForSelector('#account-server');await page.$eval('#account-server',(el,value)=>el.value=value,api);await page.type('#account-email',email);await page.type('#account-password',password);await page.click('#account-form button');await page.waitForFunction(()=>window.GdqAccount.blocked===false,{timeout:20000}).catch(async()=>{throw Error(url+' :: '+await page.$eval('#account-status',e=>e.textContent)+' :: '+JSON.stringify(errors));});return page;}
  try{
    const mobile=await pageLogin(web,'review-admin@example.test','Review-admin-password-123',390);
    assert.equal(await mobile.$eval('#tts-input-desktop',el=>el.value),'Thông báo chung từ admin');
    await mobile.evaluate(()=>{StorageManager.saveText('Đã sửa từ mobile');openModalSheet('settings');});mobile.on('dialog',d=>d.accept());await mobile.waitForSelector('#account-publish',{visible:true,timeout:10000});await mobile.click('#account-publish');await mobile.waitForFunction(()=>document.getElementById('account-status').textContent.includes('Đã công bố'));
    const desktop=await pageLogin(web+'/desktop/','review-admin@example.test','Review-admin-password-123',1366);assert.equal(await desktop.$eval('#tts-input-desktop',el=>el.value),'Đã sửa từ mobile');
    const user=await pageLogin(web,'gdqpan-qa-review-user@gmail.com','Review-user-password-123',360);await user.waitForFunction(()=>document.body.classList.contains('account-reader'));
    assert(await user.$eval('#mobile-schedule-add',el=>el.hidden));assert(await user.$eval('#tts-input-desktop',el=>el.readOnly));
    const unchanged=await user.evaluate(()=>{const old=StorageManager.getSchedules();StorageManager.saveSchedules([]);return JSON.stringify(old)===JSON.stringify(StorageManager.getSchedules());});assert(unchanged);
    assert(await user.evaluate(()=>window.GdqAccount.authorize('review-schedule')));
    assert.equal(await user.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await mobile.screenshot({path:path.join(qa,'account-mobile-admin.png'),fullPage:true});await user.screenshot({path:path.join(qa,'account-mobile-user.png'),fullPage:true});await desktop.screenshot({path:path.join(qa,'account-desktop.png'),fullPage:true});
    const userSession=await user.evaluate(()=>JSON.parse(localStorage.getItem('gdqpan_session')));
    await post('/admin/users/'+userSession.user.id,{status:'locked',expires:null},admin.token,'PATCH');assert.equal(await user.evaluate(()=>window.GdqAccount.authorize()),false);
    const consolePage=await browser.newPage();consolePage.on('pageerror',e=>errors.push(e.message));await consolePage.goto(api);await consolePage.type('[name=email]','review-admin@example.test');await consolePage.type('[name=password]','Review-admin-password-123');await consolePage.click('#login button');await consolePage.waitForFunction(()=>!document.getElementById('account').hidden);await consolePage.waitForSelector('#users tr');assert(await consolePage.$('#schedules tr'));consolePage.on('dialog',d=>d.accept());await consolePage.waitForNetworkIdle({idleTime:100,timeout:10000});
    async function refreshConsole(){await consolePage.waitForNetworkIdle({idleTime:100,timeout:10000});const response=consolePage.waitForResponse(r=>r.url()===api+'/api/notices'&&r.request().method()==='GET');await consolePage.click('#refresh');await response;await consolePage.waitForNetworkIdle({idleTime:100,timeout:10000});}
    await post('/auth/register',{email:'gdqpan-qa-admin-ui@gmail.com',password:'Pending-ui-password-123'});const pendingId=app.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-admin-ui@gmail.com').id;
    await refreshConsole();await consolePage.waitForSelector('[data-approve-user="'+pendingId+'"]');assert.equal(await consolePage.$eval('[data-approve-user="'+pendingId+'"]',el=>el.disabled),true);
    const verifyPending=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('verify');await post('/auth/verify',{token:verifyPending});
    const denied=await fetch(api+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'gdqpan-qa-admin-ui@gmail.com',password:'Pending-ui-password-123'})});assert.equal(denied.status,403);
    await refreshConsole();await consolePage.waitForFunction(id=>!document.querySelector('[data-approve-user="'+id+'"]').disabled,{},pendingId);await consolePage.waitForFunction(()=>!document.getElementById('refresh').disabled);await consolePage.click('[data-approve-user="'+pendingId+'"]');await consolePage.waitForFunction(()=>document.getElementById('status').textContent==='Đã duyệt tài khoản.');assert.equal(app.db.prepare('SELECT approval FROM users WHERE id=?').get(pendingId).approval,'approved');
    const approved=await post('/auth/login',{email:'gdqpan-qa-admin-ui@gmail.com',password:'Pending-ui-password-123'});assert.equal(approved.user.approval,'approved');
    await post('/auth/register',{email:'gdqpan-qa-reject-ui@gmail.com',password:'Reject-ui-password-123'});const rejectedId=app.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-reject-ui@gmail.com').id;await refreshConsole();await consolePage.waitForSelector('[data-reject-user="'+rejectedId+'"]');await consolePage.click('[data-reject-user="'+rejectedId+'"]');await consolePage.waitForFunction(()=>document.getElementById('status').textContent==='Đã từ chối yêu cầu.');assert.equal(app.db.prepare('SELECT approval FROM users WHERE id=?').get(rejectedId).approval,'rejected');
    await consolePage.screenshot({path:path.join(qa,'account-admin-approval-web.png'),fullPage:true});

    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(qa,'ui-results.json'),JSON.stringify({mobile:true,desktop:true,adminConsole:true,adminApprovalUI:true,adminRejectUI:true,sharedDataset:true,userReadOnly:true,lockedAccountDenied:true,pageErrors:errors},null,2));
  }finally{await browser.close();await new Promise(r=>staticServer.close(r));await new Promise(r=>app.server.close(r));app.close();fs.rmSync(temp,{recursive:true,force:true});}
});
