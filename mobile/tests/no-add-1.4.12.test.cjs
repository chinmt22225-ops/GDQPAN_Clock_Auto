const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), os = require('node:os');
const puppeteer = require('puppeteer-core');
const out = path.resolve(__dirname, '../../qa/no-add-1.4.12');
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]);
  const relative = '.' + name;
  let file = path.resolve(out, 'patched', relative);
  if (!file.startsWith(out + path.sep)) return res.writeHead(403).end();
  if (!fs.existsSync(file)) file = path.resolve(out, 'base', relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  let app, browser;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gdq-no-add-'));
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const url = 'http://127.0.0.1:' + server.address().port;
    const {createApplication} = await import('../../server/src/server.js');
    app = createApplication({local:true, data:temp, origins:url});
    await new Promise(r => app.server.listen(0, '127.0.0.1', r));
    const accountUrl = 'http://127.0.0.1:' + app.server.address().port;
    await app.createAdmin('no-add@example.test', 'No-add-QA-password-123');
    const login = await fetch(accountUrl + '/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'no-add@example.test',password:'No-add-QA-password-123'})}).then(r=>r.json());
    const seed = {revision:0,schedules:[{id:'existing',time:'09:00',days:[0,1,2,3,4,5,6],action:'Báo thức',on:true,text:''}],settings:{autoPlay:true,volume:.3,region:'bac_nu'},savedText:'',customActions:[],disabledActions:[],files:[]};
    const response = await fetch(accountUrl+'/api/shared',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+login.token},body:JSON.stringify(seed)});
    assert.equal(response.ok,true);
    browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--mute-audio']});
    const page = await browser.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    await page.setRequestInterception(true);
    page.on('request',r=>r.url().endsWith('/assets/server-config.js')?r.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'}):r.continue());
    await page.goto(url);
    await page.waitForFunction(()=>window.GdqMobile?.libraryReady && !document.getElementById('account-form').inert);
    await page.evaluate(base=>{document.getElementById('account-server').value=base;document.getElementById('account-email').value='no-add@example.test';document.getElementById('account-password').value='No-add-QA-password-123';document.getElementById('account-form').requestSubmit();},accountUrl);
    await page.waitForFunction(()=>!GdqAccount.blocked && StorageManager.getSchedules().some(s=>s.id==='existing'));
    const controls=await page.evaluate(()=>({addActions:document.querySelectorAll('.military-btn.add-btn').length,addSchedule:!!document.getElementById('mobile-schedule-add'),addQueue:!!document.getElementById('btn-add-merge-queue')}));
    assert.deepEqual(controls,{addActions:0,addSchedule:false,addQueue:false});
    await page.evaluate(async()=>{
      await handleAddSchedule(); addScheduleMobile(); handleQuickAssignSchedule(); handleAddMergeQueueItem(); openAddActionModal(); await handleCreateCustomAction();
      openModalSheet('add_action'); openModalSheet('vtv-schedule'); saveVtvScheduleModal(null);
    });
    assert.equal(await page.evaluate(()=>StorageManager.getSchedules().length),1);
    assert.equal(await page.evaluate(()=>document.getElementById('modal-overlay').classList.contains('active')),false);
    await page.click('.mobile-nav button[data-page="schedule"]');
    await page.click('.mobile-schedule-edit');
    assert.equal(await page.$eval('#mobile-schedule-form',e=>e.open),true);
    await page.evaluate(()=>{document.getElementById('sch-time-input').value='10:37';});
    await page.click('#btn-add-schedule');
    await page.waitForFunction(()=>StorageManager.getSchedules()[0].time==='10:37'&&!document.getElementById('mobile-schedule-form').open);
    await page.click('.mobile-schedule-toggle');
    assert.equal(await page.evaluate(()=>StorageManager.getSchedules()[0].on),false);
    await page.screenshot({path:path.join(out,'schedule.png'),fullPage:true});
    await page.evaluate(()=>{document.querySelector('#vtv-schedule-list-container a').click();});
    assert.equal(await page.evaluate(()=>document.getElementById('modal-overlay').classList.contains('active')),true);
    await page.evaluate(()=>{document.getElementById('vtv-modal-sch-name').value='Lịch hiện có';document.querySelector('#modal-content button[onclick^="saveVtvScheduleModal"]').click();});
    assert.equal(await page.evaluate(()=>document.getElementById('vtv-schedule-list-container').textContent.includes('Lịch hiện có')),true);
    await page.evaluate(()=>deleteSchedule('existing'));
    await page.waitForFunction(()=>StorageManager.getSchedules().length===0);
    assert.equal(await page.$eval('.mobile-schedule-empty',e=>e.textContent),'Chưa có lịch phát.');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'web-results.json'),JSON.stringify({controls,creationBlocked:true,existingScheduleEdit:true,existingScheduleToggle:true,existingScheduleDelete:true,existingVtvEdit:true,errors},null,2));
    console.log('PASS: creation blocked; existing schedule edit/toggle/delete and VTV edit work; no JavaScript errors.');
  } finally {
    if(browser)await browser.close();
    server.closeAllConnections(); await new Promise(r=>server.close(r));
    if(app){app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.close();}
    if(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
