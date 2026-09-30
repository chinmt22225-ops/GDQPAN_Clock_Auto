/* Service Worker cho Hệ Thống Thông Báo Tự Động GDQPAN (PWA Offline) */
const CACHE_NAME = 'gdqpan-pwa-v1';
const CORE_ASSETS = [
  './',
  './HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html',
  './manifest.json',
  './Sound/preset_sounds_data.js',
  './assets/icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Cài đặt Service Worker và lưu cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell...');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Lỗi nạp một số asset vào cache (vẫn tiếp tục):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt Service Worker và dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Xóa cache cũ:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Xử lý nạp tài nguyên: Cache-First với Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bỏ qua các request POST, request tới dịch vụ AI 5050, Cloud API hoặc luồng Video/HLS trực tiếp của VTV
  if (
    request.method !== 'GET' ||
    url.port === '5050' ||
    url.hostname.includes('api.fpt.ai') ||
    url.hostname.includes('vtv') ||
    url.hostname.includes('mediacdn') ||
    url.hostname.includes('sohatv') ||
    url.hostname.includes('akamaized') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Nếu có trong cache, trả về trước đồng thời cập nhật cache ngầm (Stale-While-Revalidate)
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Mất mạng / Offline: Nếu là yêu cầu điều hướng trang (HTML navigation), trả về file HTML chính
        if (request.mode === 'navigate') {
          return caches.match('./HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
