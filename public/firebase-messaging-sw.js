// Firebase Messaging Service Worker stub
// DevMRI does not use Firebase push notifications.
// This file exists to prevent 404 errors from browsers that request it.
// If you add Firebase Cloud Messaging in the future, initialize it here.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
