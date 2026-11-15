// Disposable GDQPAN_QA emulator only; never targets a physical phone.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),puppeteer=require('puppeteer-core'),{exerciseMusicTimer}=require('./music-timer-checks.cjs');
const adbPath='D:/GDQPAN/android-build-tools/android-sdk/platform-tools/adb.exe',pkg='vn.gdqpan.app.mobile',out=path.resolve(__dirname,'../../qa/music-timer-20261023/android');
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',windowsHide:true,timeout:180000}),wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{let app,temp,browser,port;try{
  fs.mkdirSync(out,{recursive:true});assert(adb('emu','avd','name').includes('GDQPAN_QA'));assert.equal(adb('shell','getprop','sys.boot_completed').trim(),'1');
  adb('shell','settings','put','secure','show_ime_with_hard_keyboard','1');
  adb('shell','run-as',pkg,'touch','files/qa-music-timer-upgrade-marker');
  const apk=path.resolve(__dirname,'../GDQPAN-1.4.12.apk'),ascii='D:/GDQPAN/android-build-tools/qa-music-timer-1.4.12.apk';fs.copyFileSync(apk,ascii);assert(adb('install','-r',ascii).includes('Success'));assert(adb('shell','run-as',pkg,'ls','files').includes('qa-music-timer-upgrade-marker'));
  const {createApplication}=await import('../../server/src/server.js');temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-native-music-timer-'));app=createApplication({local:true,data:temp,origins:'https://localhost'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));port=app.server.address().port;await app.createAdmin('native-timer@example.test','Native-timer-QA-only-123');adb('reverse','tcp:'+port,'tcp:'+port);
  adb('shell','am','force-stop',pkg);adb('shell','input','keyevent','224');adb('shell','wm','dismiss-keyguard');adb('shell','am','start','-n',pkg+'/vn.gdqpan.app.MainActivity');
  let pid;for(let i=0;i<40;i++){try{pid=adb('shell','pidof',pkg).trim();if(pid)break;}catch{}await wait(250);}assert(pid);adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  for(let i=0;i<40;i++){try{browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});break;}catch{await wait(250);}}assert(browser);const page=(await browser.pages()).find(p=>p.url().includes('localhost'));assert(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>r.url().endsWith('/assets/server-config.js')?r.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'}):r.continue());await page.reload({waitUntil:'load'});await page.waitForFunction(()=>GdqMobile?.libraryReady&&!document.getElementById('account-form').inert,{timeout:60000});
  await page.evaluate(port=>{document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='native-timer@example.test';document.getElementById('account-password').value='Native-timer-QA-only-123';document.getElementById('account-form').requestSubmit();},port);await page.waitForFunction(()=>!GdqAccount.blocked,{timeout:30000});
  const keyboard=[];const result=await exerciseMusicTimer(page,{out,afterFocus:async part=>{
    await wait(500);const inputState=adb('shell','dumpsys','input_method');const visible=/mInputShown=true|isInputViewShown=true|mIsInputViewShown=true/.test(inputState);keyboard.push({part,visible});assert(visible,'Android keyboard must be shown for '+part);
    fs.writeFileSync(path.join(out,'keyboard-'+part+'.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true}));
  }});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({...result,keyboard,inPlaceUpdate:true,version:'1.4.12',errors},null,2));console.log('PASS Android in-place update, countdown and all three native keyboard inputs.');
}catch(e){console.error(e);process.exitCode=1;}finally{browser?.disconnect();if(port)adb('reverse','--remove','tcp:'+port);if(app){app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.close();}if(temp&&path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(temp,{recursive:true,force:true});}})();
