const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1366, height: 768, show: true });
  await win.loadFile('D:/web_QPAN/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
  await new Promise(r => setTimeout(r, 600));

  win.webContents.on('console-message', (e, level, msg) => {
    console.log('CONSOLE:', msg);
  });

  const setupInfo = await win.webContents.executeJavaScript(`
    (() => {
      const timeInput = document.getElementById('sch-time-input');
      const rect = timeInput.getBoundingClientRect();
      
      // Let's monitor events on timeInput
      const events = [];
      ['click', 'mousedown', 'mouseup', 'focus', 'blur', 'input', 'change'].forEach(ev => {
        timeInput.addEventListener(ev, (e) => {
          events.push(ev + ' (isTrusted=' + e.isTrusted + ', defaultPrevented=' + e.defaultPrevented + ')');
        });
      });
      window.__events = events;

      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        indicatorX: Math.round(rect.right - 10),
        indicatorY: Math.round(rect.top + rect.height / 2),
        rect
      };
    })()
  `);
  console.log('Setup info:', setupInfo);

  // Simulate mouse click on timeInput center
  win.webContents.sendInputEvent({ type: 'mouseDown', x: setupInfo.x, y: setupInfo.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: setupInfo.x, y: setupInfo.y, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 300));

  const events1 = await win.webContents.executeJavaScript(`window.__events.splice(0)`);
  console.log('Events on initial click center:', events1);

  // Now simulate click on indicator (the clock icon)
  win.webContents.sendInputEvent({ type: 'mouseDown', x: setupInfo.indicatorX, y: setupInfo.indicatorY, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: setupInfo.indicatorX, y: setupInfo.indicatorY, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 300));
  const events2 = await win.webContents.executeJavaScript(`window.__events.splice(0)`);
  console.log('Events on indicator click:', events2);

  // Now let's simulate: EDIT SCHEDULE -> SAVE SCHEDULE -> CLICK AGAIN
  console.log('\n--- SIMULATING EDIT SCHEDULE -> SAVE -> CLICK AGAIN ---');
  await win.webContents.executeJavaScript(`
    (() => {
      // Overwrite alert so it doesn't block node script
      window.alert = function(msg) { console.log('ALERT CALLED:', msg); };
      
      const schedules = StorageManager.getSchedules();
      if (schedules.length > 0) {
        window.editSchedule(schedules[0].id);
        console.log('Called editSchedule');
        window.handleAddSchedule();
        console.log('Called handleAddSchedule (save)');
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 300));

  // Now click on timeInput center again!
  win.webContents.sendInputEvent({ type: 'mouseDown', x: setupInfo.x, y: setupInfo.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: setupInfo.x, y: setupInfo.y, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 300));
  const events3 = await win.webContents.executeJavaScript(`window.__events.splice(0)`);
  console.log('Events on click AFTER SAVE:', events3);

  const activeEl = await win.webContents.executeJavaScript(`document.activeElement.id`);
  console.log('activeElement after click:', activeEl);

  app.quit();
});
