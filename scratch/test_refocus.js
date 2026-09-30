const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  ipcMain.on('refocus-window', () => {
    console.log('IPC refocus-window received');
    win.blur();
    win.focus();
    if (win.webContents) win.webContents.focus();
  });

  await win.loadFile(path.join(__dirname, '../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));

  console.log('Testing refocus capability...');
  const success = typeof win.blur === 'function' && typeof win.focus === 'function';
  console.log('win.blur & win.focus exist:', success);

  app.quit();
});
