const https = require('https');

https.get('https://qpvn.vn/truyen-hinh-truc-tuyen/', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const m3u8 = b.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/gi);
    console.log('QPVN m3u8:', m3u8);
    const iframes = b.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
    console.log('QPVN iframes:', iframes);
  });
});
