const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(__dirname, '../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const logs = [];

      // Test Edit and Update non-conflicting time (e.g. 05:40)
      const schedules = StorageManager.getSchedules();
      const firstId = schedules[0].id;
      window.editSchedule(firstId);

      const timeInput = document.getElementById('sch-time-input');
      timeInput.value = '05:40';
      await window.handleAddSchedule();

      const toasts = document.querySelectorAll('.app-toast-item');
      const lastToast = toasts[toasts.length - 1];
      logs.push("Toast after successful update: " + (lastToast ? lastToast.textContent.trim().replace(/\\s+/g, ' ') : 'none'));
      logs.push("timeInput disabled=" + timeInput.disabled + ", pointerEvents=" + getComputedStyle(timeInput).pointerEvents);

      // Verify schedule saved
      const updatedSchedules = StorageManager.getSchedules();
      const target = updatedSchedules.find(s => s.id === firstId);
      logs.push("Updated schedule time in storage: " + target.time);

      return logs;
    })()
  `);

  console.log(results.join('\n'));
  app.quit();
});
