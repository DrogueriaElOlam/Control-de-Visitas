const fs = require('fs');
const b64 = fs.readFileSync('public/logo.png').toString('base64');
const content = `// Droguería El Olam Official Logo
export const LOGO_DATA_URI = "data:image/png;base64,${b64}";
export const LOGO_URL = "/logo.png";
export default LOGO_URL;
`;
fs.writeFileSync('src/lib/logo.js', content);
console.log('src/lib/logo.js created successfully with base64 and url');
