const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require('../mobile/node_modules/puppeteer-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa');
const expectedCatalog=JSON.parse(fs.readFileSync(path.join(root,'qa/music-catalog-build.json'),'utf8'));
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return;}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.mp3':'audio/mpeg','.m4a':'audio/mp4'};
  res.setHeader('Content-Type',(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const {createApplication}=await import('../server/src/server.js');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-fixed-library-'));
  const account=createApplication({local:true,data:temp,origins:url});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));const accountUrl='http://127.0.0.1:'+account.server.address().port;
  await account.createAdmin('library-qa@example.test','Library-QA-only-password-123');
  const browser=await puppeteer.launch({executablePath:['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync),headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const results=[];
  try{
    for(const [name,file,width,height]of[['windows','HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html',1280,800],['android','mobile/www/index.html',360,640]]){
      const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width,height});
      await page.goto(url+'/'+file);await page.waitForFunction(()=>window.GdqFixedMusic?.ready&&document.getElementById('account-form'));
      await page.evaluate(accountUrl=>{document.getElementById('account-server').value=accountUrl;document.getElementById('account-email').value='library-qa@example.test';document.getElementById('account-password').value='Library-QA-only-password-123';document.getElementById('account-form').requestSubmit();},accountUrl);
      await page.waitForFunction(()=>!GdqAccount.blocked);
      const library=await page.evaluate(async()=>{const songs=await StorageManager.getAllSongs();return {total:songs.length,bundled:songs.filter(s=>s.id.startsWith('preset_song_bundle_')).length,counts:Object.fromEntries(GdqMusicCatalog.categories.map(c=>[c,songs.filter(s=>s.category===c).length])),old:songs.some(s=>s.id==='preset_song_traditional')&&songs.some(s=>s.id==='preset_song_national_anthem')};});
      assert.equal(library.bundled,expectedCatalog.songs.length);assert(library.old);assert.deepEqual(library.counts,Object.fromEntries(expectedCatalog.categories.map(c=>[c,expectedCatalog.songs.filter(s=>s.category===c).length])));
      assert(await page.evaluate(()=>[...document.querySelectorAll('input[type=file]')].filter(e=>!/\.json/i.test(e.accept)&&!e.closest('#tab-pane-tts,#tab-pane-record,#tab-pane-merge,#gdq-studio-library')).every(e=>e.disabled)),'All non-studio audio pickers disabled');
      assert(await page.evaluate(()=>!document.getElementById('merge-body-file-input').disabled),'Studio merge upload remains enabled for admin');
      await page.evaluate(()=>openModalSheet('music','15 bài hát Quân đội'));await page.waitForFunction(()=>document.querySelectorAll('#modal-song-list .sheet-action-item').length===12);
      assert.equal(await page.$$('input#song-file-input').then(e=>e.length),0);assert.equal(await page.$$('.song-cat-dropdown').then(e=>e.length),0);
      await page.screenshot({path:path.join(out,name+'-fixed-library.png')});
      await page.evaluate(()=>closeModal());
      const paths=await page.evaluate(()=>GdqMusicCatalog.songs.map(s=>({url:s.url,size:s.size})));for(const media of paths){const response=await fetch(url+'/'+(name==='android'?'mobile/www/':'')+media.url);assert(response.ok,'Bundled media missing '+media.url);assert.equal((await response.arrayBuffer()).byteLength,media.size);}
      const sample=await page.evaluate(()=>GdqMusicCatalog.songs[0]);
      await page.evaluate(song=>{AudioEngine.playAudioUrl(song.url,song.name,{trackId:song.id,isMusicTrack:true});},sample);
      await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='playing');await page.evaluate(()=>handleStopAll());
      const blocked=await page.evaluate(async()=>{try{await StorageManager.saveSong({name:'Forbidden upload'},new Blob(['test']));return false;}catch{return true;}});assert(blocked,'Library upload API cannot add songs');
      account.db.prepare("UPDATE users SET role='user' WHERE email=?").run('library-qa@example.test');
      page.once('dialog',dialog=>dialog.accept());
      await page.evaluate(()=>GdqAccount.refresh());
      assert(await page.evaluate(()=>!GdqAccount.admin&&document.querySelectorAll('input[type=file]').length>0&&[...document.querySelectorAll('input[type=file]')].every(e=>e.disabled)),'Reader cannot upload audio');
      assert(await page.evaluate(()=>!document.getElementById('gdq-studio-library')&&!document.getElementById('account-upload-studio')),'Legacy studio library remains removed');
      account.db.prepare("UPDATE users SET role='admin' WHERE email=?").run('library-qa@example.test');
      assert.deepEqual(errors,[]);results.push({platform:name,...library,nonStudioUploadsBlocked:true,studioUploadsEnabled:true,legacyStudioLibraryRemoved:true,playAndStop:true,errors});console.log('PASS',name,JSON.stringify(library));await context.close();
    }
    fs.writeFileSync(path.join(out,'fixed-library-results.json'),JSON.stringify(results,null,2));
  }finally{await browser.close();server.close();await new Promise(r=>account.server.close(r));account.close();assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
