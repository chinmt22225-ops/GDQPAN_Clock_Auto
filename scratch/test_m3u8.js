const https = require('https');

function testM3u8(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://ovp.sohatv.vn/',
        'Origin': 'https://ovp.sohatv.vn'
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, contentType: res.headers['content-type'], preview: data.substring(0, 300) }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

(async () => {
  const r = await testM3u8('https://cdn-live.vtv.vn/pIGclt1qhxDRG67WeWRJ4Q/1790507961/live/vtv1/master.m3u8');
  console.log('Result:', r);
})();
