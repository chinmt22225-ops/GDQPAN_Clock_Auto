/**
 * GDQPAN Audio System - Main Application Controller
 * Điều khiển giao diện kép (Desktop & Mobile), liên kết Audio, TTS, Lập lịch và Lưu trữ
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Khởi tạo các module
  if (typeof TTSEngine !== 'undefined') TTSEngine.init();
  if (typeof SchedulerManager !== 'undefined') SchedulerManager.start();

  // 2. Dữ liệu các nhóm lệnh chuẩn GDQPAN
  const groups = {
    chao: [
      { name: 'Quốc ca không lời', icon: '🇻🇳', sub: 'Hòa tấu trang nghiêm' },
      { name: 'Quốc ca có lời', icon: '🎤', sub: 'Tiến quân ca có lời' },
      { name: 'Duyệt đội ngũ', icon: '🪖', sub: 'Hành khúc duyệt binh' }
    ],
    alarm: [
      { name: 'Báo động', icon: '🚨', sub: 'Báo động phòng không/tác chiến' },
      { name: 'Tập hợp', icon: '👥', sub: 'Còi hiệu tập hợp đơn vị' },
      { name: 'Tập hợp khẩn cấp', icon: '⚠', sub: 'Báo động cơ động khẩn' }
    ],
    daily: [
      { name: 'Báo thức', icon: '⏰', time: '05:30' },
      { name: 'Chuẩn bị làm việc', icon: '🗂', time: '07:00' },
      { name: 'Làm việc', icon: '💼', time: '07:15' },
      { name: 'Nghỉ giải lao', icon: '☕', time: '09:00' },
      { name: 'Hết giờ giải lao', icon: '↩', time: '09:20' },
      { name: 'Hết giờ làm việc', icon: '🏁', time: '11:15' },
      { name: 'Ăn', icon: '🍽', time: '11:30' },
      { name: 'Điểm danh', icon: '✓', time: '21:00' },
      { name: 'Ngủ', icon: '🌙', time: '21:30' }
    ],
    music: [
      { name: 'Nhạc', icon: '▶' },
      { name: 'Nhạc cách mạng', icon: '★' },
      { name: 'Nhạc truyền thống Trung tâm', icon: '♬' },
      { name: 'Nhạc khác', icon: '☷' }
    ],
    genres: [
      'Nhạc trẻ',
      'Nhạc Bolero',
      'Nhạc trữ tình',
      'Nhạc truyền thống Trung tâm',
      'Nhạc khác'
    ]
  };

  // State
  let currentRegionVoice = 'nam_nu';
  let activeTab = 'home';

  // --- CẬP NHẬT ĐỒNG HỒ THỜI GIAN THỰC ---
  function updateClock(timeInfo) {
    const { now, hours, minutes, seconds, dayOfWeek } = timeInfo;
    const timeFormatted = `${hours}:${minutes}:${seconds}`;

    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[dayOfWeek];
    const dateFormatted = `${dayName}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const dateMobileFormatted = `${dayName}, ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

    // Desktop
    const deskClock = document.getElementById('clock-desktop');
    const deskDate = document.getElementById('date-desktop');
    if (deskClock) deskClock.textContent = timeFormatted;
    if (deskDate) deskDate.textContent = dateFormatted;

    // Mobile
    const mobTime = document.getElementById('clock-mobile');
    const mobDate = document.getElementById('date-mobile');
    const mobTopTime = document.getElementById('top-bar-time');
    if (mobTime) mobTime.textContent = timeFormatted;
    if (mobDate) mobDate.textContent = dateMobileFormatted;
    if (mobTopTime) mobTopTime.textContent = `${hours}:${minutes}`;
  }

  SchedulerManager.onTick(updateClock);

  // --- ĐIỀU KHIỂN ÂM LƯỢNG ĐỒNG BỘ ---
  function setupVolumeSync() {
    const deskSlider = document.getElementById('volume-desktop');
    const deskPct = document.getElementById('volpct-desktop');
    const mobSlider = document.getElementById('volume-mobile');
    const mobPct = document.getElementById('volpct-mobile');

    const savedSettings = StorageManager.getSettings();
    const initVol = savedSettings.volume !== undefined ? savedSettings.volume : 0.8;
    AudioEngine.setVolume(initVol);

    function updateSliders(val) {
      const pct = Math.round(val * 100) + '%';
      if (deskSlider) deskSlider.value = val;
      if (deskPct) deskPct.textContent = pct;
      if (mobSlider) mobSlider.value = val;
      if (mobPct) mobPct.textContent = pct;

      AudioEngine.setVolume(val);
      savedSettings.volume = val;
      StorageManager.saveSettings(savedSettings);
    }

    updateSliders(initVol);

    if (deskSlider) {
      deskSlider.addEventListener('input', (e) => updateSliders(parseFloat(e.target.value)));
    }
    if (mobSlider) {
      mobSlider.addEventListener('input', (e) => updateSliders(parseFloat(e.target.value)));
    }
  }
  setupVolumeSync();

  // --- SINH CÁC NÚT LỆNH TRÊN DESKTOP ---
  function renderDesktopButtons() {
    // 1. Chào cờ
    const chaoContainer = document.getElementById('chao-desktop');
    if (chaoContainer) {
      chaoContainer.innerHTML = '';
      groups.chao.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'military-btn';
        btn.innerHTML = `<span class="btn-icon">${item.icon}</span><span class="btn-text">${item.name}</span>`;
        btn.onclick = () => handleActionClick(item.name, btn);
        chaoContainer.appendChild(btn);
      });
    }

    // 2. Báo động
    const alarmContainer = document.getElementById('alarm-desktop');
    if (alarmContainer) {
      alarmContainer.innerHTML = '';
      groups.alarm.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'military-btn';
        btn.innerHTML = `<span class="btn-icon">${item.icon}</span><span class="btn-text">${item.name}</span>`;
        btn.onclick = () => handleActionClick(item.name, btn);
        alarmContainer.appendChild(btn);
      });
    }

    // 3. Sinh hoạt
    const dailyContainer = document.getElementById('daily-desktop');
    if (dailyContainer) {
      dailyContainer.innerHTML = '';
      groups.daily.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'military-btn';
        btn.innerHTML = `<span class="btn-icon">${item.icon}</span><span class="btn-text">${item.name}</span>`;
        btn.onclick = () => handleActionClick(item.name, btn);
        dailyContainer.appendChild(btn);
      });
    }

    // 4. Nhạc nhanh
    const musicFast = document.getElementById('music-fast-desktop');
    if (musicFast) {
      musicFast.innerHTML = '';
      groups.music.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'music-fast-btn';
        btn.innerHTML = `<span>${item.icon}</span><span>${item.name}</span>`;
        btn.onclick = () => {
          if (item.name === 'Nhạc') openModalSheet('music', 'Tất cả nhạc');
          else openModalSheet('music', item.name);
        };
        musicFast.appendChild(btn);
      });
    }

    // 5. Thể loại nhạc
    const genreList = document.getElementById('genre-list-desktop');
    if (genreList) {
      genreList.innerHTML = '';
      groups.genres.forEach(genre => {
        const div = document.createElement('div');
        div.className = 'genre-item';
        div.innerHTML = `<span>♬ ${genre}</span><span>›</span>`;
        div.onclick = () => openModalSheet('music', genre);
        genreList.appendChild(div);
      });
    }
  }
  renderDesktopButtons();

  // --- XỬ LÝ SỰ KIỆN KÍCH HOẠT HIỆU LỆNH (ACTION TRIGGER) ---
  async function handleActionClick(actionName, elementBtn = null) {
    // Highlight button
    document.querySelectorAll('.military-btn, .sheet-action-item').forEach(el => el.classList.remove('playing'));
    if (elementBtn) elementBtn.classList.add('playing');

    AudioEngine.stopAll();
    TTSEngine.stop();

    StorageManager.addLog(`Phát lệnh: ${actionName}`);

    try {
      // 1. Phát âm thanh hiệu lệnh
      await AudioEngine.triggerActionSound(actionName);

      // 2. Nếu có mẫu lời nhắc sinh hoạt, phát tiếp giọng đọc
      const template = SchedulerManager.TEMPLATES[actionName];
      if (template) {
        await new Promise(r => setTimeout(r, 600));
        const settings = StorageManager.getSettings();
        await TTSEngine.speak(template, {
          region: currentRegionVoice,
          rate: settings.rate || 1.0,
          volume: AudioEngine.getVolume()
        });
      }
    } catch (err) {
      console.error('Lỗi khi phát hiệu lệnh:', err);
    } finally {
      if (elementBtn) elementBtn.classList.remove('playing');
    }
  }

  // --- XỬ LÝ PHÁT KHẨN CẤP (EMERGENCY) ---
  window.triggerEmergency = async function () {
    AudioEngine.stopAll();
    TTSEngine.stop();

    StorageManager.addLog('🚨 PHÁT KHẨN CẤP ƯU TIÊN CAO');

    // Hú còi báo động khẩn cấp
    AudioEngine.playSiren(15);

    // Phát kèm thông báo khẩu lệnh khẩn
    const customText = (document.getElementById('tts-input-desktop')?.value || 
                        document.getElementById('quick-tts-mobile')?.value || '').trim();
    const alertMsg = customText || 'Thông báo khẩn cấp. Đề nghị toàn thể đơn vị khẩn trương cơ động thực hiện nhiệm vụ theo quy định.';

    setTimeout(async () => {
      await TTSEngine.speak(alertMsg, {
        region: currentRegionVoice,
        rate: 1.05,
        volume: 1.0
      });
    }, 4000);
  };

  // --- XỬ LÝ PHÁT THÔNG BÁO TÙY BIẾN (TTS WITH CHIME) ---
  window.handleSpeakText = async function (source = 'desktop') {
    let text = '';
    if (source === 'mobile') {
      text = document.getElementById('quick-tts-mobile')?.value || '';
    } else {
      text = document.getElementById('tts-input-desktop')?.value || '';
    }

    if (!text.trim()) {
      alert('Vui lòng nhập nội dung cần thông báo.');
      return;
    }

    const settings = StorageManager.getSettings();
    StorageManager.addLog('Phát thông báo văn bản', text.substring(0, 40) + '...');

    await TTSEngine.speakWithChime(text, {
      region: currentRegionVoice,
      rate: parseFloat(document.getElementById('rate-select-desktop')?.value || settings.rate || 1.0),
      volume: AudioEngine.getVolume(),
      chimeBeforeSpeech: settings.chimeBeforeSpeech !== false,
      repeatTimes: settings.repeatTimes || 1,
      apiKey: settings.apiKey,
      ttsProvider: settings.ttsProvider
    });
  };

  // --- DỪNG TOÀN BỘ PHÁT THANH ---
  window.handleStopAll = function () {
    AudioEngine.stopAll();
    TTSEngine.stop();
    document.querySelectorAll('.military-btn, .sheet-action-item').forEach(el => el.classList.remove('playing'));
    StorageManager.addLog('Dừng phát toàn bộ');
  };

  // --- LƯU / XÓA NỘI DUNG VĂN BẢN ---
  window.handleSaveText = function () {
    const text = document.getElementById('tts-input-desktop')?.value || '';
    StorageManager.saveText(text);
    alert('Đã lưu nội dung thông báo thành công.');
  };

  window.handleClearText = function () {
    const desk = document.getElementById('tts-input-desktop');
    const mob = document.getElementById('quick-tts-mobile');
    if (desk) desk.value = '';
    if (mob) mob.value = '';
    StorageManager.saveText('');
  };

  // Load saved text
  const savedTxt = StorageManager.getSavedText();
  if (savedTxt) {
    const desk = document.getElementById('tts-input-desktop');
    const mob = document.getElementById('quick-tts-mobile');
    if (desk) desk.value = savedTxt;
    if (mob) mob.value = savedTxt;
  }

  // --- BỘ CHỌN GIỌNG ĐỌC 3 MIỀN (DESKTOP & MOBILE SYNC) ---
  function setupVoiceSelection() {
    // 1. Mobile Segmented Controls
    const regionTabs = document.querySelectorAll('.segmented-tab');
    const genderBtns = document.querySelectorAll('.gender-btn');

    let currentRegion = 'nam';
    let currentGender = 'nu';

    function syncVoice() {
      currentRegionVoice = `${currentRegion}_${currentGender}`;

      // Sync radio buttons Desktop
      const radio = document.querySelector(`input[name="regionVoiceDesktop"][value="${currentRegionVoice}"]`);
      if (radio) radio.checked = true;

      // Sync dropdown Desktop
      const viVoices = TTSEngine.getVietnameseVoices();
      const voiceSelect = document.getElementById('voice-select-desktop');
      if (voiceSelect && viVoices.length) {
        const resolved = TTSEngine.resolveVoice(currentRegionVoice);
        if (resolved.voice) {
          voiceSelect.value = resolved.voice.name;
        }
      }
    }

    regionTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        regionTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentRegion = tab.getAttribute('data-region');
        syncVoice();
      });
    });

    genderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        genderBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGender = btn.getAttribute('data-gender');
        syncVoice();
      });
    });

    // 2. Desktop Radio Buttons
    const desktopRadios = document.querySelectorAll('input[name="regionVoiceDesktop"]');
    desktopRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          currentRegionVoice = radio.value;
          const [reg, gen] = radio.value.split('_');
          currentRegion = reg;
          currentGender = gen;

          // Update mobile tabs
          regionTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-region') === reg);
          });
          genderBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-gender') === gen);
          });
        }
      });
    });

    // 3. Desktop Voice Dropdown
    const voiceSelect = document.getElementById('voice-select-desktop');
    if (voiceSelect) {
      function populateVoiceDropdown() {
        const viVoices = TTSEngine.getVietnameseVoices();
        voiceSelect.innerHTML = '';
        if (viVoices.length) {
          viVoices.forEach(v => {
            voiceSelect.add(new Option(`${v.name} (${v.lang})`, v.name));
          });
        } else {
          voiceSelect.add(new Option('Giọng tiếng Việt mặc định của hệ thống', ''));
        }
      }
      populateVoiceDropdown();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = populateVoiceDropdown;
      }
    }
  }
  setupVoiceSelection();

  // Nghe thử giọng
  window.handleTestVoice = function (source = 'desktop') {
    const testInput = document.getElementById('test-voice-input');
    const text = (testInput?.value || 'Xin chào, đây là giọng đọc thử nghiệm của Hệ thống Thông báo Tự động GDQPAN.').trim();
    StorageManager.addLog('Nghe thử giọng đọc', currentRegionVoice);
    TTSEngine.speak(text, {
      region: currentRegionVoice,
      rate: 1.0,
      volume: AudioEngine.getVolume()
    });
  };

  // --- QUẢN LÝ LỊCH PHÁT TỰ ĐỘNG ---
  function renderScheduleTable() {
    const tbody = document.getElementById('schedule-tbody-desktop');
    const mBody = document.getElementById('schedule-list-mobile');
    const schedules = StorageManager.getSchedules();

    if (tbody) {
      tbody.innerHTML = '';
      if (!schedules.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Chưa có lịch phát nào.</td></tr>';
      }
      schedules.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align:center;font-weight:700;">${idx + 1}</td>
          <td style="font-weight:800;color:var(--primary);">${s.time}</td>
          <td><b>${s.action}</b>${s.text ? `<br><small style="color:#666;">"${s.text}"</small>` : ''}</td>
          <td style="text-align:center;">
            <label class="switch-toggle">
              <input type="checkbox" ${s.on !== false ? 'checked' : ''} onchange="toggleSchedule('${s.id}')">
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td style="text-align:center;">
            <button class="app-btn btn-red" style="padding:4px 8px;font-size:11px;" onclick="deleteSchedule('${s.id}')">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Mobile Modal View
    if (mBody) {
      mBody.innerHTML = '';
      schedules.forEach((s, idx) => {
        const div = document.createElement('div');
        div.className = 'sheet-action-item';
        div.innerHTML = `
          <div class="sheet-action-info">
            <span class="sheet-action-icon">🕒</span>
            <div>
              <div class="sheet-action-title">${s.time} - ${s.action}</div>
              <small style="color:#666;">${s.text || 'Lệnh mặc định'}</small>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <label class="switch-toggle">
              <input type="checkbox" ${s.on !== false ? 'checked' : ''} onchange="toggleSchedule('${s.id}')">
              <span class="toggle-slider"></span>
            </label>
            <button class="app-btn btn-red" style="padding:4px 8px;font-size:11px;" onclick="deleteSchedule('${s.id}')">✕</button>
          </div>
        `;
        mBody.appendChild(div);
      });
    }

    // Populate action select options
    const actionSelect = document.getElementById('sch-action-select');
    if (actionSelect && actionSelect.options.length <= 1) {
      actionSelect.innerHTML = '';
      const allActions = [
        ...groups.chao.map(x => x.name),
        ...groups.alarm.map(x => x.name),
        ...groups.daily.map(x => x.name),
        'Nhạc cách mạng',
        'Nhạc truyền thống Trung tâm',
        'Thông báo khác'
      ];
      allActions.forEach(act => actionSelect.add(new Option(act, act)));
    }
  }

  window.toggleSchedule = function (id) {
    const schedules = StorageManager.getSchedules();
    const target = schedules.find(s => s.id === id);
    if (target) {
      target.on = !target.on;
      StorageManager.saveSchedules(schedules);
      renderScheduleTable();
    }
  };

  window.deleteSchedule = function (id) {
    if (confirm('Bạn có chắc chắn muốn xóa lịch phát này?')) {
      let schedules = StorageManager.getSchedules();
      schedules = schedules.filter(s => s.id !== id);
      StorageManager.saveSchedules(schedules);
      renderScheduleTable();
      StorageManager.addLog('Xóa lịch phát tự động');
    }
  };

  window.handleAddSchedule = function () {
    const timeInput = document.getElementById('sch-time-input');
    const actionSelect = document.getElementById('sch-action-select');
    const textInput = document.getElementById('sch-text-input');

    const time = timeInput?.value;
    if (!time) {
      alert('Vui lòng chọn thời gian phát.');
      return;
    }

    const action = actionSelect?.value || 'Thông báo khác';
    const text = (textInput?.value || '').trim();

    const schedules = StorageManager.getSchedules();
    schedules.push({
      id: 'sch_' + Date.now(),
      time,
      days: [1, 2, 3, 4, 5, 6, 0], // Mặc định tất cả các ngày
      action,
      text,
      on: true
    });

    // Sắp xếp lịch theo thứ tự thời gian
    schedules.sort((a, b) => a.time.localeCompare(b.time));
    StorageManager.saveSchedules(schedules);
    renderScheduleTable();
    StorageManager.addLog(`Thêm lịch phát tự động: ${action}`, `Giờ: ${time}`);

    if (textInput) textInput.value = '';
    alert('Đã thêm lịch phát tự động thành công!');
  };

  renderScheduleTable();

  // --- MODAL & BOTTOM SHEET (MOBILE & DESKTOP) ---
  const modalOverlay = document.getElementById('modal-overlay');
  const modalSheet = document.getElementById('modal-sheet');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');

  function openModalSheet(type, category = '') {
    if (!modalSheet || !modalOverlay) return;

    modalTitle.innerHTML = '';
    modalContent.innerHTML = '';

    if (type === 'chao') {
      modalTitle.innerHTML = '<span>🇻🇳</span> Nghi lễ Chào cờ & Duyệt đội ngũ';
      groups.chao.forEach(item => {
        const div = document.createElement('div');
        div.className = 'sheet-action-item';
        div.innerHTML = `
          <div class="sheet-action-info">
            <span class="sheet-action-icon">${item.icon}</span>
            <div>
              <div class="sheet-action-title">${item.name}</div>
              <small style="color:#666;">${item.sub}</small>
            </div>
          </div>
          <button class="sheet-action-btn-play">▶ Phát</button>
        `;
        div.onclick = () => {
          handleActionClick(item.name, div);
          closeModal();
        };
        modalContent.appendChild(div);
      });
    } else if (type === 'alarm') {
      modalTitle.innerHTML = '<span>🚨</span> Hiệu lệnh Báo động & Tập hợp';
      groups.alarm.forEach(item => {
        const div = document.createElement('div');
        div.className = 'sheet-action-item';
        div.innerHTML = `
          <div class="sheet-action-info">
            <span class="sheet-action-icon">${item.icon}</span>
            <div>
              <div class="sheet-action-title">${item.name}</div>
              <small style="color:#666;">${item.sub}</small>
            </div>
          </div>
          <button class="sheet-action-btn-play" style="background:var(--accent-red);">▶ Kích hoạt</button>
        `;
        div.onclick = () => {
          handleActionClick(item.name, div);
          closeModal();
        };
        modalContent.appendChild(div);
      });
    } else if (type === 'daily') {
      modalTitle.innerHTML = '<span>♟</span> 9 Chế độ Sinh hoạt Nề nếp trong ngày';
      groups.daily.forEach(item => {
        const div = document.createElement('div');
        div.className = 'sheet-action-item';
        div.innerHTML = `
          <div class="sheet-action-info">
            <span class="sheet-action-icon">${item.icon}</span>
            <div>
              <div class="sheet-action-title">${item.name}</div>
              <small style="color:#666;">Giờ chuẩn: ${item.time}</small>
            </div>
          </div>
          <button class="sheet-action-btn-play">▶ Điểm giờ</button>
        `;
        div.onclick = () => {
          handleActionClick(item.name, div);
          closeModal();
        };
        modalContent.appendChild(div);
      });
    } else if (type === 'music') {
      renderMusicModal(category || 'Tất cả nhạc');
    } else if (type === 'schedule') {
      modalTitle.innerHTML = '<span>📅</span> Quản lý Lịch phát Tự động';
      modalContent.innerHTML = `
        <div style="margin-bottom:12px;">
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input type="time" id="m-sch-time" class="voice-test-input" style="width:100px;">
            <select id="m-sch-act" class="tts-select"></select>
          </div>
          <input type="text" id="m-sch-txt" class="voice-test-input" placeholder="Nội dung thông báo riêng (nếu có)" style="width:100%;margin-bottom:8px;">
          <button class="app-btn btn-primary" style="width:100%;justify-content:center;" onclick="addScheduleMobile()">+ Thêm Lịch Mới</button>
        </div>
        <div id="schedule-list-mobile"></div>
      `;
      // Populate select
      const sel = document.getElementById('m-sch-act');
      if (sel) {
        const allActs = [...groups.chao.map(x=>x.name), ...groups.alarm.map(x=>x.name), ...groups.daily.map(x=>x.name), 'Thông báo khác'];
        allActs.forEach(a => sel.add(new Option(a, a)));
      }
      renderScheduleTable();
    } else if (type === 'history') {
      renderHistoryModal();
    } else if (type === 'settings') {
      renderSettingsModal();
    } else if (type === 'about') {
      renderAboutModal();
    }

    modalOverlay.classList.add('active');
    modalSheet.classList.add('active');
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    if (modalSheet) modalSheet.classList.remove('active');
  }

  window.openModalSheet = openModalSheet;
  window.closeModal = closeModal;
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

  // --- MODAL: QUẢN LÝ NHẠC (PLAYLIST) ---
  async function renderMusicModal(category) {
    modalTitle.innerHTML = `<span>♫</span> Quản lý Nhạc - ${category}`;
    modalContent.innerHTML = `
      <div style="margin-bottom:14px;background:#eef4f1;padding:12px;border-radius:12px;">
        <b style="font-size:12.5px;color:var(--primary-dark);">Thêm bài hát mới vào danh mục:</b>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <input type="file" id="song-file-input" accept="audio/*" multiple style="font-size:12px;flex:1;">
          <button class="app-btn btn-blue" onclick="handleUploadSongs('${category}')">+ Thêm</button>
        </div>
        <small style="color:#666;font-size:11px;display:block;margin-top:6px;">Tệp được lưu trữ vĩnh viễn trong bộ nhớ máy (IndexedDB).</small>
      </div>
      <div id="modal-song-list"></div>
    `;

    await loadSongList(category);
  }

  async function loadSongList(category) {
    const listContainer = document.getElementById('modal-song-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p style="text-align:center;color:#888;">Đang tải danh sách bài hát...</p>';
    const allSongs = await StorageManager.getAllSongs();
    const filtered = category === 'Tất cả nhạc' ? allSongs : allSongs.filter(s => s.category === category);

    listContainer.innerHTML = '';
    if (!filtered.length) {
      listContainer.innerHTML = `
        <div style="text-align:center;padding:24px 10px;color:#888;">
          <div style="font-size:32px;margin-bottom:6px;">🎵</div>
          <p>Chưa có bài hát nào trong danh mục <b>${category}</b>.</p>
          <p style="font-size:12px;margin-top:4px;">Hãy chọn tệp MP3/WAV từ thiết bị của bạn và bấm "+ Thêm".</p>
        </div>
      `;
      return;
    }

    filtered.forEach(song => {
      const div = document.createElement('div');
      div.className = 'sheet-action-item';
      div.innerHTML = `
        <div class="sheet-action-info">
          <span class="sheet-action-icon">🎶</span>
          <div>
            <div class="sheet-action-title">${song.name}</div>
            <small style="color:#666;">Chủ đề: ${song.category} • ${(song.size / (1024*1024)).toFixed(1)} MB</small>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="sheet-action-btn-play">▶ Phát</button>
          <button class="app-btn btn-red" style="padding:4px 8px;font-size:11px;">Xóa</button>
        </div>
      `;
      div.querySelector('.sheet-action-btn-play').onclick = () => {
        AudioEngine.playAudioBlob(song.blob, song.name);
        StorageManager.addLog(`Phát bài hát: ${song.name}`);
        closeModal();
      };
      div.querySelector('.btn-red').onclick = async () => {
        if (confirm(`Xóa bài hát "${song.name}"?`)) {
          await StorageManager.deleteSong(song.id);
          StorageManager.addLog(`Xóa bài hát: ${song.name}`);
          loadSongList(category);
        }
      };
      listContainer.appendChild(div);
    });
  }

  window.handleUploadSongs = async function (category) {
    const input = document.getElementById('song-file-input');
    if (!input || !input.files.length) {
      alert('Vui lòng chọn ít nhất 1 tệp âm thanh.');
      return;
    }

    const files = Array.from(input.files);
    for (const f of files) {
      await StorageManager.saveSong({
        name: f.name.replace(/\.[^/.]+$/, ''),
        category: category === 'Tất cả nhạc' ? 'Nhạc khác' : category
      }, f);
    }

    StorageManager.addLog(`Tải lên ${files.length} bài hát vào danh mục ${category}`);
    input.value = '';
    loadSongList(category);
  };

  // --- MODAL: LỊCH SỬ HOẠT ĐỘNG ---
  function renderHistoryModal() {
    modalTitle.innerHTML = '<span>▤</span> Nhật ký Hoạt động Hệ thống';
    const logs = StorageManager.getLogs();

    let logsHtml = '';
    if (!logs.length) {
      logsHtml = '<p style="text-align:center;padding:20px;color:#888;">Chưa có hoạt động nào được ghi lại trong phiên này.</p>';
    } else {
      logsHtml = logs.map(l => `
        <div style="padding:10px;border-bottom:1px solid #e1ebe6;font-size:12.5px;">
          <div style="display:flex;justify-content:space-between;color:#71847e;font-size:11px;">
            <span>${l.time}</span>
          </div>
          <div style="font-weight:700;color:var(--primary-dark);margin-top:2px;">${l.action}</div>
          ${l.details ? `<div style="color:#555;font-size:11.5px;margin-top:2px;">${l.details}</div>` : ''}
        </div>
      `).join('');
    }

    modalContent.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <button class="app-btn btn-dark" style="font-size:11px;padding:5px 10px;" onclick="handleClearLogs()">🗑 Xóa lịch sử</button>
      </div>
      <div style="max-height:60vh;overflow-y:auto;">${logsHtml}</div>
    `;
  }

  window.handleClearLogs = function () {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký?')) {
      StorageManager.clearLogs();
      renderHistoryModal();
    }
  };

  // --- MODAL: CÀI ĐẶT HỆ THỐNG & TÙY BIẾN ÂM THANH ---
  async function renderSettingsModal() {
    modalTitle.innerHTML = '<span>⚙</span> Cài đặt Hệ thống & Tùy biến Âm thanh';
    const settings = StorageManager.getSettings();
    const customActions = await StorageManager.getAllCustomAudioActions();

    const allActions = [
      'Quốc ca không lời', 'Quốc ca có lời', 'Duyệt đội ngũ',
      'Báo động', 'Tập hợp', 'Tập hợp khẩn cấp',
      'Báo thức', 'Chuẩn bị làm việc', 'Làm việc',
      'Nghỉ giải lao', 'Hết giờ giải lao', 'Hết giờ làm việc',
      'Ăn', 'Điểm danh', 'Ngủ'
    ];

    let customAudioHtml = allActions.map(act => {
      const isCustom = customActions.includes(act);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f9fbfb;border:1px solid #e1ebe6;border-radius:8px;margin-bottom:6px;font-size:12px;">
          <div>
            <b>${act}</b>
            <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;background:${isCustom ? '#d2f4df;color:#0b5945;' : '#e8efe9;color:#666;'}">
              ${isCustom ? '✓ Đã gán tệp riêng' : 'Mặc định'}
            </span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="file" id="file-opt-${encodeURIComponent(act)}" accept="audio/*" style="display:none;" onchange="handleCustomAudioUpload('${act}', this)">
            <button class="app-btn btn-dark" style="padding:4px 8px;font-size:11px;" onclick="document.getElementById('file-opt-${encodeURIComponent(act)}').click()">Đổi tệp</button>
            ${isCustom ? `<button class="app-btn btn-red" style="padding:4px 8px;font-size:11px;" onclick="handleResetDefaultAudio('${act}')">Khôi phục</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    modalContent.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="background:#eef4f1;padding:12px;border-radius:10px;">
          <h4 style="font-size:13px;color:var(--primary-dark);margin-bottom:8px;">🔊 Tùy biến Âm thanh Hiệu lệnh của Đơn vị</h4>
          <p style="font-size:11.5px;color:#555;margin-bottom:10px;">Nếu Trung tâm có tệp âm thanh riêng (MP3/WAV), bạn có thể tải lên thay thế cho âm thanh mặc định:</p>
          <div style="max-height:180px;overflow-y:auto;padding-right:4px;">${customAudioHtml}</div>
        </div>

        <div style="background:#eef4f1;padding:12px;border-radius:10px;">
          <h4 style="font-size:13px;color:var(--primary-dark);margin-bottom:8px;">🎙 Cấu hình Giọng đọc & Quy trình Thông báo</h4>
          <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:8px;cursor:pointer;">
            <input type="checkbox" id="set-chime" ${settings.chimeBeforeSpeech !== false ? 'checked' : ''}>
            <span>Đổ chuông hiệu quân sự "Tùng tùng tùng" trước khi đọc thông báo</span>
          </label>
          <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;margin-bottom:8px;">
            <span>Số lần lặp lại nội dung:</span>
            <select id="set-repeat" class="tts-select" style="max-width:120px;">
              <option value="1" ${settings.repeatTimes === 1 ? 'selected' : ''}>1 lần</option>
              <option value="2" ${settings.repeatTimes === 2 ? 'selected' : ''}>2 lần (Chuẩn quân đội)</option>
            </select>
          </div>
          <div style="margin-top:10px;border-top:1px dashed #cbd5d1;padding-top:10px;">
            <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:4px;">Kết nối Giọng đọc AI Online (Tùy chọn):</label>
            <div style="display:flex;gap:8px;">
              <select id="set-tts-provider" class="tts-select" style="max-width:130px;">
                <option value="offline" ${settings.ttsProvider === 'offline' ? 'selected' : ''}>Offline Máy</option>
                <option value="ai_fpt" ${settings.ttsProvider === 'ai_fpt' ? 'selected' : ''}>FPT.AI</option>
              </select>
              <input type="text" id="set-api-key" class="voice-test-input" placeholder="Nhập API Key nếu dùng AI" value="${settings.apiKey || ''}">
            </div>
          </div>
        </div>

        <div style="background:#eef4f1;padding:12px;border-radius:10px;">
          <h4 style="font-size:13px;color:var(--primary-dark);margin-bottom:8px;">📱 Chống Tắt Màn hình (Trạm Phát Tự Động)</h4>
          <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;">
            <input type="checkbox" id="set-wakelock" ${settings.wakeLockEnabled !== false ? 'checked' : ''}>
            <span>Giữ màn hình điện thoại luôn sáng khi mở trang web để không bị trễ lịch</span>
          </label>
        </div>

        <button class="app-btn btn-primary" style="justify-content:center;padding:10px;" onclick="saveSystemSettings()">💾 Lưu Cài Đặt</button>
      </div>
    `;
  }

  window.handleCustomAudioUpload = async function (actionName, input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      await StorageManager.saveCustomAudio(actionName, file);
      StorageManager.addLog(`Đổi tệp âm thanh cho lệnh: ${actionName}`, file.name);
      alert(`Đã gán tệp âm thanh "${file.name}" cho lệnh "${actionName}".`);
      renderSettingsModal();
    }
  };

  window.handleResetDefaultAudio = async function (actionName) {
    if (confirm(`Khôi phục âm thanh mặc định cho lệnh "${actionName}"?`)) {
      await StorageManager.deleteCustomAudio(actionName);
      StorageManager.addLog(`Khôi phục âm thanh gốc cho lệnh: ${actionName}`);
      renderSettingsModal();
    }
  };

  window.saveSystemSettings = function () {
    const settings = StorageManager.getSettings();
    settings.chimeBeforeSpeech = document.getElementById('set-chime')?.checked !== false;
    settings.repeatTimes = parseInt(document.getElementById('set-repeat')?.value || '1', 10);
    settings.ttsProvider = document.getElementById('set-tts-provider')?.value || 'offline';
    settings.apiKey = (document.getElementById('set-api-key')?.value || '').trim();
    settings.wakeLockEnabled = document.getElementById('set-wakelock')?.checked !== false;

    StorageManager.saveSettings(settings);
    SchedulerManager.setWakeLock(settings.wakeLockEnabled);
    StorageManager.addLog('Cập nhật cài đặt hệ thống');
    alert('Đã lưu cấu hình cài đặt hệ thống.');
    closeModal();
  };

  // --- MODAL: GIỚI THIỆU ---
  function renderAboutModal() {
    modalTitle.innerHTML = '<span>ℹ</span> Giới thiệu Hệ thống Thông báo GDQPAN';
    modalContent.innerHTML = `
      <div style="text-align:center;padding:10px 0;">
        <img src="assets/logo_gdqpan.png" style="width:90px;height:90px;object-fit:contain;margin-bottom:8px;" alt="Logo GDQPAN">
        <h3 style="font-size:16px;font-weight:900;color:var(--primary-dark);">HỆ THỐNG THÔNG BÁO TỰ ĐỘNG - GDQPAN</h3>
        <p style="font-size:12.5px;color:var(--accent-red);font-weight:800;margin-top:2px;">TRUNG TÂM GIÁO DỤC QUỐC PHÒNG VÀ AN NINH<br>ĐẠI HỌC QUỐC GIA THÀNH PHỐ HỒ CHÍ MINH</p>
        <p style="font-size:11.5px;font-style:italic;color:#666;margin-top:6px;">"Đoàn kết - Kỷ cương - Chất lượng - Tiên phong"</p>
      </div>
      <div style="background:#f4f8f6;padding:12px;border-radius:10px;font-size:12.5px;line-height:1.5;color:#333;margin-top:10px;">
        <p><b>Phiên bản:</b> 2.0 (Mobile & Desktop Dual-Engine)</p>
        <p><b>Tính năng chính:</b></p>
        <ul style="margin-left:18px;margin-top:4px;">
          <li>Phát nhạc hiệu Chào cờ, Duyệt đội ngũ, Báo động phòng không.</li>
          <li>Tự động điểm chuông 9 chế độ sinh hoạt nề nếp trong ngày.</li>
          <li>Đọc thông báo bằng giọng phát thanh viên 3 miền (Bắc - Trung - Nam).</li>
          <li>Lập lịch phát thanh tự động theo thứ trong tuần, chống tắt màn hình.</li>
          <li>Lưu trữ vĩnh viễn tệp âm thanh và bài hát trên thiết bị.</li>
        </ul>
      </div>
    `;
  }

  // --- MOBILE BOTTOM NAVIGATION HANDLER ---
  const navItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const target = item.getAttribute('data-tab');
      activeTab = target;

      if (target === 'home') {
        closeModal();
      } else if (target === 'history') {
        openModalSheet('history');
      } else if (target === 'settings') {
        openModalSheet('settings');
      } else if (target === 'about') {
        openModalSheet('about');
      }
    });
  });

  // Mobile add schedule button
  window.addScheduleMobile = function () {
    const time = document.getElementById('m-sch-time')?.value;
    const action = document.getElementById('m-sch-act')?.value || 'Thông báo khác';
    const text = (document.getElementById('m-sch-txt')?.value || '').trim();

    if (!time) {
      alert('Vui lòng chọn thời gian.');
      return;
    }

    const schedules = StorageManager.getSchedules();
    schedules.push({
      id: 'sch_' + Date.now(),
      time,
      days: [1,2,3,4,5,6,0],
      action,
      text,
      on: true
    });
    schedules.sort((a, b) => a.time.localeCompare(b.time));
    StorageManager.saveSchedules(schedules);
    renderScheduleTable();
    alert('Đã thêm lịch phát thành công!');
  };

  // Text Counter Mobile
  const quickInput = document.getElementById('quick-tts-mobile');
  const quickCounter = document.getElementById('quick-char-counter');
  if (quickInput && quickCounter) {
    quickInput.addEventListener('input', () => {
      const len = quickInput.value.length;
      quickCounter.textContent = `${len}/500`;
    });
  }

  // Click on background or resume audio on first user touch
  document.body.addEventListener('click', () => {
    AudioEngine.initContext();
  }, { once: true });
});
