// Service worker riêng cho Thien Music.
// Mục đích: (1) đủ điều kiện để trình duyệt cho "Cài đặt ứng dụng" (thêm ra
// màn hình chính, chạy toàn màn hình như app thật), (2) cache lại phần vỏ
// app (HTML/manifest/icon) để mở lại nhanh hơn và có thể mở khi mất mạng.
// Service worker KHÔNG có khả năng "ép" nhạc phát nền — việc đó phụ thuộc
// vào Media Session + chính sách của Chrome/hệ điều hành, không phải SW.

const CACHE_NAME = "thien-music-shell-v1";
const SHELL_FILES = [
  "./thien-music.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Chỉ can thiệp cache cho các file thuộc vỏ app của chính mình (GET, cùng
// origin). Mọi request khác (YouTube/Spotify iframe, Firestore, oEmbed...)
// đi thẳng ra mạng như bình thường, không đụng vào.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
