/**
 * GDQPAN - Hệ Thống Thông Báo & Phát Thanh Tự Động
 * Trung Tâm Giáo Dục Quốc Phòng và An Ninh — ĐHQG-HCM
 * Main Electron Application Entry
 */

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, session, powerMonitor } = require('electron');

// Account traffic is performed in the main process so file:// pages need no permissive CORS.
handleAppIPC('gdqpan-account-request', async (event, request) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('Không cho phép cửa sổ này truy cập tài khoản.');
  const base = new URL(request.base);
  if (base.pathname !== '/' || base.search || base.hash || base.username || base.password || !(base.protocol === 'https:' || (base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname)))) throw new Error('Địa chỉ máy chủ không hợp lệ.');
  if (typeof request.route !== 'string' || !/^\/[a-zA-Z0-9/_-]+$/.test(request.route)) throw new Error('Thao tác không hợp lệ.');
  try {
    const response = await fetch(base.origin + '/api' + request.route, {
      method: request.method,
      headers: request.headers,
      body: request.upload ? Buffer.from(request.body,'base64') : request.body,
      signal: AbortSignal.timeout(request.upload ? 120000 : request.coldStart ? 90000 : 12000),
      redirect: 'error'
    });
    return {status:response.status,data:request.binary && response.ok ? Buffer.from(await response.arrayBuffer()).toString('base64') : await response.json(),mime:response.headers.get('content-type')};
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED' || (err.message && err.message.includes('fetch failed'))) {
      throw new Error(base.protocol==='http:'?`Không thể kết nối đến máy chủ (${base.origin}). Hãy mở chay_may_chu_tai_khoan.bat hoặc npm start trong server.`:`Không thể kết nối đến máy chủ (${base.origin}). Kiểm tra Internet và trạng thái máy chủ. Máy chủ demo có thể cần khởi động lại sau thời gian không sử dụng.`);
    }
    throw err;
  }
});
const path = require('path');
const {trustedIPC,mediaUrl,protectWindow,localPage,allowPermission}=require('./desktop-security.cjs');
function handleAppIPC(channel,handler,allowVtv=false){
  ipcMain.handle(channel,(event,...args)=>{
    const windows=[{window:mainWindow,page:path.join(__dirname,'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html')}];
    if(allowVtv)windows.push({window:vtvWindow,page:path.join(__dirname,'vtv_player.html')});
    if(!trustedIPC(event,windows))throw Error('IPC chỉ cho phép trang ứng dụng tin cậy.');
    return handler(event,...args);
  });
}
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const {fetchPage}=require('./fetch-page.cjs');

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
let runtimeState={authenticated:false,backgroundEnabled:true},screenLocked=false,runtimeTts=false,runtimeWork=Promise.resolve();
function runtimeForeground(){return !screenLocked&&!![mainWindow,vtvWindow].find(w=>w&&!w.isDestroyed()&&w.isVisible()&&!w.isMinimized()&&w.isFocused());}
function applyRuntime(){
  runtimeWork=runtimeWork.catch(()=>{}).then(async()=>{
    const active=runtimeState.authenticated&&(runtimeState.backgroundEnabled||runtimeForeground());
    if(!active){
      stopTtsService();runtimeTts=false;
      if(tray){tray.destroy();tray=null;}
      if(vtvWindow&&!vtvWindow.isDestroyed())vtvWindow.close();
    }else{
      if(runtimeState.backgroundEnabled&&!tray)createSystemTray();
      if(!runtimeState.backgroundEnabled&&tray){tray.destroy();tray=null;}
      if(!runtimeTts){await startTtsService();runtimeTts=true;}
      // Logout may arrive while the async service is starting.
      if(!runtimeState.authenticated||(!runtimeState.backgroundEnabled&&!runtimeForeground())){stopTtsService();runtimeTts=false;}
    }
  });return runtimeWork;
}
function notifyRuntimeVisibility(){
  if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('gdqpan-runtime-visibility',runtimeForeground());
  applyRuntime().catch(console.warn);
}
handleAppIPC('gdqpan-runtime-state',async(_event,state)=>{
  if(!state||typeof state.authenticated!=='boolean'||typeof state.backgroundEnabled!=='boolean')throw Error('Trạng thái chạy nền không hợp lệ.');
  runtimeState={authenticated:state.authenticated,backgroundEnabled:state.backgroundEnabled};await applyRuntime();return {active:runtimeState.authenticated&&(runtimeState.backgroundEnabled||runtimeForeground())};
});

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
      if(nodeErr.code==='EADDRINUSE')return;
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

  // Never terminate an unrelated process just because it owns port 5050.
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
      nodeIntegration: false,       // Tắt Node trong renderer để chặn script không tin cậy truy cập fs/require
      contextIsolation: true,       // Bật contextBridge — preload vẫn expose electronAPI an toàn
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false   // Đảm bảo đồng hồ hẹn giờ và lịch không bị chậm khi chạy nền
    }
  });

  // Tắt thanh menu mặc định của Chromium
  mainWindow.setMenuBarVisibility(false);

  // Tải tệp HTML giao diện chính
  const htmlPath = path.join(__dirname, 'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
  protectWindow(mainWindow,htmlPath);
  mainWindow.loadFile(htmlPath);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn('[GDQPAN] Cảnh báo did-fail-load:', errorCode, errorDescription, validatedURL);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(htmlPath);
      }
    }, 500);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    mainWindow.focus();
    if (mainWindow.webContents) {
      mainWindow.webContents.focus();
    }
  });
  for(const event of ['focus','blur','minimize','restore','hide','show'])mainWindow.on(event,()=>setTimeout(notifyRuntimeVisibility,0));

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
  tray.setToolTip('GDQPAN - Hệ Thống Thông Báo Tự Động');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ℹ️ Giới thiệu phần mềm',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.executeJavaScript('if (typeof openModalSheet === "function") openModalSheet("about");');
        }
      }
    },
    { type: 'separator' },
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
  const localMedia=details=>['xhr','media'].includes(details.resourceType)&&[
    [mainWindow,'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'],[vtvWindow,'vtv_player.html']
  ].some(([window,page])=>window&&!window.isDestroyed()&&details.webContentsId===window.webContents.id&&localPage(details.frame?.url||window.webContents.getURL(),path.join(__dirname,page)));
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
    if(!localMedia(details)){callback({cancel:false,requestHeaders});return;}
    const u = details.url || '';
    const host=new URL(u).hostname;
    if (['vtv.vn','vtvgo.vn','sohatv.vn','mediacdn.vn','vcmedia.vn'].some(domain=>host===domain||host.endsWith('.'+domain))) {
      requestHeaders['Referer'] = 'https://vtv.vn/';
      requestHeaders['Origin'] = 'https://vtv.vn';
    }
    requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    callback({ cancel: false, requestHeaders });
  });

  // 2. Mở CORS headers cho response từ CDN stream để Hls.js không bị chặn
  session.defaultSession.webRequest.onHeadersReceived(vtvFilter, (details, callback) => {
    const responseHeaders = details.responseHeaders || {};
    if(!localMedia(details)){callback({cancel:false,responseHeaders});return;}
    responseHeaders['Access-Control-Allow-Origin'] = ['null'];
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
  return fetchPage(url,{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',...headers});
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
  if(!mediaUrl(cleanUrl))return {error:'Đường dẫn phát cần HTTP hoặc HTTPS hợp lệ.'};

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
      nodeIntegration: false,       // Tắt Node trong renderer VTV
      contextIsolation: true,       // Bật contextBridge an toàn
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false
    }
  });

  for(const event of ['focus','blur','minimize','restore','hide','show','closed'])vtvWindow.on(event,()=>setTimeout(notifyRuntimeVisibility,0));
  vtvWindow.setMenuBarVisibility(false);

  const vtvHtmlPath = path.join(__dirname, 'vtv_player.html');
  protectWindow(vtvWindow,vtvHtmlPath);
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
  if(app.isPackaged)return path.join(app.getPath('userData'),'vtv-stream.json');
  return path.join(__dirname, 'config', 'vtv-stream.json');
}

// Đăng ký IPC Quản lý cửa sổ VTV Pop-up
handleAppIPC('open-vtv-window', (event, streamUrl) => {
  if(streamUrl&&!mediaUrl(streamUrl))throw Error('Đường dẫn phát không hợp lệ.');
  openVtvWindow(streamUrl);
  return true;
});

handleAppIPC('close-vtv-window', () => {
  closeVtvWindow();
  return true;
});

handleAppIPC('toggle-vtv-window', (event, streamUrl) => {
  if(streamUrl&&!mediaUrl(streamUrl))throw Error('Đường dẫn phát không hợp lệ.');
  return toggleVtvWindow(streamUrl);
});

handleAppIPC('get-vtv-window-status', () => {
  return !!(vtvWindow && !vtvWindow.isDestroyed());
});

handleAppIPC('pause-vtv-window', () => {
  if (vtvWindow && !vtvWindow.isDestroyed() && vtvWindow.webContents) {
    vtvWindow.webContents.send('pause-vtv-stream');
  }
});

handleAppIPC('resume-vtv-window', () => {
  if (vtvWindow && !vtvWindow.isDestroyed() && vtvWindow.webContents) {
    vtvWindow.webContents.send('resume-vtv-stream');
  }
});

// Đăng ký IPC trích xuất & nhận diện nguồn phát (YouTube / Hls / yt-dlp)
handleAppIPC('resolve-stream-info', async (event, url) => {
  return await resolveStreamInfo(url);
},true);

// Đăng ký IPC đọc / lưu settings.json
handleAppIPC('get-app-settings', async () => {
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

handleAppIPC('save-app-settings', async (event, settingsData) => {
  try {
    if(!settingsData||typeof settingsData!=='object'||Array.isArray(settingsData))throw Error('Cài đặt cần là object.');
    const p = getSettingsFilePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):{};
    const temporary=p+'.tmp';fs.writeFileSync(temporary, JSON.stringify({...current,...settingsData}, null, 2), 'utf8');fs.renameSync(temporary,p);
    return { success: true };
  } catch (err) {
    console.warn('[GDQPAN] Lỗi lưu settings.json:', err.message);
    return { success: false, error: err.message };
  }
});

handleAppIPC('get-vtv-stream-config', async () => {
  try {
    const userPath = getVtvConfigPath();
    const legacy=app.isPackaged?[path.join(process.resourcesPath,'config','vtv-stream.json'),path.join(path.dirname(app.getPath('exe')),'config','vtv-stream.json')]:[];
    const p = [userPath,...legacy,path.join(__dirname,'config','vtv-stream.json')].find(file=>fs.existsSync(file));
    if (p) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (err) {
    console.warn('[GDQPAN] Lỗi đọc vtv-stream.json:', err.message);
  }
  return null;
});

handleAppIPC('save-vtv-stream-config', async (event, configData) => {
  try {
    if(!configData||typeof configData!=='object'||Array.isArray(configData))throw Error('Cấu hình VTV cần là object.');
    const p = getVtvConfigPath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const temporary=p+'.tmp';fs.writeFileSync(temporary, JSON.stringify(configData, null, 2), 'utf8');fs.renameSync(temporary,p);
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
  // Dọn dẹp sạch sẽ Service Worker hoặc CacheStorage cũ trong Electron session (tránh xung đột với giao thức file://)
  try {
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage']
    });
  } catch (e) {}

  setupVtvNetworkHandlers();
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(allowPermission(contents,permission,details,mainWindow,path.join(__dirname,'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'))));
  createMainWindow();
  powerMonitor.on('lock-screen',()=>{screenLocked=true;notifyRuntimeVisibility();});
  powerMonitor.on('unlock-screen',()=>{screenLocked=false;notifyRuntimeVisibility();});

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
