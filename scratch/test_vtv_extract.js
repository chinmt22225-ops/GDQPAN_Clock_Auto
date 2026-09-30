const https = require('https');

async function extractFromVtvVn(pageUrl) {
  try {
    const pageHtml = await new Promise((res, rej) => {
      https.get(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, (r) => {
        let b = ''; r.on('data', c => b += c); r.on('end', () => res(b));
      }).on('error', rej);
    });

    const iframeMatch = pageHtml.match(/<iframe[^>]+src=["'](https?:\/\/ovp\.sohatv\.vn\/embed\?[^"']+)["']/i);
    if (!iframeMatch) {
      // Check direct m3u8 in page
      const m = pageHtml.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
      return m ? m[0] : null;
    }

    const embedUrl = iframeMatch[1];
    const embedHtml = await new Promise((res, rej) => {
      https.get(embedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': pageUrl }
      }, (r) => {
        let b = ''; r.on('data', c => b += c); r.on('end', () => res(b));
      }).on('error', rej);
    });

    const m3u8Match = embedHtml.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
    return m3u8Match ? m3u8Match[0] : null;
  } catch (e) {
    return null;
  }
}

(async () => {
  const vtv1 = await extractFromVtvVn('https://vtv.vn/truyen-hinh-truc-tuyen/vtv1.htm');
  console.log('Extracted VTV1:', vtv1);
  const vtv3 = await extractFromVtvVn('https://vtv.vn/truyen-hinh-truc-tuyen/vtv3.htm');
  console.log('Extracted VTV3:', vtv3);
})();
