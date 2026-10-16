import fs from 'fs';
import path from 'path';

// Minimal .env loader (no external dependency). Values already set in the
// real environment take precedence over values in the .env file.
function loadDotEnv(file = '.env') {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

// Base URL that relative media paths are appended to.
export const MEDIA_BASE_URL = (
  process.env.MEDIA_BASE_URL || 'https://example.com/wp-content'
).replace(/\/+$/, '');

export function getFilesFromTxt(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function getMediaExtension(filePath) {
  return path.extname(filePath).toLowerCase().replace('.', '');
}

export function buildFinalUrl(relativePath) {
  return `${MEDIA_BASE_URL}/${relativePath.replace(/^\/+/, '')}`;
}
