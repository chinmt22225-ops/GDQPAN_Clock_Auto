// Runs the real Electron bridge against an isolated temporary account database.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {createRequire} from 'node:module';import {createApplication} from '../src/server.js';
const require=createRequire(import.meta.url),puppeteer=require('../../mobile/node_modules/puppeteer-core');
const root=path.resolve('..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-electron-account-')),app=createApplication({data:path.join(temp,'server'),local:true});
await app.createAdmin('desktop-admin@example.test','Desktop-only-password-123');await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
const binary=process.env.GDQPAN_QA_EXE||path.join(root,'node_modules/electron/dist/electron.exe');
const child=spawn(binary,[...(process.env.GDQPAN_QA_EXE?[]:[root]),'--remote-debugging-port=9333','--user-data-dir='+path.join(temp,'profile')],{cwd:root,windowsHide:true,stdio:'ignore'});
let browser;
try{
  for(let i=0;i<40;i++){try{browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9333',defaultViewport:null});break;}catch{await new Promise(r=>setTimeout(r,500));}}assert(browser);
  const page=(await browser.pages()).find(p=>p.url().includes('HE_THONG_THONG_BAO_TU_DONG_DESKTOP'));assert(page);await page.waitForSelector('#account-form');
  await page.evaluate(({base})=>{document.getElementById('account-server').value=base;document.getElementById('account-email').value='desktop-admin@example.test';document.getElementById('account-password').value='Desktop-only-password-123';document.getElementById('account-form').requestSubmit();},{base});
  await page.waitForFunction(()=>GdqAccount.blocked===false,{timeout:20000});assert(await page.evaluate(()=>!!electronAPI.accountRequest));
  assert(await page.evaluate(()=>GdqAccount.authorize()));page.on('dialog',d=>d.accept());await page.evaluate(()=>StorageManager.saveText('Đồng bộ từ Electron thật'));await page.click('#account-publish');await page.waitForFunction(()=>document.getElementById('account-status').textContent.includes('Đã công bố'));
  const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('gdqpan_session')));const data=await fetch(base+'/api/shared',{headers:{Authorization:'Bearer '+session.token}}).then(r=>r.json());assert.equal(data.savedText,'Đồng bộ từ Electron thật');
  await page.screenshot({path:path.resolve('qa/account-electron.png')});fs.writeFileSync(path.resolve('qa/desktop-account-results.json'),JSON.stringify({electronBridge:true,packaged:!!process.env.GDQPAN_QA_EXE,login:true,publish:true},null,2));console.log('PASS real Electron login, live authorization and common-data publishing.');
  await page.evaluate(()=>window.close());
}finally{browser?.disconnect();if(child.exitCode===null)child.kill();await new Promise(r=>app.server.close(r));app.close();await new Promise(r=>setTimeout(r,1000));fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:500});}
