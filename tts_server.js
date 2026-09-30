/**
 * Dịch vụ Giọng đọc AI Neural 3 Miền (Node.js Native Service)
 * Tích hợp trực tiếp vào Electron, KHÔNG CẦN CÀI PYTHON trên máy người dùng.
 * Chạy trên http://127.0.0.1:5050
 */

const http = require('http');
const url = require('url');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const PORT = 5050;
let serverInstance = null;

// Bảng tính toán tốc độ (rate) đồng bộ hoàn hảo với Hoài My
function calculateRate(rateParam, voice) {
  const isNam = (voice === 'vi-VN-NamMinhNeural' || (voice || '').toLowerCase().includes('nam'));
  // Căn chỉnh nhịp điệu: NamMinh nói nhanh hơn Hoài My ~2%, áp dụng bù -2%
  const offset = isNam ? -2 : 0;

  if (typeof rateParam === 'string' && (rateParam.startsWith('+') || rateParam.startsWith('-')) && rateParam.endsWith('%')) {
    return rateParam;
  }

  const val = parseFloat(rateParam) || 1.0;
  let pct = 0;
  if (val <= 0.65) pct = -30;
  else if (val <= 0.85) pct = -15;
  else if (val >= 1.5) pct = 30;
  else if (val >= 1.2) pct = 15;
  else pct = Math.round((val - 1.0) * 100);

  pct += offset;
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function resolveVoice(voiceParam, regionParam) {
  const vp = (voiceParam || '').toLowerCase();
  const rp = (regionParam || '').toLowerCase();

  if (vp.includes('namminh') || vp.includes('nam minh') || rp === 'bac_nam' || rp === 'nam') {
    return 'vi-VN-NamMinhNeural';
  }
  return 'vi-VN-HoaiMyNeural';
}

function startInternalTtsServer(port = PORT) {
  return new Promise((resolve) => {
    if (serverInstance) return resolve(serverInstance);

    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url, true);
      const pathname = parsed.pathname;
      const query = parsed.query;

      // CORS headers cho phép giao diện Desktop gọi trực tiếp
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
      }

      // Endpoint kiểm tra trạng thái dịch vụ AI
      if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          status: 'online',
          engine: 'node-msedge-tts',
          voices: ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural']
        }));
      }

      // Endpoint phát âm thanh TTS
      if (pathname === '/api/tts') {
        const text = (query.text || '').trim();
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end("Vui lòng cung cấp nội dung trong tham số 'text'.");
        }

        const voice = resolveVoice(query.voice, query.region);
        const rateStr = calculateRate(query.rate, voice);

        try {
          const tts = new MsEdgeTTS();
          await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          const { audioStream } = await tts.toStream(text, { rate: rateStr, pitch: '+0Hz' });

          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
            'Accept-Ranges': 'bytes'
          });

          audioStream.pipe(res);
          audioStream.on('error', (err) => {
            console.error('[TTS-Node] Lỗi audioStream:', err.message);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('TTS Stream Error: ' + err.message);
            }
          });
        } catch (err) {
          console.error('[TTS-Node] Lỗi tổng hợp giọng nói:', err.message);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('TTS Error: ' + err.message);
          }
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[TTS-Node] Cổng ${port} đã được mở trước đó. Sẵn sàng sử dụng.`);
      } else {
        console.warn('[TTS-Node] Lỗi khởi động server:', err.message);
      }
      resolve(null);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[TTS-Node] ✓ Dịch vụ Giọng đọc AI Node.js đã sẵn sàng tại http://127.0.0.1:${port}`);
      serverInstance = server;
      resolve(server);
    });
  });
}

function stopInternalTtsServer() {
  if (serverInstance) {
    try {
      serverInstance.close();
      console.log('[TTS-Node] Đã dừng dịch vụ Giọng đọc AI Node.js.');
    } catch (e) {}
    serverInstance = null;
  }
}

module.exports = {
  startInternalTtsServer,
  stopInternalTtsServer
};
