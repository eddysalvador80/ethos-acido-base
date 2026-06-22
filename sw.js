const CACHE = "ethos-acidobase-v5_5";
const ASSETS = [".", "index.html", "manifest.json", "icono-192.png", "icono-512.png", "apple-touch-icon.png"];
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
  var req = e.request;
  var isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;
  if (isHTML) {
    // Network-first para el HTML: la app instalada se actualiza sola al abrir con internet;
    // si no hay red, cae al cache (offline).
    e.respondWith(
      fetch(req).then(function(resp){
        var cp = resp.clone();
        caches.open(CACHE).then(function(c){ c.put("index.html", cp); });
        return resp;
      }).catch(function(){
        return caches.match("index.html").then(function(r){ return r || caches.match("."); });
      })
    );
  } else {
    // Cache-first para estaticos (iconos, manifest).
    e.respondWith(
      caches.match(req).then(function(r){
        return r || fetch(req).then(function(resp){
          var cp = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, cp); });
          return resp;
        });
      })
    );
  }
});
