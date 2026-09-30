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

  // Let's test what happens when alert is called vs not called
  console.log('Testing interactions in renderer...');

  const test1 = await win.webContents.executeJavaScript(`
    (() => {
      const timeInput = document.getElementById('sch-time-input');
      const textInput = document.getElementById('sch-text-input');
      const ttsInput = document.getElementById('tts-input-desktop');

      // Click "Sửa" on first schedule
      const editBtn = document.querySelector('#schedule-tbody-desktop button');
      if (editBtn) editBtn.click();

      // Check if inputs are active/clickable
      return {
        timeInputDisabled: timeInput.disabled,
        timeInputReadOnly: timeInput.readOnly,
        timeInputPointerEvents: getComputedStyle(timeInput).pointerEvents,
        textInputDisabled: textInput.disabled,
        textInputPointerEvents: getComputedStyle(textInput).pointerEvents,
        ttsInputDisabled: ttsInput.disabled,
        ttsInputPointerEvents: getComputedStyle(ttsInput).pointerEvents,
        activeElement: document.activeElement ? document.activeElement.id : null
      };
    })()
  `);
  console.log('After clicking Sửa (without alert):', test1);

  app.quit();
});
