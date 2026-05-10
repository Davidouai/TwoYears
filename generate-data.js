/**
 * Génère data.js à partir des dossiers dans resources/souvenirs/.
 * Usage : node generate-data.js
 *
 * - Les dossiers doivent suivre le format "N - Nom" (ex : "3 - Velorail")
 * - Les titres et réponses personnalisés existants dans data.js sont préservés
 * - Ajouter des images/vidéos dans un dossier et relancer le script suffit
 */

const fs = require('fs');
const path = require('path');

const souvenirDir = path.join(__dirname, 'resources', 'souvenirs');
const outputFile = path.join(__dirname, 'data.js');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.heic', '.heif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.m4v']);

// Preserve existing custom titles and answers
let existingMeta = {};
if (fs.existsSync(outputFile)) {
  try {
    const mockWindow = {};
    const code = fs.readFileSync(outputFile, 'utf-8').replace(/\bwindow\b/g, 'mockWindow');
    new Function('mockWindow', code)(mockWindow);
    (mockWindow.SOUVENIRS_DATA || []).forEach(s => {
      existingMeta[s.id] = { title: s.title, answer: s.answer };
    });
    console.log(`📖 Métadonnées existantes chargées pour ${Object.keys(existingMeta).length} étape(s).`);
  } catch (_) {
    console.log('⚠️  Impossible de lire data.js existant — repartir de zéro.');
  }
}

const folders = fs.readdirSync(souvenirDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^\d+\s*-/.test(d.name))
  .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10));

const stages = folders.map(({ name: folder }) => {
  const match = folder.match(/^(\d+)\s*-\s*(.+)$/);
  if (!match) return null;

  const id = parseInt(match[1], 10);
  const rawName = match[2].trim();
  const meta = existingMeta[id] || {};

  const folderPath = path.join(souvenirDir, folder);
  const media = fs.readdirSync(folderPath)
    .filter(f => !f.startsWith('.'))
    .sort()
    .flatMap(f => {
      const ext = path.extname(f).toLowerCase();
      const type = IMAGE_EXTS.has(ext) ? 'image' : VIDEO_EXTS.has(ext) ? 'video' : null;
      return type ? [{ type, src: `resources/souvenirs/${folder}/${f}` }] : [];
    });

  return {
    id,
    title: meta.title ?? rawName,
    answer: meta.answer ?? rawName,
    media,
  };
}).filter(Boolean);

// Write formatted output
const lines = ['window.SOUVENIRS_DATA = ['];
stages.forEach((stage, si) => {
  lines.push('  {');
  lines.push(`    id: ${stage.id},`);
  lines.push(`    title: "${stage.title}",`);
  lines.push(`    answer: "${stage.answer}",`);
  lines.push('    media: [');
  stage.media.forEach((m, mi) => {
    const comma = mi < stage.media.length - 1 ? ',' : '';
    lines.push(`      { type: "${m.type}", src: "${m.src}" }${comma}`);
  });
  lines.push('    ]');
  lines.push(si < stages.length - 1 ? '  },' : '  }');
});
lines.push('];');

fs.writeFileSync(outputFile, lines.join('\n') + '\n');

console.log(`\n✅ data.js généré avec ${stages.length} étapes :`);
stages.forEach(s => console.log(`  ${s.id}. ${s.title} — ${s.media.length} fichier(s) média`));
console.log('\n💡 Pour personnaliser un titre ou une réponse, modifiez data.js directement.');
console.log('   Relancer le script préservera vos modifications.\n');
