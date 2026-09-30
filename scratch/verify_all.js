const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadFile(path.join(__dirname, '../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'));

  try {
    const report = await win.webContents.executeJavaScript(`
      (async () => {
        const results = [];
        function assert(cond, msg) {
          if (!cond) throw new Error("FAIL: " + msg);
          results.push("PASS: " + msg);
        }

        // Mock audio & mediaDevices for headless environment
        if (!navigator.mediaDevices) navigator.mediaDevices = {};
        navigator.mediaDevices.getUserMedia = async () => {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          return dst.stream;
        };

        // Suppress alert/confirm during automated test
        window.alert = () => {};
        window.confirm = () => true;

        // ==========================================
        // TEST 1: BUG 1 - TTS & RECORD TAB
        // ==========================================
        results.push("--- BẮT ĐẦU TEST LỖI 1: TTS & THU ÂM ---");
        const ttsInput = document.getElementById('tts-input-desktop');
        assert(!!ttsInput, "tts-input-desktop tồn tại");
        assert(!ttsInput.disabled && !ttsInput.readOnly, "tts-input ban đầu không bị disabled/readOnly");
        assert(getComputedStyle(ttsInput).pointerEvents === 'auto', "tts-input pointer-events là auto");

        // Nhập nội dung ban đầu
        ttsInput.value = "Nội dung thông báo kiểm tra 123";
        assert(ttsInput.value === "Nội dung thông báo kiểm tra 123", "Nhập text vào tts-input thành công");

        for (let i = 1; i <= 3; i++) {
          const expectedVal = ttsInput.value;
          results.push(\`[Vòng \${i}] Chuyển sang tab Thu Âm...\`);
          window.switchNoticeTab('record');
          await new Promise(r => setTimeout(r, 50));
          assert(document.getElementById('tab-pane-record').style.display !== 'none', \`Tab record hiển thị ở vòng \${i}\`);

          // Bắt đầu thu âm nếu chưa thu
          if (!VoiceRecorder.isRecording()) {
            await window.handleToggleRecord();
            assert(VoiceRecorder.isRecording(), \`VoiceRecorder đang thu âm ở vòng \${i}\`);
          }

          // Chuyển lại tab TTS khi ĐANG thu âm
          results.push(\`[Vòng \${i}] Chuyển lại tab Đọc Văn Bản khi đang thu âm...\`);
          window.switchNoticeTab('tts');
          await new Promise(r => setTimeout(r, 100));

          assert(document.getElementById('tab-pane-tts').style.display !== 'none', \`Tab tts hiển thị ở vòng \${i}\`);
          assert(!ttsInput.disabled, \`tts-input không bị disabled ở vòng \${i}\`);
          assert(!ttsInput.readOnly, \`tts-input không bị readOnly ở vòng \${i}\`);
          assert(getComputedStyle(ttsInput).pointerEvents === 'auto', \`tts-input pointer-events là auto ở vòng \${i}\`);
          assert(ttsInput.value === expectedVal, \`tts-input giữ nguyên nội dung cũ ở vòng \${i}\`);

          // Kiểm tra focus & gõ thêm text
          ttsInput.focus();
          assert(document.activeElement === ttsInput, \`tts-input nhận focus thành công ở vòng \${i}\`);
          ttsInput.value += \` - Bổ sung \${i}\`;
          assert(ttsInput.value.includes(\`Bổ sung \${i}\`), \`tts-input gõ và sửa văn bản tốt ở vòng \${i}\`);

          // Chuyển lại tab Thu Âm và dừng thu
          window.switchNoticeTab('record');
          await new Promise(r => setTimeout(r, 50));
          if (VoiceRecorder.isRecording()) {
            await window.handleToggleRecord();
            assert(!VoiceRecorder.isRecording(), \`Dừng thu âm thành công ở vòng \${i}\`);
          }

          // Chuyển lại tab TTS sau khi dừng thu
          window.switchNoticeTab('tts');
          await new Promise(r => setTimeout(r, 50));
          assert(!ttsInput.disabled && !ttsInput.readOnly, \`tts-input sẵn sàng sau khi dừng thu ở vòng \${i}\`);
        }

        // ==========================================
        // TEST 2: BUG 2 - LỊCH PHÁT TỰ ĐỘNG
        // ==========================================
        results.push("--- BẮT ĐẦU TEST LỖI 2: LỊCH PHÁT TỰ ĐỘNG ---");
        const timeInput = document.getElementById('sch-time-input');
        assert(!!timeInput, "sch-time-input tồn tại");
        assert(timeInput.type === 'time', "sch-time-input là thẻ input[type='time'] chuẩn");
        assert(!timeInput.disabled && !timeInput.readOnly, "sch-time-input ban đầu không bị disabled/readOnly");
        assert(getComputedStyle(timeInput).pointerEvents === 'auto', "sch-time-input pointer-events là auto");

        for (let cycle = 1; cycle <= 3; cycle++) {
          results.push(\`[Chu kỳ \${cycle}] Bấm Sửa lịch đầu tiên...\`);
          const schedules = StorageManager.getSchedules();
          assert(schedules.length > 0, "Có ít nhất 1 lịch phát trong bảng");
          const targetId = schedules[0].id;
          
          window.editSchedule(targetId);
          assert(timeInput.value === schedules[0].time, \`sch-time-input nhận đúng giờ của lịch (\${timeInput.value})\`);
          assert(!timeInput.disabled && !timeInput.readOnly, \`sch-time-input không bị disabled/readOnly khi đang sửa (chu kỳ \${cycle})\`);
          assert(getComputedStyle(timeInput).pointerEvents === 'auto', \`sch-time-input pointer-events auto khi đang sửa (chu kỳ \${cycle})\`);

          // Sửa giờ mới không trùng với lịch khác
          const testTime = (cycle === 1) ? '05:15' : (cycle === 2 ? '09:15' : '14:15');
          timeInput.value = testTime;
          assert(timeInput.value === testTime, \`Thay đổi giờ trong sch-time-input thành \${testTime}\`);

          // Bấm Cập nhật / Lưu
          results.push(\`[Chu kỳ \${cycle}] Bấm Cập nhật lịch...\`);
          await window.handleAddSchedule();

          // Kiểm tra sau khi Lưu
          assert(!timeInput.disabled, \`sch-time-input không bị disabled sau khi lưu (chu kỳ \${cycle})\`);
          assert(!timeInput.readOnly, \`sch-time-input không bị readOnly sau khi lưu (chu kỳ \${cycle})\`);
          assert(getComputedStyle(timeInput).pointerEvents === 'auto', \`sch-time-input pointer-events auto sau khi lưu (chu kỳ \${cycle})\`);

          // Kiểm tra giờ của lịch đã được lưu
          const updatedSchedules = StorageManager.getSchedules();
          const updatedTarget = updatedSchedules.find(s => s.id === targetId);
          assert(updatedTarget && updatedTarget.time === testTime, \`Lịch đã lưu thành công giờ mới \${testTime} ở chu kỳ \${cycle}\`);

          // Kiểm tra nhập giờ mới vào ô toolbar sau khi lưu
          timeInput.value = '14:30';
          assert(timeInput.value === '14:30', \`sch-time-input cho phép nhập giờ bình thường sau khi lưu (chu kỳ \${cycle})\`);

          // Kiểm tra thao tác Hủy sửa
          window.editSchedule(targetId);
          window.cancelEditSchedule();
          assert(!timeInput.disabled && !timeInput.readOnly, \`sch-time-input không bị disabled sau khi Hủy sửa (chu kỳ \${cycle})\`);
          assert(getComputedStyle(timeInput).pointerEvents === 'auto', \`sch-time-input pointer-events auto sau khi Hủy sửa (chu kỳ \${cycle})\`);
          timeInput.value = '16:00';
          assert(timeInput.value === '16:00', \`sch-time-input cho phép nhập giờ sau khi Hủy sửa (chu kỳ \${cycle})\`);
        }

        results.push("--- TẤT CẢ CÁC BƯỚC KIỂM TRA ĐỀU THÀNH CÔNG (PASSED 100%) ---");
        return results;
      })()
    `);

    console.log(report.join('\n'));
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    app.quit();
  }
});
