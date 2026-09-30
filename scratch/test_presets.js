const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
        resolve({ url, status: res.statusCode, headers: res.headers });
      }).on('error', e => resolve({ url, error: e.message }));
    } catch (e) {
      resolve({ url, error: e.message });
    }
  });
}

(async () => {
  console.log(await checkUrl('https://vtv.vn/truyen-hinh-truc-tuyen/vtv1.htm'));
  console.log(await checkUrl('https://qpvn.vn/truyen-hinh-truc-tuyen/'));
  console.log(await checkUrl('https://vnews.gov.vn/'));
  console.log(await checkUrl('https://vtvgo.vn/'));
})();
