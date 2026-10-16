import fs from 'fs';
import path from 'path';
import { getFilesFromTxt, getMediaExtension } from './utils.js';

const INPUT_DIR = path.join('data', 'text_files');
const OUTPUT_JSON = path.join('data', 'samples.json');

// Allowed media types to test visually
const SUPPORTED = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic',
  'jfif', 'bmp', 'tiff', 'svg',
  'mp4', 'mov', 'webm', 'mkv', 'm4v'
];

// How many files to test per extension, per input file.
// SAMPLE_SIZE=all (or 0) tests every file. Default: 50.
const rawSize = (process.env.SAMPLE_SIZE || '50').trim().toLowerCase();
const SAMPLE_SIZE = rawSize === 'all' ? 0 : Number.parseInt(rawSize, 10);
if (Number.isNaN(SAMPLE_SIZE) || SAMPLE_SIZE < 0) {
  throw new Error(`Invalid SAMPLE_SIZE "${process.env.SAMPLE_SIZE}". Use a positive number, 0 or "all".`);
}

let samples = [];

for (const file of fs.readdirSync(INPUT_DIR)) {
  if (!file.endsWith('.txt')) continue;

  const zipName = file.replace('.txt', '');
  const filePaths = getFilesFromTxt(path.join(INPUT_DIR, file));

  const byExt = {};

  for (const fp of filePaths) {
    const ext = getMediaExtension(fp);
    if (!SUPPORTED.includes(ext)) continue;

    if (!byExt[ext]) byExt[ext] = [];
    byExt[ext].push(fp);
  }

  for (const ext in byExt) {
    const all = byExt[ext];
    const count = all.length;

    let chosen = [];

    if (SAMPLE_SIZE > 0 && count > SAMPLE_SIZE) {
      // pick a random sample of SAMPLE_SIZE files
      chosen = all.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
    } else {
      chosen = all; // full coverage, or fewer files than the sample size
    }

    chosen.forEach(fp => {
      samples.push({
        zipName,
        filePath: fp,
        ext
      });
    });
  }
}

// Save final set of samples
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(samples, null, 2));

const mode = SAMPLE_SIZE === 0 ? 'full coverage' : `up to ${SAMPLE_SIZE} per extension`;
console.log(`Created samples.json with ${samples.length} media items (${mode}).`);
