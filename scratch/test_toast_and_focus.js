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

  console.log('Testing Toast & Focus interactions...');

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const logs = [];

      // Test 1: handleSaveText
      const ttsInput = document.getElementById('tts-input-desktop');
      ttsInput.value = 'Thử nghiệm lưu văn bản mới';
      window.handleSaveText();

      const toast1 = document.querySelector('.app-toast-item');
      logs.push("Test 1 - Toast after handleSaveText: " + (toast1 ? toast1.textContent.trim() : 'none'));
      logs.push("Test 1 - ttsInput disabled: " + ttsInput.disabled + ", readOnly: " + ttsInput.readOnly + ", pointerEvents: " + getComputedStyle(ttsInput).pointerEvents);
      logs.push("Test 1 - activeElement: " + (document.activeElement ? document.activeElement.id : 'null'));

      // Test 2: Edit schedule
      const schedules = StorageManager.getSchedules();
      const firstId = schedules[0].id;
      window.editSchedule(firstId);

      const timeInput = document.getElementById('sch-time-input');
      const actionSelect = document.getElementById('sch-action-select');
      const textInput = document.getElementById('sch-text-input');
      const btnAdd = document.getElementById('btn-add-schedule');

      logs.push("Test 2 - After editSchedule: time=" + timeInput.value + ", action=" + actionSelect.value + ", btnText=" + btnAdd.textContent);
      logs.push("Test 2 - timeInput disabled: " + timeInput.disabled + ", pointerEvents: " + getComputedStyle(timeInput).pointerEvents);

      // Test 3: Save schedule update (CẬP NHẬT)
      timeInput.value = '08:15';
      await window.handleAddSchedule();

      const toasts = document.querySelectorAll('.app-toast-item');
      const lastToast = toasts[toasts.length - 1];
      logs.push("Test 3 - Toast after handleAddSchedule: " + (lastToast ? lastToast.textContent.trim() : 'none'));
      logs.push("Test 3 - timeInput disabled: " + timeInput.disabled + ", pointerEvents: " + getComputedStyle(timeInput).pointerEvents);

      // Test 4: Quick edit time (quickEditScheduleTime)
      window.quickEditScheduleTime(firstId);
      logs.push("Test 4 - After quickEditScheduleTime: btnText=" + btnAdd.textContent);
      logs.push("Test 4 - activeElement: " + (document.activeElement ? document.activeElement.id : 'null'));

      // Cancel edit to reset toolbar
      window.cancelEditSchedule();

      // Test 5: Custom action name in schedule
      actionSelect.value = 'Thông báo khác';
      window.handleSchActionChange(actionSelect);
      const customNameInput = document.getElementById('sch-custom-name-input');
      logs.push("Test 5 - Custom name input display after choosing 'Thông báo khác': " + customNameInput.style.display);
      customNameInput.value = 'Chào mừng đoàn đại biểu';
      timeInput.value = '09:45';
      await window.handleAddSchedule();

      const newSchedules = StorageManager.getSchedules();
      const addedSch = newSchedules.find(s => s.action === 'Chào mừng đoàn đại biểu');
      logs.push("Test 5 - Added schedule with custom name: " + (addedSch ? addedSch.action + ' at ' + addedSch.time : 'NOT FOUND'));
      logs.push("Test 5 - After add, actionSelect.selectedIndex=" + actionSelect.selectedIndex + ", customNameInput.display=" + customNameInput.style.display);

      return logs;
    })()
  `);

  console.log(results.join('\n'));
  app.quit();
});
