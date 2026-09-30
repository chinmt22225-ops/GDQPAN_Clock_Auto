const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <body>
      <div style="padding: 50px;">
        <input type="time" id="t1" value="07:00" style="padding: 10px; font-size: 16px;">
        <input type="time" id="t2" value="07:00" style="padding: 10px; font-size: 16px;" onclick="try{if(typeof this.showPicker==='function')this.showPicker();}catch(e){console.log('t2 onclick error:', e.message);}">
      </div>
    </body>
    </html>
  `));

  await new Promise(r => setTimeout(r, 200));

  // Get coords of indicator in t1 and t2
  const coords = await win.webContents.executeJavaScript(`
    (() => {
      const r1 = document.getElementById('t1').getBoundingClientRect();
      const r2 = document.getElementById('t2').getBoundingClientRect();
      return {
        t1_text: { x: Math.round(r1.left + 20), y: Math.round(r1.top + r1.height/2) },
        t1_icon: { x: Math.round(r1.right - 15), y: Math.round(r1.top + r1.height/2) },
        t2_text: { x: Math.round(r2.left + 20), y: Math.round(r2.top + r2.height/2) },
        t2_icon: { x: Math.round(r2.right - 15), y: Math.round(r2.top + r2.height/2) }
      };
    })()
  `);

  console.log('Coordinates:', coords);

  // Click t1 text
  win.webContents.sendInputEvent({ type: 'mouseDown', x: coords.t1_text.x, y: coords.t1_text.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: coords.t1_text.x, y: coords.t1_text.y, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 100));

  // Type 0930 in t1
  win.webContents.sendInputEvent({ type: 'char', keyCode: '0' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: '9' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: '3' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: '0' });
  await new Promise(r => setTimeout(r, 100));

  const val1 = await win.webContents.executeJavaScript("document.getElementById('t1').value");
  console.log('t1 value after typing 0930:', val1);

  // Now click t2 text (the one with onclick=showPicker)
  win.webContents.sendInputEvent({ type: 'mouseDown', x: coords.t2_text.x, y: coords.t2_text.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: coords.t2_text.x, y: coords.t2_text.y, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 100));

  // Try to type in t2
  win.webContents.sendInputEvent({ type: 'char', keyCode: '0' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: '9' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: '3' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: '0' });
  await new Promise(r => setTimeout(r, 100));

  const val2 = await win.webContents.executeJavaScript("document.getElementById('t2').value");
  console.log('t2 value after typing 0930 with showPicker onclick:', val2);

  app.quit();
});
