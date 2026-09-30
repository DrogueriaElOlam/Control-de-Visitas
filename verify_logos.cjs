const fs = require('fs');
const path = require('path');

function searchFiles(dir, matchStr, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.node') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, matchStr, results);
    } else if (/\.(jsx?|html|css|json)$/i.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(matchStr)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const foundOldUrls = searchFiles('.', 'sensible-spoonbill-485.convex.cloud');
console.log('Matches for old convex URL:', foundOldUrls);

// Also check logo files exist
const logoPngExists = fs.existsSync('public/logo.png');
const logoJpgExists = fs.existsSync('public/logo.jpg');
const srcLogoPngExists = fs.existsSync('src/assets/logo.png');
console.log('Logo assets check:', { logoPngExists, logoJpgExists, srcLogoPngExists });
