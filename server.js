/**
 * Serveur local — zéro dépendance npm.
 * Lance avec : node server.js
 * Puis ouvre : http://localhost:3000
 *
 * Toute image/vidéo ajoutée dans un dossier resources/souvenirs/
 * apparaît automatiquement à la prochaine actualisation de la page.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.m4v': 'video/mp4',
};

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.heic', '.heif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.m4v']);

function loadExistingMeta() {
  const meta = {};
  const dataFile = path.join(ROOT, 'data.js');
  if (!fs.existsSync(dataFile)) return meta;
  try {
    const mockWindow = {};
    const code = fs.readFileSync(dataFile, 'utf-8').replace(/\bwindow\b/g, 'mockWindow');
    new Function('mockWindow', code)(mockWindow); // eslint-disable-line no-new-func
    (mockWindow.SOUVENIRS_DATA || []).forEach(s => {
      meta[s.id] = { title: s.title, answer: s.answer };
    });
  } catch (_) {}
  return meta;
}

function scanSouvenirs() {
  const souvenirDir = path.join(ROOT, 'resources', 'souvenirs');
  const meta = loadExistingMeta();

  return fs.readdirSync(souvenirDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d+\s*-/.test(d.name))
    .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10))
    .map(({ name: folder }) => {
      const [, num, rawName] = folder.match(/^(\d+)\s*-\s*(.+)$/) || [];
      if (!num) return null;
      const id = parseInt(num, 10);
      const existing = meta[id] || {};
      const media = fs.readdirSync(path.join(souvenirDir, folder))
        .filter(f => !f.startsWith('.'))
        .sort()
        .flatMap(f => {
          const ext = path.extname(f).toLowerCase();
          const type = IMAGE_EXTS.has(ext) ? 'image' : VIDEO_EXTS.has(ext) ? 'video' : null;
          return type ? [{ type, src: `resources/souvenirs/${folder}/${f}` }] : [];
        });
      return {
        id,
        title: existing.title ?? rawName.trim(),
        answer: existing.answer ?? rawName.trim(),
        media,
      };
    })
    .filter(Boolean);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
  catch (_) { urlPath = req.url.split('?')[0]; }

  if (urlPath === '/api/souvenirs') {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(scanSouvenirs()));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(err.message);
    }
    return;
  }

  const filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403); res.end(); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✨  http://localhost:${PORT}`);
  console.log('    Ajoute des fichiers dans resources/souvenirs/ et actualise la page.\n');
  console.log('    Ctrl+C pour arrêter.\n');
});
