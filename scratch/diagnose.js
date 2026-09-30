const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('use-fake-device-for-media-stream');

app.whenReady().then(async () => {
  console.log('App ready');
  const win = new BrowserWindow({
    width: 1366,
    height: 820,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      webSecurity: false
    }
  });

  const htmlPath = path.join(__dirname, '..', 'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
  console.log('Loading:', htmlPath);
  await win.loadFile(htmlPath);
  console.log('File loaded successfully');

  win.webContents.on('console-message', (e, level, msg) => {
    console.log('BROWSER CONSOLE:', msg);
  });

  const logs = await win.webContents.executeJavaScript(`
    (async () => {
      const out = [];
      const ttsInput = document.getElementById('tts-input-desktop');
      const tabTTS = document.getElementById('tab-pane-tts');
      const tabRecord = document.getElementById('tab-pane-record');

      out.push('Initial ttsInput: disabled=' + ttsInput.disabled + ', readOnly=' + ttsInput.readOnly);
      
      // Step 2: Switch to record tab
      window.switchNoticeTab('record');
      out.push('Switched to record. tabRecord display=' + getComputedStyle(tabRecord).display);
      out.push('tabTTS display=' + getComputedStyle(tabTTS).display);

      // Step 3: Start recording
      try {
        await window.handleToggleRecord();
        out.push('VoiceRecorder.isRecording: ' + VoiceRecorder.isRecording());
      } catch (err) {
        out.push('handleToggleRecord error: ' + err.message);
      }

      // Step 4: Switch back to tts tab
      window.switchNoticeTab('tts');
      out.push('Switched back to tts');
      out.push('tabTTS display=' + getComputedStyle(tabTTS).display);
      out.push('tabRecord display=' + getComputedStyle(tabRecord).display);

      // Check ttsInput geometry and properties
      const rect = ttsInput.getBoundingClientRect();
      out.push('ttsInput rect: top=' + rect.top + ', left=' + rect.left + ', width=' + rect.width + ', height=' + rect.height);
      out.push('ttsInput: disabled=' + ttsInput.disabled + ', readOnly=' + ttsInput.readOnly);
      out.push('ttsInput pointerEvents=' + getComputedStyle(ttsInput).pointerEvents);

      // Test elementFromPoint
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(cx, cy);
      out.push('elementFromPoint at (' + cx + ',' + cy + '): ' + (topEl ? topEl.tagName + '#' + topEl.id + '.' + topEl.className : 'null'));

      // Check elements covering
      if (document.elementsFromPoint) {
        const stack = document.elementsFromPoint(cx, cy);
        out.push('elements stack: ' + stack.map(e => e.tagName + '#' + e.id + '.' + e.className).join(' | '));
      }

      // Check if focus works
      ttsInput.focus();
      out.push('activeElement after focus: ' + (document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : 'null'));

      // ----------------------------------------------------
      // NOW CHECK BUG 2: SCHEDULE TIME INPUT
      // ----------------------------------------------------
      out.push('--- CHECKING BUG 2 ---');
      const timeInput = document.getElementById('sch-time-input');
      const btnAdd = document.getElementById('btn-add-schedule');
      out.push('sch-time-input initial: disabled=' + timeInput.disabled + ', readOnly=' + timeInput.readOnly);
      out.push('timeInput rect=' + JSON.stringify(timeInput.getBoundingClientRect()));
      out.push('timeInput pointerEvents=' + getComputedStyle(timeInput).pointerEvents);

      // Check what happens on quickEditScheduleTime
      const schedules = StorageManager.getSchedules();
      out.push('Current schedules count: ' + schedules.length);
      if (schedules.length > 0) {
        const s0 = schedules[0];
        out.push('Testing editSchedule on ' + s0.id);
        window.editSchedule(s0.id);
        out.push('After editSchedule: timeInput.value=' + timeInput.value + ', disabled=' + timeInput.disabled);
        out.push('editingScheduleId=' + window.editingScheduleId);

        // Cancel edit or save edit
        const cancelBtn = document.getElementById('btn-cancel-edit-schedule');
        out.push('cancelBtn display=' + cancelBtn?.style.display);
      }

      return out;
    })()
  `);

  console.log('--- RESULTS ---');
  console.log(logs.join('\n'));
  app.quit();
});
