/* Compatibility for the legacy preview only. APK uses the desktop engine. */
'use strict';
const StorageManager={
  getSchedules:()=>Store.get(Store.KEYS.SCHEDULES,[]),
  getSettings:()=>Store.get(Store.KEYS.SETTINGS,{}),
  getSavedText:()=>localStorage.getItem('gdqpan_saved_text_v2')||'',
  getCustomActions:()=>Store.get('gdqpan_custom_actions_v2',[]),
  getDisabledActions:()=>Store.get('gdqpan_disabled_actions_v2',[]),
  saveSchedules:value=>Store.set(Store.KEYS.SCHEDULES,value),
  saveSettings:value=>Store.set(Store.KEYS.SETTINGS,value),
  saveText:value=>localStorage.setItem('gdqpan_saved_text_v2',value),
  addLog:(action,details)=>addLogItem(action,'📋','ok',details)
};
window.GdqAccountHost={settingsContainer:()=>document.getElementById('tab-caidat')};
window.GdqMobile={syncAlarms:()=>NativeBridge.syncNativeAlarms()};
document.addEventListener('gdqpan-runtime',()=>NativeBridge.syncNativeAlarms());
window.handleStopAll=()=>{AudioEngine.stopAll();TTSEngine.stop();NativeBridge.syncNativeAlarms();};
document.addEventListener('gdqpan-shared',()=>{
  userSchedules=StorageManager.getSchedules();
  renderScheduleList();renderTimeline();restoreSystemSettings();updateAlarmCountdown(new Date());
});
// Preserve the legacy storage API; account.js remains the common session authority.
const prototypeSet=Store.set;
Store.set=function(key,value){
  if(window.GdqAccount&&!window.GdqAccount.admin)return false;
  return prototypeSet.call(this,key,value);
};
