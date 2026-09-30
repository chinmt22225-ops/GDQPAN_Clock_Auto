/**
 * GDQPAN Audio System - Storage Manager (IndexedDB & LocalStorage)
 * Quản lý lưu trữ bền vững tệp âm thanh (Binary Blobs) và cấu hình hệ thống
 */

const StorageManager = (function () {
  const DB_NAME = 'GDQPAN_Audio_DB';
  const DB_VERSION = 1;
  const STORE_CUSTOM_AUDIO = 'custom_audio';
  const STORE_SONGS = 'songs';

  let dbPromise = null;

  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_CUSTOM_AUDIO)) {
            db.createObjectStore(STORE_CUSTOM_AUDIO, { keyPath: 'actionName' });
          }
          if (!db.objectStoreNames.contains(STORE_SONGS)) {
            db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  // --- IndexedDB: Custom Action Audio (MP3/WAV) ---
  async function saveCustomAudio(actionName, file) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CUSTOM_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_CUSTOM_AUDIO);
      const record = {
        actionName,
        fileName: file.name,
        blob: file,
        size: file.size,
        mimeType: file.type || 'audio/mpeg',
        updatedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function getCustomAudio(actionName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CUSTOM_AUDIO, 'readonly');
      const store = tx.objectStore(STORE_CUSTOM_AUDIO);
      const req = store.get(actionName);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteCustomAudio(actionName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CUSTOM_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_CUSTOM_AUDIO);
      const req = store.delete(actionName);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllCustomAudioActions() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CUSTOM_AUDIO, 'readonly');
      const store = tx.objectStore(STORE_CUSTOM_AUDIO);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- IndexedDB: Music Playlist Songs ---
  async function saveSong(songMeta, fileBlob) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readwrite');
      const store = tx.objectStore(STORE_SONGS);
      const record = {
        id: songMeta.id || 'song_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: songMeta.name,
        category: songMeta.category || 'Nhạc khác',
        blob: fileBlob,
        size: fileBlob.size,
        mimeType: fileBlob.type || 'audio/mpeg',
        addedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllSongs() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteSong(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, 'readwrite');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // --- LocalStorage Helpers ---
  const KEY_SCHEDULES = 'gdqpan_schedules_v2';
  const KEY_LOGS = 'gdqpan_activity_logs_v2';
  const KEY_SAVED_TEXT = 'gdqpan_saved_text_v2';
  const KEY_SETTINGS = 'gdqpan_settings_v2';

  function getSchedules() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SCHEDULES)) || [
        { id: 'sch_1', time: '05:30', days: [1,2,3,4,5,6,0], action: 'Báo thức', text: '', on: true },
        { id: 'sch_2', time: '06:15', days: [1,2,3,4,5,6,0], action: 'Ăn', text: 'Thông báo. Đã đến giờ ăn sáng.', on: true },
        { id: 'sch_3', time: '07:00', days: [1,2,3,4,5], action: 'Quốc ca không lời', text: '', on: true },
        { id: 'sch_4', time: '11:15', days: [1,2,3,4,5,6,0], action: 'Ăn', text: 'Thông báo. Đã đến giờ ăn trưa.', on: true },
        { id: 'sch_5', time: '11:45', days: [1,2,3,4,5,6,0], action: 'Ngủ', text: 'Thông báo. Đã đến giờ nghỉ trưa.', on: true },
        { id: 'sch_6', time: '13:30', days: [1,2,3,4,5], action: 'Làm việc', text: 'Thông báo. Đã đến giờ học tập buổi chiều.', on: true },
        { id: 'sch_7', time: '21:00', days: [1,2,3,4,5,6,0], action: 'Điểm danh', text: '', on: true },
        { id: 'sch_8', time: '21:30', days: [1,2,3,4,5,6,0], action: 'Ngủ', text: '', on: true }
      ];
    } catch (e) {
      return [];
    }
  }

  function saveSchedules(schedules) {
    localStorage.setItem(KEY_SCHEDULES, JSON.stringify(schedules));
  }

  function getSavedText() {
    return localStorage.getItem(KEY_SAVED_TEXT) || '';
  }

  function saveText(text) {
    localStorage.setItem(KEY_SAVED_TEXT, text);
  }

  function getLogs() {
    try {
      return JSON.parse(localStorage.getItem(KEY_LOGS)) || [];
    } catch (e) {
      return [];
    }
  }

  function addLog(action, details = '') {
    const logs = getLogs();
    const newLog = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleString('vi-VN'),
      action,
      details
    };
    logs.unshift(newLog);
    const trimmed = logs.slice(0, 150);
    localStorage.setItem(KEY_LOGS, JSON.stringify(trimmed));
    return newLog;
  }

  function clearLogs() {
    localStorage.removeItem(KEY_LOGS);
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SETTINGS)) || {
        volume: 0.8,
        region: 'nam_nu',
        rate: 1.0,
        ttsProvider: 'offline',
        apiKey: '',
        chimeBeforeSpeech: true,
        repeatTimes: 1,
        wakeLockEnabled: true
      };
    } catch (e) {
      return { volume: 0.8, region: 'nam_nu', rate: 1.0, chimeBeforeSpeech: true, repeatTimes: 1 };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  }

  return {
    saveCustomAudio,
    getCustomAudio,
    deleteCustomAudio,
    getAllCustomAudioActions,
    saveSong,
    getAllSongs,
    deleteSong,
    getSchedules,
    saveSchedules,
    getSavedText,
    saveText,
    getLogs,
    addLog,
    clearLogs,
    getSettings,
    saveSettings
  };
})();

if (typeof module !== 'undefined') module.exports = StorageManager;
