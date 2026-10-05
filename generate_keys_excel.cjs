const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Alfabeto seguro sin caracteres confusos (0/O, 1/I/L)
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateSecureKey(index) {
  let part1 = '';
  let part2 = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 4; i++) {
    part1 += CHARSET[bytes[i] % CHARSET.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += CHARSET[bytes[i] % CHARSET.length];
  }
  return `OLAM-${part1}-${part2}`;
}

const keys = [];
const excelRows = [];

for (let i = 1; i <= 50; i++) {
  const key = generateSecureKey(i);
  keys.push({
    id: i,
    key: key,
    used: false,
    usedAt: null,
    usedBy: null,
    role: 'any',
    createdAt: new Date().toISOString()
  });

  excelRows.push({
    'No.': i,
    'Clave de Un Solo Toque (OTP)': key,
    'Tipo de Acceso': 'Acceso Desechable (1 Solo Uso)',
    'Estado Inicial': 'DISPONIBLE',
    'Nivel de Permiso': 'Vendedor o Administrador',
    'Instrucciones de Seguridad': 'Válida exactamente para 1 inicio de sesión. Al entrar al sistema queda invalidada automáticamente de forma permanente.'
  });
}

// Crear libro Excel
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(excelRows);

// Ajustar anchos de columnas
ws['!cols'] = [
  { wch: 8 },   // No.
  { wch: 28 },  // Clave
  { wch: 32 },  // Tipo
  { wch: 18 },  // Estado
  { wch: 28 },  // Nivel
  { wch: 90 }   // Instrucciones
];

XLSX.utils.book_append_sheet(wb, ws, 'Claves 2.0');

// Guardar archivo Excel nombrado como "claves 2.0.xlsx" en la raíz
const excelPath = path.join(__dirname, 'claves 2.0.xlsx');
XLSX.writeFile(wb, excelPath);
console.log('✅ Archivo Excel generado con éxito:', excelPath);

// También guardarlo en public/ para descarga directa si se requiere
const publicExcelPath = path.join(__dirname, 'public', 'claves 2.0.xlsx');
XLSX.writeFile(wb, publicExcelPath);

// Guardar archivo JSON con las claves y sus hashes para el sistema de seguridad
const jsonPath = path.join(__dirname, 'src', 'lib', 'initialOtpKeys.json');
fs.writeFileSync(jsonPath, JSON.stringify(keys, null, 2), 'utf8');
console.log('✅ Archivo JSON de claves guardado:', jsonPath);
