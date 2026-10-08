// Render the vector brand mark with Inkscape, then pack lossless PNG frames into ICO.
// Run `node scripts/build-favicon.mjs` after updating assets/favicon.svg.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sizes = [16, 32, 48, 64, 128, 256];
const temporary = mkdtempSync(join(tmpdir(), 'tikvideo-favicon-'));
try {
  const frames = sizes.map(size => {
    const output = join(temporary, `${size}.png`);
    execFileSync('inkscape', [join(root, 'assets/favicon.svg'), '--export-type=png',
      `--export-filename=${output}`, `--export-width=${size}`, `--export-height=${size}`],
    { stdio: ['ignore', 'pipe', 'pipe'] });
    return readFileSync(output);
  });
  const directory = Buffer.alloc(6 + sizes.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(sizes.length, 4);
  let offset = directory.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    directory[entry] = sizes[index] % 256;
    directory[entry + 1] = sizes[index] % 256;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  writeFileSync(join(root, 'frontend/favicon.ico'), Buffer.concat([directory, ...frames]));
  writeFileSync(join(root, 'frontend/favicon.png'), frames.at(-1));
  const icons = join(root, 'frontend/icons');
  mkdirSync(icons, { recursive: true });
  for (const size of [180, 192, 512]) {
    execFileSync('inkscape', [join(root, 'assets/favicon.svg'), '--export-type=png',
      `--export-filename=${join(icons, `icon-${size}.png`)}`,
      `--export-width=${size}`, `--export-height=${size}`],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  }
  // Keep the colored mark inside Android's centered 40%-radius safe area.
  const maskable = readFileSync(join(root, 'assets/favicon.svg'), 'utf8')
    .replace('<g transform=', '<g transform="translate(128 128) scale(0.72) translate(-128 -128)"><g transform=')
    .replace('</g>', '</g></g>');
  const maskableSource = join(temporary, 'maskable.svg');
  writeFileSync(maskableSource, maskable);
  execFileSync('inkscape', [maskableSource, '--export-type=png',
    `--export-filename=${join(icons, 'icon-maskable-512.png')}`,
    '--export-width=512', '--export-height=512'], { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`Built favicon.ico (${offset} bytes) and favicon.png with sizes ${sizes.join(', ')}.`);
  console.log('Built home-screen PNG icons at 180, 192 and 512px, plus a maskable 512px icon.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
