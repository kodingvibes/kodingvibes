// Service Worker para KodingVibes PWA
// Estrategia conservadora: Network-first para contenido, Cache-first para shell

const CACHE_NAME = 'kodingvibes-v1';
const STATIC_CACHE_NAME = 'kodingvibes-static-v1';

// Recursos del shell de la app que deben cachearse
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalación: cachear shell básico
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando shell de la app...');
        return cache.addAll(SHELL_URLS);
      })
      .then(() => {
        console.log('[SW] Shell cacheado exitosamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error cacheando shell:', error);
      })
  );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('kodingvibes-') && 
                     name !== CACHE_NAME && 
                     name !== STATIC_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Eliminando cache antigua:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim();
      })
  );
});

// Fetch: estrategia conservadora
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo interceptar peticiones GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Estrategia 1: API y contenido dinámico → Network-first
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('/post/') ||
      request.destination === 'document') {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la red funciona, devolver respuesta
          if (response && response.status === 200) {
            // Cachear respuesta exitosa
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar desde cache
          console.log('[SW] Red falló, sirviendo desde cache:', url.pathname);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay cache, devolver página offline
            if (request.destination === 'document') {
              return caches.match('/');
            }
            throw new Error('No hay conexión ni cache disponible');
          });
        })
    );
    return;
  }
  
  // Estrategia 2: Recursos estáticos (CSS, JS, fuentes) → Cache-first con actualización
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font') {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Devolver cache y actualizar en background
            fetch(request)
              .then((response) => {
                if (response && response.status === 200) {
                  caches.open(STATIC_CACHE_NAME).then((cache) => {
                    cache.put(request, response);
                  });
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          
          // Si no está en cache, fetch y cachear
          return fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Estrategia 3: Imágenes y otros recursos → Network-first
  if (request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Default: network con fallback a cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

// Manejar eventos push (notificaciones push recibidas)
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event);

  let data;
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: 'KodingVibes', body: 'Tienes una nueva notificación' };
  }

  const title = data.title || 'KodingVibes';
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || data.id || 'notification',
    requireInteraction: false,
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      {
        action: 'open',
        title: 'Ver',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejar clicks en las notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';

  if (event.action === 'close') {
    return;
  }

  // Siempre abrir la URL (ya sea click en "Ver" o en la notificación misma)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event);
});

// Sincronización en background (para cuando vuelve la conexión)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-push-subscriptions') {
    event.waitUntil(
      // Aquí podrías re-sincronizar suscripciones si es necesario
      Promise.resolve()
    );
  }
});
