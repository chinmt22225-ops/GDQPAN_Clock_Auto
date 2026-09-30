const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadFile(path.join(__dirname, '../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));

  await win.webContents.executeJavaScript(`
    (() => {
      const schedules = StorageManager.getSchedules();
      const sch1 = schedules.find(s => s.id === 'sch_1');
      if (sch1) sch1.time = '05:30';
      StorageManager.saveSchedules(schedules);
      StorageManager.saveText('');
    })()
  `);

  console.log('Restored default schedules');
  app.quit();
});
