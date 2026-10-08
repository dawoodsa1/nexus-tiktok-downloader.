// Render the vector brand mark with Inkscape, then pack lossless PNG frames into ICO.
// Run `node scripts/build-favicon.mjs` after updating assets/favicon.svg.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log(`Built favicon.ico (${offset} bytes) and favicon.png with sizes ${sizes.join(', ')}.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
