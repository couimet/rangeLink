import esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  esbuild.build(config).catch(() => process.exit(1));
}

export default config;
