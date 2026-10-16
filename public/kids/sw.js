// まなびっこ（/kids/）専用の Service Worker。
// /advanced/ には一切かかわらない（スコープは登録時の 'sw.js' の場所 /kids/ に限定される）。
const CACHE_NAME = "manabikko-kids-v1";
const SHELL_FILES = [
  "/kids/",
  "/kids/index.html",
  "/kids/manifest.json",
  "/kids/icons/icon-192.png",
  "/kids/icons/icon-512.png",
  "/kids/icons/icon-512-maskable.png",
  "/kids/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("manabikko-kids-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 他のオリジンへのリクエストには いっさい ふれない（フォント等）
  if (url.origin !== self.location.origin) return;

  // /kids/ 配下だけ あつかう（/advanced/ などには さわらない）
  if (!url.pathname.startsWith("/kids/")) return;

  // セーブ転送・VOICEVOX中継の /api/ はぜったいに キャッシュしない・横取りしない
  if (url.pathname.includes("/api/")) return;

  // GET リクエストだけ キャッシュ対象（POST等はそのままネットワークへ）
  if (req.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        // cache-first: あれば すぐ かえす（うらで 更新）。なければ ネットワークへ。
        return cached || networkFetch;
      })
    )
  );
});
