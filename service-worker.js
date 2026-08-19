const CACHE = 'rr-time-v2.16';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // 网络优先：永远尝试从网络获取最新文件
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // 只缓存成功的 GET 请求
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 网络失败时才用缓存兜底
        return caches.match(e.request);
      })
  );
});

// 监听 SW 更新消息
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') {
    self.skipWaiting();
  }
});
