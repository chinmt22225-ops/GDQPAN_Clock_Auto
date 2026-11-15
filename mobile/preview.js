const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'www');
http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.json':'application/json'};
  const size=fs.statSync(file).size,range=req.headers.range;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
  if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416).end();return;}const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),size-1):size-1;if(start> end){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{'Content-Length':size});fs.createReadStream(file).pipe(res);}
}).listen(4173,'127.0.0.1',()=>console.log('GDQPAN mobile preview: http://127.0.0.1:4173'));
