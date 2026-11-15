// Decode every supplied MP3 in an isolated browser; no external uploads.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const puppeteer=require('../mobile/node_modules/puppeteer-core');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/monthly-audio-2026-10-15');
const inventory=JSON.parse(fs.readFileSync(path.join(out,'inventory.json'),'utf8'));
const entries=inventory.entries.sort((a,b)=>a.month-b.month||a.name.localeCompare(b.name,'vi'));
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Monthly audio QA</title>');return;}
 const match=/^\/audio\/(\d+)$/.exec(req.url);const entry=match&&entries[Number(match[1])];if(!entry){res.writeHead(404).end();return;}
 res.setHeader('Content-Type','audio/mpeg');fs.createReadStream(path.join(root,entry.path)).pipe(res);
});
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 for(let i=0;i<entries.length;i++){
  const entry=entries[i];try{
   entry.duration=await page.evaluate(async index=>{const context=new AudioContext();try{const r=await fetch('/audio/'+index);if(!r.ok)throw Error('Missing media');const audio=await context.decodeAudioData(await r.arrayBuffer());return audio.duration;}finally{await context.close();}},i);
   entry.valid=entry.duration>0;
  }catch(e){entry.valid=false;entry.error=e.message;}
 }
 const result={...inventory,entries,valid:entries.filter(e=>e.valid).length,invalid:entries.filter(e=>!e.valid)};
 fs.writeFileSync(path.join(out,'decode-audit.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({total:entries.length,valid:result.valid,invalid:result.invalid.map(e=>({month:e.month,name:e.name,error:e.error}))}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
