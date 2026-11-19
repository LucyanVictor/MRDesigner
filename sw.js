/* MR Design · service worker — deixa o app abrir sem internet.
   O sistema (MR.html) busca sempre a versão nova primeiro; sem conexão, usa a última salva.
   Bibliotecas (Tailwind, jsPDF, fontes) ficam guardadas depois do primeiro uso.
   Dados (Supabase, Google, Trello) NUNCA passam por aqui: vão direto para a internet. */
const VERSAO = 'mr-v1';
const ESSENCIAIS = ['./MR.html', './manifest.webmanifest', './mr-icon-192.png', './mr-icon-512.png'];
const LIBS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* páginas e arquivos do próprio site: rede primeiro, cópia salva se estiver offline */
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./MR.html') : undefined))));
    return;
  }
  /* bibliotecas externas: cópia salva primeiro (mais rápido), atualiza em segundo plano */
  if (LIBS.some(h => url.hostname === h)) {
    e.respondWith(caches.open(VERSAO).then(c => c.match(req).then(hit => {
      const rede = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || rede;
    })));
  }
});
