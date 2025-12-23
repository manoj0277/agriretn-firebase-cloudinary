// BhoomiHire Service Worker - Advanced Stale-While-Revalidate Strategy
const CACHE_NAME = 'bhoomihire-cache-v5';

// Files to cache on install (critical assets for offline access)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install Event - Pre-cache critical assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Pre-caching critical assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Pre-cache failed:', error);
            })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old cache versions
                        if (cacheName !== CACHE_NAME) {
                            console.log('[ServiceWorker] Removing old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Claim all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-HTTP(S) requests and browser extensions
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip API calls and external resources that shouldn't be cached
    if (url.pathname.startsWith('/api/') ||
        url.hostname !== self.location.hostname) {
        // Network-first strategy for API calls
        event.respondWith(networkFirst(request));
        return;
    }

    // Stale-While-Revalidate for app assets
    event.respondWith(staleWhileRevalidate(request));
});

/**
 * Stale-While-Revalidate Strategy
 * Returns cached response immediately while fetching updated version in background
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Fetch from network in background
    const networkFetch = fetch(request)
        .then((networkResponse) => {
            // Only cache valid responses
            if (networkResponse && networkResponse.status === 200) {
                // Clone the response before caching
                const responseToCache = networkResponse.clone();
                cache.put(request, responseToCache);
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[ServiceWorker] Network fetch failed:', error);
            return null;
        });

    // Return cached response immediately, or wait for network
    if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        // Update cache in background (don't await)
        networkFetch;
        return cachedResponse;
    }

    // No cache available, wait for network
    console.log('[ServiceWorker] Fetching from network:', request.url);
    const networkResponse = await networkFetch;

    if (networkResponse) {
        return networkResponse;
    }

    // Both cache and network failed - return offline fallback
    return new Response(
        `<html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BhoomiHire - Offline</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            color: #2E7D32;
          }
          .container {
            text-align: center;
            padding: 20px;
          }
          h1 { margin-bottom: 10px; }
          p { color: #666; margin-bottom: 20px; }
          .icon { font-size: 64px; margin-bottom: 20px; }
          button {
            background: #2E7D32;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          }
          button:hover { background: #1B5E20; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🌾</div>
          <h1>You're Offline</h1>
          <p>BhoomiHire requires an internet connection. Please check your network and try again.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
    </html>`,
        {
            headers: { 'Content-Type': 'text/html' },
            status: 503
        }
    );
}

/**
 * Network-First Strategy for API calls
 * Tries network first, falls back to cache if offline
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses for offline fallback
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[ServiceWorker] Network failed, trying cache:', request.url);

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Return error response for API calls
        return new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection available' }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 503
            }
        );
    }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
