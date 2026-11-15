// Source UI + real playback with disposable account data, never the production account.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const puppeteer=require('../mobile/node_modules/puppeteer-core'),asar=require('@electron/asar');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/monthly-audio-2026-10-15');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'qa/music-catalog-build.json'),'utf8'));
const oldText=asar.extractFile(path.join(root,'qa/package-15102026/windows/win-unpacked/resources/app.asar'),'assets/music-catalog.js').toString();
const old=JSON.parse(oldText.slice(oldText.indexOf(' = ')+3).trim().replace(/;$/,''));
for(const song of old.songs)assert.deepEqual(catalog.songs.find(s=>s.id===song.id),song,'Existing song changed');
const counts=[6,6,7,7,7,7,7,5,5,7,8,7];
for(let i=1;i<=12;i++)assert.equal(catalog.songs.filter(s=>s.category==='Nhạc tháng '+i).length,counts[i-1]);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdq-months-'));
let app,browser,server;const report={oldSongsPreserved:old.songs.length,added:catalog.songs.length-old.songs.length,pages:[]};
(async()=>{try{
 server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.m4a':'audio/mp4'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const {createApplication}=await import('../server/src/server.js');app=createApplication({local:true,data:temp,origins:url});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const api='http://127.0.0.1:'+app.server.address().port;
 await app.createAdmin('monthly-qa@example.test','Monthly-QA-password-123');
 browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 for(const [name,file,width,height]of [['windows','HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html',1366,900],['android','mobile/www/index.html',390,844]]){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width,height});await page.goto(url+'/'+file);await page.waitForSelector('#account-form');
  await page.evaluate(api=>{document.getElementById('account-server').value=api;document.getElementById('account-email').value='monthly-qa@example.test';document.getElementById('account-password').value='Monthly-QA-password-123';document.getElementById('account-form').requestSubmit();},api);
  await page.waitForFunction(()=>!GdqAccount.blocked&&!document.getElementById('account-overlay').classList.contains('visible'));
  if(name==='android'){await page.waitForFunction(()=>GdqMobile.libraryReady);await page.evaluate(()=>GdqMobile.switchPage('audio'));}
  const songs=await page.evaluate(()=>StorageManager.getAllSongs());assert.equal(songs.length,174);assert.equal(new Set(songs.map(s=>s.id)).size,songs.length);
  const selector=name==='android'?'#mobile-music-category':'#fixed-music-category';
  const categories=await page.$$eval(selector+' option',items=>items.map(i=>i.value));
  const result={name,total:songs.length,months:[],errors};report.pages.push(result);
  for(let i=1;i<=12;i++){
   const category='Nhạc tháng '+i;assert(categories.includes(category));await page.select(selector,category);
   await page.evaluate(category=>GdqFixedMusic.open(category),category);
   await page.waitForFunction(n=>document.querySelectorAll('#modal-song-list .sheet-action-item').length===n,{},counts[i-1]);
   const sample=songs.find(s=>s.category===category);await page.evaluate(song=>{void AudioEngine.playAudioUrl(song.url,song.name,{trackId:song.id,isMusicTrack:true});},sample);
   await page.waitForFunction(()=>AudioEngine.getCurrentPlaybackState()==='playing',{timeout:15000});await page.evaluate(()=>handleStopAll(true));
   result.months.push({month:i,tracks:counts[i-1],playback:true});
   if(i===12)await page.screenshot({path:path.join(out,name+'-month-12.png'),fullPage:true});
   await page.evaluate(()=>closeModal());
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();console.log('PASS',name,'174 total; 12 months filter and playback');
 }
}catch(e){report.fatal=e.stack;process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();if(app){await new Promise(r=>app.server.close(r));app.close();}if(server)await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}})();
