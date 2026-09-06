import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const BUILD_NUMBER_FILE = join(rootDir, '.buildnumber');
const VERSION_FILE = join(rootDir, 'src', 'generated', 'version.ts');
const MAJOR_VERSION = 1;

function readBuildNumber() {
  if (existsSync(BUILD_NUMBER_FILE)) {
    const raw = readFileSync(BUILD_NUMBER_FILE, 'utf-8').trim();
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 1;
}

function pad(value, length) {
  return String(value).padStart(length, '0');
}

// ddMMyyyy
function formatDate(date) {
  const dd = pad(date.getDate(), 2);
  const MM = pad(date.getMonth() + 1, 2);
  const yyyy = date.getFullYear();
  return `${dd}${MM}${yyyy}`;
}

// Incrementa apenas no build, mantém a data sempre atual
const shouldIncrement = process.argv.includes('--increment');
const buildNumber = shouldIncrement ? readBuildNumber() + 1 : readBuildNumber();
const buildNumber3 = pad(buildNumber, 3);
const now = new Date();
const dateStr = formatDate(now);

const version = `${MAJOR_VERSION}.${buildNumber3}.${dateStr}`;

mkdirSync(dirname(VERSION_FILE), { recursive: true });

writeFileSync(
  VERSION_FILE,
  `// Gerenciado automaticamente por scripts/version.mjs - NÃO EDITAR MANUALMENTE
export const APP_VERSION = '${version}';
export const APP_BUILD_NUMBER = '${MAJOR_VERSION}.${buildNumber3}';
export const APP_BUILD_DATE = '${dateStr}';
`,
  'utf-8'
);

if (shouldIncrement) {
  writeFileSync(BUILD_NUMBER_FILE, String(buildNumber), 'utf-8');
}

console.log(`Version: ${version}`);
