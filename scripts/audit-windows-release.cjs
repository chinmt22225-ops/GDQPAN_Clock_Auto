// Isolated audit of the packaged 1.4.0 UI. Never uses the user's Electron profile/server.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-release-audit-'));
app.setPath('userData',path.join(temp,'profile'));
app.commandLine.appendSwitch('use-fake-device-for-media-stream');app.commandLine.appendSwitch('use-fake-ui-for-media-stream');app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const result={version:'Windows 1.4.0',startedAt:new Date().toISOString(),checks:[],findings:[],errors:[]};let account,win;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
  ipcMain.handle('get-app-settings',()=>null);
  const {createApplication}=await import('../server/src/server.js');account=createApplication({local:true,data:path.join(temp,'server'),origins:'null'});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+account.server.address().port;
  const email='release-audit@example.test',password='Release-audit-QA-only-123';await account.createAdmin(email,password);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}).then(r=>r.json());
  const publish=async settings=>{const headers={Authorization:'Bearer '+login.token,'Content-Type':'application/json'},shared=await fetch(base+'/api/shared',{headers}).then(r=>r.json());const response=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...shared,settings})});assert(response.ok);};
  const oldSettings={volume:.2,region:'bac_nu',rate:.8,repeatTimes:2,chimeBeforeSpeech:false,autoPlay:false};await publish(oldSettings);
  win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{nodeIntegration:true,contextIsolation:false,webSecurity:false,backgroundThrottling:false}});
  win.webContents.on('render-process-gone',(_e,d)=>result.errors.push(d.reason));
  await win.loadFile(path.join(root,'dist-1.4.0/win-unpacked/resources/app.asar/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await pause(500);await evaluate(`(()=>{document.getElementById('account-server').value=${JSON.stringify(base)};document.getElementById('account-email').value=${JSON.stringify(email)};document.getElementById('account-password').value=${JSON.stringify(password)};document.getElementById('account-form').requestSubmit();})()`);
  async function ready(){for(let i=0;i<150;i++){try{if(await evaluate(`!!window.GdqAccount&&!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible')`))return;}catch{}await pause(100);}throw Error('Account did not become ready');}
  await ready();result.checks.push({name:'Real QA admin login',passed:await evaluate('GdqAccount.admin')});
  await evaluate(`localStorage.setItem('gdqpan_settings_v2',JSON.stringify(${JSON.stringify(oldSettings)}));true`);const reloaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await reloaded;await ready();await pause(700);
  const expected={volume:.35,region:'nam_nam',rate:1.2,repeatTimes:5,chimeBeforeSpeech:true,autoPlay:true};await publish(expected);
  await evaluate('window.confirm=()=>true;GdqAccount.refresh()');const immediately=await evaluate('StorageManager.getSettings()');await pause(900);const after=await evaluate('StorageManager.getSettings()');
  result.settings={expected,immediately,after,overwritten:Object.entries(expected).filter(([key,value])=>after[key]!==value).map(([key])=>key)};
  if(result.settings.overwritten.length)result.findings.push({severity:'high',name:'Shared settings overwritten after delayed volume save',fields:result.settings.overwritten});
  fs.writeFileSync(path.join(root,'qa/windows-release-audit.json'),JSON.stringify(result,null,2));
  const headers={Authorization:'Bearer '+login.token,'Content-Type':'application/json'},shared=await fetch(base+'/api/shared',{headers}).then(r=>r.json());
  const harmlessName=`<img src="qa-missing-image" onerror="window.__gdqReview={injected:true,nodeFsAvailable:typeof window.require==='function' && typeof window.require('node:fs').readFileSync==='function'}">`;
  const injected=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...shared,customActions:[{name:harmlessName,group:'chao',icon:'⭐'}]})});assert(injected.ok);
  await evaluate('GdqAccount.refresh()');await pause(400);result.sharedContentInjection=await evaluate('window.__gdqReview||{injected:false}');
  if(result.sharedContentInjection.injected)result.findings.push({severity:result.sharedContentInjection.nodeFsAvailable?'critical':'high',name:'Shared action name executes JavaScript',nodeFsAvailable:result.sharedContentInjection.nodeFsAvailable,condition:'Malicious shared data supplied through an authenticated QA admin; no OS command/file read was executed'});
  fs.writeFileSync(path.join(root,'qa/windows-release-audit.json'),JSON.stringify(result,null,2));
  const recorder=await Promise.race([evaluate(`(async()=>{let ticks=0,frames=0,running=true;const frame=()=>{frames++;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);try{await VoiceRecorder.start(null,()=>ticks++);await new Promise(r=>setTimeout(r,1800));const recording=VoiceRecorder.isRecording(),blob=await VoiceRecorder.stop();return {recording,bytes:blob?.size,meterTicks:ticks,controlRafTicks:frames};}catch(e){return {error:e.message,meterTicks:ticks,controlRafTicks:frames};}finally{running=false;}})()`),pause(8000).then(()=>({inconclusive:'Recorder audit timed out'}))]);
  result.recorder=recorder;if(recorder.recording&&recorder.controlRafTicks>5&&recorder.meterTicks===0)result.findings.push({severity:'medium',name:'Recorder meter does not update while recording'});
  result.endedAt=new Date().toISOString();console.log(JSON.stringify(result,null,2));
}catch(e){result.fatal=e.stack;console.error(e.message);}finally{
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/windows-release-audit.json'),JSON.stringify(result,null,2));if(win&&!win.isDestroyed())win.destroy();if(account){await new Promise(r=>account.server.close(r));account.close();}
  // Electron still owns its profile files until process exit; preserve the temp path for explicit later cleanup.
  fs.writeFileSync(path.join(root,'qa/windows-release-audit-temp.json'),JSON.stringify({temporary:temp},null,2));app.exit(result.fatal?1:0);
}});
