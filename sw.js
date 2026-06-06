const CACHE = "ethos-acidobase-v3_4";
const ASSETS = [".", "index.html", "manifest.json", "icono-192.png", "icono-512.png"];
self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r || fetch(e.request).then(function(resp){
        var cp = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, cp); });
        return resp;
      }).catch(function(){ return caches.match("index.html"); });
    })
  );
});
