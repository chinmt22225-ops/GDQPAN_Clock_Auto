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

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const logs = [];
      function log(msg) { logs.push(msg); }

      log("1. Initial state:");
      const ttsInput = document.getElementById('tts-input-desktop');
      log("ttsInput exists: " + !!ttsInput);
      log("ttsInput disabled: " + ttsInput.disabled + ", readOnly: " + ttsInput.readOnly);
      let rect = ttsInput.getBoundingClientRect();
      log("ttsInput rect: " + JSON.stringify({top: rect.top, left: rect.left, width: rect.width, height: rect.height}));
      let elAtPoint = document.elementFromPoint(rect.left + 20, rect.top + 20);
      log("elAtPoint at ttsInput: " + (elAtPoint ? elAtPoint.tagName + '#' + elAtPoint.id + '.' + elAtPoint.className : 'null'));

      log("2. Switching to tab record...");
      window.switchNoticeTab('record');
      await new Promise(r => setTimeout(r, 100));

      log("3. Clicking record toggle...");
      const btnRecord = document.getElementById('btn-record-toggle');
      log("btnRecord exists: " + !!btnRecord);
      
      // Mock getUserMedia if not available in headless/no-audio env
      if (!navigator.mediaDevices) navigator.mediaDevices = {};
      if (!navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = async () => {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          return dst.stream;
        };
      }

      try {
        await window.handleToggleRecord();
        log("Record started successfully, isRecording: " + VoiceRecorder.isRecording());
      } catch (e) {
        log("Record start error: " + e.message);
      }

      await new Promise(r => setTimeout(r, 200));

      log("4. Switching back to tab tts...");
      window.switchNoticeTab('tts');
      await new Promise(r => setTimeout(r, 200));

      rect = ttsInput.getBoundingClientRect();
      log("ttsInput rect after switch back: " + JSON.stringify({top: rect.top, left: rect.left, width: rect.width, height: rect.height}));
      elAtPoint = document.elementFromPoint(rect.left + 20, rect.top + 20);
      log("elAtPoint after switch back: " + (elAtPoint ? elAtPoint.tagName + '#' + elAtPoint.id + '.' + elAtPoint.className : 'null'));
      log("ttsInput style: pointerEvents=" + getComputedStyle(ttsInput).pointerEvents + ", display=" + getComputedStyle(ttsInput).display + ", visibility=" + getComputedStyle(ttsInput).visibility);
      log("pane-tts style: pointerEvents=" + getComputedStyle(document.getElementById('tab-pane-tts')).pointerEvents + ", display=" + getComputedStyle(document.getElementById('tab-pane-tts')).display);

      log("5. Testing focus and click...");
      let focused = false;
      ttsInput.addEventListener('focus', () => { focused = true; });
      ttsInput.focus();
      log("ttsInput document.activeElement === ttsInput: " + (document.activeElement === ttsInput));
      log("ttsInput received focus event: " + focused);

      log("6. Testing simulated click event...");
      let clicked = false;
      ttsInput.addEventListener('click', () => { clicked = true; });
      ttsInput.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      log("ttsInput received click event: " + clicked);

      return logs;
    })()
  `);

  console.log(result.join('\n'));
  app.quit();
});
