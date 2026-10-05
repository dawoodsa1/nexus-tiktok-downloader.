import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

for (const directory of ['worker', 'frontend', 'lib', 'scripts', 'tests']) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (!/\.(js|mjs)$/.test(file) || file.includes('node_modules')) continue;
    const result = spawnSync(process.execPath, ['--check', `${directory}/${file}`], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
console.log('JavaScript syntax: valid');
