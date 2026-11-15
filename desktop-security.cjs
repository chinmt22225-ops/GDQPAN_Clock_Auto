const {fileURLToPath}=require('node:url');
const path=require('node:path');
function localPage(url,expected){try{const parsed=new URL(url);return parsed.protocol==='file:'&&path.resolve(fileURLToPath(parsed)).toLowerCase()===path.resolve(expected).toLowerCase();}catch{return false;}}
function trustedIPC(event,windows){return windows.some(({window,page})=>window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&localPage(event.senderFrame.url,page));}
function mediaUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
function allowPermission(contents,permission,details,main,page){
  return !!main&&!main.isDestroyed()&&contents===main.webContents&&permission==='media'&&localPage(details.requestingUrl||contents.getURL(),page)&&Array.isArray(details.mediaTypes)&&details.mediaTypes.length>0&&details.mediaTypes.every(type=>type==='audio');
}
function protectWindow(window,page){
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!localPage(url,page))event.preventDefault();});
  window.webContents.on('will-redirect',(event,url)=>{if(!localPage(url,page))event.preventDefault();});
  window.webContents.on('will-attach-webview',(event,prefs,params)=>{
    if(!mediaUrl(params.src)){event.preventDefault();return;}
    delete prefs.preload;delete prefs.preloadURL;
    Object.assign(prefs,{nodeIntegration:false,nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false});
  });
  window.webContents.on('did-attach-webview',(_event,contents)=>contents.setWindowOpenHandler(()=>({action:'deny'})));
}
module.exports={localPage,trustedIPC,mediaUrl,protectWindow,allowPermission};
