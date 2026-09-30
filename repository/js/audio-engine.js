/**
 * GDQPAN Audio System - Audio Engine & Synthesizer
 * Tích hợp Web Audio API Synthesizer (Còi báo động, còi tập hợp, chuông nề nếp)
 * và Trình phát Audio linh hoạt kết hợp IndexedDB
 */

const AudioEngine = (function () {
  let audioCtx = null;
  let masterGain = null;
  let currentPlaying = null; // { type: 'synth'|'html5', stop: fn }
  let html5Audio = null;
  let isMuted = false;
  let volume = 0.8;

  function initContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!html5Audio) {
      html5Audio = new Audio();
      html5Audio.volume = volume;
    }
  }

  function setVolume(vol) {
    volume = Math.max(0, Math.min(1, vol));
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
    if (html5Audio) {
      html5Audio.volume = volume;
    }
  }

  function getVolume() {
    return volume;
  }

  function stopAll() {
    if (currentPlaying) {
      try {
        if (typeof currentPlaying.stop === 'function') {
          currentPlaying.stop();
        }
      } catch (e) {
        console.error('Error stopping sound:', e);
      }
      currentPlaying = null;
    }
    if (html5Audio) {
      html5Audio.pause();
      html5Audio.currentTime = 0;
      if (html5Audio.src && html5Audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(html5Audio.src);
      }
      html5Audio.src = '';
    }
  }

  // ========================================================
  // BỘ TỔNG HỢP ÂM THANH ĐIỆN TỬ (WEB AUDIO SYNTHESIZERS)
  // ========================================================

  /**
   * Còi báo động phòng không / Tác chiến quân sự (Air-raid / Military Siren)
   * Tần số quét hình sin/tam giác 400Hz - 850Hz lặp lại dồn dập
   */
  function playSiren(durationSeconds = 12) {
    initContext();
    stopAll();

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    // Chu kỳ quét tần số (mỗi chu kỳ 3.2 giây: 1.6s tăng, 1.6s giảm)
    const cycle = 3.2;
    const cycles = Math.ceil(durationSeconds / cycle);

    for (let i = 0; i < cycles; i++) {
      const tStart = now + i * cycle;
      const tMid = tStart + cycle / 2;
      const tEnd = tStart + cycle;

      osc1.frequency.setValueAtTime(420, tStart);
      osc1.frequency.exponentialRampToValueAtTime(840, tMid);
      osc1.frequency.exponentialRampToValueAtTime(420, tEnd);

      osc2.frequency.setValueAtTime(424, tStart);
      osc2.frequency.exponentialRampToValueAtTime(848, tMid);
      osc2.frequency.exponentialRampToValueAtTime(424, tEnd);
    }

    // Envelope âm lượng
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.9, now + 1.0);
    gainNode.gain.setValueAtTime(0.9, now + durationSeconds - 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSeconds);
    osc2.stop(now + durationSeconds);

    const stopFn = () => {
      try {
        const stopNow = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(stopNow);
        gainNode.gain.setValueAtTime(gainNode.gain.value, stopNow);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopNow + 0.3);
        setTimeout(() => {
          try { osc1.stop(); osc2.stop(); } catch(e){}
        }, 320);
      } catch (e) {}
    };

    currentPlaying = { type: 'synth', stop: stopFn };
    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentPlaying && currentPlaying.stop === stopFn) {
          currentPlaying = null;
        }
        resolve();
      }, durationSeconds * 1000);
    });
  }

  /**
   * Còi hiệu chỉ huy tập hợp quân sự (Military Bugle / Horn Fanfare)
   * Giai điệu kèn đồng hiệu lệnh tập hợp dứt khoát
   */
  function playBugleCall(type = 'assembly') {
    initContext();
    stopAll();

    const now = audioCtx.currentTime;
    // Nốt kèn đồng quân sự: C4 (261.6), G4 (392.0), C5 (523.25), E5 (659.25), G5 (784.0)
    let notes = [];
    if (type === 'assembly') {
      // Giai điệu tập hợp quân số
      notes = [
        { f: 392.0, d: 0.25 },
        { f: 523.25, d: 0.25 },
        { f: 659.25, d: 0.25 },
        { f: 523.25, d: 0.25 },
        { f: 659.25, d: 0.5 },
        { f: 523.25, d: 0.25 },
        { f: 659.25, d: 0.25 },
        { f: 784.0, d: 0.75 },
        { f: 659.25, d: 0.25 },
        { f: 523.25, d: 0.25 },
        { f: 659.25, d: 0.25 },
        { f: 523.25, d: 0.25 },
        { f: 392.0, d: 0.9 }
      ];
    } else {
      // Hiệu lệnh báo động khẩn dồn dập
      notes = [
        { f: 523.25, d: 0.18 },
        { f: 659.25, d: 0.18 },
        { f: 784.0, d: 0.35 },
        { f: 523.25, d: 0.18 },
        { f: 659.25, d: 0.18 },
        { f: 784.0, d: 0.35 },
        { f: 784.0, d: 0.2 },
        { f: 784.0, d: 0.2 },
        { f: 784.0, d: 0.7 }
      ];
    }

    let noteTime = now + 0.05;
    const oscs = [];

    notes.forEach((note) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, noteTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(note.f * 1.5, noteTime);
      filter.Q.setValueAtTime(2.0, noteTime);

      // Envelope nốt kèn
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.85, noteTime + 0.04);
      gain.gain.setValueAtTime(0.75, noteTime + note.d * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + note.d + 0.05);
      oscs.push(osc);

      noteTime += note.d + 0.04;
    });

    const totalDuration = noteTime - now;
    const stopFn = () => {
      oscs.forEach((o) => { try { o.stop(); } catch(e){} });
    };
    currentPlaying = { type: 'synth', stop: stopFn };

    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentPlaying && currentPlaying.stop === stopFn) {
          currentPlaying = null;
        }
        resolve();
      }, totalDuration * 1000);
    });
  }

  /**
   * Tiếng chuông hiệu thông báo quân sự (Military Chime: "Tùng tùng tùng" / Hồi chuông 3 tiếng)
   * Dùng làm nhạc hiệu dẫn nhập trước khi phát thanh giọng nói
   */
  function playAnnouncementChime() {
    initContext();
    stopAll();

    const now = audioCtx.currentTime;
    // Hợp âm chuông hiệu trang nghiêm: F4 (349.23), A4 (440.0), C5 (523.25)
    const bellNotes = [
      { f: 349.23, t: now },
      { f: 440.0, t: now + 0.55 },
      { f: 523.25, t: now + 1.1 }
    ];

    const oscs = [];

    bellNotes.forEach(({ f, t }) => {
      [1, 2, 2.76, 5.4].forEach((harmonic, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * harmonic, t);

        const initialGain = [0.7, 0.35, 0.2, 0.08][idx] || 0.1;
        const decayTime = [2.2, 1.6, 1.2, 0.8][idx] || 1.0;

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(initialGain, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + decayTime + 0.1);
        oscs.push(osc);
      });
    });

    const totalDuration = 2.8;
    const stopFn = () => {
      oscs.forEach((o) => { try { o.stop(); } catch(e){} });
    };
    currentPlaying = { type: 'synth', stop: stopFn };

    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentPlaying && currentPlaying.stop === stopFn) {
          currentPlaying = null;
        }
        resolve();
      }, totalDuration * 1000);
    });
  }

  /**
   * Tiếng chuông báo thức / Điểm giờ nề nếp (Routine Bell Resonance)
   */
  function playRoutineBell() {
    initContext();
    stopAll();

    const now = audioCtx.currentTime;
    const oscs = [];
    const chimes = [0, 0.6, 1.2, 1.8];

    chimes.forEach((offset) => {
      const t = now + offset;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(584.0, t + 1.2);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.8, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 1.5);
      oscs.push(osc);
    });

    const totalDuration = 3.2;
    const stopFn = () => {
      oscs.forEach((o) => { try { o.stop(); } catch(e){} });
    };
    currentPlaying = { type: 'synth', stop: stopFn };

    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentPlaying && currentPlaying.stop === stopFn) {
          currentPlaying = null;
        }
        resolve();
      }, totalDuration * 1000);
    });
  }

  // ========================================================
  // TRÌNH PHÁT FILE ÂM THANH (HTML5 AUDIO + INDEXEDDB)
  // ========================================================

  async function playAudioBlob(blob, name = '') {
    initContext();
    stopAll();

    const blobUrl = URL.createObjectURL(blob);
    html5Audio.src = blobUrl;
    html5Audio.volume = volume;

    return new Promise((resolve, reject) => {
      html5Audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        currentPlaying = null;
        resolve();
      };
      html5Audio.onerror = (e) => {
        URL.revokeObjectURL(blobUrl);
        currentPlaying = null;
        reject(e);
      };
      html5Audio.play().then(() => {
        currentPlaying = {
          type: 'html5',
          stop: () => {
            html5Audio.pause();
            html5Audio.currentTime = 0;
            URL.revokeObjectURL(blobUrl);
          }
        };
      }).catch((err) => {
        URL.revokeObjectURL(blobUrl);
        reject(err);
      });
    });
  }

  /**
   * Kích hoạt hiệu lệnh âm thanh theo tên
   * Tự động ưu tiên tệp người dùng tải lên (IndexedDB)
   * Nếu chưa có tệp tải lên, tự động chạy bộ tổng hợp âm thanh tương ứng
   */
  async function triggerActionSound(actionName) {
    initContext();

    // 1. Kiểm tra xem người dùng có gán tệp riêng trong IndexedDB không
    if (typeof StorageManager !== 'undefined') {
      try {
        const customRecord = await StorageManager.getCustomAudio(actionName);
        if (customRecord && customRecord.blob) {
          await playAudioBlob(customRecord.blob, actionName);
          return { source: 'custom_file', name: actionName };
        }
      } catch (e) {
        console.warn('Lỗi đọc IndexedDB:', e);
      }
    }

    // 2. Nếu không có file riêng, phát âm thanh tổng hợp tương ứng
    if (actionName === 'Báo động' || actionName === 'Tập hợp khẩn cấp') {
      await playSiren(10);
      return { source: 'synthesizer', type: 'siren' };
    } else if (actionName === 'Tập hợp') {
      await playBugleCall('assembly');
      return { source: 'synthesizer', type: 'bugle' };
    } else if (actionName === 'Báo thức') {
      await playRoutineBell();
      return { source: 'synthesizer', type: 'bell' };
    } else if (['Chuẩn bị làm việc', 'Làm việc', 'Nghỉ giải lao', 'Hết giờ giải lao', 'Hết giờ làm việc', 'Ăn', 'Điểm danh', 'Ngủ'].includes(actionName)) {
      await playAnnouncementChime();
      return { source: 'synthesizer', type: 'chime' };
    } else if (['Quốc ca không lời', 'Quốc ca có lời', 'Duyệt đội ngũ'].includes(actionName)) {
      // Fanfare nghi lễ nếu chưa gán file MP3
      await playBugleCall('ceremonial');
      return { source: 'synthesizer', type: 'fanfare' };
    } else {
      await playAnnouncementChime();
      return { source: 'synthesizer', type: 'chime' };
    }
  }

  return {
    initContext,
    setVolume,
    getVolume,
    stopAll,
    playSiren,
    playBugleCall,
    playAnnouncementChime,
    playRoutineBell,
    playAudioBlob,
    triggerActionSound,
    isPlaying: () => currentPlaying !== null
  };
})();

if (typeof module !== 'undefined') module.exports = AudioEngine;
