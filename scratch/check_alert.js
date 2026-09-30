const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const htmlPath = path.join(__dirname, '..', 'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
  await win.loadFile(htmlPath);

  console.log('Window loaded. Checking dialog behavior...');
  
  // Check if dialog override exists or native
  const hasCustomAlert = await win.webContents.executeJavaScript(`
    window.alert.toString();
  `);
  console.log('window.alert implementation:', hasCustomAlert);

  app.quit();
});
