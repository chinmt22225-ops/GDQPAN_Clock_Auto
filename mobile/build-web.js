const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const www = path.join(__dirname, 'www');
const catalog = require('../scripts/build-music-catalog').buildMusicCatalog();
let html = fs.readFileSync(path.join(root, 'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'), 'utf8').replace(/\r\n/g,'\n');
// The desktop engine remains the single source for recording, mixing, music and schedules.
// Recorder meter startup is fixed in the shared desktop engine; no platform-only rewrite.
// Shared volume refreshes must not save a stale snapshot or create unpublished edits.
html = html.replace('function updateSliders(val) {', 'function updateSliders(val, persist = true) {');
html = html.replace('      saveTimeout = setTimeout(() => {\n        savedSettings.volume = val;\n        StorageManager.saveSettings(savedSettings);', '      if (!persist) return;\n      saveTimeout = setTimeout(() => {\n        StorageManager.saveSettings({...StorageManager.getSettings(), volume:val});');
html = html.replace('    updateSliders(initVol);', '    updateSliders(initVol, false);');
html = html.replaceAll('updateSliders(parseFloat(e.target.value))', 'updateSliders(parseFloat(e.target.value), e.isTrusted)');
html = html.replace('</head>', '<script src="capacitor.js"></script><script src="capacitor-runtime.js"></script><link rel="stylesheet" href="mobile-ui.css"><link rel="stylesheet" href="mobile-reference.css"></head>');
html = html.replace('</body>', '<script src="mobile-music-timer.js"></script><script src="mobile-ui.js"></script><script src="mobile-speech.js"></script><script src="mobile-schedule.js"></script><script src="mobile-library.js"></script><script src="mobile-player.js"></script></body>');
// Replace only the Android prompt controller; leave the shared desktop behavior intact.
const promptStart = html.indexOf('  async function openMusicTimerModal(song, trackId) {');
const promptEnd = html.indexOf('  function handleMusicPanelTrackClick(song, trackId) {', promptStart);
const promptReady = html.indexOf("    modalSheet.classList.add('active');", promptStart) + "    modalSheet.classList.add('active');".length;
if (promptStart < 0 || promptEnd < 0 || promptReady <= promptStart || promptReady >= promptEnd) throw Error('Cannot locate the Android music timer prompt');
html = html.slice(0, promptReady) + `
    window.GdqMusicTimerPrompt.open({
      overlay:modalOverlay, sheet:modalSheet, content:modalContent,
      getDuration:()=>getAudioMetadataDuration(song), formatDuration:formatDurationHms,
      playFull:()=>{clearMusicTimer();playMusicTrackDirectly(song,trackId);},
      playTimed:seconds=>{clearMusicTimer();playMusicTrackDirectly(song,trackId,()=>startMusicTimer(seconds));}
    });
  }

` + html.slice(promptEnd);
// Account checks are asynchronous. Start a user-confirmed cut-off only once audio starts,
// after stopping the previous track (which clears its old timer).
html = html.replace('function playMusicTrackDirectly(song, trackId) {', 'function playMusicTrackDirectly(song, trackId, onStarted) {');
const directStart=html.indexOf('  function playMusicTrackDirectly('),directEnd=html.indexOf('  async function openMusicTimerModal',directStart);
html=html.slice(0,directStart)+html.slice(directStart,directEnd).replaceAll('isMusicTrack: true }','isMusicTrack: true, onStarted }')+html.slice(directEnd);
for(const name of ['playAudioBlob','playAudioUrl']){
  const start=html.indexOf('  async function '+name+'('),end=html.indexOf('\n  async function ',start+1);
  const body=html.slice(start,end);
  if(start<0||end<0||!body.includes('        currentPlaying = {'))throw Error('Cannot locate Android audio-start hook: '+name);
  html=html.slice(0,start)+body.replace('        currentPlaying = {',"        if (typeof options.onStarted === 'function') options.onStarted();\n        currentPlaying = {")+html.slice(end);
}
// Expand Android upload/reclassification choices without modifying the Windows UI.
html = html.replace('const MUSIC_CATEGORIES = [', `const MUSIC_CATEGORIES = [
    'Nhạc truyền thống quân đội', 'Nhạc quê hương', 'Nhạc thanh niên', 'Nhạc trữ tình',
    ...Array.from({length:12},(_,i)=>'Nhạc tháng '+(i+1)),`);
html = html.replace("if ('serviceWorker' in navigator)", "if (false && 'serviceWorker' in navigator)");
html = html.replace('async function checkNeuralService(showToast = false, isManualRetry = false) {', `async function checkNeuralService(showToast = false, isManualRetry = false) {
    localNeuralAvailable = false;
    const badge = document.getElementById('tts-service-status-badge');
    if (badge) badge.textContent = 'Giọng đọc offline · âm thanh có sẵn';
    return;
`);
html = html.replace("const chosenVoice = (options.voiceName || '').trim();\n\n    // Phân loại", `const chosenVoice = (options.voiceName || '').trim();
    if (window.Capacitor?.isNativePlatform?.()) {
      const offlinePath = getOfflineAudioPath(text, options.action || '', options.region || 'bac_nu');
      if (offlinePath && await playAudioFile(offlinePath, userVol)) return;
      isSpeaking = true;
      try { await window.Capacitor.registerPlugin('TextToSpeech').speak({text,lang:'vi-VN',rate:userRate,volume:userVol}); }
      catch (e) { window.showToast?.('Cần cài giọng đọc tiếng Việt trong cài đặt điện thoại.', 'warning'); }
      finally { isSpeaking = false; }
      return;
    }
    if (!localNeuralAvailable) {
      const offlinePath = getOfflineAudioPath(text, options.action || '', options.region || 'bac_nu');
      if (offlinePath && await playAudioFile(offlinePath, userVol)) return;
      if (!isCancelled) await speakViaWebSpeech(text, options);
      return;
    }

    // Phân loại`);
html = html.replace('function stop() {\n    isCancelled = true;', `function stop() {
    if (window.Capacitor?.isNativePlatform?.()) window.Capacitor.registerPlugin('TextToSpeech').stop().catch(console.warn);
    isCancelled = true;`);
html = html.replaceAll("regionVal = currentRegionVoice || 'bac_nu';", "regionVal = StorageManager.getSettings().region || currentRegionVoice || 'bac_nu';");
html = html.replaceAll('giọng máy Windows', 'giọng đọc của thiết bị').replaceAll('Offline Máy','Offline thiết bị');
// Native alarms own schedule execution on Android; desktop ticks still update clocks.
html = html.replace('if (timeStr === lastTriggeredMinute) return;', "if (window.GdqNativeAlarmsActive) return;\n    if (StorageManager.getSettings().autoPlay === false) return;\n    if (document.hidden) return;\n    if (timeStr === lastTriggeredMinute) return;");
// Preserve confirmation on all emergency entry points, including dynamically rendered cards.
html = html.replace('window.triggerEmergency = async function () {', "window.triggerEmergency = async function () {\n    if (!confirm('Phát báo động khẩn cấp ngay? Âm thanh sẽ phát qua loa.')) return;");
html = html.replace('async function handleActionClick(actionName, elementBtn = null) {', "async function handleActionClick(actionName, elementBtn = null) {\n    if (/báo động|khẩn cấp/i.test(actionName) && !confirm('Phát ' + actionName + ' ngay?')) return;");
fs.writeFileSync(path.join(www, 'index.html'), html);
fs.copyFileSync(path.join(__dirname, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(www, 'capacitor-runtime.js'));
for (const name of ['hls.min.js', 'logo_gdqpan.png', 'banner_campus.jpg', 'banner_gdqpan.png', 'huong-dan-lay-link.png', 'account.js', 'runtime.js', 'account.css', 'server-config.js', 'banner.css', 'music-catalog.js', 'fixed-music.js']) {
  fs.copyFileSync(path.join(root, 'assets', name), path.join(www, 'assets', name));
}
const accountPath=path.join(www,'assets','account.js');
let accountSource=fs.readFileSync(accountPath,'utf8').replace(/\r\n/g,'\n').replace(/version:'1\.[\d.]+(?:-test)?'/,"version:'"+require('./package.json').version+"'");
// WebView localStorage may not flush before force-stop; the existing encrypted native session is committed synchronously.
// Restoring a token still requires a fresh server session check before unlocking the app.
accountSource=accountSource.replace('function init(){','async function init(){');
accountSource=accountSource.replace("if(!session||session.user.role==='admin')return;", "if(!session?.user||session.user.role==='admin')return;");
accountSource=accountSource.replace('  const run=f=>', `
  const bootstrapForm=document.getElementById('account-form');
  bootstrapForm.onsubmit=e=>e.preventDefault();bootstrapForm.inert=true;
  if(gate){
    try{const saved=await gate.restore();if(saved.token&&saved.url){base=saved.url;if(!session||session.token!==saved.token){session={...(session||{}),token:saved.token};}localStorage.setItem('gdqpan_server',base);localStorage.setItem('gdqpan_session',JSON.stringify(session));if(hasValidLocalSession())applyLocalSession();}}
    catch(e){notify(e.message);}
  }
  if(adoptDemoServer())await nativeSession();
  bootstrapForm.inert=false;
  const run=f=>`);
new (require('node:vm').Script)(accountSource,{filename:'Android account.js'});
fs.writeFileSync(accountPath,accountSource);
const musicOutput=path.resolve(www,'Sound','bundled-music');
if(!musicOutput.startsWith(path.resolve(www,'Sound')+path.sep))throw Error('Invalid generated music path');
fs.mkdirSync(musicOutput,{recursive:true});
const assetNames=new Set(catalog.songs.map(song=>path.basename(song.url)));
for(const name of fs.readdirSync(musicOutput))if(/^[a-f0-9]{64}\.mp3$/.test(name)&&!assetNames.has(name))fs.unlinkSync(path.join(musicOutput,name));
for(const song of catalog.songs)fs.copyFileSync(path.join(root,song.url),path.join(www,song.url));
fs.copyFileSync(path.join(root, 'vtv_player.html'), path.join(www, 'vtv_player.html'));
fs.mkdirSync(path.join(www,'config'),{recursive:true});
for(const name of ['settings.json','vtv-stream.json']) fs.copyFileSync(path.join(root,'config',name),path.join(www,'config',name));
// Keep the existing packaged audio selection; do not duplicate multi-GB source videos.
console.log('Built mobile web from desktop engine with mobile UI and native alarm integration.');
