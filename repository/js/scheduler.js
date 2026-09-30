/**
 * GDQPAN Audio System - Advanced Scheduler & WakeLock Manager
 * Quản lý lịch phát tự động theo ngày trong tuần và cơ chế chống ngủ đông thiết bị
 */

const SchedulerManager = (function () {
  let timerInterval = null;
  let lastTriggeredMinute = '';
  let wakeLockSentinel = null;
  let isWakeLockRequested = true;
  let onTickCallbacks = [];

  const TEMPLATES = {
    'Báo thức': 'Báo thức. Đề nghị toàn thể sinh viên thức dậy và thực hiện chế độ buổi sáng theo quy định.',
    'Thể dục sáng': 'Báo giờ thể dục sáng. Toàn thể sinh viên nhanh chóng cơ động ra sân tập.',
    'Chuẩn bị làm việc': 'Thông báo. Chuẩn bị đến giờ làm việc và học tập. Đề nghị các đơn vị kiểm tra quân tư trang.',
    'Làm việc': 'Thông báo. Đã đến giờ làm việc và học tập. Toàn thể đơn vị vào vị trí học tập chính thức.',
    'Nghỉ giải lao': 'Thông báo. Đã đến giờ nghỉ giải lao giữa giờ.',
    'Hết giờ giải lao': 'Thông báo. Đã hết giờ giải lao. Đề nghị các đơn vị trở lại vị trí học tập, làm việc.',
    'Hết giờ làm việc': 'Thông báo. Đã hết giờ làm việc và học tập buổi chiều.',
    'Ăn': 'Thông báo. Đã đến giờ ăn cơm. Đề nghị các đơn vị tổ chức cơ động xuống nhà ăn theo kế hoạch.',
    'Điểm danh': 'Thông báo. Đã đến giờ điểm danh quân số. Đề nghị chỉ huy các đơn vị tổ chức điểm danh theo quy định.',
    'Ngủ': 'Thông báo. Đã đến giờ tắt đèn đi ngủ. Đề nghị toàn thể sinh viên thực hiện chế độ nghỉ theo quy định.'
  };

  function start() {
    if (timerInterval) clearInterval(timerInterval);
    checkSchedule();
    timerInterval = setInterval(checkSchedule, 1000);
    initWakeLock();
  }

  function stop() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    releaseWakeLock();
  }

  function checkSchedule() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const dayOfWeek = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7

    // Gọi các callback cập nhật đồng hồ
    onTickCallbacks.forEach(cb => {
      try {
        cb({ now, hours, minutes, seconds, timeStr, dayOfWeek });
      } catch (e) {
        console.error('Lỗi tick callback:', e);
      }
    });

    // Kiểm tra lịch một lần mỗi phút
    if (timeStr === lastTriggeredMinute) return;
    lastTriggeredMinute = timeStr;

    if (typeof StorageManager === 'undefined') return;

    const schedules = StorageManager.getSchedules();
    const settings = StorageManager.getSettings();

    // Lọc các lịch trùng giờ và đúng ngày trong tuần
    const activeSchedules = schedules.filter(s => {
      if (s.on === false) return false;
      if (s.time !== timeStr) return false;
      // Nếu có cài đặt ngày trong tuần
      if (Array.isArray(s.days) && s.days.length > 0) {
        return s.days.includes(dayOfWeek);
      }
      return true;
    });

    activeSchedules.forEach(async s => {
      try {
        console.log(`[Lịch tự động] Kích hoạt: ${s.action} lúc ${s.time}`);
        StorageManager.addLog(`Lịch tự động: ${s.action}`, `Thời gian: ${s.time}`);

        if (s.action === 'Thông báo khác') {
          const content = s.text || StorageManager.getSavedText() || 'Thông báo tự động theo thời gian biểu.';
          if (typeof TTSEngine !== 'undefined') {
            await TTSEngine.speakWithChime(content, settings);
          }
        } else {
          // 1. Phát âm thanh hiệu lệnh
          if (typeof AudioEngine !== 'undefined') {
            await AudioEngine.triggerActionSound(s.action);
          }
          // 2. Nếu có nội dung thông báo hoặc mẫu văn bản, phát tiếp giọng đọc
          const speechText = s.text || TEMPLATES[s.action];
          if (speechText && typeof TTSEngine !== 'undefined') {
            await new Promise(r => setTimeout(r, 800)); // Khoảng lặng giữa âm thanh và lời nói
            await TTSEngine.speak(speechText, settings);
          }
        }
      } catch (err) {
        console.error('Lỗi thực thi lịch tự động:', err);
      }
    });
  }

  // --- Screen WakeLock API (Giữ màn hình không bị tắt trên Mobile/Desktop) ---
  async function initWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      if (isWakeLockRequested && !wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
        console.log('Screen WakeLock đã được kích hoạt thành công.');
      }
    } catch (err) {
      console.warn('Không thể bật Screen WakeLock:', err);
    }
  }

  async function setWakeLock(enable) {
    isWakeLockRequested = enable;
    if (enable) {
      await initWakeLock();
    } else {
      releaseWakeLock();
    }
  }

  function releaseWakeLock() {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
  }

  // Tự động khôi phục WakeLock khi quay lại tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isWakeLockRequested) {
      initWakeLock();
    }
  });

  return {
    start,
    stop,
    TEMPLATES,
    onTick: (cb) => onTickCallbacks.push(cb),
    setWakeLock,
    isWakeLockActive: () => wakeLockSentinel !== null
  };
})();

if (typeof module !== 'undefined') module.exports = SchedulerManager;
