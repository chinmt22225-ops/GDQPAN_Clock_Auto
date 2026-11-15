const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const puppeteer=require('../mobile/node_modules/puppeteer-core');
const root=path.resolve(__dirname,'..');
const folders=JSON.parse(fs.readFileSync(path.join(root,'config','music-sources.json'),'utf8')).sources.map(s=>s.folder);
const entries=[];
for(const folder of folders)for(const file of fs.readdirSync(path.join(root,'Sound',folder)).sort()){
  const relative=['Sound',folder,file].join('/'),absolute=path.join(root,relative),stat=fs.statSync(absolute);
  if(!stat.isFile())continue;
  const data=fs.readFileSync(absolute);
  entries.push({path:relative,folder,file,size:stat.size,sha256:crypto.createHash('sha256').update(data).digest('hex'),url:relative.split('/').map(encodeURIComponent).join('/')});
}
const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local audio QA</title>');return;}
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(req.url));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(path.join(root,'Sound')+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type','application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser=await puppeteer.launch({executablePath:executable,headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
    for(const entry of entries){
      try{entry.duration=await page.evaluate(async url=>{const response=await fetch('/'+url),context=new AudioContext();try{const buffer=await context.decodeAudioData(await response.arrayBuffer());return buffer.duration;}finally{await context.close();}},entry.url);entry.valid=entry.duration>0;}
      catch(error){entry.valid=false;entry.error=error.message;}
      if(!entry.valid)console.log('INVALID',entry.path);
    }
    const seen=new Map();for(const entry of entries.filter(e=>e.valid)){if(seen.has(entry.sha256))entry.duplicateOf=seen.get(entry.sha256);else seen.set(entry.sha256,entry.path);}
    const output=path.join(root,'qa','audio-audit.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({folders,entries},null,2));
    console.log(JSON.stringify({total:entries.length,valid:entries.filter(e=>e.valid).length,uniqueValid:entries.filter(e=>e.valid&&!e.duplicateOf).length,invalid:entries.filter(e=>!e.valid).map(e=>e.path),duplicates:entries.filter(e=>e.duplicateOf).map(e=>({path:e.path,of:e.duplicateOf})),output},null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
