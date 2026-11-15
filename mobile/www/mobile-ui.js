/* Mobile presentation adapter. All desktop feature engines remain available. */
(() => {
  'use strict';
  const cap = window.Capacitor;
  const native = !!cap?.isNativePlatform?.();
  const alarm = native ? cap.registerPlugin('GdqAlarm') : null;
  let currentPage = 'home', syncing = null, syncAgain = false, syncTimer, editingId=null, pendingDays=null,nativeMusicSnapshot=null;
  window.GdqNativeAlarmsActive = false;
  // Migrate mobile schedules before desktop DOMContentLoaded initialization.
  try {
    const raw = localStorage.getItem('gdqpan_schedules_v3') || localStorage.getItem('gdqpan_schedules_v1');
    if (raw) localStorage.setItem('gdqpan_schedules_v3', JSON.stringify(JSON.parse(raw).map(s => ({ ...s, id:String(s.id), on:s.on ?? s.enabled ?? true, days:s.days || [0,1,2,3,4,5,6] }))));
    const settings = JSON.parse(localStorage.getItem('gdqpan_settings_v2') || 'null');
    if (settings) {
      if(settings.region && !settings.region.includes('_'))settings.region += '_' + (settings.gender || 'nu');
      localStorage.setItem('gdqpan_settings_v2', JSON.stringify({volume:0.8,region:'bac_nu',rate:1,ttsProvider:'offline',chimeBeforeSpeech:settings.chimeIntro??true,repeatTimes:1,...settings}));
    }
  } catch (e) { console.warn('Không thể chuyển dữ liệu cũ:', e); }

  const names = {home:'Trang chủ', daily:'Hiệu lệnh', audio:'Nhạc', studio:'Phòng thu', custom:'Nhạc tùy chọn', vtv:'Thời sự VTV', schedule:'Lịch phát', more:'Tiện ích'};
  function switchPage(page, focus=true) {
    currentPage = page;
    document.querySelectorAll('[data-mobile-page]').forEach(el => el.classList.toggle('mobile-page-hidden', el.dataset.mobilePage !== page));
    document.querySelectorAll('.mobile-nav button').forEach(btn => {
      if (btn.dataset.page === page) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
    });
    const heading = document.getElementById('mobile-heading');
    heading.textContent = names[page];
    if (focus) { heading.focus({preventScroll:true}); window.scrollTo(0,0); }
    refreshNext();
  }
  function refreshNext() {
    if (typeof StorageManager === 'undefined') return;
    const now = new Date(), list = StorageManager.getSchedules(), occurrences=[];
    for (const s of list) {
      if(StorageManager.getSettings().autoPlay===false)break;
      if (!s.on || !/^\d\d:\d\d$/.test(s.time)) continue;
      const [h,m]=s.time.split(':').map(Number);
      for(let day=0;day<=7;day++) {
        const date = new Date(now); date.setDate(date.getDate()+day); date.setHours(h,m,0,0);
        if(date>now && (!s.days?.length || s.days.includes(date.getDay()))) {occurrences.push({date,s});break;}
      }
    }
    occurrences.sort((a,b)=>a.date-b.date);
    const next=occurrences[0];
    document.getElementById('mobile-next-time').textContent=next?.s.time || '—';
    document.getElementById('mobile-next-name').textContent=next ? next.s.action : 'Chưa có lịch đang bật';
    document.getElementById('mobile-next-count').textContent=next ? 'Còn ' + Math.ceil((next.date-now)/60000) + ' phút · ' + next.date.toLocaleDateString('vi-VN',{weekday:'long'}) : 'Thêm lịch trong mục Lịch phát';
  }
  document.addEventListener('gdqpan-shared', refreshNext);
  const setStatus = msg => { const el=document.getElementById('native-alarm-status');if(el) el.textContent=msg; };
  function syncAlarms() {
    if(!native || typeof StorageManager==='undefined')return Promise.resolve();
    syncAgain=true;
    if(syncing)return syncing;
    syncing=(async()=>{let result;while(syncAgain){syncAgain=false;result=await performSync();}return result;})().finally(()=>{syncing=null;});
    return syncing;
  }
  async function performSync() {
    if(!native || typeof StorageManager==='undefined') return;
    if(!window.GdqAccount || window.GdqAccount.blocked||(window.GdqRuntime&&!window.GdqRuntime.allowed())){setStatus('Đăng nhập và đồng bộ để bật lịch.');return;}
    try {
      const accountToken=JSON.parse(localStorage.getItem('gdqpan_session')||'null')?.token;
      const settings=StorageManager.getSettings(), schedules=[];
      for(const original of StorageManager.getSchedules()) {
        const s={...original, id:String(original.id)};
          if(s.action==='Thông báo khác'&&!s.text)s.text=StorageManager.getSavedText()||'Thông báo tự động theo thời gian biểu.';
        if(s.on && (s.hasCustomAudio || !AudioEngine.DEFAULT_SOUND_MAP[s.action])) {
          const record = s.hasCustomAudio ? await StorageManager.getScheduleAudio(s.id) : await StorageManager.getCustomAudio(s.action);
          if(record?.blob) {
            const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(record.blob);});
            const result=await alarm.saveAudio({id:s.id,data}); s.nativeFile=result.path;
          }
        } else if(s.on) {
          // Custom action sound overrides bundled audio, just as on desktop.
          const record=await StorageManager.getCustomAudio(s.action);
          if(record?.blob) {
            const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(record.blob);});
            s.nativeFile=(await alarm.saveAudio({id:s.id,data})).path;
          }
        }
        schedules.push(s);
      }
      if(window.GdqAccount.blocked||accountToken!==JSON.parse(localStorage.getItem('gdqpan_session')||'null')?.token)return;
      const result=await alarm.sync({schedules,settings,accountToken});
      window.GdqNativeAlarmsActive=result.exact;
      setStatus(!result.exact ? 'Cần cho phép Báo thức chính xác để tự phát khi khóa màn hình.' : !result.notifications ? 'Cần cho phép thông báo để mở màn hình báo thức.' : !result.fullScreen ? 'Cần cho phép màn hình báo thức toàn màn hình để phát khi khóa màn hình.' : `Báo thức chạy nền sẵn sàng · ${result.count} lịch đang bật`);
      if(!result.exact) window.GdqNativeAlarmsActive=false;
      refreshNext();
      return result;
    } catch(e) {window.GdqNativeAlarmsActive=false;setStatus('Chưa đồng bộ được báo thức: '+e.message);console.warn(e);}
  }
  document.addEventListener('gdqpan-runtime',()=>{syncAlarms();});
  function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncAlarms,400);}
  async function nativeState() {
    if(!native||window.GdqAccount?.blocked||(window.GdqRuntime&&!window.GdqRuntime.allowed()))return;
    try {
      const state=await alarm.status();
      if(!state.vtvOpen&&window.isVtvWindowOpen){window.isVtvPlaying=false;window.updateVtvWindowButtonUI?.(false);if(window.vtvBrowserPopout)window.vtvBrowserPopout.closed=true;}
      if(state.playing) {
        const bar=document.getElementById('playback-control-bar');
        if(!bar.dataset.nativePlaying){nativeMusicSnapshot=AudioEngine.captureMusicSnapshot();AudioEngine.stopAll();TTSEngine.stop();}
        bar.style.display='flex';bar.dataset.nativePlaying='true';
        document.getElementById('playback-title').textContent=state.title;
        document.getElementById('btn-playback-pause').disabled=true;
      } else if(document.getElementById('playback-control-bar').dataset.nativePlaying) {
        const bar=document.getElementById('playback-control-bar');bar.style.display='none';delete bar.dataset.nativePlaying;
        document.getElementById('btn-playback-pause').disabled=false;
        if(nativeMusicSnapshot){const snapshot=nativeMusicSnapshot;nativeMusicSnapshot=null;await AudioEngine.restoreMusicSnapshot(snapshot);}
      }
      for(const log of state.logs || []) StorageManager.addLog(log.action,log.details);
    } catch(e){console.warn(e);}
  }
  function init() {
    const header=document.querySelector('.header');
    header.insertAdjacentHTML('afterbegin', `<div class="mobile-header" role="banner" aria-label="Trung tâm Giáo dục Quốc phòng và An ninh - ĐHQG-HCM | Hệ thống truyền thông số">
      <img class="mobile-banner-img" src="assets/banner_gdqpan.png" alt="Hệ thống truyền thông số - Trung tâm Giáo dục Quốc phòng và An ninh - ĐHQG-HCM">
      <div class="mobile-accessible-content" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">
        <div class="mobile-brand">
          <img class="mobile-brand-logo" src="assets/logo_gdqpan.png" alt="Logo GDQPAN">
          <div class="mobile-brand-text">
            <h2 class="mobile-center">TRUNG TÂM GIÁO DỤC QUỐC PHÒNG VÀ AN NINH</h2>
            <small class="mobile-slogan"><span>Đoàn kết -</span> <span>Kỷ cương -</span> <span>Chất lượng -</span> <span>Tiên phong</span></small>
          </div>
        </div>
        <div class="mobile-system-banner">
          <h1><span>HỆ THỐNG</span> <span>TRUYỀN THÔNG SỐ</span></h1>
        </div>
      </div>
    </div>`);
    const panels=[...document.querySelectorAll('.main > .grid-top > .panel, .main > .grid-bottom > .panel')];
    panels.forEach((panel,i)=>panel.dataset.mobilePage=i<3?'daily':i===3?'audio':i===4?'studio':'schedule');
    const main=document.querySelector('.main');
    main.insertAdjacentHTML('afterbegin', '<h2 class="mobile-page-heading" id="mobile-heading" tabindex="-1">Trang chủ</h2><section class="mobile-home" data-mobile-page="home"><div class="mobile-next"><small>LỊCH PHÁT TIẾP THEO</small><strong id="mobile-next-time">—</strong><p id="mobile-next-name"></p><p id="mobile-next-count"></p></div><div class="mobile-quick"><button data-go="daily"><span>📢</span>Hiệu lệnh</button><button data-go="audio"><span>🎵</span>Nhạc &amp; VTV</button><button data-go="audio" data-record="true"><span>🎙</span>Thu &amp; ghép âm</button><button data-go="schedule"><span>📅</span>Lịch phát</button></div><p class="mobile-help">Điều khiển âm thanh và giọng đọc theo chức năng. Nội dung đang phát luôn có nút Dừng phía dưới màn hình.</p></section>');
    const footer=document.querySelector('.footerbar');footer.dataset.mobilePage='more';main.appendChild(footer);
    footer.insertAdjacentHTML('beforebegin','<section class="mobile-native-card" data-mobile-page="more"><h2>Báo thức khi khóa màn hình</h2><p id="native-alarm-status"></p><button id="native-permission-btn">Cấp quyền báo thức</button></section>');
    setStatus(native?'Đang kiểm tra quyền và đồng bộ lịch…':'Bản xem thử trên web phát lịch khi trang đang mở. Báo thức chạy nền có trong ứng dụng Android.');
    if(native){document.querySelector('.mobile-native-card').insertAdjacentHTML('beforeend','<button id="native-fullscreen-btn">Cho phép màn hình báo thức</button>');document.getElementById('native-fullscreen-btn').onclick=()=>alarm.fullScreenPermission().then(syncAlarms).catch(e=>window.showToast(e.message,'error'));}
    document.querySelector('.mobile-native-card').insertAdjacentHTML('beforeend','<label><input id="mobile-auto-play" type="checkbox"> Tự động phát lịch</label>');
    const auto=document.getElementById('mobile-auto-play');auto.checked=StorageManager.getSettings().autoPlay!==false;
    auto.onchange=()=>{StorageManager.saveSettings({...StorageManager.getSettings(),autoPlay:auto.checked});refreshNext();};
    document.querySelector('.mobile-native-card').insertAdjacentHTML('beforeend','<label>Giọng thu sẵn <select id="mobile-voice-region">'+[['bac_nu','Bắc · Nữ'],['bac_nam','Bắc · Nam'],['trung_nu','Trung · Nữ'],['trung_nam','Trung · Nam'],['nam_nu','Nam · Nữ'],['nam_nam','Nam · Nam']].map(([value,name])=>`<option value="${value}">${name}</option>`).join('')+'</select></label>');
    const region=document.getElementById('mobile-voice-region');region.value=StorageManager.getSettings().region||'bac_nu';region.onchange=()=>StorageManager.saveSettings({...StorageManager.getSettings(),region:region.value});
    document.getElementById('sch-custom-file-row').insertAdjacentHTML('beforebegin','<fieldset class="mobile-days"><legend>Ngày phát</legend>'+[[1,'T2'],[2,'T3'],[3,'T4'],[4,'T5'],[5,'T6'],[6,'T7'],[0,'CN']].map(([d,label])=>`<label><input type="checkbox" value="${d}" checked> ${label}</label>`).join('')+'</fieldset>');
    const setDays=days=>document.querySelectorAll('.mobile-days input').forEach(el=>el.checked=!days?.length||days.includes(Number(el.value)));
    const originalEdit=window.editSchedule;
    window.editSchedule=(id)=>{editingId=id;const result=originalEdit(id);setDays(StorageManager.getSchedules().find(s=>s.id===id)?.days);window.scrollTo(0,0);return result;};
    const originalCancel=window.cancelEditSchedule;
    window.cancelEditSchedule=(...args)=>{editingId=null;setDays([0,1,2,3,4,5,6]);return originalCancel(...args);};
    const originalAdd=window.handleAddSchedule;
    window.handleAddSchedule=async(...args)=>{
      const days=[...document.querySelectorAll('.mobile-days input:checked')].map(el=>Number(el.value));
      if(!days.length){window.showToast('Chọn ít nhất một ngày phát.','warning');return;}
      pendingDays={days,id:editingId,previous:new Set(StorageManager.getSchedules().map(s=>s.id))};
      try{return await originalAdd(...args);}finally{if(pendingDays?.saved)window.GdqSchedule?.close();pendingDays=null;}
    };
    document.getElementById('native-permission-btn').hidden=!native;
    document.getElementById('native-permission-btn').onclick=async()=>{try{await alarm.permissions();await syncAlarms();}catch(e){setStatus(e.message);}};
    document.body.insertAdjacentHTML('beforeend','<nav class="mobile-nav" aria-label="Điều hướng chính">'+[['home','⌂'],['daily','📢'],['audio','♫'],['schedule','📅'],['more','☰']].map(([page,icon])=>`<button data-page="${page}"><span aria-hidden="true">${icon}</span>${names[page]}</button>`).join('')+'</nav>');
    document.querySelectorAll('.mobile-nav button').forEach(btn=>btn.onclick=()=>switchPage(btn.dataset.page));
    document.querySelectorAll('[data-go]').forEach(btn=>btn.onclick=()=>{switchPage(btn.dataset.go);if(btn.dataset.record) document.querySelector('.grid-bottom .panel')?.scrollIntoView({block:'start'});});
    switchPage('home',false);
    setInterval(refreshNext,1000);
    for(const method of ['saveSchedules','saveSettings','saveCustomAudio','deleteCustomAudio','saveScheduleAudio','deleteScheduleAudio']) {
      const original=StorageManager[method];
      StorageManager[method]=function(...args){
        if(method==='saveSchedules'&&pendingDays)args[0].forEach(s=>{if(s.id===pendingDays.id || (!pendingDays.id&&!pendingDays.previous.has(s.id)))s.days=pendingDays.days;});
        const result=original.apply(this,args);if(method==='saveSchedules'&&pendingDays)pendingDays.saved=true;if(result?.then)return result.then(value=>{scheduleSync();return value;});scheduleSync();refreshNext();return result;
      };
    }
    const oldStop=window.handleStopAll;
    window.handleStopAll=(...args)=>{nativeMusicSnapshot=null;if(native){alarm.stop().catch(console.warn);cap.registerPlugin('TextToSpeech').stop().catch(console.warn);}return oldStop(...args);};
    if(native) {
      const blobs=new Map(),originalCreate=URL.createObjectURL.bind(URL),originalRevoke=URL.revokeObjectURL.bind(URL),originalClick=HTMLAnchorElement.prototype.click;
      URL.createObjectURL=blob=>{const url=originalCreate(blob);blobs.set(url,blob);return url;};
      URL.revokeObjectURL=url=>{blobs.delete(url);originalRevoke(url);};
      HTMLAnchorElement.prototype.click=function(){
        const blob=blobs.get(this.href),name=this.download;
        if(!blob||!name)return originalClick.call(this);
        const reader=new FileReader();reader.onload=async()=>{try{const result=await alarm.saveDownload({data:reader.result.split(',')[1],name,mime:blob.type});window.showToast('Đã lưu: '+result.location,'success');}catch(e){window.showToast(e.message,'error');}};reader.readAsDataURL(blob);
      };
      // Disable old LocalNotifications alarms so they cannot duplicate the native service.
      cap.registerPlugin('LocalNotifications').getPending().then(r=>cap.registerPlugin('LocalNotifications').cancel({notifications:r.notifications})).catch(console.warn);
      syncAlarms();nativeState();setInterval(nativeState,1500);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncAlarms();nativeState();}});
      cap.registerPlugin('SystemBars').setStyle({style:'DARK'}).catch(console.warn);
    }
    // Adapt the desktop popout API to an Android video activity.
    if(native) {
      const originalOpen=window.open;
      window.open=function(url,name,...args){
        if(name!=='VtvPlayerPopout')return originalOpen.call(window,url,name,...args);
        const streamUrl=new URL(url,location.href).searchParams.get('streamUrl');
        alarm.openVtv({url:streamUrl}).catch(e=>window.showToast(e.message,'error'));
        const facade={closed:false,focus:()=>alarm.openVtv({url:streamUrl}),close:()=>{facade.closed=true;alarm.closeVtv();},postMessage:data=>alarm.controlVtv({action:data.action})};
        return facade;
      };
    }
    window.GdqMobile={switchPage,syncAlarms,getPage:()=>currentPage,back:()=>{if(document.querySelector('#modal-overlay.active'))document.querySelector('.modal-close')?.click();else switchPage('home');}};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0)); else init();
})();
