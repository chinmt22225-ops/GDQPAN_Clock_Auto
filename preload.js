/**
 * GDQPAN Desktop Preload Script
 * Exposes IPC methods to the renderer window safely.
 */
const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
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

// Gắn trực tiếp lên window để tương thích cả contextIsolation true/false
try {
  window.electronAPI = electronAPI;
  window.ipcRenderer = ipcRenderer;
} catch (e) {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    contextBridge.exposeInMainWorld('ipcRenderer', {
      invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
      on: (channel, listener) => ipcRenderer.on(channel, listener),
      removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener)
    });
  } catch (e) {}
}
