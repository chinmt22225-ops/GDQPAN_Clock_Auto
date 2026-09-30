const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <body>
      <input type="time" id="t1" value="07:00">
      <input type="time" id="t2" value="07:00" onclick="try{if(typeof this.showPicker==='function')this.showPicker();}catch(e){console.log('t2 error:', e.message);}">
      <script>
        window.t1 = document.getElementById('t1');
        window.t2 = document.getElementById('t2');
      </script>
    </body>
    </html>
  `));

  const res = await win.webContents.executeJavaScript(`
    (() => {
      const logs = [];
      try {
        t1.showPicker();
        logs.push("t1 showPicker works when called directly");
      } catch (e) {
        logs.push("t1 showPicker direct call: " + e.message);
      }
      return logs;
    })()
  `);

  console.log(res);
  app.quit();
});
