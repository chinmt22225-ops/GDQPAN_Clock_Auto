const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function getExecutablePath() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const candidates = process.platform === 'win32' ? [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ] : [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Không tìm thấy trình duyệt Chrome/Edge trên hệ thống để chạy kiểm thử!');
}

async function runTest() {
  const chromePath = getExecutablePath();
  console.log('[TEST] Sử dụng trình duyệt:', chromePath);

  const viewports = [
    { name: '360x640 (Mobile nhỏ)', width: 360, height: 640 },
    { name: '412x915 (Mobile tiêu chuẩn)', width: 412, height: 915 }
  ];

  const targetFile = path.resolve(__dirname, '../www/index.html');
  const targetUrl = 'file://' + targetFile.replace(/\\/g, '/');
  console.log('[TEST] Kiểm tra file:', targetUrl);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  let totalFailures = 0;

  try {
    for (const vp of viewports) {
      console.log(`\n========================================`);
      console.log(`[TEST] Đang kiểm tra viewport: ${vp.name}`);
      console.log(`========================================`);

      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true
      });

      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', err => {
        pageErrors.push(err.toString());
      });

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(targetUrl, { waitUntil: 'load' });
      // Chờ thêm 1.5s để toàn bộ logic đồng hồ và render thực thi
      await new Promise(r => setTimeout(r, 1500));

      // 1. Kiểm tra không có pageerror hoặc console.error
      if (pageErrors.length > 0) {
        console.error(`❌ [THẤT BẠI] Có ${pageErrors.length} lỗi pageerror:`);
        pageErrors.forEach(e => console.error('   ->', e));
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Không có lỗi runtime pageerror`);
      }

      if (consoleErrors.length > 0) {
        console.error(`❌ [THẤT BẠI] Có ${consoleErrors.length} lỗi console.error:`);
        consoleErrors.forEach(e => console.error('   ->', e));
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Không có lỗi console.error`);
      }

      // 2. Kiểm tra Grid Sinh hoạt đủ số nút (9 nút)
      const shCardCount = await page.$$eval('#sh-grid .sh-btn', els => els.length);
      if (shCardCount < 9) {
        console.error(`❌ [THẤT BẠI] Grid Sinh hoạt chỉ có ${shCardCount} nút (Kỳ vọng: 9 nút)`);
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Grid Sinh hoạt có ${shCardCount} nút`);
      }

      // 3. Kiểm tra Timeline Lịch hôm nay có dòng dữ liệu
      const timelineCount = await page.$$eval('#timeline-today .timeline-item', els => els.length);
      if (timelineCount === 0) {
        console.error(`❌ [THẤT BẠI] Lịch hôm nay trống (0 dòng)`);
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Lịch hôm nay có ${timelineCount} dòng`);
      }

      // 4. Kiểm tra Time Picker: 24 mục giờ và 60 mục phút
      const hoursCount = await page.$$eval('#hour-col .picker-item', els => els.length);
      const minutesCount = await page.$$eval('#minute-col .picker-item', els => els.length);
      if (hoursCount !== 24 || minutesCount !== 60) {
        console.error(`❌ [THẤT BẠI] Time picker không đủ mục: Giờ=${hoursCount} (cần 24), Phút=${minutesCount} (cần 60)`);
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Time picker đầy đủ: 24 giờ, 60 phút`);
      }

      // 5. Kiểm tra Danh sách lịch phát
      const scheduleCount = await page.$$eval('#schedule-list-container .schedule-item', els => els.length);
      if (scheduleCount === 0) {
        console.error(`❌ [THẤT BẠI] Danh sách lịch phát trống (0 dòng)`);
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Danh sách lịch phát có ${scheduleCount} dòng`);
      }

      // 6. Kiểm tra Widget Lịch phát tiếp theo
      const nextTimeText = await page.$eval('#next-alarm-time', el => el.textContent.trim()).catch(() => '');
      const nextNameText = await page.$eval('#next-alarm-name', el => el.textContent.trim()).catch(() => '');
      if (!nextTimeText || nextTimeText === 'Đang tải...' || nextTimeText === '--:--') {
        console.error(`❌ [THẤT BẠI] Widget lịch tiếp theo kẹt giá trị: "${nextTimeText}"`);
        totalFailures++;
      } else {
        console.log(`✅ [THÀNH CÔNG] Widget lịch tiếp theo hợp lệ: ${nextTimeText} - ${nextNameText}`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n========================================`);
  if (totalFailures > 0) {
    console.error(`❌ TỔNG KẾT: CÓ ${totalFailures} ĐIỂM KIỂM THỬ THẤT BẠI.`);
    process.exit(1);
  } else {
    console.log(`🎉 TỔNG KẾT: TOÀN BỘ KIỂM THỬ KHỞI ĐỘNG ĐÃ VƯỢT QUA!`);
    process.exit(0);
  }
}

runTest().catch(err => {
  console.error('[TEST] Lỗi nghiêm trọng khi chạy kiểm thử:', err);
  process.exit(1);
});
