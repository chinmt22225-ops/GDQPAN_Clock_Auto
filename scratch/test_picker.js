const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 800, height: 600, show: false });
  const html = `<!DOCTYPE html><html><body>
    <input type="time" id="t1" value="07:00" onclick="handleClick(this)">
    <script>
      function handleClick(el) {
        try {
          if (typeof el.showPicker === 'function') el.showPicker();
        } catch(e) {
          console.error('SHOWPICKER ERROR:', e.message);
        }
      }
    </script>
  </body></html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  win.webContents.on('console-message', (e, level, msg) => {
    console.log('CONSOLE:', msg);
  });

  const res = await win.webContents.executeJavaScript(`
    (() => {
      const t1 = document.getElementById('t1');
      try {
        t1.showPicker();
        return 'showPicker called';
      } catch (e) {
        return 'showPicker error: ' + e.message;
      }
    })()
  `);
  console.log('DIRECT showPicker CALL RESULT:', res);
  app.quit();
});
