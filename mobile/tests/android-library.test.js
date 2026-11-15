// Runs only on the disposable GDQPAN_QA emulator; uses a temporary account server.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const puppeteer=require('puppeteer-core');
const adbPath='D:/GDQPAN/android-build-tools/android-sdk/platform-tools/adb.exe';
const qaVersion=process.env.GDQ_QA_VERSION||'1.4.0';
const app='vn.gdqpan.app.mobile',output=path.resolve(__dirname,'../qa/library-'+qaVersion);fs.mkdirSync(output,{recursive:true});
const adb=(...args)=>execFileSync(adbPath,['-s','emulator-5554',...args],{encoding:'utf8',timeout:120000,windowsHide:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  assert(adb('emu','avd','name').includes('GDQPAN_QA'));
  assert.equal(adb('shell','getprop','sys.boot_completed').trim(),'1');
  const {createApplication}=await import('../../server/src/server.js');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-android-library-'));
  const account=createApplication({local:true,data:temp,origins:'https://localhost'});
  let browser;
  try{
    await new Promise(resolve=>account.server.listen(0,'127.0.0.1',resolve));
    const port=account.server.address().port;
    await account.createAdmin('android-ui@example.test','Android-UI-QA-only-123');
    adb('reverse',`tcp:${port}`,`tcp:${port}`);
    adb('shell','run-as',app,'touch','files/qa-ui-upgrade-marker');
    for(const version of [qaVersion,qaVersion+'-test']){
      const source=path.resolve(__dirname,`../GDQPAN-${version}.apk`),ascii=`D:/GDQPAN/android-build-tools/qa-${version}.apk`;
      fs.copyFileSync(source,ascii);assert(adb('install','-r',ascii).includes('Success'));
      assert(adb('shell','run-as',app,'ls','files').includes('qa-ui-upgrade-marker'));
      console.log('PASS signed in-place upgrade '+version+' preserves private files');
    }
    adb('shell','am','force-stop',app);adb('shell','am','start','-n',app+'/vn.gdqpan.app.MainActivity');await wait(3500);
    const pid=adb('shell','pidof',app).trim();adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
    browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223',defaultViewport:null});
    let pages=await browser.pages(),page=pages.find(p=>p.url().includes('localhost'));assert(page);
    await page.waitForFunction(()=>window.GdqMobile?.libraryReady,{timeout:60000});
    await page.waitForFunction(()=>document.getElementById('account-form')&&!document.getElementById('account-form').inert,{timeout:30000});
  await page.evaluate(port=>{document.getElementById('account-server').value='http://127.0.0.1:'+port;document.getElementById('account-email').value='android-ui@example.test';document.getElementById('account-password').value='Android-UI-QA-only-123';document.getElementById('account-form').requestSubmit();},port);
    await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'),{timeout:30000});
    assert.equal(await page.evaluate(()=>Capacitor.getPlatform()),'android');
    const library=await page.evaluate(async()=>{const songs=await StorageManager.getAllSongs(),context=new AudioContext(),durations={};try{for(const category of GdqMusicCatalog.categories){const song=GdqMusicCatalog.songs.find(s=>s.category===category),response=await fetch(song.url),buffer=await context.decodeAudioData(await response.arrayBuffer());durations[category]=buffer.duration;}return {total:songs.length,bundled:songs.filter(s=>s.id.startsWith('preset_song_bundle_')).length,durations,uploadsBlocked:document.getElementById('sch-audio-file-input').disabled,studioEnabled:!document.getElementById('merge-body-file-input').disabled};}finally{await context.close();}});
    assert.equal(library.bundled,93);assert(library.uploadsBlocked&&library.studioEnabled);assert(Object.values(library.durations).every(n=>n>0));
    assert(await page.evaluate(()=>!document.getElementById('gdq-studio-library').closest('#tab-pane-record')),'Shared studio library is outside admin-only recording controls');
    console.log('PASS native bundled library',JSON.stringify(library));
    for(const destination of ['home','audio','studio','custom','vtv','more']){
      await page.evaluate(p=>GdqMobile.switchPage(p),destination);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.evaluate(()=>{GdqMobile.switchPage('home',false);document.activeElement?.blur();});await wait(500);
    fs.writeFileSync(path.join(output,'android-library-home.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024,windowsHide:true}));
    await page.evaluate(()=>{GdqMobile.switchPage('custom');document.getElementById('mobile-link-url').value='https://youtu.be/dQw4w9WgXcQ';document.getElementById('mobile-link-form').requestSubmit();});
    await wait(5000);
    assert(adb('shell','dumpsys','activity','activities').includes('VtvActivity'),'Native YouTube viewer opened');
    pages=await browser.pages();const youtube=pages.find(p=>p.url().includes('youtube.com'));assert(youtube,'YouTube page loaded in native viewer');
    console.log('PASS native YouTube viewer URL',youtube.url());
    await wait(5000);
    const before=await youtube.evaluate(()=>{const v=document.querySelector('video');return v?{time:v.currentTime,paused:v.paused,ready:v.readyState}:null;});
    await wait(2500);
    const after=await youtube.evaluate(()=>{const v=document.querySelector('video');return v?{time:v.currentTime,paused:v.paused,ready:v.readyState}:null;});
    const playbackVerified=!!(before&&after&&!after.paused&&after.time>before.time);
    console.log('YouTube playback observation',JSON.stringify({before,after,playbackVerified}));
    fs.writeFileSync(path.join(output,'android-youtube.png'),execFileSync(adbPath,['-s','emulator-5554','exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024,windowsHide:true}));
    adb('shell','input','keyevent','4');await wait(500);
    console.log('PASS Android account login, separated pages, no horizontal overflow, YouTube open/back');
    fs.writeFileSync(path.join(output,'android-library-results.json'),JSON.stringify({versions:[qaVersion,qaVersion+'-test'],upgradePreserved:true,login:true,navigation:true,library,youtubeNativePage:true,youtubePlayback:playbackVerified?'Playback time advanced on QA video':'Not verified; network and YouTube availability dependent'},null,2));
  }finally{
    if(browser)await browser.disconnect();await new Promise(resolve=>account.server.close(resolve));account.close();assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
