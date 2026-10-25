// Registers the service worker so the game works offline and can be installed.
// Service workers only run over http(s); opened straight from disk (file://)
// the game simply runs without one.
if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
