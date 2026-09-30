const fs = require('fs');
let code = fs.readFileSync('src/components/SupervisionControlPanel.jsx', 'utf-8');

// Replace "Meta" with "Meta Diaria"
code = code.replace(/Metas por Equipo \(Diarias\/Mensuales\)/, 'Metas por Equipo');
// Not doing exactly replace because it could fail, let's write an edit tool or just completely replace.
