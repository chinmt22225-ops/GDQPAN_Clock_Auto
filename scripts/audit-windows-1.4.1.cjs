// Isolated audit of the packaged 1.4.1 UI. Never uses the user's Electron profile/server.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-release-audit-'));
app.setPath('userData',path.join(temp,'profile'));
app.commandLine.appendSwitch('use-fake-device-for-media-stream');app.commandLine.appendSwitch('use-fake-ui-for-media-stream');app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const result={version:'Windows 1.4.1',startedAt:new Date().toISOString(),checks:[],findings:[],errors:[]};let account,win;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
  ipcMain.handle('get-app-settings',()=>null);
  ipcMain.handle('save-app-settings',()=>true);
  ipcMain.handle('gdqpan-account-request', async (event, request) => {
    const base = new URL(request.base);
    const response = await fetch(base.origin + '/api' + request.route, {
      method: request.method,
      headers: request.headers,
      body: request.upload ? Buffer.from(request.body,'base64') : request.body,
      signal: AbortSignal.timeout(12000),
      redirect: 'error'
    });
    return {
      status: response.status,
      data: request.binary && response.ok ? Buffer.from(await response.arrayBuffer()).toString('base64') : await response.json(),
      mime: response.headers.get('content-type')
    };
  });
  const {createApplication}=await import('../server/src/server.js');account=createApplication({local:true,data:path.join(temp,'server'),origins:'null'});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+account.server.address().port;
  const email='release-audit@example.test',password='Release-audit-QA-only-123';await account.createAdmin(email,password);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}).then(r=>r.json());
  const publish=async settings=>{const headers={Authorization:'Bearer '+login.token,'Content-Type':'application/json'},shared=await fetch(base+'/api/shared',{headers}).then(r=>r.json());const response=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...shared,settings})});assert(response.ok);};
  const oldSettings={volume:.2,region:'bac_nu',rate:.8,repeatTimes:2,chimeBeforeSpeech:false,autoPlay:false};await publish(oldSettings);
  const preloadPath = path.join(root,'dist-1.4.1/win-unpacked/resources/app.asar/preload.js');
  win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,preload:preloadPath,webSecurity:false,backgroundThrottling:false}});
  win.webContents.on('render-process-gone',(_e,d)=>result.errors.push(d.reason));
  await win.loadFile(path.join(root,'dist-1.4.1/win-unpacked/resources/app.asar/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  
  // Verify Electron isolation
  const nodeSecurity = await evaluate(`({
    nodeIntegrationDisabled: typeof require === 'undefined',
    windowRequireDisabled: typeof window.require === 'undefined',
    contextBridgeActive: typeof window.electronAPI === 'object',
    ipcRendererControlled: typeof window.ipcRenderer === 'object'
  })`);
  result.nodeSecurity = nodeSecurity;
  result.checks.push({name:'Node.js disabled in renderer', passed: nodeSecurity.nodeIntegrationDisabled && nodeSecurity.windowRequireDisabled});
  result.checks.push({name:'contextBridge active with electronAPI', passed: nodeSecurity.contextBridgeActive});

  await pause(500);await evaluate(`(()=>{document.getElementById('account-server').value=${JSON.stringify(base)};document.getElementById('account-email').value=${JSON.stringify(email)};document.getElementById('account-password').value=${JSON.stringify(password)};document.getElementById('account-form').requestSubmit();})()`);
  async function ready(){for(let i=0;i<150;i++){try{if(await evaluate(`!!window.GdqAccount&&!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible')`))return;}catch{}await pause(100);}throw Error('Account did not become ready');}
  await ready();result.checks.push({name:'Real QA admin login',passed:await evaluate('GdqAccount.admin')});
  await evaluate(`localStorage.setItem('gdqpan_settings_v2',JSON.stringify(${JSON.stringify(oldSettings)}));true`);const reloaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await reloaded;await ready();await pause(700);
  
  // Test volume settings overwrite
  const expected={volume:.35,region:'nam_nam',rate:1.2,repeatTimes:5,chimeBeforeSpeech:true,autoPlay:true};await publish(expected);
  await evaluate('window.confirm=()=>true;GdqAccount.refresh()');const immediately=await evaluate('StorageManager.getSettings()');await pause(900);const after=await evaluate('StorageManager.getSettings()');
  result.settings={expected,immediately,after,overwritten:Object.entries(expected).filter(([key,value])=>after[key]!==value).map(([key])=>key)};
  if(result.settings.overwritten.length)result.findings.push({severity:'high',name:'Shared settings overwritten after delayed volume save',fields:result.settings.overwritten});
  else result.checks.push({name:'Settings preserved after volume debounce', passed: true});

  // Test XSS / JS injection via customActions
  const headers={Authorization:'Bearer '+login.token,'Content-Type':'application/json'},shared=await fetch(base+'/api/shared',{headers}).then(r=>r.json());
  const harmlessName=`<img src="qa-missing-image" onerror="window.__gdqReview={injected:true,nodeFsAvailable:typeof window.require==='function' && typeof window.require('node:fs').readFileSync==='function'}">`;
  const injected=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...shared,customActions:[{name:harmlessName,group:'chao',icon:'⭐'}]})});assert(injected.ok);
  await evaluate('GdqAccount.refresh()');await pause(400);result.sharedContentInjection=await evaluate('window.__gdqReview||{injected:false}');
  if(result.sharedContentInjection.injected)result.findings.push({severity:result.sharedContentInjection.nodeFsAvailable?'critical':'high',name:'Shared action name executes JavaScript',nodeFsAvailable:result.sharedContentInjection.nodeFsAvailable,condition:'Malicious shared data supplied through an authenticated QA admin; no OS command/file read was executed'});
  else result.checks.push({name:'Shared action name safely escaped without script injection', passed: true});
  await evaluate("openModalSheet('action_sound',StorageManager.getCustomActions()[0].name)");await pause(200);result.actionModalInjection=await evaluate('!!window.__gdqReview?.injected');await evaluate('closeModal()');
  if(result.actionModalInjection)result.findings.push({severity:'high',name:'Shared action name executes JavaScript in sound modal',condition:'Authenticated QA admin, harmless boolean marker only'});
  const latest=await fetch(base+'/api/shared',{headers}).then(r=>r.json());
  const schedule=await fetch(base+'/api/shared',{method:'PUT',headers,body:JSON.stringify({...latest,schedules:[{id:'audit-schedule',time:'23:58',days:[1,2,3,4,5,6,0],on:false,action:'Báo thức',text:'<img src="qa-missing-image" onerror="window.__scheduleInjected=true">'}]})});assert(schedule.ok);await evaluate('GdqAccount.refresh()');await pause(200);result.scheduleInjection=await evaluate('!!window.__scheduleInjected');
  if(result.scheduleInjection)result.findings.push({severity:'high',name:'Shared schedule text executes JavaScript',condition:'Authenticated QA admin, harmless boolean marker only'});

  const recorder=await Promise.race([evaluate(`(async()=>{let ticks=0,frames=0,running=true;const frame=()=>{frames++;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);try{await VoiceRecorder.start(null,()=>ticks++);await new Promise(r=>setTimeout(r,1800));const recording=VoiceRecorder.isRecording(),blob=await VoiceRecorder.stop();return {recording,bytes:blob?.size,meterTicks:ticks,controlRafTicks:frames};}catch(e){return {error:e.message,meterTicks:ticks,controlRafTicks:frames};}finally{running=false;}})()`),pause(8000).then(()=>({inconclusive:'Recorder audit timed out'}))]);
  result.recorder=recorder;
  result.endedAt=new Date().toISOString();console.log(JSON.stringify(result,null,2));
}catch(e){result.fatal=e.stack;console.error(e.message);}finally{
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,process.env.GDQ_QA_REPORT||'qa/windows-1.4.1-audit.json'),JSON.stringify(result,null,2));if(win&&!win.isDestroyed())win.destroy();if(account){await new Promise(r=>account.server.close(r));account.close();}
  fs.writeFileSync(path.join(root,'qa/windows-1.4.1-audit-temp.json'),JSON.stringify({temporary:temp},null,2));app.exit(result.fatal?1:0);
}});
