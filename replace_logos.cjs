const fs = require('fs');
const path = require('path');

const regex = /https:\/\/sensible-spoonbill-485\.convex\.cloud\/api\/storage\/[a-f0-9-]+/g;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
        walk(full);
      }
    } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.json')) {
      let content = fs.readFileSync(full, 'utf8');
      if (regex.test(content)) {
        console.log('Replacing logo in:', full);
        content = content.replace(regex, '/logo.png');
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
}

// 1. Process src and root files
walk('src');
['index.html', 'preview_reporte_oficial.html', 'public/reporte_oficial.html'].forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (regex.test(content)) {
      console.log('Replacing logo in:', f);
      content = content.replace(regex, '/logo.png');
      fs.writeFileSync(f, content, 'utf8');
    }
  }
});

console.log('Replacement complete.');
