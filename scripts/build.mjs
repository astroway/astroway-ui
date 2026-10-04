// dist/: ESM + .d.ts per module for npm (renderers from @astroway/render), and
// dist/cdn/: one self-contained minified file per element for a <script type="module"> tag.
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

rmSync('dist', { recursive: true, force: true });
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { stdio: 'inherit' });
for (const f of readdirSync('dist').filter((n) => n.endsWith('.d.ts'))) {
  const src = readFileSync(`dist/${f}`, 'utf8');
  writeFileSync(`dist/${f}`, src.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2'));
}

await build({
  entryPoints: { index: 'src/index.ts', 'moon-phase': 'src/moon-phase.ts', 'natal-wheel': 'src/natal-wheel.ts' },
  outdir: 'dist/cdn', bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, legalComments: 'none', logLevel: 'warning',
});
console.log('cdn file'.padEnd(20), 'raw'.padStart(8), 'gzip'.padStart(8));
for (const f of readdirSync('dist/cdn').sort()) {
  const code = readFileSync(`dist/cdn/${f}`);
  console.log(f.padEnd(20), String(code.length).padStart(8), String(gzipSync(code, { level: 9 }).length).padStart(8));
}
