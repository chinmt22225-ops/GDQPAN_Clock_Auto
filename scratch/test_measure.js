const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1366, height: 768, show: false });
  await win.loadFile('D:/web_QPAN/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
  await new Promise(r => setTimeout(r, 500));

  const info = await win.webContents.executeJavaScript(`
    (() => {
      const ta = document.getElementById('tts-input-desktop');
      const pane = document.getElementById('tab-pane-tts');
      const btnRow = pane.querySelector('.btn-row');
      const prev = btnRow && btnRow.previousElementSibling;
      const b1 = btnRow.getBoundingClientRect();
      const b2 = prev.getBoundingClientRect();
      const taB = ta.getBoundingClientRect();
      const paneB = pane.getBoundingClientRect();
      const bodyB = pane.parentElement.getBoundingClientRect();
      
      // Now switch to record, record, and switch back
      window.switchNoticeTab('record');
      window.switchNoticeTab('tts');
      
      const b1After = btnRow.getBoundingClientRect();
      const b2After = prev.getBoundingClientRect();
      const taBAfter = ta.getBoundingClientRect();

      return {
        initial: {
          taHeight: ta.style.height,
          taBoundingHeight: taB.height,
          paneHeight: paneB.height,
          bodyHeight: bodyB.height,
          free: b1.top - b2.bottom
        },
        afterSwitch: {
          taHeight: ta.style.height,
          taBoundingHeight: taBAfter.height,
          btnRowTop: b1After.top,
          prevBottom: b2After.bottom,
          free: b1After.top - b2After.bottom
        }
      };
    })()
  `);
  console.log('MEASUREMENTS:', JSON.stringify(info, null, 2));
  app.quit();
});
