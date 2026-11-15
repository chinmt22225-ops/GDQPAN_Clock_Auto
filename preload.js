/**
 * GDQPAN Desktop Preload Script
 * Exposes IPC methods to the renderer window safely via contextBridge.
 * contextIsolation:true — only the explicitly listed APIs are accessible from HTML.
 */
const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  setRuntimeState: (state) => ipcRenderer.invoke('gdqpan-runtime-state', state),
  onRuntimeVisibility: (callback) => ipcRenderer.on('gdqpan-runtime-visibility', (_event, value) => callback(value)),
  accountRequest: (request) => ipcRenderer.invoke('gdqpan-account-request', request),
  openVtvWindow: (url) => ipcRenderer.invoke('open-vtv-window', url),
  closeVtvWindow: () => ipcRenderer.invoke('close-vtv-window'),
  toggleVtvWindow: (url) => ipcRenderer.invoke('toggle-vtv-window', url),
  getVtvWindowStatus: () => ipcRenderer.invoke('get-vtv-window-status'),
  pauseVtvWindow: () => ipcRenderer.invoke('pause-vtv-window'),
  resumeVtvWindow: () => ipcRenderer.invoke('resume-vtv-window'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (data) => ipcRenderer.invoke('save-app-settings', data),
  getVtvConfig: () => ipcRenderer.invoke('get-vtv-stream-config'),
  saveVtvConfig: (cfg) => ipcRenderer.invoke('save-vtv-stream-config', cfg),
  resolveStreamInfo: (url) => ipcRenderer.invoke('resolve-stream-info', url),
  onVtvWindowState: (callback) => {
    ipcRenderer.on('vtv-window-state', (_event, state) => callback(state));
  }
};

// contextBridge.exposeInMainWorld làm cho window.electronAPI và window.ipcRenderer
// khả dụng trong renderer mà không cần nodeIntegration.
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Expose một ipcRenderer giới hạn chỉ cho các channel được phép (không expose toàn bộ)
const ALLOWED_IPC_CHANNELS = [
  'gdqpan-account-request','open-vtv-window','close-vtv-window','toggle-vtv-window',
  'get-vtv-window-status','pause-vtv-window','resume-vtv-window',
  'get-app-settings','save-app-settings','get-vtv-stream-config',
  'save-vtv-stream-config','resolve-stream-info','vtv-window-state'
];
const ALLOWED_IPC_EVENTS = new Set(['vtv-window-state','load-vtv-stream','pause-vtv-stream','resume-vtv-stream']);
const subscriptions = new Map();
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_IPC_CHANNELS.includes(channel)) throw new Error('IPC channel không được phép: ' + channel);
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, listener) => {
    if (!ALLOWED_IPC_EVENTS.has(channel)||typeof listener!=='function') throw new Error('IPC event không được phép: ' + channel);
    // Keep the Electron event in the isolated world; preserve the legacy callback signature.
    const wrapped=(_event,...args)=>listener(null,...args);
    const entries=subscriptions.get(listener)||[];entries.push({channel,wrapped});subscriptions.set(listener,entries);
    ipcRenderer.on(channel, wrapped);
  },
  removeListener: (channel, listener) => {
    const entries=subscriptions.get(listener)||[];
    for(const entry of entries)if(entry.channel===channel)ipcRenderer.removeListener(channel,entry.wrapped);
    const remaining=entries.filter(entry=>entry.channel!==channel);
    if(remaining.length)subscriptions.set(listener,remaining);else subscriptions.delete(listener);
  }
});
