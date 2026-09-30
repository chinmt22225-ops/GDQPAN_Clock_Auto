const https = require('https');
const http = require('http');

function fetchPage(targetUrl, referer = 'https://vtv.vn/') {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': referer
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
      });
      req.on('error', err => resolve({ error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    } catch (e) {
      resolve({ error: e.message });
    }
  });
}

(async () => {
  console.log('Testing fetch sohatv embed...');
  const res = await fetchPage('https://ovp.sohatv.vn/embed?v=JnTu3cwriGGFMFAv', 'https://vtv.vn/');
  console.log('Status:', res.status);
  if (res.body) {
    const m3u8 = res.body.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/gi);
    console.log('m3u8 in sohatv:', m3u8);
    const sources = res.body.match(/src:\s*["']([^"']+)["']/gi);
    console.log('sources in sohatv:', sources);
    const files = res.body.match(/file:\s*["']([^"']+)["']/gi);
    console.log('files in sohatv:', files);
  }
})();
