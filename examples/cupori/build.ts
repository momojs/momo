import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import tailwind from 'bun-plugin-tailwind';

const outdir = path.join(process.cwd(), 'dist');
const wasmSource = Bun.resolveSync(
  'sql.js/dist/sql-wasm.wasm',
  import.meta.dir,
);
const wasmTarget = path.join(outdir, 'assets/sqljs-1.11.0/sql-wasm.wasm');
await rm(outdir, { recursive: true, force: true });

const entrypoints = [...new Bun.Glob('src/**/*.html').scanSync()];

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  target: 'browser',
  sourcemap: 'linked',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exitCode = 1;
} else {
  await mkdir(path.dirname(wasmTarget), { recursive: true });
  await copyFile(wasmSource, wasmTarget);
}

for (const output of result.outputs) {
  console.log(
    ` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`,
  );
}

if (result.success) {
  console.log(
    ` ${path.relative(process.cwd(), wasmTarget)}  sql.js WebAssembly`,
  );
}
