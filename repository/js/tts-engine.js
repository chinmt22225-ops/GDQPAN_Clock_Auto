/**
 * GDQPAN Audio System - Text-To-Speech (TTS) Engine
 * Quản lý giọng đọc thông minh 3 miền Bắc - Trung - Nam (Nam/Nữ)
 * Hỗ trợ Web Speech API offline và mở rộng tích hợp Online AI TTS
 */

const TTSEngine = (function () {
  let availableVoices = [];
  let currentUtterance = null;
  let isSpeaking = false;

  function init() {
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) return [];
    availableVoices = window.speechSynthesis.getVoices();
    return availableVoices;
  }

  function getVietnameseVoices() {
    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    return voices.filter(v => v.lang && (v.lang.toLowerCase().startsWith('vi') || v.lang.toLowerCase().includes('viet')));
  }

  /**
   * Ánh xạ thông minh lựa chọn 3 miền (Bắc/Trung/Nam x Nam/Nữ)
   * @param {string} regionVoiceKey - 'bac_nam', 'bac_nu', 'trung_nam', 'trung_nu', 'nam_nam', 'nam_nu'
   */
  function resolveVoice(regionVoiceKey) {
    const viVoices = getVietnameseVoices();
    let selectedVoice = null;
    let pitchMod = 1.0;
    let rateMod = 1.0;

    const isMale = regionVoiceKey.endsWith('_nam');
    const isFemale = regionVoiceKey.endsWith('_nu');
    const region = regionVoiceKey.split('_')[0]; // 'bac', 'trung', 'nam'

    if (viVoices.length > 0) {
      // 1. Tìm giọng trùng khớp tên theo miền và giới tính
      for (const v of viVoices) {
        const nameLower = v.name.toLowerCase();
        if (region === 'bac') {
          if (isMale && (nameLower.includes('an') || nameLower.includes('nam') || nameLower.includes('male') || nameLower.includes('hanoi'))) {
            selectedVoice = v; break;
          }
          if (isFemale && (nameLower.includes('hoaimy') || nameLower.includes('female') || nameLower.includes('mai') || nameLower.includes('linh'))) {
            selectedVoice = v; break;
          }
        } else if (region === 'nam') {
          if (isMale && (nameLower.includes('namminh') || nameLower.includes('minh') || nameLower.includes('saigon'))) {
            selectedVoice = v; break;
          }
          if (isFemale && (nameLower.includes('lan') || nameLower.includes('myan') || nameLower.includes('huong'))) {
            selectedVoice = v; break;
          }
        } else if (region === 'trung') {
          if (nameLower.includes('hue') || nameLower.includes('danang') || nameLower.includes('central')) {
            selectedVoice = v; break;
          }
        }
      }

      // 2. Nếu chưa tìm được, chọn theo giới tính
      if (!selectedVoice) {
        for (const v of viVoices) {
          const nameLower = v.name.toLowerCase();
          if (isMale && (nameLower.includes('male') || nameLower.includes('an') || nameLower.includes('minh'))) {
            selectedVoice = v; break;
          }
          if (isFemale && (nameLower.includes('female') || nameLower.includes('my') || nameLower.includes('linh'))) {
            selectedVoice = v; break;
          }
        }
      }

      // 3. Nếu vẫn chưa có, lấy giọng tiếng Việt đầu tiên
      if (!selectedVoice) {
        selectedVoice = viVoices[0];
      }
    }

    // Tinh chỉnh âm sắc (Pitch) theo giới tính và vùng miền để tạo sự tự nhiên
    if (isMale) {
      pitchMod = 0.88; // Giọng nam trầm, dứt khoát
    } else if (isFemale) {
      pitchMod = 1.12; // Giọng nữ cao, trong trẻo
    }

    if (region === 'bac') {
      rateMod = 1.0;
    } else if (region === 'trung') {
      rateMod = 0.95; // Giọng miền Trung đọc chậm rãi, rõ tiếng
    } else if (region === 'nam') {
      rateMod = 1.02; // Giọng miền Nam nhịp điệu ấm áp
    }

    return { voice: selectedVoice, pitchMod, rateMod };
  }

  function stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    currentUtterance = null;
  }

  /**
   * Phát giọng đọc văn bản thuần (Offline Web Speech API)
   */
  function speakOffline(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        return reject(new Error('Trình duyệt không hỗ trợ Web Speech API.'));
      }

      stop();
      if (!text || !text.trim()) {
        return resolve();
      }

      const regionKey = options.region || 'nam_nu';
      const { voice, pitchMod, rateMod } = resolveVoice(regionKey);

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = 'vi-VN';
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = (options.rate || 1.0) * rateMod;
      utterance.pitch = pitchMod;
      utterance.volume = options.volume !== undefined ? options.volume : 0.85;

      utterance.onstart = () => {
        isSpeaking = true;
      };

      utterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        isSpeaking = false;
        currentUtterance = null;
        resolve(); // resolve to prevent hanging sequence
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Phát âm thông báo với Online AI TTS (nếu có API Key cấu hình)
   */
  async function speakOnlineAI(text, options = {}) {
    const apiKey = options.apiKey;
    const provider = options.ttsProvider || 'ai_fpt';
    const regionKey = options.region || 'nam_nu';

    if (!apiKey) {
      // Tự động chuyển về offline
      return speakOffline(text, options);
    }

    try {
      let voiceCode = 'banmai'; // FPT default
      if (regionKey === 'bac_nam') voiceCode = 'leminh';
      else if (regionKey === 'bac_nu') voiceCode = 'banmai';
      else if (regionKey === 'trung_nam') voiceCode = 'giahuy';
      else if (regionKey === 'trung_nu') voiceCode = 'ngoclam';
      else if (regionKey === 'nam_nam') voiceCode = 'minhquang';
      else if (regionKey === 'nam_nu') voiceCode = 'linhsan';

      if (provider === 'ai_fpt') {
        const response = await fetch('https://api.fpt.ai/hmi/tts/v5', {
          method: 'POST',
          headers: {
            'api_key': apiKey,
            'voice': voiceCode,
            'Speed': String(options.rate || 0)
          },
          body: text
        });
        const data = await response.json();
        if (data.async) {
          // Poll for audio URL or play direct
          const audioResp = await fetch(data.async);
          const blob = await audioResp.blob();
          if (typeof AudioEngine !== 'undefined') {
            await AudioEngine.playAudioBlob(blob, 'AI_Speech');
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi gọi Online AI TTS, tự động chuyển về Offline:', err);
    }

    // Fallback nếu có lỗi
    return speakOffline(text, options);
  }

  /**
   * Phát thanh toàn diện: Kết hợp [Chuông hiệu] ➔ [Nghỉ] ➔ [Giọng đọc thông báo 1-2 lần]
   */
  async function speakWithChime(text, options = {}) {
    if (!text || !text.trim()) return;

    stop();
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.stopAll();
    }

    const chimeEnabled = options.chimeBeforeSpeech !== false;
    const repeatTimes = Math.max(1, options.repeatTimes || 1);

    // 1. Phát chuông hiệu dẫn nhập nếu bật
    if (chimeEnabled && typeof AudioEngine !== 'undefined') {
      await AudioEngine.playAnnouncementChime();
      await new Promise(r => setTimeout(r, 600)); // Khoảng lặng trang nghiêm
    }

    // 2. Phát giọng đọc
    const speakFn = (options.apiKey && options.ttsProvider !== 'offline') ? speakOnlineAI : speakOffline;

    for (let i = 0; i < repeatTimes; i++) {
      await speakFn(text, options);
      if (i < repeatTimes - 1) {
        await new Promise(r => setTimeout(r, 1000)); // Nghỉ 1s giữa 2 lần nhắc lại
      }
    }
  }

  init();

  return {
    init,
    loadVoices,
    getVietnameseVoices,
    resolveVoice,
    speak: speakOffline,
    speakOnlineAI,
    speakWithChime,
    stop,
    isSpeaking: () => isSpeaking
  };
})();

if (typeof module !== 'undefined') module.exports = TTSEngine;
