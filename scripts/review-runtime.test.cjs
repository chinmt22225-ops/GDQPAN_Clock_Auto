const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),{pathToFileURL}=require('node:url');
const {localPage,trustedIPC,mediaUrl,protectWindow,allowPermission}=require('../desktop-security.cjs');
test('IPC rejects unknown window/subframe/page and webview drops privileged options',()=>{
  const page=path.resolve('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'),url=pathToFileURL(page).href;
  const wc={mainFrame:{url}},window={webContents:wc,isDestroyed:()=>false};const windows=[{window,page}];
  assert(localPage(url+'?x=1#section',page));assert(!localPage('https://example.test',page));assert(trustedIPC({sender:wc,senderFrame:wc.mainFrame},windows));
  assert(!trustedIPC({sender:wc,senderFrame:{url}},windows));assert(!trustedIPC({sender:{mainFrame:wc.mainFrame},senderFrame:wc.mainFrame},windows));
  assert(allowPermission(wc,'media',{requestingUrl:url,mediaTypes:['audio']},window,page));assert(!allowPermission(wc,'media',{requestingUrl:'https://example.test',mediaTypes:['audio']},window,page));assert(!allowPermission(wc,'media',{requestingUrl:url,mediaTypes:['video']},window,page));
  assert(!mediaUrl('javascript:alert(1)'));assert(!mediaUrl('file:///private'));assert(mediaUrl('https://example.test/live.m3u8'));
  const handlers={};wc.on=(name,handler)=>handlers[name]=handler;wc.setWindowOpenHandler=handler=>wc.open=handler;protectWindow(window,page);assert.equal(wc.open().action,'deny');
  let prevented=false;handlers['will-navigate']({preventDefault(){prevented=true;}},'https://example.test');assert(prevented);
  const prefs={preload:'evil.js',nodeIntegration:true};handlers['will-attach-webview']({preventDefault(){throw Error('valid HTTPS unexpectedly blocked');}},prefs,{src:'https://example.test'});assert(!prefs.preload);assert.equal(prefs.nodeIntegration,false);assert.equal(prefs.sandbox,true);assert.equal(prefs.webSecurity,true);
});
test('preload strips native events and removes wrapped listener correctly',()=>{
  const exposed={},callbacks=new Map();const ipc={invoke(){},on(c,f){callbacks.set(c,f);},removeListener(c,f){if(callbacks.get(c)===f)callbacks.delete(c);}};
  vm.runInNewContext(fs.readFileSync(path.resolve('preload.js'),'utf8'),{require:()=>({contextBridge:{exposeInMainWorld(k,v){exposed[k]=v;}},ipcRenderer:ipc}),Map,Set});
  let captured;const listener=(...args)=>captured=args;exposed.ipcRenderer.on('load-vtv-stream',listener);callbacks.get('load-vtv-stream')({sender:'privileged'},'https://example.test');assert.deepEqual(captured,[null,'https://example.test']);exposed.ipcRenderer.removeListener('load-vtv-stream',listener);assert(!callbacks.has('load-vtv-stream'));assert.throws(()=>exposed.ipcRenderer.on('arbitrary',()=>{}));
});
test('TTS malformed parameters are rejected; foreign origins cannot call service; busy port is not claimed',async()=>{
  const {startInternalTtsServer,stopInternalTtsServer}=require('../tts_server');const owned=await startInternalTtsServer(0),base='http://127.0.0.1:'+owned.address().port;
  try{
    assert.equal((await fetch(base+'/api/status')).status,200);assert.equal((await fetch(base+'/api/status',{headers:{Origin:'https://untrusted.example'}})).status,403);
    assert.equal((await fetch(base+'/api/status',{headers:{Origin:'null'}})).status,200);
    for(const query of ['text=a&text=b','text=a&voice=x&voice=y','text=a&region=x&region=y'])assert.equal((await fetch(base+'/api/tts?'+query)).status,400);
    assert.equal((await fetch(base+'/api/status',{method:'POST'})).status,405);
  }finally{await new Promise(r=>owned.close(r));stopInternalTtsServer();}
  const unrelated=http.createServer((_q,r)=>r.end('other-service'));await new Promise(r=>unrelated.listen(0,'127.0.0.1',r));
  try{await assert.rejects(startInternalTtsServer(unrelated.address().port),e=>e.code==='EADDRINUSE');assert.equal(await fetch('http://127.0.0.1:'+unrelated.address().port).then(r=>r.text()),'other-service');}finally{await new Promise(r=>unrelated.close(r));}
});
