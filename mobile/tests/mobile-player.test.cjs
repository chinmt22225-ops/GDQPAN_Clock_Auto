const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const puppeteer=require('puppeteer-core'),{exercisePlayer}=require('./player-checks.cjs');
const root=path.resolve(__dirname,'../www'),out=path.resolve(__dirname,'../../qa/player-20261021');
const baseline=process.env.GDQ_PLAYER_BASELINE==='1',results=[];
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(req.url==='/favicon.ico'?204:404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{let browser,account,temp;try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const {createApplication}=await import('../../server/src/server.js');temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-player-'));
  account=createApplication({local:true,data:temp,origins:url});await new Promise(r=>account.server.listen(0,'127.0.0.1',r));const accountUrl='http://127.0.0.1:'+account.server.address().port;
  await account.createAdmin('player@example.test','Player-QA-only-123');
  const executablePath=process.env.CHROME_BIN||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
  browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--mute-audio','--autoplay-policy=no-user-gesture-required']});
  for(const [width,height] of (baseline?[[360,800]]:[[320,568],[360,800],[412,915],[820,1180],[844,390]])){
    const context=await browser.createBrowserContext(),page=await context.newPage();await page.setViewport({width,height,isMobile:true,hasTouch:true});
    await page.setRequestInterception(true);page.on('request',req=>{
      if(req.url().endsWith('/assets/server-config.js'))return req.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'});
      if(baseline&&req.url().endsWith('/mobile-player.js'))return req.respond({contentType:'application/javascript',body:''});
      if(baseline&&/\/mobile-(reference|ui)\.css$/.test(req.url()))return req.respond({contentType:'text/css',body:fs.readFileSync(path.join(out,'baseline',path.basename(req.url())),'utf8')});
      return req.continue();
    });
    await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>GdqMobile?.libraryReady&&!document.getElementById('account-form').inert);
    await page.evaluate(accountUrl=>{document.getElementById('account-server').value=accountUrl;document.getElementById('account-email').value='player@example.test';document.getElementById('account-password').value='Player-QA-only-123';document.getElementById('account-form').requestSubmit();},accountUrl);
    await page.waitForFunction(()=>!GdqAccount.blocked);
    if(!baseline)await page.waitForFunction(()=>GdqMobile.playerReady);
    results.push({width,height,...await exercisePlayer(page,{out:path.join(out,baseline?'before':`${width}-${height}`),baseline})});
    await context.close();console.log('PASS viewport',width,height);
  }
}catch(e){results.push({fatal:e.stack});console.error(e);process.exitCode=1;}finally{
  if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));
  if(account){account.server.closeAllConnections();await new Promise(r=>account.server.close(r));account.close();}
  if(temp){if(!path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe temp path');fs.rmSync(temp,{recursive:true,force:true});}
  fs.writeFileSync(path.join(out,baseline?'baseline.json':'web-results.json'),JSON.stringify(results,null,2));
}})();
