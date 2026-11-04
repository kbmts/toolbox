/* 小工具 PWA 离线缓存 */
const CACHE = "mini-tool-v5";
const ASSETS = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE)
            .then(function (cache) { return cache.addAll(ASSETS); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                    .map(function (k) { return caches.delete(k); }));
            })
            .then(function () { return self.clients.claim(); })
    );
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    const isPage = event.request.mode === "navigate" || url.pathname.endsWith("/index.html");

    // 页面走“网络优先”，保证改了代码刷新就能看到；断网时回退缓存
    if (isPage) {
        event.respondWith(
            fetch(event.request).then(function (resp) {
                const copy = resp.clone();
                caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
                return resp;
            }).catch(function () { return caches.match("./index.html"); })
        );
        return;
    }

    // 图标、清单等静态资源走“缓存优先”
    event.respondWith(
        caches.match(event.request).then(function (cached) {
            return cached || fetch(event.request).then(function (resp) {
                const copy = resp.clone();
                caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
                return resp;
            });
        })
    );
});
