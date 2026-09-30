const fs = require('fs');
const content = fs.readFileSync('src/components/DailySupervisionForm.jsx', 'utf-8');

const regex = /\.map\s*\(\s*([^=]*)=>\s*(?:\{[^{}]*return\s*)?(\<[a-zA-Z]+|\([^{}]*\<[a-zA-Z]+)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const index = match.index;
  const lineNum = content.substring(0, index).split('\n').length;
  console.log(`Line ${lineNum}: ${match[0].substring(0, 50)}`);
  
  // extract the tag
  const tagStart = content.indexOf('<', index);
  const tagEnd = content.indexOf('>', tagStart);
  console.log(`Tag: ${content.substring(tagStart, tagEnd + 1)}`);
}
