/**
 * GDQPAN - Hệ Thống Thông Báo & Phát Thanh Tự Động
 * Trung Tâm Giáo Dục Quốc Phòng và An Ninh — ĐHQG-HCM
 * Main Electron Application Entry
 */

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, session } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Đảm bảo chỉ chạy 1 phiên bản duy nhất (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let vtvWindow = null;
let tray = null;
let isQuitting = false;
let ttsProcess = null;

const { startInternalTtsServer, stopInternalTtsServer } = require('./tts_server');

// --- HÀM TÌM KIẾM TRÌNH BIÊN DỊCH PYTHON KHẢ DỤNG (DỰ PHÒNG) ---
function findPythonBinary() {
  const localApp = process.env.LOCALAPPDATA || '';
  const candidates = [
    path.join(localApp, 'Programs', 'Python', 'Python314', 'python.exe'),
    path.join(localApp, 'hermes', 'hermes-agent', 'venv', 'Scripts', 'python.exe'),
    'python',
    'py'
  ];
  for (const c of candidates) {
    if (c !== 'python' && c !== 'py' && fs.existsSync(c)) return c;
  }
  return 'python';
}

// --- TỰ ĐỘNG KHỞI ĐỘNG DỊCH VỤ GIỌNG ĐỌC AI 3 MIỀN TRONG NỀN ---
async function startTtsService() {
  try {
    // Luôn dọn dẹp sạch sẽ bất kỳ tiến trình cũ nào đang chiếm cổng 5050 trước khi khởi động
    stopTtsService();

    // 1. ƯU TIÊN HÀNG ĐẦU: Khởi động Dịch vụ TTS Node.js Native (Tích hợp 100% trong Electron, KHÔNG CẦN CÀI PYTHON)
    try {
      await startInternalTtsServer(5050);
      console.log('[GDQPAN] ✓ Dịch vụ AI Neural Node.js khởi chạy thành công tại cổng 5050.');
      return;
    } catch (nodeErr) {
      console.warn('[GDQPAN] Node TTS Server fallback:', nodeErr.message);
    }

    // 2. DỰ PHÒNG: Nếu môi trường có sẵn Python, thử khởi chạy tts_service.py
    let ttsScript = '';
    if (app.isPackaged) {
      const resScript = path.join(process.resourcesPath, 'tts_service.py');
      const exeDirScript = path.join(path.dirname(app.getPath('exe')), 'tts_service.py');
      const unpackedScript = path.join(process.resourcesPath, 'app.asar.unpacked', 'tts_service.py');

      if (fs.existsSync(resScript)) {
        ttsScript = resScript;
      } else if (fs.existsSync(exeDirScript)) {
        ttsScript = exeDirScript;
      } else if (fs.existsSync(unpackedScript)) {
        ttsScript = unpackedScript;
      } else {
        ttsScript = resScript;
      }
    } else {
      ttsScript = path.join(__dirname, 'tts_service.py');
    }

    if (fs.existsSync(ttsScript)) {
      const scriptDir = path.dirname(ttsScript);
      const pythonBin = findPythonBinary();
      console.log('[GDQPAN] Đang thử khởi chạy fallback Python:', pythonBin, ttsScript);

      const spawnArgs = (pythonBin === 'py') ? ['-3', ttsScript] : [ttsScript];
      const spawnOptions = {
        cwd: scriptDir,
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      };

      try {
        ttsProcess = spawn(pythonBin, spawnArgs, spawnOptions);
      } catch (e1) {
        console.warn('[GDQPAN] Lỗi khởi chạy với', pythonBin, e1.message);
      }
    }
  } catch (err) {
    console.warn('[GDQPAN] Lỗi startTtsService:', err);
  }
}

function stopTtsService() {
  try {
    stopInternalTtsServer();
  } catch (e) {}

  if (ttsProcess && ttsProcess.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${ttsProcess.pid} /F /T`, { stdio: 'ignore', timeout: 2000 });
      } else {
        ttsProcess.kill('SIGKILL');
      }
    } catch (e) {
      // Bỏ qua nếu tiến trình đã dừng trước đó
    }
    ttsProcess = null;
  }

  // Quét dọn an toàn cổng 5050 nếu có tiến trình Python/TTS mồ côi
  if (process.platform === 'win32') {
    try {
      const stdout = execSync('netstat -ano', { encoding: 'utf8', timeout: 2000 });
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('127.0.0.1:5050') && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== `${process.pid}`) {
            try {
              execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore', timeout: 1500 });
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }
}

// --- KHỞI TẠO CỬA SỔ CHÍNH ---
function createMainWindow() {
  let iconPath = path.join(__dirname, 'assets', 'icon.ico');
  if (app.isPackaged && process.resourcesPath) {
    const resIcon = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(resIcon)) iconPath = resIcon;
  }
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'GDQPAN - Hệ Thống Thông Báo Tự Động',
    icon: appIcon,
    backgroundColor: '#061a14',
    show: false, // Hiện sau khi đã sẵn sàng
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Hỗ trợ tải tệp âm thanh nội bộ
      allowRunningInsecureContent: true
    }
  });

  // Tắt thanh menu mặc định của Chromium
  mainWindow.setMenuBarVisibility(false);

  // Tải tệp HTML giao diện chính
  const htmlPath = path.join(__dirname, 'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
  mainWindow.loadFile(htmlPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    mainWindow.focus();
    if (mainWindow.webContents) {
      mainWindow.webContents.focus();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.focus();
    if (mainWindow.webContents) {
      mainWindow.webContents.focus();
    }
  });

  // Luôn đảm bảo webContents nhận đầy đủ sự kiện chuột và phím khi cửa sổ được kích hoạt
  mainWindow.on('focus', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.focus();
    }
  });

  // Khi bấm nút ✕: Đóng và tắt hoàn toàn ứng dụng, không chạy ngầm
  mainWindow.on('close', () => {
    isQuitting = true;
    if (tray) {
      try {
        tray.destroy();
      } catch (e) {}
      tray = null;
    }
    stopTtsService();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
}

// --- KHỞI TẠO KHAY HỆ THỐNG (SYSTEM TRAY) ---
function createSystemTray() {
  let iconPath = path.join(__dirname, 'assets', 'icon.ico');
  if (app.isPackaged && process.resourcesPath) {
    const resIcon = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(resIcon)) iconPath = resIcon;
  }
  const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.setToolTip('GDQPAN - Hệ Thống Thông Báo Tự Động (Đang chạy)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở giao diện GDQPAN',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Dừng tất cả âm thanh',
      click: () => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.executeJavaScript('if (typeof handleStopAll === "function") handleStopAll();');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Thoát hoàn toàn',
      click: () => {
        isQuitting = true;
        if (tray) {
          try {
            tray.destroy();
          } catch (e) {}
          tray = null;
        }
        stopTtsService();
        if (mainWindow) {
          mainWindow.destroy();
          mainWindow = null;
        }
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Bấm đúp vào khay hệ thống để hiện cửa sổ
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// --- CẤU HÌNH MẠNG (WHITELIST) & TIỀN XỬ LÝ HEADERS CHO CÁC NGUỒN PHÁT (YOUTUBE, VTV, CDN) ---
function setupVtvNetworkHandlers() {
  const vtvFilter = {
    urls: [
      '*://*.youtube.com/*',
      '*://*.youtu.be/*',
      '*://*.googlevideo.com/*',
      '*://*.ytimg.com/*',
      '*://*.doubleclick.net/*',
      '*://*.vtv.vn/*',
      '*://*.vtvgo.vn/*',
      '*://*.mediacdn.vn/*',
      '*://*.sohatv.vn/*',
      '*://*.vcmedia.vn/*',
      '*://*.akamaized.net/*',
      '*://*/*.m3u8*',
      '*://*/*.ts*',
      '*://*/*.mp4*'
    ]
  };

  // 1. Tự động set Referer và Origin cho các request tới VTV/SohaTV CDN (tránh bị chặn referer)
  session.defaultSession.webRequest.onBeforeSendHeaders(vtvFilter, (details, callback) => {
    const requestHeaders = details.requestHeaders || {};
    const u = details.url || '';
    if (u.includes('vtv.vn') || u.includes('vtvgo.vn') || u.includes('sohatv.vn') || u.includes('mediacdn.vn') || u.includes('vcmedia.vn')) {
      requestHeaders['Referer'] = 'https://vtv.vn/';
      requestHeaders['Origin'] = 'https://vtv.vn';
    }
    requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    callback({ cancel: false, requestHeaders });
  });

  // 2. Mở CORS headers cho response từ CDN stream để Hls.js không bị chặn
  session.defaultSession.webRequest.onHeadersReceived(vtvFilter, (details, callback) => {
    const responseHeaders = details.responseHeaders || {};
    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
    responseHeaders['Access-Control-Allow-Headers'] = ['*'];
    responseHeaders['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS'];
    callback({ cancel: false, responseHeaders });
  });

  // 3. Ghi log cảnh báo chi tiết nếu request gặp sự cố mạng
  session.defaultSession.webRequest.onErrorOccurred(vtvFilter, (details) => {
    console.warn('[GDQPAN Network Warning] Lỗi tải kết nối mạng:', details.url, 'Mã lỗi:', details.error);
  });
}

// --- BỘ TRÍCH XUẤT NGUỒN PHÁT TỰ ĐỘNG (YOUTUBE, VTV, YT-DLP, DIRECT STREAM) ---
function fetchHttp(url, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.get(url, {
        headers: Object.assign({
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }, headers),
        timeout: 10000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchHttp(res.headers.location, headers).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    } catch (e) {
      reject(e);
    }
  });
}

async function extractM3u8FromVtvVn(pageUrl) {
  try {
    const html = await fetchHttp(pageUrl, { 'Referer': 'https://vtv.vn/' });
    const iframeMatch = html.match(/<iframe[^>]+src=["'](https?:\/\/ovp\.sohatv\.vn\/embed\?[^"']+)["']/i);
    if (iframeMatch) {
      const embedHtml = await fetchHttp(iframeMatch[1], { 'Referer': pageUrl });
      const m3u8Match = embedHtml.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
      if (m3u8Match) return m3u8Match[0];
    }
    const directMatch = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
    return directMatch ? directMatch[0] : null;
  } catch (e) {
    return null;
  }
}

function findYtDlpBinary() {
  const candidates = [
    path.join(process.resourcesPath || '', 'bin', 'yt-dlp.exe'),
    path.join(__dirname, 'bin', 'yt-dlp.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python314', 'Scripts', 'yt-dlp.exe'),
    'yt-dlp'
  ];
  for (const c of candidates) {
    if (c !== 'yt-dlp' && fs.existsSync(c)) return c;
  }
  return 'yt-dlp';
}

function extractWithYtDlp(targetUrl) {
  return new Promise((resolve) => {
    try {
      const bin = findYtDlpBinary();
      const child = spawn(bin, ['-g', '--no-update', targetUrl], {
        windowsHide: true,
        timeout: 12000
      });
      let stdout = '';
      child.stdout.on('data', (d) => stdout += d);
      child.on('close', (code) => {
        if (code === 0 && stdout) {
          const lines = stdout.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const found = lines.find(l => /^https?:\/\//i.test(l));
          if (found) return resolve(found);
        }
        resolve(null);
      });
      child.on('error', () => resolve(null));
    } catch (err) {
      resolve(null);
    }
  });
}

async function extractM3u8FromHtml(pageUrl) {
  try {
    const html = await fetchHttp(pageUrl);
    const m = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
    if (m) return m[0];
    const v = html.match(/<video[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (v) return v[1];
  } catch (e) {}
  return null;
}

async function resolveStreamInfo(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { error: 'Không phát được link này, vui lòng thử dán link khác hoặc liên hệ người phụ trách kỹ thuật.' };
  }
  const cleanUrl = inputUrl.trim();

  // 1. YouTube: Nhận diện qua domain youtube.com / youtu.be
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
      streamUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`,
      originalUrl: cleanUrl
    };
  }

  // 2. Link stream trực tiếp (m3u8, mp4, webm)
  if (/\.(m3u8|mp4|webm|m4s)(\?.*)?$/i.test(cleanUrl)) {
    return {
      type: 'hls',
      streamUrl: cleanUrl,
      originalUrl: cleanUrl
    };
  }

  // 3. Webpage vtv.vn: Tự động trích xuất qua embed SohaTV
  if (cleanUrl.includes('vtv.vn')) {
    try {
      const vtvM3u8 = await extractM3u8FromVtvVn(cleanUrl);
      if (vtvM3u8) {
        return {
          type: 'hls',
          streamUrl: vtvM3u8,
          originalUrl: cleanUrl
        };
      }
    } catch (e) {}
  }

  // 4. Trích xuất nguồn stream ngầm bằng yt-dlp
  try {
    const ytdlpStream = await extractWithYtDlp(cleanUrl);
    if (ytdlpStream) {
      return {
        type: 'hls',
        streamUrl: ytdlpStream,
        originalUrl: cleanUrl
      };
    }
  } catch (e) {}

  // 5. Trích xuất từ HTML trang web
  try {
    const pageM3u8 = await extractM3u8FromHtml(cleanUrl);
    if (pageM3u8) {
      return {
        type: 'hls',
        streamUrl: pageM3u8,
        originalUrl: cleanUrl
      };
    }
  } catch (e) {}

  // 6. Nếu là đường link trang web bất kỳ (vtvgo, web tin tức...): Nạp trực tiếp vào Web Player (webview)
  if (/^https?:\/\//i.test(cleanUrl)) {
    return {
      type: 'web',
      webUrl: cleanUrl,
      originalUrl: cleanUrl
    };
  }

  // 7. Không lấy được nguồn phát: báo lỗi đúng nguyên văn yêu cầu
  return {
    error: 'Không phát được link này, vui lòng thử dán link khác hoặc liên hệ người phụ trách kỹ thuật.'
  };
}

// --- QUẢN LÝ CỬA SỔ POP-UP RIÊNG PHÁT VIDEO THỜI SỰ VTV ---
function openVtvWindow(streamUrl) {
  let appIcon = null;
  let iconPath = path.join(__dirname, 'assets', 'icon.ico');
  if (app.isPackaged && process.resourcesPath) {
    const resIcon = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(resIcon)) iconPath = resIcon;
  }
  if (fs.existsSync(iconPath)) appIcon = nativeImage.createFromPath(iconPath);

  if (vtvWindow && !vtvWindow.isDestroyed()) {
    if (vtvWindow.isMinimized()) vtvWindow.restore();
    vtvWindow.show();
    vtvWindow.focus();
    if (streamUrl && vtvWindow.webContents) {
      vtvWindow.webContents.send('load-vtv-stream', streamUrl);
    }
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('vtv-window-state', true);
    }
    return;
  }

  vtvWindow = new BrowserWindow({
    width: 854,
    height: 480,
    minWidth: 420,
    minHeight: 260,
    title: 'GDQPAN - Cửa Sổ Truyền Hình Thời Sự VTV',
    icon: appIcon,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  vtvWindow.setMenuBarVisibility(false);

  const vtvHtmlPath = path.join(__dirname, 'vtv_player.html');
  vtvWindow.loadFile(vtvHtmlPath, { query: { streamUrl: encodeURIComponent(streamUrl || '') } });

  vtvWindow.once('ready-to-show', () => {
    vtvWindow.show();
    vtvWindow.focus();
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('vtv-window-state', true);
    }
  });

  vtvWindow.on('closed', () => {
    vtvWindow = null;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('vtv-window-state', false);
    }
  });
}

function closeVtvWindow() {
  if (vtvWindow && !vtvWindow.isDestroyed()) {
    try {
      vtvWindow.close();
    } catch (e) {}
  }
  vtvWindow = null;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send('vtv-window-state', false);
  }
}

function toggleVtvWindow(streamUrl) {
  if (vtvWindow && !vtvWindow.isDestroyed()) {
    closeVtvWindow();
    return false;
  } else {
    openVtvWindow(streamUrl);
    return true;
  }
}

// Đường dẫn cấu hình settings.json & vtv-stream.json
function getSettingsFilePath() {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'settings.json');
  }
  return path.join(__dirname, 'config', 'settings.json');
}

function getVtvConfigPath() {
  if (app.isPackaged && process.resourcesPath) {
    const resConfig = path.join(process.resourcesPath, 'config', 'vtv-stream.json');
    if (fs.existsSync(resConfig)) return resConfig;
    const exeConfig = path.join(path.dirname(app.getPath('exe')), 'config', 'vtv-stream.json');
    if (fs.existsSync(exeConfig)) return exeConfig;
  }
  return path.join(__dirname, 'config', 'vtv-stream.json');
}

// Đăng ký IPC Quản lý cửa sổ VTV Pop-up
ipcMain.handle('open-vtv-window', (event, streamUrl) => {
  openVtvWindow(streamUrl);
  return true;
});

ipcMain.handle('close-vtv-window', () => {
  closeVtvWindow();
  return true;
});

ipcMain.handle('toggle-vtv-window', (event, streamUrl) => {
  return toggleVtvWindow(streamUrl);
});

ipcMain.handle('get-vtv-window-status', () => {
  return !!(vtvWindow && !vtvWindow.isDestroyed());
});

ipcMain.handle('pause-vtv-window', () => {
  if (vtvWindow && !vtvWindow.isDestroyed() && vtvWindow.webContents) {
    vtvWindow.webContents.send('pause-vtv-stream');
  }
});

ipcMain.handle('resume-vtv-window', () => {
  if (vtvWindow && !vtvWindow.isDestroyed() && vtvWindow.webContents) {
    vtvWindow.webContents.send('resume-vtv-stream');
  }
});

// Đăng ký IPC trích xuất & nhận diện nguồn phát (YouTube / Hls / yt-dlp)
ipcMain.handle('resolve-stream-info', async (event, url) => {
  return await resolveStreamInfo(url);
});

// Đăng ký IPC đọc / lưu settings.json
ipcMain.handle('get-app-settings', async () => {
  try {
    const p = getSettingsFilePath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (err) {
    console.warn('[GDQPAN] Lỗi đọc settings.json:', err.message);
  }
  return null;
});

ipcMain.handle('save-app-settings', async (event, settingsData) => {
  try {
    const p = getSettingsFilePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(settingsData, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.warn('[GDQPAN] Lỗi lưu settings.json:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-vtv-stream-config', async () => {
  try {
    const p = getVtvConfigPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (err) {
    console.warn('[GDQPAN] Lỗi đọc vtv-stream.json:', err.message);
  }
  return null;
});

ipcMain.handle('save-vtv-stream-config', async (event, configData) => {
  try {
    const p = getVtvConfigPath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(configData, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.warn('[GDQPAN] Lỗi ghi vtv-stream.json:', err.message);
    return { success: false, error: err.message };
  }
});

// Focus khi người dùng cố mở thêm phiên bản thứ 2
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  setupVtvNetworkHandlers();
  await startTtsService();
  createMainWindow();
  createSystemTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (tray) {
    try {
      tray.destroy();
    } catch (e) {}
    tray = null;
  }
  stopTtsService();
});

app.on('will-quit', () => {
  stopTtsService();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
