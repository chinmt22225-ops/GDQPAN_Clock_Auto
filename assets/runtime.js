/* Device-local preference. Never part of the server's shared settings. */
(()=>{'use strict';
const key='gdqpan_background_enabled';let authenticated=false,foreground=!document.hidden,enabled=localStorage.getItem(key)!=='false',epoch=0;
const native=!!window.Capacitor?.isNativePlatform?.(),alarm=native?window.Capacitor.registerPlugin('GdqAlarm'):null;
const allowed=()=>authenticated&&(enabled||foreground);
function stop(){
  if(typeof VoiceRecorder!=='undefined'&&VoiceRecorder.isRecording())VoiceRecorder.stop().catch(console.warn);
  window.handleStopAll?.(true); // Do not restore a pending music snapshot.
  window.AudioEngine?.stopAll?.();window.speechSynthesis?.cancel();
  for(const media of document.querySelectorAll('audio,video')){media.pause();}
  window.electronAPI?.closeVtvWindow?.();
  if(native){
    alarm.stop().catch(()=>{});alarm.closeVtv().catch(()=>{});window.Capacitor.registerPlugin('TextToSpeech').stop().catch(()=>{});
    const legacy=window.Capacitor.registerPlugin('LocalNotifications');legacy.getPending().then(r=>legacy.cancel({notifications:r.notifications})).catch(()=>{});
  }
}
async function update(){
  const generation=++epoch;if(!allowed())stop();
  const state={authenticated,backgroundEnabled:enabled};
  if(native){const result=await alarm.runtime(state);if(generation===epoch&&typeof result?.foreground==='boolean')foreground=result.foreground;}
  else if(window.electronAPI?.setRuntimeState)await window.electronAPI.setRuntimeState(state);
  if(generation!==epoch)return;
  document.dispatchEvent(new CustomEvent('gdqpan-runtime',{detail:{allowed:allowed(),backgroundEnabled:enabled}}));
}
window.GdqRuntime={allowed,get backgroundEnabled(){return enabled;},
  async authenticate(value){authenticated=!!value;await update();},
  async setBackground(value){enabled=!!value;localStorage.setItem(key,String(enabled));await update();},
  suspend(){foreground=false;if(!allowed())stop();},
};
if(typeof VoiceRecorder!=='undefined'){
  const start=VoiceRecorder.start;
  VoiceRecorder.start=async function(...args){
    if(!allowed())throw Error('Ứng dụng đã dừng hoạt động nền.');
    const result=await start.apply(this,args);
    if(!allowed()){await VoiceRecorder.stop();throw Error('Đã hủy thu âm vì ứng dụng ngừng hoạt động.');}
    return result;
  };
}
document.addEventListener('visibilitychange',()=>{foreground=!document.hidden;update().catch(console.warn);});
if(window.electronAPI?.onRuntimeVisibility)window.electronAPI.onRuntimeVisibility(value=>{foreground=!!value;update().catch(console.warn);});
document.addEventListener('gdqpan-native-foreground',event=>{foreground=!!event.detail;if(!allowed())stop();document.dispatchEvent(new CustomEvent('gdqpan-runtime',{detail:{allowed:allowed(),backgroundEnabled:enabled}}));});
update().catch(console.warn);
})();
