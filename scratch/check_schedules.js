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

  const info = await win.webContents.executeJavaScript(`
    (() => {
      const schedules = StorageManager.getSchedules();
      const first = schedules[0];
      const collision = SchedulerManager.checkTimeCollision('06:15', schedules, first.id);
      return {
        schedules: schedules.map(s => ({ id: s.id, time: s.time, action: s.action })),
        collision: collision
      };
    })()
  `);

  console.log(JSON.stringify(info, null, 2));
  app.quit();
});
