const CACHE = 'hubies-cube-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/CubeEngine.js',
  '/src/GameScene.js',
  '/src/main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
