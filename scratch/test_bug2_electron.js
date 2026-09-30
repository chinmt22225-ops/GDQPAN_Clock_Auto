const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadFile(path.join(__dirname, '../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const logs = [];
      const timeInput = document.getElementById('sch-time-input');

      logs.push("Initial timeInput: value=" + timeInput.value + ", disabled=" + timeInput.disabled);

      // Simulate editing schedule
      const schedules = StorageManager.getSchedules();
      const firstId = schedules[0].id;
      logs.push("Calling editSchedule('" + firstId + "')...");
      window.editSchedule(firstId);

      logs.push("After editSchedule: timeInput value=" + timeInput.value + ", activeElement=" + document.activeElement.id);

      // Now simulate saving schedule
      window.alert = () => {}; // suppress modal alert dialog
      window.confirm = () => true;

      logs.push("Calling handleAddSchedule()...");
      await window.handleAddSchedule();

      logs.push("After handleAddSchedule: timeInput value=" + timeInput.value + ", activeElement=" + document.activeElement.id);
      logs.push("timeInput disabled=" + timeInput.disabled + ", readOnly=" + timeInput.readOnly);
      logs.push("timeInput pointerEvents=" + getComputedStyle(timeInput).pointerEvents);

      // Test click on timeInput
      let clickFired = false;
      timeInput.addEventListener('click', () => { clickFired = true; }, { once: true });

      // Check rect
      const rect = timeInput.getBoundingClientRect();
      logs.push("timeInput rect: " + JSON.stringify({top: rect.top, left: rect.left, width: rect.width, height: rect.height}));
      const elAtPoint = document.elementFromPoint(rect.left + 20, rect.top + 10);
      logs.push("elementFromPoint: " + (elAtPoint ? elAtPoint.tagName + '#' + elAtPoint.id : 'null'));

      // Test showPicker directly
      let pickerError = null;
      try {
        if (typeof timeInput.showPicker === 'function') {
          timeInput.showPicker();
          logs.push("showPicker executed without error");
        } else {
          logs.push("showPicker is not a function");
        }
      } catch (err) {
        logs.push("showPicker threw error: " + err.message);
      }

      return logs;
    })()
  `);

  console.log(result.join('\n'));
  app.quit();
});
