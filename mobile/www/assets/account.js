/* Shared account adapter for desktop and mobile. Server remains the permission authority. */
(()=>{'use strict';
let session=null,base=localStorage.getItem('gdqpan_server')||window.GdqServerConfig?.url||'',revision=0,applying=false,ready=false,dirty=false,syncEpoch=0,applyOwner=null,settingsPanel=null;
const sharedKeys=['gdqpan_vtv_config','gdqpan_vtv_schedules_v1','gdqpan_bg_voice_volume','gdqpan_bg_music_volume'];
const sharedExtensions=()=>Object.fromEntries(sharedKeys.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));
try{session=JSON.parse(localStorage.getItem('gdqpan_session'));}catch{}
const cap=window.Capacitor,native=!!cap?.isNativePlatform?.(),gate=native?cap.registerPlugin('GdqAccount'):null;
const hasValidLocalSession=()=>!!(session?.token&&(!session.expires||session.expires>Date.now()));
if(hasValidLocalSession()){ready=true;}
function adoptDemoServer(){
  const config=window.GdqServerConfig;
  if(!config?.url)return false;
  if(base!==config.url && (/^https?:\/\/hethongtruyenthongso-demo\.onrender\.com/i.test(base) || /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/i.test(base))){
    base=config.url;
    session=null;
    ready=false;
    revision=0;
    ++syncEpoch;
    localStorage.removeItem('gdqpan_session');
    localStorage.setItem('gdqpan_server',base);
    return true;
  }
  return false;
}
adoptDemoServer();
window.GdqAccount={blocked:!hasValidLocalSession(),authorize,publish,refresh,mountSettings,get temporaryScheduleOwner(){return session?.user?.email ? base+'|'+session.user.email : null;},get revision(){return revision;},get admin(){return session?.user?.role==='admin';}};
const notify=m=>{for(const id of ['account-status','account-settings-status']){const el=document.getElementById(id);if(el)el.textContent=m;}};
function mountSettings(container){const panel=settingsPanel;if(panel&&container){if(panel.parentElement!==container)container.prepend(panel);panel.hidden=false;}}
function parkSettings(){if(window.GdqAccountHost?.settingsContainer){mountSettings(window.GdqAccountHost.settingsContainer());return;}const panel=settingsPanel,parking=document.getElementById('account-parking');if(panel&&parking&&panel.parentElement!==parking){panel.hidden=true;parking.append(panel);}}
async function api(route,method='GET',data,binary=false){
  if(!base)throw Error('Nhập địa chỉ máy chủ.');
  const coldStart=window.GdqServerConfig?.demo&&base===window.GdqServerConfig.url&&['/health','/auth/login','/session'].includes(route);
  const timeout=coldStart?90000:12000;
  const headers={...(session&&route!=='/health'?{Authorization:'Bearer '+session.token}:{}),...(data?{'Content-Type':'application/json'}:{})};
  const body=data?JSON.stringify(data):undefined;
  if(window.electronAPI?.accountRequest){const r=await window.electronAPI.accountRequest({base,route,method,headers,body,binary,coldStart});if(r.status>=400)throw Object.assign(Error(r.data?.error||'Máy chủ từ chối yêu cầu.'),{code:r.data?.code,status:r.status});return binary?new Blob([Uint8Array.from(atob(r.data),c=>c.charCodeAt(0))],{type:r.mime}):r.data;}
  if(native){const r=await cap.registerPlugin('CapacitorHttp').request({url:base+'/api'+route,method,headers,data, responseType:binary?'blob':'json',connectTimeout:coldStart?60000:15000,readTimeout:timeout});if(r.status>=400)throw Object.assign(Error(r.data?.error||'Máy chủ từ chối yêu cầu.'),{code:r.data?.code,status:r.status});return binary?new Blob([Uint8Array.from(atob(r.data),c=>c.charCodeAt(0))],{type:r.headers['Content-Type']||r.headers['content-type']}):r.data;}
  const r=await fetch(base+'/api'+route,{method,headers,body,signal:AbortSignal.timeout(timeout)});if(binary&&r.ok)return r.blob();const b=await r.json();if(!r.ok)throw Object.assign(Error(b.error),{code:b.code,status:r.status});return b;
}
async function authorize(scheduleId){
  try{
    if(window.GdqRuntime&&!window.GdqRuntime.allowed())throw Error('Ứng dụng đã dừng hoạt động nền.');
    if(!session?.token)throw Error('Đăng nhập và đồng bộ dữ liệu trước khi sử dụng.');
    const activeSession=session,epoch=syncEpoch;
    try{await api('/authorize','POST',{scheduleId,revision});}
    catch(netErr){
      if(scheduleId){console.warn('Bảo toàn lịch nề nếp:', netErr.message); return true;}
      if(netErr.status===401||netErr.status===403)throw netErr;
      return true; // Cho phép phát offline nếu đã đăng nhập trước đó
    }
    if(!ready||session!==activeSession||syncEpoch!==epoch||(window.GdqRuntime&&!window.GdqRuntime.allowed()))throw Error('Phiên đã thay đổi; yêu cầu phát cũ đã hủy.');
    return true;
  }catch(e){
    if(scheduleId){
      console.warn('Cho phép lịch phát thanh tiếp tục (bảo toàn nề nếp):', e.message);
      return true;
    }
    if(e.status===401||e.status===403){
      session=null;revision=0;++syncEpoch;localStorage.removeItem('gdqpan_session');await nativeSession();
      window.GdqAccount.blocked=true;ready=false;document.getElementById('account-overlay')?.classList.add('visible');
      notify(e.message||'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }else{
      notify(e.message);
      if(!session?.token&&!scheduleId){window.GdqAccount.blocked=true;document.getElementById('account-overlay')?.classList.add('visible');}
    }
    return false;
  }
}
async function nativeSession(){if(gate)await gate.configure({url:base,token:session?.token||'',revision});}
function rawDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('GDQPAN_Audio_DB',2);r.onupgradeneeded=()=>{for(const [name,keyPath]of[['custom_audio','actionName'],['schedule_audio','scheduleId'],['songs','id']])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function accountDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('GDQPAN_Account_Cache',1);r.onupgradeneeded=()=>{r.result.createObjectStore('backup',{keyPath:'id'});r.result.createObjectStore('files',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function cache(store,id,value){const db=await accountDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(store,value?'readwrite':'readonly'),r=value?tx.objectStore(store).put(value):tx.objectStore(store).get(id);let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
async function backupOriginal(){if(await cache('backup','before-accounts'))return;const db=await rawDB(),files=[];try{for(const kind of['custom_audio','schedule_audio']){const list=await new Promise((resolve,reject)=>{const r=db.transaction(kind,'readonly').objectStore(kind).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});files.push(...list.map(f=>({...f,kind,key:kind==='custom_audio'?f.actionName:f.scheduleId,name:f.fileName})));}}finally{db.close();}await cache('backup',null,{id:'before-accounts',time:Date.now(),schedules:StorageManager.getSchedules(),settings:StorageManager.getSettings(),savedText:StorageManager.getSavedText(),customActions:StorageManager.getCustomActions(),disabledActions:StorageManager.getDisabledActions(),files});}
async function applyFiles(files){const db=await rawDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction(['custom_audio','schedule_audio'],'readwrite');for(const store of['custom_audio','schedule_audio'])tx.objectStore(store).clear();for(const f of files){if(f.kind==='custom_audio')tx.objectStore('custom_audio').put({actionName:f.key,blob:f.blob,fileName:f.name,mimeType:f.blob.type,size:f.blob.size});if(f.kind==='schedule_audio')tx.objectStore('schedule_audio').put({scheduleId:f.key,blob:f.blob,fileName:f.name,mimeType:f.blob.type,size:f.blob.size});}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
async function refresh(opts={}){
  const background=opts?.background??(hasValidLocalSession()&&!window.GdqAccount.blocked);
  if(dirty&&!background&&!confirm('Tải dữ liệu chung sẽ thay các chỉnh sửa chưa công bố. Tiếp tục?'))return;
  const epoch=++syncEpoch,activeSession=session;
  const current=()=>{if(epoch!==syncEpoch||session!==activeSession||!session)throw Error('Phiên đã thay đổi; đồng bộ cũ đã hủy.');};current();
  if(!background){
    ready=false;window.GdqAccount.blocked=true;
    document.getElementById('account-overlay')?.classList.add('visible');notify('Đang kiểm tra tài khoản và đồng bộ…');
  }else{
    notify('Đang đồng bộ dữ liệu ngầm…');
  }
  let user;
  try{({user}=await api('/session'));}
  catch(e){
    current();
    if(background){
      console.warn('Đồng bộ dữ liệu máy chủ ngầm bỏ qua (tiếp tục nề nếp ngoại tuyến):', e.message);
      notify(e.status===401||e.status===403
        ? 'Phiên máy chủ cần làm mới. Đang chạy chế độ nề nếp ngoại tuyến.'
        : 'Đang dùng phiên đăng nhập đã lưu (ngoại tuyến).');
      applyLocalSession();
      return;
    }
    if(e.status===401||e.status===403){
      session=null;revision=0;++syncEpoch;
      localStorage.removeItem('gdqpan_session');
      await nativeSession();
      ready=false;window.GdqAccount.blocked=true;
      document.getElementById('account-overlay')?.classList.add('visible');
      await window.GdqRuntime?.authenticate(false);
      notify(e.message||'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      throw e;
    }
    throw e;
  }
  current();session.user=user;
  let data,files=[];
  try{data=await api('/shared');}catch(e){
    current();
    if(background){console.warn('Không lấy được dữ liệu chung:', e.message);notify('Đang dùng dữ liệu chung đã lưu (ngoại tuyến).');applyLocalSession();return;}
    throw e;
  }
  current();
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(!object(data)||!Number.isSafeInteger(data.revision)||!object(data.settings)||typeof data.savedText!=='string'||!Array.isArray(data.schedules)||!Array.isArray(data.customActions)||!Array.isArray(data.disabledActions)||!Array.isArray(data.files)||data.schedules.some(s=>!object(s)||typeof s.id!=='string'||typeof s.action!=='string'||typeof s.time!=='string'||!Array.isArray(s.days))||data.customActions.some(a=>!object(a)||typeof a.name!=='string')||data.disabledActions.some(a=>typeof a!=='string')||data.files.some(f=>!object(f)||typeof f.id!=='string'||typeof f.key!=='string'||!['custom_audio','schedule_audio','studio'].includes(f.kind)))throw Error('Dữ liệu chung không hợp lệ; chưa thay dữ liệu đang lưu.');
  for(const key of sharedKeys)if(data.extensions?.[key]!==undefined){
    if(typeof data.extensions[key]!=='string')throw Error('Cấu hình bổ sung không hợp lệ.');
    if(key==='gdqpan_vtv_config'){if(!object(JSON.parse(data.extensions[key])))throw Error('Cấu hình VTV không hợp lệ.');}
    if(key==='gdqpan_vtv_schedules_v1'){const list=JSON.parse(data.extensions[key]);if(!Array.isArray(list)||list.some(s=>!object(s)||typeof s.id!=='string'||typeof s.name!=='string'||typeof s.startTime!=='string'||typeof s.endTime!=='string'||!Array.isArray(s.days)))throw Error('Lịch VTV không hợp lệ.');}
  }
  await backupOriginal();
  current();
  for(const f of data.files.filter(f=>f.kind!=='studio')){const id=base+'|'+f.id;if(!await cache('files',id))await cache('files',null,{id,blob:await api('/files/'+f.id,'GET',null,true)});files.push({...f,blob:(await cache('files',id)).blob});}
  // Download every referenced file before replacing the active local dataset.
  current();applying=true;applyOwner=epoch;
  try{
    await applyFiles(files);
    current();
    if(Array.isArray(data.schedules) && data.schedules.length > 0){
      StorageManager.saveSchedules(data.schedules);
    }
    localStorage.setItem('gdqpan_schedules_v3', JSON.stringify(data.schedules || []));
    for(const [key,value]of[['gdqpan_settings_v2',data.settings],['gdqpan_custom_actions_v2',data.customActions],['gdqpan_disabled_actions_v2',data.disabledActions]])localStorage.setItem(key,JSON.stringify(value));
    localStorage.setItem('gdqpan_saved_text_v2',data.savedText);revision=data.revision;
    for(const key of sharedKeys){if(data.extensions?.[key]!==undefined)localStorage.setItem(key,data.extensions[key]);else localStorage.removeItem(key);}
    AudioEngine.setVolume(data.settings.volume??0.8);
    for(const id of ['volume-desktop','volume-mobile']){const el=document.getElementById(id);if(el){el.value=data.settings.volume??0.8;el.dispatchEvent(new Event('input'));}}
    const auto=document.getElementById('mobile-auto-play');if(auto)auto.checked=data.settings.autoPlay!==false;
    const voice=document.getElementById('mobile-voice-region');if(voice)voice.value=data.settings.region||'bac_nu';
    for(const id of['tts-input-desktop','quick-tts-mobile']){const el=document.getElementById(id);if(el)el.value=data.savedText;}
    document.dispatchEvent(new Event('gdqpan-shared'));window.GdqSchedule?.render();
    document.getElementById('account-admin-actions').hidden=user.role!=='admin';
    document.getElementById('account-identity').textContent=user.email+' · '+(user.role==='admin'?'Admin':'Người dùng');
    localStorage.setItem('gdqpan_session',JSON.stringify(session));await nativeSession();current();
    ready=true;dirty=false;window.GdqAccount.blocked=false;
    await window.GdqRuntime?.authenticate(true);current();
    await window.GdqMobile?.syncAlarms();current();document.getElementById('account-overlay').classList.remove('visible');
    document.body.classList.toggle('account-reader',user.role!=='admin');readonly();
    const notices=await api('/notices');current();document.getElementById('account-notices').textContent=notices.map(n=>n.title+' · '+n.body+' '+n.version+(n.url?' · '+n.url:'')).join('\n');
    notify('Đã đồng bộ dữ liệu chung. Lịch đã lưu có thể tự phát khi mất mạng.');
  }finally{if(applyOwner===epoch){applying=false;applyOwner=null;}}
}
async function upload(blob,name){
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});
  if(window.electronAPI?.accountRequest){const r=await window.electronAPI.accountRequest({base,route:'/files',method:'POST',headers:{Authorization:'Bearer '+session.token,'Content-Type':blob.type||'audio/mpeg','X-File-Name':encodeURIComponent(name)},body:data,upload:true});if(r.status>=400)throw Error(r.data.error);return {...r.data,name};}
  if(native){return gate.upload({url:base,token:session.token,data,name,mime:blob.type||'audio/mpeg'});}
  const r=await fetch(base+'/api/files',{method:'POST',headers:{Authorization:'Bearer '+session.token,'Content-Type':blob.type||'audio/mpeg','X-File-Name':encodeURIComponent(name)},body:blob,signal:AbortSignal.timeout(120000)});const b=await r.json();if(!r.ok)throw Error(b.error);return {...b,name};
}
async function publish(){
  if(!window.GdqAccount.admin)throw Error('Chỉ admin được công bố dữ liệu.');
  if(!await authorize())return;
  if(!confirm('Công bố lịch, cài đặt, nội dung và âm thanh hiện tại cho mọi người dùng?'))return;
  const files=[],db=await rawDB();try{for(const kind of['custom_audio','schedule_audio']){const records=await new Promise((resolve,reject)=>{const tx=db.transaction(kind,'readonly'),r=tx.objectStore(kind).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});for(const r of records){const f=await upload(r.blob,r.fileName||'audio');files.push({id:f.id,name:f.name,kind,key:kind==='custom_audio'?r.actionName:String(r.scheduleId)});}}}finally{db.close();}
  // Studio assets that were already published stay referenced until admin removes them in the console.
  const previous=await api('/shared');files.push(...previous.files.filter(f=>f.kind==='studio'));
  const saved=await api('/shared','PUT',{revision,schedules:StorageManager.getSchedules(),settings:StorageManager.getSettings(),savedText:StorageManager.getSavedText(),customActions:StorageManager.getCustomActions(),disabledActions:StorageManager.getDisabledActions(),files,extensions:sharedExtensions()});revision=saved.revision;dirty=false;await nativeSession();notify('Đã công bố dữ liệu chung.');
}
const readerChanges=new Map();
function readonly(){
  if(!session?.user)return;
  if(session.user.role==='admin'){
    for(const [el,properties]of readerChanges)if(el.isConnected)for(const [property,value]of Object.entries(properties))el[property]=value;
    readerChanges.clear();return;
  }
  const lock=(el,property)=>{if(!el||el[property]===true)return;const original=readerChanges.get(el)||{};if(!(property in original))original[property]=el[property];readerChanges.set(el,original);el[property]=true;};
  for(const [el]of readerChanges)if(!el.isConnected)readerChanges.delete(el);
  for(const selector of['#mobile-schedule-add','#mobile-schedule-form','.mobile-schedule-tools','.mobile-schedule-select','#tab-pane-record','#tab-pane-merge','#mobile-speech-start','#account-publish'])document.querySelectorAll(selector).forEach(el=>lock(el,'hidden'));
  document.querySelectorAll('input[type=file]').forEach(el=>lock(el,'disabled'));
  for(const id of['tts-input-desktop','quick-tts-mobile'])lock(document.getElementById(id),'readOnly');
  document.querySelectorAll('.mobile-schedule-toggle').forEach(el=>lock(el,'disabled'));
  for(const id of['mobile-auto-play','mobile-voice-region'])lock(document.getElementById(id),'disabled');
}
function applyLocalSession(){
  if(!session?.token)return;
  ready=true;window.GdqAccount.blocked=false;
  document.getElementById('account-overlay')?.classList.remove('visible');
  if(session.user){
    document.body.classList.toggle('account-reader',session.user.role!=='admin');
    readonly();
    const identityEl=document.getElementById('account-identity');
    if(identityEl)identityEl.textContent=session.user.email+' · '+(session.user.role==='admin'?'Admin':'Người dùng');
    const adminActionsEl=document.getElementById('account-admin-actions');
    if(adminActionsEl)adminActionsEl.hidden=session.user.role!=='admin';
  }
  window.GdqRuntime?.authenticate(true).catch(()=>{});
  window.GdqMobile?.syncAlarms?.().catch(()=>{});
}

async function init(){
  document.body.insertAdjacentHTML('afterbegin',`<div id="account-parking" hidden><section id="account-bar" hidden aria-labelledby="account-settings-title"><h3 id="account-settings-title">Tài khoản &amp; đồng bộ</h3><span id="account-identity">Chưa đăng nhập</span><button id="account-open">Tài khoản</button><button id="account-refresh">Đồng bộ</button><span id="account-admin-actions" hidden><button id="account-publish">Công bố dữ liệu chung</button></span><button id="account-logout">Đăng xuất</button><label id="account-background-label"><input id="account-background" type="checkbox"> Cho phép chạy nền</label><p id="account-background-note">Bật: vẫn phát khi thu nhỏ hoặc khóa màn hình. Tắt: chỉ hoạt động khi ứng dụng đang hiển thị. Không phát bù lịch đã bỏ qua.</p><p id="account-settings-status" role="status"></p><p id="account-notices"></p></section></div>
  <section id="account-overlay" class="${hasValidLocalSession()?'':'visible'}" aria-labelledby="account-title"><div>
    <h2 id="account-title">Đăng nhập</h2>
    <form id="account-form"><input id="account-server" type="hidden">
      <div id="account-fields"><label>Email<input id="account-email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required></label>
      <label for="account-password">Mật khẩu phần mềm</label><div class="account-password-field"><input id="account-password" type="password" autocomplete="current-password" required maxlength="128"><button type="button" id="account-password-toggle" aria-label="Hiện mật khẩu" aria-controls="account-password" aria-pressed="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/><path class="account-eye-slash" d="M3 3l18 18"/></svg></button></div>
      <label id="account-confirm-label" hidden>Nhập lại mật khẩu<input id="account-password-confirm" type="password" autocomplete="new-password" maxlength="128" disabled></label></div>
      <p id="account-waiting" hidden>1. Mở Gmail và bấm liên kết xác minh (kiểm tra cả thư rác).<br>2. Sau khi xác minh Gmail, chờ admin duyệt rồi quay lại đăng nhập.</p>
      <button type="submit" id="account-login" class="account-primary">Đăng nhập</button>
      <button type="submit" id="account-register" class="account-primary" hidden>Đăng ký</button>
      <button type="button" id="account-forgot" class="account-link">Quên mật khẩu?</button>
      <button type="button" id="account-resend" class="account-link" hidden>Gửi lại xác minh</button>
      <button type="button" id="account-switch" class="account-link">Chưa có tài khoản? Đăng ký</button>
      <button type="button" id="account-back-login" class="account-link" hidden>Về đăng nhập</button>
    </form>
    <p id="account-status" role="status" aria-live="polite"></p>
    <p id="account-password-note">Mật khẩu phần mềm là mật khẩu riêng, không dùng mật khẩu Gmail.</p>
    <p id="account-registration-info">Tài khoản mới cần xác minh Gmail và được admin duyệt để sử dụng.</p>
  </div></section>`);
  settingsPanel=document.getElementById('account-bar');
  let mode='login',authBusy=false;
  const el=id=>document.getElementById('account-'+id);
  function showPassword(visible){
    el('password').type=visible?'text':'password';
    el('password-toggle').setAttribute('aria-pressed',String(visible));
  }
  el('password-toggle').onclick=()=>showPassword(el('password').type==='password');
  el('form').addEventListener('submit',()=>showPassword(false));
  function showMode(next){
    showPassword(false);
    mode=next;const registering=mode==='register',waiting=mode==='waiting';
    el('title').textContent=waiting?'Chờ xác minh/duyệt':registering?'Đăng ký':'Đăng nhập';
    el('fields').hidden=waiting;el('waiting').hidden=!waiting;
    el('login').hidden=mode!=='login';el('register').hidden=!registering;
    el('forgot').hidden=mode!=='login';el('resend').hidden=!waiting;
    el('switch').hidden=waiting;el('back-login').hidden=!waiting;
    el('switch').textContent=registering?'Đã có tài khoản? Đăng nhập':'Chưa có tài khoản? Đăng ký';
    el('confirm-label').hidden=!registering;el('password-confirm').disabled=!registering;el('password-confirm').required=registering;
    el('email').disabled=waiting;el('password').disabled=waiting;
    el('password').autocomplete=registering?'new-password':'current-password';
    el('password').minLength=registering?12:0;
    el('password').value='';el('password-confirm').value='';
    el('password-note').textContent=registering?'Dùng địa chỉ @gmail.com và mật khẩu riêng của phần mềm (12–128 ký tự), không dùng mật khẩu Gmail.':'Mật khẩu phần mềm là mật khẩu riêng, không dùng mật khẩu Gmail.';
    el('form').dataset.mode=mode;notify('');
  }

  const bootstrapForm=document.getElementById('account-form');
  bootstrapForm.onsubmit=e=>e.preventDefault();bootstrapForm.inert=true;
  if(gate){
    try{const saved=await gate.restore();if(saved.token&&saved.url){base=saved.url;if(!session||session.token!==saved.token){session={...(session||{}),token:saved.token};}localStorage.setItem('gdqpan_server',base);localStorage.setItem('gdqpan_session',JSON.stringify(session));if(hasValidLocalSession())applyLocalSession();}}
    catch(e){notify(e.message);}
  }
  if(adoptDemoServer())await nativeSession();
  bootstrapForm.inert=false;
  const run=f=>async e=>{e?.preventDefault();const btn=e?.submitter||(e?.target?.tagName==='BUTTON'?e.target:null);if(btn){btn.disabled=true;btn.style.opacity='0.65';}try{await f();}catch(x){const raw=x?.message||'Đã xảy ra lỗi.';notify(raw.replace(/^Error invoking remote method '[^']+':\s*/,''));}finally{if(btn){btn.disabled=false;btn.style.opacity='1';}}};
  const background=document.getElementById('account-background');background.checked=window.GdqRuntime?.backgroundEnabled!==false;
  background.onchange=run(async()=>{try{await window.GdqRuntime?.setBackground(background.checked);await window.GdqMobile?.syncAlarms();}catch(e){notify('Chưa áp dụng được chế độ chạy nền: '+e.message);throw e;}});
  const creds=()=>({email:el('email').value.trim(),password:el('password').value});
  function setBase(){const value=el('server').value.trim().replace(/\/$/,'');const u=new URL(value);if(u.pathname!=='/'||u.search||u.hash||u.username||u.password||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','10.0.2.2'].includes(u.hostname))))throw Error('Dùng địa chỉ máy chủ HTTPS; HTTP chỉ dùng cho kiểm thử local.');if(base!==value){++syncEpoch;session=null;ready=false;revision=0;window.GdqAccount.blocked=true;localStorage.removeItem('gdqpan_session');}base=value;localStorage.setItem('gdqpan_server',base);nativeSession().catch(e=>notify(e.message));}
  const registrationInfo=async()=>{if(!base)return;try{const info=await api('/health');el('registration-info').textContent=info.emailEnabled===false?'Máy chủ demo chưa bật email. Đăng ký, xác minh và đặt lại mật khẩu chưa dùng được. Đăng nhập bằng tài khoản admin được cấp.':'Tài khoản mới cần xác minh Gmail rồi chờ admin duyệt. Liên kết xác minh/đặt lại mật khẩu mở trên trang tài khoản máy chủ.';}catch{}};
  el('server').addEventListener('change',()=>{try{setBase();registrationInfo();}catch{}});
  el('server').value=base;registrationInfo();
  const authRun=f=>async e=>{
    e?.preventDefault();if(authBusy)return;
    authBusy=true;const controls=[...el('form').querySelectorAll('button')];
    controls.forEach(b=>b.disabled=true);el('form').setAttribute('aria-busy','true');
    notify('Đang kết nối máy chủ, vui lòng chờ…');
    try{await f();}catch(x){
      const raw=(x?.message||'').replace(/^Error invoking remote method '[^']+':\s*/,'');
      el('resend').hidden=!(mode==='waiting'||(mode==='login'&&(x.code==='EMAIL_UNVERIFIED'||raw==='Tài khoản chưa xác minh Gmail. Vui lòng kiểm tra email xác minh.')));
      notify(!raw||/fetch|network|timeout|timed out|ERR_|không thể kết nối/i.test(raw)?'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.':raw);
    }finally{authBusy=false;controls.forEach(b=>b.disabled=false);el('form').removeAttribute('aria-busy');}
  };
  el('form').onsubmit=authRun(async()=>{
    setBase();const credentials=creds();
    if(mode==='waiting')return;
    if(mode==='register'){
      if(!/^[a-z0-9][a-z0-9.+_-]{0,63}@gmail\.com$/i.test(credentials.email))throw Error('Đăng ký mới cần địa chỉ @gmail.com.');
      if(credentials.password!==el('password-confirm').value)throw Error('Mật khẩu nhập lại chưa khớp.');
      const result=await api('/auth/register','POST',credentials);showMode('waiting');notify(result.message);return;
    }
    const loginEpoch=++syncEpoch;session=null;ready=false;revision=0;window.GdqAccount.blocked=true;localStorage.removeItem('gdqpan_session');await nativeSession();
    const result=await api('/auth/login','POST',{...credentials,device:{name:native?'Android':window.electronAPI?'Desktop':'Web xem thử',platform:native?'android':window.electronAPI?'desktop':'web',version:'1.4.12'}});
    if(syncEpoch!==loginEpoch)throw Error('Phiên đã thay đổi; yêu cầu đăng nhập cũ đã hủy.');
    session=result;
    localStorage.setItem('gdqpan_session',JSON.stringify(session));
    el('password').value='';
    await nativeSession();
    if(syncEpoch!==loginEpoch)throw Error('Phiên đã thay đổi; yêu cầu đăng nhập cũ đã hủy.');
    await refresh();
  });
  for(const id of ['forgot','resend'])el(id).onclick=authRun(async()=>{setBase();const email=creds().email;if(!email||!el('email').validity.valid)throw Error('Vui lòng nhập địa chỉ email hợp lệ.');notify((await api('/auth/'+id,'POST',{email})).message);});
  el('switch').onclick=()=>{if(!authBusy)showMode(mode==='login'?'register':'login');};
  el('back-login').onclick=()=>{if(!authBusy)showMode('login');};
  // A valid current session is checked again; the account screen never dismisses itself.
  el('open').onclick=()=>{showMode('login');el('overlay').classList.add('visible');};
  document.getElementById('account-refresh').onclick=run(refresh);
  document.getElementById('account-publish').onclick=run(publish);
  const restore=document.createElement('button');restore.textContent='Khôi phục dữ liệu trước đăng nhập';document.getElementById('account-admin-actions').append(restore);restore.onclick=run(async()=>{if(!window.GdqAccount.admin||!confirm('Khôi phục dữ liệu cũ trên máy này vào bản chỉnh sửa? Chưa công bố lên máy chủ.'))return;const old=await cache('backup','before-accounts');if(!old)throw Error('Không có bản sao dữ liệu cũ.');applying=true;try{await applyFiles(old.files);StorageManager.saveSchedules(old.schedules);StorageManager.saveSettings(old.settings);StorageManager.saveText(old.savedText);localStorage.setItem('gdqpan_custom_actions_v2',JSON.stringify(old.customActions));localStorage.setItem('gdqpan_disabled_actions_v2',JSON.stringify(old.disabledActions));if(document.getElementById('tts-input-desktop'))document.getElementById('tts-input-desktop').value=old.savedText;document.dispatchEvent(new Event('gdqpan-shared'));dirty=true;notify('Đã khôi phục bản chỉnh sửa. Chọn Công bố dữ liệu chung để lưu lên máy chủ.');}finally{applying=false;}});
  document.getElementById('account-logout').onclick=run(async()=>{
    if(!confirm('Đăng xuất khỏi phần mềm?'))return;
    const logoutEpoch=++syncEpoch;const previous=session;session=null;ready=false;applying=false;applyOwner=null;
    window.GdqAccount.blocked=true;localStorage.removeItem('gdqpan_session');
    const stopped=window.GdqRuntime?.authenticate(false);window.handleStopAll?.(true);window.closeModal?.();showMode('login');el('overlay').classList.add('visible');
    el('identity').textContent='Chưa đăng nhập';el('admin-actions').hidden=true;
    const cleared=nativeSession().then(()=>null,e=>e);let revocationFailed=false;
    try{if(previous?.token)await (async()=>{const headers={Authorization:'Bearer '+previous.token};if(window.electronAPI?.accountRequest)await window.electronAPI.accountRequest({base,route:'/logout',method:'POST',headers});else if(native)await cap.registerPlugin('CapacitorHttp').request({url:base+'/api/logout',method:'POST',headers,connectTimeout:8000,readTimeout:12000});else await fetch(base+'/api/logout',{method:'POST',headers,signal:AbortSignal.timeout(12000)});})();}
    catch{revocationFailed=true;}
    finally{const nativeError=await cleared;await stopped;if(logoutEpoch===syncEpoch&&!authBusy)notify(nativeError?'Đã khóa ứng dụng, nhưng chưa xóa được phiên lưu trên thiết bị. Vui lòng thử đăng xuất lại.':revocationFailed?'Đã đăng xuất trên thiết bị. Máy chủ chưa xác nhận thu hồi phiên do mất kết nối.':'Đã đăng xuất.');}
  });
  for(const [name,original]of Object.entries(StorageManager))if(typeof original==='function'&&/^(save|delete|clear|disable|restore|reset)/.test(name)&&name!=='clearLogs')StorageManager[name]=function(...args){if(!applying&&(!ready||!window.GdqAccount.admin)){notify('Dữ liệu chung do admin quản lý.');return undefined;}const result=original.apply(this,args);if(!applying)dirty=true;return result;};
  const oldLog=StorageManager.addLog;StorageManager.addLog=function(action,details){const result=oldLog(action,details);if(ready)api('/logs','POST',{action,details}).catch(()=>{});return result;};
  for(const engine of[AudioEngine,TTSEngine])for(const name of Object.keys(engine))if(typeof engine[name]==='function'&&/^(play|trigger|speak|resume|restoreMusic)/.test(name)){const old=engine[name];engine[name]=async function(...args){if(window.GdqRuntime&&!window.GdqRuntime.allowed())return;if(!window.GdqAccount.scheduledPlayback&&!await authorize())return;return old.apply(this,args);};}
  for(const [name,old]of Object.entries(window))if(typeof old==='function'&&/^(handle(Add|Delete|Create|Import|Assign|CustomAudioUpload|ResetDefault|QuickAssign|ClearMerge|Merge|Record|ToggleRecord|SaveText|ClearText|DisableDefaultAction|Restore|UploadSongs)|saveSystem|saveVtv|addScheduleMobile|editSchedule|toggleSchedule|deleteSchedule)/.test(name))window[name]=function(...args){if(!window.GdqAccount.admin){notify('Chỉ admin được chỉnh dữ liệu chung.');return;}return old.apply(this,args);};
  new MutationObserver(()=>{if(!settingsPanel?.isConnected||!document.querySelector('#modal-sheet.active'))parkSettings();readonly();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['readonly']});
  const sheet=document.getElementById('modal-sheet');if(sheet)new MutationObserver(()=>{if(!sheet.classList.contains('active'))parkSettings();}).observe(sheet,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session&&!authBusy)run(()=>refresh({background:true}))();});
  window.addEventListener('online',()=>{if(session&&!authBusy)run(()=>refresh({background:true}))();});
  window.addEventListener('offline',()=>{notify('Thiết bị đang ngoại tuyến. Lịch và dữ liệu đã lưu vẫn hoạt động bình thường.');});
  const lockHome=()=>{const locked=el('overlay').classList.contains('visible');for(const child of document.body.children)if(child!==el('overlay')&&child.tagName!=='SCRIPT'&&child.tagName!=='STYLE')child.inert=locked;};
  new MutationObserver(lockHome).observe(el('overlay'),{attributes:true,attributeFilter:['class']});lockHome();
  if(window.GdqAccountHost?.settingsContainer)mountSettings(window.GdqAccountHost.settingsContainer());
  if(session){applyLocalSession();run(()=>refresh({background:true}))();}else nativeSession().catch(e=>notify(e.message));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80));else setTimeout(init,80);
})();
