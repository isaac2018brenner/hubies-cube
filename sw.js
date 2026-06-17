const CACHE = 'hubies-cube-v2';
const ASSETS = [
  '/hubies-cube/',
  '/hubies-cube/index.html',
  '/hubies-cube/manifest.json',
  '/hubies-cube/src/CubeEngine.js',
  '/hubies-cube/src/GameScene.js',
  '/hubies-cube/src/main.js',
  '/hubies-cube/src/ui.js',
  '/hubies-cube/assets/icons/icon-192.png',
  '/hubies-cube/assets/icons/icon-512.png',
  '/hubies-cube/assets/icons/icon-512-maskable.png',
  '/hubies-cube/assets/icons/apple-touch-icon.png',
  '/hubies-cube/assets/hubie_idle.png',
  '/hubies-cube/assets/hubie_up_start.png',
  '/hubies-cube/assets/hubie_up_end.png',
  '/hubies-cube/assets/hubie_down_start.png',
  '/hubies-cube/assets/hubie_down_end.png',
  '/hubies-cube/assets/hubie_left_start.png',
  '/hubies-cube/assets/hubie_left_end.png',
  '/hubies-cube/assets/hubie_right_start.png',
  '/hubies-cube/assets/hubie_right_end.png',
  'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
