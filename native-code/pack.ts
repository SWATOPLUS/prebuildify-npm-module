import { dts } from 'bun-dts';

async function main() {
  await Bun.$`rm -rf dist/`;
  await Bun.$`rm -rf prebuilds/`;
  await Bun.$`node_modules/.bin/prebuildify --napi --strip --tag-prefix v`;

  await Bun.build({
    entrypoints: ['index.ts'],
    minify: false,
    target: 'node',
    format: 'cjs',
    outdir: 'dist/',
    plugins: [dts()],
  });

  const { name, version } = await import('./package.json');
  const packageJson = {
    name,
    version,
    main: 'index.js',
    types: 'index.d.ts',
  };

  await Bun.file('dist/package.json').write(JSON.stringify(packageJson, undefined, 2));
}

main();
