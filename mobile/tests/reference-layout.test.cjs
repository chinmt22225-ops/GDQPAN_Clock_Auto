// Geometry only; account overlay hidden solely for screenshots. No authorization assertions.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const root=path.resolve(__dirname,'../www'),out=path.resolve(__dirname,process.env.GDQ_LAYOUT_OUTPUT||'../../qa/ui-20261019/layout');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(req.url==='/favicon.ico'?204:404).end();return;}
  const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  let browser;const results=[];
  try{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
    for(const [width,height] of [[320,568],[360,640],[390,844],[412,915],[600,960],[767,1024],[768,1024],[820,1180],[1024,1366],[844,390],[1180,820]]){
      for(const phase of ['before','after']){
        if(process.env.GDQ_LAYOUT_PHASE&&phase!==process.env.GDQ_LAYOUT_PHASE)continue;
        if(phase==='before'&&![390,820].includes(width))continue;
        const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.setViewport({width,height,isMobile:true,hasTouch:true});
        await page.setRequestInterception(true);
        page.on('request',req=>{
          if(req.url().endsWith('/assets/server-config.js'))return req.respond({contentType:'application/javascript',body:'window.GdqServerConfig={url:"",demo:false};'});
          if(phase==='before'&&req.url().endsWith('/mobile-reference.css'))return req.respond({contentType:'text/css',body:''});
          return req.continue();
        });
        await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
        await page.waitForFunction(()=>window.GdqMobile?.libraryReady);
        await page.addStyleTag({content:'#account-overlay{display:none!important}'});
        await page.waitForFunction(()=>[...document.querySelectorAll('.mobile-header img')].every(img=>img.complete&&img.naturalWidth>0));
        if(phase==='after'){
          const banner=await page.evaluate(()=>{
            const brand=document.querySelector('.mobile-brand').getBoundingClientRect(),logo=document.querySelector('.mobile-brand-logo').getBoundingClientRect();
            const photo=document.querySelector('.mobile-system-banner').getBoundingClientRect(),title=document.querySelector('.mobile-system-banner h1').getBoundingClientRect();
            return {universityRemoved:!document.querySelector('.mobile-header .mobile-university'),logoWidth:logo.width,logoCentered:Math.abs((brand.left+brand.right-logo.left-logo.right)/2)<1,titleAtTop:title.top-photo.top<photo.height*.2,titleContained:title.left>=photo.left&&title.right<=photo.right&&title.bottom<=photo.bottom,titleTextFits:[...document.querySelectorAll('.mobile-system-banner h1 span')].every(el=>el.getBoundingClientRect().width>=el.scrollWidth-1)};
          });
          assert(banner.universityRemoved&&banner.logoWidth>=64&&banner.logoCentered&&banner.titleAtTop&&banner.titleContained&&banner.titleTextFits,`${width}: banner geometry ${JSON.stringify(banner)}`);
        }
        await page.screenshot({path:path.join(out,`${width}-${height}-${phase}-home.png`),fullPage:true});
        if(phase==='after')await (await page.$('.header')).screenshot({path:path.join(out,`${width}-${height}-banner.png`)});
        const row={width,height,phase,pages:[]};
        for(const name of ['home','daily','audio','schedule','more','studio','custom','vtv']){
          await page.evaluate(name=>GdqMobile.switchPage(name),name);
          const geometry=await page.evaluate(()=>{
            const nav=document.querySelector('.mobile-nav').getBoundingClientRect();
            return {overflow:document.documentElement.scrollWidth>innerWidth+1,innerWidth,innerHeight,navHeight:nav.height,navBottom:nav.bottom,buttons:[...document.querySelectorAll('.mobile-nav button')].map(e=>e.getBoundingClientRect().height),heading:document.querySelector('#mobile-heading').textContent};
          });
          assert(!geometry.overflow,`${width}/${name}: horizontal overflow`);
          assert.equal(geometry.innerWidth,width,`${width}/${name}: viewport must not expand to hide overflow`);
          assert(geometry.buttons.every(h=>h>=48),`${width}: touch targets`);
          assert(Math.abs(geometry.navBottom-geometry.innerHeight)<=1,`${width}/${name}: fixed navigation ${JSON.stringify(geometry)}`);
          row.pages.push({name,...geometry});
        }
        if(phase==='after'&&width===390){
          await page.evaluate(()=>GdqMobile.switchPage('home'));
          // Text zoom approximates larger text; does not stand in for Android font-scale QA.
          await page.addStyleTag({content:'.mobile-quick button b,.mobile-next p{font-size:150%!important}'});
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          await page.screenshot({path:path.join(out,'390-text-150.png'),fullPage:true});
        }
        assert.deepEqual(errors,[]);results.push(row);await page.close();
        console.log('PASS',width,height,phase,'8 pages');
      }
    }
  }finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
