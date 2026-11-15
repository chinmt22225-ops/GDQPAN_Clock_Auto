const http=require('node:http'),https=require('node:https');
function fetchPage(value,headers={},options={},redirects=0){
  const {timeout=10000,maxBytes=2*1024*1024,maxRedirects=5}=options;
  return new Promise((resolve,reject)=>{
    let url;try{url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('URL trang không hợp lệ.');}catch(e){reject(e);return;}
    const req=(url.protocol==='https:'?https:http).get(url,{headers,timeout},res=>{
      res.on('error',reject);
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();if(redirects>=maxRedirects){reject(Error('Quá nhiều redirect.'));return;}let next;try{next=new URL(res.headers.location,url).href;}catch(e){reject(e);return;}fetchPage(next,headers,options,redirects+1).then(resolve,reject);return;}
      if(res.statusCode<200||res.statusCode>=300){res.resume();reject(Error('HTTP '+res.statusCode));return;}
      let size=0;const chunks=[];res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy(Error('Trang vượt giới hạn kích thước.'));return;}chunks.push(chunk);});res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error',reject);req.on('timeout',()=>req.destroy(Error('timeout')));
  });
}
module.exports={fetchPage};
