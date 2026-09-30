const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
  const html = await fetchHttp(pageUrl, { 'Referer': 'https://vtv.vn/' });
  const iframeMatch = html.match(/<iframe[^>]+src=["'](https?:\/\/ovp\.sohatv\.vn\/embed\?[^"']+)["']/i);
  if (iframeMatch) {
    const embedHtml = await fetchHttp(iframeMatch[1], { 'Referer': pageUrl });
    const m3u8Match = embedHtml.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
    if (m3u8Match) return m3u8Match[0];
  }
  const directMatch = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
  return directMatch ? directMatch[0] : null;
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
    const bin = findYtDlpBinary();
    const child = spawn(bin, ['-g', '--no-update', targetUrl], {
      windowsHide: true,
      timeout: 12000
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => stdout += d);
    child.stderr.on('data', (d) => stderr += d);
    child.on('close', (code) => {
      if (code === 0 && stdout) {
        const lines = stdout.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const url = lines.find(l => /^https?:\/\//i.test(l));
        if (url) return resolve(url);
      }
      resolve(null);
    });
    child.on('error', () => resolve(null));
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

  // 1. YouTube
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
      streamUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`,
      originalUrl: cleanUrl
    };
  }

  // 2. Direct Stream
  if (/\.(m3u8|mp4|webm|m4s)(\?.*)?$/i.test(cleanUrl)) {
    return {
      type: 'hls',
      streamUrl: cleanUrl,
      originalUrl: cleanUrl
    };
  }

  // 3. vtv.vn
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

  // 4. yt-dlp
  try {
    const ytdlpResult = await extractWithYtDlp(cleanUrl);
    if (ytdlpResult) {
      return {
        type: 'hls',
        streamUrl: ytdlpResult,
        originalUrl: cleanUrl
      };
    }
  } catch (e) {}

  // 5. Generic HTML scan
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

  return {
    error: 'Không phát được link này, vui lòng thử dán link khác hoặc liên hệ người phụ trách kỹ thuật.'
  };
}

(async () => {
  console.log('1. YouTube test:', await resolveStreamInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  console.log('2. Direct m3u8 test:', await resolveStreamInfo('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'));
  console.log('3. VTV.vn test:', await resolveStreamInfo('https://vtv.vn/truyen-hinh-truc-tuyen/vtv1.htm'));
  console.log('4. Bad link test:', await resolveStreamInfo('https://google.com/nothing'));
})();
