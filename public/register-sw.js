// Service Worker Registration (External file for CSP compliance)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(
      function(registration) {
        // Service Worker registered successfully
      },
      function(err) {
        // Service Worker registration failed
      }
    );
  });
}
