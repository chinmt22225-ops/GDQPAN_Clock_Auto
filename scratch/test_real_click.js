const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadFile(path.join(__dirname, '../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));

  // Test with real input events
  const testRes = await win.webContents.executeJavaScript(`
    (async () => {
      // Mock getUserMedia
      if (!navigator.mediaDevices) navigator.mediaDevices = {};
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        return dst.stream;
      };

      const ttsInput = document.getElementById('tts-input-desktop');
      ttsInput.value = "Test content 123";

      // 1. Click tab record
      const tabRecord = document.querySelector('.panel-tab[data-tab="record"]');
      const rRect = tabRecord.getBoundingClientRect();
      return {
        tabRecord: { x: Math.round(rRect.left + rRect.width/2), y: Math.round(rRect.top + rRect.height/2) }
      };
    })()
  `);

  console.log('Tab record coords:', testRes.tabRecord);

  // Send real mouse clicks
  win.webContents.sendInputEvent({ type: 'mouseDown', x: testRes.tabRecord.x, y: testRes.tabRecord.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: testRes.tabRecord.x, y: testRes.tabRecord.y, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 200));

  // Now find btn-record-toggle coords
  const recordBtnRes = await win.webContents.executeJavaScript(`
    (() => {
      const btn = document.getElementById('btn-record-toggle');
      const bRect = btn.getBoundingClientRect();
      return { x: Math.round(bRect.left + bRect.width/2), y: Math.round(bRect.top + bRect.height/2) };
    })()
  `);

  console.log('Record btn coords:', recordBtnRes);
  win.webContents.sendInputEvent({ type: 'mouseDown', x: recordBtnRes.x, y: recordBtnRes.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: recordBtnRes.x, y: recordBtnRes.y, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 500));

  // Now find tab tts coords
  const ttsTabRes = await win.webContents.executeJavaScript(`
    (() => {
      const tabTTS = document.querySelector('.panel-tab[data-tab="tts"]');
      const tRect = tabTTS.getBoundingClientRect();
      return { x: Math.round(tRect.left + tRect.width/2), y: Math.round(tRect.top + tRect.height/2) };
    })()
  `);

  console.log('TTS tab coords:', ttsTabRes);
  win.webContents.sendInputEvent({ type: 'mouseDown', x: ttsTabRes.x, y: ttsTabRes.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: ttsTabRes.x, y: ttsTabRes.y, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 300));

  // Now find tts-input-desktop coords
  const inputCoords = await win.webContents.executeJavaScript(`
    (() => {
      const ttsInput = document.getElementById('tts-input-desktop');
      const iRect = ttsInput.getBoundingClientRect();
      return {
        x: Math.round(iRect.left + 50),
        y: Math.round(iRect.top + 30),
        rect: iRect,
        activeElement: document.activeElement.tagName + '#' + document.activeElement.id
      };
    })()
  `);

  console.log('tts-input coords:', inputCoords);

  // Send real click to tts-input
  win.webContents.sendInputEvent({ type: 'mouseDown', x: inputCoords.x, y: inputCoords.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: inputCoords.x, y: inputCoords.y, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 200));

  // Check state of activeElement, value, and if it can type
  const finalState = await win.webContents.executeJavaScript(`
    (() => {
      const ttsInput = document.getElementById('tts-input-desktop');
      return {
        activeElement: document.activeElement.tagName + '#' + document.activeElement.id,
        isFocused: (document.activeElement === ttsInput),
        value: ttsInput.value,
        disabled: ttsInput.disabled,
        readOnly: ttsInput.readOnly,
        pointerEvents: getComputedStyle(ttsInput).pointerEvents,
        height: ttsInput.offsetHeight,
        top: ttsInput.getBoundingClientRect().top
      };
    })()
  `);

  console.log('Final state:', finalState);

  // Send characters
  win.webContents.sendInputEvent({ type: 'char', keyCode: 'A' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: 'B' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: 'C' });

  await new Promise(r => setTimeout(r, 200));

  const afterType = await win.webContents.executeJavaScript(`
    (() => {
      const ttsInput = document.getElementById('tts-input-desktop');
      return {
        value: ttsInput.value
      };
    })()
  `);

  console.log('After typing:', afterType);

  app.quit();
});
