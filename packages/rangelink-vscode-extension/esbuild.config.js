const esbuild = require('esbuild');

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
};

// When run directly, execute the build
if (require.main === module) {
  esbuild.build(config).catch(() => process.exit(1));
}

module.exports = config;
