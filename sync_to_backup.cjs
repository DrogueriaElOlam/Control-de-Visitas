const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('.');
const targetDir = path.resolve('../control-visitas-olam');

if (!fs.existsSync(targetDir)) {
  console.log('Target dir does not exist:', targetDir);
  process.exit(0);
}

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (child === 'node_modules' || child === '.git' || child === 'dist' || child === '.node') continue;
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy public, src, index.html, preview_reporte_oficial.html
copyRecursive(path.join(srcDir, 'public'), path.join(targetDir, 'public'));
copyRecursive(path.join(srcDir, 'src'), path.join(targetDir, 'src'));
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(targetDir, 'index.html'));
if (fs.existsSync(path.join(srcDir, 'preview_reporte_oficial.html'))) {
  fs.copyFileSync(path.join(srcDir, 'preview_reporte_oficial.html'), path.join(targetDir, 'preview_reporte_oficial.html'));
}

console.log('Successfully synced to control-visitas-olam');
