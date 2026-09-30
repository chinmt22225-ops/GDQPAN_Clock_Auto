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

  const count = await win.webContents.executeJavaScript(`
    new Promise(resolve => {
      let autosizeCalls = 0;
      const orig = window.autosizeTTS;
      window.autosizeTTS = function() {
        autosizeCalls++;
        if (orig) orig();
      };
      
      // Let it run for 1 second
      setTimeout(() => {
        resolve(autosizeCalls);
      }, 1000);
    })
  `);

  console.log('Autosize calls in 1 second idle:', count);

  const switchCount = await win.webContents.executeJavaScript(`
    new Promise(async resolve => {
      let autosizeCalls = 0;
      const orig = window.autosizeTTS;
      window.autosizeTTS = function() {
        autosizeCalls++;
        if (orig) orig();
      };

      window.switchNoticeTab('record');
      await new Promise(r => setTimeout(r, 200));
      window.switchNoticeTab('tts');

      setTimeout(() => {
        resolve(autosizeCalls);
      }, 1000);
    })
  `);

  console.log('Autosize calls in 1 second after tab switch:', switchCount);
  app.quit();
});
